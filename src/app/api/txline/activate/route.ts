import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Connection } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { serverEnv } from "@/lib/env/server";
import { TXLINE_ENDPOINTS, TXLINE_NETWORKS } from "@/lib/txline/constants";
import {
  assertLocalSetupRequest,
  LocalSetupUnavailableError,
} from "@/lib/txline/local-setup";

const requestSchema = z.object({
  txSig: z.string().min(64).max(128),
  walletSignature: z.string().min(64),
  jwt: z.string().min(1),
});

const activationResponseSchema = z.union([
  z.string().min(1),
  z.object({ token: z.string().min(1) }),
]);

async function waitForConfirmation(
  connection: Connection,
  signature: string,
  timeoutMs = 30_000
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const status = response.value[0];

    if (status?.err) {
      throw new Error("The subscription transaction failed on Solana");
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("Timed out waiting for the subscription transaction");
}

function quoteEnv(value: string): string {
  return JSON.stringify(value);
}

async function saveLocalCredentials(values: Record<string, string>) {
  const envPath = path.join(process.cwd(), ".env.local");
  let content = "";

  try {
    content = await readFile(envPath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }

  const lines = content ? content.replace(/\r\n/g, "\n").split("\n") : [];
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${quoteEnv(value)}`;
    const index = lines.findIndex((candidate) =>
      candidate.startsWith(`${key}=`)
    );
    if (index === -1) lines.push(line);
    else lines[index] = line;
  }

  await writeFile(
    envPath,
    `${lines.filter((line, index) => line || index < lines.length - 1).join("\n")}\n`,
    "utf8"
  );
}

export async function POST(request: NextRequest) {
  try {
    assertLocalSetupRequest(request);
    const { txSig, walletSignature, jwt } = requestSchema.parse(
      await request.json()
    );
    const env = serverEnv();
    const network = TXLINE_NETWORKS[env.TXLINE_NETWORK];
    const connection = new Connection(
      env.SOLANA_RPC_URL ?? network.rpcUrl,
      "confirmed"
    );

    await waitForConfirmation(connection, txSig);

    const apiOrigin = env.TXLINE_API_ORIGIN ?? network.apiOrigin;
    const upstream = await fetch(
      new URL(TXLINE_ENDPOINTS.activateToken, apiOrigin),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txSig,
          walletSignature,
          leagues: [],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(env.TXLINE_REQUEST_TIMEOUT_MS),
      }
    );

    if (!upstream.ok) {
      const preview = (await upstream.text()).slice(0, 300);
      console.error("[txline activate upstream]", upstream.status, preview);
      return NextResponse.json(
        { error: `TxLINE activation failed (${upstream.status})` },
        { status: 502 }
      );
    }

    const responseBody = await upstream.text();
    let activationPayload: unknown = responseBody.trim();
    try {
      activationPayload = JSON.parse(responseBody) as unknown;
    } catch {
      // TxLINE may return the API token as plain text.
    }
    const activation = activationResponseSchema.parse(activationPayload);
    const apiToken =
      typeof activation === "string" ? activation : activation.token;

    await saveLocalCredentials({
      TXLINE_NETWORK: env.TXLINE_NETWORK,
      TXLINE_API_ORIGIN: apiOrigin,
      TXLINE_GUEST_JWT: jwt,
      TXLINE_API_TOKEN: apiToken,
      ...(env.SOLANA_RPC_URL
        ? { SOLANA_RPC_URL: env.SOLANA_RPC_URL }
        : {}),
    });

    return NextResponse.json({
      activated: true,
      network: env.TXLINE_NETWORK,
      transactionSignature: txSig,
      restartRequired: true,
    });
  } catch (error) {
    if (error instanceof LocalSetupUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "The activation request is invalid" },
        { status: 422 }
      );
    }
    console.error("[txline activate]", error);
    return NextResponse.json(
      { error: "Could not activate TxLINE access" },
      { status: 500 }
    );
  }
}

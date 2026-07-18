import { Connection, PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { serverEnv } from "@/lib/env/server";
import { TXLINE_NETWORKS } from "@/lib/txline/constants";
import {
  assertLocalSetupRequest,
  LocalSetupUnavailableError,
} from "@/lib/txline/local-setup";
import { buildSubscriptionTransaction } from "@/lib/txline/subscription";

const requestSchema = z.object({
  publicKey: z.string().min(32).max(44),
});

export async function POST(request: NextRequest) {
  try {
    assertLocalSetupRequest(request);
    const { publicKey } = requestSchema.parse(await request.json());
    const user = new PublicKey(publicKey);
    const env = serverEnv();
    const network = TXLINE_NETWORKS[env.TXLINE_NETWORK];
    const realtimeServiceLevel = network.freeServiceLevels.realtime;

    if (realtimeServiceLevel === null) {
      return NextResponse.json(
        {
          error:
            "The selected network does not expose the documented real-time free service level",
        },
        { status: 422 }
      );
    }

    const connection = new Connection(
      env.SOLANA_RPC_URL ?? network.rpcUrl,
      "confirmed"
    );
    const plan = await buildSubscriptionTransaction(
      connection,
      user,
      env.TXLINE_NETWORK,
      realtimeServiceLevel
    );

    return NextResponse.json({
      ...plan,
      network: env.TXLINE_NETWORK,
      programId: network.programId,
      tokenMint: network.tokenMint,
    });
  } catch (error) {
    if (error instanceof LocalSetupUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "A valid Solana public key is required" },
        { status: 422 }
      );
    }
    console.error("[txline plan]", error);
    return NextResponse.json(
      { error: "Could not simulate the TxLINE subscription" },
      { status: 500 }
    );
  }
}

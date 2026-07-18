import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { TxlineClient } from "../../src/lib/txline/client";
import { TXLINE_NETWORKS, type TxlineNetwork } from "../../src/lib/txline/constants";

loadEnvConfig(process.cwd());

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const stream = process.argv[2];
  const seconds = Number(process.argv[3] ?? "10");

  if (stream !== "odds" && stream !== "scores") {
    throw new Error("Usage: npx tsx scripts/txline/probe-streams.ts <odds|scores> [seconds]");
  }

  const network = (process.env.TXLINE_NETWORK ?? "mainnet") as TxlineNetwork;
  const client = new TxlineClient({
    apiOrigin:
      process.env.TXLINE_API_ORIGIN ?? TXLINE_NETWORKS[network].apiOrigin,
    guestJwt: requiredEnv("TXLINE_GUEST_JWT"),
    apiToken: requiredEnv("TXLINE_API_TOKEN"),
    timeoutMs: (seconds + 5) * 1000,
  });

  const response = await client.openStream(stream);
  const contentType = response.headers.get("content-type");

  let bytes = 0;
  let chunks = 0;
  let preview = "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), seconds * 1000);

  try {
    if (!response.body) {
      throw new Error("Stream response had no body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (!controller.signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks += 1;
      bytes += value.byteLength;
      if (preview.length < 400) {
        preview += decoder.decode(value, { stream: true });
      }
    }

    reader.releaseLock();
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "AbortError") {
      throw error;
    }
  } finally {
    clearTimeout(timer);
  }

  const result = {
    capturedAt: new Date().toISOString(),
    network,
    stream,
    status: response.status,
    contentType,
    chunks,
    bytes,
    preview: preview.slice(0, 500),
  };

  const outputDirectory = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    "txline"
  );
  const outputPath = path.join(outputDirectory, `stream.${stream}.probe.json`);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(result, null, 2));
  console.log(`Wrote ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

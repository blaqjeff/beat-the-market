import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { TxlineClient } from "../../src/lib/txline/client";
import { TXLINE_NETWORKS, type TxlineNetwork } from "../../src/lib/txline/constants";

loadEnvConfig(process.cwd());

type CaptureKind = "fixtures" | "odds" | "scores" | "historical";

const sensitiveKey = /authorization|api.?token|jwt|secret|signature/i;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : sanitize(child),
    ])
  );
}

function safeId(value: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error("Fixture ID contains unsupported filename characters");
  }
  return value;
}

async function main() {
  const kind = process.argv[2] as CaptureKind | undefined;
  const fixtureId = process.argv[3];

  if (!kind || !["fixtures", "odds", "scores", "historical"].includes(kind)) {
    throw new Error(
      "Usage: npm run txline:capture -- <fixtures|odds|scores|historical> [fixtureId]"
    );
  }
  if (kind !== "fixtures" && !fixtureId) {
    throw new Error(`${kind} capture requires a fixture ID`);
  }

  const network = (process.env.TXLINE_NETWORK ?? "mainnet") as TxlineNetwork;
  if (!(network in TXLINE_NETWORKS)) {
    throw new Error("TXLINE_NETWORK must be mainnet or devnet");
  }

  const client = new TxlineClient({
    apiOrigin:
      process.env.TXLINE_API_ORIGIN ?? TXLINE_NETWORKS[network].apiOrigin,
    guestJwt: requiredEnv("TXLINE_GUEST_JWT"),
    apiToken: requiredEnv("TXLINE_API_TOKEN"),
  });

  const payload =
    kind === "fixtures"
      ? await client.fixturesSnapshot(
          fixtureId ? { competitionId: fixtureId } : undefined
        )
      : kind === "odds"
        ? await client.oddsSnapshot(fixtureId!)
        : kind === "scores"
          ? await client.scoresSnapshot(fixtureId!)
          : await client.historicalScores(fixtureId!);

  const suffix = fixtureId ? `.${safeId(fixtureId)}` : "";
  const outputDirectory = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    "txline"
  );
  const outputPath = path.join(
    outputDirectory,
    `${kind}${suffix}.snapshot.json`
  );

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(sanitize(payload), null, 2)}\n`,
    "utf8"
  );

  console.log(`Captured ${kind} payload at ${outputPath}`);
  console.log("Inspect the file before committing it.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

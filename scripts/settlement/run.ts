import { loadEnvConfig } from "@next/env";

import { persistMatchEvent, persistOddsRow } from "../../src/lib/ingestion/persist";
import { upsertFeedCursor } from "../../src/lib/ingestion/cursors";
import { settleFixture } from "../../src/lib/game/settle";
import { logError, logInfo } from "../../src/lib/logging/logger";
import { readFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

async function readJsonOptional(relativePath: string): Promise<unknown[] | null> {
  try {
    const absolute = path.join(process.cwd(), relativePath);
    const payload = JSON.parse(await readFile(absolute, "utf8")) as unknown;
    return Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

async function main() {
  const fixtureId = process.argv[2] ?? "18257865";
  const allowCorrection = process.argv.includes("--correct");

  await upsertFeedCursor("scores", { status: "connected", mode: "replay" });
  await upsertFeedCursor("odds", { status: "connected", mode: "replay" });

  const finalScores = await readJsonOptional(
    `tests/fixtures/txline/scores.${fixtureId}.final.json`
  );
  if (finalScores) {
    for (const row of finalScores) {
      await persistMatchEvent(row);
    }
  }

  // Keep in-play markets available until settlement closes them.
  const liveOdds = await readJsonOptional(
    `tests/fixtures/txline/odds.${fixtureId}.live.json`
  );
  if (liveOdds) {
    for (const row of liveOdds) {
      await persistOddsRow(row, {
        nowMs: Number.MAX_SAFE_INTEGER,
        maxAgeMs: Number.MAX_SAFE_INTEGER,
      });
    }
  }

  const result = await settleFixture({
    sourceFixtureId: fixtureId,
    allowCorrection,
    checkPda: process.argv.includes("--pda"),
  });

  logInfo("settlement.run.complete", result);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  logError("settlement.run.failed", error);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

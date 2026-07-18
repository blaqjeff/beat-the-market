import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { upsertFeedCursor } from "../../src/lib/ingestion/cursors";
import {
  persistFixture,
  persistMatchEvent,
  persistOddsRow,
} from "../../src/lib/ingestion/persist";
import { logError, logInfo } from "../../src/lib/logging/logger";

loadEnvConfig(process.cwd());

async function readJson(relativePath: string): Promise<unknown> {
  const absolute = path.join(process.cwd(), relativePath);
  return JSON.parse(await readFile(absolute, "utf8")) as unknown;
}

async function main() {
  const fixtureId = process.argv[2] ?? "18257865";
  const competitionId = process.argv[3] ?? "72";

  await upsertFeedCursor("odds", { status: "connected", mode: "replay" });
  await upsertFeedCursor("scores", { status: "connected", mode: "replay" });

  const fixtures = (await readJson(
    `tests/fixtures/txline/fixtures.${competitionId}.snapshot.json`
  )) as unknown[];
  const odds = (await readJson(
    `tests/fixtures/txline/odds.${fixtureId}.snapshot.json`
  )) as unknown[];
  const scores = (await readJson(
    `tests/fixtures/txline/scores.${fixtureId}.snapshot.json`
  )) as unknown[];

  let fixturesUpserted = 0;
  for (const fixture of fixtures) {
    await persistFixture(fixture);
    fixturesUpserted += 1;
  }

  let oddsCreated = 0;
  let oddsDuplicate = 0;
  for (const row of odds) {
    const result = await persistOddsRow(row, {
      nowMs: Number.MAX_SAFE_INTEGER,
      maxAgeMs: Number.MAX_SAFE_INTEGER,
    });
    if (result.created) oddsCreated += 1;
    else oddsDuplicate += 1;
  }

  // Second pass proves idempotency.
  for (const row of odds) {
    const result = await persistOddsRow(row, {
      nowMs: Number.MAX_SAFE_INTEGER,
      maxAgeMs: Number.MAX_SAFE_INTEGER,
    });
    if (!result.created) oddsDuplicate += 1;
  }

  let eventsCreated = 0;
  let eventsDuplicate = 0;
  for (const row of scores) {
    const result = await persistMatchEvent(row);
    if (result.created) eventsCreated += 1;
    else eventsDuplicate += 1;
  }
  for (const row of scores) {
    const result = await persistMatchEvent(row);
    if (!result.created) eventsDuplicate += 1;
  }

  logInfo("ingestion.replay.complete", {
    fixtureId,
    fixturesUpserted,
    oddsCreated,
    oddsDuplicate,
    eventsCreated,
    eventsDuplicate,
  });

  console.log(
    JSON.stringify(
      {
        fixtureId,
        fixturesUpserted,
        oddsCreated,
        oddsDuplicate,
        eventsCreated,
        eventsDuplicate,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  logError("ingestion.replay.failed", error);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

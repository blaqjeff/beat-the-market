/**
 * Reset a fixture to a playable demo state (pre-settlement).
 * Removes final events, reopens markets, clears settled calls/receipts for that fixture.
 */
import { loadEnvConfig } from "@next/env";

import { prisma } from "../../src/lib/db/prisma";
import { persistMatchEvent, persistOddsRow } from "../../src/lib/ingestion/persist";
import { upsertFeedCursor } from "../../src/lib/ingestion/cursors";
import { readFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

async function readJson(relativePath: string): Promise<unknown[]> {
  const absolute = path.join(process.cwd(), relativePath);
  const payload = JSON.parse(await readFile(absolute, "utf8")) as unknown;
  return Array.isArray(payload) ? payload : [];
}

async function readJsonOptional(relativePath: string): Promise<unknown[]> {
  try {
    return await readJson(relativePath);
  } catch {
    return [];
  }
}

async function main() {
  const sourceFixtureId = process.argv[2] ?? "18257865";

  const fixture = await prisma().fixture.findUnique({
    where: { sourceFixtureId },
  });
  if (!fixture) {
    throw new Error(`Fixture ${sourceFixtureId} not found. Run ingestion:replay first.`);
  }

  await prisma().$transaction(async (tx) => {
    await tx.settlementReceipt.deleteMany({ where: { fixtureId: fixture.id } });
    await tx.pointLedgerEntry.deleteMany({ where: { fixtureId: fixture.id } });
    await tx.creditLedgerEntry.deleteMany({
      where: { account: { fixtureId: fixture.id } },
    });
    await tx.call.deleteMany({ where: { fixtureId: fixture.id } });
    await tx.matchCreditAccount.deleteMany({ where: { fixtureId: fixture.id } });
    await tx.scoreValidationProof.deleteMany({ where: { fixtureId: fixture.id } });
    await tx.matchEvent.deleteMany({ where: { fixtureId: fixture.id } });
    await tx.oddsSnapshot.deleteMany({ where: { fixtureId: fixture.id } });
    await tx.market.deleteMany({ where: { fixtureId: fixture.id } });
    await tx.fixture.update({
      where: { id: fixture.id },
      data: { gameState: "first_half", lastSourceTimestamp: null },
    });
  });

  await upsertFeedCursor("odds", { status: "connected", mode: "replay" });
  await upsertFeedCursor("scores", { status: "connected", mode: "replay" });

  const odds = await readJson(
    `tests/fixtures/txline/odds.${sourceFixtureId}.snapshot.json`
  );
  const liveOdds = await readJsonOptional(
    `tests/fixtures/txline/odds.${sourceFixtureId}.live.json`
  );
  const scores = await readJson(
    `tests/fixtures/txline/scores.${sourceFixtureId}.snapshot.json`
  );
  const liveScores = await readJsonOptional(
    `tests/fixtures/txline/scores.${sourceFixtureId}.live.json`
  );

  for (const row of [...odds, ...liveOdds]) {
    await persistOddsRow(row, {
      nowMs: Number.MAX_SAFE_INTEGER,
      maxAgeMs: Number.MAX_SAFE_INTEGER,
    });
  }
  for (const row of [...scores, ...liveScores]) {
    await persistMatchEvent(row);
  }

  // Ensure we are not left on a suspended/final event for demo calls.
  await prisma().fixture.update({
    where: { id: fixture.id },
    data: { gameState: "first_half" },
  });
  await prisma().market.updateMany({
    where: { fixtureId: fixture.id },
    data: { availability: "open" },
  });

  const markets = await prisma().market.count({
    where: { fixtureId: fixture.id, availability: "open" },
  });

  console.log(
    JSON.stringify(
      {
        sourceFixtureId,
        gameState: "first_half",
        openMarkets: markets,
        next: "Open /matches/" + sourceFixtureId + " and place a call",
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

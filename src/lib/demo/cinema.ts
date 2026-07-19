import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { upsertFeedCursor } from "@/lib/ingestion/cursors";
import {
  persistFixture,
  persistMatchEvent,
  persistOddsRow,
} from "@/lib/ingestion/persist";
import { settleFixture } from "@/lib/game/settle";
import { AppError } from "@/lib/errors/app-error";
import { serverEnv } from "@/lib/env/server";

export const DEMO_FIXTURE_ID = "18257865";

type DemoBeat = {
  id: string;
  label: string;
  hint?: string;
  odds?: unknown[];
  scores?: unknown[];
};

type DemoScript = {
  fixtureId: string;
  competitionId: string;
  title: string;
  beats: DemoBeat[];
};

export function demoCinemaAllowed(): boolean {
  const env = serverEnv();
  return (
    env.NODE_ENV !== "production" ||
    process.env.DEMO_CINEMA === "1" ||
    process.env.DEMO_CINEMA === "true"
  );
}

async function loadScript(fixtureId: string): Promise<DemoScript> {
  const absolute = path.join(
    process.cwd(),
    `tests/fixtures/txline/demo.${fixtureId}.beats.json`
  );
  const script = JSON.parse(await readFile(absolute, "utf8")) as DemoScript;
  if (!Array.isArray(script.beats) || script.beats.length === 0) {
    throw new AppError("conflict", "Demo cinema script has no beats");
  }
  return script;
}

async function readBeatIndex(fixtureId: string): Promise<number> {
  // Reuse scores cursor lastEventId: "cinema:<n>"
  const cursor = await prisma().feedCursor.findUnique({
    where: { stream: "scores" },
  });
  if (!cursor?.lastEventId?.startsWith(`cinema:${fixtureId}:`)) {
    return -1;
  }
  const raw = cursor.lastEventId.slice(`cinema:${fixtureId}:`.length);
  const index = Number(raw);
  return Number.isFinite(index) ? index : -1;
}

async function writeBeatIndex(fixtureId: string, index: number) {
  await upsertFeedCursor("odds", {
    status: "connected",
    mode: "cinema",
    lastEventId: `cinema:${fixtureId}:${index}`,
  });
  await upsertFeedCursor("scores", {
    status: "connected",
    mode: "cinema",
    lastEventId: `cinema:${fixtureId}:${index}`,
  });
}

async function applyBeat(beat: DemoBeat) {
  for (const row of beat.odds ?? []) {
    await persistOddsRow(row, {
      nowMs: Number.MAX_SAFE_INTEGER,
      maxAgeMs: Number.MAX_SAFE_INTEGER,
    });
  }
  for (const row of beat.scores ?? []) {
    await persistMatchEvent(row);
  }
}

export async function getCinemaStatus(fixtureId = DEMO_FIXTURE_ID) {
  const script = await loadScript(fixtureId);
  const index = await readBeatIndex(fixtureId);
  const current = index >= 0 ? script.beats[index] ?? null : null;
  const next =
    index + 1 < script.beats.length ? script.beats[index + 1]! : null;

  return {
    enabled: true,
    fixtureId,
    title: script.title,
    beatIndex: index,
    beatTotal: script.beats.length,
    currentLabel: current?.label ?? null,
    currentHint: current?.hint ?? null,
    nextLabel: next?.label ?? null,
    nextHint: next?.hint ?? null,
    done: index >= script.beats.length - 1,
    matchUrl: `/matches/${fixtureId}`,
  };
}

export async function resetCinema(fixtureId = DEMO_FIXTURE_ID) {
  if (!demoCinemaAllowed()) {
    throw new AppError("forbidden", "Demo cinema disabled in production");
  }

  const script = await loadScript(fixtureId);
  const fixturesPath = path.join(
    process.cwd(),
    `tests/fixtures/txline/fixtures.${script.competitionId}.snapshot.json`
  );
  const fixtures = JSON.parse(await readFile(fixturesPath, "utf8")) as unknown[];
  for (const fixture of fixtures) {
    await persistFixture(fixture);
  }

  const fixture = await prisma().fixture.findUnique({
    where: { sourceFixtureId: fixtureId },
  });
  if (!fixture) {
    throw new AppError("not_found", `Fixture ${fixtureId} missing after fixture sync`);
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
      data: { gameState: "scheduled", lastSourceTimestamp: null },
    });
  });

  const first = script.beats[0]!;
  await applyBeat(first);
  await writeBeatIndex(fixtureId, 0);
  await prisma().market.updateMany({
    where: { fixtureId: fixture.id },
    data: { availability: "open" },
  });
  await prisma().fixture.update({
    where: { id: fixture.id },
    data: { gameState: "scheduled" },
  });

  return getCinemaStatus(fixtureId);
}

export async function advanceCinema(fixtureId = DEMO_FIXTURE_ID) {
  if (!demoCinemaAllowed()) {
    throw new AppError("forbidden", "Demo cinema disabled in production");
  }

  const script = await loadScript(fixtureId);
  const index = await readBeatIndex(fixtureId);
  if (index < 0) {
    return resetCinema(fixtureId);
  }
  if (index >= script.beats.length - 1) {
    return {
      ...(await getCinemaStatus(fixtureId)),
      advanced: false as const,
      message: "Cinema already at full time",
    };
  }

  const nextIndex = index + 1;
  const beat = script.beats[nextIndex]!;
  await applyBeat(beat);
  await writeBeatIndex(fixtureId, nextIndex);

  const fixture = await prisma().fixture.findUnique({
    where: { sourceFixtureId: fixtureId },
  });
  if (fixture) {
    await prisma().market.updateMany({
      where: {
        fixtureId: fixture.id,
        availability: { in: ["stale", "unknown"] },
      },
      data: { availability: "open" },
    });
  }

  return {
    ...(await getCinemaStatus(fixtureId)),
    advanced: true as const,
    appliedLabel: beat.label,
    appliedBeatId: beat.id,
    message: beat.hint ?? beat.label,
  };
}

export async function settleCinema(fixtureId = DEMO_FIXTURE_ID) {
  if (!demoCinemaAllowed()) {
    throw new AppError("forbidden", "Demo cinema disabled in production");
  }
  const status = await getCinemaStatus(fixtureId);
  if (!status.done) {
    throw new AppError(
      "conflict",
      "Advance to full time before settling (or keep advancing)"
    );
  }
  const result = await settleFixture({
    sourceFixtureId: fixtureId,
    checkPda: false,
  });
  return { status, settlement: result };
}

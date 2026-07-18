import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
import {
  normalizeFixture,
  normalizeMatchEvent,
  normalizeOddsRow,
  type NormalizedMatchEvent,
  type NormalizedOddsRow,
} from "@/lib/ingestion/normalize";
import { serverEnv } from "@/lib/env/server";

async function upsertParticipant(
  tx: Prisma.TransactionClient,
  sourceParticipantId: string,
  name: string
) {
  return tx.participant.upsert({
    where: { sourceParticipantId },
    create: { sourceParticipantId, name },
    update: { name },
  });
}

export async function persistFixture(input: unknown) {
  const normalized = normalizeFixture(input);
  const source = normalized.source as Record<string, unknown>;
  const homeSourceId = String(
    source.Participant1Id ?? source.participant1Id ?? `${normalized.fixtureId}:1`
  );
  const awaySourceId = String(
    source.Participant2Id ?? source.participant2Id ?? `${normalized.fixtureId}:2`
  );

  return prisma().$transaction(async (tx) => {
    const home = await upsertParticipant(tx, homeSourceId, normalized.participant1);
    const away = await upsertParticipant(tx, awaySourceId, normalized.participant2);

    return tx.fixture.upsert({
      where: { sourceFixtureId: normalized.fixtureId },
      create: {
        sourceFixtureId: normalized.fixtureId,
        competitionId: normalized.competitionId,
        competitionName: String(
          source.Competition ?? source.competition ?? ""
        ) || null,
        fixtureGroupId:
          source.FixtureGroupId !== undefined ||
          source.fixtureGroupId !== undefined
            ? String(source.FixtureGroupId ?? source.fixtureGroupId)
            : null,
        homeParticipantId: home.id,
        awayParticipantId: away.id,
        participant1IsHome: normalized.participant1IsHome,
        startsAt: new Date(normalized.startsAt),
        gameState:
          normalized.gameState === null ? null : String(normalized.gameState),
        lastSourceTimestamp:
          source.Ts !== undefined || source.ts !== undefined
            ? BigInt(Number(source.Ts ?? source.ts))
            : null,
      },
      update: {
        competitionId: normalized.competitionId,
        competitionName: String(
          source.Competition ?? source.competition ?? ""
        ) || null,
        homeParticipantId: home.id,
        awayParticipantId: away.id,
        participant1IsHome: normalized.participant1IsHome,
        startsAt: new Date(normalized.startsAt),
        gameState:
          normalized.gameState === null ? null : String(normalized.gameState),
        lastSourceTimestamp:
          source.Ts !== undefined || source.ts !== undefined
            ? BigInt(Number(source.Ts ?? source.ts))
            : null,
      },
    });
  });
}

async function ensureFixtureShell(
  tx: Prisma.TransactionClient,
  sourceFixtureId: string
) {
  const existing = await tx.fixture.findUnique({
    where: { sourceFixtureId },
  });
  if (existing) return existing;

  const home = await upsertParticipant(
    tx,
    `${sourceFixtureId}:home`,
    "Participant 1"
  );
  const away = await upsertParticipant(
    tx,
    `${sourceFixtureId}:away`,
    "Participant 2"
  );

  return tx.fixture.create({
    data: {
      sourceFixtureId,
      homeParticipantId: home.id,
      awayParticipantId: away.id,
      startsAt: new Date(0),
      gameState: "unknown",
    },
  });
}

export async function persistOddsRow(
  input: unknown,
  options?: { maxAgeMs?: number; nowMs?: number }
) {
  const env = serverEnv();
  const normalized = normalizeOddsRow(input, {
    maxAgeMs: options?.maxAgeMs ?? env.TXLINE_MAX_SNAPSHOT_AGE_MS,
    nowMs: options?.nowMs,
  });

  return prisma().$transaction(async (tx) => {
    const existingOdds = await tx.oddsSnapshot.findUnique({
      where: { messageId: normalized.messageId },
    });
    if (existingOdds) {
      return { created: false as const, odds: existingOdds, marketId: existingOdds.marketId };
    }

    const fixture = await ensureFixtureShell(tx, normalized.sourceFixtureId);
    const market = await tx.market.upsert({
      where: { marketKey: normalized.marketKey },
      create: {
        fixtureId: fixture.id,
        marketKey: normalized.marketKey,
        superOddsType: normalized.superOddsType,
        marketParameters: normalized.marketParameters,
        marketPeriod: normalized.marketPeriod,
        inRunning: normalized.inRunning,
        availability: normalized.availability,
        lastSourceTimestamp: normalized.sourceTimestamp,
      },
      update: {
        inRunning: normalized.inRunning,
        availability: normalized.availability,
        lastSourceTimestamp: normalized.sourceTimestamp,
      },
    });

    const odds = await tx.oddsSnapshot.create({
      data: {
        fixtureId: fixture.id,
        marketId: market.id,
        messageId: normalized.messageId,
        bookmaker: normalized.bookmaker,
        bookmakerId: normalized.bookmakerId,
        priceNames: asJson(normalized.priceNames),
        prices: asJson(normalized.prices),
        pct: normalized.pct ? asJson(normalized.pct) : undefined,
        sourceTimestamp: normalized.sourceTimestamp,
        inRunning: normalized.inRunning,
        gameState: normalized.gameState,
        rawPayload: asJson(normalized.rawPayload),
      },
    });

    await tx.fixture.update({
      where: { id: fixture.id },
      data: {
        gameState: normalized.gameState ?? undefined,
        lastSourceTimestamp: normalized.sourceTimestamp,
      },
    });

    return { created: true as const, odds, marketId: market.id };
  });
}

export async function persistMatchEvent(input: unknown) {
  const normalized: NormalizedMatchEvent = normalizeMatchEvent(input);

  return prisma().$transaction(async (tx) => {
    const fixture = await ensureFixtureShell(tx, normalized.sourceFixtureId);
    const existing = await tx.matchEvent.findUnique({
      where: {
        fixtureId_sequence_action: {
          fixtureId: fixture.id,
          sequence: normalized.sequence,
          action: normalized.action,
        },
      },
    });
    if (existing) {
      return { created: false as const, event: existing };
    }

    const event = await tx.matchEvent.create({
      data: {
        fixtureId: fixture.id,
        sequence: normalized.sequence,
        action: normalized.action,
        gameState: normalized.gameState,
        sourceTimestamp: normalized.sourceTimestamp,
        stats: normalized.stats ? asJson(normalized.stats) : undefined,
        data: normalized.data ? asJson(normalized.data) : undefined,
        rawPayload: asJson(normalized.rawPayload),
      },
    });

    await tx.fixture.update({
      where: { id: fixture.id },
      data: {
        gameState: normalized.gameState ?? undefined,
        lastSourceTimestamp: normalized.sourceTimestamp ?? undefined,
      },
    });

    return { created: true as const, event };
  });
}

export async function markStaleMarkets(maxAgeMs: number, nowMs = Date.now()) {
  const cutoff = BigInt(nowMs - maxAgeMs);
  const result = await prisma().market.updateMany({
    where: {
      availability: { in: ["open", "unknown"] },
      OR: [
        { lastSourceTimestamp: null },
        { lastSourceTimestamp: { lt: cutoff } },
      ],
    },
    data: { availability: "stale" },
  });
  return result.count;
}

export type { NormalizedOddsRow };

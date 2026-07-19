import "server-only";

import { prisma } from "@/lib/db/prisma";
import { ensureMatchCredits } from "@/lib/game/credits";
import { buildLiveBoard } from "@/lib/game/live-context";
import { pickQuoteTrail } from "@/lib/game/odds-board";
import {
  isSupportedCallMarket,
  potentialPoints,
  probabilityBpsFromPct,
  multiplierMilliFromProbabilityBps,
} from "@/lib/game/scoring";
import { serverEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";
import { logInfo } from "@/lib/logging/logger";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export interface PlaceCallInput {
  userId: string;
  fixtureId: string;
  marketId: string;
  outcomeKey: string;
  credits: number;
  idempotencyKey: string;
}

export async function placeCall(input: PlaceCallInput) {
  if (!Number.isInteger(input.credits) || input.credits <= 0) {
    throw new AppError("validation", "Credits must be a positive integer");
  }
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    throw new AppError("validation", "Idempotency key is required");
  }

  const existing = await prisma().call.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    if (existing.userId !== input.userId) {
      throw new AppError("conflict", "Idempotency key belongs to another user");
    }
    return { call: existing, replayed: true as const };
  }

  await ensureMatchCredits(input.userId, input.fixtureId);
  const env = serverEnv();

  const call = await prisma().$transaction(async (tx) => {
    const market = await tx.market.findUnique({
      where: { id: input.marketId },
      include: {
        fixture: {
          include: {
            matchEvents: {
              orderBy: { sequence: "asc" },
              take: 80,
            },
          },
        },
        oddsSnapshots: {
          orderBy: { sourceTimestamp: "desc" },
          take: 20,
        },
      },
    });

    if (!market || market.fixtureId !== input.fixtureId) {
      throw new AppError("not_found", "Market not found for this fixture");
    }

    if (
      !isSupportedCallMarket({
        superOddsType: market.superOddsType,
        inRunning: market.inRunning,
        marketPeriod: market.marketPeriod,
      })
    ) {
      throw new AppError("validation", "Market is not available for calls");
    }

    const demoFeed = await tx.feedCursor.findFirst({
      where: { mode: { in: ["replay", "cinema"] } },
    });

    if (
      market.availability === "suspended" ||
      market.availability === "closed"
    ) {
      throw new AppError("conflict", `Market is ${market.availability}`);
    }

    const live = buildLiveBoard({
      gameState: market.fixture.gameState,
      participant1IsHome: market.fixture.participant1IsHome,
      events: market.fixture.matchEvents.map((event) => ({
        sequence: event.sequence,
        action: event.action,
        gameState: event.gameState,
        sourceTimestamp: event.sourceTimestamp,
        stats: event.stats,
        data: event.data,
        rawPayload: event.rawPayload,
      })),
    });

    if (live.phase === "finished") {
      throw new AppError("conflict", "Match is finished");
    }
    if (live.phase === "suspended" || live.callsBlocked) {
      throw new AppError(
        "conflict",
        live.blockReason ?? "Calls are blocked during this match state"
      );
    }

    const latest = pickQuoteTrail(market.oddsSnapshots).latest;
    if (!latest) {
      throw new AppError("conflict", "No price is available for this market");
    }

    // Cinema/replay use fixture timestamps, not wall-clock freshness.
    // Gate on quote age only — availability "stale" is a UI hint and can lag.
    if (!demoFeed) {
      const ageMs = Date.now() - Number(latest.sourceTimestamp);
      if (ageMs > env.TXLINE_MAX_SNAPSHOT_AGE_MS) {
        throw new AppError("conflict", "Market price is stale");
      }
    }

    const priceNames = asStringArray(latest.priceNames);
    const pctValues = asStringArray(latest.pct);
    const outcomeIndex = priceNames.indexOf(input.outcomeKey);
    if (outcomeIndex < 0) {
      throw new AppError("validation", "Unknown outcome for this market");
    }

    const probabilityBps = probabilityBpsFromPct(pctValues[outcomeIndex] ?? "NA");
    if (probabilityBps === null) {
      throw new AppError("conflict", "Outcome probability is unavailable");
    }

    const multiplierMilli = multiplierMilliFromProbabilityBps(probabilityBps);
    const points = potentialPoints(input.credits, multiplierMilli);

    const account = await tx.matchCreditAccount.findUnique({
      where: {
        userId_fixtureId: {
          userId: input.userId,
          fixtureId: input.fixtureId,
        },
      },
    });
    if (!account) {
      throw new AppError("internal", "Match credit account missing");
    }
    if (account.remainingCredits < input.credits) {
      throw new AppError("conflict", "Insufficient match credits");
    }

    const updated = await tx.matchCreditAccount.updateMany({
      where: {
        id: account.id,
        version: account.version,
        remainingCredits: { gte: input.credits },
      },
      data: {
        remainingCredits: account.remainingCredits - input.credits,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new AppError(
        "conflict",
        "Could not reserve credits; retry with a fresh balance"
      );
    }

    const created = await tx.call.create({
      data: {
        userId: input.userId,
        fixtureId: input.fixtureId,
        marketId: market.id,
        oddsSnapshotId: latest.id,
        outcomeKey: input.outcomeKey,
        credits: input.credits,
        probabilityBps,
        multiplierMilli,
        potentialPoints: points,
        sourceTimestamp: BigInt(latest.sourceTimestamp),
        homeScoreAtCall: live.score.home,
        awayScoreAtCall: live.score.away,
        matchMinuteAtCall: live.clock.minutes,
        gameStateAtCall: live.gameState,
        inRunningAtCall: market.inRunning,
        status: "pending",
        idempotencyKey: input.idempotencyKey,
      },
    });

    await tx.creditLedgerEntry.create({
      data: {
        accountId: account.id,
        callId: created.id,
        kind: "spend",
        amount: input.credits,
        balanceAfter: account.remainingCredits - input.credits,
      },
    });

    return created;
  });

  logInfo("game.call.placed", {
    callId: call.id,
    userId: input.userId,
    fixtureId: input.fixtureId,
    credits: input.credits,
    inRunningAtCall: call.inRunningAtCall,
  });

  return { call, replayed: false as const };
}

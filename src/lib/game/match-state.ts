import "server-only";

import { prisma } from "@/lib/db/prisma";
import { ensureMatchCredits } from "@/lib/game/credits";
import {
  buildLiveBoard,
  probabilityDeltaBps,
} from "@/lib/game/live-context";
import {
  isGoalscorerMarketType,
  isSupportedCallMarket,
  quoteOutcome,
  STARTING_MATCH_CREDITS,
} from "@/lib/game/scoring";
import { AppError } from "@/lib/errors/app-error";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function getMatchState(sourceFixtureId: string, userId?: string) {
  const fixture = await prisma().fixture.findUnique({
    where: { sourceFixtureId },
    include: {
      homeParticipant: true,
      awayParticipant: true,
      matchEvents: {
        orderBy: { sequence: "asc" },
        take: 80,
      },
      markets: {
        include: {
          oddsSnapshots: {
            orderBy: { sourceTimestamp: "desc" },
            take: 2,
          },
        },
        orderBy: [{ inRunning: "desc" }, { superOddsType: "asc" }],
      },
    },
  });

  if (!fixture) {
    throw new AppError("not_found", "Fixture not found");
  }

  const anySuspended = fixture.markets.some(
    (market) =>
      isSupportedCallMarket({
        superOddsType: market.superOddsType,
        inRunning: market.inRunning,
        marketPeriod: market.marketPeriod,
      }) && market.availability === "suspended"
  );

  const live = buildLiveBoard({
    gameState: fixture.gameState,
    participant1IsHome: fixture.participant1IsHome,
    events: fixture.matchEvents.map((event) => ({
      sequence: event.sequence,
      action: event.action,
      gameState: event.gameState,
      sourceTimestamp: event.sourceTimestamp,
      stats: event.stats,
      data: event.data,
      rawPayload: event.rawPayload,
    })),
    marketsSuspended: anySuspended,
  });

  const markets = fixture.markets
    .filter((market) =>
      isSupportedCallMarket({
        superOddsType: market.superOddsType,
        inRunning: market.inRunning,
        marketPeriod: market.marketPeriod,
      })
    )
    .map((market) => {
      const latest = market.oddsSnapshots[0] ?? null;
      const previous = market.oddsSnapshots[1] ?? null;
      const priceNames = latest ? asStringArray(latest.priceNames) : [];
      const pctValues = latest ? asStringArray(latest.pct) : [];
      const previousPct = previous ? asStringArray(previous.pct) : [];
      const previousNames = previous ? asStringArray(previous.priceNames) : [];

      const outcomes = priceNames.map((key, index) => {
        const quote = quoteOutcome(pctValues[index] ?? "NA", 100);
        const prevIndex = previousNames.indexOf(key);
        const deltaBps =
          prevIndex >= 0
            ? probabilityDeltaBps(
                pctValues[index] ?? null,
                previousPct[prevIndex] ?? null
              )
            : null;
        return {
          key,
          label: key,
          pct: pctValues[index] ?? null,
          probabilityBps: quote?.probabilityBps ?? null,
          multiplierMilli: quote?.multiplierMilli ?? null,
          potentialPointsPer100: quote?.potentialPoints ?? null,
          deltaBps,
        };
      });

      return {
        id: market.id,
        superOddsType: market.superOddsType,
        marketParameters: market.marketParameters,
        availability: market.availability,
        inRunning: market.inRunning,
        sourceTimestamp: latest ? latest.sourceTimestamp.toString() : null,
        oddsSnapshotId: latest?.id ?? null,
        outcomes,
      };
    });

  const goalscorerPresent = fixture.markets.some((market) =>
    isGoalscorerMarketType(market.superOddsType)
  );

  const [oddsCursor, scoresCursor] = await Promise.all([
    prisma().feedCursor.findUnique({ where: { stream: "odds" } }),
    prisma().feedCursor.findUnique({ where: { stream: "scores" } }),
  ]);

  let credits: {
    startingCredits: number;
    remainingCredits: number;
  } | null = null;
  let calls: Array<{
    id: string;
    marketId: string;
    outcomeKey: string;
    credits: number;
    probabilityBps: number;
    multiplierMilli: number;
    potentialPoints: number;
    status: string;
    homeScoreAtCall: number | null;
    awayScoreAtCall: number | null;
    matchMinuteAtCall: number | null;
    gameStateAtCall: string | null;
    inRunningAtCall: boolean;
    createdAt: string;
  }> = [];

  if (userId) {
    const account = await ensureMatchCredits(userId, fixture.id);
    credits = {
      startingCredits: account.startingCredits,
      remainingCredits: account.remainingCredits,
    };
    const rows = await prisma().call.findMany({
      where: { userId, fixtureId: fixture.id },
      orderBy: { createdAt: "desc" },
    });
    calls = rows.map((row) => ({
      id: row.id,
      marketId: row.marketId,
      outcomeKey: row.outcomeKey,
      credits: row.credits,
      probabilityBps: row.probabilityBps,
      multiplierMilli: row.multiplierMilli,
      potentialPoints: row.potentialPoints,
      status: row.status,
      homeScoreAtCall: row.homeScoreAtCall,
      awayScoreAtCall: row.awayScoreAtCall,
      matchMinuteAtCall: row.matchMinuteAtCall,
      gameStateAtCall: row.gameStateAtCall,
      inRunningAtCall: row.inRunningAtCall,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  const projectedPoints = calls
    .filter((call) => call.status === "pending")
    .reduce((sum, call) => sum + call.potentialPoints, 0);

  return {
    fixture: {
      id: fixture.id,
      sourceFixtureId: fixture.sourceFixtureId,
      competitionName: fixture.competitionName,
      startsAt: fixture.startsAt.toISOString(),
      gameState: fixture.gameState,
      home: fixture.homeParticipant.name,
      away: fixture.awayParticipant.name,
      participant1IsHome: fixture.participant1IsHome,
    },
    live,
    feed: {
      odds: {
        status: oddsCursor?.status ?? "unknown",
        mode: oddsCursor?.mode ?? null,
        lastMessageAt: oddsCursor?.lastMessageAt?.toISOString() ?? null,
        reconnectCount: oddsCursor?.reconnectCount ?? 0,
      },
      scores: {
        status: scoresCursor?.status ?? "unknown",
        mode: scoresCursor?.mode ?? null,
        lastMessageAt: scoresCursor?.lastMessageAt?.toISOString() ?? null,
        reconnectCount: scoresCursor?.reconnectCount ?? 0,
      },
    },
    goalscorer: {
      status: goalscorerPresent ? ("available" as const) : ("unavailable" as const),
      reason: goalscorerPresent
        ? null
        : "TxLINE has not published first/next goalscorer markets for this fixture.",
    },
    credits: credits ?? {
      startingCredits: STARTING_MATCH_CREDITS,
      remainingCredits: STARTING_MATCH_CREDITS,
    },
    projectedPoints,
    signedIn: Boolean(userId),
    markets,
    calls,
  };
}

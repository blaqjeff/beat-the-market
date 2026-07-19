import "server-only";

import { prisma } from "@/lib/db/prisma";
import { ensureMatchCredits } from "@/lib/game/credits";
import {
  demoCinemaAllowed,
  getCinemaStatus,
} from "@/lib/demo/cinema";
import {
  buildLiveBoard,
  homeOddsBiasBps,
  probabilityDeltaBps,
} from "@/lib/game/live-context";
import {
  buildBookmakerSpread,
  pickQuoteTrail,
  spreadRangeBps,
} from "@/lib/game/odds-board";
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
            take: 40,
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

  const markets = fixture.markets
    .filter((market) =>
      isSupportedCallMarket({
        superOddsType: market.superOddsType,
        inRunning: market.inRunning,
        marketPeriod: market.marketPeriod,
      })
    )
    .map((market) => {
      const { latest, previous } = pickQuoteTrail(market.oddsSnapshots);
      const priceNames = latest ? asStringArray(latest.priceNames) : [];
      const pctValues = latest ? asStringArray(latest.pct) : [];
      const previousPct = previous ? asStringArray(previous.pct) : [];
      const previousNames = previous ? asStringArray(previous.priceNames) : [];
      const bookmakers = buildBookmakerSpread(market.oddsSnapshots);

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
        const spread = spreadRangeBps(bookmakers, key);
        return {
          key,
          label: key,
          pct: pctValues[index] ?? null,
          probabilityBps: quote?.probabilityBps ?? null,
          multiplierMilli: quote?.multiplierMilli ?? null,
          potentialPointsPer100: quote?.potentialPoints ?? null,
          deltaBps,
          bookmakerSpreadBps: spread?.widthBps ?? null,
          bookmakerMinPct: spread ? (spread.minBps / 100).toFixed(1) : null,
          bookmakerMaxPct: spread ? (spread.maxBps / 100).toFixed(1) : null,
        };
      });

      return {
        id: market.id,
        superOddsType: market.superOddsType,
        marketParameters: market.marketParameters,
        marketPeriod: market.marketPeriod,
        availability: market.availability,
        inRunning: market.inRunning,
        sourceTimestamp: latest ? latest.sourceTimestamp.toString() : null,
        oddsSnapshotId: latest?.id ?? null,
        quoteBookmaker: latest?.bookmaker ?? null,
        bookmakers,
        outcomes,
      };
    });

  const fullMatch1x2 =
    markets.find(
      (market) =>
        market.superOddsType === "1X2_PARTICIPANT_RESULT" &&
        !market.marketPeriod &&
        market.inRunning
    ) ??
    markets.find(
      (market) =>
        market.superOddsType === "1X2_PARTICIPANT_RESULT" && !market.marketPeriod
    );

  const oddsBiasHomeBps = fullMatch1x2
    ? homeOddsBiasBps({
        participant1IsHome: fixture.participant1IsHome,
        outcomes: fullMatch1x2.outcomes,
      })
    : null;

  const live = buildLiveBoard({
    gameState: fixture.gameState,
    participant1IsHome: fixture.participant1IsHome,
    homeName: fixture.homeParticipant.name,
    awayName: fixture.awayParticipant.name,
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
    oddsBiasHomeBps,
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
    pointsAwarded: number;
    status: string;
    result: string | null;
    homeScoreAtCall: number | null;
    awayScoreAtCall: number | null;
    matchMinuteAtCall: number | null;
    gameStateAtCall: string | null;
    inRunningAtCall: boolean;
    hasReceipt: boolean;
    finalHomeScore: number | null;
    finalAwayScore: number | null;
    createdAt: string;
    liveProbabilityBps: number | null;
    consensusDeltaBps: number | null;
    consensusLean: "with_you" | "against_you" | "flat" | null;
  }> = [];

  if (userId) {
    const account = await ensureMatchCredits(userId, fixture.id);
    credits = {
      startingCredits: account.startingCredits,
      remainingCredits: account.remainingCredits,
    };
    const rows = await prisma().call.findMany({
      where: { userId, fixtureId: fixture.id },
      include: {
        receipt: {
          select: { id: true, finalHomeScore: true, finalAwayScore: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    calls = rows.map((row) => {
      const market = markets.find((item) => item.id === row.marketId);
      const liveOutcome = market?.outcomes.find(
        (outcome) => outcome.key === row.outcomeKey
      );
      const liveProbabilityBps = liveOutcome?.probabilityBps ?? null;
      const consensusDeltaBps =
        liveProbabilityBps === null
          ? null
          : liveProbabilityBps - row.probabilityBps;
      let consensusLean: "with_you" | "against_you" | "flat" | null = null;
      if (row.status === "pending" && consensusDeltaBps !== null) {
        if (Math.abs(consensusDeltaBps) < 25) consensusLean = "flat";
        else if (consensusDeltaBps > 0) consensusLean = "with_you";
        else consensusLean = "against_you";
      }
      return {
        id: row.id,
        marketId: row.marketId,
        outcomeKey: row.outcomeKey,
        credits: row.credits,
        probabilityBps: row.probabilityBps,
        multiplierMilli: row.multiplierMilli,
        potentialPoints: row.potentialPoints,
        pointsAwarded: row.pointsAwarded,
        status: row.status,
        result: row.result,
        homeScoreAtCall: row.homeScoreAtCall,
        awayScoreAtCall: row.awayScoreAtCall,
        matchMinuteAtCall: row.matchMinuteAtCall,
        gameStateAtCall: row.gameStateAtCall,
        inRunningAtCall: row.inRunningAtCall,
        hasReceipt: Boolean(row.receipt),
        finalHomeScore: row.receipt?.finalHomeScore ?? null,
        finalAwayScore: row.receipt?.finalAwayScore ?? null,
        createdAt: row.createdAt.toISOString(),
        liveProbabilityBps,
        consensusDeltaBps,
        consensusLean,
      };
    });
  }

  const projectedPoints = calls
    .filter((call) => call.status === "pending")
    .reduce((sum, call) => sum + call.potentialPoints, 0);
  const settledPoints = calls.reduce((sum, call) => sum + call.pointsAwarded, 0);

  let demo: Awaited<ReturnType<typeof getCinemaStatus>> | null = null;
  if (
    demoCinemaAllowed() &&
    (scoresCursor?.mode === "cinema" || oddsCursor?.mode === "cinema")
  ) {
    try {
      demo = await getCinemaStatus(fixture.sourceFixtureId);
    } catch {
      demo = null;
    }
  }

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
    live: {
      ...live,
      sideStats: {
        home: live.sideStats.home,
        away: live.sideStats.away,
      },
      firstHalfScore: live.firstHalfScore,
      momentum: live.momentum,
    },
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
    demo,
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
    settledPoints,
    signedIn: Boolean(userId),
    markets,
    calls,
  };
}

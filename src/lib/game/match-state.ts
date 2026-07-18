import "server-only";

import { prisma } from "@/lib/db/prisma";
import { ensureMatchCredits } from "@/lib/game/credits";
import {
  isSupportedPrematchMarket,
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
      markets: {
        include: {
          oddsSnapshots: {
            orderBy: { sourceTimestamp: "desc" },
            take: 1,
          },
        },
        orderBy: { superOddsType: "asc" },
      },
    },
  });

  if (!fixture) {
    throw new AppError("not_found", "Fixture not found");
  }

  const markets = fixture.markets
    .filter((market) =>
      isSupportedPrematchMarket({
        superOddsType: market.superOddsType,
        inRunning: market.inRunning,
        marketPeriod: market.marketPeriod,
      })
    )
    .map((market) => {
      const latest = market.oddsSnapshots[0] ?? null;
      const priceNames = latest ? asStringArray(latest.priceNames) : [];
      const pctValues = latest ? asStringArray(latest.pct) : [];
      const outcomes = priceNames.map((key, index) => {
        const quote = quoteOutcome(pctValues[index] ?? "NA", 100);
        return {
          key,
          label: key,
          pct: pctValues[index] ?? null,
          probabilityBps: quote?.probabilityBps ?? null,
          multiplierMilli: quote?.multiplierMilli ?? null,
          potentialPointsPer100: quote?.potentialPoints ?? null,
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
      createdAt: row.createdAt.toISOString(),
    }));
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
    },
    credits: credits ?? {
      startingCredits: STARTING_MATCH_CREDITS,
      remainingCredits: STARTING_MATCH_CREDITS,
    },
    signedIn: Boolean(userId),
    markets,
    calls,
  };
}

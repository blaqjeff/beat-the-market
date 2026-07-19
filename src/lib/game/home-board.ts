import "server-only";

import { prisma } from "@/lib/db/prisma";
import { buildLiveBoard } from "@/lib/game/live-context";
import { fixturePhasePill } from "@/lib/game/labels";

export type HomeFixtureCard = {
  sourceFixtureId: string;
  home: string;
  away: string;
  startsAt: Date;
  competitionName: string | null;
  gameState: string | null;
  phasePill: string;
  score: { home: number; away: number } | null;
  clockDisplay: string | null;
  momentumLabel: string | null;
  sortRank: number;
};

function phaseRank(phase: string, startsAt: Date): number {
  if (phase === "in_play") return 0;
  if (phase === "suspended") return 1;
  if (phase === "prematch") return 2 + startsAt.getTime() / 1e15;
  if (phase === "finished") return 4;
  return 3;
}

export async function getHomeFixtureBoard(limit = 24): Promise<HomeFixtureCard[]> {
  const rows = await prisma().fixture.findMany({
    orderBy: { startsAt: "asc" },
    include: {
      homeParticipant: true,
      awayParticipant: true,
      matchEvents: {
        orderBy: { sequence: "asc" },
        take: 40,
      },
    },
    take: limit,
  });

  const cards = rows.map((row) => {
    const live = buildLiveBoard({
      gameState: row.gameState,
      participant1IsHome: row.participant1IsHome,
      homeName: row.homeParticipant.name,
      awayName: row.awayParticipant.name,
      events: row.matchEvents.map((event) => ({
        sequence: event.sequence,
        action: event.action,
        gameState: event.gameState,
        sourceTimestamp: event.sourceTimestamp,
        stats: event.stats,
        data: event.data,
        rawPayload: event.rawPayload,
      })),
    });

    const showScore =
      live.phase === "in_play" ||
      live.phase === "finished" ||
      live.phase === "suspended" ||
      live.score.home + live.score.away > 0;

    return {
      sourceFixtureId: row.sourceFixtureId,
      home: row.homeParticipant.name,
      away: row.awayParticipant.name,
      startsAt: row.startsAt,
      competitionName: row.competitionName,
      gameState: row.gameState,
      phasePill: fixturePhasePill(row.gameState),
      score: showScore ? live.score : null,
      clockDisplay: live.clock.display,
      momentumLabel:
        live.phase === "in_play" || live.phase === "suspended"
          ? live.momentum.label
          : null,
      sortRank: phaseRank(live.phase, row.startsAt),
    } satisfies HomeFixtureCard;
  });

  return cards.sort((a, b) => a.sortRank - b.sortRank);
}

import "server-only";

import historyJson from "@/data/world-cup-2026-history.json";
import { prisma } from "@/lib/db/prisma";
import { buildLiveBoard } from "@/lib/game/live-context";

export type WorldCupHistoryMatch = {
  id: string;
  round: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  playedAt: string;
  venue: string | null;
  summary: string;
  /** Present when this row maps to an in-app match centre fixture. */
  sourceFixtureId: string | null;
};

type HistoryFile = {
  tournament: string;
  matches: Array<{
    id: string;
    round: string;
    home: string;
    away: string;
    homeScore: number;
    awayScore: number;
    playedAt: string;
    venue?: string;
    summary: string;
    sourceFixtureId?: string;
  }>;
};

function resultLine(home: string, away: string, homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return `${home} win`;
  if (awayScore > homeScore) return `${away} win`;
  return "Draw";
}

export async function getWorldCupHistory(
  limit = 80
): Promise<{
  tournament: string;
  matches: Array<
    WorldCupHistoryMatch & {
      resultLabel: string;
      playedLabel: string;
    }
  >;
}> {
  const file = historyJson as HistoryFile;
  const curated = file.matches.map((match) => ({
    id: match.id,
    round: match.round,
    home: match.home,
    away: match.away,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    playedAt: match.playedAt,
    venue: match.venue ?? null,
    summary: match.summary,
    sourceFixtureId: match.sourceFixtureId ?? null,
  }));

  // Prefer exact gameState values — avoid relying on case-insensitive filters.
  let fromDb: WorldCupHistoryMatch[] = [];
  try {
    const finished = await prisma().fixture.findMany({
      include: {
        homeParticipant: true,
        awayParticipant: true,
        matchEvents: { orderBy: { sequence: "asc" }, take: 80 },
      },
      orderBy: { startsAt: "desc" },
      take: 48,
    });

    const curatedIds = new Set(
      curated.map((row) => row.sourceFixtureId).filter(Boolean)
    );

    fromDb = finished
      .map((row) => {
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
        return { row, live };
      })
      .filter(
        ({ row, live }) =>
          live.phase === "finished" && !curatedIds.has(row.sourceFixtureId)
      )
      .map(({ row, live }) => {
        const home = row.homeParticipant.name;
        const away = row.awayParticipant.name;
        const homeScore = live.score.home;
        const awayScore = live.score.away;
        return {
          id: `db-${row.sourceFixtureId}`,
          round: row.competitionName ?? "World Cup",
          home,
          away,
          homeScore,
          awayScore,
          playedAt: row.startsAt.toISOString(),
          venue: null,
          summary: `${home} ${homeScore}–${awayScore} ${away}. Full-time result from the live feed.`,
          sourceFixtureId: row.sourceFixtureId,
        };
      });
  } catch {
    fromDb = [];
  }

  const merged = [...curated, ...fromDb]
    .sort(
      (a, b) =>
        new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    )
    .slice(0, limit)
    .map((match) => ({
      ...match,
      resultLabel: resultLine(
        match.home,
        match.away,
        match.homeScore,
        match.awayScore
      ),
      playedLabel: new Date(match.playedAt).toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));

  return { tournament: file.tournament, matches: merged };
}

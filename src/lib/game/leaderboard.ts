import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  computeCompetitionStats,
  isRemarkableCall,
  rankPlayers,
  type RankablePlayer,
} from "@/lib/game/competition-stats";

async function settledCallsForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  return prisma().call.findMany({
    where: {
      userId: { in: userIds },
      status: { in: ["settled", "void"] },
    },
    select: {
      id: true,
      userId: true,
      result: true,
      pointsAwarded: true,
      potentialPoints: true,
      probabilityBps: true,
      multiplierMilli: true,
      credits: true,
      settledAt: true,
    },
  });
}

export async function getLeaderboard(limit = 50, userIds?: string[]) {
  const ledgerWhere = userIds ? { userId: { in: userIds } } : {};
  const grouped = await prisma().pointLedgerEntry.groupBy({
    by: ["userId"],
    where: ledgerWhere,
    _sum: { points: true },
  });

  const ids = grouped.map((row) => row.userId);
  const users = await prisma().user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, displayName: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  const calls = await settledCallsForUsers(ids);
  const callsByUser = new Map<string, typeof calls>();
  for (const call of calls) {
    const list = callsByUser.get(call.userId) ?? [];
    list.push(call);
    callsByUser.set(call.userId, list);
  }

  const enriched = grouped.map((row) => {
    const user = byId.get(row.userId);
    const stats = computeCompetitionStats(
      (callsByUser.get(row.userId) ?? []).map((call) => ({
        result: call.result,
        pointsAwarded: call.pointsAwarded,
        potentialPoints: call.potentialPoints,
        probabilityBps: call.probabilityBps,
        multiplierMilli: call.multiplierMilli,
        credits: call.credits,
        settledAt: call.settledAt,
        callId: call.id,
      }))
    );
    const player: RankablePlayer = {
      userId: row.userId,
      username: user?.username ?? "unknown",
      displayName: user?.displayName ?? user?.username ?? "unknown",
      points: row._sum.points ?? 0,
      accuracyBps: stats.accuracyBps,
      decidedCalls: stats.decidedCalls,
    };
    return { player, stats };
  });

  const ranked = rankPlayers(enriched.map((row) => row.player)).slice(0, limit);
  const statsByUser = new Map(
    enriched.map((row) => [row.player.userId, row.stats] as const)
  );

  const rows = ranked.map((row) => {
    const stats = statsByUser.get(row.userId)!;
    return {
      ...row,
      wins: stats.wins,
      losses: stats.losses,
      currentWinStreak: stats.currentWinStreak,
      bestWinStreak: stats.bestWinStreak,
      marketBeatingScore: stats.marketBeating.score,
      biggestUpsetProbabilityBps: stats.biggestUpset?.probabilityBps ?? null,
    };
  });

  const ledgerTotal = await prisma().pointLedgerEntry.aggregate({
    where: ledgerWhere,
    _sum: { points: true },
  });
  const callTotal = await prisma().call.aggregate({
    _sum: { pointsAwarded: true },
    where: {
      status: { in: ["settled", "void"] },
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
  });

  return {
    rows,
    tieBreak:
      "highest points, then best accuracy, then more finished calls, then username A–Z",
    totals: {
      ledgerPoints: ledgerTotal._sum.points ?? 0,
      callPointsAwarded: callTotal._sum.pointsAwarded ?? 0,
    },
  };
}

export async function getProfileByUsername(username: string) {
  const user = await prisma().user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      createdAt: true,
    },
  });
  if (!user) return null;

  const [calls, receipts, board] = await Promise.all([
    prisma().call.findMany({
      where: { userId: user.id, status: { in: ["settled", "void"] } },
      select: {
        id: true,
        result: true,
        pointsAwarded: true,
        potentialPoints: true,
        probabilityBps: true,
        multiplierMilli: true,
        credits: true,
        settledAt: true,
      },
    }),
    prisma().settlementReceipt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        callId: true,
        result: true,
        pointsAwarded: true,
        narrative: true,
        createdAt: true,
        fixture: {
          select: {
            sourceFixtureId: true,
            homeParticipant: { select: { name: true } },
            awayParticipant: { select: { name: true } },
          },
        },
      },
    }),
    getLeaderboard(500),
  ]);

  const stats = computeCompetitionStats(
    calls.map((call) => ({
      result: call.result,
      pointsAwarded: call.pointsAwarded,
      potentialPoints: call.potentialPoints,
      probabilityBps: call.probabilityBps,
      multiplierMilli: call.multiplierMilli,
      credits: call.credits,
      settledAt: call.settledAt,
      callId: call.id,
    }))
  );

  const rankRow = board.rows.find((row) => row.userId === user.id) ?? null;

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? user.username,
      createdAt: user.createdAt.toISOString(),
    },
    rank: rankRow?.rank ?? null,
    stats,
    receipts: receipts.map((receipt) => ({
      id: receipt.id,
      callId: receipt.callId,
      result: receipt.result,
      pointsAwarded: receipt.pointsAwarded,
      narrative: receipt.narrative,
      createdAt: receipt.createdAt.toISOString(),
      match: `${receipt.fixture.homeParticipant.name} vs ${receipt.fixture.awayParticipant.name}`,
      sourceFixtureId: receipt.fixture.sourceFixtureId,
    })),
  };
}

export async function getReceipt(callId: string) {
  const receipt = await prisma().settlementReceipt.findUnique({
    where: { callId },
    include: {
      call: true,
      proof: true,
      fixture: {
        include: {
          homeParticipant: true,
          awayParticipant: true,
        },
      },
      user: {
        select: { id: true, username: true, displayName: true },
      },
    },
  });
  return receipt;
}

export async function getPublicShareCard(callId: string) {
  const receipt = await getReceipt(callId);
  if (!receipt || receipt.result !== "won") return null;

  const home = receipt.fixture.homeParticipant.name;
  const away = receipt.fixture.awayParticipant.name;
  const remarkable = isRemarkableCall({
    result: receipt.result,
    probabilityBps: receipt.probabilityBps,
    multiplierMilli: receipt.multiplierMilli,
    pointsAwarded: receipt.pointsAwarded,
  });

  return {
    callId: receipt.callId,
    username: receipt.user.username,
    displayName: receipt.user.displayName ?? receipt.user.username,
    match: `${home} vs ${away}`,
    home,
    away,
    sourceFixtureId: receipt.fixture.sourceFixtureId,
    outcomeKey: receipt.outcomeKey,
    credits: receipt.credits,
    pointsAwarded: receipt.pointsAwarded,
    probabilityBps: receipt.probabilityBps,
    multiplierMilli: receipt.multiplierMilli,
    finalScore: `${receipt.finalHomeScore}-${receipt.finalAwayScore}`,
    narrative: receipt.narrative,
    remarkable,
  };
}

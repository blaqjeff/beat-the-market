import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function getLeaderboard(limit = 50) {
  const grouped = await prisma().pointLedgerEntry.groupBy({
    by: ["userId"],
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: limit,
  });

  const userIds = grouped.map((row) => row.userId);
  const users = await prisma().user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, displayName: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));

  const rows = grouped.map((row, index) => {
    const user = byId.get(row.userId);
    return {
      rank: index + 1,
      userId: row.userId,
      username: user?.username ?? "unknown",
      displayName: user?.displayName ?? user?.username ?? "unknown",
      points: row._sum.points ?? 0,
    };
  });

  const ledgerTotal = await prisma().pointLedgerEntry.aggregate({
    _sum: { points: true },
  });
  const callTotal = await prisma().call.aggregate({
    _sum: { pointsAwarded: true },
    where: { status: { in: ["settled", "void"] } },
  });

  return {
    rows,
    totals: {
      ledgerPoints: ledgerTotal._sum.points ?? 0,
      callPointsAwarded: callTotal._sum.pointsAwarded ?? 0,
    },
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

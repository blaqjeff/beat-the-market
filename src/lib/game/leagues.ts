import "server-only";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { getLeaderboard } from "@/lib/game/leaderboard";
import { AppError } from "@/lib/errors/app-error";

function inviteCode(): string {
  return randomBytes(5).toString("base64url").slice(0, 8).toUpperCase();
}

export async function createLeague(input: {
  ownerId: string;
  name: string;
}) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 48) {
    throw new AppError("validation", "League name must be 2–48 characters");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = inviteCode();
    try {
      const league = await prisma().$transaction(async (tx) => {
        const created = await tx.league.create({
          data: {
            name,
            inviteCode: code,
            ownerId: input.ownerId,
            isPrivate: true,
          },
        });
        await tx.leagueMember.create({
          data: {
            leagueId: created.id,
            userId: input.ownerId,
          },
        });
        return created;
      });
      return league;
    } catch {
      // retry on invite code collision
    }
  }
  throw new AppError("internal", "Could not allocate an invite code");
}

export async function joinLeague(input: {
  userId: string;
  inviteCode: string;
}) {
  const code = input.inviteCode.trim().toUpperCase();
  const league = await prisma().league.findUnique({
    where: { inviteCode: code },
  });
  if (!league) {
    throw new AppError("not_found", "League invite not found");
  }

  await prisma().leagueMember.upsert({
    where: {
      leagueId_userId: {
        leagueId: league.id,
        userId: input.userId,
      },
    },
    create: {
      leagueId: league.id,
      userId: input.userId,
    },
    update: {},
  });

  return league;
}

export async function listUserLeagues(userId: string) {
  const memberships = await prisma().leagueMember.findMany({
    where: { userId },
    include: {
      league: {
        include: {
          _count: { select: { members: true } },
          owner: { select: { username: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((row) => ({
    id: row.league.id,
    name: row.league.name,
    inviteCode: row.league.inviteCode,
    memberCount: row.league._count.members,
    ownerUsername: row.league.owner.username,
    isOwner: row.league.ownerId === userId,
    joinedAt: row.joinedAt.toISOString(),
  }));
}

export async function getLeagueByInviteCode(inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();
  const league = await prisma().league.findUnique({
    where: { inviteCode: code },
    include: {
      owner: { select: { username: true, displayName: true } },
      members: {
        select: { userId: true },
      },
      _count: { select: { members: true } },
    },
  });
  if (!league) return null;

  const memberIds = league.members.map((member) => member.userId);
  const board = await getLeaderboard(100, memberIds);

  return {
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
    isPrivate: league.isPrivate,
    memberCount: league._count.members,
    owner: {
      username: league.owner.username,
      displayName: league.owner.displayName ?? league.owner.username,
    },
    board,
  };
}

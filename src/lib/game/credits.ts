import "server-only";

import { prisma } from "@/lib/db/prisma";
import { STARTING_MATCH_CREDITS } from "@/lib/game/scoring";

export async function ensureMatchCredits(userId: string, fixtureId: string) {
  const existing = await prisma().matchCreditAccount.findUnique({
    where: {
      userId_fixtureId: { userId, fixtureId },
    },
  });
  if (existing) return existing;

  try {
    return await prisma().$transaction(async (tx) => {
      const account = await tx.matchCreditAccount.create({
        data: {
          userId,
          fixtureId,
          startingCredits: STARTING_MATCH_CREDITS,
          remainingCredits: STARTING_MATCH_CREDITS,
        },
      });
      await tx.creditLedgerEntry.create({
        data: {
          accountId: account.id,
          kind: "grant",
          amount: STARTING_MATCH_CREDITS,
          balanceAfter: STARTING_MATCH_CREDITS,
        },
      });
      return account;
    });
  } catch {
    const raced = await prisma().matchCreditAccount.findUnique({
      where: {
        userId_fixtureId: { userId, fixtureId },
      },
    });
    if (!raced) throw new Error("Unable to grant match credits");
    return raced;
  }
}

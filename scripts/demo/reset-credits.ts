import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { prisma } from "../../src/lib/db/prisma";
import { STARTING_MATCH_CREDITS } from "../../src/lib/game/scoring";

async function main() {
  const db = prisma();
  const username = process.argv[2];

  const accounts = await db.matchCreditAccount.findMany({
    where: username
      ? { user: { username: { equals: username, mode: "insensitive" } } }
      : undefined,
    include: {
      user: { select: { username: true } },
      fixture: { select: { sourceFixtureId: true } },
    },
  });

  if (accounts.length === 0) {
    const users = await db.user.findMany({
      select: { username: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    console.log(
      JSON.stringify(
        { message: "No credit accounts found", users },
        null,
        2
      )
    );
    return;
  }

  for (const account of accounts) {
    await db.$transaction(async (tx) => {
      await tx.matchCreditAccount.update({
        where: { id: account.id },
        data: {
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
    });
    console.log(
      `Reset @${account.user.username} / ${account.fixture.sourceFixtureId} → ${STARTING_MATCH_CREDITS}`
    );
  }

  console.log(`Done. Reset ${accounts.length} account(s).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

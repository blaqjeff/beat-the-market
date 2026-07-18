import Link from "next/link";

import { getLeaderboard } from "@/lib/game/leaderboard";

export default async function LeaderboardPage() {
  const board = await getLeaderboard(50);
  const balanced =
    board.totals.ledgerPoints === board.totals.callPointsAwarded;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Competition
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">
        Leaderboard
      </h1>
      <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
        Rankings sum point ledger awards from settled calls. Multipliers come
        from frozen TxLINE implied probabilities at call time.
      </p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
        Ledger {board.totals.ledgerPoints} pts · calls{" "}
        {board.totals.callPointsAwarded} pts
        {balanced ? " · balanced" : " · mismatch"}
      </p>

      {board.rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-16 text-center text-[color:var(--muted)]">
          No settled points yet. Finish a match and run settlement.
        </div>
      ) : (
        <ol className="mt-10 space-y-3">
          {board.rows.map((row) => (
            <li
              key={row.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 px-5 py-4"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--signal)]">
                  #{row.rank}
                </p>
                <p className="mt-1 text-lg text-[color:var(--chalk)]">
                  {row.displayName}
                </p>
                <p className="text-sm text-[color:var(--muted)]">@{row.username}</p>
              </div>
              <p className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[color:var(--chalk)]">
                {row.points}
              </p>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-10 text-sm text-[color:var(--muted)]">
        <Link href="/" className="text-[color:var(--signal)] underline">
          Home
        </Link>
      </p>
    </main>
  );
}

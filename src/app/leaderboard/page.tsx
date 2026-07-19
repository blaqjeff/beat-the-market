import Link from "next/link";

import { StandingRow } from "@/components/competition/StandingRow";
import { getLeaderboard } from "@/lib/game/leaderboard";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const board = await getLeaderboard(50);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Competition
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">
        Leaderboard
      </h1>
      <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
        Ranked by settled points. Open a profile to follow every score back to a
        receipt.
      </p>

      {board.rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-16 text-center text-[color:var(--muted)]">
          No points yet — place calls on a live board and wait for settlement.
        </div>
      ) : (
        <ol className="mt-10 space-y-3">
          {board.rows.map((row) => (
            <StandingRow key={row.userId} row={row} />
          ))}
        </ol>
      )}

      <details className="mt-8 max-w-xl text-sm text-[color:var(--muted)]">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.16em] hover:text-[color:var(--chalk)]">
          How ranking works
        </summary>
        <p className="mt-3 leading-6">
          Points come from settled calls only. If players are level, we rank by{" "}
          {board.tieBreak}.
        </p>
      </details>

      <p className="mt-10 text-sm text-[color:var(--muted)]">
        <Link href="/leagues" className="text-[color:var(--signal)] underline">
          Private leagues
        </Link>
        {" · "}
        <Link href="/" className="text-[color:var(--signal)] underline">
          Home
        </Link>
      </p>
    </main>
  );
}

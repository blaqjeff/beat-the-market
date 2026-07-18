import Link from "next/link";

import { getLeagueByInviteCode } from "@/lib/game/leagues";

export const dynamic = "force-dynamic";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const league = await getLeagueByInviteCode(inviteCode);

  if (!league) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
          League not found
        </h1>
        <p className="mt-4 text-[color:var(--muted)]">
          Check the invite code or{" "}
          <Link href="/leagues" className="text-[color:var(--signal)] underline">
            browse your leagues
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Private league
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        {league.name}
      </h1>
      <p className="mt-4 text-[color:var(--muted)]">
        Owner @{league.owner.username} · {league.memberCount} members · invite{" "}
        <span className="font-mono text-[color:var(--chalk)]">
          {league.inviteCode}
        </span>
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
        Tie-break: {league.board.tieBreak}
      </p>

      {league.board.rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-16 text-center text-[color:var(--muted)]">
          No settled points in this league yet.
        </div>
      ) : (
        <ol className="mt-10 space-y-3">
          {league.board.rows.map((row) => (
            <li
              key={row.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 px-5 py-4"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--signal)]">
                  #{row.rank}
                </p>
                <Link
                  href={`/profile/${row.username}`}
                  className="mt-1 block text-lg text-[color:var(--chalk)] hover:text-[color:var(--signal)]"
                >
                  {row.displayName}
                </Link>
                <p className="text-sm text-[color:var(--muted)]">
                  {row.wins}W-{row.losses}L
                  {row.accuracyBps !== null
                    ? ` · ${(row.accuracyBps / 100).toFixed(0)}%`
                    : ""}
                  {row.currentWinStreak > 0
                    ? ` · streak ${row.currentWinStreak}`
                    : ""}
                </p>
              </div>
              <p className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[color:var(--chalk)]">
                {row.points}
              </p>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-10 text-sm text-[color:var(--muted)]">
        <Link href="/leagues" className="text-[color:var(--signal)] underline">
          All leagues
        </Link>
      </p>
    </main>
  );
}

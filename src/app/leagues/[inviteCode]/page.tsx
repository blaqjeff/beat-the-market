import Link from "next/link";

import { StandingRow } from "@/components/competition/StandingRow";
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

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-sm text-[color:var(--muted)]">
          Owner @{league.owner.username}
        </span>
        <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-sm text-[color:var(--muted)]">
          {league.memberCount} member{league.memberCount === 1 ? "" : "s"}
        </span>
        <span className="rounded-full border border-[color:var(--signal)]/30 bg-[color:var(--signal)]/10 px-3 py-1 font-mono text-sm tracking-wide text-[color:var(--signal)]">
          Invite {league.inviteCode}
        </span>
      </div>

      {league.board.rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-16 text-center text-[color:var(--muted)]">
          No settled points in this league yet.
        </div>
      ) : (
        <ol className="mt-10 space-y-3">
          {league.board.rows.map((row) => (
            <StandingRow key={row.userId} row={row} />
          ))}
        </ol>
      )}

      <details className="mt-8 max-w-xl text-sm text-[color:var(--muted)]">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.16em] hover:text-[color:var(--chalk)]">
          How ranking works
        </summary>
        <p className="mt-3 leading-6">
          Same rules as the global board. If players are level, we rank by{" "}
          {league.board.tieBreak}.
        </p>
      </details>

      <p className="mt-10 text-sm text-[color:var(--muted)]">
        <Link href="/leagues" className="text-[color:var(--signal)] underline">
          All leagues
        </Link>
      </p>
    </main>
  );
}

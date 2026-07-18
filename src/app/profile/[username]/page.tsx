import Link from "next/link";

import { getProfileByUsername } from "@/lib/game/leaderboard";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
          Profile
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
          @{username}
        </h1>
        <p className="mt-4 text-[color:var(--muted)]">
          Profile unavailable or not found.
        </p>
      </main>
    );
  }

  const { stats } = profile;
  const accuracy =
    stats.accuracyBps === null
      ? "—"
      : `${(stats.accuracyBps / 100).toFixed(0)}%`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Profile
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        @{profile.user.username}
      </h1>
      <p className="mt-4 text-[color:var(--muted)]">
        {profile.user.displayName}
        {profile.rank ? ` · global #${profile.rank}` : ""} · joined{" "}
        {profile.user.createdAt.slice(0, 10)}
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Points" value={String(stats.totalPoints)} />
        <Stat label="Accuracy" value={accuracy} />
        <Stat
          label="Record"
          value={`${stats.wins}W-${stats.losses}L-${stats.voids}V`}
        />
        <Stat
          label="Best streak"
          value={String(stats.bestWinStreak)}
          hint={
            stats.currentWinStreak > 0
              ? `current ${stats.currentWinStreak}`
              : undefined
          }
        />
        <Stat
          label="Market-beating"
          value={String(stats.marketBeating.score)}
          hint={`${stats.marketBeating.wins} underdog wins · ${stats.marketBeating.points} pts`}
        />
        <Stat
          label="Biggest upset"
          value={
            stats.biggestUpset
              ? `${(stats.biggestUpset.probabilityBps / 100).toFixed(1)}%`
              : "—"
          }
          hint={
            stats.biggestUpset
              ? `${stats.biggestUpset.pointsAwarded} pts`
              : undefined
          }
        />
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
          Receipt trail
        </h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Leaderboard points trace to these settlement receipts.
        </p>
        {profile.receipts.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            No settled calls yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {profile.receipts.map((receipt) => (
              <li key={receipt.id}>
                <Link
                  href={`/receipts/${receipt.callId}`}
                  className="block rounded-2xl border border-[color:var(--line)] px-5 py-4 transition hover:border-[color:var(--signal)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[color:var(--chalk)]">{receipt.match}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--signal)]">
                      {receipt.result} · {receipt.pointsAwarded} pts
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {receipt.narrative}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-sm text-[color:var(--muted)]">
        <Link href="/leaderboard" className="text-[color:var(--signal)] underline">
          Leaderboard
        </Link>
        {" · "}
        <Link href="/leagues" className="text-[color:var(--signal)] underline">
          Leagues
        </Link>
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl text-[color:var(--chalk)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[color:var(--muted)]">{hint}</p>}
    </div>
  );
}

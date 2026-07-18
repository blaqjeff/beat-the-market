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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
            Profile
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
            {profile.user.displayName ?? `@${profile.user.username}`}
          </h1>
          <p className="mt-2 text-[color:var(--muted)]">
            @{profile.user.username}
            {profile.rank ? (
              <>
                <span className="mx-2 text-[color:var(--line)]">·</span>
                Global #{profile.rank}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <section className="mt-8 flex flex-wrap justify-center gap-2 sm:justify-start">
        <Stat label="Points" value={String(stats.totalPoints)} />
        <Stat
          label="Record"
          value={`${stats.wins}W-${stats.losses}L`}
          hint={stats.voids > 0 ? `${stats.voids} void` : undefined}
        />
        <Stat label="Hit rate" value={accuracy} />
        {stats.bestWinStreak > 0 ? (
          <Stat
            label="Best streak"
            value={String(stats.bestWinStreak)}
            hint={
              stats.currentWinStreak > 0
                ? `current ${stats.currentWinStreak}`
                : undefined
            }
          />
        ) : null}
        {stats.marketBeating.score > 0 ? (
          <Stat
            label="Upset score"
            value={String(stats.marketBeating.score)}
            hint={`${stats.marketBeating.wins} underdog wins`}
          />
        ) : null}
        {stats.biggestUpset ? (
          <Stat
            label="Biggest upset"
            value={`${(stats.biggestUpset.probabilityBps / 100).toFixed(1)}%`}
            hint={`${stats.biggestUpset.pointsAwarded} pts`}
          />
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
          Receipt trail
        </h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Settled calls that make up this scoreboard.
        </p>
        {profile.receipts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--line)] px-5 py-10 text-center text-sm text-[color:var(--muted)]">
            No settled calls yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {profile.receipts.map((receipt) => {
              const resultLabel =
                receipt.result === "won"
                  ? "Won"
                  : receipt.result === "lost"
                    ? "Lost"
                    : "Void";
              return (
                <li key={receipt.id}>
                  <Link
                    href={`/receipts/${receipt.callId}`}
                    className="block rounded-2xl border border-[color:var(--line)] px-5 py-4 transition hover:border-[color:var(--signal)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[color:var(--chalk)]">{receipt.match}</p>
                      <span
                        className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                          receipt.result === "won"
                            ? "border-emerald-400/40 text-emerald-300"
                            : receipt.result === "lost"
                              ? "border-red-400/40 text-red-300"
                              : "border-amber-400/40 text-amber-200"
                        }`}
                      >
                        {resultLabel} · {receipt.pointsAwarded} pts
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      {receipt.narrative}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-10 text-sm text-[color:var(--muted)]">
        <Link
          href="/leaderboard"
          className="text-[color:var(--signal)] underline"
        >
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
    <div className="w-[9.75rem] rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg tabular-nums text-[color:var(--chalk)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

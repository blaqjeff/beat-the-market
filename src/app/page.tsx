import Link from "next/link";

import { FeedStatusBanner } from "@/components/shell/FeedStatusBanner";
import { getCurrentUser } from "@/lib/auth/session";
import { getHomeFixtureBoard } from "@/lib/game/home-board";

export const dynamic = "force-dynamic";

export default async function Home() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let fixtures: Awaited<ReturnType<typeof getHomeFixtureBoard>> = [];

  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  try {
    fixtures = await getHomeFixtureBoard(24);
  } catch {
    fixtures = [];
  }

  const featured =
    fixtures.find((row) => row.phasePill === "Live") ?? fixtures[0] ?? null;
  const primaryHref = user
    ? featured
      ? `/matches/${featured.sourceFixtureId}`
      : "/leaderboard"
    : "/login";
  const primaryLabel = user
    ? featured
      ? featured.phasePill === "Live"
        ? "Jump into live match"
        : "Open match centre"
      : "View leaderboard"
    : "Start making calls";

  const liveCount = fixtures.filter((row) => row.phasePill === "Live").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <FeedStatusBanner />
      <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--panel)]/70 px-6 py-12 sm:px-10 sm:py-16">
        <div className="signal-line pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--signal)] to-transparent" />
        <p className="animate-rise font-mono text-xs uppercase tracking-[0.24em] text-[color:var(--signal)]">
          World Cup confidence game
        </p>
        <h1 className="animate-rise-delay mt-5 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[0.95] tracking-tight text-[color:var(--chalk)] sm:text-7xl">
          Beat the Market
        </h1>
        <p className="animate-rise-delay mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
          Spend confidence credits on live consensus prices. Call the result,
          chase the total, and prove you can out-read the market as the match
          moves.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="rounded-xl bg-[color:var(--signal)] px-5 py-3 font-semibold text-[color:var(--ink)] transition hover:brightness-110"
          >
            {primaryLabel}
          </Link>
          {user && (
            <Link
              href="/leaderboard"
              className="rounded-xl border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--muted)] transition hover:text-[color:var(--chalk)]"
            >
              Leaderboard
            </Link>
          )}
        </div>
      </section>

      <section id="matches" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              World Cup board
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
              Live scores & kickoffs
            </h2>
          </div>
          {liveCount > 0 ? (
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[color:var(--signal)]">
              {liveCount} live
            </p>
          ) : null}
        </div>

        {fixtures.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-10 text-center text-[color:var(--muted)]">
            Match boards will appear here once fixtures are available.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {fixtures.map((fixture) => {
              const kickoff = fixture.startsAt.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
              const live = fixture.phasePill === "Live";
              return (
                <li key={fixture.sourceFixtureId}>
                  <Link
                    href={`/matches/${fixture.sourceFixtureId}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 px-5 py-4 transition hover:border-[color:var(--signal)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[color:var(--chalk)]">
                          {fixture.home}
                          {fixture.score ? (
                            <span className="mx-2 font-mono tabular-nums text-[color:var(--signal)]">
                              {fixture.score.home}–{fixture.score.away}
                            </span>
                          ) : (
                            <span className="mx-2 text-[color:var(--muted)]">
                              vs
                            </span>
                          )}
                          {fixture.away}
                        </p>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                            live
                              ? "border-[color:var(--signal)]/40 text-[color:var(--signal)]"
                              : "border-[color:var(--line)] text-[color:var(--muted)]"
                          }`}
                        >
                          {fixture.phasePill}
                          {live && fixture.clockDisplay
                            ? ` · ${fixture.clockDisplay}`
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">
                        {fixture.competitionName ?? "World Cup"}
                        <span className="mx-2 text-[color:var(--line)]">·</span>
                        {live ? "In play" : `Kickoff ${kickoff}`}
                        {fixture.momentumLabel ? (
                          <>
                            <span className="mx-2 text-[color:var(--line)]">
                              ·
                            </span>
                            {fixture.momentumLabel}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--signal)]">
                      Open
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

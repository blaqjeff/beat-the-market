import Link from "next/link";

import { FeedStatusBanner } from "@/components/shell/FeedStatusBanner";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function Home() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let fixtureCount = 0;
  let oddsCount = 0;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  try {
    [fixtureCount, oddsCount] = await Promise.all([
      prisma().fixture.count(),
      prisma().oddsSnapshot.count(),
    ]);
  } catch {
    fixtureCount = 0;
    oddsCount = 0;
  }

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
          Spend confidence credits on TxLINE consensus prices. Call the result,
          chase the total, and prove you can out-read the market as the match
          moves.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href={user ? "/leaderboard" : "/login"}
            className="rounded-xl bg-[color:var(--signal)] px-5 py-3 font-semibold text-[color:var(--ink)] transition hover:brightness-110"
          >
            {user ? "View leaderboard" : "Start making calls"}
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-xl border border-[color:var(--line)] px-5 py-3 font-semibold text-[color:var(--chalk)] transition hover:border-[color:var(--signal)]"
          >
            How scoring works
          </Link>
          {process.env.NODE_ENV !== "production" && (
            <Link
              href="/setup/txline"
              className="rounded-xl border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--muted)] transition hover:text-[color:var(--chalk)]"
            >
              TxLINE setup
            </Link>
          )}
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "1,000 credits / match",
            copy: "Non-monetary confidence budget. No deposits, no cash-out.",
          },
          {
            title: "Priced by TxLINE",
            copy: "Calls freeze the consensus probability at acceptance time.",
          },
          {
            title: "Receipts after settle",
            copy: "Every awarded point can be reproduced from stored inputs.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 p-5"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[color:var(--chalk)]">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              {item.copy}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Ingested feed
        </p>
        <p className="mt-3 text-[color:var(--chalk)]">
          {fixtureCount > 0
            ? `${fixtureCount} fixtures · ${oddsCount} odds snapshots in Postgres`
            : "Run npm run ingestion:replay or npm run ingestion:worker to load fixtures."}
        </p>
      </section>
    </main>
  );
}

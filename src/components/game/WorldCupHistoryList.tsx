"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type HistoryMatchCard = {
  id: string;
  round: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  summary: string;
  sourceFixtureId: string | null;
  resultLabel: string;
  playedLabel: string;
};

const PAGE_SIZE = 8;
const PAGE_WINDOW = 5;

function pageNumbers(current: number, total: number): number[] {
  if (total <= PAGE_WINDOW) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const half = Math.floor(PAGE_WINDOW / 2);
  let start = Math.max(1, current - half);
  let end = start + PAGE_WINDOW - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - PAGE_WINDOW + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function WorldCupHistoryList({
  tournament,
  matches,
}: {
  tournament: string;
  matches: HistoryMatchCard[];
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const visible = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return matches.slice(start, start + PAGE_SIZE);
  }, [matches, safePage]);

  if (matches.length === 0) return null;

  return (
    <section id="history" className="mt-14 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Results archive
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)] sm:text-2xl">
            World Cup history
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
            Final scores and short recaps from earlier {tournament} matches —
            newest first.
          </p>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {matches.length} played
        </p>
      </div>

      <ul className="mt-5 grid gap-3">
        {visible.map((match) => {
          const body = (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded-full border border-[color:var(--line)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                  {match.round}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                  {match.playedLabel}
                </span>
                {match.venue ? (
                  <span className="truncate text-xs text-[color:var(--muted)]">
                    · {match.venue}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 break-words font-[family-name:var(--font-display)] text-base tracking-wide text-[color:var(--chalk)] sm:text-lg">
                {match.home}
                <span className="mx-1.5 font-mono tabular-nums text-[color:var(--signal)] sm:mx-2">
                  {match.homeScore}–{match.awayScore}
                </span>
                {match.away}
              </p>
              <p className="mt-1 text-sm font-medium text-[color:var(--chalk)]/80">
                {match.resultLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {match.summary}
              </p>
            </>
          );

          return (
            <li key={match.id}>
              {match.sourceFixtureId ? (
                <Link
                  href={`/matches/${match.sourceFixtureId}`}
                  className="block rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/30 px-4 py-4 transition hover:border-[color:var(--signal)]/50 sm:px-5"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/30 px-4 py-4 sm:px-5">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {totalPages > 1 ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--chalk)] disabled:opacity-40"
            >
              Previous
            </button>
            <div className="flex flex-wrap gap-1.5">
              {pageNumbers(safePage, totalPages).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-h-10 min-w-10 rounded-lg px-2.5 py-1.5 font-mono text-xs transition ${
                      n === safePage
                        ? "bg-[color:var(--signal)] text-[color:var(--ink)]"
                        : "border border-[color:var(--line)] text-[color:var(--muted)] hover:text-[color:var(--chalk)]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
            </div>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--chalk)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

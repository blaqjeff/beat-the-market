"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CallsTab = "open" | "settled";

type CallRow = {
  id: string;
  marketId: string;
  outcomeKey: string;
  credits: number;
  probabilityBps: number;
  multiplierMilli: number;
  potentialPoints: number;
  pointsAwarded: number;
  status: string;
  result: string | null;
  homeScoreAtCall: number | null;
  awayScoreAtCall: number | null;
  matchMinuteAtCall: number | null;
  inRunningAtCall: boolean;
  hasReceipt: boolean;
  finalHomeScore: number | null;
  finalAwayScore: number | null;
};

function outcomeLabel(key: string, home: string, away: string): string {
  if (key === "part1") return home;
  if (key === "part2") return away;
  if (key === "draw") return "Draw";
  if (key === "over") return "Over";
  if (key === "under") return "Under";
  return key;
}

function formatMultiplier(milli: number) {
  return `${(milli / 1000).toFixed(2)}x`;
}

function resultTone(result: string | null, status: string) {
  if (status === "pending") return "border-[color:var(--signal)]/40 text-[color:var(--signal)]";
  if (result === "won") return "border-emerald-400/40 text-emerald-300";
  if (result === "lost") return "border-red-400/40 text-red-300";
  if (result === "void" || status === "void") return "border-amber-400/40 text-amber-200";
  return "border-[color:var(--line)] text-[color:var(--muted)]";
}

function CallCard({
  call,
  home,
  away,
  liveScore,
  matchFinished,
}: {
  call: CallRow;
  home: string;
  away: string;
  liveScore: { home: number; away: number };
  matchFinished: boolean;
}) {
  const open = call.status === "pending";
  const scoreAtCall =
    call.homeScoreAtCall !== null && call.awayScoreAtCall !== null
      ? `${call.homeScoreAtCall}–${call.awayScoreAtCall}`
      : null;
  const finalHome =
    call.finalHomeScore ?? (matchFinished || !open ? liveScore.home : null);
  const finalAway =
    call.finalAwayScore ?? (matchFinished || !open ? liveScore.away : null);
  const finalScore =
    finalHome !== null && finalAway !== null
      ? `${finalHome}–${finalAway}`
      : null;
  const resultLabel = open
    ? "Open"
    : call.result === "won"
      ? "Won"
      : call.result === "lost"
        ? "Lost"
        : call.result === "void" || call.status === "void"
          ? "Void"
          : "Settled";

  return (
    <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--pitch)]/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
            {outcomeLabel(call.outcomeKey, home, away)}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {call.inRunningAtCall ? "In-play call" : "Pre-match call"}
            {scoreAtCall ? ` · at call ${scoreAtCall}` : ""}
            {call.matchMinuteAtCall !== null ? ` · ${call.matchMinuteAtCall}'` : ""}
          </p>
          {!open && finalScore ? (
            <p className="mt-1 text-sm text-[color:var(--chalk)]">
              Final{" "}
              <span className="font-semibold tabular-nums">{finalScore}</span>
            </p>
          ) : null}
        </div>
        <span
          className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${resultTone(
            call.result,
            call.status
          )}`}
        >
          {resultLabel}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Credits
          </dt>
          <dd className="mt-1 text-lg text-[color:var(--chalk)]">{call.credits}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Price
          </dt>
          <dd className="mt-1 text-lg text-[color:var(--chalk)]">
            {(call.probabilityBps / 100).toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Multiplier
          </dt>
          <dd className="mt-1 text-lg text-[color:var(--chalk)]">
            {formatMultiplier(call.multiplierMilli)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-3">
        <p className="text-sm text-[color:var(--muted)]">
          {open ? (
            <>
              Potential{" "}
              <span className="text-[color:var(--signal)]">
                {call.potentialPoints} pts
              </span>
            </>
          ) : (
            <>
              Awarded{" "}
              <span className="text-[color:var(--chalk)]">
                {call.pointsAwarded} pts
              </span>
            </>
          )}
        </p>
        {call.hasReceipt ? (
          <Link
            href={`/receipts/${call.id}`}
            className="rounded-lg bg-[color:var(--signal)] px-3 py-2 text-sm font-semibold text-[color:var(--ink)]"
          >
            View receipt
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function MatchCallsSheet({
  calls,
  home,
  away,
  liveScore,
  matchFinished,
}: {
  calls: CallRow[];
  home: string;
  away: string;
  liveScore: { home: number; away: number };
  matchFinished: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tabOverride, setTabOverride] = useState<CallsTab | null>(null);

  const openCalls = useMemo(
    () => calls.filter((call) => call.status === "pending"),
    [calls]
  );
  const settledCalls = useMemo(
    () => calls.filter((call) => call.status !== "pending"),
    [calls]
  );

  const preferredTab: CallsTab =
    openCalls.length === 0 && settledCalls.length > 0 ? "settled" : "open";
  const tab = tabOverride ?? preferredTab;
  const hasOpenCalls = openCalls.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const visible = tab === "open" ? openCalls : settledCalls;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--signal)] text-[color:var(--ink)] shadow-[0_10px_28px_rgba(0,0,0,0.4)] transition hover:brightness-110"
        aria-label={
          hasOpenCalls
            ? `Your calls, ${openCalls.length} open`
            : "Your calls"
        }
      >
        {hasOpenCalls ? (
          <span className="flex flex-col items-center leading-none">
            <span className="font-[family-name:var(--font-display)] text-lg">
              {openCalls.length}
            </span>
            <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em]">
              Open
            </span>
          </span>
        ) : (
          <span className="flex flex-col items-center px-0.5 text-center font-mono text-[8px] font-semibold uppercase leading-tight tracking-[0.08em]">
            <span>Your</span>
            <span>calls</span>
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-end sm:p-6">
          <button
            type="button"
            aria-label="Close calls"
            className="absolute inset-0 bg-black/55"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your calls"
            className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-[color:var(--line)] bg-[color:var(--panel)] sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--signal)]">
                  Your slip
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
                  Calls
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[color:var(--line)] px-3 py-1 text-sm text-[color:var(--muted)] hover:text-[color:var(--chalk)]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 border-b border-[color:var(--line)] p-2">
              <button
                type="button"
                onClick={() => setTabOverride("open")}
                className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  tab === "open"
                    ? "bg-[color:var(--signal)] text-[color:var(--ink)]"
                    : "text-[color:var(--muted)] hover:text-[color:var(--chalk)]"
                }`}
              >
                Open ({openCalls.length})
              </button>
              <button
                type="button"
                onClick={() => setTabOverride("settled")}
                className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  tab === "settled"
                    ? "bg-[color:var(--signal)] text-[color:var(--ink)]"
                    : "text-[color:var(--muted)] hover:text-[color:var(--chalk)]"
                }`}
              >
                Settled ({settledCalls.length})
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4">
              {visible.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[color:var(--line)] px-4 py-10 text-center text-sm text-[color:var(--muted)]">
                  {tab === "open"
                    ? "No open calls on this match."
                    : "No settled calls yet."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {visible.map((call) => (
                    <li key={call.id}>
                      <CallCard
                        call={call}
                        home={home}
                        away={away}
                        liveScore={liveScore}
                        matchFinished={matchFinished}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MatchCallsSheet } from "@/components/game/MatchCallsSheet";

interface Outcome {
  key: string;
  label: string;
  pct: string | null;
  probabilityBps: number | null;
  multiplierMilli: number | null;
  potentialPointsPer100: number | null;
  deltaBps: number | null;
}

interface Market {
  id: string;
  superOddsType: string;
  marketParameters: string | null;
  availability: string;
  inRunning: boolean;
  outcomes: Outcome[];
}

interface MatchState {
  fixture: {
    id: string;
    sourceFixtureId: string;
    competitionName: string | null;
    startsAt: string;
    home: string;
    away: string;
    gameState: string | null;
  };
  live: {
    score: { home: number; away: number };
    clock: { display: string | null; minutes: number | null; running: boolean | null };
    gameState: string | null;
    phase: string;
    callsBlocked: boolean;
    blockReason: string | null;
    timeline: Array<{
      sequence: number;
      summary: string;
      action: string;
      matchMinute: number | null;
    }>;
  };
  feed: {
    odds: { status: string; mode: string | null; reconnectCount: number };
    scores: { status: string; mode: string | null; reconnectCount: number };
  };
  goalscorer: { status: string; reason: string | null };
  credits: {
    startingCredits: number;
    remainingCredits: number;
  };
  projectedPoints: number;
  settledPoints: number;
  signedIn: boolean;
  markets: Market[];
  calls: Array<{
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
  }>;
}

function formatMultiplier(milli: number | null) {
  if (milli === null) return "—";
  return `${(milli / 1000).toFixed(2)}x`;
}

function marketTitle(market: Market) {
  const prefix = market.inRunning ? "Live · " : "";
  if (market.superOddsType === "1X2_PARTICIPANT_RESULT") {
    return `${prefix}Match result`;
  }
  if (market.superOddsType === "OVERUNDER_PARTICIPANT_GOALS") {
    return `${prefix}Total goals ${market.marketParameters ?? ""}`.trim();
  }
  return `${prefix}${market.superOddsType}`;
}

function outcomeLabel(key: string, home: string, away: string): string {
  if (key === "part1") return home;
  if (key === "part2") return away;
  if (key === "draw") return "Draw";
  if (key === "over") return "Over";
  if (key === "under") return "Under";
  return key;
}

function formatDelta(deltaBps: number | null) {
  if (deltaBps === null || deltaBps === 0) return null;
  const points = (deltaBps / 100).toFixed(1);
  return deltaBps > 0 ? `▲ ${points}` : `▼ ${Math.abs(Number(points)).toFixed(1)}`;
}

function phaseLabel(phase: string) {
  if (phase === "in_play") return "In play";
  if (phase === "prematch") return "Pre-match";
  if (phase === "finished") return "Finished";
  if (phase === "suspended") return "Suspended";
  return "Status unknown";
}

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function feedChipLabel(status: string, mode: string | null) {
  const base = status.replaceAll("_", " ");
  if (!mode) return base;
  return `${base} · ${mode}`;
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </dt>
      <dd className="text-sm tabular-nums text-[color:var(--chalk)]">{value}</dd>
    </div>
  );
}

export function MatchCentre({ initialState }: { initialState: MatchState }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [creditsInput, setCreditsInput] = useState(50);
  const [selected, setSelected] = useState<{
    marketId: string;
    outcomeKey: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const selectedOutcome = useMemo(() => {
    if (!selected) return null;
    const market = state.markets.find((row) => row.id === selected.marketId);
    const outcome = market?.outcomes.find((row) => row.key === selected.outcomeKey);
    if (!market || !outcome || outcome.multiplierMilli === null) return null;
    const potential = Math.floor(
      (creditsInput * outcome.multiplierMilli) / 1000
    );
    return { market, outcome, potential };
  }, [selected, state.markets, creditsInput]);

  const prematchMarkets = state.markets.filter((market) => !market.inRunning);
  const inPlayMarkets = state.markets.filter((market) => market.inRunning);

  async function refresh() {
    const response = await fetch(
      `/api/matches/${state.fixture.sourceFixtureId}/state`,
      { cache: "no-store" }
    );
    if (!response.ok) return;
    const next = (await response.json()) as MatchState;
    setState(next);
    setLastRefreshAt(new Date().toISOString());
  }

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(
          `/api/matches/${state.fixture.sourceFixtureId}/state`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        const next = (await response.json()) as MatchState;
        if (!cancelled) {
          setState(next);
          setLastRefreshAt(new Date().toISOString());
        }
      } catch {
        // Keep last confirmed state across reconnect gaps.
      }
    };

    const id = window.setInterval(tick, 3000);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [state.fixture.sourceFixtureId]);

  async function place() {
    if (!selected || !selectedOutcome) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!state.signedIn) {
        router.push("/login");
        return;
      }
      if (state.live.callsBlocked) {
        throw new Error(state.live.blockReason ?? "Calls are blocked");
      }
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFixtureId: state.fixture.sourceFixtureId,
          marketId: selected.marketId,
          outcomeKey: selected.outcomeKey,
          credits: creditsInput,
          idempotencyKey,
        }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        call?: { potentialPoints: number };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Call failed");
      }
      setMessage(
        `Call accepted for ${payload.call?.potentialPoints ?? selectedOutcome.potential} potential points.`
      );
      await refresh();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Call failed");
    } finally {
      setBusy(false);
    }
  }

  function renderMarkets(title: string, rows: Market[], empty: string) {
    return (
      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
            {title}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            {rows.length} market{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-8 text-center text-[color:var(--muted)]">
            {empty}
          </div>
        ) : (
          rows.map((market) => (
            <article
              key={market.id}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
                  {marketTitle(market)}
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  {market.availability}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {market.outcomes.map((outcome) => {
                  const active =
                    selected?.marketId === market.id &&
                    selected.outcomeKey === outcome.key;
                  const disabled =
                    outcome.probabilityBps === null ||
                    market.availability === "suspended" ||
                    market.availability === "closed" ||
                    state.live.callsBlocked;
                  const delta = formatDelta(outcome.deltaBps);
                  return (
                    <button
                      key={outcome.key}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        setSelected({
                          marketId: market.id,
                          outcomeKey: outcome.key,
                        })
                      }
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-[color:var(--signal)] bg-[color:var(--signal)]/10"
                          : "border-[color:var(--line)] hover:border-[color:var(--signal)]"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <p className="font-semibold text-[color:var(--chalk)]">
                        {outcomeLabel(
                          outcome.key,
                          state.fixture.home,
                          state.fixture.away
                        )}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">
                        {outcome.pct ?? "NA"}% ·{" "}
                        {formatMultiplier(outcome.multiplierMilli)}
                      </p>
                      {delta && (
                        <p
                          className={`mt-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                            (outcome.deltaBps ?? 0) > 0
                              ? "text-[color:var(--signal)]"
                              : "text-red-300"
                          }`}
                        >
                          {delta}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </article>
          ))
        )}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--panel)]/80">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(200,241,53,0.08),transparent_55%)]"
        />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--signal)]">
              {state.fixture.competitionName ?? "World Cup"}
            </p>
            <p className="rounded-full border border-[color:var(--line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {phaseLabel(state.live.phase)}
              {state.live.clock.display ? ` · ${state.live.clock.display}` : ""}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <div className="min-w-0 text-right">
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight tracking-wide text-[color:var(--chalk)] sm:text-4xl">
                {state.fixture.home}
              </p>
            </div>
            <div className="px-2 text-center sm:px-4">
              <p className="font-[family-name:var(--font-display)] text-5xl tabular-nums tracking-wide text-[color:var(--chalk)] sm:text-6xl">
                {state.live.score.home}
                <span className="mx-1 text-[color:var(--muted)] sm:mx-2">–</span>
                {state.live.score.away}
              </p>
            </div>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight tracking-wide text-[color:var(--chalk)] sm:text-4xl">
                {state.fixture.away}
              </p>
            </div>
          </div>

          <dl className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[color:var(--line)]/70 pt-4">
            <HeroMeta
              label="Kickoff"
              value={formatKickoff(state.fixture.startsAt)}
            />
            <HeroMeta label="Settled" value={`${state.settledPoints} pts`} />
            {state.live.phase !== "finished" || state.projectedPoints > 0 ? (
              <HeroMeta
                label="Projected"
                value={`${state.projectedPoints} pts`}
              />
            ) : null}
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color:var(--line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Odds {feedChipLabel(state.feed.odds.status, state.feed.odds.mode)}
            </span>
            <span className="rounded-full border border-[color:var(--line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Scores{" "}
              {feedChipLabel(state.feed.scores.status, state.feed.scores.mode)}
            </span>
            {lastRefreshAt ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]/70">
                Updated {new Date(lastRefreshAt).toLocaleTimeString()}
              </span>
            ) : null}
          </div>

          {state.live.callsBlocked && (
            <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {state.live.blockReason ?? "New calls are blocked"}
            </p>
          )}
          {!state.signedIn && (
            <p className="mt-5 text-sm text-[color:var(--muted)]">
              <Link
                href="/login"
                className="text-[color:var(--signal)] underline"
              >
                Sign in
              </Link>{" "}
              to spend confidence credits on this match.
            </p>
          )}
        </div>
      </section>

      {renderMarkets(
        "In-play markets",
        inPlayMarkets,
        "No in-play markets yet. They appear when TxLINE publishes InRunning prices."
      )}

      {renderMarkets(
        "Pre-match markets",
        prematchMarkets,
        "No open pre-match markets. Run ingestion/replay first."
      )}

      {state.goalscorer.status === "unavailable" && (
        <p className="rounded-2xl border border-dashed border-[color:var(--line)] px-5 py-4 text-sm text-[color:var(--muted)]">
          Goalscorer markets unavailable
          {state.goalscorer.reason ? ` — ${state.goalscorer.reason}` : "."}
        </p>
      )}

      <section className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/50 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
            Place call
          </h2>
          {state.signedIn ? (
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Balance{" "}
              <span className="tabular-nums text-[color:var(--chalk)]">
                {state.credits.remainingCredits}
              </span>
              <span className="text-[color:var(--muted)]">
                /{state.credits.startingCredits}
              </span>
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Stake credits
            </span>
            <input
              type="number"
              min={1}
              max={state.credits.remainingCredits}
              value={creditsInput}
              onChange={(event) => setCreditsInput(Number(event.target.value))}
              className="mt-2 w-36 rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)] px-4 py-3 text-[color:var(--chalk)] outline-none ring-[color:var(--signal)] focus:ring-2"
            />
          </label>
          <div className="text-sm text-[color:var(--muted)]">
            {selectedOutcome ? (
              <>
                Selected{" "}
                <span className="text-[color:var(--chalk)]">
                  {outcomeLabel(
                    selectedOutcome.outcome.key,
                    state.fixture.home,
                    state.fixture.away
                  )}
                </span>{" "}
                · potential{" "}
                <span className="text-[color:var(--signal)]">
                  {selectedOutcome.potential} pts
                </span>
                {selectedOutcome.market.inRunning ? " · live price" : ""}
              </>
            ) : (
              "Pick an outcome"
            )}
          </div>
          <button
            type="button"
            disabled={
              !selectedOutcome ||
              busy ||
              creditsInput < 1 ||
              state.live.callsBlocked
            }
            onClick={place}
            className="rounded-xl bg-[color:var(--signal)] px-5 py-3 font-semibold text-[color:var(--ink)] transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Placing..." : "Confirm call"}
          </button>
        </div>
        {message && (
          <p className="mt-4 text-sm text-[color:var(--signal)]">{message}</p>
        )}
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </section>

      <section className="rounded-2xl border border-[color:var(--line)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
          Match timeline
        </h2>
        {state.live.timeline.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Waiting for score events.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {state.live.timeline.slice(0, 12).map((event) => (
              <li
                key={`${event.sequence}-${event.action}`}
                className="border-b border-[color:var(--line)] pb-3 text-sm text-[color:var(--muted)]"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--signal)]">
                  #{event.sequence}
                  {event.matchMinute !== null ? ` · ${event.matchMinute}'` : ""}
                </span>
                <p className="mt-1 text-[color:var(--chalk)]">{event.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {state.signedIn && (
        <MatchCallsSheet
          calls={state.calls}
          home={state.fixture.home}
          away={state.fixture.away}
          liveScore={state.live.score}
          matchFinished={state.live.phase === "finished"}
        />
      )}
    </div>
  );
}

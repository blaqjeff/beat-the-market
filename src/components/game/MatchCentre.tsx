"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BookmakerSpread } from "@/components/game/BookmakerSpread";
import { DemoCinemaBar } from "@/components/game/DemoCinemaBar";
import { MatchCallsSheet } from "@/components/game/MatchCallsSheet";
import { MatchEventFx } from "@/components/game/MatchEventFx";
import { MomentumMeter } from "@/components/game/MomentumMeter";
import {
  availabilityLabel,
  formatMultiplier,
  marketLabel,
  outcomeLabel,
  phaseLabel,
} from "@/lib/game/labels";

interface Outcome {
  key: string;
  label: string;
  pct: string | null;
  probabilityBps: number | null;
  multiplierMilli: number | null;
  potentialPointsPer100: number | null;
  deltaBps: number | null;
  bookmakerSpreadBps?: number | null;
  bookmakerMinPct?: string | null;
  bookmakerMaxPct?: string | null;
}

interface Market {
  id: string;
  superOddsType: string;
  marketParameters: string | null;
  marketPeriod?: string | null;
  availability: string;
  inRunning: boolean;
  quoteBookmaker?: string | null;
  bookmakers?: Array<{
    bookmaker: string;
    bookmakerId: number | null;
    isConsensus: boolean;
    outcomes: Array<{ key: string; pct: string | null }>;
  }>;
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
    sideStats?: {
      home: { yellowCards: number; redCards: number; corners: number };
      away: { yellowCards: number; redCards: number; corners: number };
    };
    momentum?: {
      balance: number;
      homePressure: number;
      awayPressure: number;
      tempo: "cold" | "steady" | "hot" | "frantic";
      tempoScore: number;
      label: string;
      drivers: string[];
      series?: Array<{
        minute: number | null;
        balance: number;
        tempoScore: number;
      }>;
    };
    timeline: Array<{
      sequence: number;
      summary: string;
      headline?: string;
      kind?: string;
      action: string;
      matchMinute: number | null;
      homeScore: number | null;
      awayScore: number | null;
      visible?: boolean;
    }>;
  };
  feed: {
    odds: { status: string; mode: string | null; reconnectCount: number };
    scores: { status: string; mode: string | null; reconnectCount: number };
  };
  goalscorer: { status: string; reason: string | null };
  demo?: {
    enabled: boolean;
    fixtureId: string;
    title: string;
    beatIndex: number;
    beatTotal: number;
    currentLabel: string | null;
    currentHint: string | null;
    nextLabel: string | null;
    nextHint: string | null;
    done: boolean;
    matchUrl: string;
  } | null;
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
    liveProbabilityBps?: number | null;
    consensusDeltaBps?: number | null;
    consensusLean?: "with_you" | "against_you" | "flat" | null;
  }>;
}

function marketTitle(market: Market) {
  const base = marketLabel(
    market.superOddsType,
    market.marketParameters,
    market.marketPeriod ?? null
  );
  return market.inRunning ? `Live · ${base}` : base;
}

function formatDelta(deltaBps: number | null) {
  if (deltaBps === null || deltaBps === 0) return null;
  const points = (deltaBps / 100).toFixed(1);
  return deltaBps > 0
    ? `+${points}`
    : `−${Math.abs(Number(points)).toFixed(1)}`;
}

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-[7.5rem] rounded-xl border border-[color:var(--line)]/80 bg-[color:var(--pitch)]/40 px-2.5 py-2 sm:w-[9.75rem] sm:px-3 sm:py-2.5">
      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-xs tabular-nums text-[color:var(--chalk)] sm:text-sm">
        {value}
      </dd>
    </div>
  );
}

function SlipStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm tabular-nums text-[color:var(--chalk)]">{value}</p>
    </div>
  );
}

function timelineTone(kind: string | undefined) {
  switch (kind) {
    case "goal":
      return "bg-[color:var(--signal)] text-[color:var(--ink)]";
    case "finish":
      return "bg-[color:var(--chalk)] text-[color:var(--ink)]";
    case "suspend":
      return "bg-amber-400/90 text-[color:var(--ink)]";
    case "card":
      return "bg-amber-300/90 text-[color:var(--ink)]";
    case "corner":
      return "bg-sky-300/90 text-[color:var(--ink)]";
    case "kickoff":
    case "resume":
    case "halftime":
      return "bg-[color:var(--line)] text-[color:var(--chalk)]";
    default:
      return "bg-[color:var(--panel)] text-[color:var(--muted)] border border-[color:var(--line)]";
  }
}

function timelineMark(kind: string | undefined) {
  switch (kind) {
    case "goal":
      return "G";
    case "finish":
      return "FT";
    case "kickoff":
      return "KO";
    case "halftime":
      return "HT";
    case "resume":
      return "▶";
    case "suspend":
      return "‖";
    case "card":
      return "■";
    case "corner":
      return "⌝";
    case "var":
      return "V";
    default:
      return "·";
  }
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [boardTab, setBoardTab] = useState<"timeline" | "odds">("odds");
  const [tabPhase, setTabPhase] = useState(initialState.live.phase);

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
  const matchLive =
    state.live.phase === "in_play" ||
    state.live.phase === "suspended" ||
    state.live.phase === "finished";
  const showProjected =
    state.live.phase === "in_play" ||
    state.calls.some((call) => call.status === "pending");
  const showSettled =
    state.settledPoints > 0 || state.live.phase === "finished";

  // Adjust default tab when match phase flips (React-recommended render-time update).
  if (state.live.phase !== tabPhase) {
    setTabPhase(state.live.phase);
    setBoardTab(matchLive ? "timeline" : "odds");
  }

  const sheetCalls = useMemo(
    () =>
      state.calls.map((call) => {
        const market = state.markets.find((row) => row.id === call.marketId);
        return {
          ...call,
          marketTitle: market
            ? marketTitle(market)
            : "Market",
        };
      }),
    [state.calls, state.markets]
  );

  async function refresh() {
    const response = await fetch(
      `/api/matches/${state.fixture.sourceFixtureId}/state`,
      { cache: "no-store" }
    );
    if (!response.ok) return;
    const next = (await response.json()) as MatchState;
    setState(next);
    setLastRefreshAt(Date.now());
  }

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch(
          `/api/matches/${state.fixture.sourceFixtureId}/state`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        const next = (await response.json()) as MatchState;
        if (!cancelled) {
          setState(next);
          setLastRefreshAt(Date.now());
        }
      } catch {
        // Keep last good frame while offline.
      }
    }
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [state.fixture.sourceFixtureId]);

  async function place() {
    if (!selectedOutcome || !selected) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!state.signedIn) {
        throw new Error("Sign in to place a call");
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
        `Call locked for ${payload.call?.potentialPoints ?? selectedOutcome.potential} potential points.`
      );
      setSelected(null);
      await refresh();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Call failed");
    } finally {
      setBusy(false);
    }
  }

  function renderTimeline() {
    const events = state.live.timeline
      .filter((event) => event.visible !== false)
      .slice(0, 14);
    return (
      <section className="rounded-2xl border border-[color:var(--line)] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
            Match timeline
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Key moments
          </p>
        </div>
        {events.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[color:var(--line)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
            No key moments yet — they appear as the match moves.
          </p>
        ) : (
          <ol className="relative mt-6 space-y-0">
            <div
              aria-hidden
              className="absolute bottom-3 left-[1.15rem] top-3 w-px bg-[color:var(--line)]"
            />
            {events.map((event) => {
              const headline = event.headline ?? event.summary;
              const scoreline =
                event.homeScore !== null && event.awayScore !== null
                  ? `${event.homeScore}–${event.awayScore}`
                  : null;
              return (
                <li
                  key={`${event.sequence}-${event.action}`}
                  className={`relative grid grid-cols-[2.3rem_1fr] gap-3 py-3 sm:grid-cols-[2.3rem_minmax(0,1fr)_auto] sm:items-center ${
                    event.kind === "goal" ? "animate-rise" : ""
                  }`}
                >
                  <div className="relative z-10 flex justify-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-[10px] font-semibold tracking-wide ${timelineTone(
                        event.kind
                      )}`}
                    >
                      {timelineMark(event.kind)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-xs tabular-nums text-[color:var(--signal)]">
                        {event.matchMinute !== null
                          ? `${event.matchMinute}'`
                          : "—"}
                      </span>
                      <p
                        className={`text-sm sm:text-base ${
                          event.kind === "goal"
                            ? "font-semibold text-[color:var(--chalk)]"
                            : "text-[color:var(--chalk)]"
                        }`}
                      >
                        {headline}
                      </p>
                    </div>
                  </div>
                  {scoreline ? (
                    <p className="col-start-2 font-mono text-sm tabular-nums text-[color:var(--muted)] sm:col-start-auto sm:text-right sm:text-base sm:text-[color:var(--chalk)]">
                      {scoreline}
                    </p>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    );
  }

  function renderMarkets(title: string, rows: Market[], empty: string) {
    if (rows.length === 0) {
      return (
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
            {title}
          </h2>
          <p className="mt-3 rounded-2xl border border-dashed border-[color:var(--line)] px-5 py-6 text-center text-sm text-[color:var(--muted)]">
            {empty}
          </p>
        </section>
      );
    }

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
        {rows.map((market) => {
          const status = availabilityLabel(market.availability);
          return (
            <article
              key={market.id}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
                  {marketTitle(market)}
                </h3>
                {status ? (
                  <span className="rounded-full border border-[color:var(--line)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    {status}
                  </span>
                ) : null}
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
                      className={`rounded-xl border px-4 py-3.5 text-left transition ${
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
                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
                            Return
                          </p>
                          <p className="mt-0.5 text-lg tabular-nums text-[color:var(--signal)]">
                            {formatMultiplier(outcome.multiplierMilli)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
                            Price
                          </p>
                          <p className="mt-0.5 text-sm tabular-nums text-[color:var(--chalk)]">
                            {outcome.pct ?? "—"}%
                          </p>
                        </div>
                      </div>
                      {delta ? (
                        <p
                          className={`mt-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
                            (outcome.deltaBps ?? 0) > 0
                              ? "text-[color:var(--signal)]"
                              : "text-red-300"
                          }`}
                        >
                          Move {delta}
                        </p>
                      ) : null}
                      {outcome.bookmakerMinPct && outcome.bookmakerMaxPct ? (
                        <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-[color:var(--muted)]">
                          Books {outcome.bookmakerMinPct}–{outcome.bookmakerMaxPct}%
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {market.bookmakers && market.bookmakers.length > 1 ? (
                <BookmakerSpread
                  bookmakers={market.bookmakers}
                  home={state.fixture.home}
                  away={state.fixture.away}
                />
              ) : null}
            </article>
          );
        })}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {state.demo ? (
        <DemoCinemaBar demo={state.demo} onChanged={refresh} />
      ) : null}

      <section className="relative overflow-hidden rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--panel)]/80 sm:rounded-[2rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(200,241,53,0.08),transparent_55%)]"
        />
        <MatchEventFx
          key={state.fixture.sourceFixtureId}
          timeline={state.live.timeline}
          home={state.fixture.home}
          away={state.fixture.away}
          score={state.live.score}
        />
        <div className="relative p-4 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-14 sm:gap-3 sm:pr-20">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--signal)]">
              {state.fixture.competitionName ?? "World Cup"}
            </p>
            <p className="rounded-full border border-[color:var(--line)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)] sm:px-3">
              {phaseLabel(state.live.phase)}
              {state.live.clock.display ? ` · ${state.live.clock.display}` : ""}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:mt-8 sm:gap-6">
            <div className="min-w-0 text-right">
              <p className="break-words font-[family-name:var(--font-display)] text-lg leading-tight tracking-wide text-[color:var(--chalk)] sm:text-4xl">
                {state.fixture.home}
              </p>
            </div>
            <div className="px-1 text-center sm:px-4">
              <p
                key={`${state.live.score.home}-${state.live.score.away}`}
                className="animate-score-pulse font-[family-name:var(--font-display)] text-4xl tabular-nums tracking-wide text-[color:var(--chalk)] sm:text-6xl"
              >
                {state.live.score.home}
                <span className="mx-1 text-[color:var(--muted)] sm:mx-2">–</span>
                {state.live.score.away}
              </p>
            </div>
            <div className="min-w-0">
              <p className="break-words font-[family-name:var(--font-display)] text-lg leading-tight tracking-wide text-[color:var(--chalk)] sm:text-4xl">
                {state.fixture.away}
              </p>
            </div>
          </div>

          <dl className="mt-6 flex flex-wrap justify-center gap-2">
            <HeroStat
              label="Kickoff"
              value={formatKickoff(state.fixture.startsAt)}
            />
            {showSettled ? (
              <HeroStat label="Settled" value={`${state.settledPoints} pts`} />
            ) : null}
            {showProjected ? (
              <HeroStat
                label="Projected"
                value={`${state.projectedPoints} pts`}
              />
            ) : null}
          </dl>

          {state.live.momentum ? (
            <MomentumMeter
              home={state.fixture.home}
              away={state.fixture.away}
              momentum={state.live.momentum}
              sideStats={state.live.sideStats}
            />
          ) : null}

          {state.live.callsBlocked && state.live.phase !== "finished" && (
            <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-center text-sm text-red-200">
              {state.live.blockReason ?? "New calls are blocked"}
            </p>
          )}
          {!state.signedIn && (
            <p className="mt-5 text-center text-sm text-[color:var(--muted)]">
              <Link
                href="/login"
                className="text-[color:var(--signal)] underline"
              >
                Sign in
              </Link>{" "}
              to spend confidence credits on this match.
            </p>
          )}

          <details className="mt-5 text-center">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)] hover:text-[color:var(--chalk)]">
              Feed details
              {lastRefreshAt
                ? ` · updated ${new Date(lastRefreshAt).toLocaleTimeString()}`
                : ""}
            </summary>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Odds {state.feed.odds.status}
                {state.feed.odds.mode ? ` · ${state.feed.odds.mode}` : ""}
              </span>
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Scores {state.feed.scores.status}
                {state.feed.scores.mode ? ` · ${state.feed.scores.mode}` : ""}
              </span>
            </div>
          </details>
        </div>
      </section>

      {matchLive ? (
        <div className="flex gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 p-1.5">
          <button
            type="button"
            onClick={() => setBoardTab("timeline")}
            className={`flex-1 rounded-xl px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
              boardTab === "timeline"
                ? "bg-[color:var(--signal)] text-[color:var(--ink)]"
                : "text-[color:var(--muted)] hover:text-[color:var(--chalk)]"
            }`}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setBoardTab("odds")}
            className={`flex-1 rounded-xl px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
              boardTab === "odds"
                ? "bg-[color:var(--signal)] text-[color:var(--ink)]"
                : "text-[color:var(--muted)] hover:text-[color:var(--chalk)]"
            }`}
          >
            Live odds
          </button>
        </div>
      ) : null}

      {(!matchLive || boardTab === "timeline") && matchLive
        ? renderTimeline()
        : null}

      {(!matchLive || boardTab === "odds") ? (
        <>
          {inPlayMarkets.length > 0 || state.live.phase === "in_play"
            ? renderMarkets(
                "In-play markets",
                inPlayMarkets,
                "No live prices on the board yet."
              )
            : null}

          {prematchMarkets.length > 0 || state.live.phase === "prematch"
            ? renderMarkets(
                "Pre-match markets",
                prematchMarkets,
                "Pre-match board is closed."
              )
            : null}

          {inPlayMarkets.length === 0 &&
          prematchMarkets.length === 0 &&
          state.live.phase !== "in_play" &&
          state.live.phase !== "prematch" ? (
            <p className="rounded-2xl border border-dashed border-[color:var(--line)] px-5 py-8 text-center text-sm text-[color:var(--muted)]">
              No open markets on this board.
            </p>
          ) : null}
        </>
      ) : null}

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
              onChange={(event) =>
                setCreditsInput(Number(event.target.value))
              }
              className="mt-2 w-36 rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)] px-4 py-3 text-[color:var(--chalk)] outline-none ring-[color:var(--signal)] focus:ring-2"
            />
          </label>

          {selectedOutcome ? (
            <div className="flex min-w-[14rem] flex-1 flex-wrap gap-5 rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)]/40 px-4 py-3">
              <SlipStat
                label="Call"
                value={outcomeLabel(
                  selectedOutcome.outcome.key,
                  state.fixture.home,
                  state.fixture.away
                )}
              />
              <SlipStat
                label="To win"
                value={`${selectedOutcome.potential} pts`}
              />
              <SlipStat
                label="Price"
                value={`${selectedOutcome.outcome.pct ?? "—"}% · ${formatMultiplier(
                  selectedOutcome.outcome.multiplierMilli
                )}`}
              />
            </div>
          ) : (
            <p className="flex-1 text-sm text-[color:var(--muted)]">
              {matchLive && boardTab === "timeline"
                ? "Switch to Live odds to pick an outcome, or keep watching the timeline."
                : "Pick an outcome above to build your slip."}
            </p>
          )}

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

      {!matchLive ? renderTimeline() : null}

      {state.signedIn && (
        <MatchCallsSheet
          calls={sheetCalls}
          home={state.fixture.home}
          away={state.fixture.away}
          liveScore={state.live.score}
          matchFinished={state.live.phase === "finished"}
        />
      )}
    </div>
  );
}

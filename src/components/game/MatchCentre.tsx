"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface Outcome {
  key: string;
  label: string;
  pct: string | null;
  probabilityBps: number | null;
  multiplierMilli: number | null;
  potentialPointsPer100: number | null;
}

interface Market {
  id: string;
  superOddsType: string;
  marketParameters: string | null;
  availability: string;
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
  credits: {
    startingCredits: number;
    remainingCredits: number;
  };
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
    status: string;
  }>;
}

function formatMultiplier(milli: number | null) {
  if (milli === null) return "—";
  return `${(milli / 1000).toFixed(2)}x`;
}

function marketTitle(market: Market) {
  if (market.superOddsType === "1X2_PARTICIPANT_RESULT") return "Match result";
  if (market.superOddsType === "OVERUNDER_PARTICIPANT_GOALS") {
    return `Total goals ${market.marketParameters ?? ""}`.trim();
  }
  return market.superOddsType;
}

function outcomeLabel(
  key: string,
  home: string,
  away: string
): string {
  if (key === "part1") return home;
  if (key === "part2") return away;
  if (key === "draw") return "Draw";
  if (key === "over") return "Over";
  if (key === "under") return "Under";
  return key;
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

  async function refresh() {
    const response = await fetch(
      `/api/matches/${state.fixture.sourceFixtureId}/state`,
      { cache: "no-store" }
    );
    if (!response.ok) return;
    const next = (await response.json()) as MatchState;
    setState(next);
  }

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

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--panel)]/70 p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
          {state.fixture.competitionName ?? "World Cup"}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">
          {state.fixture.home} vs {state.fixture.away}
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Kickoff {new Date(state.fixture.startsAt).toLocaleString()} · credits{" "}
          {state.credits.remainingCredits}/{state.credits.startingCredits}
        </p>
        {!state.signedIn && (
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            <Link href="/login" className="text-[color:var(--signal)] underline">
              Sign in
            </Link>{" "}
            to spend confidence credits on this match.
          </p>
        )}
      </section>

      <section className="grid gap-4">
        {state.markets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-10 text-center text-[color:var(--muted)]">
            No open pre-match markets yet. Run ingestion/replay first.
          </div>
        ) : (
          state.markets.map((market) => (
            <article
              key={market.id}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
                  {marketTitle(market)}
                </h2>
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
                    market.availability === "closed";
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
                    </button>
                  );
                })}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/50 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
          Place call
        </h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Credits
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
              </>
            ) : (
              "Pick an outcome"
            )}
          </div>
          <button
            type="button"
            disabled={!selectedOutcome || busy || creditsInput < 1}
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
          Your calls
        </h2>
        {state.calls.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">No calls yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {state.calls.map((call) => (
              <li
                key={call.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--line)] pb-3 text-sm"
              >
                <span className="text-[color:var(--chalk)]">
                  {call.outcomeKey} · {call.credits} credits
                </span>
                <span className="text-[color:var(--muted)]">
                  {formatMultiplier(call.multiplierMilli)} ·{" "}
                  {call.potentialPoints} pts · {call.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

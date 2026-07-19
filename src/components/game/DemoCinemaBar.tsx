"use client";

import {
  playMatchSound,
  soundKindFromBeatId,
  unlockMatchAudio,
} from "@/lib/game/match-sounds";

type DemoState = {
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
};

export function DemoCinemaBar({
  demo,
  onChanged,
}: {
  demo: DemoState;
  onChanged: () => void | Promise<void>;
}) {
  async function run(action: "reset" | "advance" | "settle") {
    // Must unlock inside the click gesture before any await that yields.
    await unlockMatchAudio();

    const response = await fetch("/api/demo/cinema", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, fixtureId: demo.fixtureId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      alert(payload?.error?.message ?? `Demo ${action} failed`);
      return;
    }

    const payload = (await response.json()) as {
      appliedBeatId?: string;
      advanced?: boolean;
    };

    if (action === "advance" && payload.advanced) {
      const kind = soundKindFromBeatId(payload.appliedBeatId);
      if (kind) {
        await playMatchSound(kind);
      }
    }

    await onChanged();
  }

  const step = Math.max(1, demo.beatIndex + 1);

  return (
    <section className="rounded-2xl border border-[color:var(--signal)]/50 bg-[color:var(--signal)]/10 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--signal)]">
            Demo cinema · past match replay
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-[color:var(--chalk)]">
            {demo.currentLabel ?? "Ready"}
            <span className="ml-2 font-mono text-xs text-[color:var(--muted)]">
              {step}/{demo.beatTotal}
            </span>
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {demo.currentHint ??
              "Use Advance to play the captured France vs England match beat by beat. Reset rewinds the timeline; settled points stay on the board."}
          </p>
          {demo.nextLabel && !demo.done ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Next: {demo.nextLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void run("reset")}
            className="rounded-xl border border-[color:var(--line)] px-3 py-2.5 text-sm font-semibold text-[color:var(--chalk)]"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={demo.done}
            onClick={() => void run("advance")}
            className="rounded-xl bg-[color:var(--signal)] px-3 py-2.5 text-sm font-semibold text-[color:var(--ink)] disabled:opacity-40"
          >
            {demo.done ? "At full time" : "Advance match"}
          </button>
          <button
            type="button"
            disabled={!demo.done}
            onClick={() => void run("settle")}
            className="rounded-xl border border-[color:var(--signal)]/50 px-3 py-2.5 text-sm font-semibold text-[color:var(--signal)] disabled:opacity-40"
          >
            Settle calls
          </button>
        </div>
      </div>
    </section>
  );
}

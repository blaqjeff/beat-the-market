"use client";

import { useEffect, useRef, useState } from "react";

import {
  playMatchSound,
  soundKindFromTimeline,
  unlockMatchAudio,
} from "@/lib/game/match-sounds";

type TimelineRow = {
  sequence: number;
  kind?: string;
  headline?: string;
  summary: string;
  action: string;
};

const STORAGE_KEY = "btm.matchSounds";

export function MatchEventFx({
  timeline,
  home,
  away,
  score,
}: {
  timeline: TimelineRow[];
  home: string;
  away: string;
  score: { home: number; away: number };
}) {
  // Default on; preference applied only via toggle (avoids setState-in-effect lint).
  const [soundOn, setSoundOn] = useState(true);
  const [burst, setBurst] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const maxSeq = useRef(0);
  const clearBurstTimer = useRef<number | null>(null);

  useEffect(() => {
    const visible = timeline.filter(
      (row) => (row.kind && row.kind !== "note") || row.action
    );
    const highest = visible.reduce(
      (max, row) => Math.max(max, row.sequence),
      0
    );

    if (primed.current && highest < maxSeq.current) {
      seen.current = new Set();
      primed.current = false;
      maxSeq.current = 0;
    }

    if (!primed.current) {
      for (const row of visible) {
        seen.current.add(`${row.sequence}:${row.action}`);
      }
      primed.current = true;
      maxSeq.current = highest;
      return;
    }

    maxSeq.current = Math.max(maxSeq.current, highest);

    const fresh = [...visible]
      .reverse()
      .filter((row) => !seen.current.has(`${row.sequence}:${row.action}`));

    for (const row of fresh) {
      const key = `${row.sequence}:${row.action}`;
      seen.current.add(key);

      const sound = soundKindFromTimeline(row.kind, row.action);
      if (sound && soundOn) {
        void playMatchSound(sound);
      }

      if (sound === "goal" || row.kind === "goal") {
        const headline = row.headline ?? row.summary;
        const label = `${headline} · ${score.home}–${score.away}`;
        if (clearBurstTimer.current !== null) {
          window.clearTimeout(clearBurstTimer.current);
        }
        // Async so React does not treat this as a sync effect setState cascade.
        clearBurstTimer.current = window.setTimeout(() => {
          setBurst(label);
          clearBurstTimer.current = window.setTimeout(() => {
            setBurst(null);
            clearBurstTimer.current = null;
          }, 2400);
        }, 0);
      }
    }
  }, [timeline, soundOn, score.home, score.away]);

  useEffect(() => {
    return () => {
      if (clearBurstTimer.current !== null) {
        window.clearTimeout(clearBurstTimer.current);
      }
    };
  }, []);

  async function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (next) {
      await unlockMatchAudio();
      await playMatchSound("goal");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void toggleSound()}
        className="absolute right-4 top-4 z-20 rounded-full border border-[color:var(--line)] bg-[color:var(--pitch)]/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)] transition hover:text-[color:var(--chalk)] sm:right-6 sm:top-6"
        aria-pressed={soundOn}
      >
        Sound {soundOn ? "on" : "off"}
      </button>

      {burst ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center animate-goal-burst"
          aria-live="polite"
        >
          <div className="rounded-2xl border border-[color:var(--signal)]/50 bg-[color:var(--ink)]/80 px-6 py-4 text-center shadow-[0_0_40px_rgba(200,241,53,0.25)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--signal)]">
              Goal
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
              {burst}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {home} vs {away}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

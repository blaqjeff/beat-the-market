"use client";

import { useMemo } from "react";

type Tempo = "cold" | "steady" | "hot" | "frantic";

export type MomentumView = {
  balance: number;
  homePressure: number;
  awayPressure: number;
  tempo: Tempo;
  tempoScore: number;
  label: string;
  drivers: string[];
  series?: Array<{ minute: number | null; balance: number; tempoScore: number }>;
};

const TEMPO_COPY: Record<Tempo, string> = {
  cold: "Quiet",
  steady: "Steady",
  hot: "Hot",
  frantic: "Frantic",
};

const WIDTH = 360;
const HEIGHT = 120;
const PAD_X = 12;
const PAD_Y = 14;

export function MomentumMeter({
  home,
  away,
  momentum,
  sideStats,
}: {
  home: string;
  away: string;
  momentum: MomentumView;
  sideStats?: {
    home: { yellowCards: number; redCards: number; corners: number };
    away: { yellowCards: number; redCards: number; corners: number };
  };
}) {
  const homeWidth = Math.max(8, Math.min(92, momentum.homePressure));
  const chart = useMemo(() => {
    const raw =
      momentum.series && momentum.series.length > 0
        ? momentum.series
        : [
            { minute: 0, balance: 0, tempoScore: 0 },
            {
              minute: null,
              balance: momentum.balance,
              tempoScore: momentum.tempoScore,
            },
          ];
    const points = raw.length === 1 ? [...raw, raw[0]!] : raw;
    const midY = HEIGHT / 2;
    const usableW = WIDTH - PAD_X * 2;
    const usableH = HEIGHT - PAD_Y * 2;
    const coords = points.map((point, index) => {
      const x =
        PAD_X +
        (points.length === 1
          ? usableW / 2
          : (index / (points.length - 1)) * usableW);
      const y = midY - (point.balance / 100) * (usableH / 2);
      return { x, y, ...point };
    });
    const line = coords
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`
      )
      .join(" ");
    const area = `${line} L${coords[coords.length - 1]!.x.toFixed(1)},${midY} L${coords[0]!.x.toFixed(1)},${midY} Z`;
    const ticks = coords
      .filter(
        (_, index) =>
          index === 0 || index === coords.length - 1 || index % 2 === 0
      )
      .slice(0, 6);
    return { coords, line, area, midY, ticks };
  }, [momentum.balance, momentum.series, momentum.tempoScore]);

  return (
    <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-[color:var(--pitch)]/50 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Momentum live
          </p>
          <p className="mt-1 text-sm text-[color:var(--chalk)]">{momentum.label}</p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--signal)]">
          Tempo {TEMPO_COPY[momentum.tempo]} · {momentum.tempoScore}
        </p>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
          <span className="truncate text-[color:var(--chalk)]">{home} ↑</span>
          <span className="truncate text-right">{away} ↓</span>
        </div>

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="mt-2 h-28 w-full overflow-visible"
          role="img"
          aria-label={`Live momentum graph, balance ${momentum.balance}`}
        >
          <rect
            x={PAD_X}
            y={PAD_Y}
            width={WIDTH - PAD_X * 2}
            height={(HEIGHT - PAD_Y * 2) / 2}
            fill="color-mix(in srgb, var(--signal) 6%, transparent)"
          />
          <rect
            x={PAD_X}
            y={HEIGHT / 2}
            width={WIDTH - PAD_X * 2}
            height={(HEIGHT - PAD_Y * 2) / 2}
            fill="color-mix(in srgb, #f87171 6%, transparent)"
          />
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={chart.midY}
            y2={chart.midY}
            stroke="currentColor"
            className="text-[color:var(--line)]"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <path
            d={chart.area}
            fill="color-mix(in srgb, var(--signal) 22%, transparent)"
          />
          <path
            d={chart.line}
            fill="none"
            stroke="var(--signal)"
            strokeWidth={2.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(200,241,53,0.35)]"
          />
          {chart.coords.map((point, index) => (
            <circle
              key={`${point.x}-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === chart.coords.length - 1 ? 4.5 : 2.5}
              fill="var(--signal)"
              className={
                index === chart.coords.length - 1
                  ? "animate-momentum-dot"
                  : undefined
              }
            />
          ))}
          {chart.ticks.map((point, index) =>
            point.minute !== null ? (
              <text
                key={`tick-${index}`}
                x={point.x}
                y={HEIGHT - 2}
                textAnchor="middle"
                className="fill-[color:var(--muted)]"
                style={{ fontSize: 8, fontFamily: "ui-monospace, monospace" }}
              >
                {point.minute}&apos;
              </text>
            ) : null
          )}
        </svg>

        <div
          className="relative mt-1 h-2 overflow-hidden rounded-full bg-[color:var(--panel)]"
          role="meter"
          aria-label="Match momentum"
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={momentum.balance}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--signal)]/80 transition-[width] duration-500"
            style={{ width: `${homeWidth}%` }}
          />
        </div>
      </div>

      {sideStats ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <Stat
            label={`${home} corners`}
            value={String(sideStats.home.corners)}
          />
          <Stat
            label={`${away} corners`}
            value={String(sideStats.away.corners)}
          />
          <Stat
            label={`${home} cards`}
            value={`${sideStats.home.yellowCards}Y ${sideStats.home.redCards}R`}
          />
          <Stat
            label={`${away} cards`}
            value={`${sideStats.away.yellowCards}Y ${sideStats.away.redCards}R`}
          />
        </dl>
      ) : null}

      {momentum.drivers.length > 0 ? (
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Recent: {momentum.drivers.join(" · ")}
        </p>
      ) : (
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Graph updates as goals, cards, corners, and consensus swings land.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--line)]/70 px-2 py-2">
      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm tabular-nums text-[color:var(--chalk)]">
        {value}
      </dd>
    </div>
  );
}

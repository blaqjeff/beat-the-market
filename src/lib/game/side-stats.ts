import { SOCCER_TOTAL_STAT_KEYS } from "@/lib/txline/constants";

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

/** TxLINE soccer Stats: (period * 1000) + baseKey. period 0 = match totals. */
export function statKey(baseKey: number, period = 0): number {
  return period * 1000 + baseKey;
}

export function readStat(
  stats: unknown,
  baseKey: number,
  period = 0
): number {
  const record = asRecord(stats);
  const key = statKey(baseKey, period);
  return (
    numberFromUnknown(record[String(key)] ?? record[key]) ??
    (period === 0
      ? (numberFromUnknown(record[String(baseKey)] ?? record[baseKey]) ?? 0)
      : 0)
  );
}

export interface SideTotals {
  goals: number;
  yellowCards: number;
  redCards: number;
  corners: number;
}

export interface MatchSideTotals {
  participant1: SideTotals;
  participant2: SideTotals;
  home: SideTotals;
  away: SideTotals;
}

function emptySide(): SideTotals {
  return { goals: 0, yellowCards: 0, redCards: 0, corners: 0 };
}

export function sideTotalsFromStats(
  stats: unknown,
  participant1IsHome: boolean,
  period = 0
): MatchSideTotals {
  const p1: SideTotals = {
    goals: readStat(stats, SOCCER_TOTAL_STAT_KEYS.participant1Goals, period),
    yellowCards: readStat(
      stats,
      SOCCER_TOTAL_STAT_KEYS.participant1YellowCards,
      period
    ),
    redCards: readStat(
      stats,
      SOCCER_TOTAL_STAT_KEYS.participant1RedCards,
      period
    ),
    corners: readStat(
      stats,
      SOCCER_TOTAL_STAT_KEYS.participant1Corners,
      period
    ),
  };
  const p2: SideTotals = {
    goals: readStat(stats, SOCCER_TOTAL_STAT_KEYS.participant2Goals, period),
    yellowCards: readStat(
      stats,
      SOCCER_TOTAL_STAT_KEYS.participant2YellowCards,
      period
    ),
    redCards: readStat(
      stats,
      SOCCER_TOTAL_STAT_KEYS.participant2RedCards,
      period
    ),
    corners: readStat(
      stats,
      SOCCER_TOTAL_STAT_KEYS.participant2Corners,
      period
    ),
  };
  return {
    participant1: p1,
    participant2: p2,
    home: participant1IsHome ? p1 : p2,
    away: participant1IsHome ? p2 : p1,
  };
}

export function liveScoreFromSideTotals(totals: MatchSideTotals) {
  return {
    participant1: totals.participant1.goals,
    participant2: totals.participant2.goals,
    home: totals.home.goals,
    away: totals.away.goals,
  };
}

export function hasAnySideStats(stats: unknown): boolean {
  const record = asRecord(stats);
  return Object.keys(record).length > 0;
}

export interface SideDelta {
  homeGoals: number;
  awayGoals: number;
  homeYellow: number;
  awayYellow: number;
  homeRed: number;
  awayRed: number;
  homeCorners: number;
  awayCorners: number;
}

export function diffSideTotals(
  previous: MatchSideTotals | null,
  next: MatchSideTotals
): SideDelta {
  const prevHome = previous?.home ?? emptySide();
  const prevAway = previous?.away ?? emptySide();
  return {
    homeGoals: Math.max(0, next.home.goals - prevHome.goals),
    awayGoals: Math.max(0, next.away.goals - prevAway.goals),
    homeYellow: Math.max(0, next.home.yellowCards - prevHome.yellowCards),
    awayYellow: Math.max(0, next.away.yellowCards - prevAway.yellowCards),
    homeRed: Math.max(0, next.home.redCards - prevHome.redCards),
    awayRed: Math.max(0, next.away.redCards - prevAway.redCards),
    homeCorners: Math.max(0, next.home.corners - prevHome.corners),
    awayCorners: Math.max(0, next.away.corners - prevAway.corners),
  };
}

export function parseHalfPeriod(
  marketPeriod: string | null
): 1 | null {
  if (!marketPeriod) return null;
  const normalized = marketPeriod.trim().toLowerCase();
  if (
    normalized === "half=1" ||
    normalized === "1" ||
    normalized === "first_half" ||
    normalized === "1h"
  ) {
    return 1;
  }
  return null;
}

export function isFirstHalfMarketPeriod(marketPeriod: string | null): boolean {
  return parseHalfPeriod(marketPeriod) === 1;
}

export function isAllowedCallMarketPeriod(marketPeriod: string | null): boolean {
  if (!marketPeriod) return true;
  return isFirstHalfMarketPeriod(marketPeriod);
}

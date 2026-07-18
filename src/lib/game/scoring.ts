export const STARTING_MATCH_CREDITS = 1_000;
export const MULTIPLIER_FLOOR_MILLI = 1_050; // 1.05x
export const MULTIPLIER_CAP_MILLI = 20_000; // 20x

/** Probability in basis points (1% = 100 bps). */
export function probabilityBpsFromPct(raw: string | number): number | null {
  if (typeof raw === "string" && raw.trim().toUpperCase() === "NA") {
    return null;
  }
  const percent = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) {
    return null;
  }
  return Math.round(percent * 100);
}

export function multiplierMilliFromProbabilityBps(probabilityBps: number): number {
  if (probabilityBps <= 0) {
    throw new Error("Probability must be positive");
  }
  // probabilityBps uses 10_000 = 100%. milli multiplier uses 1_000 = 1.0x.
  const rawMilli = Math.floor(10_000_000 / probabilityBps);
  return Math.min(
    MULTIPLIER_CAP_MILLI,
    Math.max(MULTIPLIER_FLOOR_MILLI, rawMilli)
  );
}

export function potentialPoints(
  credits: number,
  multiplierMilli: number
): number {
  if (!Number.isInteger(credits) || credits <= 0) {
    throw new Error("Credits must be a positive integer");
  }
  return Math.floor((credits * multiplierMilli) / 1_000);
}

export function quoteOutcome(rawPct: string | number, credits: number) {
  const probabilityBps = probabilityBpsFromPct(rawPct);
  if (probabilityBps === null) {
    return null;
  }
  const multiplierMilli = multiplierMilliFromProbabilityBps(probabilityBps);
  return {
    probabilityBps,
    multiplierMilli,
    potentialPoints: potentialPoints(credits, multiplierMilli),
  };
}

export const CALL_MARKET_TYPES = new Set([
  "1X2_PARTICIPANT_RESULT",
  "OVERUNDER_PARTICIPANT_GOALS",
]);

/** @deprecated Use CALL_MARKET_TYPES */
export const PREMATCH_MARKET_TYPES = CALL_MARKET_TYPES;

const GOALSCORER_HINT =
  /goal.?scorer|first.?goal|next.?goal|anytime.?scorer|player.?to.?score/i;

export function isGoalscorerMarketType(superOddsType: string): boolean {
  return GOALSCORER_HINT.test(superOddsType);
}

export function isSupportedCallMarket(input: {
  superOddsType: string;
  inRunning: boolean;
  marketPeriod: string | null;
}): boolean {
  void input.inRunning;
  if (!CALL_MARKET_TYPES.has(input.superOddsType)) return false;
  // Prefer full-match markets; skip period-scoped rows for the first release.
  if (input.marketPeriod) return false;
  return true;
}

export function isSupportedPrematchMarket(input: {
  superOddsType: string;
  inRunning: boolean;
  marketPeriod: string | null;
}): boolean {
  if (input.inRunning) return false;
  return isSupportedCallMarket(input);
}

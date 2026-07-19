import { isFirstHalfMarketPeriod } from "@/lib/game/side-stats";

export type MarketResolution =
  | { status: "decided"; winningOutcomeKey: string }
  | { status: "void"; reason: string };

export function parseLineParameter(marketParameters: string | null): number | null {
  if (!marketParameters) return null;
  const match = /(?:^|&)line=(-?\d+(?:\.\d+)?)(?:&|$)/i.exec(marketParameters);
  if (!match) return null;
  const line = Number(match[1]);
  return Number.isFinite(line) ? line : null;
}

/** TxLINE 1X2 uses part1/part2 for participant1/participant2, not home/away. */
export function resolve1x2(input: {
  homeScore: number;
  awayScore: number;
  participant1IsHome: boolean;
}): MarketResolution {
  const p1 = input.participant1IsHome ? input.homeScore : input.awayScore;
  const p2 = input.participant1IsHome ? input.awayScore : input.homeScore;
  if (p1 > p2) return { status: "decided", winningOutcomeKey: "part1" };
  if (p2 > p1) return { status: "decided", winningOutcomeKey: "part2" };
  return { status: "decided", winningOutcomeKey: "draw" };
}

/**
 * Full-match totals.
 * - Whole-number lines void on exact totals.
 * - .5 lines never void.
 * - .25 / .75 quarter lines void on the push score.
 */
export function resolveOverUnder(input: {
  homeScore: number;
  awayScore: number;
  marketParameters: string | null;
}): MarketResolution {
  const line = parseLineParameter(input.marketParameters);
  if (line === null) {
    return { status: "void", reason: "Missing or invalid totals line" };
  }

  const total = input.homeScore + input.awayScore;
  const whole = Math.floor(line);
  const frac = Number((line - whole).toFixed(2));

  if (frac === 0) {
    if (total === line) {
      return { status: "void", reason: `Totals push on line ${line}` };
    }
  } else if (frac === 0.25) {
    if (total === whole) {
      return { status: "void", reason: `Totals push on quarter line ${line}` };
    }
  } else if (frac === 0.75) {
    if (total === whole + 1) {
      return { status: "void", reason: `Totals push on quarter line ${line}` };
    }
  }

  return total > line
    ? { status: "decided", winningOutcomeKey: "over" }
    : { status: "decided", winningOutcomeKey: "under" };
}

function quarterHalfLines(line: number): [number, number] | null {
  const absFrac = Number((Math.abs(line) % 1).toFixed(2));
  if (absFrac !== 0.25 && absFrac !== 0.75) return null;
  const sign = line < 0 ? -1 : 1;
  const abs = Math.abs(line);
  if (absFrac === 0.25) {
    return [sign * (Math.floor(abs) + 0), sign * (Math.floor(abs) + 0.5)];
  }
  return [sign * (Math.floor(abs) + 0.5), sign * (Math.floor(abs) + 1)];
}

/**
 * Asian handicap on part1. Pushes (including quarter-line half-results) void.
 */
export function resolveAsianHandicap(input: {
  homeScore: number;
  awayScore: number;
  participant1IsHome: boolean;
  marketParameters: string | null;
}): MarketResolution {
  const line = parseLineParameter(input.marketParameters);
  if (line === null) {
    return { status: "void", reason: "Missing or invalid handicap line" };
  }

  const p1 = input.participant1IsHome ? input.homeScore : input.awayScore;
  const p2 = input.participant1IsHome ? input.awayScore : input.homeScore;

  const halves = quarterHalfLines(line);
  if (halves) {
    const results = halves.map((half) => {
      const margin = p1 + half - p2;
      if (margin === 0) return "push" as const;
      return margin > 0 ? ("part1" as const) : ("part2" as const);
    });
    if (results[0] === "push" || results[1] === "push") {
      return {
        status: "void",
        reason: `Handicap push on quarter line ${line}`,
      };
    }
    if (results[0] !== results[1]) {
      return {
        status: "void",
        reason: `Handicap split result on quarter line ${line}`,
      };
    }
    return { status: "decided", winningOutcomeKey: results[0]! };
  }

  const margin = p1 + line - p2;
  if (margin === 0) {
    return { status: "void", reason: `Handicap push on line ${line}` };
  }
  return margin > 0
    ? { status: "decided", winningOutcomeKey: "part1" }
    : { status: "decided", winningOutcomeKey: "part2" };
}

export function resolveMarket(input: {
  superOddsType: string;
  marketParameters: string | null;
  marketPeriod?: string | null;
  homeScore: number;
  awayScore: number;
  participant1IsHome: boolean;
  /** Required when marketPeriod is first-half. */
  firstHalfHomeScore?: number | null;
  firstHalfAwayScore?: number | null;
}): MarketResolution {
  const period = input.marketPeriod ?? null;
  let homeScore = input.homeScore;
  let awayScore = input.awayScore;

  if (isFirstHalfMarketPeriod(period)) {
    if (
      input.firstHalfHomeScore === null ||
      input.firstHalfHomeScore === undefined ||
      input.firstHalfAwayScore === null ||
      input.firstHalfAwayScore === undefined
    ) {
      return {
        status: "void",
        reason: "Missing first-half score for period market",
      };
    }
    homeScore = input.firstHalfHomeScore;
    awayScore = input.firstHalfAwayScore;
  } else if (period) {
    return {
      status: "void",
      reason: `Unsupported market period ${period}`,
    };
  }

  if (input.superOddsType === "1X2_PARTICIPANT_RESULT") {
    return resolve1x2({
      homeScore,
      awayScore,
      participant1IsHome: input.participant1IsHome,
    });
  }
  if (input.superOddsType === "OVERUNDER_PARTICIPANT_GOALS") {
    return resolveOverUnder({
      homeScore,
      awayScore,
      marketParameters: input.marketParameters,
    });
  }
  if (input.superOddsType === "ASIANHANDICAP_PARTICIPANT_GOALS") {
    return resolveAsianHandicap({
      homeScore,
      awayScore,
      participant1IsHome: input.participant1IsHome,
      marketParameters: input.marketParameters,
    });
  }
  return {
    status: "void",
    reason: `Unsupported market type ${input.superOddsType}`,
  };
}

export function callResultFromResolution(
  outcomeKey: string,
  resolution: MarketResolution
): "won" | "lost" | "void" {
  if (resolution.status === "void") return "void";
  return resolution.winningOutcomeKey === outcomeKey ? "won" : "lost";
}

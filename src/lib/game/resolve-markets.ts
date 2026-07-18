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

export function resolveMarket(input: {
  superOddsType: string;
  marketParameters: string | null;
  homeScore: number;
  awayScore: number;
  participant1IsHome: boolean;
}): MarketResolution {
  if (input.superOddsType === "1X2_PARTICIPANT_RESULT") {
    return resolve1x2(input);
  }
  if (input.superOddsType === "OVERUNDER_PARTICIPANT_GOALS") {
    return resolveOverUnder(input);
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

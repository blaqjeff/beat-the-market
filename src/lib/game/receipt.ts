import type { MarketResolution } from "@/lib/game/resolve-markets";

export function buildSettlementNarrative(input: {
  home: string;
  away: string;
  finalHomeScore: number;
  finalAwayScore: number;
  marketType: string;
  marketParameters: string | null;
  outcomeKey: string;
  result: "won" | "lost" | "void";
  pointsAwarded: number;
  credits: number;
  probabilityBps: number;
  multiplierMilli: number;
  resolution: MarketResolution;
}): string {
  const scoreline = `${input.home} ${input.finalHomeScore}-${input.finalAwayScore} ${input.away}`;
  const marketLabel =
    input.marketType === "1X2_PARTICIPANT_RESULT"
      ? "match result"
      : `totals ${input.marketParameters ?? ""}`.trim();
  const quote = `${(input.probabilityBps / 100).toFixed(2)}% → ${(
    input.multiplierMilli / 1000
  ).toFixed(2)}x on ${input.credits} credits`;

  if (input.result === "void") {
    const reason =
      input.resolution.status === "void"
        ? input.resolution.reason
        : "Market voided";
    return `Void on ${marketLabel} for ${scoreline}. ${reason}. ${input.credits} credits refunded. Quote was ${quote}.`;
  }

  const winner =
    input.resolution.status === "decided"
      ? input.resolution.winningOutcomeKey
      : "n/a";

  if (input.result === "won") {
    return `Won ${input.pointsAwarded} pts on ${marketLabel} (${input.outcomeKey}). Final ${scoreline}; settled outcome ${winner}. Quote ${quote}.`;
  }

  return `Lost on ${marketLabel} (${input.outcomeKey}). Final ${scoreline}; settled outcome ${winner}. Quote ${quote}; 0 pts awarded.`;
}

export function receiptInputs(input: {
  callId: string;
  sourceFixtureId: string;
  marketType: string;
  marketParameters: string | null;
  outcomeKey: string;
  credits: number;
  probabilityBps: number;
  multiplierMilli: number;
  potentialPoints: number;
  finalHomeScore: number;
  finalAwayScore: number;
  participant1IsHome: boolean;
  sourceSequence: number | null;
  resolution: MarketResolution;
  result: "won" | "lost" | "void";
  pointsAwarded: number;
  proofId: string | null;
  settlementVersion: number;
}) {
  return {
    ...input,
    formula: {
      pointsIfWon: input.potentialPoints,
      pointsAwarded: input.pointsAwarded,
      math: "floor(credits * multiplierMilli / 1000)",
    },
  };
}

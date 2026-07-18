import type { MarketResolution } from "@/lib/game/resolve-markets";
import { marketLabel, outcomeLabel } from "@/lib/game/labels";

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
  const callSide = outcomeLabel(input.outcomeKey, input.home, input.away);
  const market = marketLabel(input.marketType, input.marketParameters);
  const scoreline = `${input.finalHomeScore}–${input.finalAwayScore}`;
  const winner =
    input.resolution.status === "decided"
      ? outcomeLabel(input.resolution.winningOutcomeKey, input.home, input.away)
      : null;

  if (input.result === "void") {
    const reason =
      input.resolution.status === "void"
        ? input.resolution.reason
        : "Market voided";
    return `Void on ${market} · called ${callSide} · final ${scoreline}. ${reason}. ${input.credits} credits refunded.`;
  }

  if (input.result === "won") {
    return `Called ${callSide} on ${market} · won ${input.pointsAwarded} pts · final ${scoreline}.`;
  }

  return `Called ${callSide} on ${market} · lost · final ${scoreline}${
    winner ? ` (${winner})` : ""
  }.`;
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

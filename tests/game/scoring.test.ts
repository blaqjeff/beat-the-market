import { describe, expect, it } from "vitest";

import {
  multiplierMilliFromProbabilityBps,
  potentialPoints,
  probabilityBpsFromPct,
  quoteOutcome,
} from "@/lib/game/scoring";

describe("scoring", () => {
  it("parses TxLINE pct strings into basis points", () => {
    expect(probabilityBpsFromPct("52.329")).toBe(5233);
    expect(probabilityBpsFromPct("NA")).toBeNull();
  });

  it("caps multipliers and freezes potential points", () => {
    expect(multiplierMilliFromProbabilityBps(400)).toBe(20_000); // 4% -> 20x cap
    expect(potentialPoints(50, 20_000)).toBe(1_000);
    const quote = quoteOutcome("4", 50);
    expect(quote?.potentialPoints).toBe(1_000);
  });

  it("matches UI preview math for accepted quotes", () => {
    const quote = quoteOutcome("52.329", 50);
    expect(quote).not.toBeNull();
    expect(quote!.potentialPoints).toBe(
      potentialPoints(50, quote!.multiplierMilli)
    );
  });
});

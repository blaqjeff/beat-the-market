import { describe, expect, it } from "vitest";

import {
  inferMarketAvailability,
  marketKey,
  normalizeMatchEvent,
  normalizeOddsRow,
} from "@/lib/ingestion/normalize";
import oddsFixture from "../fixtures/txline/odds.18257865.snapshot.json";
import scoresFixture from "../fixtures/txline/scores.18257865.snapshot.json";

describe("ingestion normalize", () => {
  it("builds stable market keys", () => {
    expect(
      marketKey({
        sourceFixtureId: "18257865",
        superOddsType: "1X2_PARTICIPANT_RESULT",
        marketParameters: null,
        marketPeriod: null,
        inRunning: false,
      })
    ).toBe("18257865|1X2_PARTICIPANT_RESULT|||0");
  });

  it("normalizes captured World Cup odds rows", () => {
    const row = normalizeOddsRow(oddsFixture[0], {
      maxAgeMs: 15_000,
      nowMs: Number(oddsFixture[0].Ts),
    });
    expect(row.sourceFixtureId).toBe("18257865");
    expect(row.superOddsType).toBe("1X2_PARTICIPANT_RESULT");
    expect(row.priceNames).toEqual(["part1", "draw", "part2"]);
    expect(row.availability).toBe("open");
  });

  it("marks old odds stale", () => {
    expect(
      inferMarketAvailability({
        inRunning: false,
        gameState: null,
        sourceTimestamp: BigInt(1),
        maxAgeMs: 15_000,
        nowMs: 100_000,
      })
    ).toBe("stale");
  });

  it("normalizes score events including sequence zero coverage", () => {
    const event = normalizeMatchEvent(scoresFixture[1]);
    expect(event.sourceFixtureId).toBe("18257865");
    expect(event.sequence).toBe(0);
    expect(event.action).toBe("coverage_update");
  });
});

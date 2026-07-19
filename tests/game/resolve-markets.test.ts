import { describe, expect, it } from "vitest";

import {
  callResultFromResolution,
  parseLineParameter,
  resolve1x2,
  resolveAsianHandicap,
  resolveMarket,
  resolveOverUnder,
} from "@/lib/game/resolve-markets";

describe("resolve markets", () => {
  it("resolves 1X2 against participant orientation", () => {
    expect(
      resolve1x2({ homeScore: 2, awayScore: 1, participant1IsHome: true })
    ).toEqual({ status: "decided", winningOutcomeKey: "part1" });
    expect(
      resolve1x2({ homeScore: 2, awayScore: 1, participant1IsHome: false })
    ).toEqual({ status: "decided", winningOutcomeKey: "part2" });
    expect(
      resolve1x2({ homeScore: 1, awayScore: 1, participant1IsHome: true })
    ).toEqual({ status: "decided", winningOutcomeKey: "draw" });
  });

  it("resolves totals with void pushes", () => {
    expect(parseLineParameter("line=2.5")).toBe(2.5);
    expect(
      resolveOverUnder({
        homeScore: 2,
        awayScore: 1,
        marketParameters: "line=2.5",
      })
    ).toEqual({ status: "decided", winningOutcomeKey: "over" });
    expect(
      resolveOverUnder({
        homeScore: 1,
        awayScore: 1,
        marketParameters: "line=2",
      })
    ).toEqual({ status: "void", reason: "Totals push on line 2" });
    expect(
      resolveOverUnder({
        homeScore: 1,
        awayScore: 1,
        marketParameters: "line=2.25",
      })
    ).toEqual({
      status: "void",
      reason: "Totals push on quarter line 2.25",
    });
  });

  it("maps call results including void", () => {
    const won = resolveMarket({
      superOddsType: "1X2_PARTICIPANT_RESULT",
      marketParameters: null,
      homeScore: 2,
      awayScore: 1,
      participant1IsHome: true,
    });
    expect(callResultFromResolution("part1", won)).toBe("won");
    expect(callResultFromResolution("part2", won)).toBe("lost");

    const voided = resolveOverUnder({
      homeScore: 1,
      awayScore: 1,
      marketParameters: "line=2",
    });
    expect(callResultFromResolution("over", voided)).toBe("void");
  });

  it("resolves asian handicap with pushes", () => {
    expect(
      resolveAsianHandicap({
        homeScore: 1,
        awayScore: 1,
        participant1IsHome: true,
        marketParameters: "line=0",
      })
    ).toEqual({ status: "void", reason: "Handicap push on line 0" });
    expect(
      resolveAsianHandicap({
        homeScore: 2,
        awayScore: 1,
        participant1IsHome: true,
        marketParameters: "line=-0.5",
      })
    ).toEqual({ status: "decided", winningOutcomeKey: "part1" });
    expect(
      resolveAsianHandicap({
        homeScore: 1,
        awayScore: 1,
        participant1IsHome: true,
        marketParameters: "line=-0.25",
      }).status
    ).toBe("void");
  });

  it("settles first-half markets on HT score not FT", () => {
    const ht = resolveMarket({
      superOddsType: "OVERUNDER_PARTICIPANT_GOALS",
      marketParameters: "line=1.5",
      marketPeriod: "half=1",
      homeScore: 3,
      awayScore: 2,
      participant1IsHome: true,
      firstHalfHomeScore: 1,
      firstHalfAwayScore: 0,
    });
    expect(ht).toEqual({ status: "decided", winningOutcomeKey: "under" });

    const missing = resolveMarket({
      superOddsType: "1X2_PARTICIPANT_RESULT",
      marketParameters: null,
      marketPeriod: "half=1",
      homeScore: 2,
      awayScore: 1,
      participant1IsHome: true,
      firstHalfHomeScore: null,
      firstHalfAwayScore: null,
    });
    expect(missing.status).toBe("void");
  });
});

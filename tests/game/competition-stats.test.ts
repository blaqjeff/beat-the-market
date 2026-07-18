import { describe, expect, it } from "vitest";

import {
  compareRankablePlayers,
  computeCompetitionStats,
  isRemarkableCall,
  rankPlayers,
} from "@/lib/game/competition-stats";

describe("competition stats", () => {
  it("computes accuracy, streaks, upset, and market-beating score", () => {
    const stats = computeCompetitionStats([
      {
        callId: "a",
        result: "won",
        pointsAwarded: 100,
        potentialPoints: 100,
        probabilityBps: 6_000,
        multiplierMilli: 1_600,
        credits: 50,
        settledAt: "2026-07-01T00:00:00.000Z",
      },
      {
        callId: "b",
        result: "lost",
        pointsAwarded: 0,
        potentialPoints: 200,
        probabilityBps: 4_000,
        multiplierMilli: 2_500,
        credits: 50,
        settledAt: "2026-07-02T00:00:00.000Z",
      },
      {
        callId: "c",
        result: "won",
        pointsAwarded: 400,
        potentialPoints: 400,
        probabilityBps: 2_500,
        multiplierMilli: 4_000,
        credits: 100,
        settledAt: "2026-07-03T00:00:00.000Z",
      },
      {
        callId: "d",
        result: "won",
        pointsAwarded: 80,
        potentialPoints: 80,
        probabilityBps: 3_000,
        multiplierMilli: 3_300,
        credits: 25,
        settledAt: "2026-07-04T00:00:00.000Z",
      },
      {
        callId: "e",
        result: "void",
        pointsAwarded: 0,
        potentialPoints: 50,
        probabilityBps: 5_000,
        multiplierMilli: 2_000,
        credits: 25,
        settledAt: "2026-07-05T00:00:00.000Z",
      },
    ]);

    expect(stats.wins).toBe(3);
    expect(stats.losses).toBe(1);
    expect(stats.voids).toBe(1);
    expect(stats.accuracyBps).toBe(7_500);
    expect(stats.currentWinStreak).toBe(2);
    expect(stats.bestWinStreak).toBe(2);
    expect(stats.biggestUpset?.callId).toBe("c");
    expect(stats.marketBeating.wins).toBe(2);
    expect(stats.marketBeating.score).toBe(2_500 + 2_000);
    expect(stats.totalPoints).toBe(580);
  });

  it("ranks with documented tie-breakers", () => {
    const ranked = rankPlayers([
      {
        userId: "1",
        username: "zeta",
        displayName: "Zeta",
        points: 100,
        accuracyBps: 5_000,
        decidedCalls: 2,
      },
      {
        userId: "2",
        username: "alpha",
        displayName: "Alpha",
        points: 100,
        accuracyBps: 5_000,
        decidedCalls: 2,
      },
      {
        userId: "3",
        username: "mid",
        displayName: "Mid",
        points: 100,
        accuracyBps: 8_000,
        decidedCalls: 1,
      },
      {
        userId: "4",
        username: "top",
        displayName: "Top",
        points: 200,
        accuracyBps: 1_000,
        decidedCalls: 1,
      },
    ]);

    expect(ranked.map((row) => row.username)).toEqual([
      "top",
      "mid",
      "alpha",
      "zeta",
    ]);
    expect(compareRankablePlayers(ranked[0]!, ranked[1]!)).toBeLessThan(0);
  });

  it("gates remarkable share cards", () => {
    expect(
      isRemarkableCall({
        result: "won",
        probabilityBps: 3_500,
        multiplierMilli: 2_000,
        pointsAwarded: 50,
      })
    ).toBe(true);
    expect(
      isRemarkableCall({
        result: "lost",
        probabilityBps: 1_000,
        multiplierMilli: 10_000,
        pointsAwarded: 0,
      })
    ).toBe(false);
  });
});

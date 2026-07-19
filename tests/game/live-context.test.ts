import { describe, expect, it } from "vitest";

import {
  buildLiveBoard,
  clockFromPayload,
  goalsFromStats,
  inferMatchPhase,
  probabilityDeltaBps,
} from "@/lib/game/live-context";
import {
  isSupportedCallMarket,
  isSupportedPrematchMarket,
} from "@/lib/game/scoring";

describe("live-context", () => {
  it("maps TxLINE total goal stats onto home/away", () => {
    expect(goalsFromStats({ "1": 2, "2": 1 }, true)).toEqual({
      participant1: 2,
      participant2: 1,
      home: 2,
      away: 1,
    });
    expect(goalsFromStats({ "1": 2, "2": 1 }, false)).toEqual({
      participant1: 2,
      participant2: 1,
      home: 1,
      away: 2,
    });
  });

  it("reads clock minutes and running flag from payload", () => {
    const clock = clockFromPayload({
      Minutes: 34,
      Clock: { running: true, seconds: 2040 },
    });
    expect(clock.minutes).toBe(34);
    expect(clock.seconds).toBe(2040);
    expect(clock.running).toBe(true);
    expect(clock.display).toBe("34'");
  });

  it("builds scoreboard, timeline, and suspension blocks", () => {
    const board = buildLiveBoard({
      gameState: "scheduled",
      participant1IsHome: true,
      events: [
        {
          sequence: 10,
          action: "kick_off",
          gameState: "first_half",
          sourceTimestamp: 1,
          stats: { "1": 0, "2": 0 },
          data: {},
          rawPayload: {
            Minutes: 1,
            Clock: { running: true, seconds: 60 },
          },
        },
        {
          sequence: 11,
          action: "goal",
          gameState: "first_half",
          sourceTimestamp: 2,
          stats: { "1": 1, "2": 0 },
          data: {},
          rawPayload: {
            Minutes: 18,
            Clock: { running: true, seconds: 1080 },
          },
        },
      ],
    });

    expect(board.score).toEqual({
      participant1: 1,
      participant2: 0,
      home: 1,
      away: 0,
    });
    expect(board.phase).toBe("in_play");
    expect(board.clock.minutes).toBe(18);
    expect(board.timeline[0]?.action).toBe("goal");
    expect(board.timeline[0]?.kind).toBe("goal");
    expect(board.timeline[0]?.headline).toBe("Home score");
    expect(board.timeline[0]?.summary).toBe("Home score · 1–0");
    expect(board.timeline[0]?.visible).toBe(true);
    expect(board.callsBlocked).toBe(false);

    const named = buildLiveBoard({
      gameState: "first_half",
      participant1IsHome: true,
      homeName: "France",
      awayName: "England",
      events: [
        {
          sequence: 10,
          action: "kick_off",
          gameState: "first_half",
          sourceTimestamp: 1,
          stats: { "1": 0, "2": 0 },
          data: {},
          rawPayload: { Minutes: 1 },
        },
        {
          sequence: 11,
          action: "goal",
          gameState: "first_half",
          sourceTimestamp: 2,
          stats: { "1": 0, "2": 1 },
          data: {},
          rawPayload: { Minutes: 22 },
        },
        {
          sequence: 12,
          action: "comment",
          gameState: "first_half",
          sourceTimestamp: 3,
          stats: {},
          data: {},
          rawPayload: {},
        },
      ],
    });
    expect(
      named.timeline.find((row) => row.action === "goal")?.headline
    ).toBe("England score");
    expect(named.timeline.find((row) => row.action === "comment")?.visible).toBe(
      false
    );

    const suspended = buildLiveBoard({
      gameState: "first_half",
      participant1IsHome: true,
      events: [
        {
          sequence: 12,
          action: "market_suspend",
          gameState: "suspended",
          sourceTimestamp: 3,
          stats: { "1": 1, "2": 0 },
          data: {},
          rawPayload: {},
        },
      ],
      marketsSuspended: true,
    });
    expect(suspended.phase).toBe("suspended");
    expect(suspended.callsBlocked).toBe(true);
  });

  it("computes probability movement in basis points", () => {
    expect(probabilityDeltaBps("55.400", "48.200")).toBe(720);
    expect(probabilityDeltaBps("NA", "48.200")).toBeNull();
  });

  it("classifies match phases", () => {
    expect(inferMatchPhase("scheduled")).toBe("prematch");
    expect(inferMatchPhase("first_half")).toBe("in_play");
    expect(inferMatchPhase("suspended")).toBe("suspended");
    expect(inferMatchPhase("game_finalised")).toBe("finished");
  });

  it("surfaces cards, corners, HT score, and momentum", () => {
    const board = buildLiveBoard({
      gameState: "first_half",
      participant1IsHome: true,
      homeName: "France",
      awayName: "England",
      oddsBiasHomeBps: 200,
      events: [
        {
          sequence: 1,
          action: "kick_off",
          gameState: "first_half",
          sourceTimestamp: 1,
          stats: { "1": 0, "2": 0, "3": 0, "4": 0, "7": 0, "8": 0 },
          data: {},
          rawPayload: { Minutes: 1 },
        },
        {
          sequence: 2,
          action: "stats_update",
          gameState: "first_half",
          sourceTimestamp: 2,
          stats: { "1": 0, "2": 0, "3": 0, "4": 0, "7": 2, "8": 0 },
          data: {},
          rawPayload: { Minutes: 12 },
        },
        {
          sequence: 3,
          action: "goal",
          gameState: "first_half",
          sourceTimestamp: 3,
          stats: { "1": 1, "2": 0, "3": 0, "4": 0, "7": 2, "8": 1 },
          data: {},
          rawPayload: { Minutes: 18 },
        },
        {
          sequence: 4,
          action: "yellow_card",
          gameState: "first_half",
          sourceTimestamp: 4,
          stats: { "1": 1, "2": 0, "3": 0, "4": 1, "7": 2, "8": 1 },
          data: {},
          rawPayload: { Minutes: 27 },
        },
        {
          sequence: 5,
          action: "half_time",
          gameState: "half_time",
          sourceTimestamp: 5,
          stats: { "1": 1, "2": 0, "3": 0, "4": 1, "7": 3, "8": 1 },
          data: {},
          rawPayload: { Minutes: 45 },
        },
      ],
    });

    expect(board.sideStats.home.corners).toBe(3);
    expect(board.sideStats.away.yellowCards).toBe(1);
    expect(board.firstHalfScore).toEqual({
      participant1: 1,
      participant2: 0,
      home: 1,
      away: 0,
    });
    expect(
      board.timeline.some((row) => row.kind === "corner" && row.visible)
    ).toBe(true);
    expect(
      board.timeline.some((row) =>
        row.headline.toLowerCase().includes("yellow")
      )
    ).toBe(true);
    expect(board.momentum.homePressure).toBeGreaterThan(50);
    expect(board.momentum.tempoScore).toBeGreaterThan(0);
    expect(board.momentum.label.toLowerCase()).toContain("france");
    expect(board.momentum.series.length).toBeGreaterThan(1);
    expect(
      board.momentum.series[board.momentum.series.length - 1]!.balance
    ).toBe(board.momentum.balance);
  });
});

describe("call markets", () => {
  it("allows in-play winner, totals, handicap, and first-half markets", () => {
    expect(
      isSupportedCallMarket({
        superOddsType: "1X2_PARTICIPANT_RESULT",
        inRunning: true,
        marketPeriod: null,
      })
    ).toBe(true);
    expect(
      isSupportedPrematchMarket({
        superOddsType: "1X2_PARTICIPANT_RESULT",
        inRunning: true,
        marketPeriod: null,
      })
    ).toBe(false);
    expect(
      isSupportedCallMarket({
        superOddsType: "OVERUNDER_PARTICIPANT_GOALS",
        inRunning: true,
        marketPeriod: "half=1",
      })
    ).toBe(true);
    expect(
      isSupportedCallMarket({
        superOddsType: "ASIANHANDICAP_PARTICIPANT_GOALS",
        inRunning: false,
        marketPeriod: null,
      })
    ).toBe(true);
    expect(
      isSupportedCallMarket({
        superOddsType: "OVERUNDER_PARTICIPANT_GOALS",
        inRunning: true,
        marketPeriod: "half=2",
      })
    ).toBe(false);
  });
});

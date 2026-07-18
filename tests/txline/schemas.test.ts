import { describe, expect, it } from "vitest";

import {
  normalizeFixture,
  scoreIdentity,
} from "../../src/lib/txline/schemas";

describe("normalizeFixture", () => {
  it("normalizes documented PascalCase fixture payloads", () => {
    const normalized = normalizeFixture({
      FixtureId: 18175981,
      CompetitionId: 2026,
      Participant1: "Argentina",
      Participant2: "Nigeria",
      Participant1IsHome: true,
      StartTime: "2026-07-18T19:00:00.000Z",
      GameState: 1,
    });

    expect(normalized).toMatchObject({
      fixtureId: "18175981",
      competitionId: "2026",
      participant1: "Argentina",
      participant2: "Nigeria",
      participant1IsHome: true,
      startsAt: "2026-07-18T19:00:00.000Z",
      gameState: 1,
    });
  });

  it("supports backward-compatible camelCase payloads", () => {
    const normalized = normalizeFixture({
      fixtureId: "fixture-1",
      participant1: "Japan",
      participant2: "Mexico",
      participant1IsHome: false,
      startTime: 1_784_401_200,
    });

    expect(normalized.startsAt).toBe("2026-07-18T19:00:00.000Z");
    expect(normalized.participant1IsHome).toBe(false);
  });

  it("rejects fixtures without an identifier", () => {
    expect(() =>
      normalizeFixture({
        Participant1: "Japan",
        Participant2: "Mexico",
        StartTime: "2026-07-18T19:00:00.000Z",
      })
    ).toThrow("FixtureId");
  });
});

describe("scoreIdentity", () => {
  it("extracts the real sequence and source timestamp", () => {
    expect(
      scoreIdentity({
        FixtureId: 18175981,
        Seq: 941,
        Ts: 1_784_402_400_000,
      })
    ).toEqual({
      fixtureId: "18175981",
      sequence: 941,
      sourceTimestamp: 1_784_402_400_000,
    });
  });

  it("rejects synthetic sequence zero", () => {
    expect(() =>
      scoreIdentity({ FixtureId: 18175981, Seq: 0 })
    ).toThrow();
  });
});

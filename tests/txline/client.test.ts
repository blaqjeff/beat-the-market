import { describe, expect, it, vi } from "vitest";

import {
  TxlineClient,
  TxlineHttpError,
} from "../../src/lib/txline/client";

function clientWith(fetchImplementation: typeof fetch) {
  return new TxlineClient({
    apiOrigin: "https://txline.example",
    guestJwt: "guest-jwt",
    apiToken: "api-token",
    fetchImplementation,
  });
}

describe("TxlineClient", () => {
  it("sends both required credentials and parses fixtures", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe(
        "https://txline.example/api/fixtures/snapshot?competitionId=2026"
      );
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer guest-jwt"
      );
      expect(new Headers(init?.headers).get("X-Api-Token")).toBe("api-token");

      return Response.json([
        {
          FixtureId: 1,
          Participant1: "Argentina",
          Participant2: "Nigeria",
          StartTime: "2026-07-18T19:00:00.000Z",
        },
      ]);
    });

    const fixtures = await clientWith(fetchImplementation).fixturesSnapshot({
      competitionId: 2026,
    });

    expect(fixtures).toHaveLength(1);
  });

  it("returns a safe structured HTTP error", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () => {
      return new Response("access denied", { status: 403 });
    });

    const error = await clientWith(fetchImplementation)
      .oddsSnapshot(123)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TxlineHttpError);
    expect(error).toMatchObject({
      status: 403,
      endpoint: "/api/odds/snapshot/123",
      responsePreview: "access denied",
    });
    expect(String(error)).not.toContain("guest-jwt");
    expect(String(error)).not.toContain("api-token");
  });

  it("parses historical scores returned as SSE text", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () => {
      return new Response(
        [
          'data: {"FixtureId":123,"Seq":1,"Ts":1784408400000}',
          "",
          'data: {"FixtureId":123,"Seq":2,"Ts":1784408460000}',
          "",
        ].join("\n"),
        { headers: { "Content-Type": "application/json" } }
      );
    });

    const scores = await clientWith(fetchImplementation).historicalScores(123);
    expect(scores.map((score) => score.Seq)).toEqual([1, 2]);
  });
});

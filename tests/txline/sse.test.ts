import { describe, expect, it } from "vitest";

import { parseSseBlock, parseSseData } from "../../src/lib/txline/sse";

describe("parseSseBlock", () => {
  it("parses event metadata and multiline data", () => {
    const message = parseSseBlock(
      [
        "id: update-42",
        "event: odds",
        "retry: 5000",
        'data: {"FixtureId":18175981,',
        'data: "Seq":42}',
      ].join("\n")
    );

    expect(message).toEqual({
      id: "update-42",
      event: "odds",
      retry: 5000,
      data: '{"FixtureId":18175981,\n"Seq":42}',
    });
    expect(parseSseData(message!)).toEqual({
      FixtureId: 18175981,
      Seq: 42,
    });
  });

  it("ignores heartbeat comments", () => {
    expect(parseSseBlock(": heartbeat")).toBeNull();
  });

  it("preserves non-JSON payloads", () => {
    const message = parseSseBlock("data: connected");
    expect(parseSseData(message!)).toBe("connected");
  });
});

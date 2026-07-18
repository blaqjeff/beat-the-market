import { afterEach, describe, expect, it, vi } from "vitest";

describe("serverEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires matching TxLINE credential pairs", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://beat:beat@localhost:5432/beat_the_market?schema=public",
    );
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-characters-long");
    vi.stubEnv("TXLINE_GUEST_JWT", "jwt-only");
    vi.stubEnv("TXLINE_API_TOKEN", "");

    const { resetServerEnvCache, serverEnv } = await import("@/lib/env/server");
    resetServerEnvCache();
    expect(() => serverEnv()).toThrow(/both be set or both be absent/);
  });

  it("accepts a valid foundation configuration", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://beat:beat@localhost:5432/beat_the_market?schema=public",
    );
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-characters-long");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("TXLINE_GUEST_JWT", "");
    vi.stubEnv("TXLINE_API_TOKEN", "");
    vi.stubEnv("SENDBYTE_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");

    const { resetServerEnvCache, serverEnv, hasEmailDelivery } = await import(
      "@/lib/env/server"
    );
    resetServerEnvCache();
    const env = serverEnv();
    expect(env.DATABASE_URL).toContain("beat_the_market");
    expect(hasEmailDelivery(env)).toBe(false);
  });
});

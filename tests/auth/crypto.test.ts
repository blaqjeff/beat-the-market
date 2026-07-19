import { describe, expect, it } from "vitest";

import { hashToken, randomToken, usernameFromEmail } from "@/lib/auth/crypto";
import {
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from "@/lib/auth/user-profile";
import { AppError } from "@/lib/errors/app-error";

describe("auth crypto", () => {
  it("hashes tokens deterministically", () => {
    const token = randomToken();
    expect(hashToken(token)).toEqual(hashToken(token));
    expect(hashToken(token)).not.toEqual(hashToken(randomToken()));
  });

  it("builds usernames from email locals", () => {
    const username = usernameFromEmail("Fan.Name+tag@example.com");
    expect(username.startsWith("fannametag_")).toBe(true);
    expect(username.length).toBeLessThanOrEqual(24);
  });
});

describe("username validation", () => {
  it("accepts valid usernames", () => {
    expect(validateUsername("fan_123")).toBe("fan_123");
    expect(normalizeUsername(" Fan_123 ")).toBe("fan_123");
  });

  it("rejects invalid usernames", () => {
    expect(() => validateUsername("ab")).toThrow(AppError);
    expect(() => validateUsername("_starts_with_underscore")).toThrow(AppError);
    expect(() => validateUsername("has spaces")).toThrow(AppError);
  });

  it("validates display names", () => {
    expect(validateDisplayName("  Fan Name  ")).toBe("Fan Name");
    expect(validateDisplayName("")).toBeNull();
    expect(validateDisplayName(null)).toBeNull();
  });
});

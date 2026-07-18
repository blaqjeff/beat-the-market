import { describe, expect, it } from "vitest";

import { hashToken, randomToken, usernameFromEmail } from "@/lib/auth/crypto";

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

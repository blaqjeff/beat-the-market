import { beforeEach, describe, expect, it, vi } from "vitest";

const sendTransactionalEmail = vi.hoisted(() => vi.fn());
const hasEmailDelivery = vi.hoisted(() => vi.fn());
const serverEnv = vi.hoisted(() =>
  vi.fn(() => ({
    NODE_ENV: "development" as "development" | "test" | "production",
    APP_URL: "http://localhost:3000",
  }))
);

vi.mock("@/lib/email/sendbyte", () => ({
  sendTransactionalEmail,
}));

vi.mock("@/lib/env/server", () => ({
  hasEmailDelivery,
  serverEnv,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: () => ({
    emailMagicLink: {
      create: vi.fn(async () => ({
        id: "magic-link-1",
        email: "fan@example.com",
      })),
    },
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  signEmailLinkToken: vi.fn(async () => "signed-token"),
  createSession: vi.fn(),
  verifyEmailLinkToken: vi.fn(),
}));

vi.mock("@/lib/logging/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

import { requestEmailSignIn } from "@/lib/auth/email";
import { AppError } from "@/lib/errors/app-error";

describe("requestEmailSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverEnv.mockReturnValue({
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
    });
  });

  it("falls back to a local magic link when SendByte fails in development", async () => {
    hasEmailDelivery.mockReturnValue(true);
    sendTransactionalEmail.mockRejectedValue(
      new AppError("upstream", "Failed to send email via SendByte")
    );

    const result = await requestEmailSignIn("fan@example.com");

    expect(result.delivered).toBe(false);
    expect(result).toMatchObject({
      deliveryError: expect.stringContaining("Email provider failed"),
      devVerifyUrl: expect.stringContaining("/api/auth/email/verify"),
    });
  });

  it("still surfaces provider failures in production", async () => {
    hasEmailDelivery.mockReturnValue(true);
    serverEnv.mockReturnValue({
      NODE_ENV: "production",
      APP_URL: "https://example.com",
    });
    sendTransactionalEmail.mockRejectedValue(
      new AppError("upstream", "Failed to send email via SendByte")
    );

    await expect(requestEmailSignIn("fan@example.com")).rejects.toBeInstanceOf(
      AppError
    );
  });
});

import "server-only";

import { hashToken, randomToken, usernameFromEmail } from "@/lib/auth/crypto";
import {
  createSession,
  signEmailLinkToken,
  verifyEmailLinkToken,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/email/sendbyte";
import { hasEmailDelivery, serverEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";
import { logInfo, logWarn } from "@/lib/logging/logger";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function requestEmailSignIn(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("validation", "Enter a valid email address");
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const magicLink = await prisma().emailMagicLink.create({
    data: {
      email,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const signed = await signEmailLinkToken(email, magicLink.id);
  const verifyUrl = new URL("/api/auth/email/verify", serverEnv().APP_URL);
  verifyUrl.searchParams.set("token", signed);
  verifyUrl.searchParams.set("code", token);
  const link = verifyUrl.toString();

  if (hasEmailDelivery()) {
    // Keep anchor text as a CTA (not a raw URL). SendByte flags
    // link_text_mismatch when long query-string URLs are used as both href and
    // visible text, and & in query strings is unsafe inside HTML attributes.
    const href = link.replace(/&/g, "&amp;");
    await sendTransactionalEmail({
      to: email,
      subject: "Your Beat the Market sign-in link",
      text: [
        "Sign in to Beat the Market with this one-time link:",
        "",
        link,
        "",
        "This link expires in 15 minutes. If you did not request it, ignore this email.",
      ].join("\n"),
      html: [
        "<p>Sign in to Beat the Market with this one-time link:</p>",
        `<p><a href="${href}">Sign in to Beat the Market</a></p>`,
        "<p>This link expires in 15 minutes. If you did not request it, ignore this email.</p>",
      ].join(""),
      tags: ["auth", "magic-link"],
      idempotencyKey: `magic-link:${magicLink.id}`,
    });
    logInfo("auth.email.sent", { email, provider: "sendbyte" });
    return { delivered: true as const };
  }

  // Dev-only escape hatch when no email provider key is configured at all.
  if (serverEnv().NODE_ENV === "production") {
    throw new AppError("internal", "Email delivery is not configured");
  }

  logWarn("auth.email.dev_link", { email, verifyUrl: link });
  return {
    delivered: false as const,
    devVerifyUrl: link,
  };
}

export async function verifyEmailSignIn(signedToken: string, code: string) {
  const { email, magicLinkId } = await verifyEmailLinkToken(signedToken);

  const magicLink = await prisma().emailMagicLink.findUnique({
    where: { id: magicLinkId },
  });

  if (
    !magicLink ||
    magicLink.email !== email ||
    magicLink.tokenHash !== hashToken(code) ||
    magicLink.consumedAt ||
    magicLink.expiresAt.getTime() <= Date.now()
  ) {
    throw new AppError("unauthorized", "Sign-in link is invalid or expired");
  }

  const user = await prisma().$transaction(async (tx) => {
    await tx.emailMagicLink.update({
      where: { id: magicLink.id },
      data: { consumedAt: new Date() },
    });

    const identity = await tx.authIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "email",
          providerAccountId: email,
        },
      },
      include: { user: true },
    });

    if (identity) {
      return identity.user;
    }

    const existingByEmail = await tx.user.findUnique({ where: { email } });
    if (existingByEmail) {
      await tx.authIdentity.create({
        data: {
          userId: existingByEmail.id,
          provider: "email",
          providerAccountId: email,
        },
      });
      return existingByEmail;
    }

    return tx.user.create({
      data: {
        email,
        username: usernameFromEmail(email),
        displayName: email.split("@")[0],
        identities: {
          create: {
            provider: "email",
            providerAccountId: email,
          },
        },
      },
    });
  });

  await createSession(user.id);
  logInfo("auth.email.verified", { userId: user.id });
  return user;
}

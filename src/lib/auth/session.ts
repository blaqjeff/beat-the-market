import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/db/prisma";
import { hashToken, randomToken } from "@/lib/auth/crypto";
import { serverEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";

export const SESSION_COOKIE = "btm_session";
const SESSION_DAYS = 14;

function secretKey() {
  return new TextEncoder().encode(serverEnv().AUTH_SECRET);
}

export async function createSession(userId: string) {
  const token = randomToken(48);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma().session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(expiresAt),
  );

  return { token, expiresAt };
}

function sessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: serverEnv().NODE_ENV === "production",
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma().session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }
  // Must match set() attributes (path/sameSite/secure) or the browser keeps the cookie.
  cookieStore.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma().session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma().session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("unauthorized", "Sign in required");
  }
  return user;
}

export async function signEmailLinkToken(email: string, magicLinkId: string) {
  return new SignJWT({ email, magicLinkId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secretKey());
}

export async function verifyEmailLinkToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  const email = typeof payload.email === "string" ? payload.email : null;
  const magicLinkId =
    typeof payload.magicLinkId === "string" ? payload.magicLinkId : null;
  if (!email || !magicLinkId) {
    throw new AppError("validation", "Invalid email sign-in token");
  }
  return { email, magicLinkId };
}

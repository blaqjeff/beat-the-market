import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{2,23}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: string): string {
  const normalized = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new AppError(
      "validation",
      "Username must be 3–24 characters: lowercase letters, numbers, and underscores"
    );
  }
  return normalized;
}

export function validateDisplayName(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 50) {
    throw new AppError("validation", "Display name must be 50 characters or fewer");
  }
  return trimmed;
}

export async function getUserIdentities(userId: string) {
  const identities = await prisma().authIdentity.findMany({
    where: { userId },
    select: { provider: true, providerAccountId: true },
  });

  return {
    email:
      identities.find((identity) => identity.provider === "email")
        ?.providerAccountId ?? null,
    wallet:
      identities.find((identity) => identity.provider === "solana")
        ?.providerAccountId ?? null,
  };
}

export async function updateUserProfile(
  userId: string,
  input: { username?: string; displayName?: string | null }
) {
  const data: { username?: string; displayName?: string | null } = {};

  if (input.username !== undefined) {
    data.username = validateUsername(input.username);
    const taken = await prisma().user.findUnique({
      where: { username: data.username },
      select: { id: true },
    });
    if (taken && taken.id !== userId) {
      throw new AppError("conflict", "That username is already taken");
    }
  }

  if (input.displayName !== undefined) {
    data.displayName = validateDisplayName(input.displayName);
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("validation", "Nothing to update");
  }

  return prisma().user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
    },
  });
}

import { createHash, randomBytes } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0]?.toLowerCase() ?? "fan";
  const cleaned = local.replace(/[^a-z0-9_]/g, "").slice(0, 18) || "fan";
  const suffix = randomBytes(2).toString("hex");
  return `${cleaned}_${suffix}`;
}

export function usernameFromWallet(publicKey: string): string {
  const suffix = publicKey.slice(-6).toLowerCase();
  return `wallet_${suffix}`;
}

import "server-only";

import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

import { randomToken, usernameFromWallet } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { logInfo } from "@/lib/logging/logger";

function challengeMessage(publicKey: string, nonce: string) {
  return [
    "Beat the Market wants you to sign in.",
    "",
    `Wallet: ${publicKey}`,
    `Nonce: ${nonce}`,
    "",
    "This request will not trigger a blockchain transaction or cost any fee.",
  ].join("\n");
}

export async function createWalletChallenge(rawPublicKey: string) {
  let publicKey: string;
  try {
    publicKey = new PublicKey(rawPublicKey).toBase58();
  } catch {
    throw new AppError("validation", "Invalid Solana wallet address");
  }

  const nonce = randomToken(24);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma().walletChallenge.create({
    data: {
      publicKey,
      nonce,
      expiresAt,
    },
  });

  return {
    publicKey,
    nonce,
    message: challengeMessage(publicKey, nonce),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyWalletSignIn(
  rawPublicKey: string,
  nonce: string,
  signatureBase58: string
) {
  let publicKey: string;
  try {
    publicKey = new PublicKey(rawPublicKey).toBase58();
  } catch {
    throw new AppError("validation", "Invalid Solana wallet address");
  }

  const challenge = await prisma().walletChallenge.findUnique({
    where: { nonce },
  });

  if (
    !challenge ||
    challenge.publicKey !== publicKey ||
    challenge.consumedAt ||
    challenge.expiresAt.getTime() <= Date.now()
  ) {
    throw new AppError("unauthorized", "Wallet challenge is invalid or expired");
  }

  const message = new TextEncoder().encode(
    challengeMessage(publicKey, nonce)
  );

  let signature: Uint8Array;
  try {
    signature = bs58.decode(signatureBase58);
  } catch {
    throw new AppError("validation", "Invalid wallet signature encoding");
  }

  const verified = nacl.sign.detached.verify(
    message,
    signature,
    new PublicKey(publicKey).toBytes()
  );

  if (!verified) {
    throw new AppError("unauthorized", "Wallet signature verification failed");
  }

  const user = await prisma().$transaction(async (tx) => {
    await tx.walletChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    const identity = await tx.authIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "solana",
          providerAccountId: publicKey,
        },
      },
      include: { user: true },
    });

    if (identity) {
      return identity.user;
    }

    return tx.user.create({
      data: {
        username: usernameFromWallet(publicKey),
        displayName: `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`,
        identities: {
          create: {
            provider: "solana",
            providerAccountId: publicKey,
          },
        },
      },
    });
  });

  await createSession(user.id);
  logInfo("auth.wallet.verified", { userId: user.id, publicKey });
  return user;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import bs58 from "bs58";

interface SolanaProvider {
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(
    message: Uint8Array,
    display?: string
  ): Promise<{ signature: Uint8Array } | Uint8Array>;
}

function walletProvider(): SolanaProvider {
  const browser = window as unknown as {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
  };
  const wallet = browser.phantom?.solana ?? browser.solana;
  if (!wallet) {
    throw new Error("Install Phantom or another Solana wallet to continue");
  }
  return wallet;
}

export function LoginPanel({
  initialError,
}: {
  initialError?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState<"email" | "wallet" | null>(null);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    setError(null);
    setMessage(null);
    setDevLink(null);
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        delivered?: boolean;
        devVerifyUrl?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to send sign-in email");
      }
      if (payload.devVerifyUrl) {
        setDevLink(payload.devVerifyUrl);
        setMessage("Dev mode: email provider not configured. Use the link below.");
      } else {
        setMessage("Check your email for a sign-in link.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed");
    } finally {
      setBusy(null);
    }
  }

  async function connectWallet() {
    setBusy("wallet");
    setError(null);
    setMessage(null);
    try {
      const wallet = walletProvider();
      const connected = await wallet.connect();
      const publicKey = connected.publicKey.toBase58();

      const challengeResponse = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey }),
      });
      const challenge = (await challengeResponse.json()) as {
        message?: string;
        nonce?: string;
        error?: { message?: string };
      };
      if (!challengeResponse.ok || !challenge.message || !challenge.nonce) {
        throw new Error(challenge.error?.message ?? "Wallet challenge failed");
      }

      const signed = await wallet.signMessage(
        new TextEncoder().encode(challenge.message),
        "utf8"
      );
      const signatureBytes =
        signed instanceof Uint8Array ? signed : signed.signature;

      const verifyResponse = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey,
          nonce: challenge.nonce,
          signature: bs58.encode(signatureBytes),
        }),
      });
      const verified = (await verifyResponse.json()) as {
        error?: { message?: string };
      };
      if (!verifyResponse.ok) {
        throw new Error(verified.error?.message ?? "Wallet verification failed");
      }

      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet sign-in failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submitEmail} className="space-y-4">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Email magic link
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-[color:var(--chalk)] outline-none ring-[color:var(--signal)] placeholder:text-[color:var(--muted)] focus:ring-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy !== null}
          className="w-full rounded-xl bg-[color:var(--signal)] px-5 py-3 font-semibold text-[color:var(--ink)] transition hover:brightness-110 disabled:opacity-60"
        >
          {busy === "email" ? "Sending link..." : "Email me a sign-in link"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
        <div className="h-px flex-1 bg-[color:var(--line)]" />
        or
        <div className="h-px flex-1 bg-[color:var(--line)]" />
      </div>

      <button
        type="button"
        disabled={busy !== null}
        onClick={connectWallet}
        className="w-full rounded-xl border border-[color:var(--line)] px-5 py-3 font-semibold text-[color:var(--chalk)] transition hover:border-[color:var(--signal)] disabled:opacity-60"
      >
        {busy === "wallet" ? "Confirm in wallet..." : "Continue with Phantom"}
      </button>

      {message && (
        <p className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3 text-sm text-[color:var(--chalk)]">
          {message}
        </p>
      )}
      {devLink && (
        <a
          href={devLink}
          className="block break-all text-sm text-[color:var(--signal)] underline"
        >
          {devLink}
        </a>
      )}
      {error && (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}

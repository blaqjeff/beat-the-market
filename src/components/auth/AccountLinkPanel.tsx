"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import bs58 from "bs58";

import {
  truncateWallet,
  walletProvider,
} from "@/lib/auth/wallet-client";

export function AccountLinkPanel({
  linkedEmail,
  linkedWallet,
}: {
  linkedEmail: string | null;
  linkedWallet: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(linkedEmail ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "wallet" | null>(null);

  async function linkEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    setError(null);
    setMessage(null);
    setDevLink(null);
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, link: true }),
      });
      const payload = (await response.json()) as {
        delivered?: boolean;
        devVerifyUrl?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to send link email");
      }
      if (payload.devVerifyUrl) {
        setDevLink(payload.devVerifyUrl);
        setMessage(
          "No email provider configured. Set SENDBYTE_API_KEY, or use the local link below."
        );
      } else {
        setMessage("Check your inbox to confirm this email address.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Email link failed");
    } finally {
      setBusy(null);
    }
  }

  async function linkWallet() {
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
          link: true,
        }),
      });
      const verified = (await verifyResponse.json()) as {
        error?: { message?: string };
        linked?: boolean;
      };
      if (!verifyResponse.ok) {
        throw new Error(verified.error?.message ?? "Wallet verification failed");
      }

      setMessage(
        verified.linked
          ? "Wallet linked to your account."
          : "Wallet connected."
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet link failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 p-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          Email
        </p>
        {linkedEmail ? (
          <p className="mt-2 text-[color:var(--chalk)]">{linkedEmail}</p>
        ) : (
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            No email linked yet.
          </p>
        )}
      </div>

      {!linkedEmail ? (
        <form onSubmit={linkEmail} className="space-y-3">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Link email
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
            className="rounded-xl border border-[color:var(--line)] px-5 py-2.5 text-sm font-semibold text-[color:var(--chalk)] transition hover:border-[color:var(--signal)] disabled:opacity-60"
          >
            {busy === "email" ? "Sending link..." : "Send magic link"}
          </button>
        </form>
      ) : null}

      <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 p-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          Wallet
        </p>
        {linkedWallet ? (
          <p className="mt-2 font-mono text-sm text-[color:var(--chalk)]">
            {truncateWallet(linkedWallet)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            No wallet linked yet.
          </p>
        )}
      </div>

      {!linkedWallet ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={linkWallet}
          className="rounded-xl border border-[color:var(--line)] px-5 py-2.5 text-sm font-semibold text-[color:var(--chalk)] transition hover:border-[color:var(--signal)] disabled:opacity-60"
        >
          {busy === "wallet" ? "Confirm in wallet..." : "Link Phantom wallet"}
        </button>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3 text-sm text-[color:var(--chalk)]">
          {message}
        </p>
      ) : null}
      {devLink ? (
        <a
          href={devLink}
          className="block break-all text-sm text-[color:var(--signal)] underline"
        >
          {devLink}
        </a>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

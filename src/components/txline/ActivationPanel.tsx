"use client";

import { Transaction } from "@solana/web3.js";
import { useEffect, useState } from "react";

interface SolanaProvider {
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction(
    transaction: Transaction
  ): Promise<{ signature: string }>;
  signMessage(
    message: Uint8Array,
    encoding?: string
  ): Promise<{ signature: Uint8Array } | Uint8Array>;
}

interface SubscriptionPlan {
  transactionBase64: string;
  serviceLevelId: number;
  weeks: number;
  userBalanceLamports: number;
  estimatedFeeLamports: number;
  estimatedRentLamports: number;
  estimatedTotalLamports: number;
  createsTokenAccount: boolean;
  simulationError: unknown | null;
  network: string;
  programId: string;
}

type Step =
  | "idle"
  | "connecting"
  | "simulating"
  | "ready"
  | "sending"
  | "activating"
  | "complete";

const PENDING_TRANSACTION_KEY = "txline.pendingSubscriptionTransaction";

function provider(): SolanaProvider {
  const browser = window as unknown as {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
  };
  const wallet = browser.phantom?.solana ?? browser.solana;
  if (!wallet) {
    throw new Error("Phantom or another compatible Solana wallet is required");
  }
  return wallet;
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function sol(lamports: number): string {
  return `${(lamports / 1_000_000_000).toFixed(6)} SOL`;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`);
  }
  return payload;
}

export function ActivationPanel() {
  const [step, setStep] = useState<Step>("idle");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);
  const [resumeSignature, setResumeSignature] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const response = await fetch("/api/txline/status");
        if (response.ok) {
          const status = (await response.json()) as { activated?: boolean };
          if (!cancelled && status.activated) {
            localStorage.removeItem(PENDING_TRANSACTION_KEY);
            setError(null);
            setStep("complete");
            return;
          }
        }
      } catch {
        // Fall through to local pending-transaction resume.
      }

      if (cancelled) return;
      const pending = localStorage.getItem(PENDING_TRANSACTION_KEY);
      if (pending) setTransactionSignature(pending);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchPlan(walletPublicKey: string) {
    return postJson<SubscriptionPlan>("/api/txline/plan", {
      publicKey: walletPublicKey,
    });
  }

  async function connectAndSimulate() {
    setError(null);
    setStep("connecting");
    try {
      const wallet = provider();
      const connected = await wallet.connect();
      const address = connected.publicKey.toString();
      setPublicKey(address);
      setStep("simulating");

      const nextPlan = await fetchPlan(address);
      setPlan(nextPlan);
      setStep("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed");
      setStep("idle");
    }
  }

  async function subscribeAndActivate() {
    if (!publicKey || !plan) return;
    setError(null);
    setStep("simulating");

    try {
      const wallet = provider();
      const freshPlan = await fetchPlan(publicKey);
      setPlan(freshPlan);

      if (freshPlan.simulationError) {
        throw new Error(
          `Subscription simulation failed: ${JSON.stringify(freshPlan.simulationError)}`
        );
      }
      if (
        freshPlan.userBalanceLamports < freshPlan.estimatedTotalLamports
      ) {
        throw new Error("Wallet balance is below the simulated requirement");
      }

      setStep("sending");
      const transaction = Transaction.from(
        fromBase64(freshPlan.transactionBase64)
      );
      const { signature: txSig } =
        await wallet.signAndSendTransaction(transaction);
      setTransactionSignature(txSig);
      localStorage.setItem(PENDING_TRANSACTION_KEY, txSig);
      await activateTransaction(txSig);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Subscription failed"
      );
      setStep("ready");
    }
  }

  async function activateTransaction(txSig: string) {
    setStep("activating");
    const wallet = provider();
    await wallet.connect();
    const { token: jwt } = await postJson<{ token: string }>(
      "/api/txline/guest"
    );
    const activationMessage = new TextEncoder().encode(`${txSig}::${jwt}`);
    const signed = await wallet.signMessage(activationMessage, "utf8");
    const signatureBytes =
      signed instanceof Uint8Array ? signed : signed.signature;

    await postJson("/api/txline/activate", {
      txSig,
      jwt,
      walletSignature: toBase64(signatureBytes),
    });

    localStorage.removeItem(PENDING_TRANSACTION_KEY);
    setStep("complete");
  }

  async function retryActivation() {
    if (!transactionSignature) return;
    setError(null);
    try {
      await activateTransaction(transactionSignature);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Activation failed");
      setStep("ready");
    }
  }

  async function resumeProvidedTransaction() {
    const txSig = resumeSignature.trim();
    if (txSig.length < 64) {
      setError("Enter a valid Solana transaction signature");
      return;
    }

    setTransactionSignature(txSig);
    localStorage.setItem(PENDING_TRANSACTION_KEY, txSig);
    setError(null);
    try {
      await activateTransaction(txSig);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Activation failed");
      setStep("ready");
    }
  }

  function startNewSubscription() {
    localStorage.removeItem(PENDING_TRANSACTION_KEY);
    setTransactionSignature(null);
    setResumeSignature("");
    setPublicKey(null);
    setPlan(null);
    setError(null);
    setStep("idle");
  }

  const simulationPassed = plan && plan.simulationError === null;
  const hasEnoughBalance =
    plan && plan.userBalanceLamports >= plan.estimatedTotalLamports;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/30">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">
          Mainnet setup
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Activate TxLINE real-time access
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-zinc-400">
          Subscribe to the free World Cup service level 12. The app simulates
          the transaction and shows the estimated SOL impact before Phantom asks
          for approval.
        </p>
      </div>

      {publicKey && (
        <div className="mb-5 rounded-xl bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Connected wallet
          </p>
          <p className="mt-1 break-all font-mono text-sm text-zinc-200">
            {publicKey}
          </p>
        </div>
      )}

      {plan && (
        <dl className="mb-6 grid gap-3 sm:grid-cols-2">
          <Metric label="Network" value={plan.network} />
          <Metric
            label="Service"
            value={`Level ${plan.serviceLevelId}, ${plan.weeks} weeks`}
          />
          <Metric
            label="Wallet balance"
            value={sol(plan.userBalanceLamports)}
          />
          <Metric
            label="Estimated network fee"
            value={sol(plan.estimatedFeeLamports)}
          />
          <Metric
            label="Estimated account rent"
            value={sol(plan.estimatedRentLamports)}
          />
          <Metric
            label="Estimated total"
            value={sol(plan.estimatedTotalLamports)}
          />
        </dl>
      )}

      {plan?.createsTokenAccount && (
        <p className="mb-4 text-sm text-amber-300">
          The transaction will create your TxL Token-2022 account. Its rent is
          included in the estimate.
        </p>
      )}
      {plan && !simulationPassed && (
        <p className="mb-4 text-sm text-red-300">
          Simulation failed: {JSON.stringify(plan.simulationError)}
        </p>
      )}
      {plan && simulationPassed && !hasEnoughBalance && (
        <p className="mb-4 text-sm text-red-300">
          This wallet does not have enough SOL for the simulated transaction.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {step === "complete" ? (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
          <p className="font-medium text-emerald-300">TxLINE access activated</p>
          <p className="mt-1 text-sm text-zinc-400">
            Credentials were saved to the local server environment. Restart the
            development server before capturing feed payloads.
          </p>
          {transactionSignature && (
            <a
              className="mt-3 inline-block text-sm text-emerald-400 underline"
              href={`https://explorer.solana.com/tx/${transactionSignature}`}
              target="_blank"
              rel="noreferrer"
            >
              View subscription transaction
            </a>
          )}
        </div>
      ) : transactionSignature ? (
        <div className="space-y-2">
          <button
            className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={step === "activating"}
            onClick={retryActivation}
          >
            {step === "activating"
              ? "Activating API access..."
              : "Resume API activation"}
          </button>
          <button
            className="w-full rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 disabled:opacity-50"
            disabled={step === "activating"}
            onClick={startNewSubscription}
          >
            Start a new subscription transaction
          </button>
        </div>
      ) : !plan ? (
        <button
          className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={step !== "idle"}
          onClick={connectAndSimulate}
        >
          {step === "connecting"
            ? "Connecting wallet..."
            : step === "simulating"
              ? "Simulating..."
              : "Connect Phantom and simulate"}
        </button>
      ) : (
        <button
          className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            step !== "ready" || !simulationPassed || !hasEnoughBalance
          }
          onClick={subscribeAndActivate}
        >
          {step === "simulating"
            ? "Refreshing simulation..."
            : step === "sending"
              ? "Confirm in Phantom..."
              : step === "activating"
                ? "Activating API access..."
                : "Subscribe and activate"}
        </button>
      )}

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        This local-only setup page never requests or stores your wallet private
        key. Phantom signs the Solana transaction and activation message.
      </p>

      {step !== "complete" && !transactionSignature && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <label
            className="text-sm font-medium text-zinc-300"
            htmlFor="existing-subscription"
          >
            Already sent the subscription transaction?
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="existing-subscription"
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
              placeholder="Transaction signature"
              value={resumeSignature}
              onChange={(event) => setResumeSignature(event.target.value)}
            />
            <button
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:opacity-50"
              disabled={!resumeSignature.trim() || step === "activating"}
              onClick={resumeProvidedTransaction}
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-3">
      <dt className="text-xs uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-zinc-100">{value}</dd>
    </div>
  );
}

import Link from "next/link";

import { getReceipt } from "@/lib/game/leaderboard";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const receipt = await getReceipt(callId);

  if (!receipt) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
          Settlement receipt
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
          Receipt not found
        </h1>
        <p className="mt-4 text-[color:var(--muted)]">
          Call {callId} has no settlement receipt yet.
        </p>
      </main>
    );
  }

  const multiplier = (receipt.multiplierMilli / 1000).toFixed(2);
  const probability = (receipt.probabilityBps / 100).toFixed(2);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Settlement receipt
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        {receipt.fixture.homeParticipant.name} vs{" "}
        {receipt.fixture.awayParticipant.name}
      </h1>
      <p className="mt-4 text-[color:var(--muted)]">{receipt.narrative}</p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--line)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Result
          </p>
          <p className="mt-2 text-2xl text-[color:var(--chalk)]">
            {receipt.result} · {receipt.pointsAwarded} pts
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Final {receipt.finalHomeScore}-{receipt.finalAwayScore}
          </p>
        </div>
        <div className="rounded-2xl border border-[color:var(--line)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Frozen quote
          </p>
          <p className="mt-2 text-2xl text-[color:var(--chalk)]">
            {probability}% · {multiplier}x
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {receipt.credits} credits · potential {receipt.potentialPoints}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[color:var(--line)] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Market
        </p>
        <p className="mt-2 text-[color:var(--chalk)]">
          {receipt.marketType}
          {receipt.marketParameters ? ` · ${receipt.marketParameters}` : ""}
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Call {receipt.outcomeKey}
          {receipt.winningOutcomeKey
            ? ` · settled ${receipt.winningOutcomeKey}`
            : " · void"}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-[color:var(--line)] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          TxLINE / Solana proof
        </p>
        {receipt.proof ? (
          <div className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
            <p>
              Status{" "}
              <span className="text-[color:var(--signal)]">
                {receipt.proof.verifyStatus}
              </span>
            </p>
            <p>{receipt.proof.verifyDetail}</p>
            <p className="break-all font-mono text-[11px]">
              Program {receipt.proof.solanaProgramId}
            </p>
            <p className="break-all font-mono text-[11px]">
              Daily scores PDA {receipt.proof.dailyScoresPda}
            </p>
            <p className="font-mono text-[11px]">
              Epoch day {receipt.proof.epochDay} · seq {receipt.proof.sequence} ·{" "}
              {receipt.proof.network}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            No validation proof attached to this receipt.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-[color:var(--line)] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Immutable inputs
        </p>
        <pre className="mt-3 overflow-x-auto text-xs text-[color:var(--muted)]">
          {JSON.stringify(receipt.inputsJson, null, 2)}
        </pre>
      </section>

      <p className="mt-8 text-sm text-[color:var(--muted)]">
        <Link
          href={`/matches/${receipt.fixture.sourceFixtureId}`}
          className="text-[color:var(--signal)] underline"
        >
          Back to match
        </Link>
        {" · "}
        <Link href="/leaderboard" className="text-[color:var(--signal)] underline">
          Leaderboard
        </Link>
      </p>
    </main>
  );
}

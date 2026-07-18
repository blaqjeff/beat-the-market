import Link from "next/link";

import { ShareButton } from "@/components/competition/ShareButton";
import { isRemarkableCall } from "@/lib/game/competition-stats";
import { getReceipt } from "@/lib/game/leaderboard";
import { marketLabel, outcomeLabel } from "@/lib/game/labels";
import { serverEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

function proofStatusLabel(status: string) {
  if (status === "pda_found") return "Verified on Solana";
  if (status === "structure_ok") return "Proof attached";
  if (status === "fetched") return "Proof fetched";
  if (status === "failed") return "Proof failed";
  return "Pending";
}

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
          This call has not been settled yet.
        </p>
      </main>
    );
  }

  const home = receipt.fixture.homeParticipant.name;
  const away = receipt.fixture.awayParticipant.name;
  const multiplier = (receipt.multiplierMilli / 1000).toFixed(2);
  const probability = (receipt.probabilityBps / 100).toFixed(1);
  const callSide = outcomeLabel(receipt.outcomeKey, home, away);
  const winnerSide = receipt.winningOutcomeKey
    ? outcomeLabel(receipt.winningOutcomeKey, home, away)
    : null;
  const remarkable = isRemarkableCall({
    result: receipt.result,
    probabilityBps: receipt.probabilityBps,
    multiplierMilli: receipt.multiplierMilli,
    pointsAwarded: receipt.pointsAwarded,
  });
  const appUrl = serverEnv().APP_URL.replace(/\/$/, "");
  const shareUrl = `${appUrl}/share/calls/${receipt.callId}`;
  const resultLabel =
    receipt.result === "won"
      ? "Won"
      : receipt.result === "lost"
        ? "Lost"
        : "Void";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Settlement receipt
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        {home} vs {away}
      </h1>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl tabular-nums tracking-wide text-[color:var(--chalk)]">
        {receipt.finalHomeScore}–{receipt.finalAwayScore}
      </p>
      <p className="mt-4 text-[color:var(--muted)]">
        Called <span className="text-[color:var(--chalk)]">{callSide}</span> on{" "}
        {marketLabel(receipt.marketType, receipt.marketParameters)}
        {winnerSide ? ` · market settled ${winnerSide}` : ""}.
      </p>

      <section className="mt-8 flex flex-wrap gap-2">
        <div className="min-w-[9.5rem] flex-1 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Result
          </p>
          <p className="mt-1 text-2xl text-[color:var(--chalk)]">{resultLabel}</p>
          <p className="mt-1 text-sm tabular-nums text-[color:var(--muted)]">
            {receipt.pointsAwarded} pts
          </p>
        </div>
        <div className="min-w-[9.5rem] flex-1 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Your price
          </p>
          <p className="mt-1 text-2xl tabular-nums text-[color:var(--chalk)]">
            {probability}%
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {multiplier}x · {receipt.credits} credits
          </p>
        </div>
        <div className="min-w-[9.5rem] flex-1 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Proof
          </p>
          <p className="mt-1 text-lg text-[color:var(--chalk)]">
            {receipt.proof
              ? proofStatusLabel(receipt.proof.verifyStatus)
              : "Pending"}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Details below
          </p>
        </div>
      </section>

      {remarkable && (
        <div className="mt-8">
          <ShareButton
            title="Beat the Market"
            text={`${receipt.user.displayName ?? receipt.user.username} banked ${receipt.pointsAwarded} pts on Beat the Market.`}
            url={shareUrl}
          />
        </div>
      )}

      <details className="mt-10 rounded-2xl border border-[color:var(--line)] p-5">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Technical verification details
        </summary>
        <div className="mt-4 space-y-4 text-sm text-[color:var(--muted)]">
          <p>
            Your points were calculated from the price locked when you placed
            the call, then checked against a TxLINE final-score proof published
            to Solana.
          </p>
          {receipt.proof ? (
            <ul className="space-y-2">
              <li>
                Status:{" "}
                <span className="text-[color:var(--chalk)]">
                  {proofStatusLabel(receipt.proof.verifyStatus)}
                </span>
              </li>
              <li className="break-all font-mono text-[11px]">
                Solana program: {receipt.proof.solanaProgramId}
              </li>
              <li className="break-all font-mono text-[11px]">
                Daily scores account: {receipt.proof.dailyScoresPda}
              </li>
              <li className="font-mono text-[11px]">
                {receipt.proof.network} · epoch day {receipt.proof.epochDay} ·
                score sequence {receipt.proof.sequence}
              </li>
            </ul>
          ) : (
            <p>No score proof is attached to this receipt yet.</p>
          )}
          <details className="rounded-xl border border-dashed border-[color:var(--line)] p-4">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.16em]">
              Settlement inputs
            </summary>
            <pre className="mt-3 overflow-x-auto text-xs">
              {JSON.stringify(receipt.inputsJson, null, 2)}
            </pre>
          </details>
        </div>
      </details>

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
        {" · "}
        <Link
          href={`/profile/${receipt.user.username}`}
          className="text-[color:var(--signal)] underline"
        >
          Your profile
        </Link>
      </p>
    </main>
  );
}

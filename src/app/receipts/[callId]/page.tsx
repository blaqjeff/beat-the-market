import Link from "next/link";

import { ShareButton } from "@/components/competition/ShareButton";
import { isRemarkableCall } from "@/lib/game/competition-stats";
import { getReceipt } from "@/lib/game/leaderboard";
import { serverEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

function marketLabel(type: string, parameters: string | null) {
  if (type === "1X2_PARTICIPANT_RESULT") return "Match result";
  if (type === "OVERUNDER_PARTICIPANT_GOALS") {
    return `Total goals${parameters ? ` (${parameters.replace("line=", "")})` : ""}`;
  }
  return type;
}

function outcomeLabel(
  key: string,
  home: string,
  away: string
): string {
  if (key === "part1") return home;
  if (key === "part2") return away;
  if (key === "draw") return "Draw";
  if (key === "over") return "Over";
  if (key === "under") return "Under";
  return key;
}

function proofStatusLabel(status: string) {
  if (status === "pda_found") return "Verified against Solana";
  if (status === "structure_ok") return "Proof attached";
  if (status === "fetched") return "Proof fetched";
  if (status === "failed") return "Proof failed";
  return status;
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
      <p className="mt-4 text-lg text-[color:var(--muted)]">
        You called <span className="text-[color:var(--chalk)]">{callSide}</span>{" "}
        on {marketLabel(receipt.marketType, receipt.marketParameters)}. Final
        score {receipt.finalHomeScore}–{receipt.finalAwayScore}
        {winnerSide ? ` · settled ${winnerSide}` : ""}.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--line)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Result
          </p>
          <p className="mt-2 text-3xl text-[color:var(--chalk)]">{resultLabel}</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {receipt.pointsAwarded} points awarded
          </p>
        </div>
        <div className="rounded-2xl border border-[color:var(--line)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Your price
          </p>
          <p className="mt-2 text-3xl text-[color:var(--chalk)]">
            {probability}%
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {multiplier}x · {receipt.credits} credits
          </p>
        </div>
        <div className="rounded-2xl border border-[color:var(--line)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Verification
          </p>
          <p className="mt-2 text-xl text-[color:var(--chalk)]">
            {receipt.proof
              ? proofStatusLabel(receipt.proof.verifyStatus)
              : "No proof yet"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            TxLINE score proof · Solana
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
            This section is for hackathon judges / auditors. It shows that your
            points came from frozen call inputs plus a TxLINE validation proof
            anchored to Solana.
          </p>
          {receipt.proof ? (
            <ul className="space-y-2">
              <li>
                Status:{" "}
                <span className="text-[color:var(--chalk)]">
                  {receipt.proof.verifyStatus}
                </span>
              </li>
              <li>{receipt.proof.verifyDetail}</li>
              <li className="break-all font-mono text-[11px]">
                Program: {receipt.proof.solanaProgramId}
              </li>
              <li className="break-all font-mono text-[11px]">
                Daily scores PDA: {receipt.proof.dailyScoresPda}
              </li>
              <li className="font-mono text-[11px]">
                Epoch day {receipt.proof.epochDay} · seq {receipt.proof.sequence}{" "}
                · {receipt.proof.network}
              </li>
            </ul>
          ) : (
            <p>No validation proof was attached to this receipt.</p>
          )}
          <details className="rounded-xl border border-dashed border-[color:var(--line)] p-4">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.16em]">
              Raw settlement inputs
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

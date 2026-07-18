import type { Metadata } from "next";
import Link from "next/link";

import { CallPnlCard } from "@/components/competition/CallPnlCard";
import { getPublicShareCard } from "@/lib/game/leaderboard";
import { formatMultiplier, outcomeLabel } from "@/lib/game/labels";
import { serverEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ callId: string }>;
}): Promise<Metadata> {
  const { callId } = await params;
  const card = await getPublicShareCard(callId);
  if (!card) {
    return { title: "Call share · Beat the Market" };
  }
  const title = `${card.displayName} +${card.pointsAwarded} pts`;
  const description = `${card.match} · ${outcomeLabel(
    card.outcomeKey,
    card.home,
    card.away
  )} at ${(card.probabilityBps / 100).toFixed(1)}% · ${formatMultiplier(
    card.multiplierMilli
  )}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function ShareCallPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const card = await getPublicShareCard(callId);

  if (!card) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
          Share unavailable
        </h1>
        <p className="mt-4 text-[color:var(--muted)]">
          Share cards are available for winning settled calls and never expose
          private account data.
        </p>
        <p className="mt-6">
          <Link href="/" className="text-[color:var(--signal)] underline">
            Home
          </Link>
        </p>
      </main>
    );
  }

  const appUrl = serverEnv().APP_URL.replace(/\/$/, "");
  const shareUrl = `${appUrl}/share/calls/${card.callId}`;
  const probability = (card.probabilityBps / 100).toFixed(1);
  const multiplier = formatMultiplier(card.multiplierMilli);
  const callSide = outcomeLabel(card.outcomeKey, card.home, card.away);
  const shareText = `${card.displayName} called ${callSide} on ${card.match} at ${probability}% (${multiplier}) and banked +${card.pointsAwarded} pts on Beat the Market.`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-center font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        PnL card
      </p>
      <h1 className="mt-3 text-center font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        Download & share
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-[color:var(--muted)]">
        A meme-style result card for your win — export as PNG or share straight
        from your phone.
      </p>

      <div className="mt-8">
        <CallPnlCard card={card} shareUrl={shareUrl} shareText={shareText} />
      </div>

      <p className="mt-10 text-center text-sm text-[color:var(--muted)]">
        <Link
          href={`/receipts/${card.callId}`}
          className="text-[color:var(--signal)] underline"
        >
          View receipt
        </Link>
        {" · "}
        <Link href="/" className="text-[color:var(--signal)] underline">
          Home
        </Link>
      </p>
    </main>
  );
}

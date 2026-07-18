import type { Metadata } from "next";
import Link from "next/link";

import { ShareButton } from "@/components/competition/ShareButton";
import { getPublicShareCard } from "@/lib/game/leaderboard";
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
  const title = `${card.displayName} beat the market`;
  const description = `${card.match} · ${card.pointsAwarded} pts at ${(
    card.probabilityBps / 100
  ).toFixed(1)}% · ${(card.multiplierMilli / 1000).toFixed(2)}x`;
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
          Public share cards are limited to remarkable winning calls and never
          expose private account data.
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
  const multiplier = (card.multiplierMilli / 1000).toFixed(2);
  const shareText = `${card.displayName} took ${card.outcomeKey} on ${card.match} at ${probability}% (${multiplier}x) and banked ${card.pointsAwarded} pts on Beat the Market.`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Remarkable call
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        {card.displayName} beat the market
      </h1>
      <p className="mt-4 text-[color:var(--muted)]">{card.match}</p>

      <section className="mt-8 rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--panel)]/60 p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          @{card.username} · final {card.finalScore}
        </p>
        <p className="mt-4 font-[family-name:var(--font-display)] text-5xl tracking-wide text-[color:var(--chalk)]">
          {card.pointsAwarded} pts
        </p>
        <p className="mt-3 text-[color:var(--muted)]">
          {card.outcomeKey} · {probability}% · {multiplier}x
        </p>
        <p className="mt-6 text-sm text-[color:var(--muted)]">{card.narrative}</p>
        <div className="mt-8">
          <ShareButton
            title="Beat the Market"
            text={shareText}
            url={shareUrl}
          />
        </div>
      </section>

      <p className="mt-8 text-sm text-[color:var(--muted)]">
        <Link
          href={`/receipts/${card.callId}`}
          className="text-[color:var(--signal)] underline"
        >
          Full receipt
        </Link>
        {" · "}
        <Link
          href={`/profile/${card.username}`}
          className="text-[color:var(--signal)] underline"
        >
          Profile
        </Link>
      </p>
    </main>
  );
}

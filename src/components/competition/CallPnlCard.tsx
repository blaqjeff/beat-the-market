"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";

import { formatMultiplier, outcomeLabel } from "@/lib/game/labels";

export type CallPnlCardData = {
  callId: string;
  username: string;
  displayName: string;
  match: string;
  home: string;
  away: string;
  outcomeKey: string;
  credits: number;
  pointsAwarded: number;
  probabilityBps: number;
  multiplierMilli: number;
  finalScore: string;
  remarkable: boolean;
};

export function CallPnlCard({
  card,
  shareUrl,
  shareText,
}: {
  card: CallPnlCardData;
  shareUrl: string;
  shareText: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const callSide = outcomeLabel(card.outcomeKey, card.home, card.away);
  const probability = (card.probabilityBps / 100).toFixed(1);
  const multiplier = formatMultiplier(card.multiplierMilli);
  const roiPct =
    card.credits > 0
      ? Math.round((card.pointsAwarded / card.credits) * 100)
      : 0;

  async function renderPng() {
    if (!cardRef.current) throw new Error("Card not ready");
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#07140f",
    });
  }

  async function download() {
    setBusy("download");
    setMessage(null);
    try {
      const dataUrl = await renderPng();
      const link = document.createElement("a");
      link.download = `beat-the-market-${card.callId.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      setMessage("PNG downloaded");
    } catch {
      setMessage("Could not export card");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setBusy("share");
    setMessage(null);
    try {
      const dataUrl = await renderPng();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `beat-the-market-${card.callId.slice(0, 8)}.png`, {
        type: "image/png",
      });

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({
          title: "Beat the Market",
          text: shareText,
          files: [file],
        });
        setMessage("Shared");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setMessage("Link copied — download the PNG to post the card");
        return;
      }

      setMessage("Could not share");
    } catch {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
          setMessage("Link copied");
          return;
        }
      } catch {
        // fall through
      }
      setMessage("Could not share");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="relative w-full max-w-[420px] overflow-hidden rounded-[1.75rem] border border-[#1f3a2d] bg-[#07140f] text-left shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          style={{ aspectRatio: "4 / 5" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 55% at 15% -10%, rgba(200,241,53,0.22), transparent 55%), radial-gradient(ellipse 70% 45% at 95% 10%, rgba(47,125,88,0.28), transparent 50%), linear-gradient(180deg, #0d1f18 0%, #07140f 55%, #050c09 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative flex h-full flex-col p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8f135]">
                  Beat the Market
                </p>
                <p className="mt-2 text-sm text-[#8fa396]">@{card.username}</p>
              </div>
              {card.remarkable ? (
                <span className="rounded-full border border-[#c8f135]/40 bg-[#c8f135]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8f135]">
                  Upset
                </span>
              ) : (
                <span className="rounded-full border border-[#1f3a2d] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8fa396]">
                  Won
                </span>
              )}
            </div>

            <div className="mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8fa396]">
                Points locked
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-6xl leading-none tracking-wide text-[#c8f135] sm:text-7xl">
                +{card.pointsAwarded}
              </p>
              <p className="mt-2 font-mono text-sm uppercase tracking-[0.16em] text-[#f3f6f1]">
                PTS · {roiPct}% ROI
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[#1f3a2d] bg-[#0d1f18]/70 p-4">
              <p className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[#f3f6f1]">
                {card.match}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-[#8fa396]">
                Final {card.finalScore.replace("-", "–")}
              </p>
              <p className="mt-3 text-sm text-[#f3f6f1]">
                Called <span className="text-[#c8f135]">{callSide}</span>
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <PnlStat label="Stake" value={String(card.credits)} />
              <PnlStat label="Entry" value={`${probability}%`} />
              <PnlStat label="Return" value={multiplier} />
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 pt-8">
              <p className="max-w-[12rem] font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-[#8fa396]">
                TxLINE priced · confidence credits
              </p>
              <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[#f3f6f1]">
                BTM
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={download}
          className="rounded-xl bg-[color:var(--signal)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:brightness-110 disabled:opacity-50"
        >
          {busy === "download" ? "Exporting…" : "Download PNG"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={share}
          className="rounded-xl border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--chalk)] transition hover:border-[color:var(--signal)] disabled:opacity-50"
        >
          {busy === "share" ? "Sharing…" : "Share card"}
        </button>
      </div>
      {message ? (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function PnlStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#1f3a2d] bg-[#07140f]/80 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8fa396]">
        {label}
      </p>
      <p className="mt-1 text-sm tabular-nums text-[#f3f6f1]">{value}</p>
    </div>
  );
}

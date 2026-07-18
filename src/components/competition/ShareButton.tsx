"use client";

import { useState } from "react";

export function ShareButton({
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url: string;
}) {
  const [message, setMessage] = useState<string | null>(null);

  async function share() {
    setMessage(null);
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        setMessage("Shared");
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setMessage("Link copied");
        return;
      }
      setMessage("Could not share");
    } catch {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          setMessage("Link copied");
          return;
        }
      } catch {
        // fall through
      }
      setMessage("Could not share");
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={share}
        className="rounded-xl bg-[color:var(--signal)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:brightness-110"
      >
        Share
      </button>
      {message && (
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {message}
        </span>
      )}
    </div>
  );
}

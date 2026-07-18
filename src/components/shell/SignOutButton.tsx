"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
      router.push("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={signOut}
      className="rounded-full px-3 py-2 text-sm text-[color:var(--muted)] transition hover:bg-white/5 hover:text-[color:var(--chalk)] disabled:opacity-60"
    >
      {busy ? "…" : "Sign out"}
    </button>
  );
}

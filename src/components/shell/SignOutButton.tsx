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
      className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--chalk)] transition hover:border-[color:var(--signal)] disabled:opacity-60"
    >
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}

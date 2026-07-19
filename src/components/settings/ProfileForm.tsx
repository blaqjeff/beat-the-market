"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({
  initialUsername,
  initialDisplayName,
}: {
  initialUsername: string;
  initialDisplayName: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const payload: { username?: string; displayName?: string | null } = {};
    const trimmedDisplay = displayName.trim();
    if (username !== initialUsername) {
      payload.username = username;
    }
    const nextDisplayName = trimmedDisplay || null;
    if (nextDisplayName !== initialDisplayName) {
      payload.displayName = nextDisplayName;
    }

    if (Object.keys(payload).length === 0) {
      setMessage("No changes to save.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        user?: { username: string; displayName: string | null };
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(result.error?.message ?? "Unable to update profile");
      }

      setMessage("Profile updated.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Username
        </span>
        <input
          type="text"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
          pattern="[a-z0-9][a-z0-9_]{2,23}"
          maxLength={24}
          className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 font-mono text-[color:var(--chalk)] outline-none ring-[color:var(--signal)] placeholder:text-[color:var(--muted)] focus:ring-2"
        />
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">
          3–24 characters. Lowercase letters, numbers, and underscores. Your
          profile URL uses this handle.
        </p>
      </label>

      <label className="block">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Display name
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={50}
          placeholder="Optional"
          className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-[color:var(--chalk)] outline-none ring-[color:var(--signal)] placeholder:text-[color:var(--muted)] focus:ring-2"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-[color:var(--signal)] px-5 py-2.5 text-sm font-semibold text-[color:var(--ink)] transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Saving..." : "Save profile"}
      </button>

      {message ? (
        <p className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3 text-sm text-[color:var(--chalk)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </form>
  );
}

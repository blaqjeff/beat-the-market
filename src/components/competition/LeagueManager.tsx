"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface LeagueRow {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  ownerUsername: string;
  isOwner: boolean;
}

export function LeagueManager({ initialLeagues }: { initialLeagues: LeagueRow[] }) {
  const router = useRouter();
  const [leagues, setLeagues] = useState(initialLeagues);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createLeague() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        league?: { inviteCode: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Could not create league");
      }
      setName("");
      router.refresh();
      if (payload.league) {
        router.push(`/leagues/${payload.league.inviteCode}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        league?: LeagueRow & { inviteCode: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Could not join league");
      }
      setInviteCode("");
      router.refresh();
      if (payload.league) {
        setLeagues((prev) => {
          if (prev.some((row) => row.id === payload.league!.id)) return prev;
          return [
            {
              id: payload.league!.id,
              name: payload.league!.name,
              inviteCode: payload.league!.inviteCode,
              memberCount: 1,
              ownerUsername: "",
              isOwner: false,
            },
            ...prev,
          ];
        });
        router.push(`/leagues/${payload.league.inviteCode}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Join failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--line)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
            Create private league
          </h2>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Friends & family WC"
            className="mt-4 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)] px-4 py-3 text-[color:var(--chalk)] outline-none ring-[color:var(--signal)] focus:ring-2"
          />
          <button
            type="button"
            disabled={busy || name.trim().length < 2}
            onClick={createLeague}
            className="mt-4 rounded-xl bg-[color:var(--signal)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:opacity-50"
          >
            Create
          </button>
        </div>
        <div className="rounded-2xl border border-[color:var(--line)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
            Join with invite
          </h2>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="INVITE"
            className="mt-4 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)] px-4 py-3 font-mono uppercase tracking-[0.18em] text-[color:var(--chalk)] outline-none ring-[color:var(--signal)] focus:ring-2"
          />
          <button
            type="button"
            disabled={busy || inviteCode.trim().length < 4}
            onClick={join}
            className="mt-4 rounded-xl border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--chalk)] disabled:opacity-50"
          >
            Join
          </button>
        </div>
      </section>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)]">
          Your leagues
        </h2>
        {leagues.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            No leagues yet. Create one and share the invite code.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {leagues.map((league) => (
              <li key={league.id}>
                <a
                  href={`/leagues/${league.inviteCode}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] px-5 py-4 transition hover:border-[color:var(--signal)]"
                >
                  <div>
                    <p className="text-[color:var(--chalk)]">{league.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {league.inviteCode} · {league.memberCount} members
                      {league.isOwner ? " · owner" : ""}
                    </p>
                  </div>
                  <span className="text-sm text-[color:var(--signal)]">Open</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";

import { LeagueManager } from "@/components/competition/LeagueManager";
import { getCurrentUser } from "@/lib/auth/session";
import { listUserLeagues } from "@/lib/game/leagues";

export const dynamic = "force-dynamic";

export default async function LeaguesPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="mx-auto max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--panel)]/60 px-6 py-12 text-center sm:px-10">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
            Private leagues
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
            Compete with friends
          </h1>
          <p className="mt-4 text-[color:var(--muted)]">
            Create an invite-only board ranked the same way as the global
            leaderboard.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-xl bg-[color:var(--signal)] px-5 py-3 font-semibold text-[color:var(--ink)] transition hover:brightness-110"
          >
            Sign in to continue
          </Link>
        </section>
      </main>
    );
  }

  const leagues = await listUserLeagues(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Private leagues
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        Your circles
      </h1>
      <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
        Invite-only boards. Share a code — member emails stay private.
      </p>
      <div className="mt-10">
        <LeagueManager initialLeagues={leagues} />
      </div>
    </main>
  );
}

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
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
          Private leagues
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
          Compete with friends
        </h1>
        <p className="mt-4 text-[color:var(--muted)]">
          <Link href="/login" className="text-[color:var(--signal)] underline">
            Sign in
          </Link>{" "}
          to create or join a private league.
        </p>
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
        Invite-only boards ranked with the same deterministic rules as the
        global leaderboard. Invite codes are shareable; member emails stay
        private.
      </p>
      <div className="mt-10">
        <LeagueManager initialLeagues={leagues} />
      </div>
    </main>
  );
}

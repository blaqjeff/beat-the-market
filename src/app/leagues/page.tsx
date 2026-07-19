import Link from "next/link";

import { LeagueManager } from "@/components/competition/LeagueManager";
import { getCurrentUser } from "@/lib/auth/session";
import { listUserLeagues } from "@/lib/game/leagues";

export const dynamic = "force-dynamic";

const BRAND_INQUIRY_HREF =
  "https://github.com/blaqjeff/beat-the-market/issues/new?title=Branded%20league%20inquiry&labels=partnership&body=" +
  encodeURIComponent(
    [
      "Brand / org:",
      "Campaign window:",
      "Audience (geo / size):",
      "What you want (sponsored board, custom rules, prizes):",
      "",
      "We'll follow up on premium & branded league hosting.",
    ].join("\n")
  );

function BrandLeaguesPitch({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mt-10 rounded-[2rem] border border-[color:var(--signal)]/35 bg-[color:var(--signal)]/5 px-6 py-8 sm:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--signal)]">
        Premium & branded leagues
      </p>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)] sm:text-3xl">
        Host a competition. Keep your brand in the frame.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted)] sm:text-base">
        Free leagues are live for friends. Next up: premium boards with custom
        ranking rules, and branded leagues where sponsors run a World Cup
        confidence competition — co-branded leaderboard, match placements, and
        share cards — without turning the game into wagering.
      </p>
      <ul className="mt-5 grid gap-2 text-sm text-[color:var(--chalk)] sm:grid-cols-3">
        <li className="rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)]/40 px-4 py-3">
          Custom rules & seasons
        </li>
        <li className="rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)]/40 px-4 py-3">
          Sponsor slots on calls & shares
        </li>
        <li className="rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)]/40 px-4 py-3">
          Brand-funded prizes, skill play only
        </li>
      </ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <a
          href={BRAND_INQUIRY_HREF}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-xl bg-[color:var(--signal)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:brightness-110"
        >
          Request a branded league
        </a>
        {signedIn ? (
          <a
            href="#create-league"
            className="inline-flex rounded-xl border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--chalk)] transition hover:border-[color:var(--signal)]/50"
          >
            Start with a free league
          </a>
        ) : (
          <Link
            href="/login"
            className="inline-flex rounded-xl border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--chalk)] transition hover:border-[color:var(--signal)]/50"
          >
            Sign in to create a free league
          </Link>
        )}
      </div>
    </section>
  );
}

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
            leaderboard — then grow into premium and branded competitions.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-xl bg-[color:var(--signal)] px-5 py-3 font-semibold text-[color:var(--ink)] transition hover:brightness-110"
          >
            Sign in to continue
          </Link>
        </section>
        <BrandLeaguesPitch signedIn={false} />
      </main>
    );
  }

  const leagues = await listUserLeagues(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Private leagues
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[color:var(--chalk)] sm:text-4xl">
        Your circles
      </h1>
      <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
        Invite-only boards today. Premium rules and brand-hosted leagues are the
        commercial path on top of this same loop.
      </p>
      <div className="mt-10">
        <LeagueManager initialLeagues={leagues} />
      </div>
      <BrandLeaguesPitch signedIn />
    </main>
  );
}

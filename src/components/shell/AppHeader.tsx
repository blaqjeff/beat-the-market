import Link from "next/link";

import { SignOutButton } from "@/components/shell/SignOutButton";
import { getCurrentUser } from "@/lib/auth/session";

const links = [
  { href: "/", label: "Matches" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/leagues", label: "Leagues" },
];

export async function AppHeader() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  return (
    <header className="border-b border-[color:var(--line)] bg-[color:var(--pitch)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="group">
            <p className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[color:var(--chalk)] sm:text-2xl">
              Beat the Market
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--signal)]">
              TxLINE priced calls
            </p>
          </Link>
          <nav className="hidden items-center gap-5 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[color:var(--muted)] transition hover:text-[color:var(--chalk)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href={`/profile/${user.username}`}
                className="hidden text-sm text-[color:var(--muted)] transition hover:text-[color:var(--chalk)] sm:inline"
              >
                @{user.username}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[color:var(--signal)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:brightness-110"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

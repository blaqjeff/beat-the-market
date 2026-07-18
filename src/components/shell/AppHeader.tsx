import Link from "next/link";

import { NavLinks } from "@/components/shell/NavLinks";
import { SignOutButton } from "@/components/shell/SignOutButton";
import { getCurrentUser } from "@/lib/auth/session";

export async function AppHeader() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  const initial = user
    ? (user.displayName?.[0] ?? user.username[0] ?? "?").toUpperCase()
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--line)]/80 bg-[color:var(--pitch)]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--signal)]/40 bg-[color:var(--signal)]/10 font-[family-name:var(--font-display)] text-sm text-[color:var(--signal)] transition group-hover:bg-[color:var(--signal)]/20">
              B
            </span>
            <span className="min-w-0">
              <span className="block font-[family-name:var(--font-display)] text-lg leading-none tracking-wide text-[color:var(--chalk)] sm:text-xl">
                Beat the Market
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                TxLINE priced
              </span>
            </span>
          </Link>

          <div className="hidden md:block">
            <NavLinks />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                href={`/profile/${user.username}`}
                className="flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--panel)]/60 py-1 pl-1 pr-3 transition hover:border-[color:var(--signal)]/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--signal)] font-mono text-xs font-semibold text-[color:var(--ink)]">
                  {initial}
                </span>
                <span className="max-w-[9rem] truncate text-sm text-[color:var(--chalk)]">
                  @{user.username}
                </span>
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

        <div className="w-full md:hidden">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}

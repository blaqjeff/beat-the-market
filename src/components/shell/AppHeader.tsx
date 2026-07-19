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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Link
            href="/"
            className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--signal)]/40 bg-[color:var(--signal)]/10 font-[family-name:var(--font-display)] text-sm text-[color:var(--signal)] transition group-hover:bg-[color:var(--signal)]/20 sm:h-9 sm:w-9">
              B
            </span>
            <span className="min-w-0">
              <span className="block truncate font-[family-name:var(--font-display)] text-base leading-none tracking-wide text-[color:var(--chalk)] sm:text-xl">
                Beat the Market
              </span>
              <span className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--muted)] sm:block">
                Live priced calls
              </span>
            </span>
          </Link>

          <div className="hidden md:block">
            <NavLinks />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {user ? (
              <>
                <Link
                  href={`/profile/${user.username}`}
                  className="flex max-w-[7.5rem] items-center gap-1.5 rounded-full border border-[color:var(--line)] bg-[color:var(--panel)]/60 py-1 pl-1 pr-2 transition hover:border-[color:var(--signal)]/40 sm:max-w-[11rem] sm:gap-2 sm:pr-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--signal)] font-mono text-xs font-semibold text-[color:var(--ink)]">
                    {initial}
                  </span>
                  <span className="truncate text-xs text-[color:var(--chalk)] sm:text-sm">
                    @{user.username}
                  </span>
                </Link>
                <SignOutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-[color:var(--signal)] px-3.5 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:brightness-110 sm:px-4"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 md:hidden">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}

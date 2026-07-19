"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Matches" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/leagues", label: "Leagues" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/matches");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex w-max items-center gap-1">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition sm:px-3.5 ${
              active
                ? "bg-[color:var(--signal)]/15 text-[color:var(--signal)]"
                : "text-[color:var(--muted)] hover:bg-white/5 hover:text-[color:var(--chalk)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

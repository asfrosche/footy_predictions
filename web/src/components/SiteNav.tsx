"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview", match: (p: string) => p === "/" },
  { href: "/matches/", label: "Matches", match: (p: string) => p.startsWith("/matches") },
  { href: "/premier-league/", label: "Premier League", match: (p: string) => p.startsWith("/premier-league") },
  { href: "/upcoming/", label: "Upcoming", match: (p: string) => p.startsWith("/upcoming") || p.startsWith("/match/") },
  { href: "/world-cup/", label: "World Cup", match: (p: string) => p.startsWith("/world-cup") },
];

export function SiteNav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="nav" aria-label="Primary">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.match(pathname) ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
      {/* The SIPOC page is served by FastAPI, so it is a plain link. */}
      <a href="/sipoc">SIPOC</a>
    </nav>
  );
}

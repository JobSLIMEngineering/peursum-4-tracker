"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overzicht" },
  { href: "/competitie", label: "Competitie" },
  { href: "/match-center", label: "Match center" },
  { href: "/team", label: "Team" },
];

export function Tabs() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav className="tabs" aria-label="Schermen">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={active(t.href) ? "page" : undefined}>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

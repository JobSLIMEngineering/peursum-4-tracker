"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, tabIndex } from "@/lib/tabs";

const ICONS: React.ReactNode[] = [
  // Overzicht: huis
  <path key="h" d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  // Competitie: lijst met rondes
  <g key="c">
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" strokeWidth="3" />
  </g>,
  // Match center: doelwit
  <g key="m">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </g>,
  // Team: mensen
  <g key="t">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.4 3.5 5.2" />
  </g>,
];

/** Vaste tabbalk onderaan op de telefoon (binnen bereik van de duim). Op de laptop staan de tabs in de kop. */
export function BottomNav() {
  const active = tabIndex(usePathname());
  return (
    <nav className="bottom-nav" aria-label="Schermen">
      {TABS.map((t, i) => (
        <Link key={t.href} href={t.href} aria-current={i === active ? "page" : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[i]}
          </svg>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

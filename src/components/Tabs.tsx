"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, tabIndex } from "@/lib/tabs";

export function Tabs() {
  const path = usePathname();
  const active = tabIndex(path);

  return (
    <nav className="tabs" aria-label="Schermen">
      {TABS.map((t, i) => (
        <Link key={t.href} href={t.href} aria-current={i === active ? "page" : undefined}>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

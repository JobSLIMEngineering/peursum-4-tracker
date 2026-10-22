"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MORE, TABS, tabIndex } from "@/lib/tabs";
import { SettingsPanel } from "./Settings";

const ICON = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const TAB_ICONS: React.ReactNode[] = [
  <svg key="h" {...ICON}>
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>,
  <svg key="c" {...ICON}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" strokeWidth="3" />
  </svg>,
  <svg key="m" {...ICON}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7l4.3 3.1-1.6 5H9.3l-1.6-5z" />
  </svg>,
];

const MORE_ICONS: React.ReactNode[] = [
  // Prijzen: beker
  <svg key="p" {...ICON}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6" />
  </svg>,
  // Spelers: shirt
  <svg key="s" {...ICON}>
    <path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z" />
  </svg>,
];

/**
 * Zwevende, doorschijnende balk onderin: drie vaste schermen en rechts "Meer" (drie streepjes),
 * dat een tweede balkje omhoog laat schuiven met de overige schermen.
 */
export function Dock() {
  const path = usePathname();
  const active = tabIndex(path);
  const [more, setMore] = useState<"closed" | "open" | "closing">("closed");
  const [settings, setSettings] = useState(false);

  const close = () => {
    if (more !== "open") return;
    setMore("closing");
    setTimeout(() => setMore("closed"), 200);
  };

  useEffect(() => {
    queueMicrotask(() => {
      setMore("closed");
      setSettings(false);
    });
  }, [path]);

  useEffect(() => {
    if (more !== "open") return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMore("closed");
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [more]);

  // Indicator onder de actieve knop; op een "meer"-scherm onder de drie streepjes
  const ind = Math.min(active, TABS.length);

  return createPortal(
    <>
      {(more !== "closed" || settings) && (
        <div
          className={`scrim ${settings ? "" : "clear"}`}
          onClick={() => {
            close();
            setSettings(false);
          }}
        />
      )}
      {more !== "closed" && (
        // Rechts boven elkaar, boven de knop Meer
        <nav className={`more-stack ${more === "closing" ? "closing" : ""}`} aria-label="Meer">
          {MORE.map((m, i) => (
            <Link
              key={m.href}
              href={m.href}
              className="glass"
              style={{ animationDelay: `${(MORE.length - i) * 40}ms` }}
              aria-current={active === TABS.length + i ? "page" : undefined}
              onClick={close}
            >
              <span>{m.label}</span>
              {MORE_ICONS[i]}
            </Link>
          ))}
          <button
            type="button"
            className="glass"
            onClick={() => {
              setMore("closed");
              setSettings(true);
            }}
          >
            <span>Instellingen</span>
            <svg {...ICON}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </nav>
      )}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}

      <nav className="dock glass" aria-label="Schermen">
        <span className="dock-ind" style={{ transform: `translateX(${ind * 100}%)` }} aria-hidden="true" />
        {TABS.map((t, i) => (
          <Link key={t.href} href={t.href} aria-current={i === active ? "page" : undefined}>
            {TAB_ICONS[i]}
            <span>{t.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`${more === "open" ? "open" : ""} ${active >= TABS.length ? "on" : ""}`}
          aria-expanded={more === "open"}
          aria-label="Meer"
          onClick={() => (more === "open" ? close() : setMore("open"))}
        >
          <span className="burger" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Meer</span>
        </button>
      </nav>
    </>,
    document.body,
  );
}

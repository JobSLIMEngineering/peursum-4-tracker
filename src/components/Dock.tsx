"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getTheme, setTheme, watchSystemTheme, type ThemeChoice } from "@/lib/theme";
import { MORE, TABS, tabIndex } from "@/lib/tabs";
import { useData } from "./DataProvider";
import { FeedbackPanel } from "./FeedbackPanel";
import { Medal } from "./Badges";

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

const THEMES: { key: ThemeChoice; label: string }[] = [
  { key: "auto", label: "Auto" },
  { key: "light", label: "Licht" },
  { key: "dark", label: "Donker" },
];

/**
 * Zwevende, doorschijnende balk onderin: drie vaste schermen en rechts de drie streepjes
 * met de rest (prijzen, spelers, thema, feedback).
 */
export function Dock() {
  const path = usePathname();
  const { readOnly, logout, store } = useData();
  const active = tabIndex(path);
  const [menu, setMenu] = useState<"closed" | "open" | "closing">("closed");
  const [feedback, setFeedback] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>("auto");

  useEffect(() => {
    queueMicrotask(() => setThemeState(getTheme()));
    return watchSystemTheme();
  }, []);

  const close = () => {
    if (menu !== "open") return;
    setMenu("closing");
    setTimeout(() => setMenu("closed"), 190);
  };

  // Menu dicht bij een schermwissel en met Escape
  useEffect(() => {
    queueMicrotask(() => setMenu((m) => (m === "open" ? "closed" : m)));
  }, [path]);
  useEffect(() => {
    if (menu !== "open" && !feedback) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu("closed");
      setFeedback(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, feedback]);

  const menuOn = menu !== "closed";
  // Indicator onder de actieve knop; op een menu-scherm onder de drie streepjes
  const ind = Math.min(active, TABS.length);

  return createPortal(
    <>
      {(menuOn || feedback) && (
        <div
          className="scrim"
          onClick={() => {
            close();
            setFeedback(false);
          }}
        />
      )}

      {menuOn && (
        <div className={`sheet glass ${menu === "closing" ? "closing" : ""}`} role="dialog" aria-label="Meer">
          <div className="sheet-grid">
            {MORE.map((m, i) => (
              <Link key={m.href} href={m.href} className="sheet-tile" aria-current={active === TABS.length + i ? "page" : undefined} onClick={close}>
                {i === 0 ? (
                  <span className="ico gold">
                    <Medal kind="schoen" size={36} plain />
                  </span>
                ) : (
                  <span className="ico">
                    <svg {...ICON}>
                      <path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z" />
                    </svg>
                  </span>
                )}
                <b>{m.label}</b>
                <small>{m.sub}</small>
              </Link>
            ))}
          </div>
          <div className="sheet-rows">
            <div className="sheet-row">
              <span>
                <svg {...ICON} width={20} height={20}>
                  <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
                </svg>
                Thema
              </span>
              <span className="seg" role="group" aria-label="Thema">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={theme === t.key}
                    onClick={() => {
                      setTheme(t.key);
                      setThemeState(t.key);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </span>
            </div>
            {!readOnly && (
              <button
                type="button"
                className="sheet-row"
                onClick={() => {
                  setMenu("closed");
                  setFeedback(true);
                }}
              >
                <span>
                  <svg {...ICON} width={20} height={20}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Feedback geven
                </span>
              </button>
            )}
            {(readOnly || store.kind === "github") && (
              <button type="button" className="sheet-row" onClick={logout}>
                <span>
                  <svg {...ICON} width={20} height={20}>
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                  {readOnly ? "Inloggen" : "Uitloggen op dit apparaat"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {feedback && <FeedbackPanel onClose={() => setFeedback(false)} />}

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
          className={`${menu === "open" ? "open" : ""} ${active >= TABS.length ? "on" : ""}`}
          aria-expanded={menu === "open"}
          aria-label="Meer"
          onClick={() => (menu === "open" ? close() : setMenu("open"))}
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

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getTheme, setTheme, watchSystemTheme, type ThemeChoice } from "@/lib/theme";
import { useData } from "./DataProvider";
import { FeedbackPanel } from "./FeedbackPanel";

const ICON = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const THEMES: { key: ThemeChoice; label: string }[] = [
  { key: "auto", label: "Auto" },
  { key: "light", label: "Licht" },
  { key: "dark", label: "Donker" },
];

/**
 * Tandwiel rechtsboven in de kop: thema, feedback en uitloggen (altijd met "weet je het zeker?").
 * Wordt vanuit de DataProvider in de kop gezet (net als de wedstrijd rechtsboven).
 */
export function Settings() {
  const { readOnly, logout, store } = useData();
  const path = usePathname();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>("auto");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setSlot(document.getElementById("settings-slot"));
      setThemeState(getTheme());
    });
    return watchSystemTheme();
  }, []);

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!slot) return null;
  const canLogout = !readOnly && store.kind === "github";

  return (
    <>
      {createPortal(
        <div className="settings" ref={ref}>
          <button type="button" className="gear" aria-label="Instellingen" aria-expanded={open} onClick={() => {
              setConfirm(false);
              setOpen((o) => !o);
            }}>
            <svg {...ICON} width={22} height={22}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
          {open && (
            <div className="settings-pop glass" role="dialog" aria-label="Instellingen">
              <div className="set-row">
                <span>
                  <svg {...ICON}>
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
                  className="set-row"
                  onClick={() => {
                    setOpen(false);
                    setFeedback(true);
                  }}
                >
                  <span>
                    <svg {...ICON}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Feedback geven
                  </span>
                </button>
              )}
              {readOnly && (
                <button type="button" className="set-row" onClick={logout}>
                  <span>
                    <svg {...ICON}>
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                    </svg>
                    Inloggen
                  </span>
                </button>
              )}
              {canLogout &&
                (confirm ? (
                  <div className="set-confirm">
                    <span>Weet je het zeker? Daarna heb je je wachtwoord weer nodig.</span>
                    <span className="actions" style={{ marginTop: 8 }}>
                      <button type="button" className="btn sm" onClick={() => setConfirm(false)}>
                        Nee
                      </button>
                      <button type="button" className="btn sm primary" onClick={logout}>
                        Ja, uitloggen
                      </button>
                    </span>
                  </div>
                ) : (
                  <button type="button" className="set-row danger" onClick={() => setConfirm(true)}>
                    <span>
                      <svg {...ICON}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                      </svg>
                      Uitloggen op dit apparaat
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>,
        slot,
      )}
      {feedback &&
        createPortal(
          <>
            <div className="scrim" onClick={() => setFeedback(false)} />
            <FeedbackPanel onClose={() => setFeedback(false)} />
          </>,
          document.body,
        )}
    </>
  );
}

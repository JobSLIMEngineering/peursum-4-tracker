"use client";

import { useEffect, useState } from "react";
import { getTheme, setTheme, watchSystemTheme, type ThemeChoice } from "@/lib/theme";
import { useData } from "./DataProvider";
import { FeedbackPanel } from "./FeedbackPanel";

const ICON = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const THEMES: { key: ThemeChoice; label: string }[] = [
  { key: "auto", label: "Auto" },
  { key: "light", label: "Licht" },
  { key: "dark", label: "Donker" },
];

/** Instellingen (via Meer): thema, feedback en uitloggen (altijd met "weet je het zeker?") */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { readOnly, logout, store } = useData();
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>("auto");

  useEffect(() => {
    queueMicrotask(() => setThemeState(getTheme()));
    return watchSystemTheme();
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (feedback) return <FeedbackPanel onClose={onClose} />;
  const canLogout = !readOnly && store.kind === "github";

  return (
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
        <button type="button" className="set-row" onClick={() => setFeedback(true)}>
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
  );
}

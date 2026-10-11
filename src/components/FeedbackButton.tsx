"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useData } from "./DataProvider";

/** Klein icoon onderin elk scherm. Slaat tekst op met pagina, schermbreedte en tijdstip. */
export function FeedbackButton() {
  const { mutate, readOnly } = useData();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    const ok = await mutate(
        "feedback.json",
        (f) => ({
          items: [
            ...f.items,
            {
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              page: path,
              width: window.innerWidth,
              text: t.slice(0, 4000),
              status: "open",
            },
          ],
        }),
        "feedback",
      );
    setBusy(false);
    if (!ok) {
      setMsg({ ok: false, text: "Opslaan lukt nu niet. Probeer het later nog eens." });
      return;
    }
    setText("");
    setMsg({ ok: true, text: "Opgeslagen. Bedankt!" });
    setTimeout(() => {
      setOpen(false);
      setMsg(null);
    }, 1500);
  }

  if (readOnly) return null;

  // Via een portal direct in <body>: anders zit "position: fixed" vast aan het hoofdvlak
  return createPortal(
    <>
      {open && (
        <section className="box fb-panel" role="dialog" aria-label="Feedback">
          <div className="box-h">
            <p className="lbl">Feedback</p>
            <button className="btn sm" type="button" onClick={() => setOpen(false)}>
              Sluiten
            </button>
          </div>
          <form onSubmit={submit} className="box-b">
            <label className="f">
              Wat werkt niet of kan beter?
              <textarea
                required
                maxLength={4000}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ minHeight: 90 }}
              />
            </label>
            <div className="actions">
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? "Bezig…" : "Versturen"}
              </button>
            </div>
            {msg && <p className={`note ${msg.ok ? "ok" : "warn"}`}>{msg.text}</p>}
          </form>
        </section>
      )}
      <button
        type="button"
        className="fb-btn"
        aria-label="Feedback geven"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </>,
    document.body,
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { submitFeedback, type FeedbackState } from "@/app/actions/feedback";

/** Klein icoon onderin elk scherm. Slaat tekst op met pagina, schermbreedte en tijdstip. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState<FeedbackState, FormData>(async (prev, data) => {
    const result = await submitFeedback(prev, data);
    if (result?.ok) setText("");
    return result;
  }, null);
  const path = usePathname();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!state?.ok) return;
    const t = setTimeout(() => setOpen(false), 1500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <>
      {open && (
        <section className="box fb-panel" role="dialog" aria-label="Feedback">
          <div className="box-h">
            <p className="lbl">Feedback</p>
            <button className="btn sm" type="button" onClick={() => setOpen(false)}>
              Sluiten
            </button>
          </div>
          <form action={action} className="box-b">
            <input type="hidden" name="pagina" value={path} />
            <input type="hidden" name="schermbreedte" value={width} />
            <label className="f">
              Wat werkt niet of kan beter?
              <textarea
                name="tekst"
                required
                maxLength={4000}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ minHeight: 90 }}
              />
            </label>
            <div className="actions">
              <button className="btn primary" type="submit" disabled={pending}>
                {pending ? "Bezig…" : "Versturen"}
              </button>
            </div>
            {state && <p className={`note ${state.ok ? "ok" : "warn"}`}>{state.message}</p>}
          </form>
        </section>
      )}
      <button
        type="button"
        className="fb-btn"
        aria-label="Feedback geven"
        aria-expanded={open}
        onClick={() => {
          setWidth(window.innerWidth);
          setOpen((o) => !o);
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </>
  );
}

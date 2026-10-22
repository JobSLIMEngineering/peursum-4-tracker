"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useData } from "./DataProvider";

/** Feedback geven (via het menu). Slaat tekst op met pagina, schermbreedte en tijdstip. */
export function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const { mutate } = useData();
  const path = usePathname();
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
    setTimeout(onClose, 1400);
  }

  return (
    <section className="box fb-panel" role="dialog" aria-label="Feedback">
      <div className="box-h">
        <p className="lbl">Feedback</p>
        <button className="btn sm" type="button" onClick={onClose}>
          Sluiten
        </button>
      </div>
      <form onSubmit={submit} className="box-b">
        <label className="f">
          Wat werkt niet of kan beter?
          <textarea required maxLength={4000} autoFocus value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 100 }} />
        </label>
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Bezig…" : "Versturen"}
          </button>
        </div>
        {msg && <p className={`note ${msg.ok ? "ok" : "warn"}`}>{msg.text}</p>}
      </form>
    </section>
  );
}

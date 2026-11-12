"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ATTRS, nextPair, scoutable, scoutRatings, targetPerAttr, type Attr, type ScoutVote } from "@/lib/domain/scouting";
import { playerLabel, POSITION_ROLE, ROLE_CODE } from "@/lib/domain/types";
import { useData } from "./DataProvider";
import { Shirt } from "./Shirt";

const DRAFT = "p4-scout-pending";
/** Per zoveel keuzes opslaan (en bij afsluiten), zodat niet elke tik een opslag is */
const BATCH = 10;

const loadDraft = (): ScoutVote[] => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT) ?? "[]") as ScoutVote[];
  } catch {
    return [];
  }
};

/** Herkenning van een keuze (ook na opslaan als tekst) */
const sig = (v: ScoutVote) => `${v.a}|${v.b}|${v.attr}|${v.winner}|${v.at}`;

/** Knop op de spelerspagina (alleen voor de beheerder) */
export function ScoutButton() {
  const { view } = useData();
  const [open, setOpen] = useState(false);
  return (
    <div className="scout-bar">
      <button className="btn sm" type="button" onClick={() => setOpen(true)}>
        Spelers inschatten
      </button>
      <span className="meta">{view.scoutVotes.length} vergelijkingen · alleen jij ziet dit</span>
      {open && <Scouting onClose={() => setOpen(false)} />}
    </div>
  );
}

/**
 * Inschatting vooraf: steeds twee spelers naast elkaar, kies wie beter is op één onderdeel.
 * Het basiscijfer dat daaruit volgt is de graadmeter van de kaart; de prestaties werken daar vanaf.
 */
export function Scouting({ onClose }: { onClose: () => void }) {
  const { view, mutate } = useData();
  const [pending, setPending] = useState<ScoutVote[]>(() => loadDraft());
  const [tab, setTab] = useState<"kies" | "uitslag">("kies");
  const [skip, setSkip] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const all = useMemo(() => [...view.scoutVotes, ...pending], [view.scoutVotes, pending]);
  // Volgende paar; "Weet ik niet" (skip) geeft een ander paar
  const pair = useMemo(() => nextPair(all, view.players), [all, view.players, skip]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = (id: string) => view.players.find((p) => p.id === id)!;
  const pool = scoutable(view.players);
  const target = targetPerAttr(pool.length);

  // Concept bewaren op dit apparaat, zodat niets verloren gaat als de app dicht gaat
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT, JSON.stringify(pending));
    } catch {
      // geen opslag: dan alleen in het geheugen
    }
  }, [pending]);

  const save = async (batch: ScoutVote[]) => {
    if (!batch.length || saving) return;
    setSaving(true);
    const ok = await mutate("scouting.json", (f) => ({ ...f, votes: [...(f?.votes ?? []), ...batch] }), `inschatting: ${batch.length} vergelijkingen`);
    setSaving(false);
    if (ok) {
      setPending((p) => p.filter((v) => !batch.includes(v)));
      // Ook direct uit het concept op dit apparaat halen (het scherm kan al dicht zijn)
      const done = new Set(batch.map(sig));
      try {
        localStorage.setItem(DRAFT, JSON.stringify(loadDraft().filter((v) => !done.has(sig(v)))));
      } catch {
        // geen opslag
      }
      setError(null);
    } else setError("Opslaan lukte niet; je keuzes staan nog op dit apparaat en gaan mee bij de volgende keer.");
  };

  const choose = (winner: ScoutVote["winner"]) => {
    if (!pair) return;
    const v: ScoutVote = { a: pair.a, b: pair.b, attr: pair.attr, winner, at: new Date().toISOString() };
    const next = [...pending, v];
    setPending(next);
    if (next.length >= BATCH) void save(next);
  };

  const close = () => {
    void save(pending);
    onClose();
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const perAttr = (a: Attr) => all.filter((v) => v.attr === a).length;
  const done = ATTRS.reduce((s, a) => s + Math.min(target, perAttr(a.key)), 0);
  const attr = pair ? ATTRS.find((a) => a.key === pair.attr)! : null;
  const ratings = tab === "uitslag" ? scoutRatings(all, view.players) : null;

  const card = (id: string, side: "a" | "b") => {
    const p = byId(id);
    return (
      <button type="button" className="scout-card" onClick={() => choose(side)}>
        <Shirt player={p} size={92} />
        <b>{playerLabel(p)}</b>
        <small>{ROLE_CODE[p.role ?? POSITION_ROLE[p.position]]}</small>
      </button>
    );
  };

  return createPortal(
    <div className="cardview scout" role="dialog" aria-label="Spelers inschatten">
      <div className="cv-top">
        <button type="button" className="cv-back" onClick={close}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Klaar
        </button>
        <div className="seg scout-tabs" role="group" aria-label="Kiezen of uitslag">
          <button type="button" aria-pressed={tab === "kies"} onClick={() => setTab("kies")}>
            Kiezen
          </button>
          <button type="button" aria-pressed={tab === "uitslag"} onClick={() => setTab("uitslag")}>
            Uitslag
          </button>
        </div>
      </div>
      <div className="scout-body">
        {tab === "kies" ? (
          pair && attr ? (
            <>
              <p className="scout-k">{attr.label}</p>
              <h2 className="scout-q">{attr.q}</h2>
              <div className="scout-duel">
                {card(pair.a, "a")}
                <span className="scout-vs" aria-hidden="true">
                  VS
                </span>
                {card(pair.b, "b")}
              </div>
              <div className="actions scout-more">
                <button className="btn sm" type="button" onClick={() => choose("gelijk")}>
                  Even goed
                </button>
                <button className="btn sm" type="button" onClick={() => setSkip((x) => x + 1)}>
                  Weet ik niet
                </button>
                <button className="btn sm" type="button" disabled={!pending.length} onClick={() => setPending((p) => p.slice(0, -1))}>
                  Terug
                </button>
              </div>
              <div className="scout-prog">
                <div className="scout-bar-all">
                  <i style={{ width: `${Math.min(100, (done / (target * ATTRS.length)) * 100)}%` }} />
                </div>
                <span className="meta">
                  {all.length} keuzes · aanbevolen {target * ATTRS.length}
                  {pending.length > 0 && ` · ${pending.length} nog niet opgeslagen`}
                  {saving && " · opslaan…"}
                </span>
                <div className="scout-attrs">
                  {ATTRS.map((a) => (
                    <span key={a.key} className={perAttr(a.key) >= target ? "full" : ""}>
                      {a.label} {perAttr(a.key)}/{target}
                    </span>
                  ))}
                </div>
                {error && <p className="meta" style={{ color: "var(--loss)" }}>{error}</p>}
              </div>
              <p className="meta scout-help">
                Iedereen wordt met iedereen vergeleken, ook over de linies heen (keepers niet). Per speler telt
                daarna wat bij zijn linie past: bij een verdediger vooral verdedigen, bij een spits vooral schieten.
                Dat basiscijfer is de graadmeter van zijn kaart; zijn prestaties dit seizoen brengen hem tot 8
                punten hoger of lager. Je hoeft het niet in één keer af te maken.
              </p>
            </>
          ) : (
            <p className="meta">Er zijn minstens twee vaste veldspelers nodig om te vergelijken.</p>
          )
        ) : (
          <div className="tbl-wrap scout-table">
            <table className="compact">
              <thead>
                <tr>
                  <th className="t">Speler</th>
                  {ATTRS.map((a) => (
                    <th key={a.key}>{a.key}</th>
                  ))}
                  <th>Basis</th>
                  <th>Kaart</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ratings!)
                  .sort((x, y) => (y[1].base ?? 0) - (x[1].base ?? 0))
                  .map(([id, r]) => (
                    <tr key={id}>
                      <td className="t">
                        {playerLabel(byId(id))}
                        <small className="meta"> · {r.votes}×</small>
                      </td>
                      {ATTRS.map((a) => (
                        <td key={a.key}>{r.attrs[a.key]}</td>
                      ))}
                      <td className="pts">{r.base != null ? Math.round(r.base) : "–"}</td>
                      <td>{view.cards[id]?.overall ?? "–"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="meta" style={{ padding: "8px 4px" }}>
              Basis telt pas vanaf 6 vergelijkingen per speler. Kaart = basis plus of min de prestaties van dit seizoen
              (wordt bijgewerkt na opslaan).
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

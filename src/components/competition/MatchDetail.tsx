"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { MatchHero, PredictionBlocks } from "@/components/Prediction";
import { Fireworks } from "@/components/Fireworks";
import { isPlayed, opponent, ourScore, US, type MatchKind } from "@/lib/domain/types";
import type { MatchEdit } from "@/lib/store/schema";
import { hasPrediction, type ViewMatch } from "@/lib/store/view";
import { EntryForm } from "./EntryForm";
import { EntryView } from "./EntryView";

export function MatchDetail({ id, startEditing }: { id: string; startEditing: boolean }) {
  const { view, readOnly } = useData();
  const m = view.matches.find((x) => x.id === id);
  const [mode, setMode] = useState<"view" | "fixture" | "entry">(startEditing && !readOnly ? "fixture" : "view");

  const back = (
    <Link className="btn sm" href="/competitie/" style={{ marginBottom: 12 }}>
      ← Alle wedstrijden
    </Link>
  );

  if (!m) {
    return (
      <>
        {back}
        <section className="box" style={{ marginTop: 12 }}>
          <div className="box-b muted">Deze wedstrijd bestaat niet (meer).</div>
        </section>
      </>
    );
  }

  const played = isPlayed(m);
  const score = ourScore(m);
  const won = !!score && score[0] > score[1];
  return (
    <>
      {won && <Fireworks id={m.id} />}
      {back}
      <div style={{ marginTop: 12 }}>
        <MatchHero match={m} />
      </div>

      {played ? (
        mode === "entry" ? (
          <EntryForm match={m} onDone={() => setMode("view")} />
        ) : (
          <EntryView match={m} onEdit={() => setMode("entry")} />
        )
      ) : mode === "fixture" ? (
        <FixtureForm match={m} onDone={() => setMode("view")} />
      ) : (
        <>
          <div className="actions" style={{ margin: "0 0 14px" }} hidden={readOnly}>
            <button className="btn" type="button" onClick={() => setMode("fixture")}>
              Wijzigen
            </button>
          </div>
          {hasPrediction(view, m) ? (
            <PredictionBlocks view={view} match={m} />
          ) : (
            <section className="box">
              <div className="box-b muted">
                {m.kind === "competitie" && !view.pool.has(opponent(m))
                  ? "Tegenstander buiten de poule: telt niet mee voor de stand en de statistieken, dus geen winkans."
                  : m.kind !== "competitie"
                    ? `${m.kind[0].toUpperCase()}${m.kind.slice(1)}: telt niet mee voor de stand en de statistieken, dus geen winkans.`
                    : "Nog geen datum: zodra die bekend is, verschijnt hier de winkans."}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

/** Wijzigen van een komende wedstrijd (PLAN.md §3.3). Wijzigingen staan los van de clubsite-data. */
function FixtureForm({ match, onDone }: { match: ViewMatch; onDone: () => void }) {
  const { view, mutate } = useData();
  const router = useRouter();
  const teams = view.standings.map((s) => s.team).filter((t) => t !== US);
  const [f, setF] = useState({
    opp: opponent(match) === "Tegenstander" ? "" : opponent(match),
    date: match.date ?? "",
    time: match.time ?? "",
    home: match.home === US,
    kind: match.kind,
    venue: match.venue ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const opp = f.opp.trim() || "Onbekend";
    const edit: MatchEdit = {
      home: f.home ? US : opp,
      away: f.home ? opp : US,
      date: f.date || null,
      time: f.time || null,
      kind: f.kind,
      venue: f.venue.trim() || null,
    };
    const ok = await mutate(
      "overrides.json",
      (o) =>
        match.extra
          ? { ...o, extra: o.extra.map((x) => (x.id === match.id ? { ...x, ...edit } : x)) }
          : { ...o, edits: { ...o.edits, [match.id]: edit } },
      `wedstrijd gewijzigd: ${edit.home} - ${edit.away}`,
    );
    if (ok) onDone();
  }

  async function reset() {
    const ok = await mutate(
      "overrides.json",
      (o) => {
        const edits = { ...o.edits };
        delete edits[match.id];
        return { ...o, edits };
      },
      `terug naar clubsite: ${match.home} - ${match.away}`,
    );
    if (ok) onDone();
  }

  async function remove() {
    const ok = await mutate(
      "overrides.json",
      (o) => ({ ...o, extra: o.extra.filter((x) => x.id !== match.id) }),
      `wedstrijd verwijderd: ${match.home} - ${match.away}`,
    );
    if (ok) router.push("/competitie/");
  }

  return (
    <form className="box" onSubmit={save}>
      <div className="box-h">
        <p className="lbl">Wedstrijd wijzigen</p>
      </div>
      <div className="box-b fixf">
        <label className="f">
          Tegenstander
          <input type="text" list="fxTeams" value={f.opp} onChange={(e) => set("opp", e.target.value)} required />
          <datalist id="fxTeams">
            {teams.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="f">
          Datum
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <label className="f">
          Aftrap
          <input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} />
        </label>
        <label className="f">
          Thuis / uit
          <select value={f.home ? "1" : "0"} onChange={(e) => set("home", e.target.value === "1")}>
            <option value="1">Thuis</option>
            <option value="0">Uit</option>
          </select>
        </label>
        <label className="f">
          Soort
          <select value={f.kind} onChange={(e) => set("kind", e.target.value as MatchKind)}>
            <option value="competitie">Competitie</option>
            <option value="beker">Beker</option>
            <option value="oefen">Oefen</option>
          </select>
        </label>
        <label className="f">
          Veld / locatie
          <input
            type="text"
            value={f.venue}
            onChange={(e) => set("venue", e.target.value)}
            placeholder="bijv. Sportpark Peursum, veld 2"
          />
        </label>
      </div>
      <div className="box-b actions" style={{ marginTop: 0, borderTop: "1px solid var(--line)" }}>
        <button className="btn primary" type="submit">
          Opslaan
        </button>
        <button className="btn" type="button" onClick={onDone}>
          Annuleren
        </button>
        {match.extra ? (
          <button className="btn" type="button" onClick={remove}>
            Wedstrijd verwijderen
          </button>
        ) : (
          match.edited && (
            <button className="btn" type="button" onClick={reset}>
              Terug naar clubsite
            </button>
          )
        )}
      </div>
    </form>
  );
}

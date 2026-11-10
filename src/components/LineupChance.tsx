"use client";

import { useState } from "react";
import { attendanceRates, lineupPrediction } from "@/lib/domain/insights";
import { predict, type Prediction } from "@/lib/domain/model";
import { opponent, playerLabel, US, type Match, type MatchEntry } from "@/lib/domain/types";
import { pct } from "@/lib/format";
import { Attendance, sortPlayers } from "./competition/EntryForm";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { Box, WdlBar } from "./ui";

/** Uitkomst met een selectie: winkans, verschil met normaal en de balk */
function Outcome({ base, p, count }: { base: Prediction; p: Prediction; count: number }) {
  const diff = Math.round(p.win * 100) - Math.round(base.win * 100);
  return (
    <>
      <div className="lineup-head">
        <span className="num lineup-pct">{pct(p.win)}%</span>
        <span>
          <b>winkans met deze {count} spelers</b>
          <span className={`meta lineup-diff ${diff > 0 ? "up" : diff < 0 ? "down" : ""}`}>
            {diff === 0 ? `gelijk aan normaal (${pct(base.win)}%)` : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)}% t.o.v. normaal (${pct(base.win)}%)`}
          </span>
        </span>
      </div>
      <WdlBar p={p} />
    </>
  );
}

/**
 * Selectie van vrijdag: plak de lijst met spelers en zie direct wat die doet met de verwachting.
 * Pas na opslaan staat hij vast; na de wedstrijd staat hij klaar bij het invoeren van de stats.
 * Alleen voor de eigenaar.
 */
export function LineupChance({ match }: { match: Match }) {
  const { view, mutate, readOnly } = useData();
  const planned = view.entries[match.id];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ attendance: string[]; injured: string[] }>({ attendance: [], injured: [] });
  const [busy, setBusy] = useState(false);
  if (readOnly) return null;

  const players = sortPlayers(view.players.filter((p) => p.active));
  const rates = attendanceRates(view.rows, players.map((p) => p.id));
  const base = predict(view.model, US, opponent(match), match.home === US);
  const chance = (ids: string[]) => lineupPrediction(base, ids, view.impacts, rates).prediction;
  const name = (id: string) => playerLabel(view.players.find((p) => p.id === id));
  const has = !!planned?.attendance.length;

  const start = () => {
    setDraft({ attendance: planned?.attendance ?? [], injured: planned?.injured ?? [] });
    setEditing(true);
  };

  async function save() {
    setBusy(true);
    const entry: MatchEntry = {
      matchId: match.id,
      attendance: draft.attendance,
      stats: {},
      keeperId: null,
      opponentOwnGoals: 0,
      ...(draft.injured.length ? { injured: draft.injured } : {}),
    };
    const ok = await mutate("entries.json", (f) => ({ entries: { ...f.entries, [match.id]: entry } }), `selectie ${match.home} - ${match.away}`);
    setBusy(false);
    if (ok) setEditing(false);
  }

  const info = (
    <InfoTip label="Hoe werkt dit?">
      De gewone voorspelling hoort bij een normale bezetting. Zit er iemand bij die het team meestal beter maakt (of
      ontbreekt hij), dan schuift de winkans mee. Je ziet het effect al tijdens het invullen; pas na opslaan staat de
      selectie vast.
    </InfoTip>
  );

  if (editing)
    return (
      <section className="lineup-edit">
        <Box label="Selectie van vrijdag" right={info}>
          {draft.attendance.length ? (
            <Outcome base={base} p={chance(draft.attendance)} count={draft.attendance.length} />
          ) : (
            <p className="meta" style={{ margin: 0 }}>
              Plak hieronder de lijst; de winkans verschijnt meteen.
            </p>
          )}
          <div className="actions">
            <button className="btn primary" type="button" onClick={save} disabled={busy || !draft.attendance.length}>
              {busy ? "Opslaan…" : "Opslaan"}
            </button>
            <button className="btn" type="button" onClick={() => setEditing(false)}>
              Annuleren
            </button>
          </div>
        </Box>
        <Attendance
          players={players}
          attendance={draft.attendance}
          injured={draft.injured}
          onAdd={(ids) => setDraft((d) => ({ attendance: [...new Set([...d.attendance, ...ids])], injured: d.injured.filter((x) => !ids.includes(x)) }))}
          onToggle={(id) =>
            setDraft((d) =>
              d.attendance.includes(id)
                ? { ...d, attendance: d.attendance.filter((x) => x !== id) }
                : { attendance: [...d.attendance, id], injured: d.injured.filter((x) => x !== id) },
            )
          }
          onToggleInjured={(id) =>
            setDraft((d) =>
              d.injured.includes(id)
                ? { ...d, injured: d.injured.filter((x) => x !== id) }
                : { attendance: d.attendance.filter((x) => x !== id), injured: [...d.injured, id] },
            )
          }
        />
      </section>
    );

  return (
    <Box label="Selectie" style={{ marginBottom: 16 }} right={info}>
      {has ? (
        <>
          <Outcome base={base} p={chance(planned.attendance)} count={planned.attendance.length} />
          <div className="chips" style={{ marginTop: 12 }}>
            {planned.attendance.map((id) => (
              <span key={id} className="chip">
                {name(id)}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="meta" style={{ margin: 0 }}>
          Kreeg je de lijst met spelers voor deze wedstrijd? Plak hem hier en zie wat hij doet met de verwachting.
        </p>
      )}
      <div className="actions">
        <button className="btn sm primary" type="button" onClick={start}>
          {has ? "Selectie aanpassen" : "Lijst plakken"}
        </button>
      </div>
    </Box>
  );
}

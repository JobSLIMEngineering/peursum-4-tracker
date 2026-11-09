"use client";

import { useState } from "react";
import { attendanceRates, likelyLineup, lineupPrediction } from "@/lib/domain/insights";
import { predict } from "@/lib/domain/model";
import { opponent, playerLabel, US, type Match, type MatchEntry } from "@/lib/domain/types";
import { pct } from "@/lib/format";
import { Attendance, sortPlayers } from "./competition/EntryForm";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { Box, WdlBar } from "./ui";

/**
 * Winkans met de spelers die er zijn. Eerst een geschatte opstelling (wie meestal meedoet en fit is),
 * en zodra je de aanwezigheid vooraf invult, met precies die spelers. Alleen voor de eigenaar.
 * De ingevulde aanwezigheid staat na de wedstrijd al klaar bij het invoeren van de stats.
 */
export function LineupChance({ match }: { match: Match }) {
  const { view, mutate, readOnly } = useData();
  const [editing, setEditing] = useState(false);
  const planned = view.entries[match.id];
  const [draft, setDraft] = useState<{ attendance: string[]; injured: string[] }>({ attendance: [], injured: [] });
  if (readOnly) return null;

  const players = sortPlayers(view.players.filter((p) => p.active));
  const vast = players.filter((p) => p.type === "vast").map((p) => p.id);
  const rates = attendanceRates(view.rows, players.map((p) => p.id));
  const base = predict(view.model, US, opponent(match), match.home === US);
  const estimated = !planned?.attendance.length;
  // Te weinig ingevoerde duels om te weten wie meestal meedoet: dan alle fitte vaste spelers
  const guess = view.rows.length >= 3 ? likelyLineup(rates, view.injuredLast, vast) : vast.filter((id) => !view.injuredLast.has(id));
  const present = estimated ? guess : planned.attendance;
  const { prediction } = lineupPrediction(base, present, view.impacts, rates);
  const diff = Math.round(prediction.win * 100) - Math.round(base.win * 100);
  const name = (id: string) => playerLabel(view.players.find((p) => p.id === id));

  async function save() {
    const entry: MatchEntry = {
      matchId: match.id,
      attendance: draft.attendance,
      stats: {},
      keeperId: null,
      opponentOwnGoals: 0,
      ...(draft.injured.length ? { injured: draft.injured } : {}),
    };
    const ok = await mutate("entries.json", (f) => ({ entries: { ...f.entries, [match.id]: entry } }), `aanwezigheid ${match.home} - ${match.away}`);
    if (ok) setEditing(false);
  }

  if (editing)
    return (
      <div style={{ marginBottom: 16 }}>
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
        <div className="savebar glass">
          <span className="meta">{draft.attendance.length} aanwezig</span>
          <button className="btn" type="button" onClick={() => setEditing(false)}>
            Annuleren
          </button>
          <button className="btn primary" type="button" onClick={save} disabled={!draft.attendance.length}>
            Opslaan
          </button>
        </div>
      </div>
    );

  return (
    <Box
      label={estimated ? "Geschatte opstelling" : "Opstelling"}
      style={{ marginBottom: 16 }}
      right={
        <InfoTip label="Hoe werkt dit?">
          De gewone winkans hoort bij een normale bezetting. Is een speler erbij die het team meestal beter maakt (of
          ontbreekt hij), dan schuift de kans mee. Zonder ingevulde lijst rekent de app met wie meestal meedoet en niet
          geblesseerd is.
        </InfoTip>
      }
    >
      <div className="lineup-head">
        <span className="num lineup-pct">{pct(prediction.win)}%</span>
        <span>
          <b>winkans {estimated ? "met de verwachte spelers" : `met deze ${present.length} spelers`}</b>
          <span className={`meta lineup-diff ${diff > 0 ? "up" : diff < 0 ? "down" : ""}`}>
            {diff === 0 ? "gelijk aan normaal" : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)}% t.o.v. normaal (${pct(base.win)}%)`}
          </span>
        </span>
      </div>
      <WdlBar p={prediction} />
      <div className="chips" style={{ marginTop: 12 }}>
        {present.map((id) => (
          <span key={id} className="chip">
            {name(id)}
          </span>
        ))}
        {!present.length && <span className="meta">Nog niemand: vul de aanwezigheid in.</span>}
      </div>
      <div className="actions">
        <button
          className="btn sm primary"
          type="button"
          onClick={() => {
            setDraft({ attendance: planned?.attendance ?? present, injured: planned?.injured ?? [...view.injuredLast] });
            setEditing(true);
          }}
        >
          {estimated ? "Aanwezigheid invullen" : "Aanwezigheid aanpassen"}
        </button>
      </div>
    </Box>
  );
}

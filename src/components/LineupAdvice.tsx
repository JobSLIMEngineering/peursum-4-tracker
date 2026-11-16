"use client";

import { useMemo, useState } from "react";
import { suggestLineup } from "@/lib/domain/lineup";
import { roleOf, ROLES } from "@/lib/domain/season-stats";
import { playerLabel, type Match, type Role } from "@/lib/domain/types";
import { CardView } from "./CardView";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { Shirt } from "./Shirt";
import { ROLE, short, X, Y5, Y_SP, Y_WING } from "./TeamOfMonth";
import { Box } from "./ui";

/** Kaartcijfer voor wie (nog) geen kaart heeft, zoals een nieuwe leenspeler */
const DEFAULT_OVERALL = 70;
const PLEK: Record<Role, string> = {
  K: "keeper",
  LB: "linksback",
  CV: "centrale verdediger",
  RB: "rechtsback",
  DM: "verdedigende middenvelder",
  CM: "middenvelder",
  AM: "aanvallende middenvelder",
  LV: "linksbuiten",
  SP: "spits",
  RV: "rechtsbuiten",
};

/**
 * Opstellingsadvies bij de selectie: de beste elf uit wie er komt, op een veldje. Leenspelers hebben geen
 * vaste plek, dus eerst vraagt hij waar die het best kunnen staan (per wedstrijd onthouden).
 * Alleen voor de beheerder.
 */
export function LineupAdvice({ match }: { match: Match }) {
  const { view, mutate, readOnly } = useData();
  const planned = view.entries[match.id];
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const attendance = useMemo(() => planned?.attendance ?? [], [planned]);
  const byId = useMemo(() => new Map(view.players.map((p) => [p.id, p])), [view.players]);
  const loans = attendance.filter((id) => byId.get(id)?.type === "leen");
  const answers = planned?.positions ?? {};
  const missing = loans.filter((id) => !answers[id]);

  const advice = useMemo(() => {
    if (!attendance.length) return null;
    return suggestLineup(
      attendance
        .filter((id) => byId.has(id))
        .map((id) => {
          const p = byId.get(id)!;
          const role: Role = p.type === "leen" ? (answers[id] ?? roleOf(p)) : roleOf(p);
          return { id, role, overall: view.cards[id]?.overall ?? DEFAULT_OVERALL };
        }),
    );
  }, [attendance, answers, byId, view.cards]);

  if (readOnly || !attendance.length || !advice) return null;

  async function setRole(id: string, role: Role | "") {
    await mutate(
      "entries.json",
      (f) => {
        const e = f.entries[match.id];
        if (!e) return f;
        const positions = { ...(e.positions ?? {}) };
        if (role) positions[id] = role;
        else delete positions[id];
        return { entries: { ...f.entries, [match.id]: { ...e, positions } } };
      },
      `plek leenspeler ${match.home} - ${match.away}`,
    );
  }

  const name = (id: string) => playerLabel(byId.get(id));
  const info = (
    <InfoTip label="Hoe werkt dit?">
      De beste elf uit wie er komt, in de vaste 4-2-1-3. Iedereen telt mee met zijn kaartcijfer: op zijn eigen plek
      volledig, op een plek in de buurt iets minder (een centrale verdediger als back of een 8 als 10), ver van huis veel
      minder. De verdeling met het hoogste totaal wint. Leenspelers staan op de plek die jij opgeeft.
    </InfoTip>
  );

  // Eerst de leenspelers: waar staan ze het best?
  if (missing.length || asking)
    return (
      <Box label="Opstellingsadvies" style={{ marginBottom: 16 }} right={info}>
        <p className="meta" style={{ marginTop: 0 }}>
          {missing.length ? "Waar staan de leenspelers het best? Dan zet ik de opstelling neer." : "Plek van de leenspelers aanpassen."}
        </p>
        <div className="loan-roles">
          {loans.map((id) => (
            <label key={id} className="f">
              {name(id)}
              <select value={answers[id] ?? ""} onChange={(e) => setRole(id, e.target.value as Role | "")}>
                <option value="">Kies een plek…</option>
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {!missing.length && (
          <div className="actions">
            <button className="btn sm primary" type="button" onClick={() => setAsking(false)}>
              Klaar
            </button>
          </div>
        )}
      </Box>
    );

  const L = advice.team.length;
  const placed = advice.team.flatMap((line, li) => {
    const xs = X[line.length] ?? line.map((_, j) => ((j + 0.5) / line.length) * 100);
    return line.map((s, j) => ({ s, x: xs[j], y: L === 5 && li === 4 ? (s.role === "SP" ? Y_SP : Y_WING) : Y5[li] }));
  });

  return (
    <Box label="Opstellingsadvies" style={{ marginBottom: 16 }} right={info}>
      <div className="pitch lineup-pitch">
        {placed.map(({ s, x, y }, j) => {
          const p = s.playerId ? byId.get(s.playerId) : undefined;
          return p ? (
            <button key={j} type="button" className="pitch-p" style={{ left: `${x}%`, top: `${y}%` }} onClick={() => setOpen(p.id)} title={ROLE[s.role]}>
              <Shirt player={p} size={36} />
              <span>{short(p.name, playerLabel(p))}</span>
              <small>{view.cards[p.id]?.overall ?? (p.type === "leen" ? "leen" : "")}</small>
            </button>
          ) : (
            <span key={j} className="pitch-p empty" style={{ left: `${x}%`, top: `${y}%` }}>
              <i className="pitch-slot" aria-hidden="true" />
              <span>{ROLE[s.role]}</span>
            </span>
          );
        })}
      </div>
      {advice.moved.length > 0 && (
        <ul className="lineup-notes">
          {advice.moved.map((m) => (
            <li key={m.id}>
              <b>{name(m.id)}</b> als {PLEK[m.to]} <span className="meta">(normaal {PLEK[m.from]})</span>
            </li>
          ))}
        </ul>
      )}
      {advice.bench.length > 0 && (
        <p className="meta lineup-bench">
          <b>Wissels:</b> {advice.bench.map(name).join(", ")}
        </p>
      )}
      {advice.team.flat().some((s) => !s.playerId) && (
        <p className="note warn" style={{ marginBottom: 0 }}>
          Te weinig spelers voor een volledig elftal: de lege plekken staan op het veld.
        </p>
      )}
      {loans.length > 0 && (
        <div className="actions">
          <button className="btn sm" type="button" onClick={() => setAsking(true)}>
            Plek leenspelers aanpassen
          </button>
        </div>
      )}
      {open && <CardView playerId={open} onClose={() => setOpen(null)} />}
    </Box>
  );
}

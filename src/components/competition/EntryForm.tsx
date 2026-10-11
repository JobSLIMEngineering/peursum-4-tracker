"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { parseAttendance } from "@/lib/domain/attendance";
import { assignedGoals } from "@/lib/domain/stats";
import { ourScore, playerLabel, POSITIONS, type MatchEntry, type PlayerMatchStats } from "@/lib/domain/types";
import type { StoredPlayer } from "@/lib/store/schema";
import type { ViewMatch } from "@/lib/store/view";

const EMPTY_STATS: PlayerMatchStats = { goals: 0, assists: 0, yellow: false, red: false };

export function sortPlayers(players: StoredPlayer[]) {
  return [...players].sort(
    (a, b) =>
      Number(a.type === "leen") - Number(b.type === "leen") ||
      POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) ||
      Number(!!a.hiddenNo) - Number(!!b.hiddenNo) ||
      playerLabel(a).localeCompare(playerLabel(b), "nl"),
  );
}

/** Invoer na een wedstrijd: 1 · Aanwezig, 2 · Stats (PLAN.md §4) */
export function EntryForm({ match, onDone }: { match: ViewMatch; onDone: () => void }) {
  const { view, mutate } = useData();
  const [us, them] = ourScore(match)!;
  const existing = view.entries[match.id];
  const [draft, setDraft] = useState<MatchEntry>(
    () =>
      structuredClone(existing) ?? { matchId: match.id, attendance: [], stats: {}, keeperId: null, opponentOwnGoals: 0 },
  );
  const [paste, setPaste] = useState("");
  const [unknown, setUnknown] = useState<{ name: string; type: "leen" | "vast" }[]>([]);
  const [busy, setBusy] = useState(false);

  const players = sortPlayers(view.players.filter((p) => p.active));
  const present = players.filter((p) => draft.attendance.includes(p.id));
  const sum = assignedGoals(draft);

  const st = (id: string) => draft.stats[id] ?? EMPTY_STATS;
  const setSt = (id: string, patch: Partial<PlayerMatchStats>) =>
    setDraft((d) => ({ ...d, stats: { ...d.stats, [id]: { ...(d.stats[id] ?? EMPTY_STATS), ...patch } } }));

  function togglePresent(id: string) {
    setDraft((d) => {
      if (!d.attendance.includes(id)) return { ...d, attendance: [...d.attendance, id] };
      const stats = { ...d.stats };
      delete stats[id];
      return {
        ...d,
        attendance: d.attendance.filter((x) => x !== id),
        stats,
        keeperId: d.keeperId === id ? null : d.keeperId,
      };
    });
  }

  function processList() {
    const r = parseAttendance(paste, view.players);
    setDraft((d) => ({ ...d, attendance: [...new Set([...d.attendance, ...r.found])] }));
    setUnknown(r.unknown.map((name) => ({ name, type: "leen" })));
  }

  async function addUnknown() {
    const created: StoredPlayer[] = unknown.map((u) => ({
      id: `p-${crypto.randomUUID().slice(0, 8)}`,
      name: u.name,
      position: "Onbekend",
      type: u.type,
      hiddenNo: null,
      active: true,
      clubName: null,
    }));
    setBusy(true);
    const ok = await mutate(
      "players.json",
      (f) => ({ players: [...f.players, ...created] }),
      `spelers toegevoegd: ${created.map((p) => p.name).join(", ")}`,
    );
    setBusy(false);
    if (!ok) return;
    setDraft((d) => ({ ...d, attendance: [...d.attendance, ...created.map((p) => p.id)] }));
    setUnknown([]);
  }

  async function save() {
    // Alleen stats van aanwezigen, en lege regels weglaten
    const stats = Object.fromEntries(
      Object.entries(draft.stats).filter(
        ([id, s]) => draft.attendance.includes(id) && (s.goals || s.assists || s.yellow || s.red),
      ),
    );
    setBusy(true);
    const ok = await mutate(
      "entries.json",
      (f) => ({ entries: { ...f.entries, [match.id]: { ...draft, stats } } }),
      `stats ${match.home} - ${match.away}`,
    );
    setBusy(false);
    if (ok) onDone();
  }

  async function remove() {
    setBusy(true);
    const ok = await mutate(
      "entries.json",
      (f) => {
        const entries = { ...f.entries };
        delete entries[match.id];
        return { entries };
      },
      `stats gewist ${match.home} - ${match.away}`,
    );
    setBusy(false);
    if (ok) onDone();
  }

  const step = (id: string, k: "goals" | "assists", label: string) => {
    const v = st(id)[k];
    return (
      <span className={`step ${v ? "on" : ""}`}>
        <button type="button" aria-label={`${label} min`} onClick={() => setSt(id, { [k]: Math.max(0, v - 1) })}>
          −
        </button>
        <b>
          {v} {label}
        </b>
        <button type="button" aria-label={`${label} plus`} onClick={() => setSt(id, { [k]: v + 1 })}>
          +
        </button>
      </span>
    );
  };

  // Geel-knop: uit → G → 2G (tweede geel = rood) → uit. R = direct rood.
  const yellowState = (s: PlayerMatchStats) => (s.yellow && s.red ? 2 : s.yellow ? 1 : 0);
  const cycleYellow = (id: string) => {
    const s = yellowState(st(id));
    setSt(id, s === 0 ? { yellow: true, red: false } : s === 1 ? { yellow: true, red: true } : { yellow: false, red: false });
  };
  const toggleRed = (id: string) => {
    const s = st(id);
    const direct = s.red && !s.yellow;
    setSt(id, { red: !direct, yellow: false });
  };

  return (
    <>
      <section className="box">
        <div className="box-h">
          <p className="lbl">1 · Aanwezig</p>
          <span className="meta">{present.length} geselecteerd</span>
        </div>
        <div className="box-b">
          <label className="f">
            Plak de lijst die je voor de wedstrijd krijgt
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={"1. Tom Rietveld\n2. Jasper van Eeuwijk\n3. Luuk Bobbe"}
            />
          </label>
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn primary" type="button" onClick={processList} disabled={!paste.trim()}>
              Lijst verwerken
            </button>
          </div>

          {unknown.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="meta" style={{ margin: "0 0 4px" }}>
                Nieuwe namen: kies of het een leenspeler is of iemand van de vaste selectie.
              </p>
              {unknown.map((u, i) => (
                <div className="unk" key={u.name}>
                  <span>{u.name}</span>
                  <div className="seg">
                    {(["leen", "vast"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={u.type === t}
                        onClick={() => setUnknown((xs) => xs.map((x, j) => (j === i ? { ...x, type: t } : x)))}
                      >
                        {t === "leen" ? "Leen" : "Selectie"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="actions">
                <button className="btn" type="button" onClick={addUnknown} disabled={busy}>
                  Toevoegen
                </button>
              </div>
            </div>
          )}

          <p className="meta" style={{ margin: "12px 0 6px" }}>
            Of tik spelers aan:
          </p>
          <div className="chips">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed={draft.attendance.includes(p.id)}
                onClick={() => togglePresent(p.id)}
              >
                {playerLabel(p)}
                {p.type === "leen" && <span className="t">leen</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="box" style={{ marginTop: 14 }}>
        <div className="box-h">
          <p className="lbl">2 · Stats</p>
          <span className="meta">
            {them} tegen · clean sheet {them === 0 ? "ja" : "nee"}
          </span>
        </div>
        <div className="box-b">
          {present.length === 0 ? (
            <span className="muted">Selecteer eerst wie er aanwezig was.</span>
          ) : (
            <>
              {present.map((p) => {
                const s = st(p.id);
                const y = yellowState(s);
                return (
                  <div className="prow" key={p.id}>
                    <div className="nm">
                      {playerLabel(p)}
                      <small>
                        {p.position}
                        {p.type === "leen" && (
                          <>
                            {" · "}
                            <span className="leen">leen</span>
                          </>
                        )}
                      </small>
                    </div>
                    <div className="ctrls">
                      {step(p.id, "goals", "goal")}
                      {step(p.id, "assists", "assist")}
                      <button
                        type="button"
                        className="tg y"
                        aria-pressed={y > 0}
                        aria-label={y === 2 ? "Tweede gele kaart (rood)" : "Gele kaart"}
                        onClick={() => cycleYellow(p.id)}
                        style={y === 2 ? { background: "linear-gradient(90deg,var(--draw) 50%,var(--loss) 50%)" } : undefined}
                      >
                        {y === 2 ? "2G" : "G"}
                      </button>
                      <button
                        type="button"
                        className="tg r"
                        aria-pressed={s.red && !s.yellow}
                        aria-label="Rode kaart"
                        onClick={() => toggleRed(p.id)}
                      >
                        R
                      </button>
                      <button
                        type="button"
                        className="tg k"
                        aria-pressed={draft.keeperId === p.id}
                        aria-label="Keeper"
                        onClick={() => setDraft((d) => ({ ...d, keeperId: d.keeperId === p.id ? null : p.id }))}
                      >
                        Keeper
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="prow">
                <div className="nm muted">Eigen goal tegenstander</div>
                <div className="ctrls">
                  <span className={`step ${draft.opponentOwnGoals ? "on" : ""}`}>
                    <button
                      type="button"
                      aria-label="Eigen goal min"
                      onClick={() => setDraft((d) => ({ ...d, opponentOwnGoals: Math.max(0, d.opponentOwnGoals - 1) }))}
                    >
                      −
                    </button>
                    <b>{draft.opponentOwnGoals}</b>
                    <button
                      type="button"
                      aria-label="Eigen goal plus"
                      onClick={() => setDraft((d) => ({ ...d, opponentOwnGoals: d.opponentOwnGoals + 1 }))}
                    >
                      +
                    </button>
                  </span>
                </div>
              </div>
              <div className={`note ${sum === us ? "ok" : "warn"}`}>
                {sum} van {us} goals toegewezen.
              </div>
            </>
          )}
        </div>
      </section>

      <div className="actions">
        <button className="btn primary" type="button" onClick={save} disabled={busy}>
          {busy ? "Opslaan…" : "Opslaan"}
        </button>
        <button className="btn" type="button" onClick={onDone}>
          Annuleren
        </button>
        {existing && (
          <button className="btn" type="button" onClick={remove} disabled={busy}>
            Wissen
          </button>
        )}
      </div>
    </>
  );
}

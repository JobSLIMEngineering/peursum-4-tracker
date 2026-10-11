"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { parseAttendance } from "@/lib/domain/attendance";
import { removePlayer, toDraft, toEntry, type CardKind, type EntryDraft, type GoalSlot } from "@/lib/domain/entry";
import { ourScore, playerLabel, POSITIONS, type GoalKind } from "@/lib/domain/types";
import type { StoredPlayer } from "@/lib/store/schema";
import type { ViewMatch } from "@/lib/store/view";

export function sortPlayers(players: StoredPlayer[]) {
  return [...players].sort(
    (a, b) =>
      Number(a.type === "leen") - Number(b.type === "leen") ||
      POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) ||
      Number(!!a.hiddenNo) - Number(!!b.hiddenNo) ||
      playerLabel(a).localeCompare(playerLabel(b), "nl"),
  );
}

/** Aanvallers eerst bij het kiezen van een scorer of assist */
const SCORER_ORDER = ["Aanvaller", "Middenvelder", "Verdediger", "Onbekend", "Keeper"];
const byScoringChance = (a: StoredPlayer, b: StoredPlayer) =>
  SCORER_ORDER.indexOf(a.position) - SCORER_ORDER.indexOf(b.position) ||
  playerLabel(a).localeCompare(playerLabel(b), "nl");

const KIND_LABEL: Record<GoalKind, string> = { spel: "Uit spel", penalty: "Penalty", "vrije trap": "Vrije trap" };
const CARD_LABEL: Record<CardKind, string> = { geel: "Geel", "2geel": "2× geel (rood)", rood: "Rood" };

/**
 * Invoer na een wedstrijd (PLAN.md §4), per doelpunt:
 * 1 Aanwezig · 2 Keeper · 3 Doelpunten (één regel per eigen goal) · 4 Kaarten en eigen goals.
 */
export function EntryForm({ match, onDone }: { match: ViewMatch; onDone: () => void }) {
  const { view, mutate } = useData();
  const [us, them] = ourScore(match)!;
  const existing = view.entries[match.id];
  const [draft, setDraft] = useState<EntryDraft>(() => toDraft(existing, us));
  const [busy, setBusy] = useState(false);
  // Welke doelpuntregel openstaat; standaard de eerste die nog leeg is
  const [openGoal, setOpenGoal] = useState<number | null>(() => {
    const i = toDraft(existing, us).goals.findIndex((g) => g.scorerId === undefined);
    return i === -1 ? null : i;
  });
  const [adding, setAdding] = useState<null | { what: "card" | "og"; playerId?: string }>(null);

  const players = sortPlayers(view.players.filter((p) => p.active));
  const present = players.filter((p) => draft.attendance.includes(p.id));
  const scorers = [...present].sort(byScoringChance);
  const name = (id: string | null | undefined) => (id ? playerLabel(view.players.find((p) => p.id === id)) : "");
  const filled = draft.goals.filter((g) => g.scorerId !== undefined).length;

  const setGoal = (i: number, patch: Partial<GoalSlot>) =>
    setDraft((d) => ({ ...d, goals: d.goals.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));

  /** Na het kiezen van de assist (of eigen goal tegenstander): door naar de volgende lege regel */
  const advance = (from: number) => {
    const next = draft.goals.findIndex((g, j) => j > from && g.scorerId === undefined);
    setOpenGoal(next === -1 ? null : next);
  };

  async function save() {
    setBusy(true);
    const ok = await mutate(
      "entries.json",
      (f) => ({ entries: { ...f.entries, [match.id]: toEntry(draft, match.id) } }),
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

  return (
    <>
      <Attendance
        players={players}
        attendance={draft.attendance}
        onAdd={(ids) => setDraft((d) => ({ ...d, attendance: [...new Set([...d.attendance, ...ids])] }))}
        onToggle={(id) =>
          setDraft((d) => (d.attendance.includes(id) ? removePlayer(d, id) : { ...d, attendance: [...d.attendance, id] }))
        }
      />

      {present.length === 0 ? (
        <p className="note warn">Selecteer eerst wie er aanwezig was; daarna vul je keeper, doelpunten en kaarten in.</p>
      ) : (
        <>
          {/* 2 · Keeper */}
          <section className="box" style={{ marginTop: 14 }}>
            <div className="box-h">
              <p className="lbl">2 · Keeper</p>
              <span className="meta">
                {them} tegen · clean sheet {them === 0 ? "ja" : "nee"}
              </span>
            </div>
            <div className="box-b chips">
              {[...present]
                .sort((a, b) => Number(b.position === "Keeper") - Number(a.position === "Keeper"))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="chip"
                    aria-pressed={draft.keeperId === p.id}
                    onClick={() => setDraft((d) => ({ ...d, keeperId: d.keeperId === p.id ? null : p.id }))}
                  >
                    {playerLabel(p)}
                  </button>
                ))}
            </div>
          </section>

          {/* 3 · Doelpunten */}
          <section className="box" style={{ marginTop: 14 }}>
            <div className="box-h">
              <p className="lbl">3 · Doelpunten</p>
              <span className={`meta ${filled === us ? "" : "todo"}`}>
                {filled} van {us} ingevuld
              </span>
            </div>
            {us === 0 ? (
              <div className="box-b muted">Geen doelpunten gemaakt.</div>
            ) : (
              <ol className="goals">
                {draft.goals.map((g, i) => {
                  const isOpen = openGoal === i;
                  return (
                    <li key={i} className={`goal ${isOpen ? "open" : ""} ${g.scorerId === undefined ? "empty" : ""}`}>
                      <button type="button" className="goal-sum" onClick={() => setOpenGoal(isOpen ? null : i)}>
                        <span className="goal-no">{i + 1}</span>
                        <span className="goal-txt">
                          {g.scorerId === undefined ? (
                            <span className="todo">Wie scoorde?</span>
                          ) : g.scorerId === null ? (
                            <b>Eigen goal tegenstander</b>
                          ) : (
                            <>
                              <b>{name(g.scorerId)}</b>
                              {g.kind !== "spel" && <span className="goal-kind">{KIND_LABEL[g.kind]}</span>}
                              {g.assistId && <small className="meta">assist {name(g.assistId)}</small>}
                            </>
                          )}
                        </span>
                        <span className={`chev ${isOpen ? "up" : ""}`} aria-hidden="true" />
                      </button>

                      {isOpen && (
                        <div className="goal-pick">
                          <p className="pick-q">Wie scoorde?</p>
                          <div className="chips">
                            {scorers.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="chip"
                                aria-pressed={g.scorerId === p.id}
                                onClick={() =>
                                  setGoal(i, { scorerId: p.id, assistId: g.assistId === p.id ? null : g.assistId })
                                }
                              >
                                {playerLabel(p)}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="chip og"
                              aria-pressed={g.scorerId === null}
                              onClick={() => {
                                setGoal(i, { scorerId: null, assistId: null, kind: "spel" });
                                advance(i);
                              }}
                            >
                              Eigen goal tegenstander
                            </button>
                          </div>

                          {g.scorerId && (
                            <>
                              <p className="pick-q">Soort</p>
                              <div className="seg">
                                {(["spel", "penalty", "vrije trap"] as GoalKind[]).map((k) => (
                                  <button
                                    key={k}
                                    type="button"
                                    aria-pressed={g.kind === k}
                                    onClick={() => setGoal(i, { kind: k })}
                                  >
                                    {KIND_LABEL[k]}
                                  </button>
                                ))}
                              </div>
                              <p className="pick-q">Assist</p>
                              <div className="chips">
                                <button
                                  type="button"
                                  className="chip"
                                  aria-pressed={!g.assistId}
                                  onClick={() => {
                                    setGoal(i, { assistId: null });
                                    advance(i);
                                  }}
                                >
                                  Geen assist
                                </button>
                                {scorers
                                  .filter((p) => p.id !== g.scorerId)
                                  .map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className="chip"
                                      aria-pressed={g.assistId === p.id}
                                      onClick={() => {
                                        setGoal(i, { assistId: p.id });
                                        advance(i);
                                      }}
                                    >
                                      {playerLabel(p)}
                                    </button>
                                  ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* 4 · Kaarten en eigen goals */}
          <section className="box" style={{ marginTop: 14 }}>
            <div className="box-h">
              <p className="lbl">4 · Kaarten en eigen goals</p>
            </div>
            <div className="box-b">
              {draft.cards.map((c, i) => (
                <div className="ev" key={`c${i}`}>
                  <span>
                    <span className={`ci ${c.kind === "geel" ? "cy" : "cr"}`} /> {CARD_LABEL[c.kind]} · {name(c.playerId)}
                  </span>
                  <button
                    type="button"
                    className="link"
                    aria-label={`Kaart van ${name(c.playerId)} weghalen`}
                    onClick={() => setDraft((d) => ({ ...d, cards: d.cards.filter((_, j) => j !== i) }))}
                  >
                    weg
                  </button>
                </div>
              ))}
              {draft.ownGoals.map((id, i) => (
                <div className="ev" key={`o${i}`}>
                  <span>
                    <span className="og-dot" /> Eigen goal · {name(id)}
                  </span>
                  <button
                    type="button"
                    className="link"
                    aria-label={`Eigen goal van ${name(id)} weghalen`}
                    onClick={() => setDraft((d) => ({ ...d, ownGoals: d.ownGoals.filter((_, j) => j !== i) }))}
                  >
                    weg
                  </button>
                </div>
              ))}
              {!draft.cards.length && !draft.ownGoals.length && !adding && (
                <p className="meta" style={{ margin: "0 0 8px" }}>
                  Geen kaarten of eigen goals.
                </p>
              )}

              {adding ? (
                <div className="goal-pick" style={{ marginTop: 8 }}>
                  <p className="pick-q">{adding.what === "card" ? "Kaart voor" : "Eigen goal van"}</p>
                  <div className="chips">
                    {present.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="chip"
                        aria-pressed={adding.playerId === p.id}
                        onClick={() => {
                          if (adding.what === "og") {
                            setDraft((d) => ({ ...d, ownGoals: [...d.ownGoals, p.id] }));
                            setAdding(null);
                          } else setAdding({ what: "card", playerId: p.id });
                        }}
                      >
                        {playerLabel(p)}
                      </button>
                    ))}
                  </div>
                  {adding.what === "card" && adding.playerId && (
                    <>
                      <p className="pick-q">Welke kaart?</p>
                      <div className="cardpick">
                        {(["geel", "2geel", "rood"] as CardKind[]).map((k) => (
                          <button
                            key={k}
                            type="button"
                            className={`card-btn ${k}`}
                            onClick={() => {
                              const pid = adding.playerId!;
                              // Eén kaartregel per speler per wedstrijd
                              setDraft((d) => ({
                                ...d,
                                cards: [...d.cards.filter((c) => c.playerId !== pid), { playerId: pid, kind: k }],
                              }));
                              setAdding(null);
                            }}
                          >
                            <span className="card-ico" aria-hidden="true" />
                            {CARD_LABEL[k]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="actions">
                    <button className="btn sm" type="button" onClick={() => setAdding(null)}>
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <div className="actions" style={{ marginTop: 4 }}>
                  <button className="btn sm" type="button" onClick={() => setAdding({ what: "card" })}>
                    + Kaart
                  </button>
                  <button className="btn sm" type="button" onClick={() => setAdding({ what: "og" })}>
                    + Eigen goal (van ons)
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Opslaan-balk: altijd in beeld */}
      <div className="savebar">
        <span className="meta">
          {draft.attendance.length} aanwezig · {filled}/{us} goals
        </span>
        {existing && (
          <button className="btn" type="button" onClick={remove} disabled={busy}>
            Wissen
          </button>
        )}
        <button className="btn" type="button" onClick={onDone}>
          Annuleren
        </button>
        <button className="btn primary" type="button" onClick={save} disabled={busy}>
          {busy ? "Opslaan…" : "Opslaan"}
        </button>
      </div>
    </>
  );
}

/** 1 · Aanwezig: lijst plakken (met herkenning van namen) of spelers aantikken */
function Attendance({
  players,
  attendance,
  onAdd,
  onToggle,
}: {
  players: StoredPlayer[];
  attendance: string[];
  onAdd: (ids: string[]) => void;
  onToggle: (id: string) => void;
}) {
  const { view, mutate } = useData();
  const [paste, setPaste] = useState("");
  // Nieuwe namen: leenspeler, vaste selectie, naam van een afgeschermde speler ("p:<id>"),
  // of een andere schrijfwijze van een bestaande speler ("a:<id>", wordt als bijnaam onthouden)
  const [unknown, setUnknown] = useState<{ name: string; choice: string }[]>([]);
  const [ambiguous, setAmbiguous] = useState<{ name: string; options: string[] }[]>([]);
  const [busy, setBusy] = useState(false);
  const [showPaste, setShowPaste] = useState(attendance.length === 0);
  const hiddenFree = players.filter((p) => p.hiddenNo && !p.name);

  function processList() {
    const r = parseAttendance(paste, players);
    onAdd(r.found);
    setUnknown(r.unknown.map((u) => ({ name: u.name, choice: "leen" })));
    setAmbiguous(r.ambiguous);
    setShowPaste(false);
    setPaste("");
  }

  async function addUnknown() {
    const named = unknown.filter((u) => u.choice.startsWith("p:")).map((u) => ({ id: u.choice.slice(2), name: u.name }));
    const alias = unknown.filter((u) => u.choice.startsWith("a:")).map((u) => ({ id: u.choice.slice(2), name: u.name }));
    const created: StoredPlayer[] = unknown
      .filter((u) => u.choice === "leen" || u.choice === "vast")
      .map((u) => ({
        id: `p-${crypto.randomUUID().slice(0, 8)}`,
        name: u.name,
        position: "Onbekend",
        type: u.choice === "vast" ? "vast" : "leen",
        hiddenNo: null,
        active: true,
        clubName: null,
      }));
    setBusy(true);
    const ok = await mutate(
      "players.json",
      (f) => ({
        players: [
          ...f.players.map((p) => {
            const n = named.find((x) => x.id === p.id);
            const extra = alias.filter((x) => x.id === p.id).map((x) => x.name);
            return {
              ...p,
              ...(n ? { name: n.name } : {}),
              ...(extra.length ? { aliases: [...new Set([...(p.aliases ?? []), ...extra])] } : {}),
            };
          }),
          ...created,
        ],
      }),
      `spelers: ${unknown.map((u) => u.name).join(", ")}`,
    );
    setBusy(false);
    if (!ok) return;
    onAdd([...named.map((n) => n.id), ...alias.map((n) => n.id), ...created.map((p) => p.id)]);
    setUnknown([]);
  }

  return (
    <section className="box">
      <div className="box-h">
        <p className="lbl">1 · Aanwezig</p>
        <span className="meta">{attendance.length} geselecteerd</span>
      </div>
      <div className="box-b">
        {showPaste ? (
          <>
            <label className="f">
              Plak de lijst uit de app
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={"Goedemorgen,\nTom\nBobbe\nJasper"}
              />
            </label>
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn primary" type="button" onClick={processList} disabled={!paste.trim()}>
                Lijst verwerken
              </button>
            </div>
          </>
        ) : (
          <button className="link" type="button" onClick={() => setShowPaste(true)}>
            Lijst plakken
          </button>
        )}

        {ambiguous.map((a) => (
          <div key={a.name} style={{ marginTop: 12 }}>
            <p className="meta" style={{ margin: "0 0 6px" }}>
              Welke <b style={{ color: "#fff" }}>{a.name}</b>?
            </p>
            <div className="chips">
              {a.options.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="chip"
                  onClick={() => {
                    onAdd([id]);
                    setAmbiguous((xs) => xs.filter((x) => x.name !== a.name));
                  }}
                >
                  {playerLabel(view.players.find((p) => p.id === id))}
                </button>
              ))}
              <button type="button" className="chip" onClick={() => setAmbiguous((xs) => xs.filter((x) => x.name !== a.name))}>
                Geen van beide
              </button>
            </div>
          </div>
        ))}

        {unknown.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p className="meta" style={{ margin: "0 0 4px" }}>
              Nieuwe namen: kies wie het is. Een andere schrijfwijze onthoudt de app voor de volgende keer.
            </p>
            {unknown.map((u, i) => {
              const taken = unknown.filter((x, j) => j !== i).map((x) => x.choice);
              return (
                <div className="unk" key={u.name}>
                  <span>{u.name}</span>
                  <select
                    aria-label={`${u.name}: soort speler`}
                    value={u.choice}
                    onChange={(e) => setUnknown((xs) => xs.map((x, j) => (j === i ? { ...x, choice: e.target.value } : x)))}
                    style={{ width: "auto" }}
                  >
                    <option value="leen">Leenspeler</option>
                    <option value="vast">Vaste selectie</option>
                    {hiddenFree.length > 0 && (
                      <optgroup label="Naam van afgeschermde speler">
                        {hiddenFree.map((p) => (
                          <option key={p.id} value={`p:${p.id}`} disabled={taken.includes(`p:${p.id}`)}>
                            Afgeschermd {p.hiddenNo}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Andere schrijfwijze van">
                      {players
                        .filter((p) => p.name)
                        .map((p) => (
                          <option key={p.id} value={`a:${p.id}`}>
                            {p.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              );
            })}
            <div className="actions">
              <button className="btn" type="button" onClick={addUnknown} disabled={busy}>
                Toevoegen
              </button>
              <button className="btn" type="button" onClick={() => setUnknown([])}>
                Overslaan
              </button>
            </div>
          </div>
        )}

        <p className="meta" style={{ margin: "12px 0 6px" }}>
          Tik aan wie er was:
        </p>
        <div className="chips">
          {players.map((p) => (
            <button key={p.id} type="button" className="chip" aria-pressed={attendance.includes(p.id)} onClick={() => onToggle(p.id)}>
              {playerLabel(p)}
              {p.type === "leen" && <span className="t">leen</span>}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Badges, AWARD_TITLE } from "@/components/Badges";
import { sortPlayers } from "@/components/competition/EntryForm";
import { useData } from "@/components/DataProvider";
import { InfoTip } from "@/components/InfoTip";
import { Shirt } from "@/components/Shirt";
import { Box } from "@/components/ui";
import { playerTotals, type PlayerTotals } from "@/lib/domain/stats";
import { playerLabel, POSITIONS, type Position } from "@/lib/domain/types";
import type { StoredPlayer } from "@/lib/store/schema";

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");
const signed = (x: number) => (x >= 0 ? "+" : "−") + comma(Math.abs(x));

/** Laat een wijziging in de tegels soepel verlopen (groeien/verschuiven) waar de browser dat kan */
function withTransition(fn: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return fn();
  doc.startViewTransition(() => flushSync(fn));
}

/** Spelers: tegels (2 per rij op de telefoon) die uitvouwen naar 2×2 met alle stats */
export default function TeamPage() {
  const { view, mutate, readOnly } = useData();
  const totals = playerTotals(view.players, view.matches, Object.values(view.entries));
  const players = sortPlayers(view.players.filter((p) => p.active));
  const vast = players.filter((p) => p.type === "vast");
  const leen = players.filter((p) => p.type === "leen");
  const scorers = players
    .filter((p) => totals[p.id]?.goals || totals[p.id]?.ownGoals)
    .sort((a, b) => totals[b.id].goals - totals[a.id].goals || totals[b.id].penalties - totals[a.id].penalties);
  const keepers = players
    .filter((p) => totals[p.id]?.keeperGames)
    .sort((a, b) => totals[b.id].keeperGames - totals[a.id].keeperGames);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pos, setPos] = useState<Position>("Onbekend");

  const toggle = (id: string | null) => withTransition(() => setOpen((o) => (o === id ? null : id)));

  const update = (id: string, patch: Partial<StoredPlayer>, msg: string) =>
    mutate("players.json", (f) => ({ players: f.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }), msg);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const ok = await mutate(
      "players.json",
      (f) => ({
        players: [
          ...f.players,
          { id: `p-${crypto.randomUUID().slice(0, 8)}`, name: n, position: pos, type: "vast", hiddenNo: null, active: true, clubName: null },
        ],
      }),
      `speler toegevoegd: ${n}`,
    );
    if (ok) {
      setName("");
      setPos("Onbekend");
    }
  }

  const tiles = (list: StoredPlayer[]) => (
    <div className="tiles">
      {list.map((p) => (
        <Tile key={p.id} p={p} t={totals[p.id]} open={open === p.id} onToggle={() => toggle(p.id)} update={update} />
      ))}
    </div>
  );

  // Met of zonder: alleen voor de eigenaar (kan gevoelig liggen)
  const impact = readOnly
    ? []
    : players
        .filter((p) => view.impacts[p.id]?.games)
        .sort((a, b) => view.impacts[b.id].pointsImpact - view.impacts[a.id].pointsImpact);
  const maxImp = Math.max(0.3, ...impact.map((p) => Math.abs(view.impacts[p.id].pointsImpact)));

  return (
    <>
      <div className="sec-h">
        <p className="lbl">Selectie</p>
        <span className="meta">{vast.length} spelers · tik voor stats</span>
      </div>
      {tiles(vast)}

      {leen.length > 0 && (
        <>
          <div className="sec-h">
            <p className="lbl">Leenspelers</p>
            <span className="meta">via de aanwezigheidslijst</span>
          </div>
          {tiles(leen)}
        </>
      )}

      {!readOnly && (
        <Box label="Speler toevoegen" style={{ marginTop: 16 }}>
          <form className="actions" style={{ alignItems: "end", marginTop: 0 }} onSubmit={add}>
            <label className="f" style={{ flex: 1, minWidth: 160 }}>
              Naam
              <input type="text" required placeholder="Voornaam Achternaam" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="f" style={{ width: 150 }}>
              Positie
              <select value={pos} onChange={(e) => setPos(e.target.value as Position)}>
                {POSITIONS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <button className="btn" type="submit">
              Toevoegen
            </button>
          </form>
        </Box>
      )}

      <div className="grid2" style={{ marginTop: 16 }}>
        <Box label="Doelpunten" right={<span className="meta">per soort</span>} bodyClass={scorers.length ? "tbl-wrap" : "box-b muted"}>
          {scorers.length ? (
            <table className="compact">
              <thead>
                <tr>
                  <th className="t">Speler</th>
                  <th>Goals</th>
                  <th>Spel</th>
                  <th>Pen.</th>
                  <th>VT</th>
                  <th>Eigen</th>
                </tr>
              </thead>
              <tbody>
                {scorers.map((p) => {
                  const t = totals[p.id];
                  return (
                    <tr key={p.id}>
                      <td className="t">
                        {playerLabel(p)} <Badges playerId={p.id} />
                      </td>
                      <td className="pts">{t.goals || "–"}</td>
                      <td>{t.goals - t.penalties - t.freeKicks || "–"}</td>
                      <td>{t.penalties || "–"}</td>
                      <td>{t.freeKicks || "–"}</td>
                      <td style={t.ownGoals ? { color: "var(--loss)" } : undefined}>{t.ownGoals || "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            "Nog geen doelpunten ingevoerd."
          )}
        </Box>

        <Box label="Keepers" right={<span className="meta">wie stond er op doel</span>} bodyClass={keepers.length ? "tbl-wrap" : "box-b muted"}>
          {keepers.length ? (
            <table className="compact">
              <thead>
                <tr>
                  <th className="t">Keeper</th>
                  <th>Duels</th>
                  <th>Nul</th>
                  <th>Tegen</th>
                  <th>Gem.</th>
                </tr>
              </thead>
              <tbody>
                {keepers.map((p) => {
                  const k = totals[p.id];
                  return (
                    <tr key={p.id}>
                      <td className="t">
                        {playerLabel(p)} <Badges playerId={p.id} />
                      </td>
                      <td>{k.keeperGames}</td>
                      <td className="pts">{k.cleanSheets}</td>
                      <td>{k.goalsAgainst}</td>
                      <td>{comma(k.goalsAgainst / k.keeperGames)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            "Kies bij het invoeren van een wedstrijd wie er keepte."
          )}
        </Box>
      </div>

      {impact.length > 0 && (
        <Box
          label="Met of zonder"
          style={{ marginTop: 16 }}
          bodyClass={null}
          right={
            <InfoTip label="Wat betekent dit?">
              Punten per duel boven wat het model verwachtte (tegen deze tegenstanders) als hij er was, vergeleken met
              als hij er niet was. Duels waarin hij geblesseerd was tellen niet. Afgevlakt, zodat een paar duels geen
              gekke uitschieters geven. Alleen zichtbaar als je bent ingelogd.
            </InfoTip>
          }
        >
          <div className="impact" style={{ paddingBottom: 8 }}>
            {impact.map((p) => {
              const i = view.impacts[p.id];
              const w = (Math.abs(i.pointsImpact) / maxImp) * 50;
              return (
                <div key={p.id} className={`imp-row ${i.eligible ? "" : "few"}`}>
                  <span>{playerLabel(p)}</span>
                  <span className="imp-bar" aria-hidden="true">
                    <span className={i.pointsImpact >= 0 ? "up" : "down"} style={{ width: `${w}%` }} />
                  </span>
                  <span className="num">{signed(i.pointsImpact)}</span>
                </div>
              );
            })}
          </div>
        </Box>
      )}
    </>
  );
}

function Tile({
  p,
  t,
  open,
  onToggle,
  update,
}: {
  p: StoredPlayer;
  t: PlayerTotals | undefined;
  open: boolean;
  onToggle: () => void;
  update: (id: string, patch: Partial<StoredPlayer>, msg: string) => Promise<boolean>;
}) {
  const { view, readOnly } = useData();
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const keeper = p.position === "Keeper" || (t?.keeperGames ?? 0) > (t?.appearances ?? 0) / 2;
  const style = { viewTransitionName: `tile-${p.id}` } as React.CSSProperties;
  const cls = `tile ${p.type === "leen" ? "leen" : ""} ${p.position === "Keeper" ? "keeper" : ""}`;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 400);
    return () => clearTimeout(timer);
  }, [open]);

  const stat = (v: number | undefined, label: string) => (
    <span>
      <b className={v ? "" : "zero"}>{v ?? 0}</b>
      <small>{label}</small>
    </span>
  );

  if (!open) {
    return (
      // Geen <button>: de iconen erin zijn zelf knoppen
      <div
        role="button"
        tabIndex={0}
        className={cls}
        style={style}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle())}
        aria-expanded="false"
      >
        <span className="tile-top">
          <Shirt player={p} size={52} />
          <span className="tile-badges">
            <Badges playerId={p.id} />
          </span>
        </span>
        <span className={`tile-name ${p.name ? "" : "anon"}`}>{playerLabel(p)}</span>
        <span className="k tile-pos">{p.position === "Onbekend" ? "Positie onbekend" : p.position}</span>
        <span className="tile-line">
          {keeper ? (
            <>
              {stat(t?.keeperGames, "duels")}
              {stat(t?.cleanSheets, "nul")}
            </>
          ) : (
            <>
              {stat(t?.goals, "G")}
              {stat(t?.assists, "A")}
              {stat(t?.appearances, "duels")}
            </>
          )}
        </span>
      </div>
    );
  }

  const i = view.impacts[p.id];
  const leads = view.leads[p.id] ?? [];
  const streaks = view.streaks[p.id] ?? [];
  const cards = (t?.yellow ?? 0) + (t?.red ?? 0);
  const box = (v: number | string, label: string, zero = !v) => (
    <div>
      <span className={`num ${zero ? "zero" : ""}`}>{v}</span>
      <span className="k">{label}</span>
    </div>
  );

  return (
    <article ref={ref} className={`${cls} open ${editing ? "editing" : ""}`} style={style} aria-label={playerLabel(p)}>
      <button type="button" className="tile-close" aria-label="Inklappen" onClick={onToggle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <div className="tile-head">
        <Shirt player={p} size={76} />
        <div>
          <div className={`tile-name ${p.name ? "" : "anon"}`}>{playerLabel(p)}</div>
          <div className="k tile-pos">
            {p.position === "Onbekend" ? "Positie onbekend" : p.position}
            {p.type === "leen" && " · leenspeler"}
            {p.number != null && ` · #${p.number}`}
          </div>
          <div style={{ marginTop: 4 }}>
            <Badges playerId={p.id} />
          </div>
        </div>
      </div>

      {editing ? (
        <EditForm p={p} update={update} onDone={() => withTransition(() => setEditing(false))} />
      ) : (
        <>
          <div className="tile-stats">
            {box(t?.appearances ?? 0, "duels")}
            {keeper ? (
              <>
                {box(t?.cleanSheets ?? 0, "de nul")}
                {box(t?.goalsAgainst ?? 0, "tegen")}
                {box(t?.keeperGames ? comma(t.goalsAgainst / t.keeperGames) : "–", "gem.", !t?.keeperGames)}
              </>
            ) : (
              <>
                {box(t?.goals ?? 0, "goals")}
                {box(t?.assists ?? 0, "assists")}
                {box(cards, "kaarten")}
              </>
            )}
          </div>
          <div className="tile-notes">
            {!keeper && (t?.penalties || t?.freeKicks || t?.ownGoals) ? (
              <div>
                {[t.penalties && `${t.penalties} pen.`, t.freeKicks && `${t.freeKicks} vrije trap`, t.ownGoals && `${t.ownGoals} eigen goal`]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ) : null}
            {streaks.map((s) => (
              <div key={s.kind}>
                <span aria-hidden="true">{s.kind === "keeper" ? "🧤" : "🔥"}</span> {s.reason}
              </div>
            ))}
            {leads.map((k) => (
              <div key={k}>
                <span aria-hidden="true">🏆</span> Koploper <b>{AWARD_TITLE[k]}</b>
              </div>
            ))}
            {!readOnly && i?.games ? (
              <div>
                <span aria-hidden="true">📈</span>
                <span>
                  Met hem erbij{" "}
                  <b className={i.pointsImpact >= 0 ? "up" : "down"}>{signed(i.pointsImpact)} pnt/duel</b> t.o.v. zonder
                </span>
              </div>
            ) : null}
            {!readOnly && i?.injured ? (
              <div>
                <span aria-hidden="true">🩹</span> {i.injured}× geblesseerd (telt niet mee)
              </div>
            ) : null}
          </div>
          {!readOnly && (
            <div className="tile-actions">
              <button className="btn sm" type="button" onClick={() => withTransition(() => setEditing(true))}>
                Bewerken
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}

function EditForm({
  p,
  update,
  onDone,
}: {
  p: StoredPlayer;
  update: (id: string, patch: Partial<StoredPlayer>, msg: string) => Promise<boolean>;
  onDone: () => void;
}) {
  const [name, setName] = useState(p.name ?? "");
  const [no, setNo] = useState(p.number != null ? String(p.number) : "");
  const [pos, setPos] = useState<Position>(p.position);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const num = no.trim() === "" ? null : Math.max(0, Math.min(99, Number.parseInt(no, 10)));
    const patch: Partial<StoredPlayer> = {};
    if (n && n !== p.name) patch.name = n;
    if ((Number.isNaN(num) ? null : num) !== (p.number ?? null)) patch.number = Number.isNaN(num) ? null : num;
    if (pos !== p.position) patch.position = pos;
    if (Object.keys(patch).length) void update(p.id, patch, `speler: ${n || playerLabel(p)}`);
    onDone();
  }

  const remove = () => {
    if (!armed) return setArmed(true);
    // Niet echt verwijderen: inactief, zodat de ophaalfunctie hem niet opnieuw toevoegt
    void update(p.id, { active: false }, `speler verwijderd: ${playerLabel(p)}`);
  };

  return (
    <form className="tile-edit" onSubmit={save}>
      <label className="f">
        Naam
        <input type="text" value={name} placeholder={p.hiddenNo ? `Afgeschermd ${p.hiddenNo}` : ""} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="f">
        Nummer
        <input type="number" inputMode="numeric" min={0} max={99} value={no} onChange={(e) => setNo(e.target.value)} />
      </label>
      <label className="f wide">
        Positie
        <select value={pos} onChange={(e) => setPos(e.target.value as Position)}>
          {POSITIONS.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <div className="actions wide" style={{ marginTop: 0 }}>
        <button className="btn sm primary" type="submit">
          Opslaan
        </button>
        <button className="btn sm" type="button" onClick={onDone}>
          Annuleren
        </button>
        {p.type === "leen" && (
          <button className="btn sm" type="button" onClick={() => void update(p.id, { type: "vast" }, `naar selectie: ${playerLabel(p)}`)}>
            → Selectie
          </button>
        )}
        <button className="btn sm" type="button" onClick={remove} style={{ marginLeft: "auto" }}>
          {armed ? "Zeker?" : "Verwijderen"}
        </button>
      </div>
    </form>
  );
}

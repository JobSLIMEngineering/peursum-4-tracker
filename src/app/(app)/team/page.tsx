"use client";

import { useState } from "react";
import { Badges } from "@/components/Badges";
import { CardView } from "@/components/CardView";
import { cardMarks } from "@/components/cardMarks";
import { useData } from "@/components/DataProvider";
import { InfoTip } from "@/components/InfoTip";
import { PlayerCardSvg } from "@/components/PlayerCardSvg";
import { AccessRequests } from "@/components/AccessRequests";
import { ScoutButton } from "@/components/Scouting";
import { useSpecial } from "@/components/reveal";
import { Box } from "@/components/ui";
import { ROLES } from "@/lib/domain/season-stats";
import { playerTotals } from "@/lib/domain/stats";
import { playerLabel, POSITION_ROLE, ROLE_POSITION, type Position, type Role } from "@/lib/domain/types";
import type { StoredPlayer } from "@/lib/store/schema";

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

/** Linies van achter naar voren; "Overig" voor wie nog geen positie heeft */
const LINES: { key: Position; label: string }[] = [
  { key: "Keeper", label: "Keepers" },
  { key: "Verdediger", label: "Verdediging" },
  { key: "Middenvelder", label: "Middenveld" },
  { key: "Aanvaller", label: "Aanval" },
  { key: "Onbekend", label: "Overig" },
];
const ROLE_ORDER: Role[] = ["K", "LB", "CV", "RB", "CM", "LV", "SP", "RV"];
const lineOf = (p: StoredPlayer): Position => (p.role ? ROLE_POSITION[p.role] : p.position);
const roleOf = (p: StoredPlayer): Role => p.role ?? POSITION_ROLE[p.position];

/** Spelers: per linie FIFA-kaartjes (tik = schermvullend met stats); leenspelers als lijstje */
export default function TeamPage() {
  const { view, mutate, readOnly } = useData();
  const totals = playerTotals(view.players, view.matches, Object.values(view.entries));
  const active = view.players.filter((p) => p.active);
  const vast = active.filter((p) => p.type === "vast");
  const leen = active.filter((p) => p.type === "leen").sort((a, b) => playerLabel(a).localeCompare(playerLabel(b), "nl"));
  const [open, setOpen] = useState<string | null>(null);
  const special = useSpecial();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | "">("");

  const scorers = active
    .filter((p) => totals[p.id]?.goals || totals[p.id]?.ownGoals)
    .sort((a, b) => totals[b.id].goals - totals[a.id].goals || totals[b.id].penalties - totals[a.id].penalties);
  const keepers = active.filter((p) => totals[p.id]?.keeperGames).sort((a, b) => totals[b.id].keeperGames - totals[a.id].keeperGames);
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
          {
            id: `p-${crypto.randomUUID().slice(0, 8)}`,
            name: n,
            position: role ? ROLE_POSITION[role] : "Onbekend",
            role: role || null,
            type: "vast",
            hiddenNo: null,
            active: true,
            clubName: null,
          },
        ],
      }),
      `speler toegevoegd: ${n}`,
    );
    if (ok) {
      setName("");
      setRole("");
    }
  }

  const firstLine = LINES.find((l) => vast.some((p) => lineOf(p) === l.key))?.key;

  return (
    <>
      <AccessRequests />
      {!readOnly && <ScoutButton />}
      {LINES.map((line) => {
        const list = vast
          .filter((p) => lineOf(p) === line.key)
          .sort((a, b) => ROLE_ORDER.indexOf(roleOf(a)) - ROLE_ORDER.indexOf(roleOf(b)) || (view.cards[b.id]?.overall ?? 0) - (view.cards[a.id]?.overall ?? 0));
        if (!list.length) return null;
        return (
          <section key={line.key} className="squad-line glass">
            <div className="sec-h">
              <p className="lbl">{line.label}</p>
              <span className="meta">
                {list.length}
                {line.key === firstLine && (
                  <InfoTip label="Hoe werkt de kaart?">
                    <b>Het getal</b> komt uit zes onderdelen (70–99): aanval, aangeven, verdedigen, vorm (laatste 3 duels),
                    inzet (opkomst) en impact. Elk onderdeel is een rangorde binnen de selectie, afgevlakt als je nog weinig
                    speelde. Per positie tellen ze anders mee: een spits vooral op aanval, een verdediger op verdedigen. De
                    keeper heeft in plaats van aanval <b>de nul</b> (aandeel clean sheets, vaste schaal) en verdedigen
                    vergelijkt bij hem de tegengoals t.o.v. verwacht met die van de rest, zonder extra gewicht.
                    <br />
                    Bovenin wordt elk punt lastiger: boven 78 telt een punt nog 0,6, boven 88 nog 0,3. Vanaf <b>85</b> wordt je
                    kaart glimmend goud. Twee of meer duels op rij afwezig (niet door blessure): −1, daarna −1 per duel.
                    <br />
                    <b>Onderaan</b> staan je echte cijfers van het seizoen: WED wedstrijden, GOL goals, AST assists, PNT
                    spelerspunten, MVW man van de wedstrijd, OPK opkomst (blessures tellen niet mee). Bij de keeper NUL clean
                    sheets, TEG tegengoals en VRW goals minder tegen dan verwacht.
                    <br />
                    <b>Rechts op de kaart</b>: ▲ omhoog sinds vorige maand, ▼ aftrek voor afwezigheid, vlammetje = on fire (of handschoen bij een keeper die de nul houdt), pleister = geblesseerd.
                    Veeg de kaart opzij om te zien hoe hij door het seizoen ging.
                  </InfoTip>
                )}
              </span>
            </div>
            <div className="card-grid">
              {list.map((p) => {
                const c = view.cards[p.id];
                if (!c) return null;
                return (
                  // Geen <button>: de icoontjes op de kaart zijn zelf knoppen
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    className="card-tile"
                    onClick={() => setOpen(p.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(p.id))}
                    aria-label={`${playerLabel(p)}, ${c.overall} ${c.pos}`}
                  >
                    <PlayerCardSvg
                      card={c}
                      player={p}
                      gold={view.goldKeepers.has(p.id)}
                      variant={special(p.id)?.variant}
                      banner={special(p.id)?.banner}
                      marks={cardMarks(view, p.id)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {leen.length > 0 && (
        <Box label="Leenspelers" style={{ marginTop: 16 }} bodyClass={null} right={<span className="meta">{leen.length}</span>}>
          <div className="loan-list">
            {leen.map((p) => {
              const t = totals[p.id];
              return (
                <div key={p.id} className="loan-row">
                  <span className="who">
                    <b>{playerLabel(p)}</b>
                    <small>
                      {t?.appearances ?? 0} duels{t?.goals ? ` · ${t.goals} goals` : ""}
                      {t?.assists ? ` · ${t.assists} assists` : ""}
                    </small>
                  </span>
                  {!readOnly && (
                    <span className="actions" style={{ marginTop: 0 }}>
                      <button className="btn sm" type="button" onClick={() => void update(p.id, { type: "vast" }, `naar selectie: ${playerLabel(p)}`)}>
                        → Selectie
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Box>
      )}

      {!readOnly && (
        <Box label="Speler toevoegen" style={{ marginTop: 16 }}>
          <form className="actions" style={{ alignItems: "end", marginTop: 0 }} onSubmit={add}>
            <label className="f" style={{ flex: 1, minWidth: 160 }}>
              Naam
              <input type="text" required placeholder="Voornaam Achternaam" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="f" style={{ width: 190 }}>
              Positie
              <select value={role} onChange={(e) => setRole(e.target.value as Role | "")}>
                <option value="">Onbekend</option>
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
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
        <Box label="Doelpunten" bodyClass={scorers.length ? "tbl-wrap" : "box-b muted"}>
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

        <Box label="Keepers" bodyClass={keepers.length ? "tbl-wrap" : "box-b muted"}>
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

      {open && <CardView playerId={open} onClose={() => setOpen(null)} />}
    </>
  );
}

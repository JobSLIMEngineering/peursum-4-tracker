"use client";

import { useEffect, useState } from "react";
import { sortPlayers } from "@/components/competition/EntryForm";
import { useData } from "@/components/DataProvider";
import { Box } from "@/components/ui";
import { playerTotals, type PlayerTotals } from "@/lib/domain/stats";
import { playerLabel, POSITIONS, type Position } from "@/lib/domain/types";
import type { StoredPlayer } from "@/lib/store/schema";

/** Team: vaste selectie, afgeschermde spelers, leenspelers en keepers (PLAN.md §3.5) */
export default function TeamPage() {
  const { view, mutate } = useData();
  const totals = playerTotals(view.players, view.matches, Object.values(view.entries));
  const players = sortPlayers(view.players.filter((p) => p.active));
  const vast = players.filter((p) => p.type === "vast");
  const leen = players.filter((p) => p.type === "leen");
  const keepers = players.filter((p) => totals[p.id]?.keeperGames);
  const [name, setName] = useState("");
  const [pos, setPos] = useState<Position>("Onbekend");

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
            position: pos,
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
      setPos("Onbekend");
    }
  }

  const table = (list: StoredPlayer[], isLeen: boolean) => (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th className="t">Naam</th>
            <th className="t">Positie</th>
            <th>Opkomst</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>Kaarten</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.length ? (
            list.map((p) => <PlayerRow key={p.id} p={p} t={totals[p.id]} isLeen={isLeen} update={update} />)
          ) : (
            <tr>
              <td className="t muted" colSpan={7}>
                Geen spelers.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="stack">
      <Box label={`Vaste selectie (${vast.length})`} bodyClass={null}>
        {table(vast, false)}
        <form
          className="box-b actions"
          style={{ alignItems: "end", marginTop: 0, borderTop: "1px solid var(--line)" }}
          onSubmit={add}
        >
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

      <Box
        label={`Leenspelers (${leen.length})`}
        right={<span className="meta">komen binnen via de aanwezigheidslijst</span>}
        bodyClass={null}
      >
        {table(leen, true)}
      </Box>

      <Box label="Keepers" bodyClass={keepers.length ? "tbl-wrap" : "box-b muted"}>
        {keepers.length ? (
          <table>
            <thead>
              <tr>
                <th className="t">Keeper</th>
                <th>Duels</th>
                <th>Clean sheets</th>
                <th>Tegen</th>
              </tr>
            </thead>
            <tbody>
              {keepers.map((p) => (
                <tr key={p.id}>
                  <td className="t">{playerLabel(p)}</td>
                  <td>{totals[p.id].keeperGames}</td>
                  <td>{totals[p.id].cleanSheets}</td>
                  <td>{totals[p.id].goalsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          "Nog geen keeper ingevoerd."
        )}
      </Box>
    </div>
  );
}

function PlayerRow({
  p,
  t,
  isLeen,
  update,
}: {
  p: StoredPlayer;
  t: PlayerTotals | undefined;
  isLeen: boolean;
  update: (id: string, patch: Partial<StoredPlayer>, msg: string) => Promise<boolean>;
}) {
  const { mutate } = useData();
  const [name, setName] = useState(p.name ?? "");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  const saveName = () => {
    const n = name.trim();
    if (n && n !== p.name) void update(p.id, { name: n }, `naam: ${n}`);
  };

  const remove = () => {
    if (!armed) return setArmed(true);
    void mutate("players.json", (f) => ({ players: f.players.filter((x) => x.id !== p.id) }), `speler verwijderd: ${playerLabel(p)}`);
  };

  return (
    <tr>
      <td className="t">
        <input
          type="text"
          aria-label="Naam"
          value={name}
          placeholder={p.hiddenNo ? `Afgeschermd ${p.hiddenNo} · naam invullen` : ""}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          style={{ background: "transparent", borderColor: p.name ? "transparent" : "var(--draw)", minWidth: 170 }}
        />
      </td>
      <td className="t" style={{ minWidth: 140 }}>
        <select
          aria-label="Positie"
          value={p.position}
          onChange={(e) => void update(p.id, { position: e.target.value as Position }, `positie ${playerLabel(p)}: ${e.target.value}`)}
        >
          {POSITIONS.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </td>
      <td>{t?.appearances || "–"}</td>
      <td>{t?.goals || "–"}</td>
      <td>{t?.assists || "–"}</td>
      <td>
        {t?.yellow ? (
          <>
            <span className="ci cy" /> {t.yellow}{" "}
          </>
        ) : null}
        {t?.red ? (
          <>
            <span className="ci cr" /> {t.red}
          </>
        ) : null}
        {!t?.yellow && !t?.red && "–"}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        {isLeen && (
          <>
            <button className="btn sm" type="button" onClick={() => void update(p.id, { type: "vast" }, `naar selectie: ${playerLabel(p)}`)}>
              → Selectie
            </button>{" "}
          </>
        )}
        <button className="btn sm" type="button" aria-label={`Verwijder ${playerLabel(p)}`} onClick={remove}>
          {armed ? "Zeker?" : "×"}
        </button>
      </td>
    </tr>
  );
}

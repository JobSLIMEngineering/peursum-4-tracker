"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ROLES } from "@/lib/domain/season-stats";
import { playerLabel, POSITION_ROLE, ROLE_POSITION, type Role } from "@/lib/domain/types";
import { todayNL } from "@/lib/format";
import type { StoredPlayer } from "@/lib/store/schema";
import { Badges } from "./Badges";
import { useData } from "./DataProvider";
import { PlayerCardSvg } from "./PlayerCardSvg";
import { PlayerSeasonStats } from "./PlayerSeasonStats";
import { playerSeason } from "@/lib/domain/season-stats";

/**
 * Spelerskaart schermvullend: de kaart groot in beeld, de rest wazig erachter.
 * Naar beneden scrollen: de statistieken van het seizoen en (voor de eigenaar) bewerken.
 */
export function CardView({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const { view, mutate, readOnly } = useData();
  const [editing, setEditing] = useState(false);
  const p = view.players.find((x) => x.id === playerId);
  const card = view.cards[playerId];

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    // Pagina erachter niet laten meescrollen
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!p || !card) return null;
  const update = (patch: Partial<StoredPlayer>, msg: string) =>
    mutate("players.json", (f) => ({ players: f.players.map((x) => (x.id === p.id ? { ...x, ...patch } : x)) }), msg);
  const hattricks = playerSeason(p.id, view.rows, view.players, view.matches, view.entries).hattricks;

  return createPortal(
    <div className="cardview" role="dialog" aria-label={`Spelerskaart ${playerLabel(p)}`} onClick={onClose}>
      <button type="button" className="cv-close" aria-label="Sluiten" onClick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <div className="cv-body" onClick={(e) => e.stopPropagation()}>
        <div className="cv-card">
          <PlayerCardSvg card={card} player={p} gold={view.goldKeepers.has(p.id)} hattricks={hattricks} />
        </div>
        <div className="cv-badges">
          <Badges playerId={p.id} />
        </div>
        <span className="cv-hint" aria-hidden="true">
          ↓ statistieken
        </span>
        <PlayerSeasonStats playerId={p.id} />

        {!readOnly && (
          <div className="cv-owner">
            {editing ? (
              <EditPlayer p={p} update={update} onDone={() => setEditing(false)} />
            ) : (
              <div className="actions" style={{ marginTop: 0 }}>
                <button className="btn sm" type="button" onClick={() => setEditing(true)}>
                  Bewerken
                </button>
                <button
                  className={`btn sm ${p.injured ? "primary" : ""}`}
                  type="button"
                  aria-pressed={!!p.injured}
                  onClick={() =>
                    void update(p.injured ? { injured: false, recoveredAt: todayNL() } : { injured: true }, `${p.injured ? "weer fit" : "geblesseerd"}: ${playerLabel(p)}`)
                  }
                >
                  {p.injured ? "Weer fit" : "Geblesseerd"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Naam, rugnummer en vaste plek (GK, LB, CB, …); de plek bepaalt ook de linie */
function EditPlayer({
  p,
  update,
  onDone,
}: {
  p: StoredPlayer;
  update: (patch: Partial<StoredPlayer>, msg: string) => Promise<boolean>;
  onDone: () => void;
}) {
  const [name, setName] = useState(p.name ?? "");
  const [no, setNo] = useState(p.number != null ? String(p.number) : "");
  const [role, setRole] = useState<Role | "">(p.role ?? (p.position === "Onbekend" ? "" : POSITION_ROLE[p.position]));
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const num = no.trim() === "" ? null : Math.max(0, Math.min(99, Number.parseInt(no, 10)));
    const patch: Partial<StoredPlayer> = {};
    if (n && n !== p.name) patch.name = n;
    if ((Number.isNaN(num) ? null : num) !== (p.number ?? null)) patch.number = Number.isNaN(num) ? null : num;
    if ((role || null) !== (p.role ?? null)) {
      patch.role = role || null;
      patch.position = role ? ROLE_POSITION[role] : "Onbekend";
    }
    if (Object.keys(patch).length) void update(patch, `speler: ${n || playerLabel(p)}`);
    onDone();
  }

  return (
    <form className="cv-edit" onSubmit={save}>
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
        <select value={role} onChange={(e) => setRole(e.target.value as Role | "")}>
          <option value="">Onbekend</option>
          {ROLES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
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
        <button
          className="btn sm"
          type="button"
          style={{ marginLeft: "auto" }}
          onClick={() => (armed ? void update({ active: false }, `speler verwijderd: ${playerLabel(p)}`) : setArmed(true))}
        >
          {armed ? "Zeker?" : "Verwijderen"}
        </button>
      </div>
    </form>
  );
}

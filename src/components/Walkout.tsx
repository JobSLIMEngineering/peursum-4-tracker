"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useData } from "./DataProvider";
import { PlayerCardSvg, TIERS } from "./PlayerCardSvg";
import { TeamLogo } from "./TeamLogo";
import { US } from "@/lib/domain/types";

const POS_NAME = { K: "Keeper", VER: "Verdediger", MID: "Middenvelder", AAN: "Aanvaller", SPL: "Speler" } as const;

/**
 * Walk-out zoals bij het openen van een pakje in FIFA, maar met de spelerskaart:
 * tik op het pakje → lichtbundel → positie → club → cijfer → de kaart klapt open.
 * `instant` slaat het pakje over en laat direct de kaart zien (bijv. vanuit de spelerslijst).
 */
export function Walkout({
  playerId,
  special = false,
  banner,
  instant = false,
  onClose,
}: {
  playerId: string;
  special?: boolean;
  banner?: string;
  instant?: boolean;
  onClose: () => void;
}) {
  const { view } = useData();
  const [stage, setStage] = useState(instant ? 5 : 0);
  const card = view.cards[playerId];
  const player = view.players.find((p) => p.id === playerId);

  useEffect(() => {
    if (stage === 0 || stage >= 5) return;
    const t = setTimeout(() => setStage((s) => s + 1), stage === 1 ? 1300 : 1000);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!card || !player) return null;
  const tier = special ? "special" : card.tier;
  const glow = special ? "#e1242f" : TIERS[card.tier].b;

  return createPortal(
    <div
      className={`walkout s${stage}`}
      style={{ "--glow": glow } as React.CSSProperties}
      role="dialog"
      aria-label={`Spelerskaart ${player.name ?? ""}`}
      // Klikken in de walk-out niet doorgeven aan de tegel of story eronder
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="wo-beam" aria-hidden="true" />
      <div className="wo-flares" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>

      {stage === 0 && (
        <button type="button" className={`wo-pack ${tier}`} onClick={() => setStage(1)}>
          <span className="wo-pack-logo">
            <TeamLogo team={US} size={84} />
          </span>
          <b>{banner ?? "Spelerskaart"}</b>
          <span className="wo-tap">Tik om te openen</span>
        </button>
      )}

      {stage >= 2 && stage < 5 && (
        <div className="wo-reveal" key={stage}>
          {stage === 2 && <span className="wo-big">{POS_NAME[card.pos]}</span>}
          {stage === 3 && (
            <span className="wo-club">
              <TeamLogo team={US} size={120} />
              <b>Peursum 4</b>
            </span>
          )}
          {stage === 4 && <span className="wo-rating">{card.overall}</span>}
        </div>
      )}

      {stage === 5 && (
        <div className="wo-card">
          <PlayerCardSvg card={card} player={player} gold={view.goldKeepers.has(player.id)} special={special} banner={banner} width={280} />
        </div>
      )}

      <div className="wo-actions">
        {stage === 5 && !instant && (
          <button type="button" className="btn sm" onClick={() => setStage(0)}>
            Nog een keer
          </button>
        )}
        <button type="button" className="btn sm" onClick={onClose}>
          Sluiten
        </button>
      </div>
    </div>,
    document.body,
  );
}

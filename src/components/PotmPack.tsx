"use client";

import { useState } from "react";
import { playerLabel, US } from "@/lib/domain/types";
import { MON_FULL } from "@/lib/format";
import { useData } from "./DataProvider";
import { TeamLogo } from "./TeamLogo";
import { markRevealed, POTM_KEY, useStored } from "./reveal";
import { Walkout } from "./Walkout";

/**
 * Speler van de maand als dicht pakje: pas na openen (walk-out) zie je wie het is.
 * Per apparaat onthouden dat je hem al geopend hebt, dan staat de naam erbij.
 */
export function PotmPack({ compact = false }: { compact?: boolean }) {
  const { view } = useData();
  const potm = view.potms.at(-1);
  const [open, setOpen] = useState(false);
  const key = potm ? `${potm.month}:${potm.playerId}` : "";
  const seen = useStored(POTM_KEY) === key && !!key;

  if (!potm || !view.cards[potm.playerId]) return null;
  const month = MON_FULL[Number(potm.month.slice(5, 7)) - 1];
  const player = view.players.find((p) => p.id === potm.playerId);

  const close = () => {
    setOpen(false);
    markRevealed(POTM_KEY, key);
  };

  return (
    <section className={`potm-pack ${compact ? "compact" : ""}`}>
      <div className="pp-logo" aria-hidden="true">
        <TeamLogo team={US} size={compact ? 44 : 56} />
      </div>
      <div className="pp-txt">
        <span className="k">Speler van {month}</span>
        <b>{seen ? playerLabel(player) : "Wie is het geworden?"}</b>
      </div>
      <button className="btn primary sm" type="button" onClick={() => setOpen(true)}>
        {seen ? "Bekijk kaart" : "Open het pakje"}
      </button>
      {open && <Walkout playerId={potm.playerId} special banner={`Speler van ${month}`} onClose={close} />}
    </section>
  );
}

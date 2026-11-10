"use client";

import { useMemo, useState } from "react";
import { monthsOf, ROLES, teamOfTheMonth, teamOfTheSeason } from "@/lib/domain/season-stats";
import { playerLabel } from "@/lib/domain/types";
import { MON_FULL } from "@/lib/format";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { Shirt } from "./Shirt";
import { CardView } from "./CardView";

const ROLE = Object.fromEntries(ROLES.map((r) => [r.key, r.label]));
const monthName = (ym: string) => MON_FULL[Number(ym.slice(5, 7)) - 1];
/** Achternaam (of voornaam) zodat het op het veldje past */
const short = (name: string | null, label: string) => (name ? name.split(/\s+/).at(-1)! : label);

/** Team van de maand in een 1-4-3-3 op een veldje; blader per maand, tik op een speler voor zijn kaart */
export function TeamOfMonth() {
  const { view } = useData();
  const months = useMemo(() => monthsOf(view.rows), [view]);
  const [i, setI] = useState(months.length - 1);
  const [open, setOpen] = useState<string | null>(null);
  const [season, setSeason] = useState(false);
  const ym = months[Math.min(i, months.length - 1)];
  const team = useMemo(
    () => (season ? teamOfTheSeason(view.rows, view.players) : ym ? teamOfTheMonth(view.rows, view.players, ym) : []),
    [view, ym, season],
  );
  if (!ym) return null;

  return (
    <section className={`box totm ${season ? "tots" : ""}`} style={{ marginTop: 16 }}>
      <div className="seg totm-switch" role="group" aria-label="Team van de maand of van het seizoen">
        <button type="button" aria-pressed={!season} onClick={() => setSeason(false)}>
          Maand
        </button>
        <button type="button" aria-pressed={season} onClick={() => setSeason(true)}>
          Seizoen
        </button>
      </div>
      <div className="box-h">
        <p className="lbl">{season ? "Team van het seizoen" : "Team van de maand"}</p>
        <span className="box-right" hidden={season}>
          <button type="button" className="cal-nav sm" aria-label="Vorige maand" disabled={i <= 0} onClick={() => setI((x) => x - 1)}>
            ‹
          </button>
          <b className="totm-month">{monthName(ym)}</b>
          <button type="button" className="cal-nav sm" aria-label="Volgende maand" disabled={i >= months.length - 1} onClick={() => setI((x) => x + 1)}>
            ›
          </button>
          <InfoTip label="Hoe wordt het team gekozen?">
            Per plek de meeste spelerspunten van die maand. Alleen wie die maand echt meedeed (bij 3 of meer duels
            minstens 2 keer). Eerst iemand met die rol (in te stellen bij Spelers → Bewerken → Rol), anders iemand uit
            dezelfde linie.
          </InfoTip>
        </span>
      </div>
      <div className="pitch">
        {[...team].reverse().map((line, li) => (
          <div key={li} className="pitch-line">
            {line.map((s, j) => {
              const p = s.playerId ? view.players.find((x) => x.id === s.playerId) : undefined;
              return p ? (
                <button key={j} type="button" className="pitch-p" onClick={() => setOpen(p.id)} title={ROLE[s.role]}>
                  <Shirt player={p} size={40} />
                  <span>{short(p.name, playerLabel(p))}</span>
                  <small className={season ? "tots" : ""}>{view.cards[p.id]?.overall ?? ""}</small>
                </button>
              ) : (
                <span key={j} className="pitch-p empty">
                  <span>{ROLE[s.role]}</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {open && (
        <CardView
          playerId={open}
          onClose={() => setOpen(null)}
          {...(season ? { variant: "tots" as const, banner: "Team van het seizoen" } : {})}
        />
      )}
    </section>
  );
}

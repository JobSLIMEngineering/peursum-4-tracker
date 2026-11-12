"use client";

import { useMemo, useState } from "react";
import { chemistry, MIN_TOGETHER, type Chemistry } from "@/lib/domain/chemistry";
import { monthsOf, ROLES, teamOfTheMonth, teamOfTheSeason, type TeamSlot } from "@/lib/domain/season-stats";
import type { StoredPlayer } from "@/lib/store/schema";
import { playerLabel, splitName } from "@/lib/domain/types";
import { MON_FULL } from "@/lib/format";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { Shirt } from "./Shirt";
import { CardView } from "./CardView";

const ROLE = Object.fromEntries(ROLES.map((r) => [r.key, r.label]));
const monthName = (ym: string) => MON_FULL[Number(ym.slice(5, 7)) - 1];
/** Horizontale plek (in %) per aantal spelers in een linie */
const X: Record<number, number[]> = { 1: [50], 2: [30, 70], 3: [17, 50, 83], 4: [12, 37, 63, 88] };
const DEF_ROLES = new Set<string>(["K", "LB", "CV", "RB"]);
/** Achternaam (of voornaam) zodat het op het veldje past */
const short = (name: string | null, label: string) => (name ? splitName(name, 9).last : label);

/** Team van de maand in een 4-2-1-3 (met een tien) op een veldje, met chemielijnen; blader per maand, tik op een speler voor zijn kaart */
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
  // Plek op het veld (in %): van achter (keeper, onderaan) naar voren; de spits iets dieper dan de buitenspelers
  const placed = useMemo(() => {
    const out: { s: TeamSlot; p: StoredPlayer | undefined; x: number; y: number }[] = [];
    const L = team.length;
    team.forEach((line, li) => {
      const xs = X[line.length] ?? line.map((_, j) => ((j + 0.5) / line.length) * 100);
      line.forEach((s, j) => {
        const y = 90 - li * (81 / Math.max(1, L - 1)) + (s.role === "SP" ? 4 : 0);
        out.push({ s, p: s.playerId ? view.players.find((x) => x.id === s.playerId) : undefined, x: xs[j], y });
      });
    });
    return out;
  }, [team, view]);
  const spot = useMemo(() => new Map(placed.filter((x) => x.p).map((x) => [x.p!.id, x])), [placed]);
  // Lijnen: buren in dezelfde linie en de dichtstbijzijnde spelers in de linie erachter; plus duo's
  const links = useMemo(() => {
    const pairs = new Map<string, [string, string]>();
    const add = (a?: string | null, b?: string | null) => {
      if (a && b && a !== b) pairs.set([a, b].sort().join("|"), [a, b]);
    };
    const lines = team.map((line) => line.map((s, j) => ({ id: s.playerId, x: (X[line.length] ?? [])[j] ?? 50 })));
    lines.forEach((line, li) => {
      line.forEach((s, j) => j > 0 && add(line[j - 1].id, s.id));
      const below = lines[li - 1];
      if (!below) return;
      for (const s of line) {
        const near = below.filter((b) => Math.abs(b.x - s.x) <= 26);
        const use = near.length ? near : [...below].sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x)).slice(0, 1);
        for (const b of use) add(s.id, b.id);
      }
    });
    const ids = [...spot.keys()];
    for (const a of ids) for (const b of ids) if (a < b && chemistry(view.rows, a, b).duoGoals >= 2) add(a, b);
    const roleOf = new Map(placed.filter((x) => x.p).map((x) => [x.p!.id, x.s.role]));
    const def = (id: string) => DEF_ROLES.has(roleOf.get(id) ?? "");
    return [...pairs.values()].filter(([a, b]) => spot.has(a) && spot.has(b)).map(([a, b]) => chemistry(view.rows, a, b, def(a) && def(b)));
  }, [team, spot, placed, view]);
  // Wie in dit team het vaakst samen speelde (en hoe vaak we dan wonnen)
  const together = useMemo(() => {
    const ids = [...spot.keys()];
    const all: Chemistry[] = [];
    for (const a of ids) for (const b of ids) if (a < b) all.push(chemistry(view.rows, a, b));
    return all
      .filter((c) => c.games >= MIN_TOGETHER)
      .sort((x, y) => y.games - x.games || y.won / y.games - x.won / x.games)
      .slice(0, 5);
  }, [spot, view]);
  const name = (id: string) => {
    const p = view.players.find((x) => x.id === id);
    return short(p?.name ?? null, playerLabel(p));
  };
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
        {/* Chemielijnen tussen spelers (onder de spelers) */}
        <svg className="pitch-chem" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {links.map((c) => {
            const A = spot.get(c.a)!;
            const B = spot.get(c.b)!;
            const duo = c.duoGoals >= 2;
            return (
              <line
                key={`${c.a}-${c.b}`}
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                className={`chem ${duo ? "duo" : c.level} ${c.defensive && !duo ? "def" : ""}`}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {placed.map(({ s, p, x, y }, j) =>
          p ? (
            <button key={j} type="button" className="pitch-p" style={{ left: `${x}%`, top: `${y}%` }} onClick={() => setOpen(p.id)} title={ROLE[s.role]}>
              <Shirt player={p} size={36} />
              <span>{short(p.name, playerLabel(p))}</span>
              <small className={season ? "tots" : ""}>{view.cards[p.id]?.overall ?? ""}</small>
            </button>
          ) : (
            <span key={j} className="pitch-p empty" style={{ left: `${x}%`, top: `${y}%` }}>
              <span>{ROLE[s.role]}</span>
            </span>
          ),
        )}
      </div>
      <div className="chem-legend">
        <span>
          <i className="ch-goed" /> goed samen
        </span>
        <span>
          <i className="ch-normaal" /> normaal
        </span>
        <span>
          <i className="ch-slecht" /> minder
        </span>
        <span>
          <i className="ch-duo" /> duo
        </span>
        <span>
          <i className="ch-def" /> verdediging
        </span>
        <InfoTip label="Wat betekenen de lijnen?">
          De lijnen laten zien hoe het gaat als twee buren in het team samen op het veld staan, over het hele seizoen.
          <b> Groen</b>: samen minstens 0,25 punt per duel meer dan verwacht. <b>Rood</b>: 0,25 minder.
          <b> Oranje</b>: daartussen, of nog geen 2 duels samen. <b>Gestippeld</b> (keeper en verdedigers onderling): hier
          telt hoeveel goals we samen tegen kregen t.o.v. verwacht (groen bij 0,4 per duel minder tegen, rood bij meer
          tegen dan verwacht). <b>Goud</b>: een duo dat minstens 2 keer scoorde met een assist van de een op de ander.
        </InfoTip>
      </div>
      {together.length > 0 && (
        <div className="chem-list">
          <p className="lbl">Vaak samen op het veld</p>
          {together.map((c) => (
            <div key={`${c.a}-${c.b}`} className="chem-row">
              <i className={`dot ch-${c.duoGoals >= 2 ? "duo" : c.level}`} aria-hidden="true" />
              <span className="who">
                <b>
                  {name(c.a)} &amp; {name(c.b)}
                </b>
                <small>
                  {c.games} duels samen · {c.won}W {c.drawn}G {c.lost}V{c.duoGoals ? ` · ${c.duoGoals}× goal samen` : ""}
                </small>
              </span>
              <span className={`num ${c.won / c.games >= 0.5 ? "up" : ""}`}>{Math.round((c.won / c.games) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
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

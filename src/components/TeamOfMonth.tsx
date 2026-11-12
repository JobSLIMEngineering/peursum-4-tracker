"use client";

import { useEffect, useMemo, useState } from "react";
import { chemistry, MIN_TOGETHER, type Chemistry } from "@/lib/domain/chemistry";
import { monthsOf, ROLES, teamOfTheMonth, teamOfTheSeason, type TeamSlot } from "@/lib/domain/season-stats";
import { playerLabel, splitName } from "@/lib/domain/types";
import { MON_FULL } from "@/lib/format";
import type { StoredPlayer } from "@/lib/store/schema";
import { CardView } from "./CardView";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { markRevealed, TOTM_KEY, useTotmRevealed } from "./reveal";
import { Shirt } from "./Shirt";

const ROLE = Object.fromEntries(ROLES.map((r) => [r.key, r.label]));
const monthName = (ym: string) => MON_FULL[Number(ym.slice(5, 7)) - 1];
/** Achternaam (of voornaam) zodat het op het veldje past */
const short = (name: string | null, label: string) => (name ? splitName(name, 9).last : label);
/** Horizontale plek (in %) per aantal spelers in een linie */
const X: Record<number, number[]> = { 1: [50], 2: [30, 70], 3: [17, 50, 83], 4: [12, 37, 63, 88] };
const DEF_ROLES = new Set<string>(["K", "LB", "CV", "RB"]);
const Y5 = [88, 68, 49, 31, 10];
/** In de aanval staat de spits het hoogst; de buitenspelers iets lager, naast de tien */
const Y_SP = 8;
const Y_WING = 19;
/** Tijd tussen twee linies bij het onthullen */
const STEP_MS = 650;

/**
 * Vaste lijnen zoals bij FIFA, per plek in de 4-2-1-3 ([linie, plek in de linie]):
 * keeper ↔ centrale verdedigers, verdedigers onderling, backs en centrale verdedigers ↔ de middenvelder aan
 * hun kant, de twee middenvelders ↔ elkaar en de tien, de tien ↔ de drie aanvallers, de buitenspelers ↔ de
 * middenvelder aan hun kant, aanvallers onderling.
 */
type Slot = [number, number];
const LINKS: [Slot, Slot][] = [
  [[0, 0], [1, 1]],
  [[0, 0], [1, 2]],
  [[1, 0], [1, 1]],
  [[1, 1], [1, 2]],
  [[1, 2], [1, 3]],
  [[1, 0], [2, 0]],
  [[1, 1], [2, 0]],
  [[1, 2], [2, 1]],
  [[1, 3], [2, 1]],
  [[2, 0], [2, 1]],
  [[2, 0], [3, 0]],
  [[2, 1], [3, 0]],
  [[3, 0], [4, 0]],
  [[3, 0], [4, 1]],
  [[3, 0], [4, 2]],
  [[2, 0], [4, 0]],
  [[2, 1], [4, 2]],
  [[4, 0], [4, 1]],
  [[4, 1], [4, 2]],
];

/**
 * Team van de maand (alleen afgelopen maanden) in een 4-2-1-3 met een tien, met chemielijnen tussen
 * buren. Het team van de laatste maand is eerst een dicht pakje: een leeg veld dat je onthult, waarna het
 * team van achteren naar voren wordt opgebouwd.
 */
export function TeamOfMonth() {
  const { view } = useData();
  const months = useMemo(() => monthsOf(view.rows).filter((m) => m < view.thisMonth), [view]);
  // Hoeveel maanden terug (0 = laatste afgesloten maand), zodat het ook klopt als de data later binnenkomt
  const [back, setBack] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [seasonPick, setSeason] = useState<boolean | null>(null);
  const season = seasonPick ?? months.length === 0;
  const i = Math.max(0, months.length - 1 - back);
  const ym = months[i];
  const revealed = useTotmRevealed();
  // Onthullen: hoeveel linies (van achter naar voren) al zichtbaar zijn; null = niet bezig
  const [step, setStep] = useState<number | null>(null);
  const latest = months.at(-1);
  const closed = !season && !!ym && ym === latest && !revealed;

  const team = useMemo(
    () => (season ? teamOfTheSeason(view.rows, view.players) : ym ? teamOfTheMonth(view.rows, view.players, ym) : []),
    [view, ym, season],
  );

  useEffect(() => {
    if (step == null) return;
    if (step > team.length) {
      if (latest) markRevealed(TOTM_KEY, latest);
      const t = setTimeout(() => setStep(null), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => (s == null ? s : s + 1)), STEP_MS);
    return () => clearTimeout(t);
  }, [step, team.length, latest]);

  // Plek op het veld (in %): van achter (keeper, onderaan) naar voren; de spits het hoogst, de buitenspelers iets lager
  const placed = useMemo(() => {
    const out: { s: TeamSlot; p: StoredPlayer | undefined; x: number; y: number; li: number }[] = [];
    const L = team.length;
    team.forEach((line, li) => {
      const xs = X[line.length] ?? line.map((_, j) => ((j + 0.5) / line.length) * 100);
      line.forEach((s, j) => {
        // Hoogte per linie (keeper onderaan); bij 4-2-1-3 een vaste verdeling met ruimte voor de tien
        const y = L === 5 && li === 4 ? (s.role === "SP" ? Y_SP : Y_WING) : L === 5 ? Y5[li] : 88 - li * (78 / Math.max(1, L - 1));
        out.push({ s, p: s.playerId ? view.players.find((x) => x.id === s.playerId) : undefined, x: xs[j], y, li });
      });
    });
    return out;
  }, [team, view]);
  const spot = useMemo(() => new Map(placed.filter((x) => x.p).map((x) => [x.p!.id, x])), [placed]);

  // Lijnen volgens het vaste schema; een duo (≥ 2 goals samen) maakt een bestaande lijn goud
  const links = useMemo(() => {
    const at = (s: Slot) => team[s[0]]?.[s[1]]?.playerId ?? null;
    return LINKS.map(([s1, s2]) => [at(s1), at(s2), s1, s2] as const)
      .filter(([a, b]) => a && b && spot.has(a) && spot.has(b))
      .map(([a, b, s1, s2]) => {
        const def = DEF_ROLES.has(team[s1[0]][s1[1]].role) && DEF_ROLES.has(team[s2[0]][s2[1]].role);
        return { c: chemistry(view.rows, a!, b!, def), li: Math.max(s1[0], s2[0]) };
      });
  }, [team, spot, view]);

  // Wie in dit team het vaakst samen speelde (en hoe vaak we dan wonnen)
  const together = useMemo(() => {
    const ids = [...spot.keys()];
    const all: Chemistry[] = [];
    for (const a of ids) for (const b of ids) if (a < b) all.push(chemistry(view.rows, a, b));
    return all
      .filter((c) => c.games >= MIN_TOGETHER)
      .sort((x, y) => y.duoGoals - x.duoGoals || y.games - x.games || y.won / y.games - x.won / x.games)
      .slice(0, 5);
  }, [spot, view]);
  const name = (id: string) => {
    const p = view.players.find((x) => x.id === id);
    return short(p?.name ?? null, playerLabel(p));
  };
  if (!ym && !season) return null;

  // Tijdens het onthullen: alleen de linies tot en met `step`; dicht pakje: niemand
  const shows = (li: number) => !closed || (step != null && li < step);
  const lines = !closed || (step != null && step > team.length);

  return (
    <section id="totm" className={`box totm ${season ? "tots" : ""}`} style={{ marginTop: 16 }}>
      <div className="seg totm-switch" role="group" aria-label="Team van de maand of van het seizoen">
        <button type="button" aria-pressed={!season} disabled={!months.length} onClick={() => setSeason(false)}>
          Maand
        </button>
        <button type="button" aria-pressed={season} onClick={() => setSeason(true)}>
          Seizoen
        </button>
      </div>
      <div className="box-h">
        <p className="lbl">{season ? "Team van het seizoen" : "Team van de maand"}</p>
        <span className="box-right" hidden={season}>
          <button type="button" className="cal-nav sm" aria-label="Vorige maand" disabled={i <= 0} onClick={() => setBack((x) => x + 1)}>
            ‹
          </button>
          <b className="totm-month">{ym ? monthName(ym) : ""}</b>
          <button type="button" className="cal-nav sm" aria-label="Volgende maand" disabled={back <= 0} onClick={() => setBack((x) => Math.max(0, x - 1))}>
            ›
          </button>
          <InfoTip label="Hoe wordt het team gekozen?">
            Per plek de meeste spelerspunten van die maand. Alleen wie die maand echt meedeed (bij 3 of meer duels
            minstens 2 keer), geen leenspelers. Eerst iemand met die rol, anders iemand uit dezelfde linie. Het team is
            pas bekend als de maand voorbij is.
          </InfoTip>
        </span>
      </div>
      <div className={`pitch ${closed && step == null ? "closed" : ""}`}>
        {/* Chemielijnen tussen spelers (onder de shirtjes) */}
        {lines && (
          <svg className="pitch-chem" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {links.map(({ c }) => {
              const A = spot.get(c.a)!;
              const B = spot.get(c.b)!;
              const cls = c.duoGoals >= 2 ? "duo" : c.level;
              return (
                <g key={`${c.a}-${c.b}`} className={`chem ${cls}`}>
                  <line className="under" x1={A.x} y1={A.y} x2={B.x} y2={B.y} vectorEffect="non-scaling-stroke" />
                  <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
          </svg>
        )}
        {placed.map(({ s, p, x, y, li }, j) =>
          p && shows(li) ? (
            <button
              key={j}
              type="button"
              className={`pitch-p ${closed ? "pop" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => setOpen(p.id)}
              title={ROLE[s.role]}
            >
              <Shirt player={p} size={36} />
              <span>{short(p.name, playerLabel(p))}</span>
              <small className={season ? "tots" : ""}>{view.cards[p.id]?.overall ?? ""}</small>
            </button>
          ) : (
            <span key={j} className="pitch-p empty" style={{ left: `${x}%`, top: `${y}%` }}>
              <i className="pitch-slot" aria-hidden="true" />
              <span>{closed ? "" : ROLE[s.role]}</span>
            </span>
          ),
        )}
        {closed && step == null && (
          <div className="pitch-reveal">
            <span className="k">Team van {monthName(ym!)}</span>
            <button className="btn primary" type="button" onClick={() => setStep(1)}>
              Onthul het team
            </button>
          </div>
        )}
      </div>
      {lines && (
        <>
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
            <InfoTip label="Wat betekenen de lijnen?">
              Zoals bij FIFA lopen er lijnen tussen spelers die naast elkaar spelen. De kleur zegt hoe het ging als die
              twee samen op het veld stonden, over het hele seizoen. <b>Groen</b>: samen minstens 0,25 punt per duel meer
              dan verwacht. <b>Rood</b>: 0,25 minder. <b>Oranje</b>: daartussen, of nog geen 2 duels samen. Tussen keeper
              en verdedigers telt hoeveel goals we samen tegen kregen t.o.v. verwacht (groen bij 0,4 per duel minder dan
              verwacht, rood bij meer). <b>Goud</b>: buren die samen minstens 2 keer scoorden (assist van de een op de
              ander).
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
        </>
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

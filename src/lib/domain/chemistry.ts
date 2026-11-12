import type { GameRow } from "./awards";
import { ourScore } from "./types";

/**
 * Chemie tussen twee spelers, zoals de lijntjes bij FIFA: hoe gaat het als ze samen op het veld staan?
 *
 * - Gewone lijn: punten t.o.v. verwacht als ze allebei meededen (≥ +0,25 per duel goed, ≤ −0,25 slecht).
 * - Verdedigingslijn (keeper en verdedigers onderling): tegengoals t.o.v. verwacht (≥ 0,4 per duel minder
 *   tegen dan verwacht goed, meer tegen dan verwacht slecht).
 * - Duo: minstens 2 goals met een assist van de een op de ander, een gouden lijn.
 * Pas vanaf 2 duels samen telt het; daaronder is het "normaal" (te weinig om iets te zeggen).
 */
export type ChemLevel = "goed" | "normaal" | "slecht";

export interface Chemistry {
  a: string;
  b: string;
  games: number;
  won: number;
  drawn: number;
  lost: number;
  /** Gemiddeld per duel samen: punten en tegengoals t.o.v. verwacht */
  ptsDiff: number;
  gaDiff: number;
  /** Goals waarbij de een de assist gaf op de ander */
  duoGoals: number;
  defensive: boolean;
  level: ChemLevel;
}

export const MIN_TOGETHER = 2;

export function chemistry(rows: GameRow[], a: string, b: string, defensive = false): Chemistry {
  const both = rows.filter((r) => r.entry.attendance.includes(a) && r.entry.attendance.includes(b));
  let won = 0,
    drawn = 0,
    lost = 0,
    pts = 0,
    ga = 0,
    duoGoals = 0;
  for (const r of both) {
    const [f, t] = ourScore(r.match)!;
    if (f > t) won++;
    else if (f === t) drawn++;
    else lost++;
    pts += r.ptsDiff;
    ga += r.gaDiff;
    for (const g of r.entry.goals ?? []) if ((g.scorerId === a && g.assistId === b) || (g.scorerId === b && g.assistId === a)) duoGoals++;
  }
  const n = both.length;
  const ptsDiff = n ? pts / n : 0;
  const gaDiff = n ? ga / n : 0;
  let level: ChemLevel = "normaal";
  if (n >= MIN_TOGETHER) {
    if (defensive) level = gaDiff >= 0.4 ? "goed" : gaDiff < 0 ? "slecht" : "normaal";
    else level = ptsDiff >= 0.25 ? "goed" : ptsDiff <= -0.25 ? "slecht" : "normaal";
  }
  return { a, b, games: n, won, drawn, lost, ptsDiff, gaDiff, duoGoals, defensive, level };
}

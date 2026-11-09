import type { PlayerImpact } from "./awards";
import { fromXg, predict, type Fit, type Prediction } from "./model";
import { isPlayed, US, type Match, type MatchEntry } from "./types";

/* ==========================================================================
   Vorm door het seizoen
   ========================================================================== */

export interface FormPoint {
  match: Match;
  opponent: string;
  /** Behaalde punten en wat het model verwachtte tegen deze tegenstander (thuis/uit meegerekend) */
  points: number;
  expected: number;
  /** Opgeteld tot en met deze wedstrijd */
  cumPoints: number;
  cumExpected: number;
  /**
   * Vorm: punten boven verwachting per duel, gemiddeld over de laatste WINDOW duels.
   * Zo schommelt het niet elke week, maar zie je het verloop over het seizoen.
   */
  form: number;
}

const WINDOW = 5;

/** Vorm van een team over het seizoen, gecorrigeerd voor de sterkte van elke tegenstander. */
export function seasonForm(model: Fit, matches: Match[], pool: Set<string>, team = US): FormPoint[] {
  const games = matches
    .filter((m) => m.kind === "competitie" && isPlayed(m) && (m.home === team || m.away === team) && pool.has(m.home) && pool.has(m.away))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const out: FormPoint[] = [];
  let cp = 0;
  let ce = 0;
  for (const m of games) {
    const home = m.home === team;
    const opp = home ? m.away : m.home;
    const p = predict(model, team, opp, home);
    const f = home ? m.homeGoals! : m.awayGoals!;
    const a = home ? m.awayGoals! : m.homeGoals!;
    const points = f > a ? 3 : f === a ? 1 : 0;
    const expected = 3 * p.win + p.draw;
    cp += points;
    ce += expected;
    const recent = [...out.slice(-(WINDOW - 1)).map((x) => x.points - x.expected), points - expected];
    out.push({
      match: m,
      opponent: opp,
      points,
      expected,
      cumPoints: cp,
      cumExpected: ce,
      form: recent.reduce((s, x) => s + x, 0) / recent.length,
    });
  }
  return out;
}

/* ==========================================================================
   Duo's: wie geeft de assist op wie
   ========================================================================== */

export interface Duo {
  assistId: string;
  scorerId: string;
  goals: number;
}

/** Combinaties aangever → scorer uit de ingevoerde doelpunten, meeste eerst */
export function duos(matches: Match[], entries: Record<string, MatchEntry>): Duo[] {
  const comp = new Set(matches.filter((m) => m.kind === "competitie" && isPlayed(m)).map((m) => m.id));
  const count = new Map<string, Duo>();
  for (const e of Object.values(entries)) {
    if (!comp.has(e.matchId)) continue;
    for (const g of e.goals ?? []) {
      if (!g.scorerId || !g.assistId) continue;
      const key = `${g.assistId}>${g.scorerId}`;
      const d = count.get(key) ?? { assistId: g.assistId, scorerId: g.scorerId, goals: 0 };
      d.goals++;
      count.set(key, d);
    }
  }
  return [...count.values()].sort((a, b) => b.goals - a.goals);
}

/** Beste maatje van een speler (beide kanten op: hij geeft de assist of krijgt hem) */
export function bestPartner(all: Duo[], id: string): { partnerId: string; goals: number } | null {
  const per = new Map<string, number>();
  for (const d of all) {
    if (d.assistId === id) per.set(d.scorerId, (per.get(d.scorerId) ?? 0) + d.goals);
    if (d.scorerId === id) per.set(d.assistId, (per.get(d.assistId) ?? 0) + d.goals);
  }
  const top = [...per.entries()].sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 2 ? { partnerId: top[0], goals: top[1] } : null;
}

/* ==========================================================================
   Winkans met deze spelers
   ========================================================================== */

/** Hoe vaak een speler meedeed in de duels waarin hij fit was (0–1) */
export function attendanceRates(rows: { entry: MatchEntry }[], ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) {
    const fit = rows.filter((r) => !r.entry.injured?.includes(id));
    out[id] = fit.length ? fit.filter((r) => r.entry.attendance.includes(id)).length / fit.length : 0;
  }
  return out;
}

/**
 * Verwachte opstelling: wie meestal meedoet (≥ 50% van zijn fitte duels) en nu niet geblesseerd is.
 * Alleen vaste spelers; leenspelers komen pas mee als je ze echt aanmeldt.
 */
export function likelyLineup(rates: Record<string, number>, injured: Set<string>, vast: string[]): string[] {
  return vast.filter((id) => !injured.has(id) && (rates[id] ?? 0) >= 0.5);
}

/** Demping: de impactcijfers zijn al afgevlakt, maar optellen over 11 spelers overdrijft snel */
const DAMP = 0.5;

/**
 * Winkans met een bepaalde bezetting. De gewone voorspelling hoort bij een "normale" bezetting
 * (iedereen zo vaak als hij meestal meedoet). Per speler die er wél/niet bij is, schuift de verwachting
 * met zijn impact (punten boven verwachting met hem erbij) maal hoeveel vaker/minder vaak hij er is dan
 * normaal. Dat verschil in punten wordt omgezet in iets meer of minder verwachte goals voor en tegen.
 */
export function lineupPrediction(
  base: Prediction,
  present: string[],
  impacts: Record<string, PlayerImpact>,
  rates: Record<string, number>,
): { prediction: Prediction; deltaPoints: number } {
  const here = new Set(present);
  let delta = 0;
  for (const [id, imp] of Object.entries(impacts)) {
    if (!imp.eligible) continue;
    delta += imp.pointsImpact * ((here.has(id) ? 1 : 0) - (rates[id] ?? 0));
  }
  delta *= DAMP;
  const target = 3 * base.win + base.draw + delta;
  // Zoek de factor op de verwachte goals (voor ×f, tegen ÷f) die dit aantal punten geeft
  let lo = 0.4;
  let hi = 2.5;
  for (let i = 0; i < 40; i++) {
    const f = (lo + hi) / 2;
    const p = fromXg(base.xgUs * f, base.xgThem / f);
    if (3 * p.win + p.draw < target) lo = f;
    else hi = f;
  }
  const f = (lo + hi) / 2;
  return { prediction: fromXg(base.xgUs * f, base.xgThem / f), deltaPoints: delta };
}

/** Ingevoerde aanwezigheid voor een nog te spelen wedstrijd (opgeslagen als invoer zonder uitslag) */
export const plannedAttendance = (m: Match, entries: Record<string, MatchEntry>) => (isPlayed(m) ? null : (entries[m.id]?.attendance ?? null));


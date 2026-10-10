import { isPlayed, type Match, type Result, type StandingRow } from "./types";

/**
 * Winkansmodel, overgenomen uit het prototype (fit() en predict()).
 *
 * - μ = gemiddeld aantal goals per team per wedstrijd in de poule.
 * - Per team aanvalssterkte a en verdedigingssterkte d, iteratief geschat en
 *   gecorrigeerd voor de sterkte van de tegenstanders (onbekend = gemiddeld).
 * - Krimp naar het gemiddelde met K pseudo-wedstrijden.
 * - Poisson 0–9 goals per kant, thuisvoordeel 10%.
 */

const K = 2;
const ITERATIONS = 50;
const HOME_ADVANTAGE = 1.1;
const MAX_GOALS = 9;
const MATRIX_SIZE = 6;

export interface Fit {
  mu: number;
  attack: Record<string, number>;
  defence: Record<string, number>;
  /** Bekende tegenstanders per team (chronologisch) */
  opponents: Record<string, string[]>;
}

/** Alle gespeelde competitiewedstrijden tussen twee poule-teams, op datum. */
export function knownResults(matches: Match[], standings: StandingRow[]): Result[] {
  const pool = new Set(standings.map((s) => s.team));
  return matches
    .filter((m) => m.kind === "competitie" && isPlayed(m) && pool.has(m.home) && pool.has(m.away))
    .map((m) => ({
      home: m.home,
      away: m.away,
      homeGoals: m.homeGoals as number,
      awayGoals: m.awayGoals as number,
      date: m.date,
    }))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

export function fit(standings: StandingRow[], results: Result[]): Fit {
  const teams = standings.map((s) => s.team);
  const row = Object.fromEntries(standings.map((s) => [s.team, s]));
  const totalPlayed = standings.reduce((s, r) => s + r.played, 0);
  const mu = totalPlayed ? standings.reduce((s, r) => s + r.goalsFor, 0) / totalPlayed : 1;

  const opponents: Record<string, string[]> = Object.fromEntries(teams.map((t) => [t, []]));
  for (const r of results) {
    opponents[r.home]?.push(r.away);
    opponents[r.away]?.push(r.home);
  }

  let attack: Record<string, number> = Object.fromEntries(teams.map((t) => [t, 1]));
  let defence: Record<string, number> = Object.fromEntries(teams.map((t) => [t, 1]));

  for (let it = 0; it < ITERATIONS; it++) {
    const na: Record<string, number> = {};
    const nd: Record<string, number> = {};
    for (const t of teams) {
      const r = row[t];
      const known = opponents[t].slice(0, r.played);
      const unknown = Math.max(0, r.played - known.length);
      const expFor = known.reduce((s, o) => s + defence[o], 0) + unknown;
      const expAgainst = known.reduce((s, o) => s + attack[o], 0) + unknown;
      na[t] = (r.goalsFor / mu + K) / (expFor + K);
      nd[t] = (r.goalsAgainst / mu + K) / (expAgainst + K);
    }
    const ma = teams.reduce((s, t) => s + na[t], 0) / teams.length;
    const md = teams.reduce((s, t) => s + nd[t], 0) / teams.length;
    attack = Object.fromEntries(teams.map((t) => [t, na[t] / ma]));
    defence = Object.fromEntries(teams.map((t) => [t, nd[t] / md]));
  }

  return { mu, attack, defence, opponents };
}

const poisson = (lambda: number, k: number) => {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
};

export interface Prediction {
  /** Verwachte goals ons team / tegenstander */
  xgUs: number;
  xgThem: number;
  win: number;
  draw: number;
  loss: number;
  /** matrix[ons][tegen], 0–5 × 0–5 */
  matrix: number[][];
  best: { us: number; them: number; p: number };
}

/** Voorspelling voor `us` tegen `opp`, vanuit `us` gezien. */
export function predict(model: Fit, us: string, opp: string, usAtHome: boolean): Prediction {
  const h = usAtHome ? HOME_ADVANTAGE : 1 / HOME_ADVANTAGE;
  const xgUs = model.mu * model.attack[us] * model.defence[opp] * h;
  const xgThem = (model.mu * model.attack[opp] * model.defence[us]) / h;

  let win = 0;
  let draw = 0;
  let loss = 0;
  const matrix: number[][] = Array.from({ length: MATRIX_SIZE }, () => Array(MATRIX_SIZE).fill(0));
  let best = { us: 0, them: 0, p: 0 };

  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = poisson(xgUs, i) * poisson(xgThem, j);
      if (i > j) win += p;
      else if (i === j) draw += p;
      else loss += p;
      if (i < MATRIX_SIZE && j < MATRIX_SIZE) {
        matrix[i][j] = p;
        if (p > best.p) best = { us: i, them: j, p };
      }
    }
  }

  const total = win + draw + loss;
  return { xgUs, xgThem, win: win / total, draw: draw / total, loss: loss / total, matrix, best };
}

export type Verdict = "Favoriet" | "Pittig" | "Lastig";
export const verdict = (p: Pick<Prediction, "win">): Verdict =>
  p.win >= 0.6 ? "Favoriet" : p.win >= 0.4 ? "Pittig" : "Lastig";

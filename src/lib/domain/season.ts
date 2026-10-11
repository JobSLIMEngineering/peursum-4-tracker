import type { Fit } from "./model";
import { isPlayed, type Match, type StandingRow } from "./types";

/**
 * Kampioenskans: het restant van het seizoen vele keren naspelen met het winkansmodel.
 * Per nog te spelen competitiewedstrijd (tussen poule-teams) worden goals geloot uit een
 * Poisson-verdeling met dezelfde verwachte goals als de voorspelling (thuisvoordeel 10%).
 * Eindstand: punten, dan doelsaldo, dan gescoorde goals, dan loting.
 */

const HOME_ADVANTAGE = 1.1;

export interface SeasonOutlook {
  /** Kans op de titel per team (0–1) */
  champion: Record<string, number>;
  /** Kans op een plek in de bovenste 3 */
  top3: Record<string, number>;
  /** Gemiddelde eindpositie */
  expectedPosition: Record<string, number>;
  /** Aantal nog te spelen wedstrijden dat is meegenomen */
  remaining: number;
  runs: number;
}

/** Deterministische random (zelfde uitkomst bij elke weergave) */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function poissonSample(lambda: number, rand: () => number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}

export function simulateSeason(
  model: Fit,
  standings: StandingRow[],
  matches: Match[],
  runs = 10000,
  seed = 2026,
): SeasonOutlook {
  const teams = standings.map((s) => s.team);
  const pool = new Set(teams);
  const remaining = matches.filter(
    (m) => m.kind === "competitie" && !isPlayed(m) && pool.has(m.home) && pool.has(m.away),
  );
  const lambdas = remaining.map((m) => [
    model.mu * model.attack[m.home] * model.defence[m.away] * HOME_ADVANTAGE,
    (model.mu * model.attack[m.away] * model.defence[m.home]) / HOME_ADVANTAGE,
  ]);
  const idx = new Map(teams.map((t, i) => [t, i]));
  const homeIdx = remaining.map((m) => idx.get(m.home)!);
  const awayIdx = remaining.map((m) => idx.get(m.away)!);

  const n = teams.length;
  const champ = new Float64Array(n);
  const top3 = new Float64Array(n);
  const posSum = new Float64Array(n);
  const pts = new Float64Array(n);
  const gd = new Float64Array(n);
  const gf = new Float64Array(n);
  const tie = new Float64Array(n);
  const order = teams.map((_, i) => i);
  const rand = rng(seed);

  for (let r = 0; r < runs; r++) {
    standings.forEach((s, i) => {
      pts[i] = s.points;
      gd[i] = s.goalsFor - s.goalsAgainst;
      gf[i] = s.goalsFor;
      tie[i] = rand();
    });
    for (let k = 0; k < remaining.length; k++) {
      const h = poissonSample(lambdas[k][0], rand);
      const a = poissonSample(lambdas[k][1], rand);
      const hi = homeIdx[k];
      const ai = awayIdx[k];
      gd[hi] += h - a;
      gd[ai] += a - h;
      gf[hi] += h;
      gf[ai] += a;
      if (h > a) pts[hi] += 3;
      else if (h < a) pts[ai] += 3;
      else {
        pts[hi] += 1;
        pts[ai] += 1;
      }
    }
    order.sort((x, y) => pts[y] - pts[x] || gd[y] - gd[x] || gf[y] - gf[x] || tie[y] - tie[x]);
    order.forEach((t, pos) => {
      posSum[t] += pos + 1;
      if (pos === 0) champ[t]++;
      if (pos < 3) top3[t]++;
    });
  }

  const per = (arr: Float64Array, div: number) => Object.fromEntries(teams.map((t, i) => [t, arr[i] / div]));
  return {
    champion: per(champ, runs),
    top3: per(top3, runs),
    expectedPosition: per(posSum, runs),
    remaining: remaining.length,
    runs,
  };
}

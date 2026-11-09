import type { Fit } from "./model";
import { isPlayed, type Match, type StandingRow } from "./types";

/**
 * Kampioenskans: het restant van het seizoen vele keren naspelen met het winkansmodel.
 * Per nog te spelen competitiewedstrijd (tussen poule-teams) worden goals geloot uit een
 * Poisson-verdeling met dezelfde verwachte goals als de voorspelling (thuisvoordeel 10%).
 * Eindstand: punten, dan doelsaldo, dan gescoorde goals, dan loting.
 *
 * Realistischer gemaakt:
 * - wedstrijden die een team nog moet spelen maar die (nog) niet in het programma staan (inhaal zonder
 *   datum) worden toch meegespeeld, tegen een gemiddelde tegenstander. Anders lijkt wie een wedstrijd
 *   meer gespeeld heeft ineens veel kansrijker;
 * - per simulatie wijken de sterktes van elk team iets af (het model weet het niet zeker), vooral
 *   vroeg in het seizoen.
 */

const HOME_ADVANTAGE = 1.1;
/** Spreiding van de teamsterkte per simulatie (log-schaal); kleiner naarmate er meer gespeeld is */
const STRENGTH_SD = 0.35;

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
  const idx = new Map(teams.map((t, i) => [t, i]));
  const scheduled = matches.filter(
    (m) => m.kind === "competitie" && !isPlayed(m) && pool.has(m.home) && pool.has(m.away),
  );
  // Ontbrekende wedstrijden per team (elk team speelt 2× tegen elke ander), tegen een gemiddelde tegenstander
  const perTeam = 2 * (teams.length - 1);
  const phantom: { team: number; home: boolean }[] = [];
  standings.forEach((r, i) => {
    const planned = scheduled.filter((m) => m.home === r.team || m.away === r.team).length;
    for (let k = 0; k < perTeam - r.played - planned; k++) phantom.push({ team: i, home: k % 2 === 0 });
  });
  const homeIdx = scheduled.map((m) => idx.get(m.home)!);
  const awayIdx = scheduled.map((m) => idx.get(m.away)!);
  const played = standings.reduce((s, r) => s + r.played, 0) / Math.max(1, teams.length);
  const sd = STRENGTH_SD / Math.sqrt(1 + played / 4);
  const att = new Float64Array(teams.length);
  const def = new Float64Array(teams.length);

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

  // Normaal verdeelde ruis (Box-Muller)
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());

  for (let r = 0; r < runs; r++) {
    standings.forEach((s, i) => {
      pts[i] = s.points;
      gd[i] = s.goalsFor - s.goalsAgainst;
      gf[i] = s.goalsFor;
      tie[i] = rand();
      att[i] = model.attack[s.team] * Math.exp(sd * gauss());
      def[i] = model.defence[s.team] * Math.exp(sd * gauss());
    });
    for (let k = 0; k < phantom.length; k++) {
      const { team: t, home } = phantom[k];
      const adv = home ? HOME_ADVANTAGE : 1 / HOME_ADVANTAGE;
      const f = poissonSample(model.mu * att[t] * adv, rand);
      const a = poissonSample((model.mu * def[t]) / adv, rand);
      gd[t] += f - a;
      gf[t] += f;
      pts[t] += f > a ? 3 : f === a ? 1 : 0;
    }
    for (let k = 0; k < scheduled.length; k++) {
      const hi = homeIdx[k];
      const ai = awayIdx[k];
      const h = poissonSample(model.mu * att[hi] * def[ai] * HOME_ADVANTAGE, rand);
      const a = poissonSample((model.mu * att[ai] * def[hi]) / HOME_ADVANTAGE, rand);
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
    remaining: scheduled.length + phantom.length / 2,
    runs,
  };
}

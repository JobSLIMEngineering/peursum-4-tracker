import type { Fit } from "./model";
import { isPlayed, opponent, US, type Match, type StandingRow } from "./types";

/**
 * Scenario's: wat is er nodig om op een bepaald moment (winterstop of einde seizoen) minimaal op plek N
 * te staan? Twee kanten:
 * - zeker weten (rekenen): hebben we het in eigen hand als we alles winnen, en zo niet, hoeveel punten
 *   mogen de concurrenten dan nog halen;
 * - kansen (naspelen met het winkansmodel, zoals de kampioenskans): de kans nu, en de kans per aantal
 *   zeges en per uitslag van elke eigen wedstrijd.
 */

const HOME_ADVANTAGE = 1.1;
const STRENGTH_SD = 0.35;
/** Minimale pauze in het programma die als winterstop telt */
const BREAK_DAYS = 21;

export type Status = "zeker" | "eigen hand" | "doelsaldo" | "hulp nodig" | "onmogelijk";

export interface Rival {
  team: string;
  points: number;
  /** Wedstrijden die ze nog spelen tot het moment (zonder die tegen ons) */
  games: number;
  /** Zoveel punten mogen ze nog halen om onder ons te blijven als wij alles winnen */
  allowed: number;
}

export interface Scenario {
  deadline: string | null;
  target: number;
  /** Onze wedstrijden tot het moment */
  ours: Match[];
  ourPoints: number;
  /** Punten als we alles winnen */
  maxPoints: number;
  status: Status;
  /** Bij "hulp nodig": wie er punten moet laten liggen, en hoeveel van hen */
  rivals: Rival[];
  mustDrop: number;
  /** Kans (0–1) om het doel te halen */
  chance: number;
  /** Kans per aantal zeges uit onze wedstrijden (alleen wat in de simulaties voorkwam) */
  byWins: { wins: number; chance: number | null }[];
  /** Per eigen wedstrijd: de kans bij winst, gelijk en verlies */
  perMatch: { match: Match; win: number | null; draw: number | null; loss: number | null }[];
}

const days = (a: string, b: string) => (Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 864e5;

/** Laatste speeldag voor de winterstop (een pauze van 3 weken of meer rond de jaarwisseling), of null */
export function winterBreak(matches: Match[], today: string): string | null {
  const dates = [...new Set(matches.filter((m) => m.kind === "competitie" && !isPlayed(m) && m.date && m.date >= today).map((m) => m.date!))].sort();
  for (let i = 0; i + 1 < dates.length; i++) {
    const month = dates[i].slice(5, 7);
    if ((month === "11" || month === "12" || month === "01") && days(dates[i], dates[i + 1]) >= BREAK_DAYS) return dates[i];
  }
  return null;
}

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function poisson(lambda: number, rand: () => number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}

export function scenario(
  model: Fit,
  standings: StandingRow[],
  matches: Match[],
  opts: { deadline: string | null; target: number; runs?: number; seed?: number },
): Scenario {
  const { deadline, target, runs = 4000, seed = 2026 } = opts;
  const teams = standings.map((s) => s.team);
  const pool = new Set(teams);
  const idx = new Map(teams.map((t, i) => [t, i]));
  const due = (m: Match) => (deadline ? !!m.date && m.date <= deadline : true);
  const left = matches.filter((m) => m.kind === "competitie" && !isPlayed(m) && pool.has(m.home) && pool.has(m.away) && due(m));
  const ours = left.filter((m) => m.home === US || m.away === US).sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9"));
  const us = standings.find((s) => s.team === US);
  const base = { deadline, target, ours, rivals: [] as Rival[], mustDrop: 0 };
  if (!us)
    return { ...base, ourPoints: 0, maxPoints: 0, status: "onmogelijk", chance: 0, byWins: [], perMatch: [] };

  // ── Rekenen: in eigen hand? ──────────────────────────────────────────────
  const maxPoints = us.points + 3 * ours.length;
  const others = standings.filter((s) => s.team !== US);
  const gamesOf = (t: string) => left.filter((m) => m.home === t || m.away === t).length;
  const vsUs = (t: string) => ours.filter((m) => opponent(m) === t).length;
  // Als wij alles winnen: zij halen niets tegen ons
  const best = others.map((s) => {
    const games = gamesOf(s.team) - vsUs(s.team);
    return { team: s.team, points: s.points, games, max: s.points + 3 * games };
  });
  const above = best.filter((b) => b.max > maxPoints);
  const level = best.filter((b) => b.max === maxPoints);
  const sureAbove = best.filter((b) => b.points > maxPoints).length;
  // Zeker: ook als we alles verliezen kunnen er te weinig teams over ons heen
  const worst = others.filter((s) => s.points + 3 * gamesOf(s.team) >= us.points).length;
  let status: Status;
  if (worst < target) status = "zeker";
  else if (sureAbove >= target) status = "onmogelijk";
  else if (above.length + level.length < target) status = "eigen hand";
  else if (above.length < target) status = "doelsaldo";
  else status = "hulp nodig";
  const rivals: Rival[] =
    status === "hulp nodig"
      ? above
          .map((b) => ({ team: b.team, points: b.points, games: b.games, allowed: Math.max(0, maxPoints - b.points - 1) }))
          .sort((a, b) => a.allowed - b.allowed)
      : [];
  const mustDrop = status === "hulp nodig" ? above.length - (target - 1) : 0;

  // ── Naspelen ─────────────────────────────────────────────────────────────
  const n = teams.length;
  const hi = left.map((m) => idx.get(m.home)!);
  const ai = left.map((m) => idx.get(m.away)!);
  const ourIdx = ours.map((m) => left.indexOf(m));
  const usI = idx.get(US)!;
  const played = standings.reduce((s, r) => s + r.played, 0) / Math.max(1, n);
  const sd = STRENGTH_SD / Math.sqrt(1 + played / 4);
  const pts = new Float64Array(n);
  const gd = new Float64Array(n);
  const gf = new Float64Array(n);
  const tie = new Float64Array(n);
  const att = new Float64Array(n);
  const def = new Float64Array(n);
  const order = teams.map((_, i) => i);
  const rand = rng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
  const res = new Int8Array(left.length);
  let hit = 0;
  const winsTot = new Float64Array(ours.length + 1);
  const winsHit = new Float64Array(ours.length + 1);
  const outTot = ours.map(() => [0, 0, 0]);
  const outHit = ours.map(() => [0, 0, 0]);

  for (let r = 0; r < runs; r++) {
    standings.forEach((s, i) => {
      pts[i] = s.points;
      gd[i] = s.goalsFor - s.goalsAgainst;
      gf[i] = s.goalsFor;
      tie[i] = rand();
      att[i] = model.attack[s.team] * Math.exp(sd * gauss());
      def[i] = model.defence[s.team] * Math.exp(sd * gauss());
    });
    for (let k = 0; k < left.length; k++) {
      const h = poisson(model.mu * att[hi[k]] * def[ai[k]] * HOME_ADVANTAGE, rand);
      const a = poisson((model.mu * att[ai[k]] * def[hi[k]]) / HOME_ADVANTAGE, rand);
      gd[hi[k]] += h - a;
      gd[ai[k]] += a - h;
      gf[hi[k]] += h;
      gf[ai[k]] += a;
      if (h > a) pts[hi[k]] += 3;
      else if (h < a) pts[ai[k]] += 3;
      else {
        pts[hi[k]]++;
        pts[ai[k]]++;
      }
      res[k] = h > a ? 1 : h < a ? -1 : 0;
    }
    order.sort((x, y) => pts[y] - pts[x] || gd[y] - gd[x] || gf[y] - gf[x] || tie[y] - tie[x]);
    const ok = order.indexOf(usI) < target;
    if (ok) hit++;
    let wins = 0;
    ourIdx.forEach((k, j) => {
      const home = left[k].home === US;
      const o = res[k] === 0 ? 1 : (res[k] === 1) === home ? 0 : 2; // 0 winst, 1 gelijk, 2 verlies
      if (o === 0) wins++;
      outTot[j][o]++;
      if (ok) outHit[j][o]++;
    });
    winsTot[wins]++;
    if (ok) winsHit[wins]++;
  }

  // Te weinig simulaties met deze uitkomst zegt niets
  const share = (h: number, t: number) => (t >= 30 ? h / t : null);
  return {
    ...base,
    ourPoints: us.points,
    maxPoints,
    status,
    rivals,
    mustDrop,
    chance: hit / runs,
    byWins: [...winsTot].map((t, w) => ({ wins: w, chance: share(winsHit[w], t) })),
    perMatch: ours.map((match, j) => ({
      match,
      win: share(outHit[j][0], outTot[j][0]),
      draw: share(outHit[j][1], outTot[j][1]),
      loss: share(outHit[j][2], outTot[j][2]),
    })),
  };
}

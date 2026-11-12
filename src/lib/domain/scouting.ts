import { ROLE_POSITION, type Player, type Position } from "./types";

/**
 * Inschatting vooraf (alleen voor de beheerder): hoe goed is iemand, los van de cijfers van dit seizoen?
 *
 * De beheerder krijgt steeds twee spelers naast elkaar en kiest wie beter is op één onderdeel (zoals bij
 * FIFA: snelheid, schieten, passen, techniek, verdedigen, fysiek). Iedereen wordt met iedereen vergeleken,
 * ook over de linies heen; alleen keepers doen niet mee. Uit alle keuzes volgt per onderdeel een sterkte
 * (Bradley-Terry: wie vaak wint van sterke spelers, scoort hoog), en daaruit per speler een basiscijfer,
 * gewogen naar zijn linie (een verdediger vooral op verdedigen, een spits vooral op schieten).
 *
 * Dat basiscijfer is de graadmeter van de kaart: de prestaties van dit seizoen werken daar vanaf naar boven
 * of naar beneden (zie playercard.ts).
 */

export const ATTRS = [
  { key: "SNE", label: "Snelheid", q: "Wie is sneller?" },
  { key: "SCH", label: "Schieten", q: "Wie schiet beter?" },
  { key: "PAS", label: "Passen", q: "Wie passt beter?" },
  { key: "TEC", label: "Techniek", q: "Wie heeft meer techniek?" },
  { key: "VER", label: "Verdedigen", q: "Wie verdedigt beter?" },
  { key: "FYS", label: "Fysiek", q: "Wie is fysiek sterker?" },
] as const;
export type Attr = (typeof ATTRS)[number]["key"];

export interface ScoutVote {
  a: string;
  b: string;
  attr: Attr;
  /** Wie beter is; "gelijk" telt voor allebei als half gewonnen */
  winner: "a" | "b" | "gelijk";
  at: string;
}

/** Gewicht van elk onderdeel in het basiscijfer, per linie */
export const LINE_WEIGHTS: Record<Exclude<Position, "Keeper">, Record<Attr, number>> = {
  Verdediger: { VER: 0.35, FYS: 0.2, SNE: 0.15, PAS: 0.15, TEC: 0.1, SCH: 0.05 },
  Middenvelder: { PAS: 0.3, TEC: 0.2, VER: 0.15, SCH: 0.15, SNE: 0.1, FYS: 0.1 },
  Aanvaller: { SCH: 0.35, SNE: 0.2, TEC: 0.2, PAS: 0.15, FYS: 0.1, VER: 0 },
  Onbekend: { SNE: 1 / 6, SCH: 1 / 6, PAS: 1 / 6, TEC: 1 / 6, VER: 1 / 6, FYS: 1 / 6 },
};

/** Midden van de schaal en hoeveel punten één "sterkte" waard is */
const CENTER = 78;
const SPREAD = 7;
/** Pas vanaf zoveel vergelijkingen (over alle onderdelen) telt het basiscijfer voor een speler */
export const MIN_VOTES = 6;

type ScoutPlayer = Pick<Player, "id" | "position" | "active" | "type"> & { role?: Player["role"] };

const lineOf = (p: ScoutPlayer): Position => (p.role ? ROLE_POSITION[p.role] : p.position);

/** Wie mee kan doen: actieve vaste spelers, geen keepers */
export const scoutable = <P extends ScoutPlayer>(players: P[]) => players.filter((p) => p.active && p.type === "vast" && lineOf(p) !== "Keeper");

/** Sterkte per speler op één onderdeel (0 = gemiddeld), met een lichte rem zodat weinig keuzes niet extreem uitvallen */
export function strengths(votes: ScoutVote[], attr: Attr): Record<string, number> {
  const vs = votes.filter((v) => v.attr === attr);
  const r: Record<string, number> = {};
  for (const v of vs) {
    r[v.a] ??= 0;
    r[v.b] ??= 0;
  }
  const ids = Object.keys(r);
  if (!ids.length) return r;
  const lambda = 0.3;
  for (let it = 0; it < 300; it++) {
    const g: Record<string, number> = Object.fromEntries(ids.map((id) => [id, -lambda * r[id]]));
    for (const v of vs) {
      const y = v.winner === "a" ? 1 : v.winner === "b" ? 0 : 0.5;
      const p = 1 / (1 + Math.exp(r[v.b] - r[v.a]));
      g[v.a] += y - p;
      g[v.b] -= y - p;
    }
    for (const id of ids) r[id] += 0.15 * g[id];
  }
  return r;
}

/** Cijfers per onderdeel (55–97) en het basiscijfer per speler (alleen wie genoeg vergeleken is) */
export function scoutRatings(votes: ScoutVote[], players: ScoutPlayer[]) {
  const st = Object.fromEntries(ATTRS.map((a) => [a.key, strengths(votes, a.key)])) as Record<Attr, Record<string, number>>;
  const count: Record<string, number> = {};
  for (const v of votes) {
    count[v.a] = (count[v.a] ?? 0) + 1;
    count[v.b] = (count[v.b] ?? 0) + 1;
  }
  const out: Record<string, { attrs: Record<Attr, number>; base: number | null; votes: number }> = {};
  for (const p of scoutable(players)) {
    const attrs = Object.fromEntries(
      ATTRS.map((a) => [a.key, Math.round(Math.min(97, Math.max(55, CENTER + SPREAD * (st[a.key][p.id] ?? 0))))]),
    ) as Record<Attr, number>;
    const line = lineOf(p);
    const w = LINE_WEIGHTS[line === "Keeper" ? "Onbekend" : line];
    const base = ATTRS.reduce((s, a) => s + w[a.key] * (CENTER + SPREAD * (st[a.key][p.id] ?? 0)), 0);
    const n = count[p.id] ?? 0;
    out[p.id] = { attrs, base: n >= MIN_VOTES ? Math.round(base * 10) / 10 : null, votes: n };
  }
  return out;
}

/** Alleen de basiscijfers (dit gaat ook mee in de kijkversie; de keuzes zelf niet) */
export function scoutBase(votes: ScoutVote[], players: ScoutPlayer[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, r] of Object.entries(scoutRatings(votes, players))) if (r.base != null) out[id] = r.base;
  return out;
}

/** Aanbevolen aantal keuzes per onderdeel: iedereen gemiddeld zo'n 4 keer vergeleken */
export const targetPerAttr = (n: number) => 2 * n;

/**
 * Volgende vergelijking: het onderdeel met de minste keuzes, daarin de speler die het minst vergeleken is,
 * tegen iemand met wie hij op dat onderdeel nog niet (vaak) vergeleken is en die ongeveer even sterk lijkt.
 */
export function nextPair(votes: ScoutVote[], players: ScoutPlayer[], rand: () => number = Math.random): { a: string; b: string; attr: Attr } | null {
  const pool = scoutable(players).map((p) => p.id);
  if (pool.length < 2) return null;
  const per = (attr: Attr) => votes.filter((v) => v.attr === attr);
  const attr = [...ATTRS]
    .map((a, i) => ({ key: a.key, n: per(a.key).length, i }))
    .sort((x, y) => x.n - y.n || ((x.i + votes.length) % 6) - ((y.i + votes.length) % 6))[0].key;
  const vs = per(attr);
  const cnt = (id: string) => vs.filter((v) => v.a === id || v.b === id).length;
  const pair = (x: string, y: string) => vs.filter((v) => (v.a === x && v.b === y) || (v.a === y && v.b === x)).length;
  const r = strengths(votes, attr);
  const a = [...pool].sort((x, y) => cnt(x) - cnt(y) || rand() - 0.5)[0];
  const b = pool
    .filter((x) => x !== a)
    .map((x) => ({ x, s: pair(a, x) * 100 + cnt(x) * 2 + Math.abs((r[a] ?? 0) - (r[x] ?? 0)) * 3 + rand() * 1.5 }))
    .sort((p, q) => p.s - q.s)[0].x;
  // Links/rechts afwisselen, zodat niemand altijd links staat
  return rand() < 0.5 ? { a, b, attr } : { a: b, b: a, attr };
}

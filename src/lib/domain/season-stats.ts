import { playerImpacts, type GameRow } from "./awards";
import { bestPartner, duos } from "./insights";
import { playerCards } from "./playercard";
import { playersOfTheMonth, rateMatch, seasonRatings } from "./rating";
import { ourScore, ROLE_CODE, ROLE_NAME, type Match, type MatchEntry, type Player, type Position, type Role } from "./types";

/* ==========================================================================
   Rol in het elftal (voor het team van de maand)
   ========================================================================== */

export type { Role };
/** Plekken met Engelse afkorting (zoals op de kaarten) */
export const ROLES: { key: Role; label: string }[] = (["K", "LB", "CV", "RB", "CM", "LV", "SP", "RV"] as Role[]).map((key) => ({
  key,
  label: `${ROLE_CODE[key]} · ${ROLE_NAME[key]}`,
}));
const GROUP: Record<Role, "K" | "D" | "M" | "A"> = { K: "K", LB: "D", CV: "D", RB: "D", CM: "M", LV: "A", SP: "A", RV: "A" };
const FROM_POSITION: Record<Position, Role> = { Keeper: "K", Verdediger: "CV", Middenvelder: "CM", Aanvaller: "SP", Onbekend: "CM" };

type RolePlayer = Pick<Player, "id" | "position" | "active"> & { role?: Role | null };
export const roleOf = (p: RolePlayer): Role => p.role ?? FROM_POSITION[p.position];

/** Opstelling 1-4-3-3, van links naar rechts per linie (achteraan eerst) */
export const FORMATION: Role[][] = [["K"], ["LB", "CV", "CV", "RB"], ["CM", "CM", "CM"], ["LV", "SP", "RV"]];

const month = (r: GameRow) => (r.match.date ?? "").slice(0, 7);
export const monthsOf = (rows: GameRow[]) => [...new Set(rows.map(month).filter(Boolean))].sort();

export interface TeamSlot {
  role: Role;
  playerId: string | null;
  points: number;
}

/**
 * Team van de maand: de beste spelerspunten van die maand per plek in een 1-4-3-3.
 * Alleen wie die maand echt meedeed (bij 3+ duels in de maand minstens 2 keer).
 * Eerst iemand met precies die rol, anders iemand uit dezelfde linie, anders de beste die over is.
 * Keeper: wie die maand het vaakst keepte of de rol keeper heeft.
 */
export function teamOfTheMonth(rows: GameRow[], players: RolePlayer[], ym: string): TeamSlot[][] {
  return bestEleven(rows.filter((r) => month(r) === ym), players, (n) => (n >= 3 ? 2 : 1));
}

/** Team van het seizoen (tot nu toe): wie minstens de helft van de duels speelde */
export function teamOfTheSeason(rows: GameRow[], players: RolePlayer[]): TeamSlot[][] {
  return bestEleven(rows, players, (n) => Math.max(1, Math.ceil(n / 2)));
}

function bestEleven(rs: GameRow[], players: RolePlayer[], minGames: (matches: number) => number): TeamSlot[][] {
  const min = minGames(rs.length);
  const ratings = seasonRatings(rs, players).filter((s) => s.games >= min);
  const byId = new Map(players.map((p) => [p.id, p]));
  const used = new Set<string>();
  // Plek die maand: wat hij het vaakst speelde (keeper, tijdelijke plek per wedstrijd, anders zijn vaste plek)
  const role = (id: string): Role => {
    const count = new Map<Role, number>();
    for (const r of rs) {
      if (!r.entry.attendance.includes(id)) continue;
      const x: Role = r.entry.keeperId === id ? "K" : (r.entry.positions?.[id] ?? roleOf(byId.get(id) ?? { id, position: "Onbekend", active: true }));
      count.set(x, (count.get(x) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? roleOf(byId.get(id) ?? { id, position: "Onbekend", active: true });
  };

  const pick = (slot: Role) => {
    const free = ratings.filter((s) => !used.has(s.playerId));
    const exact = free.find((s) => role(s.playerId) === slot);
    const line = free.find((s) => GROUP[role(s.playerId)] === GROUP[slot]);
    const any = slot === "K" ? undefined : free.find((s) => role(s.playerId) !== "K");
    const got = exact ?? line ?? any;
    if (got) used.add(got.playerId);
    return { role: slot, playerId: got?.playerId ?? null, points: got?.total ?? 0 };
  };

  // Eerst de keeper en de spitsen/verdedigers met een duidelijke rol, dan de rest
  const order: [number, number][] = [];
  FORMATION.forEach((line, i) => line.forEach((_, j) => order.push([i, j])));
  const result: TeamSlot[][] = FORMATION.map((line) => line.map((r) => ({ role: r, playerId: null, points: 0 })));
  const exactFirst = [...order].sort((a, b) => {
    const ra = FORMATION[a[0]][a[1]];
    const rb = FORMATION[b[0]][b[1]];
    const rank = (r: Role) => (r === "K" ? 0 : r === "CM" || r === "CV" ? 2 : 1);
    return rank(ra) - rank(rb);
  });
  for (const [i, j] of exactFirst) result[i][j] = pick(FORMATION[i][j]);
  return result;
}

/* ==========================================================================
   Kaart per maand (upgrades)
   ========================================================================== */

/** Kaartcijfer van elke speler aan het eind van elke maand (null als hij toen nog niet had gespeeld) */
export function monthlyOveralls(rows: GameRow[], players: RolePlayer[]): { months: string[]; overall: Record<string, (number | null)[]> } {
  const months = monthsOf(rows);
  const overall: Record<string, (number | null)[]> = Object.fromEntries(players.map((p) => [p.id, []]));
  for (const m of months) {
    const upTo = rows.filter((r) => month(r) <= m);
    const cards = playerCards(upTo, players, playerImpacts(players, upTo));
    for (const p of players) overall[p.id].push(cards[p.id] && cards[p.id].games > 0 ? cards[p.id].overall : null);
  }
  return { months, overall };
}

/** Upgrade deze maand: verschil met vorige maand (alleen als hij deze maand ook speelde en ≥ +2) */
export function upgrades(m: ReturnType<typeof monthlyOveralls>, rows: GameRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  const last = m.months.at(-1);
  if (!last || m.months.length < 2) return out;
  const playedNow = new Set(rows.filter((r) => month(r) === last).flatMap((r) => r.entry.attendance));
  for (const [id, xs] of Object.entries(m.overall)) {
    const now = xs.at(-1);
    const before = xs.at(-2);
    if (now != null && before != null && playedNow.has(id) && now - before >= 2) out[id] = now - before;
  }
  return out;
}

/* ==========================================================================
   Mijlpalen (haalbaar in een seizoen van 22 duels)
   ========================================================================== */

const STEPS = {
  goals: [5, 10, 15, 20, 25],
  assists: [5, 10, 15],
  games: [10, 15, 20],
  cleanSheets: [3, 5, 8, 10],
};

export interface Milestone {
  playerId: string;
  text: string;
}

interface Tally {
  goals: number;
  assists: number;
  games: number;
  cleanSheets: number;
}

function tally(rows: GameRow[], id: string): Tally {
  const t = { goals: 0, assists: 0, games: 0, cleanSheets: 0 };
  for (const r of rows) {
    if (!r.entry.attendance.includes(id)) continue;
    t.games++;
    t.goals += r.entry.stats[id]?.goals ?? 0;
    t.assists += r.entry.stats[id]?.assists ?? 0;
    if (r.entry.keeperId === id && ourScore(r.match)![1] === 0) t.cleanSheets++;
  }
  return t;
}

/** Mijlpalen die in de laatste ingevoerde wedstrijd gehaald zijn (plus een hattrick) */
export function newMilestones(rows: GameRow[], players: Pick<Player, "id" | "active">[]): Milestone[] {
  const last = rows.at(-1);
  if (!last) return [];
  const before = rows.slice(0, -1);
  const out: Milestone[] = [];
  const LABEL = { goals: "goals", assists: "assists", games: "wedstrijden", cleanSheets: "clean sheets" } as const;
  for (const p of players.filter((x) => x.active)) {
    if (!last.entry.attendance.includes(p.id)) continue;
    const a = tally(before, p.id);
    const b = tally(rows, p.id);
    for (const k of Object.keys(STEPS) as (keyof Tally)[]) {
      const step = STEPS[k].find((s) => a[k] < s && b[k] >= s);
      if (step) out.push({ playerId: p.id, text: `${step} ${LABEL[k]} dit seizoen` });
    }
    if ((last.entry.stats[p.id]?.goals ?? 0) >= 3) out.push({ playerId: p.id, text: `Hattrick tegen ${last.match.home === "Peursum 4" ? last.match.away : last.match.home}` });
  }
  return out;
}

/** Alle mijlpalen die een speler dit seizoen al haalde (voor zijn statistieken) */
export function reachedMilestones(rows: GameRow[], id: string): string[] {
  const t = tally(rows, id);
  const out: string[] = [];
  const LABEL = { goals: "goals", assists: "assists", games: "wedstrijden", cleanSheets: "clean sheets" } as const;
  for (const k of Object.keys(STEPS) as (keyof Tally)[]) {
    const s = [...STEPS[k]].reverse().find((x) => t[k] >= x);
    if (s) out.push(`${s} ${LABEL[k]}`);
  }
  return out;
}

/* ==========================================================================
   Statistieken van één speler over het seizoen (onder zijn kaart)
   ========================================================================== */

export interface PlayerSeason {
  games: number;
  /** Wedstrijden waarin hij fit was */
  available: number;
  goals: number;
  assists: number;
  points: number;
  perGame: number;
  motm: number;
  potm: number;
  record: { w: number; d: number; l: number };
  partner: { partnerId: string; goals: number } | null;
  keeper: { games: number; cleanSheets: number; against: number; expected: number } | null;
  milestones: string[];
  /** Wedstrijden met 3 of meer goals */
  hattricks: number;
}

export function playerSeason(id: string, rows: GameRow[], players: RolePlayer[], matches: Match[], entries: Record<string, MatchEntry>): PlayerSeason {
  const mine = rows.filter((r) => r.entry.attendance.includes(id));
  const fit = rows.filter((r) => !r.entry.injured?.includes(id));
  const rated = seasonRatings(rows, players).find((s) => s.playerId === id);
  const record = { w: 0, d: 0, l: 0 };
  for (const r of mine) {
    const [f, a] = ourScore(r.match)!;
    if (f > a) record.w++;
    else if (f === a) record.d++;
    else record.l++;
  }
  const kept = rows.filter((r) => r.entry.keeperId === id);
  return {
    games: mine.length,
    available: fit.length,
    goals: mine.reduce((s, r) => s + (r.entry.stats[id]?.goals ?? 0), 0),
    assists: mine.reduce((s, r) => s + (r.entry.stats[id]?.assists ?? 0), 0),
    points: rated?.total ?? 0,
    perGame: rated?.perGame ?? 0,
    motm: mine.filter((r) => rateMatch(r, players)[0]?.playerId === id && rateMatch(r, players)[0].total > 0).length,
    potm: playersOfTheMonth(rows, players).filter((m) => m.playerId === id).length,
    record,
    partner: bestPartner(duos(matches, entries), id),
    keeper: kept.length
      ? {
          games: kept.length,
          cleanSheets: kept.filter((r) => ourScore(r.match)![1] === 0).length,
          against: kept.reduce((s, r) => s + ourScore(r.match)![1], 0),
          // gaDiff = verwacht − echt, dus verwacht = echt + gaDiff
          expected: kept.reduce((s, r) => s + ourScore(r.match)![1] + r.gaDiff, 0),
        }
      : null,
    milestones: reachedMilestones(rows, id),
    hattricks: mine.filter((r) => (r.entry.stats[id]?.goals ?? 0) >= 3).length,
  };
}

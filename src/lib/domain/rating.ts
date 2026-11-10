import type { GameRow } from "./awards";
import { ourScore, ROLE_POSITION, type Player, type Position } from "./types";

/**
 * Spelerspunten per wedstrijd: eerlijk voor elke positie, van keeper tot spits.
 *
 * Het model weet per wedstrijd wat er verwacht werd (tegen deze tegenstander, thuis of uit). Wie meedoet
 * krijgt punten erbij als het beter gaat dan verwacht, en eraf als het slechter gaat:
 * - team:     0,5 × (punten − verwachte punten), voor iedereen die meedeed;
 * - verdedigen: (verwachte tegengoals − tegengoals) × gewicht van de positie (keeper het meest);
 * - aanvallen:  (goals − verwachte goals) × gewicht van de positie (spits het meest);
 * - eigen bijdrage: goal +3, assist +2, clean sheet als keeper +1, geel −1, rood −3, eigen goal −2.
 * Zuinig met teampunten: wat je zelf doet (goals, assists, de nul) weegt het zwaarst, alleen "erbij zijn
 * als we winnen" levert weinig op. Werkt met terugwerkende kracht: alles wordt opnieuw berekend.
 * Wie keepte, telt die wedstrijd als keeper (ook als zijn positie anders is). Stond iemand die wedstrijd
 * tijdelijk ergens anders (bijv. middenvelder in de verdediging), dan tellen de gewichten van die plek.
 */

const TEAM = 0.5;
const DEF: Record<Position, number> = { Keeper: 1.5, Verdediger: 0.6, Middenvelder: 0.25, Aanvaller: 0.05, Onbekend: 0.25 };
const ATT: Record<Position, number> = { Keeper: 0, Verdediger: 0.1, Middenvelder: 0.3, Aanvaller: 0.6, Onbekend: 0.3 };

export interface MatchRating {
  playerId: string;
  total: number;
  team: number;
  defence: number;
  attack: number;
  own: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Punten van iedereen die meedeed aan één wedstrijd, hoogste eerst */
export function rateMatch(row: GameRow, players: Pick<Player, "id" | "position">[]): MatchRating[] {
  const pos = new Map(players.map((p) => [p.id, p.position]));
  const conceded = ourScore(row.match)![1];
  return row.entry.attendance
    .map((id) => {
      const temp = row.entry.positions?.[id];
      const position: Position = row.entry.keeperId === id ? "Keeper" : temp ? ROLE_POSITION[temp] : (pos.get(id) ?? "Onbekend");
      const st = row.entry.stats[id];
      const team = TEAM * row.ptsDiff;
      const defence = DEF[position] * row.gaDiff;
      const attack = ATT[position] * row.gfDiff;
      const own =
        3 * (st?.goals ?? 0) +
        2 * (st?.assists ?? 0) +
        (row.entry.keeperId === id && conceded === 0 ? 1 : 0) -
        (st?.red ? 3 : st?.yellow ? 1 : 0) -
        2 * (st?.ownGoals ?? 0);
      return { playerId: id, team: round1(team), defence: round1(defence), attack: round1(attack), own, total: round1(team + defence + attack + own) };
    })
    .sort((a, b) => b.total - a.total);
}

export interface SeasonRating {
  playerId: string;
  total: number;
  games: number;
  perGame: number;
  /** Aantal keer de hoogste score van de wedstrijd (man van de wedstrijd) */
  motm: number;
}

/** Totaal over het seizoen, hoogste eerst */
export function seasonRatings(rows: GameRow[], players: Pick<Player, "id" | "position">[]): SeasonRating[] {
  const out = new Map<string, SeasonRating>();
  for (const r of rows) {
    const rated = rateMatch(r, players);
    rated.forEach((x, i) => {
      const s = out.get(x.playerId) ?? { playerId: x.playerId, total: 0, games: 0, perGame: 0, motm: 0 };
      s.total = round1(s.total + x.total);
      s.games++;
      if (i === 0) s.motm++;
      out.set(x.playerId, s);
    });
  }
  return [...out.values()].map((s) => ({ ...s, perGame: round1(s.total / s.games) })).sort((a, b) => b.total - a.total);
}

/** Man van de wedstrijd: hoogste score (alleen als die positief is) */
export function manOfTheMatch(row: GameRow, players: Pick<Player, "id" | "position">[]): MatchRating | null {
  const top = rateMatch(row, players)[0];
  return top && top.total > 0 ? top : null;
}

export interface MonthWinner {
  /** yyyy-mm */
  month: string;
  playerId: string;
  total: number;
  games: number;
}

/**
 * Speler van de maand: meeste punten in die maand. Wie maar één wedstrijd meedeed in een maand met
 * meer wedstrijden, telt niet mee (anders wint een invaller met één uitschieter).
 * `until` (yyyy-mm): alleen maanden vóór deze maand, want een lopende maand is nog niet klaar.
 */
export function playersOfTheMonth(rows: GameRow[], players: Pick<Player, "id" | "position">[], until?: string): MonthWinner[] {
  const months = new Map<string, GameRow[]>();
  for (const r of rows) {
    const m = (r.match.date ?? "").slice(0, 7);
    if (m) months.set(m, [...(months.get(m) ?? []), r]);
  }
  const out: MonthWinner[] = [];
  for (const [month, rs] of [...months.entries()].sort()) {
    if (until && month >= until) continue;
    const min = rs.length >= 2 ? 2 : 1;
    const best = seasonRatings(rs, players).filter((s) => s.games >= min && s.total > 0)[0];
    if (best) out.push({ month, playerId: best.playerId, total: best.total, games: best.games });
  }
  return out;
}

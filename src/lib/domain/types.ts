/**
 * Domeintypes: los van de database. De datalaag vertaalt Supabase-rijen naar deze vormen,
 * zodat alle rekenregels (model, rondes, stats) zonder database te testen zijn.
 */

export const US = "Peursum 4";

export type MatchKind = "competitie" | "beker" | "oefen";
export type MatchStatus = "gepland" | "gespeeld" | "niet ingepland";
export type MatchSource = "seed" | "scraper" | "afgeleid" | "handmatig";
export type Position =
  | "Keeper"
  | "Verdediger"
  | "Middenvelder"
  | "Aanvaller"
  | "Onbekend";
export const POSITIONS: Position[] = [
  "Keeper",
  "Verdediger",
  "Middenvelder",
  "Aanvaller",
  "Onbekend",
];

export interface StandingRow {
  team: string;
  /** Positie zoals op de clubsite (KNVB-volgorde); nooit zelf sorteren */
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Match {
  id: string;
  round: number | null;
  makeup: boolean;
  date: string | null;
  time: string | null;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  venue: string | null;
  kind: MatchKind;
  status: MatchStatus;
  source: MatchSource;
  edited: boolean;
}

export interface Result {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  date: string | null;
}

export interface Player {
  id: string;
  name: string | null;
  position: Position;
  type: "vast" | "leen";
  hiddenNo: number | null;
  active: boolean;
}

export interface PlayerMatchStats {
  goals: number;
  assists: number;
  /** Geel gekregen. Met `red` samen: tweede geel = rood. */
  yellow: boolean;
  red: boolean;
}

export interface MatchEntry {
  matchId: string;
  attendance: string[];
  stats: Record<string, PlayerMatchStats>;
  keeperId: string | null;
  opponentOwnGoals: number;
}

export const isPlayed = (m: Match): m is Match & { homeGoals: number; awayGoals: number } =>
  m.homeGoals !== null && m.awayGoals !== null;

export const isOurs = (m: Pick<Match, "home" | "away">) => m.home === US || m.away === US;

/** Tegenstander van Peursum 4 in een eigen wedstrijd */
export const opponent = (m: Pick<Match, "home" | "away">) => (m.home === US ? m.away : m.home);

/** Score vanuit Peursum 4: [voor, tegen] */
export function ourScore(m: Match): [number, number] | null {
  if (!isPlayed(m)) return null;
  return m.home === US ? [m.homeGoals, m.awayGoals] : [m.awayGoals, m.homeGoals];
}

export type Outcome = "W" | "D" | "L";
export const outcome = (forGoals: number, against: number): Outcome =>
  forGoals > against ? "W" : forGoals < against ? "L" : "D";

export const playerLabel = (p: Pick<Player, "name" | "hiddenNo"> | undefined) =>
  !p ? "Onbekend" : p.name || `Afgeschermde speler ${p.hiddenNo ?? ""}`.trim();

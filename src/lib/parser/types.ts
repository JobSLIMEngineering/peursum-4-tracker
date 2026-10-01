export type Position =
  | "keeper"
  | "verdediger"
  | "middenvelder"
  | "aanvaller"
  | "onbekend";

export type MatchType = "competitie" | "beker" | "oefen";

export interface ScrapedPlayer {
  /** Naam zoals op de clubsite: "Berg, Rien van den" */
  sourceName: string;
  /** Leesbare naam: "Rien van den Berg" */
  name: string;
  position: Position;
}

export interface ScrapedStaff {
  name: string;
  role: string;
  function: string;
}

export interface ScrapedMatch {
  /** Wedstrijdcode uit de detail-link, of null als die ontbreekt */
  matchCode: string | null;
  /** ISO-datum (yyyy-mm-dd) */
  date: string;
  /** "15:00" of null (uitslagen hebben geen tijd) */
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  /** Doelpunten thuis/uit; null als nog niet gespeeld */
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface ScrapedStanding {
  position: number;
  team: string;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface ScrapedNextMatch {
  /** "Competitie", "Beker", ... zoals op de site */
  label: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
}

export interface TeamPage {
  players: ScrapedPlayer[];
  /** Aantal teamleden dat om privacyredenen zonder naam op de site staat */
  hiddenPlayerCount: number;
  staff: ScrapedStaff[];
  program: ScrapedMatch[];
  results: ScrapedMatch[];
  poolName: string | null;
  standings: ScrapedStanding[];
  nextMatch: ScrapedNextMatch | null;
}

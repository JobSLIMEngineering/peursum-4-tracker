/**
 * Domeintypes: los van de opslag. De datalaag (src/lib/store) vertaalt de JSON-bestanden naar deze vormen,
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

/** Plek in het elftal (gedetailleerder dan Position) */
export type Role = "K" | "LB" | "CV" | "RB" | "DM" | "CM" | "AM" | "LV" | "SP" | "RV";

/** Engelse afkorting zoals op een FIFA-kaart */
export const ROLE_CODE: Record<Role, string> = {
  K: "GK",
  LB: "LB",
  CV: "CB",
  RB: "RB",
  DM: "CDM",
  CM: "CM",
  AM: "CAM",
  LV: "LW",
  SP: "ST",
  RV: "RW",
};
/** Uitgeschreven (Engels) */
export const ROLE_NAME: Record<Role, string> = {
  K: "Goalkeeper",
  LB: "Left back",
  CV: "Centre back",
  RB: "Right back",
  DM: "Defensive midfielder (6)",
  CM: "Central midfielder (8)",
  AM: "Attacking midfielder (10)",
  LV: "Left winger",
  SP: "Striker",
  RV: "Right winger",
};
/** Vaste plek als er geen rol is ingesteld */
export const POSITION_ROLE: Record<Position, Role> = { Keeper: "K", Verdediger: "CV", Middenvelder: "CM", Aanvaller: "SP", Onbekend: "CM" };

/** Linie bij een plek */
export const ROLE_POSITION: Record<Role, Position> = {
  K: "Keeper",
  LB: "Verdediger",
  CV: "Verdediger",
  RB: "Verdediger",
  DM: "Middenvelder",
  CM: "Middenvelder",
  AM: "Middenvelder",
  LV: "Aanvaller",
  SP: "Aanvaller",
  RV: "Aanvaller",
};

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
  /** Andere schrijfwijzen of bijnamen uit de aanwezigheidslijst ("Bobbe", "Bowey") */
  aliases?: string[];
  /** Rugnummer (handmatig ingevuld) */
  number?: number | null;
  /** Vaste plek in het elftal, bijv. "LB" (linksback) of "SP" (spits); bepaalt ook `position` */
  role?: Role | null;
  /** Centrale verdediger: vaste kant (links of rechts centraal achterin) voor het team van de maand */
  side?: "L" | "R" | null;
}

export interface PlayerMatchStats {
  goals: number;
  assists: number;
  /** Geel gekregen. Met `red` samen: tweede geel = rood. */
  yellow: boolean;
  red: boolean;
  /** Waarvan uit een penalty / vrije trap (deel van `goals`) */
  penalties?: number;
  freeKicks?: number;
  /** Eigen doelpunt van deze speler (in ons doel); telt niet als goal */
  ownGoals?: number;
}

export type GoalKind = "spel" | "penalty" | "vrije trap";

/** Eén doelpunt van Peursum 4. `scorerId: null` = eigen goal van de tegenstander. */
export interface GoalEvent {
  scorerId: string | null;
  assistId: string | null;
  kind: GoalKind;
}

export interface MatchEntry {
  matchId: string;
  attendance: string[];
  /** Afgeleid per speler (uit `goals` en de kaarten); hierop rekenen alle statistieken */
  stats: Record<string, PlayerMatchStats>;
  keeperId: string | null;
  opponentOwnGoals: number;
  /** Doelpunten in volgorde, zoals ingevoerd (vanaf de invoer per doelpunt) */
  goals?: GoalEvent[];
  /** Spelers die bij deze wedstrijd geblesseerd waren (tellen voor prijzen niet als afwezig) */
  injured?: string[];
  /** Tijdelijke plek in deze wedstrijd, als die anders was dan normaal (bijv. middenvelder in de verdediging) */
  positions?: Record<string, Role>;
  /** Welk deel van de wedstrijd hij op die tijdelijke plek stond (0,25 / 0,5 / 0,75 / 1; standaard 1) */
  positionShare?: Record<string, number>;
  /** Welk deel van de wedstrijd hij speelde (0,25 / 0,5 / 0,75 / 1; standaard 1) */
  minutes?: Record<string, number>;
}

export const isPlayed = <T extends Pick<Match, "homeGoals" | "awayGoals">>(
  m: T,
): m is T & { homeGoals: number; awayGoals: number } => m.homeGoals !== null && m.awayGoals !== null;

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

const PREFIXES = new Set(["van", "der", "den", "de", "het", "ten", "ter", "te", "'t", "in", "op", "la", "le", "von"]);

/**
 * Voornaam en achternaam (met tussenvoegsel) uit een volledige naam. Is de achternaam langer dan `max`,
 * dan wordt het tussenvoegsel afgekort: "van der Linden" → "v.d. Linden".
 */
export function splitName(name: string | null, max = 12): { first: string; last: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: "", last: parts[0] ?? "" };
  const first = parts[0];
  const rest = parts.slice(1);
  const full = rest.join(" ");
  if (full.length <= max) return { first, last: full };
  const prefix = rest.filter((w, i) => i < rest.length - 1 && PREFIXES.has(w.toLowerCase()));
  if (!prefix.length) return { first, last: full };
  return { first, last: `${prefix.map((w) => `${w[0].toLowerCase()}.`).join("")} ${rest.slice(prefix.length).join(" ")}` };
}

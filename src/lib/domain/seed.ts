import type { Match, MatchStatus, Player, Position, StandingRow } from "./types";

/** Vorm van docs/seed-data.json */
export interface SeedData {
  bron: string;
  team: { naam: string; teampagina: string };
  stand: {
    positie: number;
    team: string;
    gespeeld: number;
    winst: number;
    gelijk: number;
    verlies: number;
    punten: number;
    voor: number;
    tegen: number;
  }[];
  wedstrijden: {
    ronde: number | null;
    inhaal: boolean;
    datum: string | null;
    tijd: string | null;
    thuis: string;
    uit: string;
    uitslag_thuis: number | null;
    uitslag_uit: number | null;
    sportpark: string | null;
    peursum: boolean;
    status: MatchStatus;
  }[];
  spelers: { naam: string | null; positie: Position; type: "vast" | "leen"; afgeschermd: boolean }[];
  sportparken: Record<string, string>;
}

export const seedStandings = (d: SeedData): StandingRow[] =>
  d.stand.map((r) => ({
    team: r.team,
    position: r.positie,
    played: r.gespeeld,
    won: r.winst,
    drawn: r.gelijk,
    lost: r.verlies,
    goalsFor: r.voor,
    goalsAgainst: r.tegen,
    points: r.punten,
  }));

export const seedMatches = (d: SeedData): Match[] =>
  d.wedstrijden.map((w, i) => ({
    id: `seed-${i + 1}`,
    round: w.ronde,
    makeup: w.inhaal,
    date: w.datum,
    time: w.tijd,
    home: w.thuis,
    away: w.uit,
    homeGoals: w.uitslag_thuis,
    awayGoals: w.uitslag_uit,
    venue: w.sportpark,
    kind: "competitie",
    status: w.status,
    source: "seed",
    edited: false,
  }));

export function seedPlayers(d: SeedData): Player[] {
  let hidden = 0;
  return d.spelers.map((s, i) => ({
    id: `p${i + 1}`,
    name: s.naam,
    position: s.positie,
    type: s.type,
    hiddenNo: s.afgeschermd ? ++hidden : null,
    active: true,
  }));
}

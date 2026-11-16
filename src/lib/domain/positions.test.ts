import { describe, expect, it } from "vitest";
import { positionHistory, shortTeam } from "./positions";
import type { Match, StandingRow } from "./types";

const m = (round: number, date: string, home: string, away: string, hg: number | null, ag: number | null, makeup = false): Match => ({
  id: `${home}-${away}`,
  round,
  makeup,
  date,
  time: null,
  home,
  away,
  homeGoals: hg,
  awayGoals: ag,
  venue: null,
  kind: "competitie",
  status: hg == null ? "gepland" : "gespeeld",
  source: "scraper",
  edited: false,
});
const row = (team: string, position: number): StandingRow => ({ team, position, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });

describe("plek per speelronde", () => {
  const matches = [
    m(1, "2026-09-05", "A", "B", 2, 0),
    m(1, "2026-09-05", "C", "D", 1, 1),
    m(2, "2026-09-12", "B", "C", 3, 0),
    m(2, "2026-09-12", "D", "A", 2, 1),
    m(3, "2026-09-19", "A", "C", null, null),
  ];
  const standings = [row("D", 1), row("A", 2), row("B", 3), row("C", 4)];
  const h = positionHistory(matches, standings, "2026-09-14");

  it("alleen gespeelde rondes", () => {
    expect(h.rounds.map((r) => r.round)).toEqual([1, 2]);
  });

  it("na ronde 1 uit de uitslagen: punten, dan doelsaldo", () => {
    const at = (t: string) => h.teams.find((x) => x.team === t)!.positions;
    expect([at("A")[0], at("C")[0], at("D")[0], at("B")[0]]).toEqual([1, 2, 3, 4]);
  });

  it("de laatste ronde volgt de echte stand", () => {
    expect(h.teams.find((x) => x.team === "D")!.positions.at(-1)).toBe(1);
    expect(h.teams.find((x) => x.team === "C")!.positions.at(-1)).toBe(4);
  });

  it("inhaalwedstrijd telt vanaf zijn datum", () => {
    const late = positionHistory([...matches, m(1, "2026-09-10", "B", "D", 5, 0, true)], standings, "2026-09-14");
    expect(late.teams.find((x) => x.team === "B")!.positions[0]).toBe(4);
  });
});

it("korte teamnamen", () => {
  expect(shortTeam("Leerdam Sport'55 5")).toBe("Leerdam 5");
  expect(shortTeam("SV Noordeloos 3")).toBe("Noordeloos 3");
  expect(shortTeam("Peursum 4")).toBe("Peursum 4");
});

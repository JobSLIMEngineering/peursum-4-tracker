import { describe, expect, it } from "vitest";
import { topper } from "./topper";
import { US, type Match, type StandingRow } from "./types";

const row = (team: string, position: number, points: number): StandingRow => ({
  team,
  position,
  played: 6,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points,
});
const standings = [row("Arkel 4", 1, 18), row(US, 2, 16), row("SteDoCo 4", 3, 12), row("SVS", 4, 10), row("Laag", 10, 3)];
const match = (away: string): Match => ({
  id: "m",
  round: 8,
  makeup: false,
  date: "2026-11-14",
  time: "14:30",
  home: away,
  away: US,
  homeGoals: null,
  awayGoals: null,
  venue: null,
  kind: "competitie",
  status: "gepland",
  source: "scraper",
  edited: false,
});

describe("topper", () => {
  it("nummer 2 tegen nummer 3 is een topper, tegen de nummer 10 niet", () => {
    expect(topper(standings, match("SteDoCo 4"))).not.toBeNull();
    expect(topper(standings, match("Laag"))).toBeNull();
  });

  it("wat er op het spel staat per uitkomst", () => {
    const t = topper(standings, match("SteDoCo 4"))!;
    const [w, g, v] = t.scenarios;
    expect(w).toMatchObject({ result: "W", points: 19, position: 1, gapOpponent: 7, gapTop: 1 });
    expect(g).toMatchObject({ points: 17, position: 2, gapOpponent: 4, gapTop: -1 });
    expect(v).toMatchObject({ points: 16, position: 2, gapOpponent: 1, gapTop: -2 });
  });
});

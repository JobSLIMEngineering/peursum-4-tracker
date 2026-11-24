import { describe, expect, it } from "vitest";
import { withManualResults } from "./live-standings";
import type { Match, StandingRow } from "./types";

const row = (team: string, position: number, points: number): StandingRow => ({ team, position, played: 7, won: 0, drawn: 0, lost: 0, goalsFor: 10, goalsAgainst: 10, points });
const match = (home: string, away: string, hg: number, ag: number, manualScore: boolean): Match & { manualScore: boolean } => ({
  id: `${home}-${away}`, round: 8, makeup: false, date: "2026-11-21", time: null, home, away, homeGoals: hg, awayGoals: ag, venue: null,
  kind: "competitie", status: "gespeeld", source: "scraper", edited: manualScore, manualScore,
});

describe("stand met zelf ingevulde uitslagen", () => {
  const st = [row("Arkel 4", 1, 19), row("Peursum 4", 2, 16), row("VVAC 6", 3, 15)];

  it("zonder eigen uitslagen: precies de clubsite", () => {
    expect(withManualResults(st, [match("Peursum 4", "Arkel 4", 1, 4, false)])).toBe(st);
  });

  it("een zelf ingevulde uitslag telt mee", () => {
    const s = withManualResults(st, [match("Peursum 4", "Arkel 4", 1, 4, true)]);
    const us = s.find((r) => r.team === "Peursum 4")!;
    const ark = s.find((r) => r.team === "Arkel 4")!;
    expect(us).toMatchObject({ played: 8, lost: 1, points: 16, goalsFor: 11, goalsAgainst: 14 });
    expect(ark).toMatchObject({ played: 8, won: 1, points: 22, position: 1 });
  });

  it("de volgorde gaat mee: winst brengt je omhoog", () => {
    const s = withManualResults(st, [match("VVAC 6", "Peursum 4", 3, 0, true)]);
    expect(s.map((r) => r.team)).toEqual(["Arkel 4", "VVAC 6", "Peursum 4"]);
  });
});

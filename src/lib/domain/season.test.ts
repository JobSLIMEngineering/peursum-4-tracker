import { describe, expect, it } from "vitest";
import seedJson from "../../../docs/seed-data.json";
import { fit, knownResults } from "./model";
import { seedMatches, seedStandings, type SeedData } from "./seed";
import { simulateSeason } from "./season";
import { US } from "./types";

const seed = seedJson as SeedData;
const standings = seedStandings(seed);
const matches = seedMatches(seed);
const model = fit(standings, knownResults(matches, standings));

describe("kampioenskans", () => {
  const out = simulateSeason(model, standings, matches, 4000);

  it("neemt alle nog te spelen poulewedstrijden mee (incl. niet ingepland)", () => {
    expect(out.remaining).toBe(112);
  });

  it("kansen tellen op tot 100% (titel) en 300% (top 3)", () => {
    const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
    expect(sum(out.champion)).toBeCloseTo(1, 6);
    expect(sum(out.top3)).toBeCloseTo(3, 6);
  });

  it("de koploper met de sterkste ploeg heeft de grootste kans, de onderste ploeg vrijwel geen", () => {
    const best = Object.entries(out.champion).sort((a, b) => b[1] - a[1])[0][0];
    expect(best).toBe(US);
    expect(out.champion[US]).toBeGreaterThan(0.3);
    expect(out.champion["SV Noordeloos 3"]).toBeLessThan(0.01);
    expect(out.expectedPosition[US]).toBeLessThan(out.expectedPosition["SV Noordeloos 3"]);
  });

  it("geeft bij hetzelfde zaad steeds dezelfde uitkomst", () => {
    expect(simulateSeason(model, standings, matches, 500).champion).toEqual(
      simulateSeason(model, standings, matches, 500).champion,
    );
  });

  it("als iedereen alles gespeeld heeft, is de koploper zeker kampioen", () => {
    const full = standings.map((r) => ({ ...r, played: 22 }));
    const done = simulateSeason(model, full, [], 100);
    expect(done.champion[US]).toBe(1);
    expect(done.remaining).toBe(0);
  });

  it("een wedstrijd die een ander nog moet inhalen telt mee, ook zonder datum in het programma", () => {
    // Twee teams, wij 1 punt voor maar met een wedstrijd meer gespeeld
    const two = [
      { team: US, position: 1, played: 22, won: 10, drawn: 0, lost: 12, goalsFor: 30, goalsAgainst: 30, points: 30 },
      { team: "X", position: 2, played: 21, won: 9, drawn: 2, lost: 10, goalsFor: 30, goalsAgainst: 30, points: 29 },
    ].map((r) => ({ ...r, played: r.team === US ? 2 : 1 }));
    const m = fit(two, []);
    const out = simulateSeason(m, two, [], 2000);
    expect(out.remaining).toBeCloseTo(0.5, 5);
    // X kan ons met die wedstrijd nog inhalen: geen 100% voor ons
    expect(out.champion[US]).toBeLessThan(0.9);
    expect(out.champion.X).toBeGreaterThan(0.1);
  });
});

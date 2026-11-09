import { describe, expect, it } from "vitest";
import seedJson from "../../../docs/seed-data.json";
import { fit, knownResults, predict } from "./model";
import { attendanceRates, bestPartner, duos, likelyLineup, lineupPrediction, seasonForm } from "./insights";
import { seedMatches, seedStandings, type SeedData } from "./seed";
import { US, type MatchEntry } from "./types";

const seed = seedJson as SeedData;
const standings = seedStandings(seed);
const matches = seedMatches(seed);
const model = fit(standings, knownResults(matches, standings));
const pool = new Set(standings.map((s) => s.team));

describe("vorm door het seizoen", () => {
  const form = seasonForm(model, matches, pool);

  it("telt punten en verwachting op per gespeelde wedstrijd", () => {
    expect(form.length).toBeGreaterThan(0);
    const last = form.at(-1)!;
    expect(last.cumPoints).toBe(form.reduce((s, f) => s + f.points, 0));
    expect(last.cumExpected).toBeCloseTo(form.reduce((s, f) => s + f.expected, 0), 10);
  });

  it("vorm is het gemiddelde over de laatste 5 duels (geen weekschommeling)", () => {
    const i = Math.min(form.length - 1, 5);
    const window = form.slice(Math.max(0, i - 4), i + 1);
    expect(form[i].form).toBeCloseTo(window.reduce((s, f) => s + f.points - f.expected, 0) / window.length, 10);
  });
});

const entry = (id: string, goals: [string, string | null][]): MatchEntry => ({
  matchId: id,
  attendance: [],
  stats: {},
  keeperId: null,
  opponentOwnGoals: 0,
  goals: goals.map(([scorerId, assistId]) => ({ scorerId, assistId, kind: "spel" })),
});

describe("duo's", () => {
  const played = matches.filter((m) => m.homeGoals !== null && (m.home === US || m.away === US)).slice(0, 2);
  const entries = {
    [played[0].id]: entry(played[0].id, [["a", "b"], ["a", "b"], ["c", "a"]]),
    [played[1].id]: entry(played[1].id, [["a", "b"], ["b", null]]),
  };

  it("telt aangever → scorer, meeste eerst", () => {
    expect(duos(matches, entries)[0]).toEqual({ assistId: "b", scorerId: "a", goals: 3 });
  });

  it("beste maatje telt beide kanten op", () => {
    expect(bestPartner(duos(matches, entries), "a")).toEqual({ partnerId: "b", goals: 3 });
    expect(bestPartner(duos(matches, entries), "c")).toBeNull();
  });
});

describe("winkans met deze spelers", () => {
  const base = predict(model, US, "Leerdam Sport'55 5", true);
  const impacts = {
    a: { games: 6, available: 6, injured: 0, pointsImpact: 0.4, defenceImpact: 0, eligible: true },
    b: { games: 6, available: 6, injured: 0, pointsImpact: -0.2, defenceImpact: 0, eligible: true },
  };
  const rates = { a: 0.5, b: 0.5 };

  it("een sterke speler erbij verhoogt de winkans, ontbreken verlaagt hem", () => {
    const withA = lineupPrediction(base, ["a"], impacts, rates).prediction.win;
    const without = lineupPrediction(base, [], impacts, rates).prediction.win;
    expect(withA).toBeGreaterThan(base.win);
    expect(without).toBeLessThan(withA);
  });

  it("bij de normale bezetting blijft de voorspelling gelijk", () => {
    const half = lineupPrediction(base, [], impacts, { a: 0, b: 0 });
    expect(half.deltaPoints).toBe(0);
    expect(half.prediction.win).toBeCloseTo(base.win, 6);
  });

  it("verwachte opstelling: vaste spelers die meestal meedoen en niet geblesseerd zijn", () => {
    const rows = [
      { entry: { ...entry("1", []), attendance: ["a", "b"] } },
      { entry: { ...entry("2", []), attendance: ["a"] } },
      { entry: { ...entry("3", []), attendance: ["a"], injured: ["c"] } },
    ];
    const r = attendanceRates(rows, ["a", "b", "c"]);
    expect(r.a).toBe(1);
    expect(r.b).toBeCloseTo(1 / 3, 10);
    expect(likelyLineup(r, new Set(), ["a", "b", "c"])).toEqual(["a"]);
    expect(likelyLineup(r, new Set(["a"]), ["a", "b"])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { GameRow } from "./awards";
import { manOfTheMatch, playersOfTheMonth, rateMatch, seasonRatings } from "./rating";
import { US, type Match, type PlayerMatchStats } from "./types";

const match = (id: string, date: string, us: number, them: number): Match => ({
  id,
  round: null,
  makeup: false,
  date,
  time: null,
  home: US,
  away: "X",
  homeGoals: us,
  awayGoals: them,
  venue: null,
  kind: "competitie",
  status: "gespeeld",
  source: "seed",
  edited: false,
});
const st = (goals: number, assists = 0): PlayerMatchStats => ({ goals, assists, yellow: false, red: false });
const row = (id: string, date: string, us: number, them: number, stats: Record<string, PlayerMatchStats>, d: { pts: number; ga: number; gf: number }): GameRow => ({
  match: match(id, date, us, them),
  entry: { matchId: id, attendance: ["k", "v", "m", "s"], stats, keeperId: "k", opponentOwnGoals: 0 },
  ptsDiff: d.pts,
  gaDiff: d.ga,
  gfDiff: d.gf,
});
const players = [
  { id: "k", position: "Middenvelder" as const },
  { id: "v", position: "Verdediger" as const },
  { id: "m", position: "Middenvelder" as const },
  { id: "s", position: "Aanvaller" as const },
];

describe("spelerspunten", () => {
  // 2-0 gewonnen terwijl 1-1 verwacht werd: 1 tegengoal minder en 1 goal meer dan verwacht
  const r = row("m1", "2026-10-03", 2, 0, { s: st(2), m: st(0, 1) }, { pts: 1.2, ga: 1, gf: 1 });
  const rated = Object.fromEntries(rateMatch(r, players).map((x) => [x.playerId, x]));

  it("wie keepte telt als keeper: veel punten voor de nul, niets voor de aanval", () => {
    expect(rated.k.defence).toBe(1.5);
    expect(rated.k.attack).toBe(0);
    expect(rated.k.own).toBe(1); // clean sheet
  });

  it("zuinig met teampunten: alleen erbij zijn bij een zege levert weinig op, zelf scoren veel", () => {
    // m deed mee zonder goal of assist, s scoorde twee keer
    expect(rated.m.team + rated.m.attack + rated.m.defence).toBeLessThan(1.5);
    expect(rated.s.total).toBeGreaterThan(3 * (rated.m.total - rated.m.own));
  });

  it("verdediger krijgt meer voor de verdediging, spits meer voor de aanval", () => {
    expect(rated.v.defence).toBeGreaterThan(rated.s.defence);
    expect(rated.s.attack).toBeGreaterThan(rated.v.attack);
  });

  it("goals en assists tellen mee; de topscorer is man van de wedstrijd", () => {
    expect(rated.s.own).toBe(6);
    expect(rated.m.own).toBe(2);
    expect(manOfTheMatch(r, players)?.playerId).toBe("s");
  });

  it("slechter dan verwacht kost punten", () => {
    const bad = row("m2", "2026-10-10", 0, 3, {}, { pts: -1.5, ga: -2, gf: -1 });
    expect(rateMatch(bad, players).every((x) => x.total < 0)).toBe(true);
    expect(manOfTheMatch(bad, players)).toBeNull();
  });

  it("seizoen en speler van de maand (minimaal 2 duels in die maand)", () => {
    const rows = [
      r,
      row("m3", "2026-10-17", 1, 0, { v: st(1) }, { pts: 0.5, ga: 0.5, gf: 0 }),
      row("m4", "2026-11-07", 1, 1, { m: st(1) }, { pts: 0, ga: 0, gf: 0 }),
    ];
    const season = seasonRatings(rows, players);
    expect(season[0].games).toBe(3);
    const months = playersOfTheMonth(rows, players);
    expect(months.map((x) => x.month)).toEqual(["2026-10", "2026-11"]);
    expect(months[1].playerId).toBe("m");
  });
});

describe("tijdelijke plek", () => {
  it("een middenvelder die in de verdediging stond, krijgt die wedstrijd de verdedigingsgewichten", () => {
    const base = row("m9", "2026-11-07", 1, 0, {}, { pts: 0.5, ga: 1, gf: 0 });
    const moved = { ...base, entry: { ...base.entry, positions: { m: "CV" as const } } };
    const d = (r: GameRow) => rateMatch(r, players).find((x) => x.playerId === "m")!.defence;
    expect(d(moved)).toBeGreaterThan(d(base));
    expect(d(moved)).toBe(rateMatch(moved, players).find((x) => x.playerId === "v")!.defence);
  });
});

describe("speler van de maand pas na afloop van de maand", () => {
  it("lopende maand telt nog niet", () => {
    const rows = [
      row("a1", "2026-10-03", 2, 0, { s: st(2) }, { pts: 1, ga: 1, gf: 1 }),
      row("a2", "2026-11-07", 2, 0, { m: st(2) }, { pts: 1, ga: 1, gf: 1 }),
    ];
    expect(playersOfTheMonth(rows, players, "2026-11").map((m) => m.month)).toEqual(["2026-10"]);
  });
});

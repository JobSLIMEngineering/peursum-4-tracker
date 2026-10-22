import { describe, expect, it } from "vitest";
import { hotStreaks } from "./streaks";
import { US, type Match, type MatchEntry, type PlayerMatchStats } from "./types";

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
const st = (goals: number): PlayerMatchStats => ({ goals, assists: 0, yellow: false, red: false });
const entry = (id: string, attendance: string[], stats: Record<string, PlayerMatchStats>, keeperId: string | null): MatchEntry => ({
  matchId: id,
  attendance,
  stats,
  keeperId,
  opponentOwnGoals: 0,
});

describe("on fire", () => {
  const matches = [
    match("m1", "2026-09-19", 1, 1),
    match("m2", "2026-09-26", 2, 0),
    match("m3", "2026-10-03", 3, 0),
  ];
  const entries = {
    m1: entry("m1", ["a", "b", "c", "k"], { c: st(1) }, "k"),
    m2: entry("m2", ["a", "b", "c", "k"], { b: st(1), c: st(1) }, "k"),
    m3: entry("m3", ["a", "b", "c", "k"], { a: st(2), c: st(1) }, "k"),
  };
  const out = hotStreaks(matches, entries);

  it("vlammetje bij 2 goals in de laatste wedstrijd", () => {
    expect(out.a).toEqual([{ kind: "scorer", reason: "2 goals in de laatste wedstrijd" }]);
  });

  it("vlammetje bij 3 goals in de laatste 3 duels (ook verspreid)", () => {
    expect(out.c).toEqual([{ kind: "scorer", reason: "3 goals in de laatste 3 duels" }]);
  });

  it("geen vlammetje bij één losse goal", () => {
    expect(out.b).toBeUndefined();
  });

  it("vlammetje bij goal + assist in de laatste wedstrijd", () => {
    const e2 = { ...entries, m3: entry("m3", ["a", "b", "c", "k"], { a: st(2), b: { ...st(1), assists: 1 }, c: st(1) }, "k") };
    expect(hotStreaks(matches, e2).b).toEqual([{ kind: "scorer", reason: "goal + assist in de laatste wedstrijd" }]);
  });

  it("na een grote zege krijgen alleen de 3 heetste spelers een vlam", () => {
    const big = match("m4", "2026-10-10", 8, 0);
    const stats = {
      p1: { ...st(3), assists: 0 },
      p2: { ...st(2), assists: 1 },
      p3: { ...st(1), assists: 1 },
      p4: { ...st(1), assists: 1 },
      p5: { ...st(1), assists: 1 },
    };
    const out2 = hotStreaks([big], { m4: entry("m4", Object.keys(stats), stats, null) });
    const hot = Object.keys(out2);
    expect(hot).toHaveLength(3);
    expect(hot).toContain("p1");
    expect(hot).toContain("p2");
  });

  it("handschoen met vuur bij 2+ clean sheets op rij", () => {
    expect(out.k).toEqual([{ kind: "keeper", reason: "2 clean sheets op rij" }]);
  });

  it("reeks breekt bij een wedstrijd met tegengoals", () => {
    const later = [...matches, match("m4", "2026-10-10", 1, 2)];
    const e2 = { ...entries, m4: entry("m4", ["a", "k"], {}, "k") };
    expect(hotStreaks(later, e2).k).toBeUndefined();
  });

  it("telt alleen wedstrijden met ingevoerde stats en geen oefenduels", () => {
    const oefen = { ...match("o1", "2026-10-11", 5, 0), kind: "oefen" as const };
    const out2 = hotStreaks([...matches, oefen], { ...entries, o1: entry("o1", ["b"], { b: st(5) }, null) });
    expect(out2.b).toBeUndefined();
  });
});

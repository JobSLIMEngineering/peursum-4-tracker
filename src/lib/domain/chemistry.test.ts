import { describe, expect, it } from "vitest";
import type { GameRow } from "./awards";
import { chemistry } from "./chemistry";
import { US, type Match } from "./types";

const row = (id: string, us: number, them: number, att: string[], pts: number, ga: number, goals: { scorerId: string; assistId: string }[] = []): GameRow => ({
  match: { id, round: null, makeup: false, date: "2026-10-01", time: null, home: US, away: "X", homeGoals: us, awayGoals: them, venue: null, kind: "competitie", status: "gespeeld", source: "seed", edited: false } as Match,
  entry: { matchId: id, attendance: att, stats: {}, keeperId: null, opponentOwnGoals: 0, goals: goals as never },
  ptsDiff: pts,
  gaDiff: ga,
  gfDiff: 0,
});

const rows = [
  row("1", 2, 0, ["a", "b", "c"], 0.8, 1, [{ scorerId: "a", assistId: "b" }]),
  row("2", 1, 0, ["a", "b"], 0.6, 0.8, [{ scorerId: "b", assistId: "a" }]),
  row("3", 0, 2, ["a", "c"], -1, -1),
  row("4", 1, 1, ["a", "c"], -0.8, -0.2),
];

describe("chemie", () => {
  it("telt duels samen, winst/gelijk/verlies en duo-goals (beide kanten op)", () => {
    const c = chemistry(rows, "a", "b");
    expect([c.games, c.won, c.drawn, c.lost, c.duoGoals]).toEqual([2, 2, 0, 0, 2]);
    expect(c.level).toBe("goed");
  });
  it("slecht als het samen slechter gaat dan verwacht; verdediging kijkt naar tegengoals", () => {
    expect(chemistry(rows, "a", "c").level).toBe("slecht");
    expect(chemistry(rows, "a", "c", true).level).toBe("slecht");
  });
  it("te weinig samen = normaal", () => {
    expect(chemistry(rows, "b", "c").level).toBe("normaal");
  });
});

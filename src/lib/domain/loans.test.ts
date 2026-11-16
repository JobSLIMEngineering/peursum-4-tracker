import { describe, expect, it } from "vitest";
import type { GameRow } from "./awards";
import { ownVsLoan } from "./loans";
import { US, type PlayerMatchStats } from "./types";

const st = (goals: number, assists = 0): PlayerMatchStats => ({ goals, assists, yellow: false, red: false });
const row = (id: string, us: number, them: number, attendance: string[], stats: Record<string, PlayerMatchStats> = {}): GameRow =>
  ({
    match: { id, home: US, away: "X", homeGoals: us, awayGoals: them, status: "gespeeld", kind: "competitie", date: "2026-10-01" },
    entry: { matchId: id, attendance, stats, keeperId: null, opponentOwnGoals: 0 },
    ptsDiff: 0,
    gaDiff: 0,
    gfDiff: 0,
  }) as unknown as GameRow;

const players = [
  { id: "a", type: "vast" as const },
  { id: "b", type: "vast" as const },
  { id: "l1", type: "leen" as const },
  { id: "l2", type: "leen" as const },
];

describe("eigen ploeg en leenspelers", () => {
  const r = ownVsLoan(
    [
      row("1", 2, 0, ["a", "b"], { a: st(2) }),
      row("2", 1, 1, ["a", "b"], { b: st(1) }),
      row("3", 1, 3, ["a", "l1", "l2"], { l1: st(1) }),
      row("4", 3, 2, ["b", "l1"], { a: st(0, 1), l1: st(2, 1), b: st(1) }),
    ],
    players,
  );

  it("splitst de wedstrijden: alleen eigen spelers of met minstens één leenspeler", () => {
    expect(r.own).toEqual({ games: 2, w: 1, d: 1, l: 0, points: 4, goalsFor: 3, goalsAgainst: 1 });
    expect(r.loan).toEqual({ games: 2, w: 1, d: 0, l: 1, points: 3, goalsFor: 4, goalsAgainst: 5 });
    expect(r.loansPerGame).toBe(1.5);
  });

  it("telt goals en assists van eigen spelers en leenspelers apart", () => {
    expect(r.goals).toEqual({ own: 4, loan: 3 });
    expect(r.assists).toEqual({ own: 1, loan: 1 });
  });
});

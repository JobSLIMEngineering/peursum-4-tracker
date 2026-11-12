import { describe, expect, it } from "vitest";
import type { GameRow } from "./awards";
import { monthlyOveralls, newMilestones, playerSeason, reachedMilestones, teamOfTheMonth, upgrades } from "./season-stats";
import { US, type Match, type PlayerMatchStats, type Position } from "./types";

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
const row = (id: string, date: string, us: number, them: number, att: string[], stats: Record<string, PlayerMatchStats>, gaDiff = 0.5): GameRow => ({
  match: match(id, date, us, them),
  entry: { matchId: id, attendance: att, stats, keeperId: "k", opponentOwnGoals: 0 },
  ptsDiff: us > them ? 1 : -1,
  gaDiff,
  gfDiff: 0.5,
});

const pos: [string, Position, string?][] = [
  ["k", "Keeper"],
  ["lb", "Verdediger", "LB"],
  ["c1", "Verdediger"],
  ["c2", "Verdediger"],
  ["rb", "Verdediger", "RB"],
  ["m1", "Middenvelder"],
  ["m2", "Middenvelder"],
  ["m3", "Middenvelder"],
  ["lv", "Aanvaller", "LV"],
  ["sp", "Aanvaller"],
  ["rv", "Aanvaller", "RV"],
  ["bank", "Aanvaller"],
];
const players = pos.map(([id, position, role]) => ({ id, position, active: true, role: (role ?? null) as never }));
const all = pos.slice(0, 11).map(([id]) => id);
const rows = [
  row("1", "2026-09-19", 3, 0, all, { sp: st(2), m1: st(1, 1) }),
  row("2", "2026-09-26", 2, 0, all, { sp: st(1), lv: st(1) }),
  row("3", "2026-10-03", 4, 0, [...all.slice(0, 10), "bank"], { bank: st(3), m2: st(1) }),
  row("4", "2026-10-10", 1, 2, [...all.slice(0, 10), "bank"], { sp: st(1) }, -1),
];

describe("team van de maand", () => {
  it("4-3-3 met een 10 en twee daarachter, de rol die past, alleen wie die maand speelde", () => {
    const team = teamOfTheMonth(rows, players, "2026-09");
    expect(team.map((l) => l.length)).toEqual([1, 4, 2, 1, 3]);
    // middenvelders zonder 6/8/10-rol vullen het middenveld
    expect([...team[2], ...team[3]].every((s) => ["m1", "m2", "m3"].includes(s.playerId!))).toBe(true);
    expect(team[0][0].playerId).toBe("k");
    expect(team[1][0].playerId).toBe("lb");
    expect(team[1][3].playerId).toBe("rb");
    expect(team[4][0].playerId).toBe("lv");
    expect(team.flat().some((s) => s.playerId === "bank")).toBe(false);
  });

  it("strikt één speler per plek: speelde de rechtsbuiten niet, dan blijft die plek leeg", () => {
    const team = teamOfTheMonth(rows, players, "2026-10");
    expect(team.flat().some((s) => s.playerId === "rv")).toBe(false);
    expect(team[4][2].playerId).toBeNull();
    // geen tweede spits op de vleugel
    expect(team.flat().filter((s) => s.playerId === "bank" || s.playerId === "sp").length).toBe(1);
  });
});

describe("kaart per maand en upgrades", () => {
  it("cijfer per maand en een upgrade voor wie sterk stijgt", () => {
    const m = monthlyOveralls(rows, players);
    expect(m.months).toEqual(["2026-09", "2026-10"]);
    expect(m.overall.bank[0]).toBeNull();
    const up = upgrades(m, rows);
    for (const v of Object.values(up)) expect(v).toBeGreaterThanOrEqual(2);
  });
});

describe("mijlpalen", () => {
  it("hattrick in de laatste wedstrijd en haalbare stappen", () => {
    const upTo3 = rows.slice(0, 3);
    expect(newMilestones(upTo3, players).find((m) => m.playerId === "bank")?.text).toBe("Hattrick tegen X");
    expect(reachedMilestones(rows, "sp")).toEqual([]);
    expect(playerSeason("bank", rows, players, [], {}).hattricks).toBe(1);
  });
});

describe("seizoen van één speler", () => {
  it("keeper: tegengoals tegenover verwacht", () => {
    const s = playerSeason("k", rows, players, rows.map((r) => r.match), Object.fromEntries(rows.map((r) => [r.match.id, r.entry])));
    expect(s.keeper).toMatchObject({ games: 4, cleanSheets: 3, against: 2 });
    expect(s.keeper!.expected).toBeCloseTo(2 + 0.5 * 3 - 1, 10);
    expect(s.record).toEqual({ w: 3, d: 0, l: 1 });
  });
});

describe("tijdelijke plek in het team van de maand", () => {
  it("telt de plek die hij die maand speelde", () => {
    // De linksback is in oktober op vakantie; m1 (middenvelder) neemt zijn plek in
    const moved = rows.map((r) =>
      r.match.date!.startsWith("2026-10")
        ? { ...r, entry: { ...r.entry, attendance: r.entry.attendance.filter((x) => x !== "lb"), positions: { m1: "LB" as const } } }
        : r,
    );
    const team = teamOfTheMonth(moved, players, "2026-10");
    // m1 speelde in oktober als linksback: hij mag in de verdediging staan
    expect(team[1][0].playerId).toBe("m1");
  });
});

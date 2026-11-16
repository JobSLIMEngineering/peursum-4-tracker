import { describe, expect, it } from "vitest";
import { buildAdvice, type AdviceInput } from "./advice";
import type { GameRow } from "./awards";
import { US, type Position } from "./types";

const row = (id: string, us: number, them: number, attendance: string[], gfDiff = 0): GameRow =>
  ({
    match: { id, home: US, away: "X", homeGoals: us, awayGoals: them, status: "gespeeld", kind: "competitie", date: `2026-10-0${id}` },
    entry: { matchId: id, attendance, stats: {}, keeperId: null, opponentOwnGoals: 0 },
    ptsDiff: 0,
    gaDiff: 0,
    gfDiff,
  }) as unknown as GameRow;

const p = (id: string, position: Position, type: "vast" | "leen" = "vast") => ({ id, name: id, hiddenNo: null, type, active: true, position, role: null });

// 1 keeper, 4 verdedigers, maar 1 middenvelder, 3 aanvallers + 2 reserves die altijd meedoen
const players = [
  p("k", "Keeper"),
  ...["v1", "v2", "v3", "v4"].map((id) => p(id, "Verdediger")),
  p("m1", "Middenvelder"),
  ...["a1", "a2", "a3", "a4", "a5"].map((id) => p(id, "Aanvaller")),
  p("l1", "Middenvelder", "leen"),
];
const all = players.filter((x) => x.type === "vast").map((x) => x.id);

const base = (over: Partial<AdviceInput> = {}): AdviceInput => ({
  rows: [row("1", 2, 0, [...all, "l1"]), row("2", 1, 1, [...all, "l1"]), row("3", 0, 1, all)],
  players,
  overall: {},
  impacts: {},
  model: { mu: 1.4, attack: {}, defence: {}, opponents: {} },
  matches: [],
  pool: new Set(),
  injured: new Set(),
  next: null,
  label: (id) => id,
  ...over,
});

describe("adviezen", () => {
  it("ziet dat er te weinig middenvelders zijn en raadt aan om er een aan te trekken", () => {
    const a = buildAdvice(base());
    const d = a.find((x) => x.key === "diepte")!;
    expect(d.title).toBe("Te weinig middenvelders");
    expect(a.map((x) => x.key)).toContain("keeper");
    expect(a.map((x) => x.key)).toContain("leen");
  });

  it("zwijgt over de selectie bij te weinig wedstrijden", () => {
    const a = buildAdvice(base({ rows: [row("1", 2, 0, all)] }));
    expect(a.filter((x) => x.kind === "selectie" && x.key !== "linie")).toEqual([]);
  });

  it("afronding: ver onder verwachting geeft een werkpunt", () => {
    const rows = [row("1", 0, 0, all, -1), row("2", 1, 1, all, -0.8), row("3", 0, 1, all, -0.6)];
    expect(buildAdvice(base({ rows })).find((x) => x.key === "afronding")?.tone).toBe("let op");
  });

  it("lichtste linie op kaartcijfer", () => {
    const overall = { v1: 80, v2: 80, v3: 80, v4: 80, a1: 70, a2: 70, a3: 70, a4: 70, a5: 70, m1: 75 };
    expect(buildAdvice(base({ overall })).find((x) => x.key === "linie")?.title).toBe("Aanval is het lichtst");
  });

  it("de adviezen staan op belangrijkheid", () => {
    const a = buildAdvice(base());
    expect(a.map((x) => x.weight)).toEqual([...a.map((x) => x.weight)].sort((x, y) => y - x));
  });
});

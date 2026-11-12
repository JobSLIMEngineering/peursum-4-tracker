import { describe, expect, it } from "vitest";
import type { GameRow } from "./awards";
import { playerCards } from "./playercard";
import { US, type Match, type PlayerMatchStats } from "./types";

const match = (id: string, us: number, them: number): Match => ({
  id,
  round: null,
  makeup: false,
  date: `2026-10-0${id.slice(1)}`,
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
const row = (id: string, us: number, them: number, att: string[], stats: Record<string, PlayerMatchStats>): GameRow => ({
  match: match(id, us, them),
  entry: { matchId: id, attendance: att, stats, keeperId: "k", opponentOwnGoals: 0 },
  ptsDiff: 0.5,
  gaDiff: 0.5,
  gfDiff: 0.5,
});

const players = [
  { id: "k", position: "Keeper" as const, active: true },
  { id: "s", position: "Aanvaller" as const, active: true },
  { id: "m", position: "Middenvelder" as const, active: true },
  { id: "v", position: "Verdediger" as const, active: true },
  { id: "x", position: "Aanvaller" as const, active: true },
];
const rows = [
  row("1", 3, 0, ["k", "s", "m", "v"], { s: st(2), m: st(0, 2) }),
  row("2", 2, 0, ["k", "s", "m", "v"], { s: st(1), m: st(1, 1) }),
  row("3", 1, 1, ["k", "s", "v", "x"], { x: st(1) }),
];
const cards = playerCards(rows, players, {});

describe("spelerskaart", () => {
  it("de topscorer heeft het hoogste aanvalscijfer, de aangever het hoogste PAS-cijfer", () => {
    const aan = (id: string) => cards[id].stats.find((s) => s.key === "AAN")!.value;
    const pas = (id: string) => cards[id].stats.find((s) => s.key === "PAS")!.value;
    expect(aan("s")).toBeGreaterThan(aan("v"));
    expect(pas("m")).toBeGreaterThan(pas("s"));
  });

  it("keeper heeft NUL in plaats van AAN; cijfers tussen 70 en 99", () => {
    expect(cards.k.stats.map((s) => s.key)).toEqual(["NUL", "PAS", "VER", "VRM", "INZ", "IMP"]);
    for (const c of Object.values(cards))
      for (const s of c.stats) {
        expect(s.value).toBeGreaterThanOrEqual(70);
        expect(s.value).toBeLessThanOrEqual(99);
      }
  });

  it("wie maar één duel speelde zit dicht bij het midden", () => {
    expect(cards.x.games).toBe(1);
    expect(Math.abs(cards.x.overall - 76)).toBeLessThan(6);
  });

  it("positie en kleur van de kaart", () => {
    expect(cards.s.pos).toBe("ST");
    expect(cards.k.pos).toBe("GK");
    expect(["goud", "glans"]).toContain(cards.s.tier);
  });

});

describe("afwezig: kaart zakt", () => {
  it("2 op rij afwezig −1, 3 op rij −2; blessure telt niet", () => {
    const extra = [
      row("4", 1, 0, ["k", "s", "v"], {}),
      row("5", 1, 0, ["k", "s", "v"], {}),
    ];
    const c = playerCards([...rows, ...extra], players, {});
    // m deed mee in 1 en 2, miste 3, 4 en 5
    expect(c.m.absentRun).toBe(3);
    expect(c.m.penalty).toBe(2);
    const hurt = extra.map((r) => ({ ...r, entry: { ...r.entry, injured: ["m"] } }));
    const c2 = playerCards([...rows, ...hurt], players, {});
    expect(c2.m.absentRun).toBe(1);
    expect(c2.m.penalty).toBe(0);
  });
});

describe("echte seizoenscijfers op de kaart", () => {
  it("veldspeler: wedstrijden, goals, assists, punten, man van de wedstrijd, opkomst", () => {
    const f = Object.fromEntries(cards.s.facts.map((x) => [x.key, x.text]));
    expect(Object.keys(f)).toEqual(["WED", "GOL", "AST", "PNT", "MVW", "OPK"]);
    expect(f.WED).toBe("3");
    expect(f.GOL).toBe("3");
    expect(f.OPK).toBe("100%");
  });

  it("keeper: clean sheets, tegengoals en tegen t.o.v. verwacht", () => {
    const f = Object.fromEntries(cards.k.facts.map((x) => [x.key, x.text]));
    expect(Object.keys(f)).toEqual(["WED", "NUL", "TEG", "VRW", "MVW", "OPK"]);
    expect(f.NUL).toBe("2");
    expect(f.TEG).toBe("1");
    // 3 duels × 0,5 minder tegen dan verwacht
    expect(f.VRW).toBe("+1,5");
  });
});

describe("bovenin lastiger", () => {
  it("elk punt boven 78 kost meer, boven 88 nog meer", async () => {
    const { compress } = await import("./playercard");
    expect(compress(75)).toBe(75);
    expect(compress(88)).toBe(84);
    expect(compress(98)).toBeCloseTo(87, 5);
  });
});

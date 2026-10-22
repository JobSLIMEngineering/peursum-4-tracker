import { describe, expect, it } from "vitest";
import { computeAwards, keeperCompare, playerImpacts, prizeLeads, type AwardPlayer, type GameRow } from "./awards";
import { toDraft, toEntry, toggleInjured } from "./entry";
import { spotlights } from "./spotlight";
import { US, type Match, type MatchEntry, type PlayerMatchStats, type StandingRow } from "./types";

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
const st = (goals: number, assists = 0, card: "" | "y" | "r" = ""): PlayerMatchStats => ({
  goals,
  assists,
  yellow: card === "y",
  red: card === "r",
});
const row = (
  id: string,
  us: number,
  them: number,
  attendance: string[],
  stats: Record<string, PlayerMatchStats>,
  opts: { keeper?: string; injured?: string[]; ptsDiff?: number; gaDiff?: number } = {},
): GameRow => {
  const entry: MatchEntry = {
    matchId: id,
    attendance,
    stats,
    keeperId: opts.keeper ?? null,
    opponentOwnGoals: 0,
    ...(opts.injured ? { injured: opts.injured } : {}),
  };
  return { match: match(id, `2026-09-${10 + Number(id.slice(1))}`, us, them), entry, ptsDiff: opts.ptsDiff ?? 0, gaDiff: opts.gaDiff ?? 0 };
};
const pl = (id: string, position: AwardPlayer["position"] = "Aanvaller"): AwardPlayer => ({
  id,
  name: id,
  position,
  type: "vast",
  hiddenNo: null,
  active: true,
});

describe("blessures per wedstrijd", () => {
  it("geblesseerd melden haalt de speler uit de aanwezigen en zijn doelpunten", () => {
    const d = toDraft(undefined, 1);
    const withA = { ...d, attendance: ["a", "b"], goals: [{ scorerId: "a", assistId: "b", kind: "spel" as const }] };
    const out = toggleInjured(withA, "a");
    expect(out.attendance).toEqual(["b"]);
    expect(out.injured).toEqual(["a"]);
    expect(out.goals[0].scorerId).toBeUndefined();
    expect(toggleInjured(out, "a").injured).toEqual([]);
  });

  it("wordt opgeslagen in de invoer en komt terug in het concept", () => {
    const d = { ...toDraft(undefined, 0), attendance: ["b"], injured: ["a"] };
    const e = toEntry(d, "m1");
    expect(e.injured).toEqual(["a"]);
    expect(toDraft(e, 0).injured).toEqual(["a"]);
    expect(toEntry({ ...d, injured: [] }, "m1")).not.toHaveProperty("injured");
  });
});

describe("impact: eerlijk bij blessures", () => {
  // a speelt 3 van de 3 fitte duels; b mist 3 duels door een blessure en speelt de andere 3
  const rows = [
    row("m1", 2, 0, ["a"], {}, { injured: ["b"], ptsDiff: 1 }),
    row("m2", 2, 0, ["a"], {}, { injured: ["b"], ptsDiff: 1 }),
    row("m3", 2, 0, ["a"], {}, { injured: ["b"], ptsDiff: 1 }),
    row("m4", 1, 1, ["a", "b"], {}, { ptsDiff: 0.5 }),
    row("m5", 1, 1, ["a", "b"], {}, { ptsDiff: 0.5 }),
    row("m6", 1, 1, ["a", "b"], {}, { ptsDiff: 0.5 }),
  ];
  const imp = playerImpacts([pl("a"), pl("b")], rows);

  it("geblesseerde wedstrijden tellen niet als 'zonder hem'", () => {
    expect(imp.b.available).toBe(3);
    expect(imp.b.injured).toBe(3);
    expect(imp.b.games).toBe(3);
    // Zonder b (fit) is er niets om mee te vergelijken: alleen zijn eigen duels tellen
    expect(imp.b.pointsImpact).toBeCloseTo(1.5 / 6, 10);
    expect(imp.b.eligible).toBe(true);
  });

  it("met minder dan 3 duels geen kans op een impactprijs", () => {
    const few = playerImpacts([pl("c")], [row("m1", 1, 0, ["c"], {}), row("m2", 1, 0, ["c"], {})]);
    expect(few.c.eligible).toBe(false);
  });

  it("wie vaak ontbreekt terwijl hij fit is, dingt niet mee", () => {
    const r = [1, 2, 3, 4, 5, 6, 7].map((i) => row(`m${i}`, 1, 0, i <= 3 ? ["d"] : [], {}));
    expect(playerImpacts([pl("d")], r).d.eligible).toBe(false);
  });
});

describe("prijzen", () => {
  const rows = [
    row("m1", 3, 0, ["a", "b", "k", "m"], { a: st(2, 0, "y"), b: st(1, 2) }, { keeper: "k", gaDiff: 1, ptsDiff: 0.4 }),
    row("m2", 1, 0, ["a", "b", "k", "m"], { b: st(1) }, { keeper: "k", gaDiff: 1, ptsDiff: 0.6 }),
    row("m3", 2, 2, ["a", "k", "m"], { a: st(1, 0, "r"), m: st(1, 1) }, { keeper: "k", gaDiff: -1, ptsDiff: -0.5 }),
    row("m4", 1, 3, ["a", "b", "j"], { a: st(1) }, { keeper: "j", gaDiff: -2, ptsDiff: -1 }),
    row("m5", 0, 1, ["a", "b", "j"], {}, { keeper: "j", gaDiff: 0, ptsDiff: -0.6 }),
  ];
  const players = [pl("a"), pl("b"), pl("k", "Keeper"), pl("j", "Keeper"), pl("m", "Middenvelder")];
  const standings: StandingRow[] = [
    { team: US, position: 1, played: 5, won: 3, drawn: 1, lost: 1, goalsFor: 7, goalsAgainst: 6, points: 10 },
    { team: "Y", position: 2, played: 5, won: 3, drawn: 0, lost: 2, goalsFor: 9, goalsAgainst: 4, points: 9 },
    { team: "Z", position: 3, played: 5, won: 0, drawn: 0, lost: 5, goalsFor: 2, goalsAgainst: 15, points: 0 },
  ];
  const awards = computeAwards(players, rows, standings);
  const get = (k: string) => awards.find((a) => a.key === k)!;

  it("Gouden Schoen en Assistkoning tellen goals en assists", () => {
    expect(get("schoen").leader).toBe("a");
    expect(get("schoen").rows[0]).toMatchObject({ display: "4", unit: "goals", detail: "in 5 duels" });
    expect(get("assist").leader).toBe("b");
  });

  it("Gouden Handschoen: meeste clean sheets, vanaf 2 duels op doel", () => {
    const h = get("handschoen");
    expect(h.leader).toBe("k");
    expect(h.rows[0]).toMatchObject({ display: "2", unit: "clean sheets" });
    // 2 tegen in 3 duels = 0,67 per duel: beter dan Y (0,8), dus de beste van de poule
    expect(h.compare).toMatchObject({ rank: 1, teams: 3, best: { team: "Y", perGame: 0.8 } });
  });

  it("Kaartenkoning: geel 1 punt, rood 3", () => {
    expect(get("kaarten").rows[0]).toMatchObject({ playerId: "a", display: "4", detail: "1× geel · 1× rood" });
  });

  it("Beste Middenvelder pas met genoeg duels", () => {
    expect(get("mvm").leader).toBe("m");
    expect(get("muur").leader).toBeNull();
  });

  it("icoontjes voor koplopers", () => {
    expect(prizeLeads(awards).a).toEqual(["schoen", "kaarten"]);
  });

  it("keeper vergeleken met de competitie", () => {
    expect(keeperCompare(1, standings)).toMatchObject({ rank: 2, teams: 3 });
  });
});

describe("let op deze speler", () => {
  const rows = [
    row("m1", 3, 0, ["a", "b", "k"], { a: st(2), b: st(1, 2) }, { keeper: "k" }),
    row("m2", 2, 0, ["a", "b", "k"], { a: st(1, 1), b: st(1, 1) }, { keeper: "k" }),
  ];
  const players = [pl("a"), pl("b", "Middenvelder"), pl("k", "Keeper")];
  const standings: StandingRow[] = [
    { team: US, position: 1, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 5, goalsAgainst: 0, points: 6 },
    { team: "Opp", position: 2, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, points: 3 },
  ];
  const prediction = { xgUs: 2, xgThem: 1, matrix: [[0.1, 0.1], [0.2, 0.1]] };
  const cards = spotlights({ players, rows, prediction, opponent: "Opp", standings, seed: "x" });

  it("scorer, aangever en keeper met kansen voor deze wedstrijd", () => {
    expect(cards.map((c) => [c.kind, c.playerId])).toEqual([
      ["scorer", "a"],
      ["aangever", "b"],
      ["keeper", "k"],
    ]);
    expect(cards[0].chance).toBeGreaterThan(0.3);
    expect(cards[0].chance).toBeLessThan(1);
    expect(cards[2].chance).toBeCloseTo(0.3, 10);
    expect(cards[2].text).toMatch(/2 clean sheets op rij|De nul staat al 2 duels/);
  });

  it("wie de laatste wedstrijd geblesseerd was, krijgt geen kaartje", () => {
    const hurt = [...rows, row("m3", 1, 0, ["b", "k"], {}, { keeper: "k", injured: ["a"] })];
    const out = spotlights({ players, rows: hurt, prediction, opponent: "Opp", standings, seed: "x" });
    expect(out.find((c) => c.playerId === "a")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import seedJson from "../../../docs/seed-data.json";
import reference from "./__fixtures__/prototype-model.json";
import { parseAttendance } from "./attendance";
import { deriveRound, type SnapshotRow } from "./derive";
import { fit, knownResults, predict, verdict } from "./model";
import { buildRounds, ourMatch, splitRounds } from "./rounds";
import { seedMatches, seedPlayers, seedStandings, type SeedData } from "./seed";
import { assignedGoals, lastMatches, leaders, perMatchStats, playerTotals } from "./stats";
import { opponent, type MatchEntry, US } from "./types";

const seed = seedJson as SeedData;
const standings = seedStandings(seed);
const matches = seedMatches(seed);
const players = seedPlayers(seed);
const TODAY = "2026-10-10";

describe("seed-data", () => {
  it("bevat 132 wedstrijden (20 met uitslag), 12 teams en 22 spelers", () => {
    expect(matches).toHaveLength(132);
    expect(matches.filter((m) => m.homeGoals !== null)).toHaveLength(20);
    expect(standings).toHaveLength(12);
    expect(players).toHaveLength(22);
    expect(players.filter((p) => p.hiddenNo)).toHaveLength(5);
  });
});

describe("winkansmodel", () => {
  const model = fit(standings, knownResults(matches, standings));

  it("geeft dezelfde sterktes als het prototype", () => {
    expect(model.mu).toBeCloseTo(reference.mu, 10);
    for (const t of Object.keys(reference.a)) {
      expect(model.attack[t]).toBeCloseTo(reference.a[t as keyof typeof reference.a], 10);
      expect(model.defence[t]).toBeCloseTo(reference.d[t as keyof typeof reference.d], 10);
    }
  });

  it("Peursum – Leerdam: ±70% winst en ±2,2 – 0,8 verwachte goals", () => {
    const p = predict(model, US, "Leerdam Sport'55 5", true);
    expect(p.win).toBeCloseTo(0.6986, 3);
    expect(p.xgUs).toBeCloseTo(2.24, 2);
    expect(p.xgThem).toBeCloseTo(0.81, 2);
    expect(p.best).toMatchObject({ us: 2, them: 0 });
    expect(verdict(p)).toBe("Favoriet");
  });

  it("komt voor alle komende wedstrijden overeen met het prototype", () => {
    for (const [key, ref] of Object.entries(reference.pred)) {
      const [oppSide] = key.split("|");
      const [opp, side] = oppSide.split("@");
      const p = predict(model, US, opp, side === "H");
      expect(p.win, key).toBeCloseTo(ref.w, 10);
      expect(p.xgThem, key).toBeCloseTo(ref.lt, 10);
    }
  });

  it("kanssom is 1 en matrix is 6 × 6", () => {
    const p = predict(model, US, "Arkel 4", false);
    expect(p.win + p.draw + p.loss).toBeCloseTo(1, 10);
    expect(p.matrix).toHaveLength(6);
    expect(p.matrix[0]).toHaveLength(6);
  });
});

describe("rondes", () => {
  const groups = buildRounds(matches);
  const { upcoming, done, defaultOpen } = splitRounds(groups, TODAY);

  it("maakt 22 rondes en 4 inhaalgroepen", () => {
    expect(groups.filter((g) => g.kind === "ronde")).toHaveLength(22);
    expect(groups.filter((g) => g.kind === "inhaal").map((g) => g.date)).toEqual([
      "2026-10-17",
      "2026-11-10",
      "2026-12-12",
    ]);
    expect(groups.find((g) => g.kind === "inhaal" && g.date === "2026-12-12")?.matches).toHaveLength(2);
  });

  it("ronde 6 (Leerdam, 31 okt) staat standaard open", () => {
    const r6 = groups.find((g) => g.kind === "ronde" && g.round === 6)!;
    expect(r6.date).toBe("2026-10-31");
    expect(opponent(ourMatch(r6)!)).toBe("Leerdam Sport'55 5");
    expect(defaultOpen[0]).toBe("r6");
  });

  it("VVAC – Peursum staat in ronde 5 als niet ingepland", () => {
    const r5 = groups.find((g) => g.kind === "ronde" && g.round === 5)!;
    const o = ourMatch(r5)!;
    expect(o).toMatchObject({ home: "VVAC 6", away: US, status: "niet ingepland", date: null });
    expect(upcoming).toContain(r5);
  });

  it("de laatst gespeelde ronde is ronde 4 en staat ook open", () => {
    expect(done[0]).toMatchObject({ kind: "ronde", round: 4 });
    expect(defaultOpen).toContain("r4");
  });

  it("zet Peursum bovenaan in een ronde", () => {
    for (const g of groups.filter((x) => ourMatch(x))) {
      expect(g.matches[0]).toBe(ourMatch(g));
    }
  });
});

describe("uitslagen afleiden uit standen", () => {
  const snap = (rows: [string, number, number, number][]): SnapshotRow[] =>
    rows.map(([team, played, goalsFor, goalsAgainst]) => ({ team, played, goalsFor, goalsAgainst }));

  it("koppelt gespiegelde scores en neemt thuis/uit uit het programma", () => {
    const prev = snap([["A", 1, 2, 2], ["B", 1, 1, 0], ["C", 1, 0, 3], ["D", 1, 3, 1]]);
    const cur = snap([["A", 2, 3, 5], ["B", 2, 4, 1], ["C", 2, 2, 3], ["D", 2, 3, 3]]);
    const { results, unsure } = deriveRound(prev, cur, [
      { home: "B", away: "A" },
      { home: "C", away: "D" },
    ]);
    expect(unsure).toEqual([]);
    expect(results).toEqual([
      { home: "B", away: "A", homeGoals: 3, awayGoals: 1 },
      { home: "C", away: "D", homeGoals: 2, awayGoals: 0 },
    ]);
  });

  it("laat het programma beslissen bij twee gelijke uitslagen", () => {
    const prev = snap([["A", 0, 0, 0], ["B", 0, 0, 0], ["C", 0, 0, 0], ["D", 0, 0, 0]]);
    const cur = snap([["A", 1, 1, 1], ["B", 1, 1, 1], ["C", 1, 1, 1], ["D", 1, 1, 1]]);
    const { results } = deriveRound(prev, cur, [
      { home: "A", away: "C" },
      { home: "D", away: "B" },
    ]);
    expect(results).toEqual([
      { home: "A", away: "C", homeGoals: 1, awayGoals: 1 },
      { home: "D", away: "B", homeGoals: 1, awayGoals: 1 },
    ]);
  });

  it("raadt niet als het niet eenduidig is", () => {
    const prev = snap([["A", 0, 0, 0], ["B", 0, 0, 0]]);
    const cur = snap([["A", 1, 2, 0], ["B", 1, 1, 0]]);
    expect(deriveRound(prev, cur, [{ home: "A", away: "B" }])).toEqual({
      results: [],
      unsure: ["A", "B"],
    });
  });
});

describe("aanwezigheidslijst", () => {
  const pl = [
    { id: "1", name: "Tom Rietveld" },
    { id: "2", name: "Jasper van Eeuwijk" },
    { id: "3", name: "Luuk Bobbe" },
    { id: "4", name: "Luuk de Wilt" },
    { id: "5", name: "Fabian Jelovic" },
    { id: "6", name: null },
  ];

  it("verwijdert nummering, bullets, emoji en tekst tussen haakjes", () => {
    const r = parseAttendance("1. Tom Rietveld\n- Jasper van Eeuwijk (keeper) ⚽\n• Fabián Jelovic", pl);
    expect(r).toEqual({ found: ["1", "2", "5"], unknown: [] });
  });

  it("matcht op voor- en achternaam en op unieke voornaam", () => {
    expect(parseAttendance("Jasper Eeuwijk, Fabian", pl).found).toEqual(["2", "5"]);
  });

  it("matcht geen voornaam die twee keer voorkomt en meldt onbekenden één keer", () => {
    expect(parseAttendance("Luuk; Kees Kamp; kees kamp", pl)).toEqual({
      found: [],
      unknown: ["Luuk", "Kees Kamp"],
    });
  });
});

describe("spelersstatistieken", () => {
  // Peursum 4 – Hardinxveld 5 (6-0) en SVS'65 3 (2-0), plus een oefenduel dat niet meetelt
  const hardinxveld = matches.find((m) => m.home === US && m.away === "Hardinxveld 5")!;
  const svs = matches.find((m) => m.home === US && m.away === "SVS'65 3")!;
  const oefen = { ...hardinxveld, id: "oefen", kind: "oefen" as const };
  const all = [...matches, oefen];
  const s = (goals = 0, assists = 0, yellow = false, red = false) => ({ goals, assists, yellow, red });

  const entries: MatchEntry[] = [
    {
      matchId: hardinxveld.id,
      attendance: ["p1", "p2", "p3", "p4"],
      stats: { p1: s(3, 1), p2: s(2, 2, true), p3: s(0, 1, true, true) },
      keeperId: "p4",
      opponentOwnGoals: 1,
    },
    {
      matchId: svs.id,
      attendance: ["p1", "p4"],
      stats: { p1: s(1), p4: s(0, 0, true) },
      keeperId: "p4",
      opponentOwnGoals: 0,
    },
    { matchId: "oefen", attendance: ["p2"], stats: { p2: s(5) }, keeperId: "p2", opponentOwnGoals: 0 },
  ];
  const t = playerTotals(players, all, entries);

  it("een ingevoerde 6-0 heeft zes toegewezen goals", () => {
    expect(assignedGoals(entries[0])).toBe(6);
  });

  it("telt goals, assists en opkomst alleen in competitie", () => {
    expect(t.p1).toMatchObject({ goals: 4, assists: 1, appearances: 2 });
    expect(t.p2).toMatchObject({ goals: 2, assists: 2, appearances: 1, keeperGames: 0 });
    expect(leaders(players, t, "goals")).toEqual({ players: [players[0]], value: 4 });
  });

  it("twee keer geel telt als rood, niet als geel", () => {
    expect(t.p3).toMatchObject({ yellow: 0, red: 1 });
    expect(t.p2).toMatchObject({ yellow: 1, red: 0 });
  });

  it("keeper krijgt duels, clean sheets en tegengoals uit de uitslag", () => {
    expect(t.p4).toMatchObject({ keeperGames: 2, cleanSheets: 2, goalsAgainst: 0, yellow: 1 });
  });

  it("geeft alle namen bij gelijkstand", () => {
    expect(leaders(players, t, "assists").players.map((p) => p.id)).toEqual(["p2"]);
    const tie = playerTotals(players, all, [
      { ...entries[1], stats: { p1: s(1), p2: s(1) }, keeperId: null },
    ]);
    expect(leaders(players, tie, "goals").players.map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});

describe("overzicht", () => {
  it("per wedstrijd: gemiddelden met plek in de poule", () => {
    const p = perMatchStats(standings)!;
    expect(p.items.map((i) => [i.label, i.value, i.rank])).toEqual([
      ["Goals voor", 3.75, 3],
      ["Goals tegen", 0.25, 1],
      ["Punten", 3, 1],
    ]);
  });

  it("laatste 3 van Peursum, nieuwste eerst", () => {
    expect(lastMatches(matches, US).map((x) => [x.opponent, x.goalsFor, x.goalsAgainst])).toEqual([
      ["SVS'65 3", 2, 0],
      ["Ameide 4", 4, 0],
      ["Hardinxveld 5", 6, 0],
    ]);
  });
});

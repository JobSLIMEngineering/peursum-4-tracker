import { describe, expect, it } from "vitest";
import { buildNews, type NewsInput } from "./news";
import { US, type Match, type StandingRow } from "./types";

const match = (id: string, date: string, home: string, away: string, h: number, a: number, makeup = false): Match => ({
  id,
  round: null,
  makeup,
  date,
  time: null,
  home,
  away,
  homeGoals: h,
  awayGoals: a,
  venue: null,
  kind: "competitie",
  status: "gespeeld",
  source: "seed",
  edited: false,
});
const row = (team: string, position: number, points: number): StandingRow => ({
  team,
  position,
  played: 5,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points,
});

describe("nieuws op het Overzicht", () => {
  const standings = [row(US, 1, 13), row("A", 2, 10), row("B", 3, 9), row("C", 9, 3), row("D", 10, 2)];
  const base: NewsInput = {
    today: "2026-10-22",
    matches: [
      match("m1", "2026-10-17", "A", "D", 8, 1),
      match("m2", "2026-10-17", "C", "B", 2, 1),
      match("m3", "2026-10-15", "D", "C", 1, 1, true),
      match("m4", "2026-09-01", "A", "C", 9, 0),
      match("m5", "2026-10-10", US, "A", 2, 0),
      match("m6", "2026-10-17", "B", US, 0, 1),
    ],
    standings,
    snapshots: [
      { fetchedAt: "2026-10-11T20:00:00Z", rows: [row("A", 1, 10), row(US, 2, 10)] },
      { fetchedAt: "2026-10-18T20:00:00Z", rows: standings },
    ],
    players: [{ id: "p", name: "Piet", hiddenNo: null, active: true }],
    entries: {
      m5: { matchId: "m5", attendance: [], stats: {}, keeperId: null, opponentOwnGoals: 0, injured: ["p"] },
      m6: { matchId: "m6", attendance: ["p"], stats: {}, keeperId: null, opponentOwnGoals: 0 },
    },
    awards: [],
    streaks: {},
    label: (id) => (id === "p" ? "Piet" : id),
  };
  const news = buildNews(base);
  const kinds = news.map((n) => n.kind);

  it("onze plek, met de stijging sinds de vorige stand", () => {
    expect(news[0]).toMatchObject({ kind: "stand", title: "Peursum 4 stijgt naar plek 1", text: "13 punten uit 5 duels · 3 punten voor op A" });
  });

  it("uitschieters, verrassingen en inhaalwedstrijden van de laatste 10 dagen", () => {
    expect(news.find((n) => n.kind === "uitschieter")?.title).toBe("A 8–1 D");
    expect(news.find((n) => n.kind === "verrassing")?.text).toBe("Nummer 9 wint van nummer 3");
    expect(news.find((n) => n.kind === "inhaal")?.title).toBe("D 1–1 C");
    // Oude uitschieter niet meer
    expect(news.some((n) => n.title === "A 9–0 C")).toBe(false);
  });

  it("wie na een blessure weer meedeed", () => {
    expect(kinds).toContain("terug");
    expect(news.find((n) => n.kind === "terug")?.title).toBe("Piet");
  });

  it("ook als hij in de spelerslijst weer fit is gemeld", () => {
    const n = buildNews({ ...base, entries: {}, players: [{ ...base.players[0], recoveredAt: "2026-10-20" }] });
    expect(n.some((x) => x.kind === "terug")).toBe(true);
  });
});

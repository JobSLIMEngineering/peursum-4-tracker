import { describe, expect, it } from "vitest";
import { scenario, winterBreak } from "./scenario";
import { US, type Match, type StandingRow } from "./types";

const m = (date: string, home: string, away: string): Match => ({
  id: `${home}-${away}`,
  round: null,
  makeup: false,
  date,
  time: null,
  home,
  away,
  homeGoals: null,
  awayGoals: null,
  venue: null,
  kind: "competitie",
  status: "gepland",
  source: "scraper",
  edited: false,
});
const row = (team: string, position: number, points: number): StandingRow => ({ team, position, played: 5, won: 0, drawn: 0, lost: 0, goalsFor: 10, goalsAgainst: 5, points });
const model = { mu: 1.4, attack: { [US]: 1, A: 1, B: 1, C: 1 }, defence: { [US]: 1, A: 1, B: 1, C: 1 }, opponents: {} };

describe("scenario's", () => {
  const matches = [m("2026-11-21", US, "A"), m("2026-11-21", "B", "C"), m("2026-11-28", "A", "B"), m("2026-11-28", "C", US), m("2027-01-23", US, "B"), m("2027-01-23", "A", "C")];

  it("winterstop: laatste speeldag voor een pauze van 3 weken", () => {
    expect(winterBreak(matches, "2026-11-16")).toBe("2026-11-28");
  });

  it("3 punten achter, koploper nog tegen ons: bij alles winnen gelijk, dus doelsaldo", () => {
    const st = [row("A", 1, 15), row(US, 2, 12), row("B", 3, 6), row("C", 4, 3)];
    const s = scenario(model, st, matches, { deadline: "2026-11-28", target: 1, runs: 500 });
    // wij max 18; A wint tegen B (18), maar verliest van ons: max 15 + 3 = 18 → gelijk: doelsaldo
    expect(s.maxPoints).toBe(18);
    expect(s.status).toBe("doelsaldo");
    expect(s.ours.length).toBe(2);
  });

  it("6 punten achter met nog 2 duels, zonder onderling: hulp nodig", () => {
    const st = [row("A", 1, 18), row(US, 2, 12), row("B", 3, 6), row("C", 4, 3)];
    const later = [m("2026-11-21", US, "C"), m("2026-11-21", "A", "B"), m("2026-11-28", "B", US), m("2026-11-28", "C", "A")];
    const s = scenario(model, st, later, { deadline: "2026-11-28", target: 1, runs: 500 });
    expect(s.status).toBe("hulp nodig");
    expect(s.rivals[0]).toMatchObject({ team: "A", allowed: 0, games: 2 });
    expect(s.mustDrop).toBe(1);
  });

  it("te ver weg: onmogelijk; ruime voorsprong: zeker", () => {
    const far = scenario(model, [row("A", 1, 30), row(US, 2, 12), row("B", 3, 6), row("C", 4, 3)], matches, { deadline: "2026-11-28", target: 1, runs: 200 });
    expect(far.status).toBe("onmogelijk");
    const safe = scenario(model, [row(US, 1, 30), row("A", 2, 12), row("B", 3, 6), row("C", 4, 3)], matches, { deadline: "2026-11-28", target: 1, runs: 200 });
    expect(safe.status).toBe("zeker");
    expect(safe.chance).toBe(1);
  });

  it("meer zeges geeft meer kans", () => {
    const st = [row("A", 1, 15), row(US, 2, 12), row("B", 3, 6), row("C", 4, 3)];
    const s = scenario(model, st, matches, { deadline: null, target: 1, runs: 3000 });
    const known = s.byWins.filter((x) => x.chance != null);
    expect(known.at(-1)!.chance!).toBeGreaterThan(known[0].chance!);
    expect(s.perMatch[0].win!).toBeGreaterThan(s.perMatch[0].loss!);
  });
});

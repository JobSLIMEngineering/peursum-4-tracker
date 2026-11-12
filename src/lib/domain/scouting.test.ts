import { describe, expect, it } from "vitest";
import { playerCards } from "./playercard";
import { nextPair, scoutBase, scoutRatings, strengths, type ScoutVote } from "./scouting";

const P = (id: string, position: "Keeper" | "Verdediger" | "Middenvelder" | "Aanvaller", type: "vast" | "leen" = "vast") => ({ id, position, type, active: true });
const players = [P("k", "Keeper"), P("v", "Verdediger"), P("m", "Middenvelder"), P("s", "Aanvaller"), P("x", "Aanvaller", "leen")];
const vote = (a: string, b: string, attr: ScoutVote["attr"], winner: ScoutVote["winner"]): ScoutVote => ({ a, b, attr, winner, at: "2026-11-12" });

describe("inschatting: vergelijken", () => {
  it("wie vaak wint is sterker; gelijk telt half", () => {
    const votes = [vote("s", "v", "SCH", "a"), vote("s", "m", "SCH", "a"), vote("m", "v", "SCH", "gelijk")];
    const r = strengths(votes, "SCH");
    expect(r.s).toBeGreaterThan(r.m);
    expect(r.m).toBeCloseTo(r.v, 5);
  });

  it("keepers en leenspelers doen niet mee; volgende paar is altijd twee verschillende veldspelers", () => {
    for (let i = 0; i < 20; i++) {
      const n = nextPair([], players)!;
      expect(n.a).not.toBe(n.b);
      expect(["v", "m", "s"]).toContain(n.a);
      expect(["v", "m", "s"]).toContain(n.b);
    }
    expect(scoutRatings([], players).k).toBeUndefined();
  });

  it("kiest eerst het onderdeel met de minste keuzes", () => {
    const votes = [vote("s", "v", "SNE", "a")];
    expect(nextPair(votes, players)!.attr).not.toBe("SNE");
  });

  it("basiscijfer pas na genoeg vergelijkingen, gewogen naar de linie", () => {
    const votes: ScoutVote[] = [];
    for (let i = 0; i < 3; i++) {
      votes.push(vote("v", "s", "VER", "a"), vote("s", "v", "SCH", "a"), vote("v", "m", "VER", "a"), vote("s", "m", "SCH", "a"));
    }
    const base = scoutBase(votes, players);
    // De verdediger wint op verdedigen, de spits op schieten: allebei boven het midden voor hun eigen linie
    expect(base.v).toBeGreaterThan(78);
    expect(base.s).toBeGreaterThan(78);
    expect(base.m).toBeLessThan(78);
  });
});

describe("kaart met inschatting als graadmeter", () => {
  it("het basiscijfer bepaalt het niveau; zonder duels blijft de kaart op de inschatting", () => {
    const cards = playerCards([], players, {}, { v: 85, s: 70 });
    expect(cards.v.overall).toBe(Math.round(78 + (85 - 78) * 0.6));
    expect(cards.s.overall).toBe(70);
  });
});

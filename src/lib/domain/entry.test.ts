import { describe, expect, it } from "vitest";
import { removePlayer, toDraft, toEntry, type EntryDraft } from "./entry";
import type { MatchEntry } from "./types";

const draft = (over: Partial<EntryDraft> = {}): EntryDraft => ({
  attendance: ["a", "b", "c", "k"],
  keeperId: "k",
  goals: [
    { scorerId: "a", assistId: "b", kind: "spel" },
    { scorerId: "a", assistId: null, kind: "penalty" },
    { scorerId: "b", assistId: "a", kind: "vrije trap" },
    { scorerId: null, assistId: null, kind: "spel" },
  ],
  cards: [
    { playerId: "c", kind: "2geel" },
    { playerId: "b", kind: "geel" },
  ],
  ownGoals: ["c"],
  ...over,
});

describe("invoer per doelpunt", () => {
  it("leidt de statistieken per speler af", () => {
    const e = toEntry(draft(), "m1");
    expect(e.stats.a).toEqual({ goals: 2, assists: 1, yellow: false, red: false, penalties: 1 });
    expect(e.stats.b).toEqual({ goals: 1, assists: 1, yellow: true, red: false, freeKicks: 1 });
    expect(e.stats.c).toEqual({ goals: 0, assists: 0, yellow: true, red: true, ownGoals: 1 });
    expect(e.opponentOwnGoals).toBe(1);
    expect(e.goals).toHaveLength(4);
  });

  it("niet ingevulde doelpunten tellen niet mee", () => {
    const e = toEntry(
      draft({
        goals: [
          { scorerId: "a", assistId: null, kind: "spel" },
          { scorerId: undefined, assistId: null, kind: "spel" },
        ],
      }),
      "m1",
    );
    expect(e.goals).toHaveLength(1);
    expect(e.stats.a.goals).toBe(1);
  });

  it("heen en terug levert hetzelfde concept op", () => {
    const d = draft();
    const back = toDraft(toEntry(d, "m1"), 4);
    expect({ ...back, cards: undefined }).toEqual({ ...d, cards: undefined });
    expect(back.cards).toEqual(expect.arrayContaining(d.cards));
    expect(back.cards).toHaveLength(d.cards.length);
  });

  it("maakt precies zoveel regels als de eigen score", () => {
    expect(toDraft(undefined, 3).goals).toEqual([
      { scorerId: undefined, assistId: null, kind: "spel" },
      { scorerId: undefined, assistId: null, kind: "spel" },
      { scorerId: undefined, assistId: null, kind: "spel" },
    ]);
  });

  it("zet oudere invoer (alleen totalen) om naar doelpunten zonder de totalen te veranderen", () => {
    const old: MatchEntry = {
      matchId: "m",
      attendance: ["a", "b", "c"],
      keeperId: null,
      opponentOwnGoals: 1,
      stats: {
        a: { goals: 2, assists: 0, yellow: true, red: false },
        b: { goals: 0, assists: 1, yellow: false, red: false },
      },
    };
    const d = toDraft(old, 3);
    expect(d.goals).toEqual([
      { scorerId: "a", assistId: "b", kind: "spel" },
      { scorerId: "a", assistId: null, kind: "spel" },
      { scorerId: null, assistId: null, kind: "spel" },
    ]);
    expect(d.cards).toEqual([{ playerId: "a", kind: "geel" }]);
    const e = toEntry(d, "m");
    expect(e.stats.a.goals).toBe(2);
    expect(e.stats.b.assists).toBe(1);
    expect(e.opponentOwnGoals).toBe(1);
  });

  it("speler weghalen haalt hem ook uit doelpunten, kaarten en keeper", () => {
    const d = removePlayer(draft(), "a");
    expect(d.goals[0]).toEqual({ scorerId: undefined, assistId: null, kind: "spel" });
    expect(d.goals[2].assistId).toBeNull();
    expect(removePlayer(draft(), "k").keeperId).toBeNull();
    expect(removePlayer(draft(), "c").cards).toEqual([{ playerId: "b", kind: "geel" }]);
  });
});

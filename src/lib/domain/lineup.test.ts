import { describe, expect, it } from "vitest";
import { fit, suggestLineup, type LineupPlayer } from "./lineup";
import type { Role } from "./types";

const p = (id: string, role: Role, overall = 75): LineupPlayer => ({ id, role, overall });
const at = (r: ReturnType<typeof suggestLineup>, role: Role) => r.team.flat().filter((s) => s.role === role).map((s) => s.playerId);

describe("opstellingsadvies", () => {
  it("eigen plek past het best, ver van huis het minst", () => {
    expect(fit("CV", "CV")).toBe(1);
    expect(fit("CV", "DM")).toBeGreaterThan(fit("CV", "SP"));
    expect(fit("SP", "K")).toBeLessThan(0.5);
  });

  it("met een compleet elftal staat iedereen op zijn eigen plek", () => {
    const xs = [p("k", "K"), p("lb", "LB"), p("c1", "CV"), p("c2", "CV"), p("rb", "RB"), p("dm", "DM"), p("cm", "CM"), p("am", "AM"), p("lv", "LV"), p("sp", "SP"), p("rv", "RV")];
    const r = suggestLineup(xs);
    expect(r.moved).toEqual([]);
    expect(r.bench).toEqual([]);
    expect(at(r, "CV").sort()).toEqual(["c1", "c2"]);
  });

  it("geen linksback: de beste passende speler schuift door, de zwakste reserve zit op de bank", () => {
    const xs = [p("k", "K"), p("c1", "CV"), p("c2", "CV"), p("c3", "CV", 72), p("rb", "RB"), p("dm", "DM"), p("cm", "CM"), p("am", "AM"), p("lv", "LV"), p("sp", "SP"), p("rv", "RV"), p("sp2", "SP", 60)];
    const r = suggestLineup(xs);
    expect(at(r, "LB")).toEqual(["c3"]);
    expect(r.bench).toEqual(["sp2"]);
    expect(r.moved).toEqual([{ id: "c3", from: "CV", to: "LB" }]);
  });

  it("de sterkste spits speelt, de rest op de bank", () => {
    const xs = [p("k", "K"), p("a", "SP", 70), p("b", "SP", 85)];
    const r = suggestLineup(xs);
    expect(at(r, "SP")).toEqual(["b"]);
    expect(at(r, "K")).toEqual(["k"]);
  });

  it("te weinig spelers: plekken blijven leeg in plaats van een keeper in de spits", () => {
    const r = suggestLineup([p("k", "K"), p("x", "CM")]);
    expect(at(r, "K")).toEqual(["k"]);
    expect(r.team.flat().filter((s) => s.playerId).length).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { buildNews } from "@/lib/domain/news";
import { withCancellation, type ViewMatch } from "./view";

const m = (over: Partial<ViewMatch> = {}): ViewMatch => ({
  id: "sv-noordeloos-3--peursum-4",
  round: 10,
  makeup: false,
  date: "2026-11-28",
  time: "14:30",
  home: "SV Noordeloos 3",
  away: "Peursum 4",
  homeGoals: null,
  awayGoals: null,
  venue: null,
  kind: "competitie",
  status: "gepland",
  source: "scraper",
  edited: false,
  extra: false,
  code: null,
  clubDate: "2026-11-28",
  clubTime: "14:30",
  ...over,
});
const c = { from: "2026-11-28", time: "14:30", clubDate: "2026-11-28", at: "2026-11-27T10:00:00Z" };

describe("afgelast", () => {
  it("zonder afgelasting verandert er niets", () => {
    const x = m();
    expect(withCancellation(x, undefined)).toBe(x);
  });

  it("afgelast: uit de agenda (geen datum), oude datum bewaard", () => {
    const x = withCancellation(m(), c);
    expect(x.date).toBeNull();
    expect(x.cancelled).toEqual({ from: "2026-11-28", time: "14:30" });
  });

  it("nieuwe datum op de clubsite: verspringt vanzelf, ook over een eigen wijziging van de oude datum heen", () => {
    const x = withCancellation(m({ date: "2026-11-28", time: "15:00", edited: true, clubDate: "2027-01-16", clubTime: "12:00" }), c);
    expect(x.cancelled).toBeUndefined();
    expect([x.date, x.time, x.movedFrom]).toEqual(["2027-01-16", "12:00", "2026-11-28"]);
  });

  it("clubsite heeft nog de oude datum of geen datum: blijft afgelast", () => {
    expect(withCancellation(m({ clubDate: null, date: null }), c).cancelled).toBeTruthy();
  });

  it("al gespeeld (uitslag binnen): nooit afgelast", () => {
    expect(withCancellation(m({ homeGoals: 1, awayGoals: 2 }), c).date).toBe("2026-11-28");
  });

  it("nieuws: afgelast en verplaatst", () => {
    const base = { standings: [], snapshots: [], players: [], entries: {}, awards: [], streaks: {}, label: (id: string) => id };
    const off = buildNews({ ...base, today: "2026-11-27", matches: [withCancellation(m(), c)] });
    expect(off.find((n) => n.kind === "afgelast")).toMatchObject({ kicker: "Afgelast", text: "za 28/11 gaat niet door. Nieuwe datum volgt." });
    const moved = buildNews({ ...base, today: "2026-12-01", matches: [withCancellation(m({ clubDate: "2027-01-16", clubTime: "12:00" }), c)] });
    expect(moved.find((n) => n.kind === "afgelast")).toMatchObject({ kicker: "Verplaatst", text: "Nieuwe datum: za 16/1 om 12:00" });
  });
});

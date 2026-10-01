import { describe, expect, it } from "vitest";
import { parseDutchDate, seasonLabel } from "./dates";

const oktober2026 = new Date("2026-10-01T12:00:00");
const maart2027 = new Date("2027-03-15T12:00:00");

describe("parseDutchDate", () => {
  it("leest datum met tijd", () => {
    expect(parseDutchDate("3 okt. 15:00", oktober2026)).toEqual({
      date: "2026-10-03",
      time: "15:00",
    });
  });

  it("geeft het voorjaar het jaar na het beginjaar van het seizoen", () => {
    expect(parseDutchDate("14 mrt.", oktober2026).date).toBe("2027-03-14");
    expect(parseDutchDate("26 sep.", maart2027).date).toBe("2026-09-26");
  });

  it("gebruikt een expliciet jaartal als dat er staat", () => {
    expect(parseDutchDate("03 oktober 2026", maart2027).date).toBe("2026-10-03");
  });

  it("geeft een fout bij onbekende invoer", () => {
    expect(() => parseDutchDate("morgen", oktober2026)).toThrow(/datumformaat/);
  });
});

describe("seasonLabel", () => {
  it("bepaalt het seizoen van een datum", () => {
    expect(seasonLabel("2026-09-26")).toBe("2026/2027");
    expect(seasonLabel("2027-05-01")).toBe("2026/2027");
  });
});

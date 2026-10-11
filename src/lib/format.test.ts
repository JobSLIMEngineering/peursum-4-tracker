import { describe, expect, it } from "vitest";
import { countdown, kickoff } from "./format";

describe("aftrap en countdown", () => {
  it("rekent Nederlandse tijd om, met zomer- en wintertijd", () => {
    expect(kickoff("2026-10-10", "12:30").toISOString()).toBe("2026-10-10T10:30:00.000Z"); // zomertijd
    expect(kickoff("2026-10-31", "12:30").toISOString()).toBe("2026-10-31T11:30:00.000Z"); // wintertijd
  });

  it("toont dagen, uren of minuten", () => {
    const k = kickoff("2026-10-31", "12:30");
    expect(countdown(k, new Date("2026-10-11T12:00:00Z"))).toBe("nog 19 dagen");
    expect(countdown(k, new Date("2026-10-30T07:30:00Z"))).toBe("nog 1 dag 4u");
    expect(countdown(k, new Date("2026-10-31T09:15:00Z"))).toBe("nog 2u 15m");
    expect(countdown(k, new Date("2026-10-31T12:00:00Z"))).toBe("nu bezig");
    expect(countdown(k, new Date("2026-10-31T14:00:00Z"))).toBeNull();
  });
});

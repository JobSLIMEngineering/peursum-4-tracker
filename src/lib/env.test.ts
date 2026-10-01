import { describe, expect, it } from "vitest";
import { requireEnv } from "./env";

describe("requireEnv", () => {
  it("geeft de waarde terug als die gezet is", () => {
    expect(requireEnv("X", "waarde")).toBe("waarde");
  });

  it("geeft een duidelijke fout als de waarde ontbreekt", () => {
    expect(() => requireEnv("NEXT_PUBLIC_SUPABASE_URL", undefined)).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL ontbreekt/,
    );
  });
});

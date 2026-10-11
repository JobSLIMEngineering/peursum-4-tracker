import { describe, expect, it } from "vitest";
import { lock, unlock } from "./vault";

describe("wachtwoordkluis", () => {
  // Weinig rondes in de test, zodat hij snel is; de app gebruikt 600.000
  it("geeft met het juiste wachtwoord de sleutel terug", async () => {
    const v = await lock("github_pat_voorbeeld", "correct horse battery", 1000);
    expect(await unlock(v, "correct horse battery")).toBe("github_pat_voorbeeld");
  });

  it("geeft null bij een verkeerd wachtwoord en bevat de sleutel niet leesbaar", async () => {
    const v = await lock("github_pat_voorbeeld", "correct horse battery", 1000);
    expect(await unlock(v, "fout wachtwoord!!")).toBeNull();
    expect(JSON.stringify(v)).not.toContain("github_pat");
  });

  it("maakt bij elke keer opslaan een andere versleuteling (eigen salt en iv)", async () => {
    const a = await lock("x", "wachtwoord1234", 1000);
    const b = await lock("x", "wachtwoord1234", 1000);
    expect(a.data).not.toBe(b.data);
    expect(a.salt).not.toBe(b.salt);
  });
});

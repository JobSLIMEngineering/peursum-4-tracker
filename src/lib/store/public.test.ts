import { describe, expect, it } from "vitest";
import seedJson from "../../../docs/seed-data.json";
import type { SeedData } from "@/lib/domain/seed";
import { initialData } from "./initial";
import { toPublic } from "./public";

describe("kijkversie voor gasten", () => {
  const files = initialData(seedJson as SeedData);
  files["players.json"].players[17] = {
    ...files["players.json"].players[17],
    name: "Geheime Naam",
    aliases: ["Bijnaam"],
    clubName: "Naam, Geheime",
  };
  files["feedback.json"].items.push({
    id: "1",
    createdAt: "",
    page: "/",
    width: 1,
    text: "privé opmerking",
    status: "open",
  });
  const pub = toPublic(files);
  const json = JSON.stringify(pub);

  it("bevat geen namen van afgeschermde spelers, bijnamen of feedback", () => {
    expect(json).not.toContain("Geheime");
    expect(json).not.toContain("Bijnaam");
    expect(json).not.toContain("privé opmerking");
    expect(pub["players.json"].players[17]).toMatchObject({ name: null, hiddenNo: 1 });
  });

  it("houdt de rest gelijk: stand, wedstrijden, gewone spelers", () => {
    expect(pub["matches.json"]).toEqual(files["matches.json"]);
    expect(pub["standings.json"]).toEqual(files["standings.json"]);
    expect(pub["players.json"].players[0].name).toBe("Luuk Bobbe");
  });
});

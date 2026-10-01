import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guessMatchType, parseTeamPage, TEAM_NAME } from "./index";

// Opgeslagen kopie van de teampagina, opgehaald op 1 oktober 2026.
const html = readFileSync(
  new URL("./__fixtures__/teampagina-2026-10-01.html", import.meta.url),
  "utf-8",
);
const page = parseTeamPage(html, new Date("2026-10-01T12:00:00"));

describe("spelers", () => {
  it("leest alle 18 spelers met naam en het aantal verborgen teamleden", () => {
    expect(page.players).toHaveLength(18);
    expect(page.hiddenPlayerCount).toBe(4);
  });

  it("zet namen om naar voornaam-achternaam en functie naar positie", () => {
    expect(page.players[0]).toEqual({
      sourceName: "Berg, Rien van den",
      name: "Rien van den Berg",
      position: "aanvaller",
    });
    expect(page.players.find((p) => p.name === "Luuk Bobbe")?.position).toBe(
      "onbekend",
    );
    expect(page.players.find((p) => p.name === "Niels de Groot")?.position).toBe(
      "verdediger",
    );
  });
});

describe("staf", () => {
  it("leest de staf", () => {
    expect(page.staff).toEqual([
      { name: "Tim Boer", role: "Technische staf", function: "Assistent-trainer/coach" },
      { name: "Damian van der Linden", role: "Overige staf", function: "Teammanager" },
    ]);
  });
});

describe("programma", () => {
  it("leest komende wedstrijden met datum, tijd, teams en wedstrijdcode", () => {
    expect(page.program).toHaveLength(4);
    expect(page.program[0]).toMatchObject({
      matchCode: "20747389",
      date: "2026-10-03",
      time: "15:00",
      homeTeam: "Ameide 4",
      awayTeam: TEAM_NAME,
      homeGoals: null,
      awayGoals: null,
    });
    expect(page.program[0].homeLogoUrl).toMatch(/^https:\/\/binaries\.sportlink\.com\//);
  });
});

describe("uitslagen", () => {
  it("leest gespeelde wedstrijden met eindstand", () => {
    expect(page.results).toHaveLength(3);
    expect(page.results[0]).toMatchObject({
      matchCode: "20760095",
      date: "2026-09-26",
      time: null,
      homeTeam: TEAM_NAME,
      awayTeam: "Hardinxveld 5",
      homeGoals: 6,
      awayGoals: 0,
    });
  });

  it("normaliseert de dubbele spatie in oefenduels", () => {
    expect(page.results[1]).toMatchObject({
      homeTeam: "Peursum",
      awayTeam: "Old Star",
      homeGoals: 3,
      awayGoals: 3,
    });
  });
});

describe("poulestand", () => {
  it("leest de poulenaam en alle 12 teams", () => {
    expect(page.poolName).toBe("5e klasse 521");
    expect(page.standings).toHaveLength(12);
  });

  it("bevat Peursum 4 met de juiste cijfers", () => {
    expect(page.standings.find((s) => s.team === TEAM_NAME)).toEqual({
      position: 1,
      team: TEAM_NAME,
      logoUrl: expect.stringContaining("logoapi.voetbal.nl"),
      played: 2,
      won: 2,
      drawn: 0,
      lost: 0,
      goalsFor: 9,
      goalsAgainst: 1,
      goalDifference: 8,
      points: 6,
    });
  });

  it("leest negatieve doelsaldo's", () => {
    expect(page.standings.at(-1)).toMatchObject({
      team: "SV Noordeloos 3",
      goalDifference: -15,
    });
  });
});

describe("volgende wedstrijd", () => {
  it("leest tegenstander, datum, tijd en sportpark", () => {
    expect(page.nextMatch).toEqual({
      label: "Competitie",
      date: "2026-10-03",
      time: "15:00",
      homeTeam: "Ameide 4",
      awayTeam: TEAM_NAME,
      venue: "Sportpark Meihoven veld 2",
    });
  });
});

describe("wedstrijdtype", () => {
  const pool = page.standings.map((s) => s.team);

  it("herkent competitiewedstrijden aan een tegenstander uit de poule", () => {
    expect(guessMatchType(page.results[0], TEAM_NAME, pool)).toBe("competitie");
    expect(guessMatchType(page.program[0], TEAM_NAME, pool)).toBe("competitie");
  });

  it("markeert overige wedstrijden als oefen", () => {
    expect(guessMatchType(page.results[1], TEAM_NAME, pool)).toBe("oefen");
  });
});

describe("foutmeldingen", () => {
  it("geeft een duidelijke fout als een sectie ontbreekt", () => {
    expect(() => parseTeamPage("<html><body></body></html>")).toThrow(
      /\[Team indeling\] sectie "Team indeling" niet gevonden/,
    );
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import seedJson from "../../../docs/seed-data.json";
import type { SeedData } from "@/lib/domain/seed";
import { US } from "@/lib/domain/types";
import { parseTeamPage } from "@/lib/parser";
import type { TeamPage } from "@/lib/parser/types";
import { initialData } from "@/lib/store/initial";
import { buildView } from "@/lib/store/view";
import { applyTeamPage, roundComplete, shouldFetch } from "./apply";

const initial = initialData(seedJson as SeedData);
const html = readFileSync(new URL("../parser/__fixtures__/teampagina-2026-10-01.html", import.meta.url), "utf-8");
const oldPage = parseTeamPage(html, new Date("2026-10-01T12:00:00"));

/** Stand van na de speelronde van 24 okt, gemaakt uit de seed-stand plus de uitslagen hieronder */
const ROUND5: [string, string, number, number][] = [
  ["Hardinxveld 5", "GJS 5", 1, 3],
  ["SVS'65 3", "SV Noordeloos 3", 2, 0],
  ["Leerdam Sport'55 5", "SteDoCo 4", 2, 2],
  ["Ameide 4", "Vuren 3", 0, 4],
  ["Asperen 5", "Arkel 4", 1, 2],
];

function pageAfterRound5(): TeamPage {
  const rows = initial["standings.json"].snapshots[0].rows.map((r) => ({
    ...r,
    logoUrl: null,
    goalDifference: r.goalsFor - r.goalsAgainst,
  }));
  for (const [h, a, hg, ag] of ROUND5) {
    for (const [team, f, t] of [
      [h, hg, ag],
      [a, ag, hg],
    ] as const) {
      const r = rows.find((x) => x.team === team)!;
      r.played++;
      r.goalsFor += f;
      r.goalsAgainst += t;
      if (f > t) r.won++;
      else if (f === t) r.drawn++;
      else r.lost++;
      r.points = r.won * 3 + r.drawn;
      r.goalDifference = r.goalsFor - r.goalsAgainst;
    }
  }
  return { ...oldPage, standings: rows, program: [], results: [], players: [], hiddenPlayerCount: 0, nextMatch: null };
}

describe("verwerken van de teampagina", () => {
  it("slaat een oudere stand niet op (nooit terug in de tijd)", () => {
    const r = applyTeamPage(initial, oldPage, new Date("2026-10-11T12:00:00Z"));
    expect(r.files["standings.json"].snapshots).toHaveLength(1);
  });

  it("voegt nieuwe spelers toe, koppelt bestaande op naam en verwijdert niemand", () => {
    const r = applyTeamPage(initial, oldPage, new Date("2026-10-11T12:00:00Z"));
    const players = r.files["players.json"].players;
    expect(players).toHaveLength(23);
    expect(players.find((p) => p.name === "Rien van den Berg")).toMatchObject({ clubName: "Berg, Rien van den", position: "Aanvaller" });
    expect(players.find((p) => p.name === "Tom Rietveld")?.clubName).toBe("Rietveld, Tom");
  });

  it("voegt het oefenduel toe als oefen en laat bestaande uitslagen staan", () => {
    const r = applyTeamPage(initial, oldPage, new Date("2026-10-11T12:00:00Z"));
    const m = r.files["matches.json"].matches;
    expect(m.find((x) => x.away === "Old Star")).toMatchObject({ kind: "oefen", homeGoals: 3, awayGoals: 3 });
    // Op 1 okt stond Ameide - Peursum nog in het programma; de uitslag 0-4 blijft
    expect(m.find((x) => x.home === "Ameide 4" && x.away === US)).toMatchObject({ homeGoals: 0, awayGoals: 4, code: "20747389" });
    expect(m).toHaveLength(133);
  });

  it("na de speelronde van 24 okt staan de uitslagen van alle teams vanzelf in Competitie", () => {
    const r = applyTeamPage(initial, pageAfterRound5(), new Date("2026-10-24T20:00:00Z"));
    expect(r.files["standings.json"].snapshots).toHaveLength(2);
    expect(r.unsure).toEqual([]);
    const view = buildView(r.files);
    for (const [h, a, hg, ag] of ROUND5) {
      expect(view.matches.find((m) => m.home === h && m.away === a), `${h} - ${a}`).toMatchObject({
        homeGoals: hg,
        awayGoals: ag,
        source: "afgeleid",
        status: "gespeeld",
      });
    }
    // Het model rekent de nieuwe uitslagen mee
    expect(view.standings.find((s) => s.team === "GJS 5")?.played).toBe(5);
  });

  it("handmatige wijzigingen blijven staan na een nieuwe run", () => {
    const withEdit = structuredClone(initial);
    const id = "vvac-6--peursum-4";
    withEdit["overrides.json"].edits[id] = {
      home: "VVAC 6",
      away: US,
      date: "2026-12-12",
      time: "12:30",
      kind: "competitie",
      venue: "Sportpark VVAC",
    };
    const r = applyTeamPage(withEdit, pageAfterRound5(), new Date("2026-10-24T20:00:00Z"));
    expect(buildView(r.files).matches.find((m) => m.id === id)).toMatchObject({ date: "2026-12-12", edited: true });
  });
});

describe("ophaalschema", () => {
  const at = (iso: string) => new Date(iso);

  it("zaterdag 13:00–23:00 elk uur, daarbuiten niet", () => {
    expect(shouldFetch(initial, at("2026-10-24T11:00:00Z"), false).run).toBe(true); // 13:00 NL
    expect(shouldFetch(initial, at("2026-10-24T21:00:00Z"), false).run).toBe(true); // 23:00 NL
    expect(shouldFetch(initial, at("2026-10-24T09:00:00Z"), false).run).toBe(false); // 11:00 NL
  });

  it("doordeweeks niet, behalve met Nu verversen", () => {
    expect(shouldFetch(initial, at("2026-10-21T12:00:00Z"), false)).toEqual({ run: false, reason: "buiten het ophaalschema" });
    expect(shouldFetch(initial, at("2026-10-21T12:00:00Z"), true).run).toBe(true);
  });

  it("zondag om 08/12/16/20 uur, alleen als de ronde niet compleet is", () => {
    const sun = at("2026-10-25T11:00:00Z"); // 12:00 NL (wintertijd)
    expect(shouldFetch(initial, sun, false).run).toBe(true);
    const done = applyTeamPage(initial, pageAfterRound5(), at("2026-10-24T20:00:00Z")).files;
    // Peursum speelt op 24 okt niet (VVAC uit is niet ingepland), 5 wedstrijden gespeeld = niet compleet bij 12 teams
    expect(roundComplete(done, sun)).toBe(false);
    const full = applyTeamPage(
      initial,
      {
        ...pageAfterRound5(),
        standings: pageAfterRound5().standings.map((r) =>
          r.team === US || r.team === "VVAC 6" ? { ...r, played: r.played + 1, goalsFor: r.goalsFor + 1, goalsAgainst: r.goalsAgainst + 1 } : r,
        ),
      },
      at("2026-10-24T20:00:00Z"),
    ).files;
    expect(roundComplete(full, sun)).toBe(true);
    expect(shouldFetch(full, sun, false)).toEqual({ run: false, reason: "ronde al compleet" });
    expect(shouldFetch(initial, at("2026-10-25T10:00:00Z"), false).run).toBe(false); // 11:00 NL
  });
});

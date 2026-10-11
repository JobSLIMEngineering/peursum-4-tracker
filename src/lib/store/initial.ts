import { seedMatches, seedPlayers, seedStandings, type SeedData } from "@/lib/domain/seed";
import { EMPTY, matchId, type DataFiles } from "./schema";

/** Clubcodes voor voetbal.nl-logo's (van de teampagina, 11 okt 2026); de scraper houdt ze daarna bij */
const CLUB_CODES: Record<string, string> = {
  "Peursum 4": "BBJB32E",
  "Arkel 4": "BBJJ049",
  "Vuren 3": "BBJC783",
  "SteDoCo 4": "BBJC25J",
  "Asperen 5": "BBJK21L",
  "Leerdam Sport'55 5": "BBJF01K",
  "VVAC 6": "BBJC82Y",
  "Ameide 4": "BBHX85Q",
  "GJS 5": "BBHW50H",
  "Hardinxveld 5": "BBHX39F",
  "SVS'65 3": "BBJC47R",
  "SV Noordeloos 3": "BBHZ793",
};

/** Beginstand van de data-repository, uit docs/seed-data.json (PLAN.md stap 2). */
export function initialData(seed: SeedData): DataFiles {
  return {
    ...EMPTY,
    "standings.json": {
      snapshots: [{ fetchedAt: "2026-10-10T18:00:00+02:00", source: "seed", rows: seedStandings(seed) }],
    },
    "matches.json": {
      matches: seedMatches(seed).map((m) => {
        const { edited, ...rest } = m;
        void edited;
        return { ...rest, id: matchId(m), code: null };
      }),
    },
    "players.json": {
      players: seedPlayers(seed).map((p) => ({ ...p, clubName: null })),
    },
    "logos.json": {
      logos: Object.fromEntries(
        Object.entries(CLUB_CODES).map(([t, c]) => [t, `https://logoapi.voetbal.nl/logo.php?clubcode=${c}`]),
      ),
    },
    "sync.json": {
      lastRun: null,
      lastChange: "2026-10-10T18:00:00+02:00",
      message: "Beginstand uit seed-data (10 okt 2026)",
      unsure: [],
    },
  };
}

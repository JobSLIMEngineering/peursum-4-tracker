import { seedMatches, seedPlayers, seedStandings, type SeedData } from "@/lib/domain/seed";
import { EMPTY, matchId, type DataFiles } from "./schema";

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
    "sync.json": {
      lastRun: null,
      lastChange: "2026-10-10T18:00:00+02:00",
      message: "Beginstand uit seed-data (10 okt 2026)",
      unsure: [],
    },
  };
}

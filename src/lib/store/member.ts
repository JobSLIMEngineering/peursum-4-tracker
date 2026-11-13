import { scoutBase } from "@/lib/domain/scouting";
import type { DataFiles } from "./schema";

/**
 * Wat een ingelogd teamlid te zien krijgt: alles (ook de afgeschermde namen en blessures), behalve wat
 * alleen voor de beheerder is: de feedback en de inschatting vooraf (alleen het basiscijfer, dat de kaarten
 * nodig hebben).
 */
export function toMember(files: DataFiles): DataFiles {
  const votes = files["scouting.json"]?.votes ?? [];
  const players = files["players.json"].players;
  return {
    ...files,
    "feedback.json": { items: [] },
    "scouting.json": { votes: [], base: votes.length ? scoutBase(votes, players) : (files["scouting.json"]?.base ?? {}) },
  };
}

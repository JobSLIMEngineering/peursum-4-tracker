import type { DataFiles } from "./schema";

/**
 * Kijkversie voor gasten. Staat openbaar (branch "kijk" van de app-repository), dus:
 * - afgeschermde spelers zonder naam (ze staan om privacyredenen niet op de clubsite)
 * - geen bijnamen, clubsite-namen of feedback
 */
export const PUBLIC_REF = { owner: "JobSLIMEngineering", repo: "peursum-4-tracker", branch: "kijk", path: "kijk.json" };
export const PUBLIC_URL = `https://raw.githubusercontent.com/${PUBLIC_REF.owner}/${PUBLIC_REF.repo}/${PUBLIC_REF.branch}/${PUBLIC_REF.path}`;

export function toPublic(files: DataFiles): DataFiles {
  return {
    ...files,
    "players.json": {
      players: files["players.json"].players.map((p) => ({
        id: p.id,
        name: p.hiddenNo ? null : p.name,
        position: p.position,
        type: p.type,
        hiddenNo: p.hiddenNo,
        active: p.active,
        clubName: null,
      })),
    },
    "feedback.json": { items: [] },
  };
}

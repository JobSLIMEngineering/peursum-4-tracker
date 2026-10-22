import type { DataFiles } from "./schema";

/**
 * Kijkversie voor gasten. Staat openbaar (branch "kijk" van de app-repository), dus:
 * - afgeschermde spelers zonder naam (ze staan om privacyredenen niet op de clubsite)
 * - geen bijnamen, clubsite-namen of feedback
 * - geen blessures, en geen rugnummer bij afgeschermde spelers (daarmee zijn ze te herkennen)
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
        ...(p.number != null && !p.hiddenNo ? { number: p.number } : {}),
      })),
    },
    "entries.json": {
      entries: Object.fromEntries(
        Object.entries(files["entries.json"].entries).map(([id, e]) => {
          const rest = { ...e };
          delete rest.injured;
          return [id, rest];
        }),
      ),
    },
    "feedback.json": { items: [] },
  };
}

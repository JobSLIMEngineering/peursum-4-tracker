// Scraper: haalt de teampagina op en werkt de data-repository bij.
// Draait in de GitHub Action van peursum-4-data:
//   npx tsx scripts/sync.ts --data ../data [--force]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseTeamPage, TEAM_PAGE_URL } from "../src/lib/parser";
import { DATA_FILES, EMPTY, type DataFiles } from "../src/lib/store/schema";
import { applyTeamPage, shouldFetch } from "../src/lib/sync/apply";

const args = process.argv.slice(2);
const dir = args[args.indexOf("--data") + 1];
const force = args.includes("--force");
if (!args.includes("--data") || !dir) {
  console.error("Gebruik: tsx scripts/sync.ts --data <map> [--force]");
  process.exit(2);
}

const read = (): DataFiles =>
  Object.fromEntries(
    DATA_FILES.map((f) => {
      try {
        return [f, JSON.parse(readFileSync(join(dir, f), "utf-8"))];
      } catch {
        return [f, structuredClone(EMPTY[f])];
      }
    }),
  ) as unknown as DataFiles;

async function main() {
  const now = new Date();
  const files = read();
  const decision = shouldFetch(files, now, force);
  console.log(`Ophalen: ${decision.run ? "ja" : "nee"} (${decision.reason})`);
  if (!decision.run) return;

  // Eén verzoek per run; de clubsite niet belasten
  const res = await fetch(TEAM_PAGE_URL, { headers: { "User-Agent": "Peursum4Tracker (persoonlijk gebruik)" } });
  if (!res.ok) throw new Error(`Clubsite gaf ${res.status}`);
  const page = parseTeamPage(await res.text(), now);

  const result = applyTeamPage(files, page, now);
  mkdirSync(dir, { recursive: true });
  for (const f of result.changed) writeFileSync(join(dir, f), JSON.stringify(result.files[f], null, 2) + "\n");
  console.log(result.summary.length ? result.summary.join("\n") : "Geen wijzigingen");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

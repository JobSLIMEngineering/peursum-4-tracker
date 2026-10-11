// Maakt de kijkversie voor gasten uit een lokale kopie van data/ en schrijft hem weg.
// Normaal doet de app dit zelf na elke wijziging; dit script is voor de eerste keer of noodgevallen.
//   npx tsx scripts/publish-kijk.ts <data-map> <uitvoerbestand>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toPublic } from "../src/lib/store/public";
import { DATA_FILES, EMPTY, type DataFiles } from "../src/lib/store/schema";

const [dir, out] = process.argv.slice(2);
const files = Object.fromEntries(
  DATA_FILES.map((f) => {
    try {
      return [f, JSON.parse(readFileSync(join(dir, f), "utf-8"))];
    } catch {
      return [f, structuredClone(EMPTY[f])];
    }
  }),
) as unknown as DataFiles;
writeFileSync(out, JSON.stringify(toPublic(files)));
console.log(`Kijkversie geschreven naar ${out}`);

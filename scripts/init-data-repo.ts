// Maakt de inhoud van de privé data-repository peursum-4-data:
// beginstand uit docs/seed-data.json, de ophaal-Action en een README.
//   npx tsx scripts/init-data-repo.ts <map>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SeedData } from "../src/lib/domain/seed";
import { initialData } from "../src/lib/store/initial";
import { DATA_FILES } from "../src/lib/store/schema";

const target = process.argv[2];
if (!target) {
  console.error("Gebruik: tsx scripts/init-data-repo.ts <map>");
  process.exit(2);
}
if (existsSync(join(target, "data", "matches.json"))) {
  console.error(`${target}/data bestaat al; niets overschreven.`);
  process.exit(1);
}

const seed = JSON.parse(readFileSync(new URL("../docs/seed-data.json", import.meta.url), "utf-8")) as SeedData;
const data = initialData(seed);

mkdirSync(join(target, "data"), { recursive: true });
for (const f of DATA_FILES) writeFileSync(join(target, "data", f), JSON.stringify(data[f], null, 2) + "\n");

mkdirSync(join(target, ".github", "workflows"), { recursive: true });
writeFileSync(
  join(target, ".github", "workflows", "sync.yml"),
  readFileSync(new URL("./data-repo/sync.yml", import.meta.url), "utf-8"),
);
writeFileSync(join(target, "README.md"), readFileSync(new URL("./data-repo/README.md", import.meta.url), "utf-8"));

console.log(`Data-repository klaargezet in ${target}`);

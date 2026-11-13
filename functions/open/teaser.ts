import { DATA_FILES, EMPTY, type DataFile, type DataFiles } from "../../src/lib/store/schema";
import { toTeaser } from "../../src/lib/store/teaser";
import { fail, github, type Ctx } from "../../src/lib/server/http";

/** Alleen wat de uitnodiging nodig heeft (geen feedback, inschatting of andere privé-bestanden) */
const NEED: DataFile[] = ["standings.json", "matches.json", "overrides.json", "players.json", "entries.json"];

/** Openbare uitnodiging: een paar cijfers zonder namen (5 minuten bewaard, zodat het licht blijft) */
export async function onRequestGet(ctx: Ctx) {
  try {
    return await build(ctx);
  } catch {
    // Geen verbinding met de data: de uitnodiging werkt dan zonder cijfers
    return fail("Even niet beschikbaar.", 503);
  }
}

async function build(ctx: Ctx) {
  const gh = github(ctx.env);
  const entries = await Promise.all(
    DATA_FILES.map(async (f) => [f, NEED.includes(f) ? ((await gh.read(f))?.data ?? structuredClone(EMPTY[f])) : structuredClone(EMPTY[f])] as const),
  );
  const teaser = toTeaser(Object.fromEntries(entries) as unknown as DataFiles);
  return new Response(JSON.stringify(teaser), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}

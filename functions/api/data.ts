import { DATA_FILES, EMPTY, type DataFiles } from "../../src/lib/store/schema";
import { toMember } from "../../src/lib/store/member";
import { github, json, who, type Ctx } from "../../src/lib/server/http";

/** Alle data in één keer; een lid krijgt alles behalve wat alleen voor de beheerder is */
export async function onRequestGet(ctx: Ctx) {
  const w = await who(ctx);
  if (w instanceof Response) return w;
  const gh = github(ctx.env);
  const entries = await Promise.all(DATA_FILES.map(async (f) => [f, (await gh.read(f))?.data ?? structuredClone(EMPTY[f])] as const));
  const files = Object.fromEntries(entries) as unknown as DataFiles;
  return json(w.role === "owner" ? files : toMember(files));
}

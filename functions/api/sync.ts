import { fail, github, json, owner, sameOrigin, type Ctx } from "../../src/lib/server/http";

/** "Nu verversen": de ophaal-Action in de data-repository starten (alleen beheerder) */
export async function onRequestPost(ctx: Ctx) {
  if (!sameOrigin(ctx.request)) return fail("Niet toegestaan.", 403);
  const o = await owner(ctx);
  if (o instanceof Response) return o;
  await github(ctx.env).dispatch("sync.yml");
  return json({ ok: true });
}

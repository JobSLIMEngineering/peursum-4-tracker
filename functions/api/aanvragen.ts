import { addToAccessGroup } from "../../src/lib/server/cloudflare";
import { fail, github, json, owner, sameOrigin, type Ctx } from "../../src/lib/server/http";
import { EMPTY_REQUESTS, REQUESTS_FILE, type RequestsFile } from "../../src/lib/store/requests";

/** Toegangsaanvragen bekijken (alleen beheerder) */
export async function onRequestGet(ctx: Ctx) {
  const o = await owner(ctx);
  if (o instanceof Response) return o;
  const cur = await github(ctx.env).read<RequestsFile>(REQUESTS_FILE);
  return json({ ...(cur?.data ?? EMPTY_REQUESTS), autoAdd: !!(ctx.env.CF_API_TOKEN && ctx.env.CF_ACCOUNT_ID && ctx.env.ACCESS_GROUP_ID) });
}

/** Goedkeuren of afwijzen; goedkeuren zet het adres (als dat ingesteld is) meteen in de Access-groep */
export async function onRequestPost(ctx: Ctx) {
  if (!sameOrigin(ctx.request)) return fail("Niet toegestaan.", 403);
  const o = await owner(ctx);
  if (o instanceof Response) return o;
  const body = (await ctx.request.json().catch(() => null)) as { id?: string; action?: string } | null;
  if (!body?.id || (body.action !== "goedkeuren" && body.action !== "afwijzen")) return fail("Ongeldige aanvraag.", 400);
  const gh = github(ctx.env);
  const cur = await gh.read<RequestsFile>(REQUESTS_FILE);
  const req = cur?.data.requests.find((r) => r.id === body.id);
  if (!req) return fail("Aanvraag niet gevonden.", 404);

  let added: "added" | "already" | "manual" = "manual";
  const { CF_API_TOKEN, CF_ACCOUNT_ID, ACCESS_GROUP_ID } = ctx.env;
  if (body.action === "goedkeuren" && CF_API_TOKEN && CF_ACCOUNT_ID && ACCESS_GROUP_ID) {
    try {
      added = await addToAccessGroup(req.email, { token: CF_API_TOKEN, account: CF_ACCOUNT_ID, group: ACCESS_GROUP_ID });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Toevoegen aan Cloudflare mislukt.", 502);
    }
  }
  const status = body.action === "goedkeuren" ? "goedgekeurd" : "afgewezen";
  const now = new Date().toISOString();
  await gh.update<RequestsFile>(
    REQUESTS_FILE,
    EMPTY_REQUESTS,
    (f) => ({ requests: f.requests.map((r) => (r.id === req.id ? { ...r, status, doneAt: now } : r)) }),
    `toegang ${status}`,
  );
  return json({ ok: true, added });
}

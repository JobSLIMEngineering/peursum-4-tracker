import { fail, github, json, sameOrigin, type Ctx } from "../../src/lib/server/http";
import { addRequest, cleanRequest, EMPTY_REQUESTS, REQUESTS_FILE, type RequestsFile } from "../../src/lib/store/requests";

/** Toegang aanvragen vanaf de openbare uitnodiging (naam, e-mail, korte toelichting) */
export async function onRequestPost(ctx: Ctx) {
  if (!sameOrigin(ctx.request)) return fail("Niet toegestaan.", 403);
  const r = cleanRequest(await ctx.request.json().catch(() => null));
  if ("error" in r) return fail(r.error, 400);
  let error: string | null = null;
  await github(ctx.env).update<RequestsFile>(
    REQUESTS_FILE,
    EMPTY_REQUESTS,
    (f) => {
      const next = addRequest(f, r, crypto.randomUUID(), new Date().toISOString());
      if ("error" in next) {
        error = next.error;
        return f;
      }
      return next;
    },
    "toegang aangevraagd",
  );
  return error ? fail(error, 429) : json({ ok: true });
}

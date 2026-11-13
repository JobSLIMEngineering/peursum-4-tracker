import type { Ctx } from "../../src/lib/server/http";

/**
 * Inloggen: dit adres valt onder Cloudflare Access, dus wie hier aankomt is net ingelogd.
 * Daarna terug naar de app.
 */
export function onRequestGet(ctx: Ctx) {
  return Response.redirect(new URL("/", ctx.request.url).toString(), 302);
}

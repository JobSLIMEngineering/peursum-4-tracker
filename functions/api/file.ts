import { DATA_FILES, EMPTY, type DataFile } from "../../src/lib/store/schema";
import { Conflict } from "../../src/lib/server/github";
import { fail, github, json, owner, sameOrigin, type Ctx } from "../../src/lib/server/http";

const fileOf = (name: string | null | undefined): DataFile | null => (name && (DATA_FILES as string[]).includes(name) ? (name as DataFile) : null);

/** Eén bestand met zijn versie (sha), zodat de app veilig kan aanpassen en terugschrijven (alleen beheerder) */
export async function onRequestGet(ctx: Ctx) {
  const o = await owner(ctx);
  if (o instanceof Response) return o;
  const file = fileOf(new URL(ctx.request.url).searchParams.get("name"));
  if (!file) return fail("Onbekend bestand.", 400);
  const cur = await github(ctx.env).read(file);
  return json(cur ?? { data: EMPTY[file], sha: null });
}

/** Terugschrijven; botst het met een andere wijziging, dan 409 en probeert de app het opnieuw */
export async function onRequestPut(ctx: Ctx) {
  if (!sameOrigin(ctx.request)) return fail("Niet toegestaan.", 403);
  const o = await owner(ctx);
  if (o instanceof Response) return o;
  const body = (await ctx.request.json().catch(() => null)) as { name?: string; data?: unknown; sha?: string | null; message?: string } | null;
  const file = fileOf(body?.name);
  if (!file || !body || body.data == null || typeof body.data !== "object") return fail("Ongeldige aanvraag.", 400);
  const message = `app: ${String(body.message ?? "bijgewerkt").slice(0, 120)}`;
  try {
    const sha = await github(ctx.env).write(file, body.data, message, body.sha ?? null);
    return json({ sha });
  } catch (e) {
    if (e instanceof Conflict) return fail("Intussen gewijzigd.", 409);
    throw e;
  }
}

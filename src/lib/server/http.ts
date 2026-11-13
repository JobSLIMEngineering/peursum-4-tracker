import { accessToken, roleOf, verifyAccessJwt, type Role } from "./access";
import { GitHub, repoFrom } from "./github";

/** Instellingen van de site in Cloudflare (Settings → Variables and Secrets) */
export interface Env {
  /** Geheim: GitHub-sleutel met alleen Contents read/write (en Actions write) op de data-repository */
  GITHUB_TOKEN: string;
  /** "eigenaar/repo" van de data (standaard JobSLIMEngineering/peursum-4-data) */
  DATA_REPO?: string;
  /** Bijv. "peursum4.cloudflareaccess.com" */
  ACCESS_TEAM_DOMAIN: string;
  /** Application Audience (AUD) Tag van de Access-applicatie */
  ACCESS_AUD: string;
  /** E-mailadressen (komma's ertussen) die mogen bewerken */
  OWNER_EMAILS: string;
  /** Optioneel: aanvragen goedkeuren zet het adres meteen in de Access-groep */
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  ACCESS_GROUP_ID?: string;
  /** Alleen lokaal testen (wrangler op localhost): doen alsof dit adres ingelogd is */
  DEV_EMAIL?: string;
}

/** Wat Cloudflare Pages aan een functie meegeeft (alleen wat we gebruiken) */
export interface Ctx {
  request: Request;
  env: Env;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export const fail = (message: string, status: number) => json({ error: message }, status);

export const github = (env: Env) => new GitHub(env.GITHUB_TOKEN, repoFrom(env.DATA_REPO));

/** Kop die de app bij elke wijziging meestuurt; andere sites kunnen die niet zomaar meesturen */
export const APP_HEADER = "X-P4";

/**
 * Wijzigingen alleen vanaf de eigen site: de eigen kop moet erbij, en als de browser een Origin meestuurt
 * moet die van deze site zijn (zo kan een andere website niet met jouw inlogkoekje iets opslaan).
 */
export function sameOrigin(req: Request): boolean {
  if (req.headers.get(APP_HEADER) !== "1") return false;
  const origin = req.headers.get("Origin");
  return !origin || origin === new URL(req.url).origin;
}

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Wie is ingelogd? Geeft een foutantwoord als niemand (of als het bewijs niet klopt) */
export async function who(ctx: Ctx): Promise<{ email: string; role: Role } | Response> {
  const { request, env } = ctx;
  if (env.DEV_EMAIL && LOCAL.has(new URL(request.url).hostname)) return { email: env.DEV_EMAIL, role: roleOf(env.DEV_EMAIL, env.OWNER_EMAILS) };
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return fail("Inloggen is nog niet ingesteld.", 500);
  const token = accessToken(request);
  if (!token) return fail("Niet ingelogd.", 401);
  const email = await verifyAccessJwt(token, { teamDomain: env.ACCESS_TEAM_DOMAIN, aud: env.ACCESS_AUD }).catch(() => null);
  if (!email) return fail("Niet ingelogd.", 401);
  return { email, role: roleOf(email, env.OWNER_EMAILS) };
}

/** Alleen de beheerder */
export async function owner(ctx: Ctx): Promise<{ email: string } | Response> {
  const w = await who(ctx);
  if (w instanceof Response) return w;
  if (w.role !== "owner") return fail("Alleen de beheerder mag dit.", 403);
  return w;
}

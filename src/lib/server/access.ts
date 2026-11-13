/**
 * Inloggen via Cloudflare Access: Cloudflare zet bij elke aanvraag een ondertekend bewijs (JWT) mee met het
 * e-mailadres van wie ingelogd is. De server controleert dat bewijs zelf ook (handtekening, doelgroep,
 * uitgever, geldigheid), zodat een verkeerde instelling in Cloudflare nooit stilletjes alles openzet.
 */

export interface AccessConfig {
  /** Bijv. "peursum4.cloudflareaccess.com" */
  teamDomain: string;
  /** "Application Audience (AUD) Tag" van de Access-applicatie */
  aud: string;
}

interface Jwk extends JsonWebKey {
  kid?: string;
}

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s))) as Record<string, unknown>;

// Sleutels van Cloudflare even onthouden (ze wisselen zelden)
let certCache: { domain: string; keys: Jwk[]; at: number } | null = null;
const CERT_TTL = 60 * 60 * 1000;

async function certs(domain: string, fetchFn: typeof fetch, now: number, fresh = false): Promise<Jwk[]> {
  if (!fresh && certCache && certCache.domain === domain && now - certCache.at < CERT_TTL) return certCache.keys;
  const res = await fetchFn(`https://${domain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access-sleutels ophalen mislukt (${res.status})`);
  const keys = ((await res.json()) as { keys: Jwk[] }).keys ?? [];
  certCache = { domain, keys, at: now };
  return keys;
}

/** Geeft het e-mailadres (kleine letters) als het bewijs klopt, anders null */
export async function verifyAccessJwt(token: string, cfg: AccessConfig, fetchFn: typeof fetch = fetch, now = Date.now()): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = json(h);
    payload = json(p);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

  let key = (await certs(cfg.teamDomain, fetchFn, now)).find((k) => k.kid === header.kid);
  // Onbekende sleutel: misschien net gewisseld, één keer vers ophalen
  if (!key) key = (await certs(cfg.teamDomain, fetchFn, now, true)).find((k) => k.kid === header.kid);
  if (!key) return null;

  const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, b64url(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(cfg.aud)) return null;
  if (payload.iss !== `https://${cfg.teamDomain}`) return null;
  const sec = now / 1000;
  if (typeof payload.exp !== "number" || payload.exp < sec) return null;
  if (typeof payload.nbf === "number" && payload.nbf > sec + 60) return null;
  return typeof payload.email === "string" ? payload.email.toLowerCase() : null;
}

/** Het bewijs uit de aanvraag: de header van Access, of anders het inlogkoekje */
export function accessToken(req: Request): string | null {
  const h = req.headers.get("Cf-Access-Jwt-Assertion");
  if (h) return h;
  const cookie = req.headers.get("Cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? m[1] : null;
}

export type Role = "owner" | "member";

/** Beheerder (mag bewerken) of lid (mag alles zien) */
export const roleOf = (email: string, ownerEmails: string | undefined): Role =>
  (ownerEmails ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase())
    ? "owner"
    : "member";

/** Alleen voor testen in de test zelf: sleutelcache leegmaken */
export const _resetCertCache = () => {
  certCache = null;
};

/**
 * Goedgekeurde aanvraag: het e-mailadres in de Access-groep zetten, zodat diegene meteen kan inloggen.
 * Werkt alleen als CF_API_TOKEN, CF_ACCOUNT_ID en ACCESS_GROUP_ID zijn ingesteld; anders zet de
 * beheerder het adres zelf in Cloudflare.
 */

interface Rule {
  email?: { email: string };
  [k: string]: unknown;
}
interface Group {
  name: string;
  include: Rule[];
  exclude?: Rule[];
  require?: Rule[];
}

export interface CfConfig {
  token: string;
  account: string;
  group: string;
}

export async function addToAccessGroup(email: string, cfg: CfConfig, fetchFn: typeof fetch = fetch): Promise<"added" | "already"> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.account}/access/groups/${cfg.group}`;
  const headers = { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" };
  const res = await fetchFn(url, { headers });
  if (!res.ok) throw new Error(`Access-groep lezen mislukt (${res.status})`);
  const g = ((await res.json()) as { result: Group }).result;
  const has = g.include.some((r) => r.email?.email?.toLowerCase() === email.toLowerCase());
  if (has) return "already";
  const put = await fetchFn(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ name: g.name, include: [...g.include, { email: { email } }], exclude: g.exclude ?? [], require: g.require ?? [] }),
  });
  if (!put.ok) throw new Error(`Access-groep bijwerken mislukt (${put.status})`);
  return "added";
}

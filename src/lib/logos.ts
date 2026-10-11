import { BASE } from "./base";

/**
 * Clublogo's die in de app zelf staan (public/logos/<clubcode>.png). Nodig voor de deelpost:
 * logo's van voetbal.nl mogen niet in een canvas worden getekend. Opnieuw ophalen:
 * zie README ("Logo's").
 */
const LOCAL = new Set([
  "BBJB32E", "BBJJ049", "BBJC783", "BBJC25J", "BBJK21L", "BBJF01K",
  "BBJC82Y", "BBHX85Q", "BBHW50H", "BBHX39F", "BBJC47R", "BBHZ793",
]);

/** Logo-adres voor een team: Peursum = eigen wapen, anders lokaal als het er is, anders voetbal.nl */
export function logoSrc(team: string, logos: Record<string, string>): string | null {
  if (/^peursum\b/i.test(team)) return `${BASE}/club-logo.png`;
  const url = logos[team];
  if (!url) return null;
  const code = url.match(/clubcode=([A-Z0-9]+)/)?.[1];
  return code && LOCAL.has(code) ? `${BASE}/logos/${code}.png` : url;
}

/** Alleen logo's die we in een canvas mogen tekenen (eigen domein) */
export function canvasLogoSrc(team: string, logos: Record<string, string>): string | null {
  const src = logoSrc(team, logos);
  return src && !src.startsWith("http") ? src : null;
}

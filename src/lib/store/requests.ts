/**
 * Toegangsaanvragen vanaf de openbare uitnodiging. Ze staan in de privé data-repository
 * (data/aanvragen.json); alleen de beheerder ziet ze en keurt ze goed.
 */

export const REQUESTS_FILE = "aanvragen.json";

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  note: string;
  at: string;
  status: "open" | "goedgekeurd" | "afgewezen";
  /** Wanneer goed- of afgekeurd */
  doneAt?: string;
}

export interface RequestsFile {
  requests: AccessRequest[];
}

export const EMPTY_REQUESTS: RequestsFile = { requests: [] };

/** Meer open aanvragen nemen we niet aan (tegen spam) */
export const MAX_OPEN = 25;

const EMAIL = /^[^\s@<>()",;:]{1,64}@[^\s@<>()",;:]{1,190}\.[a-z]{2,24}$/i;

/** Controleert een aanvraag van het formulier; geeft een foutmelding of de schone aanvraag */
export function cleanRequest(body: unknown): { error: string } | { name: string; email: string; note: string } {
  if (!body || typeof body !== "object") return { error: "Ongeldige aanvraag." };
  const b = body as Record<string, unknown>;
  // Honingpot: dit veld is onzichtbaar; alleen robots vullen het in
  if (typeof b.website === "string" && b.website.trim()) return { error: "Ongeldige aanvraag." };
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 300) : "";
  if (name.length < 2 || name.length > 60) return { error: "Vul je naam in." };
  if (!EMAIL.test(email)) return { error: "Vul een geldig e-mailadres in." };
  return { name, email, note };
}

/** Aanvraag toevoegen (dubbele open aanvragen van hetzelfde adres worden bijgewerkt in plaats van erbij gezet) */
export function addRequest(file: RequestsFile, r: { name: string; email: string; note: string }, id: string, at: string): RequestsFile | { error: string } {
  const open = file.requests.filter((x) => x.status === "open");
  const same = open.find((x) => x.email === r.email);
  if (same) return { requests: file.requests.map((x) => (x === same ? { ...x, name: r.name, note: r.note || x.note, at } : x)) };
  if (file.requests.some((x) => x.email === r.email && x.status === "goedgekeurd")) return file;
  if (open.length >= MAX_OPEN) return { error: "Er staan al veel aanvragen open. Probeer het later nog eens." };
  return { requests: [...file.requests, { id, ...r, at, status: "open" }] };
}

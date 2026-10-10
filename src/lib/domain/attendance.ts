import type { Player } from "./types";

/** Kleine letters, zonder accenten en leestekens, enkele spaties. */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Leest een geplakte aanwezigheidslijst (WhatsApp-tekst of opsomming).
 * Matching: exacte naam → voornaam + achternaam → unieke voornaam.
 */
export function parseAttendance(
  text: string,
  players: Pick<Player, "id" | "name">[],
): { found: string[]; unknown: string[] } {
  const names = text
    .split(/[\n,;]+/)
    .map((l) =>
      l
        .replace(/^\s*\d+[.)]?\s*/, "")
        .replace(/^[-*•·]\s*/, "")
        .replace(/\(.*?\)/g, "")
        .replace(/[^\p{L}\s'.-]/gu, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((n) => n.length > 1);

  const named = players
    .filter((p) => p.name)
    .map((p) => ({ id: p.id, parts: normName(p.name!).split(" ") }));

  const found: string[] = [];
  const unknown: string[] = [];

  for (const n of names) {
    const key = normName(n);
    const kp = key.split(" ");

    const exact = named.find((p) => p.parts.join(" ") === key);
    const firstLast =
      kp.length > 1
        ? named.find((p) => p.parts[0] === kp[0] && p.parts.at(-1) === kp.at(-1))
        : undefined;
    const byFirst = kp.length === 1 ? named.filter((p) => p.parts[0] === key) : [];
    const hit = exact ?? firstLast ?? (byFirst.length === 1 ? byFirst[0] : undefined);

    if (hit) {
      if (!found.includes(hit.id)) found.push(hit.id);
    } else if (!unknown.some((u) => normName(u) === key)) {
      unknown.push(n);
    }
  }

  return { found, unknown };
}

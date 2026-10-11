import type { Player } from "./types";

/** Kleine letters, zonder accenten en leestekens, enkele spaties; "ij" en "y" gelijk (Boweij = Bowey). */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ij/g, "y")
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dubbele letters samenvoegen: "jurrien" → "jurien" */
const collapse = (s: string) => [...s].filter((c, i, a) => c !== a[i - 1]).join("");

/**
 * Klanksleutel voor namen die op meerdere manieren geschreven worden:
 * ij/ei/ey/y, dubbele letters, ö/oe/o, ou/au, c/k, ph/f, dt/d.
 */
export function soundKey(s: string): string {
  const k = normName(s.replace(/ö/gi, "oe").replace(/ü/gi, "ue").replace(/ä/gi, "ae"))
    .replace(/e[iy]/g, "y")
    .replace(/ou/g, "au")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/c(?=[aou]|$| )/g, "k")
    .replace(/dt(?=$| )/g, "d")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .replace(/ae/g, "a");
  return collapse(k);
}

/** Levenshtein-afstand, met vroege stop boven `max` */
function distance(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Woorden die in een app-bericht staan maar geen naam zijn */
const NOT_NAMES = new Set(
  [
    "goedemorgen", "goedemiddag", "goedenavond", "morgen", "vandaag", "hoi", "hallo", "hey", "hee", "hai",
    "mannen", "heren", "jongens", "allen", "allemaal", "groet", "groeten", "gr", "grt", "succes", "top",
    "toppers", "aanwezig", "afwezig", "afgemeld", "selectie", "opstelling", "reserve", "reserves", "wissel",
    "wissels", "keeper", "keepers", "verzamelen", "thuis", "uit", "ok", "oke", "en",
  ].map(normName),
);

/** Te lang of met een tijdstip: een zin, geen naam ("Morgen thuis tegen Spijk om 12:30 …") */
const isSentence = (line: string) => line.split(/\s+/).filter(Boolean).length > 4 || /\d{1,2}[:.]\d{2}/.test(line);

/** Teamaanduiding achter een naam ("Milan 5e", "Kees (6)"): waarschijnlijk een leenspeler */
const TEAM_MARK = /\(?\b\d{1,2}\s*(?:e|ste|de)?\b\)?/gi;

export interface AttendanceResult {
  /** Herkende spelers (id's) */
  found: string[];
  /** Namen die bij niemand passen; `loan` als er een teamnummer bij stond */
  unknown: { name: string; loan: boolean }[];
  /** Namen die bij meerdere spelers passen ("Tim") */
  ambiguous: { name: string; options: string[] }[];
}

/**
 * Leest een geplakte aanwezigheidslijst (WhatsApp-tekst of opsomming).
 * Slaat begroetingen en zinnen over. Vergelijkt op klank (Bowey = Boweij, Björn = Bjorn),
 * ook met de bijnamen die de gebruiker eerder aan spelers heeft gekoppeld.
 * Volgorde: volledige naam → voor- + achternaam → voornaam → achternaam → één tikfout.
 * Past een naam bij meerdere spelers, dan kiest de gebruiker.
 */
export function parseAttendance(
  text: string,
  players: (Pick<Player, "id" | "name"> & { aliases?: string[] })[],
): AttendanceResult {
  const pieces = text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").replace(/^\s*[-*•·]\s*/, "").trim())
    .flatMap((l) => l.split(/[,;]+/))
    .filter((l) => l.trim() && !isSentence(l.replace(/\(.*?\)/g, "").trim()))
    .map((raw) => {
      const loan = TEAM_MARK.test(raw);
      TEAM_MARK.lastIndex = 0;
      const name = raw
        .replace(/\(.*?\)/g, "")
        .replace(TEAM_MARK, "")
        .replace(/[^\p{L}\s'.-]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
      return { name, loan };
    })
    .filter(({ name }) => name.length > 1 && !normName(name).split(" ").every((w) => NOT_NAMES.has(w)));

  // Tussenvoegsels tellen niet als achternaam ("Bjorn van der Stok" → "stok").
  // Elke speler heeft zijn naam plus eventuele eigen bijnamen (aliases) als varianten.
  const variants = players.flatMap((p) =>
    [p.name, ...(p.aliases ?? [])]
      .filter((n): n is string => !!n)
      .map((n) => {
        const parts = soundKey(n).split(" ");
        return { id: p.id, full: parts.join(" "), first: parts[0], last: parts.at(-1)! };
      }),
  );
  const unique = (xs: { id: string }[]) => [...new Set(xs.map((x) => x.id))];

  const result: AttendanceResult = { found: [], unknown: [], ambiguous: [] };
  const seen = new Set<string>();

  for (const { name, loan } of pieces) {
    const key = soundKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const kp = key.split(" ");

    let hits = unique(variants.filter((v) => v.full === key));
    if (!hits.length && kp.length > 1) hits = unique(variants.filter((v) => v.first === kp[0] && v.last === kp.at(-1)));
    if (!hits.length && kp.length === 1) {
      hits = unique(variants.filter((v) => v.first === key));
      if (!hits.length) hits = unique(variants.filter((v) => v.last === key));
    }
    // Eén tikfout bij namen van 5+ letters (Patrik/Patrick, Minkelis/Minkellis)
    if (!hits.length && key.length >= 5) {
      hits = unique(
        variants.filter((v) =>
          kp.length === 1 ? distance(key, v.first) <= 1 || distance(key, v.last) <= 1 : distance(key, v.full) <= 1,
        ),
      );
    }

    if (hits.length === 1) {
      if (!result.found.includes(hits[0])) result.found.push(hits[0]);
    } else if (hits.length > 1) {
      result.ambiguous.push({ name, options: hits });
    } else {
      result.unknown.push({ name, loan });
    }
  }
  return result;
}

import { isOurs, isPlayed, type Match } from "./types";

/**
 * Indeling van het Competitie-scherm: ronde 1–22, inhaalwedstrijden als eigen groep,
 * overige (beker/oefen of zonder ronde) als "Extra" per datum.
 */

export type RoundGroup =
  | { key: string; kind: "ronde"; round: number; date: string | null; matches: Match[] }
  | { key: string; kind: "inhaal" | "extra"; date: string | null; matches: Match[] };

const mostCommon = (xs: string[]) => {
  const c = new Map<string, number>();
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
};

/** Peursum bovenaan, daarna op tijd */
const byOursThenTime = (a: Match, b: Match) =>
  Number(isOurs(b)) - Number(isOurs(a)) || (a.time ?? "").localeCompare(b.time ?? "");

export function buildRounds(matches: Match[]): RoundGroup[] {
  const groups = new Map<string, RoundGroup>();
  const add = (g: RoundGroup, m: Match) => {
    const ex = groups.get(g.key);
    if (ex) ex.matches.push(m);
    else groups.set(g.key, { ...g, matches: [m] });
  };

  for (const m of matches) {
    if (m.makeup) add({ key: `i${m.date}`, kind: "inhaal", date: m.date, matches: [] }, m);
    else if (m.round !== null && m.kind === "competitie")
      add({ key: `r${m.round}`, kind: "ronde", round: m.round, date: null, matches: [] }, m);
    else add({ key: `x${m.date ?? "onbekend"}`, kind: "extra", date: m.date, matches: [] }, m);
  }

  const out = [...groups.values()];
  for (const g of out) {
    if (g.kind === "ronde") g.date = mostCommon(g.matches.flatMap((m) => (m.date ? [m.date] : [])));
    g.matches.sort(byOursThenTime);
  }
  return out.sort(
    (a, b) =>
      (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
      (a.kind === "ronde" && b.kind === "ronde" ? a.round - b.round : 0),
  );
}

export const ourMatch = (g: RoundGroup) => g.matches.find(isOurs);

/**
 * Gespeeld: met Peursum-wedstrijd pas als die uitslag bekend is;
 * zonder: als alle uitslagen bekend zijn of de datum voorbij is.
 */
export function isRoundDone(g: RoundGroup, today: string): boolean {
  const o = ourMatch(g);
  if (o) return isPlayed(o);
  return g.matches.every(isPlayed) || (!!g.date && g.date <= today);
}

export function splitRounds(groups: RoundGroup[], today: string) {
  const done = groups.filter((g) => isRoundDone(g, today)).reverse();
  const upcoming = groups.filter((g) => !isRoundDone(g, today));
  const next = upcoming.find((g) => g.matches.some((m) => isOurs(m) && m.date));
  const defaultOpen = [next?.key, done[0]?.key].filter((k): k is string => !!k);
  return { upcoming, done, defaultOpen };
}

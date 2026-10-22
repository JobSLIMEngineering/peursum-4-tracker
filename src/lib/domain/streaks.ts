import { isPlayed, ourScore, type Match, type MatchEntry } from "./types";

/**
 * "On fire": spelers die het de laatste wedstrijden uitzonderlijk goed doen.
 * Alleen gespeelde competitiewedstrijden met ingevoerde stats tellen mee, in volgorde van datum.
 *
 * Scorer (vlammetje): 2+ doelpuntbetrokkenheid (goals + assists) in de laatste wedstrijd,
 *   of 3+ goals / 4+ betrokkenheid in de laatste 3, of in 3 wedstrijden achter elkaar gescoord.
 *   Zodat niet iedereen na een grote zege een vlam krijgt: alleen de MAX_HOT heetste spelers
 *   (goal telt zwaarder dan assist, de laatste wedstrijd telt het zwaarst).
 * Keeper (handschoen met vuur): 2+ clean sheets achter elkaar als keeper.
 */

export type StreakKind = "scorer" | "keeper";

export interface Streak {
  kind: StreakKind;
  /** Korte uitleg, bijv. "3 goals in de laatste 2 duels" */
  reason: string;
}

const MAX_HOT = 3;
const ASSIST = 0.7;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function involvement(goals: number, assists: number): string {
  const parts = [];
  if (goals) parts.push(goals === 1 ? "goal" : `${goals} goals`);
  if (assists) parts.push(assists === 1 ? "assist" : `${assists} assists`);
  return parts.join(" + ");
}

export function hotStreaks(matches: Match[], entries: Record<string, MatchEntry>): Record<string, Streak[]> {
  const games = matches
    .filter((m) => m.kind === "competitie" && isPlayed(m) && entries[m.id])
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  if (!games.length) return {};

  const out: Record<string, Streak[]> = {};
  const add = (id: string, s: Streak) => (out[id] ??= []).push(s);

  // --- Scorers ---
  const recent = games.slice(-3);
  const last = games.at(-1)!;
  const goalsIn = (m: Match, id: string) => entries[m.id].stats[id]?.goals ?? 0;
  const assistsIn = (m: Match, id: string) => entries[m.id].stats[id]?.assists ?? 0;
  const players = new Set(games.flatMap((m) => Object.keys(entries[m.id].stats)));

  const candidates: { id: string; heat: number; reason: string }[] = [];
  for (const id of players) {
    const lg = goalsIn(last, id);
    const la = assistsIn(last, id);
    const rg = recent.reduce((s, m) => s + goalsIn(m, id), 0);
    const ra = recent.reduce((s, m) => s + assistsIn(m, id), 0);
    // Reeks: opeenvolgende wedstrijden (waarin hij meedeed) met een goal, vanaf de laatste terug
    let run = 0;
    for (let i = games.length - 1; i >= 0; i--) {
      const e = entries[games[i].id];
      if (!e.attendance.includes(id)) continue;
      if (goalsIn(games[i], id) > 0) run++;
      else break;
    }

    let reason: string | null = null;
    if (lg + la >= 2) reason = `${involvement(lg, la)} in de laatste wedstrijd`;
    else if (rg >= 3) reason = `${count(rg, "goal", "goals")} in de laatste ${recent.length} duels`;
    else if (rg + ra >= 4) reason = `${involvement(rg, ra)} in de laatste ${recent.length} duels`;
    else if (run >= 3) reason = `${run} duels op rij gescoord`;
    if (!reason) continue;

    // Hitte: de laatste wedstrijd dubbel, plus de laatste 3 en een eventuele reeks
    const heat = 2 * (lg + ASSIST * la) + rg + ASSIST * ra + 0.5 * run;
    candidates.push({ id, heat, reason });
  }
  candidates
    .sort((a, b) => b.heat - a.heat)
    .slice(0, MAX_HOT)
    .forEach((c) => add(c.id, { kind: "scorer", reason: c.reason }));

  // --- Keeper: clean sheets op rij, vanaf de laatste wedstrijd waarin hij keepte ---
  const keepers = new Set(games.map((m) => entries[m.id].keeperId).filter((k): k is string => !!k));
  for (const id of keepers) {
    let run = 0;
    for (let i = games.length - 1; i >= 0; i--) {
      if (entries[games[i].id].keeperId !== id) continue;
      if (ourScore(games[i])![1] === 0) run++;
      else break;
    }
    if (run >= 2) add(id, { kind: "keeper", reason: `${run} clean sheets op rij` });
  }

  return out;
}

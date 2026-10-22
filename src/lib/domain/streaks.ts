import { isPlayed, ourScore, type Match, type MatchEntry } from "./types";

/**
 * "On fire": spelers die het de laatste wedstrijden uitzonderlijk goed doen.
 * Alleen gespeelde competitiewedstrijden met ingevoerde stats tellen mee, in volgorde van datum.
 *
 * Scorer (vlammetje): 2+ goals in de laatste wedstrijd, of 3+ goals in de laatste 3,
 *   of in 3 wedstrijden achter elkaar gescoord (waarin hij meedeed).
 * Keeper (handschoen met vuur): 2+ clean sheets achter elkaar als keeper.
 */

export type StreakKind = "scorer" | "keeper";

export interface Streak {
  kind: StreakKind;
  /** Korte uitleg, bijv. "3 goals in de laatste 2 duels" */
  reason: string;
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
  const players = new Set(games.flatMap((m) => Object.keys(entries[m.id].stats)));

  for (const id of players) {
    const lastGoals = goalsIn(last, id);
    const recentGoals = recent.reduce((s, m) => s + goalsIn(m, id), 0);
    // Reeks: opeenvolgende wedstrijden (waarin hij meedeed) met een goal, vanaf de laatste terug
    let run = 0;
    for (let i = games.length - 1; i >= 0; i--) {
      const e = entries[games[i].id];
      if (!e.attendance.includes(id)) continue;
      if (goalsIn(games[i], id) > 0) run++;
      else break;
    }

    if (lastGoals >= 2) add(id, { kind: "scorer", reason: `${lastGoals} goals in de laatste wedstrijd` });
    else if (recentGoals >= 3) add(id, { kind: "scorer", reason: `${recentGoals} goals in de laatste ${recent.length} duels` });
    else if (run >= 3) add(id, { kind: "scorer", reason: `${run} duels op rij gescoord` });
  }

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

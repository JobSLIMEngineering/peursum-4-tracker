import { isPlayed, ourScore, type Match, type MatchEntry, type Player, type StandingRow, US } from "./types";

export interface PlayerTotals {
  appearances: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  keeperGames: number;
  cleanSheets: number;
  goalsAgainst: number;
  penalties: number;
  freeKicks: number;
  ownGoals: number;
}

const empty = (): PlayerTotals => ({
  appearances: 0,
  goals: 0,
  assists: 0,
  yellow: 0,
  red: 0,
  keeperGames: 0,
  cleanSheets: 0,
  goalsAgainst: 0,
  penalties: 0,
  freeKicks: 0,
  ownGoals: 0,
});

/**
 * Spelersstatistieken. Alleen gespeelde competitiewedstrijden tellen mee.
 * Rood (direct of via tweede geel) telt als één rode kaart en niet als geel.
 * Tegengoals en clean sheets komen uit de uitslag en gaan naar de keeper.
 */
export function playerTotals(
  players: Pick<Player, "id">[],
  matches: Match[],
  entries: MatchEntry[],
): Record<string, PlayerTotals> {
  const t: Record<string, PlayerTotals> = Object.fromEntries(players.map((p) => [p.id, empty()]));
  const byId = new Map(matches.map((m) => [m.id, m]));

  for (const e of entries) {
    const m = byId.get(e.matchId);
    if (!m || m.kind !== "competitie") continue;
    const score = ourScore(m);
    if (!score) continue;

    for (const id of e.attendance) if (t[id]) t[id].appearances++;
    for (const [id, s] of Object.entries(e.stats)) {
      if (!t[id]) continue;
      t[id].goals += s.goals;
      t[id].assists += s.assists;
      // Penalty's en vrije trappen zijn een deel van de goals; nooit meer dan het aantal goals
      const pen = Math.min(s.penalties ?? 0, s.goals);
      t[id].penalties += pen;
      t[id].freeKicks += Math.min(s.freeKicks ?? 0, s.goals - pen);
      t[id].ownGoals += s.ownGoals ?? 0;
      if (s.red) t[id].red++;
      else if (s.yellow) t[id].yellow++;
    }
    if (e.keeperId && t[e.keeperId]) {
      const k = t[e.keeperId];
      k.keeperGames++;
      k.goalsAgainst += score[1];
      if (score[1] === 0) k.cleanSheets++;
    }
  }
  return t;
}

/** Nummer 1 (bij gelijkstand alle namen) voor een statistiek. */
export function leaders<T extends { id: string }>(
  players: T[],
  totals: Record<string, PlayerTotals>,
  key: "goals" | "assists",
): { players: T[]; value: number } {
  const value = Math.max(0, ...players.map((p) => totals[p.id]?.[key] ?? 0));
  return { players: value ? players.filter((p) => totals[p.id]?.[key] === value) : [], value };
}

/** Aantal toegewezen goals (spelers + eigen goals tegenstander) */
export const assignedGoals = (e: Pick<MatchEntry, "stats" | "opponentOwnGoals">) =>
  Object.values(e.stats).reduce((s, x) => s + x.goals, 0) + e.opponentOwnGoals;

/** Per-wedstrijd-statistieken van ons team met plek in de poule. */
export function perMatchStats(standings: StandingRow[], team = US) {
  const u = standings.find((r) => r.team === team);
  if (!u || !u.played) return null;
  const rank = (f: (r: StandingRow) => number, asc = false) =>
    [...standings]
      .filter((r) => r.played)
      .sort((a, b) => (asc ? f(a) - f(b) : f(b) - f(a)))
      .findIndex((r) => r.team === team) + 1;
  return {
    row: u,
    teams: standings.length,
    items: [
      { label: "Goals voor", value: u.goalsFor / u.played, rank: rank((r) => r.goalsFor / r.played) },
      { label: "Goals tegen", value: u.goalsAgainst / u.played, rank: rank((r) => r.goalsAgainst / r.played, true) },
      { label: "Punten", value: u.points / u.played, rank: rank((r) => r.points / r.played) },
    ],
  };
}

/** Laatste n gespeelde competitiewedstrijden van een team, nieuwste eerst. */
export function lastMatches(matches: Match[], team: string, n = 3) {
  return matches
    .filter((m) => m.kind === "competitie" && isPlayed(m) && (m.home === team || m.away === team))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, n)
    .map((m) => {
      const home = m.home === team;
      return {
        match: m,
        opponent: home ? m.away : m.home,
        home,
        goalsFor: (home ? m.homeGoals : m.awayGoals) as number,
        goalsAgainst: (home ? m.awayGoals : m.homeGoals) as number,
      };
    });
}

import { buildRounds, isRoundDone } from "./rounds";
import { isPlayed, type Match, type StandingRow } from "./types";

export interface PositionHistory {
  /** Gespeelde speelrondes, oud → nieuw */
  rounds: { round: number; date: string | null }[];
  /** Per team de plek na elke ronde (zelfde volgorde als `rounds`) */
  teams: { team: string; positions: number[] }[];
}

interface Tally {
  team: string;
  points: number;
  gf: number;
  ga: number;
}

/**
 * Waar stond elk team na elke speelronde? Uit de uitslagen herberekend (punten, dan doelsaldo, dan
 * gemaakte goals). Inhaalwedstrijden tellen mee vanaf hun datum. De laatste ronde neemt de plekken
 * van de echte stand over, zodat het einde van de lijn altijd klopt met de tabel.
 */
export function positionHistory(matches: Match[], standings: StandingRow[], today: string): PositionHistory {
  const pool = standings.map((s) => s.team);
  const inPool = new Set(pool);
  const comp = matches.filter((m) => m.kind === "competitie" && isPlayed(m) && inPool.has(m.home) && inPool.has(m.away));
  const rounds = buildRounds(matches)
    .filter((g): g is Extract<typeof g, { kind: "ronde" }> => g.kind === "ronde" && isRoundDone(g, today))
    .sort((a, b) => a.round - b.round)
    .map((g) => ({ round: g.round, date: g.date }));

  const table = (r: { round: number; date: string | null }) => {
    const t = new Map<string, Tally>(pool.map((team) => [team, { team, points: 0, gf: 0, ga: 0 }]));
    for (const m of comp) {
      const counts = m.date && r.date ? m.date <= r.date : (m.round ?? Infinity) <= r.round;
      if (!counts) continue;
      const h = t.get(m.home)!;
      const a = t.get(m.away)!;
      h.gf += m.homeGoals!;
      h.ga += m.awayGoals!;
      a.gf += m.awayGoals!;
      a.ga += m.homeGoals!;
      if (m.homeGoals! > m.awayGoals!) h.points += 3;
      else if (m.homeGoals! < m.awayGoals!) a.points += 3;
      else {
        h.points++;
        a.points++;
      }
    }
    const order = [...t.values()].sort(
      (x, y) => y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || x.team.localeCompare(y.team),
    );
    return new Map(order.map((x, i) => [x.team, i + 1]));
  };

  const perRound = rounds.map(table);
  if (perRound.length) perRound[perRound.length - 1] = new Map(standings.map((s) => [s.team, s.position]));
  return { rounds, teams: pool.map((team) => ({ team, positions: perRound.map((p) => p.get(team) ?? pool.length) })) };
}

/** Korte naam voor naast de lijn: "Leerdam Sport'55 5" → "Leerdam 5", "SV Noordeloos 3" → "Noordeloos 3" */
export function shortTeam(team: string): string {
  if (team.length <= 11) return team;
  const words = team.split(" ").filter((w) => !/^(sv|vv|svv|v\.v\.)$/i.test(w));
  const last = words.at(-1) ?? "";
  return /^\d+$/.test(last) && words.length > 1 ? `${words[0]} ${last}` : words.join(" ");
}

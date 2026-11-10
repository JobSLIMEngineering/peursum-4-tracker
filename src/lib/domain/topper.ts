import { opponent, US, type Match, type StandingRow } from "./types";

/**
 * Topper: een wedstrijd tegen een directe concurrent bovenin de stand.
 * Wat staat er op het spel? Per uitkomst (winst/gelijk/verlies) onze punten, onze plek en het verschil
 * met de tegenstander, als de rest van de poule die ronde niets verandert.
 */

export type Result = "W" | "G" | "V";

export interface Scenario {
  result: Result;
  points: number;
  position: number;
  /** Punten voor (+) of achter (−) op de tegenstander */
  gapOpponent: number;
  /** Punten voor (+) of achter (−) op de nummer 1 (of de nummer 2 als wij bovenaan staan) */
  gapTop: number;
}

export interface Topper {
  opponent: string;
  us: StandingRow;
  them: StandingRow;
  scenarios: Scenario[];
}

const PTS: Record<Result, [number, number]> = { W: [3, 0], G: [1, 1], V: [0, 3] };

/** Is dit een topper? Beide in de bovenste 4 en hooguit 2 plekken uit elkaar, of hooguit 3 punten verschil bovenin. */
export function topper(standings: StandingRow[], m: Match): Topper | null {
  const opp = opponent(m);
  const us = standings.find((r) => r.team === US);
  const them = standings.find((r) => r.team === opp);
  if (!us || !them) return null;
  const close =
    (us.position <= 4 && them.position <= 4 && Math.abs(us.position - them.position) <= 2) ||
    (us.position <= 5 && them.position <= 5 && Math.abs(us.points - them.points) <= 3);
  if (!close) return null;

  const scenarios = (Object.keys(PTS) as Result[]).map((result): Scenario => {
    const [a, b] = PTS[result];
    const table = standings
      .map((r) => ({ team: r.team, pts: r.points + (r.team === US ? a : r.team === opp ? b : 0), pos: r.position }))
      // Gelijke punten: huidige volgorde aanhouden (doelsaldo weten we nog niet)
      .sort((x, y) => y.pts - x.pts || x.pos - y.pos);
    const me = table.findIndex((r) => r.team === US);
    const ref = me === 0 ? table[1] : table[0];
    return {
      result,
      points: table[me].pts,
      position: me + 1,
      gapOpponent: table[me].pts - table.find((r) => r.team === opp)!.pts,
      gapTop: table[me].pts - ref.pts,
    };
  });
  return { opponent: opp, us, them, scenarios };
}

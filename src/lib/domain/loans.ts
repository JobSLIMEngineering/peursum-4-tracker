import type { GameRow } from "./awards";
import { ourScore, type Player } from "./types";

export interface SideRecord {
  games: number;
  w: number;
  d: number;
  l: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface OwnVsLoan {
  /** Wedstrijden met alleen spelers uit de eigen selectie */
  own: SideRecord;
  /** Wedstrijden waarin minstens één leenspeler meedeed */
  loan: SideRecord;
  /** Gemiddeld aantal leenspelers in die wedstrijden */
  loansPerGame: number;
  /** Goals en assists van eigen spelers en van leenspelers (alle wedstrijden samen) */
  goals: { own: number; loan: number };
  assists: { own: number; loan: number };
}

const empty = (): SideRecord => ({ games: 0, w: 0, d: 0, l: 0, points: 0, goalsFor: 0, goalsAgainst: 0 });

/** Wat haalden we met alleen de eigen ploeg, en wat met hulp van leenspelers? */
export function ownVsLoan(rows: GameRow[], players: Pick<Player, "id" | "type">[]): OwnVsLoan {
  const loanIds = new Set(players.filter((p) => p.type === "leen").map((p) => p.id));
  const own = empty();
  const loan = empty();
  let loanCount = 0;
  const goals = { own: 0, loan: 0 };
  const assists = { own: 0, loan: 0 };
  for (const r of rows) {
    const score = ourScore(r.match);
    if (!score) continue;
    const [f, a] = score;
    const n = r.entry.attendance.filter((id) => loanIds.has(id)).length;
    const side = n > 0 ? loan : own;
    loanCount += n;
    side.games++;
    side.goalsFor += f;
    side.goalsAgainst += a;
    if (f > a) {
      side.w++;
      side.points += 3;
    } else if (f === a) {
      side.d++;
      side.points += 1;
    } else side.l++;
    for (const [id, s] of Object.entries(r.entry.stats)) {
      const k = loanIds.has(id) ? "loan" : "own";
      goals[k] += s.goals ?? 0;
      assists[k] += s.assists ?? 0;
    }
  }
  return { own, loan, loansPerGame: loan.games ? loanCount / loan.games : 0, goals, assists };
}

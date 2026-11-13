import { isPlayed, ourScore, outcome, US, type Outcome } from "@/lib/domain/types";
import type { DataFiles } from "./schema";
import { buildView, nextMatch, standingOf } from "./view";

/**
 * De openbare uitnodiging: een paar cijfers die nieuwsgierig maken, zonder namen van spelers.
 * Alles wat over personen gaat, zie je pas na het inloggen.
 */
export interface Teaser {
  position: number | null;
  teams: number;
  points: number;
  played: number;
  /** Laatste 5 uitslagen, oudste eerst */
  form: Outcome[];
  last: { date: string | null; opponent: string; home: boolean; for: number; against: number } | null;
  next: { date: string | null; time: string | null; opponent: string; home: boolean } | null;
  /** Aantal vaste spelers en goals dit seizoen (geen namen) */
  squad: number;
  goals: number;
  /** Hoeveel goals de topscorer heeft (wie het is, zie je na het inloggen) */
  topGoals: number;
}

export function toTeaser(files: DataFiles): Teaser {
  const v = buildView(files);
  const me = standingOf(v, US);
  const ours = v.matches
    .filter((m) => (m.home === US || m.away === US) && isPlayed(m) && m.kind === "competitie")
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const lastM = ours.at(-1);
  const nextM = nextMatch(v);
  const opp = (m: { home: string; away: string }) => (m.home === US ? m.away : m.home);
  const goals: Record<string, number> = {};
  for (const e of Object.values(v.entries)) for (const [id, s] of Object.entries(e.stats)) goals[id] = (goals[id] ?? 0) + (s.goals ?? 0);
  const score = lastM ? ourScore(lastM) : null;
  return {
    position: me?.position ?? null,
    teams: v.standings.length,
    points: me?.points ?? 0,
    played: me?.played ?? 0,
    form: ours.slice(-5).map((m) => {
      const [f, a] = ourScore(m)!;
      return outcome(f, a);
    }),
    last: lastM && score ? { date: lastM.date, opponent: opp(lastM), home: lastM.home === US, for: score[0], against: score[1] } : null,
    next: nextM ? { date: nextM.date, time: nextM.time, opponent: opp(nextM), home: nextM.home === US } : null,
    squad: v.players.filter((p) => p.active && p.type === "vast").length,
    goals: me?.goalsFor ?? Object.values(goals).reduce((s, x) => s + x, 0),
    topGoals: Math.max(0, ...Object.values(goals)),
  };
}

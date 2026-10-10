import { fit, knownResults, type Fit } from "@/lib/domain/model";
import { isPlayed, opponent, US, type Match, type MatchEntry, type StandingRow } from "@/lib/domain/types";
import type { DataFiles, Snapshot, StoredMatch, StoredPlayer } from "./schema";

export type ViewMatch = Match & { extra: boolean; code: string | null };

export interface AppView {
  standings: StandingRow[];
  standingsDate: string | null;
  snapshots: Snapshot[];
  matches: ViewMatch[];
  players: StoredPlayer[];
  entries: Record<string, MatchEntry>;
  model: Fit;
  pool: Set<string>;
}

const strip = ({ code, ...m }: StoredMatch) => ({ m, code });

/** Combineert de opgeslagen bestanden tot wat de schermen nodig hebben. */
export function buildView(files: DataFiles): AppView {
  const snapshots = [...files["standings.json"].snapshots].sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
  const latest = snapshots.at(-1);
  const standings = latest ? [...latest.rows].sort((a, b) => a.position - b.position) : [];
  const { edits, extra } = files["overrides.json"];

  const matches: ViewMatch[] = [
    ...files["matches.json"].matches.map((s) => {
      const { m, code } = strip(s);
      const e = edits[m.id];
      return { ...m, ...(e ?? {}), edited: !!e, extra: false, code };
    }),
    ...extra.map((s) => {
      const { m, code } = strip(s);
      return { ...m, edited: true, extra: true, code };
    }),
  ].map((m) => ({
    ...m,
    status: isPlayed(m) ? "gespeeld" : m.date ? "gepland" : "niet ingepland",
  }));

  return {
    standings,
    standingsDate: latest?.fetchedAt ?? null,
    snapshots,
    matches,
    players: files["players.json"].players,
    entries: files["entries.json"].entries,
    model: fit(standings, knownResults(matches, standings)),
    pool: new Set(standings.map((s) => s.team)),
  };
}

const byKickoff = (a: Match, b: Match) =>
  (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.time ?? "").localeCompare(b.time ?? "");

/** Eerstvolgende competitiewedstrijd van Peursum 4 tegen een poule-team, met datum. */
export function nextMatch(v: AppView): ViewMatch | undefined {
  return v.matches
    .filter((m) => (m.home === US || m.away === US) && !isPlayed(m) && m.kind === "competitie" && m.date)
    .filter((m) => v.pool.has(opponent(m)))
    .sort(byKickoff)[0];
}

/** Telt een wedstrijd mee voor de winkans (competitie tegen een poule-team, nog niet gespeeld)? */
export const hasPrediction = (v: AppView, m: Match) =>
  !isPlayed(m) && m.kind === "competitie" && (m.home === US || m.away === US) && v.pool.has(opponent(m));

export const standingOf = (v: AppView, team: string) => v.standings.find((s) => s.team === team);

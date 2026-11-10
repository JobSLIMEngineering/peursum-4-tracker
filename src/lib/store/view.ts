import { computeAwards, gameRows, keeperCompare, playerImpacts, prizeLeads, type Award, type AwardKey, type GameRow, type PlayerImpact } from "@/lib/domain/awards";
import { fit, knownResults, type Fit } from "@/lib/domain/model";
import { playerCards, type PlayerCard } from "@/lib/domain/playercard";
import { monthlyOveralls, monthsOf, teamOfTheMonth, upgrades } from "@/lib/domain/season-stats";
import { playersOfTheMonth } from "@/lib/domain/rating";
import { MON_FULL } from "@/lib/format";
import { hotStreaks, type Streak } from "@/lib/domain/streaks";
import { isPlayed, opponent, US, type Match, type MatchEntry, type StandingRow } from "@/lib/domain/types";
import type { DataFiles, Snapshot, StoredMatch, StoredPlayer } from "./schema";

export type ViewMatch = Match & {
  extra: boolean;
  code: string | null;
  /** Uitslag zelf ingevuld (de clubsite heeft hem nog niet) */
  manualScore?: boolean;
};

export interface AppView {
  standings: StandingRow[];
  standingsDate: string | null;
  snapshots: Snapshot[];
  matches: ViewMatch[];
  players: StoredPlayer[];
  entries: Record<string, MatchEntry>;
  model: Fit;
  pool: Set<string>;
  logos: Record<string, string>;
  /** Spelers die "on fire" zijn (vlammetje / handschoen met vuur) */
  streaks: Record<string, Streak[]>;
  /** Ingevoerde competitiewedstrijden met wat het model verwachtte (voor prijzen en impact) */
  rows: GameRow[];
  awards: Award[];
  /** Prijzen waar een speler koploper van is */
  leads: Record<string, AwardKey[]>;
  impacts: Record<string, PlayerImpact>;
  /** Geblesseerd: bij de laatst ingevoerde wedstrijd of nu op geblesseerd gezet (pleistertje) */
  injuredLast: Set<string>;
  /** Keepers met de minste tegengoals per duel van de hele competitie (geel shirt; anders groen) */
  goldKeepers: Set<string>;
  /** Spelerskaarten (FIFA-stijl) */
  cards: Record<string, PlayerCard>;
  /**
   * Speciale kaart zoals bij FIFA: speler van de maand (POTM, rood-zwart) gaat voor team van de maand
   * (TOTW/in-form, zwart-goud); anders de gewone gouden kaart. Banner = tekst bovenop de kaart.
   */
  special: Record<string, { variant: "potm" | "inform"; banner: string }>;
  /** Kaartcijfer per maand en de upgrades van de laatste maand */
  monthly: ReturnType<typeof monthlyOveralls>;
  upgrades: Record<string, number>;
}

const strip = ({ code, ...m }: StoredMatch) => ({ m, code });

/** Combineert de opgeslagen bestanden tot wat de schermen nodig hebben. */
export function buildView(files: DataFiles): AppView {
  const snapshots = [...files["standings.json"].snapshots].sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
  const latest = snapshots.at(-1);
  const standings = latest ? [...latest.rows].sort((a, b) => a.position - b.position) : [];
  const { edits, extra } = files["overrides.json"];
  const hidden = new Set(files["overrides.json"].hidden ?? []);

  const matches: ViewMatch[] = [
    ...files["matches.json"].matches.filter((s) => !hidden.has(s.id)).map((s) => {
      const { m, code } = strip(s);
      const e = edits[m.id];
      // Uitslag: die van de clubsite gaat voor; anders de zelf ingevulde
      const manual = m.homeGoals === null && e?.homeGoals != null && e?.awayGoals != null;
      return {
        ...m,
        ...(e ?? {}),
        homeGoals: manual ? e!.homeGoals! : m.homeGoals,
        awayGoals: manual ? e!.awayGoals! : m.awayGoals,
        manualScore: manual,
        edited: !!e,
        extra: false,
        code,
      };
    }),
    ...extra.map((s) => {
      const { m, code } = strip(s);
      return { ...m, edited: true, extra: true, code };
    }),
  ].map((m) => ({
    ...m,
    status: isPlayed(m) ? "gespeeld" : m.date ? "gepland" : "niet ingepland",
  }));

  const model = fit(standings, knownResults(matches, standings));
  const pool = new Set(standings.map((s) => s.team));
  const entries = files["entries.json"].entries;
  const players = files["players.json"].players;
  const rows = gameRows(matches, entries, model, pool);
  const awards = computeAwards(players, rows, standings);
  const monthly = monthlyOveralls(rows, players);

  return {
    standings,
    standingsDate: latest?.fetchedAt ?? null,
    snapshots,
    matches,
    players,
    entries,
    model,
    pool,
    logos: files["logos.json"]?.logos ?? {},
    streaks: hotStreaks(matches, entries),
    rows,
    awards,
    leads: prizeLeads(awards),
    impacts: playerImpacts(players, rows),
    injuredLast: injuredNow(players, rows),
    cards: playerCards(rows, players, playerImpacts(players, rows)),
    monthly,
    upgrades: upgrades(monthly, rows),
    special: specialCards(rows, players),
    goldKeepers: new Set(
      players
        .filter((p) => {
          const kept = rows.filter((r) => r.entry.keeperId === p.id);
          if (kept.length < 2) return false;
          const ga = kept.reduce((n, r) => n + (r.match.home === US ? r.match.awayGoals! : r.match.homeGoals!), 0);
          return keeperCompare(ga / kept.length, standings).rank === 1;
        })
        .map((p) => p.id),
    ),
  };
}

/**
 * Pleistertje: nu op geblesseerd gezet, of geblesseerd bij de laatste wedstrijd. Wie na die wedstrijd
 * weer fit is gemeld (of nu niet meer op geblesseerd staat terwijl hij dat wel was), krijgt hem niet.
 */
function injuredNow(players: StoredPlayer[], rows: GameRow[]): Set<string> {
  const last = rows.at(-1);
  const lastDate = last?.match.date ?? "";
  const out = new Set<string>();
  for (const p of players) {
    if (!p.active) continue;
    if (p.injured) out.add(p.id);
    else if (last?.entry.injured?.includes(p.id) && !(p.recoveredAt && p.recoveredAt >= lastDate) && p.injured !== false) out.add(p.id);
  }
  return out;
}

/** Speciale kaarten van de laatste maand: speler van de maand en het team van de maand */
function specialCards(rows: GameRow[], players: StoredPlayer[]): AppView["special"] {
  const out: AppView["special"] = {};
  const last = monthsOf(rows).at(-1);
  if (!last) return out;
  const name = MON_FULL[Number(last.slice(5, 7)) - 1];
  for (const s of teamOfTheMonth(rows, players, last).flat())
    if (s.playerId) out[s.playerId] = { variant: "inform", banner: `Team van ${name}` };
  const potm = playersOfTheMonth(rows, players).find((m) => m.month === last);
  if (potm) out[potm.playerId] = { variant: "potm", banner: `Speler van ${name}` };
  return out;
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

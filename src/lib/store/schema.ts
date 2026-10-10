import type { Match, MatchEntry, MatchKind, Player, StandingRow } from "@/lib/domain/types";

/**
 * Opslag: JSON-bestanden in de privé repository peursum-4-data (map data/).
 *
 * Schrijvers per bestand:
 * - standings.json, matches.json, sync.json: scraper (GitHub Action)
 * - overrides.json, entries.json, feedback.json: app
 * - players.json: app, en de scraper voegt nieuwe spelers van de clubsite toe
 *
 * Handmatige wijzigingen aan wedstrijden staan los in overrides.json, zodat de scraper
 * ze nooit overschrijft en "Terug naar clubsite" alleen de wijziging hoeft te wissen.
 */

export interface Snapshot {
  fetchedAt: string;
  source: "seed" | "scraper";
  rows: StandingRow[];
}

/** Wedstrijd zoals opgeslagen; `edited` wordt pas bij het samenvoegen met overrides bepaald. */
export type StoredMatch = Omit<Match, "edited"> & { code: string | null };

export type MatchEdit = Pick<Match, "date" | "time" | "home" | "away" | "kind" | "venue">;

export interface StoredPlayer extends Player {
  /** Naam zoals op de clubsite ("Berg, Rien van den"), als de speler daarvandaan komt */
  clubName: string | null;
}

export interface FeedbackItem {
  id: string;
  createdAt: string;
  page: string;
  width: number | null;
  text: string;
  status: "open" | "verwerkt";
}

export interface SyncStatus {
  lastRun: string | null;
  lastChange: string | null;
  message: string;
  unsure: string[];
}

export interface DataFiles {
  "standings.json": { snapshots: Snapshot[] };
  "matches.json": { matches: StoredMatch[] };
  "overrides.json": { edits: Record<string, MatchEdit>; extra: StoredMatch[] };
  "players.json": { players: StoredPlayer[] };
  "entries.json": { entries: Record<string, MatchEntry> };
  "feedback.json": { items: FeedbackItem[] };
  "sync.json": SyncStatus;
}

export type DataFile = keyof DataFiles;

export const DATA_FILES: DataFile[] = [
  "standings.json",
  "matches.json",
  "overrides.json",
  "players.json",
  "entries.json",
  "feedback.json",
  "sync.json",
];

export const EMPTY: { [K in DataFile]: DataFiles[K] } = {
  "standings.json": { snapshots: [] },
  "matches.json": { matches: [] },
  "overrides.json": { edits: {}, extra: [] },
  "players.json": { players: [] },
  "entries.json": { entries: {} },
  "feedback.json": { items: [] },
  "sync.json": { lastRun: null, lastChange: null, message: "Nog niet opgehaald", unsure: [] },
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Vaste sleutel voor een wedstrijd. In een competitie speelt elk paar één keer thuis en
 * één keer uit, dus "thuis--uit" is uniek. Andere wedstrijden krijgen ook de datum erbij.
 */
export function matchId(m: { home: string; away: string; kind: MatchKind; date: string | null }): string {
  const base = `${slug(m.home)}--${slug(m.away)}`;
  return m.kind === "competitie" ? base : `${m.kind}-${m.date ?? "zonder-datum"}-${base}`;
}

import type { GoalEvent, GoalKind, MatchEntry, PlayerMatchStats } from "./types";

/**
 * Invoer per doelpunt ↔ opgeslagen statistieken.
 *
 * Het invoerscherm werkt met een concept: aanwezigen, keeper, een regel per doelpunt
 * (aantal = eigen score), kaarten en eigen goals van onze spelers. Bij opslaan worden daar
 * de statistieken per speler uit afgeleid, zodat alle overzichten blijven werken.
 */

export type CardKind = "geel" | "2geel" | "rood";

/** Doelpuntregel in het concept; `scorerId: undefined` = nog niet ingevuld */
export interface GoalSlot {
  scorerId: string | null | undefined;
  assistId: string | null;
  kind: GoalKind;
}

export interface EntryDraft {
  attendance: string[];
  keeperId: string | null;
  goals: GoalSlot[];
  cards: { playerId: string; kind: CardKind }[];
  /** Eigen doelpunten van onze spelers (ids, één per doelpunt) */
  ownGoals: string[];
}

export const emptySlot = (): GoalSlot => ({ scorerId: undefined, assistId: null, kind: "spel" });

/** Concept maken uit een bestaande invoer, met precies `ourGoals` doelpuntregels. */
export function toDraft(entry: MatchEntry | undefined, ourGoals: number): EntryDraft {
  const stats = entry?.stats ?? {};
  let goals: GoalSlot[];

  if (entry?.goals) {
    goals = entry.goals.map((g) => ({ ...g }));
  } else {
    // Oudere invoer (alleen totalen per speler): doelpunten uitschrijven, assists op volgorde koppelen
    goals = [];
    for (const [id, s] of Object.entries(stats)) {
      let pen = s.penalties ?? 0;
      let fk = s.freeKicks ?? 0;
      for (let i = 0; i < s.goals; i++) {
        let kind: GoalKind = "spel";
        if (pen > 0) {
          pen--;
          kind = "penalty";
        } else if (fk > 0) {
          fk--;
          kind = "vrije trap";
        }
        goals.push({ scorerId: id, assistId: null, kind });
      }
    }
    for (let i = 0; i < (entry?.opponentOwnGoals ?? 0); i++) goals.push(emptySlotWith(null));
    const assists = Object.entries(stats).flatMap(([id, s]) => Array<string>(s.assists).fill(id));
    for (const g of goals) {
      if (!assists.length || g.scorerId === null) continue;
      const i = assists.findIndex((a) => a !== g.scorerId);
      if (i >= 0) g.assistId = assists.splice(i, 1)[0];
    }
  }

  goals = goals.slice(0, ourGoals);
  while (goals.length < ourGoals) goals.push(emptySlot());

  const cards = Object.entries(stats).flatMap(([playerId, s]): EntryDraft["cards"] => {
    if (s.red && s.yellow) return [{ playerId, kind: "2geel" }];
    if (s.red) return [{ playerId, kind: "rood" }];
    if (s.yellow) return [{ playerId, kind: "geel" }];
    return [];
  });
  const ownGoals = Object.entries(stats).flatMap(([id, s]) => Array<string>(s.ownGoals ?? 0).fill(id));

  return { attendance: [...(entry?.attendance ?? [])], keeperId: entry?.keeperId ?? null, goals, cards, ownGoals };
}

const emptySlotWith = (scorerId: string | null): GoalSlot => ({ scorerId, assistId: null, kind: "spel" });

/** Concept omzetten naar wat wordt opgeslagen. Niet-ingevulde doelpunten tellen niet mee. */
export function toEntry(draft: EntryDraft, matchId: string): MatchEntry {
  const stats: Record<string, PlayerMatchStats> = {};
  const get = (id: string) => (stats[id] ??= { goals: 0, assists: 0, yellow: false, red: false });

  const filled = draft.goals.filter((g): g is GoalEvent => g.scorerId !== undefined);
  for (const g of filled) {
    if (g.scorerId) {
      const s = get(g.scorerId);
      s.goals++;
      if (g.kind === "penalty") s.penalties = (s.penalties ?? 0) + 1;
      if (g.kind === "vrije trap") s.freeKicks = (s.freeKicks ?? 0) + 1;
    }
    if (g.scorerId && g.assistId) get(g.assistId).assists++;
  }
  for (const c of draft.cards) {
    const s = get(c.playerId);
    if (c.kind === "geel") s.yellow = true;
    else if (c.kind === "2geel") Object.assign(s, { yellow: true, red: true });
    else s.red = true;
  }
  for (const id of draft.ownGoals) {
    const s = get(id);
    s.ownGoals = (s.ownGoals ?? 0) + 1;
  }

  return {
    matchId,
    attendance: draft.attendance,
    stats,
    keeperId: draft.keeperId,
    opponentOwnGoals: filled.filter((g) => g.scorerId === null).length,
    goals: filled.map((g) => ({ scorerId: g.scorerId, assistId: g.scorerId ? g.assistId : null, kind: g.kind })),
  };
}

/** Speler weghalen uit de aanwezigen: ook uit doelpunten, kaarten en keeper. */
export function removePlayer(d: EntryDraft, id: string): EntryDraft {
  return {
    attendance: d.attendance.filter((x) => x !== id),
    keeperId: d.keeperId === id ? null : d.keeperId,
    goals: d.goals.map((g) =>
      g.scorerId === id ? { ...g, scorerId: undefined, assistId: null } : g.assistId === id ? { ...g, assistId: null } : g,
    ),
    cards: d.cards.filter((c) => c.playerId !== id),
    ownGoals: d.ownGoals.filter((x) => x !== id),
  };
}

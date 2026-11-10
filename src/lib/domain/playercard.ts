import type { GameRow, PlayerImpact } from "./awards";
import { attendanceRates } from "./insights";
import { rateMatch } from "./rating";
import { ourScore, type Player, type Position } from "./types";

/**
 * Spelerskaart in FIFA-stijl: zes cijfers (45–99) en een totaal, uit de eigen statistieken.
 *
 * Elk cijfer is een rangorde binnen de selectie (wie het best scoort op dat onderdeel krijgt het hoogst),
 * afgevlakt met het aantal duels: wie weinig speelde, zit dichter bij het midden. Zo is het eerlijk
 * en is een kaart nooit "slecht": de laagste waarde is 45.
 *
 * Veldspelers: AAN aanval · PAS aangeven · VER verdedigen · VRM vorm (laatste 3) · INZ inzet (opkomst)
 *              · IMP impact (punten boven verwachting met hem erbij)
 * Keepers:     NUL de nul houden in plaats van AAN; de rest hetzelfde.
 */

export type StatKey = "AAN" | "NUL" | "PAS" | "VER" | "VRM" | "INZ" | "IMP";

export interface PlayerCard {
  playerId: string;
  overall: number;
  /** Korte positie op de kaart */
  pos: "K" | "VER" | "MID" | "AAN" | "SPL";
  stats: { key: StatKey; value: number }[];
  tier: "brons" | "zilver" | "goud";
  games: number;
}

const POS: Record<Position, PlayerCard["pos"]> = { Keeper: "K", Verdediger: "VER", Middenvelder: "MID", Aanvaller: "AAN", Onbekend: "SPL" };

/** Gewicht van elk cijfer in het totaal, per positie */
const WEIGHTS: Record<Position, Partial<Record<StatKey, number>>> = {
  Aanvaller: { AAN: 0.35, PAS: 0.15, VER: 0.05, VRM: 0.2, INZ: 0.1, IMP: 0.15 },
  Middenvelder: { AAN: 0.2, PAS: 0.25, VER: 0.15, VRM: 0.15, INZ: 0.1, IMP: 0.15 },
  Verdediger: { AAN: 0.05, PAS: 0.1, VER: 0.4, VRM: 0.15, INZ: 0.15, IMP: 0.15 },
  Keeper: { NUL: 0.35, VER: 0.3, VRM: 0.15, INZ: 0.1, IMP: 0.1 },
  Onbekend: { AAN: 0.2, PAS: 0.15, VER: 0.2, VRM: 0.2, INZ: 0.1, IMP: 0.15 },
};

const LOW = 45;
const MID = 58;
const HIGH = 97;

export function playerCards(
  rows: GameRow[],
  players: Pick<Player, "id" | "position" | "active">[],
  impacts: Record<string, PlayerImpact>,
): Record<string, PlayerCard> {
  const ids = players.filter((p) => p.active).map((p) => p.id);
  const rates = attendanceRates(rows, ids);
  const raw: Record<string, Record<StatKey, number> & { games: number }> = {};

  for (const id of ids) {
    const mine = rows.filter((r) => r.entry.attendance.includes(id));
    const g = mine.length;
    const rated = mine.map((r) => rateMatch(r, players).find((x) => x.playerId === id)!);
    const per = (f: (i: number) => number) => (g ? mine.reduce((s, _, i) => s + f(i), 0) / g : 0);
    const st = (i: number) => mine[i].entry.stats[id];
    const kept = mine.filter((r) => r.entry.keeperId === id);
    raw[id] = {
      games: g,
      AAN: per((i) => rated[i].attack + 3 * (st(i)?.goals ?? 0)),
      NUL: kept.length ? kept.filter((r) => ourScore(r.match)![1] === 0).length / kept.length : 0,
      PAS: per((i) => st(i)?.assists ?? 0),
      VER: per((i) => rated[i].defence),
      VRM: rated.slice(-3).reduce((s, x) => s + x.total, 0) / Math.max(1, Math.min(3, g)),
      INZ: rates[id] ?? 0,
      IMP: impacts[id]?.eligible ? impacts[id].pointsImpact : 0,
    };
  }

  // Rangorde per onderdeel onder wie minstens 2 duels speelde
  const pool = ids.filter((id) => raw[id].games >= 2);
  const scale = (key: StatKey, id: string) => {
    const r = raw[id];
    if (r.games === 0) return LOW;
    const others = pool.filter((x) => x !== id).map((x) => raw[x][key]);
    const p = others.length ? others.filter((v) => v < r[key]).length / others.length : 0.5;
    const full = MID + (HIGH - MID) * p - (p < 0.5 ? (0.5 - p) * 20 : 0);
    // Afvlakken naar het midden bij weinig duels
    const v = MID + (full - MID) * (r.games / (r.games + 2));
    return Math.round(Math.min(99, Math.max(LOW, v)));
  };

  const out: Record<string, PlayerCard> = {};
  for (const p of players.filter((x) => x.active)) {
    const keeper = p.position === "Keeper";
    const keys: StatKey[] = [keeper ? "NUL" : "AAN", "PAS", "VER", "VRM", "INZ", "IMP"];
    const stats = keys.map((key) => ({ key, value: scale(key, p.id) }));
    const w = WEIGHTS[p.position];
    const sumW = keys.reduce((s, k) => s + (w[k] ?? 0), 0) || 1;
    const overall = Math.round(stats.reduce((s, x) => s + x.value * (w[x.key] ?? 0), 0) / sumW);
    out[p.id] = {
      playerId: p.id,
      overall,
      pos: POS[p.position],
      stats,
      tier: overall >= 75 ? "goud" : overall >= 65 ? "zilver" : "brons",
      games: raw[p.id].games,
    };
  }
  return out;
}

import { FORMATION, type TeamSlot } from "./season-stats";
import type { Role } from "./types";

/**
 * Opstellingsadvies: de beste elf uit wie er is, in de vaste 4-2-1-3. Elke speler heeft een eigen plek
 * (of, voor een leenspeler, de plek die je opgaf). Op zijn eigen plek telt zijn kaartcijfer volledig, op
 * een plek in de buurt iets minder, en ver van huis veel minder. De verdeling met het hoogste totaal wint
 * (exact uitgerekend, niet "eerst de beste").
 */

export interface LineupPlayer {
  id: string;
  /** Plek waar hij normaal (of volgens jou) het best speelt */
  role: Role;
  overall: number;
}

export interface LineupAdvice {
  team: TeamSlot[][];
  bench: string[];
  /** Spelers die niet op hun eigen plek staan: [id, eigen plek, plek nu] */
  moved: { id: string; from: Role; to: Role }[];
}

type Line = "K" | "D" | "M" | "A";
const LINE: Record<Role, Line> = { K: "K", LB: "D", CV: "D", RB: "D", DM: "M", CM: "M", AM: "M", LV: "A", SP: "A", RV: "A" };

/** Hoe goed past een speler met plek `from` op plek `to` (1 = zijn eigen plek) */
export function fit(from: Role, to: Role): number {
  if (from === to) return 1;
  if (to === "K") return 0.35;
  if (from === "K") return 0.5;
  const a = LINE[from];
  const b = LINE[to];
  const pair = (x: Role, y: Role) => (from === x && to === y) || (from === y && to === x);
  if (a === b) {
    if (a === "D") return pair("LB", "RB") ? 0.9 : 0.88;
    if (a === "M") return pair("DM", "AM") ? 0.88 : 0.95;
    return pair("LV", "RV") ? 0.93 : 0.9;
  }
  const lines = [a, b].sort().join("");
  if (lines === "DM") return pair("CV", "DM") ? 0.85 : (from === "LB" || from === "RB" || to === "LB" || to === "RB") && (from === "AM" || to === "AM") ? 0.7 : 0.8;
  if (lines === "AM") return from === "AM" || to === "AM" ? 0.88 : from === "CM" || to === "CM" ? 0.8 : 0.72;
  // Verdediging ↔ aanval: alleen een back die buitenspeler wordt (of andersom) gaat nog redelijk
  return pair("LB", "LV") || pair("RB", "RV") ? 0.8 : 0.6;
}

export function suggestLineup(players: LineupPlayer[]): LineupAdvice {
  const slots = FORMATION.flat();
  const S = slots.length;
  const full = 1 << S;
  const n = players.length;
  // dp[mask] = beste totaal met deze plekken bezet; keuze per speler om terug te rekenen
  let dp = new Float64Array(full).fill(-Infinity);
  dp[0] = 0;
  const choice: Int8Array[] = [];
  for (let i = 0; i < n; i++) {
    const next = Float64Array.from(dp);
    const ch = new Int8Array(full).fill(-1);
    const p = players[i];
    for (let mask = 0; mask < full; mask++) {
      if (dp[mask] === -Infinity) continue;
      for (let s = 0; s < S; s++) {
        if (mask & (1 << s)) continue;
        // Twee centrale verdedigers: alleen de eerste vrije CV-plek proberen (scheelt dubbel werk)
        if (s > 0 && slots[s] === slots[s - 1] && !(mask & (1 << (s - 1)))) continue;
        const m2 = mask | (1 << s);
        const v = dp[mask] + p.overall * fit(p.role, slots[s]);
        if (v > next[m2]) {
          next[m2] = v;
          ch[m2] = s;
        }
      }
    }
    choice.push(ch);
    dp = next;
  }
  // Beste eindtoestand (meestal alle 11 plekken bezet)
  let mask = 0;
  for (let m = 0; m < full; m++) if (dp[m] > dp[mask]) mask = m;
  // Terugrekenen: per speler staat welke plek hij kreeg op weg naar deze toestand (-1 = bank)
  const at = new Map<number, string>();
  for (let i = n - 1; i >= 0; i--) {
    const s = choice[i][mask];
    if (s < 0) continue;
    at.set(s, players[i].id);
    mask ^= 1 << s;
  }

  const byId = new Map(players.map((p) => [p.id, p]));
  let k = 0;
  const team: TeamSlot[][] = FORMATION.map((line) =>
    line.map((role) => {
      const id = at.get(k++) ?? null;
      return { role, playerId: id, points: id ? byId.get(id)!.overall : 0 };
    }),
  );
  const onPitch = new Set(at.values());
  const bench = players
    .filter((p) => !onPitch.has(p.id))
    .sort((a, b) => b.overall - a.overall)
    .map((p) => p.id);
  const moved = team
    .flat()
    .filter((s) => s.playerId && byId.get(s.playerId)!.role !== s.role)
    .map((s) => ({ id: s.playerId!, from: byId.get(s.playerId!)!.role, to: s.role }));
  return { team, bench, moved };
}

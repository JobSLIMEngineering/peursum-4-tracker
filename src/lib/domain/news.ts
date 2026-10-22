import type { Award } from "./awards";
import type { Streak } from "./streaks";
import { isPlayed, US, type Match, type MatchEntry, type Player, type StandingRow } from "./types";

/**
 * Nieuws op het Overzicht: korte berichtjes die langzaam voorbij komen.
 * Alleen wat opvalt: onze plek in de stand, uitschieters en verrassingen in de poule,
 * inhaalwedstrijden, wie terug is van een blessure, koplopers van de prijzen en wie on fire is.
 */

export type NewsKind = "stand" | "uitschieter" | "verrassing" | "inhaal" | "terug" | "prijs" | "vuur";

export interface NewsItem {
  key: string;
  kind: NewsKind;
  /** Klein label boven de titel */
  kicker: string;
  title: string;
  text?: string;
  /** Speler om een shirtje bij te tonen */
  playerId?: string;
  href?: string;
}

export interface NewsInput {
  today: string;
  matches: Match[];
  standings: StandingRow[];
  /** Standen van eerdere ophaalmomenten, oud → nieuw */
  snapshots: { fetchedAt: string; rows: StandingRow[] }[];
  players: (Pick<Player, "id" | "name" | "hiddenNo" | "active"> & { recoveredAt?: string })[];
  entries: Record<string, MatchEntry>;
  awards: Award[];
  streaks: Record<string, Streak[]>;
  label: (id: string) => string;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00`) - Date.parse(`${a}T12:00`)) / 864e5);
const score = (m: Match) => `${m.home} ${m.homeGoals}–${m.awayGoals} ${m.away}`;

export function buildNews(i: NewsInput): NewsItem[] {
  const out: NewsItem[] = [];
  const pos = new Map(i.standings.map((r) => [r.team, r]));
  const recent = (m: Match, days: number) => !!m.date && isPlayed(m) && m.date <= i.today && daysBetween(m.date, i.today) <= days;

  // --- Onze plek: vergeleken met de stand van een eerdere dag ---
  const us = pos.get(US);
  if (us) {
    const lastDay = i.snapshots.at(-1)?.fetchedAt.slice(0, 10);
    const earlier = [...i.snapshots].reverse().find((s) => s.fetchedAt.slice(0, 10) !== lastDay);
    const before = earlier?.rows.find((r) => r.team === US)?.position;
    const next = i.standings.find((r) => r.position === us.position + 1);
    const lead = us.position === 1 && next ? ` · ${us.points - next.points} punt${us.points - next.points === 1 ? "" : "en"} voor op ${next.team}` : "";
    const title =
      before && before > us.position
        ? `Peursum 4 stijgt naar plek ${us.position}`
        : before && before < us.position
          ? `Peursum 4 zakt naar plek ${us.position}`
          : us.position === 1
            ? "Peursum 4 staat bovenaan"
            : `Peursum 4 staat ${us.position}e`;
    out.push({ key: "stand", kind: "stand", kicker: "Stand", title, text: `${us.points} punten uit ${us.played} duels${lead}`, href: "/" });
  }

  // --- Poule: uitschieters, verrassingen en inhaalwedstrijden van de laatste 10 dagen ---
  const others = i.matches.filter((m) => m.kind === "competitie" && recent(m, 10) && pos.has(m.home) && pos.has(m.away));
  for (const m of others) {
    const ours = m.home === US || m.away === US;
    const diff = Math.abs(m.homeGoals! - m.awayGoals!);
    const winner = m.homeGoals! > m.awayGoals! ? m.home : m.awayGoals! > m.homeGoals! ? m.away : null;
    const loser = winner === m.home ? m.away : winner === m.away ? m.home : null;
    if (m.makeup) {
      out.push({ key: `inhaal-${m.id}`, kind: "inhaal", kicker: "Inhaalwedstrijd", title: score(m), href: ours ? `/competitie/?w=${m.id}` : "/competitie/" });
    } else if (!ours && diff >= 5) {
      out.push({ key: `uit-${m.id}`, kind: "uitschieter", kicker: "Uitschieter", title: score(m), text: `${winner} wint met ${diff} goals verschil` });
    } else if (!ours && winner && loser && pos.get(winner)!.position - pos.get(loser)!.position >= 5) {
      out.push({
        key: `ver-${m.id}`,
        kind: "verrassing",
        kicker: "Verrassing",
        title: score(m),
        text: `Nummer ${pos.get(winner)!.position} wint van nummer ${pos.get(loser)!.position}`,
      });
    }
  }

  // --- Terug van een blessure: weer fit gemeld, of na een blessure weer meegedaan ---
  const played = i.matches
    .filter((m) => m.kind === "competitie" && isPlayed(m) && i.entries[m.id])
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const [prev, last] = played.slice(-2).map((m) => i.entries[m.id]);
  for (const p of i.players.filter((x) => x.active)) {
    const fitAgain = p.recoveredAt && daysBetween(p.recoveredAt, i.today) <= 21;
    const playedAgain = played.length >= 2 && prev?.injured?.includes(p.id) && last?.attendance.includes(p.id);
    if (fitAgain || playedAgain)
      out.push({ key: `terug-${p.id}`, kind: "terug", kicker: "Terug van blessure", title: i.label(p.id), text: "Weer fit en klaar voor de volgende wedstrijd", playerId: p.id });
  }

  // --- Prijzen: koplopers van de belangrijkste prijzen ---
  for (const a of i.awards.filter((x) => ["schoen", "assist", "handschoen"].includes(x.key) && x.leaders.length)) {
    const r = a.rows.find((x) => x.playerId === a.leaders[0])!;
    const names = a.leaders.map(i.label);
    out.push({
      key: `prijs-${a.key}`,
      kind: "prijs",
      kicker: a.title,
      title: names.length > 2 ? `${names.length} spelers gedeeld eerste` : names.join(" & "),
      text: `${r.display} ${r.unit}`,
      playerId: a.leaders[0],
      href: "/prijzen/",
    });
  }

  // --- On fire ---
  for (const [id, list] of Object.entries(i.streaks))
    for (const s of list) out.push({ key: `vuur-${id}-${s.kind}`, kind: "vuur", kicker: "On fire", title: i.label(id), text: s.reason, playerId: id });

  return out;
}

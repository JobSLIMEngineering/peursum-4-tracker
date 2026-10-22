import { predict, type Fit } from "./model";
import { isPlayed, opponent, ourScore, US, type Match, type MatchEntry, type Player, type StandingRow } from "./types";

/**
 * Prijzen en spelersimpact, eerlijk voor spelers die geblesseerd waren:
 * - alleen gespeelde competitiewedstrijden met ingevoerde stats;
 * - per speler tellen alleen wedstrijden waarin hij niet geblesseerd was (blessures staan per wedstrijd);
 * - impact = verschil tussen wat we haalden en wat het model verwachtte (gecorrigeerd voor de
 *   tegenstander), afgevlakt met K schijnwedstrijden zodat weinig wedstrijden geen uitschieters geven;
 * - meedingen voor de impactprijzen vanaf MIN_GAMES wedstrijden én de helft van de wedstrijden waarin
 *   hij fit was.
 */

const K = 3;
export const MIN_GAMES = 3;

export type AwardPlayer = Pick<Player, "id" | "name" | "position" | "type" | "hiddenNo" | "active">;

export interface GameRow {
  match: Match;
  entry: MatchEntry;
  /** Punten min verwachte punten */
  ptsDiff: number;
  /** Verwachte tegengoals min echte tegengoals (positief = beter dan verwacht) */
  gaDiff: number;
}

/** Ingevoerde competitiewedstrijden tegen poule-teams, oud → nieuw, met wat het model ervan verwachtte */
export function gameRows(matches: Match[], entries: Record<string, MatchEntry>, model: Fit, pool: Set<string>): GameRow[] {
  return matches
    .filter((m) => m.kind === "competitie" && isPlayed(m) && entries[m.id] && pool.has(opponent(m)))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .map((m) => {
      const p = predict(model, US, opponent(m), m.home === US);
      const [f, a] = ourScore(m)!;
      const pts = f > a ? 3 : f === a ? 1 : 0;
      return { match: m, entry: entries[m.id], ptsDiff: pts - (3 * p.win + p.draw), gaDiff: p.xgThem - a };
    });
}

export const wasInjured = (r: GameRow, id: string) => !!r.entry.injured?.includes(id);
export const played = (r: GameRow, id: string) => r.entry.attendance.includes(id);

export interface PlayerImpact {
  games: number;
  /** Wedstrijden waarin hij fit was */
  available: number;
  injured: number;
  /** Punten boven verwachting per wedstrijd met hem erbij, minus zonder hem (afgevlakt) */
  pointsImpact: number;
  /** Minder tegengoals dan verwacht per wedstrijd met hem erbij (afgevlakt; positief = goed) */
  defenceImpact: number;
  /** Genoeg wedstrijden om mee te dingen voor de impactprijzen */
  eligible: boolean;
}

export function playerImpacts(players: Pick<Player, "id">[], rows: GameRow[]): Record<string, PlayerImpact> {
  const out: Record<string, PlayerImpact> = {};
  const shrunk = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length + K);
  for (const p of players) {
    const avail = rows.filter((r) => !wasInjured(r, p.id));
    const withP = avail.filter((r) => played(r, p.id));
    const without = avail.filter((r) => !played(r, p.id));
    out[p.id] = {
      games: withP.length,
      available: avail.length,
      injured: rows.length - avail.length,
      pointsImpact: withP.length ? shrunk(withP.map((r) => r.ptsDiff)) - shrunk(without.map((r) => r.ptsDiff)) : 0,
      defenceImpact: shrunk(withP.map((r) => r.gaDiff)),
      eligible: withP.length >= MIN_GAMES && withP.length >= avail.length / 2,
    };
  }
  return out;
}

export type AwardKey = "schoen" | "assist" | "handschoen" | "muur" | "mvm" | "kaarten";

export interface AwardRow {
  playerId: string;
  /** Om op te sorteren (hoger = beter) */
  value: number;
  /** Hoofdcijfer, bijv. "5" of "+0,4" */
  display: string;
  /** Eenheid bij het hoofdcijfer, bijv. "goals" of "pnt/duel" */
  unit: string;
  /** Extra regel, bijv. "in 6 duels" */
  detail: string;
  /** Mag meedingen (genoeg wedstrijden, iets gepresteerd) */
  eligible: boolean;
}

export interface Award {
  key: AwardKey;
  title: string;
  /** Wie er meedingen en waarop */
  who: string;
  /** Uitleg achter het i-knopje */
  how: string;
  /** Meedingers, beste eerst */
  rows: AwardRow[];
  /** Koploper(s): meer dan één bij een gedeelde eerste plek (alleen wie mag meedingen) */
  leaders: string[];
  /** Bij de Gouden Handschoen: hoe de koploper zich verhoudt tot de rest van de competitie */
  compare?: KeeperCompare;
}

export interface KeeperCompare {
  /** Tegengoals per duel met deze keeper op doel */
  perGame: number;
  /** Plek tussen de verdedigingen van de andere teams (1 = minste tegengoals) */
  rank: number;
  teams: number;
  /** Beste andere verdediging van de poule */
  best: { team: string; perGame: number } | null;
}

const comma = (x: number, digits = 1) => x.toFixed(digits).replace(".", ",");
const signed = (x: number, digits = 1) => (x >= 0 ? "+" : "−") + comma(Math.abs(x), digits);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Keeper vergeleken met de verdedigingen van de andere teams (per duel, wij zelf niet meegeteld) */
export function keeperCompare(perGame: number, standings: StandingRow[]): KeeperCompare {
  const others = standings
    .filter((r) => r.team !== US && r.played)
    .map((r) => ({ team: r.team, perGame: r.goalsAgainst / r.played }))
    .sort((a, b) => a.perGame - b.perGame);
  return {
    perGame,
    rank: others.filter((o) => o.perGame < perGame).length + 1,
    teams: others.length + 1,
    best: others[0] ?? null,
  };
}

export function computeAwards(players: AwardPlayer[], rows: GameRow[], standings: StandingRow[] = []): Award[] {
  const active = players.filter((p) => p.active);
  const impact = playerImpacts(active, rows);
  const sum = (id: string, f: (r: GameRow) => number) => rows.filter((r) => played(r, id)).reduce((s, r) => s + f(r), 0);
  const kept = (id: string) => rows.filter((r) => r.entry.keeperId === id);
  const games = (id: string) => impact[id].games;
  const inGames = (id: string) => `in ${games(id)} ${plural(games(id), "duel", "duels")}`;
  // Volgorde in de lijst bij gelijkstand: wie er minder wedstrijden voor nodig had eerst
  const tiebreak = (id: string) => 0.001 / Math.max(1, games(id));

  const make = (a: Omit<Award, "leaders" | "rows">, list: AwardRow[]): Award => {
    const rowsSorted = list.filter((r) => r.eligible || r.value !== 0).sort((x, y) => y.value - x.value);
    const top = rowsSorted.find((r) => r.eligible);
    // Zelfde getal = gedeelde koploper (de volgorde binnen een gelijkstand is alleen voor de lijst)
    const leaders = top ? rowsSorted.filter((r) => r.eligible && r.display === top.display).map((r) => r.playerId) : [];
    return { ...a, rows: rowsSorted, leaders };
  };

  const count = (key: "goals" | "assists", unit: [string, string]) =>
    active.map((p): AwardRow => {
      const n = sum(p.id, (r) => r.entry.stats[p.id]?.[key] ?? 0);
      return {
        playerId: p.id,
        value: n ? n + tiebreak(p.id) : 0,
        display: String(n),
        unit: plural(n, ...unit),
        detail: inGames(p.id),
        eligible: n > 0,
      };
    });

  const keepers = active
    .filter((p) => kept(p.id).length)
    .map((p) => {
      const k = kept(p.id);
      const cs = k.filter((r) => ourScore(r.match)![1] === 0).length;
      const ga = k.reduce((s, r) => s + ourScore(r.match)![1], 0);
      return { p, k, cs, ga };
    });

  const handschoen = make(
    {
      key: "handschoen",
      title: "Gouden Handschoen",
      who: "Keepers · meeste clean sheets",
      how: "Clean sheets als keeper. Evenveel = gedeelde koploper. Meedingen vanaf 2 duels op doel.",
    },
    keepers.map(({ p, k, cs, ga }) => ({
      playerId: p.id,
      value: cs + 1 - ga / k.length / 100,
      display: String(cs),
      unit: plural(cs, "clean sheet", "clean sheets"),
      detail: `${comma(ga / k.length)} tegen per duel · ${k.length} ${plural(k.length, "duel", "duels")}`,
      eligible: k.length >= 2,
    })),
  );
  const lead = keepers.find((x) => x.p.id === handschoen.leaders[0]);
  if (lead) handschoen.compare = keeperCompare(lead.ga / lead.k.length, standings);

  return [
    make(
      { key: "schoen", title: "Gouden Schoen", who: "Meeste goals", how: "Alle competitiegoals. Evenveel goals = gedeelde koploper." },
      count("goals", ["goal", "goals"]),
    ),
    make(
      { key: "assist", title: "Assistkoning", who: "Meeste assists", how: "Alle assists in de competitie. Evenveel assists = gedeelde koploper." },
      count("assists", ["assist", "assists"]),
    ),
    handschoen,
    make(
      {
        key: "muur",
        title: "IJzeren Muur",
        who: "Verdedigers · minder tegen dan verwacht",
        how: `Hoeveel tegengoals we per duel minder kregen dan het model verwachtte (tegen deze tegenstanders), als hij meedeed. Wedstrijden waarin hij geblesseerd was tellen niet. Meedingen vanaf ${MIN_GAMES} duels en de helft van de duels waarin hij fit was.`,
      },
      active
        .filter((p) => p.position === "Verdediger")
        .map((p) => ({
          playerId: p.id,
          value: impact[p.id].defenceImpact,
          display: signed(impact[p.id].defenceImpact, 2),
          unit: "per duel",
          detail: inGames(p.id),
          eligible: impact[p.id].eligible,
        })),
    ),
    make(
      {
        key: "mvm",
        title: "Beste Middenvelder",
        who: "Middenvelders · punten boven verwachting",
        how: `Hoeveel punten we per duel méér haalden dan verwacht met hem erbij, vergeleken met zonder hem. Wedstrijden waarin hij geblesseerd was tellen niet. Meedingen vanaf ${MIN_GAMES} duels en de helft van de duels waarin hij fit was.`,
      },
      active
        .filter((p) => p.position === "Middenvelder")
        .map((p) => ({
          playerId: p.id,
          value: impact[p.id].pointsImpact,
          display: signed(impact[p.id].pointsImpact, 2),
          unit: "pnt/duel",
          detail: inGames(p.id),
          eligible: impact[p.id].eligible,
        })),
    ),
    make(
      { key: "kaarten", title: "Kaartenkoning", who: "Voor de lol · geel 1, rood 3 punten", how: "Gele kaart 1 punt, rode kaart (ook via twee keer geel) 3 punten." },
      active.map((p) => {
        const y = sum(p.id, (r) => (r.entry.stats[p.id]?.yellow && !r.entry.stats[p.id]?.red ? 1 : 0));
        const red = sum(p.id, (r) => (r.entry.stats[p.id]?.red ? 1 : 0));
        const pts = y + 3 * red;
        return {
          playerId: p.id,
          value: pts ? pts + tiebreak(p.id) : 0,
          display: String(pts),
          unit: plural(pts, "punt", "punten"),
          detail: [y && `${y}× geel`, red && `${red}× rood`].filter(Boolean).join(" · "),
          eligible: pts > 0,
        };
      }),
    ),
  ];
}

/** Prijzen waar een speler koploper van is (voor de icoontjes) */
export function prizeLeads(awards: Award[]): Record<string, AwardKey[]> {
  const out: Record<string, AwardKey[]> = {};
  for (const a of awards) for (const id of a.leaders) (out[id] ??= []).push(a.key);
  return out;
}

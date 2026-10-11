import { normName } from "@/lib/domain/attendance";
import { deriveRound } from "@/lib/domain/derive";
import { isPlayed, US, type Position, type StandingRow } from "@/lib/domain/types";
import { guessMatchType } from "@/lib/parser/matchType";
import type { ScrapedMatch, TeamPage } from "@/lib/parser/types";
import { matchId, type DataFiles, type Snapshot, type StoredMatch, type StoredPlayer } from "@/lib/store/schema";

/**
 * Verwerkt één opgehaalde teampagina in de data (PLAN.md §5.2 en §5.3).
 * Puur: geeft nieuwe bestanden terug plus een korte samenvatting; schrijft niets.
 */

const POS: Record<string, Position> = {
  keeper: "Keeper",
  verdediger: "Verdediger",
  middenvelder: "Middenvelder",
  aanvaller: "Aanvaller",
  onbekend: "Onbekend",
};

const totalPlayed = (rows: StandingRow[]) => rows.reduce((s, r) => s + r.played, 0);
const sameRows = (a: StandingRow[], b: StandingRow[]) =>
  JSON.stringify([...a].sort((x, y) => x.team.localeCompare(y.team))) ===
  JSON.stringify([...b].sort((x, y) => x.team.localeCompare(y.team)));

export interface SyncResult {
  files: DataFiles;
  changed: (keyof DataFiles)[];
  summary: string[];
  unsure: string[];
}

export function applyTeamPage(input: DataFiles, page: TeamPage, now: Date): SyncResult {
  const files = structuredClone(input);
  const changed = new Set<keyof DataFiles>();
  const summary: string[] = [];
  let unsure: string[] = [];

  // --- Stand: snapshot opslaan als hij veranderd is (nooit terug in de tijd) ---
  const snaps = files["standings.json"].snapshots;
  const latest = [...snaps].sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt)).at(-1);
  const rows: StandingRow[] = page.standings.map((s) => ({
    team: s.team,
    position: s.position,
    played: s.played,
    won: s.won,
    drawn: s.drawn,
    lost: s.lost,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    points: s.points,
  }));
  const pool = rows.map((r) => r.team);

  if (rows.length && (!latest || (!sameRows(latest.rows, rows) && totalPlayed(rows) >= totalPlayed(latest.rows)))) {
    const snap: Snapshot = { fetchedAt: now.toISOString(), source: "scraper", rows };
    snaps.push(snap);
    changed.add("standings.json");
    summary.push(`Nieuwe stand (${totalPlayed(rows) / 2} wedstrijden gespeeld)`);

    // --- Uitslagen van andere teams afleiden uit het verschil met de vorige stand ---
    if (latest) {
      const fixtures = files["matches.json"].matches
        .filter((m) => m.kind === "competitie" && !isPlayed(m))
        .map((m) => ({ home: m.home, away: m.away }));
      const derived = deriveRound(latest.rows, rows, fixtures);
      unsure = derived.unsure;
      for (const r of derived.results) {
        const m = files["matches.json"].matches.find((x) => x.home === r.home && x.away === r.away && x.kind === "competitie");
        if (!m || isPlayed(m)) continue;
        Object.assign(m, { homeGoals: r.homeGoals, awayGoals: r.awayGoals, status: "gespeeld", source: "afgeleid" });
        changed.add("matches.json");
        summary.push(`Afgeleid: ${r.home} – ${r.away} ${r.homeGoals}-${r.awayGoals}`);
      }
      if (unsure.length) summary.push(`Onzeker (niet ingevuld): ${unsure.join(", ")}`);
    }
  }

  // --- Clublogo's uit de stand (vaste voetbal.nl-adressen, geen verlopende links) ---
  const logos = files["logos.json"].logos;
  for (const s of page.standings) {
    if (s.logoUrl && /^https:\/\/logoapi\.voetbal\.nl\//.test(s.logoUrl) && !/default-logo/.test(s.logoUrl) && logos[s.team] !== s.logoUrl) {
      logos[s.team] = s.logoUrl;
      changed.add("logos.json");
    }
  }

  // --- Eigen wedstrijden van de clubsite: programma en uitslagen ---
  const venueFor = (m: ScrapedMatch) =>
    page.nextMatch && page.nextMatch.homeTeam === m.homeTeam && page.nextMatch.awayTeam === m.awayTeam
      ? page.nextMatch.venue
      : null;

  for (const s of [...page.program, ...page.results]) {
    const kind = guessMatchType(s, US, pool);
    const id = matchId({ home: s.homeTeam, away: s.awayTeam, kind, date: s.date });
    const list = files["matches.json"].matches;
    const existing = list.find((m) => m.id === id || (s.matchCode && m.code === s.matchCode));
    const fields = {
      code: s.matchCode,
      date: s.date,
      time: s.time ?? existing?.time ?? null,
      homeGoals: s.homeGoals,
      awayGoals: s.awayGoals,
      venue: venueFor(s) ?? existing?.venue ?? null,
    };

    if (existing) {
      const before = JSON.stringify(existing);
      const wasPlayed = isPlayed(existing);
      // Een uitslag verdwijnt niet: alleen overschrijven als de site er een heeft
      Object.assign(existing, {
        ...fields,
        homeGoals: fields.homeGoals ?? existing.homeGoals,
        awayGoals: fields.awayGoals ?? existing.awayGoals,
      });
      existing.status = isPlayed(existing) ? "gespeeld" : existing.date ? "gepland" : "niet ingepland";
      if (JSON.stringify(existing) !== before) {
        existing.source = "scraper";
        changed.add("matches.json");
        summary.push(
          !wasPlayed && isPlayed(existing)
            ? `Uitslag: ${s.homeTeam} – ${s.awayTeam} ${s.homeGoals}-${s.awayGoals}`
            : `Bijgewerkt: ${s.homeTeam} – ${s.awayTeam}`,
        );
      }
    } else {
      const m: StoredMatch = {
        id,
        round: null,
        makeup: false,
        home: s.homeTeam,
        away: s.awayTeam,
        kind,
        source: "scraper",
        status: s.homeGoals !== null ? "gespeeld" : "gepland",
        ...fields,
      };
      list.push(m);
      changed.add("matches.json");
      summary.push(`Nieuw: ${s.homeTeam} – ${s.awayTeam} (${kind})`);
    }
  }

  // --- Selectie: nieuwe spelers van de clubsite toevoegen, nooit verwijderen ---
  const players = files["players.json"].players;
  for (const sp of page.players) {
    const byClub = players.find((p) => p.clubName === sp.sourceName);
    if (byClub) continue;
    const byName = players.find((p) => p.name && normName(p.name) === normName(sp.name));
    if (byName) {
      if (!byName.clubName) {
        byName.clubName = sp.sourceName;
        changed.add("players.json");
      }
      continue;
    }
    const p: StoredPlayer = {
      id: `p-${normName(sp.name).replace(/[^a-z0-9]+/g, "-")}`,
      name: sp.name,
      clubName: sp.sourceName,
      position: POS[sp.position] ?? "Onbekend",
      type: "vast",
      hiddenNo: null,
      active: true,
    };
    players.push(p);
    changed.add("players.json");
    summary.push(`Nieuwe speler: ${sp.name}`);
  }
  const hidden = players.filter((p) => p.hiddenNo !== null).length;
  for (let n = hidden + 1; n <= page.hiddenPlayerCount; n++) {
    players.push({
      id: `p-afgeschermd-${n}`,
      name: null,
      clubName: null,
      position: "Onbekend",
      type: "vast",
      hiddenNo: n,
      active: true,
    });
    changed.add("players.json");
    summary.push(`Afgeschermde speler ${n} toegevoegd`);
  }

  files["sync.json"] = {
    lastRun: now.toISOString(),
    lastChange: changed.size ? now.toISOString() : files["sync.json"].lastChange,
    message: summary.length ? summary.join(" · ") : "Geen wijzigingen",
    unsure,
  };
  changed.add("sync.json");

  return { files, changed: [...changed], summary, unsure };
}

// ---------------------------------------------------------------------------
// Ophaalschema (PLAN.md §5.2)
// ---------------------------------------------------------------------------

function nlParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { weekday: get("weekday"), hour: Number(get("hour")), date: `${get("year")}-${get("month")}-${get("day")}` };
}

/** Zaterdag van dit speelweekend (yyyy-mm-dd), in Nederlandse tijd */
function saturdayOf(now: Date): string {
  const { weekday, date } = nlParts(now);
  const d = new Date(`${date}T12:00:00Z`);
  if (weekday === "Sun") d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Ronde compleet: de uitslag van Peursum (als die dit weekend speelt) is binnen
 * én het aantal gespeelde wedstrijden in de stand is sinds vrijdag met een volle ronde gestegen.
 */
export function roundComplete(files: DataFiles, now: Date): boolean {
  const sat = saturdayOf(now);
  const snaps = [...files["standings.json"].snapshots].sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
  const before = snaps.filter((s) => nlParts(new Date(s.fetchedAt)).date < sat).at(-1);
  const latest = snaps.at(-1);
  if (!before || !latest || before === latest) return false;

  const teams = latest.rows.length;
  const gained = (totalPlayed(latest.rows) - totalPlayed(before.rows)) / 2;
  const ours = files["matches.json"].matches.find(
    (m) => (m.home === US || m.away === US) && m.kind === "competitie" && m.date === sat,
  );
  return gained >= Math.floor(teams / 2) && (!ours || isPlayed(ours));
}

/** Moet de geplande run nu echt ophalen? Handmatig ("Nu verversen") altijd. */
export function shouldFetch(files: DataFiles, now: Date, force: boolean): { run: boolean; reason: string } {
  if (force) return { run: true, reason: "handmatig" };
  const { weekday, hour } = nlParts(now);
  if (weekday === "Sat" && hour >= 13 && hour <= 23) {
    return roundComplete(files, now) ? { run: false, reason: "ronde al compleet" } : { run: true, reason: "zaterdag" };
  }
  if (weekday === "Sun" && [8, 12, 16, 20].includes(hour)) {
    return roundComplete(files, now) ? { run: false, reason: "ronde al compleet" } : { run: true, reason: "zondag" };
  }
  return { run: false, reason: "buiten het ophaalschema" };
}

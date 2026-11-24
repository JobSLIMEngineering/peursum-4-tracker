import { isPlayed, type Match, type StandingRow } from "./types";

/**
 * Stand inclusief zelf ingevulde uitslagen. De clubsite loopt soms een paar dagen achter: een uitslag die
 * je zelf invult (of een eigen toegevoegde competitiewedstrijd) staat dan nog niet in de stand. Die tellen
 * we er hier bij op, zodat de stand, de kampioenskans en de scenario's allemaal met dezelfde stand rekenen.
 * Zonder zulke uitslagen blijft de stand precies zoals op de clubsite (ook de volgorde).
 */
export function withManualResults(standings: StandingRow[], matches: (Match & { manualScore?: boolean; extra?: boolean })[]): StandingRow[] {
  const rows = new Map(standings.map((r) => [r.team, { ...r }]));
  const extra = matches.filter(
    (m) => (m.manualScore || m.extra) && m.kind === "competitie" && isPlayed(m) && rows.has(m.home) && rows.has(m.away),
  );
  if (!extra.length) return standings;
  for (const m of extra) {
    const h = rows.get(m.home)!;
    const a = rows.get(m.away)!;
    const hg = m.homeGoals!;
    const ag = m.awayGoals!;
    h.played++;
    a.played++;
    h.goalsFor += hg;
    h.goalsAgainst += ag;
    a.goalsFor += ag;
    a.goalsAgainst += hg;
    if (hg > ag) {
      h.won++;
      a.lost++;
      h.points += 3;
    } else if (hg < ag) {
      a.won++;
      h.lost++;
      a.points += 3;
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
    }
  }
  // Opnieuw op volgorde: punten, doelsaldo, gemaakte goals; daarna de volgorde van de clubsite
  return [...rows.values()]
    .sort(
      (x, y) =>
        y.points - x.points ||
        y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) ||
        y.goalsFor - x.goalsFor ||
        x.position - y.position,
    )
    .map((r, i) => ({ ...r, position: i + 1 }));
}

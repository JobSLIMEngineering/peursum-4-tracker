/**
 * Uitslagen afleiden uit twee opeenvolgende standen (plan 5.3, deriveRound() in het prototype).
 *
 * Elk team speelt één wedstrijd per ronde. Per team met precies één wedstrijd meer:
 * score = (Δvoor, Δtegen). Twee teams met gespiegelde scores speelden tegen elkaar.
 * Meerdere kandidaten → het programma beslist. Thuis/uit komt uit het programma.
 * Lukt het niet eenduidig, dan komt het team in `unsure`; er wordt niet geraden.
 */

export interface SnapshotRow {
  team: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface Fixture {
  home: string;
  away: string;
}

export interface DerivedResult {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

export function deriveRound(
  prev: SnapshotRow[],
  cur: SnapshotRow[],
  fixtures: Fixture[],
): { results: DerivedResult[]; unsure: string[] } {
  const before = new Map(prev.map((r) => [r.team, r]));
  const deltas = cur
    .filter((r) => before.has(r.team) && r.played - before.get(r.team)!.played === 1)
    .map((r) => {
      const p = before.get(r.team)!;
      return { team: r.team, f: r.goalsFor - p.goalsFor, a: r.goalsAgainst - p.goalsAgainst };
    });

  const fixtureOf = (x: string, y: string) =>
    fixtures.find((f) => (f.home === x && f.away === y) || (f.home === y && f.away === x));

  const results: DerivedResult[] = [];
  const used = new Set<string>();
  const unsure: string[] = [];

  for (const x of deltas) {
    if (used.has(x.team)) continue;
    let cands = deltas.filter(
      (y) => y.team !== x.team && !used.has(y.team) && y.f === x.a && y.a === x.f,
    );
    if (cands.length > 1) cands = cands.filter((y) => fixtureOf(x.team, y.team));

    const fx = cands.length === 1 ? fixtureOf(x.team, cands[0].team) : undefined;
    if (!fx) {
      unsure.push(x.team);
      continue;
    }

    const y = cands[0];
    used.add(x.team);
    used.add(y.team);
    const xHome = fx.home === x.team;
    results.push({
      home: fx.home,
      away: fx.away,
      homeGoals: xHome ? x.f : y.f,
      awayGoals: xHome ? x.a : y.a,
    });
  }

  return { results, unsure };
}

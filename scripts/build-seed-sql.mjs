// Zet docs/seed-data.json om naar supabase/seed.sql (eenmalige import).
// Gebruik: node scripts/build-seed-sql.mjs
import { readFileSync, writeFileSync } from "node:fs";

const seed = JSON.parse(readFileSync(new URL("../docs/seed-data.json", import.meta.url), "utf-8"));

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const team = (naam) => `(select id from teams where naam = ${q(naam)})`;

const names = new Set([...seed.stand.map((r) => r.team), ...seed.wedstrijden.flatMap((w) => [w.thuis, w.uit])]);

const lines = [
  "-- Gegenereerd door scripts/build-seed-sql.mjs uit docs/seed-data.json. Niet met de hand aanpassen.",
  `-- Bron: ${seed.bron}`,
  "begin;",
  "",
  "insert into teams (naam, sportpark) values",
  [...names].map((n) => `  (${q(n)}, ${q(seed.sportparken[n] ?? null)})`).join(",\n") + ";",
  "",
  "with s as (insert into standings_snapshots (opgehaald_op, bron) values ('2026-10-10 18:00+02', 'seed') returning id)",
  "insert into standings_rows (snapshot_id, team_id, positie, gespeeld, winst, gelijk, verlies, voor, tegen, punten)",
  "select s.id, t.id, v.positie, v.gespeeld, v.winst, v.gelijk, v.verlies, v.voor, v.tegen, v.punten",
  "from s, (values",
  seed.stand
    .map((r) => `  (${q(r.team)}, ${r.positie}, ${r.gespeeld}, ${r.winst}, ${r.gelijk}, ${r.verlies}, ${r.voor}, ${r.tegen}, ${r.punten})`)
    .join(",\n"),
  ") as v (team, positie, gespeeld, winst, gelijk, verlies, voor, tegen, punten)",
  "join teams t on t.naam = v.team;",
  "",
  "insert into matches (ronde, inhaal, datum, tijd, thuis_team_id, uit_team_id, uitslag_thuis, uitslag_uit, sportpark, soort, status, bron) values",
  seed.wedstrijden
    .map(
      (w) =>
        `  (${w.ronde ?? "null"}, ${w.inhaal}, ${q(w.datum)}, ${q(w.tijd)}, ${team(w.thuis)}, ${team(w.uit)}, ${w.uitslag_thuis ?? "null"}, ${w.uitslag_uit ?? "null"}, ${q(w.sportpark)}, 'competitie', ${q(w.status)}, 'seed')`,
    )
    .join(",\n") + ";",
  "",
  "insert into players (naam, positie, type, afgeschermd_nr) values",
  (() => {
    let hidden = 0;
    return seed.spelers
      .map((s) => `  (${q(s.naam)}, ${q(s.positie)}, ${q(s.type)}, ${s.afgeschermd ? ++hidden : "null"})`)
      .join(",\n");
  })() + ";",
  "",
  "commit;",
  "",
];

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n"));
console.log(
  `supabase/seed.sql: ${names.size} teams, ${seed.stand.length} standregels, ${seed.wedstrijden.length} wedstrijden, ${seed.spelers.length} spelers`,
);

import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

// Draait migratie + seed in een lokale Postgres (PGlite) met een nagebootst
// Supabase-auth-schema, zodat de SQL getest is voordat hij naar Supabase gaat.
const sql = (p: string) => readFileSync(new URL(p, import.meta.url), "utf-8");

const SUPABASE_STUB = `
  create role authenticated;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
`;

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(sql("./migrations/0001_init.sql"));
  await db.exec(sql("./seed.sql"));
  await db.exec(`grant usage on schema public to authenticated;
    grant all on all tables in schema public to authenticated;`);
}, 60_000);

const count = async (q: string) =>
  Number((await db.query<{ n: number }>(`select count(*)::int as n from ${q}`)).rows[0].n);

describe("seed in de database", () => {
  it("132 wedstrijden, 20 met uitslag, 12 teams, 22 spelers", async () => {
    expect(await count("matches")).toBe(132);
    expect(await count("matches where uitslag_thuis is not null")).toBe(20);
    expect(await count("teams")).toBe(12);
    expect(await count("players")).toBe(22);
    expect(await count("players where afgeschermd_nr is not null")).toBe(5);
    expect(await count("standings_rows")).toBe(12);
  });

  it("VVAC – Peursum staat in ronde 5 als niet ingepland", async () => {
    const { rows } = await db.query(`
      select m.ronde, m.datum, m.status from matches m
      join teams h on h.id = m.thuis_team_id join teams a on a.id = m.uit_team_id
      where h.naam = 'VVAC 6' and a.naam = 'Peursum 4'`);
    expect(rows).toEqual([{ ronde: 5, datum: null, status: "niet ingepland" }]);
  });
});

describe("Row Level Security", () => {
  const as = async (email: string | null, q: string) => {
    await db.exec(`set role authenticated;
      select set_config('request.jwt.claims', '${email ? JSON.stringify({ email }) : ""}', false);`);
    try {
      return (await db.query(q)).rows;
    } finally {
      await db.exec("reset role;");
    }
  };

  beforeAll(async () => {
    await db.exec(`insert into owners (email) values ('eigenaar@example.com')`);
  });

  it("de eigenaar ziet alles", async () => {
    expect(await as("Eigenaar@Example.com", "select id from matches")).toHaveLength(132);
  });

  it("een ander ingelogd account ziet niets en kan niets schrijven", async () => {
    expect(await as("iemand@example.com", "select id from matches")).toHaveLength(0);
    await expect(
      as("iemand@example.com", "insert into feedback (pagina, tekst) values ('/', 'x')"),
    ).rejects.toThrow(/row-level security/);
  });
});

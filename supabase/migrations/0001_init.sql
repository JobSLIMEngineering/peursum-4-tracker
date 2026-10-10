-- Peursum 4 Tracker: tabellen volgens PLAN.md §5.4, plus feedback.
-- Uitvoeren in Supabase: SQL Editor → plakken → Run. Daarna supabase/seed.sql.


-- ---------------------------------------------------------------------------
-- Eigenaar: alleen deze e-mailadressen mogen lezen en schrijven (Row Level Security)
-- ---------------------------------------------------------------------------
create table owners (
  email text primary key
);

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from owners where email = lower(auth.jwt() ->> 'email'));
$$;

-- ---------------------------------------------------------------------------
-- Competitie
-- ---------------------------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  naam text not null unique,
  sportpark text
);

create table standings_snapshots (
  id uuid primary key default gen_random_uuid(),
  opgehaald_op timestamptz not null default now(),
  bron text not null default 'scraper' check (bron in ('seed', 'scraper'))
);

create table standings_rows (
  snapshot_id uuid not null references standings_snapshots on delete cascade,
  team_id uuid not null references teams,
  positie int not null,
  gespeeld int not null,
  winst int not null,
  gelijk int not null,
  verlies int not null,
  voor int not null,
  tegen int not null,
  punten int not null,
  primary key (snapshot_id, team_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  -- Wedstrijdcode van Sportlink (uit de detail-link), voor upsert door de scraper
  wedstrijdcode text unique,
  ronde int check (ronde between 1 and 30),
  inhaal boolean not null default false,
  datum date,
  tijd time,
  thuis_team_id uuid not null references teams,
  uit_team_id uuid not null references teams,
  uitslag_thuis int check (uitslag_thuis >= 0),
  uitslag_uit int check (uitslag_uit >= 0),
  sportpark text,
  soort text not null default 'competitie' check (soort in ('competitie', 'beker', 'oefen')),
  status text not null default 'gepland' check (status in ('gepland', 'gespeeld', 'niet ingepland')),
  bron text not null check (bron in ('seed', 'scraper', 'afgeleid', 'handmatig')),
  handmatig_aangepast boolean not null default false,
  -- Laatst opgehaalde waarden van de clubsite; nodig voor "Terug naar clubsite"
  clubsite jsonb,
  bijgewerkt_op timestamptz not null default now(),
  check (thuis_team_id <> uit_team_id),
  check ((uitslag_thuis is null) = (uitslag_uit is null))
);
create index matches_datum_idx on matches (datum);

-- ---------------------------------------------------------------------------
-- Team en invoer
-- ---------------------------------------------------------------------------
create table players (
  id uuid primary key default gen_random_uuid(),
  naam text,
  -- Naam zoals op de clubsite ("Berg, Rien van den"), voor de scraper
  clubsite_naam text unique,
  positie text not null default 'Onbekend'
    check (positie in ('Keeper', 'Verdediger', 'Middenvelder', 'Aanvaller', 'Onbekend')),
  type text not null default 'vast' check (type in ('vast', 'leen')),
  afgeschermd_nr int unique,
  actief boolean not null default true,
  aangemaakt_op timestamptz not null default now(),
  check (naam is not null or afgeschermd_nr is not null)
);

create table match_attendance (
  match_id uuid not null references matches on delete cascade,
  player_id uuid not null references players on delete cascade,
  primary key (match_id, player_id)
);

create table match_player_stats (
  match_id uuid not null references matches on delete cascade,
  player_id uuid not null references players on delete cascade,
  goals int not null default 0 check (goals >= 0),
  assists int not null default 0 check (assists >= 0),
  -- geel + rood samen = tweede geel (telt als rood)
  geel boolean not null default false,
  rood boolean not null default false,
  primary key (match_id, player_id)
);

create table match_meta (
  match_id uuid primary key references matches on delete cascade,
  keeper_player_id uuid references players on delete set null,
  eigen_goals_tegenstander int not null default 0 check (eigen_goals_tegenstander >= 0)
);

-- ---------------------------------------------------------------------------
-- Feedbackknop
-- ---------------------------------------------------------------------------
create table feedback (
  id uuid primary key default gen_random_uuid(),
  aangemaakt_op timestamptz not null default now(),
  pagina text not null,
  schermbreedte int,
  tekst text not null check (length(tekst) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'verwerkt'))
);

-- ---------------------------------------------------------------------------
-- Row Level Security: alles dicht, behalve voor de eigenaar.
-- De scraper gebruikt de service-role-sleutel en gaat daar buiten om.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'owners', 'teams', 'standings_snapshots', 'standings_rows', 'matches', 'players',
    'match_attendance', 'match_player_stats', 'match_meta', 'feedback'
  ] loop
    execute format('alter table %I enable row level security', t);
    if t <> 'owners' then
      execute format(
        'create policy eigenaar on %I for all to authenticated using (is_owner()) with check (is_owner())',
        t
      );
    end if;
  end loop;
end $$;

-- Fixtures, results and the league table.
--
-- The site had no match data at all: the only cricket content was per-player
-- season aggregates in player_stats. That is why every page had to be padded
-- out with generic copy. These two tables hold what a club site actually
-- leads with — the next fixture, the last result, and where we sit in the
-- division — populated from CricClubs by the same sync that fills
-- player_stats.
--
-- Policies follow the pattern already used on squad/player_stats: anyone may
-- read, only an authenticated admin may write through PostgREST. The Netlify
-- sync functions use the service role key, which bypasses RLS entirely.

create table if not exists public.matches (
  id                 uuid primary key default gen_random_uuid(),
  -- CricClubs' own match id, when the schedule page exposes one. Used as the
  -- upsert key so re-running the sync updates a fixture in place (a scheduled
  -- match becoming a completed one) rather than duplicating it.
  cricclubs_match_id text unique,
  match_date         date not null,
  match_time         text,
  opponent           text not null,
  is_home            boolean,
  venue              text,
  format             text,
  competition        text,
  season             integer,
  status             text not null default 'scheduled',
  result             text,
  result_summary     text,
  our_score          text,
  their_score        text,
  scorecard_url      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint matches_status_check
    check (status in ('scheduled', 'completed', 'abandoned', 'cancelled')),
  constraint matches_result_check
    check (result is null or result in ('won', 'lost', 'tied', 'no result'))
);

create index if not exists matches_date_idx    on public.matches (match_date desc);
create index if not exists matches_season_idx  on public.matches (season, format);
create index if not exists matches_status_idx  on public.matches (status, match_date);

create table if not exists public.standings (
  id            uuid primary key default gen_random_uuid(),
  season        integer not null,
  format        text not null,
  -- '' rather than null so the unique constraint below actually collapses
  -- duplicates: in Postgres, null is never equal to null.
  division      text not null default '',
  team_name     text not null,
  position      integer,
  played        integer not null default 0,
  won           integer not null default 0,
  lost          integer not null default 0,
  tied          integer not null default 0,
  no_result     integer not null default 0,
  points        numeric not null default 0,
  net_run_rate  numeric,
  updated_at    timestamptz not null default now(),
  constraint standings_unique_team unique (season, format, division, team_name)
);

create index if not exists standings_lookup_idx
  on public.standings (season, format, division, position);

alter table public.matches   enable row level security;
alter table public.standings enable row level security;

create policy "Allow public read access to matches"
  on public.matches for select to public using (true);

create policy "Allow admin changes to matches"
  on public.matches for all to authenticated using (true) with check (true);

create policy "Allow public read access to standings"
  on public.standings for select to public using (true);

create policy "Allow admin changes to standings"
  on public.standings for all to authenticated using (true) with check (true);

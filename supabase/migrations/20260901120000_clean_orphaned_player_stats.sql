-- Data cleanup. Applied to the live project on 2026-09-01.
--
-- 33 rows in player_stats resolved to no active squad member, directly or
-- through mappings, so they never appeared on the site and failed silently.
-- Causes, in order of size:
--
--   1. Name comparisons ran on raw strings, so tabs and doubled spaces broke
--      matching. Fixed in code (shared/names.js) and repaired here.
--   2. All three mappings rows mapped a name to itself, so the reconciliation
--      layer built for this problem was doing nothing.
--   3. The scraper's name-column heuristic sometimes clipped a cell, storing
--      trailing fragments like "KANNAJI" or "KRISHNA KANNAJI".
--   4. 20 rows were filed under season 9999.
--
-- Deleted rows were copied first to archive.player_stats_20260901. That schema
-- is not exposed through PostgREST, so the copy is unreachable via the anon
-- key and needs no RLS policies. Drop it once you are satisfied:
--   drop schema archive cascade;

-- Mappings for CricClubs spellings that differ from the squad table.
-- (CricClubs looks correct in both cases; the squad rows carry the typo. Kept
-- as mappings rather than renaming, since squad.name is the public display
-- value — change the squad rows instead if you would rather fix the spelling.)
insert into public.mappings (source_name, target_name) values
  ('Shibin Babu Puthan Purayil', 'Shibin Babu Puthan Purayi'),
  ('Shubham Bhatta',             'Shubam Bhatta'),
  ('Vishnu D Dwivedi',           'Vishnu Dutt Dwivedi'),
  ('Vishnu Dwivedi',             'Vishnu Dutt Dwivedi')
on conflict do nothing;

-- Remove mappings that point a name at itself; inert once names are normalized.
delete from public.mappings
where lower(trim(regexp_replace(replace(source_name, chr(160),' '), '\s+',' ','g')))
    = lower(trim(regexp_replace(replace(target_name, chr(160),' '), '\s+',' ','g')));

-- Drop whitespace-variant stats rows. Each was all-zero and duplicated a clean
-- row of the same (player, season, format) holding the real figures, so this is
-- lossless — the unique constraint on that triple is what surfaced them.
delete from public.player_stats d
where d.player_name ~ '\s{2,}|\t'
  and coalesce(d.runs,0)=0 and coalesce(d.wickets,0)=0 and coalesce(d.catches,0)=0
  and exists (
    select 1 from public.player_stats k
    where k.id <> d.id and k.season = d.season and k.format = d.format
      and trim(regexp_replace(replace(k.player_name, chr(160),' '), '\s+',' ','g'))
        = trim(regexp_replace(replace(d.player_name, chr(160),' '), '\s+',' ','g'))
  );

-- Repair remaining stored whitespace (a tab in squad, doubled spaces in stats).
update public.squad
   set name = trim(regexp_replace(replace(name, chr(160),' '), '\s+',' ','g'))
 where name <> trim(regexp_replace(replace(name, chr(160),' '), '\s+',' ','g'));

update public.player_stats
   set player_name = trim(regexp_replace(replace(player_name, chr(160),' '), '\s+',' ','g'))
 where player_name <> trim(regexp_replace(replace(player_name, chr(160),' '), '\s+',' ','g'));

-- Season 9999: 20 rows in two clusters, both archived before removal.
--   Feb 4  — 7 rows, up to 24 wickets in a 2-match season. A T20 innings has
--            ten wickets in it, so these are a misaligned column read.
--   May 25 — 13 rows, plausible figures, but a mid-season 2026 snapshot filed
--            under the wrong season and superseded by the real 2026 rows.
delete from public.player_stats where season = 9999;

-- Clipped name fragments: no lowercase, no stats, unmatchable by construction.
delete from public.player_stats p
where p.player_name = upper(p.player_name)
  and p.player_name !~ '[a-z]'
  and not exists (select 1 from public.squad s
                  where lower(trim(s.name)) = lower(trim(p.player_name)));

-- Result: player_stats 132 -> 98 rows, orphans 33 -> 1. The remaining orphan is
-- Naveen Kumar Shanmugam, deliberately kept: he is not in the active squad but
-- appears to be a former player, so his record was left intact.

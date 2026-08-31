-- Remove the policies that granted anonymous INSERT/UPDATE on the public
-- tables. They were granted TO public with a `true` condition, so anyone
-- holding the anon key (which ships in the client bundle) could insert or
-- overwrite any row. Writes now require either an authenticated admin
-- session or the service role key used by the Netlify sync functions.
--
-- Reads are unaffected (the public SELECT policies remain), and authenticated
-- admins keep full write access via the existing "Allow admin changes to ..."
-- and "Allow auth all ..." ALL-command policies.
--
-- NOTE: this supersedes an earlier draft migration that tried to ADD
-- restrictive policies. That approach does not work: Postgres RLS policies
-- are permissive and OR together, so adding policies alongside the open ones
-- grants no additional protection. The open policies have to be dropped.
--
-- Applied to the live project on 2026-08-31.

drop policy if exists "Allow anon insert" on public.squad;
drop policy if exists "Allow anon update" on public.squad;

drop policy if exists "Allow anon insert player_stats" on public.player_stats;
drop policy if exists "Allow anon update player_stats" on public.player_stats;

drop policy if exists "Allow anon insert mappings" on public.mappings;
drop policy if exists "Allow anon update mappings" on public.mappings;

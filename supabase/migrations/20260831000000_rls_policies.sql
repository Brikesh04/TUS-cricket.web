-- Row Level Security for the public-facing tables.
--
-- The app ships the Supabase anon key to every browser (it's bundled into
-- the client JS), and the admin dashboard's AuthGuard only hides UI on the
-- client -- it enforces nothing on its own. Without RLS, anyone holding the
-- anon key can read AND write squad/mappings/player_stats directly against
-- the Supabase REST API. These policies make the database itself enforce
-- what README.md already documents as the intended access model:
-- public read, admin-only (any authenticated user) write.
--
-- Apply via the Supabase SQL editor, or `supabase db push` if this project
-- is linked to a Supabase CLI project.

alter table public.squad enable row level security;
alter table public.player_stats enable row level security;
alter table public.mappings enable row level security;

-- squad
create policy "squad_public_read" on public.squad
  for select using (true);
create policy "squad_authenticated_insert" on public.squad
  for insert to authenticated with check (true);
create policy "squad_authenticated_update" on public.squad
  for update to authenticated using (true) with check (true);
create policy "squad_authenticated_delete" on public.squad
  for delete to authenticated using (true);

-- player_stats
create policy "player_stats_public_read" on public.player_stats
  for select using (true);
create policy "player_stats_authenticated_insert" on public.player_stats
  for insert to authenticated with check (true);
create policy "player_stats_authenticated_update" on public.player_stats
  for update to authenticated using (true) with check (true);
create policy "player_stats_authenticated_delete" on public.player_stats
  for delete to authenticated using (true);

-- mappings
create policy "mappings_public_read" on public.mappings
  for select using (true);
create policy "mappings_authenticated_insert" on public.mappings
  for insert to authenticated with check (true);
create policy "mappings_authenticated_update" on public.mappings
  for update to authenticated using (true) with check (true);
create policy "mappings_authenticated_delete" on public.mappings
  for delete to authenticated using (true);

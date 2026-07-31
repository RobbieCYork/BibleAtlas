-- ============================================================================
-- Fixes "infinite recursion detected in policy for relation
-- saving_peter_players" (Postgres 42P17) — the exact same bug sql/003 already
-- fixed for game_players/game_rooms/game_buzzes, missed when
-- 011_saving_peter_multiplayer.sql copied the pre-003 version of those
-- policies. Same fix: move the membership check into a SECURITY DEFINER
-- function so the subquery's own scan doesn't re-enter the calling policy.
--   psql "$SUPABASE_DB_URL" -f sql/012_saving_peter_fix_rls_recursion.sql
-- ============================================================================

create or replace function is_saving_peter_room_member(p_room_id uuid) returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from saving_peter_players where room_id = p_room_id and user_id = auth.uid());
$$;

grant execute on function is_saving_peter_room_member(uuid) to authenticated;

drop policy if exists "members can view their saving peter roster" on saving_peter_players;
create policy "members can view their saving peter roster" on saving_peter_players
  for select
  using (user_id = auth.uid() or is_saving_peter_room_member(room_id));

drop policy if exists "members can view their saving peter room" on saving_peter_rooms;
create policy "members can view their saving peter room" on saving_peter_rooms
  for select
  using (auth.uid() = host_id or is_saving_peter_room_member(id));

drop policy if exists "members can view saving peter guesses in their room" on saving_peter_guesses;
create policy "members can view saving peter guesses in their room" on saving_peter_guesses
  for select
  using (is_saving_peter_room_member(room_id));

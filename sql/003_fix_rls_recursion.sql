-- ============================================================================
-- Fixes "infinite recursion detected in policy for relation game_players"
-- (Postgres 42P17), hit the first time the app actually SELECTs from
-- game_players after creating a room. The 001 policy checked room membership
-- with an EXISTS subquery against game_players FROM WITHIN a game_players
-- policy — Postgres re-evaluates that same policy for the subquery's own
-- scan, recursing forever. The fix: do the membership check inside a
-- SECURITY DEFINER function. Its internal query runs as the function's
-- owner (the migration role), which — like every table owner — bypasses RLS
-- by default, so the same lookup no longer re-enters the calling policy.
--   psql "$SUPABASE_DB_URL" -f sql/003_fix_rls_recursion.sql
-- ============================================================================

create or replace function is_game_room_member(p_room_id uuid) returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from game_players where room_id = p_room_id and user_id = auth.uid());
$$;

grant execute on function is_game_room_member(uuid) to authenticated;

drop policy if exists "members can view their room roster" on game_players;
create policy "members can view their room roster" on game_players
  for select
  using (user_id = auth.uid() or is_game_room_member(room_id));

drop policy if exists "members can view their game room" on game_rooms;
create policy "members can view their game room" on game_rooms
  for select
  using (auth.uid() = host_id or is_game_room_member(id));

drop policy if exists "members can view buzzes in their room" on game_buzzes;
create policy "members can view buzzes in their room" on game_buzzes
  for select
  using (is_game_room_member(room_id));

drop policy if exists "players can buzz themselves in" on game_buzzes;
create policy "players can buzz themselves in" on game_buzzes
  for insert
  with check (
    user_id = auth.uid()
    and is_game_room_member(room_id)
    and exists (
      select 1 from game_rooms r
      where r.id = game_buzzes.room_id
        and r.status = 'active'
        and r.current_question_index = game_buzzes.question_index
    )
  );

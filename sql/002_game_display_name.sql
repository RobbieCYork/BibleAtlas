-- ============================================================================
-- A signed-in player already gets their real profiles.display_name (unchanged
-- from 001). A guest (anonymous-auth) player has no profiles row at all, and
-- previously fell back to the literal string "Player" for everyone — making
-- two guests at the same table indistinguishable. This assigns "Guest 1",
-- "Guest 2", etc. instead, numbered by join order within that room.
-- Same function signatures as 001 — just a body change, no client changes.
--   psql "$SUPABASE_DB_URL" -f sql/002_game_display_name.sql
-- ============================================================================

create or replace function create_game_room(p_target_score int default 50, p_question_ids jsonb default '[]'::jsonb)
returns game_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_display_name text;
  v_room game_rooms;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to create a game';
  end if;

  select display_name into v_display_name from profiles where id = auth.uid();

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into game_rooms (code, host_id, target_score, question_ids)
      values (v_code, auth.uid(), coalesce(p_target_score, 50), coalesce(p_question_ids, '[]'::jsonb))
      returning * into v_room;
      exit;
    exception when unique_violation then
      -- Code collision — loop and try another one.
    end;
  end loop;

  -- Host is always the room's first player, so they're always "Guest 1" if unnamed.
  insert into game_players (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), coalesce(v_display_name, 'Guest 1'));

  return v_room;
end;
$$;

create or replace function join_game_room(p_code text)
returns game_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room game_rooms;
  v_display_name text;
  v_player_count int;
  v_guest_number int;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to join a game';
  end if;

  select * into v_room from game_rooms where code = upper(p_code);
  if v_room.id is null then
    raise exception 'No game found with that code';
  end if;

  select count(*) into v_player_count from game_players where room_id = v_room.id;
  if v_room.status <> 'lobby' and not exists (
    select 1 from game_players where room_id = v_room.id and user_id = auth.uid()
  ) then
    raise exception 'That game has already started';
  end if;
  if v_player_count >= 8 and not exists (
    select 1 from game_players where room_id = v_room.id and user_id = auth.uid()
  ) then
    raise exception 'This game room is full';
  end if;

  select display_name into v_display_name from profiles where id = auth.uid();
  if v_display_name is null then
    select count(*) + 1 into v_guest_number from game_players where room_id = v_room.id and display_name like 'Guest %';
    v_display_name := 'Guest ' || v_guest_number;
  end if;

  insert into game_players (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), v_display_name)
  on conflict (room_id, user_id) do update set display_name = excluded.display_name;

  return v_room;
end;
$$;

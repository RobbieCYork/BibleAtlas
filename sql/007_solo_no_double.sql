-- ============================================================================
-- With only one player seated, "first correct answer doubles" is meaningless —
-- a solo player is trivially always first, so every correct answer would
-- double forever, which isn't a bonus at all, just inflated scoring. This
-- makes the 2x bonus conditional on there being more than one seated player;
-- solo games score a plain +points per correct answer, -points per wrong one,
-- same as multiplayer otherwise.
--   psql "$SUPABASE_DB_URL" -f sql/007_solo_no_double.sql
-- ============================================================================

create or replace function submit_answer(
  p_room_id uuid,
  p_question_index int,
  p_answer_index int,
  p_correct boolean,
  p_points int
)
returns game_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room game_rooms;
  v_player game_players;
  v_my_buzzed_at timestamptz;
  v_first_correct boolean;
  v_seated_count int;
  v_delta int;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to play';
  end if;

  select * into v_room from game_rooms where id = p_room_id;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.status <> 'active' or v_room.current_question_index <> p_question_index then
    raise exception 'This question is no longer active';
  end if;
  if not exists (select 1 from game_players where room_id = p_room_id and user_id = auth.uid()) then
    raise exception 'Not a player in this game';
  end if;

  -- Serializes concurrent submit_answer() calls for the SAME question (any room, any player) so two
  -- players answering correctly within the same instant can't both read "no earlier correct answer
  -- exists yet" and both walk away with the first-correct bonus. Released automatically at the end of
  -- this transaction.
  perform pg_advisory_xact_lock(hashtext(p_room_id::text || ':' || p_question_index::text));

  -- The unique (room_id, question_index, user_id) constraint above rejects a second answer from the
  -- same player to the same question outright — this raises unique_violation (23505), which the
  -- client treats the same way submitBuzz's old "someone beat you to it" case did.
  insert into game_buzzes (room_id, question_index, user_id, answer_index, correct)
  values (p_room_id, p_question_index, auth.uid(), p_answer_index, p_correct)
  returning buzzed_at into v_my_buzzed_at;

  if p_correct then
    select count(*) into v_seated_count from game_players where room_id = p_room_id;
    if v_seated_count <= 1 then
      v_first_correct := false; -- Solo: no one to actually be "first" ahead of.
    else
      select not exists (
        select 1 from game_buzzes
        where room_id = p_room_id
          and question_index = p_question_index
          and correct = true
          and user_id <> auth.uid()
          and buzzed_at < v_my_buzzed_at
      ) into v_first_correct;
    end if;
    v_delta := p_points * (case when v_first_correct then 2 else 1 end);
  else
    v_delta := -p_points;
  end if;

  update game_players
  set score = score + v_delta
  where room_id = p_room_id and user_id = auth.uid()
  returning * into v_player;

  return v_player;
end;
$$;

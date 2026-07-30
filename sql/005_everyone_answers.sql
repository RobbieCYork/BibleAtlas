-- ============================================================================
-- Changes the scoring model from "first buzz locks the question for everyone
-- else" to "everyone gets a chance to answer": each player submits at most
-- one answer per question. Wrong = -points (a real risk, not just a missed
-- opportunity), no answer submitted = 0, correct = +points — DOUBLED for
-- whichever player was the first to answer correctly (an incorrect answer
-- never scores double, no matter how fast it was). Scores can go negative —
-- there's no floor. The room's win condition becomes "the first player whose
-- score is STRICTLY the highest and >= target_score" (a tie for the lead
-- never ends the game — more questions get asked until it breaks).
--
-- Replaces resolve_question()/force_advance() (built around a single buzz
-- winner) with:
--   - submit_answer(): a player scores their OWN answer atomically with
--     submitting it — same trust boundary as before (a client only ever
--     claims correctness for its own answer), just applied per-player
--     instead of per-room-winner. The first-correct-doubles bonus is decided
--     server-side, from game_buzzes.buzzed_at ordering (a DB-assigned
--     timestamp, not something a client can backdate) — not something a
--     single client's own claim could fake in its own favor.
--   - check_and_advance(): callable by anyone once the round's 15-second
--     window has elapsed OR every seated player has already answered —
--     advances the room, with no scoring of its own.
--
-- Because scoring now happens inside submit_answer() (a SECURITY DEFINER
-- function), clients no longer insert into game_buzzes directly — the old
-- direct-insert policy/grant for that is dropped below.
--   psql "$SUPABASE_DB_URL" -f sql/005_everyone_answers.sql
-- ============================================================================

alter table game_buzzes drop constraint game_buzzes_room_id_question_index_key;
alter table game_buzzes add constraint game_buzzes_room_id_question_index_user_id_key unique (room_id, question_index, user_id);
alter table game_buzzes add column correct boolean not null default false;

drop policy if exists "players can buzz themselves in" on game_buzzes;
revoke insert on game_buzzes from authenticated;

drop function if exists resolve_question(uuid, int, boolean, int);
drop function if exists force_advance(uuid, int);

-- Scores the caller's own answer to p_question_index and records it, in one atomic step. p_correct
-- is the caller's own claim about their own answer (the answer key lives in client-side static data —
-- see src/data/gameQuestions.ts — same trust model this app has used since 001_game.sql); p_points is
-- always the question's plain, unsigned point value — this function decides the sign (- if wrong) and
-- the first-correct 2x multiplier itself, rather than trusting a client-computed delta.
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
    select not exists (
      select 1 from game_buzzes
      where room_id = p_room_id
        and question_index = p_question_index
        and correct = true
        and user_id <> auth.uid()
        and buzzed_at < v_my_buzzed_at
    ) into v_first_correct;
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

-- Ends the current round (if its 15-second window has elapsed, or every seated player has already
-- answered) and moves to the next question — or ends the game, if someone's now the strict, sole
-- leader at or past target_score, or there are no more prepared questions left to ask. No scoring
-- happens here; that's already done per-player by submit_answer() above. Safe for multiple clients to
-- call redundantly (guarded on current_question_index, same as the old force_advance()).
create or replace function check_and_advance(p_room_id uuid, p_question_index int)
returns game_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room game_rooms;
  v_seated_count int;
  v_answered_count int;
  v_top_score int;
  v_top_count int;
  v_winner uuid;
  v_status text;
  v_total_questions int;
  v_next_index int;
begin
  select * into v_room from game_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.status <> 'active' or v_room.current_question_index <> p_question_index then
    return v_room; -- Already moved on.
  end if;

  select count(*) into v_seated_count from game_players where room_id = p_room_id;
  select count(*) into v_answered_count from game_buzzes where room_id = p_room_id and question_index = p_question_index;

  if v_answered_count < v_seated_count
     and (v_room.current_question_started_at is null or now() - v_room.current_question_started_at < interval '15 seconds')
  then
    raise exception 'Question still in progress';
  end if;

  select max(score) into v_top_score from game_players where room_id = p_room_id;
  select count(*) into v_top_count from game_players where room_id = p_room_id and score = v_top_score;
  if v_top_count = 1 and v_top_score >= v_room.target_score then
    select user_id into v_winner from game_players where room_id = p_room_id and score = v_top_score;
    v_status := 'finished';
  end if;

  v_total_questions := jsonb_array_length(v_room.question_ids);
  v_next_index := p_question_index + 1;
  if v_status is null and v_next_index >= v_total_questions then
    -- Ran out of prepared questions — end the game anyway. Only crown a winner if the lead wasn't
    -- tied; a tied top score at the very last question just ends without one.
    v_status := 'finished';
    if v_top_count = 1 then
      select user_id into v_winner from game_players where room_id = p_room_id and score = v_top_score;
    end if;
  end if;

  if v_status = 'finished' then
    insert into game_high_scores (user_id, display_name, score, room_id)
    select user_id, display_name, score, p_room_id from game_players where room_id = p_room_id;
  end if;

  update game_rooms
  set current_question_index = v_next_index,
      current_question_started_at = case when v_status is null then now() else current_question_started_at end,
      status = coalesce(v_status, status),
      winner_id = coalesce(v_winner, winner_id)
  where id = p_room_id
  returning * into v_room;

  return v_room;
end;
$$;

grant execute on function submit_answer(uuid, int, int, boolean, int) to authenticated;
grant execute on function check_and_advance(uuid, int) to authenticated;

-- ============================================================================
-- Leave / kick — every player can leave a room they're in; the host can
-- remove anyone else. Both just delete the game_players row: it drops that
-- player out of the roster (realtime picks it up for every other client),
-- out of check_and_advance()'s "everyone answered" count, and out of the
-- final game_high_scores insert if the game later finishes without them.
-- If a room is left with zero players, it's deleted outright (game_buzzes/
-- game_players cascade via their FKs) rather than left orphaned forever.
-- ============================================================================

create or replace function leave_game_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room game_rooms;
  v_remaining_count int;
  v_new_host uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;

  select * into v_room from game_rooms where id = p_room_id for update;
  if v_room.id is null then
    return; -- Already gone — leaving a room that no longer exists is a no-op.
  end if;

  delete from game_players where room_id = p_room_id and user_id = auth.uid();

  select count(*) into v_remaining_count from game_players where room_id = p_room_id;
  if v_remaining_count = 0 then
    delete from game_rooms where id = p_room_id;
    return;
  end if;

  -- The host left but others remain — hand the room to whoever joined earliest, so "Start Game" (in
  -- the lobby) and future kicks still have someone able to use them.
  if v_room.host_id = auth.uid() then
    select user_id into v_new_host from game_players where room_id = p_room_id order by joined_at asc limit 1;
    update game_rooms set host_id = v_new_host where id = p_room_id;
  end if;
end;
$$;

-- Host-only: removes another seated player. Works in the lobby or mid-game (e.g. an AFK or
-- disruptive player) — the target simply drops off everyone's roster the same way leave_game_room
-- makes them drop off, they just didn't choose it themselves.
create or replace function kick_player(p_room_id uuid, p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room game_rooms;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  select * into v_room from game_rooms where id = p_room_id;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.host_id <> auth.uid() then
    raise exception 'Only the host can remove a player';
  end if;
  if p_target_user_id = auth.uid() then
    raise exception 'Use leave_game_room to leave your own game';
  end if;

  delete from game_players where room_id = p_room_id and user_id = p_target_user_id;
end;
$$;

grant execute on function leave_game_room(uuid) to authenticated;
grant execute on function kick_player(uuid, uuid) to authenticated;

-- ============================================================================
-- Multiplayer Saving Peter (up to 4 players, video chat)
-- ============================================================================
-- Mirrors sql/001_game.sql + sql/005_everyone_answers.sql's Bible Trivia room
-- model (rooms/players/realtime/RPCs, mesh WebRTC signaling reused as-is via
-- useGameWebRTC.ts), but with its own scoring rule: each round shows one
-- word's clue, every seated player gets exactly one guess, ONLY the first
-- correct guess scores (+points for that difficulty tier) — everyone else's
-- correct-but-late guess scores nothing, and any wrong guess costs -points
-- (no floor — a score can go negative). First to reach target_score (50)
-- wins outright, mid-round.
--
-- Same trust model as Bible Trivia: the word bank lives in client-side static
-- data (src/data/savingPeterWords.ts). Rounds are referenced by id only
-- ("level:WORD", see buildSavingPeterRoundIds) so the actual answer is never
-- stored in a client-readable row; each client resolves the word from its own
-- local bundle and submits its own claim of correctness for its own guess —
-- not meant to resist a determined cheater editing requests in devtools, same
-- as Trivia's submit_answer().
--   psql "$SUPABASE_DB_URL" -f sql/011_saving_peter_multiplayer.sql
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists saving_peter_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  -- Ordered array of round ids ("level:WORD", src/data/savingPeterWords.ts) chosen at creation time.
  round_ids jsonb not null default '[]'::jsonb,
  current_round_index int not null default -1,
  current_round_started_at timestamptz,
  target_score int not null default 50,
  winner_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists saving_peter_players (
  room_id uuid not null references saving_peter_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists saving_peter_guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references saving_peter_rooms(id) on delete cascade,
  round_index int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  guess text not null,
  correct boolean not null default false,
  guessed_at timestamptz not null default now(),
  -- One guess per player per round.
  unique (room_id, round_index, user_id)
);

create table if not exists saving_peter_high_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  score int not null,
  room_id uuid references saving_peter_rooms(id) on delete set null,
  achieved_at timestamptz not null default now()
);

create index if not exists saving_peter_players_room_idx on saving_peter_players(room_id);
create index if not exists saving_peter_guesses_room_idx on saving_peter_guesses(room_id);
create index if not exists saving_peter_high_scores_score_idx on saving_peter_high_scores(score desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table saving_peter_rooms enable row level security;
alter table saving_peter_players enable row level security;
alter table saving_peter_guesses enable row level security;
alter table saving_peter_high_scores enable row level security;

create policy "members can view their saving peter room" on saving_peter_rooms
  for select
  using (
    auth.uid() = host_id
    or exists (select 1 from saving_peter_players sp where sp.room_id = saving_peter_rooms.id and sp.user_id = auth.uid())
  );

create policy "members can view their saving peter roster" on saving_peter_players
  for select
  using (
    user_id = auth.uid()
    or exists (select 1 from saving_peter_players sp2 where sp2.room_id = saving_peter_players.room_id and sp2.user_id = auth.uid())
  );

-- Guesses are readable by room members, but never insertable directly by a client — scoring happens
-- inside submit_saving_peter_guess() (SECURITY DEFINER) so a client can't fabricate a correct row.
create policy "members can view saving peter guesses in their room" on saving_peter_guesses
  for select
  using (exists (select 1 from saving_peter_players sp where sp.room_id = saving_peter_guesses.room_id and sp.user_id = auth.uid()));

create policy "saving peter high scores are public" on saving_peter_high_scores
  for select
  using (true);

grant select on saving_peter_rooms, saving_peter_players, saving_peter_guesses to authenticated;
grant select on saving_peter_high_scores to anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPCs
-- ----------------------------------------------------------------------------

create or replace function create_saving_peter_room(p_target_score int default 50, p_round_ids jsonb default '[]'::jsonb)
returns saving_peter_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_display_name text;
  v_room saving_peter_rooms;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to create a game';
  end if;

  select coalesce(display_name, email) into v_display_name from profiles where id = auth.uid();
  v_display_name := coalesce(v_display_name, 'Player');

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into saving_peter_rooms (code, host_id, target_score, round_ids)
      values (v_code, auth.uid(), coalesce(p_target_score, 50), coalesce(p_round_ids, '[]'::jsonb))
      returning * into v_room;
      exit;
    exception when unique_violation then
      -- Code collision — loop and try another one.
    end;
  end loop;

  insert into saving_peter_players (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), v_display_name);

  return v_room;
end;
$$;

-- Capped at 4 seated players (not Trivia's 8) — the game's own scoring (only the first correct guess
-- scores) and mesh WebRTC video are both built around a small table.
create or replace function join_saving_peter_room(p_code text)
returns saving_peter_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room saving_peter_rooms;
  v_display_name text;
  v_player_count int;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to join a game';
  end if;

  select * into v_room from saving_peter_rooms where code = upper(p_code);
  if v_room.id is null then
    raise exception 'No game found with that code';
  end if;

  select count(*) into v_player_count from saving_peter_players where room_id = v_room.id;
  if v_room.status <> 'lobby' and not exists (
    select 1 from saving_peter_players where room_id = v_room.id and user_id = auth.uid()
  ) then
    raise exception 'That game has already started';
  end if;
  if v_player_count >= 4 and not exists (
    select 1 from saving_peter_players where room_id = v_room.id and user_id = auth.uid()
  ) then
    raise exception 'This game room is full';
  end if;

  select coalesce(display_name, email) into v_display_name from profiles where id = auth.uid();
  v_display_name := coalesce(v_display_name, 'Player');

  insert into saving_peter_players (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), v_display_name)
  on conflict (room_id, user_id) do update set display_name = excluded.display_name;

  return v_room;
end;
$$;

create or replace function start_saving_peter_room(p_room_id uuid)
returns saving_peter_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room saving_peter_rooms;
begin
  select * into v_room from saving_peter_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.host_id <> auth.uid() then
    raise exception 'Only the host can start the game';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'Game already started';
  end if;
  if jsonb_array_length(v_room.round_ids) = 0 then
    raise exception 'No words loaded for this game';
  end if;

  update saving_peter_rooms
  set status = 'active', current_round_index = 0, current_round_started_at = now()
  where id = p_room_id
  returning * into v_room;

  return v_room;
end;
$$;

-- Scores the caller's own guess for p_round_index in one atomic step. p_correct is the caller's own
-- claim about their own guess (same trust model as Trivia's submit_answer). Only the FIRST correct
-- guess for a round (by DB-assigned guessed_at order) is awarded +p_points; a correct guess that
-- arrives after someone else already got it right scores 0; a wrong guess is always -p_points. If this
-- guess brings the caller's score to/above the room's target_score, the game ends immediately with
-- this caller as the winner — first past the post, no tie-break needed since only one guess can be the
-- one that crosses the line.
create or replace function submit_saving_peter_guess(
  p_room_id uuid,
  p_round_index int,
  p_guess text,
  p_correct boolean,
  p_points int
)
returns saving_peter_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room saving_peter_rooms;
  v_player saving_peter_players;
  v_my_guessed_at timestamptz;
  v_first_correct boolean;
  v_delta int;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to play';
  end if;

  select * into v_room from saving_peter_rooms where id = p_room_id;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.status <> 'active' or v_room.current_round_index <> p_round_index then
    raise exception 'This round is no longer active';
  end if;
  if not exists (select 1 from saving_peter_players where room_id = p_room_id and user_id = auth.uid()) then
    raise exception 'Not a player in this game';
  end if;

  -- Serializes concurrent guesses for the SAME round so two correct guesses landing at nearly the same
  -- instant can't both read "no earlier correct guess exists yet."
  perform pg_advisory_xact_lock(hashtext(p_room_id::text || ':' || p_round_index::text));

  insert into saving_peter_guesses (room_id, round_index, user_id, guess, correct)
  values (p_room_id, p_round_index, auth.uid(), p_guess, p_correct)
  returning guessed_at into v_my_guessed_at;

  if p_correct then
    select not exists (
      select 1 from saving_peter_guesses
      where room_id = p_room_id
        and round_index = p_round_index
        and correct = true
        and user_id <> auth.uid()
        and guessed_at < v_my_guessed_at
    ) into v_first_correct;
    v_delta := case when v_first_correct then p_points else 0 end;
  else
    v_delta := -p_points;
  end if;

  update saving_peter_players
  set score = score + v_delta
  where room_id = p_room_id and user_id = auth.uid()
  returning * into v_player;

  if v_player.score >= v_room.target_score then
    update saving_peter_rooms set status = 'finished', winner_id = auth.uid() where id = p_room_id;
    insert into saving_peter_high_scores (user_id, display_name, score, room_id)
    select user_id, display_name, score, p_room_id from saving_peter_players where room_id = p_room_id;
  end if;

  return v_player;
end;
$$;

-- Ends the current round (once every seated player has guessed, or its time window has elapsed) and
-- moves to the next word — or ends the game if there are no more prepared rounds left. No scoring here
-- — that's already done per-player by submit_saving_peter_guess(); this is purely "what's next." Safe
-- for multiple clients to call redundantly.
create or replace function check_and_advance_saving_peter(p_room_id uuid, p_round_index int)
returns saving_peter_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room saving_peter_rooms;
  v_seated_count int;
  v_guessed_count int;
  v_total_rounds int;
  v_next_index int;
begin
  select * into v_room from saving_peter_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.status <> 'active' or v_room.current_round_index <> p_round_index then
    return v_room; -- Already moved on (or the game already ended via a winning guess).
  end if;

  select count(*) into v_seated_count from saving_peter_players where room_id = p_room_id;
  select count(*) into v_guessed_count from saving_peter_guesses where room_id = p_room_id and round_index = p_round_index;

  if v_guessed_count < v_seated_count
     and (v_room.current_round_started_at is null or now() - v_room.current_round_started_at < interval '20 seconds')
  then
    raise exception 'Round still in progress';
  end if;

  v_total_rounds := jsonb_array_length(v_room.round_ids);
  v_next_index := p_round_index + 1;

  if v_next_index >= v_total_rounds then
    -- Ran out of prepared rounds without anyone reaching target_score — end the game anyway.
    insert into saving_peter_high_scores (user_id, display_name, score, room_id)
    select user_id, display_name, score, p_room_id from saving_peter_players where room_id = p_room_id;

    update saving_peter_rooms
    set current_round_index = v_next_index, status = 'finished'
    where id = p_room_id
    returning * into v_room;
    return v_room;
  end if;

  update saving_peter_rooms
  set current_round_index = v_next_index, current_round_started_at = now()
  where id = p_room_id
  returning * into v_room;

  return v_room;
end;
$$;

create or replace function leave_saving_peter_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room saving_peter_rooms;
  v_remaining_count int;
  v_new_host uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;

  select * into v_room from saving_peter_rooms where id = p_room_id for update;
  if v_room.id is null then
    return;
  end if;

  delete from saving_peter_players where room_id = p_room_id and user_id = auth.uid();

  select count(*) into v_remaining_count from saving_peter_players where room_id = p_room_id;
  if v_remaining_count = 0 then
    delete from saving_peter_rooms where id = p_room_id;
    return;
  end if;

  if v_room.host_id = auth.uid() then
    select user_id into v_new_host from saving_peter_players where room_id = p_room_id order by joined_at asc limit 1;
    update saving_peter_rooms set host_id = v_new_host where id = p_room_id;
  end if;
end;
$$;

create or replace function kick_saving_peter_player(p_room_id uuid, p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room saving_peter_rooms;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  select * into v_room from saving_peter_rooms where id = p_room_id;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.host_id <> auth.uid() then
    raise exception 'Only the host can remove a player';
  end if;
  if p_target_user_id = auth.uid() then
    raise exception 'Use leave_saving_peter_room to leave your own game';
  end if;

  delete from saving_peter_players where room_id = p_room_id and user_id = p_target_user_id;
end;
$$;

grant execute on function create_saving_peter_room(int, jsonb) to authenticated;
grant execute on function join_saving_peter_room(text) to authenticated;
grant execute on function start_saving_peter_room(uuid) to authenticated;
grant execute on function submit_saving_peter_guess(uuid, int, text, boolean, int) to authenticated;
grant execute on function check_and_advance_saving_peter(uuid, int) to authenticated;
grant execute on function leave_saving_peter_room(uuid) to authenticated;
grant execute on function kick_saving_peter_player(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime — without this, postgres_changes subscriptions never fire for
-- these tables (see sql/004_enable_realtime.sql for the Trivia equivalent).
-- ----------------------------------------------------------------------------

alter publication supabase_realtime add table saving_peter_rooms;
alter publication supabase_realtime add table saving_peter_players;
alter publication supabase_realtime add table saving_peter_guesses;

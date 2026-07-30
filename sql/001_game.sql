-- ============================================================================
-- Multiplayer Bible Trivia Game
-- ============================================================================
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/001_game.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- Trust model: quiz correctness can't be verified server-side (the answer key
-- lives in client-side static data, same as the rest of this app's content —
-- see src/data/*.ts). resolve_question() below only trusts the claim of the
-- specific player who won that question's buzz row (auth.uid() must match the
-- game_buzzes row they're resolving). That's enough to keep a casual family
-- game honest; it is not meant to resist a determined cheater editing
-- requests in devtools.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  -- Ordered array of QuizQuestion ids (src/data/gameQuestions.ts) chosen by the host at creation
  -- time — every client resolves the same ids against its own local copy of the question pool, so
  -- there's no need to store question content in Postgres at all.
  question_ids jsonb not null default '[]'::jsonb,
  current_question_index int not null default -1,
  current_question_started_at timestamptz,
  target_score int not null default 50,
  winner_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists game_players (
  room_id uuid not null references game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists game_buzzes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  question_index int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer_index int not null,
  buzzed_at timestamptz not null default now(),
  -- The buzzer mutex: Postgres accepts exactly one row per (room, question), so whichever player's
  -- insert lands first is authoritatively "who buzzed" — no edge function or extra locking needed.
  unique (room_id, question_index)
);

create table if not exists game_high_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  score int not null,
  room_id uuid references game_rooms(id) on delete set null,
  achieved_at timestamptz not null default now()
);

create index if not exists game_players_room_idx on game_players(room_id);
create index if not exists game_buzzes_room_idx on game_buzzes(room_id);
create index if not exists game_high_scores_score_idx on game_high_scores(score desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table game_rooms enable row level security;
alter table game_players enable row level security;
alter table game_buzzes enable row level security;
alter table game_high_scores enable row level security;

-- game_rooms: readable by the host and by anyone seated at the table. No direct insert/update
-- policy — rooms are only ever created/mutated through the SECURITY DEFINER functions below.
create policy "members can view their game room" on game_rooms
  for select
  using (
    auth.uid() = host_id
    or exists (select 1 from game_players gp where gp.room_id = game_rooms.id and gp.user_id = auth.uid())
  );

-- game_players: a player can see the full roster of any room they're seated in (self-referencing
-- "same group" check, same shape as this app's existing group_members visibility rules). No direct
-- insert/update policy — joining and scoring both go through SECURITY DEFINER functions.
create policy "members can view their room roster" on game_players
  for select
  using (
    user_id = auth.uid()
    or exists (select 1 from game_players gp2 where gp2.room_id = game_players.room_id and gp2.user_id = auth.uid())
  );

-- game_buzzes: readable by room members. Insertable directly by a player buzzing themselves in — the
-- unique constraint above is what actually enforces "first buzz wins," so this can be a plain client
-- insert rather than routed through a function.
create policy "members can view buzzes in their room" on game_buzzes
  for select
  using (exists (select 1 from game_players gp where gp.room_id = game_buzzes.room_id and gp.user_id = auth.uid()));

create policy "players can buzz themselves in" on game_buzzes
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from game_rooms r
      join game_players gp on gp.room_id = r.id and gp.user_id = auth.uid()
      where r.id = game_buzzes.room_id
        and r.status = 'active'
        and r.current_question_index = game_buzzes.question_index
    )
  );

-- game_high_scores: a public leaderboard — readable by anyone, including a logged-out visitor.
-- Insertable only through resolve_question()/force_advance() below.
create policy "high scores are public" on game_high_scores
  for select
  using (true);

grant usage on schema public to anon, authenticated;
grant select on game_rooms, game_players to authenticated;
grant select, insert on game_buzzes to authenticated;
grant select on game_high_scores to anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPCs
-- ----------------------------------------------------------------------------

-- Creates a room with a fresh short code (retrying on the rare collision), seats the host as the
-- first player, and stores the host-chosen question sequence. p_question_ids is produced client-side
-- by src/data/gameQuestions.ts (a shuffled, difficulty-mixed selection) — this function just persists
-- whatever it's given.
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

  select coalesce(display_name, email) into v_display_name from profiles where id = auth.uid();
  v_display_name := coalesce(v_display_name, 'Player');

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

  insert into game_players (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), v_display_name);

  return v_room;
end;
$$;

-- Looks a room up by its short code and seats the caller, unless the game has already started or
-- is full (capped at 8 — mesh WebRTC video degrades well past that).
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

  select coalesce(display_name, email) into v_display_name from profiles where id = auth.uid();
  v_display_name := coalesce(v_display_name, 'Player');

  insert into game_players (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), v_display_name)
  on conflict (room_id, user_id) do update set display_name = excluded.display_name;

  return v_room;
end;
$$;

-- Host-only: moves a lobby into its first question.
create or replace function start_game_room(p_room_id uuid)
returns game_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room game_rooms;
begin
  select * into v_room from game_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.host_id <> auth.uid() then
    raise exception 'Only the host can start the game';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'Game already started';
  end if;
  if jsonb_array_length(v_room.question_ids) = 0 then
    raise exception 'No questions loaded for this game';
  end if;

  update game_rooms
  set status = 'active', current_question_index = 0, current_question_started_at = now()
  where id = p_room_id
  returning * into v_room;

  return v_room;
end;
$$;

-- Called by whichever player's client currently holds the winning buzz for p_question_index (or by
-- anyone reporting "nobody buzzed in time" — p_correct = false with no matching buzz row is a no-op
-- score-wise). Awards points, checks the win condition, and advances to the next question —
-- everyone is guarded by the "current_question_index = p_question_index" check below, so a stray
-- duplicate/late call from a second client is a harmless no-op rather than a double-advance.
create or replace function resolve_question(
  p_room_id uuid,
  p_question_index int,
  p_correct boolean,
  p_points int
)
returns game_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room game_rooms;
  v_buzz game_buzzes;
  v_new_score int;
  v_next_index int;
  v_total_questions int;
  v_status text;
  v_winner uuid;
begin
  select * into v_room from game_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.current_question_index <> p_question_index then
    return v_room; -- Already advanced by someone else — no-op.
  end if;

  select * into v_buzz from game_buzzes
  where room_id = p_room_id and question_index = p_question_index;

  if v_buzz.id is not null and v_buzz.user_id <> auth.uid() then
    raise exception 'Only the player who buzzed in can resolve this question';
  end if;

  if p_correct and v_buzz.id is not null then
    update game_players
    set score = score + greatest(p_points, 0)
    where room_id = p_room_id and user_id = v_buzz.user_id
    returning score into v_new_score;

    if v_new_score >= v_room.target_score then
      v_status := 'finished';
      v_winner := v_buzz.user_id;
    end if;
  end if;

  v_total_questions := jsonb_array_length(v_room.question_ids);
  v_next_index := p_question_index + 1;
  if v_status is null and v_next_index >= v_total_questions then
    -- Ran out of prepared questions without anyone reaching target_score — end the game anyway
    -- rather than leaving it stuck with nothing left to ask.
    v_status := 'finished';
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

-- Safety valve: if the player who won a buzz vanishes (closed tab) before calling resolve_question,
-- any other seated player can force the game past a stuck question once it's been open a while.
create or replace function force_advance(p_room_id uuid, p_question_index int)
returns game_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room game_rooms;
  v_next_index int;
  v_total_questions int;
begin
  select * into v_room from game_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if not exists (select 1 from game_players where room_id = p_room_id and user_id = auth.uid()) then
    raise exception 'Not a player in this game';
  end if;
  if v_room.current_question_index <> p_question_index then
    return v_room; -- Already advanced.
  end if;
  if v_room.current_question_started_at is null
     or now() - v_room.current_question_started_at < interval '20 seconds' then
    raise exception 'Question still in progress';
  end if;

  v_total_questions := jsonb_array_length(v_room.question_ids);
  v_next_index := p_question_index + 1;

  if v_next_index >= v_total_questions then
    insert into game_high_scores (user_id, display_name, score, room_id)
    select user_id, display_name, score, p_room_id from game_players where room_id = p_room_id;

    update game_rooms
    set current_question_index = v_next_index, status = 'finished'
    where id = p_room_id
    returning * into v_room;
    return v_room;
  end if;

  update game_rooms
  set current_question_index = v_next_index, current_question_started_at = now()
  where id = p_room_id
  returning * into v_room;

  return v_room;
end;
$$;

grant execute on function create_game_room(int, jsonb) to authenticated;
grant execute on function join_game_room(text) to authenticated;
grant execute on function start_game_room(uuid) to authenticated;
grant execute on function resolve_question(uuid, int, boolean, int) to authenticated;
grant execute on function force_advance(uuid, int) to authenticated;

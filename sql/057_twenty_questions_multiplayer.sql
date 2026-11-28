-- ============================================================================
-- 057_twenty_questions_multiplayer.sql — 20 QUESTIONS, MULTIPLAYER (TAKE TURNS)
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand, the whole file in one go (it is one transaction):
--           psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/057_twenty_questions_multiplayer.sql
--         or paste the whole file into the Supabase project's SQL Editor.
--
-- NUMBERING: 056 is taken on branch `social-reenable`; 057 was free on every
--            branch on 2026-11-28. Depends only on `profiles` (baseline) and
--            auth.users. Does NOT depend on any unapplied migration. Adds no
--            function that takes a user id from the caller except
--            kick_twenty_q_player(), which is host-only (same as Saving Peter).
--
-- THE APP IS SAFE TO DEPLOY BEFORE THIS. The client asks
-- twenty_q_multiplayer_enabled() once per session; until this file is applied
-- that call fails (PGRST202, no such function), the app treats multiplayer as
-- absent and 20 Questions opens straight on its solo category screen, exactly
-- as it does today. Applying this file is what makes "Create multiplayer game"
-- and "Join multiplayer game" appear. No redeploy needed.
-- ============================================================================
--
-- ----------------------------------------------------------------------------
-- HOW IT PLAYS
-- ----------------------------------------------------------------------------
-- The host picks People, Places or Things. The DATABASE picks the secret (not
-- any player's device), from the same data the solo game uses. Players take
-- turns in the order they joined. On your turn you ask one question from the
-- list, make a guess, or pass. Everyone sees every question, its answer and who
-- asked. Twenty questions are shared by the room; a wrong guess also uses one
-- (otherwise a room could guess its way down the list for free). A pass, or a
-- turn that runs out its 60 seconds, uses nothing. The first right guess wins.
-- When all twenty are used, every seated player gets one final guess, in turn
-- order; if nobody is right the game ends and the answer is revealed.
-- Up to 6 players. A player may join a game already under way: they go to the
-- end of the rotation. If the player whose turn it is leaves or is removed, the
-- turn passes at once.
--
-- ----------------------------------------------------------------------------
-- HOW THE SECRET IS KEPT (the reason this needs a migration at all)
-- ----------------------------------------------------------------------------
-- Bible Trivia and Saving Peter keep their answers in the client bundle and let
-- each client claim its own correctness (sql/005, sql/011). That does not work
-- here: the whole game is one secret, and a room row holding it — even as an
-- id — is readable by every player in devtools.
--
-- So:
--   * create_twenty_q_room() receives the category's whole answer table (every
--     entry, and for each the questions answered Yes / Not stated — public data,
--     it is in every client's bundle) and picks ONE entry at random, IN THE
--     DATABASE. No client is ever told which.
--   * That entry's id and its answers go into twenty_q_secrets: RLS ON with NO
--     policy, every privilege revoked from anon and authenticated, and the table
--     is NOT in the realtime publication. Only the SECURITY DEFINER functions
--     below read it.
--   * Questions are answered and guesses judged inside those functions. The
--     client sends a question id or an entry id; it never sends "I was right".
--   * twenty_q_rooms.revealed_entry_id is NULL until the game is over, and is
--     the first moment the secret reaches a client.
--
-- What this does NOT defend against: a host who hand-crafts the create call
-- (e.g. sends a fake answer table) rigs only their own room's answers; they
-- still cannot read which entry was chosen. The function bounds the payload
-- and checks it is internally consistent; it cannot check it matches the
-- bundle, because the bundle is not in the database.
--
-- ----------------------------------------------------------------------------
-- WHAT IT ADDS
-- ----------------------------------------------------------------------------
--   tables     twenty_q_rooms, twenty_q_players, twenty_q_moves  (members read,
--              nobody writes directly) and twenty_q_secrets (nobody reads).
--   functions  twenty_q_multiplayer_enabled()           client probe, returns true
--              is_twenty_q_room_member(uuid)            RLS helper (sql/012 pattern)
--              create_twenty_q_room(text, jsonb, jsonb)
--              join_twenty_q_room(text)
--              start_twenty_q_room(uuid)
--              ask_twenty_q(uuid, text)
--              guess_twenty_q(uuid, text)
--              pass_twenty_q_turn(uuid, int)            own pass, or anyone after time-out
--              leave_twenty_q_room(uuid)
--              kick_twenty_q_player(uuid, uuid)         host only
--              twenty_q_advance(uuid)                   INTERNAL — no client may call it
--   realtime   the three readable tables (not the secrets).
--   Touches NO existing table, policy or function.
-- ============================================================================

begin;

-- gen_random_uuid() is core Postgres (13+); no extension needed.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists twenty_q_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  category text not null check (category in ('people', 'places', 'things')),
  question_limit int not null default 20,
  questions_used int not null default 0,
  -- Whose turn it is. turn_no goes up by one every time the turn moves; a pass or
  -- time-out names the turn_no it means, so two clients timing out the same turn
  -- move it once.
  turn_user_id uuid references auth.users(id) on delete set null,
  turn_joined_at timestamptz,
  turn_no int not null default 0,
  turn_started_at timestamptz,
  turn_seconds int not null default 60,
  -- Set when the 20th question is used: the seq of that move. Every move after
  -- it is somebody's one final guess (or their pass / time-out).
  final_from_seq int,
  winner_id uuid references auth.users(id) on delete set null,
  -- NULL until status = 'finished'. The only place a client ever learns the secret.
  revealed_entry_id text,
  created_at timestamptz not null default now()
);

create table if not exists twenty_q_players (
  room_id uuid not null references twenty_q_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  -- Questions this player asked (shown on their video tile).
  asked int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists twenty_q_moves (
  room_id uuid not null references twenty_q_rooms(id) on delete cascade,
  seq int not null,
  -- Kept as a plain id + name, not a foreign key: the history outlives a player
  -- leaving the room, and an account being deleted does not rewrite it.
  user_id uuid,
  display_name text not null,
  kind text not null check (kind in ('question', 'guess', 'pass', 'timeout')),
  -- Question id for 'question', entry id for 'guess', null otherwise.
  item_id text,
  answer text check (answer in ('yes', 'no', 'unknown')),
  created_at timestamptz not null default now(),
  primary key (room_id, seq)
);

create table if not exists twenty_q_secrets (
  room_id uuid primary key references twenty_q_rooms(id) on delete cascade,
  entry_id text not null,
  yes_ids text[] not null,
  unknown_ids text[] not null,
  -- The whole question list and guess list the room was created with, so an
  -- ask or a guess for something that is not in this game is refused.
  question_ids text[] not null,
  entry_ids text[] not null
);

create index if not exists twenty_q_players_room_idx on twenty_q_players(room_id);

-- ----------------------------------------------------------------------------
-- Privileges and Row Level Security
-- Supabase's default ACL grants ALL on new tables to anon and authenticated, so
-- take it all back first and grant only what each table needs.
-- ----------------------------------------------------------------------------

revoke all on twenty_q_rooms, twenty_q_players, twenty_q_moves, twenty_q_secrets from public, anon, authenticated;
grant select on twenty_q_rooms, twenty_q_players, twenty_q_moves to authenticated;

alter table twenty_q_rooms enable row level security;
alter table twenty_q_players enable row level security;
alter table twenty_q_moves enable row level security;
alter table twenty_q_secrets enable row level security;
-- twenty_q_secrets: RLS on, NO policy, no privileges. Nobody but the functions below.

create or replace function is_twenty_q_room_member(p_room_id uuid) returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from twenty_q_players where room_id = p_room_id and user_id = auth.uid());
$$;

drop policy if exists "members read their 20q room" on twenty_q_rooms;
create policy "members read their 20q room" on twenty_q_rooms
  for select to authenticated
  using (auth.uid() = host_id or is_twenty_q_room_member(id));

drop policy if exists "members read their 20q roster" on twenty_q_players;
create policy "members read their 20q roster" on twenty_q_players
  for select to authenticated
  using (user_id = auth.uid() or is_twenty_q_room_member(room_id));

drop policy if exists "members read their 20q moves" on twenty_q_moves;
create policy "members read their 20q moves" on twenty_q_moves
  for select to authenticated
  using (is_twenty_q_room_member(room_id));

-- ----------------------------------------------------------------------------
-- twenty_q_advance — INTERNAL. Moves the turn to the next player, or ends the
-- game when the final guesses are all made. Called only by the functions below
-- with the room row already locked.
-- Rotation: seated players ordered by (joined_at, user_id); the next one after
-- the current turn's (joined_at, user_id), wrapping. Uses the stored
-- turn_joined_at so it still works when the current player has just left.
-- ----------------------------------------------------------------------------
create or replace function twenty_q_advance(p_room_id uuid)
returns twenty_q_rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room twenty_q_rooms;
  v_next twenty_q_players;
begin
  select * into v_room from twenty_q_rooms where id = p_room_id;
  if v_room.id is null or v_room.status <> 'active' then
    return v_room;
  end if;

  select p.* into v_next
  from twenty_q_players p
  where p.room_id = p_room_id
    -- In the final round, only players who have not yet had their final turn.
    and (v_room.final_from_seq is null or not exists (
      select 1 from twenty_q_moves m
      where m.room_id = p_room_id and m.seq > v_room.final_from_seq and m.user_id = p.user_id
    ))
  order by
    -- After the current turn first, then wrap around to the start.
    case when v_room.turn_joined_at is null
           or (p.joined_at, p.user_id) > (v_room.turn_joined_at, coalesce(v_room.turn_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
         then 0 else 1 end,
    p.joined_at, p.user_id
  limit 1;

  if v_next.user_id is null then
    -- Nobody left to play: in the final round that means every final guess was
    -- wrong (or passed). Out of questions — reveal.
    update twenty_q_rooms
    set status = 'finished', turn_user_id = null, turn_started_at = null, turn_no = turn_no + 1,
        revealed_entry_id = (select entry_id from twenty_q_secrets where room_id = p_room_id)
    where id = p_room_id
    returning * into v_room;
    return v_room;
  end if;

  update twenty_q_rooms
  set turn_user_id = v_next.user_id, turn_joined_at = v_next.joined_at,
      turn_started_at = now(), turn_no = turn_no + 1
  where id = p_room_id
  returning * into v_room;
  return v_room;
end;
$$;

-- Internal helper: the next seq for a room's history (room row already locked).
create or replace function twenty_q_next_seq(p_room_id uuid)
returns int
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(max(seq), 0) + 1 from twenty_q_moves where room_id = p_room_id;
$$;

-- ----------------------------------------------------------------------------
-- Client-callable functions
-- ----------------------------------------------------------------------------

create or replace function twenty_q_multiplayer_enabled()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$ select true $$;

-- p_entries: [{"id": "moses", "yes": ["q1", ...], "unknown": ["q7", ...]}, ...] — every
-- entry in the category, with the questions answered Yes and Not stated for it
-- (everything else is No; data/twentyQuestions/index.ts answerFor()).
-- p_question_ids: ["q1", "q2", ...] — every question in the category.
create or replace function create_twenty_q_room(p_category text, p_entries jsonb, p_question_ids jsonb)
returns twenty_q_rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_display_name text;
  v_room twenty_q_rooms;
  v_question_ids text[];
  v_entry_ids text[];
  v_pick jsonb;
  v_yes text[];
  v_unknown text[];
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to create a game';
  end if;
  if p_category is null or p_category not in ('people', 'places', 'things') then
    raise exception 'Unknown category' using errcode = '22023';
  end if;
  if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_typeof(p_question_ids) is distinct from 'array' then
    raise exception 'Malformed game data' using errcode = '22023';
  end if;
  if jsonb_array_length(p_entries) not between 10 and 1000
     or jsonb_array_length(p_question_ids) not between 1 and 1000
     or pg_column_size(p_entries) > 1000000 then
    raise exception 'Malformed game data' using errcode = '22023';
  end if;

  select array_agg(q) into v_question_ids from jsonb_array_elements_text(p_question_ids) q;
  if (select count(distinct q) from unnest(v_question_ids) q) <> cardinality(v_question_ids)
     or exists (select 1 from unnest(v_question_ids) q where length(q) not between 1 and 100) then
    raise exception 'Malformed game data' using errcode = '22023';
  end if;

  if exists (select 1 from jsonb_array_elements(p_entries) e
             where jsonb_typeof(e) <> 'object'
                or jsonb_typeof(e->'id') <> 'string'
                or length(e->>'id') not between 1 and 100
                or jsonb_typeof(coalesce(e->'yes', '[]'::jsonb)) <> 'array'
                or jsonb_typeof(coalesce(e->'unknown', '[]'::jsonb)) <> 'array') then
    raise exception 'Malformed game data' using errcode = '22023';
  end if;
  select array_agg(e->>'id') into v_entry_ids from jsonb_array_elements(p_entries) e;
  if (select count(distinct x) from unnest(v_entry_ids) x) <> cardinality(v_entry_ids) then
    raise exception 'Malformed game data' using errcode = '22023';
  end if;
  -- Every Yes / Not stated must name a real question of this game.
  if exists (select 1 from jsonb_array_elements(p_entries) e,
                    jsonb_array_elements_text(coalesce(e->'yes', '[]'::jsonb) || coalesce(e->'unknown', '[]'::jsonb)) q
             where not (q = any (v_question_ids))) then
    raise exception 'Malformed game data' using errcode = '22023';
  end if;

  -- The secret: chosen here, by the database, never by a client.
  select e into v_pick from jsonb_array_elements(p_entries) e order by random() limit 1;
  select coalesce(array_agg(q), '{}') into v_yes from jsonb_array_elements_text(coalesce(v_pick->'yes', '[]'::jsonb)) q;
  select coalesce(array_agg(q), '{}') into v_unknown from jsonb_array_elements_text(coalesce(v_pick->'unknown', '[]'::jsonb)) q;

  select coalesce(display_name, email) into v_display_name from profiles where id = auth.uid();
  v_display_name := coalesce(v_display_name, 'Player');

  loop
    v_code := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into twenty_q_rooms (code, host_id, category)
      values (v_code, auth.uid(), p_category)
      returning * into v_room;
      exit;
    exception when unique_violation then
      -- Code collision — try another.
    end;
  end loop;

  insert into twenty_q_secrets (room_id, entry_id, yes_ids, unknown_ids, question_ids, entry_ids)
  values (v_room.id, v_pick->>'id', v_yes, v_unknown, v_question_ids, v_entry_ids);

  insert into twenty_q_players (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), v_display_name);

  return v_room;
end;
$$;

-- Seats the caller. Open in the lobby AND during a game (a late joiner goes to
-- the end of the rotation); closed once finished. Someone already seated keeps
-- their seat and their place in the rotation. Six seats.
create or replace function join_twenty_q_room(p_code text)
returns twenty_q_rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room twenty_q_rooms;
  v_display_name text;
  v_seated boolean;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to join a game';
  end if;

  select * into v_room from twenty_q_rooms where code = upper(trim(coalesce(p_code, ''))) for update;
  if v_room.id is null then
    raise exception 'No game found with that code';
  end if;

  v_seated := exists (select 1 from twenty_q_players where room_id = v_room.id and user_id = auth.uid());
  if not v_seated then
    if v_room.status = 'finished' then
      raise exception 'That game has already finished';
    end if;
    if (select count(*) from twenty_q_players where room_id = v_room.id) >= 6 then
      raise exception 'This game room is full';
    end if;
  end if;

  select coalesce(display_name, email) into v_display_name from profiles where id = auth.uid();
  v_display_name := coalesce(v_display_name, 'Player');

  insert into twenty_q_players (room_id, user_id, display_name)
  values (v_room.id, auth.uid(), v_display_name)
  on conflict (room_id, user_id) do update set display_name = excluded.display_name;

  return v_room;
end;
$$;

create or replace function start_twenty_q_room(p_room_id uuid)
returns twenty_q_rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room twenty_q_rooms;
begin
  select * into v_room from twenty_q_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.host_id is distinct from auth.uid() then
    raise exception 'Only the host can start the game';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'Game already started';
  end if;

  update twenty_q_rooms set status = 'active', turn_user_id = null, turn_joined_at = null
  where id = p_room_id;
  -- First turn: the earliest-joined player (turn_joined_at null = start of the order).
  return twenty_q_advance(p_room_id);
end;
$$;

create or replace function ask_twenty_q(p_room_id uuid, p_question_id text)
returns twenty_q_rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room twenty_q_rooms;
  v_secret twenty_q_secrets;
  v_answer text;
  v_seq int;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to play';
  end if;
  select * into v_room from twenty_q_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.status <> 'active' then
    raise exception 'This game is not in progress';
  end if;
  if v_room.turn_user_id is distinct from auth.uid() then
    raise exception 'It is not your turn';
  end if;
  if v_room.final_from_seq is not null or v_room.questions_used >= v_room.question_limit then
    raise exception 'No questions left — make your final guess';
  end if;

  select * into v_secret from twenty_q_secrets where room_id = p_room_id;
  if p_question_id is null or not (p_question_id = any (v_secret.question_ids)) then
    raise exception 'Unknown question' using errcode = '22023';
  end if;
  if exists (select 1 from twenty_q_moves where room_id = p_room_id and kind = 'question' and item_id = p_question_id) then
    raise exception 'That question has already been asked';
  end if;

  v_answer := case when p_question_id = any (v_secret.yes_ids) then 'yes'
                   when p_question_id = any (v_secret.unknown_ids) then 'unknown'
                   else 'no' end;
  select display_name into v_name from twenty_q_players where room_id = p_room_id and user_id = auth.uid();
  v_seq := twenty_q_next_seq(p_room_id);

  insert into twenty_q_moves (room_id, seq, user_id, display_name, kind, item_id, answer)
  values (p_room_id, v_seq, auth.uid(), coalesce(v_name, 'Player'), 'question', p_question_id, v_answer);
  update twenty_q_players set asked = asked + 1 where room_id = p_room_id and user_id = auth.uid();

  update twenty_q_rooms
  set questions_used = questions_used + 1,
      final_from_seq = case when questions_used + 1 >= question_limit then v_seq else final_from_seq end
  where id = p_room_id;

  return twenty_q_advance(p_room_id);
end;
$$;

create or replace function guess_twenty_q(p_room_id uuid, p_entry_id text)
returns twenty_q_rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room twenty_q_rooms;
  v_secret twenty_q_secrets;
  v_seq int;
  v_name text;
  v_right boolean;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to play';
  end if;
  select * into v_room from twenty_q_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.status <> 'active' then
    raise exception 'This game is not in progress';
  end if;
  if v_room.turn_user_id is distinct from auth.uid() then
    raise exception 'It is not your turn';
  end if;

  select * into v_secret from twenty_q_secrets where room_id = p_room_id;
  if p_entry_id is null or not (p_entry_id = any (v_secret.entry_ids)) then
    raise exception 'Unknown answer' using errcode = '22023';
  end if;
  if exists (select 1 from twenty_q_moves where room_id = p_room_id and kind = 'guess' and item_id = p_entry_id) then
    raise exception 'That has already been guessed';
  end if;

  v_right := p_entry_id = v_secret.entry_id;
  select display_name into v_name from twenty_q_players where room_id = p_room_id and user_id = auth.uid();
  v_seq := twenty_q_next_seq(p_room_id);

  insert into twenty_q_moves (room_id, seq, user_id, display_name, kind, item_id, answer)
  values (p_room_id, v_seq, auth.uid(), coalesce(v_name, 'Player'), 'guess', p_entry_id, case when v_right then 'yes' else 'no' end);

  if v_right then
    update twenty_q_rooms
    set status = 'finished', winner_id = auth.uid(), revealed_entry_id = v_secret.entry_id,
        turn_user_id = null, turn_started_at = null, turn_no = turn_no + 1
    where id = p_room_id
    returning * into v_room;
    return v_room;
  end if;

  -- A wrong guess uses one of the twenty (before the final round; in it, it is
  -- simply that player's final guess).
  if v_room.final_from_seq is null then
    update twenty_q_rooms
    set questions_used = questions_used + 1,
        final_from_seq = case when questions_used + 1 >= question_limit then v_seq else final_from_seq end
    where id = p_room_id;
  end if;

  return twenty_q_advance(p_room_id);
end;
$$;

-- Passes a turn. The player whose turn it is may pass at any time; anyone seated
-- may pass it for them once its time is up (that is how an absent player stops
-- stalling the room). p_turn_no is the turn the caller means, so a stale or
-- repeated call does nothing. Uses no question.
create or replace function pass_twenty_q_turn(p_room_id uuid, p_turn_no int)
returns twenty_q_rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room twenty_q_rooms;
  v_own boolean;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to play';
  end if;
  select * into v_room from twenty_q_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if not exists (select 1 from twenty_q_players where room_id = p_room_id and user_id = auth.uid()) then
    raise exception 'Not a player in this game';
  end if;
  if v_room.status <> 'active' or v_room.turn_no <> p_turn_no then
    return v_room; -- Already moved on.
  end if;

  v_own := v_room.turn_user_id = auth.uid();
  if not v_own and v_room.turn_user_id is not null
     and now() - v_room.turn_started_at < make_interval(secs => v_room.turn_seconds) then
    raise exception 'Turn still in progress';
  end if;

  if v_room.turn_user_id is not null then
    select display_name into v_name from twenty_q_players where room_id = p_room_id and user_id = v_room.turn_user_id;
    insert into twenty_q_moves (room_id, seq, user_id, display_name, kind)
    values (p_room_id, twenty_q_next_seq(p_room_id), v_room.turn_user_id, coalesce(v_name, 'Player'),
            case when v_own then 'pass' else 'timeout' end);
  end if;

  return twenty_q_advance(p_room_id);
end;
$$;

create or replace function leave_twenty_q_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room twenty_q_rooms;
  v_new_host uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  select * into v_room from twenty_q_rooms where id = p_room_id for update;
  if v_room.id is null then
    return;
  end if;

  delete from twenty_q_players where room_id = p_room_id and user_id = auth.uid();

  if not exists (select 1 from twenty_q_players where room_id = p_room_id) then
    delete from twenty_q_rooms where id = p_room_id;
    return;
  end if;

  if v_room.host_id = auth.uid() then
    select user_id into v_new_host from twenty_q_players where room_id = p_room_id order by joined_at, user_id limit 1;
    update twenty_q_rooms set host_id = v_new_host where id = p_room_id;
  end if;

  -- Their turn passes at once; in the final round, leaving may also mean
  -- everyone left has had their final guess.
  if v_room.status = 'active' and (v_room.turn_user_id = auth.uid() or v_room.final_from_seq is not null) then
    if v_room.turn_user_id = auth.uid() then
      perform twenty_q_advance(p_room_id);
    elsif not exists (
      select 1 from twenty_q_players p where p.room_id = p_room_id
        and not exists (select 1 from twenty_q_moves m where m.room_id = p_room_id and m.seq > v_room.final_from_seq and m.user_id = p.user_id)
    ) then
      perform twenty_q_advance(p_room_id);
    end if;
  end if;
end;
$$;

create or replace function kick_twenty_q_player(p_room_id uuid, p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room twenty_q_rooms;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  select * into v_room from twenty_q_rooms where id = p_room_id for update;
  if v_room.id is null then
    raise exception 'Game not found';
  end if;
  if v_room.host_id is distinct from auth.uid() then
    raise exception 'Only the host can remove a player';
  end if;
  if p_target_user_id = auth.uid() then
    raise exception 'Use leave_twenty_q_room to leave your own game';
  end if;

  delete from twenty_q_players where room_id = p_room_id and user_id = p_target_user_id;

  if v_room.status = 'active' and v_room.turn_user_id = p_target_user_id then
    perform twenty_q_advance(p_room_id);
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Function privileges. Postgres grants EXECUTE to PUBLIC on every new function,
-- and Supabase's default ACL adds anon and authenticated. Revoke all of it, then
-- grant the client-callable ones to signed-in users only.
-- ----------------------------------------------------------------------------

revoke all on function twenty_q_advance(uuid) from public, anon, authenticated;
revoke all on function twenty_q_next_seq(uuid) from public, anon, authenticated;
revoke all on function twenty_q_multiplayer_enabled() from public, anon;
revoke all on function is_twenty_q_room_member(uuid) from public, anon;
revoke all on function create_twenty_q_room(text, jsonb, jsonb) from public, anon;
revoke all on function join_twenty_q_room(text) from public, anon;
revoke all on function start_twenty_q_room(uuid) from public, anon;
revoke all on function ask_twenty_q(uuid, text) from public, anon;
revoke all on function guess_twenty_q(uuid, text) from public, anon;
revoke all on function pass_twenty_q_turn(uuid, int) from public, anon;
revoke all on function leave_twenty_q_room(uuid) from public, anon;
revoke all on function kick_twenty_q_player(uuid, uuid) from public, anon;

grant execute on function twenty_q_multiplayer_enabled() to authenticated;
grant execute on function is_twenty_q_room_member(uuid) to authenticated;
grant execute on function create_twenty_q_room(text, jsonb, jsonb) to authenticated;
grant execute on function join_twenty_q_room(text) to authenticated;
grant execute on function start_twenty_q_room(uuid) to authenticated;
grant execute on function ask_twenty_q(uuid, text) to authenticated;
grant execute on function guess_twenty_q(uuid, text) to authenticated;
grant execute on function pass_twenty_q_turn(uuid, int) to authenticated;
grant execute on function leave_twenty_q_room(uuid) to authenticated;
grant execute on function kick_twenty_q_player(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime — the three readable tables. NOT twenty_q_secrets.
-- ----------------------------------------------------------------------------

-- Guarded so the file can be run twice (ADD TABLE errors on a table already in it).
do $$
declare
  t text;
begin
  foreach t in array array['twenty_q_rooms', 'twenty_q_players', 'twenty_q_moves'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

commit;

-- ============================================================================
-- VERIFY — after applying, read-only:
--   select count(*) from pg_tables where tablename like 'twenty_q_%';                     -- 4
--   select relname, relrowsecurity from pg_class where relname like 'twenty_q_%' and relkind = 'r';  -- all true
--   select count(*) from pg_policies where tablename = 'twenty_q_secrets';                -- 0
--   select has_table_privilege('authenticated', 'twenty_q_secrets', 'select');            -- false
--   select has_table_privilege('anon', 'twenty_q_rooms', 'select');                       -- false
--   select has_function_privilege('authenticated', 'twenty_q_advance(uuid)', 'execute');  -- false
--   select has_function_privilege('anon', 'create_twenty_q_room(text,jsonb,jsonb)', 'execute'); -- false
--   select has_function_privilege('authenticated', 'twenty_q_multiplayer_enabled()', 'execute'); -- true
--   select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename like 'twenty_q_%';
--       -- twenty_q_rooms, twenty_q_players, twenty_q_moves (NOT twenty_q_secrets)
-- Then in the app: 20 Questions shows Play solo / Create / Join; two accounts
-- play a game; neither can `select * from twenty_q_secrets` from the browser.
--
-- Rehearsal (PGlite, no server): scripts/sql-rehearsal/057_twenty_questions_multiplayer.mjs
--
-- ============================================================================
-- ROLLBACK — removes everything above. Rooms in progress are lost (they are
-- throwaway game state; no other table refers to them). Run as one block:
-- ============================================================================
--      begin;
--      alter publication supabase_realtime drop table twenty_q_moves;
--      alter publication supabase_realtime drop table twenty_q_players;
--      alter publication supabase_realtime drop table twenty_q_rooms;
--      drop function if exists kick_twenty_q_player(uuid, uuid);
--      drop function if exists leave_twenty_q_room(uuid);
--      drop function if exists pass_twenty_q_turn(uuid, int);
--      drop function if exists guess_twenty_q(uuid, text);
--      drop function if exists ask_twenty_q(uuid, text);
--      drop function if exists start_twenty_q_room(uuid);
--      drop function if exists join_twenty_q_room(text);
--      drop function if exists create_twenty_q_room(text, jsonb, jsonb);
--      drop function if exists twenty_q_multiplayer_enabled();
--      drop function if exists twenty_q_advance(uuid);
--      drop function if exists twenty_q_next_seq(uuid);
--      drop table if exists twenty_q_secrets;
--      drop table if exists twenty_q_moves;
--      drop table if exists twenty_q_players;
--      drop table if exists twenty_q_rooms;
--      drop function if exists is_twenty_q_room_member(uuid);
--      commit;
-- After it the app goes back to solo-only on its own: the probe function is
-- gone, so twenty_q_multiplayer_enabled() fails and nothing is offered. A player
-- seated in a room at that moment sees "Couldn't load this game" and Back.
-- ============================================================================

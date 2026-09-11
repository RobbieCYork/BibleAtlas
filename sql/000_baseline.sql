-- ############################################################################
-- #                                                                          #
-- #   000_baseline.sql — DOCUMENTATION ONLY.  *** NEVER RUN THIS FILE. ***    #
-- #                                                                          #
-- ############################################################################
--
-- THIS IS NOT A MIGRATION. It is a photograph of the LIVE PRODUCTION database,
-- taken so that the next person writing a migration can read the constraints,
-- indexes, foreign keys and RLS policies they have to compose with.
--
-- RUNNING IT WOULD BE CATASTROPHIC. It is full of bare `create table`,
-- `create policy` and `CREATE OR REPLACE FUNCTION` statements reconstructed
-- from pg_catalog. Against production every `create table` errors on an object
-- that already exists, and `CREATE OR REPLACE FUNCTION` does NOT error — it
-- silently overwrites live functions, so a partial run would leave the schema
-- in a state matching neither this file nor any numbered migration. Against an
-- empty database it would produce a lookalike whose objects were never created
-- in dependency order. There is no situation in which executing this file is
-- the right move. It is documentation. Read it; do not apply it.
--
-- The number 000 is deliberate: it sorts ABOVE 001 so nobody mistakes it for
-- the next free migration. The next free number is at the bottom of this header.
--
-- ---------------------------------------------------------------------------
-- GENERATED
-- ---------------------------------------------------------------------------
--   from      : the live capstonebible.com production database (host redacted)
--   on        : 2026-09-11T04:06 UTC  (2026-09-10 22:06 America/Boise)
--   server    : PostgreSQL 17.6
--   contains  : schema only — ZERO rows of application data were read or written.
--               No credentials, no connection string, no user data.
--
-- REGENERATE (read-only; issues nothing but SELECTs against pg_catalog):
--
--   cd capstone-bible
--   npm i --no-save pg
--   node scripts/schema-baseline/dump-schema.mjs
--
--   It reads SUPABASE_DB_URL from .env.local. There is no psql or pg_dump on
--   the project machine, which is why this is a Node script and not
--   `pg_dump --schema-only`. Do not paste the connection string anywhere.
--
-- ---------------------------------------------------------------------------
-- WHAT IS IN THE REPO AND WHAT IS NOT  <- THE POINT OF THIS FILE
-- ---------------------------------------------------------------------------
--
-- sql/ is append-only and numbered, but it does not start at the beginning.
-- A large part of this schema was created by hand in the Supabase SQL editor
-- before sql/ existed, and has no `create table` anywhere in the repo. That is
-- how this project earned a Postgres 42P17 (infinite recursion in policy) — a
-- migration was written against policies nobody could read. See sql/003 and
-- sql/012, both named "fix_rls_recursion".
--
-- TABLES CREATED BY A NUMBERED MIGRATION (26) — reproducible from sql/:
--   analytics_events             sql/019
--   analytics_sessions           sql/019
--   app_settings                 sql/025
--   content_hides                sql/028
--   game_buzzes                  sql/001
--   game_high_scores             sql/001
--   game_players                 sql/001
--   game_rooms                   sql/001
--   moderation_actions           sql/028
--   moderation_reasons           sql/028
--   moderation_reports           sql/028
--   post_comments                sql/008
--   posts                        sql/008
--   profile_links                sql/017
--   reading_plan_progress        sql/018
--   report_categories            sql/025
--   report_status_audit          sql/025
--   report_votes                 sql/025
--   reports                      sql/025
--   role_audit                   sql/025
--   saving_peter_guesses         sql/011
--   saving_peter_high_scores     sql/011
--   saving_peter_players         sql/011
--   saving_peter_rooms           sql/011
--   user_blocks                  sql/028
--   user_roles                   sql/025
--
-- TABLES WITH **NO** `create table` ANYWHERE IN sql/ (18) — HAND-MADE IN THE
-- DASHBOARD. This file is the ONLY description of their shape that exists:
--   admin_users_legacy           NOTHING in sql/ touches it at all
--   chapter_reads                NOTHING in sql/ touches it at all
--   friend_requests              later altered by sql/028
--   group_join_requests          NOTHING in sql/ touches it at all
--   group_members                NOTHING in sql/ touches it at all
--   group_message_reads          NOTHING in sql/ touches it at all
--   group_messages               later altered by sql/023,028
--   groups                       later altered by sql/014
--   highlights                   later altered by sql/016
--   messages                     later altered by sql/023,028
--   note_comments                later altered by sql/028
--   notes                        later altered by sql/028
--   profiles                     later altered by sql/009,010,013,028
--   reading_progress             NOTHING in sql/ touches it at all
--   reading_time_daily           NOTHING in sql/ touches it at all
--   sermon_notes                 NOTHING in sql/ touches it at all
--   tags                         NOTHING in sql/ touches it at all
--   verse_tags                   NOTHING in sql/ touches it at all
--
-- FUNCTIONS WITH **NO** `create function` ANYWHERE IN sql/ (18) — same story.
-- Note that this includes the entire groups RPC layer and the auth trigger:
--   add_group_member
--   count_pending_group_join_requests
--   count_unread_group_messages
--   create_group
--   handle_new_user
--   increment_reading_time
--   is_display_name_available
--   is_friend
--   is_group_admin
--   is_group_member
--   pin_group_message
--   pin_message
--   reading_seconds_this_month
--   request_to_join_group
--   respond_to_join_request
--   set_group_admin
--   unpin_group_message
--   unpin_message
--
-- ---------------------------------------------------------------------------
-- MIGRATIONS PRESENT IN sql/ AS OF 2026-09-11
-- ---------------------------------------------------------------------------
--   001 002 003 004 005 007 008 009 010 011 012 013 014 015 016 017 018 019 021 022 023 024 025 026 027 028 030 031 032
--
--   Gaps are history, not free slots. 006, 020 and 029 are absent from sql/ on
--   main and must NOT be reused. 029_account_deletion_fk_hygiene.sql exists on
--   the unmerged `account-deletion` branch and is NOT on main.
--
--   COMMITTED IS NOT APPLIED. Verified against production on the date above:
--     027 sermon-note images   NOT APPLIED  (no `sermon-note-images` bucket exists)
--     028 moderation           APPLIED      (user_blocks + the *_block_filter policies are live)
--     029 account-deletion FK  NOT APPLIED  (and not on main; both winner_id FKs are still NO ACTION)
--     030 post-media           APPLIED      (the scoped storage select policy is live)
--     031 avatars              APPLIED      (owner-only avatar select policy is live)
--     032 search-respects-blocks APPLIED    (the three find_* functions call is_blocked_between)
--
--   NEXT FREE MIGRATION NUMBER: 033.
--   Do not reuse 006, 020 or 029.
--
-- ---------------------------------------------------------------------------
-- COUNTS AT TIME OF DUMP
-- ---------------------------------------------------------------------------
--   tables 44 | rls policies 108 | functions 88 | views 1
--   triggers 7 | sequences 3 | enums 0 | domains 0
--   tables with RLS disabled: 0
--
-- ############################################################################

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- pg_stat_statements 1.11  (schema: extensions)
-- pgcrypto 1.3  (schema: extensions)
-- plpgsql 1.0  (schema: pg_catalog)
-- supabase_vault 0.3.1  (schema: vault)
-- uuid-ossp 1.1  (schema: extensions)

-- ============================================================================
-- TYPES IN public
-- ============================================================================
-- (none: no enums, no domains)

-- ============================================================================
-- TABLES IN public  (44)
-- ============================================================================

-- --------------------------------------------------------------------------
-- TABLE  public.admin_users_legacy
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.admin_users_legacy (
  user_id uuid not null,
  granted_at timestamp with time zone default now() not null,
  note text,
  constraint admin_users_pkey PRIMARY KEY (user_id),
  constraint admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
-- constraint-backed indexes: admin_users_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.admin_users_legacy enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "admin_users_select_self" on public.admin_users_legacy
  as permissive for select to PUBLIC
  using (user_id = auth.uid())
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.analytics_events
-- origin: sql/019
-- --------------------------------------------------------------------------
create table public.analytics_events (
  id bigint generated always as identity not null,
  user_id uuid,
  session_id uuid not null,
  event text not null,
  props jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint analytics_events_pkey PRIMARY KEY (id),
  constraint analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint analytics_events_event_check CHECK (event ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$'::text AND length(event) <= 64),
  constraint analytics_events_props_check CHECK (pg_column_size(props) <= 512)
);

-- indexes
CREATE INDEX analytics_events_created_idx ON public.analytics_events USING btree (created_at DESC);
CREATE INDEX analytics_events_event_idx ON public.analytics_events USING btree (event, created_at DESC);
CREATE INDEX analytics_events_user_idx ON public.analytics_events USING btree (user_id, created_at DESC);
-- constraint-backed indexes: analytics_events_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.analytics_events enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "analytics_events_admin_read" on public.analytics_events
  as permissive for select to PUBLIC
  using (is_admin())
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.analytics_sessions
-- origin: sql/019
-- --------------------------------------------------------------------------
create table public.analytics_sessions (
  id uuid not null,
  user_id uuid,
  is_anonymous boolean default false not null,
  started_at timestamp with time zone default now() not null,
  last_seen_at timestamp with time zone default now() not null,
  event_count integer default 0 not null,
  constraint analytics_sessions_pkey PRIMARY KEY (id),
  constraint analytics_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- indexes
CREATE INDEX analytics_sessions_started_idx ON public.analytics_sessions USING btree (started_at DESC);
CREATE INDEX analytics_sessions_user_idx ON public.analytics_sessions USING btree (user_id, last_seen_at DESC);
-- constraint-backed indexes: analytics_sessions_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.analytics_sessions enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "analytics_sessions_admin_read" on public.analytics_sessions
  as permissive for select to PUBLIC
  using (is_admin())
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.app_settings
-- origin: sql/025
-- --------------------------------------------------------------------------
create table public.app_settings (
  key text not null,
  value jsonb not null,
  updated_at timestamp with time zone default now() not null,
  updated_by uuid,
  constraint app_settings_pkey PRIMARY KEY (key),
  constraint app_settings_key_check CHECK (key ~ '^[a-z][a-z0-9_.]{1,79}$'::text),
  constraint app_settings_value_check CHECK (pg_column_size(value) <= 1024)
);
-- constraint-backed indexes: app_settings_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.app_settings enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "app_settings_select_staff" on public.app_settings
  as permissive for select to PUBLIC
  using (has_role_at_least('administrator'::text))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.chapter_reads
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.chapter_reads (
  user_id uuid not null,
  book text not null,
  chapter integer not null,
  read_at timestamp with time zone default now() not null,
  constraint chapter_reads_pkey PRIMARY KEY (user_id, book, chapter),
  constraint chapter_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
-- constraint-backed indexes: chapter_reads_pkey

-- RLS: ENABLED  |  policies: 3
alter table public.chapter_reads enable row level security;
-- no update policy: those writes are only possible through a SECURITY DEFINER function.
create policy "delete own chapter_reads" on public.chapter_reads
  as permissive for delete to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "insert own chapter_reads" on public.chapter_reads
  as permissive for insert to PUBLIC
  with check (auth.uid() = user_id)
  ;
create policy "select own or friends chapter_reads" on public.chapter_reads
  as permissive for select to PUBLIC
  using (auth.uid() = user_id OR is_friend(user_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.content_hides
-- origin: sql/028
-- --------------------------------------------------------------------------
create table public.content_hides (
  user_id uuid not null,
  target_kind text not null,
  target_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint content_hides_pkey PRIMARY KEY (user_id, target_kind, target_id),
  constraint content_hides_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint content_hides_target_kind_check CHECK (target_kind = ANY (ARRAY['post'::text, 'post_comment'::text, 'note'::text, 'note_comment'::text]))
);
-- constraint-backed indexes: content_hides_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.content_hides enable row level security;
create policy "content_hides_all_own" on public.content_hides
  as permissive for all to PUBLIC
  using (user_id = auth.uid())
  with check (user_id = auth.uid())
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.friend_requests
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Later altered by sql/028.
-- --------------------------------------------------------------------------
create table public.friend_requests (
  id uuid default gen_random_uuid() not null,
  sender_id uuid not null,
  receiver_id uuid not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  responded_at timestamp with time zone,
  constraint friend_requests_pkey PRIMARY KEY (id),
  constraint friend_requests_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint friend_requests_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint friend_requests_check CHECK (sender_id <> receiver_id),
  constraint friend_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]))
);

-- indexes
CREATE UNIQUE INDEX friend_requests_unique_pair ON public.friend_requests USING btree (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)) WHERE (status = ANY (ARRAY['pending'::text, 'accepted'::text]));
-- constraint-backed indexes: friend_requests_pkey

-- RLS: ENABLED  |  policies: 6
alter table public.friend_requests enable row level security;
create policy "friend_requests_block_filter" on public.friend_requests
  as restrictive for select to PUBLIC
  using (NOT is_blocked_between(auth.uid(), sender_id) AND NOT is_blocked_between(auth.uid(), receiver_id))
  ;
create policy "friend_requests_block_insert" on public.friend_requests
  as restrictive for insert to PUBLIC
  with check (NOT is_blocked_between(sender_id, receiver_id))
  ;
create policy "friend_requests_delete_participant" on public.friend_requests
  as permissive for delete to PUBLIC
  using (auth.uid() = sender_id OR auth.uid() = receiver_id)
  ;
create policy "friend_requests_insert_own" on public.friend_requests
  as permissive for insert to PUBLIC
  with check (auth.uid() = sender_id AND COALESCE((auth.jwt() ->> 'is_anonymous'::text)::boolean, false) = false)
  ;
create policy "friend_requests_select_own" on public.friend_requests
  as permissive for select to PUBLIC
  using (auth.uid() = sender_id OR auth.uid() = receiver_id)
  ;
create policy "friend_requests_update_receiver" on public.friend_requests
  as permissive for update to PUBLIC
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.game_buzzes
-- origin: sql/001
-- --------------------------------------------------------------------------
create table public.game_buzzes (
  id uuid default gen_random_uuid() not null,
  room_id uuid not null,
  question_index integer not null,
  user_id uuid not null,
  answer_index integer not null,
  buzzed_at timestamp with time zone default now() not null,
  correct boolean default false not null,
  constraint game_buzzes_pkey PRIMARY KEY (id),
  constraint game_buzzes_room_id_question_index_user_id_key UNIQUE (room_id, question_index, user_id),
  constraint game_buzzes_room_id_fkey FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
  constraint game_buzzes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX game_buzzes_room_idx ON public.game_buzzes USING btree (room_id);
-- constraint-backed indexes: game_buzzes_pkey, game_buzzes_room_id_question_index_user_id_key

-- RLS: ENABLED  |  policies: 1
alter table public.game_buzzes enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "members can view buzzes in their room" on public.game_buzzes
  as permissive for select to PUBLIC
  using (is_game_room_member(room_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.game_high_scores
-- origin: sql/001
-- --------------------------------------------------------------------------
create table public.game_high_scores (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  display_name text not null,
  score integer not null,
  room_id uuid,
  achieved_at timestamp with time zone default now() not null,
  constraint game_high_scores_pkey PRIMARY KEY (id),
  constraint game_high_scores_room_id_fkey FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE SET NULL,
  constraint game_high_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX game_high_scores_score_idx ON public.game_high_scores USING btree (score DESC);
-- constraint-backed indexes: game_high_scores_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.game_high_scores enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "high scores are public" on public.game_high_scores
  as permissive for select to PUBLIC
  using (true)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.game_players
-- origin: sql/001
-- --------------------------------------------------------------------------
create table public.game_players (
  room_id uuid not null,
  user_id uuid not null,
  display_name text not null,
  score integer default 0 not null,
  joined_at timestamp with time zone default now() not null,
  constraint game_players_pkey PRIMARY KEY (room_id, user_id),
  constraint game_players_room_id_fkey FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
  constraint game_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX game_players_room_idx ON public.game_players USING btree (room_id);
-- constraint-backed indexes: game_players_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.game_players enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "members can view their room roster" on public.game_players
  as permissive for select to PUBLIC
  using (user_id = auth.uid() OR is_game_room_member(room_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.game_rooms
-- origin: sql/001
-- --------------------------------------------------------------------------
create table public.game_rooms (
  id uuid default gen_random_uuid() not null,
  code text not null,
  host_id uuid not null,
  status text default 'lobby'::text not null,
  question_ids jsonb default '[]'::jsonb not null,
  current_question_index integer default '-1'::integer not null,
  current_question_started_at timestamp with time zone,
  target_score integer default 50 not null,
  winner_id uuid,
  created_at timestamp with time zone default now() not null,
  constraint game_rooms_pkey PRIMARY KEY (id),
  constraint game_rooms_code_key UNIQUE (code),
  constraint game_rooms_host_id_fkey FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint game_rooms_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES auth.users(id),
  constraint game_rooms_status_check CHECK (status = ANY (ARRAY['lobby'::text, 'active'::text, 'finished'::text]))
);
-- constraint-backed indexes: game_rooms_code_key, game_rooms_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.game_rooms enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "members can view their game room" on public.game_rooms
  as permissive for select to PUBLIC
  using (auth.uid() = host_id OR is_game_room_member(id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.group_join_requests
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.group_join_requests (
  id uuid default gen_random_uuid() not null,
  group_id uuid not null,
  user_id uuid not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  responded_at timestamp with time zone,
  constraint group_join_requests_pkey PRIMARY KEY (id),
  constraint group_join_requests_group_id_user_id_key UNIQUE (group_id, user_id),
  constraint group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  constraint group_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint group_join_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text]))
);
-- constraint-backed indexes: group_join_requests_group_id_user_id_key, group_join_requests_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.group_join_requests enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "group_join_requests_select" on public.group_join_requests
  as permissive for select to PUBLIC
  using (user_id = auth.uid() OR is_group_admin(group_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.group_members
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.group_members (
  group_id uuid not null,
  user_id uuid not null,
  role text default 'member'::text not null,
  joined_at timestamp with time zone default now() not null,
  constraint group_members_pkey PRIMARY KEY (group_id, user_id),
  constraint group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  constraint group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint group_members_role_check CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))
);
-- constraint-backed indexes: group_members_pkey

-- RLS: ENABLED  |  policies: 2
alter table public.group_members enable row level security;
-- no insert/update policy: those writes are only possible through a SECURITY DEFINER function.
create policy "group_members_delete_self_or_admin" on public.group_members
  as permissive for delete to PUBLIC
  using (user_id = auth.uid() OR role = 'member'::text AND is_group_admin(group_id))
  ;
create policy "group_members_select_member" on public.group_members
  as permissive for select to PUBLIC
  using (is_group_member(group_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.group_message_reads
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.group_message_reads (
  group_id uuid not null,
  user_id uuid not null,
  last_read_at timestamp with time zone default now() not null,
  constraint group_message_reads_pkey PRIMARY KEY (group_id, user_id),
  constraint group_message_reads_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  constraint group_message_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
-- constraint-backed indexes: group_message_reads_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.group_message_reads enable row level security;
create policy "group_message_reads_own" on public.group_message_reads
  as permissive for all to PUBLIC
  using (user_id = auth.uid())
  with check (user_id = auth.uid() AND is_group_member(group_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.group_messages
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Later altered by sql/023,028.
-- --------------------------------------------------------------------------
create table public.group_messages (
  id uuid default gen_random_uuid() not null,
  group_id uuid not null,
  sender_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null,
  pinned boolean default false not null,
  constraint group_messages_pkey PRIMARY KEY (id),
  constraint group_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  constraint group_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint group_messages_body_check CHECK (char_length(body) >= 1 AND char_length(body) <= 4000)
);

-- indexes
CREATE INDEX group_messages_group_idx ON public.group_messages USING btree (group_id, created_at);
CREATE UNIQUE INDEX group_messages_one_pin_per_group ON public.group_messages USING btree (group_id) WHERE pinned;
-- constraint-backed indexes: group_messages_pkey

-- RLS: ENABLED  |  policies: 4
alter table public.group_messages enable row level security;
-- no update policy: those writes are only possible through a SECURITY DEFINER function.
create policy "group_messages_block_filter" on public.group_messages
  as restrictive for select to PUBLIC
  using (NOT is_blocked_between(auth.uid(), sender_id))
  ;
create policy "group_messages_delete_sender_or_admin" on public.group_messages
  as permissive for delete to PUBLIC
  using (sender_id = auth.uid() OR is_group_admin(group_id))
  ;
create policy "group_messages_insert_member" on public.group_messages
  as permissive for insert to PUBLIC
  with check (sender_id = auth.uid() AND COALESCE((auth.jwt() ->> 'is_anonymous'::text)::boolean, false) = false AND is_group_member(group_id))
  ;
create policy "group_messages_select_member" on public.group_messages
  as permissive for select to PUBLIC
  using (is_group_member(group_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.groups
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Later altered by sql/014.
-- --------------------------------------------------------------------------
create table public.groups (
  id uuid default gen_random_uuid() not null,
  name text not null,
  description text,
  created_by uuid not null,
  created_at timestamp with time zone default now() not null,
  is_public boolean default false not null,
  constraint groups_pkey PRIMARY KEY (id),
  constraint groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint groups_description_check CHECK (description IS NULL OR char_length(description) <= 300),
  constraint groups_name_check CHECK (char_length(name) >= 1 AND char_length(name) <= 80)
);
-- constraint-backed indexes: groups_pkey

-- RLS: ENABLED  |  policies: 3
alter table public.groups enable row level security;
-- no insert policy: those writes are only possible through a SECURITY DEFINER function.
create policy "groups_delete_owner" on public.groups
  as permissive for delete to PUBLIC
  using ((EXISTS ( SELECT 1
   FROM group_members
  WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role = 'owner'::text)))
  ;
create policy "groups_select_member" on public.groups
  as permissive for select to PUBLIC
  using (is_group_member(id))
  ;
create policy "groups_update_admin" on public.groups
  as permissive for update to PUBLIC
  using (is_group_admin(id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.highlights
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Later altered by sql/016.
-- --------------------------------------------------------------------------
create table public.highlights (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  book text not null,
  chapter integer not null,
  start_verse integer not null,
  translation text not null,
  start_offset integer not null,
  end_offset integer not null,
  color text default 'yellow'::text not null,
  created_at timestamp with time zone default now() not null,
  end_verse integer not null,
  constraint highlights_pkey PRIMARY KEY (id),
  constraint highlights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX highlights_lookup ON public.highlights USING btree (user_id, book, chapter, translation);
-- constraint-backed indexes: highlights_pkey

-- RLS: ENABLED  |  policies: 4
alter table public.highlights enable row level security;
create policy "delete own highlights" on public.highlights
  as permissive for delete to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "insert own highlights" on public.highlights
  as permissive for insert to PUBLIC
  with check (auth.uid() = user_id)
  ;
create policy "select own highlights" on public.highlights
  as permissive for select to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "update own highlights" on public.highlights
  as permissive for update to PUBLIC
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.messages
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Later altered by sql/023,028.
-- --------------------------------------------------------------------------
create table public.messages (
  id uuid default gen_random_uuid() not null,
  sender_id uuid not null,
  receiver_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null,
  read_at timestamp with time zone,
  pinned boolean default false not null,
  constraint messages_pkey PRIMARY KEY (id),
  constraint messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint messages_body_check CHECK (char_length(body) >= 1 AND char_length(body) <= 4000),
  constraint messages_check CHECK (sender_id <> receiver_id)
);

-- indexes
CREATE INDEX messages_conversation_idx ON public.messages USING btree (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at);
CREATE UNIQUE INDEX messages_one_pin_per_conversation ON public.messages USING btree (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)) WHERE pinned;
-- constraint-backed indexes: messages_pkey

-- RLS: ENABLED  |  policies: 6
alter table public.messages enable row level security;
create policy "messages_block_filter" on public.messages
  as restrictive for select to PUBLIC
  using (NOT is_blocked_between(auth.uid(), sender_id) AND NOT is_blocked_between(auth.uid(), receiver_id))
  ;
create policy "messages_block_insert" on public.messages
  as restrictive for insert to PUBLIC
  with check (NOT is_blocked_between(sender_id, receiver_id))
  ;
create policy "messages_delete_sender" on public.messages
  as permissive for delete to PUBLIC
  using (sender_id = auth.uid())
  ;
create policy "messages_insert_friends_only" on public.messages
  as permissive for insert to PUBLIC
  with check (auth.uid() = sender_id AND COALESCE((auth.jwt() ->> 'is_anonymous'::text)::boolean, false) = false AND (EXISTS ( SELECT 1
   FROM friend_requests fr
  WHERE fr.status = 'accepted'::text AND (fr.sender_id = auth.uid() AND fr.receiver_id = messages.receiver_id OR fr.receiver_id = auth.uid() AND fr.sender_id = messages.receiver_id))))
  ;
create policy "messages_select_participant" on public.messages
  as permissive for select to PUBLIC
  using (auth.uid() = sender_id OR auth.uid() = receiver_id)
  ;
create policy "messages_update_mark_read" on public.messages
  as permissive for update to PUBLIC
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.moderation_actions
-- origin: sql/028
-- --------------------------------------------------------------------------
create table public.moderation_actions (
  id uuid default gen_random_uuid() not null,
  report_id uuid,
  actor_id uuid,
  actor_name text,
  target_kind text,
  target_id uuid,
  target_owner_id uuid,
  action text not null,
  old_status text,
  new_status text,
  note text,
  created_at timestamp with time zone default now() not null,
  constraint moderation_actions_pkey PRIMARY KEY (id)
);

-- indexes
CREATE INDEX moderation_actions_created_idx ON public.moderation_actions USING btree (created_at DESC);
CREATE INDEX moderation_actions_report_idx ON public.moderation_actions USING btree (report_id, created_at DESC);
-- constraint-backed indexes: moderation_actions_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.moderation_actions enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "moderation_actions_select_admin" on public.moderation_actions
  as permissive for select to PUBLIC
  using (has_role_at_least('administrator'::text))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.moderation_reasons
-- origin: sql/028
-- --------------------------------------------------------------------------
create table public.moderation_reasons (
  key text not null,
  label text not null,
  description text,
  sort_order integer default 100 not null,
  is_active boolean default true not null,
  constraint moderation_reasons_pkey PRIMARY KEY (key)
);
-- constraint-backed indexes: moderation_reasons_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.moderation_reasons enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "moderation_reasons_select_all" on public.moderation_reasons
  as permissive for select to PUBLIC
  using (true)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.moderation_reports
-- origin: sql/028
-- --------------------------------------------------------------------------
create table public.moderation_reports (
  id uuid default gen_random_uuid() not null,
  reporter_id uuid not null,
  target_kind text not null,
  target_id uuid not null,
  target_owner_id uuid,
  reason text not null,
  details text,
  content_excerpt text,
  context_label text,
  status text default 'new'::text not null,
  action_taken text,
  resolution_note text,
  handled_by uuid,
  handled_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint moderation_reports_pkey PRIMARY KEY (id),
  constraint moderation_reports_one_per_target UNIQUE (reporter_id, target_kind, target_id),
  constraint moderation_reports_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint moderation_reports_reason_fkey FOREIGN KEY (reason) REFERENCES moderation_reasons(key),
  constraint moderation_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint moderation_reports_action_taken_check CHECK (action_taken IS NULL OR (action_taken = ANY (ARRAY['none'::text, 'content_removed'::text, 'note_unpublished'::text, 'user_warned'::text, 'referred'::text]))),
  constraint moderation_reports_content_excerpt_check CHECK (content_excerpt IS NULL OR length(content_excerpt) <= 1000),
  constraint moderation_reports_context_label_check CHECK (context_label IS NULL OR length(context_label) <= 200),
  constraint moderation_reports_details_check CHECK (details IS NULL OR length(details) <= 4000),
  constraint moderation_reports_not_self CHECK (target_owner_id IS NULL OR target_owner_id <> reporter_id),
  constraint moderation_reports_resolution_note_check CHECK (resolution_note IS NULL OR length(resolution_note) <= 2000),
  constraint moderation_reports_status_check CHECK (status = ANY (ARRAY['new'::text, 'reviewing'::text, 'actioned'::text, 'dismissed'::text])),
  constraint moderation_reports_target_kind_check CHECK (target_kind = ANY (ARRAY['post'::text, 'post_comment'::text, 'note'::text, 'note_comment'::text, 'message'::text, 'group_message'::text, 'profile'::text]))
);

-- indexes
CREATE INDEX moderation_reports_open_idx ON public.moderation_reports USING btree (created_at DESC) WHERE (status = ANY (ARRAY['new'::text, 'reviewing'::text]));
CREATE INDEX moderation_reports_owner_idx ON public.moderation_reports USING btree (target_owner_id, created_at DESC);
CREATE INDEX moderation_reports_reporter_idx ON public.moderation_reports USING btree (reporter_id, created_at DESC);
CREATE INDEX moderation_reports_status_idx ON public.moderation_reports USING btree (status, created_at DESC);
CREATE INDEX moderation_reports_target_idx ON public.moderation_reports USING btree (target_kind, target_id);
-- constraint-backed indexes: moderation_reports_one_per_target, moderation_reports_pkey

-- RLS: ENABLED  |  policies: 2
alter table public.moderation_reports enable row level security;
-- no update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "moderation_reports_insert_own" on public.moderation_reports
  as permissive for insert to PUBLIC
  with check (reporter_id = auth.uid() AND target_owner_id IS NOT NULL AND target_owner_id = moderation_target_owner(target_kind, target_id) AND status = 'new'::text AND action_taken IS NULL AND resolution_note IS NULL AND handled_by IS NULL AND handled_at IS NULL)
  ;
create policy "moderation_reports_select_admin" on public.moderation_reports
  as permissive for select to PUBLIC
  using (has_role_at_least('administrator'::text))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.note_comments
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Later altered by sql/028.
-- --------------------------------------------------------------------------
create table public.note_comments (
  id uuid default gen_random_uuid() not null,
  note_id uuid not null,
  author_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null,
  constraint note_comments_pkey PRIMARY KEY (id),
  constraint note_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint note_comments_note_id_fkey FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX note_comments_note_id_idx ON public.note_comments USING btree (note_id);
-- constraint-backed indexes: note_comments_pkey

-- RLS: ENABLED  |  policies: 5
alter table public.note_comments enable row level security;
-- no update policy: those writes are only possible through a SECURITY DEFINER function.
create policy "delete own comment or as note owner" on public.note_comments
  as permissive for delete to PUBLIC
  using (author_id = auth.uid() OR (EXISTS ( SELECT 1
   FROM notes n
  WHERE n.id = note_comments.note_id AND n.user_id = auth.uid())))
  ;
create policy "insert comments on visible notes" on public.note_comments
  as permissive for insert to PUBLIC
  with check (author_id = auth.uid() AND (EXISTS ( SELECT 1
   FROM notes n
  WHERE n.id = note_comments.note_id AND (n.user_id = auth.uid() OR n.is_public AND is_friend(n.user_id)))))
  ;
create policy "note_comments_block_filter" on public.note_comments
  as restrictive for select to PUBLIC
  using (NOT is_blocked_between(auth.uid(), author_id))
  ;
create policy "note_comments_block_insert" on public.note_comments
  as restrictive for insert to PUBLIC
  with check (NOT is_blocked_between(auth.uid(), unfiltered_content_owner('note'::text, note_id)))
  ;
create policy "select comments on visible notes" on public.note_comments
  as permissive for select to PUBLIC
  using ((EXISTS ( SELECT 1
   FROM notes n
  WHERE n.id = note_comments.note_id AND (n.user_id = auth.uid() OR n.is_public AND is_friend(n.user_id)))))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.notes
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Later altered by sql/028.
-- --------------------------------------------------------------------------
create table public.notes (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  book text not null,
  chapter integer not null,
  start_verse integer not null,
  translation text not null,
  quoted_text text,
  note_text text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  end_verse integer not null,
  quoted_start_offset integer,
  quoted_end_offset integer,
  is_public boolean default false not null,
  constraint notes_pkey PRIMARY KEY (id),
  constraint notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX notes_lookup ON public.notes USING btree (user_id, book, chapter, start_verse);
-- constraint-backed indexes: notes_pkey

-- RLS: ENABLED  |  policies: 6
alter table public.notes enable row level security;
create policy "delete own notes" on public.notes
  as permissive for delete to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "insert own notes" on public.notes
  as permissive for insert to PUBLIC
  with check (auth.uid() = user_id)
  ;
create policy "notes_block_filter" on public.notes
  as restrictive for select to PUBLIC
  using (NOT is_blocked_between(auth.uid(), user_id))
  ;
create policy "select own notes" on public.notes
  as permissive for select to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "select public notes from friends" on public.notes
  as permissive for select to PUBLIC
  using (is_public = true AND is_friend(user_id))
  ;
create policy "update own notes" on public.notes
  as permissive for update to PUBLIC
  using (auth.uid() = user_id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.post_comments
-- origin: sql/008
-- --------------------------------------------------------------------------
create table public.post_comments (
  id uuid default gen_random_uuid() not null,
  post_id uuid not null,
  author_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null,
  constraint post_comments_pkey PRIMARY KEY (id),
  constraint post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
-- constraint-backed indexes: post_comments_pkey

-- RLS: ENABLED  |  policies: 5
alter table public.post_comments enable row level security;
-- no update policy: those writes are only possible through a SECURITY DEFINER function.
create policy "anyone who can see the post can comment on it" on public.post_comments
  as permissive for insert to PUBLIC
  with check (author_id = auth.uid() AND (EXISTS ( SELECT 1
   FROM posts p
  WHERE p.id = post_comments.post_id AND (p.user_id = auth.uid() OR p.is_public AND (EXISTS ( SELECT 1
           FROM friend_requests fr
          WHERE fr.status = 'accepted'::text AND (fr.sender_id = auth.uid() AND fr.receiver_id = p.user_id OR fr.receiver_id = auth.uid() AND fr.sender_id = p.user_id)))))))
  ;
create policy "anyone who can see the post can view its comments" on public.post_comments
  as permissive for select to PUBLIC
  using ((EXISTS ( SELECT 1
   FROM posts p
  WHERE p.id = post_comments.post_id AND (p.user_id = auth.uid() OR p.is_public AND (EXISTS ( SELECT 1
           FROM friend_requests fr
          WHERE fr.status = 'accepted'::text AND (fr.sender_id = auth.uid() AND fr.receiver_id = p.user_id OR fr.receiver_id = auth.uid() AND fr.sender_id = p.user_id)))))))
  ;
create policy "delete own comment or as post owner" on public.post_comments
  as permissive for delete to PUBLIC
  using (author_id = auth.uid() OR (EXISTS ( SELECT 1
   FROM posts p
  WHERE p.id = post_comments.post_id AND p.user_id = auth.uid())))
  ;
create policy "post_comments_block_filter" on public.post_comments
  as restrictive for select to PUBLIC
  using (NOT is_blocked_between(auth.uid(), author_id))
  ;
create policy "post_comments_block_insert" on public.post_comments
  as restrictive for insert to PUBLIC
  with check (NOT is_blocked_between(auth.uid(), unfiltered_content_owner('post'::text, post_id)))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.posts
-- origin: sql/008
-- --------------------------------------------------------------------------
create table public.posts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  body text not null,
  image_urls text[] default '{}'::text[] not null,
  video_url text,
  tagged_user_ids uuid[] default '{}'::uuid[] not null,
  is_public boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint posts_pkey PRIMARY KEY (id),
  constraint posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
-- constraint-backed indexes: posts_pkey

-- RLS: ENABLED  |  policies: 5
alter table public.posts enable row level security;
create policy "owner can delete their own posts" on public.posts
  as permissive for delete to PUBLIC
  using (user_id = auth.uid())
  ;
create policy "owner can insert their own posts" on public.posts
  as permissive for insert to PUBLIC
  with check (user_id = auth.uid())
  ;
create policy "owner can update their own posts" on public.posts
  as permissive for update to PUBLIC
  using (user_id = auth.uid())
  with check (user_id = auth.uid())
  ;
create policy "owner or accepted friend can view public posts" on public.posts
  as permissive for select to PUBLIC
  using (user_id = auth.uid() OR is_public AND (EXISTS ( SELECT 1
   FROM friend_requests fr
  WHERE fr.status = 'accepted'::text AND (fr.sender_id = auth.uid() AND fr.receiver_id = posts.user_id OR fr.receiver_id = auth.uid() AND fr.sender_id = posts.user_id))))
  ;
create policy "posts_block_filter" on public.posts
  as restrictive for select to PUBLIC
  using (NOT is_blocked_between(auth.uid(), user_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.profile_links
-- origin: sql/017
-- --------------------------------------------------------------------------
create table public.profile_links (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  platform text not null,
  url text not null,
  visibility text default 'private'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_links_pkey PRIMARY KEY (id),
  constraint profile_links_user_id_platform_key UNIQUE (user_id, platform),
  constraint profile_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint profile_links_platform_check CHECK (platform = ANY (ARRAY['website'::text, 'instagram'::text, 'facebook'::text, 'x'::text, 'youtube'::text, 'tiktok'::text, 'linkedin'::text])),
  constraint profile_links_url_check CHECK (url ~* '^https?://[^\s]+$'::text AND length(url) <= 500),
  constraint profile_links_visibility_check CHECK (visibility = ANY (ARRAY['private'::text, 'friends'::text, 'public'::text]))
);

-- indexes
CREATE INDEX profile_links_user_idx ON public.profile_links USING btree (user_id);
-- constraint-backed indexes: profile_links_pkey, profile_links_user_id_platform_key

-- triggers
CREATE TRIGGER profile_links_updated_at BEFORE UPDATE ON profile_links FOR EACH ROW EXECUTE FUNCTION profile_links_touch_updated_at();

-- RLS: ENABLED  |  policies: 4
alter table public.profile_links enable row level security;
create policy "owner can delete their own links" on public.profile_links
  as permissive for delete to PUBLIC
  using (user_id = auth.uid())
  ;
create policy "owner can insert their own links" on public.profile_links
  as permissive for insert to PUBLIC
  with check (user_id = auth.uid())
  ;
create policy "owner can update their own links" on public.profile_links
  as permissive for update to PUBLIC
  using (user_id = auth.uid())
  with check (user_id = auth.uid())
  ;
create policy "owner sees all their links, others only what visibility permits" on public.profile_links
  as permissive for select to PUBLIC
  using (user_id = auth.uid() OR visibility = 'public'::text OR visibility = 'friends'::text AND (EXISTS ( SELECT 1
   FROM friend_requests fr
  WHERE fr.status = 'accepted'::text AND (fr.sender_id = auth.uid() AND fr.receiver_id = profile_links.user_id OR fr.receiver_id = auth.uid() AND fr.sender_id = profile_links.user_id))))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.profiles
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Later altered by sql/009,010,013,028.
-- --------------------------------------------------------------------------
create table public.profiles (
  id uuid not null,
  email text,
  created_at timestamp with time zone default now() not null,
  phone text,
  display_name text,
  avatar_url text,
  church text,
  favorite_verse text,
  bio text,
  chapter_read_reset text default 'never'::text not null,
  location text,
  birthday date,
  relationship_status text,
  hobbies text,
  work_experience text,
  education text,
  favorite_band text,
  favorite_song text,
  favorite_tv_shows text,
  favorite_movies text,
  favorite_team_football text,
  favorite_team_basketball text,
  favorite_team_baseball text,
  favorite_team_hockey text,
  favorite_team_soccer text,
  profile_visibility jsonb default '{}'::jsonb not null,
  discoverable_by_name boolean default false not null,
  church_website text,
  constraint profiles_pkey PRIMARY KEY (id),
  constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint profiles_chapter_read_reset_check CHECK (chapter_read_reset = ANY (ARRAY['never'::text, 'monthly'::text, 'yearly'::text]))
);

-- indexes
CREATE UNIQUE INDEX profiles_display_name_unique ON public.profiles USING btree (lower(display_name)) WHERE (display_name IS NOT NULL);
CREATE UNIQUE INDEX profiles_phone_unique ON public.profiles USING btree (phone) WHERE (phone IS NOT NULL);
-- constraint-backed indexes: profiles_pkey

-- RLS: ENABLED  |  policies: 3
alter table public.profiles enable row level security;
-- no insert/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "profiles_block_filter" on public.profiles
  as restrictive for select to PUBLIC
  using (NOT is_blocked_between(auth.uid(), id))
  ;
create policy "profiles_select_own_or_related" on public.profiles
  as permissive for select to PUBLIC
  using (auth.uid() = id OR (EXISTS ( SELECT 1
   FROM friend_requests fr
  WHERE fr.sender_id = auth.uid() AND fr.receiver_id = profiles.id OR fr.receiver_id = auth.uid() AND fr.sender_id = profiles.id)))
  ;
create policy "profiles_update_own" on public.profiles
  as permissive for update to PUBLIC
  using (auth.uid() = id)
  with check (auth.uid() = id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.reading_plan_progress
-- origin: sql/018
-- --------------------------------------------------------------------------
create table public.reading_plan_progress (
  user_id uuid not null,
  plan_id text not null,
  day_number integer not null,
  completed_at timestamp with time zone default now() not null,
  constraint reading_plan_progress_pkey PRIMARY KEY (user_id, plan_id, day_number),
  constraint reading_plan_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint reading_plan_progress_day_number_check CHECK (day_number >= 1),
  constraint reading_plan_progress_plan_id_check CHECK (length(plan_id) >= 1 AND length(plan_id) <= 100)
);
-- constraint-backed indexes: reading_plan_progress_pkey

-- RLS: ENABLED  |  policies: 4
alter table public.reading_plan_progress enable row level security;
create policy "readers can erase their own plan progress" on public.reading_plan_progress
  as permissive for delete to PUBLIC
  using (user_id = auth.uid())
  ;
create policy "readers can record their own plan progress" on public.reading_plan_progress
  as permissive for insert to PUBLIC
  with check (user_id = auth.uid())
  ;
create policy "readers can update their own plan progress" on public.reading_plan_progress
  as permissive for update to PUBLIC
  using (user_id = auth.uid())
  with check (user_id = auth.uid())
  ;
create policy "readers see only their own plan progress" on public.reading_plan_progress
  as permissive for select to PUBLIC
  using (user_id = auth.uid())
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.reading_progress
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.reading_progress (
  user_id uuid not null,
  book text not null,
  chapter integer not null,
  translation text default 'asv'::text not null,
  updated_at timestamp with time zone default now() not null,
  constraint reading_progress_pkey PRIMARY KEY (user_id),
  constraint reading_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
-- constraint-backed indexes: reading_progress_pkey

-- RLS: ENABLED  |  policies: 3
alter table public.reading_progress enable row level security;
-- no delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "insert own progress" on public.reading_progress
  as permissive for insert to PUBLIC
  with check (auth.uid() = user_id)
  ;
create policy "select own progress" on public.reading_progress
  as permissive for select to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "update own progress" on public.reading_progress
  as permissive for update to PUBLIC
  using (auth.uid() = user_id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.reading_time_daily
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.reading_time_daily (
  user_id uuid not null,
  day date not null,
  seconds integer default 0 not null,
  constraint reading_time_daily_pkey PRIMARY KEY (user_id, day),
  constraint reading_time_daily_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
-- constraint-backed indexes: reading_time_daily_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.reading_time_daily enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "select own or friends reading_time" on public.reading_time_daily
  as permissive for select to PUBLIC
  using (auth.uid() = user_id OR is_friend(user_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.report_categories
-- origin: sql/025
-- --------------------------------------------------------------------------
create table public.report_categories (
  key text not null,
  label text not null,
  description text,
  sort_order integer default 100 not null,
  is_active boolean default true not null,
  constraint report_categories_pkey PRIMARY KEY (key),
  constraint report_categories_description_check CHECK (description IS NULL OR length(description) <= 300),
  constraint report_categories_key_check CHECK (key ~ '^[a-z][a-z0-9_]{1,39}$'::text),
  constraint report_categories_label_check CHECK (length(btrim(label)) >= 1 AND length(btrim(label)) <= 80)
);
-- constraint-backed indexes: report_categories_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.report_categories enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "report_categories_select_all" on public.report_categories
  as permissive for select to PUBLIC
  using (true)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.report_status_audit
-- origin: sql/025
-- --------------------------------------------------------------------------
create table public.report_status_audit (
  id bigint generated always as identity not null,
  report_id uuid not null,
  actor_id uuid,
  old_status text,
  new_status text,
  note text,
  created_at timestamp with time zone default now() not null,
  constraint report_status_audit_pkey PRIMARY KEY (id),
  constraint report_status_audit_report_id_fkey FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX report_status_audit_report_idx ON public.report_status_audit USING btree (report_id, created_at DESC);
-- constraint-backed indexes: report_status_audit_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.report_status_audit enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "report_status_audit_select_staff" on public.report_status_audit
  as permissive for select to PUBLIC
  using (has_role_at_least('advisor'::text))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.report_votes
-- origin: sql/025
-- --------------------------------------------------------------------------
create table public.report_votes (
  report_id uuid not null,
  voter_id uuid not null,
  vote smallint not null,
  note text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint report_votes_pkey PRIMARY KEY (report_id, voter_id),
  constraint report_votes_report_id_fkey FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  constraint report_votes_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint report_votes_note_check CHECK (note IS NULL OR length(note) <= 2000),
  constraint report_votes_vote_check CHECK (vote = ANY (ARRAY['-1'::integer, 1]))
);

-- indexes
CREATE INDEX report_votes_voter_idx ON public.report_votes USING btree (voter_id, updated_at DESC);
-- constraint-backed indexes: report_votes_pkey

-- triggers
CREATE TRIGGER report_votes_after_change_trg AFTER INSERT OR DELETE OR UPDATE ON report_votes FOR EACH ROW EXECUTE FUNCTION report_votes_after_change();
CREATE TRIGGER report_votes_before_write_trg BEFORE INSERT OR UPDATE ON report_votes FOR EACH ROW EXECUTE FUNCTION report_votes_before_write();

-- RLS: ENABLED  |  policies: 4
alter table public.report_votes enable row level security;
create policy "report_votes_delete_own" on public.report_votes
  as permissive for delete to PUBLIC
  using (voter_id = auth.uid() AND has_role_at_least('advisor'::text))
  ;
create policy "report_votes_insert_own" on public.report_votes
  as permissive for insert to PUBLIC
  with check (voter_id = auth.uid() AND has_role_at_least('advisor'::text))
  ;
create policy "report_votes_select_advisor" on public.report_votes
  as permissive for select to PUBLIC
  using (has_role_at_least('advisor'::text))
  ;
create policy "report_votes_update_own" on public.report_votes
  as permissive for update to PUBLIC
  using (voter_id = auth.uid() AND has_role_at_least('advisor'::text))
  with check (voter_id = auth.uid() AND has_role_at_least('advisor'::text))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.reports
-- origin: sql/025
-- --------------------------------------------------------------------------
create table public.reports (
  id uuid default gen_random_uuid() not null,
  reporter_id uuid not null,
  category text not null,
  title text not null,
  body text not null,
  reporter_severity text,
  page_url text,
  route text,
  page_title text,
  target_kind text,
  target_id text,
  target_label text,
  selected_text text,
  build_id text,
  user_agent text,
  viewport_w integer,
  viewport_h integer,
  platform text,
  app_context jsonb default '{}'::jsonb not null,
  status text default 'new'::text not null,
  duplicate_of uuid,
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  triaged_at timestamp with time zone,
  assigned_to uuid,
  vote_agree integer default 0 not null,
  vote_disagree integer default 0 not null,
  priority_score numeric default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint reports_pkey PRIMARY KEY (id),
  constraint reports_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint reports_category_fkey FOREIGN KEY (category) REFERENCES report_categories(key),
  constraint reports_duplicate_of_fkey FOREIGN KEY (duplicate_of) REFERENCES reports(id) ON DELETE SET NULL,
  constraint reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint reports_app_context_check CHECK (pg_column_size(app_context) <= 2048),
  constraint reports_body_check CHECK (length(btrim(body)) >= 1 AND length(btrim(body)) <= 8000),
  constraint reports_build_id_check CHECK (build_id IS NULL OR length(build_id) <= 64),
  constraint reports_duplicate_needs_target CHECK (status <> 'duplicate'::text OR duplicate_of IS NOT NULL),
  constraint reports_not_own_duplicate CHECK (duplicate_of IS NULL OR duplicate_of <> id),
  constraint reports_page_title_check CHECK (page_title IS NULL OR length(page_title) <= 300),
  constraint reports_page_url_check CHECK (page_url IS NULL OR length(page_url) <= 2048),
  constraint reports_platform_check CHECK (platform IS NULL OR length(platform) <= 120),
  constraint reports_reporter_severity_check CHECK (reporter_severity IS NULL OR (reporter_severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
  constraint reports_resolution_note_check CHECK (resolution_note IS NULL OR length(resolution_note) <= 4000),
  constraint reports_route_check CHECK (route IS NULL OR length(route) <= 200),
  constraint reports_selected_text_check CHECK (selected_text IS NULL OR length(selected_text) <= 4000),
  constraint reports_status_check CHECK (status = ANY (ARRAY['new'::text, 'triaged'::text, 'accepted'::text, 'in_progress'::text, 'resolved'::text, 'declined'::text, 'duplicate'::text])),
  constraint reports_target_id_check CHECK (target_id IS NULL OR length(target_id) <= 200),
  constraint reports_target_kind_check CHECK (target_kind IS NULL OR (target_kind = ANY (ARRAY['article'::text, 'poi'::text, 'timeline_event'::text, 'person'::text, 'topic'::text, 'reading_plan'::text, 'scripture'::text, 'game'::text, 'profile'::text, 'other'::text]))),
  constraint reports_target_label_check CHECK (target_label IS NULL OR length(target_label) <= 300),
  constraint reports_title_check CHECK (length(btrim(title)) >= 3 AND length(btrim(title)) <= 200),
  constraint reports_user_agent_check CHECK (user_agent IS NULL OR length(user_agent) <= 512),
  constraint reports_viewport_h_check CHECK (viewport_h IS NULL OR viewport_h >= 0 AND viewport_h <= 20000),
  constraint reports_viewport_w_check CHECK (viewport_w IS NULL OR viewport_w >= 0 AND viewport_w <= 20000)
);

-- indexes
CREATE INDEX reports_category_idx ON public.reports USING btree (category, created_at DESC);
CREATE INDEX reports_duplicate_idx ON public.reports USING btree (duplicate_of) WHERE (duplicate_of IS NOT NULL);
CREATE INDEX reports_open_priority_idx ON public.reports USING btree (priority_score DESC, created_at DESC) WHERE (status = ANY (ARRAY['new'::text, 'triaged'::text, 'accepted'::text, 'in_progress'::text]));
CREATE INDEX reports_reporter_idx ON public.reports USING btree (reporter_id, created_at DESC);
CREATE INDEX reports_status_priority_idx ON public.reports USING btree (status, priority_score DESC, created_at DESC);
CREATE INDEX reports_target_idx ON public.reports USING btree (target_kind, target_id) WHERE (target_id IS NOT NULL);
-- constraint-backed indexes: reports_pkey

-- triggers
CREATE TRIGGER reports_audit_status_trg AFTER UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION reports_audit_status();
CREATE TRIGGER reports_before_insert_trg BEFORE INSERT ON reports FOR EACH ROW EXECUTE FUNCTION reports_before_insert();
CREATE TRIGGER reports_before_update_trg BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION reports_before_update();

-- RLS: ENABLED  |  policies: 4
alter table public.reports enable row level security;
create policy "reports_delete_own_untriaged" on public.reports
  as permissive for delete to PUBLIC
  using (reporter_id = auth.uid() AND status = 'new'::text)
  ;
create policy "reports_insert_own" on public.reports
  as permissive for insert to PUBLIC
  with check (auth.uid() IS NOT NULL AND reporter_id = auth.uid() AND (app_setting_bool('reports.allow_anonymous'::text, false) OR COALESCE((auth.jwt() ->> 'is_anonymous'::text)::boolean, false) = false))
  ;
create policy "reports_select_own_or_staff" on public.reports
  as permissive for select to PUBLIC
  using (reporter_id = auth.uid() OR has_role_at_least('administrator'::text))
  ;
create policy "reports_update_own_or_staff" on public.reports
  as permissive for update to PUBLIC
  using (reporter_id = auth.uid() AND status = 'new'::text OR has_role_at_least('administrator'::text))
  with check (reporter_id = auth.uid() AND status = 'new'::text OR has_role_at_least('administrator'::text))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.role_audit
-- origin: sql/025
-- --------------------------------------------------------------------------
create table public.role_audit (
  id bigint generated always as identity not null,
  target_user_id uuid,
  actor_id uuid,
  old_role text,
  new_role text,
  note text,
  created_at timestamp with time zone default now() not null,
  constraint role_audit_pkey PRIMARY KEY (id)
);

-- indexes
CREATE INDEX role_audit_created_idx ON public.role_audit USING btree (created_at DESC);
CREATE INDEX role_audit_target_idx ON public.role_audit USING btree (target_user_id, created_at DESC);
-- constraint-backed indexes: role_audit_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.role_audit enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "role_audit_select_staff" on public.role_audit
  as permissive for select to PUBLIC
  using (has_role_at_least('administrator'::text))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.saving_peter_guesses
-- origin: sql/011
-- --------------------------------------------------------------------------
create table public.saving_peter_guesses (
  id uuid default gen_random_uuid() not null,
  room_id uuid not null,
  round_index integer not null,
  user_id uuid not null,
  guess text not null,
  correct boolean default false not null,
  guessed_at timestamp with time zone default now() not null,
  constraint saving_peter_guesses_pkey PRIMARY KEY (id),
  constraint saving_peter_guesses_room_id_round_index_user_id_key UNIQUE (room_id, round_index, user_id),
  constraint saving_peter_guesses_room_id_fkey FOREIGN KEY (room_id) REFERENCES saving_peter_rooms(id) ON DELETE CASCADE,
  constraint saving_peter_guesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX saving_peter_guesses_room_idx ON public.saving_peter_guesses USING btree (room_id);
-- constraint-backed indexes: saving_peter_guesses_pkey, saving_peter_guesses_room_id_round_index_user_id_key

-- RLS: ENABLED  |  policies: 1
alter table public.saving_peter_guesses enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "members can view saving peter guesses in their room" on public.saving_peter_guesses
  as permissive for select to PUBLIC
  using (is_saving_peter_room_member(room_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.saving_peter_high_scores
-- origin: sql/011
-- --------------------------------------------------------------------------
create table public.saving_peter_high_scores (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  display_name text not null,
  score integer not null,
  room_id uuid,
  achieved_at timestamp with time zone default now() not null,
  constraint saving_peter_high_scores_pkey PRIMARY KEY (id),
  constraint saving_peter_high_scores_room_id_fkey FOREIGN KEY (room_id) REFERENCES saving_peter_rooms(id) ON DELETE SET NULL,
  constraint saving_peter_high_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX saving_peter_high_scores_score_idx ON public.saving_peter_high_scores USING btree (score DESC);
-- constraint-backed indexes: saving_peter_high_scores_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.saving_peter_high_scores enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "saving peter high scores are public" on public.saving_peter_high_scores
  as permissive for select to PUBLIC
  using (true)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.saving_peter_players
-- origin: sql/011
-- --------------------------------------------------------------------------
create table public.saving_peter_players (
  room_id uuid not null,
  user_id uuid not null,
  display_name text not null,
  score integer default 0 not null,
  joined_at timestamp with time zone default now() not null,
  constraint saving_peter_players_pkey PRIMARY KEY (room_id, user_id),
  constraint saving_peter_players_room_id_fkey FOREIGN KEY (room_id) REFERENCES saving_peter_rooms(id) ON DELETE CASCADE,
  constraint saving_peter_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX saving_peter_players_room_idx ON public.saving_peter_players USING btree (room_id);
-- constraint-backed indexes: saving_peter_players_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.saving_peter_players enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "members can view their saving peter roster" on public.saving_peter_players
  as permissive for select to PUBLIC
  using (user_id = auth.uid() OR is_saving_peter_room_member(room_id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.saving_peter_rooms
-- origin: sql/011
-- --------------------------------------------------------------------------
create table public.saving_peter_rooms (
  id uuid default gen_random_uuid() not null,
  code text not null,
  host_id uuid not null,
  status text default 'lobby'::text not null,
  round_ids jsonb default '[]'::jsonb not null,
  current_round_index integer default '-1'::integer not null,
  current_round_started_at timestamp with time zone,
  target_score integer default 50 not null,
  winner_id uuid,
  created_at timestamp with time zone default now() not null,
  constraint saving_peter_rooms_pkey PRIMARY KEY (id),
  constraint saving_peter_rooms_code_key UNIQUE (code),
  constraint saving_peter_rooms_host_id_fkey FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint saving_peter_rooms_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES auth.users(id),
  constraint saving_peter_rooms_status_check CHECK (status = ANY (ARRAY['lobby'::text, 'active'::text, 'finished'::text]))
);
-- constraint-backed indexes: saving_peter_rooms_code_key, saving_peter_rooms_pkey

-- RLS: ENABLED  |  policies: 1
alter table public.saving_peter_rooms enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "members can view their saving peter room" on public.saving_peter_rooms
  as permissive for select to PUBLIC
  using (auth.uid() = host_id OR is_saving_peter_room_member(id))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.sermon_notes
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.sermon_notes (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text default ''::text not null,
  speaker text,
  scripture_ref text,
  body text default ''::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint sermon_notes_pkey PRIMARY KEY (id),
  constraint sermon_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX sermon_notes_user_idx ON public.sermon_notes USING btree (user_id, created_at DESC);
-- constraint-backed indexes: sermon_notes_pkey

-- RLS: ENABLED  |  policies: 4
alter table public.sermon_notes enable row level security;
create policy "sermon_notes_delete_own" on public.sermon_notes
  as permissive for delete to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "sermon_notes_insert_own" on public.sermon_notes
  as permissive for insert to PUBLIC
  with check (auth.uid() = user_id)
  ;
create policy "sermon_notes_select_own" on public.sermon_notes
  as permissive for select to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "sermon_notes_update_own" on public.sermon_notes
  as permissive for update to PUBLIC
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.tags
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.tags (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  created_at timestamp with time zone default now() not null,
  constraint tags_pkey PRIMARY KEY (id),
  constraint tags_user_id_name_key UNIQUE (user_id, name),
  constraint tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX tags_user_id_idx ON public.tags USING btree (user_id);
-- constraint-backed indexes: tags_pkey, tags_user_id_name_key

-- RLS: ENABLED  |  policies: 3
alter table public.tags enable row level security;
-- no update policy: those writes are only possible through a SECURITY DEFINER function.
create policy "tags_delete_own" on public.tags
  as permissive for delete to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "tags_insert_own" on public.tags
  as permissive for insert to PUBLIC
  with check (auth.uid() = user_id)
  ;
create policy "tags_select_own" on public.tags
  as permissive for select to PUBLIC
  using (auth.uid() = user_id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.user_blocks
-- origin: sql/028
-- --------------------------------------------------------------------------
create table public.user_blocks (
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamp with time zone default now() not null,
  reason text,
  constraint user_blocks_pkey PRIMARY KEY (blocker_id, blocked_id),
  constraint user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint user_blocks_not_self CHECK (blocker_id <> blocked_id),
  constraint user_blocks_reason_check CHECK (reason IS NULL OR length(reason) <= 500)
);

-- indexes
CREATE INDEX user_blocks_blocked_idx ON public.user_blocks USING btree (blocked_id, blocker_id);
-- constraint-backed indexes: user_blocks_pkey

-- RLS: ENABLED  |  policies: 3
alter table public.user_blocks enable row level security;
-- no update policy: those writes are only possible through a SECURITY DEFINER function.
create policy "user_blocks_delete_own" on public.user_blocks
  as permissive for delete to PUBLIC
  using (blocker_id = auth.uid())
  ;
create policy "user_blocks_insert_own" on public.user_blocks
  as permissive for insert to PUBLIC
  with check (blocker_id = auth.uid() AND blocked_id <> auth.uid())
  ;
create policy "user_blocks_select_own" on public.user_blocks
  as permissive for select to PUBLIC
  using (blocker_id = auth.uid())
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.user_roles
-- origin: sql/025
-- --------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null,
  role text not null,
  granted_by uuid,
  granted_at timestamp with time zone default now() not null,
  note text,
  constraint user_roles_pkey PRIMARY KEY (user_id),
  constraint user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint user_roles_note_check CHECK (note IS NULL OR length(note) <= 500),
  constraint user_roles_role_check CHECK (role = ANY (ARRAY['advisor'::text, 'administrator'::text, 'owner'::text]))
);

-- indexes
CREATE INDEX user_roles_role_idx ON public.user_roles USING btree (role);
-- constraint-backed indexes: user_roles_pkey

-- triggers
CREATE TRIGGER user_roles_audit_trg AFTER INSERT OR DELETE OR UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION user_roles_audit();

-- RLS: ENABLED  |  policies: 1
alter table public.user_roles enable row level security;
-- no insert/update/delete policy: those writes are only possible through a SECURITY DEFINER function.
create policy "user_roles_select_self_or_staff" on public.user_roles
  as permissive for select to PUBLIC
  using (user_id = auth.uid() OR has_role_at_least('administrator'::text))
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- --------------------------------------------------------------------------
-- TABLE  public.verse_tags
-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/. Nothing in sql/ touches it.
-- --------------------------------------------------------------------------
create table public.verse_tags (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  book text not null,
  chapter integer not null,
  start_verse integer not null,
  end_verse integer not null,
  translation text not null,
  tag_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint verse_tags_pkey PRIMARY KEY (id),
  constraint verse_tags_user_id_book_chapter_start_verse_end_verse_trans_key UNIQUE (user_id, book, chapter, start_verse, end_verse, translation, tag_id),
  constraint verse_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  constraint verse_tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX verse_tags_lookup_idx ON public.verse_tags USING btree (user_id, book, chapter);
CREATE INDEX verse_tags_user_id_idx ON public.verse_tags USING btree (user_id);
-- constraint-backed indexes: verse_tags_pkey, verse_tags_user_id_book_chapter_start_verse_end_verse_trans_key

-- RLS: ENABLED  |  policies: 3
alter table public.verse_tags enable row level security;
-- no update policy: those writes are only possible through a SECURITY DEFINER function.
create policy "verse_tags_delete_own" on public.verse_tags
  as permissive for delete to PUBLIC
  using (auth.uid() = user_id)
  ;
create policy "verse_tags_insert_own" on public.verse_tags
  as permissive for insert to PUBLIC
  with check (auth.uid() = user_id)
  ;
create policy "verse_tags_select_own" on public.verse_tags
  as permissive for select to PUBLIC
  using (auth.uid() = user_id)
  ;

-- grants: anon=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  authenticated=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  postgres=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE  |  service_role=DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- ============================================================================
-- VIEWS / MATERIALIZED VIEWS IN public  (1)
-- ============================================================================

-- VIEW public.admin_users   options: security_invoker=true
create view public.admin_users as
 SELECT user_id,
    granted_at,
    note
   FROM user_roles r
  WHERE role = ANY (ARRAY['administrator'::text, 'owner'::text]);

-- ============================================================================
-- FUNCTIONS / PROCEDURES IN public  (88)
-- ============================================================================
-- SECURITY DEFINER functions run as their owner and BYPASS the RLS of every
-- table they touch. They are how this schema avoids 42P17 recursion (a policy
-- on group_members that reads group_members) and they are also the only write
-- path for tables that carry no insert/update policy. Read them as part of the
-- security model, not as helpers.

-- public.add_group_member(p_group_id uuid, p_member_id uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.add_group_member(p_group_id uuid, p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'Only group admins can add members';
  end if;
  insert into public.group_members (group_id, user_id, role) values (p_group_id, p_member_id, 'member')
  on conflict do nothing;
end;
$function$;

-- public.admin_content_counts()   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_content_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result jsonb;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  select jsonb_build_object(
    'notes',                (select count(*) from notes),
    'notes_public',         (select count(*) from notes where is_public),
    'highlights',           (select count(*) from highlights),
    'posts',                (select count(*) from posts),
    'post_comments',        (select count(*) from post_comments),
    'note_comments',        (select count(*) from note_comments),
    'sermon_notes',         (select count(*) from sermon_notes),
    'chapter_reads',        (select count(*) from chapter_reads),
    'reading_plan_days',    (select count(*) from reading_plan_progress),
    'reading_plans_started',(select count(distinct (user_id, plan_id)) from reading_plan_progress),
    'groups',               (select count(*) from groups),
    'friendships',          (select count(*) from friend_requests where status = 'accepted'),
    'game_rooms',           (select count(*) from game_rooms),
    'profiles_with_avatar', (select count(*) from profiles where avatar_url is not null)
  ) into result;

  return result;
end;
$function$;

-- public.admin_daily_activity(p_days integer)   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_daily_activity(p_days integer DEFAULT 30)
 RETURNS TABLE(day date, signups bigint, sessions bigint, active_users bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_days integer := least(greatest(coalesce(p_days, 30), 1), 180);
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  return query
  with days as (
    select generate_series((current_date - (v_days - 1)), current_date, interval '1 day')::date as d
  )
  select days.d,
         (select count(*) from auth.users u where u.created_at::date = days.d),
         (select count(*) from analytics_sessions s where s.started_at::date = days.d),
         (select count(distinct s.user_id) from analytics_sessions s
            where s.started_at::date = days.d and s.user_id is not null)
  from days
  order by days.d;
end;
$function$;

-- public.admin_delete_content(p_kind text, p_id uuid)   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_delete_content(p_kind text, p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  if p_kind = 'post' then
    delete from posts where id = p_id;
  elsif p_kind = 'comment' then
    delete from post_comments where id = p_id;
  else
    raise exception 'unsupported content kind' using errcode = '22023';
  end if;
end;
$function$;

-- public.admin_engagement(p_days integer)   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_engagement(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  result jsonb;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  with s as (
    select extract(epoch from (last_seen_at - started_at)) as secs, user_id
    from analytics_sessions
    where started_at > now() - make_interval(days => v_days)
  ),
  engaged as (select * from s where secs >= 5)
  select jsonb_build_object(
    'sessions',            (select count(*) from s),
    'bounces',             (select count(*) from s where secs < 5),
    'median_seconds',      (select percentile_cont(0.5) within group (order by secs) from engaged),
    'mean_seconds',        (select avg(secs) from engaged),
    'p90_seconds',         (select percentile_cont(0.9) within group (order by secs) from engaged),
    'total_seconds',       (select coalesce(sum(secs), 0) from s),
    'sessions_per_user',   (select case when count(distinct user_id) = 0 then 0
                                        else count(*)::numeric / count(distinct user_id) end
                              from s where user_id is not null),
    -- Cheap retention: of the accounts that had a session in the window's first
    -- half, how many came back in the second half.
    'returning_users',     (select count(*) from (
                              select user_id from analytics_sessions
                              where user_id is not null
                                and started_at > now() - make_interval(days => v_days)
                              group by user_id
                              having count(distinct started_at::date) > 1
                            ) r)
  ) into result;

  return result;
end;
$function$;

-- public.admin_feature_breakdown(p_event text, p_key text, p_days integer)   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_feature_breakdown(p_event text, p_key text, p_days integer DEFAULT 30)
 RETURNS TABLE(label text, uses bigint, users bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_key not in ('panel', 'game', 'plan', 'kind', 'color', 'scope') then
    raise exception 'unsupported breakdown key' using errcode = '22023';
  end if;

  return query
  select coalesce(e.props ->> p_key, '(none)') as label,
         count(*)::bigint,
         count(distinct e.user_id)::bigint
  from analytics_events e
  where e.event = p_event
    and e.created_at > now() - make_interval(days => v_days)
  group by 1
  order by 2 desc;
end;
$function$;

-- public.admin_feature_usage(p_days integer)   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_feature_usage(p_days integer DEFAULT 30)
 RETURNS TABLE(event text, uses bigint, users bigint, last_used timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  return query
  select e.event,
         count(*)::bigint,
         count(distinct e.user_id)::bigint,
         max(e.created_at)
  from analytics_events e
  where e.created_at > now() - make_interval(days => v_days)
  group by e.event
  order by count(*) desc;
end;
$function$;

-- public.admin_guest_summary(p_days integer)   [SECURITY DEFINER]
--   origin: sql/021
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_guest_summary(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  v_result jsonb;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  with guests as (
    select u.id,
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    where coalesce(u.is_anonymous, false)
  ),
  -- One row per guest that analytics actually saw, with its session roll-up.
  guest_sessions as (
    select s.id as session_id,
           s.user_id,
           s.started_at,
           s.last_seen_at,
           s.event_count,
           greatest(extract(epoch from (s.last_seen_at - s.started_at)), 0) as seconds
    from analytics_sessions s
    where s.user_id in (select id from guests)
       or (s.user_id is null and s.is_anonymous)
  ),
  per_guest as (
    select g.id,
           g.created_at,
           g.last_sign_in_at,
           agg.sessions,
           agg.seconds,
           agg.last_seen
    from guests g
    left join lateral (
      select count(*) as sessions,
             coalesce(sum(gs.seconds), 0) as seconds,
             max(gs.last_seen_at) as last_seen
      from guest_sessions gs where gs.user_id = g.id
    ) agg on true
  ),
  -- Head-count history: one row per calendar day a guest first appeared, plus
  -- the sessions and measured time that landed on that day. Days with nothing at
  -- all are omitted rather than padded, because a padded zero and a
  -- before-analytics zero look identical and mean different things.
  day_span as (
    select (date_trunc('day', now()) - (n || ' days')::interval)::date as day
    from generate_series(0, v_days - 1) n
  ),
  per_day as (
    select d.day,
           (select count(*) from guests g where (g.created_at at time zone 'UTC')::date = d.day) as new_guests,
           (select count(*) from guest_sessions gs where (gs.started_at at time zone 'UTC')::date = d.day) as sessions,
           (select count(distinct gs.user_id) from guest_sessions gs
              where (gs.started_at at time zone 'UTC')::date = d.day) as active_guests,
           (select coalesce(sum(gs.seconds), 0) from guest_sessions gs
              where (gs.started_at at time zone 'UTC')::date = d.day) as seconds,
           (select min(gs.started_at) from guest_sessions gs
              where (gs.started_at at time zone 'UTC')::date = d.day) as first_session_at,
           (select max(gs.last_seen_at) from guest_sessions gs
              where (gs.started_at at time zone 'UTC')::date = d.day) as last_session_at
    from day_span d
  ),
  -- The most recent individual guest sessions, for the "times" half of the
  -- detail view. No identity beyond the session's own timestamps — a guest has
  -- no name, no email, and nothing here reaches for one.
  recent as (
    select gs.session_id, gs.started_at, gs.last_seen_at, gs.seconds, gs.event_count
    from guest_sessions gs
    order by gs.started_at desc
    limit 20
  )
  select jsonb_build_object(
    'total', (select count(*) from guests),
    'new_24h', (select count(*) from guests where created_at >= now() - interval '24 hours'),
    'new_7d', (select count(*) from guests where created_at >= now() - interval '7 days'),
    'new_30d', (select count(*) from guests where created_at >= now() - interval '30 days'),
    'first_seen', (select min(created_at) from guests),
    'newest_seen', (select max(created_at) from guests),
    -- "Active" here means a session heartbeat in the window — only knowable for
    -- guests analytics saw, so it is deliberately reported next to
    -- guests_with_sessions rather than next to `total`.
    'active_24h', (select count(distinct user_id) from guest_sessions
                     where user_id is not null and last_seen_at >= now() - interval '24 hours'),
    'active_7d', (select count(distinct user_id) from guest_sessions
                     where user_id is not null and last_seen_at >= now() - interval '7 days'),
    'last_active_at', (select max(last_seen_at) from guest_sessions),
    'guests_with_sessions', (select count(*) from per_guest where coalesce(sessions, 0) > 0),
    'guests_before_analytics', (select count(*) from per_guest where coalesce(sessions, 0) = 0),
    'sessions_total', (select count(*) from guest_sessions),
    'sessions_seconds_total', (select coalesce(sum(seconds), 0) from guest_sessions),
    'median_session_seconds', (select percentile_cont(0.5) within group (order by seconds)
                                 from guest_sessions),
    'returning_guests', (select count(*) from per_guest where coalesce(sessions, 0) > 1),
    'analytics_since', (select min(started_at) from analytics_sessions),
    'days', coalesce((
      select jsonb_agg(to_jsonb(pd) order by pd.day desc)
      from per_day pd
      where pd.new_guests > 0 or pd.sessions > 0
    ), '[]'::jsonb),
    'recent_sessions', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.started_at desc) from recent r
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

-- public.admin_list_users(p_search text, p_limit integer, p_offset integer)   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, email text, display_name text, is_anonymous boolean, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, last_seen_at timestamp with time zone, session_count bigint, total_seconds numeric, is_admin boolean, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_pattern text;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  v_pattern := case when v_search is null then null
                    else '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  return query
  with matched as (
    select u.id,
           u.email::text as email,
           p.display_name,
           coalesce(u.is_anonymous, false) as is_anonymous,
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    left join profiles p on p.id = u.id
    where v_pattern is null
       or u.email::text ilike v_pattern escape '\'
       or p.display_name ilike v_pattern escape '\'
  ),
  counted as (select count(*) as n from matched)
  select m.id,
         m.email,
         m.display_name,
         m.is_anonymous,
         m.created_at,
         m.last_sign_in_at,
         agg.last_seen,
         coalesce(agg.sessions, 0),
         coalesce(agg.seconds, 0),
         exists (select 1 from admin_users a where a.user_id = m.id),
         counted.n
  from matched m
  cross join counted
  left join lateral (
    select max(s.last_seen_at) as last_seen,
           count(*) as sessions,
           sum(extract(epoch from (s.last_seen_at - s.started_at))) as seconds
    from analytics_sessions s where s.user_id = m.id
  ) agg on true
  order by m.created_at desc
  limit v_limit offset v_offset;
end;
$function$;

-- public.admin_overview()   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result jsonb;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  select jsonb_build_object(
    'users_total',        (select count(*) from auth.users),
    'users_registered',   (select count(*) from auth.users where not coalesce(is_anonymous, false)),
    'users_anonymous',    (select count(*) from auth.users where coalesce(is_anonymous, false)),
    'users_new_24h',      (select count(*) from auth.users where created_at > now() - interval '24 hours'),
    'users_new_7d',       (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_new_30d',      (select count(*) from auth.users where created_at > now() - interval '30 days'),
    -- "Active" is analytics-derived, so it only counts from the day capture
    -- shipped. Before that these read 0 — that is honest, not broken.
    'active_24h',         (select count(distinct user_id) from analytics_sessions
                             where user_id is not null and last_seen_at > now() - interval '24 hours'),
    'active_7d',          (select count(distinct user_id) from analytics_sessions
                             where user_id is not null and last_seen_at > now() - interval '7 days'),
    'active_30d',         (select count(distinct user_id) from analytics_sessions
                             where user_id is not null and last_seen_at > now() - interval '30 days'),
    'sessions_24h',       (select count(*) from analytics_sessions where started_at > now() - interval '24 hours'),
    'sessions_7d',        (select count(*) from analytics_sessions where started_at > now() - interval '7 days'),
    'events_total',       (select count(*) from analytics_events),
    'analytics_since',    (select min(started_at) from analytics_sessions)
  ) into result;

  return result;
end;
$function$;

-- public.admin_recent_public_content(p_limit integer)   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.admin_recent_public_content(p_limit integer DEFAULT 40)
 RETURNS TABLE(kind text, id uuid, author_id uuid, author_name text, body text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 200);
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  return query
  select * from (
    select 'post'::text, p.id, p.user_id, coalesce(pr.display_name, pr.email), p.body, p.created_at
    from posts p left join profiles pr on pr.id = p.user_id
    where p.is_public
    union all
    select 'comment'::text, c.id, c.author_id, coalesce(pr.display_name, pr.email), c.body, c.created_at
    from post_comments c left join profiles pr on pr.id = c.author_id
  ) rows
  order by 6 desc
  limit v_limit;
end;
$function$;

-- public.analytics_track(p_session_id uuid, p_events jsonb)   [SECURITY DEFINER]
--   origin: sql/019
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.analytics_track(p_session_id uuid, p_events jsonb DEFAULT '[]'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_anon boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_count integer;
  v_accepted integer := 0;
  max_session_events constant integer := 5000;
begin
  if p_session_id is null then
    return;
  end if;

  insert into analytics_sessions (id, user_id, is_anonymous, started_at, last_seen_at)
  values (p_session_id, v_uid, v_anon, now(), now())
  on conflict (id) do update
    set last_seen_at = now(),
        -- A session that starts signed-out and then signs in becomes attributed
        -- from that point on; it never gets re-attributed to a different account.
        user_id = coalesce(analytics_sessions.user_id, excluded.user_id),
        is_anonymous = case when analytics_sessions.user_id is null then excluded.is_anonymous
                            else analytics_sessions.is_anonymous end
    -- Guard: you may only touch a session that is yours or still unattributed.
    -- Session ids are v4 UUIDs, so this is belt-and-braces against a guessed id.
    where analytics_sessions.user_id is null or analytics_sessions.user_id = v_uid;

  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) = 0 then
    return;
  end if;

  -- Ownership re-check before appending. The upsert above silently declines to
  -- touch a session belonging to someone else, so this SELECT is what turns that
  -- into a refusal to write events under it too. Without it, an attacker who
  -- guessed a v4 session UUID could not read anything or re-attribute the
  -- session, but could still append rows sharing its session_id and pollute that
  -- one session's event list. Session ownership is a server-side fact; a caller
  -- may only write to a session that is theirs or still unattributed.
  select event_count into v_count from analytics_sessions
   where id = p_session_id and (user_id is null or user_id = v_uid);
  if v_count is null or v_count >= max_session_events then
    return;
  end if;

  with candidates as (
    select e.value as ev
    from jsonb_array_elements(p_events) as e(value)
    limit 50
  )
  insert into analytics_events (user_id, session_id, event, props, created_at)
  select v_uid,
         p_session_id,
         ev ->> 'e',
         case when jsonb_typeof(ev -> 'p') = 'object' then ev -> 'p' else '{}'::jsonb end,
         now()
  from candidates
  where ev ->> 'e' ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$'
    and length(ev ->> 'e') <= 64
    and pg_column_size(case when jsonb_typeof(ev -> 'p') = 'object' then ev -> 'p' else '{}'::jsonb end) <= 512;

  get diagnostics v_accepted = row_count;
  if v_accepted > 0 then
    update analytics_sessions set event_count = event_count + v_accepted where id = p_session_id;
  end if;
end;
$function$;

-- public.app_setting_bool(p_key text, p_default boolean)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.app_setting_bool(p_key text, p_default boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce(
    (select case when jsonb_typeof(s.value) = 'boolean' then (s.value)::text::boolean else null end
       from app_settings s where s.key = p_key),
    p_default);
$function$;

-- public.app_setting_int(p_key text, p_default integer)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.app_setting_int(p_key text, p_default integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce(
    (select case when jsonb_typeof(s.value) = 'number' then (s.value)::text::integer else null end
       from app_settings s where s.key = p_key),
    p_default);
$function$;

-- public.block_user(p_user_id uuid, p_reason text)   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.block_user(p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'block_target_missing: no account was named' using errcode = '22023';
  end if;
  if p_user_id = v_me then
    raise exception 'self_block: you cannot block your own account' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'block_target_missing: that account no longer exists' using errcode = '22023';
  end if;

  insert into user_blocks (blocker_id, blocked_id, reason)
  values (v_me, p_user_id, nullif(btrim(coalesce(p_reason, '')), ''))
  on conflict (blocker_id, blocked_id) do nothing;

  delete from friend_requests fr
  where (fr.sender_id = v_me and fr.receiver_id = p_user_id)
     or (fr.sender_id = p_user_id and fr.receiver_id = v_me);
end;
$function$;

-- public.check_and_advance(p_room_id uuid, p_question_index integer)   [SECURITY DEFINER]
--   origin: sql/005
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.check_and_advance(p_room_id uuid, p_question_index integer)
 RETURNS game_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.check_and_advance_saving_peter(p_room_id uuid, p_round_index integer)   [SECURITY DEFINER]
--   origin: sql/011
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.check_and_advance_saving_peter(p_room_id uuid, p_round_index integer)
 RETURNS saving_peter_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.count_pending_group_join_requests()   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.count_pending_group_join_requests()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select coalesce(count(*), 0)::integer
  from public.group_join_requests r
  where r.status = 'pending' and public.is_group_admin(r.group_id);
$function$;

-- public.count_unread_group_messages()   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.count_unread_group_messages()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select coalesce(sum(unread_count), 0)::integer from public.list_my_groups();
$function$;

-- public.create_game_room(p_target_score integer, p_question_ids jsonb)   [SECURITY DEFINER]
--   origin: sql/001,002
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.create_game_room(p_target_score integer DEFAULT 50, p_question_ids jsonb DEFAULT '[]'::jsonb)
 RETURNS game_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.create_group(p_name text, p_description text, p_member_ids uuid[])   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_description text, p_member_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  new_group_id uuid;
  mid uuid;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Guests cannot create groups';
  end if;
  insert into public.groups (name, description, created_by)
  values (p_name, nullif(trim(p_description), ''), auth.uid())
  returning id into new_group_id;
  insert into public.group_members (group_id, user_id, role) values (new_group_id, auth.uid(), 'owner');
  foreach mid in array p_member_ids loop
    if mid <> auth.uid() then
      insert into public.group_members (group_id, user_id, role) values (new_group_id, mid, 'member')
      on conflict do nothing;
    end if;
  end loop;
  return new_group_id;
end;
$function$;

-- public.create_saving_peter_room(p_target_score integer, p_round_ids jsonb)   [SECURITY DEFINER]
--   origin: sql/011
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.create_saving_peter_room(p_target_score integer DEFAULT 50, p_round_ids jsonb DEFAULT '[]'::jsonb)
 RETURNS saving_peter_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.current_user_role()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
           when auth.uid() is null then null
           else coalesce((select r.role from user_roles r where r.user_id = auth.uid()), 'user')
         end;
$function$;

-- public.find_public_groups_by_name(query text)   [SECURITY DEFINER]
--   origin: sql/014
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.find_public_groups_by_name(query text)
 RETURNS TABLE(id uuid, name text, description text, member_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    g.id,
    g.name,
    g.description,
    (select count(*)::integer from group_members gm where gm.group_id = g.id)
  from groups g
  where g.is_public = true
    and g.name ilike '%' || query || '%'
    and not exists (select 1 from group_members gm2 where gm2.group_id = g.id and gm2.user_id = auth.uid())
  order by g.name
  limit 20;
$function$;

-- public.find_user_by_contact(query text)   [SECURITY DEFINER]
--   origin: sql/032
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.find_user_by_contact(query text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select id from public.profiles
  where (email = lower(query) or (phone is not null and phone = query))
    and not public.is_blocked_between(auth.uid(), id)
  limit 1;
$function$;

-- public.find_user_id_by_email(lookup_email text)   [SECURITY DEFINER]
--   origin: sql/032
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(lookup_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select id from public.profiles
  where email = lower(lookup_email)
    and not public.is_blocked_between(auth.uid(), id)
  limit 1;
$function$;

-- public.find_users_by_display_name(query text)   [SECURITY DEFINER]
--   origin: sql/010,032
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.find_users_by_display_name(query text)
 RETURNS TABLE(id uuid, display_name text, avatar_url text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id, display_name, avatar_url
  from profiles
  where discoverable_by_name = true
    and display_name is not null
    and display_name ilike '%' || query || '%'
    and id <> auth.uid()
    and not is_blocked_between(auth.uid(), id)
  order by display_name
  limit 20;
$function$;

-- public.handle_new_user()   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  requested_name text := new.raw_user_meta_data ->> 'display_name';
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    case
      when requested_name is not null
        and not exists (
          select 1 from public.profiles where lower(display_name) = lower(requested_name)
        )
      then requested_name
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- public.has_role_at_least(p_role text, p_uid uuid)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.has_role_at_least(p_role text, p_uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_required integer := role_rank(p_role);
  v_actual   integer;
begin
  if v_required is null then
    raise exception 'unknown role %', p_role using errcode = '22023';
  end if;

  -- 'user' is the baseline: it means "any signed-in account", not "any caller".
  if v_required = 0 then
    return p_uid is not null;
  end if;

  if p_uid is null then
    return false;
  end if;

  select role_rank(r.role) into v_actual from user_roles r where r.user_id = p_uid;
  return coalesce(v_actual, 0) >= v_required;
end;
$function$;

-- public.increment_reading_time(p_seconds integer)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.increment_reading_time(p_seconds integer)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.reading_time_daily (user_id, day, seconds)
  values (auth.uid(), current_date, least(greatest(p_seconds, 0), 3600))
  on conflict (user_id, day) do update set seconds = reading_time_daily.seconds + excluded.seconds;
$function$;

-- public.is_admin(uid uuid)   [SECURITY DEFINER]
--   origin: sql/019,025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select uid is not null
     and exists (select 1 from user_roles r
                  where r.user_id = uid and r.role in ('administrator', 'owner'));
$function$;

-- public.is_blocked_between(p_a uuid, p_b uuid)   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.is_blocked_between(p_a uuid, p_b uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
           when p_a is null or p_b is null or p_a = p_b then false
           else exists (
             select 1 from user_blocks b
             where (b.blocker_id = p_a and b.blocked_id = p_b)
                or (b.blocker_id = p_b and b.blocked_id = p_a)
           )
         end;
$function$;

-- public.is_display_name_available(p_name text, p_exclude_user_id uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.is_display_name_available(p_name text, p_exclude_user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select not exists (
    select 1 from public.profiles
    where lower(display_name) = lower(trim(p_name))
      and (p_exclude_user_id is null or id != p_exclude_user_id)
  );
$function$;

-- public.is_friend(other_id uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.is_friend(other_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.friend_requests
    where status = 'accepted'
      and ((sender_id = auth.uid() and receiver_id = other_id)
        or (sender_id = other_id and receiver_id = auth.uid()))
  );
$function$;

-- public.is_game_room_member(p_room_id uuid)   [SECURITY DEFINER]
--   origin: sql/003
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.is_game_room_member(p_room_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from game_players where room_id = p_room_id and user_id = auth.uid());
$function$;

-- public.is_group_admin(gid uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.is_group_admin(gid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid() and role in ('owner', 'admin'));
$function$;

-- public.is_group_member(gid uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$function$;

-- public.is_saving_peter_room_member(p_room_id uuid)   [SECURITY DEFINER]
--   origin: sql/012
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.is_saving_peter_room_member(p_room_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from saving_peter_players where room_id = p_room_id and user_id = auth.uid());
$function$;

-- public.join_game_room(p_code text)   [SECURITY DEFINER]
--   origin: sql/001,002
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.join_game_room(p_code text)
 RETURNS game_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.join_saving_peter_room(p_code text)   [SECURITY DEFINER]
--   origin: sql/011
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.join_saving_peter_room(p_code text)
 RETURNS saving_peter_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.kick_player(p_room_id uuid, p_target_user_id uuid)   [SECURITY DEFINER]
--   origin: sql/005
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.kick_player(p_room_id uuid, p_target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.kick_saving_peter_player(p_room_id uuid, p_target_user_id uuid)   [SECURITY DEFINER]
--   origin: sql/011
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.kick_saving_peter_player(p_room_id uuid, p_target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.leave_game_room(p_room_id uuid)   [SECURITY DEFINER]
--   origin: sql/005
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.leave_game_room(p_room_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.leave_saving_peter_room(p_room_id uuid)   [SECURITY DEFINER]
--   origin: sql/011
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.leave_saving_peter_room(p_room_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.list_my_blocks()   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.list_my_blocks()
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, blocked_at timestamp with time zone, reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select b.blocked_id,
         p.display_name,
         p.avatar_url,
         b.created_at,
         b.reason
  from user_blocks b
  left join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$function$;

-- public.list_my_groups()   [SECURITY DEFINER]
--   origin: sql/014,028
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.list_my_groups()
 RETURNS TABLE(group_id uuid, name text, description text, is_public boolean, last_message text, last_message_at timestamp with time zone, last_sender_id uuid, unread_count integer, my_role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select
    g.id,
    g.name,
    g.description,
    g.is_public,
    lm.body,
    lm.created_at,
    lm.sender_id,
    coalesce((
      select count(*)::integer from group_messages m2
      where m2.group_id = g.id
        and m2.sender_id <> auth.uid()
        and not is_blocked_between(auth.uid(), m2.sender_id)
        and m2.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    ), 0),
    gm.role
  from groups g
  join group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  left join group_message_reads r on r.group_id = g.id and r.user_id = auth.uid()
  left join lateral (
    select body, created_at, sender_id from group_messages m
    where m.group_id = g.id
      and not is_blocked_between(auth.uid(), m.sender_id)
    order by created_at desc
    limit 1
  ) lm on true;
$function$;

-- public.list_user_roles()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.list_user_roles()
 RETURNS TABLE(user_id uuid, email text, display_name text, role text, granted_at timestamp with time zone, granted_by uuid, granted_by_name text, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select r.user_id,
         u.email::text,
         p.display_name,
         r.role,
         r.granted_at,
         r.granted_by,
         coalesce(gp.display_name, gu.email::text),
         r.note
  from user_roles r
  join auth.users u  on u.id = r.user_id
  left join profiles p on p.id = r.user_id
  left join auth.users gu on gu.id = r.granted_by
  left join profiles gp   on gp.id = r.granted_by
  order by role_rank(r.role) desc, r.granted_at asc;
end;
$function$;

-- public.moderation_counts()   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.moderation_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_result jsonb;
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'new',       count(*) filter (where status = 'new'),
    'reviewing', count(*) filter (where status = 'reviewing'),
    'actioned',  count(*) filter (where status = 'actioned'),
    'dismissed', count(*) filter (where status = 'dismissed'),
    'open',      count(*) filter (where status in ('new', 'reviewing')),
    'last_24h',  count(*) filter (where created_at > now() - interval '24 hours'),
    'blocks',    (select count(*) from user_blocks)
  ) into v_result
  from moderation_reports;

  return coalesce(v_result, '{}'::jsonb);
end;
$function$;

-- public.moderation_history(p_owner_id uuid)   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.moderation_history(p_owner_id uuid)
 RETURNS TABLE(at timestamp with time zone, actor_name text, target_kind text, action text, new_status text, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select a.created_at, a.actor_name, a.target_kind, a.action, a.new_status, a.note
    from moderation_actions a
    where a.target_owner_id = p_owner_id
    order by a.created_at desc
    limit 100;
end;
$function$;

-- public.moderation_queue(p_status text[], p_reason text, p_limit integer, p_offset integer)   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.moderation_queue(p_status text[] DEFAULT NULL::text[], p_reason text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, target_kind text, target_id uuid, target_owner_id uuid, target_owner_name text, reason text, reason_label text, details text, content_excerpt text, context_label text, status text, action_taken text, resolution_note text, handled_by uuid, handled_at timestamp with time zone, reporter_id uuid, reporter_name text, target_still_exists boolean, reports_against_owner bigint, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  with filtered as (
    select mr.*
    from moderation_reports mr
    where (p_status is null or mr.status = any (p_status))
      and (p_reason is null or mr.reason = p_reason)
  ),
  counted as (select count(*) as n from filtered)
  select
    f.id,
    f.created_at,
    f.updated_at,
    f.target_kind,
    f.target_id,
    f.target_owner_id,
    owner_p.display_name,
    f.reason,
    r.label,
    f.details,
    f.content_excerpt,
    f.context_label,
    f.status,
    f.action_taken,
    f.resolution_note,
    f.handled_by,
    f.handled_at,
    f.reporter_id,
    rep_p.display_name,
    -- Whether the reported thing is still there. An administrator opening a
    -- three-day-old report needs to know at a glance whether the author already
    -- deleted it, which is far and away the most common resolution.
    case f.target_kind
      when 'post'          then exists (select 1 from posts x          where x.id = f.target_id)
      when 'post_comment'  then exists (select 1 from post_comments x  where x.id = f.target_id)
      when 'note'          then exists (select 1 from notes x          where x.id = f.target_id)
      when 'note_comment'  then exists (select 1 from note_comments x  where x.id = f.target_id)
      when 'message'       then exists (select 1 from messages x       where x.id = f.target_id)
      when 'group_message' then exists (select 1 from group_messages x where x.id = f.target_id)
      when 'profile'       then exists (select 1 from profiles x       where x.id = f.target_id)
      else null
    end,
    -- How many reports this account has attracted in total, across all its
    -- content. One report is an incident; eleven is a pattern, and the queue
    -- should not make an administrator go and count them.
    (select count(*) from moderation_reports o where o.target_owner_id = f.target_owner_id),
    counted.n
  from filtered f
  cross join counted
  left join profiles owner_p on owner_p.id = f.target_owner_id
  left join profiles rep_p   on rep_p.id   = f.reporter_id
  order by
    -- Open work first, then oldest-first inside it: an abuse queue is worked
    -- from the bottom of the pile, not the top. sql/025 sorts by a computed
    -- priority; there is no vote here to compute one from, and "how long has
    -- this person been waiting" is the honest proxy.
    case f.status when 'new' then 0 when 'reviewing' then 1 else 2 end,
    case when f.status in ('new', 'reviewing') then f.created_at end asc nulls last,
    f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
end;
$function$;

-- public.moderation_recent_report_count()   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.moderation_recent_report_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select count(*)::integer
  from moderation_reports
  where reporter_id = auth.uid()
    and created_at > now() - interval '1 hour';
$function$;

-- public.moderation_report_submit(p_target_kind text, p_target_id uuid, p_reason text, p_details text, p_excerpt text, p_context text)
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.moderation_report_submit(p_target_kind text, p_target_id uuid, p_reason text, p_details text DEFAULT NULL::text, p_excerpt text DEFAULT NULL::text, p_context text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_me    uuid := auth.uid();
  v_owner uuid;
begin
  if v_me is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_target_id is null then
    raise exception 'report_target_missing: nothing was named to report' using errcode = '22023';
  end if;
  if p_target_kind is null or p_target_kind not in
     ('post', 'post_comment', 'note', 'note_comment', 'message', 'group_message', 'profile') then
    raise exception 'report_target_invalid: "%" is not something this app can report',
      coalesce(p_target_kind, 'null') using errcode = '22023';
  end if;
  if not exists (select 1 from moderation_reasons r where r.key = p_reason and r.is_active) then
    raise exception 'report_reason_invalid: "%" is not a reason this app offers',
      coalesce(p_reason, 'null') using errcode = '22023';
  end if;

  v_owner := moderation_target_owner(p_target_kind, p_target_id);

  if v_owner is null then
    -- Covers all three of: it never existed, it has been deleted, and you
    -- cannot see it. Deliberately ONE message — telling a caller which of the
    -- three it was is the probe this check exists to close.
    raise exception 'report_target_missing: that content is no longer there, or you can no longer see it'
      using errcode = '22023';
  end if;

  if v_owner = v_me then
    raise exception 'self_report: that is your own content — delete it instead of reporting it'
      using errcode = '22023';
  end if;

  -- Generous on purpose: someone working through a night of abuse from one
  -- account must not hit it, and the per-target unique constraint already stops
  -- the common accidental double-send. This catches a script.
  if moderation_recent_report_count() >= 30 then
    raise exception 'rate_limited: too many reports in the last hour' using errcode = '54000';
  end if;

  begin
    insert into moderation_reports
      (reporter_id, target_kind, target_id, target_owner_id, reason, details, content_excerpt, context_label)
    values
      (v_me,
       p_target_kind,
       p_target_id,
       v_owner,
       p_reason,
       nullif(btrim(coalesce(p_details, '')), ''),
       left(nullif(btrim(coalesce(p_excerpt, '')), ''), 1000),
       left(nullif(btrim(coalesce(p_context, '')), ''), 200));
  exception when unique_violation then
    raise exception 'duplicate_report: you have already reported this' using errcode = '23505';
  end;
end;
$function$;

-- public.moderation_resolve(p_report_id uuid, p_status text, p_action text, p_note text)   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.moderation_resolve(p_report_id uuid, p_status text, p_action text DEFAULT 'none'::text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_me      uuid := auth.uid();
  v_actor   text;
  v_report  moderation_reports;
  v_action  text := coalesce(nullif(btrim(coalesce(p_action, '')), ''), 'none');
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('new', 'reviewing', 'actioned', 'dismissed') then
    raise exception 'invalid_status: "%" is not a status a report can be in', p_status using errcode = '22023';
  end if;
  if v_action not in ('none', 'content_removed', 'note_unpublished', 'user_warned', 'referred') then
    raise exception 'invalid_action: "%" is not an action this console can take', v_action using errcode = '22023';
  end if;

  select * into v_report from moderation_reports where id = p_report_id;
  if v_report.id is null then
    raise exception 'report_missing: that report is not there' using errcode = '22023';
  end if;

  if v_action = 'content_removed' then
    if v_report.target_kind = 'profile' then
      raise exception 'no_takedown_for_profile: a profile cannot be removed from here — record the decision and act in the Supabase dashboard' using errcode = '22023';
    elsif v_report.target_kind = 'note' then
      raise exception 'use_note_unpublished: a note is unpublished, not deleted — choose that action instead' using errcode = '22023';
    end if;

    case v_report.target_kind
      when 'post'          then delete from posts          where id = v_report.target_id;
      when 'post_comment'  then delete from post_comments  where id = v_report.target_id;
      when 'note_comment'  then delete from note_comments  where id = v_report.target_id;
      when 'message'       then delete from messages       where id = v_report.target_id;
      when 'group_message' then delete from group_messages where id = v_report.target_id;
      else null;
    end case;
  elsif v_action = 'note_unpublished' then
    if v_report.target_kind <> 'note' then
      raise exception 'invalid_action: only a note can be unpublished' using errcode = '22023';
    end if;
    update notes set is_public = false where id = v_report.target_id;
  end if;

  -- Names the actor in the audit row at the time of the action, rather than
  -- joining to profiles when the log is read: an audit entry has to keep making
  -- sense after the account that made it is renamed or deleted.
  select p.display_name into v_actor from profiles p where p.id = v_me;
  v_actor := coalesce(v_actor, 'administrator');

  update moderation_reports
     set status          = p_status,
         action_taken    = v_action,
         resolution_note = nullif(btrim(coalesce(p_note, '')), ''),
         handled_by      = v_me,
         handled_at      = case when p_status in ('actioned', 'dismissed') then now() else handled_at end,
         updated_at      = now()
   where id = p_report_id;

  insert into moderation_actions
    (report_id, actor_id, actor_name, target_kind, target_id, target_owner_id, action, old_status, new_status, note)
  values
    (p_report_id, v_me, v_actor, v_report.target_kind, v_report.target_id, v_report.target_owner_id,
     v_action, v_report.status, p_status, nullif(btrim(coalesce(p_note, '')), ''));
end;
$function$;

-- public.moderation_target_owner(p_target_kind text, p_target_id uuid)
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.moderation_target_owner(p_target_kind text, p_target_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_owner uuid;
begin
  if p_target_id is null then
    return null;
  end if;
  case p_target_kind
    when 'post'          then select p.user_id   into v_owner from posts p          where p.id = p_target_id;
    when 'post_comment'  then select c.author_id into v_owner from post_comments c   where c.id = p_target_id;
    when 'note'          then select n.user_id   into v_owner from notes n           where n.id = p_target_id;
    when 'note_comment'  then select c.author_id into v_owner from note_comments c   where c.id = p_target_id;
    when 'message'       then select m.sender_id into v_owner from messages m        where m.id = p_target_id;
    when 'group_message' then select m.sender_id into v_owner from group_messages m  where m.id = p_target_id;
    when 'profile'       then select pr.id       into v_owner from profiles pr       where pr.id = p_target_id;
    else return null;
  end case;
  return v_owner;
end;
$function$;

-- public.pin_group_message(p_message_id uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.pin_group_message(p_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  msg record;
begin
  select * into msg from public.group_messages where id = p_message_id;
  if msg is null then
    raise exception 'message not found';
  end if;
  if not public.is_group_member(msg.group_id) then
    raise exception 'not a member of this group';
  end if;
  update public.group_messages set pinned = false where group_id = msg.group_id and pinned;
  update public.group_messages set pinned = true where id = p_message_id;
end;
$function$;

-- public.pin_message(p_message_id uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.pin_message(p_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  msg record;
begin
  select * into msg from public.messages where id = p_message_id;
  if msg is null then
    raise exception 'message not found';
  end if;
  if auth.uid() not in (msg.sender_id, msg.receiver_id) then
    raise exception 'not a participant in this conversation';
  end if;
  update public.messages set pinned = false
    where pinned
      and least(sender_id, receiver_id) = least(msg.sender_id, msg.receiver_id)
      and greatest(sender_id, receiver_id) = greatest(msg.sender_id, msg.receiver_id);
  update public.messages set pinned = true where id = p_message_id;
end;
$function$;

-- public.profile_links_touch_updated_at()
--   origin: sql/017
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.profile_links_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- public.reading_seconds_this_month(p_user_id uuid)
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.reading_seconds_this_month(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(sum(seconds), 0)::int
  from public.reading_time_daily
  where user_id = p_user_id
    and day >= date_trunc('month', current_date)::date;
$function$;

-- public.report_assign(p_report_id uuid, p_assignee uuid)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_assign(p_report_id uuid, p_assignee uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_assignee is not null and not has_role_at_least('advisor', p_assignee) then
    raise exception 'reports can only be assigned to advisors and above'
      using errcode = '22023';
  end if;
  update reports set assigned_to = p_assignee where id = p_report_id;
  if not found then
    raise exception 'no such report' using errcode = '02000';
  end if;
end;
$function$;

-- public.report_counts()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_result jsonb;
begin
  if not has_role_at_least('advisor') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'by_status',   coalesce((select jsonb_object_agg(s.status, s.n)
                             from (select status, count(*) as n from reports group by status) s), '{}'::jsonb),
    'by_category', coalesce((select jsonb_object_agg(c.category, c.n)
                             from (select category, count(*) as n from reports group by category) c), '{}'::jsonb),
    'open',        (select count(*) from reports
                     where status in ('new', 'triaged', 'accepted', 'in_progress')),
    'untriaged',   (select count(*) from reports where status = 'new'),
    'unvoted_by_me', (select count(*) from reports r
                       where r.status in ('new', 'triaged', 'accepted', 'in_progress')
                         and not exists (select 1 from report_votes v
                                          where v.report_id = r.id and v.voter_id = auth.uid()))
  ) into v_result;

  return v_result;
end;
$function$;

-- public.report_detail(p_report_id uuid)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_detail(p_report_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_reveal boolean;
  v_result jsonb;
begin
  if not has_role_at_least('advisor') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_reveal := has_role_at_least('administrator')
              or app_setting_bool('reports.reveal_reporter_to_advisors', false);

  select jsonb_build_object(
    'report', to_jsonb(r) - case when v_reveal then '__none__' else 'reporter_id' end,
    'reporter_name', case when v_reveal then coalesce(p.display_name, u.email::text) end,
    'category_label', rc.label,
    'votes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'voter_id',   v.voter_id,
               'voter_name', coalesce(vp.display_name, vu.email::text),
               'voter_role', coalesce(vr.role, 'user'),
               'vote',       v.vote,
               'note',       v.note,
               'updated_at', v.updated_at
             ) order by v.updated_at desc)
      from report_votes v
      left join profiles vp    on vp.id = v.voter_id
      left join auth.users vu  on vu.id = v.voter_id
      left join user_roles vr  on vr.user_id = v.voter_id
      where v.report_id = r.id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'at',         h.created_at,
               'actor_id',   case when v_reveal then h.actor_id end,
               'actor_name', coalesce(hp.display_name, hu.email::text),
               'old_status', h.old_status,
               'new_status', h.new_status,
               'note',       h.note
             ) order by h.created_at desc)
      from report_status_audit h
      left join profiles hp   on hp.id = h.actor_id
      left join auth.users hu on hu.id = h.actor_id
      where h.report_id = r.id
    ), '[]'::jsonb)
  )
  into v_result
  from reports r
  left join report_categories rc on rc.key = r.category
  left join profiles p   on p.id = r.reporter_id
  left join auth.users u on u.id = r.reporter_id
  where r.id = p_report_id;

  if v_result is null then
    raise exception 'no such report' using errcode = '02000';
  end if;

  return v_result;
end;
$function$;

-- public.report_list(p_status text[], p_category text, p_target_kind text, p_search text, p_sort text, p_limit integer, p_offset integer)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_list(p_status text[] DEFAULT NULL::text[], p_category text DEFAULT NULL::text, p_target_kind text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_sort text DEFAULT 'priority'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, category text, category_label text, title text, body text, reporter_severity text, status text, priority_score numeric, vote_agree integer, vote_disagree integer, my_vote smallint, page_url text, route text, page_title text, target_kind text, target_id text, target_label text, selected_text text, build_id text, user_agent text, viewport_w integer, viewport_h integer, platform text, duplicate_of uuid, resolution_note text, resolved_at timestamp with time zone, assigned_to uuid, reporter_id uuid, reporter_name text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_limit   integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset  integer := greatest(coalesce(p_offset, 0), 0);
  v_sort    text := coalesce(p_sort, 'priority');
  v_search  text := nullif(btrim(coalesce(p_search, '')), '');
  v_pattern text;
  v_reveal  boolean;
begin
  if not has_role_at_least('advisor') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Reporter identity lives on this line and nowhere else. Ships true.
  v_reveal := has_role_at_least('administrator')
              or app_setting_bool('reports.reveal_reporter_to_advisors', false);

  -- ILIKE via a parameter, never concatenated; % and _ escaped so a search for
  -- "a_b" cannot become a wildcard. Same treatment as 019's admin_list_users.
  v_pattern := case when v_search is null then null
                    else '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  return query
  with matched as (
    select r.*
    from reports r
    where (p_status is null      or r.status = any (p_status))
      and (p_category is null    or r.category = p_category)
      and (p_target_kind is null or r.target_kind = p_target_kind)
      and (v_pattern is null
           or r.title ilike v_pattern escape '\'
           or r.body ilike v_pattern escape '\'
           or r.selected_text ilike v_pattern escape '\'
           or r.target_id ilike v_pattern escape '\')
  ),
  counted as (select count(*) as n from matched)
  select m.id,
         m.created_at,
         m.updated_at,
         m.category,
         rc.label,
         m.title,
         m.body,
         m.reporter_severity,
         m.status,
         m.priority_score,
         m.vote_agree,
         m.vote_disagree,
         mv.vote,
         m.page_url,
         m.route,
         m.page_title,
         m.target_kind,
         m.target_id,
         m.target_label,
         m.selected_text,
         m.build_id,
         m.user_agent,
         m.viewport_w,
         m.viewport_h,
         m.platform,
         m.duplicate_of,
         m.resolution_note,
         m.resolved_at,
         m.assigned_to,
         case when v_reveal then m.reporter_id end,
         case when v_reveal then coalesce(p.display_name, u.email::text) end,
         counted.n
  from matched m
  cross join counted
  left join report_categories rc on rc.key = m.category
  left join report_votes mv on mv.report_id = m.id and mv.voter_id = v_uid
  left join profiles p   on p.id = m.reporter_id
  left join auth.users u on u.id = m.reporter_id
  order by
    case when v_sort = 'priority' then m.priority_score end desc nulls last,
    case when v_sort = 'oldest'   then m.created_at end asc nulls last,
    m.created_at desc
  limit v_limit offset v_offset;
end;
$function$;

-- public.report_recalc_all_priorities()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_recalc_all_priorities()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_n integer := 0; v_id uuid;
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  for v_id in select id from reports loop
    perform report_recalc_priority(v_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$function$;

-- public.report_recalc_priority(p_report_id uuid)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: postgres, service_role
CREATE OR REPLACE FUNCTION public.report_recalc_priority(p_report_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform set_config('capstone.report_recalc', 'on', true);

  update reports r
     set vote_agree     = c.agree,
         vote_disagree  = c.disagree,
         priority_score = c.score
    from (
      select coalesce(count(*) filter (where v.vote = 1), 0)::integer  as agree,
             coalesce(count(*) filter (where v.vote = -1), 0)::integer as disagree,
             coalesce(sum(v.vote * report_vote_weight(coalesce(ur.role, 'user'))), 0)::numeric as score
      from report_votes v
      left join user_roles ur on ur.user_id = v.voter_id
      where v.report_id = p_report_id
    ) c
   where r.id = p_report_id;

  perform set_config('capstone.report_recalc', 'off', true);
end;
$function$;

-- public.report_set_status(p_report_id uuid, p_status text, p_resolution_note text, p_duplicate_of uuid)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_set_status(p_report_id uuid, p_status text, p_resolution_note text DEFAULT NULL::text, p_duplicate_of uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_target_status text;
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('new', 'triaged', 'accepted', 'in_progress',
                      'resolved', 'declined', 'duplicate') then
    raise exception 'unknown status %', p_status using errcode = '22023';
  end if;

  if p_status = 'duplicate' then
    if p_duplicate_of is null then
      raise exception 'duplicate_of is required when marking a report duplicate'
        using errcode = '22023';
    end if;
    if p_duplicate_of = p_report_id then
      raise exception 'a report cannot be a duplicate of itself' using errcode = '22023';
    end if;
    select r.status into v_target_status from reports r where r.id = p_duplicate_of;
    if v_target_status is null then
      raise exception 'no such report to duplicate against' using errcode = '02000';
    end if;
    -- No chains: point at the canonical report, not at another duplicate. This
    -- is also what makes a duplicate cycle impossible.
    if v_target_status = 'duplicate' then
      raise exception 'that report is itself marked duplicate; point at the original'
        using errcode = '22023';
    end if;
  end if;

  update reports
     set status          = p_status,
         resolution_note = coalesce(left(p_resolution_note, 4000), resolution_note),
         duplicate_of    = case when p_status = 'duplicate' then p_duplicate_of else null end
   where id = p_report_id;

  if not found then
    raise exception 'no such report' using errcode = '02000';
  end if;
end;
$function$;

-- public.report_upsert_category(p_key text, p_label text, p_description text, p_sort_order integer, p_is_active boolean)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_upsert_category(p_key text, p_label text, p_description text DEFAULT NULL::text, p_sort_order integer DEFAULT 100, p_is_active boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into report_categories (key, label, description, sort_order, is_active)
  values (p_key, p_label, p_description, coalesce(p_sort_order, 100), coalesce(p_is_active, true))
  on conflict (key) do update
    set label       = excluded.label,
        description = excluded.description,
        sort_order  = excluded.sort_order,
        is_active   = excluded.is_active;
end;
$function$;

-- public.report_vote(p_report_id uuid, p_vote integer, p_note text)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_vote(p_report_id uuid, p_vote integer, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid();
begin
  if not has_role_at_least('advisor') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from reports r where r.id = p_report_id) then
    raise exception 'no such report' using errcode = '02000';
  end if;

  if p_vote = 0 then
    delete from report_votes where report_id = p_report_id and voter_id = v_uid;
    return;
  end if;

  if p_vote not in (-1, 1) then
    raise exception 'vote must be -1, 0 or 1' using errcode = '22023';
  end if;

  insert into report_votes (report_id, voter_id, vote, note)
  values (p_report_id, v_uid, p_vote::smallint, left(p_note, 2000))
  on conflict (report_id, voter_id) do update
    set vote = excluded.vote,
        note = excluded.note;
end;
$function$;

-- public.report_vote_weight(p_role text)
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_vote_weight(p_role text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  select case
           when p_role in ('user', 'advisor', 'administrator', 'owner') then 1::numeric
           else 1::numeric
         end;
$function$;

-- public.report_votes_after_change()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_votes_after_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform report_recalc_priority(coalesce(new.report_id, old.report_id));
  return null;
end;
$function$;

-- public.report_votes_before_write()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.report_votes_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if v_uid is not null then
      new.voter_id := v_uid;
    end if;
    new.created_at := now();
    new.updated_at := now();
  else
    new.report_id  := old.report_id;
    new.voter_id   := old.voter_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$function$;

-- public.reports_audit_status()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.reports_audit_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.status is distinct from old.status then
    insert into report_status_audit (report_id, actor_id, old_status, new_status, note)
    values (new.id, auth.uid(), old.status, new.status, new.resolution_note);
  end if;
  return null;
end;
$function$;

-- public.reports_before_insert()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.reports_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid        uuid := auth.uid();
  v_hour_limit integer := app_setting_int('reports.max_per_hour', 5);
  v_day_limit  integer := app_setting_int('reports.max_per_day', 20);
  v_recent     integer;
begin
  new.status          := 'new';
  new.triaged_at      := null;
  new.resolved_at     := null;
  new.resolved_by     := null;
  new.resolution_note := null;
  new.duplicate_of    := null;
  new.assigned_to     := null;
  new.vote_agree      := 0;
  new.vote_disagree   := 0;
  new.priority_score  := 0;
  new.created_at      := now();
  new.updated_at      := now();

  -- auth.uid() is null on a privileged connection (SQL editor, service_role),
  -- which already bypasses RLS entirely; rate-limiting it would be theatre.
  if v_uid is null then
    return new;
  end if;

  new.reporter_id := v_uid;

  select count(*) into v_recent
    from reports where reporter_id = v_uid and created_at > now() - interval '1 hour';
  if v_recent >= v_hour_limit then
    raise exception 'rate_limited: at most % reports per hour', v_hour_limit;
  end if;

  select count(*) into v_recent
    from reports where reporter_id = v_uid and created_at > now() - interval '24 hours';
  if v_recent >= v_day_limit then
    raise exception 'rate_limited: at most % reports per day', v_day_limit;
  end if;

  -- Double-tap on a slow connection is the common case, not an attack.
  if exists (
    select 1 from reports
    where reporter_id = v_uid
      and title = new.title
      and body = new.body
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'duplicate_submission: an identical report was filed moments ago'
      using errcode = '23505';
  end if;

  return new;
end;
$function$;

-- public.reports_before_update()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.reports_before_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid   uuid := auth.uid();
  v_staff boolean;
begin
  -- The vote machinery. report_recalc_priority() is the only thing that can set
  -- this flag: its EXECUTE is revoked from anon and authenticated, so no client
  -- can reach it, and the flag is transaction-local.
  if coalesce(current_setting('capstone.report_recalc', true), 'off') = 'on' then
    return new;
  end if;

  -- A privileged connection with no JWT bypasses RLS anyway.
  if v_uid is null then
    new.updated_at := now();
    return new;
  end if;

  v_staff := has_role_at_least('administrator', v_uid);

  new.id             := old.id;
  new.reporter_id    := old.reporter_id;
  new.created_at     := old.created_at;
  new.vote_agree     := old.vote_agree;
  new.vote_disagree  := old.vote_disagree;
  new.priority_score := old.priority_score;

  -- Auto-captured context is immutable for everybody.
  new.page_url      := old.page_url;
  new.route         := old.route;
  new.page_title    := old.page_title;
  new.target_kind   := old.target_kind;
  new.target_id     := old.target_id;
  new.target_label  := old.target_label;
  new.selected_text := old.selected_text;
  new.build_id      := old.build_id;
  new.user_agent    := old.user_agent;
  new.viewport_w    := old.viewport_w;
  new.viewport_h    := old.viewport_h;
  new.platform      := old.platform;
  new.app_context   := old.app_context;

  if v_staff then
    -- Staff move the workflow; they do not rewrite what the reporter said.
    new.body              := old.body;
    new.reporter_severity := old.reporter_severity;

    if new.status is distinct from old.status then
      if old.status = 'new' then
        new.triaged_at := coalesce(old.triaged_at, now());
      end if;
      if new.status in ('resolved', 'declined', 'duplicate') then
        new.resolved_at := now();
        new.resolved_by := v_uid;
      else
        new.resolved_at := null;
        new.resolved_by := null;
      end if;
    else
      new.triaged_at  := old.triaged_at;
      new.resolved_at := old.resolved_at;
      new.resolved_by := old.resolved_by;
    end if;

    if new.status <> 'duplicate' then
      new.duplicate_of := null;
    end if;
  else
    if old.reporter_id <> v_uid then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    if old.status <> 'new' then
      raise exception 'report_locked: this report has been triaged and can no longer be edited';
    end if;

    new.category        := old.category;
    new.status          := old.status;
    new.triaged_at      := old.triaged_at;
    new.duplicate_of    := old.duplicate_of;
    new.resolution_note := old.resolution_note;
    new.resolved_by     := old.resolved_by;
    new.resolved_at     := old.resolved_at;
    new.assigned_to     := old.assigned_to;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

-- public.request_to_join_group(p_group_id uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.request_to_join_group(p_group_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  gname text;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Guests cannot request to join groups';
  end if;
  select name into gname from public.groups where id = p_group_id;
  if gname is null then
    raise exception 'Group not found';
  end if;
  if public.is_group_member(p_group_id) then
    raise exception 'You are already in this group';
  end if;
  insert into public.group_join_requests (group_id, user_id, status)
  values (p_group_id, auth.uid(), 'pending')
  on conflict (group_id, user_id) do update set status = 'pending', responded_at = null
    where group_join_requests.status = 'declined';
  return gname;
end;
$function$;

-- public.respond_to_join_request(p_request_id uuid, p_approve boolean)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.respond_to_join_request(p_request_id uuid, p_approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  req record;
begin
  select * into req from public.group_join_requests where id = p_request_id;
  if req is null then
    raise exception 'Request not found';
  end if;
  if not public.is_group_admin(req.group_id) then
    raise exception 'Only group admins can respond to join requests';
  end if;
  update public.group_join_requests
  set status = case when p_approve then 'approved' else 'declined' end, responded_at = now()
  where id = p_request_id;
  if p_approve then
    insert into public.group_members (group_id, user_id, role) values (req.group_id, req.user_id, 'member')
    on conflict do nothing;
  end if;
end;
$function$;

-- public.role_rank(p_role text)
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.role_rank(p_role text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  select case p_role
           when 'user'          then 0
           when 'advisor'       then 1
           when 'administrator' then 2
           when 'owner'         then 3
           else null
         end;
$function$;

-- public.set_app_setting(p_key text, p_value jsonb)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.set_app_setting(p_key text, p_value jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not has_role_at_least('owner') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from app_settings s where s.key = p_key) then
    raise exception 'unknown setting %', p_key using errcode = '22023';
  end if;
  update app_settings
     set value = p_value, updated_at = now(), updated_by = auth.uid()
   where key = p_key;
end;
$function$;

-- public.set_group_admin(p_group_id uuid, p_member_id uuid, p_is_admin boolean)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.set_group_admin(p_group_id uuid, p_member_id uuid, p_is_admin boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only the group owner can change admin status';
  end if;
  update public.group_members
  set role = case when p_is_admin then 'admin' else 'member' end
  where group_id = p_group_id and user_id = p_member_id and role <> 'owner';
end;
$function$;

-- public.set_user_role(p_user_id uuid, p_role text, p_note text)   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid       uuid := auth.uid();
  v_old_role  text;
  v_owners    integer;
begin
  if not has_role_at_least('owner') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;

  if p_user_id = v_uid then
    raise exception 'self_assignment: you cannot change your own role' using errcode = '42501';
  end if;

  if role_rank(p_role) is null then
    raise exception 'unknown role %', p_role using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'no such account' using errcode = '23503';
  end if;

  select r.role into v_old_role from user_roles r where r.user_id = p_user_id;

  -- Never leave the project with no owner.
  if v_old_role = 'owner' and p_role <> 'owner' then
    select count(*) into v_owners from user_roles where role = 'owner';
    if v_owners <= 1 then
      raise exception 'last_owner: cannot demote the only owner' using errcode = '42501';
    end if;
  end if;

  if p_role = 'user' then
    delete from user_roles where user_id = p_user_id;
  else
    insert into user_roles (user_id, role, granted_by, granted_at, note)
    values (p_user_id, p_role, v_uid, now(), left(p_note, 500))
    on conflict (user_id) do update
      set role       = excluded.role,
          granted_by = excluded.granted_by,
          granted_at = excluded.granted_at,
          note       = excluded.note;
  end if;
end;
$function$;

-- public.start_game_room(p_room_id uuid)   [SECURITY DEFINER]
--   origin: sql/001
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.start_game_room(p_room_id uuid)
 RETURNS game_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.start_saving_peter_room(p_room_id uuid)   [SECURITY DEFINER]
--   origin: sql/011
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.start_saving_peter_room(p_room_id uuid)
 RETURNS saving_peter_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.submit_answer(p_room_id uuid, p_question_index integer, p_answer_index integer, p_correct boolean, p_points integer)   [SECURITY DEFINER]
--   origin: sql/005,007
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.submit_answer(p_room_id uuid, p_question_index integer, p_answer_index integer, p_correct boolean, p_points integer)
 RETURNS game_players
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.submit_saving_peter_guess(p_room_id uuid, p_round_index integer, p_guess text, p_correct boolean, p_points integer)   [SECURITY DEFINER]
--   origin: sql/011
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.submit_saving_peter_guess(p_room_id uuid, p_round_index integer, p_guess text, p_correct boolean, p_points integer)
 RETURNS saving_peter_players
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- public.unblock_user(p_user_id uuid)   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.unblock_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  delete from user_blocks b where b.blocker_id = v_me and b.blocked_id = p_user_id;
end;
$function$;

-- public.unfiltered_content_owner(p_kind text, p_id uuid)   [SECURITY DEFINER]
--   origin: sql/028
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.unfiltered_content_owner(p_kind text, p_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_owner uuid;
begin
  if p_id is null then
    return null;
  end if;
  case p_kind
    when 'post' then select p.user_id into v_owner from posts p where p.id = p_id;
    when 'note' then select n.user_id into v_owner from notes n where n.id = p_id;
    else return null;
  end case;
  return v_owner;
end;
$function$;

-- public.unpin_group_message(p_message_id uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.unpin_group_message(p_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  msg record;
begin
  select * into msg from public.group_messages where id = p_message_id;
  if msg is null then
    raise exception 'message not found';
  end if;
  if not public.is_group_member(msg.group_id) then
    raise exception 'not a member of this group';
  end if;
  update public.group_messages set pinned = false where id = p_message_id;
end;
$function$;

-- public.unpin_message(p_message_id uuid)   [SECURITY DEFINER]
--   origin: HAND-MADE IN THE DASHBOARD — not in sql/
--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.unpin_message(p_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.messages set pinned = false
    where id = p_message_id
      and (sender_id = auth.uid() or receiver_id = auth.uid());
end;
$function$;

-- public.user_roles_audit()   [SECURITY DEFINER]
--   origin: sql/025
--   execute granted to: PUBLIC, anon, authenticated, postgres, service_role
CREATE OR REPLACE FUNCTION public.user_roles_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into role_audit (target_user_id, actor_id, old_role, new_role, note)
  values (
    coalesce(new.user_id, old.user_id),
    auth.uid(),                                   -- null for a superuser grant
    case when tg_op = 'INSERT' then 'user' else old.role end,
    case when tg_op = 'DELETE' then 'user' else new.role end,
    case when tg_op = 'DELETE' then old.note else new.note end
  );
  return null;
end;
$function$;

-- ============================================================================
-- SEQUENCES IN public
-- ============================================================================
-- analytics_events_id_seq  owned by analytics_events.id
-- report_status_audit_id_seq  owned by report_status_audit.id
-- role_audit_id_seq  owned by role_audit.id

-- ============================================================================
-- PUBLICATIONS (Supabase realtime)
-- ============================================================================
-- supabase_realtime:
--   game_buzzes
--   game_players
--   game_rooms
--   group_join_requests
--   group_members
--   group_messages
--   messages
--   saving_peter_guesses
--   saving_peter_players
--   saving_peter_rooms

-- ============================================================================
-- STORAGE BUCKETS AND storage.objects POLICIES
-- ============================================================================
-- Not the public schema, but the app depends on them and sql/027, 030 and 031
-- are entirely about them, so a baseline that omitted them would be misleading.
-- Commented out throughout: these are Supabase-managed objects.
-- bucket avatars                public=true
-- bucket post-media             public=true

-- storage.objects  policy "avatars readable only by their owner"  for select to authenticated
--   using (bucket_id = 'avatars'::text AND (storage.foldername(name))[1] = auth.uid()::text)

-- storage.objects  policy "avatars_own_delete"  for delete to PUBLIC
--   using (bucket_id = 'avatars'::text AND (storage.foldername(name))[1] = auth.uid()::text)

-- storage.objects  policy "avatars_own_update"  for update to PUBLIC
--   using (bucket_id = 'avatars'::text AND (storage.foldername(name))[1] = auth.uid()::text)

-- storage.objects  policy "avatars_own_write"  for insert to PUBLIC
--   with check (bucket_id = 'avatars'::text AND (storage.foldername(name))[1] = auth.uid()::text)

-- storage.objects  policy "post media readable by whoever can see its post"  for select to authenticated
--   using (bucket_id = 'post-media'::text AND ((storage.foldername(name))[1] = auth.uid()::text OR (EXISTS ( SELECT 1
--        FROM posts p
--          CROSS JOIN LATERAL unnest(p.image_urls) img(url)
--       WHERE split_part(split_part(img.url, '/post-media/'::text, 2), '?'::text, 1) = ANY (ARRAY[objects.name, replace(objects.name, ' '::text, '%20'::text)]))) OR (EXISTS ( SELECT 1
--        FROM posts p
--       WHERE p.video_url IS NOT NULL AND (split_part(split_part(p.video_url, '/post-media/'::text, 2), '?'::text, 1) = ANY (ARRAY[objects.name, replace(objects.name, ' '::text, '%20'::text)]))))))

-- storage.objects  policy "users can delete their own post media"  for delete to authenticated
--   using (bucket_id = 'post-media'::text AND (storage.foldername(name))[1] = auth.uid()::text)

-- storage.objects  policy "users can upload their own post media"  for insert to authenticated
--   with check (bucket_id = 'post-media'::text AND (storage.foldername(name))[1] = auth.uid()::text)

-- ############################################################################
-- # END OF BASELINE — again: DOCUMENTATION ONLY. Do not run this file.        #
-- ############################################################################

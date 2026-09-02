-- ============================================================================
-- STATUS: APPLIED, THEN THE FEATURE WAS TURNED OFF.
--
-- These three tables and four helper functions DO exist in the live database
-- (this file was written and applied before the owner asked for Study Trips to
-- be removed). The UI that uses them is now disabled behind GroupsPanel's
-- SHOW_STUDY_TRIPS constant, so the tables sit empty and unreferenced. The
-- file is kept so the database's actual shape stays documented in the repo,
-- and so flipping SHOW_STUDY_TRIPS back on needs no database work. If the
-- tables should be dropped instead, that is a deliberate follow-up, not
-- something to do by deleting this file.
-- ============================================================================

-- ============================================================================
-- Group study trips: a leader-curated, ordered walk through the biblical
-- places behind a passage, with a shared note thread under each stop.
--
-- WHY THIS EXISTS
-- -----------------------------------------------------------------------
-- src/components/GroupsPanel.tsx has shipped a complete Study Trips tab since
-- the Groups panel grew one, and src/lib/supabase.ts has carried the three
-- row types (GroupStudyTrip / GroupStudyTripStop / GroupStudyTripStopNote)
-- for just as long -- but the tables were never created in this database and
-- no migration for them existed anywhere in sql/. The client swallows the
-- resulting error on purpose: isMissingStudyTripTableError() treats 42P01 /
-- PGRST205 as "not migrated yet" and the whole tab degrades to one quiet
-- notice, "Study trips will be available after the next database update."
-- Same failure mode as reading_plan_progress, fixed in sql/018.
--
-- SHAPE IS DICTATED BY THE CLIENT, which is the specification here:
--   fetchTrips()        select * from group_study_trips
--                       where group_id = ? order by created_at asc
--                       then select trip_id from group_study_trip_stops
--                       where trip_id in (...)            -- stop counts
--   handleCreateTrip()  insert {group_id, created_by, title, description}
--   handleSaveTrip()    update {title, description, updated_at} where id = ?
--   handleDeleteTrip()  delete where id = ?
--   fetchStopsAndNotes() select * from group_study_trip_stops
--                        where trip_id = ? order by position asc
--                        select * from group_study_trip_stop_notes
--                        where stop_id in (...) order by created_at asc
--   handleAddStop()     insert {trip_id, position, location_id, label,
--                               scripture_ref, description}
--   handleSaveStop()    update {label, scripture_ref, description}
--   persistPositions()  update {position} -- two phases, park at +1000 then
--                       land, because position is unique within a trip
--   handleAddNote()     insert {stop_id, author_id, body}
--   handleSaveNote()    update {body, updated_at} where id = ?
--   handleDeleteNote()  delete where id = ?
-- No upserts anywhere, so there are no onConflict targets to honour; the only
-- uniqueness the client depends on is (trip_id, position), which its
-- park-then-land reorder exists specifically to work around.
--
-- series_id is on the GroupStudyTrip interface but no code path reads or
-- writes it. It is created here anyway, nullable and free-form text (NOT a
-- foreign key -- study series are not database rows), so `select *` returns
-- exactly the declared TypeScript shape.
--
-- location_id is a raw id from either static dataset (src/data/locations.ts
-- OR src/data/pois.ts, no prefix), resolved locations-first by
-- resolveStopPlace() -- so it is plain text with no referential integrity to
-- enforce here, just a length cap.
--
-- Not auto-applied by anything in this repo (there is no migrations tooling
-- here yet) -- run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/020_group_study_trips.sql
-- or paste it into the Supabase project's SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
--
-- FKs follow the existing group tables exactly: group_id -> groups(id) and
-- every user column -> auth.users(id), both ON DELETE CASCADE. auth.users and
-- not profiles, for the same reason sql/018 gives: this database has anonymous
-- ("Continue as Guest") accounts with no profiles row, and group_messages
-- .sender_id already points at auth.users.
--
-- Length checks mirror the maxLength attributes the UI already enforces, so a
-- hand-rolled request cannot store more than the app itself will ever show:
-- title 80 (same as groups.name), description 300 (same as
-- groups.description), stop label 80, stop description 2000, note body 4000
-- (same as group_messages.body).
-- ----------------------------------------------------------------------------

create table if not exists group_study_trips (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  -- Free-form label for a study series, not a foreign key. Unused by the
  -- client today; present so `select *` matches the GroupStudyTrip interface.
  series_id text check (series_id is null or char_length(series_id) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- fetchTrips() always filters by group_id and orders by created_at.
create index if not exists group_study_trips_group_created_idx
  on group_study_trips (group_id, created_at);

create table if not exists group_study_trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references group_study_trips(id) on delete cascade,
  -- 1-based and unique within a trip. The uniqueness is load-bearing: it is
  -- what makes handleMoveStop's two-phase renumber necessary, and what stops a
  -- racing add-stop from silently duplicating a slot. Parked rows sit at
  -- position + 1000 mid-reorder, which the >= 1 check happily allows.
  position integer not null check (position >= 1),
  -- Raw id from the locations OR pois static dataset, no prefix.
  location_id text not null check (char_length(location_id) between 1 and 200),
  label text check (label is null or char_length(label) <= 80),
  -- Plain text, e.g. "Acts 16:12"; only drives the Read button when it parses.
  scripture_ref text check (scripture_ref is null or char_length(scripture_ref) <= 100),
  description text check (description is null or char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  unique (trip_id, position)
);

-- The unique constraint's index already covers "this trip's stops, in order".

create table if not exists group_study_trip_stop_notes (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references group_study_trip_stops(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- fetchStopsAndNotes() fetches notes by stop_id (IN) ordered by created_at.
create index if not exists group_study_trip_stop_notes_stop_created_idx
  on group_study_trip_stop_notes (stop_id, created_at);

-- ----------------------------------------------------------------------------
-- Membership helpers
--
-- This is group data, not per-user data, so every policy below is a membership
-- question -- and the existing group tables already answer that question with
-- two SECURITY DEFINER helpers, is_group_member(gid) and is_group_admin(gid),
-- introduced in sql/003 precisely to break the infinite recursion you get when
-- a group_members policy queries group_members. Trips are one hop from a group
-- and stops/notes are two and three hops, so rather than inline those joins
-- into every policy (and re-enter RLS on group_study_trips from a stop policy)
-- these four helpers walk the chain once, in SECURITY DEFINER context, and
-- delegate the actual membership test to the existing helpers. Same pattern,
-- one link further along.
-- ----------------------------------------------------------------------------

create or replace function is_study_trip_member(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_study_trips t
    where t.id = tid and is_group_member(t.group_id)
  );
$$;

create or replace function is_study_trip_admin(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_study_trips t
    where t.id = tid and is_group_admin(t.group_id)
  );
$$;

create or replace function is_study_trip_stop_member(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_study_trip_stops s
    where s.id = sid and is_study_trip_member(s.trip_id)
  );
$$;

create or replace function is_study_trip_stop_admin(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_study_trip_stops s
    where s.id = sid and is_study_trip_admin(s.trip_id)
  );
$$;

grant execute on function is_study_trip_member(uuid) to authenticated;
grant execute on function is_study_trip_admin(uuid) to authenticated;
grant execute on function is_study_trip_stop_member(uuid) to authenticated;
grant execute on function is_study_trip_stop_admin(uuid) to authenticated;

alter table group_study_trips enable row level security;
alter table group_study_trip_stops enable row level security;
alter table group_study_trip_stop_notes enable row level security;

-- ----------------------------------------------------------------------------
-- Row Level Security -- trips
--
-- READ: any member of the group. Non-members see nothing, which is the whole
-- point: a trip carries a group's study plan and its members' names, and
-- groups here are private by default (groups.is_public only affects *finding*
-- a group by name, never reading its contents -- see sql/014).
--
-- WRITE: owner/admin only, via is_group_admin. group_members.role is a real
-- three-value column ('owner' | 'admin' | 'member', checked at the table), the
-- UI computes isAdmin = role in (owner, admin) and hides every trip/stop
-- editor behind it, the UI copy says "a group leader can create one", and the
-- GroupStudyTrip doc comment in src/lib/supabase.ts already promises "Only the
-- group's owner/admins can create or edit trips (enforced by RLS)". So the
-- leader concept exists and this honours it rather than inventing one.
--
-- created_by = auth.uid() in the insert WITH CHECK is what rejects an
-- authorship hijack: posting someone else's created_by gets 42501 from
-- Postgres, not a silently-accepted row. The update WITH CHECK repeats both
-- conditions so an UPDATE cannot move a trip into another group or reassign
-- its author.
-- ----------------------------------------------------------------------------

create policy "group members read their group's study trips" on group_study_trips
  for select using (is_group_member(group_id));

create policy "group leaders create study trips" on group_study_trips
  for insert with check (is_group_admin(group_id) and created_by = auth.uid());

create policy "group leaders edit study trips" on group_study_trips
  for update using (is_group_admin(group_id)) with check (is_group_admin(group_id));

create policy "group leaders delete study trips" on group_study_trips
  for delete using (is_group_admin(group_id));

-- ----------------------------------------------------------------------------
-- Row Level Security -- stops
--
-- Same split, one hop out: members read, leaders curate. The UI agrees --
-- handleAddStop / handleSaveStop / handleMoveStop / handleDeleteStop are all
-- rendered behind isAdmin, and a non-leader sees "No stops yet -- a group
-- leader can add some."
--
-- The update policy needs both USING and WITH CHECK for the reorder to work
-- and to stay honest: USING admits the rows a leader may touch, WITH CHECK
-- stops an update from re-parenting a stop into a trip they do not lead.
-- ----------------------------------------------------------------------------

create policy "group members read study trip stops" on group_study_trip_stops
  for select using (is_study_trip_member(trip_id));

create policy "group leaders add study trip stops" on group_study_trip_stops
  for insert with check (is_study_trip_admin(trip_id));

create policy "group leaders edit study trip stops" on group_study_trip_stops
  for update using (is_study_trip_admin(trip_id)) with check (is_study_trip_admin(trip_id));

create policy "group leaders delete study trip stops" on group_study_trip_stops
  for delete using (is_study_trip_admin(trip_id));

-- ----------------------------------------------------------------------------
-- Row Level Security -- stop notes
--
-- Notes are SHARED, not private. The UI renders every note under a stop with
-- its author's display name ("You" for your own, the profile's name for
-- everyone else's) and calls the box "Add a note for the group..." -- so the
-- read rule is group membership, exactly like the trip itself, not authorship.
--
-- Writing: any member may add a note (authorship pinned to auth.uid(), which
-- is the hijack guard), edit ONLY their own, and delete their own. Deleting
-- someone else's is a leader power only -- which is precisely what the UI
-- offers: the actions row is shown when (own || isAdmin) but the Edit button
-- inside it is gated on `own` alone, so an admin gets Delete and no Edit.
--
-- Deliberately NOT copied from group_messages: its insert policy also requires
-- a non-anonymous JWT. Nothing in the Study Trips client makes that
-- distinction, and a guest who was admitted to a group can already post
-- nothing here that a member cannot -- so membership is the only gate.
-- ----------------------------------------------------------------------------

create policy "group members read study trip stop notes" on group_study_trip_stop_notes
  for select using (is_study_trip_stop_member(stop_id));

create policy "group members add study trip stop notes" on group_study_trip_stop_notes
  for insert with check (is_study_trip_stop_member(stop_id) and author_id = auth.uid());

create policy "authors edit their own study trip stop notes" on group_study_trip_stop_notes
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "authors and group leaders delete stop notes" on group_study_trip_stop_notes
  for delete using (author_id = auth.uid() or is_study_trip_stop_admin(stop_id));

-- Supabase's default privileges usually cover this, but the group tables were
-- created by hand outside this repo and these are not -- so be explicit.
-- Nothing is granted to anon: every policy above needs auth.uid().
grant select, insert, update, delete on group_study_trips to authenticated;
grant select, insert, update, delete on group_study_trip_stops to authenticated;
grant select, insert, update, delete on group_study_trip_stop_notes to authenticated;

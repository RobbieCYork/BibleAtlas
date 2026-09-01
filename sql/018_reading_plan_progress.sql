-- ============================================================================
-- Reading-plan progress: one row per completed day of a guided reading plan.
--
-- WHY THIS EXISTS
-- -----------------------------------------------------------------------
-- src/lib/supabase.ts has queried `reading_plan_progress` since the reading
-- plans feature shipped, but the table was never created in this database. The
-- client swallows the resulting error on purpose — isMissingPlanTableError()
-- treats 42P01 / PGRST205 as "not migrated yet" and silently falls back to the
-- localStorage mirror — so nothing broke visibly, but a signed-in reader's
-- progress never left their browser: it did not follow the account to another
-- device, and every page load logged a 404 for the missing relation.
--
-- SHAPE IS DICTATED BY THE CLIENT, which is the specification here:
--   fetchPlanProgress()      select day_number where user_id = ? and plan_id = ?
--   setPlanDayDone(done)     upsert {user_id, plan_id, day_number, completed_at}
--                            onConflict "user_id,plan_id,day_number"
--   setPlanDayDone(!done)    delete matching all three keys
--   mergeLocalPlanProgress() bulk upsert, same conflict target,
--                            ignoreDuplicates (ON CONFLICT DO NOTHING)
-- So (user_id, plan_id, day_number) is the primary key: it is exactly the
-- conflict target both upserts name, and marking the same day done twice must
-- be an update, not a second row. There is deliberately NO updated_at column —
-- the client never writes one, and completed_at (which the upsert does refresh)
-- already carries the only timestamp this feature has a use for.
--
-- plan_id is text, not a foreign key: plans are static content defined in
-- src/data/readingPlans.ts ('pauls-journeys', 'road-to-the-cross',
-- 'exodus-road', 'bible-in-a-year-canonical', 'bible-in-a-year-chronological',
-- 'new-testament-in-a-month'), not database rows. It is length-capped so a
-- hand-rolled request cannot use this table as free storage.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/018_reading_plan_progress.sql
-- or paste it into the Supabase project's SQL Editor.
-- ============================================================================

-- user_id references auth.users, NOT profiles. That is the precedent every other
-- private per-user table here follows (reading_progress, reading_time_daily,
-- highlights, notes, tags, sermon_notes, chapter_reads); only the social,
-- outward-facing tables — posts, post_comments, profile_links — point at
-- profiles. It also matters practically: this database currently has anonymous
-- ("Continue as Guest") accounts with no profiles row at all, and a profiles FK
-- would reject their progress outright.
create table if not exists reading_plan_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (length(plan_id) between 1 and 100),
  -- Plans run 8 to 365 days; the lower bound is what actually matters, since a
  -- day number is always positive and the client counts from 1.
  day_number integer not null check (day_number >= 1),
  completed_at timestamptz not null default now(),
  primary key (user_id, plan_id, day_number)
);

-- The PK's leading column already serves "all of one user's progress", but the
-- client always filters user_id *and* plan_id together, which the PK covers as a
-- prefix too. No extra index is needed.

alter table reading_plan_progress enable row level security;

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Progress is strictly private: there is no sharing story for it anywhere in the
-- client, so unlike profile_links (017) there is no visibility column and no
-- friends branch. Every policy is the same single condition — the row is yours.
-- ----------------------------------------------------------------------------

create policy "readers see only their own plan progress" on reading_plan_progress
  for select using (user_id = auth.uid());

-- WITH CHECK on insert is what rejects a user_id hijack: a client that posts
-- someone else's user_id gets 42501 from Postgres, not a silently-accepted row.
create policy "readers can record their own plan progress" on reading_plan_progress
  for insert with check (user_id = auth.uid());

-- Both USING and WITH CHECK: USING decides which rows may be updated at all,
-- WITH CHECK stops an update from reassigning a row to a different user_id.
-- Needed because setPlanDayDone's upsert becomes an UPDATE on conflict.
create policy "readers can update their own plan progress" on reading_plan_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Unchecking a day is a real delete, not a soft flag.
create policy "readers can erase their own plan progress" on reading_plan_progress
  for delete using (user_id = auth.uid());

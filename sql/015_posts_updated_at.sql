-- ============================================================================
-- Editable posts.
--
-- `posts` (sql/008_posts.sql) could be written and deleted but never revised,
-- and the feeds that render it (Newsfeed/PostsFeed) now offer the same inline
-- editor the `notes` table already has. Two things were missing:
--
--   1. An `updated_at` column. `notes` carries one, and the "(edited)" marker
--      in the UI is driven by updated_at drifting meaningfully past
--      created_at. Backfilled to created_at so existing posts don't claim to
--      have been edited.
--
--   2. Nothing, as it turns out, for the UPDATE policy: 008 already created
--      "owner can update their own posts" (for update using (user_id =
--      auth.uid())) and it is live. It is recreated here only to spell out the
--      WITH CHECK half. Postgres already applies the USING expression to the
--      new row when no WITH CHECK is given — so a user_id hijack was already
--      rejected — but leaving that implicit invites someone to later add a
--      WITH CHECK-less loosening and not notice. Behaviour is unchanged.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/015_posts_updated_at.sql
-- or paste it into the Supabase project's SQL Editor.
-- ============================================================================

alter table posts add column if not exists updated_at timestamptz;

update posts set updated_at = created_at where updated_at is null;

alter table posts alter column updated_at set default now();
alter table posts alter column updated_at set not null;

drop policy if exists "owner can update their own posts" on posts;
create policy "owner can update their own posts" on posts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

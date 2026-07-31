-- ============================================================================
-- "About Me" / Work / Education / Interests fields on profiles — every one of
-- them optional to fill out at all, and independently public or private via
-- profile_visibility (a field with no key in there, or `false`, is private —
-- visible only to the account itself; MyProfileView always shows every field
-- it has a value for, regardless of visibility, since that's the owner's own
-- view — visibility only governs what FriendProfileView shows someone else).
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/009_profile_details.sql
-- or paste it into the Supabase project's SQL Editor.
-- ============================================================================

alter table profiles
  add column if not exists location text,
  add column if not exists birthday date,
  add column if not exists relationship_status text,
  add column if not exists hobbies text,
  add column if not exists work_experience text,
  add column if not exists education text,
  add column if not exists favorite_band text,
  add column if not exists favorite_song text,
  add column if not exists favorite_tv_shows text,
  add column if not exists favorite_movies text,
  add column if not exists favorite_team_football text,
  add column if not exists favorite_team_basketball text,
  add column if not exists favorite_team_baseball text,
  add column if not exists favorite_team_hockey text,
  add column if not exists favorite_team_soccer text,
  -- { "location": true, "birthday": false, ... } — a key that's missing or false is private. Existing
  -- rows default to '{}' (everything private) so nothing already on a profile becomes unexpectedly
  -- public the moment this migration runs.
  add column if not exists profile_visibility jsonb not null default '{}'::jsonb;

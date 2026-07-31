-- ============================================================================
-- Lets people find this account by display name, not just exact email/phone
-- (see find_user_id_by_email / find_user_by_contact for those). Opt-in via
-- profiles.discoverable_by_name — a name search can return several people
-- with similar names, so this is more exposing than an exact email/phone
-- match and defaults to off.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/010_find_by_name.sql
-- or paste it into the Supabase project's SQL Editor.
-- ============================================================================

alter table profiles add column if not exists discoverable_by_name boolean not null default false;

-- SECURITY DEFINER so a search can match against every opted-in profile, not just ones the caller's
-- RLS already lets them see — same reasoning as find_user_id_by_email/find_user_by_contact. Excludes
-- the caller's own row (searching for yourself isn't useful here) and anyone who hasn't opted in.
create or replace function find_users_by_display_name(query text)
returns table (id uuid, display_name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select id, display_name, avatar_url
  from profiles
  where discoverable_by_name = true
    and display_name is not null
    and display_name ilike '%' || query || '%'
    and id <> auth.uid()
  order by display_name
  limit 20;
$$;

grant execute on function find_users_by_display_name(text) to authenticated;

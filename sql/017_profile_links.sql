-- ============================================================================
-- Social media / personal-site links on a profile, each one independently
-- private, friends-only, or public.
--
-- WHY A SEPARATE TABLE INSTEAD OF MORE `profiles` COLUMNS
-- -----------------------------------------------------------------------
-- 009_profile_details.sql put per-field visibility in `profiles.profile_visibility`
-- (a jsonb of booleans) and filters on it in FriendProfileView. That is a UI
-- filter, not a security boundary: Postgres RLS is *row*-level, so a policy that
-- lets you read someone's profile row hands you every column of it, and
-- `select("*")` on `profiles` already ships hidden fields to the client which
-- then chooses not to draw them. Links are the kind of thing people expect the
-- server to actually withhold, so they get their own table where one link is one
-- row and RLS can therefore filter them for real.
--
-- VISIBILITY IS PER-LINK, not one switch for the whole set. That follows the
-- precedent 009 set (visibility is already per-field on this profile, not
-- per-profile) and it is what "not necessarily public" asks for: a personal
-- website can be public while LinkedIn stays friends-only and a TikTok stays
-- private. Three levels:
--   'private' — only the owner. THE DEFAULT: a link is never visible to anyone
--               else until its owner deliberately opts it in.
--   'friends' — the owner plus accounts with an *accepted* friend_requests row.
--               A pending request grants nothing (note `fr.status = 'accepted'`;
--               the pre-existing `profiles_select_own_or_related` policy is
--               laxer than this on purpose, it does not gate on status).
--   'public'  — any signed-in account.
--
-- URL SAFETY IS ENFORCED HERE TOO, not only in the client. `url` is CHECKed
-- against '^https?://' so a hand-rolled request cannot park a `javascript:` URL
-- in another reader's profile page, where it would render as a clickable link.
-- The client normalizes and re-validates on both write and read as well.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/017_profile_links.sql
-- or paste it into the Supabase project's SQL Editor.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists profile_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  -- Closed set rather than free text: these are the networks the client draws an
  -- icon and a label for. Adding one later is this CHECK plus one entry in
  -- SOCIAL_LINK_CONFIGS (src/components/MyProfileView.tsx) — nothing else.
  platform text not null check (platform in ('website', 'instagram', 'facebook', 'x', 'youtube', 'tiktok', 'linkedin')),
  url text not null check (url ~* '^https?://[^\s]+$' and length(url) <= 500),
  visibility text not null default 'private' check (visibility in ('private', 'friends', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One link per network per account. Makes the editor a fixed list of rows and
  -- makes saving an idempotent upsert on (user_id, platform).
  unique (user_id, platform)
);

create index if not exists profile_links_user_idx on profile_links(user_id);

alter table profile_links enable row level security;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

-- Read: always your own, whatever its visibility. Someone else's only if that
-- specific row's visibility permits it. `visibility = 'private'` matches neither
-- branch, so a private row simply does not exist for anyone but its owner.
create policy "owner sees all their links, others only what visibility permits" on profile_links
  for select using (
    user_id = auth.uid()
    or visibility = 'public'
    or (
      visibility = 'friends'
      and exists (
        select 1 from friend_requests fr
        where fr.status = 'accepted'
          and ((fr.sender_id = auth.uid() and fr.receiver_id = profile_links.user_id)
            or (fr.receiver_id = auth.uid() and fr.sender_id = profile_links.user_id))
      )
    )
  );

-- Write: your own rows only. The WITH CHECK on insert is what rejects a
-- user_id hijack — a client that posts someone else's user_id gets 42501 from
-- Postgres, not a silently-accepted row.
create policy "owner can insert their own links" on profile_links
  for insert with check (user_id = auth.uid());

-- Both USING and WITH CHECK: USING decides which rows you may update at all,
-- WITH CHECK stops an update from reassigning a row to a different user_id.
create policy "owner can update their own links" on profile_links
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner can delete their own links" on profile_links
  for delete using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- updated_at bookkeeping
-- ----------------------------------------------------------------------------

create or replace function profile_links_touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profile_links_updated_at on profile_links;
create trigger profile_links_updated_at before update on profile_links
  for each row execute function profile_links_touch_updated_at();

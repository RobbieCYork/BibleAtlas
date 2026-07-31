-- ============================================================================
-- Standalone social posts for "My Posts" — a status update with optional
-- photos/video and tagged friends, independent of the verse-anchored `notes`
-- table (a note is commentary on a specific passage; a post isn't anchored to
-- one). PostsFeed/Newsfeed merge these with public notes into one feed,
-- sorted by created_at.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/008_posts.sql
-- or paste it into the Supabase project's SQL Editor.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  -- Public URLs into the `post-media` storage bucket below — not enforced by a FK (storage objects
  -- aren't relational), same trust level as profiles.avatar_url already has.
  image_urls text[] not null default '{}',
  video_url text,
  -- Friends tagged in this post. A plain array (no FK/join table) rather than relational, matching
  -- how loosely this app already treats similar "list of user ids" data (e.g. game_rooms.question_ids)
  -- — good enough for display ("with Jamie, Josiah"), not depended on for access control.
  tagged_user_ids uuid[] not null default '{}',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table posts enable row level security;
alter table post_comments enable row level security;

-- Same visibility rule as notes: the owner always sees their own; anyone else only sees it if it's
-- public AND they're an accepted friend of the owner.
create policy "owner or accepted friend can view public posts" on posts
  for select using (
    user_id = auth.uid()
    or (
      is_public
      and exists (
        select 1 from friend_requests fr
        where fr.status = 'accepted'
          and ((fr.sender_id = auth.uid() and fr.receiver_id = posts.user_id)
            or (fr.receiver_id = auth.uid() and fr.sender_id = posts.user_id))
      )
    )
  );

create policy "owner can insert their own posts" on posts
  for insert with check (user_id = auth.uid());

create policy "owner can update their own posts" on posts
  for update using (user_id = auth.uid());

create policy "owner can delete their own posts" on posts
  for delete using (user_id = auth.uid());

create policy "anyone who can see the post can view its comments" on post_comments
  for select using (
    exists (
      select 1 from posts p
      where p.id = post_comments.post_id
        and (
          p.user_id = auth.uid()
          or (
            p.is_public
            and exists (
              select 1 from friend_requests fr
              where fr.status = 'accepted'
                and ((fr.sender_id = auth.uid() and fr.receiver_id = p.user_id)
                  or (fr.receiver_id = auth.uid() and fr.sender_id = p.user_id))
            )
          )
        )
    )
  );

create policy "anyone who can see the post can comment on it" on post_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from posts p
      where p.id = post_comments.post_id
        and (
          p.user_id = auth.uid()
          or (
            p.is_public
            and exists (
              select 1 from friend_requests fr
              where fr.status = 'accepted'
                and ((fr.sender_id = auth.uid() and fr.receiver_id = p.user_id)
                  or (fr.receiver_id = auth.uid() and fr.sender_id = p.user_id))
            )
          )
        )
    )
  );

-- ----------------------------------------------------------------------------
-- Storage bucket for post photos/video — public read (same as the existing
-- `avatars` bucket), writes restricted to a user's own `${user_id}/...` folder.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post media is publicly readable" on storage.objects
  for select using (bucket_id = 'post-media');

create policy "users can upload their own post media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own post media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

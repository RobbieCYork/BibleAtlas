-- ============================================================================
-- POST MEDIA IS ENUMERABLE BY ANYONE — close the read policy.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/030_post_media_not_enumerable.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- ----------------------------------------------------------------------------
-- WHAT IS WRONG TODAY (verified against production, 2026-09-10, not inferred
-- from this repo — the two have disagreed before)
-- ----------------------------------------------------------------------------
-- sql/008 created the `post-media` bucket with:
--
--     create policy "post media is publicly readable" on storage.objects
--       for select using (bucket_id = 'post-media');
--
-- and `public = true` on the bucket. Both are still exactly that in production.
-- The policy carries no `to` clause, so it applies to the `public` role — which
-- is to say anon as well as authenticated.
--
-- A SELECT policy on storage.objects governs `list()`, not only object reads.
-- So that predicate does not mean "these files are readable by URL". It means:
--
--   * anyone at all — no account, no session, only the anon key that ships in
--     the app's own JavaScript bundle — can `list()` the bucket root and get
--     back one folder per account that has ever attached media to a post. The
--     folder name IS the account's auth user id.
--   * listing each of those folders returns every object under it, with size
--     and mime type.
--   * because the bucket is also `public = true`, each of those objects is then
--     downloadable from /storage/v1/object/public/post-media/... with no
--     credential of any kind — not even the anon key.
--
-- This was confirmed by walking it from outside: an unauthenticated request
-- enumerated both account folders, then fetched all three objects (two JPEGs
-- and a .MOV) at HTTP 200 with full bytes. It is not theoretical.
--
-- sql/027 (written, NOT applied — `sermon-note-images` does not exist in
-- production) already described this failure mode in prose while explaining why
-- ITS bucket would be private. Nothing had yet gone back and fixed the bucket
-- the prose was describing. This file is that.
--
-- `avatars` has the identical shape (`avatars_public_read`, `bucket_id =
-- 'avatars'`, role `public`, bucket `public = true`). A profile picture is
-- meant to be world-readable so the object contents are not the problem there,
-- but the enumeration is the same: the bucket root lists one folder per account
-- id. That is a separate decision and a separate migration; this file does not
-- touch `avatars`.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CHANGES, AND WHAT IT DELIBERATELY DOES NOT
-- ----------------------------------------------------------------------------
-- It replaces the read policy so that an object in `post-media` is readable by
--
--   (a) the account whose folder it is in, always; and
--   (b) anyone who can already see a post that references it.
--
-- (b) is not a restatement of the friends-and-is_public rule. It is a subquery
-- against `public.posts`, which has RLS enabled, evaluated as the calling role
-- — so the subquery can only ever find posts the caller is already permitted to
-- read under "owner or accepted friend can view public posts". If that rule
-- changes, this policy follows it with no edit here. That is the whole point of
-- writing it this way rather than copying the friend_requests EXISTS clause the
-- way post_comments did in sql/008.
--
-- (a) exists for two reasons. An object is uploaded before the post row that
-- references it, so without it a failed insert would strand a file its own
-- owner could not see; and production already holds one such orphan
-- (ad40e977-…/1785462868134-0-IMG_0841.jpeg is in the bucket and referenced by
-- no post). It also keeps the folder-per-account convention that the INSERT and
-- DELETE policies from sql/008 already enforce as the single source of truth
-- for who owns a file.
--
-- No infinite recursion (42P17): this policy reads `posts`, whose policy reads
-- `friend_requests`, whose policies read nothing but their own columns and
-- auth.uid(). Nothing in that chain reads back into storage.objects. The
-- recursion this project hit in sql/003 and sql/012 was a table whose policy
-- selected from itself; this is not that shape.
--
-- The URL match is a suffix comparison because the link from an object to its
-- post is a URL string in `posts.image_urls` / `posts.video_url`, not a foreign
-- key — sql/008 says so in its own comment. `getPublicUrl` percent-encodes the
-- path, so the stored string is not always byte-identical to `objects.name`;
-- the comparison normalises the one character that realistically differs (a
-- space) and strips any query string. If a filename ever encodes to something
-- else, the match FAILS CLOSED — the image stops rendering for a friend, it
-- does not become readable by a stranger. The permanent fix for that
-- brittleness is for the app to store the storage PATH and mint signed URLs,
-- which is the same change the bucket flip below needs anyway.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE DOES NOT DO: `public = false`
-- ----------------------------------------------------------------------------
-- A bucket marked `public = true` serves /storage/v1/object/public/<...> WITHOUT
-- consulting storage.objects policies at all. So after this migration:
--
--   * enumeration is dead. No account, and certainly no anonymous caller, can
--     list the bucket or discover another account's folder or filenames.
--   * an object is still fetchable by anyone holding its exact URL. Those URLs
--     live in `posts.image_urls`, which is RLS-protected, so the only people who
--     can obtain one are the people allowed to see the post. This is the same
--     posture `avatars` has had since day one.
--
-- Closing that last gap means `update storage.buckets set public = false where
-- id = 'post-media';` — and that is NOT in this file, on purpose. The app stores
-- permanent public URLs in the posts row (src/components/PostsFeed.tsx, around
-- line 493) and renders them straight into <img>/<video> (Newsfeed.tsx:512,
-- PostsFeed.tsx:317). Flip the bucket before the app mints signed URLs the way
-- src/lib/noteImages.ts already does, and every existing post image and video
-- breaks for everyone, including its owner. That is an app change plus a
-- migration applied together, not a line to slip in here.
--
-- Apply THIS file today: it is non-breaking on its own, and it is the half that
-- stops a stranger walking the bucket.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Out with the old.
-- ----------------------------------------------------------------------------
drop policy if exists "post media is publicly readable" on storage.objects;

-- ----------------------------------------------------------------------------
-- In with the composed one.
-- ----------------------------------------------------------------------------
create policy "post media readable by whoever can see its post" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'post-media'
    and (
      -- (a) your own folder, always.
      (storage.foldername(name))[1] = auth.uid()::text

      -- (b) referenced by a post you are allowed to read. `posts` RLS does the
      -- deciding; this only has to find the reference.
      or exists (
        select 1
        from public.posts p
        cross join lateral unnest(p.image_urls) as img(url)
        where split_part(split_part(img.url, '/post-media/', 2), '?', 1)
              in (objects.name, replace(objects.name, ' ', '%20'))
      )
      or exists (
        select 1
        from public.posts p
        where p.video_url is not null
          and split_part(split_part(p.video_url, '/post-media/', 2), '?', 1)
              in (objects.name, replace(objects.name, ' ', '%20'))
      )
    )
  );

-- ----------------------------------------------------------------------------
-- The INSERT and DELETE policies from sql/008 are already owner-scoped and are
-- left exactly as they are. There is deliberately still no UPDATE policy on
-- this bucket, which is why an upload cannot overwrite an existing key — that
-- is the pre-existing behaviour and changing it is not this file's business.
-- ----------------------------------------------------------------------------

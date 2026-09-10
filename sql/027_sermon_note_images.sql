-- ============================================================================
-- SERMON NOTE IMAGES — a private bucket for slides photographed during a sermon.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/027_sermon_note_images.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- ----------------------------------------------------------------------------
-- UNTIL THIS IS APPLIED
-- ----------------------------------------------------------------------------
-- "Add text from image" works with no server involvement at all — the text is
-- read on the device and typed into the note, and nothing is uploaded. It needs
-- nothing from this file.
--
-- "Add image" needs this bucket. Without it the upload fails, the app says so
-- and offers the text instead, and the note is untouched. Nothing else in the
-- app changes. So this is safe to leave unapplied for as long as you like; it
-- just means half the feature is waiting.
--
-- ----------------------------------------------------------------------------
-- WHY THIS BUCKET IS PRIVATE WHEN THE OTHER TWO ARE NOT
-- ----------------------------------------------------------------------------
-- `avatars` and `post-media` are public-read, which is right for them: those
-- hold things a reader is publishing. A sermon note is the opposite — a private
-- document, readable only by the account that wrote it — and a photograph
-- inside one inherits that.
--
-- The exposure of a public bucket is not only "anyone with the link". A SELECT
-- policy on storage.objects also governs `list()`, so the shape used by the
-- other two buckets --
--
--     for select using (bucket_id = 'post-media')
--
-- -- lets ANY signed-in account enumerate the objects under ANY other account's
-- folder and then read them. For post media that is close to the intent. For a
-- photograph of the slide at somebody's church, taken inside a private note, it
-- is one user reading another user's photographs. Hence the owner check on the
-- read policy below, and hence the app displaying these through short-lived
-- signed URLs (src/lib/noteImages.ts) rather than storing a permanent one.
--
-- Every policy here matches `(storage.foldername(name))[1]` against
-- `auth.uid()`, so the account id being the first folder of the object name is
-- the whole access rule. The app writes `<account id>/<uuid>.jpg` and the
-- sanitiser in src/lib/richText.ts refuses to store any other shape.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- The bucket
-- ----------------------------------------------------------------------------
-- public = false: no unauthenticated read path exists at all, and every display
-- goes through a signed URL minted for the owner's own session.
--
-- The size limit is a backstop, not the mechanism. The client downscales to
-- 1600px and re-encodes as JPEG before uploading, which lands around 200-350 KB;
-- 5 MB is far above anything that pipeline can produce, and exists so that a
-- broken or bypassed client cannot put a 40 MB file on the bill.
--
-- allowed_mime_types keeps this bucket to still images. It is not a security
-- control on its own (the header is client-supplied) but it stops the bucket
-- quietly becoming general-purpose file hosting.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sermon-note-images',
  'sermon-note-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Policies. Owner-only, all four verbs.
-- ----------------------------------------------------------------------------

-- Read. This is the one that differs from the other buckets, and the reason
-- this file exists. `createSignedUrl` runs as the caller, so a signed URL can
-- only ever be minted for an object this policy already allows.
create policy "owner can read their own sermon note images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'sermon-note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner can upload their own sermon note images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sermon-note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update exists so an upsert (or a re-upload of the same key) is possible
-- without a delete first. Both halves are checked: `using` decides which rows
-- may be touched, `with check` decides what they may become, and without the
-- second an owner could rename an object into somebody else's folder.
create policy "owner can update their own sermon note images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'sermon-note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'sermon-note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete. Used when a note is deleted, so its photographs go with it.
create policy "owner can delete their own sermon note images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sermon-note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- STILL OPEN, DELIBERATELY: orphaned objects
-- ----------------------------------------------------------------------------
-- Deleting a note deletes its images (the app does this from the client, which
-- the delete policy above permits). An image the writer removes from a note they
-- KEEP is not collected by anything — the note is a text column and nothing
-- watches what leaves it.
--
-- Collecting those wants a server-side sweep: every object in this bucket whose
-- path does not appear in any `sermon_notes.body`, older than a day or so, gets
-- removed. That is a scheduled job and a function, not a policy, and it is worth
-- writing before this feature has years of use behind it rather than after. It
-- is left out of this file on purpose so that applying this one is a small,
-- reviewable decision.
--
-- Note also that `sermon_notes` itself was created outside this numbered
-- sequence and so is not described anywhere in sql/. Nothing here touches that
-- table; if its policies ever need to be read, they have to be read from the
-- database.

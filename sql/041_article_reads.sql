-- ============================================================================
-- 041_article_reads.sql — "MARK THIS ARTICLE AS READ"
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand:
--           psql "$SUPABASE_DB_URL" -f sql/041_article_reads.sql
--         or paste it into the Supabase project's SQL Editor.
--
-- NUMBERING: 040 is the last written; 041 is the next free number.
--            Append-only — see sql/README.md.
-- ============================================================================
--
-- WHAT THIS IS
-- ----------------------------------------------------------------------------
-- The article twin of chapter_reads. Every article panel (place, site, person,
-- topic, timeline event, book introduction) ends in a "Mark this article as
-- read" checkbox, and a ticked article shows a small check beside its title —
-- the same pair the Bible panel has for chapters. One row = one article this
-- account has marked read. Client: src/lib/articleReads.ts.
--
-- WHY NOT chapter_reads ITSELF
-- ----------------------------------------------------------------------------
-- chapter_reads is (user_id, book text, chapter integer). Putting an article in
-- it means a fake "book" and a fake chapter number, and every reader of that
-- table — the profile reading grid, chaptersReadThisMonth(), the admin growth
-- series in sql/026 — would start counting articles as chapters of the Bible.
--
-- SHAPE IS DICTATED BY THE CLIENT
-- ----------------------------------------------------------------------------
--   load      select kind, article_id where user_id = auth.uid()   (paged)
--   tick      upsert {user_id, kind, article_id, read_at}
--             — on conflict (the PK) updates read_at, so UPDATE is needed
--   untick    delete where user_id, kind, article_id
-- So (user_id, kind, article_id) is the primary key. The PK's leading column
-- serves "all of one user's marks"; no other index is needed.
--
-- `article_id` is the record's own `id` from src/data/*.ts — the same id in
-- the permanent public URL (/place/<id>, /person/<id>, …; AGENTS.md) — or, for
-- a book introduction, the book's canonical name. Text, not a foreign key:
-- articles are static content, not database rows. Length-capped so a
-- hand-rolled request cannot use this table as free storage. `kind` is a
-- closed set and must match ArticleKind in src/lib/articleReads.ts.
--
-- user_id references auth.users, not profiles — the precedent every private
-- per-user table here follows (sql/018 explains why: "Continue as Guest"
-- accounts have no profiles row, and they get the chapter checkbox too).
-- ON DELETE CASCADE, so account deletion takes these rows with it and the
-- delete-account Edge Function needs no change.
--
-- PRIVACY: OWNER-ONLY
-- ----------------------------------------------------------------------------
-- chapter_reads is readable by friends (it drives the friend-profile reading
-- grid). Nothing in the app shows anyone else's article marks, so this table
-- does not open that door: every policy is the same single condition, the row
-- is yours. Widening it later is a deliberate new policy, not an accident.
--
-- GRANTS: REVOKE TO ZERO, THEN GRANT BACK (sql/README.md, sql/035, sql/037)
-- ----------------------------------------------------------------------------
-- Supabase's default ACL hands every new table full CRUD to anon AND
-- authenticated at create-table time. This revokes everything first, then
-- grants back only what a signed-in owner needs, to `authenticated` only.
-- Guest sessions are anonymous *users* and carry the `authenticated` role, so
-- they keep the control exactly as they keep the chapter one; the `anon` role
-- (no session at all) gets nothing, and the app draws no checkbox for it.
--
-- No functions, so no search_path to pin (sql/034).
--
-- IDEMPOTENT: create table if not exists; policies dropped-if-exist then
-- created; revoke/grant are naturally repeatable. Safe to run twice.
-- ============================================================================

begin;

create table if not exists public.article_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null
    check (kind in ('place', 'site', 'person', 'topic', 'event', 'book-intro')),
  article_id text not null check (length(article_id) between 1 and 200),
  read_at timestamptz not null default now(),
  primary key (user_id, kind, article_id)
);

alter table public.article_reads enable row level security;

revoke all on public.article_reads from anon, authenticated;

drop policy if exists "article_reads_select_own" on public.article_reads;
create policy "article_reads_select_own" on public.article_reads
  as permissive for select to authenticated
  using (auth.uid() = user_id);

-- WITH CHECK is what rejects a user_id hijack on insert.
drop policy if exists "article_reads_insert_own" on public.article_reads;
create policy "article_reads_insert_own" on public.article_reads
  as permissive for insert to authenticated
  with check (auth.uid() = user_id);

-- Needed because the tick is an upsert: on conflict it becomes an UPDATE.
-- USING picks which rows may be updated; WITH CHECK stops reassigning one.
drop policy if exists "article_reads_update_own" on public.article_reads;
create policy "article_reads_update_own" on public.article_reads
  as permissive for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "article_reads_delete_own" on public.article_reads;
create policy "article_reads_delete_own" on public.article_reads
  as permissive for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.article_reads to authenticated;

commit;

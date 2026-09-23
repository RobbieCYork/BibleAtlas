-- 037_prayer_list.sql
--
-- A personal prayer list: what someone is praying for, notes on it (same rich-text format sermon
-- notes already use), when it was added, and a checkbox for "answered". One new table, no changes
-- to anything that exists.
--
-- NOT APPLIED. Committed only — needs Robbie's explicit word, same as every migration since 033.
-- See sql/README.md for the applied/not-applied table; update it when this one actually runs.
--
-- ── WHY ITS OWN TABLE, NOT A ROW SHAPE BORROWED FROM sermon_notes ────────────────────────────────
-- sermon_notes carries `speaker` and `scripture_ref`, neither of which means anything for a prayer
-- item, and a prayer list needs `answered` / `answered_at`, which mean nothing for a sermon note.
-- Widening one table to serve both would mean every future column on either feature raises the
-- question "does this apply to the other kind of row too?" forever. Two tables means that question
-- never comes up. The notes BODY format is shared on purpose — see below — the SCHEMA is not.
--
-- ── WHY notes REUSES SERMON NOTES' RICH-TEXT FORMAT ───────────────────────────────────────────────
-- `notes` is a plain `text` column holding the exact same thing `sermon_notes.body` holds: either
-- legacy plain text, or sanitised HTML behind the `<!--capstone-rich:1-->` sentinel (lib/richText.ts).
-- That module's sanitiser, RichTextEditor and every helper (buildStoredBody, noteBodyToHtml,
-- noteBodyToPlainText, isHtmlEmpty) work on ANY column holding that shape — nothing in them is
-- specific to sermon_notes. Reusing the format means reusing the editor and the sanitiser verbatim,
-- with the same security property: no href, no src, no style, no data-*, nothing for a scheme to
-- hide in. (No photo/image support is wired up for prayer items — buildNoteImageHtml is never
-- called from this feature — but the column could hold one if that changed later; the sanitiser
-- does not need to know a caller is not using part of what it allows.)
--
-- ── OWNER-ONLY, LIKE sermon_notes — NOT LIKE 033's SHARED TABLES ──────────────────────────────────
-- A prayer list is nobody's business but the person who wrote it. Unlike Capstone for Churches
-- (033), there is no second party with any reason to read a row here, so this gets exactly one
-- shape of policy, four times: `auth.uid() = user_id`. No SECURITY DEFINER helper, no staff role,
-- no reveal-to-advisors toggle — none of that machinery exists because none of it is needed.
--
-- ── THE GRANT, DONE THE WAY sql/README.md SAYS TO DO IT ───────────────────────────────────────────
-- Supabase's project-wide default ACL hands every new table full CRUD to `anon` AND `authenticated`
-- at `create table` time — see "Every new table starts fully granted to anon and authenticated" in
-- sql/README.md. Granting on top of that (what most of this project's older migrations did) changes
-- nothing; the file then just describes privileges the database already has, which is worse than
-- describing nothing. This migration revokes to zero FIRST, then grants back only what a signed-in
-- owner needs, to `authenticated` only — `anon` gets nothing at all, matching the app's existing
-- rule that guest sessions cannot write anything personal (ReportIssueSheet's guest branch, the
-- reports table's `reports.allow_anonymous`). RLS is still the real boundary; this is the second
-- layer sql/README.md's TRUNCATE note says RLS alone does not cover.

create table public.prayer_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The one-line "what am I praying for" — required, short by convention (not by a length check
  -- here; the client caps it, the way ReportIssueSheet caps its title client-side).
  item text not null,
  -- Same stored shape as sermon_notes.body: '' , legacy plain text, or the rich-text sentinel format.
  notes text not null default ''::text,
  answered boolean not null default false,
  -- Null until the checkbox is ticked. Kept separate from `answered` (rather than inferring "when"
  -- from `updated_at`) because updated_at also moves on an ordinary edit to the notes — an item
  -- edited after being marked answered must not look like it was answered again just now.
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prayer_items_user_idx on public.prayer_items using btree (user_id, created_at desc);

alter table public.prayer_items enable row level security;

revoke all on public.prayer_items from anon, authenticated;

create policy "prayer_items_select_own" on public.prayer_items
  as permissive for select to authenticated
  using (auth.uid() = user_id);

create policy "prayer_items_insert_own" on public.prayer_items
  as permissive for insert to authenticated
  with check (auth.uid() = user_id);

create policy "prayer_items_update_own" on public.prayer_items
  as permissive for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "prayer_items_delete_own" on public.prayer_items
  as permissive for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.prayer_items to authenticated;

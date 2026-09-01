-- Highlights: allow a reader to UPDATE their own rows.
--
-- Until now `highlights` had only select/insert/delete policies, so the reader UI had no way to
-- change a highlight in place: re-colouring one, or dragging its edges, was implemented as
-- delete-then-insert. That worked but it churned the row id (breaking any link held to it) and had
-- a real failure mode — if the insert half failed after the delete succeeded, the highlight was
-- simply gone.
--
-- The unified verse-action sheet needs an honest re-colour (tap a different swatch on an
-- already-highlighted passage), so this adds the missing UPDATE policy. Scoped exactly like the
-- other three: USING restricts which rows a caller may target (only their own), and WITH CHECK
-- restricts what the row may become (still their own) — without WITH CHECK a user could reassign
-- one of their highlights to somebody else's account.
--
-- notes/tags/verse_tags are deliberately untouched here; `notes` already has the equivalent
-- "update own notes" policy, and tags/verse_tags are pure insert/delete toggles with nothing to
-- update.

drop policy if exists "update own highlights" on public.highlights;

create policy "update own highlights"
  on public.highlights
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

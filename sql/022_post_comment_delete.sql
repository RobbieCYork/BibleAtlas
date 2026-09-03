-- ============================================================================
-- POST COMMENTS — the missing DELETE policy.
--
-- Run once, by hand, the same way as sql/019_admin_and_analytics.sql:
--   psql "$SUPABASE_DB_URL" -f sql/022_post_comment_delete.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- sql/008_posts.sql enabled RLS on `post_comments` and then wrote only two
-- policies: SELECT ("anyone who can see the post can view its comments") and
-- INSERT ("anyone who can see the post can comment on it"). RLS denies by
-- default, so the absence of a DELETE policy is a deny, not an oversight the
-- client can route around: nobody can remove a post comment — not its author,
-- not the owner of the post it sits under.
--
-- `note_comments`, the older sibling table these were modelled on, has had the
-- right rule all along:
--     delete own comment or as note owner   DELETE
--       USING (author_id = auth.uid()
--              OR EXISTS (select 1 from notes n
--                          where n.id = note_comments.note_id
--                            and n.user_id = auth.uid()))
-- This migration gives `post_comments` the same shape against `posts`.
--
-- sql/019_admin_and_analytics.sql already worked around the gap for admins with
-- the SECURITY DEFINER `admin_delete_content()` RPC, which bypasses RLS. That
-- stays as-is — it covers moderation by an admin, which is a different grant
-- from a user tidying up after themselves. This policy covers the latter.
--
-- The USING clause deliberately does NOT restate the friend-visibility test the
-- SELECT policy above it applies. It doesn't need to: a DELETE with a WHERE
-- clause has to READ the target rows, so Postgres applies the SELECT policies
-- to it as well. Visibility is therefore already enforced, and repeating it
-- here would only be a second copy of a rule that can drift.
--
-- The practical consequence, verified against this database: an author who is
-- an accepted friend of the post owner can delete their own comment; the post
-- owner can delete anyone's comment on their post; an unrelated account can
-- delete neither. If the author and the post owner stop being friends, the
-- SELECT policy hides the thread from the author and the delete finds no rows
-- — the same way it already hides the comment from them for reading. That is
-- pre-existing `post_comments` SELECT behaviour, not something this policy
-- introduces, and `admin_delete_content()` remains the way such a comment gets
-- removed.
-- ============================================================================

drop policy if exists "delete own comment or as post owner" on post_comments;

create policy "delete own comment or as post owner" on post_comments
  for delete using (
    author_id = auth.uid()
    or exists (
      select 1 from posts p
      where p.id = post_comments.post_id
        and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- DIRECT MESSAGES AND GROUP MESSAGES — the missing DELETE policies.
--
-- Run once, by hand, the same way as sql/022_post_comment_delete.sql:
--   psql "$SUPABASE_DB_URL" -f sql/023_message_delete.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- The same bug sql/022 fixed on post_comments, in two more places. Auditing
-- every RLS-enabled table for a missing DELETE policy turned up:
--
--   messages         INSERT, SELECT, UPDATE   -- a DM can be edited, never deleted
--   group_messages   INSERT, SELECT           -- send to a group, never take it back
--
-- RLS denies by default, so in both cases "no policy" is a hard deny that no
-- client change can route around: nobody could delete a message they sent.
--
-- (The audit also flagged the analytics tables, reading_time_daily, and the
-- game/saving_peter round tables as DELETE-less. Those are left alone on
-- purpose — append-only telemetry and ephemeral round state, not user content
-- someone would expect to retract.)
--
-- ----------------------------------------------------------------------------
-- WHO MAY DELETE A DM: THE SENDER, AND ONLY THE SENDER
-- ----------------------------------------------------------------------------
-- A `messages` row is one record shared by two people, and there is no
-- per-side "hidden for me" column. So any DELETE here is a delete for BOTH
-- participants, not a client-side hide. Retracting your own words is
-- unambiguous and is what the sender expects. Letting the RECEIVER delete
-- would let them destroy the sender's own copy of a conversation, which is a
-- different and much larger power than "clear this from my inbox" — and it is
-- the one a reader would most likely assume they were getting.
--
-- If per-side hiding is wanted later, that is a schema change (a
-- `deleted_by_sender` / `deleted_by_receiver` pair, or a per-user join table)
-- filtered in the SELECT policy — NOT a widening of this DELETE policy.
--
-- The existing `messages_select_participant` policy lets the sender see their
-- own messages unconditionally, so a sender can always reach their own row to
-- delete it. (Recall from sql/022 that a DELETE with a WHERE clause reads its
-- target rows and therefore also applies the SELECT policies.)
-- ----------------------------------------------------------------------------

drop policy if exists "messages_delete_sender" on messages;

create policy "messages_delete_sender" on messages
  for delete using (sender_id = auth.uid());

-- ----------------------------------------------------------------------------
-- WHO MAY DELETE A GROUP MESSAGE: THE SENDER, OR A GROUP OWNER/ADMIN
-- ----------------------------------------------------------------------------
-- Same author-or-container-owner shape sql/022 gave post_comments and that
-- note_comments has always had. `is_group_admin()` is the existing STABLE
-- SECURITY DEFINER helper (it matches role in ('owner','admin')), reused here
-- rather than re-inlining the group_members lookup — the same way
-- `group_members_delete_self_or_admin` already composes it. The naming follows
-- that policy too.
--
-- Note the read-gating consequence: `group_messages_select_member` restricts
-- visibility to current members via is_group_member(), so someone who has LEFT
-- a group can no longer see — and therefore can no longer delete — messages
-- they sent while they were in it. A group owner/admin still can, which is the
-- path that matters for moderation. This mirrors the unfriended-author case
-- documented in sql/022 and is pre-existing SELECT behaviour, not something
-- introduced here.
-- ----------------------------------------------------------------------------

drop policy if exists "group_messages_delete_sender_or_admin" on group_messages;

create policy "group_messages_delete_sender_or_admin" on group_messages
  for delete using (
    sender_id = auth.uid()
    or is_group_admin(group_id)
  );

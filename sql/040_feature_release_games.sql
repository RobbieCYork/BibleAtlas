-- ============================================================================
-- 040_feature_release_games.sql — PER-GAME RELEASE STAGES (Testing / Live)
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand, AFTER sql/039:
--           psql "$SUPABASE_DB_URL" -f sql/040_feature_release_games.sql
--         or paste it into the Supabase project's SQL Editor.
--
-- NUMBERING: 039 (feature_release) is applied; 040 is the next free number.
--            Append-only — see sql/README.md.
-- ============================================================================
--
-- WHAT THIS DOES
-- ----------------------------------------------------------------------------
-- Adds one feature_release row per game in Game Center, each seeded LIVE, so
-- APPLYING THIS FILE CHANGES NOTHING ANY READER SEES:
--
--     game_bible_trivia   game_crossword      game_saving_peter
--     game_fill_blank     game_memorization   game_punchline
--     game_chronology
--
-- The parent/child rule lives in the app (src/lib/features.ts, decide()): a
-- game is shown only when BOTH games_trivia and the game's own row are Live.
-- games_trivia in Testing hides every game from non-owners; games_trivia Live
-- defers to each game.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
-- ----------------------------------------------------------------------------
-- It does not touch set_feature_stage(), current_user_is_owner(), any policy
-- or any grant. set_feature_stage() (sql/039 §4) has no hard-coded key list:
-- it validates p_feature against the rows that exist in feature_release
-- (`select ... for update; if not found then raise 'unknown feature'`). So
-- inserting these rows is, by itself, exactly what lets the owner flip them —
-- and leaving the SECURITY DEFINER function byte-for-byte as 039 created it
-- means its owner-only check, pinned search_path and EXECUTE grants are not
-- re-opened for review by this file at all.
--
-- New rows inherit feature_release's existing RLS (select for everyone, no
-- write policy) and its existing table grants (SELECT to anon/authenticated
-- only) — grants are per table, not per row, so nothing to re-issue.
--
-- The key format CHECK from 039 (`^[a-z][a-z0-9_]{1,62}$`) accepts all seven.
--
-- Not referenced by the delete-account Edge Function (it reads only
-- `account_deletion`) — no change there.
--
-- Idempotent: ON CONFLICT DO NOTHING, so a re-run neither duplicates a row nor
-- resets a game the owner has already moved to Testing.
-- ============================================================================

begin;

insert into feature_release (feature, live) values
  ('game_bible_trivia', true),
  ('game_crossword',    true),
  ('game_saving_peter', true),
  ('game_fill_blank',   true),
  ('game_memorization', true),
  ('game_punchline',    true),
  ('game_chronology',   true)
on conflict (feature) do nothing;

commit;


-- ============================================================================
-- AFTER APPLYING
-- ============================================================================
-- 1. Fifteen rows; the seven game_* rows Live:
--      select feature, live from feature_release order by feature;
--
-- 2. Grants unchanged from 039 — expect exactly these three rows:
--      select table_name, grantee,
--             string_agg(distinct privilege_type, ', ' order by privilege_type)
--        from information_schema.role_table_grants
--       where table_schema = 'public'
--         and grantee in ('anon', 'authenticated')
--         and table_name in ('feature_release', 'feature_release_log')
--       group by 1, 2 order by 1, 2;
--
-- 3. Signed in as the owner, Admin Console -> Features: the seven games are
--    listed under Games & Trivia. Flip one to Testing and back; two rows
--    appear in feature_release_log for that game.
--
-- REVERSIBLE — but only before any game has been flipped (feature_release_log
-- references feature_release ON DELETE RESTRICT, by design: the audit trail is
-- not deleted with a feature). With no log rows for them:
--      delete from feature_release where feature like 'game\_%';
-- The app treats a missing row as Live, so removing them shows every game.
-- ============================================================================

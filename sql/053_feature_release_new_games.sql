-- ============================================================================
-- 053_feature_release_new_games.sql — release-stage rows for Daily Name and 20 Questions
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, like every migration. Run once, by hand:
--           psql "$SUPABASE_DB_URL" -f sql/053_feature_release_new_games.sql
--         or paste it into the Supabase project's SQL Editor.
--
-- NUMBERING: 053 was the next free number across every branch on 2026-11-26 (see sql/README.md).
-- ============================================================================
--
-- THE APP DOES NOT NEED THIS TO SHOW THE GAMES.
-- ----------------------------------------------------------------------------
-- src/lib/features.ts treats a feature with no feature_release row as LIVE (the same fail-open rule
-- sql/040's games relied on before that file was applied). So Daily Name and 20 Questions are
-- visible to every reader as soon as the app ships, with or without this file.
--
-- What this file adds is the owner's switch. set_feature_stage() (sql/039 §4) only accepts a key
-- that already has a row; until these rows exist, flipping either game in Admin Console ->
-- Features fails with "This game's stage row (sql/053) hasn't been applied", and the Features tab
-- says the game is "Not stored yet".
--
-- Both rows are seeded LIVE, so APPLYING THIS FILE CHANGES NOTHING ANY READER SEES.
--
-- WHAT THIS DELIBERATELY DOES NOT DO — identical reasoning to sql/040: no change to
-- set_feature_stage(), current_user_is_owner(), any policy or any grant. New rows inherit
-- feature_release's RLS (select for everyone, no write policy) and its table grants. Both keys
-- match 039's CHECK (`^[a-z][a-z0-9_]{1,62}$`). The delete-account Edge Function reads only
-- `account_deletion`, so it is unaffected.
--
-- Idempotent: ON CONFLICT DO NOTHING — a re-run neither duplicates a row nor resets a game the
-- owner has already moved to Testing.
-- ============================================================================

begin;

insert into feature_release (feature, live) values
  ('game_daily_name',       true),
  ('game_twenty_questions', true)
on conflict (feature) do nothing;

commit;


-- ============================================================================
-- AFTER APPLYING
-- ============================================================================
-- 1. Both rows present and Live:
--      select feature, live from feature_release
--       where feature in ('game_daily_name', 'game_twenty_questions');
--
-- 2. Signed in as the owner, Admin Console -> Features: Daily Name and 20 Questions are listed under
--    Games & Trivia without the "Not stored yet" note. Flip one to Testing and back; two rows appear
--    in feature_release_log for it.
--
-- REVERSIBLE — but only before either game has been flipped (feature_release_log references
-- feature_release ON DELETE RESTRICT). With no log rows for them:
--      delete from feature_release where feature in ('game_daily_name', 'game_twenty_questions');
-- The app treats a missing row as Live, so removing them shows both games.
-- ============================================================================

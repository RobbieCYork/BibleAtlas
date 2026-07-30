-- ============================================================================
-- Adds the game tables to Supabase's `supabase_realtime` publication. RLS
-- controls *who* can read a row; this separate step controls whether a
-- postgres_changes subscription fires for it at all — a newly created table
-- isn't added automatically. Without this, GameView's subscribeToRoom() sits
-- there doing nothing: the initial fetch works, but nobody ever finds out
-- when another player joins, buzzes, or the room advances.
--   psql "$SUPABASE_DB_URL" -f sql/004_enable_realtime.sql
-- ============================================================================

alter publication supabase_realtime add table game_rooms;
alter publication supabase_realtime add table game_players;
alter publication supabase_realtime add table game_buzzes;

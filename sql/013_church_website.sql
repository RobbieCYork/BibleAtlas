-- ============================================================================
-- Adds an optional church website, hyperlinked from the church name itself
-- rather than shown as its own separate field/row.
--   psql "$SUPABASE_DB_URL" -f sql/013_church_website.sql
-- ============================================================================

alter table profiles
  add column if not exists church_website text;

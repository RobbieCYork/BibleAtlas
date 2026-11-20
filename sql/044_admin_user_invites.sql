-- ============================================================================
-- 044_admin_user_invites.sql — AUDIT TRAIL AND RATE LIMIT FOR "ADD USER"
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand:
--           psql "$SUPABASE_DB_URL" -f sql/044_admin_user_invites.sql
--         or paste it into the Supabase project's SQL Editor.
--
-- NUMBERING: 043 is taken by sql/043_paid_content.sql on the unmerged
--            `paid-content` branch, so this is 044. Append-only — see
--            sql/README.md.
--
-- DEPENDS ON: sql/025 (has_role_at_least). Nothing else.
-- ============================================================================
--
-- WHAT THIS IS FOR
-- ----------------------------------------------------------------------------
-- The Admin Console's Users tab gained an "Add user" button. It calls the
-- admin-add-user Edge Function (supabase/functions/admin-add-user), which
-- sends Supabase's own invitation email — the person chooses their own
-- password from the link. This table is that function's memory:
--
--   * the AUDIT TRAIL — which administrator tried to add which address, when,
--     and what happened ('invited', 'already_exists', 'name_taken', 'failed',
--     or 'pending' if the function died mid-request);
--   * the RATE LIMIT — the function counts an administrator's rows in the last
--     hour and refuses the 21st.
--
-- The function writes the row BEFORE it sends anything and refuses to send if
-- it cannot, so there is no invitation without an audit row. Until this file
-- is applied the function refuses every request (503) — fail closed.
--
-- SECURITY SHAPE — same rules sql/025 set for role_audit
-- ----------------------------------------------------------------------------
--   * No foreign keys to auth.users, on purpose: an audit row must outlive the
--     accounts it names. A cascade would erase exactly the record someone
--     would later need to read.
--   * RLS on. SELECT for administrators and owners only. NO insert, update or
--     delete policy for any client role: RLS denies by default, and table
--     privileges are revoked from anon and authenticated as a second wall.
--     The Edge Function writes with the service_role key, which bypasses RLS.
--     A member — or an administrator using the REST API directly — cannot
--     forge, edit or erase a row.
--   * It stores the invited email address. That is personal data, readable by
--     the same people who can already read every account's email through
--     admin_list_users(). No new exposure. Account deletion does not touch it
--     (an invitation is a fact about the administrator's action).
--
-- Idempotent: safe to run twice.
-- ============================================================================

create table if not exists public.admin_user_invites (
  id             bigint generated always as identity primary key,
  actor_id       uuid not null,
  target_user_id uuid,
  email          text not null check (length(email) between 3 and 254),
  display_name   text not null check (length(display_name) between 1 and 50),
  note           text check (note is null or length(note) <= 500),
  outcome        text not null default 'pending'
                   check (outcome in ('pending', 'invited', 'already_exists', 'name_taken', 'failed')),
  created_at     timestamptz not null default now()
);

-- The rate-limit query: this actor's rows in the last hour.
create index if not exists admin_user_invites_actor_idx
  on public.admin_user_invites (actor_id, created_at desc);
create index if not exists admin_user_invites_created_idx
  on public.admin_user_invites (created_at desc);

alter table public.admin_user_invites enable row level security;

drop policy if exists admin_user_invites_select_staff on public.admin_user_invites;
create policy admin_user_invites_select_staff on public.admin_user_invites
  for select using (has_role_at_least('administrator'));

-- Second wall. Supabase's default privileges grant every table to anon and
-- authenticated; RLS already denies writes (no policy), and this removes the
-- privilege as well, so a future policy added by mistake still cannot open it.
revoke all on table public.admin_user_invites from anon;
revoke insert, update, delete, truncate, references, trigger on table public.admin_user_invites from authenticated;
grant select on table public.admin_user_invites to authenticated;

comment on table public.admin_user_invites is
  'sql/044 — audit trail and per-admin rate limit for the admin-add-user Edge Function. Written only with the service_role key.';

-- ----------------------------------------------------------------------------
-- VERIFY (read-only, after applying):
--   select relrowsecurity from pg_class where relname = 'admin_user_invites';   -- t
--   select polname, polcmd from pg_policy where polrelid = 'public.admin_user_invites'::regclass;
--     -- exactly one row: admin_user_invites_select_staff, r
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'admin_user_invites' and grantee in ('anon','authenticated');
--     -- exactly one row: authenticated, SELECT
--
-- ROLLBACK (only if nothing has been invited yet, or the trail is exported first):
--   drop table if exists public.admin_user_invites;
-- ----------------------------------------------------------------------------

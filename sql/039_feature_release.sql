-- ============================================================================
-- 039_feature_release.sql — FEATURE RELEASE STAGES (Testing / Live)
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand:
--           psql "$SUPABASE_DB_URL" -f sql/039_feature_release.sql
--         or paste it into the Supabase project's SQL Editor.
--
-- NUMBERING: 037 and 038 (Prayer List) are applied; 039 is the next free
--            number. Append-only — see sql/README.md.
-- ============================================================================
--
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
-- ----------------------------------------------------------------------------
-- The owner (sql/025's top tier — not administrators, not advisors) can mark
-- each of eight major features as one of exactly two stages:
--
--     Live     everyone sees it                                  (live = true)
--     Testing  only the owner sees it, and only in "Test view"   (live = false)
--
-- There is deliberately NO third "Off" stage. Robbie's decision.
--
-- The eight keys are seeded below as Live, so APPLYING THIS FILE CHANGES
-- NOTHING ANY READER SEES. A feature only disappears when the owner flips it.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS IS NOT — READ BEFORE CALLING IT ACCESS CONTROL
-- ----------------------------------------------------------------------------
-- A Testing flag hides a feature's ENTRY POINTS in the app (tabs, menu rows,
-- buttons). It does not change a single RLS policy on the feature's own tables.
-- A signed-in member who knows the REST endpoint can still read and write their
-- own prayer_items, sermon_notes, posts, and so on, exactly as today — the
-- policies that already scope those rows to their owner are unchanged.
--
-- That is the right shape for what this is for — keeping an unfinished feature
-- out of normal readers' way while the owner tries it on the real site — and
-- the wrong shape for hiding anything sensitive. The Admin Console's Features
-- tab says so in plain words.
--
-- The one place enforcement is server-side is account deletion: the
-- delete-account Edge Function (supabase/functions/delete-account) refuses a
-- non-owner while `account_deletion` is Testing. That needs the function
-- redeployed to take effect.
--
-- ----------------------------------------------------------------------------
-- SECURITY SHAPE — same rules sql/025 set for user_roles and app_settings
-- ----------------------------------------------------------------------------
--   * feature_release is readable by ANYONE, anon included. The flags are not a
--     secret: the client has to read them before it knows who is signed in, and
--     a Testing flag reveals only that a feature exists, which the shipped
--     bundle already reveals.
--   * NO insert/update/delete policy on either table. RLS denies by default, so
--     no client role has a statement to write WITH. Every write goes through
--     set_feature_stage() (SECURITY DEFINER, pinned search_path, owner-only).
--   * feature_release_log is the audit trail: one row per actual change, who
--     and when. Readable by the owner only. Nobody can edit or delete it through
--     the API.
--   * Grants are revoked to zero FIRST and granted back explicitly. Supabase's
--     default ACL hands every new table arwdDxtm to anon and authenticated at
--     CREATE TABLE time, so a bare `grant select` would change nothing — see
--     sql/035's header for the whole story. Same for the identity sequence and
--     for function EXECUTE (Postgres grants EXECUTE to PUBLIC by default).
--   * updated_by / changed_by reference auth.users ON DELETE SET NULL, so these
--     tables never block an account deletion and keep no identifier afterwards.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. feature_release — one row per feature. `live = false` means Testing.
--
-- The key is TEXT + a format CHECK, not an enum and not a CHECK listing the
-- eight names: adding a ninth feature is one INSERT (in a later migration),
-- and set_feature_stage() validates against the rows that exist, so a typo'd
-- key is refused rather than silently creating a new feature.
-- ----------------------------------------------------------------------------
create table if not exists feature_release (
  feature    text primary key check (feature ~ '^[a-z][a-z0-9_]{1,62}$'),
  live       boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table feature_release enable row level security;

drop policy if exists feature_release_select_all on feature_release;
create policy feature_release_select_all on feature_release
  for select using (true);

-- No write policies, on purpose. See the header.

insert into feature_release (feature, live) values
  ('prayer_list',      true),
  ('sermon_notes',     true),
  ('posts_newsfeed',   true),
  ('timeline',         true),
  ('games_trivia',     true),
  ('library_articles', true),
  ('account_deletion', true),
  ('avatars',          true)
on conflict (feature) do nothing;


-- ----------------------------------------------------------------------------
-- 2. feature_release_log — the audit trail. Append-only through the function.
-- ----------------------------------------------------------------------------
create table if not exists feature_release_log (
  id         bigint generated always as identity primary key,
  feature    text not null references feature_release(feature) on delete restrict,
  old_live   boolean,
  new_live   boolean not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists feature_release_log_changed_idx
  on feature_release_log (changed_at desc);
create index if not exists feature_release_log_feature_idx
  on feature_release_log (feature, changed_at desc);

alter table feature_release_log enable row level security;

drop policy if exists feature_release_log_select_owner on feature_release_log;
create policy feature_release_log_select_owner on feature_release_log
  for select using (has_role_at_least('owner'));

-- No write policies. set_feature_stage() is the only writer.


-- ----------------------------------------------------------------------------
-- 3. current_user_is_owner() — how the client learns whether to offer the
--    Features controls and honour Test view at all.
--
-- Answers for the CALLER only; it takes no argument, so it cannot be used to
-- probe whether some other account is the owner. False when signed out. The
-- answer only unlocks UI — set_feature_stage() re-checks on every call.
-- ----------------------------------------------------------------------------
create or replace function current_user_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and has_role_at_least('owner');
$$;


-- ----------------------------------------------------------------------------
-- 4. set_feature_stage() — the ONLY write path.
--
--   * owner only (has_role_at_least('owner')). Administrators cannot flip a
--     feature; that is the point of an owner-only Testing stage.
--   * the key must already exist — no creating features from the client.
--   * p_live must be true (Live) or false (Testing); NULL is refused.
--   * writes an audit row only when the stage actually changes, so a double
--     click does not leave two identical entries.
--   * the row is locked FOR UPDATE so two concurrent flips serialise and the
--     log's old_live is always the value that was really replaced.
-- ----------------------------------------------------------------------------
create or replace function set_feature_stage(p_feature text, p_live boolean)
returns feature_release
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row feature_release;
begin
  if v_uid is null or not has_role_at_least('owner') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_live is null then
    raise exception 'p_live is required (true = Live, false = Testing)' using errcode = '22023';
  end if;

  select * into v_row from feature_release f where f.feature = p_feature for update;
  if not found then
    raise exception 'unknown feature %', p_feature using errcode = '22023';
  end if;

  if v_row.live is distinct from p_live then
    insert into feature_release_log (feature, old_live, new_live, changed_by)
    values (v_row.feature, v_row.live, p_live, v_uid);

    update feature_release
       set live = p_live, updated_by = v_uid, updated_at = now()
     where feature = v_row.feature
     returning * into v_row;
  end if;

  return v_row;
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. GRANTS — revoke to zero first, then grant back exactly what is used.
-- ----------------------------------------------------------------------------
revoke all on feature_release     from anon, authenticated;
revoke all on feature_release_log from anon, authenticated;
revoke all on sequence feature_release_log_id_seq from anon, authenticated;

-- The flags: read by every visitor (the client loads them before sign-in).
grant select on feature_release to anon, authenticated;
-- The audit trail: the policy above narrows this to the owner.
grant select on feature_release_log to authenticated;

revoke execute on function current_user_is_owner()               from public;
revoke execute on function set_feature_stage(text, boolean)      from public, anon;
grant  execute on function current_user_is_owner()               to anon, authenticated;
grant  execute on function set_feature_stage(text, boolean)      to authenticated;

commit;


-- ============================================================================
-- AFTER APPLYING
-- ============================================================================
-- 1. Eight rows, all Live:
--      select feature, live from feature_release order by feature;
--
-- 2. Grants are what this file says — expect exactly these three rows:
--      select table_name, grantee,
--             string_agg(distinct privilege_type, ', ' order by privilege_type)
--        from information_schema.role_table_grants
--       where table_schema = 'public'
--         and grantee in ('anon', 'authenticated')
--         and table_name in ('feature_release', 'feature_release_log')
--       group by 1, 2 order by 1, 2;
--    Expected:
--      feature_release      anon           SELECT
--      feature_release      authenticated  SELECT
--      feature_release_log  authenticated  SELECT
--
-- 3. Signed in as a NON-owner, from the browser console:
--      await supabase.rpc('set_feature_stage', { p_feature: 'timeline', p_live: false })
--    must fail with 42501 "not authorized", and
--      await supabase.from('feature_release').update({ live: false }).eq('feature', 'timeline')
--    must fail with 42501 permission denied (no UPDATE grant) and change nothing.
--
-- 4. Signed in as the owner, Admin Console -> Features: flip one feature to
--    Testing and back. Two rows appear in feature_release_log.
--
-- REVERSIBLE: nothing else references these objects except the app, which
-- fails open (treats every feature as Live) when the table is missing.
--      drop function if exists set_feature_stage(text, boolean);
--      drop function if exists current_user_is_owner();
--      drop table if exists feature_release_log;
--      drop table if exists feature_release;
-- ============================================================================

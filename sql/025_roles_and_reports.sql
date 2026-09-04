-- ============================================================================
-- ROLES + USER ISSUE REPORTING
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/025_roles_and_reports.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- Two linked features:
--   1. A four-tier role system:  user < advisor < administrator < owner
--   2. A user-facing issue reporter, with a triage workflow, advisor voting,
--      and an audit trail.
--
-- ----------------------------------------------------------------------------
-- WHY ROLES DO NOT GO ON `profiles` — THE SAME REASON 019 GAVE FOR `is_admin`
-- ----------------------------------------------------------------------------
-- sql/019 spelled this out and nothing has changed. The profiles UPDATE policy
-- is a blanket ROW grant:
--     profiles_update_own   UPDATE   USING (auth.uid() = id)   WITH CHECK (auth.uid() = id)
-- Postgres RLS is ROW-level, not COLUMN-level. That policy therefore permits an
-- update to ANY column of your own row, so a `role text` column on `profiles`
-- would be a one-line self-promotion:
--     supabase.from("profiles").update({ role: "owner" }).eq("id", myId)
-- Privileges live in their own table, and that table has NO write policy at all.
-- RLS denies by default, so with RLS enabled and no INSERT/UPDATE/DELETE policy,
-- neither `anon` nor `authenticated` has any statement to escalate WITH. Every
-- write goes through set_user_role() (SECURITY DEFINER) or an out-of-band
-- superuser connection.
--
-- ----------------------------------------------------------------------------
-- WHY `admin_users` BECOMES A VIEW INSTEAD OF STAYING A SECOND SOURCE OF TRUTH
-- ----------------------------------------------------------------------------
-- 019 made `admin_users` the one place admin-ness lived. Adding `user_roles`
-- beside it would leave two tables answering "is this person staff?", which is
-- how authorization bugs are born: they drift, and the safer-looking one loses.
--
-- So `user_roles` becomes the single source of truth and `admin_users` is
-- retired into a compatibility VIEW over it. Concretely, this migration:
--   * copies every existing admin_users row into user_roles as `administrator`
--     (nobody loses access, is_admin() keeps returning true for them),
--   * RENAMES the physical table to admin_users_legacy — a rename, not a drop,
--     so the original rows are still on disk and the change is reversible,
--   * redefines is_admin() to read user_roles and nothing else,
--   * creates `admin_users` as a view over user_roles so the one client query
--     that reads it (src/lib/adminApi.ts — `from("admin_users").select("user_id")`)
--     and 019's admin_list_users() keep working untouched.
--
-- The view is created WITH (security_invoker = true) ON PURPOSE. Postgres 15+
-- defaults views to security_definer semantics, meaning the view runs as ITS
-- OWNER and the base table's RLS is skipped. A default-built view here would
-- have quietly published the entire staff roster to every logged-in account.
-- With security_invoker on, user_roles' own "read your own row" policy applies,
-- which reproduces 019's admin_users_select_self exactly.
--
-- ----------------------------------------------------------------------------
-- RLS RECURSION — sql/003 and sql/012 exist because this project got it wrong
-- twice
-- ----------------------------------------------------------------------------
-- A policy on table T that contains a subquery against T re-enters its own
-- policy and recurses forever (Postgres 42P17). Every role check below therefore
-- goes through has_role_at_least(), which is SECURITY DEFINER: its internal
-- SELECT runs as the function owner, and a table owner bypasses RLS, so the
-- lookup never re-enters the calling policy. NOTHING in this file writes
-- `exists (select 1 from user_roles ...)` directly into a user_roles policy.
--
-- STABLE so the planner hoists it out of per-row evaluation. search_path is
-- pinned so a caller cannot shadow `user_roles` with a temp table and answer
-- the question for themselves. Same hardening as is_admin(), for the same
-- reasons.
--
-- ----------------------------------------------------------------------------
-- WHO CAN SEE WHAT — the data-exposure summary, in plain terms
-- ----------------------------------------------------------------------------
-- user (no user_roles row — everybody, by default)
--   reads   : the category dropdown; their OWN reports, in full, including the
--             status, the resolution note and whatever the auto-capture
--             recorded about their own page. Nothing else in this migration.
--   writes  : files a report for themselves; edits or deletes it while it is
--             still 'new'. Once staff touch it, it locks.
--   cannot  : see anyone else's report, see votes, see who the staff are, see
--             any audit trail, or change their own role.
--
-- advisor
--   reads   : every report, through report_list() / report_detail() — including
--             WHO FILED IT (Robbie's decision, Sept 2026). Every advisor vote
--             and vote note. The status history of any report.
--   writes  : one agree/disagree vote per report, with a note, changeable and
--             retractable.
--   cannot  : change any report's status, edit any report, assign anyone,
--             see the role roster, the role audit, or app_settings.
--
-- administrator  (this is what 019 called "admin"; every existing admin becomes
--                 one automatically)
--   reads   : everything an advisor reads, plus the `reports` table directly,
--             plus the role roster, the role audit trail and app_settings.
--             Plus the whole 019 admin console, unchanged.
--   writes  : moves reports through the workflow, re-titles and re-categorises
--             them, writes resolution notes, assigns them, marks duplicates,
--             adds report categories.
--   cannot  : grant or revoke ANY role — not even to themselves. Cannot edit
--             the body of a report or anything the client auto-captured.
--
-- owner
--   reads   : everything an administrator reads.
--   writes  : everything an administrator writes, plus assigning roles and
--             changing app settings.
--   cannot  : change their OWN role in either direction, and cannot remove the
--             last remaining owner. Both are enforced in set_user_role().
--
-- Nothing here touches notes, highlights, messages, group messages or any other
-- existing table. No existing policy is loosened. The only existing object that
-- changes behaviour is `admin_users`, which becomes a view returning exactly
-- the same rows to exactly the same people.
--
-- ----------------------------------------------------------------------------
-- THE THREE OPEN DECISIONS, AS ANSWERED
-- ----------------------------------------------------------------------------
--   1. Applying this migration: NOT DONE. Nothing in this file has been run
--      against any database. It is written to be reviewed first.
--   2. First owners: TWO of them — robbie.c.york@gmail.com and
--      admin@capstonebible.com. See the BOOTSTRAP block at the end of Part A.
--      It is safe when one, both, or neither address has an account yet, and it
--      is safe to re-run later for whichever one was missing. Nothing in this
--      schema assumes there is exactly one owner.
--   3. Advisors DO see who filed a report. The app_settings row
--      'reports.reveal_reporter_to_advisors' ships as TRUE.
--      Advisors still have no SELECT on `reports` itself — they read through
--      report_list()/report_detail(), which decide identity from that flag. That
--      is deliberate: it means a future switch to advisor-anonymous costs one
--      UPDATE on one row, with no policy change, no migration and no code
--      change. Handing advisors the base table would have made the same switch
--      a real migration, because RLS cannot hide a column.
-- Whether signed-out/guest (anonymous-auth) accounts may file reports is the
-- same shape: app_settings row 'reports.allow_anonymous', currently false.
-- ============================================================================


-- ============================================================================
-- PART A — ROLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- role_rank() — the ordering, in one place.
--
-- Returns NULL for anything not in the vocabulary rather than 0. An unknown
-- role name is a bug, and answering "rank 0" for it would make
-- has_role_at_least('advisr') return true for the whole internet. Callers below
-- treat NULL as a hard error.
-- ----------------------------------------------------------------------------
create or replace function role_rank(p_role text)
returns integer
language sql
immutable
parallel safe
as $$
  select case p_role
           when 'user'          then 0
           when 'advisor'       then 1
           when 'administrator' then 2
           when 'owner'         then 3
           else null
         end;
$$;

-- ----------------------------------------------------------------------------
-- user_roles — one row per account that is ABOVE the baseline.
--
-- No row means 'user'. That is deliberate: the overwhelming majority of accounts
-- are plain users, and not storing a row for them means no backfill, no trigger
-- on signup, no way for the table to drift out of step with auth.users, and a
-- tiny table that stays in cache.
--
-- One role per account (user_id is the primary key), not a set. The tiers are
-- strictly ordered and cumulative — an administrator can do everything an
-- advisor can — so "advisor AND administrator" has no meaning to express.
-- ----------------------------------------------------------------------------
create table if not exists user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('advisor', 'administrator', 'owner')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  note       text check (note is null or length(note) <= 500)
);

create index if not exists user_roles_role_idx on user_roles (role);

alter table user_roles enable row level security;


-- ----------------------------------------------------------------------------
-- has_role_at_least() — the single predicate every policy and RPC below checks.
--
-- Defined BEFORE the first policy that references it, and before every other
-- policy in this file. A CREATE POLICY expression is resolved at creation time:
-- a policy naming a function that does not exist yet fails outright with
-- "function has_role_at_least(unknown) does not exist". Order matters here.
--
-- SECURITY DEFINER / STABLE / pinned search_path, for the three reasons 019
-- gave for is_admin(): the caller cannot read other people's user_roles rows,
-- the planner should hoist it, and nobody should be able to shadow the table.
-- ----------------------------------------------------------------------------
create or replace function has_role_at_least(p_role text, p_uid uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_required integer := role_rank(p_role);
  v_actual   integer;
begin
  if v_required is null then
    raise exception 'unknown role %', p_role using errcode = '22023';
  end if;

  -- 'user' is the baseline: it means "any signed-in account", not "any caller".
  if v_required = 0 then
    return p_uid is not null;
  end if;

  if p_uid is null then
    return false;
  end if;

  select role_rank(r.role) into v_actual from user_roles r where r.user_id = p_uid;
  return coalesce(v_actual, 0) >= v_required;
end;
$$;

-- What tier am I? NULL when signed out. The client uses this to decide which
-- parts of the UI exist at all; the database still re-checks every call.
create or replace function current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
           when auth.uid() is null then null
           else coalesce((select r.role from user_roles r where r.user_id = auth.uid()), 'user')
         end;
$$;


-- Read your OWN row only, plus administrators who need the roster for the
-- console. Same shape as 019's admin_users_select_self, widened by exactly one
-- tier. A plain user still cannot enumerate who the staff are.
--
-- has_role_at_least() is SECURITY DEFINER; that is what stops this policy from
-- recursing into itself. See the header.
drop policy if exists user_roles_select_self_or_staff on user_roles;
create policy user_roles_select_self_or_staff on user_roles
  for select using (
    user_id = auth.uid()
    or has_role_at_least('administrator')
  );

-- NO insert/update/delete policies, on purpose — the header explains why.
-- Writes go through set_user_role() or a superuser connection.


-- ----------------------------------------------------------------------------
-- role_audit — who changed whose role, when.
--
-- No foreign keys to auth.users on purpose. An audit row must outlive the
-- account it describes; a cascade or a SET NULL would erase exactly the record
-- someone would later need to read.
-- ----------------------------------------------------------------------------
create table if not exists role_audit (
  id             bigint generated always as identity primary key,
  target_user_id uuid,
  actor_id       uuid,
  old_role       text,
  new_role       text,
  note           text,
  created_at     timestamptz not null default now()
);

create index if not exists role_audit_target_idx  on role_audit (target_user_id, created_at desc);
create index if not exists role_audit_created_idx on role_audit (created_at desc);

alter table role_audit enable row level security;

drop policy if exists role_audit_select_staff on role_audit;
create policy role_audit_select_staff on role_audit
  for select using (has_role_at_least('administrator'));

-- No write policies. Rows are written by the trigger below, which is
-- SECURITY DEFINER and therefore not subject to them.


-- ----------------------------------------------------------------------------
-- MIGRATE THE EXISTING ADMINS, THEN RETIRE `admin_users`.
--
-- Guarded on admin_users still being a physical table, so re-running this file
-- is a no-op. Everyone in admin_users becomes an `administrator` — NOT an owner,
-- even where 019's free-text note says "owner". A note is not a grant, and the
-- first owner is a decision Robbie has not made yet (see BOOTSTRAP below).
-- Nobody loses anything by this: is_admin() is true for administrator and owner
-- alike, so the whole existing admin console keeps working.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'admin_users' and c.relkind = 'r'
  ) then
    insert into user_roles (user_id, role, granted_at, note)
    select a.user_id,
           'administrator',
           a.granted_at,
           left('migrated from admin_users by sql/025' ||
                coalesce(' (was: ' || a.note || ')', ''), 500)
    from admin_users a
    on conflict (user_id) do nothing;

    -- A rename, not a drop. The original rows stay on disk and this step is
    -- reversible if the migration has to be backed out.
    alter table public.admin_users rename to admin_users_legacy;
  end if;
end
$$;

-- Redefine is_admin() to read user_roles and nothing else. This MUST happen in
-- the same migration as the rename: 019's is_admin() has a string function body,
-- so its reference to `admin_users` is resolved at call time and would otherwise
-- start resolving to the compatibility view. Signature and parameter name are
-- unchanged (`uid`), because CREATE OR REPLACE cannot alter either.
create or replace function is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select uid is not null
     and exists (select 1 from user_roles r
                  where r.user_id = uid and r.role in ('administrator', 'owner'));
$$;

-- Compatibility view. security_invoker = true is load-bearing — see the header.
drop view if exists admin_users;
create view admin_users with (security_invoker = true) as
  select r.user_id, r.granted_at, r.note
  from user_roles r
  where r.role in ('administrator', 'owner');

-- The view is single-table and auto-updatable, so Postgres would happily accept
-- writes through it and let user_roles' (absent) write policies reject them.
-- Revoking is cheaper than relying on that.
revoke insert, update, delete on admin_users from anon, authenticated;
grant select on admin_users to authenticated;


-- Audit trigger goes on AFTER the historical migration above, so a decade of
-- pre-existing grants is not logged as if it happened this morning. Their
-- provenance is in user_roles.note instead.
create or replace function user_roles_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into role_audit (target_user_id, actor_id, old_role, new_role, note)
  values (
    coalesce(new.user_id, old.user_id),
    auth.uid(),                                   -- null for a superuser grant
    case when tg_op = 'INSERT' then 'user' else old.role end,
    case when tg_op = 'DELETE' then 'user' else new.role end,
    case when tg_op = 'DELETE' then old.note else new.note end
  );
  return null;
end;
$$;

drop trigger if exists user_roles_audit_trg on user_roles;
create trigger user_roles_audit_trg
  after insert or update or delete on user_roles
  for each row execute function user_roles_audit();


-- ----------------------------------------------------------------------------
-- set_user_role() — the ONLY role write path reachable from the app.
--
-- The rules Robbie asked for, and why each one is enforced here rather than in
-- a policy: a policy can prove WHO is writing, but not what the row means
-- relative to the writer's own row and the rest of the table.
--
--   * owner only. Administrators cannot grant anything.
--   * never yourself, in either direction. This is what stops an administrator
--     making themselves owner AND stops an owner locking themselves out; it
--     also means the "can an administrator demote an owner" question never
--     arises, because an administrator cannot reach this function at all.
--   * the LAST owner cannot be demoted or deleted. The rule is "never zero
--     owners", not "never more than one" — there are deliberately two. With two
--     owners in place, either one CAN demote the other; that is inherent to
--     co-ownership and is recorded in role_audit when it happens.
--     Note honestly: given the self-assignment ban above, this branch is
--     currently unreachable — to demote an owner you must BE an owner, so there
--     is always at least one left. It is kept as the guard that keeps the
--     invariant true if the self-assignment rule is ever relaxed.
--   * p_role = 'user' removes the row (the baseline is the absence of a row).
-- ----------------------------------------------------------------------------
create or replace function set_user_role(p_user_id uuid, p_role text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_old_role  text;
  v_owners    integer;
begin
  if not has_role_at_least('owner') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;

  if p_user_id = v_uid then
    raise exception 'self_assignment: you cannot change your own role' using errcode = '42501';
  end if;

  if role_rank(p_role) is null then
    raise exception 'unknown role %', p_role using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'no such account' using errcode = '23503';
  end if;

  select r.role into v_old_role from user_roles r where r.user_id = p_user_id;

  -- Never leave the project with no owner.
  if v_old_role = 'owner' and p_role <> 'owner' then
    select count(*) into v_owners from user_roles where role = 'owner';
    if v_owners <= 1 then
      raise exception 'last_owner: cannot demote the only owner' using errcode = '42501';
    end if;
  end if;

  if p_role = 'user' then
    delete from user_roles where user_id = p_user_id;
  else
    insert into user_roles (user_id, role, granted_by, granted_at, note)
    values (p_user_id, p_role, v_uid, now(), left(p_note, 500))
    on conflict (user_id) do update
      set role       = excluded.role,
          granted_by = excluded.granted_by,
          granted_at = excluded.granted_at,
          note       = excluded.note;
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- The staff roster, for the owner's role-management screen.
--
-- SECURITY DEFINER because it reads auth.users (PostgREST does not expose it and
-- RLS cannot reach it) and because profiles' own SELECT policy only shows you
-- yourself and your friends — an administrator would otherwise see a list of
-- blank names. Same pattern as 019's admin_list_users().
--
-- To FIND an account to promote, use 019's existing admin_list_users(p_search)
-- rather than adding a second user-search surface.
-- ----------------------------------------------------------------------------
create or replace function list_user_roles()
returns table (
  user_id      uuid,
  email        text,
  display_name text,
  role         text,
  granted_at   timestamptz,
  granted_by   uuid,
  granted_by_name text,
  note         text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select r.user_id,
         u.email::text,
         p.display_name,
         r.role,
         r.granted_at,
         r.granted_by,
         coalesce(gp.display_name, gu.email::text),
         r.note
  from user_roles r
  join auth.users u  on u.id = r.user_id
  left join profiles p on p.id = r.user_id
  left join auth.users gu on gu.id = r.granted_by
  left join profiles gp   on gp.id = r.granted_by
  order by role_rank(r.role) desc, r.granted_at asc;
end;
$$;


-- ============================================================================
-- BOOTSTRAP THE OWNERS — out of band, exactly like 019 grants admin.
--
-- There are TWO owners, not one: robbie.c.york@gmail.com and
-- admin@capstonebible.com. Nothing in this schema assumes a single owner row;
-- set_user_role()'s guard is "never leave ZERO owners", not "never have two".
--
-- This statement runs as part of the migration, and it is written so that it is
-- safe and correct in every state the accounts might be in:
--
--   * matches ZERO addresses  — inserts nothing, no error. TODO.md records that
--     admin@capstonebible.com may not be live yet (GoDaddy was still showing
--     "setting up your email account" and it was never verified), so that
--     account may well not exist in auth.users. That is fine.
--   * matches ONE address     — grants that one. Re-run this exact statement
--     later, once the other mailbox exists and has signed in, to grant the
--     second. Nothing else needs to change.
--   * matches BOTH            — grants both.
--   * already granted         — ON CONFLICT DO UPDATE, so re-running is a no-op
--                               in effect. It is also what promotes an account
--                               the admin_users migration above just seeded as
--                               'administrator' up to 'owner'.
--
-- Signing in is a prerequisite: a mailbox that has never authenticated has no
-- auth.users row, so there is nothing to grant a role TO.
--
-- A superuser / table-owner connection bypasses RLS, which is why this works
-- with no write policy on user_roles and no owner existing yet. Until at least
-- one owner exists, nobody can call set_user_role() — that is the intended
-- state, not a bug.
--
-- To check afterwards:  select * from list_user_roles();   (as an administrator)
-- or, from the SQL editor:
--   select u.email, r.role from user_roles r join auth.users u on u.id = r.user_id;
-- ============================================================================
insert into user_roles (user_id, role, note)
select u.id, 'owner', 'bootstrap owner (sql/025)'
from auth.users u
where u.email in ('robbie.c.york@gmail.com', 'admin@capstonebible.com')
on conflict (user_id) do update
  set role = 'owner',
      note = 'bootstrap owner (sql/025)'
  -- The WHERE makes a re-run genuinely silent: without it, re-running this to
  -- pick up the second mailbox would write an "owner -> owner" no-op row into
  -- role_audit for the account that was already an owner.
  where user_roles.role is distinct from 'owner';


-- ============================================================================
-- PART B — APP SETTINGS
--
-- A two-column key/value table so the pending product decisions above are an
-- UPDATE, not a migration. Deliberately tiny: this is not a feature-flag
-- system, it is the handful of knobs the policies and RPCs below actually read.
-- ============================================================================

create table if not exists app_settings (
  key        text primary key check (key ~ '^[a-z][a-z0-9_.]{1,79}$'),
  value      jsonb not null check (pg_column_size(value) <= 1024),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table app_settings enable row level security;

drop policy if exists app_settings_select_staff on app_settings;
create policy app_settings_select_staff on app_settings
  for select using (has_role_at_least('administrator'));

-- No write policies. set_app_setting() below, or a superuser connection.

-- reveal_reporter_to_advisors ships TRUE: Robbie's answer is that advisors see
-- who filed each report. It stays a SETTING rather than being baked into a
-- policy so that revisiting it later — once there are advisors who are not
-- close to him — is one UPDATE and not a migration.
insert into app_settings (key, value) values
  ('reports.reveal_reporter_to_advisors', 'true'::jsonb),
  ('reports.allow_anonymous',             'false'::jsonb),
  ('reports.max_per_hour',                '5'::jsonb),
  ('reports.max_per_day',                 '20'::jsonb)
on conflict (key) do nothing;

-- Readers. STABLE + SECURITY DEFINER because they are called from inside RLS
-- policies, where the caller has no SELECT on app_settings.
create or replace function app_setting_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select case when jsonb_typeof(s.value) = 'boolean' then (s.value)::text::boolean else null end
       from app_settings s where s.key = p_key),
    p_default);
$$;

create or replace function app_setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select case when jsonb_typeof(s.value) = 'number' then (s.value)::text::integer else null end
       from app_settings s where s.key = p_key),
    p_default);
$$;

create or replace function set_app_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not has_role_at_least('owner') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from app_settings s where s.key = p_key) then
    raise exception 'unknown setting %', p_key using errcode = '22023';
  end if;
  update app_settings
     set value = p_value, updated_at = now(), updated_by = auth.uid()
   where key = p_key;
end;
$$;


-- ============================================================================
-- PART C — ISSUE REPORTING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- report_categories — DATA, not an enum, so the list can grow without a
-- migration. Robbie asked for that explicitly and this is the case where it is
-- cleanly possible: a category is a label the reporter picks from a dropdown,
-- the app branches on nothing, and a lookup table also buys a display label,
-- a sort order and an is_active flag for retiring a category without orphaning
-- the reports that used it. A Postgres enum can only be appended to (ALTER TYPE,
-- i.e. a migration), its values cannot be reordered, renamed cheaply, or
-- deactivated, and it carries no label. The FK below gives the same referential
-- guarantee an enum would.
--
-- Compare `reports.status` further down, which IS a text + CHECK vocabulary:
-- the UI branches on every status value and the workflow is enforced in SQL, so
-- adding one is a code change anyway. (This database contains no enum types at
-- all today; text + CHECK is the house style.)
-- ----------------------------------------------------------------------------
create table if not exists report_categories (
  key         text primary key check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label       text not null check (length(btrim(label)) between 1 and 80),
  description text check (description is null or length(description) <= 300),
  sort_order  integer not null default 100,
  is_active   boolean not null default true
);

insert into report_categories (key, label, description, sort_order) values
  ('bug',            'Something is broken',   'A feature does not work, or the app errored',            10),
  ('incorrect_info', 'Incorrect information', 'A date, place, name, citation or fact looks wrong',      20),
  ('typo',           'Typo or grammar',       'A spelling mistake or awkward wording',                  30),
  ('theological',    'Theological concern',   'A doctrinal or interpretive concern with the content',   40),
  ('idea',           'Idea or suggestion',    'Something you would like the app to do',                 50),
  ('other',          'Something else',        'Anything that does not fit the categories above',        90)
on conflict (key) do nothing;

alter table report_categories enable row level security;

-- Readable by everyone — it is a dropdown, and it is the same list whether or
-- not you are signed in.
drop policy if exists report_categories_select_all on report_categories;
create policy report_categories_select_all on report_categories
  for select using (true);

-- No write policies; report_upsert_category() below is the growth path.
create or replace function report_upsert_category(
  p_key         text,
  p_label       text,
  p_description text default null,
  p_sort_order  integer default 100,
  p_is_active   boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into report_categories (key, label, description, sort_order, is_active)
  values (p_key, p_label, p_description, coalesce(p_sort_order, 100), coalesce(p_is_active, true))
  on conflict (key) do update
    set label       = excluded.label,
        description = excluded.description,
        sort_order  = excluded.sort_order,
        is_active   = excluded.is_active;
end;
$$;


-- ----------------------------------------------------------------------------
-- reports
--
-- Three groups of columns, and the difference between them is who may write
-- them, not just what they mean:
--
--   REPORTER-SUPPLIED  category, title, body, reporter_severity
--                      The reporter may correct these — but only until the
--                      report is triaged (see reports_before_update()).
--
--   AUTO-CAPTURED      page_url, route, page_title, target_kind, target_id,
--                      target_label, selected_text, build_id, user_agent,
--                      viewport_*, platform, app_context
--                      Written once, at insert, by the client. Frozen for
--                      everyone afterwards, reporter and staff alike. The whole
--                      value of an auto-captured context is that nobody could
--                      have edited it after the fact.
--
--   SERVER-OWNED       status, triaged_at, duplicate_of, resolution_note,
--                      resolved_by, resolved_at, assigned_to, vote_agree,
--                      vote_disagree, priority_score, created_at, updated_at
--                      Never accepted from a client on insert, and only movable
--                      by administrators (or the vote machinery) afterwards.
--
-- target_kind/target_id are TEXT, not uuid, because none of this app's content
-- lives in the database: articles, POIs, timeline events, people and topics are
-- static modules under src/data/ keyed by human-readable slugs
-- ("caesarea-maritima", "bib-prim-creation"). A scripture reference is the same
-- shape — target_kind = 'scripture', target_id = 'John 3:16'. This pair is what
-- turns "wrong information in this article" into a row a content editor can act
-- on without reverse-engineering a URL.
-- ----------------------------------------------------------------------------
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,

  -- reporter-supplied
  category          text not null references report_categories(key),
  title             text not null check (length(btrim(title)) between 3 and 200),
  body              text not null check (length(btrim(body)) between 1 and 8000),
  reporter_severity text check (reporter_severity is null
                                or reporter_severity in ('low', 'medium', 'high', 'critical')),

  -- auto-captured page context
  page_url     text check (page_url is null     or length(page_url) <= 2048),
  route        text check (route is null        or length(route) <= 200),
  page_title   text check (page_title is null   or length(page_title) <= 300),
  target_kind  text check (target_kind is null  or target_kind in
                 ('article', 'poi', 'timeline_event', 'person', 'topic',
                  'reading_plan', 'scripture', 'game', 'profile', 'other')),
  target_id    text check (target_id is null    or length(target_id) <= 200),
  target_label text check (target_label is null or length(target_label) <= 300),

  -- the exact string the reporter had selected when they opened the form.
  -- For a misspelling or a bad sentence this IS the report; without it the
  -- content editor is searching an article for a typo someone else can see.
  selected_text text check (selected_text is null or length(selected_text) <= 4000),

  -- auto-captured environment. build_id is the value vite-plugin-build-id.ts
  -- already defines as __BUILD_ID__ (and writes to version.json) — the same id
  -- src/lib/updateCheck.ts compares against. No new mechanism.
  build_id   text check (build_id is null   or length(build_id) <= 64),
  user_agent text check (user_agent is null or length(user_agent) <= 512),
  viewport_w integer check (viewport_w is null or viewport_w between 0 and 20000),
  viewport_h integer check (viewport_h is null or viewport_h between 0 and 20000),
  platform   text check (platform is null   or length(platform) <= 120),

  -- Escape hatch so the app can attach a little more context without a
  -- migration. Size-capped for the same reason 019 caps analytics props: a cap
  -- is what stops a client bug quietly turning this into a content log.
  app_context jsonb not null default '{}'::jsonb check (pg_column_size(app_context) <= 2048),

  -- server-owned lifecycle
  status          text not null default 'new'
                    check (status in ('new', 'triaged', 'accepted', 'in_progress',
                                      'resolved', 'declined', 'duplicate')),
  duplicate_of    uuid references reports(id) on delete set null,
  resolution_note text check (resolution_note is null or length(resolution_note) <= 4000),
  resolved_by     uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz,
  triaged_at      timestamptz,
  assigned_to     uuid references auth.users(id) on delete set null,

  -- derived from report_votes; see report_recalc_priority()
  vote_agree     integer not null default 0,
  vote_disagree  integer not null default 0,
  priority_score numeric not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reports_not_own_duplicate check (duplicate_of is null or duplicate_of <> id),
  constraint reports_duplicate_needs_target check (status <> 'duplicate' or duplicate_of is not null)
);

-- The dashboard's hot query is "open reports, best first, page 1". This index
-- serves the filter and the sort together, which is the whole argument for
-- storing priority_score rather than computing it in a view — see
-- report_recalc_priority() below.
create index if not exists reports_status_priority_idx
  on reports (status, priority_score desc, created_at desc);
create index if not exists reports_open_priority_idx
  on reports (priority_score desc, created_at desc)
  where status in ('new', 'triaged', 'accepted', 'in_progress');
create index if not exists reports_reporter_idx  on reports (reporter_id, created_at desc);
create index if not exists reports_category_idx  on reports (category, created_at desc);
create index if not exists reports_target_idx    on reports (target_kind, target_id)
  where target_id is not null;
create index if not exists reports_duplicate_idx on reports (duplicate_of)
  where duplicate_of is not null;

alter table reports enable row level security;

-- ----------------------------------------------------------------------------
-- reports RLS — read this before changing it, it is the data-exposure surface.
--
-- SELECT: your own reports, or administrator and above. ADVISORS ARE NOT HERE
-- ON PURPOSE, and this is worth being precise about because advisors DO get to
-- see reporter identity today.
--
-- RLS is row-level: any policy that lets an advisor read a row lets them read
-- EVERY column of that row, `reporter_id` included, and there is no way to take
-- that back later without changing the policy. Advisors therefore read through
-- report_list()/report_detail(), which project the columns and decide identity
-- from app_settings. The setting currently says yes, so an advisor sees the
-- reporter's name — the same answer they would get from the base table. The
-- difference is only visible on the day Robbie changes his mind, when the
-- switch is one UPDATE instead of a migration.
--
-- Practical consequence for the app: an advisor calling
-- supabase.from("reports").select() gets an EMPTY ARRAY, not an error. All
-- advisor reads must go through the RPCs.
--
-- INSERT: any signed-in, non-anonymous account, for itself. The anonymous
-- exclusion is a spam control — an anonymous sign-in is free and unlimited, so
-- per-account rate limiting means nothing without it. Flippable via
-- app_settings 'reports.allow_anonymous'.
--
-- UPDATE: the reporter while the report is still 'new', or administrator+.
-- The policy proves WHO; reports_before_update() decides WHICH COLUMNS.
--
-- DELETE: the reporter, while still 'new'. Once a report is triaged it is part
-- of someone's workload and has an audit trail; staff decline it, they do not
-- delete it.
-- ----------------------------------------------------------------------------
drop policy if exists reports_select_own_or_staff on reports;
create policy reports_select_own_or_staff on reports
  for select using (
    reporter_id = auth.uid()
    or has_role_at_least('administrator')
  );

drop policy if exists reports_insert_own on reports;
create policy reports_insert_own on reports
  for insert with check (
    auth.uid() is not null
    and reporter_id = auth.uid()
    and (
      app_setting_bool('reports.allow_anonymous', false)
      or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    )
  );

drop policy if exists reports_update_own_or_staff on reports;
create policy reports_update_own_or_staff on reports
  for update
  using ((reporter_id = auth.uid() and status = 'new') or has_role_at_least('administrator'))
  with check ((reporter_id = auth.uid() and status = 'new') or has_role_at_least('administrator'));

drop policy if exists reports_delete_own_untriaged on reports;
create policy reports_delete_own_untriaged on reports
  for delete using (reporter_id = auth.uid() and status = 'new');


-- ----------------------------------------------------------------------------
-- reports_before_insert() — normalise the server-owned columns, then rate limit.
--
-- The INSERT policy can prove that reporter_id is the caller. It cannot stop the
-- caller ALSO sending status='resolved', priority_score=9999 and a backdated
-- created_at, because RLS has no column granularity. Anything the server owns is
-- therefore overwritten here rather than validated.
--
-- Rate limits fail loudly (the reporter should know their report was refused,
-- unlike 019's analytics, which fails silently because nobody is waiting on it).
-- Limits live in app_settings so they can be tuned without a migration.
-- ----------------------------------------------------------------------------
create or replace function reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_hour_limit integer := app_setting_int('reports.max_per_hour', 5);
  v_day_limit  integer := app_setting_int('reports.max_per_day', 20);
  v_recent     integer;
begin
  new.status          := 'new';
  new.triaged_at      := null;
  new.resolved_at     := null;
  new.resolved_by     := null;
  new.resolution_note := null;
  new.duplicate_of    := null;
  new.assigned_to     := null;
  new.vote_agree      := 0;
  new.vote_disagree   := 0;
  new.priority_score  := 0;
  new.created_at      := now();
  new.updated_at      := now();

  -- auth.uid() is null on a privileged connection (SQL editor, service_role),
  -- which already bypasses RLS entirely; rate-limiting it would be theatre.
  if v_uid is null then
    return new;
  end if;

  new.reporter_id := v_uid;

  select count(*) into v_recent
    from reports where reporter_id = v_uid and created_at > now() - interval '1 hour';
  if v_recent >= v_hour_limit then
    raise exception 'rate_limited: at most % reports per hour', v_hour_limit;
  end if;

  select count(*) into v_recent
    from reports where reporter_id = v_uid and created_at > now() - interval '24 hours';
  if v_recent >= v_day_limit then
    raise exception 'rate_limited: at most % reports per day', v_day_limit;
  end if;

  -- Double-tap on a slow connection is the common case, not an attack.
  if exists (
    select 1 from reports
    where reporter_id = v_uid
      and title = new.title
      and body = new.body
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'duplicate_submission: an identical report was filed moments ago'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_before_insert_trg on reports;
create trigger reports_before_insert_trg
  before insert on reports
  for each row execute function reports_before_insert();


-- ----------------------------------------------------------------------------
-- reports_before_update() — the column-level guard RLS cannot provide.
--
-- Reporter path : title, body and reporter_severity, and only while 'new'.
-- Staff path    : the workflow columns, plus title and category (re-titling and
--                 re-categorising are real triage work). The reporter's BODY,
--                 their severity, and every auto-captured field are frozen for
--                 staff too.
-- Always frozen : id, reporter_id, created_at, and the three vote-derived
--                 columns.
-- ----------------------------------------------------------------------------
create or replace function reports_before_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_staff boolean;
begin
  -- The vote machinery. report_recalc_priority() is the only thing that can set
  -- this flag: its EXECUTE is revoked from anon and authenticated, so no client
  -- can reach it, and the flag is transaction-local.
  if coalesce(current_setting('capstone.report_recalc', true), 'off') = 'on' then
    return new;
  end if;

  -- A privileged connection with no JWT bypasses RLS anyway.
  if v_uid is null then
    new.updated_at := now();
    return new;
  end if;

  v_staff := has_role_at_least('administrator', v_uid);

  new.id             := old.id;
  new.reporter_id    := old.reporter_id;
  new.created_at     := old.created_at;
  new.vote_agree     := old.vote_agree;
  new.vote_disagree  := old.vote_disagree;
  new.priority_score := old.priority_score;

  -- Auto-captured context is immutable for everybody.
  new.page_url      := old.page_url;
  new.route         := old.route;
  new.page_title    := old.page_title;
  new.target_kind   := old.target_kind;
  new.target_id     := old.target_id;
  new.target_label  := old.target_label;
  new.selected_text := old.selected_text;
  new.build_id      := old.build_id;
  new.user_agent    := old.user_agent;
  new.viewport_w    := old.viewport_w;
  new.viewport_h    := old.viewport_h;
  new.platform      := old.platform;
  new.app_context   := old.app_context;

  if v_staff then
    -- Staff move the workflow; they do not rewrite what the reporter said.
    new.body              := old.body;
    new.reporter_severity := old.reporter_severity;

    if new.status is distinct from old.status then
      if old.status = 'new' then
        new.triaged_at := coalesce(old.triaged_at, now());
      end if;
      if new.status in ('resolved', 'declined', 'duplicate') then
        new.resolved_at := now();
        new.resolved_by := v_uid;
      else
        new.resolved_at := null;
        new.resolved_by := null;
      end if;
    else
      new.triaged_at  := old.triaged_at;
      new.resolved_at := old.resolved_at;
      new.resolved_by := old.resolved_by;
    end if;

    if new.status <> 'duplicate' then
      new.duplicate_of := null;
    end if;
  else
    if old.reporter_id <> v_uid then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    if old.status <> 'new' then
      raise exception 'report_locked: this report has been triaged and can no longer be edited';
    end if;

    new.category        := old.category;
    new.status          := old.status;
    new.triaged_at      := old.triaged_at;
    new.duplicate_of    := old.duplicate_of;
    new.resolution_note := old.resolution_note;
    new.resolved_by     := old.resolved_by;
    new.resolved_at     := old.resolved_at;
    new.assigned_to     := old.assigned_to;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reports_before_update_trg on reports;
create trigger reports_before_update_trg
  before update on reports
  for each row execute function reports_before_update();


-- ----------------------------------------------------------------------------
-- report_status_audit — who moved a report to what, and when.
-- Written by trigger, so it records the change whether it arrived through
-- report_set_status(), a direct PostgREST update, or the SQL editor.
-- ----------------------------------------------------------------------------
create table if not exists report_status_audit (
  id         bigint generated always as identity primary key,
  report_id  uuid not null references reports(id) on delete cascade,
  actor_id   uuid,
  old_status text,
  new_status text,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists report_status_audit_report_idx
  on report_status_audit (report_id, created_at desc);

alter table report_status_audit enable row level security;

drop policy if exists report_status_audit_select_staff on report_status_audit;
create policy report_status_audit_select_staff on report_status_audit
  for select using (has_role_at_least('advisor'));
-- No write policies; the trigger below is SECURITY DEFINER.

create or replace function reports_audit_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into report_status_audit (report_id, actor_id, old_status, new_status, note)
    values (new.id, auth.uid(), old.status, new.status, new.resolution_note);
  end if;
  return null;
end;
$$;

drop trigger if exists reports_audit_status_trg on reports;
create trigger reports_audit_status_trg
  after update on reports
  for each row execute function reports_audit_status();


-- ----------------------------------------------------------------------------
-- report_votes — one changeable agree/disagree per advisor per report.
-- ----------------------------------------------------------------------------
create table if not exists report_votes (
  report_id  uuid not null references reports(id) on delete cascade,
  voter_id   uuid not null references auth.users(id) on delete cascade,
  vote       smallint not null check (vote in (-1, 1)),
  note       text check (note is null or length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (report_id, voter_id)
);

create index if not exists report_votes_voter_idx on report_votes (voter_id, updated_at desc);

alter table report_votes enable row level security;

-- Advisors and above see every vote, including each other's notes. That is the
-- point of the mechanism: it is a small group deliberating, not a secret ballot.
drop policy if exists report_votes_select_advisor on report_votes;
create policy report_votes_select_advisor on report_votes
  for select using (has_role_at_least('advisor'));

drop policy if exists report_votes_insert_own on report_votes;
create policy report_votes_insert_own on report_votes
  for insert with check (voter_id = auth.uid() and has_role_at_least('advisor'));

drop policy if exists report_votes_update_own on report_votes;
create policy report_votes_update_own on report_votes
  for update
  using (voter_id = auth.uid() and has_role_at_least('advisor'))
  with check (voter_id = auth.uid() and has_role_at_least('advisor'));

drop policy if exists report_votes_delete_own on report_votes;
create policy report_votes_delete_own on report_votes
  for delete using (voter_id = auth.uid() and has_role_at_least('advisor'));

create or replace function report_votes_before_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if v_uid is not null then
      new.voter_id := v_uid;
    end if;
    new.created_at := now();
    new.updated_at := now();
  else
    new.report_id  := old.report_id;
    new.voter_id   := old.voter_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists report_votes_before_write_trg on report_votes;
create trigger report_votes_before_write_trg
  before insert or update on report_votes
  for each row execute function report_votes_before_write();


-- ----------------------------------------------------------------------------
-- report_vote_weight() — ONE PLACE, and it currently weights every tier the
-- same.
--
-- Whether an administrator's vote should outweigh an advisor's is Robbie's
-- call and is NOT implemented here. When he decides, it is an edit to this
-- function body plus one call to report_recalc_all_priorities(). No schema
-- change, no migration to the vote rows.
-- ----------------------------------------------------------------------------
create or replace function report_vote_weight(p_role text)
returns numeric
language sql
immutable
parallel safe
as $$
  select case
           when p_role in ('user', 'advisor', 'administrator', 'owner') then 1::numeric
           else 1::numeric
         end;
$$;

-- ----------------------------------------------------------------------------
-- STORED DERIVED COLUMN, NOT A VIEW — the justification, since it was asked for.
--
-- The dashboard's primary query is "open reports, highest priority first,
-- 25 at a time". As a view, priority is sum(vote) grouped by report, so every
-- page load aggregates the whole vote table, and — the part that actually
-- hurts — an ORDER BY over a computed aggregate cannot be served by an index.
-- Postgres must build and sort the FULL result set to return the top 25, every
-- time, forever, however deep the pagination goes.
--
-- Stored, the same query is an index scan on
-- reports (status, priority_score desc, created_at desc) and stops after 25 rows.
--
-- The usual objection to denormalising is drift, and here the write side is the
-- cheap side: votes are cast by a handful of advisors, so recomputing on every
-- vote costs nothing, while the read happens on every dashboard load. Drift is
-- contained three ways: the columns are only writable behind the transaction-
-- local flag this function sets, reports_before_update() resets them to OLD on
-- every other path, and report_recalc_all_priorities() repairs the whole table
-- if it ever is wrong.
--
-- Caveat worth knowing: because the score reads each voter's CURRENT role,
-- changing someone's role does not retroactively rescore old votes until
-- report_recalc_all_priorities() runs. With every weight at 1 that is invisible;
-- it only matters if weighting is turned on.
-- ----------------------------------------------------------------------------
create or replace function report_recalc_priority(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('capstone.report_recalc', 'on', true);

  update reports r
     set vote_agree     = c.agree,
         vote_disagree  = c.disagree,
         priority_score = c.score
    from (
      select coalesce(count(*) filter (where v.vote = 1), 0)::integer  as agree,
             coalesce(count(*) filter (where v.vote = -1), 0)::integer as disagree,
             coalesce(sum(v.vote * report_vote_weight(coalesce(ur.role, 'user'))), 0)::numeric as score
      from report_votes v
      left join user_roles ur on ur.user_id = v.voter_id
      where v.report_id = p_report_id
    ) c
   where r.id = p_report_id;

  perform set_config('capstone.report_recalc', 'off', true);
end;
$$;

create or replace function report_recalc_all_priorities()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n integer := 0; v_id uuid;
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  for v_id in select id from reports loop
    perform report_recalc_priority(v_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function report_votes_after_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform report_recalc_priority(coalesce(new.report_id, old.report_id));
  return null;
end;
$$;

drop trigger if exists report_votes_after_change_trg on report_votes;
create trigger report_votes_after_change_trg
  after insert or update or delete on report_votes
  for each row execute function report_votes_after_change();


-- ============================================================================
-- PART D — THE READ / WRITE API THE APP CALLS
--
-- Every function starts with the same guard and RAISES rather than returning an
-- empty result, so a caller without the tier gets a hard 403 and not a
-- plausible-looking zero. Same convention as 019.
--
-- These are SECURITY DEFINER because they read auth.users and profiles, neither
-- of which an advisor can reach through RLS — and because report_list() is the
-- mechanism that lets an advisor see a report WITHOUT necessarily seeing who
-- filed it.
-- ============================================================================

create or replace function report_list(
  p_status      text[] default null,
  p_category    text   default null,
  p_target_kind text   default null,
  p_search      text   default null,
  p_sort        text   default 'priority',
  p_limit       integer default 50,
  p_offset      integer default 0
)
returns table (
  id                uuid,
  created_at        timestamptz,
  updated_at        timestamptz,
  category          text,
  category_label    text,
  title             text,
  body              text,
  reporter_severity text,
  status            text,
  priority_score    numeric,
  vote_agree        integer,
  vote_disagree     integer,
  my_vote           smallint,
  page_url          text,
  route             text,
  page_title        text,
  target_kind       text,
  target_id         text,
  target_label      text,
  selected_text     text,
  build_id          text,
  user_agent        text,
  viewport_w        integer,
  viewport_h        integer,
  platform          text,
  duplicate_of      uuid,
  resolution_note   text,
  resolved_at       timestamptz,
  assigned_to       uuid,
  reporter_id       uuid,
  reporter_name     text,
  total_count       bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_limit   integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset  integer := greatest(coalesce(p_offset, 0), 0);
  v_sort    text := coalesce(p_sort, 'priority');
  v_search  text := nullif(btrim(coalesce(p_search, '')), '');
  v_pattern text;
  v_reveal  boolean;
begin
  if not has_role_at_least('advisor') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Reporter identity lives on this line and nowhere else. Ships true.
  v_reveal := has_role_at_least('administrator')
              or app_setting_bool('reports.reveal_reporter_to_advisors', false);

  -- ILIKE via a parameter, never concatenated; % and _ escaped so a search for
  -- "a_b" cannot become a wildcard. Same treatment as 019's admin_list_users.
  v_pattern := case when v_search is null then null
                    else '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  return query
  with matched as (
    select r.*
    from reports r
    where (p_status is null      or r.status = any (p_status))
      and (p_category is null    or r.category = p_category)
      and (p_target_kind is null or r.target_kind = p_target_kind)
      and (v_pattern is null
           or r.title ilike v_pattern escape '\'
           or r.body ilike v_pattern escape '\'
           or r.selected_text ilike v_pattern escape '\'
           or r.target_id ilike v_pattern escape '\')
  ),
  counted as (select count(*) as n from matched)
  select m.id,
         m.created_at,
         m.updated_at,
         m.category,
         rc.label,
         m.title,
         m.body,
         m.reporter_severity,
         m.status,
         m.priority_score,
         m.vote_agree,
         m.vote_disagree,
         mv.vote,
         m.page_url,
         m.route,
         m.page_title,
         m.target_kind,
         m.target_id,
         m.target_label,
         m.selected_text,
         m.build_id,
         m.user_agent,
         m.viewport_w,
         m.viewport_h,
         m.platform,
         m.duplicate_of,
         m.resolution_note,
         m.resolved_at,
         m.assigned_to,
         case when v_reveal then m.reporter_id end,
         case when v_reveal then coalesce(p.display_name, u.email::text) end,
         counted.n
  from matched m
  cross join counted
  left join report_categories rc on rc.key = m.category
  left join report_votes mv on mv.report_id = m.id and mv.voter_id = v_uid
  left join profiles p   on p.id = m.reporter_id
  left join auth.users u on u.id = m.reporter_id
  order by
    case when v_sort = 'priority' then m.priority_score end desc nulls last,
    case when v_sort = 'oldest'   then m.created_at end asc nulls last,
    m.created_at desc
  limit v_limit offset v_offset;
end;
$$;


create or replace function report_detail(p_report_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_reveal boolean;
  v_result jsonb;
begin
  if not has_role_at_least('advisor') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_reveal := has_role_at_least('administrator')
              or app_setting_bool('reports.reveal_reporter_to_advisors', false);

  select jsonb_build_object(
    'report', to_jsonb(r) - case when v_reveal then '__none__' else 'reporter_id' end,
    'reporter_name', case when v_reveal then coalesce(p.display_name, u.email::text) end,
    'category_label', rc.label,
    'votes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'voter_id',   v.voter_id,
               'voter_name', coalesce(vp.display_name, vu.email::text),
               'voter_role', coalesce(vr.role, 'user'),
               'vote',       v.vote,
               'note',       v.note,
               'updated_at', v.updated_at
             ) order by v.updated_at desc)
      from report_votes v
      left join profiles vp    on vp.id = v.voter_id
      left join auth.users vu  on vu.id = v.voter_id
      left join user_roles vr  on vr.user_id = v.voter_id
      where v.report_id = r.id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'at',         h.created_at,
               'actor_id',   case when v_reveal then h.actor_id end,
               'actor_name', coalesce(hp.display_name, hu.email::text),
               'old_status', h.old_status,
               'new_status', h.new_status,
               'note',       h.note
             ) order by h.created_at desc)
      from report_status_audit h
      left join profiles hp   on hp.id = h.actor_id
      left join auth.users hu on hu.id = h.actor_id
      where h.report_id = r.id
    ), '[]'::jsonb)
  )
  into v_result
  from reports r
  left join report_categories rc on rc.key = r.category
  left join profiles p   on p.id = r.reporter_id
  left join auth.users u on u.id = r.reporter_id
  where r.id = p_report_id;

  if v_result is null then
    raise exception 'no such report' using errcode = '02000';
  end if;

  return v_result;
end;
$$;


-- One agree/disagree per advisor per report, changeable. p_vote = 0 retracts.
create or replace function report_vote(p_report_id uuid, p_vote integer, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if not has_role_at_least('advisor') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from reports r where r.id = p_report_id) then
    raise exception 'no such report' using errcode = '02000';
  end if;

  if p_vote = 0 then
    delete from report_votes where report_id = p_report_id and voter_id = v_uid;
    return;
  end if;

  if p_vote not in (-1, 1) then
    raise exception 'vote must be -1, 0 or 1' using errcode = '22023';
  end if;

  insert into report_votes (report_id, voter_id, vote, note)
  values (p_report_id, v_uid, p_vote::smallint, left(p_note, 2000))
  on conflict (report_id, voter_id) do update
    set vote = excluded.vote,
        note = excluded.note;
end;
$$;


-- The sanctioned status-change path. A direct PostgREST update also works
-- (reports_before_update() guards it identically), but this one is atomic,
-- validates the duplicate target, and carries the resolution note into the
-- audit row.
create or replace function report_set_status(
  p_report_id      uuid,
  p_status         text,
  p_resolution_note text default null,
  p_duplicate_of   uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_target_status text;
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('new', 'triaged', 'accepted', 'in_progress',
                      'resolved', 'declined', 'duplicate') then
    raise exception 'unknown status %', p_status using errcode = '22023';
  end if;

  if p_status = 'duplicate' then
    if p_duplicate_of is null then
      raise exception 'duplicate_of is required when marking a report duplicate'
        using errcode = '22023';
    end if;
    if p_duplicate_of = p_report_id then
      raise exception 'a report cannot be a duplicate of itself' using errcode = '22023';
    end if;
    select r.status into v_target_status from reports r where r.id = p_duplicate_of;
    if v_target_status is null then
      raise exception 'no such report to duplicate against' using errcode = '02000';
    end if;
    -- No chains: point at the canonical report, not at another duplicate. This
    -- is also what makes a duplicate cycle impossible.
    if v_target_status = 'duplicate' then
      raise exception 'that report is itself marked duplicate; point at the original'
        using errcode = '22023';
    end if;
  end if;

  update reports
     set status          = p_status,
         resolution_note = coalesce(left(p_resolution_note, 4000), resolution_note),
         duplicate_of    = case when p_status = 'duplicate' then p_duplicate_of else null end
   where id = p_report_id;

  if not found then
    raise exception 'no such report' using errcode = '02000';
  end if;
end;
$$;


create or replace function report_assign(p_report_id uuid, p_assignee uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_assignee is not null and not has_role_at_least('advisor', p_assignee) then
    raise exception 'reports can only be assigned to advisors and above'
      using errcode = '22023';
  end if;
  update reports set assigned_to = p_assignee where id = p_report_id;
  if not found then
    raise exception 'no such report' using errcode = '02000';
  end if;
end;
$$;


-- Badge counts for the dashboard nav.
create or replace function report_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  if not has_role_at_least('advisor') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'by_status',   coalesce((select jsonb_object_agg(s.status, s.n)
                             from (select status, count(*) as n from reports group by status) s), '{}'::jsonb),
    'by_category', coalesce((select jsonb_object_agg(c.category, c.n)
                             from (select category, count(*) as n from reports group by category) c), '{}'::jsonb),
    'open',        (select count(*) from reports
                     where status in ('new', 'triaged', 'accepted', 'in_progress')),
    'untriaged',   (select count(*) from reports where status = 'new'),
    'unvoted_by_me', (select count(*) from reports r
                       where r.status in ('new', 'triaged', 'accepted', 'in_progress')
                         and not exists (select 1 from report_votes v
                                          where v.report_id = r.id and v.voter_id = auth.uid()))
  ) into v_result;

  return v_result;
end;
$$;


-- ============================================================================
-- GRANTS
--
-- EXECUTE defaults to PUBLIC on a new function, and the tier guard inside each
-- one is the actual gate — but revoking from `anon` narrows what a signed-out
-- request can even reach. Same posture as 019.
--
-- The exception is report_recalc_priority(), which is revoked from EVERYONE:
-- it is the only thing that can set the transaction-local flag
-- reports_before_update() trusts, so it must be unreachable from the outside.
-- It is still callable by the vote trigger, which runs as the definer.
-- ============================================================================

revoke execute on function report_recalc_priority(uuid) from public, anon, authenticated;

revoke execute on function set_user_role(uuid, text, text)                 from anon;
revoke execute on function list_user_roles()                               from anon;
revoke execute on function set_app_setting(text, jsonb)                    from anon;
revoke execute on function app_setting_int(text, integer)                  from anon;
revoke execute on function report_upsert_category(text, text, text, integer, boolean) from anon;
revoke execute on function report_list(text[], text, text, text, text, integer, integer) from anon;
revoke execute on function report_detail(uuid)                             from anon;
revoke execute on function report_vote(uuid, integer, text)                from anon;
revoke execute on function report_set_status(uuid, text, text, uuid)       from anon;
revoke execute on function report_assign(uuid, uuid)                       from anon;
revoke execute on function report_counts()                                 from anon;
revoke execute on function report_recalc_all_priorities()                  from anon;

-- These two are evaluated INSIDE RLS policies, so the querying role must be
-- able to execute them. app_setting_bool stays reachable by anon because the
-- reports INSERT policy references it.
grant execute on function has_role_at_least(text, uuid) to anon, authenticated;
grant execute on function role_rank(text)               to anon, authenticated;
grant execute on function app_setting_bool(text, boolean) to anon, authenticated;
grant execute on function current_user_role()           to authenticated;

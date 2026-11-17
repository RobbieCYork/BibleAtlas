-- ============================================================================
-- 043_paid_content.sql — CAPSTONE PLUS, PHASE 1: PROTECT THE PAID FIELDS
--
-- STATUS: WRITTEN AND COMMITTED ON BRANCH `paid-content`. **NOT APPLIED ANYWHERE.**
--         Applying it to production needs Robbie's explicit word, like every
--         migration since 033. Rehearse on staging first. Exact steps:
--         scripts/paid-content/README.md ("Applying sql/043").
--
-- NUMBERING: 042 is the last number taken (sql/README.md). 043 is next free.
--
-- DEPENDS ON (all applied on production):
--   025 — user_roles, has_role_at_least(), app_settings, app_setting_bool(),
--         set_app_setting(). This file calls all of them.
-- DOES NOT DEPEND ON the written-but-unapplied 027, 029, 033, 034, 035, 036,
--   040, 041. It may be applied before or after any of them. 034 pins
--   search_path on OLDER functions; every function here pins its own.
-- ============================================================================
--
-- WHAT THIS IS
-- ----------------------------------------------------------------------------
-- Architecture B of automation/manager/paid-tier-plan.md, approved by Robbie
-- 2026-11-17. Every article's text BELOW its Bible references list (Reflect,
-- life story, sections, history, archaeology, evidence, sources) moves out of
-- the public JS bundle into `content_paid`, readable only when
-- has_entitlement('plus') is true. The split itself is src/lib/paidContentSpec.ts;
-- the rows are written by the GENERATED seed from scripts/paid-content/split.mjs,
-- never by a client.
--
-- PHASE 1 CHANGES NOTHING FOR ANYONE
-- ----------------------------------------------------------------------------
-- app_settings 'paid.everyone_has_plus' ships TRUE: every signed-in account
-- (members, and "Continue as Guest" anonymous users, who carry the
-- `authenticated` role) passes has_entitlement('plus'). It is the one switch
-- that later turns the paywall on, flipped by an owner:
--     select set_app_setting('paid.everyone_has_plus', 'false'::jsonb);
-- and back:
--     select set_app_setting('paid.everyone_has_plus', 'true'::jsonb);
-- A missing row reads as FALSE (fail closed): deleting the row is "paywall on",
-- never "paywall off".
--
-- The `anon` role (no session at all) never reads content_paid, switch or no
-- switch: it has no grant and no policy. The app requires an account anyway.
--
-- SECURITY SHAPE (same rules as sql/025, sql/041, sql/042)
-- ----------------------------------------------------------------------------
--   * Every table: RLS on, REVOKE ALL from anon, authenticated and PUBLIC first
--     (Supabase's default ACL hands new tables full CRUD to both), then grant
--     back only SELECT, only to authenticated, only where a policy allows it.
--   * NO client write path to entitlements, entitlement_events or content_paid.
--     Writes come from (a) the seed, run as the database owner, (b) a future
--     webhook Edge Function using the service role (phase 2), and (c) the two
--     owner-only RPCs below, which re-check has_role_at_least('owner').
--   * Every function: SECURITY DEFINER, `set search_path = public, pg_temp`
--     (sql/034's convention: pg_temp LAST), EXECUTE revoked from PUBLIC and
--     anon, granted to authenticated only.
--   * content_paid's policy wraps the check as `(select has_entitlement(...))`
--     so Postgres evaluates it once per statement (an InitPlan), not per row.
--
-- IDEMPOTENT: create ... if not exists; policies dropped-if-exist then created;
-- create or replace function; inserts on conflict do nothing; grants/revokes
-- repeat cleanly. Safe to run twice. The test file
-- sql/tests/043_paid_content_test.sql proves the access rules.
--
-- REVERSAL (only if never seeded with anything worth keeping):
--   drop table public.content_paid, public.entitlement_events, public.entitlements;
--   drop function public.has_entitlement(text), public.grant_comp(uuid, timestamptz, text),
--                 public.revoke_comp(uuid, text);
--   delete from public.app_settings where key in ('paid.everyone_has_plus', 'paid.content_version');
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- The switch, and the content version the seed records (scripts/paid-content
-- compares it with the repo to catch "edited the article, forgot to push it").
-- app_settings is readable by administrators only (sql/025); the client never
-- reads either row, it just asks has_entitlement().
-- ----------------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('paid.everyone_has_plus', 'true'::jsonb),
  ('paid.content_version',   '""'::jsonb)
on conflict (key) do nothing;


-- ----------------------------------------------------------------------------
-- entitlements — who has Capstone Plus, from where, until when.
-- Shape from the plan, section 3. One row per (user, entitlement, source), so
-- an App Store subscription and an owner comp can coexist and expire on their
-- own. expires_at NULL = no end (lifetime / open-ended comp).
-- ----------------------------------------------------------------------------
create table if not exists public.entitlements (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  entitlement  text        not null check (entitlement in ('plus')),
  source       text        not null check (source in ('app_store', 'play_store', 'stripe', 'comp', 'founding')),
  product_id   text        check (product_id is null or length(product_id) <= 200),
  expires_at   timestamptz,
  grace_until  timestamptz,
  original_txn text        check (original_txn is null or length(original_txn) <= 200),
  note         text        check (note is null or length(note) <= 500),
  updated_at   timestamptz not null default now(),
  primary key (user_id, entitlement, source)
);

alter table public.entitlements enable row level security;
revoke all on public.entitlements from anon, authenticated, public;

-- A reader may see their own rows (the account screen will say "Plus until …").
drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own on public.entitlements
  as permissive for select to authenticated
  using (user_id = auth.uid());

-- Owners see everyone's, for support.
drop policy if exists entitlements_select_owner on public.entitlements;
create policy entitlements_select_owner on public.entitlements
  as permissive for select to authenticated
  using (public.has_role_at_least('owner'));

grant select on public.entitlements to authenticated;
-- Deliberately NO insert/update/delete grant and NO write policy.


-- ----------------------------------------------------------------------------
-- entitlement_events — append-only audit: every comp grant/revoke here, every
-- store webhook in phase 2. Owner-readable only. Cascade on account deletion:
-- the row is personal data of the deleted account.
-- ----------------------------------------------------------------------------
create table if not exists public.entitlement_events (
  id          bigint generated always as identity primary key,
  user_id     uuid        references auth.users(id) on delete cascade,
  source      text        not null check (length(source) between 1 and 40),
  event       text        not null check (length(event) between 1 and 60),
  actor       uuid,
  raw         jsonb       check (raw is null or pg_column_size(raw) <= 65536),
  received_at timestamptz not null default now()
);

create index if not exists entitlement_events_user_idx on public.entitlement_events (user_id, received_at desc);

alter table public.entitlement_events enable row level security;
revoke all on public.entitlement_events from anon, authenticated, public;

drop policy if exists entitlement_events_select_owner on public.entitlement_events;
create policy entitlement_events_select_owner on public.entitlement_events
  as permissive for select to authenticated
  using (public.has_role_at_least('owner'));

grant select on public.entitlement_events to authenticated;


-- ----------------------------------------------------------------------------
-- has_entitlement(p) — the ONE predicate. Order of the checks matters only for
-- speed; each is sufficient on its own:
--   no session                       -> false (anon never passes)
--   owner                            -> true  (always, switch or no switch)
--   'paid.everyone_has_plus' = true  -> true  (phase 1: every signed-in account)
--   an unexpired row                 -> true  (expires_at in the future, or
--                                              NULL = no end, or still inside
--                                              grace_until)
-- An unknown entitlement name is an error, not "false": a typo in a policy
-- must fail loudly, the way role_rank() refuses unknown roles (sql/025).
-- ----------------------------------------------------------------------------
create or replace function public.has_entitlement(p text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if p is null or p not in ('plus') then
    raise exception 'unknown entitlement %', p using errcode = '22023';
  end if;

  if v_uid is null then
    return false;
  end if;

  if public.has_role_at_least('owner', v_uid) then
    return true;
  end if;

  if public.app_setting_bool('paid.everyone_has_plus', false) then
    return true;
  end if;

  return exists (
    select 1
      from public.entitlements e
     where e.user_id = v_uid
       and e.entitlement = p
       and (   e.expires_at is null
            or e.expires_at > now()
            or (e.grace_until is not null and e.grace_until > now()))
  );
end;
$$;

revoke all on function public.has_entitlement(text) from public, anon;
grant execute on function public.has_entitlement(text) to authenticated;


-- ----------------------------------------------------------------------------
-- content_paid — the text below the cut, one row per article.
-- kind uses article_reads' vocabulary (sql/041): place, site, person, topic,
-- event. id is the record's own id from src/data/*.ts (the permanent public URL
-- id, AGENTS.md). body holds exactly the record's paid keys
-- (src/lib/paidContentSpec.ts PAID_KEYS). content_hash = sha256 of the body's
-- canonical JSON, so a re-seed rewrites only rows that changed.
-- ----------------------------------------------------------------------------
create table if not exists public.content_paid (
  kind         text        not null check (kind in ('place', 'site', 'person', 'topic', 'event')),
  id           text        not null check (length(id) between 1 and 200),
  body         jsonb       not null check (jsonb_typeof(body) = 'object'),
  content_hash text        not null check (length(content_hash) = 64),
  updated_at   timestamptz not null default now(),
  primary key (kind, id)
);

alter table public.content_paid enable row level security;
revoke all on public.content_paid from anon, authenticated, public;

drop policy if exists content_paid_select_entitled on public.content_paid;
create policy content_paid_select_entitled on public.content_paid
  as permissive for select to authenticated
  using ((select public.has_entitlement('plus')));

grant select on public.content_paid to authenticated;
-- Deliberately NO insert/update/delete grant and NO write policy.


-- ----------------------------------------------------------------------------
-- Owner RPCs for comps (testers, the App Review account, gifts). Audited.
-- ----------------------------------------------------------------------------
create or replace function public.grant_comp(p_user_id uuid, p_until timestamptz default null, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_role_at_least('owner') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'user id required' using errcode = '22023';
  end if;
  if p_until is not null and p_until <= now() then
    raise exception 'comp end must be in the future' using errcode = '22023';
  end if;

  insert into public.entitlements (user_id, entitlement, source, expires_at, note, updated_at)
  values (p_user_id, 'plus', 'comp', p_until, p_note, now())
  on conflict (user_id, entitlement, source) do update
    set expires_at = excluded.expires_at, note = excluded.note, updated_at = now();

  insert into public.entitlement_events (user_id, source, event, actor, raw)
  values (p_user_id, 'comp', 'grant', auth.uid(),
          jsonb_build_object('until', p_until, 'note', p_note));
end;
$$;

create or replace function public.revoke_comp(p_user_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_role_at_least('owner') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.entitlements
   where user_id = p_user_id and entitlement = 'plus' and source = 'comp';

  insert into public.entitlement_events (user_id, source, event, actor, raw)
  values (p_user_id, 'comp', 'revoke', auth.uid(), jsonb_build_object('note', p_note));
end;
$$;

revoke all on function public.grant_comp(uuid, timestamptz, text) from public, anon;
revoke all on function public.revoke_comp(uuid, text) from public, anon;
grant execute on function public.grant_comp(uuid, timestamptz, text) to authenticated;
grant execute on function public.revoke_comp(uuid, text) to authenticated;

commit;

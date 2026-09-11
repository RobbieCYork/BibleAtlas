-- ============================================================================
-- CAPSTONE FOR CHURCHES — STAGE 1
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/033_churches.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- *** NOT APPLIED. *** Nothing in this file has been run against any database.
-- It is written to be reviewed first, per the standing rule. The app code that
-- ships alongside it probes for these objects and renders NOTHING church-shaped
-- until they exist (src/lib/churchApi.ts), so the site is correct with this file
-- unapplied and correct the moment it is applied. There is nothing to deploy
-- when it lands.
--
-- Design: automation/manager/churches-scope.md. That document argued every
-- decision below and this file does not reopen any of them. Where it diverges
-- it says so, in place, with the reason.
--
-- Written against sql/000_baseline.sql — the dump of the live schema taken
-- 2026-09-11 — and not against memory. `groups`, `group_members`,
-- `group_join_requests` and `sermon_notes` have no `create table` anywhere in
-- sql/; the baseline is the only description of them that exists, and this file
-- was written with it open. That matters here more than usual: the church
-- tables clone the groups policy set, and this project has already earned
-- Postgres 42P17 twice (sql/003, sql/012) by writing policies against policies
-- nobody could read.
--
-- ============================================================================
-- WHAT THIS ADDS
-- ============================================================================
--   churches                a real organisation, not a group with a flag
--   church_members          per-organisation role: admin | staff | member
--   church_join_requests    the approve/decline queue, when open_join is off
--   church_sermons          the church's own outline — draft, then published
--   sermon_notes            FIVE NULLABLE COLUMNS. NO NEW POLICIES. See below.
--
-- ============================================================================
-- THE ONE CONSTRAINT THIS FILE EXISTS TO KEEP
-- ============================================================================
--
--   A CHURCH CAN NEVER DELETE OR ALTER A MEMBER'S SERMON NOTES.
--
-- Not "the UI doesn't offer it". Structurally, and checkable in one grep:
--
--   1. This file adds NO POLICY to sermon_notes. Its RLS stays exactly the four
--      policies the baseline records — select/insert/update/delete, all of them
--      `auth.uid() = user_id` and nothing else.
--   2. This file adds NO GRANT to sermon_notes. It does not touch the table's
--      privileges at all.
--   3. The only new code path that writes to sermon_notes is
--      fork_church_sermon(), which INSERTs one row with user_id = auth.uid()
--      and can do nothing else. It has no UPDATE and no DELETE in it.
--   4. The provenance FK is `on delete SET NULL`, deliberately NOT cascade.
--      Cascade is the default a hurried implementer reaches for and it is
--      precisely the unacceptable outcome: it would delete a member's notes
--      when a church tidied up its library.
--   5. Nothing in this file grants DELETE on church_sermons or churches to any
--      client role, and neither table has a DELETE policy. Deletion is soft.
--      So the SET NULL in (4) is a safety net for an out-of-band dashboard
--      delete; no church action from inside the app can even reach it.
--   6. No trigger created here reads or writes sermon_notes.
--
-- The honest edge of that claim, stated rather than glossed: a hard DELETE of a
-- church_sermons row — which only a superuser or the Supabase dashboard can do,
-- never the app — fires the FK's SET NULL, which writes NULL into
-- source_church_sermon_id on every fork of it. Referential actions run as the
-- table owner and so are not subject to RLS. That single column going null IS
-- what "the original is no longer available" means, and the snapshot columns
-- beside it are there precisely so the attribution survives it. No other column
-- of a member's note is reachable by any church action, at any tier, ever.
--
-- If a future migration adds a church-scoped write policy to sermon_notes, that
-- is the bug. It is visible in one grep of sql/.
--
-- ============================================================================
-- RLS RECURSION (Postgres 42P17) — read this before editing any policy below
-- ============================================================================
-- A policy on table T containing a subquery against T re-enters its own policy
-- and recurses forever. Every church-role check below goes through
-- church_role_at_least(), which is SECURITY DEFINER: its internal SELECT runs
-- as the function owner, a table owner bypasses its own RLS, and so the lookup
-- never re-enters the calling policy. This is sql/025's pattern verbatim, and
-- it is also how the live is_group_member()/is_group_admin() already work.
--
-- NOTHING in this file writes `exists (select 1 from church_members ...)`
-- directly into a policy on church_members. If you are about to, don't.
--
-- THE PREREQUISITE THAT MAKES IT TRUE: these functions must end up owned by the
-- same role that owns the tables. Running this whole file in one session as
-- `postgres` — the SQL Editor, or psql on SUPABASE_DB_URL — is what guarantees
-- that. The verification block at the very bottom checks it after the fact.
--
-- Also note what SECURITY DEFINER does NOT do: it does not make a policy safe
-- to write against a table whose own policies you have not read. RLS applies to
-- tables referenced inside a policy expression, which is how a check that looks
-- restrictive can silently always pass. Every table referenced from a policy in
-- this file is a table this file creates.
--
-- ============================================================================
-- WHO CAN SEE WHAT — the exposure summary, in plain terms
-- ============================================================================
--
-- anon (signed out)
--   NOTHING. Not a church's name, not its existence. There is no anon policy on
--   any table here and no grant to anon on any of them. The public directory is
--   Stage 3 and is deliberately absent: find_churches() below is written and
--   shipped so Stage 3 needs no migration, but it can only ever return churches
--   that are `is_listed and verified`, and nothing in Stage 1 can set either
--   flag from the app. It returns zero rows today, by construction.
--
-- a signed-in person who is not a member of church X
--   reads   : nothing about X from any table. Not the name, not the member
--             count, not one sermon title.
--             ONE EXCEPTION, deliberate: church_join_preview(X) returns X's
--             name, city, region, denomination, member count and whether it is
--             open-join — TO ANYONE WHO ALREADY HAS X's UUID. That is what an
--             invite link is, and someone about to join is entitled to be told
--             what they are joining. The uuid is not enumerable: no function
--             here hands out the id of a church you are not in.
--   writes  : may request to join X (or, if X is open_join, join it).
--
--   *** THE INVITE LINK IS THE CREDENTIAL. *** open_join defaults to TRUE for a
--   church — flipped from groups' invite-only default, on purpose, because a
--   church wants people in the door and a QR code on a bulletin has to work for
--   two hundred people in one morning. Anyone who has the link is therefore in,
--   and can then read every PUBLISHED outline. A church that wants a gate turns
--   open_join off and approves each request. This is a product decision, it is
--   the scope's, and the UI states it in those words at the point the link is
--   copied.
--
-- member of church X
--   reads   : X's own row in full — including phone and street address, which
--             are members-only in Stage 1 because nothing is public in Stage 1.
--             X's PUBLISHED, non-deleted outlines, in full.
--             The names and avatars of X's other members (see the note on
--             list_church_members below — this is the one genuinely new
--             personal-data exposure in this migration).
--             Their own join request.
--   writes  : forks an outline into their own notes; leaves the church.
--   cannot  : see a draft. Write to any outline. See the join-request queue.
--             Change anyone's role, including their own — church_members has NO
--             update policy and no update grant at all. Edit the church profile.
--             Touch another member's notes, by any route.
--
-- staff / speaker at X
--   reads   : everything a member reads, plus DRAFT outlines.
--   writes  : creates, edits and publishes outlines. Soft-deletes their OWN.
--   cannot  : edit the church profile. Approve joins. Change roles. Remove
--             members. Move an outline to another church (church_id is not in
--             the update grant, and a trigger pins it besides).
--
-- admin at X
--   reads   : everything staff reads, plus the join-request queue.
--   writes  : the church profile (a fixed column list — see the grant), roles,
--             approvals, member removal, soft-delete of any outline, soft-delete
--             of the church.
--   cannot  : set verification_state, is_listed or suspended_at. Those are NOT
--             in the column grant, so an admin cannot list their own church
--             publicly or mark it verified — which is the whole of Stage 3's
--             trust model, held by a GRANT rather than by a policy, because RLS
--             is row-level and could not hold it. This is sql/025's lesson about
--             `role` on `profiles`, applied one table over.
--             Hard-delete anything. Leave the church while they are its last
--             admin (a trigger refuses).
--
-- app administrator / owner (sql/025, a completely separate axis)
--   reads   : every church, every membership, every outline, including suspended
--             and soft-deleted ones, for moderation.
--   writes  : NOTHING here. No update policy in this file admits them. They are
--             a read tier plus, in Stage 3, a suspend lever.
--   cannot  : write to a member's sermon_notes. No policy in this file mentions
--             that table.
--
-- A church admin has NO relationship to the sql/025 tiers and acquires none.
-- `user_roles` is not touched by one line of this file.
--
-- ============================================================================
-- ONE THING TO WEIGH BEFORE APPLYING — the member roster
-- ============================================================================
-- profiles' SELECT policy is "your own row, or someone you have a friend link
-- with". A church member list read straight from the client would therefore be
-- two hundred uuids with the word "Someone" beside each one. list_church_members()
-- is SECURITY DEFINER and returns display_name and avatar_url for the members of
-- a church you belong to.
--
-- That is a real widening: fellow members of your congregation can see your
-- display name and avatar without being your friends. Groups does not do this.
-- It is stated here rather than buried because it is the one place this
-- migration shows a person something about another person that they could not
-- see before. It is filtered by is_blocked_between() in both directions, the
-- same way sql/032 made the three find_* functions behave, so blocking still
-- works inside a congregation.
-- ============================================================================

create extension if not exists pgcrypto;


-- ============================================================================
-- 1. THE ROLE PREDICATE — defined first, because a CREATE POLICY expression is
--    resolved at creation time and a policy naming a function that does not yet
--    exist fails outright. Same ordering constraint sql/025 documents.
-- ============================================================================

-- member < staff < admin. IMMUTABLE and tiny so it can sit inside the STABLE
-- function below without costing anything per row.
create or replace function church_role_rank(p_role text)
returns integer
language sql
immutable
as $$
  select case p_role
           when 'member' then 1
           when 'staff'  then 2
           when 'admin'  then 3
           else null
         end;
$$;

-- "Is this account at least <role> at this church?"
--
-- SECURITY DEFINER / STABLE / pinned search_path, for sql/025's three reasons:
-- the caller must not be able to read church_members rows they cannot see, the
-- planner should hoist it out of per-row evaluation, and nobody should be able
-- to shadow `church_members` with a temp table and answer the question for
-- themselves. The live is_group_member()/is_group_admin() are the same shape
-- but pin NO search_path — a real gap in the hand-made groups layer, recorded
-- here rather than copied. sql/034_pin_search_path.sql (also unapplied) closes
-- it for those eighteen functions; nothing in THIS file depends on 034 having
-- run, because every function here pins its own.
create or replace function church_role_at_least(p_church_id uuid, p_role text, p_uid uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_required integer := church_role_rank(p_role);
  v_actual   integer;
begin
  if v_required is null then
    raise exception 'unknown church role %', p_role using errcode = '22023';
  end if;
  if p_uid is null or p_church_id is null then
    return false;
  end if;
  select church_role_rank(m.role) into v_actual
    from church_members m
   where m.church_id = p_church_id and m.user_id = p_uid;
  return coalesce(v_actual, 0) >= v_required;
end;
$$;


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- churches — the organisation.
--
-- A separate entity, NOT `groups.kind = 'church'`. The scope's §2.1 argues it at
-- length; the decisive reason is that a church profile must eventually be
-- readable by anon and a group row must never be, and widening a policy set that
-- is not in the repo is the most dangerous edit available in this schema.
--
-- created_by is NULLABLE and `on delete set null`, which is a DELIBERATE
-- DIVERGENCE from the scope's `not null references profiles(id)`. An
-- organisation must outlive the individual who happened to register it: with
-- `not null ... on delete cascade` — which is what `groups` does today — the
-- pastor closing their personal account would take the church, its roster and
-- every outline with it. Authority lives in church_members.role, not here; this
-- column is provenance, and provenance is allowed to lose its subject.
-- ----------------------------------------------------------------------------
create table if not exists churches (
  id uuid primary key default gen_random_uuid(),
  -- Unique, but NOT derived from the name and NOT set by Stage 1. "First Baptist
  -- Church" exists about a thousand times in the United States; uniqueness at
  -- Stage 3 is on name + city + region, never on the name alone.
  slug text unique,
  name text not null check (char_length(name) between 1 and 120),
  city text check (city is null or char_length(city) <= 100),
  region text check (region is null or char_length(region) <= 100),
  country text check (country is null or char_length(country) <= 100),
  website text check (website is null or char_length(website) <= 300),
  phone text check (phone is null or char_length(phone) <= 40),
  address_line1 text check (address_line1 is null or char_length(address_line1) <= 200),
  address_line2 text check (address_line2 is null or char_length(address_line2) <= 200),
  postal_code text check (postal_code is null or char_length(postal_code) <= 30),
  denomination text check (denomination is null or char_length(denomination) <= 120),
  about text check (about is null or char_length(about) <= 4000),
  service_times text check (service_times is null or char_length(service_times) <= 600),
  logo_url text,
  -- Stage 3's trust model. Not writable from the app at any tier: see the
  -- column grant below, which is what actually holds this.
  verification_state text not null default 'unverified'
    check (verification_state in ('unverified', 'pending', 'verified', 'rejected')),
  is_listed boolean not null default false,
  -- TRUE by default, flipped relative to groups on purpose. A private study group
  -- wants a gate; a church wants people in the door. See the header.
  open_join boolean not null default true,
  sermon_titles_public boolean not null default false,
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rate-limit support (§8: one church per account per 24h) and the "my churches"
-- lookup both hit this.
create index if not exists churches_created_by_idx on churches (created_by, created_at desc);
-- Stage 3's directory query, written now so the index is not a separate later
-- migration on a table that by then has rows.
create index if not exists churches_listed_idx on churches (name)
  where is_listed and verification_state = 'verified' and suspended_at is null and deleted_at is null;

-- ----------------------------------------------------------------------------
-- church_members — the per-organisation role axis. Nothing to do with sql/025's
-- app-wide user_roles, which this file does not touch.
--
-- FK to auth.users, not profiles, matching group_members exactly (see the
-- baseline). A membership should die with the account, and it does.
-- ----------------------------------------------------------------------------
create table if not exists church_members (
  church_id uuid not null references churches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'staff', 'member')),
  joined_at timestamptz not null default now(),
  primary key (church_id, user_id)
);

-- The PK indexes (church_id, user_id). list_my_churches() and every
-- church_role_at_least() call from a policy look up by user first.
create index if not exists church_members_user_idx on church_members (user_id, church_id);
-- The last-admin guard counts admins per church on every membership delete.
create index if not exists church_members_admin_idx on church_members (church_id) where role = 'admin';

-- ----------------------------------------------------------------------------
-- church_join_requests — a straight copy of the group_join_requests shape in the
-- baseline, including the (church_id, user_id) unique key that makes a repeat
-- request an upsert rather than a duplicate row.
-- ----------------------------------------------------------------------------
create table if not exists church_join_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (church_id, user_id)
);

create index if not exists church_join_requests_pending_idx
  on church_join_requests (church_id, created_at desc) where status = 'pending';

-- ----------------------------------------------------------------------------
-- church_sermons — the church's outline.
--
-- `body` uses the IDENTICAL format as sermon_notes.body: either legacy plain
-- text or sanitised HTML behind the sentinel prefix that src/lib/richText.ts
-- owns. That is the whole point of keeping the tables separate but the format
-- shared — <SermonNoteEditor> is mounted by both surfaces, so rich text, Insert
-- Scripture and photo/OCR were written once and work on both.
--
-- `version` is bumped by a trigger on every substantive edit. Stage 1 records
-- it and does nothing with it; Stage 2's "First Baptist updated this outline"
-- banner compares it against the snapshot taken at fork time, which is why it
-- has to be right from the first published outline, not added later.
-- ----------------------------------------------------------------------------
create table if not exists church_sermons (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 300),
  -- Free text, because most speakers are not accounts. speaker_user_id is the
  -- optional link when they are.
  speaker_name text check (speaker_name is null or char_length(speaker_name) <= 120),
  speaker_user_id uuid references auth.users(id) on delete set null,
  service_date date,
  series text check (series is null or char_length(series) <= 150),
  scripture_ref text check (scripture_ref is null or char_length(scripture_ref) <= 200),
  body text not null default '',
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists church_sermons_church_idx
  on church_sermons (church_id, service_date desc nulls last, created_at desc);


-- ============================================================================
-- 3. sermon_notes — FIVE NULLABLE COLUMNS. NOTHING ELSE. READ THE HEADER.
--
-- No policy is added. No grant is added. No index on user data is changed. The
-- table's RLS remains the four `auth.uid() = user_id` policies the baseline
-- records, which is what makes "a church can never delete a member's note" a
-- fact about the schema rather than a promise about the UI.
--
-- The two _name/_title snapshot columns look redundant beside the FK. They are
-- not: they are what lets a member's note go on saying "Originally from First
-- Baptist Church — 'The Prodigal Son', 8 Sept 2026" after the church has deleted
-- the outline, renamed itself, or left the platform. Attribution survives the
-- deletion of everything it points at.
-- ============================================================================

alter table sermon_notes
  add column if not exists source_church_sermon_id uuid references church_sermons(id) on delete set null,
  add column if not exists source_version integer,
  add column if not exists source_church_name text,
  add column if not exists source_sermon_title text,
  add column if not exists forked_at timestamptz;

-- "Have I already taken notes on this outline?" — asked by the client against
-- its own rows, under the existing owner-only policy. Partial, so it costs
-- nothing for the overwhelming majority of notes, which are not forks.
create index if not exists sermon_notes_source_idx
  on sermon_notes (user_id, source_church_sermon_id)
  where source_church_sermon_id is not null;


-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Belt to the column grants' braces. The four state flags and the identity
-- columns are not in the UPDATE grant, so a client cannot send them at all;
-- pinning them here means a grant widened by accident in some later migration
-- still cannot move them.
--
-- The flags have to move SOMEHOW, though — soft_delete_church() below, and
-- Stage 3's verification and suspend levers, legitimately set them. Each of
-- those is SECURITY DEFINER and raises session-local `app.churches_privileged`
-- around its UPDATE; the guard stands down only while it is set. A client cannot
-- raise it: `set_config(..., is_local => true)` inside a SECURITY DEFINER
-- function is the only route used here, and it falls back at the end of the
-- enclosing transaction.
create or replace function churches_before_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.id := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.slug := old.slug;
  if coalesce(current_setting('app.churches_privileged', true), '') <> 'on' then
    new.verification_state := old.verification_state;
    new.is_listed := old.is_listed;
    new.suspended_at := old.suspended_at;
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists churches_before_update_trg on churches;
create trigger churches_before_update_trg
  before update on churches
  for each row execute function churches_before_update();

create or replace function church_sermons_before_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  -- Immutable from the client's side, for the same belt-and-braces reason. In
  -- particular church_id: without this, a staff member at two churches with a
  -- widened grant could move an outline from one to the other.
  new.id := old.id;
  new.church_id := old.church_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  if new.body is distinct from old.body
     or new.title is distinct from old.title
     or new.scripture_ref is distinct from old.scripture_ref
     or new.service_date is distinct from old.service_date
     or new.speaker_name is distinct from old.speaker_name
     or new.speaker_user_id is distinct from old.speaker_user_id
     or new.series is distinct from old.series then
    new.version := old.version + 1;
  else
    -- A pure status flip (draft -> published) is not a new version of the text.
    new.version := old.version;
  end if;

  if new.status = 'published' and old.status <> 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  -- deleted_at moves only through soft_delete_church_sermon(), same mechanism as
  -- churches above.
  if coalesce(current_setting('app.churches_privileged', true), '') <> 'on' then
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists church_sermons_before_update_trg on church_sermons;
create trigger church_sermons_before_update_trg
  before update on church_sermons
  for each row execute function church_sermons_before_update();

-- A church must keep at least one admin. Guards BOTH doors: an admin removing
-- another admin, and the last admin using the "leave" path on their own row.
-- groups has this hole today — a sole owner can delete their own group_members
-- row and orphan the group. Not copying it.
--
-- SECURITY DEFINER so the count sees every admin row regardless of the caller's
-- RLS; without it, the guard would be evaluated against a filtered view of the
-- table and could pass when it should not.
create or replace function church_members_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role = 'admin'
     and (select count(*) from church_members m
           where m.church_id = old.church_id and m.role = 'admin') <= 1 then
    raise exception 'last_church_admin: a church must keep at least one admin'
      using errcode = '22023';
  end if;
  return old;
end;
$$;

drop trigger if exists church_members_before_delete_trg on church_members;
create trigger church_members_before_delete_trg
  before delete on church_members
  for each row execute function church_members_before_delete();


-- ============================================================================
-- 5. GRANTS — read this before the policies, because on this schema the grants
--    are doing work the policies cannot.
--
-- Supabase runs `alter default privileges in schema public grant all on tables
-- to anon, authenticated` at project creation, so a table created here arrives
-- with DELETE/INSERT/UPDATE/SELECT already granted to both client roles. The
-- baseline confirms it: every one of the 44 existing tables reads
-- `anon=DELETE, INSERT, ... UPDATE | authenticated=DELETE, INSERT, ... UPDATE`.
-- A `grant select, insert on t to authenticated` therefore changes NOTHING —
-- it re-grants what is already there and leaves UPDATE and DELETE standing.
--
-- So every table here is revoked to zero first and then granted back
-- deliberately. This is the difference between "RLS is the only thing standing
-- between a client and a DELETE" and "there is no DELETE privilege to exercise".
--
-- And it is what holds the verification model: RLS is ROW-level, so an UPDATE
-- policy on `churches` permits an update to ANY column of a row you may update,
-- and a church admin could set `is_listed = true, verification_state =
-- 'verified'` on their own church in one line. Column-level GRANT is the only
-- mechanism in Postgres that stops that. sql/025 made the same point about
-- `role` on `profiles` and solved it by moving the column to another table;
-- here the column has to live on the row, so the privilege is narrowed instead.
-- ============================================================================

revoke all on churches             from anon, authenticated;
revoke all on church_members       from anon, authenticated;
revoke all on church_join_requests from anon, authenticated;
revoke all on church_sermons       from anon, authenticated;

-- churches: read (RLS decides which rows), and update ONLY the profile columns.
-- No INSERT — create_church() is the only door, which is also what makes the
-- rate limit unbypassable. No DELETE — soft delete only.
grant select on churches to authenticated;
grant update (
  name, city, region, country, website, phone,
  address_line1, address_line2, postal_code,
  denomination, about, service_times, logo_url,
  open_join, sermon_titles_public
) on churches to authenticated;
-- DELIBERATELY ABSENT from that list: slug, verification_state, is_listed,
-- suspended_at, deleted_at, created_by, created_at, updated_at, id.

-- church_members: read, and delete (leave / remove). NO INSERT and NO UPDATE,
-- at all, for anyone — sql/025 §4.1 reason 2. A role change that went through a
-- row-level update policy would be a one-line self-promotion.
grant select, delete on church_members to authenticated;

-- church_join_requests: read only. Every write is an RPC.
grant select on church_join_requests to authenticated;

-- church_sermons: read; insert and update the content columns. No DELETE.
-- INSERT is column-listed too, not just UPDATE — otherwise a staff member could
-- forge `version`, `published_at` or `deleted_at` on the way in, where the
-- trigger that owns them on UPDATE never runs.
grant select on church_sermons to authenticated;
grant insert (
  church_id, created_by, title, speaker_name, speaker_user_id,
  service_date, series, scripture_ref, body, status
) on church_sermons to authenticated;
grant update (
  title, speaker_name, speaker_user_id, service_date, series,
  scripture_ref, body, status
) on church_sermons to authenticated;
-- DELIBERATELY ABSENT: church_id, version, published_at, created_by, created_at,
-- updated_by, updated_at, deleted_at, id.

-- Nothing is granted to `anon` on any of the four tables. Stage 1 has no public
-- surface at all.


-- ============================================================================
-- 6. POLICIES
-- ============================================================================

alter table churches             enable row level security;
alter table church_members       enable row level security;
alter table church_join_requests enable row level security;
alter table church_sermons       enable row level security;

-- ---- churches --------------------------------------------------------------

-- Members see their own church. App administrators see everything, including
-- suspended and soft-deleted rows, because moderation cannot work on a filtered
-- view of the thing it is moderating.
--
-- NO anon policy, and none for a signed-in non-member. Stage 3 adds one for
-- `is_listed and verified` rows over a narrow column set, and the scope is
-- emphatic that it must come through a `security_invoker = true` VIEW rather
-- than by trusting the client to select narrowly — sql/025 explains at length
-- how a default-built view publishes everything.
drop policy if exists churches_select_member on churches;
create policy churches_select_member on churches
  for select using (
    (deleted_at is null and church_role_at_least(id, 'member'))
    or has_role_at_least('administrator')
  );

-- Profile edits. Not available on a suspended or deleted church: those go
-- read-only, which is the point of the levers.
drop policy if exists churches_update_admin on churches;
create policy churches_update_admin on churches
  for update
  using (
    deleted_at is null
    and suspended_at is null
    and church_role_at_least(id, 'admin')
  )
  with check (church_role_at_least(id, 'admin'));

-- NO insert policy and NO delete policy, on purpose. create_church() and
-- soft_delete_church() are the only doors, and neither role holds the privilege
-- to go round them (§5).

-- ---- church_members --------------------------------------------------------

-- Everyone in a church can see who else is in it. Your own row is readable even
-- in the degenerate case, which costs nothing and makes the client's "am I in
-- this?" check answerable without an RPC.
drop policy if exists church_members_select_member on church_members;
create policy church_members_select_member on church_members
  for select using (
    user_id = auth.uid()
    or church_role_at_least(church_id, 'member')
    or has_role_at_least('administrator')
  );

-- Leave, or be removed by an admin. An admin can remove staff and members; an
-- admin cannot remove another admin from here (demote them first, through
-- set_church_role, which has its own guards). The last-admin trigger sits
-- underneath both branches.
drop policy if exists church_members_delete_self_or_admin on church_members;
create policy church_members_delete_self_or_admin on church_members
  for delete using (
    user_id = auth.uid()
    or (role <> 'admin' and church_role_at_least(church_id, 'admin'))
  );

-- NO INSERT POLICY. NO UPDATE POLICY. Not an omission — see §5 and sql/025 §4.1.

-- ---- church_join_requests --------------------------------------------------

drop policy if exists church_join_requests_select on church_join_requests;
create policy church_join_requests_select on church_join_requests
  for select using (
    user_id = auth.uid()
    or church_role_at_least(church_id, 'admin')
    or has_role_at_least('administrator')
  );

-- No write policies: request_to_join_church() and
-- respond_to_church_join_request() only.

-- ---- church_sermons --------------------------------------------------------

-- Three conditions, written as three separate OR arms rather than one clever
-- expression, because this is the policy Robbie has to be able to read.
drop policy if exists church_sermons_select on church_sermons;
create policy church_sermons_select on church_sermons
  for select using (
    -- a member sees published, undeleted outlines
    (deleted_at is null and status = 'published' and church_role_at_least(church_id, 'member'))
    -- staff and admins also see drafts
    or (deleted_at is null and church_role_at_least(church_id, 'staff'))
    -- app administrators see everything, deleted included
    or has_role_at_least('administrator')
  );

drop policy if exists church_sermons_insert_staff on church_sermons;
create policy church_sermons_insert_staff on church_sermons
  for insert with check (
    church_role_at_least(church_id, 'staff')
    and created_by = auth.uid()
  );

drop policy if exists church_sermons_update_staff on church_sermons;
create policy church_sermons_update_staff on church_sermons
  for update
  using (deleted_at is null and church_role_at_least(church_id, 'staff'))
  with check (church_role_at_least(church_id, 'staff'));

-- NO delete policy. Soft delete only, through soft_delete_church_sermon().


-- ============================================================================
-- 7. FUNCTIONS
--
-- Every one of them: SECURITY DEFINER, pinned search_path, and an explicit
-- guard on the caller's church role. The scope's §2.1 table maps each to the
-- groups function it is copied from; where the copy diverges, the comment says
-- why. All of them refuse a guest (anonymous) session the same way create_group()
-- already does.
-- ============================================================================

-- ---- create_church ---------------------------------------------------------
-- Copy of create_group(), plus the rate limit §8 asks for. The creator becomes
-- the church's first admin in the same transaction, which is what makes "no
-- INSERT policy on church_members" survivable.
create or replace function create_church(
  p_name text,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_denomination text default null,
  p_website text default null,
  p_phone text default null,
  p_about text default null,
  p_service_times text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_recent integer;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in: sign in to register a church' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'guest_account: guests cannot register a church' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'church_name_required: a church needs a name' using errcode = '22023';
  end if;

  -- One per account per 24 hours. Without it the Stage 3 directory is a spam
  -- surface the day it opens, and the limit has to exist BEFORE the directory
  -- does, not after.
  select count(*)::integer into v_recent
    from churches
   where created_by = auth.uid()
     and created_at > now() - interval '24 hours';
  if v_recent >= 1 then
    raise exception 'church_rate_limited: you can register one church per day'
      using errcode = '22023';
  end if;

  insert into churches (
    name, city, region, country, denomination, website, phone, about, service_times, created_by
  ) values (
    trim(p_name),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_region, '')), ''),
    nullif(trim(coalesce(p_country, '')), ''),
    nullif(trim(coalesce(p_denomination, '')), ''),
    nullif(trim(coalesce(p_website, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_about, '')), ''),
    nullif(trim(coalesce(p_service_times, '')), ''),
    auth.uid()
  )
  returning id into v_id;

  insert into church_members (church_id, user_id, role)
  values (v_id, auth.uid(), 'admin');

  return v_id;
end;
$$;

-- ---- add_church_member -----------------------------------------------------
-- Copy of add_group_member(). The client resolves an email or phone to a user id
-- first, through the existing find_user_id_by_email() / find_user_by_contact().
create or replace function add_church_member(p_church_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not church_role_at_least(p_church_id, 'admin') then
    raise exception 'not_church_admin: only a church admin can add members' using errcode = '42501';
  end if;
  if not exists (select 1 from churches c where c.id = p_church_id and c.deleted_at is null) then
    raise exception 'church_missing: that church is no longer available' using errcode = '22023';
  end if;
  insert into church_members (church_id, user_id, role)
  values (p_church_id, p_member_id, 'member')
  on conflict do nothing;
end;
$$;

-- ---- set_church_role -------------------------------------------------------
-- Copy of set_group_admin(), widened to three tiers and hardened with the two
-- guards set_user_role() carries: you cannot change your own role, and you
-- cannot remove the last admin. Both are the difference between a role system
-- and a self-promotion form.
create or replace function set_church_role(p_church_id uuid, p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current text;
  v_admins integer;
begin
  if church_role_rank(p_role) is null then
    raise exception 'invalid_church_role: %', p_role using errcode = '22023';
  end if;
  if not church_role_at_least(p_church_id, 'admin') then
    raise exception 'not_church_admin: only a church admin can change roles' using errcode = '42501';
  end if;
  if p_member_id = auth.uid() then
    raise exception 'self_role_change: you cannot change your own role' using errcode = '22023';
  end if;

  select m.role into v_current
    from church_members m
   where m.church_id = p_church_id and m.user_id = p_member_id;
  if v_current is null then
    raise exception 'not_a_member: that person is not in this church' using errcode = '22023';
  end if;
  if v_current = p_role then
    return;
  end if;

  if v_current = 'admin' and p_role <> 'admin' then
    select count(*)::integer into v_admins
      from church_members m
     where m.church_id = p_church_id and m.role = 'admin';
    if v_admins <= 1 then
      raise exception 'last_church_admin: a church must keep at least one admin'
        using errcode = '22023';
    end if;
  end if;

  update church_members
     set role = p_role
   where church_id = p_church_id and user_id = p_member_id;
end;
$$;

-- ---- request_to_join_church ------------------------------------------------
-- Copy of request_to_join_group(), with the open_join branch folded in rather
-- than split into a second join_open_church() function — the client has one
-- question ("get me into this church") and one round trip should answer it.
--
-- Returns jsonb so the caller can tell the two outcomes apart:
--   { "church_name": "…", "joined": true }   -> you are in, open the church
--   { "church_name": "…", "joined": false }  -> an admin has to approve you
create or replace function request_to_join_church(p_church_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_church churches%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in: sign in to join a church' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'guest_account: guests cannot join a church' using errcode = '42501';
  end if;

  select * into v_church from churches where id = p_church_id;
  if v_church.id is null or v_church.deleted_at is not null then
    raise exception 'church_missing: that church is no longer available' using errcode = '22023';
  end if;
  if v_church.suspended_at is not null then
    raise exception 'church_suspended: that church is not accepting members right now'
      using errcode = '22023';
  end if;
  if church_role_at_least(p_church_id, 'member') then
    return jsonb_build_object('church_name', v_church.name, 'joined', true, 'already', true);
  end if;

  if v_church.open_join then
    insert into church_members (church_id, user_id, role)
    values (p_church_id, auth.uid(), 'member')
    on conflict do nothing;
    -- Tidy any earlier pending request so the admin queue does not keep showing
    -- someone who is already in the room.
    update church_join_requests
       set status = 'approved', responded_at = now()
     where church_id = p_church_id and user_id = auth.uid() and status = 'pending';
    return jsonb_build_object('church_name', v_church.name, 'joined', true, 'already', false);
  end if;

  insert into church_join_requests (church_id, user_id, status)
  values (p_church_id, auth.uid(), 'pending')
  on conflict (church_id, user_id) do update
    set status = 'pending', responded_at = null
    where church_join_requests.status = 'declined';

  return jsonb_build_object('church_name', v_church.name, 'joined', false, 'already', false);
end;
$$;

-- ---- respond_to_church_join_request ----------------------------------------
-- Copy of respond_to_join_request().
create or replace function respond_to_church_join_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req church_join_requests%rowtype;
begin
  select * into v_req from church_join_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'request_missing: that request is no longer there' using errcode = '22023';
  end if;
  if not church_role_at_least(v_req.church_id, 'admin') then
    raise exception 'not_church_admin: only a church admin can answer join requests'
      using errcode = '42501';
  end if;

  update church_join_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         responded_at = now()
   where id = p_request_id;

  if p_approve then
    insert into church_members (church_id, user_id, role)
    values (v_req.church_id, v_req.user_id, 'member')
    on conflict do nothing;
  end if;
end;
$$;

-- ---- find_churches ---------------------------------------------------------
-- Copy of find_public_groups_by_name(), and the one function here that does
-- nothing in Stage 1 BY CONSTRUCTION: it can only return `is_listed and
-- verified` churches, and no path in Stage 1 can set either flag. It is shipped
-- now so Stage 3's directory needs no migration, and the Stage 1 UI deliberately
-- does not render a search box that could only ever come back empty.
create or replace function find_churches(query text)
returns table (
  id uuid,
  name text,
  city text,
  region text,
  denomination text,
  member_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id, c.name, c.city, c.region, c.denomination,
    (select count(*)::integer from church_members m where m.church_id = c.id)
  from churches c
  where c.is_listed
    and c.verification_state = 'verified'
    and c.suspended_at is null
    and c.deleted_at is null
    and c.name ilike '%' || query || '%'
    and not exists (
      select 1 from church_members m2 where m2.church_id = c.id and m2.user_id = auth.uid()
    )
  order by c.name
  limit 20;
$$;

-- ---- list_my_churches ------------------------------------------------------
-- The shape ChurchPanel's list screen renders, pre-joined server-side rather
-- than as N+1 client queries — same reasoning as list_my_groups().
--
-- Doubles as the client's availability probe: a database without this migration
-- answers PGRST202 ("could not find the function"), which is how
-- src/lib/churchApi.ts knows to render no church UI at all.
create or replace function list_my_churches()
returns table (
  church_id uuid,
  name text,
  city text,
  region text,
  denomination text,
  my_role text,
  member_count integer,
  sermon_count integer,
  pending_requests integer,
  latest_sermon_title text,
  latest_sermon_date date
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.name,
    c.city,
    c.region,
    c.denomination,
    m.role,
    (select count(*)::integer from church_members m2 where m2.church_id = c.id),
    (select count(*)::integer from church_sermons s
      where s.church_id = c.id and s.deleted_at is null
        and (s.status = 'published' or church_role_rank(m.role) >= 2)),
    case when m.role = 'admin'
      then (select count(*)::integer from church_join_requests r
             where r.church_id = c.id and r.status = 'pending')
      else 0 end,
    ls.title,
    ls.service_date
  from churches c
  join church_members m on m.church_id = c.id and m.user_id = auth.uid()
  left join lateral (
    select s.title, s.service_date
      from church_sermons s
     where s.church_id = c.id
       and s.deleted_at is null
       and (s.status = 'published' or church_role_rank(m.role) >= 2)
     order by s.service_date desc nulls last, s.created_at desc
     limit 1
  ) ls on true
  where c.deleted_at is null
  order by c.name;
$$;

-- ---- list_church_members ---------------------------------------------------
-- THE ONE NEW PERSONAL-DATA EXPOSURE IN THIS MIGRATION. Read the header note.
--
-- profiles' SELECT policy is "own row or a friend link", so a roster read from
-- the client is a list of uuids. This returns display names and avatars for the
-- members of a church you are in — and nothing else about them: no email, no
-- phone, no profile fields.
--
-- Blocked accounts are filtered in both directions, the way sql/032 made the
-- three find_* functions behave. Blocking has to keep working inside a
-- congregation or it does not work.
create or replace function list_church_members(p_church_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  role text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (church_role_at_least(p_church_id, 'member') or has_role_at_least('administrator')) then
    raise exception 'not_a_member: you are not in this church' using errcode = '42501';
  end if;
  return query
    select m.user_id,
           coalesce(p.display_name, 'Someone'),
           p.avatar_url,
           m.role,
           m.joined_at
      from church_members m
      left join profiles p on p.id = m.user_id
     where m.church_id = p_church_id
       and not is_blocked_between(auth.uid(), m.user_id)
     order by church_role_rank(m.role) desc, coalesce(p.display_name, ''), m.joined_at;
end;
$$;

-- ---- list_church_join_requests ---------------------------------------------
-- Same reasoning, admin-only, for the approve/decline queue.
create or replace function list_church_join_requests(p_church_id uuid)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not church_role_at_least(p_church_id, 'admin') then
    raise exception 'not_church_admin: only a church admin can see join requests'
      using errcode = '42501';
  end if;
  return query
    select r.id,
           r.user_id,
           coalesce(p.display_name, 'Someone'),
           p.avatar_url,
           r.created_at
      from church_join_requests r
      left join profiles p on p.id = r.user_id
     where r.church_id = p_church_id
       and r.status = 'pending'
       and not is_blocked_between(auth.uid(), r.user_id)
     order by r.created_at;
end;
$$;

-- ---- church_join_preview ---------------------------------------------------
-- What someone arriving on an invite link is told before they commit.
--
-- This is the ONE thing in Stage 1 readable by a signed-in person who is not a
-- member, and it is readable ONLY BY EXACT UUID. Nothing here hands out the id
-- of a church you are not in, and find_churches() returns nothing in Stage 1,
-- so there is no enumeration path. The alternative — asking someone to join an
-- organisation identified to them only by a uuid — is worse in every way.
--
-- Name, city, region, denomination, member count, open_join. NOT the phone
-- number, NOT the street address, NOT the roster, NOT a single sermon title.
create or replace function church_join_preview(p_church_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_church churches%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in: sign in to open an invite' using errcode = '42501';
  end if;
  select * into v_church from churches where id = p_church_id;
  if v_church.id is null or v_church.deleted_at is not null then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_church.id,
    'name', v_church.name,
    'city', v_church.city,
    'region', v_church.region,
    'denomination', v_church.denomination,
    'open_join', v_church.open_join,
    'suspended', v_church.suspended_at is not null,
    'member_count', (select count(*)::integer from church_members m where m.church_id = v_church.id),
    'is_member', church_role_at_least(v_church.id, 'member')
  );
end;
$$;

-- ---- soft_delete_church ----------------------------------------------------
-- §3.3: church deletion is a SOFT delete. A church admin clicking the wrong
-- button must not be able to irreversibly destroy a roster, a library of
-- outlines and every provenance link in one action. Hard deletion is an app
-- owner's operation, out of band, after a cooling-off period.
create or replace function soft_delete_church(p_church_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not church_role_at_least(p_church_id, 'admin') then
    raise exception 'not_church_admin: only a church admin can close a church'
      using errcode = '42501';
  end if;
  perform set_config('app.churches_privileged', 'on', true);
  update churches set deleted_at = now() where id = p_church_id and deleted_at is null;
  perform set_config('app.churches_privileged', 'off', true);
end;
$$;

-- ---- soft_delete_church_sermon ---------------------------------------------
-- An admin may retire any outline; a staff member only their own. Matches the
-- scope's §4.2 matrix row exactly. Members' forks are not touched, and cannot
-- be: nothing here goes near sermon_notes.
create or replace function soft_delete_church_sermon(p_sermon_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sermon church_sermons%rowtype;
begin
  select * into v_sermon from church_sermons where id = p_sermon_id;
  if v_sermon.id is null or v_sermon.deleted_at is not null then
    raise exception 'sermon_missing: that outline is no longer there' using errcode = '22023';
  end if;
  if not (
    church_role_at_least(v_sermon.church_id, 'admin')
    or (church_role_at_least(v_sermon.church_id, 'staff') and v_sermon.created_by = auth.uid())
  ) then
    raise exception 'not_church_staff: you cannot remove that outline' using errcode = '42501';
  end if;
  perform set_config('app.churches_privileged', 'on', true);
  update church_sermons set deleted_at = now() where id = p_sermon_id;
  perform set_config('app.churches_privileged', 'off', true);
end;
$$;

-- ---- fork_church_sermon ----------------------------------------------------
-- THE HEART OF THE FEATURE, and the only new code path that writes to
-- sermon_notes.
--
-- SNAPSHOT AT FORK TIME. Never live-linked, at any later stage. The literal use
-- case is a person typing on a phone during a live sermon; a live-linked design
-- reflows the document under their cursor when the pastor's laptop autosaves a
-- corrected heading at 10:42. There is no acceptable UX for that and no way to
-- make it safe. Snapshot also makes ownership trivially answerable: from the
-- instant of the fork there is no shared object, so "whose is this paragraph"
-- never has to be answered.
--
-- What it writes: ONE row, user_id = auth.uid(), the outline's text copied into
-- the member's own note, plus five provenance columns. It contains no UPDATE and
-- no DELETE. A member may fork the same outline more than once — that is a
-- person deliberately starting a second set of notes on the same sermon, and
-- refusing it would be the app telling them what they meant.
create or replace function fork_church_sermon(p_church_sermon_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sermon church_sermons%rowtype;
  v_church churches%rowtype;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in: sign in to take notes' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'guest_account: guests cannot save sermon notes' using errcode = '42501';
  end if;

  select * into v_sermon from church_sermons where id = p_church_sermon_id;
  if v_sermon.id is null or v_sermon.deleted_at is not null then
    raise exception 'sermon_missing: that outline is no longer there' using errcode = '22023';
  end if;
  if v_sermon.status <> 'published' then
    raise exception 'sermon_not_published: that outline has not been published yet'
      using errcode = '22023';
  end if;
  if not church_role_at_least(v_sermon.church_id, 'member') then
    raise exception 'not_a_member: you are not in this church' using errcode = '42501';
  end if;

  select * into v_church from churches where id = v_sermon.church_id;

  insert into sermon_notes (
    user_id, title, speaker, scripture_ref, body,
    source_church_sermon_id, source_version, source_church_name, source_sermon_title, forked_at
  ) values (
    auth.uid(),
    coalesce(nullif(trim(v_sermon.title), ''), 'Sermon Notes'),
    v_sermon.speaker_name,
    v_sermon.scripture_ref,
    v_sermon.body,
    v_sermon.id,
    v_sermon.version,
    v_church.name,
    nullif(trim(v_sermon.title), ''),
    now()
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;


-- ============================================================================
-- 8. FUNCTION PRIVILEGES
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, so every one
-- of these is revoked and then granted deliberately — the same shape sql/025's
-- tail uses. Nothing here is callable by `anon`: every one of them either needs
-- an auth.uid() or would answer a question a signed-out visitor has no business
-- asking.
-- ============================================================================

revoke execute on function church_role_rank(text)                              from public, anon;
revoke execute on function church_role_at_least(uuid, text, uuid)              from public, anon;
revoke execute on function create_church(text, text, text, text, text, text, text, text, text) from public, anon;
revoke execute on function add_church_member(uuid, uuid)                       from public, anon;
revoke execute on function set_church_role(uuid, uuid, text)                   from public, anon;
revoke execute on function request_to_join_church(uuid)                        from public, anon;
revoke execute on function respond_to_church_join_request(uuid, boolean)       from public, anon;
revoke execute on function find_churches(text)                                 from public, anon;
revoke execute on function list_my_churches()                                  from public, anon;
revoke execute on function list_church_members(uuid)                           from public, anon;
revoke execute on function list_church_join_requests(uuid)                     from public, anon;
revoke execute on function church_join_preview(uuid)                           from public, anon;
revoke execute on function soft_delete_church(uuid)                            from public, anon;
revoke execute on function soft_delete_church_sermon(uuid)                     from public, anon;
revoke execute on function fork_church_sermon(uuid)                            from public, anon;

-- church_role_at_least() is referenced from the policies above, which are
-- evaluated in the caller's session, so `authenticated` must be able to execute
-- it. Same as has_role_at_least() in sql/025.
grant execute on function church_role_rank(text)                               to authenticated;
grant execute on function church_role_at_least(uuid, text, uuid)               to authenticated;
grant execute on function create_church(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function add_church_member(uuid, uuid)                        to authenticated;
grant execute on function set_church_role(uuid, uuid, text)                    to authenticated;
grant execute on function request_to_join_church(uuid)                         to authenticated;
grant execute on function respond_to_church_join_request(uuid, boolean)        to authenticated;
grant execute on function find_churches(text)                                  to authenticated;
grant execute on function list_my_churches()                                   to authenticated;
grant execute on function list_church_members(uuid)                            to authenticated;
grant execute on function list_church_join_requests(uuid)                      to authenticated;
grant execute on function church_join_preview(uuid)                            to authenticated;
grant execute on function soft_delete_church(uuid)                             to authenticated;
grant execute on function soft_delete_church_sermon(uuid)                      to authenticated;
grant execute on function fork_church_sermon(uuid)                             to authenticated;


-- ============================================================================
-- 9. VERIFY AFTER APPLYING — run this block and read the output.
--
-- It is not decoration. Two of the three checks are for failure modes that would
-- otherwise be invisible until a church was already using the feature: a
-- SECURITY DEFINER function owned by the wrong role silently stops bypassing
-- RLS, and a stray grant on sermon_notes or church_members is exactly the shape
-- of the bug this whole design exists to prevent.
-- ============================================================================

-- (1) The role predicate must be owned by the owner of church_members, or its
--     internal SELECT does not bypass RLS and every policy here recurses (42P17)
--     or silently returns false. Expect one row, owners equal, prosecdef = true.
--
--   select p.proname, pg_get_userbyid(p.proowner) as fn_owner,
--          (select pg_get_userbyid(c.relowner) from pg_class c
--            where c.relname = 'church_members' and c.relnamespace = 'public'::regnamespace) as tbl_owner,
--          p.prosecdef, p.proconfig
--     from pg_proc p
--    where p.proname = 'church_role_at_least';
--
-- (2) sermon_notes must still have EXACTLY four policies, all of them the
--     owner-only ones from the baseline, and nothing church-shaped.
--     Expect 4 rows, none mentioning `church`.
--
--   select polname, pg_get_expr(polqual, polrelid) as using_expr
--     from pg_policy where polrelid = 'sermon_notes'::regclass order by polname;
--
-- (3) The column grants are what hold the verification model and the role
--     model. Expect: churches has NO update grant on verification_state,
--     is_listed, suspended_at or deleted_at; church_members has NO update or
--     insert grant at all.
--
--   select table_name, column_name, privilege_type
--     from information_schema.column_privileges
--    where grantee = 'authenticated'
--      and table_name in ('churches', 'church_sermons')
--      and privilege_type = 'UPDATE'
--    order by table_name, column_name;
--
--   select table_name, privilege_type from information_schema.table_privileges
--    where grantee = 'authenticated'
--      and table_name in ('churches','church_members','church_join_requests','church_sermons')
--    order by table_name, privilege_type;
--
-- AND FINALLY, THE LEDGER. There is no supabase_migrations table in this
-- project. Whoever applies this adds a line to the MIGRATIONS table in
-- automation/manager/open-items.md in the same session. An unrecorded production
-- change is indistinguishable from one that never happened.
-- ============================================================================

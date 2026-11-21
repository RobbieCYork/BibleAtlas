-- ============================================================================
-- 047_groups_classes.sql — CAPSTONE PLUS FOR GROUPS: FOUNDATIONS + ADMIN-PAYS
--
-- STATUS: WRITTEN AND COMMITTED ON BRANCH `groups-classes`. **NOT APPLIED ANYWHERE.**
--         Applying it to production needs Robbie's explicit word, like every
--         migration since 033. Rehearse on staging first. Local rehearsal (no
--         account needed):  node scripts/groups/rls-test.mjs --local
--         and the mutation proof:  node scripts/groups/rls-test.mjs --local --mutations
--
-- NUMBERING: 046 (study collections) is the last number taken on
--   origin/plus-study-collections (sql/README.md). 047 is next free.
--
-- DEPENDS ON (none of 033/043/045 is applied on production yet):
--   025 — has_role_at_least, app_settings, app_setting_bool
--   033 — churches, church_members, church_role_at_least (the organisation record)
--   043 — entitlements, entitlement_events, has_entitlement
--   045 — stripe_customers, stripe_events (the webhook idempotency ledger)
--   and the live `profiles` table (display names on the roster).
-- Apply order: 033, 043, 045, (046), 047.
--
-- PLAN: automation/manager/groups-feature-plan.md, phases 1 and 2 only.
--   No invites/reminders sending, no assignments, no badge, no reviews,
--   no member-pays, no SMS. class_invites and invite_suppressions exist as
--   STRUCTURE ONLY so phase 3 needs no new table.
-- ============================================================================
--
-- WHAT THIS ADDS
-- ----------------------------------------------------------------------------
--   churches.kind              'church' | 'school' — the organisation record of
--                              sql/033 is reused for schools (plan §2), NOT a
--                              second near-identical table.
--   classes                    a teacher/leader-run class or group, paid for by
--                              its admin (seat count up front, one Stripe
--                              subscription, quantity = seats).
--   class_staff                owner | co_teacher
--   class_members              students / members; one seat each
--   class_agreement_versions   the agreement texts we have published (hash)
--   class_agreements           who accepted which version, when (audit; NO FK
--                              to auth.users, it must outlive the account)
--   class_billing              the class's Stripe subscription state
--   class_join_attempts        rate limit on join-by-code guesses
--   class_invites              STRUCTURE ONLY (phase 3)
--   invite_suppressions        STRUCTURE ONLY (phase 3), global, hashed
--   entitlements.source        + 'group'
--   storage bucket org-logos   private; org admins upload, class people view
--   switches                   paid.groups_enabled, paid.groups_owner_preview
--                              (both ship FALSE)
--
-- WHO CAN SEE WHAT (the whole point of this file)
-- ----------------------------------------------------------------------------
--   anon                 NOTHING. No grant on any table or function here.
--   outsider (signed in, not in the class)
--                        nothing about the class from any table. join_class()
--                        with the right code is the only door, and it tells
--                        you nothing until you are in.
--   student / member     their OWN class_members row; the class's name, org
--                        name, dates, teacher name through my_classes(). NOT
--                        the roster, not the seat count, not other students'
--                        rows, not billing, not the agreement, not invites,
--                        not the organisation's address or phone.
--   class staff          their OWN class only (every check is per class_id —
--                        a teacher of two classes gets no cross-class read):
--                        the class row, staff, roster, invites. Billing and
--                        agreements: the class OWNER only.
--   app owner (025)      classes, class_billing, class_agreements for support
--                        and billing disputes. NOT class_members, NOT invites:
--                        no blanket read of who is in a class (plan §2).
--   service role         the Stripe webhook's write path (and nothing else
--                        writes class_billing or the 'group' entitlement).
--
-- WRITES: NO client INSERT/UPDATE/DELETE grant on any table here. Every write
-- is an RPC that re-checks the caller. The three billing functions are
-- EXECUTE-granted to service_role only.
--
-- ENTITLEMENT ('group' source, one row per user, derived):
--   staff of a class whose billing is live AND seats_purchased >= 5 (the
--     teacher's own Plus is included, plan decision 4), and
--   members with seat_state = 'active' of a class whose billing is live,
--   expire at the subscription's current_period_end (+3 days grace, +7 when
--   past_due), but never later than the end of the class's ends_on day in the
--   class time zone. Several classes -> the latest end wins. None -> the row is
--   DELETED. comp / founding / stripe / store rows are never touched.
--   has_entitlement() (sql/043) is unchanged.
--
-- ACCOUNT DELETION (sql/029's rule: every FK to auth.users says what happens)
--   class_staff, class_members, class_join_attempts   -> CASCADE
--   classes.created_by, class_invites.invited_by,
--   class_billing.payer_user_id                       -> SET NULL
--   class_agreements.user_id                          -> no FK (audit)
--   Deleting the LAST owner: the oldest co-teacher becomes owner; with none
--   the class ends and every member's 'group' entitlement is re-derived
--   (removed). delete-account already cancels the owner's Stripe
--   subscriptions (_shared/stripeCancel.ts), which covers the seat
--   subscription: it lives on the owner's Stripe customer.
--
-- IDEMPOTENT: create ... if not exists; add column if not exists; policies and
-- triggers dropped-if-exist then created; create or replace function; the
-- entitlements source CHECK is found by discovery and replaced; inserts
-- on conflict do nothing. Safe to run twice. sql/tests/047_groups_classes_test.sql
-- proves the rules.
--
-- REVERSAL (only before any real class exists):
--   drop table public.class_invites, public.invite_suppressions, public.class_join_attempts,
--              public.class_billing, public.class_agreements, public.class_agreement_versions,
--              public.class_members, public.class_staff, public.classes;
--   drop function ... (every function created below);
--   delete from public.entitlements where source = 'group';
--   restore entitlements_source_check without 'group';
--   alter table public.churches drop column kind;
--   delete from storage.buckets where id = 'org-logos' (after emptying it);
--   delete from public.app_settings where key in ('paid.groups_enabled', 'paid.groups_owner_preview');
-- ============================================================================

begin;

insert into public.app_settings (key, value) values
  ('paid.groups_enabled',       'false'::jsonb),
  ('paid.groups_owner_preview', 'false'::jsonb)
on conflict (key) do nothing;


-- ============================================================================
-- 1. The organisation: churches.kind
-- ============================================================================
alter table public.churches
  add column if not exists kind text not null default 'church' check (kind in ('church', 'school'));
-- Not in 033's column UPDATE grant on purpose: an org does not change kind.

-- ----------------------------------------------------------------------------
-- 1b. FIX to sql/033's last-admin guard: it must not block ACCOUNT DELETION.
-- 033's church_members_before_delete() raises when the last admin row is
-- deleted, and it fires on the ON DELETE CASCADE from auth.users too. So
-- deleting the account of an org's only admin failed outright — and every
-- teacher who starts a group is exactly that. An undeletable account is the
-- failure sql/029 exists to prevent. The FK cascade runs after the auth.users
-- row is gone, so "the account no longer exists" identifies that path; the
-- guard still holds for "leave" and "remove another admin". The org is left
-- with no admin, which an app administrator can repair.
-- ----------------------------------------------------------------------------
create or replace function public.church_members_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role = 'admin'
     and exists (select 1 from auth.users u where u.id = old.user_id)
     and (select count(*) from church_members m
           where m.church_id = old.church_id and m.role = 'admin') <= 1 then
    raise exception 'last_church_admin: a church must keep at least one admin'
      using errcode = '22023';
  end if;
  return old;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1c. FIX to sql/033's churches_before_update(): it pins created_by to its old
-- value on EVERY update — including the ON DELETE SET NULL that auth.users
-- deletion fires — so the FK check then fails (23503) and the account of
-- anyone who ever registered a church cannot be deleted. Same failure as 1b.
-- Now created_by may become NULL (the set-null path) but can still never be
-- changed to another account. Clients hold no UPDATE grant on created_by
-- (033 §5), so the only writer of NULL is the cascade.
-- ----------------------------------------------------------------------------
create or replace function public.churches_before_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.id := old.id;
  new.created_by := case when new.created_by is null then null else old.created_by end;
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


-- ============================================================================
-- 2. entitlements.source + 'group'
--    Found by DISCOVERY, not by guessed name (sql/029's lesson): every CHECK on
--    entitlements that mentions `source` is dropped, then the one rule re-added.
-- ============================================================================
do $$
declare
  r record;
begin
  for r in
    select c.conname
      from pg_constraint c
     where c.conrelid = 'public.entitlements'::regclass
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ~ '\msource\M'
  loop
    execute format('alter table public.entitlements drop constraint %I', r.conname);
  end loop;
end
$$;

alter table public.entitlements
  add constraint entitlements_source_check
  check (source in ('app_store', 'play_store', 'stripe', 'comp', 'founding', 'group'));


-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- classes
-- seats_requested: what the admin asked for at signup; the checkout function
--   reads it server-side (the client never sends a quantity to Stripe).
-- seats_purchased: what Stripe says is paid for (written by the webhook only).
-- join_code: 6 characters from an alphabet with no 0/O/1/I/L. The share code.
-- join_token_hash: phase 3 (link invites); sha256 hex of the link token.
-- ----------------------------------------------------------------------------
create table if not exists public.classes (
  id                  uuid        primary key default gen_random_uuid(),
  org_id              uuid        not null references public.churches(id) on delete cascade,
  kind                text        not null check (kind in ('church', 'school')),
  name                text        not null check (char_length(name) between 1 and 120),
  description         text        check (description is null or char_length(description) <= 2000),
  starts_on           date        not null default current_date,
  ends_on             date,
  time_zone           text        not null default 'America/Denver' check (char_length(time_zone) between 1 and 64),
  seat_cap            integer     not null default 50 check (seat_cap between 5 and 200),
  seats_requested     integer     not null check (seats_requested between 5 and 200),
  seats_purchased     integer     not null default 0 check (seats_purchased between 0 and 200),
  billing_mode        text        not null default 'admin_pays' check (billing_mode in ('admin_pays', 'member_pays')),
  billing_interval    text        not null default 'month' check (billing_interval in ('month', 'year')),
  status              text        not null default 'draft'
                                  check (status in ('draft', 'active', 'ended', 'archived', 'suspended')),
  join_code           text        not null unique check (join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  join_token_hash     text        unique check (join_token_hash is null or join_token_hash ~ '^[0-9a-f]{64}$'),
  scores_visible      boolean     not null,
  created_by          uuid        references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  ended_at            timestamptz,
  review_requested_at timestamptz,
  check (ends_on is null or ends_on >= starts_on),
  check (seats_requested <= seat_cap)
);

create index if not exists classes_org_idx on public.classes (org_id);
create index if not exists classes_created_by_idx on public.classes (created_by, created_at desc);

-- ----------------------------------------------------------------------------
-- class_staff — owner | co_teacher. PK (class_id, user_id).
-- ----------------------------------------------------------------------------
create table if not exists public.class_staff (
  class_id  uuid        not null references public.classes(id) on delete cascade,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  role      text        not null check (role in ('owner', 'co_teacher')),
  added_at  timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index if not exists class_staff_user_idx on public.class_staff (user_id, class_id);

-- ----------------------------------------------------------------------------
-- class_members — one seat each. A member who leaves keeps the row
-- (seat_state 'removed', left_at set) so the teacher's gradebook can say so;
-- account deletion removes it entirely.
-- ----------------------------------------------------------------------------
create table if not exists public.class_members (
  class_id    uuid        not null references public.classes(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  left_at     timestamptz,
  seat_state  text        not null default 'active' check (seat_state in ('active', 'pending_payment', 'removed')),
  primary key (class_id, user_id),
  check ((seat_state = 'removed') = (left_at is not null))
);
create index if not exists class_members_user_idx on public.class_members (user_id, class_id);
create index if not exists class_members_active_idx on public.class_members (class_id) where seat_state = 'active';

-- ----------------------------------------------------------------------------
-- class_agreement_versions — the texts we have actually shown. The client's
-- (version, sha256) must match a row here or acceptance is refused.
-- src/lib/groupAgreement.ts holds the text; scripts/groups/agreement-hash.mjs
-- --check proves the hash below is the hash of that text.
-- ----------------------------------------------------------------------------
create table if not exists public.class_agreement_versions (
  version      text        primary key check (char_length(version) between 1 and 60),
  text_sha256  text        not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  is_draft     boolean     not null,
  published_at timestamptz not null default now()
);
insert into public.class_agreement_versions (version, text_sha256, is_draft) values
  ('2026-11-21-draft-1', '0b2ad26fd1888583899cd38664e9f5bc3b154be7067ceaaf7d0aab5b591a7fdc', true)
on conflict (version) do nothing;

-- ----------------------------------------------------------------------------
-- class_agreements — acceptance record. MINIMAL personal data: the account id,
-- the name the person typed, the time, which text. NO IP address and NO user
-- agent (a hash of an IP is still personal data, and the account + timestamp +
-- text hash is the evidence). Counsel may ask for more; adding a column later
-- is cheap, un-collecting is not.
-- NO foreign key to auth.users: like sql/044's audit table, the record must
-- outlive the account. class_id / org_id SET NULL so it outlives those too.
-- Retention period: for counsel (plan §12).
-- ----------------------------------------------------------------------------
create table if not exists public.class_agreements (
  id                bigint      generated always as identity primary key,
  class_id          uuid        references public.classes(id) on delete set null,
  org_id            uuid        references public.churches(id) on delete set null,
  user_id           uuid        not null,
  agreement_version text        not null references public.class_agreement_versions(version),
  text_sha256       text        not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  typed_name        text        not null check (char_length(typed_name) between 2 and 120),
  accepted_at       timestamptz not null default now()
);
create index if not exists class_agreements_user_idx on public.class_agreements (user_id, accepted_at desc);
create index if not exists class_agreements_class_idx on public.class_agreements (class_id);

-- ----------------------------------------------------------------------------
-- class_billing — the class's one Stripe subscription (admin pays). Written by
-- group_apply_subscription_event() only. last_event_at: the `created` of the
-- newest Stripe event applied; an older event arriving late does not overwrite.
-- ----------------------------------------------------------------------------
create table if not exists public.class_billing (
  class_id             uuid        primary key references public.classes(id) on delete cascade,
  subscription_id      text        not null unique check (subscription_id ~ '^sub_[A-Za-z0-9]{1,250}$'),
  customer_id          text        not null check (customer_id ~ '^cus_[A-Za-z0-9]{1,250}$'),
  payer_user_id        uuid        references auth.users(id) on delete set null,
  status               text        not null check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active',
                                                              'past_due', 'canceled', 'unpaid', 'paused')),
  price_id             text        check (price_id is null or length(price_id) <= 200),
  plan_interval        text        check (plan_interval is null or plan_interval in ('day', 'week', 'month', 'year')),
  quantity             integer     not null check (quantity between 0 and 10000),
  current_period_end   timestamptz,
  cancel_at            timestamptz,
  cancel_at_period_end boolean     not null default false,
  canceled_at          timestamptz,
  livemode             boolean     not null,
  last_event_at        timestamptz not null,
  updated_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- class_join_attempts — every join_class() call, success or not. The rate
-- limit (20 per hour per account) is what keeps a 6-character code from being
-- guessed. Personal to the caller; cascades with the account.
-- ----------------------------------------------------------------------------
create table if not exists public.class_join_attempts (
  id         bigint      generated always as identity primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  ok         boolean     not null,
  at         timestamptz not null default now()
);
create index if not exists class_join_attempts_user_idx on public.class_join_attempts (user_id, at desc);

-- ----------------------------------------------------------------------------
-- class_invites — STRUCTURE ONLY (phase 3 sends). address is nulled on join,
-- opt-out, or 45 days after the invite (phase 3's job); address_hash stays so
-- a suppression can be checked. reminders_sent capped at 5 (6 emails max).
-- ----------------------------------------------------------------------------
create table if not exists public.class_invites (
  id               uuid        primary key default gen_random_uuid(),
  class_id         uuid        not null references public.classes(id) on delete cascade,
  channel          text        not null check (channel in ('email', 'sms')),
  address          text        check (address is null or char_length(address) between 3 and 320),
  address_hash     text        not null check (address_hash ~ '^[0-9a-f]{64}$'),
  token_hash       text        not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status           text        not null default 'pending'
                               check (status in ('pending', 'joined', 'expired', 'revoked', 'bounced', 'opted_out')),
  sent_at          timestamptz,
  reminders_sent   integer     not null default 0 check (reminders_sent between 0 and 5),
  next_reminder_at timestamptz,
  expires_at       timestamptz not null default (now() + interval '45 days'),
  invited_by       uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (class_id, address_hash)
);

-- ----------------------------------------------------------------------------
-- invite_suppressions — STRUCTURE ONLY. Global (cross-admin), hashed, never
-- cascades. No client access at all; only the service role reads it.
-- ----------------------------------------------------------------------------
create table if not exists public.invite_suppressions (
  address_hash text        primary key check (address_hash ~ '^[0-9a-f]{64}$'),
  reason       text        not null check (reason in ('unsubscribe', 'complaint', 'bounce', 'stop')),
  created_at   timestamptz not null default now()
);


-- ============================================================================
-- 4. ROLE HELPERS — SECURITY DEFINER so a policy on class_staff / class_members
--    can ask about class_staff / class_members without recursing (42P17; the
--    sql/003, sql/012 lesson). Pinned search_path. Every one takes the class
--    id: there is no "is staff of anything" question here, on purpose.
-- ============================================================================
create or replace function public.is_class_staff(p_class_id uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_class_id is not null and p_uid is not null and exists (
    select 1 from public.class_staff s where s.class_id = p_class_id and s.user_id = p_uid);
$$;

create or replace function public.is_class_owner(p_class_id uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_class_id is not null and p_uid is not null and exists (
    select 1 from public.class_staff s where s.class_id = p_class_id and s.user_id = p_uid and s.role = 'owner');
$$;

create or replace function public.is_class_member(p_class_id uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_class_id is not null and p_uid is not null and exists (
    select 1 from public.class_members m
     where m.class_id = p_class_id and m.user_id = p_uid and m.seat_state = 'active');
$$;

-- "May this account see this org's logo?" — org admins (033) and people in one
-- of the org's classes. Used by the storage policy only.
create or replace function public.can_view_org_logo(p_org_id uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_org_id is not null and p_uid is not null and (
    public.church_role_at_least(p_org_id, 'admin', p_uid)
    or exists (select 1 from public.classes c
                 join public.class_staff s on s.class_id = c.id
                where c.org_id = p_org_id and s.user_id = p_uid)
    or exists (select 1 from public.classes c
                 join public.class_members m on m.class_id = c.id
                where c.org_id = p_org_id and m.user_id = p_uid and m.seat_state = 'active'));
$$;

-- The switch as the app sees it: on for everyone, or on for the owner while
-- the owner preview is on.
create or replace function public.groups_enabled_for(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.app_setting_bool('paid.groups_enabled', false)
      or (p_uid is not null
          and public.app_setting_bool('paid.groups_owner_preview', false)
          and public.has_role_at_least('owner', p_uid));
$$;


-- ============================================================================
-- 5. GRANTS — revoke to zero first (Supabase's default ACL grants every new
--    table to anon and authenticated: sql/README.md). Then SELECT back, to
--    authenticated only, only where a policy below allows rows. NO client
--    INSERT / UPDATE / DELETE anywhere.
-- ============================================================================
alter table public.classes                  enable row level security;
alter table public.class_staff              enable row level security;
alter table public.class_members            enable row level security;
alter table public.class_agreement_versions enable row level security;
alter table public.class_agreements         enable row level security;
alter table public.class_billing            enable row level security;
alter table public.class_join_attempts      enable row level security;
alter table public.class_invites            enable row level security;
alter table public.invite_suppressions      enable row level security;

revoke all on public.classes                  from anon, authenticated, public;
revoke all on public.class_staff              from anon, authenticated, public;
revoke all on public.class_members            from anon, authenticated, public;
revoke all on public.class_agreement_versions from anon, authenticated, public;
revoke all on public.class_agreements         from anon, authenticated, public;
revoke all on public.class_billing            from anon, authenticated, public;
revoke all on public.class_join_attempts      from anon, authenticated, public;
revoke all on public.class_invites            from anon, authenticated, public;
revoke all on public.invite_suppressions      from anon, authenticated, public;
-- The identity sequences of the two bigint tables.
revoke all on sequence public.class_agreements_id_seq    from anon, authenticated, public;
revoke all on sequence public.class_join_attempts_id_seq from anon, authenticated, public;

grant select on public.classes          to authenticated;
grant select on public.class_staff      to authenticated;
grant select on public.class_members    to authenticated;
grant select on public.class_agreements to authenticated;
grant select on public.class_billing    to authenticated;
grant select on public.class_invites    to authenticated;
-- class_agreement_versions, class_join_attempts, invite_suppressions: no grant,
-- no policy. Server-side only.


-- ============================================================================
-- 6. POLICIES — SELECT only. There is no write policy on any table here.
-- ============================================================================

-- classes: the class's own staff; the app owner (support). Students read the
-- class through my_classes(), which returns a narrow column set — the seat
-- count and join code are staff information.
drop policy if exists classes_select_staff on public.classes;
create policy classes_select_staff on public.classes
  as permissive for select to authenticated
  using (public.is_class_staff(id) or public.has_role_at_least('owner'));

-- class_staff: your own row; the class's staff see each other.
drop policy if exists class_staff_select on public.class_staff;
create policy class_staff_select on public.class_staff
  as permissive for select to authenticated
  using (user_id = auth.uid() or public.is_class_staff(class_id));

-- class_members: your OWN row; the class's staff see the roster. Never another
-- member's row, and NOT the app owner (no blanket read of who is in a class).
drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members
  as permissive for select to authenticated
  using (user_id = auth.uid() or public.is_class_staff(class_id));

-- class_agreements: the person who accepted; the app owner.
drop policy if exists class_agreements_select on public.class_agreements;
create policy class_agreements_select on public.class_agreements
  as permissive for select to authenticated
  using (user_id = auth.uid() or public.has_role_at_least('owner'));

-- class_billing: the class OWNER (not co-teachers); the app owner.
drop policy if exists class_billing_select on public.class_billing;
create policy class_billing_select on public.class_billing
  as permissive for select to authenticated
  using (public.is_class_owner(class_id) or public.has_role_at_least('owner'));

-- class_invites: the class's staff only.
drop policy if exists class_invites_select on public.class_invites;
create policy class_invites_select on public.class_invites
  as permissive for select to authenticated
  using (public.is_class_staff(class_id));


-- ============================================================================
-- 7. ENTITLEMENT DERIVATION (service role / internal only)
-- ============================================================================

-- End of the class's last day, in the class's own time zone. NULL = no end.
create or replace function public.class_end_ts(p_ends_on date, p_tz text)
returns timestamptz
language sql
stable
set search_path = public, pg_temp
as $$
  select case when p_ends_on is null then null
              else ((p_ends_on + 1)::timestamp at time zone p_tz) end;
$$;

create or replace function public.group_sync_entitlement(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_best record;
begin
  if p_user_id is null then
    return;
  end if;

  select x.class_id, x.price_id, x.subscription_id, x.status, x.expires, x.grace
    into v_best
    from (
      select c.id as class_id, b.price_id, b.subscription_id, b.status,
             least(b.current_period_end, public.class_end_ts(c.ends_on, c.time_zone)) as expires,
             least(b.current_period_end + case when b.status = 'past_due' then interval '7 days' else interval '3 days' end,
                   public.class_end_ts(c.ends_on, c.time_zone)) as grace
        from public.classes c
        join public.class_billing b on b.class_id = c.id
       where c.status = 'active'
         and c.billing_mode = 'admin_pays'
         and b.status in ('active', 'trialing', 'past_due')
         and b.current_period_end is not null
         and (
              (c.seats_purchased >= 5
               and exists (select 1 from public.class_staff s where s.class_id = c.id and s.user_id = p_user_id))
           or exists (select 1 from public.class_members m
                       where m.class_id = c.id and m.user_id = p_user_id and m.seat_state = 'active')
         )
    ) x
   order by x.grace desc
   limit 1;

  if v_best.class_id is null then
    delete from public.entitlements
     where user_id = p_user_id and entitlement = 'plus' and source = 'group';
    return;
  end if;

  insert into public.entitlements (user_id, entitlement, source, product_id, expires_at, grace_until, original_txn, note, updated_at)
  values (p_user_id, 'plus', 'group', v_best.price_id, v_best.expires, v_best.grace, v_best.subscription_id,
          'group class ' || v_best.class_id::text, now())
  on conflict (user_id, entitlement, source) do update
    set product_id   = excluded.product_id,
        expires_at   = excluded.expires_at,
        grace_until  = excluded.grace_until,
        original_txn = excluded.original_txn,
        note         = excluded.note,
        updated_at   = now();
end;
$$;

-- Re-derive for everyone a class's state can affect: its staff and every
-- member row (left/removed members too, so their row is removed).
create or replace function public.group_sync_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  for r in
    select s.user_id from public.class_staff s where s.class_id = p_class_id
    union
    select m.user_id from public.class_members m where m.class_id = p_class_id
  loop
    perform public.group_sync_entitlement(r.user_id);
  end loop;
end;
$$;


-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- updated_at on classes.
create or replace function public.classes_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists classes_touch_trg on public.classes;
create trigger classes_touch_trg
  before update on public.classes
  for each row execute function public.classes_touch();

-- The last owner leaving (account deletion is the only path in phase 1):
-- the oldest co-teacher becomes owner; with none, the class ends and every
-- member's entitlement is re-derived. Never BLOCKS the delete — blocking would
-- make an account undeletable, which sql/029 exists to prevent.
create or replace function public.class_staff_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_next uuid;
begin
  if old.role <> 'owner' then
    return null;
  end if;
  if exists (select 1 from public.class_staff where class_id = old.class_id and role = 'owner') then
    return null;
  end if;
  -- The class itself is being deleted (cascade): nothing to hand over.
  if not exists (select 1 from public.classes where id = old.class_id) then
    return null;
  end if;

  select s.user_id into v_next
    from public.class_staff s
   where s.class_id = old.class_id
   order by s.added_at, s.user_id
   limit 1;

  if v_next is not null then
    update public.class_staff set role = 'owner' where class_id = old.class_id and user_id = v_next;
  else
    update public.classes
       set status = 'ended', ended_at = coalesce(ended_at, now())
     where id = old.class_id and status in ('draft', 'active');
    perform public.group_sync_class(old.class_id);
  end if;
  return null;
end;
$$;
drop trigger if exists class_staff_after_delete_trg on public.class_staff;
create trigger class_staff_after_delete_trg
  after delete on public.class_staff
  for each row execute function public.class_staff_after_delete();


-- ============================================================================
-- 9. CLIENT RPCs — SECURITY DEFINER, pinned search_path, each re-checks the
--    caller. Guests (anonymous accounts) are refused like create_church().
-- ============================================================================

-- What the app needs to draw (or not draw) the Groups UI. Fail closed: if this
-- function does not exist (047 not applied) the client draws nothing.
create or replace function public.groups_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  return jsonb_build_object(
    'groups_enabled', v_uid is not null
                      and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
                      and public.groups_enabled_for(v_uid));
end;
$$;

-- A fresh join code from 31 unambiguous characters, using gen_random_uuid()'s
-- strong randomness (core Postgres; no pgcrypto, which lives in `extensions`
-- on Supabase and is not on this search_path).
create or replace function public.class_new_join_code()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_hex   text;
  v_code  text;
  i       int;
  n       int;
begin
  loop
    v_hex := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    v_code := '';
    for i in 0..5 loop
      n := ('x' || substr(v_hex, i * 4 + 1, 4))::bit(16)::int;
      v_code := v_code || substr(v_alpha, (n % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = v_code);
  end loop;
  return v_code;
end;
$$;

-- ---- create_group_class -----------------------------------------------------
-- One transaction: the organisation (new churches row with kind, caller as its
-- 033 admin — or an existing org the caller already admins), the class
-- (status 'draft' until Stripe says it is paid), the caller as owner, and the
-- agreement record. Returns { class_id, org_id, join_code }.
--
-- p is a JSON object:
--   kind 'school'|'church'; org_id (optional, existing org); org_name,
--   address_line1, address_line2, city, region, postal_code, country, phone,
--   website; class_name, description, starts_on, ends_on (null = ongoing),
--   time_zone, seats (5..200), seat_cap (default max(50, seats), max 200),
--   interval 'month'|'year', billing_mode ('admin_pays' only; 'member_pays' is
--   phase 7), agreement_version, agreement_sha256, typed_name, accepted (true).
-- ----------------------------------------------------------------------------
create or replace function public.create_group_class(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_kind       text := p ->> 'kind';
  v_org        uuid;
  v_class      uuid;
  v_code       text;
  v_seats      int;
  v_cap        int;
  v_interval   text := coalesce(p ->> 'interval', 'month');
  v_mode       text := coalesce(p ->> 'billing_mode', 'admin_pays');
  v_starts     date;
  v_ends       date;
  v_tz         text := coalesce(nullif(trim(p ->> 'time_zone'), ''), 'America/Denver');
  v_name       text := trim(coalesce(p ->> 'class_name', ''));
  v_org_name   text := trim(coalesce(p ->> 'org_name', ''));
  v_typed      text := trim(coalesce(p ->> 'typed_name', ''));
  v_version    text := p ->> 'agreement_version';
  v_sha        text := lower(coalesce(p ->> 'agreement_sha256', ''));
  v_recent     int;
  v_staffed    int;
begin
  if v_uid is null then
    raise exception 'not_signed_in: sign in to start a group' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'guest_account: create a free account first' using errcode = '42501';
  end if;
  -- While the switch is off only the owner may create (test-mode rehearsal),
  -- the same rule create-checkout-session uses for paid.billing_enabled.
  if not (public.app_setting_bool('paid.groups_enabled', false) or public.has_role_at_least('owner', v_uid)) then
    raise exception 'groups_disabled: Capstone Plus for Groups is not available yet' using errcode = '42501';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'bad_request: expected an object' using errcode = '22023';
  end if;

  if v_kind is null or v_kind not in ('school', 'church') then
    raise exception 'bad_kind: choose a school class or a church group' using errcode = '22023';
  end if;
  if v_mode <> 'admin_pays' then
    raise exception 'member_pays_unavailable: each-member-pays is coming soon' using errcode = '22023';
  end if;
  if v_interval not in ('month', 'year') then
    raise exception 'bad_interval: choose monthly or yearly' using errcode = '22023';
  end if;

  if coalesce(p ->> 'seats', '') !~ '^\d{1,4}$' then
    raise exception 'bad_seats: seats must be a whole number' using errcode = '22023';
  end if;
  v_seats := (p ->> 'seats')::int;
  if v_seats < 5 then
    raise exception 'seats_minimum: a group needs at least 5 seats' using errcode = '22023';
  end if;
  if v_seats > 200 then
    raise exception 'seats_maximum: more than 200 seats? Contact us' using errcode = '22023';
  end if;
  if coalesce(p ->> 'seat_cap', '') ~ '^\d{1,4}$' then
    v_cap := (p ->> 'seat_cap')::int;
  else
    v_cap := greatest(50, v_seats);
  end if;
  if v_cap < 5 or v_cap > 200 or v_cap < v_seats then
    raise exception 'bad_seat_cap: the size limit must be 5 to 200 and at least the seat count' using errcode = '22023';
  end if;

  if char_length(v_name) not between 1 and 120 then
    raise exception 'class_name_required: give the class or group a name (up to 120 characters)' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    raise exception 'bad_time_zone: unknown time zone' using errcode = '22023';
  end if;
  begin
    v_starts := coalesce(nullif(p ->> 'starts_on', '')::date, (now() at time zone v_tz)::date);
    v_ends := nullif(p ->> 'ends_on', '')::date;
  exception when others then
    raise exception 'bad_dates: dates must be YYYY-MM-DD' using errcode = '22023';
  end;
  if v_ends is not null and v_ends < v_starts then
    raise exception 'bad_dates: the end date is before the start date' using errcode = '22023';
  end if;
  if v_ends is not null and v_ends < (now() at time zone v_tz)::date then
    raise exception 'bad_dates: the end date has already passed' using errcode = '22023';
  end if;

  -- The agreement: ticked, a typed name, and the exact text we published.
  if coalesce((p ->> 'accepted')::boolean, false) is not true then
    raise exception 'agreement_required: tick the agreement to continue' using errcode = '22023';
  end if;
  if char_length(v_typed) not between 2 and 120 then
    raise exception 'typed_name_required: type your full name to sign' using errcode = '22023';
  end if;
  if not exists (select 1 from public.class_agreement_versions v
                  where v.version = v_version and v.text_sha256 = v_sha) then
    raise exception 'agreement_mismatch: the agreement text changed; reload and read it again' using errcode = '22023';
  end if;

  -- Limits (plan §8): staff of at most 10 classes that have not ended; at most
  -- 3 new classes per 24 hours.
  select count(*) into v_staffed
    from public.class_staff s join public.classes c on c.id = s.class_id
   where s.user_id = v_uid and c.status in ('draft', 'active', 'suspended');
  if v_staffed >= 10 then
    raise exception 'too_many_classes: you already lead 10 classes or groups' using errcode = '22023';
  end if;
  select count(*) into v_recent
    from public.classes where created_by = v_uid and created_at > now() - interval '24 hours';
  if v_recent >= 3 then
    raise exception 'class_rate_limited: you can start 3 classes or groups a day' using errcode = '22023';
  end if;

  -- The organisation.
  if nullif(p ->> 'org_id', '') is not null then
    begin
      v_org := (p ->> 'org_id')::uuid;
    exception when others then
      raise exception 'bad_org: unknown organisation' using errcode = '22023';
    end;
    if not public.church_role_at_least(v_org, 'admin', v_uid) then
      raise exception 'not_org_admin: you are not an admin of that organisation' using errcode = '42501';
    end if;
    if not exists (select 1 from public.churches c
                    where c.id = v_org and c.kind = v_kind and c.deleted_at is null and c.suspended_at is null) then
      raise exception 'bad_org: that organisation is not available for this kind of group' using errcode = '22023';
    end if;
  else
    if char_length(v_org_name) not between 1 and 120 then
      raise exception 'org_name_required: give the school or church a name' using errcode = '22023';
    end if;
    -- Same anti-spam limit as create_church(): one new organisation per 24h.
    if exists (select 1 from public.churches
                where created_by = v_uid and created_at > now() - interval '24 hours') then
      raise exception 'org_rate_limited: you can register one organisation per day' using errcode = '22023';
    end if;
    insert into public.churches (kind, name, address_line1, address_line2, city, region, postal_code, country,
                                 phone, website, open_join, created_by)
    values (v_kind, v_org_name,
            nullif(trim(coalesce(p ->> 'address_line1', '')), ''),
            nullif(trim(coalesce(p ->> 'address_line2', '')), ''),
            nullif(trim(coalesce(p ->> 'city', '')), ''),
            nullif(trim(coalesce(p ->> 'region', '')), ''),
            nullif(trim(coalesce(p ->> 'postal_code', '')), ''),
            nullif(trim(coalesce(p ->> 'country', '')), ''),
            nullif(trim(coalesce(p ->> 'phone', '')), ''),
            nullif(trim(coalesce(p ->> 'website', '')), ''),
            -- NOT 033's open_join default (true): an org made for a class is
            -- never joinable as a church by anyone holding its id.
            false,
            v_uid)
    returning id into v_org;
    insert into public.church_members (church_id, user_id, role) values (v_org, v_uid, 'admin');
  end if;

  v_code := public.class_new_join_code();
  insert into public.classes (org_id, kind, name, description, starts_on, ends_on, time_zone, seat_cap,
                              seats_requested, billing_mode, billing_interval, status, join_code,
                              scores_visible, created_by)
  values (v_org, v_kind, v_name, nullif(trim(coalesce(p ->> 'description', '')), ''), v_starts, v_ends, v_tz,
          v_cap, v_seats, 'admin_pays', v_interval, 'draft', v_code,
          -- Church groups hide numeric scores by default (plan §1).
          v_kind = 'school', v_uid)
  returning id into v_class;

  insert into public.class_staff (class_id, user_id, role) values (v_class, v_uid, 'owner');

  insert into public.class_agreements (class_id, org_id, user_id, agreement_version, text_sha256, typed_name)
  values (v_class, v_org, v_uid, v_version, v_sha, v_typed);

  return jsonb_build_object('class_id', v_class, 'org_id', v_org, 'join_code', v_code);
end;
$$;

-- ---- join_class -------------------------------------------------------------
-- Join by the 6-character code. Returns { ok, error?, class_id?, name? } and
-- never raises for a business failure, so the attempt row (the rate limit)
-- survives. Consumes a seat; refuses when the seats are full.
create or replace function public.join_class(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_code    text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_class   public.classes%rowtype;
  v_tries   int;
  v_active  int;
  v_mine    int;
  v_state   text;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'guest_account');
  end if;

  select count(*) into v_tries
    from public.class_join_attempts where user_id = v_uid and at > now() - interval '1 hour';
  if v_tries >= 20 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  -- Lock the class row so two joins cannot both take the last seat.
  select * into v_class from public.classes where join_code = v_code for update;

  if v_class.id is null or v_class.status <> 'active' or v_class.billing_mode <> 'admin_pays' then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_class.ends_on is not null and now() >= public.class_end_ts(v_class.ends_on, v_class.time_zone) then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'ended');
  end if;
  if public.is_class_staff(v_class.id, v_uid) then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, true);
    return jsonb_build_object('ok', false, 'error', 'already_staff', 'class_id', v_class.id);
  end if;

  select seat_state into v_state from public.class_members where class_id = v_class.id and user_id = v_uid;
  if v_state = 'active' then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, true);
    return jsonb_build_object('ok', true, 'class_id', v_class.id, 'name', v_class.name, 'already', true);
  end if;

  select count(*) into v_mine
    from public.class_members m join public.classes c on c.id = m.class_id
   where m.user_id = v_uid and m.seat_state = 'active' and c.status = 'active';
  if v_mine >= 10 then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'too_many_classes');
  end if;

  select count(*) into v_active
    from public.class_members where class_id = v_class.id and seat_state = 'active';
  if v_active >= v_class.seats_purchased then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  insert into public.class_members (class_id, user_id, joined_at, left_at, seat_state)
  values (v_class.id, v_uid, now(), null, 'active')
  on conflict (class_id, user_id) do update
    set joined_at = now(), left_at = null, seat_state = 'active';

  insert into public.class_join_attempts (user_id, ok) values (v_uid, true);
  perform public.group_sync_entitlement(v_uid);
  return jsonb_build_object('ok', true, 'class_id', v_class.id, 'name', v_class.name);
end;
$$;

-- ---- leave_class / remove_class_member ---------------------------------------
create or replace function public.leave_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  update public.class_members
     set seat_state = 'removed', left_at = now()
   where class_id = p_class_id and user_id = v_uid and seat_state <> 'removed';
  perform public.group_sync_entitlement(v_uid);
end;
$$;

create or replace function public.remove_class_member(p_class_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_class_staff(p_class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can remove someone' using errcode = '42501';
  end if;
  update public.class_members
     set seat_state = 'removed', left_at = now()
   where class_id = p_class_id and user_id = p_user_id and seat_state <> 'removed';
  perform public.group_sync_entitlement(p_user_id);
end;
$$;

-- ---- my_classes ---------------------------------------------------------------
-- Every class the caller leads or is in. Staff get the staff fields; a member
-- gets the narrow set (no seat counts, no join code, no billing).
create or replace function public.my_classes()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(row_json order by sort_key desc)
      from (
        -- as staff
        select c.created_at as sort_key,
               jsonb_build_object(
                 'class_id', c.id, 'kind', c.kind, 'name', c.name, 'description', c.description,
                 'starts_on', c.starts_on, 'ends_on', c.ends_on, 'status', c.status,
                 'role', s.role, 'org_id', c.org_id, 'org_name', o.name, 'org_logo_url', o.logo_url,
                 'seats_requested', c.seats_requested, 'seats_purchased', c.seats_purchased, 'seat_cap', c.seat_cap,
                 'seats_used', (select count(*) from public.class_members m where m.class_id = c.id and m.seat_state = 'active'),
                 'join_code', c.join_code, 'billing_interval', c.billing_interval,
                 'billing_status', case when s.role = 'owner' then b.status else null end,
                 'current_period_end', case when s.role = 'owner' then b.current_period_end else null end,
                 'cancel_at', case when s.role = 'owner' then b.cancel_at else null end) as row_json
          from public.class_staff s
          join public.classes c on c.id = s.class_id
          join public.churches o on o.id = c.org_id
          left join public.class_billing b on b.class_id = c.id
         where s.user_id = v_uid
        union all
        -- as member
        select m.joined_at as sort_key,
               jsonb_build_object(
                 'class_id', c.id, 'kind', c.kind, 'name', c.name, 'description', c.description,
                 'starts_on', c.starts_on, 'ends_on', c.ends_on, 'status', c.status,
                 'role', 'member', 'org_name', o.name, 'org_id', c.org_id, 'org_logo_url', o.logo_url,
                 'leader_name', (select p.display_name from public.class_staff s2
                                   join public.profiles p on p.id = s2.user_id
                                  where s2.class_id = c.id and s2.role = 'owner'
                                  order by s2.added_at limit 1)) as row_json
          from public.class_members m
          join public.classes c on c.id = m.class_id
          join public.churches o on o.id = c.org_id
         where m.user_id = v_uid and m.seat_state = 'active'
      ) q
  ), '[]'::jsonb);
end;
$$;

-- ---- class_roster -------------------------------------------------------------
-- Staff only, this class only. Display name from profiles (owner-only since
-- sql/042, so it is read here, as definer, for the teacher of THIS class).
create or replace function public.class_roster(p_class_id uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz, seat_state text, left_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_class_staff(p_class_id) then
    raise exception 'not_class_staff' using errcode = '42501';
  end if;
  return query
    select m.user_id, p.display_name, m.joined_at, m.seat_state, m.left_at
      from public.class_members m
      left join public.profiles p on p.id = m.user_id
     where m.class_id = p_class_id
     order by m.seat_state = 'active' desc, p.display_name nulls last, m.joined_at;
end;
$$;


-- ============================================================================
-- 10. THE WEBHOOK WRITE PATH (service role only)
--
-- group_apply_subscription_event — one transaction:
--   1. record the event id in stripe_events (sql/045); already there: 'duplicate'
--   2. the class must exist (else 'class_missing', recorded, not retried)
--   3. one class, one subscription: a DIFFERENT live subscription for a class
--      that already has one is recorded as 'second_subscription' and NOT
--      applied (someone may be paying twice: the webhook logs it loudly);
--      a subscription id already attached to ANOTHER class is an error
--   4. upsert class_billing unless a NEWER event already wrote it
--   5. classes: seats_purchased = quantity (capped at 200), seat_cap raised to
--      fit, status draft->active while billing is live, active->ended when
--      the subscription is over
--   6. re-derive every affected entitlement
--   7. audit row in entitlement_events
-- Returns { outcome, cancel_at_wanted } — cancel_at_wanted is the unix time
-- the subscription should be set to cancel at (the class's end), or null. The
-- webhook sets it on Stripe when it differs (Checkout cannot set cancel_at).
-- p_sub: { id, customer, status, price_id, interval, current_period_end,
--          cancel_at, cancel_at_period_end, canceled_at, quantity } (unix s)
-- ============================================================================
create or replace function public.group_apply_subscription_event(
  p_event_id text, p_type text, p_created timestamptz, p_livemode boolean,
  p_class_id uuid, p_payer_user_id uuid, p_customer_id text, p_sub jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sub_id   text := p_sub ->> 'id';
  v_status   text := p_sub ->> 'status';
  v_qty      int  := coalesce(nullif(p_sub ->> 'quantity', '')::int, 0);
  v_written  int;
  v_outcome  text;
  v_class    public.classes%rowtype;
  v_existing public.class_billing%rowtype;
  v_live     boolean := (p_sub ->> 'status') in ('active', 'trialing', 'past_due');
  v_want     bigint;
begin
  if p_class_id is null or p_customer_id is null or v_sub_id is null then
    raise exception 'class, customer and subscription id are required' using errcode = '22023';
  end if;

  insert into public.stripe_events (id, type, created_at, livemode, outcome)
  values (p_event_id, p_type, p_created, p_livemode, 'applying')
  on conflict (id) do nothing;
  get diagnostics v_written = row_count;
  if v_written = 0 then
    return jsonb_build_object('outcome', 'duplicate');
  end if;

  select * into v_class from public.classes where id = p_class_id for update;
  if v_class.id is null then
    update public.stripe_events set outcome = 'class_missing' where id = p_event_id;
    return jsonb_build_object('outcome', 'class_missing');
  end if;

  if exists (select 1 from public.class_billing where subscription_id = v_sub_id and class_id <> p_class_id) then
    raise exception 'subscription % belongs to a different class', v_sub_id using errcode = '42501';
  end if;

  select * into v_existing from public.class_billing where class_id = p_class_id;
  if v_existing.class_id is not null and v_existing.subscription_id <> v_sub_id
     and v_existing.status in ('active', 'trialing', 'past_due', 'incomplete') then
    update public.stripe_events set outcome = 'second_subscription' where id = p_event_id;
    insert into public.entitlement_events (user_id, source, event, actor, raw)
    values (p_payer_user_id, 'group', 'second_subscription', null,
            jsonb_build_object('event_id', p_event_id, 'class_id', p_class_id,
                               'subscription', v_sub_id, 'kept', v_existing.subscription_id));
    return jsonb_build_object('outcome', 'second_subscription');
  end if;

  insert into public.class_billing as b (class_id, subscription_id, customer_id, payer_user_id, status, price_id,
                                         plan_interval, quantity, current_period_end, cancel_at,
                                         cancel_at_period_end, canceled_at, livemode, last_event_at, updated_at)
  values (p_class_id, v_sub_id, p_customer_id, p_payer_user_id, v_status, p_sub ->> 'price_id', p_sub ->> 'interval',
          v_qty,
          to_timestamp(nullif(p_sub ->> 'current_period_end', '')::double precision),
          to_timestamp(nullif(p_sub ->> 'cancel_at', '')::double precision),
          coalesce((p_sub ->> 'cancel_at_period_end')::boolean, false),
          to_timestamp(nullif(p_sub ->> 'canceled_at', '')::double precision),
          p_livemode, p_created, now())
  on conflict (class_id) do update
    set subscription_id      = excluded.subscription_id,
        customer_id          = excluded.customer_id,
        payer_user_id        = coalesce(excluded.payer_user_id, b.payer_user_id),
        status               = excluded.status,
        price_id             = excluded.price_id,
        plan_interval        = excluded.plan_interval,
        quantity             = excluded.quantity,
        current_period_end   = excluded.current_period_end,
        cancel_at            = excluded.cancel_at,
        cancel_at_period_end = excluded.cancel_at_period_end,
        canceled_at          = excluded.canceled_at,
        livemode             = excluded.livemode,
        last_event_at        = excluded.last_event_at,
        updated_at           = now()
    where b.last_event_at <= excluded.last_event_at;
  get diagnostics v_written = row_count;
  v_outcome := case when v_written = 0 then 'stale' else 'applied' end;

  if v_outcome = 'applied' then
    update public.classes c
       set seats_purchased = case when v_live then least(greatest(v_qty, 0), 200) else c.seats_purchased end,
           seat_cap        = case when v_live then greatest(c.seat_cap, least(greatest(v_qty, 0), 200)) else c.seat_cap end,
           status          = case
                               when v_live and c.status = 'draft' then 'active'
                               when v_status in ('canceled', 'incomplete_expired', 'unpaid') and c.status in ('draft', 'active')
                                 then 'ended'
                               else c.status end,
           ended_at        = case
                               when v_status in ('canceled', 'incomplete_expired', 'unpaid') and c.status = 'active'
                                 then coalesce(c.ended_at, now())
                               else c.ended_at end
     where c.id = p_class_id;
    perform public.group_sync_class(p_class_id);
  end if;

  update public.stripe_events set outcome = v_outcome where id = p_event_id;

  insert into public.entitlement_events (user_id, source, event, actor, raw)
  values (p_payer_user_id, 'group', left(p_type, 60), null,
          jsonb_build_object('event_id', p_event_id, 'outcome', v_outcome, 'class_id', p_class_id,
                             'subscription', v_sub_id, 'status', v_status, 'quantity', v_qty));

  if v_live and v_class.ends_on is not null then
    v_want := extract(epoch from public.class_end_ts(v_class.ends_on, v_class.time_zone))::bigint;
  end if;
  return jsonb_build_object('outcome', v_outcome, 'cancel_at_wanted', v_want);
end;
$$;


-- ============================================================================
-- 11. Storage: org-logos (private). Path: <org_id>/<file>. Upload / replace /
--     delete by the org's 033 admin; view by admins and people in the org's
--     classes. PNG / JPEG / WebP only, 2 MB. SVG is refused (it can carry
--     script). The app re-encodes to WebP before upload; server-side
--     re-encoding is plan phase 5.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-logos', 'org-logos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- The folder must be a uuid before it is cast: a malformed name is refused,
-- never an error that aborts the statement differently.
create or replace function public.org_logo_folder(p_name text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                   and p_name ~ '^[^/]+/[^/]+$'
              then split_part(p_name, '/', 1)::uuid end;
$$;

drop policy if exists org_logos_select on storage.objects;
create policy org_logos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'org-logos' and public.can_view_org_logo(public.org_logo_folder(name)));

drop policy if exists org_logos_insert on storage.objects;
create policy org_logos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'org-logos'
              and public.church_role_at_least(public.org_logo_folder(name), 'admin'));

drop policy if exists org_logos_update on storage.objects;
create policy org_logos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'org-logos' and public.church_role_at_least(public.org_logo_folder(name), 'admin'))
  with check (bucket_id = 'org-logos' and public.church_role_at_least(public.org_logo_folder(name), 'admin'));

drop policy if exists org_logos_delete on storage.objects;
create policy org_logos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'org-logos' and public.church_role_at_least(public.org_logo_folder(name), 'admin'));


-- ============================================================================
-- 12. FUNCTION GRANTS — Postgres grants EXECUTE to PUBLIC by default, and
--     Supabase's default ACL grants it to anon too. Revoke all, then grant.
-- ============================================================================
revoke all on function public.is_class_staff(uuid, uuid)       from public, anon, authenticated;
revoke all on function public.is_class_owner(uuid, uuid)       from public, anon, authenticated;
revoke all on function public.is_class_member(uuid, uuid)      from public, anon, authenticated;
revoke all on function public.can_view_org_logo(uuid, uuid)    from public, anon, authenticated;
revoke all on function public.groups_enabled_for(uuid)         from public, anon, authenticated;
revoke all on function public.class_end_ts(date, text)         from public, anon, authenticated;
revoke all on function public.class_new_join_code()            from public, anon, authenticated;
revoke all on function public.org_logo_folder(text)            from public, anon, authenticated;
revoke all on function public.classes_touch()                  from public, anon, authenticated;
revoke all on function public.class_staff_after_delete()       from public, anon, authenticated;
revoke all on function public.groups_status()                  from public, anon, authenticated;
revoke all on function public.create_group_class(jsonb)        from public, anon, authenticated;
revoke all on function public.join_class(text)                 from public, anon, authenticated;
revoke all on function public.leave_class(uuid)                from public, anon, authenticated;
revoke all on function public.remove_class_member(uuid, uuid)  from public, anon, authenticated;
revoke all on function public.my_classes()                     from public, anon, authenticated;
revoke all on function public.class_roster(uuid)               from public, anon, authenticated;
revoke all on function public.group_sync_entitlement(uuid)     from public, anon, authenticated;
revoke all on function public.group_sync_class(uuid)           from public, anon, authenticated;
revoke all on function public.group_apply_subscription_event(text, text, timestamptz, boolean, uuid, uuid, text, jsonb)
  from public, anon, authenticated;

-- Referenced from policies (evaluated in the caller's session).
grant execute on function public.is_class_staff(uuid, uuid)    to authenticated;
grant execute on function public.is_class_owner(uuid, uuid)    to authenticated;
grant execute on function public.is_class_member(uuid, uuid)   to authenticated;
grant execute on function public.can_view_org_logo(uuid, uuid) to authenticated;
grant execute on function public.org_logo_folder(text)         to authenticated;
-- Client RPCs.
grant execute on function public.groups_status()               to authenticated;
grant execute on function public.create_group_class(jsonb)     to authenticated;
grant execute on function public.join_class(text)              to authenticated;
grant execute on function public.leave_class(uuid)             to authenticated;
grant execute on function public.remove_class_member(uuid, uuid) to authenticated;
grant execute on function public.my_classes()                  to authenticated;
grant execute on function public.class_roster(uuid)            to authenticated;
-- The webhook.
grant execute on function public.group_sync_entitlement(uuid)  to service_role;
grant execute on function public.group_sync_class(uuid)        to service_role;
grant execute on function public.group_apply_subscription_event(text, text, timestamptz, boolean, uuid, uuid, text, jsonb)
  to service_role;

commit;

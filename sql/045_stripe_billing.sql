-- ============================================================================
-- 045_stripe_billing.sql — CAPSTONE PLUS, PHASE 2 (WEB): STRIPE SUBSCRIPTIONS
--
-- STATUS: WRITTEN AND COMMITTED ON BRANCH `paid-payments`. **NOT APPLIED ANYWHERE.**
--         Applying it to production needs Robbie's explicit word, like every
--         migration since 033. Rehearse on staging first. Local rehearsal (no
--         account needed): node scripts/stripe/rls-test.mjs --local
--
-- NUMBERING: 043 is on branch `paid-content`, 044 (admin_user_invites) is on
--   main. 045 is the next free number (sql/README.md on origin/main).
--
-- DEPENDS ON: 025 (has_role_at_least, app_settings, app_setting_bool) and
--   043 (entitlements, entitlement_events, has_entitlement). Apply 043 first.
--   Does not depend on 044.
-- ============================================================================
--
-- WHAT THIS IS
-- ----------------------------------------------------------------------------
-- The database half of web payments. The Edge Functions in
-- supabase/functions/{create-checkout-session,stripe-webhook,create-portal-session}
-- are the other half; supabase/functions/STRIPE-SETUP.md is the runbook.
--
--   stripe_customers  one Stripe customer per Capstone account
--   subscriptions     the latest known state of each Stripe subscription
--   stripe_events     every webhook event id ever processed (idempotency)
--
-- HOW IT REACHES has_entitlement('plus')
-- ----------------------------------------------------------------------------
-- has_entitlement() (sql/043) is NOT changed. It already honours any unexpired
-- `entitlements` row. This file adds stripe_sync_entitlement(user), which
-- derives the single (user, 'plus', 'stripe') entitlements row from that
-- user's subscriptions, and the webhook's one write path,
-- stripe_apply_subscription_event(), calls it in the same transaction as the
-- event is recorded. So the entitlement can never disagree with the
-- subscription table, and has_entitlement keeps exactly one definition.
--
--   status active / trialing  -> entitled to current_period_end, plus a
--                                3-day grace for a late renewal webhook
--   status past_due           -> entitled to current_period_end + 7 days
--                                (Stripe is retrying the card)
--   anything else             -> not entitled (canceled, unpaid, incomplete,
--                                incomplete_expired, paused)
-- Several subscriptions (a double checkout) -> the latest end wins.
-- No qualifying subscription -> the stripe row is DELETED; comp, founding and
-- store rows are never touched by this file.
--
-- THE SWITCHES
-- ----------------------------------------------------------------------------
--   paid.billing_enabled   ships FALSE. While false the app draws no Upgrade
--                          or Manage UI, and create-checkout-session refuses
--                          everyone except the owner (so the owner can
--                          rehearse in Stripe test mode). The customer portal
--                          is NOT gated: anyone who is paying must always be
--                          able to cancel.
--   paid.billing_owner_preview  ships FALSE. When true, the billing UI is
--                          drawn for the OWNER only (billing_status reports
--                          billing_enabled = true to them), so the owner can
--                          rehearse the whole flow in Stripe test mode on
--                          production without anyone else seeing a button.
--   paid.everyone_has_plus (sql/043) is untouched; while it is true everyone
--                          keeps full access whatever Stripe says.
--
-- SECURITY SHAPE (same rules as sql/025, 041, 042, 043)
-- ----------------------------------------------------------------------------
--   * Every table: RLS on; REVOKE ALL from anon, authenticated, PUBLIC first.
--     stripe_customers and subscriptions: SELECT granted back to authenticated,
--     policy = own rows (owner sees all, for support). stripe_events: no grant
--     and no policy at all; only the service role (BYPASSRLS) touches it.
--   * NO client write path anywhere. The write RPCs are EXECUTE-granted to
--     service_role ONLY (revoked from PUBLIC, anon, authenticated), so a
--     signed-in reader calling them gets permission denied.
--   * Every function: SECURITY DEFINER, `set search_path = public, pg_temp`.
--
-- IDEMPOTENT: create ... if not exists; policies dropped-if-exist then created;
-- create or replace function; inserts on conflict do nothing. Safe to run twice.
-- sql/tests/045_stripe_billing_test.sql proves the rules.
--
-- REVERSAL (only before any real customer exists):
--   drop function public.stripe_apply_subscription_event(text, text, timestamptz, boolean, uuid, text, jsonb),
--                 public.stripe_record_event(text, text, timestamptz, boolean, text),
--                 public.stripe_sync_entitlement(uuid), public.billing_status();
--   drop table public.subscriptions, public.stripe_customers, public.stripe_events;
--   delete from public.entitlements where source = 'stripe';
--   delete from public.app_settings where key in ('paid.billing_enabled', 'paid.billing_owner_preview');
-- ============================================================================

begin;

insert into public.app_settings (key, value) values
  ('paid.billing_enabled',       'false'::jsonb),
  ('paid.billing_owner_preview', 'false'::jsonb)
on conflict (key) do nothing;


-- ----------------------------------------------------------------------------
-- stripe_customers
-- ----------------------------------------------------------------------------
create table if not exists public.stripe_customers (
  user_id      uuid        primary key references auth.users(id) on delete cascade,
  customer_id  text        not null unique check (customer_id ~ '^cus_[A-Za-z0-9]{1,250}$'),
  livemode     boolean     not null,
  created_at   timestamptz not null default now()
);

alter table public.stripe_customers enable row level security;
revoke all on public.stripe_customers from anon, authenticated, public;

drop policy if exists stripe_customers_select_own on public.stripe_customers;
create policy stripe_customers_select_own on public.stripe_customers
  as permissive for select to authenticated
  using (user_id = auth.uid());

drop policy if exists stripe_customers_select_owner on public.stripe_customers;
create policy stripe_customers_select_owner on public.stripe_customers
  as permissive for select to authenticated
  using (public.has_role_at_least('owner'));

grant select on public.stripe_customers to authenticated;


-- ----------------------------------------------------------------------------
-- subscriptions — latest known state of each Stripe subscription.
-- last_event_at = `created` of the newest Stripe event applied to the row. An
-- older event arriving late (Stripe does not guarantee order) is recorded as
-- processed but does not overwrite newer state.
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                   text        primary key check (id ~ '^sub_[A-Za-z0-9]{1,250}$'),
  user_id              uuid        not null references auth.users(id) on delete cascade,
  customer_id          text        not null check (customer_id ~ '^cus_[A-Za-z0-9]{1,250}$'),
  status               text        not null check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active',
                                                              'past_due', 'canceled', 'unpaid', 'paused')),
  price_id             text        check (price_id is null or length(price_id) <= 200),
  plan_interval        text        check (plan_interval is null or plan_interval in ('day', 'week', 'month', 'year')),
  current_period_end   timestamptz,
  cancel_at_period_end boolean     not null default false,
  canceled_at          timestamptz,
  livemode             boolean     not null,
  last_event_at        timestamptz not null,
  updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated, public;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  as permissive for select to authenticated
  using (user_id = auth.uid());

drop policy if exists subscriptions_select_owner on public.subscriptions;
create policy subscriptions_select_owner on public.subscriptions
  as permissive for select to authenticated
  using (public.has_role_at_least('owner'));

grant select on public.subscriptions to authenticated;


-- ----------------------------------------------------------------------------
-- stripe_events — idempotency ledger. A row exists only for an event whose
-- processing COMMITTED: it is inserted in the same transaction as the writes
-- it caused, so a failed run leaves no row and Stripe's retry processes it.
-- Not tied to a user (no personal data beyond Stripe ids); no client access.
-- ----------------------------------------------------------------------------
create table if not exists public.stripe_events (
  id            text        primary key check (id ~ '^evt_[A-Za-z0-9]{1,250}$'),
  type          text        not null check (length(type) between 1 and 100),
  created_at    timestamptz not null,
  livemode      boolean     not null,
  outcome       text        not null check (length(outcome) between 1 and 60),
  processed_at  timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated, public;
-- Deliberately no grant and no policy.


-- ----------------------------------------------------------------------------
-- stripe_sync_entitlement(user) — derive the one stripe entitlements row.
-- Internal: called by stripe_apply_subscription_event. Service role only.
-- ----------------------------------------------------------------------------
create or replace function public.stripe_sync_entitlement(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_best record;
begin
  select s.id, s.price_id, s.status, s.current_period_end,
         case when s.status = 'past_due' then s.current_period_end + interval '7 days'
              else s.current_period_end + interval '3 days' end as grace
    into v_best
    from public.subscriptions s
   where s.user_id = p_user_id
     and s.status in ('active', 'trialing', 'past_due')
     and s.current_period_end is not null
   order by (case when s.status = 'past_due' then s.current_period_end + interval '7 days'
                  else s.current_period_end + interval '3 days' end) desc
   limit 1;

  if v_best.id is null then
    delete from public.entitlements
     where user_id = p_user_id and entitlement = 'plus' and source = 'stripe';
    return;
  end if;

  insert into public.entitlements (user_id, entitlement, source, product_id, expires_at, grace_until, original_txn, note, updated_at)
  values (p_user_id, 'plus', 'stripe', v_best.price_id, v_best.current_period_end, v_best.grace, v_best.id,
          'stripe ' || v_best.status, now())
  on conflict (user_id, entitlement, source) do update
    set product_id   = excluded.product_id,
        expires_at   = excluded.expires_at,
        grace_until  = excluded.grace_until,
        original_txn = excluded.original_txn,
        note         = excluded.note,
        updated_at   = now();
end;
$$;


-- ----------------------------------------------------------------------------
-- stripe_record_event — mark an event processed when it changes nothing
-- (unhandled type, no subscription, unmatched customer). Returns false if the
-- event id was already recorded (a duplicate delivery).
-- ----------------------------------------------------------------------------
create or replace function public.stripe_record_event(
  p_event_id text, p_type text, p_created timestamptz, p_livemode boolean, p_outcome text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new boolean;
begin
  insert into public.stripe_events (id, type, created_at, livemode, outcome)
  values (p_event_id, p_type, p_created, p_livemode, coalesce(p_outcome, 'recorded'))
  on conflict (id) do nothing;
  get diagnostics v_new = row_count;
  return v_new;
end;
$$;


-- ----------------------------------------------------------------------------
-- stripe_apply_subscription_event — THE webhook write path, one transaction:
--   1. record the event id; if already there, stop: 'duplicate'
--   2. remember the customer for this user (first writer wins)
--   3. upsert the subscription unless a NEWER event already wrote it
--   4. re-derive the user's stripe entitlement
--   5. append an entitlement_events audit row
-- p_sub is the subscription object as the webhook normalised it (never the
-- raw client input; the webhook fetched it from Stripe itself):
--   { id, customer, status, price_id, interval, current_period_end (unix s),
--     cancel_at_period_end, canceled_at (unix s|null) }
-- Returns 'duplicate' | 'applied' | 'stale' (older than the stored state).
-- ----------------------------------------------------------------------------
create or replace function public.stripe_apply_subscription_event(
  p_event_id text, p_type text, p_created timestamptz, p_livemode boolean,
  p_user_id uuid, p_customer_id text, p_sub jsonb)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sub_id   text := p_sub ->> 'id';
  v_written  int;
  v_outcome  text;
begin
  if p_user_id is null or p_customer_id is null or v_sub_id is null then
    raise exception 'user, customer and subscription id are required' using errcode = '22023';
  end if;

  insert into public.stripe_events (id, type, created_at, livemode, outcome)
  values (p_event_id, p_type, p_created, p_livemode, 'applying')
  on conflict (id) do nothing;
  get diagnostics v_written = row_count;
  if v_written = 0 then
    return 'duplicate';
  end if;

  insert into public.stripe_customers (user_id, customer_id, livemode)
  values (p_user_id, p_customer_id, p_livemode)
  on conflict do nothing;

  -- A subscription never changes hands. Refuse (and roll back the whole event,
  -- so Stripe retries and the failure is loud) rather than move it.
  if exists (select 1 from public.subscriptions where id = v_sub_id and user_id <> p_user_id) then
    raise exception 'subscription % belongs to a different user', v_sub_id using errcode = '42501';
  end if;

  insert into public.subscriptions as s (id, user_id, customer_id, status, price_id, plan_interval,
                                         current_period_end, cancel_at_period_end, canceled_at,
                                         livemode, last_event_at, updated_at)
  values (v_sub_id, p_user_id, p_customer_id, p_sub ->> 'status', p_sub ->> 'price_id', p_sub ->> 'interval',
          to_timestamp(nullif(p_sub ->> 'current_period_end', '')::double precision),
          coalesce((p_sub ->> 'cancel_at_period_end')::boolean, false),
          to_timestamp(nullif(p_sub ->> 'canceled_at', '')::double precision),
          p_livemode, p_created, now())
  on conflict (id) do update
    set status               = excluded.status,
        price_id             = excluded.price_id,
        plan_interval        = excluded.plan_interval,
        current_period_end   = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        canceled_at          = excluded.canceled_at,
        customer_id          = excluded.customer_id,
        last_event_at        = excluded.last_event_at,
        updated_at           = now()
    where s.last_event_at <= excluded.last_event_at;
  get diagnostics v_written = row_count;
  v_outcome := case when v_written = 0 then 'stale' else 'applied' end;

  perform public.stripe_sync_entitlement(p_user_id);

  update public.stripe_events set outcome = v_outcome where id = p_event_id;

  insert into public.entitlement_events (user_id, source, event, actor, raw)
  values (p_user_id, 'stripe', left(p_type, 60), null,
          jsonb_build_object('event_id', p_event_id, 'outcome', v_outcome,
                             'subscription', v_sub_id, 'status', p_sub ->> 'status'));

  return v_outcome;
end;
$$;


-- ----------------------------------------------------------------------------
-- billing_status() — what the app needs to draw (or not draw) billing UI.
-- Readable by any signed-in account, about itself only. Fail closed: if this
-- function does not exist (045 not applied) the client draws nothing.
-- ----------------------------------------------------------------------------
create or replace function public.billing_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_sub record;
begin
  if v_uid is null then
    return jsonb_build_object('billing_enabled', false, 'has_plus', false,
                              'has_customer', false, 'subscription', null);
  end if;

  select s.status, s.plan_interval, s.current_period_end, s.cancel_at_period_end
    into v_sub
    from public.subscriptions s
   where s.user_id = v_uid
   order by (s.status in ('active', 'trialing', 'past_due')) desc, s.last_event_at desc
   limit 1;

  return jsonb_build_object(
    'billing_enabled', public.app_setting_bool('paid.billing_enabled', false)
                       or (public.app_setting_bool('paid.billing_owner_preview', false)
                           and public.has_role_at_least('owner', v_uid)),
    'has_plus',        public.has_entitlement('plus'),
    'has_customer',    exists (select 1 from public.stripe_customers c where c.user_id = v_uid),
    'subscription',    case when v_sub.status is null then null else jsonb_build_object(
                         'status',               v_sub.status,
                         'interval',             v_sub.plan_interval,
                         'current_period_end',   v_sub.current_period_end,
                         'cancel_at_period_end', v_sub.cancel_at_period_end) end
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- Grants. Write RPCs: service_role only. billing_status: authenticated.
-- ----------------------------------------------------------------------------
revoke all on function public.stripe_sync_entitlement(uuid) from public, anon, authenticated;
revoke all on function public.stripe_record_event(text, text, timestamptz, boolean, text) from public, anon, authenticated;
revoke all on function public.stripe_apply_subscription_event(text, text, timestamptz, boolean, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.stripe_sync_entitlement(uuid) to service_role;
grant execute on function public.stripe_record_event(text, text, timestamptz, boolean, text) to service_role;
grant execute on function public.stripe_apply_subscription_event(text, text, timestamptz, boolean, uuid, text, jsonb) to service_role;

revoke all on function public.billing_status() from public, anon;
grant execute on function public.billing_status() to authenticated;

commit;

-- ============================================================================
-- sql/tests/045_stripe_billing_test.sql — PROVES THE RULES OF sql/045.
--
-- Run as the database owner against a database with sql/025, sql/043 and
-- sql/045 applied: a STAGING project, or the local rehearsal
--   node scripts/stripe/rls-test.mjs --local
-- NEVER against production: it inserts test accounts into auth.users. One
-- transaction, ends in ROLLBACK.
--
-- Every check is a DO block that RAISEs on failure and NOTICEs "PASS ..." on
-- success. The last notice is "ALL 045 CHECKS PASSED".
-- ============================================================================

begin;

--   ...11 subscriber A    ...12 reader B (no subscription)    ...13 owner
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000011', 'a@test.invalid'),
  ('00000000-0000-4000-8000-000000000012', 'b@test.invalid'),
  ('00000000-0000-4000-8000-000000000013', 'owner45@test.invalid');
insert into public.user_roles (user_id, role, note)
values ('00000000-0000-4000-8000-000000000013', 'owner', '045 test');

create or replace function pg_temp.become(p_role text, p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then json_build_object('role', p_role)::text
         else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
end $$;

-- The paywall is ON for these checks, so has_entitlement reflects Stripe alone.
update public.app_settings set value = 'false'::jsonb where key = 'paid.everyone_has_plus';

do $$ begin
  if public.app_setting_bool('paid.billing_enabled', true) then
    raise exception 'FAIL setup: paid.billing_enabled should ship false';
  end if;
  raise notice 'PASS setup: billing_enabled ships false';
end $$;

-- ------------------------------------------------ clients cannot call writers
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000012');
set local role authenticated;
do $$ begin
  begin
    perform public.stripe_apply_subscription_event('evt_x1', 'customer.subscription.created', now(), false,
      '00000000-0000-4000-8000-000000000012', 'cus_x',
      jsonb_build_object('id', 'sub_x', 'status', 'active',
                         'current_period_end', extract(epoch from now() + interval '30 days')));
    raise exception 'FAIL authenticated could call stripe_apply_subscription_event';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.stripe_record_event('evt_x2', 't', now(), false, 'x');
    raise exception 'FAIL authenticated could call stripe_record_event';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.stripe_sync_entitlement('00000000-0000-4000-8000-000000000012');
    raise exception 'FAIL authenticated could call stripe_sync_entitlement';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.subscriptions (id, user_id, customer_id, status, livemode, last_event_at)
    values ('sub_forged', '00000000-0000-4000-8000-000000000012', 'cus_forged', 'active', false, now());
    raise exception 'FAIL authenticated could insert into subscriptions';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.stripe_customers (user_id, customer_id, livemode)
    values ('00000000-0000-4000-8000-000000000012', 'cus_forged', false);
    raise exception 'FAIL authenticated could insert into stripe_customers';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.stripe_events;
    raise exception 'FAIL authenticated could read stripe_events';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS authenticated has no write path and cannot read stripe_events';
end $$;
reset role;

select pg_temp.become('anon', null);
set local role anon;
do $$ begin
  begin
    perform public.billing_status();
    raise exception 'FAIL anon could call billing_status';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.subscriptions;
    raise exception 'FAIL anon could read subscriptions';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS anon gets nothing';
end $$;
reset role;

-- ------------------------------------------------ webhook writes (service_role)
select pg_temp.become('service_role', null);
set local role service_role;
do $$
declare r text;
begin
  r := public.stripe_apply_subscription_event('evt_a1', 'checkout.session.completed', now() - interval '10 minutes', false,
    '00000000-0000-4000-8000-000000000011', 'cus_A',
    jsonb_build_object('id', 'sub_A', 'customer', 'cus_A', 'status', 'active', 'price_id', 'price_month',
                       'interval', 'month', 'cancel_at_period_end', false,
                       'current_period_end', extract(epoch from now() + interval '30 days')));
  if r <> 'applied' then raise exception 'FAIL first apply returned %', r; end if;

  -- Same event again: duplicate, no second audit row.
  r := public.stripe_apply_subscription_event('evt_a1', 'checkout.session.completed', now() - interval '10 minutes', false,
    '00000000-0000-4000-8000-000000000011', 'cus_A',
    jsonb_build_object('id', 'sub_A', 'status', 'canceled'));
  if r <> 'duplicate' then raise exception 'FAIL replayed event returned %', r; end if;
  if (select status from public.subscriptions where id = 'sub_A') <> 'active' then
    raise exception 'FAIL a replayed event changed the subscription';
  end if;
  if (select count(*) from public.entitlement_events where raw ->> 'event_id' = 'evt_a1') <> 1 then
    raise exception 'FAIL replay wrote a second audit row';
  end if;

  if not public.stripe_record_event('evt_n1', 'invoice.paid', now(), false, 'ignored') then
    raise exception 'FAIL record_event first call returned false';
  end if;
  if public.stripe_record_event('evt_n1', 'invoice.paid', now(), false, 'ignored') then
    raise exception 'FAIL record_event replay returned true';
  end if;
  raise notice 'PASS apply is idempotent by event id';
end $$;
reset role;

-- A is entitled; B is not; each sees only their own rows.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000011');
set local role authenticated;
do $$
declare s jsonb;
begin
  if not public.has_entitlement('plus') then raise exception 'FAIL active subscriber not entitled'; end if;
  s := public.billing_status();
  if (s ->> 'has_plus')::boolean is not true or (s ->> 'has_customer')::boolean is not true
     or s -> 'subscription' ->> 'status' <> 'active' or (s ->> 'billing_enabled')::boolean then
    raise exception 'FAIL billing_status for A: %', s;
  end if;
  if (select count(*) from public.subscriptions) <> 1 then raise exception 'FAIL A sees % subscriptions', (select count(*) from public.subscriptions); end if;
  if (select count(*) from public.stripe_customers) <> 1 then raise exception 'FAIL A customer rows'; end if;
  raise notice 'PASS active subscriber entitled and sees own rows';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000012');
set local role authenticated;
do $$
declare s jsonb;
begin
  if public.has_entitlement('plus') then raise exception 'FAIL B entitled without a subscription'; end if;
  if (select count(*) from public.subscriptions) <> 0 then raise exception 'FAIL B can see A''s subscription'; end if;
  if (select count(*) from public.stripe_customers) <> 0 then raise exception 'FAIL B can see A''s customer'; end if;
  s := public.billing_status();
  if (s ->> 'has_plus')::boolean or (s ->> 'has_customer')::boolean or s -> 'subscription' <> 'null'::jsonb then
    raise exception 'FAIL billing_status for B: %', s;
  end if;
  raise notice 'PASS other readers see nothing of A';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000013');
set local role authenticated;
do $$ begin
  if (select count(*) from public.subscriptions) <> 1 then raise exception 'FAIL owner cannot see subscriptions'; end if;
  raise notice 'PASS owner sees subscriptions for support';
  if (public.billing_status() ->> 'billing_enabled')::boolean then
    raise exception 'FAIL owner sees billing before any switch is on';
  end if;
end $$;
reset role;

-- Owner preview: the owner, and only the owner, is told billing is on.
update public.app_settings set value = 'true'::jsonb where key = 'paid.billing_owner_preview';
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000013');
set local role authenticated;
do $$ begin
  if not (public.billing_status() ->> 'billing_enabled')::boolean then raise exception 'FAIL owner preview not shown to owner'; end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000012');
set local role authenticated;
do $$ begin
  if (public.billing_status() ->> 'billing_enabled')::boolean then raise exception 'FAIL owner preview leaked to a member'; end if;
  raise notice 'PASS owner preview shows billing to the owner only';
end $$;
reset role;
update public.app_settings set value = 'false'::jsonb where key = 'paid.billing_owner_preview';

-- ------------------------------------------------ ordering, past_due, cancel
set local role service_role;
do $$
declare r text;
begin
  -- An OLDER event arriving late must not overwrite newer state.
  r := public.stripe_apply_subscription_event('evt_a0', 'customer.subscription.created', now() - interval '20 minutes', false,
    '00000000-0000-4000-8000-000000000011', 'cus_A',
    jsonb_build_object('id', 'sub_A', 'status', 'incomplete'));
  if r <> 'stale' then raise exception 'FAIL older event returned %', r; end if;
  if (select status from public.subscriptions where id = 'sub_A') <> 'active' then
    raise exception 'FAIL an older event overwrote newer state';
  end if;

  -- past_due with the period already over: still entitled inside the 7-day grace.
  r := public.stripe_apply_subscription_event('evt_a2', 'invoice.payment_failed', now() - interval '5 minutes', false,
    '00000000-0000-4000-8000-000000000011', 'cus_A',
    jsonb_build_object('id', 'sub_A', 'status', 'past_due', 'price_id', 'price_month', 'interval', 'month',
                       'current_period_end', extract(epoch from now() - interval '2 days')));
  if r <> 'applied' then raise exception 'FAIL past_due apply returned %', r; end if;
  if (select grace_until from public.entitlements where user_id = '00000000-0000-4000-8000-000000000011' and source = 'stripe')
       <= now() then
    raise exception 'FAIL past_due grace not in the future';
  end if;
  raise notice 'PASS out-of-order event is stale; past_due keeps a grace window';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000011');
set local role authenticated;
do $$ begin
  if not public.has_entitlement('plus') then raise exception 'FAIL past_due subscriber lost access inside grace'; end if;
  raise notice 'PASS past_due still entitled';
end $$;
reset role;

set local role service_role;
do $$
declare r text;
begin
  -- A comp row must survive the stripe row being removed.
  insert into public.entitlements (user_id, entitlement, source, expires_at)
  values ('00000000-0000-4000-8000-000000000012', 'plus', 'comp', null);

  r := public.stripe_apply_subscription_event('evt_a3', 'customer.subscription.deleted', now(), false,
    '00000000-0000-4000-8000-000000000011', 'cus_A',
    jsonb_build_object('id', 'sub_A', 'status', 'canceled', 'canceled_at', extract(epoch from now()),
                       'current_period_end', extract(epoch from now() - interval '2 days')));
  if r <> 'applied' then raise exception 'FAIL cancel apply returned %', r; end if;
  if exists (select 1 from public.entitlements where user_id = '00000000-0000-4000-8000-000000000011' and source = 'stripe') then
    raise exception 'FAIL canceled subscription left a stripe entitlement';
  end if;
  if not exists (select 1 from public.entitlements where user_id = '00000000-0000-4000-8000-000000000012' and source = 'comp') then
    raise exception 'FAIL comp row disappeared';
  end if;

  -- A subscription cannot be re-pointed at another user.
  begin
    perform public.stripe_apply_subscription_event('evt_a4', 'customer.subscription.updated', now() + interval '1 minute', false,
      '00000000-0000-4000-8000-000000000012', 'cus_A',
      jsonb_build_object('id', 'sub_A', 'status', 'active',
                         'current_period_end', extract(epoch from now() + interval '30 days')));
    raise exception 'FAIL subscription moved to another user';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from public.stripe_events where id = 'evt_a4') then
    raise exception 'FAIL a refused event was recorded as processed';
  end if;
  raise notice 'PASS cancel removes stripe access only; ownership cannot move';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000011');
set local role authenticated;
do $$ begin
  if public.has_entitlement('plus') then raise exception 'FAIL canceled subscriber still entitled'; end if;
  raise notice 'PASS canceled subscriber not entitled';
end $$;
reset role;

-- Switch back on: everyone keeps access whatever Stripe says.
update public.app_settings set value = 'true'::jsonb where key = 'paid.everyone_has_plus';
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000011');
set local role authenticated;
do $$ begin
  if not public.has_entitlement('plus') then raise exception 'FAIL everyone_has_plus did not override'; end if;
  raise notice 'PASS everyone_has_plus still overrides';
  raise notice 'ALL 045 CHECKS PASSED';
end $$;
reset role;

rollback;

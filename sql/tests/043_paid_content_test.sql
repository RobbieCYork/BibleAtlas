-- ============================================================================
-- sql/tests/043_paid_content_test.sql — PROVES THE ACCESS RULES OF sql/043.
--
-- Run it as the database owner (postgres) against a database that has sql/025
-- and sql/043 applied — a STAGING project, or the local rehearsal
-- (node scripts/paid-content/rls-test.mjs). NEVER against production: it
-- inserts test accounts into auth.users. It runs in ONE transaction and ends in
-- ROLLBACK, so even a staging run leaves nothing behind.
--
--   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f sql/tests/043_paid_content_test.sql
--
-- Every check is a DO block that RAISEs on failure (stopping the run with the
-- failing check's name) and NOTICEs "PASS ..." on success. The last line is
-- "ALL 043 CHECKS PASSED". Anything else is a failure.
--
-- Identity is set the way PostgREST sets it: `set local role` to anon or
-- authenticated, and the JWT claims in request.jwt.claims (plus the older
-- request.jwt.claim.sub, which some auth.uid() versions read).
-- ============================================================================

begin;

-- ---------------------------------------------------------------- fixtures
-- Fixed UUIDs, so a failure message names someone recognisable.
--   ...01 free member      ...02 plus (stripe, +30d)   ...03 expired plus
--   ...04 expired-in-grace ...05 lifetime comp         ...06 owner
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'free@test.invalid'),
  ('00000000-0000-4000-8000-000000000002', 'plus@test.invalid'),
  ('00000000-0000-4000-8000-000000000003', 'expired@test.invalid'),
  ('00000000-0000-4000-8000-000000000004', 'grace@test.invalid'),
  ('00000000-0000-4000-8000-000000000005', 'lifetime@test.invalid'),
  ('00000000-0000-4000-8000-000000000006', 'owner@test.invalid');

insert into public.user_roles (user_id, role, note)
values ('00000000-0000-4000-8000-000000000006', 'owner', '043 test');

insert into public.entitlements (user_id, entitlement, source, expires_at, grace_until) values
  ('00000000-0000-4000-8000-000000000002', 'plus', 'stripe',   now() + interval '30 days', null),
  ('00000000-0000-4000-8000-000000000003', 'plus', 'stripe',   now() - interval '1 day',   null),
  ('00000000-0000-4000-8000-000000000004', 'plus', 'app_store', now() - interval '1 day',  now() + interval '3 days'),
  ('00000000-0000-4000-8000-000000000005', 'plus', 'comp',     null,                       null);

-- Two content rows, whatever the seed did or did not load.
insert into public.content_paid (kind, id, body, content_hash) values
  ('topic',  '__test_a', '{"sections":[{"heading":"H","paragraphs":["p"]}]}', repeat('a', 64)),
  ('person', '__test_b', '{"lifeStory":["x"]}',                              repeat('b', 64))
on conflict (kind, id) do nothing;

-- A helper the checks call as postgres between identities.
create or replace function pg_temp.become(p_role text, p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then json_build_object('role', p_role)::text
         else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
end $$;

-- Test rows are visible to an entitled reader if this many rows with id like '__test_%' come back.
-- (Counts only the two fixtures, so a seeded table does not change the expected numbers.)

-- ======================================================== switch ON (phase 1)
do $$ begin
  if not public.app_setting_bool('paid.everyone_has_plus', false) then
    raise exception 'FAIL setup: paid.everyone_has_plus should ship true';
  end if;
  raise notice 'PASS setup: everyone_has_plus ships true';
end $$;

-- anon: no grant on the table at all.
select pg_temp.become('anon', null);
set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.content_paid;
    if n <> 0 then raise exception 'FAIL anon read % content_paid rows with the switch ON', n; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.has_entitlement('plus');
    raise exception 'FAIL anon may execute has_entitlement';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.entitlements;
    if n <> 0 then raise exception 'FAIL anon read entitlements'; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS anon cannot read content_paid / entitlements or call has_entitlement (switch ON)';
end $$;
reset role;

-- free member, switch ON: reads (phase 1 = nothing changes for users).
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid where id like '\_\_test\_%';
  if n <> 2 then raise exception 'FAIL free member reads % of 2 rows with the switch ON', n; end if;
  if not public.has_entitlement('plus') then raise exception 'FAIL has_entitlement false for member, switch ON'; end if;
  raise notice 'PASS free member reads everything while the switch is ON';
end $$;
reset role;

-- ======================================================== switch OFF
update public.app_settings set value = 'false'::jsonb where key = 'paid.everyone_has_plus';

select pg_temp.become('anon', null);
set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.content_paid;
    if n <> 0 then raise exception 'FAIL anon read % rows, switch OFF', n; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS anon cannot read content_paid (switch OFF)';
end $$;
reset role;

-- free member, switch OFF: zero rows, false, and every write path refused.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid;
  if n <> 0 then raise exception 'FAIL free member reads % rows with the switch OFF', n; end if;
  if public.has_entitlement('plus') then raise exception 'FAIL has_entitlement true for free member, switch OFF'; end if;

  begin
    insert into public.entitlements (user_id, entitlement, source) values ('00000000-0000-4000-8000-000000000001', 'plus', 'comp');
    raise exception 'FAIL free member inserted their own entitlement';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.entitlements set expires_at = null;
    raise exception 'FAIL free member could update entitlements';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.content_paid (kind, id, body, content_hash) values ('topic', '__evil', '{}', repeat('c', 64));
    raise exception 'FAIL free member wrote content_paid';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.grant_comp('00000000-0000-4000-8000-000000000001');
    raise exception 'FAIL free member granted themselves a comp';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.app_settings set value = 'true'::jsonb where key = 'paid.everyone_has_plus';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL free member flipped the switch'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_app_setting('paid.everyone_has_plus', 'true'::jsonb);
    raise exception 'FAIL free member flipped the switch via set_app_setting';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.entitlements;
  if n <> 0 then raise exception 'FAIL free member sees % entitlement rows (has none)', n; end if;
  begin
    perform public.has_entitlement('pluss');
    raise exception 'FAIL unknown entitlement name did not raise';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS free member, switch OFF: 0 rows, has_entitlement false, no write path, no self-comp, cannot flip the switch';
end $$;
reset role;

-- plus member: reads; sees own entitlement row and nobody else's.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000002');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid where id like '\_\_test\_%';
  if n <> 2 then raise exception 'FAIL plus member reads % of 2 rows', n; end if;
  select count(*) into n from public.entitlements;
  if n <> 1 then raise exception 'FAIL plus member sees % entitlement rows, expected only their own 1', n; end if;
  raise notice 'PASS plus member reads content and sees only their own entitlement';
end $$;
reset role;

-- expired: no; in grace: yes; lifetime comp: yes.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000003');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid;
  if n <> 0 then raise exception 'FAIL expired member reads % rows', n; end if;
  raise notice 'PASS expired subscription reads nothing';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000004');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid where id like '\_\_test\_%';
  if n <> 2 then raise exception 'FAIL member in billing grace reads % of 2', n; end if;
  raise notice 'PASS expired-but-in-grace reads content';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000005');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid where id like '\_\_test\_%';
  if n <> 2 then raise exception 'FAIL lifetime comp reads % of 2', n; end if;
  raise notice 'PASS open-ended comp (expires_at null) reads content';
end $$;
reset role;

-- owner: always reads; can comp and un-comp; sees the audit.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000006');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid where id like '\_\_test\_%';
  if n <> 2 then raise exception 'FAIL owner reads % of 2 with the switch OFF', n; end if;
  perform public.grant_comp('00000000-0000-4000-8000-000000000001', now() + interval '7 days', 'tester');
  select count(*) into n from public.entitlement_events where user_id = '00000000-0000-4000-8000-000000000001' and event = 'grant';
  if n <> 1 then raise exception 'FAIL comp grant not audited'; end if;
  raise notice 'PASS owner reads with the switch OFF, grants a comp, sees the audit row';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid where id like '\_\_test\_%';
  if n <> 2 then raise exception 'FAIL comped member reads % of 2', n; end if;
  begin
    select count(*) into n from public.entitlement_events;
    if n <> 0 then raise exception 'FAIL non-owner reads the entitlement audit'; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS comped member reads content; cannot read the audit';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000006');
set local role authenticated;
select public.revoke_comp('00000000-0000-4000-8000-000000000001', 'test over');
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_paid;
  if n <> 0 then raise exception 'FAIL member still reads % rows after revoke_comp', n; end if;
  raise notice 'PASS revoke_comp removes access';
end $$;
reset role;

-- Missing switch row fails CLOSED.
delete from public.app_settings where key = 'paid.everyone_has_plus';
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
begin
  if public.has_entitlement('plus') then raise exception 'FAIL missing switch row opened the paywall'; end if;
  raise notice 'PASS a missing switch row fails closed';
end $$;
reset role;

-- Function hygiene: SECURITY DEFINER with a pinned search_path, no EXECUTE for anon.
do $$
declare r record;
begin
  for r in
    select p.proname, p.prosecdef, p.proconfig,
           has_function_privilege('anon', p.oid, 'execute') as anon_exec
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('has_entitlement', 'grant_comp', 'revoke_comp')
  loop
    if not r.prosecdef then raise exception 'FAIL % is not SECURITY DEFINER', r.proname; end if;
    if r.proconfig is null or not exists (select 1 from unnest(r.proconfig) c where c like 'search_path=%pg_temp') then
      raise exception 'FAIL % does not pin search_path', r.proname;
    end if;
    if r.anon_exec then raise exception 'FAIL anon may execute %', r.proname; end if;
  end loop;
  if has_table_privilege('anon', 'public.content_paid', 'select') then raise exception 'FAIL anon has select on content_paid'; end if;
  if has_table_privilege('authenticated', 'public.content_paid', 'insert') then raise exception 'FAIL authenticated has insert on content_paid'; end if;
  if has_table_privilege('authenticated', 'public.entitlements', 'insert') then raise exception 'FAIL authenticated has insert on entitlements'; end if;
  raise notice 'PASS functions are SECURITY DEFINER, search_path pinned, no anon EXECUTE; no client write grants';
end $$;

do $$ begin raise notice 'ALL 043 CHECKS PASSED'; end $$;

rollback;

-- ============================================================================
-- sql/tests/047_groups_classes_test.sql — PROVES THE RULES OF sql/047.
--
-- Run as the database owner against a database with sql/025, 033, 043, 045 and
-- 047 applied (and the live `profiles` table): a STAGING project, or the local
-- rehearsal
--   node scripts/groups/rls-test.mjs --local              (the checks)
--   node scripts/groups/rls-test.mjs --local --mutations  (break a rule, watch a check fail)
-- NEVER against production: it inserts test accounts into auth.users and flips
-- app_settings. One transaction, ends in ROLLBACK.
--
-- Every check RAISEs on failure and NOTICEs "PASS ..." on success. The last
-- notice is "ALL 047 CHECKS PASSED".
-- ============================================================================

begin;

--   ...71 teacher A (school)   ...72 leader B (church)   ...73 student S1
--   ...74 student S2           ...75 outsider O          ...76 app owner
--   ...77 co-teacher C         ...78 guest (anonymous)   ...79 late joiner L
--   ...81-83 fillers (seats)
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-4000-8000-000000000071', 'a47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000072', 'b47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000073', 's1-47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000074', 's2-47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000075', 'o47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000076', 'owner47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000077', 'c47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000078', null, true),
  ('00000000-0000-4000-8000-000000000079', 'l47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000081', 'f1-47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000082', 'f2-47@test.invalid', false),
  ('00000000-0000-4000-8000-000000000083', 'f3-47@test.invalid', false);
insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-000000000071', 'Teacher A'),
  ('00000000-0000-4000-8000-000000000072', 'Leader B'),
  ('00000000-0000-4000-8000-000000000073', 'Student One'),
  ('00000000-0000-4000-8000-000000000074', 'Student Two');
insert into public.user_roles (user_id, role, note)
values ('00000000-0000-4000-8000-000000000076', 'owner', '047 test');

-- Who the next statements run as.
create or replace function pg_temp.become(p_role text, p_uid text, p_anon boolean default false) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then json_build_object('role', p_role)::text
         else json_build_object('sub', p_uid, 'role', p_role, 'is_anonymous', p_anon)::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
end $$;

-- Runs a statement as the CURRENT role; returns 'ok' or the SQLSTATE plus the
-- message. Security invoker, in public so a switched role can call it (rolled
-- back with everything else).
create or replace function public.t047_try(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate || ' ' || sqlerrm;
end $$;
grant execute on function public.t047_try(text) to anon, authenticated, service_role;

-- Fixed values the tests reuse.
create temp table t47 (k text primary key, v text);
grant select, insert, update on t47 to anon, authenticated, service_role;
insert into t47 values
  ('sha', '0b2ad26fd1888583899cd38664e9f5bc3b154be7067ceaaf7d0aab5b591a7fdc'),
  ('ver', '2026-11-21-draft-1');

create or replace function pg_temp.payload(p_kind text, p_name text, p_seats int, p_extra jsonb default '{}') returns jsonb
language sql as $$
  select jsonb_build_object(
    'kind', p_kind, 'org_name', p_name || ' Org', 'address_line1', '1 Main St', 'city', 'Boise', 'region', 'ID',
    'postal_code', '83702', 'country', 'US', 'phone', '+1 208 555 0100',
    'class_name', p_name, 'description', 'test', 'time_zone', 'America/Denver',
    'seats', p_seats, 'interval', 'month', 'billing_mode', 'admin_pays',
    'agreement_version', '2026-11-21-draft-1',
    'agreement_sha256', '0b2ad26fd1888583899cd38664e9f5bc3b154be7067ceaaf7d0aab5b591a7fdc',
    'typed_name', 'Test Person', 'accepted', true) || p_extra
$$;


-- ------------------------------------------------ 1. grants, as declared
do $$
declare
  t text;
  f text;
begin
  foreach t in array array['classes','class_staff','class_members','class_agreement_versions','class_agreements',
                           'class_billing','class_join_attempts','class_invites','invite_suppressions'] loop
    if has_table_privilege('anon', 'public.' || t, 'select') or has_table_privilege('anon', 'public.' || t, 'insert')
       or has_table_privilege('anon', 'public.' || t, 'update') or has_table_privilege('anon', 'public.' || t, 'delete') then
      raise exception 'FAIL anon holds a privilege on %', t;
    end if;
    if has_table_privilege('authenticated', 'public.' || t, 'insert') or has_table_privilege('authenticated', 'public.' || t, 'update')
       or has_table_privilege('authenticated', 'public.' || t, 'delete') or has_table_privilege('authenticated', 'public.' || t, 'truncate')
       or has_table_privilege('authenticated', 'public.' || t, 'references') or has_table_privilege('authenticated', 'public.' || t, 'trigger') then
      raise exception 'FAIL authenticated can write % (or holds truncate/references/trigger)', t;
    end if;
  end loop;
  foreach t in array array['class_agreement_versions','class_join_attempts','invite_suppressions'] loop
    if has_table_privilege('authenticated', 'public.' || t, 'select') then
      raise exception 'FAIL authenticated can read server-only table %', t;
    end if;
  end loop;
  if has_column_privilege('authenticated', 'public.churches', 'kind', 'update') then
    raise exception 'FAIL a church admin can change churches.kind';
  end if;

  foreach f in array array['groups_status()','create_group_class(jsonb)','join_class(text)','leave_class(uuid)',
                           'remove_class_member(uuid, uuid)','my_classes()','class_roster(uuid)',
                           'group_sync_entitlement(uuid)','group_sync_class(uuid)',
                           'group_apply_subscription_event(text, text, timestamptz, boolean, uuid, uuid, text, jsonb)',
                           'is_class_staff(uuid)','is_class_member(uuid)','is_class_owner(uuid)',
                           'can_view_org_logo(uuid)','class_new_join_code()'] loop
    if has_function_privilege('anon', 'public.' || f, 'execute') then
      raise exception 'FAIL anon can execute %', f;
    end if;
  end loop;
  foreach f in array array['group_sync_entitlement(uuid)','group_sync_class(uuid)',
                           'group_apply_subscription_event(text, text, timestamptz, boolean, uuid, uuid, text, jsonb)',
                           'class_new_join_code()','groups_enabled_for(uuid)'] loop
    if has_function_privilege('authenticated', 'public.' || f, 'execute') then
      raise exception 'FAIL authenticated can execute server-only %', f;
    end if;
  end loop;
  if not has_function_privilege('service_role', 'public.group_apply_subscription_event(text, text, timestamptz, boolean, uuid, uuid, text, jsonb)', 'execute') then
    raise exception 'FAIL service_role cannot execute group_apply_subscription_event';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'entitlements_source_check'
                  and pg_get_constraintdef(oid) like '%group%') then
    raise exception 'FAIL entitlements source check does not allow group';
  end if;
  if (select count(*) from pg_constraint where conrelid = 'public.entitlements'::regclass and contype = 'c'
        and pg_get_constraintdef(oid) ~ '\msource\M') <> 1 then
    raise exception 'FAIL expected exactly one source CHECK on entitlements';
  end if;
  raise notice 'PASS grants: anon nothing, no client writes, server-only fns, entitlements accepts group';
end $$;


-- ------------------------------------------------ 2. anon gets nothing
select pg_temp.become('anon', null);
set local role anon;
do $$
declare r text;
begin
  r := public.t047_try('select 1 from public.classes');
  if r not like '42501%' then raise exception 'FAIL anon read classes: %', r; end if;
  r := public.t047_try('select 1 from public.class_members');
  if r not like '42501%' then raise exception 'FAIL anon read class_members: %', r; end if;
  r := public.t047_try('select public.join_class(''ABCDEF'')');
  if r not like '42501%' then raise exception 'FAIL anon could call join_class: %', r; end if;
  r := public.t047_try('select public.create_group_class(''{}''::jsonb)');
  if r not like '42501%' then raise exception 'FAIL anon could call create_group_class: %', r; end if;
  raise notice 'PASS anon gets nothing';
end $$;
reset role;


-- ------------------------------------------------ 3. the switch ships off
do $$ begin
  if public.app_setting_bool('paid.groups_enabled', true) or public.app_setting_bool('paid.groups_owner_preview', true) then
    raise exception 'FAIL setup: paid.groups_enabled / groups_owner_preview should ship false';
  end if;
  raise notice 'PASS setup: both group switches ship false';
end $$;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$
declare r text;
begin
  if (public.groups_status() ->> 'groups_enabled')::boolean then
    raise exception 'FAIL groups_status says enabled while the switch is off';
  end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)',
         jsonb_build_object('kind','school','org_name','X','class_name','X','seats',5,'accepted',true,'typed_name','A B',
                            'agreement_version',(select v from t47 where k='ver'),'agreement_sha256',(select v from t47 where k='sha'))));
  if r not like '%groups_disabled%' then raise exception 'FAIL a member created a class with the switch off: %', r; end if;
  raise notice 'PASS switch off: groups_status false, members cannot create';
end $$;
reset role;

-- Owner preview: the owner sees it, nobody else does.
update public.app_settings set value = 'true'::jsonb where key = 'paid.groups_owner_preview';
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000076');
set local role authenticated;
do $$ begin
  if not (public.groups_status() ->> 'groups_enabled')::boolean then
    raise exception 'FAIL owner preview: owner should see groups';
  end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$ begin
  if (public.groups_status() ->> 'groups_enabled')::boolean then
    raise exception 'FAIL owner preview leaked to a member';
  end if;
  raise notice 'PASS owner preview shows groups to the owner only';
end $$;
reset role;
update public.app_settings set value = 'false'::jsonb where key = 'paid.groups_owner_preview';

-- Switch on for the rest.
update public.app_settings set value = 'true'::jsonb where key = 'paid.groups_enabled';


-- ------------------------------------------------ 4. create: validation
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)', pg_temp.payload('school', 'Bad', 4)));
  if r not like '%seats_minimum%' then raise exception 'FAIL 4 seats accepted: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)', pg_temp.payload('school', 'Bad', 201)));
  if r not like '%seats_maximum%' then raise exception 'FAIL 201 seats accepted: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)', pg_temp.payload('school', 'Bad', 5, '{"billing_mode":"member_pays"}')));
  if r not like '%member_pays_unavailable%' then raise exception 'FAIL member_pays accepted: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)', pg_temp.payload('school', 'Bad', 5, '{"accepted":false}')));
  if r not like '%agreement_required%' then raise exception 'FAIL unticked agreement accepted: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)', pg_temp.payload('school', 'Bad', 5, '{"typed_name":""}')));
  if r not like '%typed_name_required%' then raise exception 'FAIL no typed name accepted: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)',
         pg_temp.payload('school', 'Bad', 5, jsonb_build_object('agreement_sha256', repeat('a', 64)))));
  if r not like '%agreement_mismatch%' then raise exception 'FAIL an agreement text we never published was accepted: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)', pg_temp.payload('club', 'Bad', 5)));
  if r not like '%bad_kind%' then raise exception 'FAIL kind club accepted: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)', pg_temp.payload('school', 'Bad', 5, '{"seat_cap":300}')));
  if r not like '%bad_seat_cap%' then raise exception 'FAIL seat cap 300 accepted: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)',
         pg_temp.payload('school', 'Bad', 5, jsonb_build_object('ends_on', (current_date - 2)::text, 'starts_on', (current_date - 10)::text))));
  if r not like '%bad_dates%' then raise exception 'FAIL an end date in the past accepted: %', r; end if;
  raise notice 'PASS create refuses <5 or >200 seats, member-pays, no agreement, wrong text, bad kind/cap/dates';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000078', true);
set local role authenticated;
do $$
declare r text;
begin
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)', pg_temp.payload('church', 'Guest', 5)));
  if r not like '%guest_account%' then raise exception 'FAIL a guest created a class: %', r; end if;
  if (public.groups_status() ->> 'groups_enabled')::boolean then raise exception 'FAIL guest sees groups'; end if;
  raise notice 'PASS guests cannot create and do not see groups';
end $$;
reset role;


-- ------------------------------------------------ 5. create: A (school), B (church)
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.create_group_class(pg_temp.payload('school', 'Bible 101', 5,
         jsonb_build_object('ends_on', (current_date + 120)::text)));
  insert into t47 values ('classA', j ->> 'class_id'), ('orgA', j ->> 'org_id'), ('codeA', j ->> 'join_code');
  if (j ->> 'join_code') !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'FAIL join code shape %', j ->> 'join_code';
  end if;
  if (select count(*) from public.classes) <> 1 then raise exception 'FAIL teacher should see exactly their class'; end if;
  if (select status from public.classes where id = (j ->> 'class_id')::uuid) <> 'draft' then
    raise exception 'FAIL a new class must be draft until paid';
  end if;
  if (select count(*) from public.class_agreements where class_id = (j ->> 'class_id')::uuid) <> 1 then
    raise exception 'FAIL the agreement was not recorded';
  end if;
end $$;
reset role;

do $$ begin
  if (select kind from public.churches where id = (select v::uuid from t47 where k='orgA')) <> 'school' then
    raise exception 'FAIL org kind should be school';
  end if;
  if (select open_join from public.churches where id = (select v::uuid from t47 where k='orgA')) then
    raise exception 'FAIL a class org must not be open_join';
  end if;
  if not public.church_role_at_least((select v::uuid from t47 where k='orgA'), 'admin', '00000000-0000-4000-8000-000000000071') then
    raise exception 'FAIL the teacher should be the org''s admin';
  end if;
  if (select scores_visible from public.classes where id = (select v::uuid from t47 where k='classA')) is not true then
    raise exception 'FAIL school classes show scores by default';
  end if;
  if (select typed_name from public.class_agreements where class_id = (select v::uuid from t47 where k='classA')) <> 'Test Person' then
    raise exception 'FAIL typed name not stored';
  end if;
  raise notice 'PASS create: school org (not open_join, teacher is admin), draft class, owner, agreement row';
end $$;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000072');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.create_group_class(pg_temp.payload('church', 'Tuesday Study', 6));
  insert into t47 values ('classB', j ->> 'class_id'), ('orgB', j ->> 'org_id'), ('codeB', j ->> 'join_code');
end $$;
reset role;
do $$ begin
  if (select scores_visible from public.classes where id = (select v::uuid from t47 where k='classB')) then
    raise exception 'FAIL church groups hide scores by default';
  end if;
  raise notice 'PASS create: church group hides scores by default';
end $$;

-- Org reuse: B cannot attach a class to A's org; A can (and the 3/day limit holds).
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000072');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)',
         pg_temp.payload('school', 'Hijack', 5, jsonb_build_object('org_id', (select v from t47 where k='orgA')))));
  if r not like '%not_org_admin%' then raise exception 'FAIL B attached a class to A''s org: %', r; end if;
  raise notice 'PASS a leader cannot create a class under someone else''s organisation';
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)',
         pg_temp.payload('school', 'Second', 5, '{"org_name":""}')));
  if r not like '%org_name_required%' then raise exception 'FAIL expected org name required: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)',
         pg_temp.payload('school', 'Second org same day', 5)));
  if r not like '%org_rate_limited%' then raise exception 'FAIL second org in a day: %', r; end if;
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)',
         pg_temp.payload('church', 'Wrong kind', 5, jsonb_build_object('org_id', (select v from t47 where k='orgA')))));
  if r not like '%bad_org%' then raise exception 'FAIL a church group under a school org: %', r; end if;
  perform public.create_group_class(pg_temp.payload('school', 'Bible 102', 5, jsonb_build_object('org_id', (select v from t47 where k='orgA'))));
  perform public.create_group_class(pg_temp.payload('school', 'Bible 103', 5, jsonb_build_object('org_id', (select v from t47 where k='orgA'))));
  r := public.t047_try(format('select public.create_group_class(%L::jsonb)',
         pg_temp.payload('school', 'Bible 104', 5, jsonb_build_object('org_id', (select v from t47 where k='orgA')))));
  if r not like '%class_rate_limited%' then raise exception 'FAIL a 4th class in a day: %', r; end if;
  raise notice 'PASS org reuse by its admin, one org/day, kind must match, 3 classes/day';
end $$;
reset role;


-- ------------------------------------------------ 6. joining a class that is not paid for
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000073');
set local role authenticated;
do $$ begin
  if (public.join_class((select v from t47 where k='codeA')) ->> 'error') <> 'not_found' then
    raise exception 'FAIL joined a draft (unpaid) class';
  end if;
  raise notice 'PASS a draft class cannot be joined';
end $$;
reset role;


-- ------------------------------------------------ 7. the webhook: A's class is paid
select pg_temp.become('service_role', null);
set local role service_role;
do $$
declare
  j jsonb;
  pe bigint := extract(epoch from now() + interval '30 days')::bigint;
begin
  insert into t47 values ('pe', pe::text);
  j := public.group_apply_subscription_event('evt_g1', 'customer.subscription.created', now() - interval '1 hour', false,
         (select v::uuid from t47 where k='classA'), '00000000-0000-4000-8000-000000000071', 'cus_A',
         jsonb_build_object('id','sub_A','customer','cus_A','status','active','price_id','price_group_m','interval','month',
                            'current_period_end', pe, 'cancel_at', null, 'cancel_at_period_end', false, 'quantity', 5));
  if j ->> 'outcome' <> 'applied' then raise exception 'FAIL first event outcome %', j; end if;
  if (j ->> 'cancel_at_wanted') is null then raise exception 'FAIL a class with an end date should ask for cancel_at'; end if;
  insert into t47 values ('want', j ->> 'cancel_at_wanted');
  j := public.group_apply_subscription_event('evt_g1', 'customer.subscription.created', now() - interval '1 hour', false,
         (select v::uuid from t47 where k='classA'), '00000000-0000-4000-8000-000000000071', 'cus_A',
         jsonb_build_object('id','sub_A','customer','cus_A','status','active','quantity',5,'current_period_end',pe));
  if j ->> 'outcome' <> 'duplicate' then raise exception 'FAIL a repeated event id must be a duplicate: %', j; end if;
  j := public.group_apply_subscription_event('evt_g0', 'customer.subscription.updated', now() - interval '2 hours', false,
         (select v::uuid from t47 where k='classA'), '00000000-0000-4000-8000-000000000071', 'cus_A',
         jsonb_build_object('id','sub_A','customer','cus_A','status','canceled','quantity',5,'current_period_end',pe));
  if j ->> 'outcome' <> 'stale' then raise exception 'FAIL an older event must be stale: %', j; end if;
end $$;
reset role;

do $$
declare
  c record;
  e record;
begin
  select * into c from public.classes where id = (select v::uuid from t47 where k='classA');
  if c.status <> 'active' or c.seats_purchased <> 5 then
    raise exception 'FAIL after payment class should be active with 5 seats (%, %)', c.status, c.seats_purchased;
  end if;
  if (select status from public.class_billing where class_id = c.id) <> 'active' then
    raise exception 'FAIL the stale canceled event overwrote billing';
  end if;
  if (select v::bigint from t47 where k='want') <> extract(epoch from public.class_end_ts(c.ends_on, c.time_zone))::bigint then
    raise exception 'FAIL cancel_at_wanted is not the end of the class''s last day';
  end if;
  select * into e from public.entitlements where user_id = '00000000-0000-4000-8000-000000000071' and source = 'group';
  if e.user_id is null then raise exception 'FAIL the teacher''s own Plus (group) was not granted'; end if;
  raise notice 'PASS webhook: applied, duplicate, stale; class active with 5 seats; teacher gets group Plus; cancel_at = class end';
end $$;

-- From here, Plus is not free for everyone, so has_entitlement means something.
update public.app_settings set value = 'false'::jsonb where key = 'paid.everyone_has_plus';


-- ------------------------------------------------ 8. students join; seats run out
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000073');
set local role authenticated;
do $$
declare j jsonb;
begin
  if public.has_entitlement('plus') then raise exception 'FAIL S1 has Plus before joining'; end if;
  -- lower case and a dash: the code is normalised
  j := public.join_class(lower(substr((select v from t47 where k='codeA'), 1, 3)) || '-' || substr((select v from t47 where k='codeA'), 4));
  if not (j ->> 'ok')::boolean then raise exception 'FAIL S1 could not join: %', j; end if;
  if not public.has_entitlement('plus') then raise exception 'FAIL S1 has no Plus after joining'; end if;
  j := public.join_class((select v from t47 where k='codeA'));
  if not (j ->> 'already')::boolean then raise exception 'FAIL a second join should be a no-op: %', j; end if;
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000074');
set local role authenticated;
do $$ begin
  if not (public.join_class((select v from t47 where k='codeA')) ->> 'ok')::boolean then raise exception 'FAIL S2 could not join'; end if;
end $$;
reset role;

-- Three fillers take the remaining seats (5 purchased).
insert into public.class_members (class_id, user_id)
select (select v::uuid from t47 where k='classA'), u
  from unnest(array['00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000082',
                    '00000000-0000-4000-8000-000000000083']::uuid[]) u;
select public.group_sync_class((select v::uuid from t47 where k='classA'));

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000079');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.join_class((select v from t47 where k='codeA'));
  if (j ->> 'error') is distinct from 'full' then raise exception 'FAIL a 6th person joined a 5-seat class: %', j; end if;
  if public.has_entitlement('plus') then raise exception 'FAIL a refused joiner has Plus'; end if;
  raise notice 'PASS join: code normalised, idempotent, Plus granted, refused when seats are full';
end $$;
reset role;

do $$
declare e record; c record;
begin
  select * into c from public.classes where id = (select v::uuid from t47 where k='classA');
  select * into e from public.entitlements where user_id = '00000000-0000-4000-8000-000000000073' and source = 'group';
  if e.expires_at <> to_timestamp((select v::bigint from t47 where k='pe')) then
    raise exception 'FAIL member Plus should run to the period end (%)', e.expires_at;
  end if;
  if e.grace_until > public.class_end_ts(c.ends_on, c.time_zone) then
    raise exception 'FAIL grace runs past the class end';
  end if;
  raise notice 'PASS member Plus expires at the period end, never past the class end';
end $$;


-- ------------------------------------------------ 8b. nobody can probe ANOTHER person's membership
-- The role helpers are self-only. Catalog: no class/org helper that takes a
-- user id exists, or (if one ever comes back) is executable by a client role.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('is_class_staff', 'is_class_owner', 'is_class_member', 'can_view_org_logo')
       and p.pronargs <> 1
  loop
    raise exception 'FAIL a membership helper takes more than the class/org id: %', r.sig;
  end loop;
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('is_class_staff', 'is_class_owner', 'is_class_member', 'can_view_org_logo')
  loop
    if has_function_privilege('anon', r.sig, 'execute') then
      raise exception 'FAIL anon can execute %', r.sig;
    end if;
  end loop;
  raise notice 'PASS membership helpers take no user id and anon cannot call them';
end $$;

-- Behaviour: the outsider O, knowing S1's id, the class id and the org id,
-- learns nothing; S1 and teacher A get true about THEMSELVES only.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000075');
set local role authenticated;
do $$
declare
  v_class uuid := (select v::uuid from t47 where k='classA');
  v_org   uuid := (select v::uuid from t47 where k='orgA');
  r text;
begin
  r := public.t047_try(format('select public.is_class_member(%L::uuid, %L::uuid)', v_class, '00000000-0000-4000-8000-000000000073'));
  if r = 'ok' then raise exception 'FAIL an outsider can ask whether S1 is in class A'; end if;
  r := public.t047_try(format('select public.is_class_staff(%L::uuid, %L::uuid)', v_class, '00000000-0000-4000-8000-000000000071'));
  if r = 'ok' then raise exception 'FAIL an outsider can ask whether A teaches class A'; end if;
  r := public.t047_try(format('select public.is_class_owner(%L::uuid, %L::uuid)', v_class, '00000000-0000-4000-8000-000000000071'));
  if r = 'ok' then raise exception 'FAIL an outsider can ask whether A owns class A'; end if;
  r := public.t047_try(format('select public.can_view_org_logo(%L::uuid, %L::uuid)', v_org, '00000000-0000-4000-8000-000000000073'));
  if r = 'ok' then raise exception 'FAIL an outsider can ask whether S1 is linked to org A'; end if;
  if public.church_role_at_least(v_org, 'admin', '00000000-0000-4000-8000-000000000071') then
    raise exception 'FAIL church_role_at_least answers about another account';
  end if;
  if public.church_role_at_least(v_org, 'member', '00000000-0000-4000-8000-000000000073') then
    raise exception 'FAIL church_role_at_least answers about another account (member)';
  end if;
  if public.is_class_member(v_class) or public.is_class_staff(v_class) or public.is_class_owner(v_class)
     or public.can_view_org_logo(v_org) then
    raise exception 'FAIL the outsider is reported as in the class';
  end if;
  raise notice 'PASS an outsider who knows the UUIDs cannot probe who is in a class or an org';
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000073');
set local role authenticated;
do $$
declare
  v_class uuid := (select v::uuid from t47 where k='classA');
begin
  if not public.is_class_member(v_class) then raise exception 'FAIL S1 is not a member of class A by the helper'; end if;
  if public.is_class_staff(v_class) then raise exception 'FAIL S1 is reported as staff'; end if;
  if not public.can_view_org_logo((select v::uuid from t47 where k='orgA')) then raise exception 'FAIL S1 cannot view its org logo'; end if;
  if public.church_role_at_least((select v::uuid from t47 where k='orgA'), 'admin', '00000000-0000-4000-8000-000000000071') then
    raise exception 'FAIL a student can ask whether the teacher is the org admin';
  end if;
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$
declare
  v_class uuid := (select v::uuid from t47 where k='classA');
begin
  if not (public.is_class_staff(v_class) and public.is_class_owner(v_class)) then raise exception 'FAIL A is not owner by the helper'; end if;
  if public.is_class_member(v_class) then raise exception 'FAIL A is reported as a member'; end if;
  if not public.church_role_at_least((select v::uuid from t47 where k='orgA'), 'admin') then
    raise exception 'FAIL A is not admin of its own org by the 2-arg call';
  end if;
  raise notice 'PASS the helpers still answer correctly about the caller';
end $$;
reset role;


-- ------------------------------------------------ 9. what a STUDENT can see
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000073');
set local role authenticated;
do $$
declare
  j jsonb;
  r text;
begin
  if (select count(*) from public.class_members) <> 1 then
    raise exception 'FAIL a student sees % class_members rows (only their own allowed)', (select count(*) from public.class_members);
  end if;
  if (select count(*) from public.class_members where user_id <> '00000000-0000-4000-8000-000000000073') <> 0 then
    raise exception 'FAIL a student sees a classmate';
  end if;
  if (select count(*) from public.classes) <> 0 then raise exception 'FAIL a student reads the classes table directly'; end if;
  if (select count(*) from public.class_staff) <> 0 then raise exception 'FAIL a student reads class_staff'; end if;
  if (select count(*) from public.class_billing) <> 0 then raise exception 'FAIL a student reads billing'; end if;
  if (select count(*) from public.class_agreements) <> 0 then raise exception 'FAIL a student reads the agreement'; end if;
  if (select count(*) from public.class_invites) <> 0 then raise exception 'FAIL a student reads invites'; end if;
  if (select count(*) from public.churches) <> 0 then raise exception 'FAIL a student reads the org''s address/phone'; end if;
  if (select count(*) from public.entitlements where user_id <> '00000000-0000-4000-8000-000000000073') <> 0 then
    raise exception 'FAIL a student reads another account''s entitlements';
  end if;

  j := public.my_classes();
  if jsonb_array_length(j) <> 1 or j -> 0 ->> 'role' <> 'member' then raise exception 'FAIL my_classes for a student: %', j; end if;
  if (j -> 0) ? 'seats_used' or (j -> 0) ? 'join_code' or (j -> 0) ? 'seats_purchased' or (j -> 0) ? 'billing_status' then
    raise exception 'FAIL my_classes leaks staff fields to a student: %', j;
  end if;
  if j -> 0 ->> 'leader_name' <> 'Teacher A' or j -> 0 ->> 'org_name' <> 'Bible 101 Org' then
    raise exception 'FAIL my_classes should name the teacher and org: %', j;
  end if;

  r := public.t047_try(format('select * from public.class_roster(%L)', (select v from t47 where k='classA')));
  if r not like '42501%' then raise exception 'FAIL a student read the roster: %', r; end if;
  r := public.t047_try(format('select public.remove_class_member(%L, %L)', (select v from t47 where k='classA'),
                              '00000000-0000-4000-8000-000000000074'));
  if r not like '42501%' then raise exception 'FAIL a student removed a classmate: %', r; end if;
  r := public.t047_try('select public.group_sync_entitlement(''00000000-0000-4000-8000-000000000073'')');
  if r not like '42501%' then raise exception 'FAIL a student called the service-role sync: %', r; end if;
  r := public.t047_try(format('select public.group_apply_subscription_event(''evt_x'',''t'',now(),false,%L,null,''cus_x'',''{"id":"sub_x","status":"active","quantity":200}''::jsonb)',
                              (select v from t47 where k='classA')));
  if r not like '42501%' then raise exception 'FAIL a student called the webhook write path: %', r; end if;
  r := public.t047_try(format('update public.class_members set seat_state = ''active'' where class_id = %L', (select v from t47 where k='classA')));
  if r not like '42501%' then raise exception 'FAIL a student could UPDATE class_members: %', r; end if;
  r := public.t047_try(format('insert into public.class_members (class_id, user_id) values (%L, %L)',
                              (select v from t47 where k='classB'), '00000000-0000-4000-8000-000000000073'));
  if r not like '42501%' then raise exception 'FAIL a student could INSERT a membership: %', r; end if;
  raise notice 'PASS student: own row only; no roster, classmates, billing, agreement, invites, org address; no writes';
end $$;
reset role;


-- ------------------------------------------------ 10. what an OUTSIDER can see
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000075');
set local role authenticated;
do $$
declare r text; j jsonb;
begin
  if (select count(*) from public.classes) + (select count(*) from public.class_members) + (select count(*) from public.class_staff)
     + (select count(*) from public.class_billing) + (select count(*) from public.class_agreements)
     + (select count(*) from public.class_invites) <> 0 then
    raise exception 'FAIL an outsider sees class data';
  end if;
  if public.my_classes() <> '[]'::jsonb then raise exception 'FAIL outsider my_classes not empty'; end if;
  r := public.t047_try(format('select * from public.class_roster(%L)', (select v from t47 where k='classA')));
  if r not like '42501%' then raise exception 'FAIL an outsider read the roster: %', r; end if;
  j := public.join_class('ZZZZZZ');
  if j ->> 'error' <> 'not_found' then raise exception 'FAIL wrong code: %', j; end if;
  -- the join-code rate limit: 20 attempts an hour
  for i in 1..19 loop perform public.join_class('ZZZZZZ'); end loop;
  j := public.join_class((select v from t47 where k='codeA'));
  if j ->> 'error' <> 'rate_limited' then raise exception 'FAIL 21st attempt was not rate limited: %', j; end if;
  raise notice 'PASS outsider: sees nothing, roster refused, wrong code not_found, 20 guesses/hour';
end $$;
reset role;


-- ------------------------------------------------ 11. what the TEACHER can see: own class only
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$
declare r text; j jsonb;
begin
  if (select count(*) from public.class_roster((select v::uuid from t47 where k='classA'))) <> 5 then
    raise exception 'FAIL teacher roster should list 5';
  end if;
  if (select count(*) from public.class_members where class_id = (select v::uuid from t47 where k='classA')) <> 5 then
    raise exception 'FAIL teacher should read the 5 members of their class';
  end if;
  if (select count(*) from public.class_billing) <> 1 then raise exception 'FAIL owner should see their billing row'; end if;
  if (select count(*) from public.classes where id = (select v::uuid from t47 where k='classB')) <> 0 then
    raise exception 'FAIL teacher A sees leader B''s class';
  end if;
  if (select count(*) from public.class_members where class_id = (select v::uuid from t47 where k='classB')) <> 0 then
    raise exception 'FAIL teacher A sees leader B''s members';
  end if;
  r := public.t047_try(format('select * from public.class_roster(%L)', (select v from t47 where k='classB')));
  if r not like '42501%' then raise exception 'FAIL teacher A read B''s roster: %', r; end if;
  j := public.my_classes();
  if not exists (select 1 from jsonb_array_elements(j) x where x ->> 'class_id' = (select v from t47 where k='classA')
                  and (x ->> 'seats_used')::int = 5 and x ->> 'join_code' = (select v from t47 where k='codeA')
                  and x ->> 'billing_status' = 'active') then
    raise exception 'FAIL teacher my_classes lacks staff fields: %', j;
  end if;
  if exists (select 1 from jsonb_array_elements(j) x where x ->> 'class_id' = (select v from t47 where k='classB')) then
    raise exception 'FAIL teacher A''s my_classes lists B''s class';
  end if;
  r := public.t047_try(format('update public.churches set kind = ''church'' where id = %L', (select v from t47 where k='orgA')));
  if r not like '42501%' then raise exception 'FAIL an org admin changed the org kind: %', r; end if;
  raise notice 'PASS teacher: own roster, members, billing; nothing of another class; cannot change org kind';
end $$;
reset role;

-- The app owner: classes + billing for support, never the roster.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000076');
set local role authenticated;
do $$ begin
  if (select count(*) from public.classes) < 2 then raise exception 'FAIL app owner should see classes'; end if;
  if (select count(*) from public.class_members) <> 0 then raise exception 'FAIL app owner reads class rosters'; end if;
  raise notice 'PASS app owner: classes and billing for support, no rosters';
end $$;
reset role;


-- ------------------------------------------------ 12. storage: org logos
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t047_try(format('insert into storage.objects (bucket_id, name) values (''org-logos'', %L)',
                              (select v from t47 where k='orgA') || '/logo.webp'));
  if r <> 'ok' then raise exception 'FAIL org admin could not upload the logo: %', r; end if;
  r := public.t047_try(format('insert into storage.objects (bucket_id, name) values (''org-logos'', %L)',
                              (select v from t47 where k='orgB') || '/logo.webp'));
  if r not like '42501%' then raise exception 'FAIL A uploaded into B''s org folder: %', r; end if;
  r := public.t047_try('insert into storage.objects (bucket_id, name) values (''org-logos'', ''not-a-uuid/logo.webp'')');
  if r not like '42501%' then raise exception 'FAIL a malformed path was accepted: %', r; end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000073');
set local role authenticated;
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'org-logos') <> 1 then
    raise exception 'FAIL a class member should see their org''s logo';
  end if;
  if public.t047_try(format('insert into storage.objects (bucket_id, name) values (''org-logos'', %L)',
                            (select v from t47 where k='orgA') || '/x.webp')) not like '42501%' then
    raise exception 'FAIL a student uploaded a logo';
  end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000075');
set local role authenticated;
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'org-logos') <> 0 then
    raise exception 'FAIL an outsider sees an org logo';
  end if;
  raise notice 'PASS logos: org admin uploads to own org only; class members view; outsiders nothing';
end $$;
reset role;
do $$ begin
  if not exists (select 1 from storage.buckets where id = 'org-logos' and not public
                 and file_size_limit = 2097152 and not ('image/svg+xml' = any (allowed_mime_types))) then
    raise exception 'FAIL org-logos bucket must be private, 2 MB, no SVG';
  end if;
end $$;


-- ------------------------------------------------ 13. leave and remove
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000074');
set local role authenticated;
do $$ begin
  perform public.leave_class((select v::uuid from t47 where k='classA'));
  if public.has_entitlement('plus') then raise exception 'FAIL S2 kept Plus after leaving'; end if;
  if public.my_classes() <> '[]'::jsonb then raise exception 'FAIL S2 still lists the class'; end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000071');
set local role authenticated;
do $$ begin
  perform public.remove_class_member((select v::uuid from t47 where k='classA'), '00000000-0000-4000-8000-000000000081');
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.entitlements where user_id in ('00000000-0000-4000-8000-000000000074',
             '00000000-0000-4000-8000-000000000081') and source = 'group') then
    raise exception 'FAIL left/removed members keep the group entitlement';
  end if;
  raise notice 'PASS leave and remove free the seat and remove Plus';
end $$;

-- L can join now that seats are free.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000079');
set local role authenticated;
do $$ begin
  if not (public.join_class((select v from t47 where k='codeA')) ->> 'ok')::boolean then
    raise exception 'FAIL a freed seat could not be taken';
  end if;
  raise notice 'PASS a freed seat can be taken';
end $$;
reset role;


-- ------------------------------------------------ 14. webhook edge cases
select pg_temp.become('service_role', null);
set local role service_role;
do $$
declare j jsonb; r text;
begin
  -- a second live subscription for the same class is NOT applied
  j := public.group_apply_subscription_event('evt_g2', 'customer.subscription.created', now(), false,
         (select v::uuid from t47 where k='classA'), '00000000-0000-4000-8000-000000000071', 'cus_A',
         jsonb_build_object('id','sub_A2','customer','cus_A','status','active','quantity',50,
                            'current_period_end', extract(epoch from now() + interval '30 days')::bigint));
  if j ->> 'outcome' <> 'second_subscription' then raise exception 'FAIL second subscription: %', j; end if;
  -- a subscription already attached to class A cannot be applied to class B
  r := public.t047_try(format('select public.group_apply_subscription_event(''evt_g3'',''customer.subscription.updated'',now(),false,%L,null,''cus_A'',''{"id":"sub_A","status":"active","quantity":5}''::jsonb)',
                              (select v from t47 where k='classB')));
  if r not like '42501%' then raise exception 'FAIL a subscription moved classes: %', r; end if;
  -- unknown class: recorded, not retried
  j := public.group_apply_subscription_event('evt_g4', 'customer.subscription.updated', now(), false,
         gen_random_uuid(), null, 'cus_Z', '{"id":"sub_Z","status":"active","quantity":5}'::jsonb);
  if j ->> 'outcome' <> 'class_missing' then raise exception 'FAIL unknown class: %', j; end if;
  -- add seats (quantity 8) and a renewal far past the class end: Plus is capped at the class end
  j := public.group_apply_subscription_event('evt_g5', 'customer.subscription.updated', now(), false,
         (select v::uuid from t47 where k='classA'), '00000000-0000-4000-8000-000000000071', 'cus_A',
         jsonb_build_object('id','sub_A','customer','cus_A','status','active','quantity',8,
                            'current_period_end', extract(epoch from now() + interval '365 days')::bigint));
  if j ->> 'outcome' <> 'applied' then raise exception 'FAIL add seats: %', j; end if;
end $$;
reset role;
do $$
declare c record;
begin
  select * into c from public.classes where id = (select v::uuid from t47 where k='classA');
  if c.seats_purchased <> 8 then raise exception 'FAIL seats_purchased should follow quantity (got %)', c.seats_purchased; end if;
  if (select expires_at from public.entitlements where user_id = '00000000-0000-4000-8000-000000000073' and source = 'group')
     <> public.class_end_ts(c.ends_on, c.time_zone) then
    raise exception 'FAIL Plus must stop at the class end';
  end if;
  if (select count(*) from public.class_billing where subscription_id = 'sub_A2') <> 0 then
    raise exception 'FAIL the second subscription was stored';
  end if;
  raise notice 'PASS webhook: second subscription refused, no class moves, unknown class recorded, seats follow quantity, Plus capped at class end';
end $$;


-- ------------------------------------------------ 15. account deletion
-- C becomes A's co-teacher (phase 3 will add the RPC; here as the db owner).
insert into public.class_staff (class_id, user_id, role)
values ((select v::uuid from t47 where k='classA'), '00000000-0000-4000-8000-000000000077', 'co_teacher');

do $$
declare n int;
begin
  -- a student
  delete from auth.users where id = '00000000-0000-4000-8000-000000000073';
  if exists (select 1 from public.class_members where user_id = '00000000-0000-4000-8000-000000000073')
     or exists (select 1 from public.entitlements where user_id = '00000000-0000-4000-8000-000000000073')
     or exists (select 1 from public.class_join_attempts where user_id = '00000000-0000-4000-8000-000000000073') then
    raise exception 'FAIL a deleted student left rows behind';
  end if;

  -- the teacher, with a co-teacher: ownership passes, the class carries on
  delete from auth.users where id = '00000000-0000-4000-8000-000000000071';
  if (select role from public.class_staff where class_id = (select v::uuid from t47 where k='classA')
        and user_id = '00000000-0000-4000-8000-000000000077') <> 'owner' then
    raise exception 'FAIL ownership did not pass to the co-teacher';
  end if;
  if (select status from public.classes where id = (select v::uuid from t47 where k='classA')) <> 'active' then
    raise exception 'FAIL the class should carry on under the co-teacher';
  end if;
  if (select created_by from public.classes where id = (select v::uuid from t47 where k='classA')) is not null
     or (select payer_user_id from public.class_billing where class_id = (select v::uuid from t47 where k='classA')) is not null then
    raise exception 'FAIL created_by / payer should be set null';
  end if;
  select count(*) into n from public.class_agreements where user_id = '00000000-0000-4000-8000-000000000071';
  if n < 1 then raise exception 'FAIL the agreement record must outlive the account'; end if;

  -- the leader with no co-teacher: the class ends
  delete from auth.users where id = '00000000-0000-4000-8000-000000000072';
  if (select status from public.classes where id = (select v::uuid from t47 where k='classB')) <> 'ended' then
    raise exception 'FAIL a class with no owner left should end';
  end if;
  raise notice 'PASS deletion: student rows cascade; teacher (sole org admin) deletes cleanly, co-teacher becomes owner; no owner -> class ends; agreement survives';
end $$;


-- ------------------------------------------------ 16. the subscription ends
select pg_temp.become('service_role', null);
set local role service_role;
do $$ begin
  perform public.group_apply_subscription_event('evt_g6', 'customer.subscription.deleted', now() + interval '1 minute', false,
         (select v::uuid from t47 where k='classA'), null, 'cus_A',
         jsonb_build_object('id','sub_A','customer','cus_A','status','canceled','quantity',8,
                            'current_period_end', extract(epoch from now() + interval '365 days')::bigint));
end $$;
reset role;
do $$ begin
  if (select status from public.classes where id = (select v::uuid from t47 where k='classA')) <> 'ended' then
    raise exception 'FAIL a canceled subscription should end the class';
  end if;
  if exists (select 1 from public.entitlements where source = 'group') then
    raise exception 'FAIL group entitlements survive a canceled subscription';
  end if;
  raise notice 'PASS canceled subscription ends the class and removes every group entitlement';
end $$;

do $$ begin raise notice 'ALL 047 CHECKS PASSED'; end $$;

rollback;

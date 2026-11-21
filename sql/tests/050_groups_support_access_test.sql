-- ============================================================================
-- sql/tests/050_groups_support_access_test.sql — PROVES THE RULES OF sql/050.
-- Local: node scripts/groups/support-rls-test.mjs --local [--mutations]
-- NEVER against production. One transaction, ends in ROLLBACK.
-- Last notice: "ALL 050 CHECKS PASSED".
-- ============================================================================

begin;

--   ...b1 app owner   ...b2 administrator (not owner)   ...b3 teacher T (class owner)
--   ...b4 co-teacher C   ...b5 student S   ...b6 outsider O
insert into auth.users (id, email, is_anonymous, email_confirmed_at) values
  ('00000000-0000-4000-8000-0000000000b1', 'own50@test.invalid', false, now()),
  ('00000000-0000-4000-8000-0000000000b2', 'adm50@test.invalid', false, now()),
  ('00000000-0000-4000-8000-0000000000b3', 't50@test.invalid', false, now()),
  ('00000000-0000-4000-8000-0000000000b4', 'c50@test.invalid', false, now()),
  ('00000000-0000-4000-8000-0000000000b5', 's50@test.invalid', false, now()),
  ('00000000-0000-4000-8000-0000000000b6', 'o50@test.invalid', false, now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-0000000000b3', 'Teacher Fifty'), ('00000000-0000-4000-8000-0000000000b5', 'Student Fifty');
insert into public.user_roles (user_id, role, note) values
  ('00000000-0000-4000-8000-0000000000b1', 'owner', '050 test'), ('00000000-0000-4000-8000-0000000000b2', 'administrator', '050 test');

create or replace function pg_temp.become(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  perform set_config('request.jwt.claim.sub', p_uid, true);
end $$;
create or replace function public.t050_try(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate || ' ' || sqlerrm;
end $$;
grant execute on function public.t050_try(text) to authenticated;
create temp table t50 (k text primary key, v text);
grant select on t50 to authenticated;

do $$
declare v_org uuid; v_a uuid; v_b uuid;
begin
  insert into public.churches (kind, name, open_join, created_by) values ('school', 'Fiftieth Academy', false, '00000000-0000-4000-8000-0000000000b3') returning id into v_org;
  insert into public.classes (org_id, kind, name, seat_cap, seats_requested, seats_purchased, status, join_code, scores_visible, created_by)
  values (v_org, 'school', 'Support Class', 50, 5, 5, 'active', 'SSSSS2', true, '00000000-0000-4000-8000-0000000000b3') returning id into v_a;
  insert into public.classes (org_id, kind, name, seat_cap, seats_requested, seats_purchased, status, join_code, scores_visible, created_by)
  values (v_org, 'school', 'Other Class', 50, 5, 5, 'active', 'SSSSS3', true, '00000000-0000-4000-8000-0000000000b3') returning id into v_b;
  insert into public.class_staff (class_id, user_id, role) values
    (v_a, '00000000-0000-4000-8000-0000000000b3', 'owner'), (v_a, '00000000-0000-4000-8000-0000000000b4', 'co_teacher'),
    (v_b, '00000000-0000-4000-8000-0000000000b3', 'owner');
  insert into public.class_members (class_id, user_id) values (v_a, '00000000-0000-4000-8000-0000000000b5');
  insert into public.class_invites (class_id, channel, address, address_hash, status, invited_by)
  values (v_a, 'email', 'ruth@example.com', public.invite_addr_hash('ruth@example.com'), 'pending', '00000000-0000-4000-8000-0000000000b3');
  insert into t50 values ('A', v_a), ('B', v_b);
end $$;


-- ------------------------------------------------ 1. grants
do $$
declare f text;
begin
  foreach f in array array['owner_support_find_classes(text, text)','owner_support_roster(uuid, text)','owner_support_gradebook(uuid, text)',
                           'grant_support_access(uuid, integer)','revoke_support_access(uuid)','class_support_log(uuid)'] loop
    if has_function_privilege('anon', 'public.' || f, 'execute') then raise exception 'FAIL anon can execute %', f; end if;
  end loop;
  if has_function_privilege('authenticated', 'public.support_gate(text)', 'execute') then raise exception 'FAIL support_gate is client-callable'; end if;
  if has_table_privilege('authenticated', 'public.class_support_access_log', 'select') or has_table_privilege('authenticated', 'public.class_support_grants', 'select')
     or has_table_privilege('authenticated', 'public.class_support_access_log', 'insert') or has_table_privilege('authenticated', 'public.class_support_access_log', 'delete') then
    raise exception 'FAIL a client role can touch the support tables directly';
  end if;
  -- 047's rule stands for TABLES: the owner still has no direct read of the roster.
  perform pg_temp.become('00000000-0000-4000-8000-0000000000b1');
  set local role authenticated;
  if exists (select 1 from public.class_members) or exists (select 1 from public.class_invites) then
    raise exception 'FAIL the app owner reads class_members / class_invites directly';
  end if;
  reset role;
  raise notice 'PASS grants: support tables closed; owner has no direct table read of rosters';
end $$;


-- ------------------------------------------------ 2. not the owner: refused, nothing logged
do $$
declare u text; r text;
begin
  foreach u in array array['00000000-0000-4000-8000-0000000000b2','00000000-0000-4000-8000-0000000000b3',
                           '00000000-0000-4000-8000-0000000000b5','00000000-0000-4000-8000-0000000000b6'] loop
    perform pg_temp.become(u);
    set local role authenticated;
    r := public.t050_try(format('select public.owner_support_roster(%L::uuid, %L)', (select v from t50 where k='A'), 'helping the teacher with seats'));
    if r not like '42501%not_owner%' then raise exception 'FAIL % could call owner_support_roster: %', u, r; end if;
    r := public.t050_try(format('select public.owner_support_find_classes(%L, %L)', 'Support', 'helping the teacher with seats'));
    if r not like '42501%not_owner%' then raise exception 'FAIL % could search classes: %', u, r; end if;
    reset role;
  end loop;
  if exists (select 1 from public.class_support_access_log) then raise exception 'FAIL refused calls left log rows'; end if;
  raise notice 'PASS only the app owner (not an administrator, teacher, student or outsider) can look up rosters';
end $$;


-- ------------------------------------------------ 3. owner: reason required, every call logged, narrow data
select pg_temp.become('00000000-0000-4000-8000-0000000000b1');
set local role authenticated;
do $$
declare r text; j jsonb;
begin
  r := public.t050_try(format('select public.owner_support_roster(%L::uuid, null)', (select v from t50 where k='A')));
  if r not like '%reason_required%' then raise exception 'FAIL roster without a reason: %', r; end if;
  r := public.t050_try(format('select public.owner_support_roster(%L::uuid, %L)', (select v from t50 where k='A'), 'short'));
  if r not like '%reason_required%' then raise exception 'FAIL roster with a 5-character reason: %', r; end if;
  r := public.t050_try(format('select public.owner_support_find_classes(%L, %L)', 'Su', 'teacher asked about seats'));
  if r not like '%query_too_short%' then raise exception 'FAIL 2-character search: %', r; end if;

  j := public.owner_support_find_classes('fiftieth', 'teacher asked about seats');
  if jsonb_array_length(j) <> 2 or j::text like '%Student Fifty%' or j::text like '%ruth%' then raise exception 'FAIL search: %', j; end if;

  j := public.owner_support_roster((select v::uuid from t50 where k='A'), 'Teacher reported a missing student');
  if j -> 'members' -> 0 ->> 'display_name' <> 'Student Fifty' or j -> 'staff' -> 0 ->> 'role' <> 'owner'
     or (j -> 'class' ->> 'seats_used')::int <> 1 then
    raise exception 'FAIL roster content: %', j;
  end if;
  if j -> 'invites' -> 0 ->> 'address' <> 'r***@example.com' or j::text like '%ruth@%' then raise exception 'FAIL invite address not masked: %', j -> 'invites'; end if;
  if j::text ~* '(answer|essay|feedback|final_score|submission|user_id|email)' then raise exception 'FAIL roster carries work or ids: %', j; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.class_support_access_log where kind = 'roster' and class_id = (select v::uuid from t50 where k='A')
        and actor = '00000000-0000-4000-8000-0000000000b1' and reason = 'Teacher reported a missing student') <> 1 then
    raise exception 'FAIL the roster lookup was not logged with its reason';
  end if;
  if (select count(*) from public.class_support_access_log where kind = 'search') <> 2 then raise exception 'FAIL search not logged per class'; end if;
  raise notice 'PASS owner: reason required, search is names only, roster has no work and masked invites, every lookup logged';
end $$;


-- ------------------------------------------------ 4. who sees the log
select pg_temp.become('00000000-0000-4000-8000-0000000000b4');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.class_support_log((select v::uuid from t50 where k='A'));
  if not exists (select 1 from jsonb_array_elements(j -> 'entries') e where e ->> 'kind' = 'roster' and e ->> 'reason' = 'Teacher reported a missing student') then
    raise exception 'FAIL the co-teacher cannot see the support access: %', j;
  end if;
  if j::text like '%0000000000b1%' then raise exception 'FAIL the log names the owner''s account id'; end if;
end $$;
reset role;
do $$
declare u text; r text;
begin
  foreach u in array array['00000000-0000-4000-8000-0000000000b5','00000000-0000-4000-8000-0000000000b6'] loop
    perform pg_temp.become(u);
    set local role authenticated;
    r := public.t050_try(format('select public.class_support_log(%L::uuid)', (select v from t50 where k='A')));
    if r not like '42501%' then raise exception 'FAIL % (student/outsider) can read the support log: %', u, r; end if;
    reset role;
  end loop;
  raise notice 'PASS the class staff see every access with its reason; students and outsiders cannot';
end $$;


-- ------------------------------------------------ 5. tier 2: gradebook only with the class owner's live grant
select pg_temp.become('00000000-0000-4000-8000-0000000000b1');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t050_try(format('select public.owner_support_gradebook(%L::uuid, %L)', (select v from t50 where k='A'), 'grades look wrong, teacher asked'));
  if r not like '42501%no_grant%' then raise exception 'FAIL gradebook without a grant: %', r; end if;
end $$;
reset role;
select pg_temp.become('00000000-0000-4000-8000-0000000000b4');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t050_try(format('select public.grant_support_access(%L::uuid, 24)', (select v from t50 where k='A')));
  if r not like '42501%not_class_owner%' then raise exception 'FAIL a co-teacher granted support access: %', r; end if;
end $$;
reset role;
select pg_temp.become('00000000-0000-4000-8000-0000000000b3');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t050_try(format('select public.grant_support_access(%L::uuid, 100)', (select v from t50 where k='A')));
  if r not like '%bad_hours%' then raise exception 'FAIL a 100-hour grant: %', r; end if;
  perform public.grant_support_access((select v::uuid from t50 where k='A'), 24);
end $$;
reset role;
select pg_temp.become('00000000-0000-4000-8000-0000000000b1');
set local role authenticated;
do $$
declare j jsonb; r text;
begin
  j := public.owner_support_gradebook((select v::uuid from t50 where k='A'), 'grades look wrong, teacher asked');
  if not (j ? 'cells' and j ? 'students') or j::text ~* '(answer|essay|feedback|key)' then raise exception 'FAIL gradebook shape: %', j; end if;
  r := public.t050_try(format('select public.owner_support_gradebook(%L::uuid, %L)', (select v from t50 where k='B'), 'grades look wrong, teacher asked'));
  if r not like '42501%no_grant%' then raise exception 'FAIL a grant on class A opened class B: %', r; end if;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.class_support_access_log where kind = 'gradebook') then raise exception 'FAIL gradebook access not logged'; end if;
  update public.class_support_grants set granted_at = now() - interval '25 hours', expires_at = now() - interval '1 hour';
end $$;
select pg_temp.become('00000000-0000-4000-8000-0000000000b1');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t050_try(format('select public.owner_support_gradebook(%L::uuid, %L)', (select v from t50 where k='A'), 'grades look wrong, teacher asked'));
  if r not like '42501%no_grant%' then raise exception 'FAIL an expired grant still works: %', r; end if;
end $$;
reset role;
select pg_temp.become('00000000-0000-4000-8000-0000000000b3');
set local role authenticated;
do $$ begin
  perform public.grant_support_access((select v::uuid from t50 where k='A'), 2);
  perform public.revoke_support_access((select v::uuid from t50 where k='A'));
  if (public.class_support_log((select v::uuid from t50 where k='A')) -> 'grant') is not null and
     (public.class_support_log((select v::uuid from t50 where k='A')) -> 'grant') <> 'null'::jsonb then
    raise exception 'FAIL a revoked grant still shows as live';
  end if;
end $$;
reset role;
select pg_temp.become('00000000-0000-4000-8000-0000000000b1');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t050_try(format('select public.owner_support_gradebook(%L::uuid, %L)', (select v from t50 where k='A'), 'grades look wrong, teacher asked'));
  if r not like '42501%no_grant%' then raise exception 'FAIL a revoked grant still works: %', r; end if;
  raise notice 'PASS tier 2: gradebook only under the class owner''s live grant (1-72h), per class, expires, revocable, logged';
end $$;
reset role;


-- ------------------------------------------------ 6. rate limit
do $$
declare i int; r text;
begin
  insert into public.class_support_access_log (class_id, actor, kind, reason)
  select (select v::uuid from t50 where k='A'), '00000000-0000-4000-8000-0000000000b1', 'roster', 'filler for the rate limit'
    from generate_series(1, 30);
  perform pg_temp.become('00000000-0000-4000-8000-0000000000b1');
  set local role authenticated;
  r := public.t050_try(format('select public.owner_support_roster(%L::uuid, %L)', (select v from t50 where k='A'), 'one more look please'));
  reset role;
  if r not like '%support_rate_limited%' then raise exception 'FAIL no rate limit: %', r; end if;
  raise notice 'PASS 30 support lookups an hour';
end $$;

do $$ begin raise notice 'ALL 050 CHECKS PASSED'; end $$;

rollback;

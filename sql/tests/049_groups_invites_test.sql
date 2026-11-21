-- ============================================================================
-- sql/tests/049_groups_invites_test.sql — PROVES THE RULES OF sql/049.
--
-- Run as the database owner against a database with sql/025, 033, 043, 045,
-- 047, 048 and 049 applied: a STAGING project, or the local rehearsal
--   node scripts/groups/invites-rls-test.mjs --local
--   node scripts/groups/invites-rls-test.mjs --local --mutations
-- NEVER against production: it inserts test accounts into auth.users and flips
-- app_settings. One transaction, ends in ROLLBACK. It sends nothing: there is
-- no network in the database; the mailer is the only sender, and it is not
-- involved here. The reminder schedule is driven by a FAKE CLOCK (p_now).
--
-- Every check RAISEs on failure and NOTICEs "PASS ..." on success. The last
-- notice is "ALL 049 CHECKS PASSED".
-- ============================================================================

begin;

--   ...91 teacher T (confirmed)        ...92 teacher U (email NOT confirmed)
--   ...93 student S (in class A)       ...94 outsider O
--   ...95 existing user E (invited, joins by code)
--   ...96 blocked user X (blocked with T)   ...97 redeemer R (different email)
--   ...98 app owner    ...99 guest    ...a1-a4 fillers
insert into auth.users (id, email, is_anonymous, email_confirmed_at) values
  ('00000000-0000-4000-8000-000000000091', 't49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-000000000092', 'u49@test.invalid', false, null),
  ('00000000-0000-4000-8000-000000000093', 's49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-000000000094', 'o49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-000000000095', 'e49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-000000000096', 'x49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-000000000097', 'r49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-000000000098', 'owner49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-000000000099', null, true, null),
  ('00000000-0000-4000-8000-0000000000a1', 'f1-49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-0000000000a2', 'f2-49@test.invalid', false, now()),
  ('00000000-0000-4000-8000-0000000000a3', 'f3-49@test.invalid', false, now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-000000000091', 'Teacher T'),
  ('00000000-0000-4000-8000-000000000092', 'Teacher U');
insert into public.user_roles (user_id, role, note) values ('00000000-0000-4000-8000-000000000098', 'owner', '049 test');

-- X and T have blocked each other (stand-in for the live function).
create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean language sql stable as $$
  select (a, b) in (('00000000-0000-4000-8000-000000000091'::uuid, '00000000-0000-4000-8000-000000000096'::uuid),
                    ('00000000-0000-4000-8000-000000000096'::uuid, '00000000-0000-4000-8000-000000000091'::uuid))
$$;

create or replace function pg_temp.become(p_role text, p_uid text, p_anon boolean default false) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then json_build_object('role', p_role)::text
         else json_build_object('sub', p_uid, 'role', p_role, 'is_anonymous', p_anon)::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
end $$;

create or replace function public.t049_try(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate || ' ' || sqlerrm;
end $$;
grant execute on function public.t049_try(text) to anon, authenticated, service_role;

create temp table t49 (k text primary key, v text);
grant select, insert, update on t49 to anon, authenticated, service_role;

-- Organisations and classes, made directly (047's create path is proven by 047's test).
--   A: school, VERIFIED org, 5 seats, teacher T, student S.     B: church, UNVERIFIED org, 50 seats, teacher T.
--   C: school, verified org, 200 seats, teacher T.             D: school, teacher U (unconfirmed email).
--   Z: a draft (unpaid) class of T.
do $$
declare
  v_org_v uuid; v_org_u uuid; v_org_d uuid;
  v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_z uuid;
begin
  insert into public.churches (kind, name, open_join, created_by, verification_state)
  values ('school', 'Valley School', false, '00000000-0000-4000-8000-000000000091', 'verified') returning id into v_org_v;
  insert into public.churches (kind, name, open_join, created_by)
  values ('church', 'Grace Church', false, '00000000-0000-4000-8000-000000000091') returning id into v_org_u;
  insert into public.churches (kind, name, open_join, created_by)
  values ('school', 'Other School', false, '00000000-0000-4000-8000-000000000092') returning id into v_org_d;
  insert into public.classes (org_id, kind, name, seat_cap, seats_requested, seats_purchased, status, join_code, scores_visible, created_by, time_zone)
  values (v_org_v, 'school', 'Bible 101', 50, 5, 5, 'active', 'AAAAA2', true, '00000000-0000-4000-8000-000000000091', 'America/Denver') returning id into v_a;
  insert into public.classes (org_id, kind, name, seat_cap, seats_requested, seats_purchased, status, join_code, scores_visible, created_by, time_zone)
  values (v_org_u, 'church', 'Romans Study', 50, 50, 50, 'active', 'BBBBB2', false, '00000000-0000-4000-8000-000000000091', 'America/Denver') returning id into v_b;
  insert into public.classes (org_id, kind, name, seat_cap, seats_requested, seats_purchased, status, join_code, scores_visible, created_by, time_zone)
  values (v_org_v, 'school', 'Big Lecture', 200, 200, 200, 'active', 'CCCCC2', true, '00000000-0000-4000-8000-000000000091', 'America/Denver') returning id into v_c;
  insert into public.classes (org_id, kind, name, seat_cap, seats_requested, seats_purchased, status, join_code, scores_visible, created_by, time_zone)
  values (v_org_d, 'school', 'U Class', 50, 5, 5, 'active', 'DDDDD2', true, '00000000-0000-4000-8000-000000000092', 'America/Denver') returning id into v_d;
  insert into public.classes (org_id, kind, name, seat_cap, seats_requested, seats_purchased, status, join_code, scores_visible, created_by, time_zone)
  values (v_org_v, 'school', 'Unpaid', 50, 5, 0, 'draft', 'ZZZZZ2', true, '00000000-0000-4000-8000-000000000091', 'America/Denver') returning id into v_z;
  insert into public.class_staff (class_id, user_id, role) values
    (v_a, '00000000-0000-4000-8000-000000000091', 'owner'), (v_b, '00000000-0000-4000-8000-000000000091', 'owner'),
    (v_c, '00000000-0000-4000-8000-000000000091', 'owner'), (v_d, '00000000-0000-4000-8000-000000000092', 'owner'),
    (v_z, '00000000-0000-4000-8000-000000000091', 'owner');
  insert into public.class_members (class_id, user_id) values (v_a, '00000000-0000-4000-8000-000000000093');
  insert into t49 values ('A', v_a), ('B', v_b), ('C', v_c), ('D', v_d), ('Z', v_z), ('orgV', v_org_v), ('orgU', v_org_u),
    -- the fake clock: TOMORROW 10:00 in the classes' time zone
    ('base', ((date_trunc('day', now() at time zone 'America/Denver') + interval '1 day 10 hours') at time zone 'America/Denver')::text);
end $$;

update public.app_settings set value = 'true'::jsonb where key = 'paid.groups_enabled';

create or replace function pg_temp.k(p text) returns text language sql as $$ select v from t49 where k = p $$;
create or replace function pg_temp.clock(p_days numeric, p_hour_local int default 10) returns timestamptz language sql as $$
  select (((pg_temp.k('base')::timestamptz at time zone 'America/Denver')::date + make_interval(days => p_days::int))
          + make_interval(hours => p_hour_local)) at time zone 'America/Denver'
$$;
-- claim as the service role at a fake time; returns the jsonb array
create or replace function pg_temp.claim(p_now timestamptz, p_limit int default 100) returns jsonb language plpgsql as $$
declare j jsonb;
begin
  perform pg_temp.become('service_role', null);
  set local role service_role;
  j := public.invite_claim_due(p_now, p_limit);
  reset role;
  return j;
end $$;
create or replace function pg_temp.claimed_ids(j jsonb) returns uuid[] language sql as $$
  select coalesce(array_agg((e ->> 'invite_id')::uuid), '{}') from jsonb_array_elements(j) e
$$;


-- ------------------------------------------------ 1. grants, as declared
do $$
declare
  t text;
  f text;
begin
  foreach t in array array['class_invite_sends','class_invite_tokens','class_invite_events','email_provider_events'] loop
    foreach f in array array['select','insert','update','delete','truncate','references','trigger'] loop
      if has_table_privilege('anon', 'public.' || t, f) or has_table_privilege('authenticated', 'public.' || t, f) then
        raise exception 'FAIL a client role holds % on %', f, t;
      end if;
    end loop;
  end loop;
  foreach f in array array['join_class(text, text)','class_invite_preview(text)','redeem_class_invite(text, text)',
                           'create_class_invites(uuid, text[], text)','class_invite_list(uuid)','revoke_class_invite(uuid)',
                           'resend_class_invite(uuid)'] loop
    if has_function_privilege('anon', 'public.' || f, 'execute') then raise exception 'FAIL anon can execute %', f; end if;
    if not has_function_privilege('authenticated', 'public.' || f, 'execute') then raise exception 'FAIL authenticated cannot execute %', f; end if;
  end loop;
  foreach f in array array['invite_claim_due(timestamptz, integer)','invite_mark_sent(bigint, text)','invite_mark_failed(bigint, text)',
                           'invite_unsubscribe(text, text)','invite_provider_event(text, text, text)','invite_full_notices_claim(timestamptz)',
                           'invite_addr_hash(text)','invite_token_hash(text)','invite_new_token()','invite_text_has_link(text)',
                           'invite_sender_paused(uuid)','invite_next_due(timestamptz, integer, timestamptz)',
                           'invite_log(uuid, uuid, uuid, text, jsonb)','invite_stop_address(text, text, text)',
                           'class_join_core(uuid, uuid, text)','class_join_gate(uuid, text)','invite_setting_int(text, integer)'] loop
    if has_function_privilege('anon', 'public.' || f, 'execute') or has_function_privilege('authenticated', 'public.' || f, 'execute') then
      raise exception 'FAIL a client role can execute server-only %', f;
    end if;
  end loop;
  if not has_function_privilege('service_role', 'public.invite_claim_due(timestamptz, integer)', 'execute') then
    raise exception 'FAIL service_role cannot execute invite_claim_due';
  end if;
  if to_regprocedure('public.join_class(text)') is not null then
    raise exception 'FAIL 047''s join_class(text) (no age attestation) still exists';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'class_invites' and column_name = 'token_hash') then
    raise exception 'FAIL class_invites.token_hash still exists';
  end if;
  if public.app_setting_bool('invites.sending_enabled', true) then
    raise exception 'FAIL invites.sending_enabled must ship false';
  end if;
  raise notice 'PASS grants: new tables closed to clients; mailer path service-only; switches ship off';
end $$;


-- ------------------------------------------------ 2. who may invite
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000094');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], null)', pg_temp.k('A')));
  if r not like '42501%not_class_staff%' then raise exception 'FAIL an outsider could invite to class A: %', r; end if;
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000092');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], null)', pg_temp.k('D')));
  if r not like '42501%email_not_confirmed%' then raise exception 'FAIL a teacher with an unconfirmed email could invite: %', r; end if;
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000099', true);
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], null)', pg_temp.k('A')));
  if r not like '42501%guest_account%' then raise exception 'FAIL a guest could invite: %', r; end if;
end $$;
reset role;

update public.app_settings set value = 'false'::jsonb where key = 'paid.groups_enabled';
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], null)', pg_temp.k('A')));
  if r not like '42501%groups_disabled%' then raise exception 'FAIL invites work with the groups switch off: %', r; end if;
end $$;
reset role;
update public.app_settings set value = 'true'::jsonb where key = 'paid.groups_enabled';

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], null)', pg_temp.k('Z')));
  if r not like '%class_not_active%' then raise exception 'FAIL a draft (unpaid) class could invite: %', r; end if;
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], %L)', pg_temp.k('A'), 'Join us at www.example.com'));
  if r not like '%note_has_link%' then raise exception 'FAIL a note with a web address was accepted: %', r; end if;
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], %L)', pg_temp.k('A'), 'mail me: me@example.com'));
  if r not like '%note_has_link%' then raise exception 'FAIL a note with an email address was accepted: %', r; end if;
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], %L)', pg_temp.k('A'), repeat('x', 281)));
  if r not like '%note_too_long%' then raise exception 'FAIL a 281-character note was accepted: %', r; end if;
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, (select array_agg(''p'' || g || ''@x.test'') from generate_series(1, 51) g), null)', pg_temp.k('C')));
  if r not like '%too_many_at_once%' then raise exception 'FAIL 51 addresses in one call were accepted: %', r; end if;
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[]::text[], null)', pg_temp.k('A')));
  if r not like '%no_addresses%' then raise exception 'FAIL an empty list was accepted: %', r; end if;
end $$;
reset role;

-- A class name with a link refuses email invites.
update public.classes set name = 'Visit evil.example now' where id = pg_temp.k('A')::uuid;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''a@x.test''], null)', pg_temp.k('A')));
  if r not like '%links_in_names%' then raise exception 'FAIL a class name with a link could be emailed: %', r; end if;
  raise notice 'PASS invite gate: staff only, own email confirmed, not a guest, switch on, class paid, no links in note or names, 50 per call';
end $$;
reset role;
update public.classes set name = 'Bible 101' where id = pg_temp.k('A')::uuid;

-- One address is already globally suppressed.
insert into public.invite_suppressions (address_hash, reason) values (public.invite_addr_hash('gone@x.test'), 'unsubscribe');


-- ------------------------------------------------ 3. create: normalising, de-duplicating, refusing
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare j jsonb; res jsonb;
begin
  j := public.create_class_invites(pg_temp.k('A')::uuid,
         array['A@X.test', ' a@x.test ', 'not-an-email', 'T49@test.invalid', 's49@test.invalid', 'gone@x.test',
               'x49@test.invalid', 'e49@test.invalid', 'b@x.test'],
         '  See you   Tuesday!  ');
  res := j -> 'results';
  if (j ->> 'invited')::int <> 3 then raise exception 'FAIL expected 3 invited (a, e, b): %', j; end if;
  if jsonb_array_length(res) <> 8 then raise exception 'FAIL duplicates were not collapsed: %', res; end if;
  if (select e ->> 'result' from jsonb_array_elements(res) e where e ->> 'email' = 'a@x.test') <> 'invited' then raise exception 'FAIL a'; end if;
  if (select e ->> 'result' from jsonb_array_elements(res) e where e ->> 'email' = 'not-an-email') <> 'invalid' then raise exception 'FAIL invalid'; end if;
  if (select e ->> 'result' from jsonb_array_elements(res) e where e ->> 'email' = 't49@test.invalid') <> 'self' then raise exception 'FAIL self'; end if;
  if (select e ->> 'result' from jsonb_array_elements(res) e where e ->> 'email' = 's49@test.invalid') <> 'already_member' then raise exception 'FAIL member'; end if;
  if (select e ->> 'result' from jsonb_array_elements(res) e where e ->> 'email' = 'gone@x.test') <> 'cannot_invite' then raise exception 'FAIL suppressed address invited'; end if;
  if (select e ->> 'result' from jsonb_array_elements(res) e where e ->> 'email' = 'x49@test.invalid') <> 'cannot_invite' then raise exception 'FAIL blocked user invited'; end if;
  if (j ->> 'sending_enabled')::boolean then raise exception 'FAIL sending reported on'; end if;
  insert into t49 select 'inv_' || split_part(e ->> 'email', '@', 1), e ->> 'invite_id' from jsonb_array_elements(res) e where e ->> 'result' = 'invited';

  j := public.create_class_invites(pg_temp.k('A')::uuid, array['a@x.test'], null);
  if (j -> 'results' -> 0 ->> 'result') <> 'already_invited' then raise exception 'FAIL a second invite to a pending address: %', j; end if;
end $$;
reset role;

do $$ begin
  if (select personal_note from public.class_invites where id = pg_temp.k('inv_a')::uuid) <> 'See you   Tuesday!' then
    raise exception 'FAIL the note was not trimmed: %', (select personal_note from public.class_invites where id = pg_temp.k('inv_a')::uuid);
  end if;
  if (select address_hash from public.class_invites where id = pg_temp.k('inv_a')::uuid) <> public.invite_addr_hash('a@x.test') then
    raise exception 'FAIL address hash';
  end if;
  if (select count(*) from public.class_invite_events where event = 'created' and class_id = pg_temp.k('A')::uuid) <> 3 then
    raise exception 'FAIL audit rows for created invites';
  end if;
  raise notice 'PASS create: lower-cased, de-duplicated, invalid/self/member/suppressed/blocked refused, duplicates refused, audited';
end $$;

-- Seats cap: pending + active <= 2 x seats purchased (A: 5 seats, 1 member, 3 pending -> 6 more allowed).
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.create_class_invites(pg_temp.k('A')::uuid, (select array_agg('seat' || g || '@x.test') from generate_series(1, 8) g), null);
  if (j ->> 'invited')::int <> 6 then raise exception 'FAIL the seat cap let % through (want 6)', j ->> 'invited'; end if;
  if (select count(*) from jsonb_array_elements(j -> 'results') e where e ->> 'limit' = 'seats') <> 2 then raise exception 'FAIL seat-cap results: %', j; end if;
  -- Unverified org: 30 in total.
  j := public.create_class_invites(pg_temp.k('B')::uuid, (select array_agg('u' || g || '@x.test') from generate_series(1, 35) g), null);
  if (j ->> 'invited')::int <> 30 then raise exception 'FAIL an unverified org got % invites (want 30)', j ->> 'invited'; end if;
  if (select count(*) from jsonb_array_elements(j -> 'results') e where e ->> 'limit' = 'unverified_org') <> 5 then raise exception 'FAIL unverified results'; end if;
end $$;
reset role;

-- Per-class 50/day and per-teacher 100/day.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.create_class_invites(pg_temp.k('C')::uuid, (select array_agg('c' || g || '@x.test') from generate_series(1, 50) g), null);
  if (j ->> 'invited')::int <> 50 then raise exception 'FAIL class C: % of 50', j ->> 'invited'; end if;
  j := public.create_class_invites(pg_temp.k('C')::uuid, array['c51@x.test'], null);
  if (j -> 'results' -> 0 ->> 'limit') is distinct from 'class_daily' then raise exception 'FAIL per-class daily cap: %', j; end if;
end $$;
reset role;
-- T has now created 3 + 6 + 30 + 50 = 89 today; 11 left. Move class C's events back a day to isolate the per-teacher cap.
update public.class_invite_events set class_id = null where class_id = pg_temp.k('C')::uuid;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.create_class_invites(pg_temp.k('C')::uuid, (select array_agg('d' || g || '@x.test') from generate_series(1, 15) g), null);
  if (j ->> 'invited')::int <> 11 then raise exception 'FAIL per-teacher daily cap let % through (want 11)', j ->> 'invited'; end if;
  if (select count(*) from jsonb_array_elements(j -> 'results') e where e ->> 'limit' = 'daily') <> 4 then raise exception 'FAIL daily results'; end if;
  raise notice 'PASS caps: 2x seats, 30 for an unverified org, 50 per class per day, 100 per teacher per day';
end $$;
reset role;


-- ------------------------------------------------ 4. who can see invites
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000093');
set local role authenticated;
do $$
declare r text;
begin
  if exists (select 1 from public.class_invites) then raise exception 'FAIL a student can read invites'; end if;
  r := public.t049_try(format('select public.class_invite_list(%L::uuid)', pg_temp.k('A')));
  if r not like '42501%' then raise exception 'FAIL a student can list invites: %', r; end if;
  r := public.t049_try(format('select public.revoke_class_invite(%L::uuid)', pg_temp.k('inv_a')));
  if r not like '42501%' then raise exception 'FAIL a student can revoke an invite: %', r; end if;
  r := public.t049_try('select public.invite_claim_due(now(), 10)');
  if r not like '42501%' then raise exception 'FAIL a client can claim mail: %', r; end if;
  r := public.t049_try('select count(*) from public.class_invite_tokens');
  if r not like '42501%' then raise exception 'FAIL a client can read tokens: %', r; end if;
end $$;
reset role;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.class_invite_list(pg_temp.k('A')::uuid);
  if jsonb_array_length(j) <> 9 then raise exception 'FAIL teacher sees % invites in A (want 9)', jsonb_array_length(j); end if;
  if not exists (select 1 from jsonb_array_elements(j) e where e ->> 'address' = 'a@x.test' and e ->> 'status' = 'pending') then
    raise exception 'FAIL pending address not shown to the teacher';
  end if;
  raise notice 'PASS invites: the teacher lists their own class; students and outsiders see nothing and can change nothing';
end $$;
reset role;


-- ------------------------------------------------ 5. the mailer: switch off, quiet hours, tokens
do $$
declare j jsonb;
begin
  j := pg_temp.claim(pg_temp.clock(0));
  if jsonb_array_length(j) <> 0 then raise exception 'FAIL mail was claimed with invites.sending_enabled off'; end if;
  raise notice 'PASS nothing is claimed while invites.sending_enabled is off';
end $$;
update public.app_settings set value = 'true'::jsonb where key = 'invites.sending_enabled';

-- Keep the run small: only class A's invites are due for now.
update public.class_invites set next_reminder_at = now() + interval '400 days' where class_id <> pg_temp.k('A')::uuid;

do $$
declare j jsonb; e jsonb; v_raw text;
begin
  j := pg_temp.claim(pg_temp.clock(0, 22));
  if jsonb_array_length(j) <> 0 then raise exception 'FAIL mail was claimed at 22:00 local (quiet hours)'; end if;
  j := pg_temp.claim(pg_temp.clock(0, 7));
  if jsonb_array_length(j) <> 0 then raise exception 'FAIL mail was claimed at 07:00 local (quiet hours)'; end if;

  j := pg_temp.claim(pg_temp.clock(0), 4);
  if jsonb_array_length(j) <> 4 then raise exception 'FAIL the limit was not respected: %', jsonb_array_length(j); end if;
  j := j || pg_temp.claim(pg_temp.clock(0), 100);
  if jsonb_array_length(j) <> 9 then raise exception 'FAIL expected 9 first emails for class A, got %', jsonb_array_length(j); end if;
  for e in select * from jsonb_array_elements(j) loop
    if (e ->> 'seq')::int <> 1 or e ->> 'stage' <> 'invite' then raise exception 'FAIL first email is not seq 1: %', e; end if;
    if e ->> 'join_token' !~ '^[0-9a-f]{64}$' or e ->> 'unsub_token' !~ '^[0-9a-f]{64}$' then raise exception 'FAIL token shape'; end if;
    -- RAW TOKENS ARE NEVER STORED: only their sha256.
    v_raw := e ->> 'join_token';
    if not exists (select 1 from public.class_invite_tokens t where t.token_hash = public.invite_token_hash(v_raw) and t.purpose = 'join') then
      raise exception 'FAIL the join token''s hash is not stored';
    end if;
    if exists (select 1 from public.class_invite_tokens t where t.token_hash = v_raw or t::text like '%' || v_raw || '%')
       or exists (select 1 from public.class_invite_tokens t where t.token_hash = e ->> 'unsub_token')
       or exists (select 1 from public.class_invites i where i::text like '%' || v_raw || '%')
       or exists (select 1 from public.class_invite_sends s where s::text like '%' || v_raw || '%')
       or exists (select 1 from public.class_invite_events ev where ev::text like '%' || v_raw || '%') then
      raise exception 'FAIL a RAW token is stored in the database';
    end if;
    if e ->> 'to' = 'a@x.test' then
      insert into t49 values ('tokA1', e ->> 'join_token'), ('unsubA1', e ->> 'unsub_token'), ('sendA1', e ->> 'send_id');
      if e ->> 'teacher_name' <> 'Teacher T' or e ->> 'class_name' <> 'Bible 101' or e ->> 'org_name' <> 'Valley School'
         or e ->> 'personal_note' <> 'See you   Tuesday!' or e ->> 'kind' <> 'school' then
        raise exception 'FAIL claim payload: %', e;
      end if;
    end if;
    if e ->> 'to' = 'b@x.test' then insert into t49 values ('tokB1', e ->> 'join_token'), ('sendB1', e ->> 'send_id'); end if;
    if e ->> 'to' = 'e49@test.invalid' then insert into t49 values ('tokE1', e ->> 'join_token'); end if;
    if e ->> 'to' = 'seat1@x.test' then insert into t49 values ('unsubS1', e ->> 'unsub_token'), ('sendS1', e ->> 'send_id'); end if;
    if e ->> 'to' = 'seat2@x.test' then insert into t49 values ('sendS2', e ->> 'send_id'); end if;
    if e ->> 'to' = 'seat3@x.test' then insert into t49 values ('sendS3', e ->> 'send_id'); end if;
  end loop;

  -- IDEMPOTENT: the same moment again claims nothing.
  j := pg_temp.claim(pg_temp.clock(0));
  if jsonb_array_length(j) <> 0 then raise exception 'FAIL a second claim at the same time re-sent % emails', jsonb_array_length(j); end if;
  raise notice 'PASS mailer: quiet hours, per-run limit, raw tokens only in the claim result (sha256 stored), never claimed twice';
end $$;

-- The mailer confirms most; one is never confirmed (a crash) and becomes 'unknown'.
select pg_temp.become('service_role', null);
set local role service_role;
do $$
declare r record;
begin
  for r in select id from public.class_invite_sends where id <> pg_temp.k('sendS3')::bigint loop
    perform public.invite_mark_sent(r.id, 'msg_' || r.id);
  end loop;
end $$;
reset role;
do $$
declare j jsonb;
begin
  j := pg_temp.claim(pg_temp.clock(0, 11));
  if (select status from public.class_invite_sends where id = pg_temp.k('sendS3')::bigint) <> 'unknown' then
    raise exception 'FAIL an unconfirmed claim did not become unknown after 15 minutes';
  end if;
  if (select count(*) from public.class_invite_events where event = 'sent') <> 8 then raise exception 'FAIL sent audit rows'; end if;
  raise notice 'PASS an unconfirmed send becomes unknown (counted as sent, never re-sent)';
end $$;


-- ------------------------------------------------ 6. the schedule: +1, +3, +5, +14, +30 days, 6 emails max
-- Only invite b moves through the fake 46 days; the others are parked (and kept from expiring).
update public.class_invites set next_reminder_at = now() + interval '400 days', expires_at = now() + interval '400 days'
 where id <> pg_temp.k('inv_b')::uuid and status = 'pending';
do $$
declare
  j jsonb;
  d int;
  v_expect int[] := array[1, 3, 5, 14, 30];
  v_seq int := 1;
  v_inv uuid := pg_temp.k('inv_b');
begin
  for d in 0..44 loop
    j := pg_temp.claim(pg_temp.clock(d, 10));
    if v_inv = any (pg_temp.claimed_ids(j)) then
      if not (d = any (v_expect)) then raise exception 'FAIL invite b was emailed on day % (schedule is +1,+3,+5,+14,+30)', d; end if;
      v_seq := v_seq + 1;
      if (select (e ->> 'seq')::int from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid = v_inv) <> v_seq then
        raise exception 'FAIL wrong seq on day %', d;
      end if;
      if (select e ->> 'stage' from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid = v_inv) <> 'reminder' then
        raise exception 'FAIL a reminder was not labelled reminder';
      end if;
      perform public.invite_mark_sent((select (e ->> 'send_id')::bigint from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid = v_inv), 'msg_b' || d);
    elsif d = any (v_expect) then
      raise exception 'FAIL invite b was NOT emailed on day %', d;
    end if;
  end loop;
  if v_seq <> 6 then raise exception 'FAIL invite b got % emails (want 6)', v_seq; end if;
  if (select sends from public.class_invites where id = v_inv) <> 6 or (select reminders_sent from public.class_invites where id = v_inv) <> 5
     or (select next_reminder_at from public.class_invites where id = v_inv) is not null then
    raise exception 'FAIL counters after six emails';
  end if;
  -- Day 46: past the 45-day expiry, the address is gone.
  j := pg_temp.claim(pg_temp.clock(46, 10));
  if (select status from public.class_invites where id = v_inv) <> 'expired' or (select address from public.class_invites where id = v_inv) is not null then
    raise exception 'FAIL invite b did not expire with its address removed at day 46';
  end if;
  raise notice 'PASS schedule (fake clock): emails on days 0, 1, 3, 5, 14, 30 only; six maximum; expired and address removed after 45 days';
end $$;

do $$
declare t timestamptz := pg_temp.clock(0);
begin
  -- A send that went out late (paused while full, say) never makes the next one due at once.
  if public.invite_next_due(t, 1, t + interval '60 hours') <> t + interval '84 hours' then
    raise exception 'FAIL a late send leaves the next one due within 24 hours (%)', public.invite_next_due(t, 1, t + interval '60 hours');
  end if;
  if public.invite_next_due(t, 6, t) is not null or public.invite_next_due(t, 0, t) <> t then
    raise exception 'FAIL invite_next_due edges';
  end if;
  raise notice 'PASS no two emails to one address within 24 hours';
end $$;

update public.class_invites set next_reminder_at = now()
 where class_id = pg_temp.k('A')::uuid and status = 'pending' and id <> pg_temp.k('inv_e49')::uuid;

-- Resend: limits.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.resend_class_invite(%L::uuid)', pg_temp.k('inv_a')));
  if r not like '%too_soon%' then raise exception 'FAIL resend within 24 hours: %', r; end if;
  r := public.t049_try(format('select public.resend_class_invite(%L::uuid)', pg_temp.k('inv_b')));
  if r not like '%not_pending%' then raise exception 'FAIL resend of an expired invite: %', r; end if;
end $$;
reset role;
update public.class_invites set last_sent_at = now() - interval '2 days' where id = pg_temp.k('inv_a')::uuid;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$ begin
  perform public.resend_class_invite(pg_temp.k('inv_a')::uuid);
end $$;
reset role;
do $$
declare j jsonb;
begin
  if (select next_reminder_at from public.class_invites where id = pg_temp.k('inv_a')::uuid) > now() + interval '1 second' then
    raise exception 'FAIL resend did not make the invite due';
  end if;
  raise notice 'PASS resend: once a day, only while pending';
end $$;
-- Six emails is the ceiling for resend too.
update public.class_invites set sends = 6, reminders_sent = 5, last_sent_at = now() - interval '2 days', next_reminder_at = null
 where id = pg_temp.k('inv_e49')::uuid;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.resend_class_invite(%L::uuid)', pg_temp.k('inv_e49')));
  if r not like '%send_limit%' then raise exception 'FAIL a 7th email via resend: %', r; end if;
  raise notice 'PASS resend cannot exceed six emails';
end $$;
reset role;
update public.class_invites set sends = 1, reminders_sent = 0, next_reminder_at = now() + interval '400 days' where id = pg_temp.k('inv_e49')::uuid;


-- ------------------------------------------------ 7. joining: the age attestation, code and link
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000095');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.join_class('AAAAA2', null);
  if j ->> 'error' <> 'age_required' then raise exception 'FAIL join without the age attestation: %', j; end if;
  j := public.join_class('AAAAA2', '12');
  if j ->> 'error' <> 'age_required' then raise exception 'FAIL join with a bad age value: %', j; end if;
  -- E was invited by email to A, and joins with the CODE instead.
  j := public.join_class('aaaaa-2', '18_plus');
  if not (j ->> 'ok')::boolean then raise exception 'FAIL E could not join by code: %', j; end if;
end $$;
reset role;
do $$ begin
  if (select status from public.class_invites where id = pg_temp.k('inv_e49')::uuid) <> 'joined'
     or (select address from public.class_invites where id = pg_temp.k('inv_e49')::uuid) is not null
     or (select joined_user_id from public.class_invites where id = pg_temp.k('inv_e49')::uuid) <> '00000000-0000-4000-8000-000000000095' then
    raise exception 'FAIL joining by code did not end the email invite to that account''s address';
  end if;
  if (select age_bracket from public.class_members where class_id = pg_temp.k('A')::uuid and user_id = '00000000-0000-4000-8000-000000000095') <> '18_plus' then
    raise exception 'FAIL the age bracket was not stored';
  end if;
  raise notice 'PASS join by code: age bracket required and stored; the matching email invite stops';
end $$;

-- Preview and redeem by the emailed link, from an account with a DIFFERENT email (R).
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000097');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.class_invite_preview(repeat('0', 64));
  if j ->> 'error' <> 'not_found' then raise exception 'FAIL a bad token previewed: %', j; end if;
  j := public.class_invite_preview(pg_temp.k('unsubA1'));
  if j ->> 'error' <> 'not_found' then raise exception 'FAIL an UNSUBSCRIBE token works as a join link: %', j; end if;
  j := public.class_invite_preview(pg_temp.k('tokA1'));
  if not (j ->> 'ok')::boolean or j ->> 'name' <> 'Bible 101' or j ->> 'org_name' <> 'Valley School' or j ->> 'leader_name' <> 'Teacher T' then
    raise exception 'FAIL preview: %', j;
  end if;
  if j ? 'seats_purchased' or j ? 'join_code' or j ? 'address' then raise exception 'FAIL preview says too much: %', j; end if;
  j := public.redeem_class_invite(pg_temp.k('tokA1'), null);
  if j ->> 'error' <> 'age_required' then raise exception 'FAIL redeem without age: %', j; end if;
  j := public.redeem_class_invite(pg_temp.k('tokA1'), '13_17');
  if not (j ->> 'ok')::boolean then raise exception 'FAIL R could not redeem: %', j; end if;
end $$;
reset role;
do $$ begin
  if (select status from public.class_invites where id = pg_temp.k('inv_a')::uuid) <> 'joined'
     or (select address from public.class_invites where id = pg_temp.k('inv_a')::uuid) is not null then
    raise exception 'FAIL a redeemed invite is not joined / still holds the address';
  end if;
end $$;
-- SINGLE USE: O tries the same link.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000094');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.redeem_class_invite(pg_temp.k('tokA1'), '18_plus');
  if coalesce((j ->> 'ok')::boolean, false) then raise exception 'FAIL a used invite link let a second person in: %', j; end if;
  -- invite b EXPIRED on day 46; its token row still exists, the status must refuse it.
  j := public.redeem_class_invite(pg_temp.k('tokB1'), '18_plus');
  if coalesce((j ->> 'ok')::boolean, false) or j ->> 'error' <> 'expired' then raise exception 'FAIL an expired invite link worked: %', j; end if;
  if public.is_class_member(pg_temp.k('A')::uuid) then raise exception 'FAIL O is in class A'; end if;
  raise notice 'PASS invite link: preview says only class/org/teacher; age required; single use';
end $$;
reset role;

-- Class A is now full (5 seats: S, E, R + 2 fillers): the next joiner is refused, the owner is told ONCE.
insert into public.class_members (class_id, user_id) values
  (pg_temp.k('A')::uuid, '00000000-0000-4000-8000-0000000000a1'), (pg_temp.k('A')::uuid, '00000000-0000-4000-8000-0000000000a2');
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$
declare j jsonb;
begin
  j := public.join_class('AAAAA2', '18_plus');
  if j ->> 'error' <> 'full' then raise exception 'FAIL a 6th person joined a 5-seat class: %', j; end if;
  j := public.join_class('AAAAA2', '18_plus');
end $$;
reset role;
do $$
declare j jsonb;
begin
  perform pg_temp.become('service_role', null);
  set local role service_role;
  j := public.invite_full_notices_claim(pg_temp.clock(1));
  if jsonb_array_length(j) <> 1 or j -> 0 ->> 'to' <> 't49@test.invalid' then raise exception 'FAIL full notice: %', j; end if;
  j := public.invite_full_notices_claim(pg_temp.clock(1));
  if jsonb_array_length(j) <> 0 then raise exception 'FAIL the owner was told twice the class is full'; end if;
  reset role;
  -- Reminders pause while full (seat2 is pending and due on day 1).
  j := pg_temp.claim(pg_temp.clock(1));
  if exists (select 1 from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid in (select id from public.class_invites where class_id = pg_temp.k('A')::uuid)) then
    raise exception 'FAIL reminders went out for a full class';
  end if;
  if (select status from public.class_invites where address = 'seat2@x.test') <> 'pending' then raise exception 'FAIL a full class should pause, not stop'; end if;
  -- Seats added: the flag clears.
  update public.classes set seats_purchased = 8 where id = pg_temp.k('A')::uuid;
  if (select seats_full_at from public.classes where id = pg_temp.k('A')::uuid) is not null then raise exception 'FAIL seats_full_at not cleared'; end if;
  raise notice 'PASS full: refused with "full", the owner emailed once, reminders paused, cleared when seats are added';
end $$;


-- ------------------------------------------------ 8. unsubscribe, bounce, complaint
-- T used up today's 100 creates above; age them so the next ones are allowed.
update public.class_invite_events set at = at - interval '2 days' where event in ('created', 'reopened');
-- seat1@ is invited to A; invite it to B too, so "all" has something else to stop.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$ begin
  -- B's org is capped at 30 and full; class C (verified) takes it.
  if (public.create_class_invites(pg_temp.k('C')::uuid, array['seat1@x.test'], null) ->> 'invited')::int <> 1 then
    raise exception 'FAIL could not invite seat1 to C';
  end if;
end $$;
reset role;
select pg_temp.become('service_role', null);
set local role service_role;
do $$
declare j jsonb;
begin
  j := public.invite_unsubscribe(repeat('f', 64), 'all');
  if (j ->> 'ok')::boolean then raise exception 'FAIL an unknown unsubscribe token succeeded'; end if;
  j := public.invite_unsubscribe(pg_temp.k('tokB1'), 'all');
  if (j ->> 'ok')::boolean then raise exception 'FAIL a JOIN token worked as an unsubscribe token'; end if;
  j := public.invite_unsubscribe(pg_temp.k('unsubS1'), 'class');
  if j ->> 'scope' <> 'class' then raise exception 'FAIL class unsubscribe: %', j; end if;
end $$;
reset role;
do $$ begin
  if (select status from public.class_invites where class_id = pg_temp.k('A')::uuid and address_hash = public.invite_addr_hash('seat1@x.test')) <> 'opted_out' then
    raise exception 'FAIL class-only unsubscribe did not stop that invite';
  end if;
  if (select status from public.class_invites where class_id = pg_temp.k('C')::uuid and address_hash = public.invite_addr_hash('seat1@x.test')) <> 'pending' then
    raise exception 'FAIL class-only unsubscribe stopped another class';
  end if;
  if exists (select 1 from public.invite_suppressions where address_hash = public.invite_addr_hash('seat1@x.test')) then
    raise exception 'FAIL class-only unsubscribe suppressed the address globally';
  end if;
end $$;
select pg_temp.become('service_role', null);
set local role service_role;
do $$ begin perform public.invite_unsubscribe(pg_temp.k('unsubS1'), 'all'); end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.invite_suppressions where address_hash = public.invite_addr_hash('seat1@x.test') and reason = 'unsubscribe') then
    raise exception 'FAIL "unsubscribe from everything" wrote no suppression';
  end if;
  if (select status from public.class_invites where class_id = pg_temp.k('C')::uuid and address_hash = public.invite_addr_hash('seat1@x.test')) <> 'opted_out'
     or (select address from public.class_invites where class_id = pg_temp.k('C')::uuid and address_hash = public.invite_addr_hash('seat1@x.test')) is not null then
    raise exception 'FAIL global unsubscribe did not stop the other class''s invite and drop its address';
  end if;
end $$;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$ begin
  if (public.create_class_invites(pg_temp.k('C')::uuid, array['seat1@x.test'], null) -> 'results' -> 0 ->> 'result') <> 'cannot_invite' then
    raise exception 'FAIL an unsubscribed address could be invited again';
  end if;
  raise notice 'PASS unsubscribe: class-only stops one invite; "everything" suppresses globally and no one can invite it again';
end $$;
reset role;

-- Bounce (seat2's first email) and complaint (seat3's).
select pg_temp.become('service_role', null);
set local role service_role;
do $$
declare j jsonb;
begin
  j := public.invite_provider_event('evt_b1', 'bounce', 'msg_' || pg_temp.k('sendS2'));
  if j ->> 'outcome' <> 'applied' then raise exception 'FAIL bounce: %', j; end if;
  j := public.invite_provider_event('evt_b1', 'bounce', 'msg_' || pg_temp.k('sendS2'));
  if j ->> 'outcome' <> 'duplicate' then raise exception 'FAIL a replayed webhook event was applied twice'; end if;
  j := public.invite_provider_event('evt_x', 'bounce', 'msg_not_ours');
  if j ->> 'outcome' <> 'unknown_message' then raise exception 'FAIL unknown message: %', j; end if;
end $$;
reset role;
do $$ begin
  if (select status from public.class_invites where address_hash = public.invite_addr_hash('seat2@x.test')) <> 'bounced'
     or not exists (select 1 from public.invite_suppressions where address_hash = public.invite_addr_hash('seat2@x.test') and reason = 'bounce') then
    raise exception 'FAIL a bounce did not suppress the address';
  end if;
  if public.invite_sender_paused('00000000-0000-4000-8000-000000000091') then raise exception 'FAIL one bounce paused the teacher'; end if;
end $$;
select pg_temp.become('service_role', null);
set local role service_role;
do $$ begin
  -- sendS3 is 'unknown' (never confirmed), so it has no provider id; give it one as the mailer's late confirm would.
  perform public.invite_mark_sent(pg_temp.k('sendS3')::bigint, 'msg_late');
  if (public.invite_provider_event('evt_c1', 'complaint', 'msg_late') ->> 'outcome') <> 'applied' then raise exception 'FAIL complaint'; end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.create_class_invites(%L::uuid, array[''new1@x.test''], null)', pg_temp.k('C')));
  if r not like '42501%invites_paused%' then raise exception 'FAIL a complaint did not pause the teacher''s invites: %', r; end if;
end $$;
reset role;
do $$
declare j jsonb;
begin
  update public.class_invites set next_reminder_at = now() where class_id = pg_temp.k('C')::uuid and status = 'pending';
  j := pg_temp.claim(pg_temp.clock(2));
  if exists (select 1 from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid in (select id from public.class_invites where invited_by = '00000000-0000-4000-8000-000000000091')) then
    raise exception 'FAIL a paused teacher''s invites were still mailed';
  end if;
  if (select status from public.class_invites where address_hash = public.invite_addr_hash('seat3@x.test')) <> 'opted_out' then
    raise exception 'FAIL a complaint did not stop the invite';
  end if;
  raise notice 'PASS bounce suppresses; webhook replay is a no-op; a complaint suppresses and pauses the teacher (no creates, no sends)';
end $$;
-- Un-pause for the rest.
delete from public.class_invite_events where event = 'complained';


-- ------------------------------------------------ 9. stop rules at send time; failure release
do $$
declare j jsonb; v_c1 uuid; v_c2 uuid; v_send bigint;
begin
  select id into v_c1 from public.class_invites where class_id = pg_temp.k('C')::uuid and address = 'c1@x.test';
  select id into v_c2 from public.class_invites where class_id = pg_temp.k('C')::uuid and address = 'c2@x.test';
  update public.class_invites set next_reminder_at = now() + interval '400 days' where status = 'pending';
  update public.class_invites set next_reminder_at = now() where id in (v_c1, v_c2);

  -- Suppressed by another path (e.g. a dashboard insert) while pending: stopped at send time.
  insert into public.invite_suppressions (address_hash, reason) values (public.invite_addr_hash('c3@x.test'), 'complaint');
  update public.class_invites set next_reminder_at = now() where address = 'c3@x.test';
  j := pg_temp.claim(pg_temp.clock(2));
  if exists (select 1 from jsonb_array_elements(j) e where e ->> 'to' = 'c3@x.test') then raise exception 'FAIL a suppressed address was mailed'; end if;
  if (select status from public.class_invites where address_hash = public.invite_addr_hash('c3@x.test')) <> 'opted_out' then
    raise exception 'FAIL a suppressed address''s invite was not stopped at send time';
  end if;
  -- the claim above also took c1/c2; release them for the next steps
  update public.class_invite_sends set invite_id = null, status = 'failed' where invite_id in (v_c1, v_c2);
  update public.class_invites set sends = 0, reminders_sent = 0, sent_at = null, next_reminder_at = now() where id in (v_c1, v_c2);
  delete from public.class_invite_tokens where invite_id in (v_c1, v_c2);

  -- The provider refused c1: the slot is released and retried.
  j := pg_temp.claim(pg_temp.clock(2));
  if not (v_c1 = any (pg_temp.claimed_ids(j)) and v_c2 = any (pg_temp.claimed_ids(j))) then raise exception 'FAIL c1/c2 not claimed: %', j; end if;
  select (e ->> 'send_id')::bigint into v_send from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid = v_c1;
  perform pg_temp.become('service_role', null);
  set local role service_role;
  perform public.invite_mark_failed(v_send, 'provider 422');
  perform public.invite_mark_sent((select (e ->> 'send_id')::bigint from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid = v_c2), 'msg_c2');
  reset role;
  if (select sends from public.class_invites where id = v_c1) <> 0 then raise exception 'FAIL a failed send was counted'; end if;
  if exists (select 1 from public.class_invite_tokens where send_id = v_send) then raise exception 'FAIL a failed send''s tokens survive'; end if;
  j := pg_temp.claim(pg_temp.clock(2, 12));
  if not (v_c1 = any (pg_temp.claimed_ids(j))) or (select (e ->> 'seq')::int from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid = v_c1) <> 1 then
    raise exception 'FAIL a released slot was not retried as seq 1';
  end if;

  -- Class ended: c2's next reminder stops instead of going out.
  update public.classes set status = 'ended' where id = pg_temp.k('C')::uuid;
  update public.class_invites set next_reminder_at = now() where id = v_c2;
  j := pg_temp.claim(pg_temp.clock(3));
  if v_c2 = any (pg_temp.claimed_ids(j)) then raise exception 'FAIL a reminder went out for an ended class'; end if;
  if (select status from public.class_invites where id = v_c2) <> 'expired' or (select address from public.class_invites where id = v_c2) is not null then
    raise exception 'FAIL an ended class''s invite was not stopped';
  end if;
  update public.classes set status = 'active' where id = pg_temp.k('C')::uuid;

  -- The inviter is no longer staff.
  update public.class_invites set next_reminder_at = now() where class_id = pg_temp.k('B')::uuid and status = 'pending';
  delete from public.class_staff where class_id = pg_temp.k('B')::uuid;
  j := pg_temp.claim(pg_temp.clock(3));
  if exists (select 1 from jsonb_array_elements(j) e where (e ->> 'invite_id')::uuid in (select id from public.class_invites where class_id = pg_temp.k('B')::uuid)) then
    raise exception 'FAIL reminders went out after the inviter left the class';
  end if;
  if exists (select 1 from public.class_invites where class_id = pg_temp.k('B')::uuid and status = 'pending') then
    raise exception 'FAIL invites of a departed inviter are still pending';
  end if;
  raise notice 'PASS send-time stops: ended class, inviter gone; a definite provider failure releases the slot and retries';
end $$;

-- Global daily cap.
do $$
declare j jsonb; v_used int;
begin
  update public.class_invites set next_reminder_at = now() where class_id = pg_temp.k('C')::uuid and status = 'pending';
  select count(*) into v_used from public.class_invite_sends where claimed_at > pg_temp.clock(3) - interval '24 hours' and status in ('claimed', 'sent', 'unknown');
  update public.app_settings set value = to_jsonb(v_used + 2) where key = 'invites.daily_global_cap';
  j := pg_temp.claim(pg_temp.clock(3));
  if jsonb_array_length(j) <> 2 then raise exception 'FAIL the global daily cap allowed % (want 2)', jsonb_array_length(j); end if;
  j := pg_temp.claim(pg_temp.clock(3, 11));
  if jsonb_array_length(j) <> 0 then raise exception 'FAIL the global daily cap was exceeded on the next run'; end if;
  raise notice 'PASS global daily cap';
end $$;

-- Revoke: no more mail, the link is dead.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000094');
set local role authenticated;
do $$
declare r text;
begin
  r := public.t049_try(format('select public.revoke_class_invite(%L::uuid)', pg_temp.k('inv_b')));
  if r not like '42501%' then raise exception 'FAIL an outsider revoked an invite: %', r; end if;
end $$;
reset role;
insert into t49 select 'inv_d1', id::text from public.class_invites where address = 'd1@x.test';
update public.class_invites set next_reminder_at = now() where id = pg_temp.k('inv_d1')::uuid;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000091');
set local role authenticated;
do $$ begin perform public.revoke_class_invite(pg_temp.k('inv_d1')::uuid); end $$;
reset role;
do $$
declare j jsonb;
begin
  if (select status from public.class_invites where id = pg_temp.k('inv_d1')::uuid) <> 'revoked'
     or (select address from public.class_invites where id = pg_temp.k('inv_d1')::uuid) is not null then
    raise exception 'FAIL revoke did not end the invite and drop the address';
  end if;
  update public.app_settings set value = '300'::jsonb where key = 'invites.daily_global_cap';
  j := pg_temp.claim(pg_temp.clock(5));
  if pg_temp.k('inv_d1')::uuid = any (pg_temp.claimed_ids(j)) then raise exception 'FAIL a revoked invite was mailed'; end if;
  raise notice 'PASS revoke: staff only; ends the invite, drops the address, no more mail';
end $$;


-- ------------------------------------------------ 10. account deletion
do $$ begin
  delete from auth.users where id = '00000000-0000-4000-8000-000000000097';  -- R, who redeemed inv_a
  if (select joined_user_id from public.class_invites where id = pg_temp.k('inv_a')::uuid) is not null then
    raise exception 'FAIL joined_user_id survives the account';
  end if;
  delete from auth.users where id = '00000000-0000-4000-8000-000000000091';  -- T, the inviter
  if exists (select 1 from public.class_invites where invited_by = '00000000-0000-4000-8000-000000000091') then
    raise exception 'FAIL invited_by survives the account';
  end if;
  raise notice 'PASS account deletion: invitee and inviter references are cleared';
end $$;

do $$ begin raise notice 'ALL 049 CHECKS PASSED'; end $$;

rollback;

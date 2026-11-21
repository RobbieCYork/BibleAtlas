-- ============================================================================
-- sql/tests/048_groups_assignments_test.sql — PROVES THE RULES OF sql/048.
--
-- Run as the database owner against a database with sql/025, 033, 043, 045,
-- 047 and 048 applied (and the live `profiles` table): a STAGING project, or
-- the local rehearsal
--   node scripts/groups/assignments-rls-test.mjs --local
--   node scripts/groups/assignments-rls-test.mjs --local --mutations
-- NEVER against production: it inserts test accounts into auth.users and flips
-- app_settings. One transaction, ends in ROLLBACK.
--
-- Every check RAISEs on failure and NOTICEs "PASS ..." on success. The last
-- notice is "ALL 048 CHECKS PASSED".
-- ============================================================================

begin;

--   ...a1 teacher A (school class A)   ...a2 leader B (church group B)
--   ...a3 student S1 (in A and B)      ...a4 student S2 (in A)
--   ...a5 outsider O                   ...a6 app owner
--   ...a7 co-teacher C (of A)          ...a8 guest (anonymous)
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-4000-8000-0000000000a1', 'a48@test.invalid', false),
  ('00000000-0000-4000-8000-0000000000a2', 'b48@test.invalid', false),
  ('00000000-0000-4000-8000-0000000000a3', 's1-48@test.invalid', false),
  ('00000000-0000-4000-8000-0000000000a4', 's2-48@test.invalid', false),
  ('00000000-0000-4000-8000-0000000000a5', 'o48@test.invalid', false),
  ('00000000-0000-4000-8000-0000000000a6', 'owner48@test.invalid', false),
  ('00000000-0000-4000-8000-0000000000a7', 'c48@test.invalid', false),
  ('00000000-0000-4000-8000-0000000000a8', null, true);
insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'Teacher A'),
  ('00000000-0000-4000-8000-0000000000a2', 'Leader B'),
  ('00000000-0000-4000-8000-0000000000a3', 'Student One'),
  ('00000000-0000-4000-8000-0000000000a4', 'Student Two'),
  ('00000000-0000-4000-8000-0000000000a7', 'Co Teacher');
insert into public.user_roles (user_id, role, note)
values ('00000000-0000-4000-8000-0000000000a6', 'owner', '048 test');

create or replace function pg_temp.become(p_role text, p_uid text, p_anon boolean default false) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then json_build_object('role', p_role)::text
         else json_build_object('sub', p_uid, 'role', p_role, 'is_anonymous', p_anon)::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
end $$;

-- Runs a statement as the CURRENT role; 'ok' or SQLSTATE + message.
create or replace function public.t048_try(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate || ' ' || sqlerrm;
end $$;
grant execute on function public.t048_try(text) to anon, authenticated, service_role;

create temp table t48 (k text primary key, v text);
grant select, insert, update on t48 to anon, authenticated, service_role;
create or replace function pg_temp.k(p text) returns text language sql as $$ select v from t48 where k = p $$;
create or replace function pg_temp.u(p text) returns uuid language sql as $$ select v::uuid from t48 where k = p $$;

create or replace function pg_temp.payload(p_kind text, p_name text) returns jsonb language sql as $$
  select jsonb_build_object(
    'kind', p_kind, 'org_name', p_name || ' Org', 'class_name', p_name, 'time_zone', 'America/Denver',
    'seats', 5, 'interval', 'month', 'billing_mode', 'admin_pays',
    'agreement_version', '2026-11-21-draft-1',
    'agreement_sha256', '0b2ad26fd1888583899cd38664e9f5bc3b154be7067ceaaf7d0aab5b591a7fdc',
    'typed_name', 'Test Person', 'accepted', true)
$$;

-- The four-question assignment the tests take.
create or replace function pg_temp.asg1(p_class uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'class_id', p_class, 'title', 'Week 1: Romans 1', 'instructions', 'Read, then answer.',
    'due_at', (now() + interval '7 days')::text, 'accept_late', true,
    'readings', jsonb_build_array(jsonb_build_object('kind', 'bible', 'ref', 'Romans 1:1-17'),
                                  jsonb_build_object('kind', 'place', 'ref', 'rome', 'label', 'Rome')),
    'questions', jsonb_build_array(
      jsonb_build_object('type', 'mc', 'prompt', 'Who wrote Romans?', 'options', jsonb_build_array('Peter', 'Paul', 'James'), 'correct', 1, 'points', 2),
      jsonb_build_object('type', 'tf', 'prompt', 'Romans was written to Corinth.', 'correct', false, 'points', 1),
      jsonb_build_object('type', 'short', 'prompt', 'Paul''s earlier name and home city?', 'accepted', jsonb_build_array('Saul of Tarsus'), 'points', 3),
      jsonb_build_object('type', 'essay', 'prompt', 'What is the gospel, in your words?', 'points', 10)))
$$;


-- ------------------------------------------------ 0. setup: two classes, active
update public.app_settings set value = 'true'::jsonb where key = 'paid.groups_enabled';
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ declare j jsonb; begin
  j := public.create_group_class(pg_temp.payload('school', 'Bible 101'));
  insert into t48 values ('classA', j ->> 'class_id');
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a2');
set local role authenticated;
do $$ declare j jsonb; begin
  j := public.create_group_class(pg_temp.payload('church', 'Tuesday Study'));
  insert into t48 values ('classB', j ->> 'class_id');
end $$;
reset role;
update public.classes set status = 'active', seats_purchased = 10, starts_on = current_date - 60
 where id in (pg_temp.u('classA'), pg_temp.u('classB'));
insert into public.class_staff (class_id, user_id, role)
values (pg_temp.u('classA'), '00000000-0000-4000-8000-0000000000a7', 'co_teacher');
insert into public.class_members (class_id, user_id) values
  (pg_temp.u('classA'), '00000000-0000-4000-8000-0000000000a3'),
  (pg_temp.u('classA'), '00000000-0000-4000-8000-0000000000a4'),
  (pg_temp.u('classB'), '00000000-0000-4000-8000-0000000000a3');
update public.app_settings set value = 'false'::jsonb where key = 'paid.groups_enabled';


-- ------------------------------------------------ 1. grants, as declared
do $$
declare
  t text;
  f text;
  priv text;
begin
  foreach t in array array['assignments','assignment_readings','assignment_questions','assignment_question_keys',
                           'assignment_submissions','assignment_answers','assignment_grade_events','class_export_log'] loop
    foreach priv in array array['select','insert','update','delete','truncate','references','trigger'] loop
      if has_table_privilege('anon', 'public.' || t, priv) or has_table_privilege('authenticated', 'public.' || t, priv) then
        raise exception 'FAIL a client role holds % on %', priv, t;
      end if;
    end loop;
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      raise exception 'FAIL RLS is off on %', t;
    end if;
  end loop;
  foreach f in array array['class_is_open(uuid)','class_is_editable(uuid)','class_grading_open(uuid)','asg_norm(text)',
                           'asg_points(jsonb, numeric)','asg_recompute(uuid)','asg_write_answers(uuid, uuid, jsonb)',
                           'asg_status_label(text, timestamptz, boolean)','asg_my_draft(uuid)'] loop
    if has_function_privilege('anon', 'public.' || f, 'execute') or has_function_privilege('authenticated', 'public.' || f, 'execute') then
      raise exception 'FAIL a client role can execute internal %', f;
    end if;
  end loop;
  foreach f in array array['save_assignment(jsonb)','publish_assignment(uuid, boolean)','delete_assignment(uuid)',
                           'duplicate_assignment(uuid)','staff_assignment(uuid)','class_gradebook(uuid)',
                           'staff_submission(uuid)','grade_submission(uuid, jsonb)','return_submissions(uuid, uuid[])',
                           'set_class_scores_visible(uuid, boolean)','log_gradebook_export(uuid)','class_assignments(uuid)',
                           'my_assignment(uuid)','save_assignment_draft(uuid, jsonb)','submit_assignment(uuid, jsonb)'] loop
    if has_function_privilege('anon', 'public.' || f, 'execute') then
      raise exception 'FAIL anon can execute %', f;
    end if;
    if not has_function_privilege('authenticated', 'public.' || f, 'execute') then
      raise exception 'FAIL authenticated cannot execute %', f;
    end if;
  end loop;
  raise notice 'PASS grants: no client table privilege at all (keys included), RLS on, helpers internal, anon executes nothing';
end $$;


-- ------------------------------------------------ 2. anon gets nothing
select pg_temp.become('anon', null);
set local role anon;
do $$ declare r text; begin
  r := public.t048_try('select 1 from public.assignment_question_keys');
  if r not like '42501%' then raise exception 'FAIL anon read keys: %', r; end if;
  r := public.t048_try(format('select public.class_assignments(%L)', pg_temp.k('classA')));
  if r not like '42501%' then raise exception 'FAIL anon called class_assignments: %', r; end if;
  r := public.t048_try(format('select public.submit_assignment(%L, null)', pg_temp.k('classA')));
  if r not like '42501%' then raise exception 'FAIL anon called submit_assignment: %', r; end if;
  raise notice 'PASS anon gets nothing';
end $$;
reset role;


-- ------------------------------------------------ 3. switch off: no creating
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', pg_temp.asg1(pg_temp.u('classA'))));
  if r not like '%groups_disabled%' then raise exception 'FAIL a teacher created an assignment with the switch off: %', r; end if;
  raise notice 'PASS switch off: assignments cannot be created';
end $$;
reset role;
update public.app_settings set value = 'true'::jsonb where key = 'paid.groups_enabled';


-- ------------------------------------------------ 4. teacher creates; validation and caps
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$
declare
  r text;
  j jsonb;
  base jsonb := pg_temp.asg1(pg_temp.u('classA'));
  many jsonb;
begin
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || '{"title":""}'));
  if r not like '%title_required%' then raise exception 'FAIL empty title: %', r; end if;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)',
         base || jsonb_build_object('readings', jsonb_build_array(jsonb_build_object('kind', 'place', 'ref', 'Not An Id!')))));
  if r not like '%bad_reading%' then raise exception 'FAIL a malformed reading ref: %', r; end if;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)',
         base || jsonb_build_object('readings', jsonb_build_array(jsonb_build_object('kind', 'website', 'ref', 'x')))));
  if r not like '%bad_reading%' then raise exception 'FAIL an unknown reading kind: %', r; end if;
  select jsonb_agg(jsonb_build_object('kind', 'bible', 'ref', 'John ' || g)) into many from generate_series(1, 21) g;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || jsonb_build_object('readings', many)));
  if r not like '%too_many_readings%' then raise exception 'FAIL 21 readings: %', r; end if;
  select jsonb_agg(jsonb_build_object('type', 'essay', 'prompt', 'Q' || g, 'points', 1)) into many from generate_series(1, 51) g;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || jsonb_build_object('questions', many)));
  if r not like '%too_many_questions%' then raise exception 'FAIL 51 questions: %', r; end if;
  select jsonb_agg(jsonb_build_object('type', 'essay', 'prompt', 'Q' || g, 'points', 100)) into many from generate_series(1, 11) g;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || jsonb_build_object('questions', many)));
  if r not like '%too_many_points%' then raise exception 'FAIL 1100 points: %', r; end if;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || jsonb_build_object('questions',
         jsonb_build_array(jsonb_build_object('type', 'essay', 'prompt', 'x', 'points', 101)))));
  if r not like '%bad_question%' then raise exception 'FAIL 101 points on one question: %', r; end if;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || jsonb_build_object('questions',
         jsonb_build_array(jsonb_build_object('type', 'mc', 'prompt', 'x', 'options', jsonb_build_array('a', 'b'), 'points', 1)))));
  if r not like '%correct option%' then raise exception 'FAIL mc without a correct option: %', r; end if;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || jsonb_build_object('questions',
         jsonb_build_array(jsonb_build_object('type', 'mc', 'prompt', 'x', 'options', jsonb_build_array('a', repeat('b', 301)), 'correct', 0, 'points', 1)))));
  if r not like '%2 to 8 options%' then raise exception 'FAIL an option of 301 chars: %', r; end if;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || jsonb_build_object('questions',
         jsonb_build_array(jsonb_build_object('type', 'short', 'prompt', 'x', 'accepted', jsonb_build_array('  '), 'points', 1)))));
  if r not like '%accepted answers%' then raise exception 'FAIL short answer with only blank accepted answers: %', r; end if;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', base || jsonb_build_object('questions',
         jsonb_build_array(jsonb_build_object('type', 'tf', 'prompt', 'x', 'points', 1)))));
  if r not like '%true or false%' then raise exception 'FAIL tf without the answer: %', r; end if;

  j := public.save_assignment(base);
  insert into t48 values ('asg1', j ->> 'assignment_id');
  -- A second, never-published assignment.
  j := public.save_assignment(jsonb_build_object('class_id', pg_temp.u('classA'), 'title', 'Unpublished draft'));
  insert into t48 values ('asgDraft', j ->> 'assignment_id');
  perform public.publish_assignment(pg_temp.u('asg1'), true);
  raise notice 'PASS teacher: validation (title, readings shape/kind/20, questions 50/points 100+1000/options/keys) and create + publish';
end $$;
reset role;

do $$ begin
  if (select count(*) from public.assignment_question_keys k join public.assignment_questions q on q.id = k.question_id
       where q.assignment_id = pg_temp.u('asg1')) <> 3 then
    raise exception 'FAIL expected 3 keys (mc, tf, short; essays have none)';
  end if;
  if (select accepted_answers from public.assignment_question_keys k join public.assignment_questions q on q.id = k.question_id
       where q.assignment_id = pg_temp.u('asg1') and q.qtype = 'short') <> array['Saul of Tarsus'] then
    raise exception 'FAIL the short-answer key was not stored';
  end if;
  if (select count(*) from public.assignment_readings where assignment_id = pg_temp.u('asg1')) <> 2 then
    raise exception 'FAIL readings not stored';
  end if;
  raise notice 'PASS keys live in assignment_question_keys only';
end $$;


-- ------------------------------------------------ 5. outsider, other teacher, app owner: nothing
create or replace function public.t048_nothing(who text) returns void language plpgsql as $$
declare r text;
begin
  r := public.t048_try(format('select public.staff_assignment(%L)', (select v from t48 where k = 'asg1')));
  if r not like '42501%' then raise exception 'FAIL % read the staff view of A''s assignment: %', who, r; end if;
  r := public.t048_try(format('select public.class_gradebook(%L)', (select v from t48 where k = 'classA')));
  if r not like '42501%' then raise exception 'FAIL % read A''s gradebook: %', who, r; end if;
  r := public.t048_try(format('select public.class_assignments(%L)', (select v from t48 where k = 'classA')));
  if r not like '42501%' then raise exception 'FAIL % listed A''s assignments: %', who, r; end if;
  r := public.t048_try(format('select public.my_assignment(%L)', (select v from t48 where k = 'asg1')));
  if r not like '42501%' then raise exception 'FAIL % opened A''s assignment: %', who, r; end if;
  r := public.t048_try(format('select public.save_assignment_draft(%L, null)', (select v from t48 where k = 'asg1')));
  if r not like '42501%' then raise exception 'FAIL % started A''s assignment: %', who, r; end if;
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)',
         jsonb_build_object('class_id', (select v from t48 where k = 'classA'), 'title', 'x')));
  if r not like '42501%' then raise exception 'FAIL % created an assignment in A: %', who, r; end if;
  r := public.t048_try(format('select public.publish_assignment(%L, false)', (select v from t48 where k = 'asg1')));
  if r not like '42501%' then raise exception 'FAIL % unpublished A''s assignment: %', who, r; end if;
  r := public.t048_try('select count(*) from public.assignment_submissions');
  if r not like '42501%' then raise exception 'FAIL % read assignment_submissions directly: %', who, r; end if;
  r := public.t048_try('select count(*) from public.assignment_question_keys');
  if r not like '42501%' then raise exception 'FAIL % read the keys directly: %', who, r; end if;
end $$;
grant execute on function public.t048_nothing(text) to authenticated;

select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a5');
set local role authenticated;
select public.t048_nothing('outsider');
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a2');
set local role authenticated;
select public.t048_nothing('leader of class B');
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a6');
set local role authenticated;
select public.t048_nothing('the app owner');
reset role;
do $$ begin raise notice 'PASS outsider, another class''s leader and the APP OWNER get nothing from class A'; end $$;


-- ------------------------------------------------ 6. student: sees published, never the key
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$
declare
  j jsonb;
  r text;
begin
  j := public.class_assignments(pg_temp.u('classA'));
  if j ->> 'role' <> 'member' or jsonb_array_length(j -> 'assignments') <> 1
     or j -> 'assignments' -> 0 ->> 'id' <> pg_temp.k('asg1') then
    raise exception 'FAIL student should see only the one published assignment: %', j;
  end if;
  if j -> 'assignments' -> 0 ->> 'status' <> 'not_started' then raise exception 'FAIL status should be not_started'; end if;
  r := public.t048_try(format('select public.my_assignment(%L)', pg_temp.k('asgDraft')));
  if r not like '42501%' then raise exception 'FAIL a student opened an unpublished assignment: %', r; end if;
  j := public.my_assignment(pg_temp.u('asg1'));
  if jsonb_array_length(j -> 'questions') <> 4 or jsonb_array_length(j -> 'readings') <> 2 then
    raise exception 'FAIL questions/readings missing for the student';
  end if;
  if position('Tarsus' in j::text) > 0 then raise exception 'FAIL the short-answer key reached the student'; end if;
  if exists (select 1 from jsonb_array_elements(j -> 'questions') q
              where q -> 'correct' <> 'null'::jsonb or q -> 'accepted' <> 'null'::jsonb or q -> 'earned' <> 'null'::jsonb) then
    raise exception 'FAIL a key or a score reached the student before submitting';
  end if;
  r := public.t048_try('select * from public.assignment_question_keys');
  if r not like '42501%' then raise exception 'FAIL a student read the keys table: %', r; end if;
  r := public.t048_try('select * from public.assignment_answers');
  if r not like '42501%' then raise exception 'FAIL a student read answers directly: %', r; end if;
  r := public.t048_try(format('select public.staff_assignment(%L)', pg_temp.k('asg1')));
  if r not like '42501%' then raise exception 'FAIL a student opened the staff view (keys): %', r; end if;
  r := public.t048_try(format('select public.class_gradebook(%L)', pg_temp.k('classA')));
  if r not like '42501%' then raise exception 'FAIL a student read the gradebook: %', r; end if;
  raise notice 'PASS student: only published work, no key/score in my_assignment, no keys/answers/gradebook/staff view';
end $$;

-- Draft saving: the student's draft is theirs; answer validation.
do $$
declare
  r text;
  q jsonb := (public.my_assignment(pg_temp.u('asg1')) -> 'questions');
begin
  insert into t48 values ('qMc', q -> 0 ->> 'id'), ('qTf', q -> 1 ->> 'id'), ('qShort', q -> 2 ->> 'id'), ('qEssay', q -> 3 ->> 'id');
  r := public.t048_try(format('select public.save_assignment_draft(%L, %L::jsonb)', pg_temp.k('asg1'),
         jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qMc'), 'choice', 9))));
  if r not like '%bad_answers%' then raise exception 'FAIL choice 9 of 3 accepted: %', r; end if;
  r := public.t048_try(format('select public.save_assignment_draft(%L, %L::jsonb)', pg_temp.k('asg1'),
         jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qShort'), 'text', repeat('x', 501)))));
  if r not like '%answer_too_long%' then raise exception 'FAIL a 501-char short answer accepted: %', r; end if;
  r := public.t048_try(format('select public.save_assignment_draft(%L, %L::jsonb)', pg_temp.k('asg1'),
         jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qEssay'), 'text', repeat('x', 20001)))));
  if r not like '%answer_too_long%' then raise exception 'FAIL a 20001-char essay accepted: %', r; end if;
  r := public.t048_try(format('select public.save_assignment_draft(%L, %L::jsonb)', pg_temp.k('asg1'),
         jsonb_build_array(jsonb_build_object('question_id', gen_random_uuid(), 'text', 'x'))));
  if r not like '%bad_answers%' then raise exception 'FAIL an answer to a question of no assignment accepted: %', r; end if;
  r := public.t048_try(format('select public.save_assignment_draft(%L, %L::jsonb)', pg_temp.k('asg1'),
         jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qTf'), 'value', 'yes'))));
  if r not like '%bad_answers%' then raise exception 'FAIL a non-boolean true/false answer accepted: %', r; end if;
  perform public.save_assignment_draft(pg_temp.u('asg1'),
    jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qEssay'), 'text', 'A first draft.')));
  if (public.my_assignment(pg_temp.u('asg1')) -> 'questions' -> 3 ->> 'text') <> 'A first draft.' then
    raise exception 'FAIL the draft was not saved';
  end if;
  raise notice 'PASS drafts save; bad choice, long short/essay, foreign question, non-boolean refused';
end $$;
reset role;
insert into t48 select 'subS1', id::text from public.assignment_submissions
 where assignment_id = pg_temp.u('asg1') and user_id = '00000000-0000-4000-8000-0000000000a3';


-- ------------------------------------------------ 7. the lock, and draft privacy
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$
declare
  r text;
  j jsonb;
begin
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)',
         pg_temp.asg1(pg_temp.u('classA')) || jsonb_build_object('id', pg_temp.k('asg1'))));
  if r not like '%assignment_locked%' then raise exception 'FAIL questions changed after a student started: %', r; end if;
  j := public.save_assignment(jsonb_build_object('id', pg_temp.k('asg1'), 'class_id', pg_temp.k('classA'),
         'title', 'Week 1: Romans 1 (edited)', 'due_at', (now() + interval '7 days')::text,
         'readings', jsonb_build_array(jsonb_build_object('kind', 'bible', 'ref', 'Romans 1'))));
  if not (j ->> 'locked')::boolean then raise exception 'FAIL save should report locked'; end if;
  r := public.t048_try(format('select public.publish_assignment(%L, false)', pg_temp.k('asg1')));
  if r not like '%has_submissions%' then raise exception 'FAIL unpublished with work in it: %', r; end if;
  r := public.t048_try(format('select public.delete_assignment(%L)', pg_temp.k('asg1')));
  if r not like '%has_submissions%' then raise exception 'FAIL deleted with work in it: %', r; end if;
  j := public.class_gradebook(pg_temp.u('classA'));
  if (select count(*) from jsonb_array_elements(j -> 'cells') c
       where c ->> 'status' = 'in_progress' and c -> 'submission_id' = 'null'::jsonb) <> 1 then
    raise exception 'FAIL the gradebook should show the draft as in_progress with no submission id: %', j -> 'cells';
  end if;
  r := public.t048_try(format('select public.staff_submission(%L)', pg_temp.k('subS1')));
  if r not like '%not_submitted%' then raise exception 'FAIL a teacher read a student''s unsubmitted draft: %', r; end if;
  -- duplicate = the new version, unlocked, with the keys copied
  insert into t48 values ('asgCopy', public.duplicate_assignment(pg_temp.u('asg1'))::text);
  j := public.staff_assignment(pg_temp.u('asgCopy'));
  if (j ->> 'locked')::boolean or j ->> 'published_at' is not null or jsonb_array_length(j -> 'questions') <> 4
     or (j -> 'questions' -> 2 -> 'accepted' ->> 0) <> 'Saul of Tarsus' then
    raise exception 'FAIL duplicate should be an unlocked draft with the questions and keys: %', j;
  end if;
  perform public.delete_assignment(pg_temp.u('asgCopy'));
  raise notice 'PASS lock: questions refused once started (other fields editable), no unpublish/delete; drafts private; duplicate makes a new version';
end $$;
reset role;


-- ------------------------------------------------ 8. submit: server-side grading, single attempt
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$
declare
  j jsonb;
  r text;
begin
  j := public.submit_assignment(pg_temp.u('asg1'), jsonb_build_array(
         jsonb_build_object('question_id', pg_temp.k('qMc'), 'choice', 1),
         jsonb_build_object('question_id', pg_temp.k('qTf'), 'value', true),
         jsonb_build_object('question_id', pg_temp.k('qShort'), 'text', '  saul OF   tarsus. '),
         jsonb_build_object('question_id', pg_temp.k('qEssay'), 'text', 'Christ died for our sins and rose again.')));
  if (j ->> 'returned')::boolean or position('points' in j::text) > 0 or position('score' in j::text) > 0 then
    raise exception 'FAIL submit should return no score when not released: %', j;
  end if;
  j := public.my_assignment(pg_temp.u('asg1'));
  if j -> 'submission' ->> 'status' <> 'submitted' or j -> 'submission' -> 'final_score' <> 'null'::jsonb then
    raise exception 'FAIL a submitted (not returned) assignment should show no score: %', j -> 'submission';
  end if;
  if position('Tarsus' in j::text) > 0 then
    raise exception 'FAIL key leaked after submit';
  end if;
  if exists (select 1 from jsonb_array_elements(j -> 'questions') q
              where q -> 'correct' <> 'null'::jsonb or q -> 'accepted' <> 'null'::jsonb or q -> 'earned' <> 'null'::jsonb) then
    raise exception 'FAIL correctness reached the student before return';
  end if;
  r := public.t048_try(format('select public.submit_assignment(%L, null)', pg_temp.k('asg1')));
  if r not like '%already_submitted%' then raise exception 'FAIL a second submit: %', r; end if;
  r := public.t048_try(format('select public.save_assignment_draft(%L, null)', pg_temp.k('asg1')));
  if r not like '%already_submitted%' then raise exception 'FAIL editing after submit: %', r; end if;
  raise notice 'PASS submit: no score back, nothing revealed, one attempt only';
end $$;
reset role;

do $$
declare s public.assignment_submissions%rowtype;
begin
  select * into s from public.assignment_submissions where id = pg_temp.u('subS1');
  if s.status <> 'submitted' or not s.needs_grading or s.raw_points <> 5 or s.max_points <> 16 or s.is_late then
    raise exception 'FAIL grading: status %, needs %, raw %, max %, late %', s.status, s.needs_grading, s.raw_points, s.max_points, s.is_late;
  end if;
  if (select auto_points from public.assignment_answers where submission_id = s.id and question_id = pg_temp.u('qShort')) <> 3 then
    raise exception 'FAIL short answer should match case/space-insensitively';
  end if;
  if (select auto_points from public.assignment_answers where submission_id = s.id and question_id = pg_temp.u('qTf')) <> 0 then
    raise exception 'FAIL a wrong true/false should score 0';
  end if;
  if (select auto_points from public.assignment_answers where submission_id = s.id and question_id = pg_temp.u('qEssay')) is not null then
    raise exception 'FAIL an essay must wait for the teacher';
  end if;
  raise notice 'PASS grader: mc 2 + tf 0 + short 3 (normalised) = 5 of 16, essay queued';
end $$;


-- ------------------------------------------------ 9. classmates see nothing of each other
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a4');
set local role authenticated;
do $$
declare
  j jsonb;
  r text;
begin
  j := public.my_assignment(pg_temp.u('asg1'));
  if j -> 'submission' <> 'null'::jsonb or position('Christ died' in j::text) > 0 then
    raise exception 'FAIL S2 saw S1''s submission';
  end if;
  j := public.class_assignments(pg_temp.u('classA'));
  if j -> 'assignments' -> 0 ->> 'status' <> 'not_started' then raise exception 'FAIL S2 status leaked from S1'; end if;
  r := public.t048_try(format('select public.staff_submission(%L)', pg_temp.k('subS1')));
  if r not like '42501%' then raise exception 'FAIL S2 opened S1''s submission: %', r; end if;
  r := public.t048_try(format('select public.grade_submission(%L, %L::jsonb)', pg_temp.k('subS1'), '{}'));
  if r not like '42501%' then raise exception 'FAIL S2 graded S1: %', r; end if;
  raise notice 'PASS a classmate sees nothing of another student''s work';
end $$;
reset role;


-- ------------------------------------------------ 10. cross-class: B's leader cannot touch A's work
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a2');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.staff_submission(%L)', pg_temp.k('subS1')));
  if r not like '42501%' then raise exception 'FAIL B read S1''s class-A work (S1 is in B too): %', r; end if;
  r := public.t048_try(format('select public.grade_submission(%L, %L::jsonb)', pg_temp.k('subS1'), '{"feedback":"x"}'));
  if r not like '42501%' then raise exception 'FAIL B graded class-A work: %', r; end if;
  r := public.t048_try(format('select public.return_submissions(%L, null)', pg_temp.k('asg1')));
  if r not like '42501%' then raise exception 'FAIL B returned class-A work: %', r; end if;
  raise notice 'PASS cross-class: another class''s leader cannot read, grade or return (even for a shared student)';
end $$;
reset role;


-- ------------------------------------------------ 11. grading, return, regrade audit
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$
declare
  j jsonb;
  r text;
begin
  j := public.staff_submission(pg_temp.u('subS1'));
  if j -> 'answers' -> 2 -> 'accepted' ->> 0 <> 'Saul of Tarsus' or (j -> 'answers' -> 0 ->> 'correct')::int <> 1 then
    raise exception 'FAIL the teacher should see the keys beside the answers';
  end if;
  r := public.t048_try(format('select public.grade_submission(%L, %L::jsonb)', pg_temp.k('subS1'),
         jsonb_build_object('answers', jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qEssay'), 'points', 11)))));
  if r not like '%bad_points%' then raise exception 'FAIL 11 of 10 points accepted: %', r; end if;
  r := public.t048_try(format('select public.grade_submission(%L, %L::jsonb)', pg_temp.k('subS1'),
         jsonb_build_object('feedback', repeat('x', 5001))));
  if r not like '%feedback_too_long%' then raise exception 'FAIL 5001-char feedback accepted: %', r; end if;
  -- return before the essay is graded: skipped
  if public.return_submissions(pg_temp.u('asg1'), null) <> 0 then raise exception 'FAIL returned work still needing grading'; end if;
  j := public.grade_submission(pg_temp.u('subS1'), jsonb_build_object(
         'answers', jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qEssay'), 'points', 7.5, 'feedback', 'Good start.')),
         'feedback', 'Well done overall.'));
  if (j ->> 'final_score')::numeric <> 12.5 or (j ->> 'needs_grading')::boolean then
    raise exception 'FAIL after grading the essay: %', j;
  end if;
  if public.return_submissions(pg_temp.u('asg1'), null) <> 1 then raise exception 'FAIL return should release 1'; end if;
  -- regrade of returned work: a reason is required, and it is logged
  r := public.t048_try(format('select public.grade_submission(%L, %L::jsonb)', pg_temp.k('subS1'),
         jsonb_build_object('answers', jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qTf'), 'points', 1)))));
  if r not like '%reason_required%' then raise exception 'FAIL silent regrade of returned work: %', r; end if;
  j := public.grade_submission(pg_temp.u('subS1'), jsonb_build_object('reason', 'Question was ambiguous',
         'answers', jsonb_build_array(jsonb_build_object('question_id', pg_temp.k('qTf'), 'points', 1))));
  if (j ->> 'final_score')::numeric <> 13.5 then raise exception 'FAIL regrade total: %', j; end if;
  j := public.staff_submission(pg_temp.u('subS1'));
  if (select count(*) from jsonb_array_elements(j -> 'events') e where e ->> 'kind' = 'answer') <> 2
     or (select count(*) from jsonb_array_elements(j -> 'events') e where e ->> 'kind' = 'final') <> 2
     or (select count(*) from jsonb_array_elements(j -> 'events') e where e ->> 'kind' = 'return') <> 1
     or not exists (select 1 from jsonb_array_elements(j -> 'events') e where e ->> 'reason' = 'Question was ambiguous') then
    raise exception 'FAIL the regrade log is incomplete: %', j -> 'events';
  end if;
  raise notice 'PASS grading: bounds, essay score + feedback, return skips ungraded, regrade needs a reason and is logged';
end $$;
reset role;

-- The co-teacher of A can grade too.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a7');
set local role authenticated;
do $$ begin
  perform public.staff_submission(pg_temp.u('subS1'));
  perform public.class_gradebook(pg_temp.u('classA'));
  raise notice 'PASS co-teacher reads the gradebook and submissions';
end $$;
reset role;

-- The student now sees score and feedback, and still no key (show_correct_answers off).
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$ declare j jsonb; begin
  j := public.my_assignment(pg_temp.u('asg1'));
  if (j -> 'submission' ->> 'final_score')::numeric <> 13.5 or j -> 'submission' ->> 'feedback' <> 'Well done overall.'
     or j -> 'submission' ->> 'status' <> 'graded' or (j -> 'questions' -> 3 ->> 'earned')::numeric <> 7.5
     or j -> 'questions' -> 3 ->> 'feedback' <> 'Good start.' then
    raise exception 'FAIL returned work should show score and feedback: %', j -> 'submission';
  end if;
  if position('Saul of Tarsus' in j::text) > 0 then raise exception 'FAIL key shown with show_correct_answers off'; end if;
  raise notice 'PASS returned: the student sees their score and feedback, not the key';
end $$;
reset role;

-- Teacher turns on show_correct_answers (allowed while locked): S1 (returned) sees keys, S2 (not started) does not.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ begin
  perform public.save_assignment(jsonb_build_object('id', pg_temp.k('asg1'), 'class_id', pg_temp.k('classA'),
            'title', 'Week 1: Romans 1 (edited)', 'due_at', (now() + interval '7 days')::text, 'show_correct_answers', true));
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$ begin
  if position('Saul of Tarsus' in public.my_assignment(pg_temp.u('asg1'))::text) = 0 then
    raise exception 'FAIL show_correct_answers did not show the key to a returned student';
  end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a4');
set local role authenticated;
do $$ begin
  if position('Tarsus' in public.my_assignment(pg_temp.u('asg1'))::text) > 0 then
    raise exception 'FAIL show_correct_answers showed the key to a student who has not handed in';
  end if;
  raise notice 'PASS show_correct_answers: only to students whose work was returned';
end $$;
reset role;


-- ------------------------------------------------ 12. late work: flag, penalty snapshot, waiver; no-late refusal
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ declare j jsonb; begin
  j := public.save_assignment(jsonb_build_object('class_id', pg_temp.k('classA'), 'title', 'Late OK',
         'due_at', (now() - interval '2 days 1 hour')::text, 'accept_late', true,
         'late_penalty_pct_per_day', 10, 'late_penalty_max_pct', 25, 'auto_release', true,
         'questions', jsonb_build_array(jsonb_build_object('type', 'mc', 'prompt', 'Pick b', 'options', jsonb_build_array('a', 'b'), 'correct', 1, 'points', 4))));
  insert into t48 values ('asgLate', j ->> 'assignment_id');
  perform public.publish_assignment(pg_temp.u('asgLate'), true);
  j := public.save_assignment(jsonb_build_object('class_id', pg_temp.k('classA'), 'title', 'No late work',
         'due_at', (now() - interval '1 hour')::text, 'accept_late', false));
  insert into t48 values ('asgNoLate', j ->> 'assignment_id');
  perform public.publish_assignment(pg_temp.u('asgNoLate'), true);
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a4');
set local role authenticated;
do $$ declare j jsonb; r text; q text; begin
  q := public.my_assignment(pg_temp.u('asgLate')) -> 'questions' -> 0 ->> 'id';
  j := public.submit_assignment(pg_temp.u('asgLate'), jsonb_build_array(jsonb_build_object('question_id', q, 'choice', 1)));
  if not (j ->> 'late')::boolean or not (j ->> 'returned')::boolean then raise exception 'FAIL late + auto-release: %', j; end if;
  j := public.my_assignment(pg_temp.u('asgLate'));
  if j -> 'submission' ->> 'status' <> 'graded' or (j -> 'submission' ->> 'final_score')::numeric <> 3 then
    raise exception 'FAIL 3 days late at 10%%/day capped at 25%% of 4 should be 3.00: %', j -> 'submission';
  end if;
  r := public.t048_try(format('select public.save_assignment_draft(%L, null)', pg_temp.k('asgNoLate')));
  if r not like '%past_due%' then raise exception 'FAIL work accepted after the due date with late work off: %', r; end if;
  raise notice 'PASS late: flagged, penalty applied (capped), auto-released; no-late assignment refuses work';
end $$;
reset role;
insert into t48 select 'subLate', id::text from public.assignment_submissions
 where assignment_id = pg_temp.u('asgLate') and user_id = '00000000-0000-4000-8000-0000000000a4';
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ declare j jsonb; r text; begin
  -- Change the policy afterwards: the graded work does not move.
  perform public.save_assignment(jsonb_build_object('id', pg_temp.k('asgLate'), 'class_id', pg_temp.k('classA'), 'title', 'Late OK',
            'due_at', (now() + interval '1 day')::text, 'late_penalty_pct_per_day', 50, 'late_penalty_max_pct', 100));
  j := public.grade_submission(pg_temp.u('subLate'), '{"feedback":"Noted."}'::jsonb);
  if (j ->> 'final_score')::numeric <> 3 then raise exception 'FAIL a later policy change rewrote a grade: %', j; end if;
  if not (public.staff_submission(pg_temp.u('subLate')) ->> 'is_late')::boolean then
    raise exception 'FAIL moving the due date un-flagged late work';
  end if;
  r := public.t048_try(format('select public.grade_submission(%L, %L::jsonb)', pg_temp.k('subLate'), '{"waive_late_penalty":true}'));
  if r not like '%reason_required%' then raise exception 'FAIL waiver on returned work without a reason: %', r; end if;
  j := public.grade_submission(pg_temp.u('subLate'), '{"waive_late_penalty":true,"reason":"Excused"}'::jsonb);
  if (j ->> 'final_score')::numeric <> 4 then raise exception 'FAIL the waiver should restore 4: %', j; end if;
  raise notice 'PASS late penalty is a snapshot (policy and due-date changes never rewrite it); waiver logged with a reason';
end $$;
reset role;


-- ------------------------------------------------ 13. church group: scores hidden by default; owner-only toggle
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a2');
set local role authenticated;
do $$ declare j jsonb; begin
  j := public.save_assignment(jsonb_build_object('class_id', pg_temp.k('classB'), 'title', 'Read John 1', 'auto_release', true,
         'readings', jsonb_build_array(jsonb_build_object('kind', 'bible', 'ref', 'John 1')),
         'questions', jsonb_build_array(jsonb_build_object('type', 'tf', 'prompt', 'In the beginning was the Word.', 'correct', true, 'points', 1))));
  insert into t48 values ('asgB', j ->> 'assignment_id');
  perform public.publish_assignment(pg_temp.u('asgB'), true);
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$ declare j jsonb; q text; begin
  j := public.class_assignments(pg_temp.u('classB'));
  if jsonb_array_length(j -> 'assignments') <> 1 or position('Romans' in j::text) > 0 then
    raise exception 'FAIL S1 in class B should see only B''s work: %', j;
  end if;
  q := public.my_assignment(pg_temp.u('asgB')) -> 'questions' -> 0 ->> 'id';
  perform public.submit_assignment(pg_temp.u('asgB'), jsonb_build_array(jsonb_build_object('question_id', q, 'value', true)));
  j := public.my_assignment(pg_temp.u('asgB'));
  if j -> 'submission' ->> 'status' <> 'graded' or j -> 'submission' -> 'final_score' <> 'null'::jsonb
     or j -> 'questions' -> 0 -> 'earned' <> 'null'::jsonb then
    raise exception 'FAIL a church group with scores hidden showed a number: %', j -> 'submission';
  end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a7');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.set_class_scores_visible(%L, true)', pg_temp.k('classA')));
  if r not like '42501%' then raise exception 'FAIL a co-teacher changed score visibility: %', r; end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a2');
set local role authenticated;
do $$ begin perform public.set_class_scores_visible(pg_temp.u('classB'), true); end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$ begin
  if (public.my_assignment(pg_temp.u('asgB')) -> 'submission' ->> 'final_score')::numeric <> 1 then
    raise exception 'FAIL the score should show once the leader turns scores on';
  end if;
  raise notice 'PASS church group: scores hidden by default ("Reviewed"), owner-only toggle shows them';
end $$;
reset role;


-- ------------------------------------------------ 14. export log
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.log_gradebook_export(%L)', pg_temp.k('classA')));
  if r not like '42501%' then raise exception 'FAIL a student logged an export: %', r; end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ begin perform public.log_gradebook_export(pg_temp.u('classA')); end $$;
reset role;
do $$ begin
  if (select count(*) from public.class_export_log where class_id = pg_temp.u('classA')) <> 1 then
    raise exception 'FAIL the export was not logged';
  end if;
  raise notice 'PASS gradebook export: staff only, logged';
end $$;


-- ------------------------------------------------ 15. class end: read-only archive; grading window
update public.classes set ends_on = current_date - 3 where id = pg_temp.u('classA');
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a4');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.save_assignment_draft(%L, null)', pg_temp.k('asg1')));
  if r not like '%class_closed%' then raise exception 'FAIL a student saved work after the class ended: %', r; end if;
  if (public.my_assignment(pg_temp.u('asgLate')) -> 'submission' ->> 'status') <> 'graded' then
    raise exception 'FAIL a student should still read their own work after the end';
  end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', jsonb_build_object('class_id', pg_temp.k('classA'), 'title', 'After the end')));
  if r not like '%class_closed%' then raise exception 'FAIL a teacher created work after the class ended: %', r; end if;
  perform public.grade_submission(pg_temp.u('subS1'), '{"feedback":"Final note."}'::jsonb);
end $$;
reset role;
update public.classes set status = 'ended', ended_at = now() - interval '31 days' where id = pg_temp.u('classA');
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.grade_submission(%L, %L::jsonb)', pg_temp.k('subS1'), '{"feedback":"Too late"}'));
  if r not like '%grading_closed%' then raise exception 'FAIL grading 31 days after the end: %', r; end if;
  perform public.class_gradebook(pg_temp.u('classA'));
  raise notice 'PASS class end: students read-only, no new work, grading for 30 days then closed, gradebook still readable';
end $$;
reset role;
update public.classes set status = 'active', ended_at = null, ends_on = null where id = pg_temp.u('classA');


-- ------------------------------------------------ 16. leaving / removal: work retained for staff only
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ begin perform public.remove_class_member(pg_temp.u('classA'), '00000000-0000-4000-8000-0000000000a3'); end $$;
do $$ declare j jsonb; begin
  j := public.class_gradebook(pg_temp.u('classA'));
  if not exists (select 1 from jsonb_array_elements(j -> 'students') s
                  where s ->> 'user_id' = '00000000-0000-4000-8000-0000000000a3' and not (s ->> 'active')::boolean)
     or not exists (select 1 from jsonb_array_elements(j -> 'cells') c
                     where c ->> 'user_id' = '00000000-0000-4000-8000-0000000000a3' and c ->> 'status' = 'graded') then
    raise exception 'FAIL a removed student''s graded work should stay in the gradebook, marked left';
  end if;
  if (public.staff_submission(pg_temp.u('subS1')) ->> 'active')::boolean then
    raise exception 'FAIL staff_submission should say the student left';
  end if;
end $$;
reset role;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a3');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.my_assignment(%L)', pg_temp.k('asg1')));
  if r not like '42501%' then raise exception 'FAIL a removed student still opens the class''s work: %', r; end if;
  r := public.t048_try(format('select public.class_assignments(%L)', pg_temp.k('classA')));
  if r not like '42501%' then raise exception 'FAIL a removed student still lists the class: %', r; end if;
  raise notice 'PASS removal: submitted work retained for staff (marked left); the former member sees nothing';
end $$;
reset role;


-- ------------------------------------------------ 17. account deletion
delete from auth.users where id = '00000000-0000-4000-8000-0000000000a4';
do $$ begin
  if exists (select 1 from public.assignment_submissions where user_id = '00000000-0000-4000-8000-0000000000a4') then
    raise exception 'FAIL a deleted student''s submissions remain';
  end if;
  if exists (select 1 from public.assignment_grade_events where submission_id = pg_temp.u('subLate'))
     or exists (select 1 from public.assignment_answers where submission_id = pg_temp.u('subLate')) then
    raise exception 'FAIL a deleted student''s answers / grade events remain';
  end if;
end $$;
delete from auth.users where id = '00000000-0000-4000-8000-0000000000a1';
do $$ begin
  if (select created_by from public.assignments where id = pg_temp.u('asg1')) is not null then
    raise exception 'FAIL assignments.created_by should be nulled';
  end if;
  if exists (select 1 from public.assignment_grade_events where actor = '00000000-0000-4000-8000-0000000000a1') then
    raise exception 'FAIL grade events should keep no actor id of a deleted teacher';
  end if;
  if (select count(*) from public.assignment_grade_events where submission_id = pg_temp.u('subS1')) = 0 then
    raise exception 'FAIL the regrade log should survive the teacher''s account';
  end if;
  raise notice 'PASS deletion: student work cascades away; a teacher''s deletion keeps the record, actor nulled';
end $$;


-- ------------------------------------------------ 18. 200 assignments per class
insert into public.assignments (class_id, title)
  select pg_temp.u('classB'), 'filler ' || g from generate_series(1, 199) g;
select pg_temp.become('authenticated', '00000000-0000-4000-8000-0000000000a2');
set local role authenticated;
do $$ declare r text; begin
  r := public.t048_try(format('select public.save_assignment(%L::jsonb)', jsonb_build_object('class_id', pg_temp.k('classB'), 'title', 'one too many')));
  if r not like '%too_many_assignments%' then raise exception 'FAIL the 201st assignment: %', r; end if;
  raise notice 'PASS 200 assignments per class';
end $$;
reset role;


do $$ begin raise notice 'ALL 048 CHECKS PASSED'; end $$;
rollback;

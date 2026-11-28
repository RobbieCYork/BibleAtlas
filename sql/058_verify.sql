-- ============================================================================
-- 058_verify.sql — run AFTER sql/058_has_role_at_least_no_probing.sql.
-- READ-ONLY: one transaction that ends in ROLLBACK; it only sets
-- transaction-local settings and switches role. Paste the whole file into the
-- Supabase SQL Editor. Every row's `ok` column should be true.
-- ============================================================================
begin;

select set_config('verify.owner',
       (select user_id::text from public.user_roles where role = 'owner' limit 1), true);
select set_config('verify.c1', (select prosrc like '%058: an API caller may only ask about itself%'
       from pg_proc where oid = 'public.has_role_at_least(text,uuid)'::regprocedure)::text, true);
select set_config('verify.c2', has_function_privilege('anon', 'public.has_role_at_least(text,uuid)', 'EXECUTE')::text, true);
select set_config('verify.c3', has_function_privilege('authenticated', 'public.has_role_at_least(text,uuid)', 'EXECUTE')::text, true);
select set_config('verify.c4', public.has_role_at_least('owner', current_setting('verify.owner')::uuid)::text, true);

-- Pretend to be a signed-out visitor using the anon key.
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select set_config('verify.c5', (public.has_role_at_least('owner', current_setting('verify.owner')::uuid) = false)::text, true);
select set_config('verify.c6', (public.has_role_at_least('administrator', current_setting('verify.owner')::uuid) = false)::text, true);
select set_config('verify.c7', ((select count(*) from public.reports) = 0)::text, true);
select set_config('verify.c8', ((select count(*) from public.user_roles) = 0)::text, true);
reset role;

-- Pretend to be the owner, signed in.
select set_config('request.jwt.claims',
       json_build_object('role', 'authenticated', 'sub', current_setting('verify.owner'))::text, true);
set local role authenticated;
select set_config('verify.c9', public.has_role_at_least('owner')::text, true);
select set_config('verify.c10', ((select count(*) from public.user_roles) >= 1)::text, true);
reset role;

select n, check_name, current_setting('verify.c' || n)::boolean as ok
from (values
  (1,  'new 058 body is live'),
  (2,  'anon still has EXECUTE (RLS policies need it)'),
  (3,  'authenticated still has EXECUTE'),
  (4,  'SQL Editor / trusted connection still answers for the owner'),
  (5,  'signed-out probe "is <owner> owner?" now false'),
  (6,  'signed-out probe "is <owner> administrator?" now false'),
  (7,  'signed-out read of reports: no error, 0 rows'),
  (8,  'signed-out read of user_roles: no error, 0 rows'),
  (9,  'owner signed in: has_role_at_least(''owner'') still true'),
  (10, 'owner signed in still sees user_roles (admin policy works)')
) v(n, check_name)
order by n;

rollback;

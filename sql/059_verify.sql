-- ============================================================================
-- 059_verify.sql — run AFTER sql/059_is_admin_no_probing.sql.
-- READ-ONLY: one transaction ending in ROLLBACK; only transaction-local
-- settings and role switches. Paste into the Supabase SQL Editor. Every row's
-- `ok` should be true.
-- ============================================================================
begin;

select set_config('verify.owner',
       (select user_id::text from public.user_roles where role = 'owner' limit 1), true);
select set_config('verify.events_total', (select count(*) from public.analytics_events)::text, true);
select set_config('verify.c1', (select prosrc like '%059: an API caller may only ask about itself%'
       from pg_proc where oid = 'public.is_admin(uuid)'::regprocedure)::text, true);
select set_config('verify.c2', has_function_privilege('anon', 'public.is_admin(uuid)', 'EXECUTE')::text, true);
select set_config('verify.c3', public.is_admin(current_setting('verify.owner')::uuid)::text, true);

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select set_config('verify.c4', (public.is_admin(current_setting('verify.owner')::uuid) = false)::text, true);
select set_config('verify.c5', ((select count(*) from public.analytics_events) = 0)::text, true);
select set_config('verify.c6', ((select count(*) from public.analytics_sessions) = 0)::text, true);
reset role;

select set_config('request.jwt.claims',
       json_build_object('role', 'authenticated', 'sub', current_setting('verify.owner'))::text, true);
set local role authenticated;
select set_config('verify.c7', public.is_admin()::text, true);
select set_config('verify.c8', ((select count(*) from public.analytics_events)::text
       = current_setting('verify.events_total'))::text, true);
reset role;

select n, check_name, current_setting('verify.c' || n)::boolean as ok
from (values
  (1, 'new 059 is_admin body is live'),
  (2, 'anon still has EXECUTE on is_admin (analytics policies need it)'),
  (3, 'SQL Editor / trusted connection: is_admin(<owner>) still true'),
  (4, 'signed-out probe is_admin(<owner>) now false'),
  (5, 'signed-out read of analytics_events: no error, 0 rows'),
  (6, 'signed-out read of analytics_sessions: no error, 0 rows'),
  (7, 'owner signed in: is_admin() still true'),
  (8, 'owner signed in still sees every analytics_events row')
) v(n, check_name)
order by n;

rollback;

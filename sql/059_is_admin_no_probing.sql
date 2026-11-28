-- ============================================================================
-- 059_is_admin_no_probing.sql — SAME FIX AS 058, FOR is_admin(uuid)
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word. Run it once, the whole file
--         in one go (one transaction), in the Supabase SQL Editor or
--           psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/059_is_admin_no_probing.sql
--         Then run sql/059_verify.sql (or automation/manager/verify-058-059.sql).
--
-- NUMBERING: 059 was free on every branch on 2026-11-28. Depends only on
--            sql/019 (is_admin) and sql/025 (user_roles), both APPLIED.
--            Independent of 058 — either may be applied first.
--
-- THE HOLE: is_admin(uid uuid default auth.uid()) is SECURITY DEFINER, EXECUTE
-- is granted to PUBLIC, anon and authenticated, and it answers for any uid.
-- Confirmed on production 2026-11-28 with only the anon key and no sign-in:
--   POST /rest/v1/rpc/is_admin {"uid":<owner id>} -> true; random uuid -> false.
--
-- WHY THE GRANT STAYS: policies analytics_events_admin_read and
-- analytics_sessions_admin_read are `to public` and call is_admin(), so a
-- signed-out read of those tables needs EXECUTE (revoking it turns "0 rows"
-- into "permission denied"). Every caller on production — those two policies
-- and the twelve admin_* functions — uses the default uid = auth.uid().
--
-- THE FIX (identical rule to 058): an API request (JWT role anon or
-- authenticated, or arriving through the `authenticator` login) may ask only
-- about itself, unless the caller is itself administrator/owner. Asking about
-- anyone else returns false — the same answer as "not an admin". The SQL
-- Editor / psql as postgres and the service_role key answer as before.
--
-- The body moves from LANGUAGE sql to plpgsql (CREATE OR REPLACE allows that).
-- Name, parameter name `uid`, default, return type, STABLE, SECURITY DEFINER,
-- search_path, owner and grants are unchanged. Nothing is dropped. No data
-- changes.
-- ============================================================================

begin;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller   uuid := auth.uid();
  v_jwt_role text := auth.role();
  v_client   boolean;
begin
  if is_admin.uid is null then
    return false;
  end if;

  -- 059: an API caller may only ask about itself, unless it is an admin.
  v_client := coalesce(v_jwt_role, '') <> 'service_role'
              and (session_user = 'authenticator'
                   or coalesce(v_jwt_role, '') in ('anon', 'authenticated'));

  if v_client and is_admin.uid is distinct from v_caller then
    if v_caller is null or not exists (
         select 1 from user_roles r
          where r.user_id = v_caller and r.role in ('administrator', 'owner')) then
      return false;
    end if;
  end if;

  return exists (select 1 from user_roles r
                  where r.user_id = is_admin.uid and r.role in ('administrator', 'owner'));
end;
$$;

comment on function public.is_admin(uuid) is
  'True when uid (default: the caller) is administrator or owner. Since sql/059 an API caller '
  'may only ask about itself unless it is an admin; asking about anyone else returns false.';

commit;

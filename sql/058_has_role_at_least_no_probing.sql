-- ============================================================================
-- 058_has_role_at_least_no_probing.sql — STOP STRANGERS ASKING "IS USER X STAFF?"
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Run it once, by hand, the whole file in one go (it is one
--         transaction): paste the whole file into the Supabase SQL Editor, or
--           psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/058_has_role_at_least_no_probing.sql
--         Then run automation/manager/verify-058.sql.
--
-- NUMBERING: 058 was free on every branch on 2026-11-28. Depends only on
--            sql/025 (has_role_at_least, role_rank, user_roles), which is
--            APPLIED. Does not depend on any unapplied migration.
--
-- ----------------------------------------------------------------------------
-- THE HOLE (manager-inbox finding 2026-11-21T0333, open item 48)
-- ----------------------------------------------------------------------------
-- has_role_at_least(p_role text, p_uid uuid default auth.uid()) is SECURITY
-- DEFINER and EXECUTE is granted to PUBLIC, anon and authenticated. It answers
-- for ANY p_uid the caller supplies. Confirmed on production 2026-11-28 with
-- only the anon key and no sign-in:
--   POST /rest/v1/rpc/has_role_at_least {"p_role":"owner","p_uid":<owner id>} -> true
--   same with a random uuid                                                -> false
-- So anyone holding a user id can learn whether that account is owner,
-- administrator or advisor. It reads nothing else.
--
-- ----------------------------------------------------------------------------
-- WHY NOT JUST REVOKE EXECUTE FROM anon
-- ----------------------------------------------------------------------------
-- Thirteen RLS policies call has_role_at_least('<role>') with the default
-- argument, and almost all are `to public` (reports, user_roles, app_settings,
-- moderation_*, report_votes, role_audit, ...). A policy expression runs as the
-- CALLER, so the caller needs EXECUTE: revoking it from anon would turn every
-- signed-out read of those tables from "zero rows" into "permission denied for
-- function has_role_at_least". The grant has to stay.
--
-- Nor can a one-argument overload be added: has_role_at_least('owner') would
-- then match both and fail as "not unique". And defaults cannot be removed by
-- CREATE OR REPLACE.
--
-- ----------------------------------------------------------------------------
-- THE FIX: same signature, same grants, same answer for every legitimate call
-- ----------------------------------------------------------------------------
-- A CLIENT request (one arriving through the API as anon or authenticated) may
-- only ask about ITSELF — unless the caller is administrator or above, who can
-- already read every user_roles row through user_roles_select_self_or_staff.
-- Asking about anyone else returns false, the same answer as "not staff", so
-- probing learns nothing.
--
-- Unchanged, and why:
--   * Every policy and nearly every function calls it with the default
--     p_uid = auth.uid() — that is "asking about yourself", never affected.
--   * reports_before_update() passes v_uid := auth.uid() — itself.
--   * report_assign(p_report_id, p_assignee) passes another user's id, but it
--     first requires the caller to be administrator, so the staff exemption
--     keeps it working.
--   * Trusted connections — the SQL Editor / psql as postgres, or the
--     service_role key — keep answering for any id. "Client request" is decided
--     by the JWT role claim (auth.role(), which only Supabase Auth can sign) and
--     by session_user = 'authenticator' (the login every API request uses),
--     not by anything the caller can set.
-- Signature, defaults, STABLE, SECURITY DEFINER, search_path, owner and grants
-- are all exactly as before. Nothing is dropped. No data changes.
-- ============================================================================

begin;

create or replace function public.has_role_at_least(p_role text, p_uid uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_required    integer := role_rank(p_role);
  v_actual      integer;
  v_caller      uuid    := auth.uid();
  v_jwt_role    text    := auth.role();
  v_client      boolean;
  v_caller_rank integer;
begin
  if v_required is null then
    raise exception 'unknown role %', p_role using errcode = '22023';
  end if;

  if p_uid is null then
    return false;
  end if;

  -- 058: an API caller may only ask about itself, unless it is staff.
  v_client := coalesce(v_jwt_role, '') <> 'service_role'
              and (session_user = 'authenticator'
                   or coalesce(v_jwt_role, '') in ('anon', 'authenticated'));

  if v_client and p_uid is distinct from v_caller then
    if v_caller is null then
      return false;
    end if;
    select role_rank(r.role) into v_caller_rank from user_roles r where r.user_id = v_caller;
    if coalesce(v_caller_rank, 0) < role_rank('administrator') then
      return false;
    end if;
  end if;

  -- 'user' is the baseline: it means "any signed-in account", not "any caller".
  if v_required = 0 then
    return true;
  end if;

  select role_rank(r.role) into v_actual from user_roles r where r.user_id = p_uid;
  return coalesce(v_actual, 0) >= v_required;
end;
$$;

comment on function public.has_role_at_least(text, uuid) is
  'True when p_uid (default: the caller) holds p_role or higher. Since sql/058 an API caller '
  'may only ask about itself unless it is administrator+; asking about anyone else returns false.';

commit;

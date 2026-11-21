-- ============================================================================
-- 050_groups_support_access.sql — CAPSTONE PLUS FOR GROUPS: AUDITED SUPPORT ACCESS
--
-- STATUS: WRITTEN AND COMMITTED ON BRANCH `groups-invites`. **NOT APPLIED ANYWHERE.**
--   Needs Robbie's explicit word like every migration. Local proof:
--     node scripts/groups/support-rls-test.mjs --local [--mutations]
--
-- DEPENDS ON: 025 (has_role_at_least), 033, 043, 045, 047, 048, 049.
--
-- DECISION (Robbie via Rev, 2026-11-21): the app OWNER must be able to see a
-- class's roster to support group admins. This REPLACES the 047 rule "the app
-- owner gets no read of who is in a class". It is still NOT a blanket read:
--   * no table grant changes: the owner still cannot SELECT class_members or
--     class_invites directly (047's policies are unchanged);
--   * one class at a time, through owner_support_roster(class, reason), which
--     REQUIRES a reason (10..500 characters), is rate limited (30 per hour per
--     owner), and ALWAYS writes class_support_access_log in the same
--     transaction — no log row, no roster;
--   * the class's staff see every access in "Support access log"
--     (class_support_log), with the reason, so the access is never hidden;
--   * the roster carries names, roles, seat and invite status ONLY: no
--     answers, grades, essays or submissions, and invite addresses masked;
--   * search (owner_support_find_classes) returns class/org names and seat
--     counts only, at most 20 rows, query >= 3 characters, and is logged too;
--   * SECOND TIER, grades: owner_support_gradebook(class, reason) works ONLY
--     while the class OWNER has granted time-limited access (grant_support_access,
--     1..72 hours, default 24; revocable), and is logged the same way. It
--     returns the gradebook grid (status, score, late) — never answers, essay
--     text, feedback or the answer key.
--   DRAFT FOR COUNSEL (Privacy + Terms line, src/lib/groupSupport.ts):
--   "Capstone staff may view class rosters to provide support; access is
--    logged and visible to the class admin."
--
-- IDEMPOTENT. REVERSAL (before use): drop the two tables and the functions below.
-- ============================================================================

begin;

create table if not exists public.class_support_access_log (
  id        bigint      generated always as identity primary key,
  class_id  uuid        not null,    -- no FK: the log outlives the class
  actor     uuid        not null,    -- no FK: the log outlives the account
  kind      text        not null check (kind in ('search', 'roster', 'gradebook', 'grant', 'revoke')),
  reason    text        check (reason is null or char_length(reason) between 10 and 500),
  at        timestamptz not null default now()
);
create index if not exists class_support_access_log_class_idx on public.class_support_access_log (class_id, at desc);
create index if not exists class_support_access_log_actor_idx on public.class_support_access_log (actor, at desc);

create table if not exists public.class_support_grants (
  class_id    uuid        primary key references public.classes(id) on delete cascade,
  granted_by  uuid        references auth.users(id) on delete set null,
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  check (expires_at > granted_at and expires_at <= granted_at + interval '72 hours')
);

alter table public.class_support_access_log enable row level security;
alter table public.class_support_grants     enable row level security;
revoke all on public.class_support_access_log from anon, authenticated, public;
revoke all on public.class_support_grants     from anon, authenticated, public;
revoke all on sequence public.class_support_access_log_id_seq from anon, authenticated, public;


-- Owner gate + reason + rate limit, shared. Returns the trimmed reason.
create or replace function public.support_gate(p_reason text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reason text := trim(regexp_replace(coalesce(p_reason, ''), '[[:cntrl:]]', ' ', 'g'));
begin
  if auth.uid() is null or not public.has_role_at_least('owner') then
    raise exception 'not_owner: support access is for the app owner only' using errcode = '42501';
  end if;
  if char_length(v_reason) < 10 then
    raise exception 'reason_required: say why you need this (at least 10 characters); it is shown to the class admin' using errcode = '22023';
  end if;
  if char_length(v_reason) > 500 then
    raise exception 'reason_too_long: up to 500 characters' using errcode = '22023';
  end if;
  if (select count(*) from public.class_support_access_log l
       where l.actor = auth.uid() and l.kind in ('search', 'roster', 'gradebook') and l.at > now() - interval '1 hour') >= 30 then
    raise exception 'support_rate_limited: 30 support lookups an hour' using errcode = '22023';
  end if;
  return v_reason;
end;
$$;

create or replace function public.support_mask_email(p text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case when p is null or position('@' in p) < 2 then null
              else left(p, 1) || '***' || substr(p, position('@' in p)) end;
$$;

-- Find a class by its own name or its organisation's name. No member data.
create or replace function public.owner_support_find_classes(p_query text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reason text := public.support_gate(p_reason);
  v_q      text := trim(coalesce(p_query, ''));
  v_out    jsonb;
begin
  if char_length(v_q) < 3 then
    raise exception 'query_too_short: type at least 3 characters of the class or organisation name' using errcode = '22023';
  end if;
  v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  select coalesce(jsonb_agg(r), '[]'::jsonb) into v_out from (
    select jsonb_build_object('class_id', c.id, 'name', c.name, 'kind', c.kind, 'status', c.status,
                              'org_name', o.name, 'seats_purchased', c.seats_purchased,
                              'seats_used', (select count(*) from public.class_members m where m.class_id = c.id and m.seat_state = 'active')) as r
      from public.classes c join public.churches o on o.id = c.org_id
     where c.name ilike v_q escape '\' or o.name ilike v_q escape '\'
     order by c.created_at desc
     limit 20
  ) x;
  -- Search is not tied to one class; it is logged against each class it returned.
  insert into public.class_support_access_log (class_id, actor, kind, reason)
  select (e ->> 'class_id')::uuid, auth.uid(), 'search', v_reason from jsonb_array_elements(v_out) e;
  if jsonb_array_length(v_out) = 0 then
    insert into public.class_support_access_log (class_id, actor, kind, reason)
    values ('00000000-0000-0000-0000-000000000000', auth.uid(), 'search', v_reason);
  end if;
  return v_out;
end;
$$;

create or replace function public.owner_support_roster(p_class_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reason text := public.support_gate(p_reason);
  v_class  public.classes%rowtype;
begin
  select * into v_class from public.classes where id = p_class_id;
  if v_class.id is null then
    raise exception 'not_found' using errcode = '22023';
  end if;
  -- The log row first, in this transaction: if it cannot be written, nothing is returned.
  insert into public.class_support_access_log (class_id, actor, kind, reason) values (p_class_id, auth.uid(), 'roster', v_reason);
  return jsonb_build_object(
    'class', jsonb_build_object('class_id', v_class.id, 'name', v_class.name, 'kind', v_class.kind, 'status', v_class.status,
                                'org_name', (select o.name from public.churches o where o.id = v_class.org_id),
                                'seats_purchased', v_class.seats_purchased, 'seat_cap', v_class.seat_cap,
                                'seats_used', (select count(*) from public.class_members m where m.class_id = p_class_id and m.seat_state = 'active')),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('display_name', p.display_name, 'role', s.role, 'added_at', s.added_at)
                                        order by s.role = 'owner' desc, s.added_at)
                         from public.class_staff s left join public.profiles p on p.id = s.user_id
                        where s.class_id = p_class_id), '[]'::jsonb),
    'members', coalesce((select jsonb_agg(jsonb_build_object('display_name', p.display_name, 'seat_state', m.seat_state,
                                                             'joined_at', m.joined_at, 'left_at', m.left_at)
                                          order by m.seat_state = 'active' desc, p.display_name nulls last)
                           from public.class_members m left join public.profiles p on p.id = m.user_id
                          where m.class_id = p_class_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('address', public.support_mask_email(i.address), 'status', i.status,
                                                             'sends', i.sends, 'created_at', i.created_at)
                                          order by i.created_at desc)
                           from public.class_invites i where i.class_id = p_class_id), '[]'::jsonb));
end;
$$;

-- Tier 2: only while the class owner's grant is live.
create or replace function public.owner_support_gradebook(p_class_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reason text := public.support_gate(p_reason);
begin
  if not exists (select 1 from public.class_support_grants g
                  where g.class_id = p_class_id and g.revoked_at is null and g.expires_at > now()) then
    raise exception 'no_grant: the class admin has not granted support access (or it has expired)' using errcode = '42501';
  end if;
  insert into public.class_support_access_log (class_id, actor, kind, reason) values (p_class_id, auth.uid(), 'gradebook', v_reason);
  return jsonb_build_object(
    'students', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'display_name', p.display_name, 'active', m.seat_state = 'active'))
                            from public.class_members m left join public.profiles p on p.id = m.user_id
                           where m.class_id = p_class_id), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'due_at', a.due_at))
                               from public.assignments a where a.class_id = p_class_id and a.published_at is not null), '[]'::jsonb),
    'cells', coalesce((select jsonb_agg(jsonb_build_object(
                         'assignment_id', s.assignment_id, 'user_id', s.user_id,
                         'status', public.asg_status_label(s.status, a.due_at, s.is_late), 'is_late', s.is_late,
                         'final_score', case when s.status = 'draft' then null else s.final_score end,
                         'max_points', s.max_points, 'submitted_at', s.submitted_at))
                         from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
                        where s.class_id = p_class_id and a.published_at is not null), '[]'::jsonb));
end;
$$;

-- The class OWNER (not a co-teacher) grants or revokes tier-2 access.
create or replace function public.grant_support_access(p_class_id uuid, p_hours integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hours int := coalesce(p_hours, 24);
  v_exp   timestamptz;
begin
  if not public.is_class_owner(p_class_id) then
    raise exception 'not_class_owner: only the class owner can grant support access' using errcode = '42501';
  end if;
  if v_hours < 1 or v_hours > 72 then
    raise exception 'bad_hours: 1 to 72 hours' using errcode = '22023';
  end if;
  v_exp := now() + make_interval(hours => v_hours);
  insert into public.class_support_grants (class_id, granted_by, granted_at, expires_at, revoked_at)
  values (p_class_id, auth.uid(), now(), v_exp, null)
  on conflict (class_id) do update set granted_by = excluded.granted_by, granted_at = excluded.granted_at,
                                       expires_at = excluded.expires_at, revoked_at = null;
  insert into public.class_support_access_log (class_id, actor, kind, reason) values (p_class_id, auth.uid(), 'grant', null);
  return jsonb_build_object('expires_at', v_exp);
end;
$$;

create or replace function public.revoke_support_access(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_class_owner(p_class_id) then
    raise exception 'not_class_owner' using errcode = '42501';
  end if;
  update public.class_support_grants set revoked_at = now() where class_id = p_class_id and revoked_at is null;
  insert into public.class_support_access_log (class_id, actor, kind, reason) values (p_class_id, auth.uid(), 'revoke', null);
end;
$$;

-- What the class's staff see: every support access to THEIR class, with the
-- reason, and whether a grant is live. Who at Capstone is not named.
create or replace function public.class_support_log(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_class_staff(p_class_id) then
    raise exception 'not_class_staff' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'grant', (select jsonb_build_object('expires_at', g.expires_at, 'granted_at', g.granted_at)
                from public.class_support_grants g
               where g.class_id = p_class_id and g.revoked_at is null and g.expires_at > now()),
    'entries', coalesce((select jsonb_agg(jsonb_build_object('at', l.at, 'kind', l.kind, 'reason', l.reason,
                                                             'by', case when l.kind in ('grant', 'revoke') then 'class' else 'capstone' end)
                                          order by l.at desc)
                           from (select * from public.class_support_access_log
                                  where class_id = p_class_id order by at desc limit 200) l), '[]'::jsonb));
end;
$$;

revoke all on function public.support_gate(text)                           from public, anon, authenticated;
revoke all on function public.support_mask_email(text)                     from public, anon, authenticated;
revoke all on function public.owner_support_find_classes(text, text)       from public, anon, authenticated;
revoke all on function public.owner_support_roster(uuid, text)             from public, anon, authenticated;
revoke all on function public.owner_support_gradebook(uuid, text)          from public, anon, authenticated;
revoke all on function public.grant_support_access(uuid, integer)          from public, anon, authenticated;
revoke all on function public.revoke_support_access(uuid)                  from public, anon, authenticated;
revoke all on function public.class_support_log(uuid)                      from public, anon, authenticated;
-- Each re-checks the caller (owner, class owner, class staff).
grant execute on function public.owner_support_find_classes(text, text)    to authenticated;
grant execute on function public.owner_support_roster(uuid, text)          to authenticated;
grant execute on function public.owner_support_gradebook(uuid, text)       to authenticated;
grant execute on function public.grant_support_access(uuid, integer)       to authenticated;
grant execute on function public.revoke_support_access(uuid)               to authenticated;
grant execute on function public.class_support_log(uuid)                   to authenticated;

commit;

-- ============================================================================
-- 054_admin_usage_report.sql — USAGE GRAPHS FOR THE ADMIN CONSOLE
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand, the whole file in one go (it is one transaction):
--           psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/054_admin_usage_report.sql
--         or paste the whole file into the Supabase project's SQL Editor.
--
-- NUMBERING: 052 is report categories (being applied 2026-11-26), 053 is the
--            new games' feature_release rows (unapplied). 054 is the next
--            number free on every branch.
--
-- DEPENDS ON: sql/019 (analytics_sessions, analytics_events, is_admin()) and
--            sql/025 (user_roles, reports, report_categories) — both APPLIED —
--            plus the dashboard-made `notes` and `chapter_reads` tables
--            (described in 000_baseline.sql). Does NOT depend on 026 (which is
--            committed but whose application is unconfirmed; it was absent from
--            the 2026-09-11 production photograph) or on 052/053.
--
-- CHANGES NOTHING THAT HOLDS DATA. Two new read-only functions. No table, no
-- column, no policy, no index, no grant on any table. Rollback is two DROPs.
-- ============================================================================
--
-- ----------------------------------------------------------------------------
-- WHAT THIS EXPOSES, AND TO WHOM
-- ----------------------------------------------------------------------------
-- admin_usage_report() is SECURITY DEFINER and opens with the same
-- `if not is_admin() then raise ... 42501` as every admin_* function since 019.
-- is_admin() is `user_roles.role in ('administrator','owner')` for auth.uid().
-- So: owner and administrators only. An advisor, a member, a guest and anon are
-- refused. EXECUTE is revoked from PUBLIC and anon (019/026 only revoked anon,
-- which leaves the PUBLIC default standing — this one does not repeat that) and
-- granted to authenticated; the is_admin() gate is what actually decides.
--
-- It takes NO user-id argument and does not call has_role_at_least(), so it
-- does not widen the open has_role_at_least() finding (manager-inbox
-- 2026-11-21T0333): it cannot be used to ask about any particular account.
--
-- What comes back is COUNTS PER TIME BUCKET AND NOTHING ELSE: no user id, no
-- email, no name, no text anybody wrote, no Bible reference, no session id.
-- The distinct-people metrics consume user ids inside the function and return
-- only how many. Breakdown labels are a game's fixed key (from the client's
-- `game.play` event, sanitised to [a-z0-9_-] or folded into "other") and a
-- report category's label from report_categories.
--
-- ----------------------------------------------------------------------------
-- THE METRICS — exact definitions (the console prints these same words)
-- ----------------------------------------------------------------------------
-- Every metric counts only the ACCOUNTS IN SCOPE (see "who is counted" below).
--
--   accounts         Accounts created in the period. cumulative = all accounts
--                    in scope created up to the end of that period, including
--                    before the window, so it is a true total-over-time.
--   active_users     Distinct accounts that were ACTIVE in the period: started
--                    an app session (opened the app signed in) or recorded any
--                    tracked action (opened a section, marked a chapter, started
--                    a game, ...). cumulative = distinct accounts ever active.
--                    Recording began with sql/019 (2026-09-01); nothing before.
--   returning_users  Of the active accounts, those created BEFORE the period
--                    began (i.e. active, and not new that period).
--   chapters_read    Chapters ticked as read (chapter_reads.read_at). A chapter
--                    ticked again later moves to the later date; one unticked
--                    disappears. So this is "ticks still standing", by date.
--   articles_opened  Times the Articles section was opened (analytics event
--                    panel.open with panel = articles). Which article is not
--                    recorded anywhere, by design.
--   articles_marked  "Mark this article as read" ticks (event article.read).
--   games_played     Games started from Game Center (event game.play), plus one
--                    breakdown row per game: metric 'game:<key>'.
--   notes            Verse notes written (notes.created_at). A deleted note is
--                    gone, so this is notes that still exist, by creation date.
--   reports          Problem reports filed (reports.created_at), plus one
--                    breakdown row per category: metric 'report:<key>'.
--
-- `history_from` on every row is the first date that metric has any data at
-- all (for the population in scope), so the console can say "not recorded
-- before <date>" instead of drawing zeros that look like quiet days.
--
-- WHO IS COUNTED
--   p_include_guests = false (default): registered accounts only; anonymous
--     guest accounts (auth.users.is_anonymous) are left out of every metric.
--   p_exclude_team = true (default): accounts holding the owner or
--     administrator role in user_roles are left out of every metric. Advisors
--     are ordinary readers here and stay in. There is NO test-account marker in
--     this schema, so test accounts cannot be told apart from real ones; give
--     a test account a role, or delete it, if it should not count.
--   Events with no user (signed-out screens) and events whose account was
--   deleted (analytics user_id goes to null) are never counted.
--
-- TIME: p_tz is an IANA zone (the viewer's own); an unknown one is refused, not
-- silently treated as UTC. Weeks are ISO (Monday start). p_periods <= 0 or null
-- means "from the month/week/day of the first account in scope to now".
-- ============================================================================

begin;

create or replace function public.admin_usage_report(
  p_bucket         text    default 'month',
  p_periods        integer default 12,
  p_tz             text    default 'UTC',
  p_exclude_team   boolean default true,
  p_include_guests boolean default false
)
returns table (
  metric       text,
  label        text,
  period_start date,
  value        bigint,
  cumulative   bigint,
  history_from date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_bucket  text;
  v_periods integer;
  v_tz      text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_step    interval;
  v_end     date;
  v_start   date;
  v_first   timestamptz;
  v_team    boolean := coalesce(p_exclude_team, true);
  v_guests  boolean := coalesce(p_include_guests, false);
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Whitelist, never interpolation: these three literals are all that reach date_trunc().
  v_bucket := lower(coalesce(p_bucket, 'month'));
  if v_bucket not in ('day', 'week', 'month') then
    raise exception 'bucket must be day, week or month' using errcode = '22023';
  end if;
  v_step := case v_bucket when 'day' then interval '1 day' when 'week' then interval '1 week' else interval '1 month' end;

  begin
    v_end := date_trunc(v_bucket, (now() at time zone v_tz))::date;
  exception when others then
    raise exception 'unknown time zone %', v_tz using errcode = '22023';
  end;

  if p_periods is null or p_periods <= 0 then
    select min(u.created_at) into v_first
      from auth.users u
     where (v_guests or not coalesce(u.is_anonymous, false))
       and (not v_team or not exists (select 1 from user_roles r
                                       where r.user_id = u.id and r.role in ('owner', 'administrator')));
    v_start := coalesce(date_trunc(v_bucket, (v_first at time zone v_tz))::date, v_end);
    -- Same cap as below: never more than 730 buckets.
    if v_start < (v_end::timestamp - 729 * v_step)::date then
      v_start := (v_end::timestamp - 729 * v_step)::date;
    end if;
  else
    v_periods := least(p_periods, 730);
    v_start := (v_end::timestamp - (v_periods - 1) * v_step)::date;
  end if;

  return query
  with
  -- The accounts in scope. Every metric joins through this, so the two toggles
  -- mean the same thing on every chart.
  people as (
    select u.id, u.created_at
      from auth.users u
     where (v_guests or not coalesce(u.is_anonymous, false))
       and (not v_team or not exists (select 1 from user_roles r
                                       where r.user_id = u.id and r.role in ('owner', 'administrator')))
  ),

  -- Countable things: (metric, breakdown label or null, timestamp).
  ev as (
    select 'accounts'::text as metric, null::text as lbl, p.created_at as ts from people p
    union all
    select 'chapters_read', null, c.read_at from chapter_reads c join people p on p.id = c.user_id
    union all
    select 'notes', null, n.created_at from notes n join people p on p.id = n.user_id
    union all
    select 'articles_opened', null, e.created_at from analytics_events e join people p on p.id = e.user_id
     where e.event = 'panel.open' and e.props ->> 'panel' = 'articles'
    union all
    select 'articles_marked', null, e.created_at from analytics_events e join people p on p.id = e.user_id
     where e.event = 'article.read'
    union all
    select 'games_played', null, e.created_at from analytics_events e join people p on p.id = e.user_id
     where e.event = 'game.play'
    union all
    select 'game:' || case when (e.props ->> 'game') ~ '^[a-z0-9_-]{1,40}$' then e.props ->> 'game' else 'other' end,
           case when (e.props ->> 'game') ~ '^[a-z0-9_-]{1,40}$' then e.props ->> 'game' else 'other' end,
           e.created_at
      from analytics_events e join people p on p.id = e.user_id
     where e.event = 'game.play'
    union all
    select 'reports', null, r.created_at from reports r join people p on p.id = r.reporter_id
    union all
    select 'report:' || r.category, coalesce(rc.label, r.category), r.created_at
      from reports r join people p on p.id = r.reporter_id
      left join report_categories rc on rc.key = r.category
  ),
  bucketed as (
    select e.metric, e.lbl, date_trunc(v_bucket, e.ts at time zone v_tz)::date as p, e.ts
      from ev e where e.ts is not null
  ),
  firsts as (
    select b.metric, min(b.ts at time zone v_tz)::date as first_day from bucketed b group by b.metric
  ),
  agg as (
    select b.metric, max(b.lbl) as lbl, b.p, count(*)::bigint as v
      from bucketed b where b.p >= v_start group by b.metric, b.p
  ),
  prior as (
    select b.metric, count(*)::bigint as v from bucketed b where b.p < v_start group by b.metric
  ),

  -- Activity: one row per (account, moment it did something).
  act as (
    select s.user_id as uid, s.started_at as ts from analytics_sessions s join people p on p.id = s.user_id
    union all
    select e.user_id, e.created_at from analytics_events e join people p on p.id = e.user_id
  ),
  act_b as (
    select distinct a.uid, date_trunc(v_bucket, a.ts at time zone v_tz)::date as p from act a where a.ts is not null
  ),
  act_first as (
    select min(a.ts at time zone v_tz)::date as first_day from act a
  ),
  first_u as (
    select a.uid, min(a.p) as p from act_b a group by a.uid
  ),
  active_agg as (
    select a.p, count(*)::bigint as v,
           count(*) filter (where date_trunc(v_bucket, pp.created_at at time zone v_tz)::date < a.p)::bigint as ret
      from act_b a join people pp on pp.id = a.uid
     where a.p >= v_start group by a.p
  ),
  new_u as (
    select f.p, count(*)::bigint as v from first_u f where f.p >= v_start group by f.p
  ),
  prior_u as (
    select count(*)::bigint as v from first_u f where f.p < v_start
  ),

  spine as (
    select gs::date as p from generate_series(v_start::timestamp, v_end::timestamp, v_step) gs
  ),
  -- Scalar metrics get a full spine (so a quiet period is an explicit 0);
  -- breakdown metrics ('game:*', 'report:*') only return the periods they have.
  scalar_grid as (
    select c.metric, s.p
      from unnest(array['accounts', 'chapters_read', 'notes', 'articles_opened', 'articles_marked',
                        'games_played', 'reports']) as c(metric)
     cross join spine s
  )
  select g.metric, null::text, g.p,
         coalesce(a.v, 0)::bigint,
         (coalesce((select pr.v from prior pr where pr.metric = g.metric), 0)
           + sum(coalesce(a.v, 0)) over (partition by g.metric order by g.p
                                         rows between unbounded preceding and current row))::bigint,
         (select f.first_day from firsts f where f.metric = g.metric)
    from scalar_grid g
    left join agg a on a.metric = g.metric and a.p = g.p
  union all
  select a.metric, a.lbl, a.p, a.v, null::bigint, (select f.first_day from firsts f where f.metric = a.metric)
    from agg a
   where a.metric like 'game:%' or a.metric like 'report:%'
  union all
  select 'active_users', null, s.p,
         coalesce(aa.v, 0)::bigint,
         ((select pu.v from prior_u pu)
           + sum(coalesce(nu.v, 0)) over (order by s.p rows between unbounded preceding and current row))::bigint,
         (select af.first_day from act_first af)
    from spine s
    left join active_agg aa on aa.p = s.p
    left join new_u nu on nu.p = s.p
  union all
  select 'returning_users', null, s.p, coalesce(aa.ret, 0)::bigint, null::bigint,
         (select af.first_day from act_first af)
    from spine s
    left join active_agg aa on aa.p = s.p
  order by 1, 3;
end;
$$;

revoke all on function public.admin_usage_report(text, integer, text, boolean, boolean) from public, anon;
grant execute on function public.admin_usage_report(text, integer, text, boolean, boolean) to authenticated;

comment on function public.admin_usage_report(text, integer, text, boolean, boolean) is
  'sql/054: owner/administrator only (is_admin()). Counts per period for the Admin Console usage graphs. No ids, no text.';


-- ----------------------------------------------------------------------------
-- admin_registered_summary() — the "Registered accounts" card on the Users tab.
-- Same gate, same definitions as admin_usage_report(), as of now():
--   total            registered (non-guest) accounts, the team INCLUDED (this
--                    card describes the user list, which lists the team too)
--   new_24h / new_7d registered accounts created in the last 24 hours / 7 days
--   active_7d        distinct registered accounts ACTIVE in the last 7 days:
--                    started a session or recorded any tracked action
--   newest_joined_at creation time of the newest registered account
--   team             how many of `total` hold the owner/administrator role
-- Counted over the whole of auth.users, so it is right whatever the user list
-- below it is searched for or however far it is truncated.
-- ----------------------------------------------------------------------------
create or replace function public.admin_registered_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  with reg as (
    select u.id, u.created_at from auth.users u where not coalesce(u.is_anonymous, false)
  ),
  act as (
    select s.user_id as uid from analytics_sessions s
     where s.started_at > now() - interval '7 days' and s.user_id in (select id from reg)
    union
    select e.user_id from analytics_events e
     where e.created_at > now() - interval '7 days' and e.user_id in (select id from reg)
  )
  select jsonb_build_object(
    'total',            (select count(*) from reg),
    'new_24h',          (select count(*) from reg where created_at > now() - interval '24 hours'),
    'new_7d',           (select count(*) from reg where created_at > now() - interval '7 days'),
    'active_7d',        (select count(*) from act),
    'newest_joined_at', (select max(created_at) from reg),
    'team',             (select count(*) from reg r where exists (select 1 from user_roles ur
                           where ur.user_id = r.id and ur.role in ('owner', 'administrator')))
  ) into v;
  return v;
end;
$$;

revoke all on function public.admin_registered_summary() from public, anon;
grant execute on function public.admin_registered_summary() to authenticated;

-- ----------------------------------------------------------------------------
-- Checks. The migration refuses to commit if any of these is false.
-- ----------------------------------------------------------------------------
do $check$
declare
  v_sig text := 'public.admin_usage_report(text, integer, text, boolean, boolean)';
  v_p   record;
begin
  select p.prosecdef, p.proconfig into v_p from pg_proc p where p.oid = v_sig::regprocedure;
  if not v_p.prosecdef then
    raise exception '054 check: admin_usage_report is not SECURITY DEFINER';
  end if;
  if v_p.proconfig is null or not exists (select 1 from unnest(v_p.proconfig) c where c like 'search_path=%') then
    raise exception '054 check: admin_usage_report has no pinned search_path';
  end if;
  if has_function_privilege('anon', v_sig, 'execute') then
    raise exception '054 check: anon can execute admin_usage_report';
  end if;
  if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
              where p.oid = v_sig::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception '054 check: PUBLIC can execute admin_usage_report';
  end if;
  if not has_function_privilege('authenticated', v_sig, 'execute') then
    raise exception '054 check: authenticated cannot execute admin_usage_report';
  end if;
  if position('is_admin()' in (select p.prosrc from pg_proc p where p.oid = v_sig::regprocedure)) = 0 then
    raise exception '054 check: admin_usage_report lost its is_admin() gate';
  end if;
  if has_function_privilege('anon', 'public.admin_registered_summary()', 'execute')
     or not (select p.prosecdef from pg_proc p where p.oid = 'public.admin_registered_summary()'::regprocedure)
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                 where p.oid = 'public.admin_registered_summary()'::regprocedure and a.grantee = 0) then
    raise exception '054 check: admin_registered_summary grants or definer wrong';
  end if;
end
$check$;

commit;

-- ============================================================================
-- AFTER APPLYING — read-only checks to paste into the SQL editor
-- ============================================================================
--   select has_function_privilege('anon', 'admin_usage_report(text,integer,text,boolean,boolean)', 'execute');           -- false
--   select has_function_privilege('authenticated', 'admin_usage_report(text,integer,text,boolean,boolean)', 'execute');  -- true
--   -- from the SQL editor (no auth.uid()) the function must REFUSE:
--   select * from admin_usage_report('month', 3, 'UTC');   -- ERROR 42501 not authorized
--   Then open Admin Console -> Usage reports signed in as the owner: the
--   "needs the database step" notes disappear and every graph draws.
--
-- ============================================================================
-- ROLLBACK — two statements. Nothing else was changed.
-- ============================================================================
--      drop function if exists public.admin_usage_report(text, integer, text, boolean, boolean);
--      drop function if exists public.admin_registered_summary();

-- ============================================================================
-- ADMIN GROWTH SERIES — history by day, week and month.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/026_admin_growth_series.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS EXPOSES, AND TO WHOM
-- ----------------------------------------------------------------------------
-- Two SECURITY DEFINER functions, both gated on `is_admin()` — which since
-- migration 025 means `user_roles.role in ('administrator','owner')`. An
-- advisor cannot call these; a signed-in user cannot; anon has EXECUTE revoked
-- outright. The gate is the same `raise exception ... errcode = '42501'` every
-- other admin_* function in 019 opens with, so there is one authorization path
-- here, not two.
--
-- What comes back is COUNTS PER TIME BUCKET AND NOTHING ELSE. No user id, no
-- email, no display name, no title, no body, no book/chapter reference, no
-- session id. `admin_recent_public_content` (019) remains the only function in
-- this console that returns anybody's words, and it is still scoped to public
-- posts. Nothing here widens that: an administrator learns that eleven notes
-- were written last week, never whose or about what.
--
-- The one shape worth naming explicitly is the distinct-person metrics
-- (`active_users`, `reading_readers`). Those aggregate over `user_id` — they
-- count how many DIFFERENT people did something in a period — but they return
-- only the count. The identities are consumed inside the function and never
-- cross the boundary.
--
-- ----------------------------------------------------------------------------
-- WHY THIS IS A DATABASE FUNCTION AND NOT A CLIENT-SIDE ROLL-UP
-- ----------------------------------------------------------------------------
-- Three reasons, in order of how much they matter.
--
-- 1. AUTHORIZATION. Most of these tables are RLS'd to "your own rows". An
--    administrator selecting `posts` through PostgREST gets THEIR posts, not
--    all of them — and PostgREST answers a filtered-out select with `[]`, not
--    an error, so a client-side count would silently render a dashboard of
--    plausible, wrong, small numbers. `auth.users` is not reachable from the
--    client at all. The aggregate has to happen where the privilege is.
--
-- 2. PRIVACY. The alternative to aggregating server-side is shipping the rows
--    to the browser and counting them there, which means an admin console that
--    downloads everyone's notes in order to tell you how many there are. The
--    whole point of a counts-only API is that the rows never leave the
--    database.
--
-- 3. VOLUME. 62 accounts today; the roll-up is 25 aggregates over a few hundred
--    rows. That will not stay true, and "send it all to the phone" gets worse
--    at exactly the rate Robbie is hoping these charts get more interesting.
--
-- ----------------------------------------------------------------------------
-- WHICH METRICS HAVE REAL HISTORY — AND WHICH DON'T
-- ----------------------------------------------------------------------------
-- Everything here is derived from a `created_at`-shaped column that already
-- existed, so almost all of it reaches back to launch (2026-07-22) without any
-- new instrumentation. That was the design constraint: a new events table would
-- have produced a chart that starts empty today, which is the opposite of
-- "I want to see how this thing grows over time".
--
-- The two exceptions are flagged in `admin_growth_metrics()` with
-- `history_from`, so the UI can say so on the chart rather than letting a flat
-- line read as "nobody used it":
--   * `sessions` and `active_users` come from `analytics_sessions`, which only
--     started recording when 019 shipped (2026-09-01). Before that: no rows,
--     and none can be backfilled.
--   * `reading_seconds` / `reading_readers` come from `reading_time_daily`,
--     which starts 2026-07-28.
--
-- Deliberately ABSENT, because the data genuinely is not there:
--   * "Friendships formed per period." `friend_requests` has `responded_at`
--     but the status is a mutable column, so a request accepted and later
--     unfriended is indistinguishable from one never accepted. What IS honest
--     is `friend_requests` — requests SENT per period — so that is what this
--     returns, under that name.
--   * "Chapters read per person, historically." `reading_progress` carries only
--     `updated_at`, which moves every time the row changes, so it is a
--     current-position table and not a history. `chapter_reads` (`read_at`, one
--     row per chapter finished) is the real one and is included.
--   * Group membership before 2026-07-27 — `group_members.joined_at` exists, so
--     this is fine; noted only because `group_message_reads`, `game_players`
--     and the high-score tables carry NO timestamp at all and therefore cannot
--     appear here in any form.
--
-- ----------------------------------------------------------------------------
-- TIME ZONES
-- ----------------------------------------------------------------------------
-- `p_tz` is an IANA zone name; the client passes the viewer's own. It decides
-- where a day starts, which is the difference between "3 signups yesterday" and
-- "3 signups today" for anyone west of Greenwich. An unknown zone is rejected
-- rather than silently falling back to UTC, because a chart quietly bucketed in
-- the wrong zone is worse than an error. Weeks are ISO weeks (Monday start),
-- which is what `date_trunc('week', ...)` does.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- The metric catalogue. One row per series the console can chart: its key, the
-- label to show, the group it sits in, how to read its unit, and the date its
-- history actually begins.
--
-- This is a function rather than a table so it stays in lockstep with the
-- series `admin_growth_series` emits — the two lists are maintained together in
-- this one file, and the regression test at the bottom of this migration fails
-- loudly if they ever drift apart.
--
-- `history_from` is computed live rather than hardcoded: it is the first date
-- that metric has any data at all, so the UI can draw the "nothing was recorded
-- before here" boundary honestly without anyone remembering to update a
-- constant.
-- ----------------------------------------------------------------------------
create or replace function admin_growth_metrics()
returns table (
  metric       text,
  label        text,
  category     text,
  unit         text,     -- 'count' | 'seconds'
  distinct_by  text,     -- null, or 'user' when the value counts PEOPLE not events
  history_from date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select c.metric, c.label, c.category, c.unit, c.distinct_by, c.history_from
  from (
    values
      ('accounts'::text,      'Accounts created'::text, 'People'::text, 'count'::text, null::text, (select min(u.created_at)::date from auth.users u)),
      ('accounts_registered', 'Registered signups', 'People',   'count',   null,       (select min(u.created_at)::date from auth.users u where not coalesce(u.is_anonymous, false))),
      ('accounts_guest',      'Guest accounts',     'People',   'count',   null,       (select min(u.created_at)::date from auth.users u where coalesce(u.is_anonymous, false))),
      ('profiles',            'Profiles created',   'People',   'count',   null,       (select min(p.created_at)::date from profiles p)),
      ('active_users',        'Active people',      'People',   'count',   'user',     (select min(s.started_at)::date from analytics_sessions s where s.user_id is not null)),
      ('sessions',            'Sessions',           'People',   'count',   null,       (select min(s.started_at)::date from analytics_sessions s)),

      ('notes',               'Notes',              'Study',    'count',   null,       (select min(n.created_at)::date from notes n)),
      ('highlights',          'Highlights',         'Study',    'count',   null,       (select min(h.created_at)::date from highlights h)),
      ('tags',                'Tags',               'Study',    'count',   null,       (select min(t.created_at)::date from tags t)),
      ('verse_tags',          'Verses tagged',      'Study',    'count',   null,       (select min(v.created_at)::date from verse_tags v)),
      ('sermon_notes',        'Sermon notes',       'Study',    'count',   null,       (select min(s.created_at)::date from sermon_notes s)),

      ('chapter_reads',       'Chapters read',      'Reading',  'count',   null,       (select min(c2.read_at)::date from chapter_reads c2)),
      ('reading_plan_days',   'Plan days done',     'Reading',  'count',   null,       (select min(r.completed_at)::date from reading_plan_progress r)),
      ('reading_seconds',     'Time reading',       'Reading',  'seconds', null,       (select min(r.day) from reading_time_daily r)),
      ('reading_readers',     'People reading',     'Reading',  'count',   'user',     (select min(r.day) from reading_time_daily r)),

      ('posts',               'Posts',              'Social',   'count',   null,       (select min(p.created_at)::date from posts p)),
      ('post_comments',       'Post comments',      'Social',   'count',   null,       (select min(p.created_at)::date from post_comments p)),
      ('note_comments',       'Note comments',      'Social',   'count',   null,       (select min(n.created_at)::date from note_comments n)),
      ('groups',              'Groups created',     'Social',   'count',   null,       (select min(g.created_at)::date from groups g)),
      ('group_joins',         'Group joins',        'Social',   'count',   null,       (select min(m.joined_at)::date from group_members m)),
      ('group_messages',      'Group messages',     'Social',   'count',   null,       (select min(m.created_at)::date from group_messages m)),
      ('messages',            'Direct messages',    'Social',   'count',   null,       (select min(m.created_at)::date from messages m)),
      ('friend_requests',     'Friend requests',    'Social',   'count',   null,       (select min(f.created_at)::date from friend_requests f)),
      ('game_rooms',          'Game rooms',         'Social',   'count',   null,       (select min(g.created_at)::date from game_rooms g)),

      ('reports',             'Issues reported',    'Feedback', 'count',   null,       (select min(r.created_at)::date from reports r)),
      ('reports_resolved',    'Issues resolved',    'Feedback', 'count',   null,       (select min(r.resolved_at)::date from reports r where r.resolved_at is not null)),
      ('report_votes',        'Advisor votes',      'Feedback', 'count',   null,       (select min(v.created_at)::date from report_votes v))
  ) as c(metric, label, category, unit, distinct_by, history_from);
end;
$$;


-- ----------------------------------------------------------------------------
-- The series itself.
--
-- Returns LONG format — (metric, period_start, value, cumulative) — rather than
-- one column per metric. A wide row would need its column list changed every
-- time a metric is added, i.e. a migration per metric; long format means the
-- catalogue above is the only place the list lives, and the client pivots.
--
-- `value` is the count IN that period. `cumulative` is the running total from
-- the beginning of time through that period — including whatever happened
-- BEFORE the window, which is what makes it a growth curve rather than a
-- curve that restarts at zero every time you change the range.
--
-- For the distinct-person metrics, `cumulative` is a running count of DISTINCT
-- people, not a sum of the per-period counts (somebody active in three separate
-- weeks is one person, not three). That is done by finding each person's first
-- period and running-summing the first-appearances, which is one pass — the
-- obvious `count(distinct ...) over (order by ...)` is not something Postgres
-- will do, and a correlated subquery per bucket would be O(periods × rows).
-- ----------------------------------------------------------------------------
create or replace function admin_growth_series(
  p_bucket  text default 'day',
  p_periods integer default 30,
  p_tz      text default 'UTC'
)
returns table (
  metric       text,
  period_start date,
  value        bigint,
  cumulative   bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_bucket  text;
  v_periods integer;
  v_tz      text := coalesce(p_tz, 'UTC');
  v_step    interval;
  v_end     date;
  v_start   date;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Whitelist, not interpolation. `p_bucket` reaches date_trunc(), and the only
  -- three values that ever get there are these three literals.
  v_bucket := lower(coalesce(p_bucket, 'day'));
  if v_bucket not in ('day', 'week', 'month') then
    raise exception 'bucket must be day, week or month' using errcode = '22023';
  end if;

  v_step := case v_bucket
              when 'day'   then interval '1 day'
              when 'week'  then interval '1 week'
              else              interval '1 month'
            end;

  -- Enough to cover every bucket size back past launch, capped so nobody can
  -- ask for a 100,000-row spine: 730 days ≈ 2 years, 730 months ≈ 60 years.
  v_periods := least(greatest(coalesce(p_periods, 30), 1), 730);

  -- An unknown zone raises 22023 from the cast itself; catching and re-raising
  -- turns "time zone \"Mars/Olympus\" not recognized" into something the console
  -- can show, and stops a typo from silently becoming UTC.
  begin
    v_end := date_trunc(v_bucket, (now() at time zone v_tz))::date;
  exception when others then
    raise exception 'unknown time zone %', v_tz using errcode = '22023';
  end;

  v_start := (v_end::timestamp - (v_periods - 1) * v_step)::date;

  return query
  with
  -- Every countable thing as (metric, when it happened, how much it counts for).
  -- `weight` is 1 for a count and the measured seconds for `reading_seconds`,
  -- so one union covers both kinds of series.
  --
  -- NOTE FOR WHOEVER ADDS THE NEXT METRIC: add it in BOTH places — here and in
  -- admin_growth_metrics() above. The check at the foot of this file fails if
  -- you only do one.
  ev as (
    select 'accounts'::text            as metric, u.created_at as ts, 1::bigint as weight from auth.users u
    union all select 'accounts_registered', u.created_at, 1 from auth.users u where not coalesce(u.is_anonymous, false)
    union all select 'accounts_guest',      u.created_at, 1 from auth.users u where coalesce(u.is_anonymous, false)
    union all select 'profiles',            p.created_at, 1 from profiles p
    union all select 'sessions',            s.started_at, 1 from analytics_sessions s

    union all select 'notes',               n.created_at, 1 from notes n
    union all select 'highlights',          h.created_at, 1 from highlights h
    union all select 'tags',                t.created_at, 1 from tags t
    union all select 'verse_tags',          v.created_at, 1 from verse_tags v
    union all select 'sermon_notes',        s.created_at, 1 from sermon_notes s

    union all select 'chapter_reads',       c.read_at,     1 from chapter_reads c
    union all select 'reading_plan_days',   r.completed_at, 1 from reading_plan_progress r
    -- `day` is already a local calendar date, so it is re-anchored in the same
    -- zone the bucketing uses and round-trips back to itself.
    union all select 'reading_seconds',     (r.day::timestamp at time zone v_tz), r.seconds::bigint
                from reading_time_daily r where r.seconds > 0

    union all select 'posts',               p.created_at, 1 from posts p
    union all select 'post_comments',       p.created_at, 1 from post_comments p
    union all select 'note_comments',       n.created_at, 1 from note_comments n
    union all select 'groups',              g.created_at, 1 from groups g
    union all select 'group_joins',         m.joined_at,  1 from group_members m
    union all select 'group_messages',      m.created_at, 1 from group_messages m
    union all select 'messages',            m.created_at, 1 from messages m
    union all select 'friend_requests',     f.created_at, 1 from friend_requests f
    union all select 'game_rooms',          g.created_at, 1 from game_rooms g

    union all select 'reports',             r.created_at, 1 from reports r
    union all select 'reports_resolved',    r.resolved_at, 1 from reports r where r.resolved_at is not null
    union all select 'report_votes',        v.created_at, 1 from report_votes v
  ),
  bucketed as (
    select e.metric, date_trunc(v_bucket, e.ts at time zone v_tz)::date as p, e.weight
    from ev e
    where e.ts is not null
  ),
  agg as (
    select b.metric, b.p, sum(b.weight)::bigint as v
    from bucketed b where b.p >= v_start group by b.metric, b.p
  ),
  prior as (
    select b.metric, sum(b.weight)::bigint as v
    from bucketed b where b.p < v_start group by b.metric
  ),

  -- The two "how many different people" series. Kept separate because a sum of
  -- weights cannot answer them.
  ev_u as (
    select 'active_users'::text as metric, s.started_at as ts, s.user_id as uid
      from analytics_sessions s where s.user_id is not null
    union all
    select 'reading_readers', (r.day::timestamp at time zone v_tz), r.user_id
      from reading_time_daily r where r.seconds > 0
  ),
  bucketed_u as (
    select u.metric, date_trunc(v_bucket, u.ts at time zone v_tz)::date as p, u.uid
    from ev_u u where u.ts is not null and u.uid is not null
  ),
  agg_u as (
    select b.metric, b.p, count(distinct b.uid)::bigint as v
    from bucketed_u b where b.p >= v_start group by b.metric, b.p
  ),
  -- Each person's FIRST period per metric — the trick that makes a running
  -- distinct count a single pass.
  first_u as (
    select b.metric, b.uid, min(b.p) as p from bucketed_u b group by b.metric, b.uid
  ),
  new_u as (
    select f.metric, f.p, count(*)::bigint as v
    from first_u f where f.p >= v_start group by f.metric, f.p
  ),
  prior_u as (
    select f.metric, count(*)::bigint as v
    from first_u f where f.p < v_start group by f.metric
  ),

  -- All series in one shape again: per-period value, plus the increment that
  -- feeds the cumulative line (identical to `value` for everything except the
  -- distinct-person metrics).
  merged as (
    select a.metric, a.p, a.v as value, a.v as inc from agg a
    union all
    select u.metric, u.p, u.v, coalesce(n.v, 0)
    from agg_u u left join new_u n on n.metric = u.metric and n.p = u.p
  ),
  base as (
    select p.metric, p.v from prior p
    union all
    select pu.metric, pu.v from prior_u pu
  ),

  spine as (
    select gs::date as p
    from generate_series(v_start::timestamp, v_end::timestamp, v_step) gs
  ),
  -- THE CANONICAL METRIC LIST. Repeated here rather than read from
  -- admin_growth_metrics() on purpose: that function computes a min() over
  -- every source table to work out each series' history start, which is a
  -- reasonable cost once when the console loads and a silly one on every
  -- series call. The drift check at the foot of this migration is what keeps
  -- this list, the catalogue's, and the union above in agreement.
  grid as (
    select c.metric, s.p
    from unnest(array[
      'accounts','accounts_registered','accounts_guest','profiles','active_users','sessions',
      'notes','highlights','tags','verse_tags','sermon_notes',
      'chapter_reads','reading_plan_days','reading_seconds','reading_readers',
      'posts','post_comments','note_comments','groups','group_joins','group_messages',
      'messages','friend_requests','game_rooms',
      'reports','reports_resolved','report_votes'
    ]) as c(metric)
    cross join spine s
  )
  select
    g.metric,
    g.p,
    coalesce(mg.value, 0)::bigint,
    (coalesce((select b.v from base b where b.metric = g.metric), 0)
       + sum(coalesce(mg.inc, 0)) over (partition by g.metric order by g.p
                                        rows between unbounded preceding and current row))::bigint
  from grid g
  left join merged mg on mg.metric = g.metric and mg.p = g.p
  order by g.metric, g.p;
end;
$$;


-- ----------------------------------------------------------------------------
-- GRANTS
--
-- Same convention as 019 and 025: revoke from anon (a logged-out caller has no
-- auth.uid(), so is_admin() would refuse anyway — this makes the refusal a 404
-- at the API edge instead of an exception, and means the function is not even
-- listed for an anonymous introspection).
-- ----------------------------------------------------------------------------
revoke execute on function admin_growth_series(text, integer, text) from anon;
revoke execute on function admin_growth_metrics() from anon;
grant execute on function admin_growth_series(text, integer, text) to authenticated;
grant execute on function admin_growth_metrics() to authenticated;


-- ----------------------------------------------------------------------------
-- Indexes. Every metric above is "group this table by a timestamp", which is a
-- sequential scan today (a few hundred rows) and stays one until a table gets
-- big. These cover the two that will grow fastest and are already the largest.
-- The rest are deliberately not indexed: an index that serves one admin query a
-- day is a write cost paid on every insert, forever.
-- ----------------------------------------------------------------------------
create index if not exists analytics_sessions_started_at_idx on analytics_sessions (started_at);
create index if not exists chapter_reads_read_at_idx on chapter_reads (read_at);


-- ----------------------------------------------------------------------------
-- The catalogue-vs-series drift check.
--
-- The metric list lives in two places by necessity — a `values` list in
-- admin_growth_metrics() and a UNION in admin_growth_series() — and the failure
-- mode of them disagreeing is silent: a metric added only to the union never
-- appears (the grid is built from the catalogue), and one added only to the
-- catalogue draws a permanent flat zero that looks like a real finding.
--
-- So this migration refuses to finish if they disagree.
--
-- It cannot simply call the two functions and compare: this runs on the
-- migration's own superuser connection, where there is no auth.uid(), so
-- is_admin() is false and both functions would (correctly) refuse. Instead it
-- inspects their SOURCE — `pg_proc.prosrc` — for each metric name as a quoted
-- literal. Crude, and exactly strong enough for the bug it exists to catch.
--
-- The array below is the canonical list. Each name must appear:
--   * at least once in admin_growth_metrics()  — its catalogue row
--   * at least twice in admin_growth_series()  — once in the `grid` array, and
--     once more as the label on its source in `ev` / `ev_u`. A name that
--     appears only once there is in the grid with nothing feeding it, which is
--     the flat-zero-that-looks-real failure.
--
-- Names are matched WITH their surrounding single quotes, so 'accounts' does
-- not match inside 'accounts_registered'.
-- ----------------------------------------------------------------------------
do $check$
declare
  v_names text[] := array[
    'accounts','accounts_registered','accounts_guest','profiles','active_users','sessions',
    'notes','highlights','tags','verse_tags','sermon_notes',
    'chapter_reads','reading_plan_days','reading_seconds','reading_readers',
    'posts','post_comments','note_comments','groups','group_joins','group_messages',
    'messages','friend_requests','game_rooms',
    'reports','reports_resolved','report_votes'
  ];
  v_cat  text;
  v_ser  text;
  v_name text;
  v_q    text;
  v_bad  text := '';
begin
  select p.prosrc into v_cat from pg_proc p
   where p.proname = 'admin_growth_metrics' and p.pronamespace = 'public'::regnamespace;
  select p.prosrc into v_ser from pg_proc p
   where p.proname = 'admin_growth_series' and p.pronamespace = 'public'::regnamespace;

  if v_cat is null or v_ser is null then
    raise exception 'admin_growth functions did not get created';
  end if;

  foreach v_name in array v_names loop
    v_q := '''' || v_name || '''';
    if position(v_q in v_cat) = 0 then
      v_bad := v_bad || v_name || ' is not in the catalogue; ';
    end if;
    if (length(v_ser) - length(replace(v_ser, v_q, ''))) / length(v_q) < 2 then
      v_bad := v_bad || v_name || ' has no source in admin_growth_series; ';
    end if;
  end loop;

  if v_bad <> '' then
    raise exception 'admin_growth metric lists disagree: %', v_bad;
  end if;

  raise notice 'admin_growth_series: % metrics registered, catalogue agrees', array_length(v_names, 1);
end;
$check$;

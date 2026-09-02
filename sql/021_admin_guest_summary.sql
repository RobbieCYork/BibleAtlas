-- ============================================================================
-- ADMIN CONSOLE — guest aggregation.
--
-- Run once, by hand, the same way as sql/019_admin_and_analytics.sql:
--   psql "$SUPABASE_DB_URL" -f sql/021_admin_guest_summary.sql
-- (020 is the group study-trips migration; this is the next free number.)
--
-- ----------------------------------------------------------------------------
-- WHY
-- ----------------------------------------------------------------------------
-- "Continue as Guest" mints a brand-new anonymous auth.users row on every tap,
-- including every tap made while testing. The result is that the Users list is
-- overwhelmingly throwaway rows: at the time of writing, 42 of 48 accounts are
-- anonymous and only 6 are real people. Listing them individually buries the six
-- accounts the owner actually needs to look at.
--
-- So the console now renders ONE aggregate "Guests" card in place of those rows,
-- and this function is what fills it — both the headline counts and the
-- expanded, day-by-day detail. Registered accounts keep going through
-- admin_list_users and keep being listed one per row.
--
-- ----------------------------------------------------------------------------
-- THE HONEST CAVEAT, ENCODED IN THE SHAPE OF THE RESULT
-- ----------------------------------------------------------------------------
-- Analytics only began recording when migration 019 shipped. Guests created
-- before that have an auth.users row (so we know they exist and when) but no
-- analytics_sessions row at all (so we do NOT know how long they stayed or what
-- they did). Presenting "0 sessions" for those would be a lie of omission.
--
-- The result therefore reports `analytics_since`, `guests_with_sessions` and
-- `guests_before_analytics` alongside the session figures, so the UI can say
-- plainly which guests are measurable and which are merely counted. Every
-- session-derived number below is computed over the measurable subset only; the
-- pure head-count numbers are computed over all anonymous users.
--
-- Same security shape as every other admin_* function: SECURITY DEFINER (it
-- must read auth.users, which PostgREST does not expose), pinned search_path,
-- and an unconditional is_admin() gate that raises 42501 before any work.
-- ============================================================================

create or replace function admin_guest_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  v_result jsonb;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  with guests as (
    select u.id,
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    where coalesce(u.is_anonymous, false)
  ),
  -- One row per guest that analytics actually saw, with its session roll-up.
  guest_sessions as (
    select s.id as session_id,
           s.user_id,
           s.started_at,
           s.last_seen_at,
           s.event_count,
           greatest(extract(epoch from (s.last_seen_at - s.started_at)), 0) as seconds
    from analytics_sessions s
    where s.user_id in (select id from guests)
       or (s.user_id is null and s.is_anonymous)
  ),
  per_guest as (
    select g.id,
           g.created_at,
           g.last_sign_in_at,
           agg.sessions,
           agg.seconds,
           agg.last_seen
    from guests g
    left join lateral (
      select count(*) as sessions,
             coalesce(sum(gs.seconds), 0) as seconds,
             max(gs.last_seen_at) as last_seen
      from guest_sessions gs where gs.user_id = g.id
    ) agg on true
  ),
  -- Head-count history: one row per calendar day a guest first appeared, plus
  -- the sessions and measured time that landed on that day. Days with nothing at
  -- all are omitted rather than padded, because a padded zero and a
  -- before-analytics zero look identical and mean different things.
  day_span as (
    select (date_trunc('day', now()) - (n || ' days')::interval)::date as day
    from generate_series(0, v_days - 1) n
  ),
  per_day as (
    select d.day,
           (select count(*) from guests g where (g.created_at at time zone 'UTC')::date = d.day) as new_guests,
           (select count(*) from guest_sessions gs where (gs.started_at at time zone 'UTC')::date = d.day) as sessions,
           (select count(distinct gs.user_id) from guest_sessions gs
              where (gs.started_at at time zone 'UTC')::date = d.day) as active_guests,
           (select coalesce(sum(gs.seconds), 0) from guest_sessions gs
              where (gs.started_at at time zone 'UTC')::date = d.day) as seconds,
           (select min(gs.started_at) from guest_sessions gs
              where (gs.started_at at time zone 'UTC')::date = d.day) as first_session_at,
           (select max(gs.last_seen_at) from guest_sessions gs
              where (gs.started_at at time zone 'UTC')::date = d.day) as last_session_at
    from day_span d
  ),
  -- The most recent individual guest sessions, for the "times" half of the
  -- detail view. No identity beyond the session's own timestamps — a guest has
  -- no name, no email, and nothing here reaches for one.
  recent as (
    select gs.session_id, gs.started_at, gs.last_seen_at, gs.seconds, gs.event_count
    from guest_sessions gs
    order by gs.started_at desc
    limit 20
  )
  select jsonb_build_object(
    'total', (select count(*) from guests),
    'new_24h', (select count(*) from guests where created_at >= now() - interval '24 hours'),
    'new_7d', (select count(*) from guests where created_at >= now() - interval '7 days'),
    'new_30d', (select count(*) from guests where created_at >= now() - interval '30 days'),
    'first_seen', (select min(created_at) from guests),
    'newest_seen', (select max(created_at) from guests),
    -- "Active" here means a session heartbeat in the window — only knowable for
    -- guests analytics saw, so it is deliberately reported next to
    -- guests_with_sessions rather than next to `total`.
    'active_24h', (select count(distinct user_id) from guest_sessions
                     where user_id is not null and last_seen_at >= now() - interval '24 hours'),
    'active_7d', (select count(distinct user_id) from guest_sessions
                     where user_id is not null and last_seen_at >= now() - interval '7 days'),
    'last_active_at', (select max(last_seen_at) from guest_sessions),
    'guests_with_sessions', (select count(*) from per_guest where coalesce(sessions, 0) > 0),
    'guests_before_analytics', (select count(*) from per_guest where coalesce(sessions, 0) = 0),
    'sessions_total', (select count(*) from guest_sessions),
    'sessions_seconds_total', (select coalesce(sum(seconds), 0) from guest_sessions),
    'median_session_seconds', (select percentile_cont(0.5) within group (order by seconds)
                                 from guest_sessions),
    'returning_guests', (select count(*) from per_guest where coalesce(sessions, 0) > 1),
    'analytics_since', (select min(started_at) from analytics_sessions),
    'days', coalesce((
      select jsonb_agg(to_jsonb(pd) order by pd.day desc)
      from per_day pd
      where pd.new_guests > 0 or pd.sessions > 0
    ), '[]'::jsonb),
    'recent_sessions', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.started_at desc) from recent r
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Same grant shape as the rest: authenticated may call it (and be refused inside
-- if not an admin); anon may not call it at all.
revoke execute on function admin_guest_summary(integer) from anon;
grant execute on function admin_guest_summary(integer) to authenticated;

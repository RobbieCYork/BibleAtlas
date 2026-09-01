-- ============================================================================
-- ADMIN CONSOLE — authorization, analytics capture, and the admin read API.
--
-- Not auto-applied by anything in this repo (there's no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/019_admin_and_analytics.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- ----------------------------------------------------------------------------
-- WHY A SEPARATE `admin_users` TABLE INSTEAD OF `profiles.is_admin`
-- ----------------------------------------------------------------------------
-- The existing profiles UPDATE policy is a blanket row grant:
--     profiles_update_own   UPDATE   USING (auth.uid() = id)   WITH CHECK (auth.uid() = id)
-- Postgres RLS is ROW-level, not column-level, so that policy permits an update
-- to ANY column of your own row. Adding `is_admin boolean` to `profiles` would
-- therefore hand every account a one-line privilege escalation:
--     supabase.from("profiles").update({ is_admin: true }).eq("id", myId)
-- That could be patched with a column-level REVOKE or a BEFORE UPDATE trigger,
-- but both are defences bolted onto a table whose whole point is that its owner
-- may rewrite it. The admin flag does not belong there.
--
-- So admin-ness lives in its own table with NO insert/update/delete policy at
-- all. RLS denies by default, so with RLS enabled and no write policy, no role
-- that goes through PostgREST (anon or authenticated) can write a row — there
-- is no statement to escalate WITH. Grants are made out-of-band, by a superuser
-- connection (the SQL editor / SUPABASE_DB_URL), which is exactly the property
-- "my profile and my profile only" needs.
--
-- The single SELECT policy lets an account read only its own row, so the client
-- can answer "am I an admin?" without being able to enumerate who else is.
-- ============================================================================

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  note text
);

alter table admin_users enable row level security;

-- Read your OWN row only. Deliberately not "any admin sees all admins" — that
-- would be a different (and larger) surface for no benefit at this size.
drop policy if exists admin_users_select_self on admin_users;
create policy admin_users_select_self on admin_users
  for select using (user_id = auth.uid());

-- NO insert/update/delete policies, on purpose. See the header. Grants are made
-- by hand:  insert into admin_users (user_id) values ('<uuid>');

-- ----------------------------------------------------------------------------
-- is_admin() — the single predicate every admin-only policy and RPC checks.
--
-- SECURITY DEFINER because admin_users' own SELECT policy only exposes your own
-- row; the policies below need to evaluate the flag as a fact about the caller
-- without RLS re-entering. STABLE so the planner can hoist it out of per-row
-- evaluation. search_path is pinned so a caller cannot shadow `admin_users`
-- with a temp table of their own and answer the question for themselves.
-- ----------------------------------------------------------------------------
create or replace function is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select uid is not null and exists (select 1 from admin_users a where a.user_id = uid);
$$;

-- ============================================================================
-- ANALYTICS CAPTURE
--
-- PRIVACY LINE — read before adding an event.
-- This records WHAT KIND of thing happened and WHEN. It never records content:
-- no note or message bodies, no verse text, no search query strings, no post
-- text, no reading positions. A props value must be a short, low-cardinality
-- label the app itself chose from a fixed list (a panel key, a game id, a plan
-- id), never anything a person typed. `props` is size-capped below so a client
-- bug or a hand-rolled request cannot quietly turn this into a content log.
--
-- Two tables, because the two questions have different shapes:
--   analytics_events   — one row per thing that happened (feature usage)
--   analytics_sessions — one row per visit, with a moving last_seen_at
--                        (time on site, actives, bounce)
-- Deriving time-on-site from session rows rather than from event timestamps
-- keeps the engagement queries off the big table entirely.
-- ============================================================================

create table if not exists analytics_sessions (
  -- Client-generated (crypto.randomUUID) and held in sessionStorage, so a
  -- reload continues the same session and a new tab starts a new one.
  id uuid primary key,
  -- Nullable: a visitor who is not signed in at all still gets a session row.
  -- ON DELETE SET NULL so deleting an account leaves the aggregate intact but
  -- unattributed, rather than cascading a hole in the history.
  user_id uuid references auth.users(id) on delete set null,
  is_anonymous boolean not null default false,
  started_at timestamptz not null default now(),
  -- Advanced by every heartbeat/flush. (last_seen_at - started_at) is the
  -- session's duration; see the "time on site" note on analytics_track below.
  last_seen_at timestamptz not null default now(),
  event_count integer not null default 0
);

create index if not exists analytics_sessions_started_idx on analytics_sessions (started_at desc);
create index if not exists analytics_sessions_user_idx on analytics_sessions (user_id, last_seen_at desc);

create table if not exists analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid not null,
  -- Closed vocabulary by shape: lowercase dotted identifiers only
  -- ("panel.open", "game.play"). Rejects anything free-text-looking.
  event text not null check (event ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$' and length(event) <= 64),
  -- Small labels only — the size cap is the privacy backstop described above.
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 512),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx on analytics_events (created_at desc);
create index if not exists analytics_events_event_idx on analytics_events (event, created_at desc);
create index if not exists analytics_events_user_idx on analytics_events (user_id, created_at desc);

alter table analytics_sessions enable row level security;
alter table analytics_events enable row level security;

-- ----------------------------------------------------------------------------
-- RLS: admins read; NOBODY writes directly; nobody but an admin reads.
--
-- A normal user cannot SELECT these tables at all — not even their own rows.
-- That is deliberate: "you may read your own activity" is one join away from
-- "you may read a friend's", and there is no product reason for the client to
-- read back what it just wrote.
--
-- There is also no INSERT policy. Writes go exclusively through
-- analytics_track() (SECURITY DEFINER) below, so every timestamp, user_id and
-- session ownership check is decided server-side and a client cannot forge a
-- backdated session, attribute an event to someone else, or bloat a row.
-- ----------------------------------------------------------------------------
drop policy if exists analytics_events_admin_read on analytics_events;
create policy analytics_events_admin_read on analytics_events
  for select using (is_admin());

drop policy if exists analytics_sessions_admin_read on analytics_sessions;
create policy analytics_sessions_admin_read on analytics_sessions
  for select using (is_admin());

-- ----------------------------------------------------------------------------
-- analytics_track() — the one and only write path.
--
-- Called with the tab's session id plus a batch of queued events. It both
-- (a) touches the session row, which is what makes time-on-site work, and
-- (b) appends the events. One round trip covers a heartbeat with nothing to
-- report (p_events = '[]') and a flush of a dozen events equally well.
--
-- TIME ON SITE is (last_seen_at - started_at) per session. The client heartbeats
-- roughly every 60s while the tab is visible and flushes on visibilitychange.
-- We deliberately do NOT try to catch unload — beforeunload/pagehide are
-- unreliable on mobile Safari, which is most of this app's traffic — so a
-- session's tail is simply truncated at its last heartbeat. That undercounts a
-- session by under a minute and never overcounts, which is the right direction
-- to be wrong in.
--
-- Cheapness: everything is server-side-cheap (one upsert + one insert...select),
-- there is no read-back, and the caller ignores the result.
--
-- Abuse ceilings: at most 50 events per call, and a session stops accepting
-- events past MAX_SESSION_EVENTS. Both fail silently rather than erroring, so a
-- runaway client degrades to no-op instead of to an error loop.
-- ----------------------------------------------------------------------------
create or replace function analytics_track(p_session_id uuid, p_events jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_anon boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_count integer;
  v_accepted integer := 0;
  max_session_events constant integer := 5000;
begin
  if p_session_id is null then
    return;
  end if;

  insert into analytics_sessions (id, user_id, is_anonymous, started_at, last_seen_at)
  values (p_session_id, v_uid, v_anon, now(), now())
  on conflict (id) do update
    set last_seen_at = now(),
        -- A session that starts signed-out and then signs in becomes attributed
        -- from that point on; it never gets re-attributed to a different account.
        user_id = coalesce(analytics_sessions.user_id, excluded.user_id),
        is_anonymous = case when analytics_sessions.user_id is null then excluded.is_anonymous
                            else analytics_sessions.is_anonymous end
    -- Guard: you may only touch a session that is yours or still unattributed.
    -- Session ids are v4 UUIDs, so this is belt-and-braces against a guessed id.
    where analytics_sessions.user_id is null or analytics_sessions.user_id = v_uid;

  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) = 0 then
    return;
  end if;

  -- Ownership re-check before appending. The upsert above silently declines to
  -- touch a session belonging to someone else, so this SELECT is what turns that
  -- into a refusal to write events under it too. Without it, an attacker who
  -- guessed a v4 session UUID could not read anything or re-attribute the
  -- session, but could still append rows sharing its session_id and pollute that
  -- one session's event list. Session ownership is a server-side fact; a caller
  -- may only write to a session that is theirs or still unattributed.
  select event_count into v_count from analytics_sessions
   where id = p_session_id and (user_id is null or user_id = v_uid);
  if v_count is null or v_count >= max_session_events then
    return;
  end if;

  with candidates as (
    select e.value as ev
    from jsonb_array_elements(p_events) as e(value)
    limit 50
  )
  insert into analytics_events (user_id, session_id, event, props, created_at)
  select v_uid,
         p_session_id,
         ev ->> 'e',
         case when jsonb_typeof(ev -> 'p') = 'object' then ev -> 'p' else '{}'::jsonb end,
         now()
  from candidates
  where ev ->> 'e' ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$'
    and length(ev ->> 'e') <= 64
    and pg_column_size(case when jsonb_typeof(ev -> 'p') = 'object' then ev -> 'p' else '{}'::jsonb end) <= 512;

  get diagnostics v_accepted = row_count;
  if v_accepted > 0 then
    update analytics_sessions set event_count = event_count + v_accepted where id = p_session_id;
  end if;
end;
$$;

-- Callable by signed-in and anonymous visitors alike; it decides for itself what
-- it will record for whom.
grant execute on function analytics_track(uuid, jsonb) to anon, authenticated;

-- ============================================================================
-- ADMIN READ API
--
-- Every function below starts with the same guard and raises rather than
-- returning an empty result, so a non-admin calling the REST endpoint directly
-- gets a hard 4xx, not a plausible-looking zero.
--
-- These are SECURITY DEFINER because several of them read `auth.users`, which
-- PostgREST does not expose and RLS cannot reach. That is the reason this whole
-- console needs NO service_role key and therefore NO server-side function: the
-- privileged reads happen inside the database, behind is_admin().
-- ============================================================================

create or replace function admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  select jsonb_build_object(
    'users_total',        (select count(*) from auth.users),
    'users_registered',   (select count(*) from auth.users where not coalesce(is_anonymous, false)),
    'users_anonymous',    (select count(*) from auth.users where coalesce(is_anonymous, false)),
    'users_new_24h',      (select count(*) from auth.users where created_at > now() - interval '24 hours'),
    'users_new_7d',       (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_new_30d',      (select count(*) from auth.users where created_at > now() - interval '30 days'),
    -- "Active" is analytics-derived, so it only counts from the day capture
    -- shipped. Before that these read 0 — that is honest, not broken.
    'active_24h',         (select count(distinct user_id) from analytics_sessions
                             where user_id is not null and last_seen_at > now() - interval '24 hours'),
    'active_7d',          (select count(distinct user_id) from analytics_sessions
                             where user_id is not null and last_seen_at > now() - interval '7 days'),
    'active_30d',         (select count(distinct user_id) from analytics_sessions
                             where user_id is not null and last_seen_at > now() - interval '30 days'),
    'sessions_24h',       (select count(*) from analytics_sessions where started_at > now() - interval '24 hours'),
    'sessions_7d',        (select count(*) from analytics_sessions where started_at > now() - interval '7 days'),
    'events_total',       (select count(*) from analytics_events),
    'analytics_since',    (select min(started_at) from analytics_sessions)
  ) into result;

  return result;
end;
$$;

-- New signups and active users per day, for the little bar strip in the console.
create or replace function admin_daily_activity(p_days integer default 30)
returns table (day date, signups bigint, sessions bigint, active_users bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_days integer := least(greatest(coalesce(p_days, 30), 1), 180);
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  return query
  with days as (
    select generate_series((current_date - (v_days - 1)), current_date, interval '1 day')::date as d
  )
  select days.d,
         (select count(*) from auth.users u where u.created_at::date = days.d),
         (select count(*) from analytics_sessions s where s.started_at::date = days.d),
         (select count(distinct s.user_id) from analytics_sessions s
            where s.started_at::date = days.d and s.user_id is not null)
  from days
  order by days.d;
end;
$$;

-- ----------------------------------------------------------------------------
-- The users list. Reads auth.users (email, signup, last sign-in, anonymous) and
-- joins the profile plus an analytics-derived last-seen.
--
-- p_search matches email or display name, case-insensitively. It is passed to
-- ILIKE via a parameter, never concatenated, and % / _ are escaped so a search
-- for "a_b" cannot become a wildcard.
-- ----------------------------------------------------------------------------
create or replace function admin_list_users(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  is_anonymous boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  last_seen_at timestamptz,
  session_count bigint,
  total_seconds numeric,
  is_admin boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_pattern text;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  v_pattern := case when v_search is null then null
                    else '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  return query
  with matched as (
    select u.id,
           u.email::text as email,
           p.display_name,
           coalesce(u.is_anonymous, false) as is_anonymous,
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    left join profiles p on p.id = u.id
    where v_pattern is null
       or u.email::text ilike v_pattern escape '\'
       or p.display_name ilike v_pattern escape '\'
  ),
  counted as (select count(*) as n from matched)
  select m.id,
         m.email,
         m.display_name,
         m.is_anonymous,
         m.created_at,
         m.last_sign_in_at,
         agg.last_seen,
         coalesce(agg.sessions, 0),
         coalesce(agg.seconds, 0),
         exists (select 1 from admin_users a where a.user_id = m.id),
         counted.n
  from matched m
  cross join counted
  left join lateral (
    select max(s.last_seen_at) as last_seen,
           count(*) as sessions,
           sum(extract(epoch from (s.last_seen_at - s.started_at))) as seconds
    from analytics_sessions s where s.user_id = m.id
  ) agg on true
  order by m.created_at desc
  limit v_limit offset v_offset;
end;
$$;

-- ----------------------------------------------------------------------------
-- Feature usage — the ranked most/least list. Returns EVERY event name seen in
-- the window, ascending rank left to the caller, so "least used" is just the
-- other end of the same list.
-- ----------------------------------------------------------------------------
create or replace function admin_feature_usage(p_days integer default 30)
returns table (event text, uses bigint, users bigint, last_used timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  return query
  select e.event,
         count(*)::bigint,
         count(distinct e.user_id)::bigint,
         max(e.created_at)
  from analytics_events e
  where e.created_at > now() - make_interval(days => v_days)
  group by e.event
  order by count(*) desc;
end;
$$;

-- Same window, broken out by a props label — used for "which panel" and "which
-- game". p_key is restricted to a known set so this can't be turned into a
-- generic props-scraper.
create or replace function admin_feature_breakdown(p_event text, p_key text, p_days integer default 30)
returns table (label text, uses bigint, users bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_key not in ('panel', 'game', 'plan', 'kind', 'color', 'scope') then
    raise exception 'unsupported breakdown key' using errcode = '22023';
  end if;

  return query
  select coalesce(e.props ->> p_key, '(none)') as label,
         count(*)::bigint,
         count(distinct e.user_id)::bigint
  from analytics_events e
  where e.event = p_event
    and e.created_at > now() - make_interval(days => v_days)
  group by 1
  order by 2 desc;
end;
$$;

-- ----------------------------------------------------------------------------
-- Engagement. Median is a percentile over session durations; sessions shorter
-- than 5 seconds are treated as bounces and reported separately rather than
-- being allowed to drag the median to zero.
-- ----------------------------------------------------------------------------
create or replace function admin_engagement(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  result jsonb;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  with s as (
    select extract(epoch from (last_seen_at - started_at)) as secs, user_id
    from analytics_sessions
    where started_at > now() - make_interval(days => v_days)
  ),
  engaged as (select * from s where secs >= 5)
  select jsonb_build_object(
    'sessions',            (select count(*) from s),
    'bounces',             (select count(*) from s where secs < 5),
    'median_seconds',      (select percentile_cont(0.5) within group (order by secs) from engaged),
    'mean_seconds',        (select avg(secs) from engaged),
    'p90_seconds',         (select percentile_cont(0.9) within group (order by secs) from engaged),
    'total_seconds',       (select coalesce(sum(secs), 0) from s),
    'sessions_per_user',   (select case when count(distinct user_id) = 0 then 0
                                        else count(*)::numeric / count(distinct user_id) end
                              from s where user_id is not null),
    -- Cheap retention: of the accounts that had a session in the window's first
    -- half, how many came back in the second half.
    'returning_users',     (select count(*) from (
                              select user_id from analytics_sessions
                              where user_id is not null
                                and started_at > now() - make_interval(days => v_days)
                              group by user_id
                              having count(distinct started_at::date) > 1
                            ) r)
  ) into result;

  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- Content counts. Row counts only — no bodies, no titles. What the owner needs
-- here is volume, and volume does not require reading anyone's Bible study.
-- ----------------------------------------------------------------------------
create or replace function admin_content_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  select jsonb_build_object(
    'notes',                (select count(*) from notes),
    'notes_public',         (select count(*) from notes where is_public),
    'highlights',           (select count(*) from highlights),
    'posts',                (select count(*) from posts),
    'post_comments',        (select count(*) from post_comments),
    'note_comments',        (select count(*) from note_comments),
    'sermon_notes',         (select count(*) from sermon_notes),
    'chapter_reads',        (select count(*) from chapter_reads),
    'reading_plan_days',    (select count(*) from reading_plan_progress),
    'reading_plans_started',(select count(distinct (user_id, plan_id)) from reading_plan_progress),
    'groups',               (select count(*) from groups),
    'friendships',          (select count(*) from friend_requests where status = 'accepted'),
    'game_rooms',           (select count(*) from game_rooms),
    'profiles_with_avatar', (select count(*) from profiles where avatar_url is not null)
  ) into result;

  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- MODERATION
--
-- Scoped to PUBLIC social content only — posts marked public and the comments
-- on them. Private notes, direct messages and group messages are deliberately
-- NOT reachable from here: an admin needing to police what people say in public
-- is a real need; an admin reading private Bible study is not.
-- ----------------------------------------------------------------------------
create or replace function admin_recent_public_content(p_limit integer default 40)
returns table (
  kind text,
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 200);
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  return query
  select * from (
    select 'post'::text, p.id, p.user_id, coalesce(pr.display_name, pr.email), p.body, p.created_at
    from posts p left join profiles pr on pr.id = p.user_id
    where p.is_public
    union all
    select 'comment'::text, c.id, c.author_id, coalesce(pr.display_name, pr.email), c.body, c.created_at
    from post_comments c left join profiles pr on pr.id = c.author_id
  ) rows
  order by 6 desc
  limit v_limit;
end;
$$;

create or replace function admin_delete_content(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;

  if p_kind = 'post' then
    delete from posts where id = p_id;
  elsif p_kind = 'comment' then
    delete from post_comments where id = p_id;
  else
    raise exception 'unsupported content kind' using errcode = '22023';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Grants. EXECUTE defaults to PUBLIC on new functions, and the is_admin() guard
-- inside each one is the actual gate — but revoking from anon narrows the
-- surface a signed-out request can even reach.
-- ----------------------------------------------------------------------------
revoke execute on function admin_overview() from anon;
revoke execute on function admin_daily_activity(integer) from anon;
revoke execute on function admin_list_users(text, integer, integer) from anon;
revoke execute on function admin_feature_usage(integer) from anon;
revoke execute on function admin_feature_breakdown(text, text, integer) from anon;
revoke execute on function admin_engagement(integer) from anon;
revoke execute on function admin_content_counts() from anon;
revoke execute on function admin_recent_public_content(integer) from anon;
revoke execute on function admin_delete_content(text, uuid) from anon;

-- ============================================================================
-- GRANT THE OWNER. Run by hand from a privileged connection; there is no policy
-- that lets this happen from the app.
-- ============================================================================
insert into admin_users (user_id, note)
select id, 'owner' from auth.users where email = 'robbie.c.york@gmail.com'
on conflict (user_id) do nothing;

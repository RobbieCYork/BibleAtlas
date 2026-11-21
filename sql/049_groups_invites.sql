-- ============================================================================
-- 049_groups_invites.sql — CAPSTONE PLUS FOR GROUPS, PHASE 3: INVITES
--
-- STATUS: WRITTEN AND COMMITTED ON BRANCH `groups-invites`. **NOT APPLIED ANYWHERE.**
--         Applying it needs Robbie's explicit word, like every migration since
--         033. Rehearse on staging first. Local rehearsal (no account needed):
--           node scripts/groups/invites-rls-test.mjs --local
--         and the mutation proof:
--           node scripts/groups/invites-rls-test.mjs --local --mutations
--
-- NUMBERING: 048 (assignments) is the last number taken (sql/README.md). 049.
--
-- DEPENDS ON: 025, 033, 043, 045, 047 (classes, class_invites,
--   invite_suppressions, the self-only role helpers), 048 is NOT needed but is
--   applied before this in the rehearsal (apply order 033, 043, 045, 046, 047,
--   048, 049). And the live auth.users (email, email_confirmed_at), profiles,
--   is_blocked_between().
--
-- PLAN: automation/manager/groups-feature-plan.md §1 flows B and C, §4, §5.
--   EVERYTHING here is behind paid.groups_enabled (ships FALSE, sql/047) AND a
--   second, separate kill switch for outgoing mail, invites.sending_enabled
--   (ships FALSE, below). With the second off, invites can be created by the
--   owner in preview but NOTHING is ever claimed for sending.
--   Email only. No SMS of any kind (plan phase 8). The teacher's own phone is
--   the only SMS channel: the app hands them a link and a code to text.
-- ============================================================================
--
-- WHAT THIS ADDS
-- ----------------------------------------------------------------------------
--   class_invites (047)        + personal_note, sends, last_sent_at,
--                              send_failures, revoked_at, joined_at,
--                              joined_user_id, ended_reason, updated_at.
--                              token_hash DROPPED: one email = one fresh token,
--                              so the hashes live in class_invite_tokens.
--                              next_reminder_at now means "next send due"
--                              (the first send included).
--   class_invite_tokens        sha256 of every join / unsubscribe token we ever
--                              emailed. The RAW token is generated inside
--                              invite_claim_due(), returned once to the mailer
--                              (service role) and never stored.
--   class_invite_sends         one row per email: the idempotency ledger
--                              (unique invite_id + seq — an email slot can be
--                              claimed once, ever) and the provider message id
--                              that bounces / complaints are matched by.
--   class_invite_events        audit: created, reopened, sent, failed, revoked,
--                              resent, joined, unsubscribed, bounced,
--                              complained, expired, stopped.
--   email_provider_events      webhook idempotency (provider event ids).
--   class_members.age_bracket  '13_17' | '18_plus' — the join-time attestation
--                              (plan §5: store only the bracket, never a date).
--   classes.seats_full_at /    "someone was turned away because the class is
--   seats_full_emailed_at      full": the owner is emailed ONCE; cleared when
--                              seats are added.
--   join_class(code, age)      replaces 047's join_class(text).
--   redeem_class_invite(token, age), class_invite_preview(token)
--   create_class_invites(class, emails[], note), class_invite_list(class),
--   revoke_class_invite(id), resend_class_invite(id)
--   SERVICE ROLE ONLY: invite_claim_due(now, limit), invite_mark_sent,
--   invite_mark_failed, invite_unsubscribe, invite_provider_event,
--   invite_full_notices_claim(now)
--   switches                   invites.sending_enabled (false),
--                              invites.daily_global_cap (300)
--
-- REMINDER SCHEDULE (plan §4), enforced HERE, not in the mailer:
--   send 1 = the invite, as soon as the mailer runs (inside quiet hours: the
--   next run after 08:00 in the class time zone). Reminders 2..6 at +1, +3, +5,
--   +14, +30 days after send 1, never two within 24 hours. 6 emails maximum
--   (047's CHECK reminders_sent <= 5 is the second wall). Stops on: join (by
--   link OR code — the joiner's account email is matched), revoke,
--   unsubscribe (global or this class), bounce, complaint, suppression, class
--   not active / ended / full, inviter no longer staff or account gone, inviter
--   paused for complaints or bounces, the 45-day expiry. Quiet hours: nothing
--   is claimed outside 08:00-20:59 class local time.
--   Global cap: invites.daily_global_cap emails per rolling 24 hours.
--   IDEMPOTENCY: a claimed slot is never re-sent. A claim the mailer never
--   confirmed (crash mid-send) becomes 'unknown' after 15 minutes and COUNTS AS
--   SENT — at most once beats at least once for mail to people who are not
--   users. invite_mark_failed (the provider definitely refused) is the only
--   path that releases a slot.
--
-- ABUSE CONTROLS (plan §4 "Anti-spam and abuse"):
--   inviter must be class staff, the class must be active (paid), the inviter's
--   OWN email must be confirmed; 50 addresses per call; 100 new invites per
--   inviter per 24h; 50 per class per 24h; pending invites + active members <=
--   2 x seats purchased; an organisation that is not verified: 30 invites in
--   total; complaints or a bounce rate over 5% pause the inviter; resend at
--   most once per 24h per invite; a personal note of at most 280 characters
--   with NO web addresses, and class / organisation / teacher names with no web
--   addresses either (the only free text in the email; the template
--   HTML-escapes all of it).
--
-- PRIVACY:
--   address (raw email) is NULLED on join, revoke, opt-out, bounce, expiry.
--   address_hash (sha256 of the lower-cased address) stays so suppression and
--   join-matching work. A bare sha256 of an email is pseudonymous, not
--   anonymous (emails are guessable): it is server-only, never granted.
--   Students never see invites. Staff see their OWN class's invite list. The
--   app owner gets no read of invites (plan §2).
--
-- IDEMPOTENT: add column if not exists; create ... if not exists; create or
-- replace; inserts on conflict do nothing. Safe to run twice.
--
-- REVERSAL (only before any real invite exists):
--   drop table public.class_invite_events, public.class_invite_sends,
--              public.class_invite_tokens, public.email_provider_events;
--   drop every function created below; recreate 047's join_class(text);
--   alter table public.class_invites drop the added columns, add back token_hash;
--   alter table public.class_members drop column age_bracket;
--   alter table public.classes drop column seats_full_at, drop column seats_full_emailed_at;
--   delete from public.app_settings where key like 'invites.%';
-- ============================================================================

begin;

insert into public.app_settings (key, value) values
  ('invites.sending_enabled',  'false'::jsonb),
  ('invites.daily_global_cap', '300'::jsonb)
on conflict (key) do nothing;


-- ============================================================================
-- 1. COLUMNS
-- ============================================================================
alter table public.class_invites drop column if exists token_hash;
alter table public.class_invites add column if not exists personal_note  text
  check (personal_note is null or char_length(personal_note) <= 280);
alter table public.class_invites add column if not exists sends          integer not null default 0
  check (sends between 0 and 6);
alter table public.class_invites add column if not exists last_sent_at   timestamptz;
alter table public.class_invites add column if not exists send_failures  integer not null default 0
  check (send_failures between 0 and 10);
alter table public.class_invites add column if not exists revoked_at     timestamptz;
alter table public.class_invites add column if not exists joined_at      timestamptz;
alter table public.class_invites add column if not exists joined_user_id uuid references auth.users(id) on delete set null;
alter table public.class_invites add column if not exists ended_reason   text
  check (ended_reason is null or char_length(ended_reason) <= 40);
alter table public.class_invites add column if not exists updated_at     timestamptz not null default now();

create index if not exists class_invites_due_idx on public.class_invites (next_reminder_at) where status = 'pending';
create index if not exists class_invites_hash_idx on public.class_invites (address_hash);
create index if not exists class_invites_inviter_idx on public.class_invites (invited_by, created_at desc);

alter table public.class_members add column if not exists age_bracket text
  check (age_bracket is null or age_bracket in ('13_17', '18_plus'));

alter table public.classes add column if not exists seats_full_at         timestamptz;
alter table public.classes add column if not exists seats_full_emailed_at timestamptz;


-- ============================================================================
-- 2. TABLES
-- ============================================================================
create table if not exists public.class_invite_sends (
  id           bigint      generated always as identity primary key,
  invite_id    uuid        references public.class_invites(id) on delete set null,
  class_id     uuid,       -- no FK: the ledger outlives the class (global cap, bounce matching)
  invited_by   uuid,       -- no FK: per-inviter pause counts outlive nothing personal
  seq          integer     not null check (seq between 1 and 6),
  status       text        not null default 'claimed' check (status in ('claimed', 'sent', 'failed', 'unknown')),
  provider_id  text        unique check (provider_id is null or char_length(provider_id) between 1 and 200),
  claimed_at   timestamptz not null,
  sent_at      timestamptz,
  error        text        check (error is null or char_length(error) <= 200),
  unique (invite_id, seq)
);
create index if not exists class_invite_sends_claimed_idx on public.class_invite_sends (claimed_at desc);
create index if not exists class_invite_sends_inviter_idx on public.class_invite_sends (invited_by, claimed_at desc);

create table if not exists public.class_invite_tokens (
  token_hash text        primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  invite_id  uuid        not null references public.class_invites(id) on delete cascade,
  send_id    bigint      references public.class_invite_sends(id) on delete set null,
  purpose    text        not null check (purpose in ('join', 'unsub')),
  created_at timestamptz not null default now()
);
create index if not exists class_invite_tokens_invite_idx on public.class_invite_tokens (invite_id);

create table if not exists public.class_invite_events (
  id         bigint      generated always as identity primary key,
  invite_id  uuid        references public.class_invites(id) on delete set null,
  class_id   uuid,
  actor      uuid,
  event      text        not null check (event in ('created', 'reopened', 'sent', 'failed', 'revoked', 'resent', 'joined',
                                                  'unsubscribed', 'unsubscribed_class', 'bounced', 'complained',
                                                  'expired', 'stopped', 'full_notice')),
  at         timestamptz not null default now(),
  detail     jsonb       check (detail is null or pg_column_size(detail) <= 2048)
);
create index if not exists class_invite_events_actor_idx on public.class_invite_events (actor, event, at desc);
create index if not exists class_invite_events_invite_idx on public.class_invite_events (invite_id);

create table if not exists public.email_provider_events (
  event_id    text        primary key check (char_length(event_id) between 1 and 200),
  kind        text        not null check (char_length(kind) <= 60),
  provider_id text,
  outcome     text        not null,
  received_at timestamptz not null default now()
);


-- ============================================================================
-- 3. GRANTS — revoke to zero first (sql/README.md: Supabase's default ACL).
--    NONE of the new tables is readable by a client. Staff read their class's
--    invites through class_invite_list(); 047's staff SELECT on class_invites
--    stays (the row holds no token now).
-- ============================================================================
alter table public.class_invite_sends    enable row level security;
alter table public.class_invite_tokens   enable row level security;
alter table public.class_invite_events   enable row level security;
alter table public.email_provider_events enable row level security;

revoke all on public.class_invite_sends    from anon, authenticated, public;
revoke all on public.class_invite_tokens   from anon, authenticated, public;
revoke all on public.class_invite_events   from anon, authenticated, public;
revoke all on public.email_provider_events from anon, authenticated, public;
revoke all on sequence public.class_invite_sends_id_seq  from anon, authenticated, public;
revoke all on sequence public.class_invite_events_id_seq from anon, authenticated, public;


-- ============================================================================
-- 4. INTERNAL HELPERS (no client EXECUTE)
-- ============================================================================

-- sha256 hex of the normalised address. Core Postgres sha256() (no pgcrypto).
create or replace function public.invite_addr_hash(p_address text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select encode(sha256(convert_to(lower(trim(coalesce(p_address, ''))), 'UTF8')), 'hex');
$$;

create or replace function public.invite_token_hash(p_token text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

-- 64 hex characters from two v4 UUIDs (244 random bits).
create or replace function public.invite_new_token()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

-- Does this text contain anything a mail client would turn into a link?
-- Scheme, www., an @ (an email address), or a dotted domain-looking word.
create or replace function public.invite_text_has_link(p_text text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(p_text, '') ~* '([a-z][a-z0-9+.-]*:/|www\.|@|[[:alnum:]-]+\.[[:alpha:]]{2,}([/:?#[:space:]]|$))';
$$;

create or replace function public.invite_setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select case when jsonb_typeof(s.value) = 'number' then (s.value #>> '{}')::numeric::integer end
       from public.app_settings s where s.key = p_key),
    p_default);
$$;

-- An inviter is paused after any complaint in 90 days, or 3+ bounces in 30
-- days that are more than 5% of their sends in that window.
create or replace function public.invite_sender_paused(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_uid is not null and (
    exists (select 1 from public.class_invite_events e
             where e.actor = p_uid and e.event = 'complained' and e.at > now() - interval '90 days')
    or (
      (select count(*) from public.class_invite_events e
        where e.actor = p_uid and e.event = 'bounced' and e.at > now() - interval '30 days') >= 3
      and (select count(*) from public.class_invite_events e
            where e.actor = p_uid and e.event = 'bounced' and e.at > now() - interval '30 days') * 20
          > (select count(*) from public.class_invite_sends s
              where s.invited_by = p_uid and s.status in ('sent', 'unknown') and s.claimed_at > now() - interval '30 days')
    ));
$$;

-- Offsets of sends 2..6 from send 1 (plan §4: +1, +3, +5, +14, +30 days).
-- supabase/functions/_shared/inviteSchedule.ts carries the same array and its
-- unit test reads THIS line to prove they agree.
create or replace function public.invite_reminder_offsets()
returns integer[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select array[1, 3, 5, 14, 30];  -- INVITE_REMINDER_DAYS
$$;

-- When the next email for an invite is due, given how many have gone out.
create or replace function public.invite_next_due(p_first_sent timestamptz, p_sends integer, p_now timestamptz)
returns timestamptz
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
           when p_sends <= 0 then p_now
           when p_sends >= 6 then null
           else greatest(p_first_sent + make_interval(days => (public.invite_reminder_offsets())[p_sends]),
                         p_now + interval '24 hours')
         end;
$$;

create or replace function public.invite_log(p_invite uuid, p_class uuid, p_actor uuid, p_event text, p_detail jsonb default null)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.class_invite_events (invite_id, class_id, actor, event, detail)
  values (p_invite, p_class, p_actor, p_event, p_detail);
$$;

-- Stop every pending invite to this address (all classes): unsubscribe,
-- bounce, complaint. address nulled.
create or replace function public.invite_stop_address(p_hash text, p_status text, p_event text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id, class_id, invited_by from public.class_invites
     where address_hash = p_hash and status = 'pending'
     for update
  loop
    update public.class_invites
       set status = p_status, address = null, next_reminder_at = null, ended_reason = p_event, updated_at = now()
     where id = r.id;
    -- 'stopped', not p_event: the one bounce / complaint that pauses an
    -- inviter is logged once, by invite_provider_event().
    perform public.invite_log(r.id, r.class_id, null, 'stopped', jsonb_build_object('reason', p_event));
    n := n + 1;
  end loop;
  return n;
end;
$$;


-- ============================================================================
-- 5. JOINING — by code (047, now with the age attestation) and by an emailed
--    invite token. Both go through class_join_core().
-- ============================================================================

-- p_class is LOCKED by the caller. Never raises for a business failure.
create or replace function public.class_join_core(p_class_id uuid, p_uid uuid, p_age text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class  public.classes%rowtype;
  v_active int;
  v_mine   int;
  v_state  text;
  v_hash   text;
  r        record;
begin
  select * into v_class from public.classes where id = p_class_id;
  if v_class.id is null or v_class.status <> 'active' or v_class.billing_mode <> 'admin_pays' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_class.ends_on is not null and now() >= public.class_end_ts(v_class.ends_on, v_class.time_zone) then
    return jsonb_build_object('ok', false, 'error', 'ended');
  end if;
  if exists (select 1 from public.class_staff s where s.class_id = v_class.id and s.user_id = p_uid) then
    return jsonb_build_object('ok', false, 'error', 'already_staff', 'class_id', v_class.id);
  end if;

  select seat_state into v_state from public.class_members where class_id = v_class.id and user_id = p_uid;
  if v_state = 'active' then
    return jsonb_build_object('ok', true, 'class_id', v_class.id, 'name', v_class.name, 'already', true);
  end if;

  select count(*) into v_mine
    from public.class_members m join public.classes c on c.id = m.class_id
   where m.user_id = p_uid and m.seat_state = 'active' and c.status = 'active';
  if v_mine >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many_classes');
  end if;

  select count(*) into v_active
    from public.class_members where class_id = v_class.id and seat_state = 'active';
  if v_active >= v_class.seats_purchased then
    -- The owner is emailed once (invite_full_notices_claim) — not per refusal.
    update public.classes set seats_full_at = coalesce(seats_full_at, now()) where id = v_class.id;
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  insert into public.class_members (class_id, user_id, joined_at, left_at, seat_state, age_bracket)
  values (v_class.id, p_uid, now(), null, 'active', p_age)
  on conflict (class_id, user_id) do update
    set joined_at = now(), left_at = null, seat_state = 'active', age_bracket = excluded.age_bracket;

  -- Whatever door they came in by, a pending email invite to THIS account's
  -- address for THIS class is done: reminders stop, the address is dropped.
  select public.invite_addr_hash(u.email) into v_hash from auth.users u where u.id = p_uid and u.email is not null;
  if v_hash is not null then
    for r in
      select id from public.class_invites
       where class_id = v_class.id and address_hash = v_hash and status = 'pending'
       for update
    loop
      update public.class_invites
         set status = 'joined', joined_at = now(), joined_user_id = p_uid, address = null,
             next_reminder_at = null, ended_reason = 'joined', updated_at = now()
       where id = r.id;
      perform public.invite_log(r.id, v_class.id, p_uid, 'joined');
    end loop;
  end if;

  perform public.group_sync_entitlement(p_uid);
  return jsonb_build_object('ok', true, 'class_id', v_class.id, 'name', v_class.name);
end;
$$;

-- Shared preamble: who, guest, rate limit, the age attestation.
-- Returns null when the caller may proceed, else the refusal.
create or replace function public.class_join_gate(p_uid uuid, p_age text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tries int;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'guest_account');
  end if;
  select count(*) into v_tries
    from public.class_join_attempts where user_id = p_uid and at > now() - interval '1 hour';
  if v_tries >= 20 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  -- DRAFT FOR COUNSEL (plan §5): 13+ only. The app asks a neutral birth
  -- month / year and sends only the bracket; under 13 is never sent (the app
  -- refuses on the device). Anything else is refused here.
  if p_age is null or p_age not in ('13_17', '18_plus') then
    return jsonb_build_object('ok', false, 'error', 'age_required');
  end if;
  return null;
end;
$$;

drop function if exists public.join_class(text);

create or replace function public.join_class(p_code text, p_age_bracket text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_code  text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_class uuid;
  v_gate  jsonb;
  v_res   jsonb;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  v_gate := public.class_join_gate(v_uid, p_age_bracket);
  if v_gate is not null then
    return v_gate;
  end if;
  -- Lock the class row so two joins cannot both take the last seat.
  select id into v_class from public.classes where join_code = v_code for update;
  if v_class is null then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  v_res := public.class_join_core(v_class, v_uid, p_age_bracket);
  insert into public.class_join_attempts (user_id, ok)
  values (v_uid, coalesce((v_res ->> 'ok')::boolean, false) or coalesce(v_res ->> 'error', '') = 'already_staff');
  return v_res;
end;
$$;

-- What the holder of an emailed link may know before joining: the class name,
-- the organisation and the teacher's name. Nothing for a bad token (and the
-- miss counts against the same hourly limit as a wrong code).
create or replace function public.class_invite_preview(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_tries int;
  v_inv   public.class_invites%rowtype;
  v_class public.classes%rowtype;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select count(*) into v_tries
    from public.class_join_attempts where user_id = v_uid and at > now() - interval '1 hour';
  if v_tries >= 20 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select i.* into v_inv
    from public.class_invite_tokens t join public.class_invites i on i.id = t.invite_id
   where t.token_hash = public.invite_token_hash(p_token) and t.purpose = 'join';
  if v_inv.id is null then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', case when v_inv.status = 'joined' then 'used' else 'expired' end);
  end if;
  select * into v_class from public.classes where id = v_inv.class_id;
  if v_class.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object(
    'ok', true, 'kind', v_class.kind, 'name', v_class.name,
    'org_name', (select o.name from public.churches o where o.id = v_class.org_id),
    'leader_name', (select p.display_name from public.class_staff s join public.profiles p on p.id = s.user_id
                     where s.class_id = v_class.id and s.role = 'owner' order by s.added_at limit 1));
end;
$$;

-- Single use: the invite becomes 'joined' and every token of it is dead.
create or replace function public.redeem_class_invite(p_token text, p_age_bracket text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_gate jsonb;
  v_inv  public.class_invites%rowtype;
  v_res  jsonb;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  v_gate := public.class_join_gate(v_uid, p_age_bracket);
  if v_gate is not null then
    return v_gate;
  end if;
  select i.* into v_inv
    from public.class_invite_tokens t join public.class_invites i on i.id = t.invite_id
   where t.token_hash = public.invite_token_hash(p_token) and t.purpose = 'join'
   for update of i;
  if v_inv.id is null then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', case when v_inv.status = 'joined' then 'used' else 'expired' end);
  end if;
  perform 1 from public.classes where id = v_inv.class_id for update;
  v_res := public.class_join_core(v_inv.class_id, v_uid, p_age_bracket);
  insert into public.class_join_attempts (user_id, ok) values (v_uid, coalesce((v_res ->> 'ok')::boolean, false));
  if coalesce((v_res ->> 'ok')::boolean, false) then
    -- join_core matched by account email; a link used from a DIFFERENT
    -- address still ends this invite (single use).
    update public.class_invites
       set status = 'joined', joined_at = coalesce(joined_at, now()), joined_user_id = coalesce(joined_user_id, v_uid),
           address = null, next_reminder_at = null, ended_reason = 'joined', updated_at = now()
     where id = v_inv.id and status = 'pending';
    if found then
      perform public.invite_log(v_inv.id, v_inv.class_id, v_uid, 'joined', jsonb_build_object('via', 'link'));
    end if;
    delete from public.class_invite_tokens where invite_id = v_inv.id and purpose = 'join';
  end if;
  return v_res;
end;
$$;


-- ============================================================================
-- 6. STAFF: create, list, revoke, resend
-- ============================================================================
create or replace function public.create_class_invites(p_class_id uuid, p_emails text[], p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_me        record;
  v_class     public.classes%rowtype;
  v_org       public.churches%rowtype;
  v_teacher   text;
  v_note      text := nullif(trim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]', ' ', 'g')), '');
  v_addrs     text[] := '{}';
  v_a         text;
  v_hash      text;
  v_results   jsonb := '[]'::jsonb;
  v_invited   int := 0;
  v_left_me   int;
  v_left_cls  int;
  v_left_seat int;
  v_left_org  int;
  v_existing  public.class_invites%rowtype;
  v_user      uuid;
  v_id        uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in: sign in first' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'guest_account: create a free account first' using errcode = '42501';
  end if;
  if not public.groups_enabled_for(v_uid) then
    raise exception 'groups_disabled: Capstone Plus for Groups is not available yet' using errcode = '42501';
  end if;
  if not public.is_class_staff(p_class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can invite people' using errcode = '42501';
  end if;
  select u.email, u.email_confirmed_at into v_me from auth.users u where u.id = v_uid;
  if v_me.email is null or v_me.email_confirmed_at is null then
    raise exception 'email_not_confirmed: confirm your own email address before you invite anyone' using errcode = '42501';
  end if;
  select * into v_class from public.classes where id = p_class_id for update;
  if v_class.status <> 'active' then
    raise exception 'class_not_active: invites open once the class is paid for and open' using errcode = '22023';
  end if;
  if v_class.ends_on is not null and now() >= public.class_end_ts(v_class.ends_on, v_class.time_zone) then
    raise exception 'class_ended: this class has ended' using errcode = '22023';
  end if;
  if public.invite_sender_paused(v_uid) then
    raise exception 'invites_paused: email invites are paused on your account while we look at a delivery problem. Contact admin@capstonebible.com' using errcode = '42501';
  end if;
  select * into v_org from public.churches where id = v_class.org_id;
  select p.display_name into v_teacher from public.profiles p where p.id = v_uid;
  if public.invite_text_has_link(v_class.name) or public.invite_text_has_link(v_org.name)
     or public.invite_text_has_link(v_teacher) then
    raise exception 'links_in_names: remove web or email addresses from the class name, organisation name and your display name to send email invites' using errcode = '22023';
  end if;
  if v_note is not null then
    if char_length(v_note) > 280 then
      raise exception 'note_too_long: the personal note can be up to 280 characters' using errcode = '22023';
    end if;
    if public.invite_text_has_link(v_note) then
      raise exception 'note_has_link: the personal note cannot contain a web or email address' using errcode = '22023';
    end if;
  end if;
  if p_emails is null or cardinality(p_emails) = 0 then
    raise exception 'no_addresses: add at least one email address' using errcode = '22023';
  end if;
  if cardinality(p_emails) > 200 then
    raise exception 'too_many_at_once: up to 50 addresses at a time' using errcode = '22023';
  end if;

  -- Normalise + de-duplicate, keeping the order typed.
  foreach v_a in array p_emails loop
    v_a := lower(trim(coalesce(v_a, '')));
    if v_a <> '' and not (v_a = any (v_addrs)) then
      v_addrs := v_addrs || v_a;
    end if;
  end loop;
  if cardinality(v_addrs) > 50 then
    raise exception 'too_many_at_once: up to 50 addresses at a time' using errcode = '22023';
  end if;

  -- What is left under each cap.
  v_left_me := 100 - (select count(*) from public.class_invite_events e
                       where e.actor = v_uid and e.event in ('created', 'reopened') and e.at > now() - interval '24 hours');
  v_left_cls := 50 - (select count(*) from public.class_invite_events e
                       where e.class_id = p_class_id and e.event in ('created', 'reopened') and e.at > now() - interval '24 hours');
  v_left_seat := 2 * v_class.seats_purchased
                 - (select count(*) from public.class_invites i where i.class_id = p_class_id and i.status = 'pending')
                 - (select count(*) from public.class_members m where m.class_id = p_class_id and m.seat_state = 'active');
  if coalesce(v_org.verification_state, 'unverified') = 'verified' then
    v_left_org := 2147483647;
  else
    v_left_org := 30 - (select count(*) from public.class_invite_events e
                          join public.classes c on c.id = e.class_id
                         where c.org_id = v_class.org_id and e.event in ('created', 'reopened'));
  end if;

  foreach v_a in array v_addrs loop
    if char_length(v_a) > 254 or v_a !~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then
      v_results := v_results || jsonb_build_object('email', left(v_a, 254), 'result', 'invalid');
      continue;
    end if;
    if v_a = lower(v_me.email) then
      v_results := v_results || jsonb_build_object('email', v_a, 'result', 'self');
      continue;
    end if;
    v_hash := public.invite_addr_hash(v_a);
    select u.id into v_user from auth.users u where lower(u.email) = v_a limit 1;
    if v_user is not null and (
         exists (select 1 from public.class_members m where m.class_id = p_class_id and m.user_id = v_user and m.seat_state = 'active')
      or exists (select 1 from public.class_staff s where s.class_id = p_class_id and s.user_id = v_user)) then
      v_results := v_results || jsonb_build_object('email', v_a, 'result', 'already_member');
      continue;
    end if;
    -- Suppressed (anyone's unsubscribe, a bounce, a complaint) or a block
    -- between the two accounts: refused WITHOUT saying which.
    if exists (select 1 from public.invite_suppressions s where s.address_hash = v_hash)
       or (v_user is not null and public.is_blocked_between(v_uid, v_user)) then
      v_results := v_results || jsonb_build_object('email', v_a, 'result', 'cannot_invite');
      continue;
    end if;
    select * into v_existing from public.class_invites where class_id = p_class_id and address_hash = v_hash for update;
    if v_existing.id is not null and v_existing.status = 'pending' then
      v_results := v_results || jsonb_build_object('email', v_a, 'result', 'already_invited');
      continue;
    end if;
    if v_existing.id is not null and v_existing.status in ('opted_out', 'bounced') then
      v_results := v_results || jsonb_build_object('email', v_a, 'result', 'cannot_invite');
      continue;
    end if;
    if v_left_me <= 0 or v_left_cls <= 0 or v_left_seat <= 0 or v_left_org <= 0 then
      v_results := v_results || jsonb_build_object('email', v_a, 'result', 'limit',
        'limit', case when v_left_org <= 0 then 'unverified_org' when v_left_seat <= 0 then 'seats'
                      when v_left_cls <= 0 then 'class_daily' else 'daily' end);
      continue;
    end if;

    if v_existing.id is not null then
      -- revoked / expired / joined-then-left: start over.
      update public.class_invites
         set status = 'pending', address = v_a, personal_note = v_note, sends = 0, reminders_sent = 0,
             sent_at = null, last_sent_at = null, send_failures = 0, revoked_at = null, joined_at = null,
             joined_user_id = null, ended_reason = null, next_reminder_at = now(),
             expires_at = now() + interval '45 days', invited_by = v_uid, updated_at = now()
       where id = v_existing.id;
      delete from public.class_invite_tokens where invite_id = v_existing.id;
      v_id := v_existing.id;
      perform public.invite_log(v_id, p_class_id, v_uid, 'reopened');
    else
      insert into public.class_invites (class_id, channel, address, address_hash, status, personal_note,
                                        next_reminder_at, expires_at, invited_by)
      values (p_class_id, 'email', v_a, v_hash, 'pending', v_note, now(), now() + interval '45 days', v_uid)
      returning id into v_id;
      perform public.invite_log(v_id, p_class_id, v_uid, 'created');
    end if;
    v_left_me := v_left_me - 1;
    v_left_cls := v_left_cls - 1;
    v_left_seat := v_left_seat - 1;
    v_left_org := v_left_org - 1;
    v_invited := v_invited + 1;
    v_results := v_results || jsonb_build_object('email', v_a, 'result', 'invited', 'invite_id', v_id);
  end loop;

  return jsonb_build_object('invited', v_invited, 'results', v_results,
                            'sending_enabled', public.app_setting_bool('invites.sending_enabled', false));
end;
$$;

-- The class's invites for its staff. The address is shown only while the
-- invite is pending (it is nulled after that).
create or replace function public.class_invite_list(p_class_id uuid)
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
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'invite_id', i.id, 'address', i.address, 'status', i.status, 'sends', i.sends,
             'last_sent_at', i.last_sent_at, 'next_send_at', case when i.status = 'pending' then i.next_reminder_at end,
             'created_at', i.created_at, 'expires_at', i.expires_at, 'joined_at', i.joined_at,
             'can_resend', i.status = 'pending' and i.sends between 1 and 5
                           and (i.last_sent_at is null or i.last_sent_at <= now() - interval '24 hours'))
           order by i.created_at desc)
      from public.class_invites i
     where i.class_id = p_class_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.revoke_class_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv public.class_invites%rowtype;
begin
  select * into v_inv from public.class_invites where id = p_invite_id for update;
  if v_inv.id is null or not public.is_class_staff(v_inv.class_id) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_inv.status = 'pending' then
    update public.class_invites
       set status = 'revoked', revoked_at = now(), address = null, next_reminder_at = null,
           ended_reason = 'revoked', updated_at = now()
     where id = p_invite_id;
    delete from public.class_invite_tokens where invite_id = p_invite_id and purpose = 'join';
    perform public.invite_log(p_invite_id, v_inv.class_id, auth.uid(), 'revoked');
  end if;
end;
$$;

-- "Send it again now": uses up one of the six emails; once per 24 hours.
create or replace function public.resend_class_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv public.class_invites%rowtype;
begin
  select * into v_inv from public.class_invites where id = p_invite_id for update;
  if v_inv.id is null or not public.is_class_staff(v_inv.class_id) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if public.invite_sender_paused(auth.uid()) then
    raise exception 'invites_paused: email invites are paused on your account' using errcode = '42501';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'not_pending: this invite is no longer open' using errcode = '22023';
  end if;
  if v_inv.sends >= 6 then
    raise exception 'send_limit: this address has had every email we will send it' using errcode = '22023';
  end if;
  if v_inv.sends = 0 then
    raise exception 'not_sent_yet: the first email has not gone out yet' using errcode = '22023';
  end if;
  if v_inv.last_sent_at > now() - interval '24 hours' then
    raise exception 'too_soon: you can resend once a day' using errcode = '22023';
  end if;
  update public.class_invites set next_reminder_at = now(), updated_at = now() where id = p_invite_id;
  perform public.invite_log(p_invite_id, v_inv.class_id, auth.uid(), 'resent');
end;
$$;


-- ============================================================================
-- 7. THE MAILER'S PATH (service role only). The Edge Function
--    group-invite-mailer runs on a schedule and calls these.
-- ============================================================================

-- Claims up to p_limit due emails, applying every stop rule first. Returns a
-- jsonb array, one object per email to send, carrying the RAW join and
-- unsubscribe tokens (stored here only as sha256). p_now is a parameter so
-- the tests can drive a fake clock; the mailer passes now().
create or replace function public.invite_claim_due(p_now timestamptz, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap    int := public.invite_setting_int('invites.daily_global_cap', 300);
  v_used   int;
  v_room   int;
  v_out    jsonb := '[]'::jsonb;
  r        record;
  v_send   bigint;
  v_join   text;
  v_unsub  text;
  v_seq    int;
  v_stop   text;
begin
  -- Housekeeping, whether or not sending is on.
  for r in select id, class_id, invited_by from public.class_invites
            where status = 'pending' and expires_at <= p_now for update skip locked loop
    update public.class_invites
       set status = 'expired', address = null, next_reminder_at = null, ended_reason = 'expired', updated_at = now()
     where id = r.id;
    perform public.invite_log(r.id, r.class_id, null, 'expired');
  end loop;
  update public.class_invite_sends set status = 'unknown'
   where status = 'claimed' and claimed_at < p_now - interval '15 minutes';

  if not public.app_setting_bool('invites.sending_enabled', false) then
    return v_out;
  end if;

  select count(*) into v_used from public.class_invite_sends
   where claimed_at > p_now - interval '24 hours' and status in ('claimed', 'sent', 'unknown');
  v_room := least(greatest(coalesce(p_limit, 0), 0), 100, greatest(v_cap - v_used, 0));
  if v_room <= 0 then
    return v_out;
  end if;

  for r in
    select i.*, c.kind as c_kind, c.name as c_name, c.status as c_status, c.ends_on as c_ends_on,
           c.time_zone as c_tz, c.seats_purchased as c_seats, c.org_id as c_org
      from public.class_invites i
      join public.classes c on c.id = i.class_id
     where i.status = 'pending'
       and i.next_reminder_at is not null
       and i.next_reminder_at <= p_now
     order by i.next_reminder_at, i.created_at
     for update of i skip locked
  loop
    exit when v_room <= 0;
    v_stop := null;
    if r.invited_by is null
       or not exists (select 1 from public.class_staff s where s.class_id = r.class_id and s.user_id = r.invited_by) then
      v_stop := 'inviter_gone';
    elsif r.c_status <> 'active'
       or (r.c_ends_on is not null and p_now >= public.class_end_ts(r.c_ends_on, r.c_tz)) then
      v_stop := 'class_closed';
    elsif r.sends >= 6 then
      v_stop := 'send_limit';
    end if;
    if v_stop is not null then
      update public.class_invites
         set status = 'expired', address = null, next_reminder_at = null, ended_reason = v_stop, updated_at = now()
       where id = r.id;
      perform public.invite_log(r.id, r.class_id, null, 'stopped', jsonb_build_object('reason', v_stop));
      continue;
    end if;
    if exists (select 1 from public.invite_suppressions s where s.address_hash = r.address_hash) then
      update public.class_invites
         set status = case when (select reason from public.invite_suppressions s where s.address_hash = r.address_hash) = 'bounce'
                           then 'bounced' else 'opted_out' end,
             address = null, next_reminder_at = null, ended_reason = 'suppressed', updated_at = now()
       where id = r.id;
      perform public.invite_log(r.id, r.class_id, null, 'stopped', jsonb_build_object('reason', 'suppressed'));
      continue;
    end if;
    -- Paused, not stopped: these resume on their own.
    continue when not public.groups_enabled_for(r.invited_by);
    continue when public.invite_sender_paused(r.invited_by);
    continue when (select count(*) from public.class_members m
                    where m.class_id = r.class_id and m.seat_state = 'active') >= r.c_seats;
    continue when extract(hour from (p_now at time zone r.c_tz)) not between 8 and 20;
    continue when r.address is null;

    v_seq := r.sends + 1;
    v_send := null;
    insert into public.class_invite_sends (invite_id, class_id, invited_by, seq, status, claimed_at)
    values (r.id, r.class_id, r.invited_by, v_seq, 'claimed', p_now)
    on conflict (invite_id, seq) do nothing
    returning id into v_send;
    if v_send is null then
      -- This slot was claimed before (a crash, a race): never send it twice.
      update public.class_invites
         set sends = v_seq, reminders_sent = greatest(v_seq - 1, 0),
             next_reminder_at = public.invite_next_due(coalesce(r.sent_at, p_now), v_seq, p_now), updated_at = now()
       where id = r.id;
      continue;
    end if;

    v_join := public.invite_new_token();
    v_unsub := public.invite_new_token();
    insert into public.class_invite_tokens (token_hash, invite_id, send_id, purpose)
    values (public.invite_token_hash(v_join), r.id, v_send, 'join'),
           (public.invite_token_hash(v_unsub), r.id, v_send, 'unsub');

    update public.class_invites
       set sends = v_seq, reminders_sent = v_seq - 1,
           sent_at = coalesce(sent_at, p_now), last_sent_at = p_now,
           next_reminder_at = public.invite_next_due(coalesce(r.sent_at, p_now), v_seq, p_now),
           updated_at = now()
     where id = r.id;

    v_out := v_out || jsonb_build_object(
      'send_id', v_send, 'invite_id', r.id, 'seq', v_seq,
      'stage', case when v_seq = 1 then 'invite' else 'reminder' end,
      'to', r.address, 'kind', r.c_kind, 'class_name', r.c_name,
      'org_name', (select o.name from public.churches o where o.id = r.c_org),
      'teacher_name', (select p.display_name from public.profiles p where p.id = r.invited_by),
      'personal_note', r.personal_note,
      'expires_at', r.expires_at,
      'join_token', v_join, 'unsub_token', v_unsub);
    v_room := v_room - 1;
  end loop;
  return v_out;
end;
$$;

create or replace function public.invite_mark_sent(p_send_id bigint, p_provider_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s public.class_invite_sends%rowtype;
begin
  update public.class_invite_sends
     set status = 'sent', provider_id = nullif(left(p_provider_id, 200), ''), sent_at = now()
   where id = p_send_id and status in ('claimed', 'unknown')
  returning * into v_s;
  if v_s.id is not null then
    update public.class_invites set send_failures = 0 where id = v_s.invite_id;
    perform public.invite_log(v_s.invite_id, v_s.class_id, null, 'sent', jsonb_build_object('seq', v_s.seq));
  end if;
end;
$$;

-- The provider DEFINITELY refused (a 4xx/5xx answer, not a timeout): release
-- the slot so a later run can try again; three failures in a row end it.
create or replace function public.invite_mark_failed(p_send_id bigint, p_error text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s   public.class_invite_sends%rowtype;
  v_inv public.class_invites%rowtype;
begin
  update public.class_invite_sends
     set status = 'failed', error = left(coalesce(p_error, 'failed'), 200)
   where id = p_send_id and status = 'claimed'
  returning * into v_s;
  if v_s.id is null then
    return;
  end if;
  delete from public.class_invite_tokens where send_id = v_s.id;
  -- free the (invite, seq) slot for the retry
  update public.class_invite_sends set invite_id = null where id = v_s.id;
  select * into v_inv from public.class_invites where id = v_s.invite_id for update;
  if v_inv.id is null or v_inv.status <> 'pending' then
    return;
  end if;
  if v_inv.send_failures + 1 >= 3 then
    update public.class_invites
       set status = 'expired', address = null, next_reminder_at = null, ended_reason = 'send_failed',
           send_failures = least(v_inv.send_failures + 1, 10), updated_at = now()
     where id = v_inv.id;
  else
    update public.class_invites
       set sends = greatest(v_inv.sends - 1, 0), reminders_sent = greatest(v_inv.sends - 2, 0),
           sent_at = case when v_inv.sends - 1 <= 0 then null else v_inv.sent_at end,
           send_failures = v_inv.send_failures + 1,
           next_reminder_at = now() + interval '1 hour', updated_at = now()
     where id = v_inv.id;
  end if;
  perform public.invite_log(v_inv.id, v_inv.class_id, null, 'failed', jsonb_build_object('seq', v_s.seq));
end;
$$;

-- The unsubscribe page / one-click POST. p_scope 'all' (default): this
-- address gets nothing from Capstone Bible invites again, for any class.
-- 'class': only this class's invite stops. Unknown tokens: ok=false, no hint.
create or replace function public.invite_unsubscribe(p_token text, p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv public.class_invites%rowtype;
begin
  select i.* into v_inv
    from public.class_invite_tokens t join public.class_invites i on i.id = t.invite_id
   where t.token_hash = public.invite_token_hash(p_token) and t.purpose = 'unsub';
  if v_inv.id is null then
    return jsonb_build_object('ok', false);
  end if;
  if coalesce(p_scope, 'all') = 'class' then
    update public.class_invites
       set status = 'opted_out', address = null, next_reminder_at = null, ended_reason = 'unsubscribed_class', updated_at = now()
     where id = v_inv.id and status = 'pending';
    perform public.invite_log(v_inv.id, v_inv.class_id, null, 'unsubscribed_class');
    return jsonb_build_object('ok', true, 'scope', 'class');
  end if;
  insert into public.invite_suppressions (address_hash, reason) values (v_inv.address_hash, 'unsubscribe')
  on conflict (address_hash) do nothing;
  perform public.invite_stop_address(v_inv.address_hash, 'opted_out', 'unsubscribed');
  -- the clicked invite itself, even if it was no longer pending
  perform public.invite_log(v_inv.id, v_inv.class_id, null, 'unsubscribed', jsonb_build_object('scope', 'all'));
  return jsonb_build_object('ok', true, 'scope', 'all');
end;
$$;

-- Bounce / complaint webhook (after its signature is verified). Idempotent on
-- the provider's event id. Matched by OUR send's provider message id only.
create or replace function public.invite_provider_event(p_event_id text, p_kind text, p_provider_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s    public.class_invite_sends%rowtype;
  v_hash text;
  v_n    int;
begin
  if p_event_id is null or p_kind not in ('bounce', 'complaint') then
    return jsonb_build_object('outcome', 'ignored');
  end if;
  insert into public.email_provider_events (event_id, kind, provider_id, outcome)
  values (left(p_event_id, 200), p_kind, left(p_provider_id, 200), 'applying')
  on conflict (event_id) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('outcome', 'duplicate');
  end if;
  select * into v_s from public.class_invite_sends where provider_id = p_provider_id;
  if v_s.id is null then
    update public.email_provider_events set outcome = 'unknown_message' where event_id = left(p_event_id, 200);
    return jsonb_build_object('outcome', 'unknown_message');
  end if;
  select i.address_hash into v_hash from public.class_invites i where i.id = v_s.invite_id;
  if v_hash is not null then
    insert into public.invite_suppressions (address_hash, reason)
    values (v_hash, case when p_kind = 'bounce' then 'bounce' else 'complaint' end)
    on conflict (address_hash) do nothing;
    perform public.invite_stop_address(v_hash, case when p_kind = 'bounce' then 'bounced' else 'opted_out' end,
                                       case when p_kind = 'bounce' then 'bounced' else 'complained' end);
  end if;
  -- Counted against the INVITER whether or not the invite was still pending:
  -- this is what invite_sender_paused() reads.
  perform public.invite_log(v_s.invite_id, v_s.class_id, v_s.invited_by,
                            case when p_kind = 'bounce' then 'bounced' else 'complained' end,
                            jsonb_build_object('send_id', v_s.id));
  update public.email_provider_events set outcome = 'applied' where event_id = left(p_event_id, 200);
  return jsonb_build_object('outcome', 'applied');
end;
$$;

-- "Your class is full" — to the class OWNER, once per filling. Returns the
-- owner's account email (a service message to the paying customer).
create or replace function public.invite_full_notices_claim(p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_out jsonb := '[]'::jsonb;
  r     record;
begin
  if not public.app_setting_bool('invites.sending_enabled', false) then
    return v_out;
  end if;
  for r in
    select c.id, c.kind, c.name, c.seats_purchased,
           (select u.email from public.class_staff s join auth.users u on u.id = s.user_id
             where s.class_id = c.id and s.role = 'owner' and u.email_confirmed_at is not null
             order by s.added_at limit 1) as owner_email
      from public.classes c
     where c.seats_full_at is not null and c.seats_full_emailed_at is null and c.status = 'active'
     for update of c skip locked
  loop
    update public.classes set seats_full_emailed_at = p_now where id = r.id;
    continue when r.owner_email is null;
    perform public.invite_log(null, r.id, null, 'full_notice');
    v_out := v_out || jsonb_build_object('class_id', r.id, 'kind', r.kind, 'class_name', r.name,
                                         'seats', r.seats_purchased, 'to', r.owner_email);
  end loop;
  return v_out;
end;
$$;

-- Seats added (the webhook raises seats_purchased): the next refusal may
-- email the owner again.
create or replace function public.classes_seats_full_reset()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.seats_purchased > old.seats_purchased then
    new.seats_full_at := null;
    new.seats_full_emailed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists classes_seats_full_reset_trg on public.classes;
create trigger classes_seats_full_reset_trg
  before update of seats_purchased on public.classes
  for each row execute function public.classes_seats_full_reset();


-- ============================================================================
-- 8. FUNCTION GRANTS — revoke all, then grant.
-- ============================================================================
revoke all on function public.invite_addr_hash(text)                    from public, anon, authenticated;
revoke all on function public.invite_token_hash(text)                   from public, anon, authenticated;
revoke all on function public.invite_new_token()                        from public, anon, authenticated;
revoke all on function public.invite_text_has_link(text)                from public, anon, authenticated;
revoke all on function public.invite_setting_int(text, integer)         from public, anon, authenticated;
revoke all on function public.invite_sender_paused(uuid)                from public, anon, authenticated;
revoke all on function public.invite_reminder_offsets()                 from public, anon, authenticated;
revoke all on function public.invite_next_due(timestamptz, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.invite_log(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.invite_stop_address(text, text, text)     from public, anon, authenticated;
revoke all on function public.class_join_core(uuid, uuid, text)         from public, anon, authenticated;
revoke all on function public.class_join_gate(uuid, text)               from public, anon, authenticated;
revoke all on function public.join_class(text, text)                    from public, anon, authenticated;
revoke all on function public.class_invite_preview(text)                from public, anon, authenticated;
revoke all on function public.redeem_class_invite(text, text)           from public, anon, authenticated;
revoke all on function public.create_class_invites(uuid, text[], text)  from public, anon, authenticated;
revoke all on function public.class_invite_list(uuid)                   from public, anon, authenticated;
revoke all on function public.revoke_class_invite(uuid)                 from public, anon, authenticated;
revoke all on function public.resend_class_invite(uuid)                 from public, anon, authenticated;
revoke all on function public.invite_claim_due(timestamptz, integer)    from public, anon, authenticated;
revoke all on function public.invite_mark_sent(bigint, text)            from public, anon, authenticated;
revoke all on function public.invite_mark_failed(bigint, text)          from public, anon, authenticated;
revoke all on function public.invite_unsubscribe(text, text)            from public, anon, authenticated;
revoke all on function public.invite_provider_event(text, text, text)   from public, anon, authenticated;
revoke all on function public.invite_full_notices_claim(timestamptz)    from public, anon, authenticated;
revoke all on function public.classes_seats_full_reset()                from public, anon, authenticated;

-- Client RPCs (each re-checks the caller).
grant execute on function public.join_class(text, text)                   to authenticated;
grant execute on function public.class_invite_preview(text)               to authenticated;
grant execute on function public.redeem_class_invite(text, text)          to authenticated;
grant execute on function public.create_class_invites(uuid, text[], text) to authenticated;
grant execute on function public.class_invite_list(uuid)                  to authenticated;
grant execute on function public.revoke_class_invite(uuid)                to authenticated;
grant execute on function public.resend_class_invite(uuid)                to authenticated;
-- The mailer, the unsubscribe handler and the provider webhook.
grant execute on function public.invite_claim_due(timestamptz, integer)   to service_role;
grant execute on function public.invite_mark_sent(bigint, text)           to service_role;
grant execute on function public.invite_mark_failed(bigint, text)         to service_role;
grant execute on function public.invite_unsubscribe(text, text)           to service_role;
grant execute on function public.invite_provider_event(text, text, text)  to service_role;
grant execute on function public.invite_full_notices_claim(timestamptz)   to service_role;

commit;

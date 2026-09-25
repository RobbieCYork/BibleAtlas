-- ============================================================================
-- USER MODERATION — blocking, reporting, filtering
--
-- Not auto-applied by anything in this repo (there is no migrations tooling
-- here yet) — run this once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/028_moderation.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
-- ----------------------------------------------------------------------------
-- App Store Review Guideline 1.2 requires four things of any app that carries
-- user-generated content, and this app carries posts, comments, direct
-- messages, group messages and profiles:
--
--   1. A method for filtering objectionable material.
--   2. A mechanism to report offensive content, with timely responses.
--   3. The ability to block abusive users.
--   4. Published contact information so users can reach the developer.
--
-- Guideline 1.1.5 additionally bans inflammatory religious commentary. For a
-- Bible study app the likeliest source of that is a user's own post, not
-- anything the publisher wrote — so the report path below covers posts,
-- comments, notes, direct messages, group messages and profiles, not just
-- posts, and the reason taxonomy names it explicitly.
--
-- This migration owns (1) partially, (2) and (3). (4) is app code and static
-- HTML — see AuthGate.tsx, AuthButton.tsx and scripts/seo/render.mjs.
--
-- ----------------------------------------------------------------------------
-- WHY BLOCKING IS ENFORCED WITH *RESTRICTIVE* POLICIES
-- ----------------------------------------------------------------------------
-- A client-side filter is not a block. Anyone can open the network tab, read
-- the anon key out of the bundle and re-issue the same PostgREST query without
-- the filter. So the block has to live in RLS.
--
-- But most of the tables it has to cover were NOT created by anything in this
-- repo. `profiles`, `notes`, `note_comments`, `messages`, `group_messages` and
-- `friend_requests` were all created in the Supabase dashboard; sql/ has no
-- DDL for them, and this migration was written without a database connection
-- to introspect. Rewriting policies whose text we cannot see would be a way to
-- silently widen access.
--
-- A RESTRICTIVE policy is exactly the tool for that. Postgres ANDs every
-- restrictive policy onto the OR of the permissive ones:
--
--     (permissive_1 OR permissive_2 OR ...) AND restrictive_1 AND restrictive_2
--
-- so a restrictive policy can only ever REMOVE rows. It composes with policies
-- this file has never read, it cannot grant anything, and if a future migration
-- adds another permissive policy to `posts`, the block still holds — which is
-- not true of the alternative (editing each existing policy to bolt an
-- `and not blocked(...)` onto the end, and hoping nobody adds a fifth one).
--
-- ----------------------------------------------------------------------------
-- WHY THERE IS NO 42P17 HERE
-- ----------------------------------------------------------------------------
-- This project has hit infinite-recursion-in-policy before (sql/003, sql/012).
-- The shape that causes it is a policy on table A whose expression reads table
-- B, whose policy reads table A.
--
-- Every restrictive policy below calls exactly one function,
-- is_blocked_between(), which reads exactly one table, `user_blocks`. That
-- function is SECURITY DEFINER, so it runs as its owner and RLS on user_blocks
-- is not applied inside it at all — there is no second policy evaluation to
-- recurse into. And user_blocks' own policies reference nothing but auth.uid().
-- The dependency graph is a two-node line with no cycle in it, by construction.
--
-- The same reasoning is why is_blocked_between() is STABLE and takes plain
-- uuids rather than reading auth.uid() itself: the planner can hoist it, and a
-- policy on `messages` can ask about a pair neither of whom is the caller
-- (which the INSERT policy has to).
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE DELIBERATELY DOES NOT DO
-- ----------------------------------------------------------------------------
--   * No account suspension or ban. Disabling an account is an auth.users
--     operation and needs the service_role key, which does not exist in a
--     client bundle for the reason lib/adminApi.ts spells out. An administrator
--     can take content down and record the decision; suspending the human
--     behind it is still an out-of-band action in the Supabase dashboard.
--   * No automated text filter. A word list that fires on "hell", "damn",
--     "ass" and "bastard" would flag Scripture itself several times a chapter.
--     The filtering this migration provides is the reader's (block, hide) and
--     the administrator's (take down), not a regex's.
--   * No appeal workflow. A takedown is recorded in moderation_actions with
--     the actor and the reason, so there is something to appeal *from*; the
--     appeal itself is an email to the published address.
-- ============================================================================

create extension if not exists pgcrypto;


-- ============================================================================
-- 0. PRE-FLIGHT — fail loudly, and once, on a schema that isn't what we think
-- ============================================================================
-- Six of the eight tables this migration attaches policies to have no DDL in
-- this repo (see the header). If one of them is named differently, or its
-- owner column is not what the client code implies, we want ONE clear error
-- naming every mismatch — not the eleventh `create policy` in the file dying
-- with "column posts.user_id does not exist" after ten others have committed.
--
-- Explicitly NOT a "skip what's missing" guard. A restrictive policy that
-- silently did not get created is a block that silently does not work, which
-- is the worst possible failure mode for this particular feature.
do $$
declare
  v_missing text[] := '{}';
  v_pair    text;
  v_tbl     text;
  v_col     text;
begin
  foreach v_pair in array array[
    'posts:user_id',
    'post_comments:author_id',
    'notes:user_id',
    'notes:is_public',
    'note_comments:author_id',
    'messages:sender_id',
    'messages:receiver_id',
    'group_messages:sender_id',
    'profiles:id',
    'friend_requests:sender_id',
    'friend_requests:receiver_id'
  ] loop
    v_tbl := split_part(v_pair, ':', 1);
    v_col := split_part(v_pair, ':', 2);
    if to_regclass('public.' || v_tbl) is null then
      v_missing := v_missing || (v_tbl || ' (table does not exist)');
    elsif not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = v_tbl and column_name = v_col
    ) then
      v_missing := v_missing || (v_tbl || '.' || v_col || ' (column does not exist)');
    end if;
  end loop;

  -- sql/025 must already be applied: every staff-side policy and function below
  -- gates on its has_role_at_least(). Checked here so the failure is one clear
  -- sentence rather than "function has_role_at_least(unknown) does not exist"
  -- from the middle of a create policy.
  if to_regprocedure('public.has_role_at_least(text, uuid)') is null then
    v_missing := v_missing || 'has_role_at_least() (run sql/025_roles_and_reports.sql first)';
  end if;

  if array_length(v_missing, 1) is not null then
    raise exception
      'sql/028 pre-flight failed — this database does not have what the block policies need: %. Nothing has been changed. Fix the names in this file to match the real schema and re-run; do NOT delete the failing policies, a block that is missing on one table is a block that does not work.',
      array_to_string(v_missing, ', ')
      using errcode = '42703';
  end if;
end;
$$;


-- ============================================================================
-- 1. BLOCKING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- user_blocks — one row per (blocker, blocked) direction.
--
-- Stored one-directional, ENFORCED symmetrically. Both halves matter:
--   * one row means unblocking is a delete of the row you created, and two
--     people can block each other without the second block being a no-op that
--     vanishes when the first is lifted;
--   * symmetric enforcement means blocking someone also stops them reaching
--     you, which is the entire point. A block that only hid their posts from
--     you would leave them free to keep commenting at you.
-- ----------------------------------------------------------------------------
create table if not exists user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  reason     text check (reason is null or length(reason) <= 500),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

-- The primary key already indexes (blocker_id, blocked_id). is_blocked_between()
-- probes both directions, so the reverse lookup needs its own index or every
-- policy evaluation on a large table is a sequential scan of this one.
create index if not exists user_blocks_blocked_idx on user_blocks (blocked_id, blocker_id);

alter table user_blocks enable row level security;

-- READ YOUR OWN BLOCKS ONLY — and "own" means the ones you created.
--
-- Deliberately NOT `or blocked_id = auth.uid()`. A block is silent: the blocked
-- account is never told, because telling them converts "I quietly stopped
-- seeing this person" into a notification that provokes the next account. If
-- they could select their own blocked_id rows they could enumerate exactly who
-- had blocked them, which is the same thing with extra steps.
drop policy if exists user_blocks_select_own on user_blocks;
create policy user_blocks_select_own on user_blocks
  for select using (blocker_id = auth.uid());

-- Insert and delete go through block_user()/unblock_user() below, but the
-- policies exist so the RPCs are a convenience rather than the only door — and
-- so that a direct insert from a client cannot forge a block on someone else's
-- behalf.
drop policy if exists user_blocks_insert_own on user_blocks;
create policy user_blocks_insert_own on user_blocks
  for insert with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

drop policy if exists user_blocks_delete_own on user_blocks;
create policy user_blocks_delete_own on user_blocks
  for delete using (blocker_id = auth.uid());

-- No UPDATE policy. A block has nothing to amend: change your mind and delete it.

grant select, insert, delete on user_blocks to authenticated;


-- ----------------------------------------------------------------------------
-- is_blocked_between() — the single predicate every restrictive policy uses.
--
-- SECURITY DEFINER / STABLE / pinned search_path, for the three reasons sql/019
-- and sql/025 both gave: the caller must not need SELECT on the other party's
-- user_blocks rows, the planner should hoist it, and nobody should be able to
-- shadow `user_blocks` with a temp table of their own.
--
-- NULL-SAFE ON PURPOSE. auth.uid() is NULL for the `anon` role and inside a
-- service-role connection. `not is_blocked_between(null, x)` must be TRUE, or
-- every restrictive policy below would deny the entire table to signed-out
-- readers and quietly break the pre-rendered public pages' data source. A NULL
-- party cannot have blocked anyone, so returning false is also just correct.
-- ----------------------------------------------------------------------------
create or replace function is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
           when p_a is null or p_b is null or p_a = p_b then false
           else exists (
             select 1 from user_blocks b
             where (b.blocker_id = p_a and b.blocked_id = p_b)
                or (b.blocker_id = p_b and b.blocked_id = p_a)
           )
         end;
$$;

comment on function is_blocked_between(uuid, uuid) is
  'True when either party has blocked the other. Symmetric. NULL-safe (a NULL party is never blocked). Used by every restrictive block policy in sql/028.';

-- Granted to `anon` as well as `authenticated`, and that is not an oversight:
-- every restrictive policy below calls it, and the pre-rendered public pages and
-- any signed-out read would be denied outright by a policy whose predicate the
-- role cannot execute. It answers `false` for a NULL caller, which is both safe
-- and correct — see the header.
--
-- No one-argument auth.uid() wrapper. There was one; nothing called it, and an
-- unused SECURITY DEFINER function with a grant on it is a liability rather than
-- a convenience. Callers that want "me and them" pass auth.uid() themselves.
grant execute on function is_blocked_between(uuid, uuid) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- THE RESTRICTIVE POLICIES.
--
-- Read each as "and, additionally, not between blocked parties". None of them
-- can widen anything; see the header.
--
-- Note what is NOT restricted, and why:
--   * UPDATE and DELETE of your OWN rows. is_blocked_between(x, x) is false by
--     construction, so an author is never filtered out of their own content —
--     blocking someone cannot strand your own posts.
--   * group_messages INSERT. A group is many-to-many; refusing the insert
--     because one of eleven members has a block would silence a person for the
--     whole room. The SELECT policy hides the sender's messages from the person
--     who blocked them, and leaves the group working for everyone else.
--   * `groups` and `group_members` themselves. Membership is not content, and
--     hiding a member row would make the group's own member list lie about its
--     size. What a blocked member SAYS is hidden; that they exist is not.
-- ----------------------------------------------------------------------------

-- posts ----------------------------------------------------------------------
drop policy if exists posts_block_filter on posts;
create policy posts_block_filter on posts
  as restrictive for select
  using (not is_blocked_between(auth.uid(), user_id));

-- post_comments --------------------------------------------------------------
drop policy if exists post_comments_block_filter on post_comments;
create policy post_comments_block_filter on post_comments
  as restrictive for select
  using (not is_blocked_between(auth.uid(), author_id));

-- ----------------------------------------------------------------------------
-- "The blocked account must not be able to comment at them" — and the FIRST
-- attempt at this was a policy that did nothing. It is worth writing down why,
-- because it is not obvious and it looked right.
--
-- The obvious shape is:
--     with check (not exists (select 1 from posts p
--                             where p.id = post_comments.post_id
--                               and is_blocked_between(auth.uid(), p.user_id)))
--
-- POSTGRES APPLIES RLS TO TABLES REFERENCED INSIDE A POLICY EXPRESSION. That is
-- not a footnote — it is the documented behaviour, it is the mechanism behind
-- 42P17, and it is exactly why sql/025 says of its own policy: "has_role_at_least()
-- is SECURITY DEFINER; that is what stops this policy from recursing into itself."
--
-- So in that subquery, `posts` is filtered by posts_block_filter — and the row we
-- are asking about is precisely the row that filter removes. The subquery finds
-- nothing, `not exists` is TRUE, and the policy permits the very insert it was
-- written to refuse. A restrictive policy that always passes.
--
-- The fix is a lookup that RLS does not touch. unfiltered_content_owner() is
-- SECURITY DEFINER for that one reason.
--
-- NOTE THAT THIS IS THE OPPOSITE CHOICE FROM moderation_target_owner(), which is
-- SECURITY INVOKER *so that* RLS applies. The two functions look alike and mean
-- opposite things:
--     unfiltered_content_owner()  — "who really owns this", for a policy that
--                                   must see past the reader's own filters.
--     moderation_target_owner()   — "who owns this AS FAR AS YOU CAN SEE", for a
--                                   report that must not be filable blind.
-- Using either in the other's place is a silent bug, in opposite directions.
-- ----------------------------------------------------------------------------
create or replace function unfiltered_content_owner(p_kind text, p_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
begin
  if p_id is null then
    return null;
  end if;
  case p_kind
    when 'post' then select p.user_id into v_owner from posts p where p.id = p_id;
    when 'note' then select n.user_id into v_owner from notes n where n.id = p_id;
    else return null;
  end case;
  return v_owner;
end;
$$;

comment on function unfiltered_content_owner(text, uuid) is
  'Who owns a post or note, bypassing RLS. Exists so a policy can ask about a row the caller cannot see. NOT interchangeable with moderation_target_owner() — see sql/028.';

-- Has to be executable by `authenticated`: a policy expression runs with the
-- privileges of the user whose statement triggered it, so a function it calls
-- that the role cannot execute turns the policy into a permission error rather
-- than a check. The disclosure is one uuid (an owner) in exchange for another
-- uuid you already had (the post), and post ids only ever reach clients that
-- were authorised to read them.
grant execute on function unfiltered_content_owner(text, uuid) to authenticated;

drop policy if exists post_comments_block_insert on post_comments;
create policy post_comments_block_insert on post_comments
  as restrictive for insert
  with check (not is_blocked_between(auth.uid(), unfiltered_content_owner('post', post_id)));

-- notes / note_comments ------------------------------------------------------
-- Public notes (verse commentary) render in the same feeds as posts and are
-- commented on the same way, so they are the same surface and get the same
-- treatment. Private notes are already invisible to everyone but their author.
drop policy if exists notes_block_filter on notes;
create policy notes_block_filter on notes
  as restrictive for select
  using (not is_blocked_between(auth.uid(), user_id));

drop policy if exists note_comments_block_filter on note_comments;
create policy note_comments_block_filter on note_comments
  as restrictive for select
  using (not is_blocked_between(auth.uid(), author_id));

drop policy if exists note_comments_block_insert on note_comments;
create policy note_comments_block_insert on note_comments
  as restrictive for insert
  with check (not is_blocked_between(auth.uid(), unfiltered_content_owner('note', note_id)));

-- messages (direct) ----------------------------------------------------------
-- Both directions on SELECT, because a DM has two owners and either of them
-- blocking makes the whole thread unreachable for both. Existing history
-- disappears rather than being deleted: unblocking restores it, and nothing a
-- moderator might need is destroyed by a block.
drop policy if exists messages_block_filter on messages;
create policy messages_block_filter on messages
  as restrictive for select
  using (
    not is_blocked_between(auth.uid(), sender_id)
    and not is_blocked_between(auth.uid(), receiver_id)
  );

-- The hard one, and the requirement's own words: the blocked account must not
-- be able to DM at them. Written on the ROW's two parties rather than on
-- auth.uid(), so it holds whichever of the two is inserting.
drop policy if exists messages_block_insert on messages;
create policy messages_block_insert on messages
  as restrictive for insert
  with check (not is_blocked_between(sender_id, receiver_id));

-- group_messages -------------------------------------------------------------
drop policy if exists group_messages_block_filter on group_messages;
create policy group_messages_block_filter on group_messages
  as restrictive for select
  using (not is_blocked_between(auth.uid(), sender_id));

-- profiles -------------------------------------------------------------------
-- The widest one. This is what makes a block feel like a block rather than a
-- mute: the account stops existing in people search, in friend suggestions, on
-- its own profile page, and as the resolvable author of anything.
--
-- The cost, stated plainly because it is visible: a blocked account that is in
-- a group with you still has messages in the room's history (older than the
-- block, hidden by the policy above) and a member row (not hidden, see the
-- note at the top of this section) whose profile no longer resolves. The
-- member list renders that person as "Someone". That is the correct trade —
-- the alternative is a member list that under-counts the room.
drop policy if exists profiles_block_filter on profiles;
create policy profiles_block_filter on profiles
  as restrictive for select
  using (not is_blocked_between(auth.uid(), id));

-- friend_requests ------------------------------------------------------------
-- A blocked account must not be able to send a friend request, and a pending
-- request from before the block must stop being actionable.
drop policy if exists friend_requests_block_filter on friend_requests;
create policy friend_requests_block_filter on friend_requests
  as restrictive for select
  using (
    not is_blocked_between(auth.uid(), sender_id)
    and not is_blocked_between(auth.uid(), receiver_id)
  );

drop policy if exists friend_requests_block_insert on friend_requests;
create policy friend_requests_block_insert on friend_requests
  as restrictive for insert
  with check (not is_blocked_between(sender_id, receiver_id));


-- ----------------------------------------------------------------------------
-- block_user() — block, and clean up the relationship the block contradicts.
--
-- SECURITY DEFINER, and narrowly so: every statement in it is constrained to
-- rows where auth.uid() is one of the two parties. It cannot be talked into
-- touching a pair the caller is not half of.
--
-- WHY IT DELETES THE FRIENDSHIP. Posts and notes are friend-gated (sql/008).
-- Leaving an accepted friend_requests row in place after a block would mean
-- the two accounts are still, in the schema's opinion, friends — visible to
-- each other in friend lists, counted in friend counts, and re-linked the
-- instant the block is lifted. Every platform that has shipped this feature
-- unfriends on block for the same reason. It is destructive and it does not
-- come back on unblock; the UI says so before the button is pressed.
-- ----------------------------------------------------------------------------
create or replace function block_user(p_user_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'block_target_missing: no account was named' using errcode = '22023';
  end if;
  if p_user_id = v_me then
    raise exception 'self_block: you cannot block your own account' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'block_target_missing: that account no longer exists' using errcode = '22023';
  end if;

  insert into user_blocks (blocker_id, blocked_id, reason)
  values (v_me, p_user_id, nullif(btrim(coalesce(p_reason, '')), ''))
  on conflict (blocker_id, blocked_id) do nothing;

  delete from friend_requests fr
  where (fr.sender_id = v_me and fr.receiver_id = p_user_id)
     or (fr.sender_id = p_user_id and fr.receiver_id = v_me);
end;
$$;

create or replace function unblock_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  delete from user_blocks b where b.blocker_id = v_me and b.blocked_id = p_user_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- list_my_blocks() — the "Blocked accounts" screen.
--
-- HAS to be SECURITY DEFINER, and the reason is the feature working correctly:
-- profiles_block_filter hides a blocked account's profile row from the person
-- who blocked it, so a plain join from user_blocks to profiles returns a list
-- of uuids with no names attached. Reading past the policy here discloses
-- nothing — every name returned belongs to somebody this caller blocked by
-- name, on purpose, themselves.
--
-- Returns display_name only. Not email: the blocked account's address is not
-- something the block screen needs, and an unblock list is a poor place to
-- start leaking addresses.
-- ----------------------------------------------------------------------------
create or replace function list_my_blocks()
returns table (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  blocked_at   timestamptz,
  reason       text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.blocked_id,
         p.display_name,
         p.avatar_url,
         b.created_at,
         b.reason
  from user_blocks b
  left join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

grant execute on function block_user(uuid, text) to authenticated;
grant execute on function unblock_user(uuid)     to authenticated;
grant execute on function list_my_blocks()       to authenticated;


-- ----------------------------------------------------------------------------
-- THE HOLE RESTRICTIVE POLICIES CANNOT REACH: SECURITY DEFINER FUNCTIONS.
--
-- A restrictive policy filters a table. It does NOT filter a SECURITY DEFINER
-- function that reads that table, because such a function runs as its owner and
-- RLS is not applied to it at all — that is the entire point of the mechanism,
-- and it is what is_blocked_between() itself relies on.
--
-- This app has several. list_my_groups() (sql/014) is the one that leaks actual
-- CONTENT: it returns each room's most recent message body as the preview shown
-- in the groups list, so without this, a blocked member's words keep arriving in
-- the blocker's group list every time they open it — the exact thing the block
-- was for. So it is redefined here.
--
-- WHAT THIS REPLACEMENT IS. sql/014's body, verbatim, plus a `not
-- is_blocked_between(...)` in two places: the lateral that picks the last
-- message, and the unread count. Nothing else about it changes — same
-- signature, same RETURNS TABLE, same joins, same ordering. If sql/014 is ever
-- edited again, this copy has to move with it; it is here rather than there
-- because sql/ is append-only and 014 has already been applied to production.
--
-- WHAT IS STILL OPEN, and it is not fixable from this file:
--   find_users_by_display_name(), find_user_by_contact() and
--   find_user_id_by_email() were created in the Supabase dashboard. This repo
--   has no DDL for them, so this migration cannot safely redefine them — the
--   text would be a guess. They are almost certainly SECURITY DEFINER (they
--   search accounts the caller has no read on), which means PEOPLE SEARCH CAN
--   STILL RETURN A BLOCKED ACCOUNT'S DISPLAY NAME. Tapping through gets nowhere
--   — profiles_block_filter hides the row, so the profile page does not load
--   and no content is reachable — but the name appears in a result list, and it
--   should not. Fixing it is a one-line addition to each of those three
--   functions, in the dashboard, by whoever owns them:
--
--       and not is_blocked_between(auth.uid(), <the row's user id>)
-- ----------------------------------------------------------------------------
create or replace function list_my_groups()
returns table (
  group_id uuid,
  name text,
  description text,
  is_public boolean,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  unread_count integer,
  my_role text
)
language sql
stable
security definer
as $$
  select
    g.id,
    g.name,
    g.description,
    g.is_public,
    lm.body,
    lm.created_at,
    lm.sender_id,
    coalesce((
      select count(*)::integer from group_messages m2
      where m2.group_id = g.id
        and m2.sender_id <> auth.uid()
        and not is_blocked_between(auth.uid(), m2.sender_id)
        and m2.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    ), 0),
    gm.role
  from groups g
  join group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  left join group_message_reads r on r.group_id = g.id and r.user_id = auth.uid()
  left join lateral (
    select body, created_at, sender_id from group_messages m
    where m.group_id = g.id
      and not is_blocked_between(auth.uid(), m.sender_id)
    order by created_at desc
    limit 1
  ) lm on true;
$$;

grant execute on function list_my_groups() to authenticated;


-- ============================================================================
-- 2. FILTERING — per-reader hiding
-- ============================================================================
-- The lighter half of Guideline 1.2's "method for filtering objectionable
-- material": one item, hidden for one reader, without blocking its author or
-- accusing anyone of anything. Most of what a person wants gone is a single
-- post, not a person.
--
-- DELIBERATELY NOT AN RLS FILTER, unlike blocking. Two reasons, and the
-- difference between them is the whole design:
--   * A hide is a preference, not a boundary. Nobody is harmed if a determined
--     reader curls past their own hide list.
--   * Making it a boundary would cost a restrictive policy with a second
--     lookup on EVERY row of posts, notes and both comment tables, for every
--     reader, forever — to enforce something the reader chose and can undo.
-- Blocking earns that cost because it protects someone from someone else.
-- Hiding does not, and the client filters it in the feed.
create table if not exists content_hides (
  user_id     uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'post_comment', 'note', 'note_comment')),
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_kind, target_id)
);

alter table content_hides enable row level security;

drop policy if exists content_hides_all_own on content_hides;
create policy content_hides_all_own on content_hides
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on content_hides to authenticated;


-- ============================================================================
-- 3. REPORTING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- WHY THIS IS NOT sql/025's `reports` TABLE.
--
-- sql/025 built an ISSUE TRACKER: bug / typo / theological / idea, with advisor
-- voting, a priority score computed from weighted votes, duplicate merging and
-- a public-facing "My Reports" screen where the reporter watches their item
-- move through triage. Every one of those is wrong for an abuse report:
--
--   * Voting. "Do three advisors agree this counts as harassment" is not how a
--     safety queue works, and the person waiting on it is not waiting on a
--     quorum.
--   * Reporter visibility. A reporter watching their harassment report sit in
--     "Triaged" for a week is a worse experience than not showing it at all,
--     and the outcome usually cannot be disclosed anyway.
--   * Content. An abuse report carries a verbatim excerpt of somebody's direct
--     message. `reports` is readable by advisors when a single app_settings
--     flag is flipped; DMs must not be one boolean away from a wider audience.
--
-- So: a separate table, a separate taxonomy, administrator-only reads, and the
-- SAME PATTERNS — has_role_at_least() as the one predicate, SECURITY DEFINER
-- RPCs that raise instead of returning an empty array, prefixed error messages
-- the client translates, and an append-only audit table. sql/025 is the model,
-- not the storage.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- moderation_reasons — the taxonomy, as DATA.
--
-- A table and not a check constraint, for the reason sql/025 gives for
-- report_categories: an administrator can retire or add a reason without a
-- migration, and a hardcoded client list would be wrong the moment they did.
-- ----------------------------------------------------------------------------
create table if not exists moderation_reasons (
  key         text primary key,
  label       text not null,
  description text,
  sort_order  integer not null default 100,
  is_active   boolean not null default true
);

alter table moderation_reasons enable row level security;

drop policy if exists moderation_reasons_select_all on moderation_reasons;
create policy moderation_reasons_select_all on moderation_reasons
  for select using (true);

grant select on moderation_reasons to anon, authenticated;

-- Seeded, not upserted over: an administrator's edit to a label should survive
-- a re-run of this file.
insert into moderation_reasons (key, label, description, sort_order) values
  ('harassment',     'Harassment or bullying',        'Targeted abuse, insults, or repeated unwanted contact aimed at a person.', 10),
  ('hate',           'Hate speech',                   'Attacks a person or group over race, ethnicity, national origin, religion, disability, sex, gender or sexual orientation.', 20),
  ('inflammatory',   'Inflammatory religious content','Written to provoke or demean people of another faith or tradition, rather than to disagree with what they believe.', 30),
  ('threat',         'Violence or threats',           'Threatens harm to a person, or encourages someone else to carry it out.', 40),
  ('self_harm',      'Self-harm or suicide',          'Suggests the person may be at risk, or encourages self-harm in others.', 50),
  ('sexual',         'Sexual or adult content',       'Sexually explicit material, or sexual content involving anyone under 18.', 60),
  ('child_safety',   'Child safety',                  'Content that sexualises, endangers or exploits a minor. Reported here AND to the authorities.', 70),
  ('spam',           'Spam or scam',                  'Advertising, repeated unsolicited posting, phishing, or a request for money.', 80),
  ('impersonation',  'Impersonation',                 'Pretending to be another person, a church, or Capstone Bible itself.', 90),
  ('illegal',        'Illegal content',               'Content that is unlawful, or that solicits something unlawful.', 100),
  ('other',          'Something else',                'Anything the reasons above do not cover. Describe it below.', 999)
on conflict (key) do nothing;


-- ----------------------------------------------------------------------------
-- moderation_reports
--
-- `target_owner_id` is resolved SERVER-SIDE at submit time and never accepted
-- from the client — see moderation_report_submit(). A reporter who could name
-- the account a report is filed against could file one against anybody.
--
-- `content_excerpt` IS taken from the client, on purpose, and the difference
-- matters: the excerpt is a snapshot of what the reporter was looking at when
-- they pressed the button, which is exactly the thing that would otherwise be
-- gone by the time an administrator opens the queue (the author can edit or
-- delete it in the meantime). It is evidence of what was seen, not a
-- server-verified copy, and the queue labels it as such.
--
-- No foreign key from target_id to anything. It points at six different tables
-- depending on target_kind, and — more importantly — a report must OUTLIVE the
-- content it is about. A cascade would delete the record of a takedown at the
-- moment the takedown happened.
-- ----------------------------------------------------------------------------
create table if not exists moderation_reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references auth.users(id) on delete cascade,
  target_kind     text not null check (target_kind in ('post', 'post_comment', 'note', 'note_comment', 'message', 'group_message', 'profile')),
  target_id       uuid not null,
  target_owner_id uuid,
  reason          text not null references moderation_reasons(key),
  details         text check (details is null or length(details) <= 4000),
  content_excerpt text check (content_excerpt is null or length(content_excerpt) <= 1000),
  context_label   text check (context_label is null or length(context_label) <= 200),

  status          text not null default 'new'
                    check (status in ('new', 'reviewing', 'actioned', 'dismissed')),
  action_taken    text check (action_taken is null or action_taken in ('none', 'content_removed', 'note_unpublished', 'user_warned', 'referred')),
  resolution_note text check (resolution_note is null or length(resolution_note) <= 2000),
  handled_by      uuid references auth.users(id) on delete set null,
  handled_at      timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- THE PER-TARGET UNIQUENESS GUARD. One account gets one report per piece of
  -- content — filing again is a no-op with a clear message, not a second row.
  -- Without it, a "Report" button plus a stuck finger is a queue-flooding tool,
  -- and a brigade of ten accounts reporting the same post ten times each looks
  -- like a hundred complaints instead of ten.
  constraint moderation_reports_one_per_target unique (reporter_id, target_kind, target_id),
  constraint moderation_reports_not_self check (target_owner_id is null or target_owner_id <> reporter_id)
);

create index if not exists moderation_reports_status_idx  on moderation_reports (status, created_at desc);
create index if not exists moderation_reports_open_idx    on moderation_reports (created_at desc) where status in ('new', 'reviewing');
create index if not exists moderation_reports_target_idx  on moderation_reports (target_kind, target_id);
create index if not exists moderation_reports_owner_idx   on moderation_reports (target_owner_id, created_at desc);
create index if not exists moderation_reports_reporter_idx on moderation_reports (reporter_id, created_at desc);

alter table moderation_reports enable row level security;

-- ----------------------------------------------------------------------------
-- RLS on moderation_reports: administrators read, nobody else reads ANYTHING.
--
-- Not even your own. This is the one place this file departs from sql/025,
-- which lets a reporter read their own rows back — and the departure is
-- deliberate. A moderation report's own row contains target_owner_id, which
-- sql/025-style self-access would turn into an oracle: report a post, read
-- back which account owns it. More simply, there is nothing on the row a
-- reporter needs; the client already knows what it just sent, and the
-- acknowledgement it shows is generated from that, not fetched.
--
-- INSERT is a policy, and it is the real boundary of this whole section — it
-- is written a few dozen lines down, next to the function that explains it,
-- because the two only make sense read together.
-- ----------------------------------------------------------------------------
drop policy if exists moderation_reports_select_admin on moderation_reports;
create policy moderation_reports_select_admin on moderation_reports
  for select using (has_role_at_least('administrator'));

-- No UPDATE or DELETE policies at all. RLS denies by default, so the only way
-- a report's status ever changes is moderation_resolve(), and the only way one
-- is ever removed is the reporter's account being deleted (ON DELETE CASCADE).
-- A reporter cannot withdraw an abuse report: the content was still seen, and
-- a queue an angry party can empty is not a queue.


-- ----------------------------------------------------------------------------
-- SUBMITTING A REPORT — where the boundary actually is.
--
-- The submit path needs two things the client must not be trusted to supply:
-- who owns the reported content, and confirmation that the reporter could
-- actually see it. Without the second, a script with a uuid can probe whether
-- any object exists and file reports against content it has no access to.
-- Without the first, anyone can file a report against anybody.
--
-- The tempting shape is a SECURITY DEFINER function containing a hand-written
-- copy of each table's visibility rule. That is four re-implementations of
-- sql/008's friend-gate and the dashboard's message rules, in a second place,
-- which drift the first time anyone edits a policy — and every drift is either
-- a leak or a feature that quietly stops working.
--
-- So the lookup is SECURITY INVOKER and the boundary is an RLS policy:
--
--   * moderation_target_owner() runs AS THE CALLER. Its per-kind SELECT is
--     subject to the caller's own policies, including the block filters added
--     above. A row the reporter cannot see comes back NULL, and NULL is the
--     refusal. The visibility rule stays in exactly one place — the policy
--     that already governs that table.
--
--   * moderation_reports' INSERT policy calls that same function and demands
--     the row's target_owner_id EQUAL its answer. A policy expression is
--     evaluated with the caller's RLS applied to every table it touches, so
--     the anti-forgery check and the visibility check are the same check.
--     There is no way to insert a row naming an owner the caller cannot
--     independently resolve — whether the insert comes from the function
--     below, from PostgREST directly, or from curl.
--
-- moderation_report_submit() is therefore a FRIENDLY FRONT DOOR, not the gate:
-- it validates the reason, raises prefixed messages a human can read, and
-- rate-limits. Deleting it would not weaken anything.
--
-- ONE CONSEQUENCE WORTH KNOWING, because it decides the order of two buttons
-- in the UI: blocking someone hides their content from you, and hidden content
-- cannot be resolved, so you cannot report it afterwards. Every surface that
-- offers both therefore reports first and blocks second, and "Block" on its own
-- says so.
-- ----------------------------------------------------------------------------
create or replace function moderation_target_owner(p_target_kind text, p_target_id uuid)
returns uuid
language plpgsql
stable
-- SECURITY INVOKER, deliberately, and load-bearing: the ABSENCE of a
-- `security definer` line here is the whole design. See the header above.
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
begin
  if p_target_id is null then
    return null;
  end if;
  case p_target_kind
    when 'post'          then select p.user_id   into v_owner from posts p          where p.id = p_target_id;
    when 'post_comment'  then select c.author_id into v_owner from post_comments c   where c.id = p_target_id;
    when 'note'          then select n.user_id   into v_owner from notes n           where n.id = p_target_id;
    when 'note_comment'  then select c.author_id into v_owner from note_comments c   where c.id = p_target_id;
    when 'message'       then select m.sender_id into v_owner from messages m        where m.id = p_target_id;
    when 'group_message' then select m.sender_id into v_owner from group_messages m  where m.id = p_target_id;
    when 'profile'       then select pr.id       into v_owner from profiles pr       where pr.id = p_target_id;
    else return null;
  end case;
  return v_owner;
end;
$$;

comment on function moderation_target_owner(text, uuid) is
  'Who owns a reportable object, AS SEEN BY THE CALLER. SECURITY INVOKER on purpose: RLS applies, so content the caller cannot see resolves to NULL. Used by moderation_reports INSERT policy as both the anti-forgery and the visibility check.';

grant execute on function moderation_target_owner(text, uuid) to authenticated;

-- THE INSERT POLICY. Every clause is doing work:
--   reporter_id       — you file as yourself.
--   target_owner_id   — must match what YOUR OWN read of the content says, so
--                       it can be neither forged nor filed blind.
--   status / handled  — server-owned fields, pinned to their initial values, so
--                       a direct PostgREST insert cannot arrive pre-resolved
--                       and skip the queue entirely.
drop policy if exists moderation_reports_insert_own on moderation_reports;
create policy moderation_reports_insert_own on moderation_reports
  for insert with check (
    reporter_id = auth.uid()
    and target_owner_id is not null
    and target_owner_id = moderation_target_owner(target_kind, target_id)
    and status = 'new'
    and action_taken is null
    and resolution_note is null
    and handled_by is null
    and handled_at is null
  );

-- INSERT only, and no SELECT — which also means no `insert ... returning`
-- anywhere below, because RETURNING needs a SELECT privilege this role does not
-- have. The reporter reads nothing back; see the RLS note above for why a
-- moderation report is not a "My Reports" row.
grant insert on moderation_reports to authenticated;

-- ----------------------------------------------------------------------------
-- The rate limiter HAS to be SECURITY DEFINER, and the reason is exactly the
-- trap reportsApi.ts's header describes from the other side. A reporter has no
-- select privilege on moderation_reports, so `select count(*) ... where
-- reporter_id = me` inside a SECURITY INVOKER function returns 0 — forever,
-- silently, for everyone. The limit would look implemented and never fire once.
--
-- It discloses only how many reports you yourself filed in the last hour.
-- ----------------------------------------------------------------------------
create or replace function moderation_recent_report_count()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from moderation_reports
  where reporter_id = auth.uid()
    and created_at > now() - interval '1 hour';
$$;

grant execute on function moderation_recent_report_count() to authenticated;


create or replace function moderation_report_submit(
  p_target_kind text,
  p_target_id   uuid,
  p_reason      text,
  p_details     text default null,
  p_excerpt     text default null,
  p_context     text default null
)
returns void
language plpgsql
-- SECURITY INVOKER, deliberately. The insert below goes through the policy
-- above, as the caller. See the header.
set search_path = public, pg_temp
as $$
declare
  v_me    uuid := auth.uid();
  v_owner uuid;
begin
  if v_me is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_target_id is null then
    raise exception 'report_target_missing: nothing was named to report' using errcode = '22023';
  end if;
  if p_target_kind is null or p_target_kind not in
     ('post', 'post_comment', 'note', 'note_comment', 'message', 'group_message', 'profile') then
    raise exception 'report_target_invalid: "%" is not something this app can report',
      coalesce(p_target_kind, 'null') using errcode = '22023';
  end if;
  if not exists (select 1 from moderation_reasons r where r.key = p_reason and r.is_active) then
    raise exception 'report_reason_invalid: "%" is not a reason this app offers',
      coalesce(p_reason, 'null') using errcode = '22023';
  end if;

  v_owner := moderation_target_owner(p_target_kind, p_target_id);

  if v_owner is null then
    -- Covers all three of: it never existed, it has been deleted, and you
    -- cannot see it. Deliberately ONE message — telling a caller which of the
    -- three it was is the probe this check exists to close.
    raise exception 'report_target_missing: that content is no longer there, or you can no longer see it'
      using errcode = '22023';
  end if;

  if v_owner = v_me then
    raise exception 'self_report: that is your own content — delete it instead of reporting it'
      using errcode = '22023';
  end if;

  -- Generous on purpose: someone working through a night of abuse from one
  -- account must not hit it, and the per-target unique constraint already stops
  -- the common accidental double-send. This catches a script.
  if moderation_recent_report_count() >= 30 then
    raise exception 'rate_limited: too many reports in the last hour' using errcode = '54000';
  end if;

  begin
    insert into moderation_reports
      (reporter_id, target_kind, target_id, target_owner_id, reason, details, content_excerpt, context_label)
    values
      (v_me,
       p_target_kind,
       p_target_id,
       v_owner,
       p_reason,
       nullif(btrim(coalesce(p_details, '')), ''),
       left(nullif(btrim(coalesce(p_excerpt, '')), ''), 1000),
       left(nullif(btrim(coalesce(p_context, '')), ''), 200));
  exception when unique_violation then
    raise exception 'duplicate_report: you have already reported this' using errcode = '23505';
  end;
end;
$$;

grant execute on function moderation_report_submit(text, uuid, text, text, text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- moderation_actions — append-only record of what staff did and why.
--
-- No foreign key to auth.users on report_id's target, and none from actor_id
-- with a cascade, for the reason sql/025 gives for role_audit: an audit row
-- must outlive the thing it describes.
-- ----------------------------------------------------------------------------
create table if not exists moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid,
  actor_id     uuid,
  actor_name   text,
  target_kind  text,
  target_id    uuid,
  target_owner_id uuid,
  action       text not null,
  old_status   text,
  new_status   text,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists moderation_actions_report_idx on moderation_actions (report_id, created_at desc);
create index if not exists moderation_actions_created_idx on moderation_actions (created_at desc);

alter table moderation_actions enable row level security;

drop policy if exists moderation_actions_select_admin on moderation_actions;
create policy moderation_actions_select_admin on moderation_actions
  for select using (has_role_at_least('administrator'));

-- No write policies — moderation_resolve() is the only writer.


-- ============================================================================
-- 4. THE ADMIN QUEUE
-- ============================================================================
-- Administrator, not advisor. sql/025 opened its queue to advisors because a
-- typo report is not private; these rows carry verbatim excerpts of direct
-- messages between two people who did not consent to a third reader. The tier
-- that sees them is the tier that already has the Admin Console.
--
-- Every function here is SECURITY DEFINER and RAISES on refusal rather than
-- returning nothing, for the reason reportsApi.ts's header spells out at
-- length: PostgREST answers a select you are not permitted to see with an empty
-- array, and an empty array renders as "no reports" on a queue with a hundred
-- rows in it.

create or replace function moderation_queue(
  p_status text[] default null,
  p_reason text   default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id              uuid,
  created_at      timestamptz,
  updated_at      timestamptz,
  target_kind     text,
  target_id       uuid,
  target_owner_id uuid,
  target_owner_name text,
  reason          text,
  reason_label    text,
  details         text,
  content_excerpt text,
  context_label   text,
  status          text,
  action_taken    text,
  resolution_note text,
  handled_by      uuid,
  handled_at      timestamptz,
  reporter_id     uuid,
  reporter_name   text,
  target_still_exists boolean,
  reports_against_owner bigint,
  total_count     bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  with filtered as (
    select mr.*
    from moderation_reports mr
    where (p_status is null or mr.status = any (p_status))
      and (p_reason is null or mr.reason = p_reason)
  ),
  counted as (select count(*) as n from filtered)
  select
    f.id,
    f.created_at,
    f.updated_at,
    f.target_kind,
    f.target_id,
    f.target_owner_id,
    owner_p.display_name,
    f.reason,
    r.label,
    f.details,
    f.content_excerpt,
    f.context_label,
    f.status,
    f.action_taken,
    f.resolution_note,
    f.handled_by,
    f.handled_at,
    f.reporter_id,
    rep_p.display_name,
    -- Whether the reported thing is still there. An administrator opening a
    -- three-day-old report needs to know at a glance whether the author already
    -- deleted it, which is far and away the most common resolution.
    case f.target_kind
      when 'post'          then exists (select 1 from posts x          where x.id = f.target_id)
      when 'post_comment'  then exists (select 1 from post_comments x  where x.id = f.target_id)
      when 'note'          then exists (select 1 from notes x          where x.id = f.target_id)
      when 'note_comment'  then exists (select 1 from note_comments x  where x.id = f.target_id)
      when 'message'       then exists (select 1 from messages x       where x.id = f.target_id)
      when 'group_message' then exists (select 1 from group_messages x where x.id = f.target_id)
      when 'profile'       then exists (select 1 from profiles x       where x.id = f.target_id)
      else null
    end,
    -- How many reports this account has attracted in total, across all its
    -- content. One report is an incident; eleven is a pattern, and the queue
    -- should not make an administrator go and count them.
    (select count(*) from moderation_reports o where o.target_owner_id = f.target_owner_id),
    counted.n
  from filtered f
  cross join counted
  left join profiles owner_p on owner_p.id = f.target_owner_id
  left join profiles rep_p   on rep_p.id   = f.reporter_id
  order by
    -- Open work first, then oldest-first inside it: an abuse queue is worked
    -- from the bottom of the pile, not the top. sql/025 sorts by a computed
    -- priority; there is no vote here to compute one from, and "how long has
    -- this person been waiting" is the honest proxy.
    case f.status when 'new' then 0 when 'reviewing' then 1 else 2 end,
    case when f.status in ('new', 'reviewing') then f.created_at end asc nulls last,
    f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;


create or replace function moderation_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'new',       count(*) filter (where status = 'new'),
    'reviewing', count(*) filter (where status = 'reviewing'),
    'actioned',  count(*) filter (where status = 'actioned'),
    'dismissed', count(*) filter (where status = 'dismissed'),
    'open',      count(*) filter (where status in ('new', 'reviewing')),
    'last_24h',  count(*) filter (where created_at > now() - interval '24 hours'),
    'blocks',    (select count(*) from user_blocks)
  ) into v_result
  from moderation_reports;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;


-- ----------------------------------------------------------------------------
-- moderation_resolve() — the one write an administrator makes.
--
-- Status and action in a single call, because they are one decision. Taking
-- content down and leaving the report open is a half-finished action that the
-- queue would then show forever.
--
-- The takedown itself:
--   post / post_comment / note_comment / message / group_message → deleted.
--   note → is_public = false, NOT deleted. A note is somebody's own study
--     writing against a verse; the offence is that it was published, and
--     unpublishing it ends the offence without destroying their work. This is
--     the same distinction MyNotesPanel already draws between "make private"
--     and "delete".
--   profile → nothing is deleted. There is no mechanism in this app to suspend
--     an account (it needs the service_role key — see lib/adminApi.ts's
--     ADMIN_ACTIONS_NOT_BUILT), so a profile report resolves to a recorded
--     decision and an out-of-band action in the Supabase dashboard. The
--     function says so rather than pretending, and refuses 'content_removed'
--     for a profile instead of silently doing nothing.
-- ----------------------------------------------------------------------------
create or replace function moderation_resolve(
  p_report_id uuid,
  p_status    text,
  p_action    text default 'none',
  p_note      text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me      uuid := auth.uid();
  v_actor   text;
  v_report  moderation_reports;
  v_action  text := coalesce(nullif(btrim(coalesce(p_action, '')), ''), 'none');
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('new', 'reviewing', 'actioned', 'dismissed') then
    raise exception 'invalid_status: "%" is not a status a report can be in', p_status using errcode = '22023';
  end if;
  if v_action not in ('none', 'content_removed', 'note_unpublished', 'user_warned', 'referred') then
    raise exception 'invalid_action: "%" is not an action this console can take', v_action using errcode = '22023';
  end if;

  select * into v_report from moderation_reports where id = p_report_id;
  if v_report.id is null then
    raise exception 'report_missing: that report is not there' using errcode = '22023';
  end if;

  if v_action = 'content_removed' then
    if v_report.target_kind = 'profile' then
      raise exception 'no_takedown_for_profile: a profile cannot be removed from here — record the decision and act in the Supabase dashboard' using errcode = '22023';
    elsif v_report.target_kind = 'note' then
      raise exception 'use_note_unpublished: a note is unpublished, not deleted — choose that action instead' using errcode = '22023';
    end if;

    case v_report.target_kind
      when 'post'          then delete from posts          where id = v_report.target_id;
      when 'post_comment'  then delete from post_comments  where id = v_report.target_id;
      when 'note_comment'  then delete from note_comments  where id = v_report.target_id;
      when 'message'       then delete from messages       where id = v_report.target_id;
      when 'group_message' then delete from group_messages where id = v_report.target_id;
      else null;
    end case;
  elsif v_action = 'note_unpublished' then
    if v_report.target_kind <> 'note' then
      raise exception 'invalid_action: only a note can be unpublished' using errcode = '22023';
    end if;
    update notes set is_public = false where id = v_report.target_id;
  end if;

  -- Names the actor in the audit row at the time of the action, rather than
  -- joining to profiles when the log is read: an audit entry has to keep making
  -- sense after the account that made it is renamed or deleted.
  select p.display_name into v_actor from profiles p where p.id = v_me;
  v_actor := coalesce(v_actor, 'administrator');

  update moderation_reports
     set status          = p_status,
         action_taken    = v_action,
         resolution_note = nullif(btrim(coalesce(p_note, '')), ''),
         handled_by      = v_me,
         handled_at      = case when p_status in ('actioned', 'dismissed') then now() else handled_at end,
         updated_at      = now()
   where id = p_report_id;

  insert into moderation_actions
    (report_id, actor_id, actor_name, target_kind, target_id, target_owner_id, action, old_status, new_status, note)
  values
    (p_report_id, v_me, v_actor, v_report.target_kind, v_report.target_id, v_report.target_owner_id,
     v_action, v_report.status, p_status, nullif(btrim(coalesce(p_note, '')), ''));
end;
$$;


-- ----------------------------------------------------------------------------
-- moderation_history() — the audit trail for one account's content, so an
-- administrator looking at the eleventh report against someone can see the
-- previous ten decisions instead of re-deciding from scratch.
-- ----------------------------------------------------------------------------
create or replace function moderation_history(p_owner_id uuid)
returns table (
  at          timestamptz,
  actor_name  text,
  target_kind text,
  action      text,
  new_status  text,
  note        text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not has_role_at_least('administrator') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select a.created_at, a.actor_name, a.target_kind, a.action, a.new_status, a.note
    from moderation_actions a
    where a.target_owner_id = p_owner_id
    order by a.created_at desc
    limit 100;
end;
$$;

grant execute on function moderation_queue(text[], text, integer, integer) to authenticated;
grant execute on function moderation_counts()                              to authenticated;
grant execute on function moderation_resolve(uuid, text, text, text)       to authenticated;
grant execute on function moderation_history(uuid)                         to authenticated;


-- ============================================================================
-- 5. VERIFYING IT
-- ============================================================================
-- Run as two ordinary signed-in accounts, A and B, who are accepted friends
-- with public posts and a DM thread. As A:
--
--   select block_user('<B>');
--   select count(*) from posts   where user_id = '<B>';  -- 0
--   select count(*) from profiles where id     = '<B>';  -- 0
--   select count(*) from messages where sender_id = '<B>' or receiver_id = '<B>'; -- 0
--   select * from list_my_blocks();                      -- one row, B, by name
--
-- Then as B, whose session knows nothing about the block:
--
--   insert into messages (sender_id, receiver_id, body) values ('<B>', '<A>', 'hi');
--     -- ERROR: new row violates row-level security policy for table "messages"
--   select count(*) from posts where user_id = '<A>';    -- 0
--   select count(*) from user_blocks;                    -- 0, B cannot see the block
--
-- And back as A:
--
--   select unblock_user('<B>');
--   select count(*) from messages where sender_id = '<B>' or receiver_id = '<B>';
--     -- the old thread is back; nothing was destroyed
--   select count(*) from friend_requests where sender_id in ('<A>','<B>');
--     -- 0. The friendship is NOT restored. That is documented and intended.
-- ============================================================================

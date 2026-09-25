-- ============================================================================
-- PEOPLE SEARCH MUST RESPECT A BLOCK — the hole sql/028 named and could not reach.
--
-- Run once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/032_search_respects_blocks.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- REQUIRES sql/028_moderation.sql to be applied first: is_blocked_between()
-- comes from there. There is a guard below that says so in one sentence rather
-- than letting the first CREATE die with "function does not exist".
--
-- ----------------------------------------------------------------------------
-- WHY THIS FILE EXISTS AND sql/028 DID NOT DO IT
-- ----------------------------------------------------------------------------
-- sql/028 enforces blocking with RESTRICTIVE policies, which filter TABLES. A
-- SECURITY DEFINER function that reads a table is not filtered by them at all —
-- it runs as its owner and RLS is not applied inside it. That is the mechanism
-- is_blocked_between() itself depends on, and it is also the hole.
--
-- Three such functions search accounts:
--
--     find_users_by_display_name(text)  -> table(id, display_name, avatar_url)
--     find_user_by_contact(text)        -> uuid
--     find_user_id_by_email(text)       -> uuid
--
-- All three were created in the Supabase dashboard and had no source anywhere
-- in this repo, which is exactly why sql/028 refused to touch them: rewriting a
-- function whose text you cannot read is how a security migration silently
-- widens access. So the text below was NOT guessed. Each body here is the live
-- definition read out of the catalog on 2026-09-10 with pg_get_functiondef(),
-- reproduced verbatim, plus one predicate. This file is now their source.
--
-- ----------------------------------------------------------------------------
-- WHAT CHANGES — one line each, and nothing else
-- ----------------------------------------------------------------------------
--     and not is_blocked_between(auth.uid(), <that row's user id>)
--
-- Signature, return type, language, volatility, search_path setting and the
-- SECURITY DEFINER property are all preserved exactly as found. In particular:
--   * find_users_by_display_name is left VOLATILE, as it is in production,
--     even though it reads like a STABLE function. Changing volatility changes
--     how the planner may cache it, and that is not what this file is for.
--   * find_user_by_contact and find_user_id_by_email have NO `set search_path`
--     in production. That is a real hazard and it is left exactly as found —
--     see the note at the bottom. Widening the diff of a security fix is how a
--     review stops being a review.
--
-- ----------------------------------------------------------------------------
-- WHY THE PREDICATE IS SAFE FOR SIGNED-OUT CALLERS
-- ----------------------------------------------------------------------------
-- All three are executable by `anon`. auth.uid() is NULL there, and
-- is_blocked_between() is NULL-safe by construction (sql/028): a NULL party has
-- blocked nobody, so it returns false and `not false` is true. Signed-out
-- behaviour is therefore byte-for-byte what it was.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES NOT FIX
-- ----------------------------------------------------------------------------
-- It removes the blocked account from a result list. It does not remove the
-- blocked account from a group's member list, a leaderboard, or a URL somebody
-- already holds — sql/028's own closing notes say so, and those are separate
-- decisions rather than oversights.
-- ============================================================================

do $$
begin
  if to_regprocedure('public.is_blocked_between(uuid, uuid)') is null then
    raise exception
      'sql/032 needs sql/028_moderation.sql applied first — is_blocked_between() does not exist. Nothing has been changed.'
      using errcode = '42883';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- find_users_by_display_name() — the people-search box.
--
-- This is the one that actually leaked something a person would notice: a
-- blocked account kept appearing in the search results of the person who
-- blocked it, name and avatar and all. Tapping the row got nowhere, because
-- profiles_block_filter hides the profile row itself, but the name was there.
--
-- Live definition as of 2026-09-10, plus the last line of the WHERE clause.
-- ----------------------------------------------------------------------------
create or replace function public.find_users_by_display_name(query text)
returns table(id uuid, display_name text, avatar_url text)
language sql
security definer
set search_path to 'public'
as $function$
  select id, display_name, avatar_url
  from profiles
  where discoverable_by_name = true
    and display_name is not null
    and display_name ilike '%' || query || '%'
    and id <> auth.uid()
    and not is_blocked_between(auth.uid(), id)
  order by display_name
  limit 20;
$function$;


-- ----------------------------------------------------------------------------
-- find_user_by_contact() — "add a friend by their email address or phone".
--
-- Returns one uuid, not a name, so what leaked here is smaller: it confirms
-- that an address belongs to an account. It still has to respect the block —
-- the uuid is what the add-friend flow then acts on, and a blocked account
-- must not be reachable by typing its address instead of its name.
--
-- Live definition as of 2026-09-10, plus the `and not ...`.
-- ----------------------------------------------------------------------------
create or replace function public.find_user_by_contact(query text)
returns uuid
language sql
stable
security definer
as $function$
  select id from public.profiles
  where (email = lower(query) or (phone is not null and phone = query))
    and not public.is_blocked_between(auth.uid(), id)
  limit 1;
$function$;


-- ----------------------------------------------------------------------------
-- find_user_id_by_email() — the same thing, email only.
--
-- Note the parenthesisation added to find_user_by_contact above: its original
-- WHERE was `email = ... or (phone ...)`, and `a or b and c` binds AND tighter
-- than OR, so appending the new predicate without brackets would have applied
-- it to the phone branch only. This one has no OR and needs no brackets.
--
-- Live definition as of 2026-09-10, plus the `and not ...`.
-- ----------------------------------------------------------------------------
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language sql
stable
security definer
as $function$
  select id from public.profiles
  where email = lower(lookup_email)
    and not public.is_blocked_between(auth.uid(), id)
  limit 1;
$function$;


-- ----------------------------------------------------------------------------
-- FLAGGED, NOT FIXED — deliberately outside this file's diff.
--
-- find_user_by_contact() and find_user_id_by_email() are SECURITY DEFINER with
-- NO pinned search_path. Both are left that way here because this file's whole
-- claim is "one predicate, nothing else", and because the exposure is not new:
-- their existing `public.profiles` reference is already schema-qualified, and
-- the new call is written `public.is_blocked_between(...)` for the same reason,
-- so this change adds no unqualified name that a caller could shadow. Pinning
-- `set search_path = public, pg_temp` on both is still worth doing, and it
-- wants its own file and its own reading — the way sql/031 flagged
-- avatars_own_update's missing `with check` rather than folding it in.
-- ----------------------------------------------------------------------------

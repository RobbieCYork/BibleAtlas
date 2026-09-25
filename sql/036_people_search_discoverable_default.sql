-- ============================================================================
-- PEOPLE SEARCH — make new accounts discoverable, and stop the search box from
-- being an enumeration tool.
--
-- Run once, by hand:
--   psql "$SUPABASE_DB_URL" -f sql/036_people_search_discoverable_default.sql
-- or paste it into the Supabase project's SQL Editor.
--
-- REQUIRES sql/028 (is_blocked_between) and sql/032 (which is this function's
-- source of record). Both are APPLIED on production as of 2026-09-11.
--
-- ----------------------------------------------------------------------------
-- WHAT ALREADY WORKED, AND IS NOT TOUCHED HERE
-- ----------------------------------------------------------------------------
-- The people search itself already exists end to end and has shipped:
--   * find_users_by_display_name(text) -> (id, display_name, avatar_url) —
--     partial, case-insensitive, excludes the caller, honours
--     profiles.discoverable_by_name, honours blocks in both directions
--     (sql/032), ordered, capped at 20.
--   * PeopleSearchBar.tsx (My Profile header) and FriendsPanel's "add by name"
--     both call it. Results show name + photo and tap through to a profile.
--   * MyProfileView's editor already carries the opt-out checkbox:
--     "Let people find me by searching my name (email and phone always work)".
--
-- Three things were genuinely wrong. This file fixes all three and nothing
-- else. In particular it does NOT touch find_user_by_contact() or
-- find_user_id_by_email() — exact-address lookup is a different feature, the
-- opt-out's own copy promises it keeps working, and narrowing it is a product
-- decision for Robbie, not a side effect of this migration.
--
-- ----------------------------------------------------------------------------
-- FIX 1 — the column default was false, so nobody new was findable
-- ----------------------------------------------------------------------------
-- handle_new_user() inserts (id, email, display_name) and never names this
-- column, so the column default alone decides what a new account gets. It was
-- `false`, which is why 62 of 63 profiles are not discoverable: almost nobody
-- ever found the checkbox. Facebook-style search means the default is in, with
-- a visible way out.
--
-- ALTER COLUMN SET DEFAULT rewrites no rows and takes only a brief catalog
-- lock. EXISTING ROWS ARE DELIBERATELY NOT CHANGED. The 62 people who signed
-- up under a system that did not list them keep exactly what they have until
-- Robbie says otherwise. When and if he does, it is the one line at the bottom
-- of this file — nothing here makes that awkward.
--
-- ----------------------------------------------------------------------------
-- FIX 2 — `%` in the query matched every discoverable account
-- ----------------------------------------------------------------------------
-- This is the enumeration hole, and it was live. The query text was pasted
-- straight into a LIKE pattern:
--
--     display_name ilike '%' || query || '%'
--
-- so a query of `%%` (two characters — it passes the client's own 2-character
-- minimum) became the pattern `%%%%`, which matches every discoverable name in
-- the table, twenty at a time. `_` is the same bug one notch quieter: `__`
-- matched every two-character name. LIKE metacharacters are now escaped and
-- the pattern carries an explicit ESCAPE clause, so `%` searches for a literal
-- percent sign like any other character.
--
-- ----------------------------------------------------------------------------
-- FIX 3 — the minimum query length was enforced only in the browser
-- ----------------------------------------------------------------------------
-- PeopleSearchBar refuses to fire under 2 characters, but the function is an
-- RPC granted to PUBLIC: anybody with the anon key can POST to it directly with
-- an empty string. A blank query produced `%%`, i.e. everybody. The minimum is
-- now IN THE FUNCTION: the query is trimmed and must be at least 2 characters
-- or the function returns zero rows.
--
-- Two, not three, on purpose — it is the number the shipped UI already
-- enforces, so no real user's behaviour changes, and it is enough to stop
-- single-letter fishing (which at 20 rows a page plus an alphabetical sort was
-- a usable way to walk the table). Raise it later if the user base grows; the
-- number appears once, below.
--
-- Signed-out callers now get zero rows explicitly (`viewer is not null`).
-- That was already true by accident — `id <> auth.uid()` is NULL for every row
-- when auth.uid() is NULL, so the WHERE never passed — and an accident is not
-- a control. EXECUTE is also revoked from anon and PUBLIC below.
-- ============================================================================

do $$
begin
  if to_regprocedure('public.is_blocked_between(uuid, uuid)') is null then
    raise exception
      'sql/036 needs sql/028_moderation.sql applied first — is_blocked_between() does not exist. Nothing has been changed.'
      using errcode = '42883';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- FIX 1 — new accounts are discoverable. Existing rows untouched.
-- ----------------------------------------------------------------------------
alter table public.profiles
  alter column discoverable_by_name set default true;


-- ----------------------------------------------------------------------------
-- FIXES 2 and 3 — the search function.
--
-- Structure, so the diff is readable: `pat` is a single-row CTE that computes
-- the viewer and the escaped pattern, and returns NO row at all when the caller
-- is signed out or the query is too short. The cross join to profiles then
-- yields nothing, which is the whole gate — there is no branch to get wrong.
--
-- Preserved exactly from sql/032: signature, return type, LANGUAGE sql,
-- SECURITY DEFINER, `set search_path to 'public'`, volatility (VOLATILE, as
-- found in production), the discoverable_by_name gate, the self-exclusion, the
-- both-directions block check, and `limit 20`.
--
-- Ordering is new and cosmetic: names that START with what you typed come
-- first, then alphabetical. "Rob" finding Robbie before Deborah is what a
-- person expects; it changes which rows make the cut only within the cap.
-- ----------------------------------------------------------------------------
create or replace function public.find_users_by_display_name(query text)
returns table(id uuid, display_name text, avatar_url text)
language sql
security definer
set search_path to 'public'
as $function$
  with pat as (
    select
      auth.uid() as viewer,
      -- Escape LIKE metacharacters so a typed `%` or `_` is a literal.
      -- Backslash first, or the escapes added after it get escaped again.
      replace(replace(replace(btrim(query), '\', '\\'), '%', '\%'), '_', '\_') as esc
    where auth.uid() is not null
      and length(btrim(query)) >= 2          -- the minimum, in one place
  )
  select p.id, p.display_name, p.avatar_url
  from pat, profiles p
  where p.discoverable_by_name = true
    and p.display_name is not null
    and p.display_name ilike '%' || pat.esc || '%' escape '\'
    and p.id <> pat.viewer
    and not is_blocked_between(pat.viewer, p.id)
  order by (p.display_name ilike pat.esc || '%' escape '\') desc, p.display_name
  limit 20;
$function$;

-- Signed-in accounts only. The function already returns nothing to a signed-out
-- caller; this makes it so before the body runs. service_role and postgres keep
-- their existing grants.
revoke execute on function public.find_users_by_display_name(text) from public, anon;
grant  execute on function public.find_users_by_display_name(text) to authenticated;


-- ============================================================================
-- THE 62 EXISTING PROFILES — NOT DONE HERE. Robbie's decision, not this file's.
--
-- 63 profiles exist and 1 is discoverable. Those 62 accounts were created under
-- a system that did not list them, so this migration leaves every one of them
-- exactly as it is. If Robbie says to opt them in, it is this line and nothing
-- else — no schema change, no function change, no deploy:
--
--   -- update public.profiles set discoverable_by_name = true;
--
-- It is not reversible as a group afterwards: once run, an account that had
-- deliberately opted out is indistinguishable from one that never chose. If
-- that matters, snapshot first:
--
--   -- create table profiles_discoverability_backup_2026_09 as
--   --   select id, discoverable_by_name from public.profiles;
-- ============================================================================

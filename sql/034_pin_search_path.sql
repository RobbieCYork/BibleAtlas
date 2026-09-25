-- ============================================================================
-- 034_pin_search_path.sql
--
-- Pin `search_path` on the 18 SECURITY DEFINER functions that do not set one.
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word. Do not run it without that.
--
-- NUMBERING: 034, not 033. 033 is taken by Capstone for Churches, which was
--            being written in parallel with this file. See sql/README.md.
-- ============================================================================
--
-- ---------------------------------------------------------------------------
-- WHAT THIS FIXES
-- ---------------------------------------------------------------------------
-- A SECURITY DEFINER function runs as its owner and bypasses RLS on every table
-- it touches. If it does not pin `search_path`, unqualified names inside it are
-- resolved using the CALLER's search_path. Anyone who can get a schema of their
-- own onto the front of that path can place a decoy object there — a table, or
-- a function with a matching signature — and have the definer-owned function
-- resolve to it and operate on the decoy with the owner's privileges.
--
-- This is the class Supabase's own database linter reports as
-- `function_search_path_mutable`. Production has 88 functions in public; 82 are
-- SECURITY DEFINER; 64 of those already pin a search_path and these 18 do not.
--
-- Two of the 18 are `is_group_member` and `is_group_admin`, which nearly every
-- policy on groups, group_members, group_messages, group_join_requests and
-- group_message_reads calls. The Capstone for Churches feature clones that
-- policy set, so the same two helpers are about to carry a second feature.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS DOES **NOT** DO
-- ---------------------------------------------------------------------------
-- No function body is changed. No signature is changed. No permission, grant,
-- owner, volatility or SECURITY DEFINER flag is changed. No table, policy,
-- index or row is touched. `ALTER FUNCTION ... SET` edits one attribute on the
-- catalog row and nothing else.
--
-- Deliberately NOT used here: CREATE OR REPLACE FUNCTION. Replacing these
-- bodies would mean retyping 18 functions — 17 of which were written by hand in
-- the dashboard and exist nowhere but sql/000_baseline.sql — and any
-- transcription slip would ship as a live behaviour change. ALTER cannot do
-- that.
--
-- ---------------------------------------------------------------------------
-- WHY 'public', 'pg_temp' AND WHY THAT IS BEHAVIOUR-PRESERVING
-- ---------------------------------------------------------------------------
-- It matches the convention already used by the majority of this schema's
-- pinned functions.
--
-- Every one of the 18 bodies was read before this file was written. Seventeen
-- schema-qualify every application object they touch (`public.group_members`,
-- `public.profiles`, ...). The eighteenth, `list_my_groups()`, uses bare names —
-- `groups`, `group_members`, `group_messages`, `group_message_reads`,
-- `is_blocked_between()` — and every one of them lives in `public`, so pinning
-- to `public` resolves them exactly where they resolve today. It is also the
-- function in this set that most needs pinning, for the same reason.
--
-- Cross-schema calls in these bodies are already explicit — `auth.uid()` and
-- `auth.jwt()` — and are unaffected: a qualified name never consults
-- search_path. Everything else they call (`now`, `lower`, `trim`, `coalesce`,
-- `count`, `least`, `greatest`, `char_length`) is in `pg_catalog`, which is
-- searched regardless. None of the 18 calls an `extensions`-schema function
-- (no `uuid_generate_v4`, `crypt`, `digest`, `pgp_*`) unqualified — that was
-- checked explicitly, because it is the one thing that would genuinely break
-- under a pinned path.
--
-- Naming `pg_temp` LAST is part of the hardening, not decoration. When
-- `pg_temp` is not listed explicitly, Postgres searches it FIRST — which is
-- precisely the schema a caller fully controls. Listing it last demotes it.
--
-- Conclusion: no function in this set relies on the caller's search_path for
-- its current behaviour, so none was left out. If that had not been true for
-- one of them, the right move would have been to leave that one alone and say
-- so, not to pin it and hope.
--
-- ---------------------------------------------------------------------------
-- REVERSAL
-- ---------------------------------------------------------------------------
-- Fully reversible, immediately, with no data implications — the rollback block
-- at the bottom of this file restores all 18 to a mutable search_path.
--
-- ---------------------------------------------------------------------------
-- VERIFY AFTER APPLYING (should return 0 rows)
-- ---------------------------------------------------------------------------
--   select p.proname
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.prosecdef
--     and not exists (
--       select 1 from unnest(coalesce(p.proconfig, '{}')) c
--       where c like 'search_path=%'
--     )
--   order by 1;
--
-- ============================================================================

begin;

-- The groups RPC layer and its two policy helpers ---------------------------
-- is_group_member and is_group_admin are the two the entire groups policy set
-- leans on, and the two Capstone for Churches is about to clone.
alter function public.is_group_member(uuid)                        set search_path to 'public', 'pg_temp';
alter function public.is_group_admin(uuid)                         set search_path to 'public', 'pg_temp';
alter function public.create_group(text, text, uuid[])             set search_path to 'public', 'pg_temp';
alter function public.add_group_member(uuid, uuid)                 set search_path to 'public', 'pg_temp';
alter function public.set_group_admin(uuid, uuid, boolean)         set search_path to 'public', 'pg_temp';
alter function public.request_to_join_group(uuid)                  set search_path to 'public', 'pg_temp';
alter function public.respond_to_join_request(uuid, boolean)       set search_path to 'public', 'pg_temp';
alter function public.list_my_groups()                             set search_path to 'public', 'pg_temp';
alter function public.count_pending_group_join_requests()          set search_path to 'public', 'pg_temp';
alter function public.count_unread_group_messages()                set search_path to 'public', 'pg_temp';

-- Message pinning ------------------------------------------------------------
alter function public.pin_group_message(uuid)                      set search_path to 'public', 'pg_temp';
alter function public.unpin_group_message(uuid)                    set search_path to 'public', 'pg_temp';
alter function public.pin_message(uuid)                            set search_path to 'public', 'pg_temp';
alter function public.unpin_message(uuid)                          set search_path to 'public', 'pg_temp';

-- User lookup ----------------------------------------------------------------
alter function public.find_user_by_contact(text)                   set search_path to 'public', 'pg_temp';
alter function public.find_user_id_by_email(text)                  set search_path to 'public', 'pg_temp';
alter function public.is_display_name_available(text, uuid)        set search_path to 'public', 'pg_temp';

-- The auth signup trigger ----------------------------------------------------
-- Highest blast radius in this file: it is the AFTER INSERT trigger on
-- auth.users that creates the row in public.profiles. If this one were wrong,
-- new signups would fail. Its body qualifies public.profiles explicitly and
-- calls nothing outside pg_catalog, so pinning cannot change how it resolves —
-- but smoke-test a real signup after applying, not just the query above.
alter function public.handle_new_user()                            set search_path to 'public', 'pg_temp';

commit;

-- ============================================================================
-- ROLLBACK — restores all 18 to a mutable search_path. Reverses this file
-- exactly; run only if applying it caused a problem.
-- ============================================================================
-- begin;
-- alter function public.is_group_member(uuid)                   reset search_path;
-- alter function public.is_group_admin(uuid)                    reset search_path;
-- alter function public.create_group(text, text, uuid[])        reset search_path;
-- alter function public.add_group_member(uuid, uuid)            reset search_path;
-- alter function public.set_group_admin(uuid, uuid, boolean)    reset search_path;
-- alter function public.request_to_join_group(uuid)             reset search_path;
-- alter function public.respond_to_join_request(uuid, boolean)  reset search_path;
-- alter function public.list_my_groups()                        reset search_path;
-- alter function public.count_pending_group_join_requests()     reset search_path;
-- alter function public.count_unread_group_messages()           reset search_path;
-- alter function public.pin_group_message(uuid)                 reset search_path;
-- alter function public.unpin_group_message(uuid)               reset search_path;
-- alter function public.pin_message(uuid)                       reset search_path;
-- alter function public.unpin_message(uuid)                     reset search_path;
-- alter function public.find_user_by_contact(text)              reset search_path;
-- alter function public.find_user_id_by_email(text)             reset search_path;
-- alter function public.is_display_name_available(text, uuid)   reset search_path;
-- alter function public.handle_new_user()                       reset search_path;
-- commit;

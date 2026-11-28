-- ============================================================================
-- 051_about_page.sql — THE ABOUT PAGE, EDITABLE FROM THE ADMIN CONSOLE
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand, the whole file in one go (it is one transaction):
--           psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/051_about_page.sql
--         or paste the whole file into the Supabase project's SQL Editor.
--
-- NUMBERING: 045-050 are claimed on unmerged branches (groups-assignments,
--            groups-invites); 051 is the next number free on every branch.
--            Depends only on sql/025 (has_role_at_least), which is APPLIED.
--            Does NOT depend on any unapplied migration.
-- ============================================================================
--
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
-- ----------------------------------------------------------------------------
-- The words of "About Capstone Bible" (the pull quote, the section headings and
-- the paragraphs) can be edited by the OWNER in Admin Console -> About page and
-- are read by everyone, signed in or not, from the in-app About view and from
-- the public /about page — without a code deploy.
--
-- The built-in words in src/data/aboutPage.ts stay the default. With NO row in
-- about_page (which is how this file leaves it), every reader sees exactly the
-- built-in text, so APPLYING THIS FILE CHANGES NOTHING ANY READER SEES. The
-- saved text only takes over once the owner presses Save.
--
-- ----------------------------------------------------------------------------
-- SECURITY SHAPE — the sql/039 pattern (feature_release), deliberately
-- ----------------------------------------------------------------------------
--   * about_page is readable by ANYONE, anon included: it is the text of a
--     public page. It holds ONLY the content and a timestamp. There is no
--     updated_by column on purpose — publishing the owner's user id to the
--     internet would hand every visitor the one UUID worth probing with
--     has_role_at_least() (see manager-inbox finding 2026-11-21T0333). Who
--     saved what lives in about_page_versions, which only the owner can read.
--   * NO insert/update/delete policy on either table. RLS denies by default,
--     so no client role has a statement to write WITH, and the write grants
--     are revoked as well. The only write path is save_about_page()
--     (SECURITY DEFINER, pinned search_path, owner only).
--   * OWNER ONLY, not administrators — the same line sql/039 drew for the other
--     site-wide setting in the Admin Console (Features). The text is signed
--     with Robbie's name.
--   * The content is plain text inside a fixed JSON shape, checked by a CHECK
--     constraint on BOTH tables (about_page_content_ok), so no shape the app
--     cannot render can be stored by any route, the dashboard included. The app
--     renders every string as text (React text nodes / textContent), never as
--     HTML, so markup typed into the editor shows up as the literal characters.
--   * Every save is kept in about_page_versions: the owner can restore any
--     earlier version (restoring is itself a save, so it is undoable too), and
--     the built-in text is always one button away in the app.
--   * Optimistic concurrency: save_about_page() refuses (40001) when the page
--     was saved somewhere else after the editor loaded it, unless told to
--     overwrite. Two open tabs cannot silently clobber each other.
--   * Grants are revoked to zero FIRST and granted back explicitly (Supabase's
--     default ACL hands arwdDxtm to anon and authenticated at CREATE TABLE; see
--     sql/README.md). Function EXECUTE is revoked from PUBLIC (Postgres grants
--     it to PUBLIC by default). No new function takes a user id argument, so
--     nothing here widens the has_role_at_least() probing finding.
--   * saved_by references auth.users ON DELETE SET NULL, so the history never
--     blocks an account deletion and keeps no identifier afterwards.
--
-- THE SHAPE (what the client sends and stores):
--   { "quote": "…",                       -- may be "" (no pull quote shown)
--     "sections": [
--       { "heading": null | "…",          -- null = no heading (the opening letter)
--         "paragraphs": ["…", "…"] }      -- at least one per section
--     ] }
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. about_page_content_ok() — the shape check, used by both CHECK constraints.
--    IMMUTABLE and side-effect free. Limits are generous for prose and small
--    enough that nobody can park megabytes in a public row.
-- ----------------------------------------------------------------------------
create or replace function about_page_content_ok(c jsonb)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  s jsonb;
  p jsonb;
begin
  if c is null or jsonb_typeof(c) <> 'object' then return false; end if;
  if octet_length(c::text) > 200000 then return false; end if;
  -- exactly the two keys, nothing smuggled alongside
  if (select count(*) from jsonb_object_keys(c)) <> 2
     or not (c ? 'quote') or not (c ? 'sections') then
    return false;
  end if;
  if jsonb_typeof(c->'quote') <> 'string' or length(c->>'quote') > 1000 then return false; end if;
  if jsonb_typeof(c->'sections') <> 'array'
     or jsonb_array_length(c->'sections') < 1
     or jsonb_array_length(c->'sections') > 40 then
    return false;
  end if;

  for s in select value from jsonb_array_elements(c->'sections') loop
    if jsonb_typeof(s) <> 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(s)) <> 2
       or not (s ? 'heading') or not (s ? 'paragraphs') then
      return false;
    end if;
    if jsonb_typeof(s->'heading') = 'null' then
      null; -- no heading: fine
    elsif jsonb_typeof(s->'heading') <> 'string'
       or length(btrim(s->>'heading')) < 1
       or length(s->>'heading') > 200 then
      return false;
    end if;
    if jsonb_typeof(s->'paragraphs') <> 'array'
       or jsonb_array_length(s->'paragraphs') < 1
       or jsonb_array_length(s->'paragraphs') > 100 then
      return false;
    end if;
    for p in select value from jsonb_array_elements(s->'paragraphs') loop
      if jsonb_typeof(p) <> 'string'
         or length(btrim(p #>> '{}')) < 1
         or length(p #>> '{}') > 10000 then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. about_page — at most one row (id = 1). No row = use the built-in text.
-- ----------------------------------------------------------------------------
create table if not exists about_page (
  id         smallint primary key default 1 check (id = 1),
  content    jsonb not null check (about_page_content_ok(content)),
  updated_at timestamptz not null default now()
);

alter table about_page enable row level security;

drop policy if exists about_page_select_all on about_page;
create policy about_page_select_all on about_page
  for select using (true);

-- No write policies, on purpose. See the header.


-- ----------------------------------------------------------------------------
-- 3. about_page_versions — every save, newest last. Owner-readable only.
-- ----------------------------------------------------------------------------
create table if not exists about_page_versions (
  id       bigint generated always as identity primary key,
  content  jsonb not null check (about_page_content_ok(content)),
  saved_by uuid references auth.users(id) on delete set null,
  saved_at timestamptz not null default now()
);

create index if not exists about_page_versions_saved_idx
  on about_page_versions (saved_at desc);

alter table about_page_versions enable row level security;

drop policy if exists about_page_versions_select_owner on about_page_versions;
create policy about_page_versions_select_owner on about_page_versions
  for select using (has_role_at_least('owner'));

-- No write policies. save_about_page() is the only writer.


-- ----------------------------------------------------------------------------
-- 4. save_about_page() — the ONLY write path.
--
--   p_content               the whole page, in THE SHAPE above.
--   p_expected_updated_at   the about_page.updated_at the editor loaded, or NULL
--                           if it loaded no saved row (built-in text).
--   p_overwrite             true = save even if someone saved in between.
--
--   * owner only. Administrators are refused, like set_feature_stage().
--   * invalid shape -> 22023, before anything is touched.
--   * the row is locked FOR UPDATE, so two saves serialise and the conflict
--     check is exact.
--   * saving content identical to what is live is a no-op (no version row).
--   * returns the live row as it now stands.
-- ----------------------------------------------------------------------------
create or replace function save_about_page(
  p_content jsonb,
  p_expected_updated_at timestamptz default null,
  p_overwrite boolean default false
)
returns about_page
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row about_page;
begin
  if v_uid is null or not has_role_at_least('owner') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not about_page_content_ok(p_content) then
    raise exception 'invalid about page content' using errcode = '22023';
  end if;

  select * into v_row from about_page where id = 1 for update;

  if not coalesce(p_overwrite, false)
     and (v_row.updated_at is distinct from p_expected_updated_at) then
    raise exception 'the about page was saved somewhere else after you opened it'
      using errcode = '40001';
  end if;

  if found and v_row.content = p_content then
    return v_row;
  end if;

  insert into about_page_versions (content, saved_by) values (p_content, v_uid);

  insert into about_page as a (id, content, updated_at)
  values (1, p_content, clock_timestamp())
  on conflict (id) do update
    set content = excluded.content, updated_at = excluded.updated_at
  returning * into v_row;

  return v_row;
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. GRANTS — revoke to zero first, then grant back exactly what is used.
-- ----------------------------------------------------------------------------
revoke all on about_page          from public, anon, authenticated;
revoke all on about_page_versions from public, anon, authenticated;
revoke all on sequence about_page_versions_id_seq from public, anon, authenticated;

-- The page text: read by every visitor, signed in or not.
grant select on about_page to anon, authenticated;
-- The history: the policy above narrows this to the owner.
grant select on about_page_versions to authenticated;

revoke execute on function about_page_content_ok(jsonb)                       from public, anon, authenticated;
revoke execute on function save_about_page(jsonb, timestamptz, boolean)       from public, anon;
grant  execute on function save_about_page(jsonb, timestamptz, boolean)       to authenticated;

commit;


-- ============================================================================
-- AFTER APPLYING — read-only checks (run in the SQL Editor)
-- ============================================================================
-- 1. Nothing is saved yet, so every reader still sees the built-in text:
--      select count(*) from about_page;              -- expect 0
--      select count(*) from about_page_versions;     -- expect 0
--
-- 2. Grants are exactly these three rows:
--      select table_name, grantee,
--             string_agg(distinct privilege_type, ', ' order by privilege_type)
--        from information_schema.role_table_grants
--       where table_schema = 'public'
--         and grantee in ('anon', 'authenticated', 'PUBLIC')
--         and table_name in ('about_page', 'about_page_versions')
--       group by 1, 2 order by 1, 2;
--    Expected:
--      about_page           anon           SELECT
--      about_page           authenticated  SELECT
--      about_page_versions  authenticated  SELECT
--
-- 3. Function EXECUTE is exactly this (expect about_page_content_ok: none of
--    the three; save_about_page: authenticated only):
--      select p.proname,
--             has_function_privilege('anon', p.oid, 'execute')          as anon,
--             has_function_privilege('authenticated', p.oid, 'execute') as authed,
--             p.prosecdef as definer, p.proconfig
--        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public' and p.proname in ('about_page_content_ok', 'save_about_page');
--    (has_function_privilege counts PUBLIC; "false" for anon is the point.)
--
-- 4. From the live site, signed OUT, browser console on https://capstonebible.com/about:
--      the page shows the built-in text and the console shows no error.
--
-- 5. Signed in as the OWNER: Admin Console -> About page no longer says saving
--    is switched off. Change one word, Save, open /about in a private window:
--    the word has changed. Then Previous versions -> "Start from the original
--    text" -> Save to put the built-in words back (or restore any version).
--
-- 6. Signed in as a NON-owner (an administrator if possible), browser console:
--      await supabase.rpc('save_about_page', { p_content: { quote: 'x', sections: [{ heading: null, paragraphs: ['x'] }] } })
--    must fail 42501 "not authorized", and
--      await supabase.from('about_page_versions').select('*')
--    must return [] (RLS), and
--      await supabase.from('about_page').insert({ id: 1, content: {} })
--    must fail 42501 permission denied.
--
-- ROLLBACK (no other object references these; the app falls back to the
-- built-in text when the table is missing, so dropping them is safe at any time,
-- but it discards every saved version — export about_page_versions first if
-- anything in it is worth keeping):
--      begin;
--      drop function if exists save_about_page(jsonb, timestamptz, boolean);
--      drop table if exists about_page_versions;
--      drop table if exists about_page;
--      drop function if exists about_page_content_ok(jsonb);
--      commit;
-- ============================================================================

-- ============================================================================
-- 055_report_screenshots.sql — REPORT A PROBLEM: AN OPTIONAL SCREENSHOT
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand, the whole file in one go (it is one transaction):
--           psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/055_report_screenshots.sql
--         or paste the whole file into the Supabase project's SQL Editor.
--
-- NUMBERING: 055 was free on every branch on 2026-11-28 (checked with the
--            for-each-ref command in sql/README.md).
--            Depends only on sql/025 (reports, has_role_at_least()), which is
--            APPLIED, and on Supabase Storage (storage.buckets, storage.objects,
--            storage.foldername()). Does NOT depend on any unapplied migration.
--            Adds no function that takes a user id from the caller.
--
-- THE APP IS SAFE TO DEPLOY BEFORE THIS. The client asks
-- report_screenshots_enabled() once per session; until this file is applied
-- that call fails (PGRST202, no such function), the app treats screenshots as
-- switched off, never sends `screenshot_path`, never touches the bucket, and the
-- report form looks exactly as it did.
-- ============================================================================
--
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES
-- ----------------------------------------------------------------------------
-- When a reader taps Report a Problem, the app renders the screen they were on
-- to an image ON THEIR DEVICE (src/lib/screenCapture.ts). The form shows it as a
-- thumbnail with "Include this screenshot" OFF. Only if they tick it is the image
-- uploaded, and only then does the report point at it. Suggestions never capture.
--
-- 1. BUCKET `report-screenshots`. PRIVATE (no public URL ever works), 3 MB per
--    file, JPEG / PNG / WebP only. Paths are `<reporter uid>/<random uuid>.<ext>`,
--    the first-folder convention sql/027 and the delete-account function use.
--
-- 2. STORAGE POLICIES on storage.objects, this bucket only:
--      INSERT  the signed-in, NON-anonymous owner of the first folder, path in
--              exactly the shape above, at most 10 uploads in the last hour
--              (upload spam control; reports themselves are already limited by
--              sql/025's reports_before_insert()).
--      SELECT  the owner of the first folder (the reporter), OR an administrator
--              or owner (has_role_at_least('administrator')) for an object that
--              a report actually points at. That is the same set of people
--              reports_select_own_or_staff (025) lets read the report itself.
--              Advisors read reports only through report_detail(); they do NOT
--              get the image, because a screenshot can show someone's private
--              notes or messages. The admin view says so.
--      DELETE  the owner of the first folder (the app removes the image when the
--              reporter deletes their report, and cleans up after a failed send).
--      UPDATE  nobody. An uploaded screenshot is never overwritten.
--
-- 3. reports.screenshot_path (text, null by default), with a shape check, a
--    unique index (one report per image), and a trigger that, on INSERT, accepts
--    a path only if it is in the reporter's own folder AND the object exists in
--    the bucket, and on UPDATE freezes it for everybody (like every other
--    auto-captured field in 025). report_detail() already returns the whole row,
--    so the admin view sees the column with no function change.
--
-- 4. report_screenshots_enabled() — returns true. Exists so the client can tell
--    "applied" from "not applied" without guessing.
--
-- 5. report_screenshot_orphans() — administrators only: objects in the bucket no
--    report points at, older than an hour. See DELETION.
--
-- ----------------------------------------------------------------------------
-- DELETION — what removes a screenshot, and what does not
-- ----------------------------------------------------------------------------
-- Supabase refuses direct SQL deletes from storage tables (and a SQL delete would
-- leave the file in the object store anyway), so nothing here can delete a file.
-- Files are removed through the Storage API:
--   * reporter deletes their report  -> the app removes the file (deleteMyReport)
--   * a send fails after the upload  -> the app removes the file it just uploaded
--   * the account is deleted         -> supabase/functions/delete-account purges
--                                       the `<uid>/` folder of this bucket, like
--                                       avatars / post-media / sermon-note-images.
--                                       THAT FUNCTION MUST BE REDEPLOYED for this.
--   * anything that slips through    -> report_screenshot_orphans() lists it; an
--                                       administrator removes it in the dashboard
--                                       or with the Storage API.
-- Staff never delete reports (025: they decline them), so no staff path exists.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-screenshots',
  'report-screenshots',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER with a pinned search_path (the 019/025 pattern):
-- they read storage.objects and reports regardless of the caller's own RLS,
-- and take no user id from the caller.
-- ---------------------------------------------------------------------------

-- The shape every screenshot path must have: <uuid>/<uuid>.<ext>, lower-case hex.
create or replace function report_screenshot_path_ok(p_path text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select p_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
$$;

-- How many screenshots the CALLER has uploaded in the last hour.
create or replace function report_screenshot_recent_uploads()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
    from storage.objects o
   where o.bucket_id = 'report-screenshots'
     and (storage.foldername(o.name))[1] = auth.uid()::text
     and o.created_at > now() - interval '1 hour'
$$;

-- ---------------------------------------------------------------------------
-- 3. The column — before report_screenshot_is_attached(), whose SQL body names
--    it (SQL function bodies are checked when they are created), and before the
--    policies that call that function.
-- ---------------------------------------------------------------------------
alter table reports add column if not exists screenshot_path text;

alter table reports drop constraint if exists reports_screenshot_path_shape;
alter table reports add constraint reports_screenshot_path_shape
  check (screenshot_path is null or report_screenshot_path_ok(screenshot_path));

create unique index if not exists reports_screenshot_path_key
  on reports (screenshot_path) where screenshot_path is not null;

create or replace function reports_screenshot_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    -- Frozen for everybody with a JWT, like every other auto-captured field.
    if auth.uid() is not null then
      new.screenshot_path := old.screenshot_path;
    end if;
    return new;
  end if;

  if new.screenshot_path is null or auth.uid() is null then
    return new;
  end if;

  -- reports_before_insert() (025) has already set reporter_id := auth.uid();
  -- triggers fire in name order and 'reports_before_insert_trg' < 'reports_screenshot_trg'.
  if split_part(new.screenshot_path, '/', 1) <> new.reporter_id::text then
    raise exception 'screenshot_not_yours: a report can only attach a screenshot from its own reporter'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'report-screenshots' and o.name = new.screenshot_path
  ) then
    raise exception 'screenshot_missing: the screenshot was not uploaded'
      using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_screenshot_trg on reports;
create trigger reports_screenshot_trg
  before insert or update on reports
  for each row execute function reports_screenshot_guard();

-- Does a report point at this object? (Read by the SELECT policy for staff.)
create or replace function report_screenshot_is_attached(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from reports r where r.screenshot_path = p_path)
$$;

-- ---------------------------------------------------------------------------
-- 2. Storage policies (this bucket only)
-- ---------------------------------------------------------------------------
drop policy if exists "report screenshots: reporter uploads own" on storage.objects;
create policy "report screenshots: reporter uploads own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'report-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.report_screenshot_path_ok(name)
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and public.report_screenshot_recent_uploads() < 10
  );

drop policy if exists "report screenshots: reporter or administrators read" on storage.objects;
create policy "report screenshots: reporter or administrators read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'report-screenshots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (public.has_role_at_least('administrator') and public.report_screenshot_is_attached(name))
    )
  );

drop policy if exists "report screenshots: reporter deletes own" on storage.objects;
create policy "report screenshots: reporter deletes own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'report-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 4. / 5. Client probe and orphan list
-- ---------------------------------------------------------------------------
create or replace function report_screenshots_enabled()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$ select true $$;

create or replace function report_screenshot_orphans()
returns table (name text, created_at timestamptz, size_bytes bigint)
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
    select o.name, o.created_at, coalesce((o.metadata ->> 'size')::bigint, 0)
      from storage.objects o
     where o.bucket_id = 'report-screenshots'
       and o.created_at < now() - interval '1 hour'
       and not exists (select 1 from reports r where r.screenshot_path = o.name)
     order by o.created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants. Supabase's default ACL grants EXECUTE on new public functions to
-- anon and authenticated; narrow every one of these.
-- ---------------------------------------------------------------------------
revoke all on function report_screenshot_path_ok(text)          from public, anon;
revoke all on function report_screenshot_recent_uploads()       from public, anon;
revoke all on function report_screenshot_is_attached(text)      from public, anon;
revoke all on function reports_screenshot_guard()               from public, anon, authenticated;
revoke all on function report_screenshots_enabled()             from public, anon;
revoke all on function report_screenshot_orphans()              from public, anon;
grant execute on function report_screenshot_path_ok(text)       to authenticated;
grant execute on function report_screenshot_recent_uploads()    to authenticated;
grant execute on function report_screenshot_is_attached(text)   to authenticated;
grant execute on function report_screenshots_enabled()          to authenticated;
grant execute on function report_screenshot_orphans()           to authenticated;

-- ---------------------------------------------------------------------------
-- Self-check: abort the whole transaction if any of the above is not as written.
-- ---------------------------------------------------------------------------
do $check$
declare
  v_bucket storage.buckets%rowtype;
begin
  select * into v_bucket from storage.buckets where id = 'report-screenshots';
  if not found then raise exception '055 check: bucket missing'; end if;
  if v_bucket.public then raise exception '055 check: bucket is public'; end if;
  if v_bucket.file_size_limit is distinct from 3145728 then
    raise exception '055 check: size limit is %', v_bucket.file_size_limit;
  end if;
  if (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
        and policyname like 'report screenshots:%') <> 3 then
    raise exception '055 check: expected exactly 3 report-screenshot storage policies';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
              and policyname like 'report screenshots:%' and cmd in ('UPDATE', 'ALL')) then
    raise exception '055 check: a report-screenshot policy allows UPDATE';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'reports' and column_name = 'screenshot_path') then
    raise exception '055 check: reports.screenshot_path missing';
  end if;
  if has_function_privilege('anon', 'public.report_screenshots_enabled()', 'execute')
     or has_function_privilege('anon', 'public.report_screenshot_orphans()', 'execute') then
    raise exception '055 check: anon can execute a 055 function';
  end if;
  if not report_screenshot_path_ok('00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.jpg')
     or report_screenshot_path_ok('../x.jpg')
     or report_screenshot_path_ok('00000000-0000-4000-8000-000000000001/a/b.jpg') then
    raise exception '055 check: path shape function is wrong';
  end if;
end
$check$;

commit;

-- ============================================================================
-- AFTER APPLYING — read-only checks to paste into the SQL editor
-- ============================================================================
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'report-screenshots';
--       -- report-screenshots | false | 3145728 | {image/jpeg,image/png,image/webp}
--   select policyname, cmd, roles from pg_policies
--    where schemaname = 'storage' and tablename = 'objects' and policyname like 'report screenshots:%';
--       -- three rows: INSERT, SELECT, DELETE; all {authenticated}
--   select column_name, data_type from information_schema.columns
--    where table_name = 'reports' and column_name = 'screenshot_path';          -- one row, text
--   select tgname from pg_trigger where tgrelid = 'public.reports'::regclass and not tgisinternal;
--       -- includes reports_screenshot_trg
--   select has_function_privilege('anon', 'report_screenshots_enabled()', 'execute');          -- false
--   select has_function_privilege('authenticated', 'report_screenshots_enabled()', 'execute'); -- true
--   select count(*) from reports where screenshot_path is not null;   -- 0 right after applying
--
-- Then, in the app, signed in as an ordinary member: open Report a Problem, tick
-- "Include this screenshot", send. As an administrator, the report shows the
-- image; as the member, Storage refuses the image of anyone else's report.
--
-- ============================================================================
-- ROLLBACK — removes everything above. Two steps, because Supabase does not let
-- SQL delete storage objects or buckets:
--   (a) In the dashboard (Storage -> report-screenshots), delete every file, then
--       the bucket. Or with the Storage API: list and remove, then deleteBucket.
--   (b) Then run as one block:
-- ============================================================================
--      begin;
--      drop policy if exists "report screenshots: reporter uploads own" on storage.objects;
--      drop policy if exists "report screenshots: reporter or administrators read" on storage.objects;
--      drop policy if exists "report screenshots: reporter deletes own" on storage.objects;
--      drop trigger if exists reports_screenshot_trg on reports;
--      drop function if exists reports_screenshot_guard();
--      drop index if exists reports_screenshot_path_key;
--      alter table reports drop constraint if exists reports_screenshot_path_shape;
--      alter table reports drop column if exists screenshot_path;
--      drop function if exists report_screenshot_orphans();
--      drop function if exists report_screenshots_enabled();
--      drop function if exists report_screenshot_is_attached(text);
--      drop function if exists report_screenshot_recent_uploads();
--      drop function if exists report_screenshot_path_ok(text);
--      commit;
-- After (b) the app goes back to "screenshots off" on its own: the probe
-- function is gone, so report_screenshots_enabled() fails and nothing is offered.
-- Note the order inside (b): the policies and the column go before the helper
-- functions they reference.

-- ============================================================================
-- 052_report_categories_no_voting.sql — REPORT A PROBLEM: AREA CATEGORIES,
--                                         AND ADVISOR VOTING SWITCHED OFF
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand, the whole file in one go (it is one transaction):
--           psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/052_report_categories_no_voting.sql
--         or paste the whole file into the Supabase project's SQL Editor.
--
-- NUMBERING: 045-050 are claimed on unmerged branches, 051 is the About page.
--            052 is the next number free on every branch.
--            Depends only on sql/025 (reports, report_categories, report_votes,
--            report_vote()), which is APPLIED. Does NOT depend on any
--            unapplied migration. Adds no function, and no function that takes
--            a user id, so it does not widen the open has_role_at_least()
--            finding (manager-inbox 2026-11-21T0333).
-- ============================================================================
--
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES
-- ----------------------------------------------------------------------------
-- 1. CATEGORIES. sql/025 shipped six "what kind of thing" categories (bug,
--    incorrect_info, typo, theological, idea, other). Robbie (2026-11-26) wants
--    reports filed by AREA so the Admin Console can sort them. This upserts the
--    list below. Existing keys are REUSED where the meaning is the same, so no
--    report row is rewritten and every old report keeps the category its
--    reporter chose:
--
--      key             label (after)                                   active
--      incorrect_info  Content error (article, map or timeline facts)  yes  (relabelled)
--      bible_reader    Bible reader                                    yes  (new)
--      map             Map                                             yes  (new)
--      timeline        Timeline                                        yes  (new)
--      games           Games                                           yes  (new)
--      account         Account or sign-in                              yes  (new)
--      bug             Something is broken                             yes  (label unchanged)
--      theological     Theological concern                             yes  (kept; distinct editorial channel)
--      idea            Suggestion                                      yes  (relabelled)
--      other           Other                                           yes  (relabelled)
--      typo            Typo or grammar                                 NO   (retired: now part of Content error)
--
--    `typo` is RETIRED, not deleted: is_active = false hides it from the form,
--    its row stays (reports.category has an FK to it), and the Admin Console
--    still shows reports filed under it as their own group so an administrator
--    can re-file them. Nothing here guesses a new category for an old report.
--
--    Re-filing a report needs NO schema change: reports_before_update() (025)
--    already lets administrators change `category`, and the RLS UPDATE policy
--    already admits them. The app does it with a plain table update.
--
-- 2. VOTING. sql/025 let advisors-and-above cast an agree/disagree vote on a
--    report (report_vote(), table report_votes), which fed priority_score.
--    Members never saw or cast votes, and members cannot read anyone else's
--    report (reports_select_own_or_staff) — so there is no member-visible
--    shared list to close. Voting was a staff-only mechanism.
--    This removes every WRITE path to votes:
--      * EXECUTE on report_vote() revoked from public, anon, authenticated
--      * report_votes' insert / update / delete policies dropped (RLS is on, so
--        with no write policy no client role can write a row)
--    NOTHING IS DROPPED THAT HOLDS DATA. Left behind, untouched:
--      * table report_votes and all its rows, and its SELECT policy
--        (advisor+), so the history stays readable from the SQL editor
--      * columns reports.vote_agree, vote_disagree, priority_score and their
--        values (frozen from now on, since nothing can change a vote)
--      * report_list()'s vote/priority output columns, report_detail()'s
--        `votes` key, report_counts()'s `unvoted_by_me` — the app no longer
--        reads any of them. Changing a RETURNS TABLE needs drop + create, which
--        is more risk than an unused column is worth.
--      * functions report_vote_weight(), report_recalc_priority(),
--        report_recalc_all_priorities() and the report_votes triggers
--        (harmless: with no vote writes they never fire)
--      * the admin growth series' 'report_votes' metric (026); the app hides it
--
-- ADVISOR READ ACCESS IS NOT CLOSED, ON PURPOSE. Advisors read every report
-- through report_list()/report_detail(). Voting was one reason, but not the
-- only one: report_assign() assigns reports TO advisors, so an advisor must be
-- able to read the report they were handed. That is staff access, not other
-- members reading each other's reports.
--
-- BEFORE / AFTER, FOR THE APP. The app on branch `report-categories` works
-- either way: it shows whichever active categories the table holds, preselects
-- a category only if that key exists, never calls report_vote(), and re-files
-- with a table update 025 already allows. Before this file runs, the form still
-- offers the six old categories and reports still submit.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Preconditions: sql/025 must be live. Fail loudly rather than half-apply.
-- ----------------------------------------------------------------------------
do $pre$
begin
  if to_regclass('public.report_categories') is null
     or to_regclass('public.reports') is null
     or to_regclass('public.report_votes') is null then
    raise exception '052: sql/025 (reports, report_categories, report_votes) is not applied';
  end if;
  if to_regprocedure('public.report_vote(uuid, integer, text)') is null then
    raise exception '052: report_vote(uuid, integer, text) from sql/025 is missing';
  end if;
end
$pre$;

-- ----------------------------------------------------------------------------
-- 1. Categories
-- ----------------------------------------------------------------------------
insert into report_categories (key, label, description, sort_order, is_active) values
  ('incorrect_info', 'Content error (article, map or timeline facts)',
                     'A date, place, name, citation, wording or other fact in an article, on the map or on the timeline looks wrong', 10, true),
  ('bible_reader',   'Bible reader',        'Something about reading Scripture: the text, notes, highlights or reading plans', 20, true),
  ('map',            'Map',                 'The map itself: places, markers, zooming or layers',                              30, true),
  ('timeline',       'Timeline',            'The timeline itself: events, dates, scrolling or zooming',                        40, true),
  ('games',          'Games',               'A game, its questions or its scores',                                             50, true),
  ('account',        'Account or sign-in',  'Signing in, your profile, settings or your account',                              60, true),
  ('bug',            'Something is broken', 'A feature does not work, or the app errored',                                     70, true),
  ('theological',    'Theological concern', 'A doctrinal or interpretive concern with the content',                            75, true),
  ('idea',           'Suggestion',          'Something you would like the app to do',                                          80, true),
  ('other',          'Other',               'Anything that does not fit the categories above',                                 90, true),
  ('typo',           'Typo or grammar',     'Retired 2026-11: now filed as Content error',                                     95, false)
on conflict (key) do update
  set label       = excluded.label,
      description = excluded.description,
      sort_order  = excluded.sort_order,
      is_active   = excluded.is_active;

-- ----------------------------------------------------------------------------
-- 2. Voting: close every write path, keep every row
-- ----------------------------------------------------------------------------
revoke execute on function report_vote(uuid, integer, text) from public, anon, authenticated;

drop policy if exists report_votes_insert_own on report_votes;
drop policy if exists report_votes_update_own on report_votes;
drop policy if exists report_votes_delete_own on report_votes;

-- ----------------------------------------------------------------------------
-- Verification — inside the transaction, so a failure rolls the whole file back
-- ----------------------------------------------------------------------------
do $check$
declare
  v_active text[];
begin
  select array_agg(key order by sort_order, key) into v_active
    from report_categories where is_active;
  if v_active is distinct from array['incorrect_info','bible_reader','map','timeline','games',
                                     'account','bug','theological','idea','other'] then
    raise exception '052 check: active categories are %', v_active;
  end if;
  if (select is_active from report_categories where key = 'typo') is distinct from false then
    raise exception '052 check: typo should be retired (is_active = false)';
  end if;
  if exists (select 1 from reports r left join report_categories c on c.key = r.category where c.key is null) then
    raise exception '052 check: a report points at a category that does not exist';
  end if;
  if has_function_privilege('authenticated', 'public.report_vote(uuid, integer, text)', 'execute')
     or has_function_privilege('anon', 'public.report_vote(uuid, integer, text)', 'execute') then
    raise exception '052 check: report_vote() is still executable by a client role';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'report_votes'
              and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')) then
    raise exception '052 check: report_votes still has a write policy';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'report_votes'
                  and policyname = 'report_votes_select_advisor') then
    raise exception '052 check: report_votes select policy went missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.report_votes'::regclass) then
    raise exception '052 check: RLS is off on report_votes';
  end if;
end
$check$;

commit;

-- ============================================================================
-- AFTER APPLYING — read-only checks to paste into the SQL editor
-- ============================================================================
--   select key, label, is_active, sort_order from report_categories order by sort_order;
--   select has_function_privilege('authenticated', 'report_vote(uuid,integer,text)', 'execute');  -- false
--   select policyname, cmd from pg_policies where tablename = 'report_votes';                       -- select only
--   select count(*) from report_votes;   -- unchanged from before (rows are kept)
--
-- ============================================================================
-- ROLLBACK — restores sql/025's categories and the vote write path. Run as one
-- block. New category rows are deleted only if no report uses them; any that
-- are in use are retired instead (the FK forbids deleting them).
-- ============================================================================
--      begin;
--      update report_categories set label = 'Something is broken',   description = 'A feature does not work, or the app errored',                       sort_order = 10, is_active = true where key = 'bug';
--      update report_categories set label = 'Incorrect information', description = 'A date, place, name, citation or fact looks wrong',                 sort_order = 20, is_active = true where key = 'incorrect_info';
--      update report_categories set label = 'Typo or grammar',       description = 'A spelling mistake or awkward wording',                             sort_order = 30, is_active = true where key = 'typo';
--      update report_categories set label = 'Theological concern',   description = 'A doctrinal or interpretive concern with the content',              sort_order = 40, is_active = true where key = 'theological';
--      update report_categories set label = 'Idea or suggestion',    description = 'Something you would like the app to do',                            sort_order = 50, is_active = true where key = 'idea';
--      update report_categories set label = 'Something else',        description = 'Anything that does not fit the categories above',                   sort_order = 90, is_active = true where key = 'other';
--      update report_categories c set is_active = false where c.key in ('bible_reader','map','timeline','games','account') and exists (select 1 from reports r where r.category = c.key);
--      delete from report_categories c where c.key in ('bible_reader','map','timeline','games','account') and not exists (select 1 from reports r where r.category = c.key);
--      grant execute on function report_vote(uuid, integer, text) to public, authenticated;
--      revoke execute on function report_vote(uuid, integer, text) from anon;
--      create policy report_votes_insert_own on report_votes for insert with check (voter_id = auth.uid() and has_role_at_least('advisor'));
--      create policy report_votes_update_own on report_votes for update using (voter_id = auth.uid() and has_role_at_least('advisor')) with check (voter_id = auth.uid() and has_role_at_least('advisor'));
--      create policy report_votes_delete_own on report_votes for delete using (voter_id = auth.uid() and has_role_at_least('advisor'));
--      commit;

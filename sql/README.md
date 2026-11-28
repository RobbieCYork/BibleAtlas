# `sql/` — how the numbering works, and what is actually live

Read this before you write a migration. It exists because the same three facts have been
rediscovered from scratch more than once, each time by counting files in this directory — which
is exactly the thing that gives you the wrong answer.

Last verified against production: **2026-10-24** (read-only catalog queries for 027, 029, 033-039).
`sql/000_baseline.sql` is a separate photograph from 2026-09-11 and predates 037-039.

---

## The next free number is 057

(045-050 are claimed on the unmerged `groups-assignments` and `groups-invites` branches; 051 is the
About page; 052 is report categories / voting off. Check every branch, not this table alone, before taking a number:
`git for-each-ref --format='%(refname:short)' refs/heads refs/remotes | xargs -I{} git ls-tree --name-only {} sql/`.)

| Number | Status |
|---|---|
| **033** | `033_churches.sql` — Capstone for Churches, committed, **not applied** (no `churches` tables exist on production). |
| **034** | `034_pin_search_path.sql` — committed, **not applied**. See below. |
| **035** | `035_revoke_default_grants_moderation.sql` — committed, **not applied**. See below. |
| **036** | `036_people_search_discoverable_default.sql` — committed, **not applied**. See below. |
| **037** | `037_prayer_list.sql` — committed, **APPLIED 2026-09-26**. See below. |
| **038** | `038_prayer_list_reorder.sql` — committed, **APPLIED** (verified 2026-10-24; date applied not recorded). See below. |
| **039** | `039_feature_release.sql` — committed, **APPLIED 2026-10-24**. See below. |
| **040** | `040_feature_release_games.sql` — per-game stages (seven `game_*` rows, all Live), committed on branch `feature-release-games`, **not applied**. |
| **041** | `041_article_reads.sql` — "Mark this article as read" (new owner-only `article_reads` table), committed on branch `article-read-checkbox`, **not applied**. |
| **042** | `042_profiles_privacy.sql` — profiles owner-only + masked `get_profile_cards()`, friend_requests integrity, email/phone lookups closed to anon and guests. Committed, **APPLIED 2026-11-09** (after the app change went live). See below. |
| **043** | `043_paid_content.sql` — on the unmerged `paid-content` branch, **not on main, not applied**. Taken; do not reuse. |
| **044** | `044_admin_user_invites.sql` — audit trail + per-admin rate limit for the Admin Console's "Add user" (the `admin-add-user` Edge Function refuses every call until this is applied). Committed on branch `admin-add-user`, **not applied**. |
| **045-050** | Claimed on unmerged branches (`groups-assignments`: 045 stripe billing, 046 study collections, 047 groups classes, 048 groups assignments; `groups-invites`: 049 invites, 050 support access). Not on main. Do not reuse. |
| **051** | `051_about_page.sql` — owner-editable About page (`about_page`, public read; `about_page_versions`, owner-only history; `save_about_page()`, owner only). Committed on main (895b341), **APPLIED 2026-11-26**. |
| **052** | `052_report_categories_no_voting.sql` — Report a Problem: area categories (reuses 5 keys, adds 5, retires `typo`), and advisor voting switched off (`report_vote()` revoked, `report_votes` write policies dropped; no rows or columns dropped). Committed on main (5f019c4), **APPLIED 2026-11-26**. Rehearsal: `scripts/sql-rehearsal/052_report_categories_no_voting.mjs`. |
| **053** | `053_feature_release_new_games.sql` — feature_release rows for `game_daily_name` and `game_twenty_questions`, both Live. Committed on branch `new-games`, **not applied**. Not needed for readers to see the games (a missing row is treated as Live); needed only for the owner to switch either to Testing. |
| **054** | `054_admin_usage_report.sql` — Admin Console usage graphs: `admin_usage_report()` (counts per period: accounts, active, returning, chapters, articles, games by game, notes, reports by category) and `admin_registered_summary()` (Users tab card). Two read-only SECURITY DEFINER functions gated on `is_admin()`, EXECUTE revoked from PUBLIC and anon, no table/policy changes, no user-id argument. Committed on branch `usage-graphs`, **not applied**. The app draws what 019/021/025 can answer until it is. Rehearsal: `scripts/sql-rehearsal/054_admin_usage_report.mjs` (48 checks). |
| **055** | `055_report_screenshots.sql` — Report a Problem screenshots: private `report-screenshots` bucket (3 MB, jpeg/png/webp), three Storage policies (reporter uploads/reads/deletes own; administrators read a screenshot a report points at; no update), `reports.screenshot_path` with a shape check, unique index and guard trigger, `report_screenshots_enabled()` (client probe) and `report_screenshot_orphans()` (admin). Committed on branch `report-screenshot`, **not applied**. The app shows nothing until it is. Needs `delete-account` redeployed (it now purges this bucket). |
| **056** | `056_groups_add_member_consent.sql` — `add_group_member()` / `create_group()` only add the caller's accepted friends, never across a block; both pin `search_path` and lose anon EXECUTE. Committed on branch `social-reenable`, **not applied**. Must be applied before `SOCIAL_CONNECTIONS_ENABLED` goes back to true. Rehearsed in `scripts/sql-rehearsal/056_groups_add_member_consent.mjs`. |
| **057** | Next genuinely free number. |

### Numbers that are TAKEN but MISSING from this directory

`ls sql/` does not list these, and they are **not** free slots:

- **006** — history. Never reuse.
- **020** — history. Never reuse.

(**029** used to be listed here, when it lived only on the unmerged `account-deletion` branch. That
branch has been merged, so `029_account_deletion_fk_hygiene.sql` is now in this directory like
any other migration — committed, not applied; see the table below.)

The full list present on `main`:

```
001 002 003 004 005 007 008 009 010 011 012 013 014 015 016 017 018 019
021 022 023 024 025 026 027 028 029 030 031 032 033 034 035 036 037 038 039 040 041 042 044
```

`000_baseline.sql` is **not** a migration. It is a photograph of the live schema, numbered `000`
so it sorts above `001` and cannot be mistaken for the next free slot. **Never run it** — its
`create table`s would error against production but its `CREATE OR REPLACE FUNCTION`s would not,
so a partial run would silently overwrite live functions.

---

## Committed is not applied

A file sitting in this directory is **not** evidence that it has been run against production.
Verified against the live database on 2026-09-11, and re-verified read-only on 2026-10-24 for
027, 029, 033-039:

| Migration | On production? | Evidence |
|---|---|---|
| 027 sermon-note images | **NOT APPLIED** | no `sermon-note-images` storage bucket exists (re-checked 2026-10-24) |
| 028 moderation | **APPLIED** | `user_blocks` + the `*_block_filter` policies are live |
| 029 account-deletion FK hygiene | **NOT APPLIED** | committed only; both `winner_id` FKs still `NO ACTION` (re-checked 2026-10-24). In-app deletion does not need it (the Edge Function nulls both columns first); it fixes every *other* route to deleting a user, e.g. the Supabase dashboard's Delete User button |
| 030 post-media not enumerable | **APPLIED** | the scoped storage select policy is live |
| 031 avatars not enumerable | **APPLIED** | owner-only avatar select policy is live |
| 032 search respects blocks | **APPLIED** | the three `find_*` functions call `is_blocked_between` |
| 033 churches | **NOT APPLIED** | no `church%` tables exist on production (checked 2026-10-24); needs Robbie's explicit word |
| 034 pin search_path | **NOT APPLIED** | written and committed only; needs Robbie's explicit word. Re-checked 2026-10-24: all 18 target functions still have no `search_path` set. |
| 035 revoke default grants (028's five tables) | **NOT APPLIED** | written and committed only; needs Robbie's explicit word. Re-checked 2026-10-24: all five tables still carry the full default grant set for `anon` and `authenticated`. |
| 036 people search: default discoverable + LIKE escaping + min query | **NOT APPLIED** | written and committed only; needs Robbie's explicit word. Re-checked 2026-10-24: `profiles.discoverable_by_name` still defaults to `false`, `find_users_by_display_name` has no `escape` clause, and `anon` still has EXECUTE. Until it runs, new accounts still default to `discoverable_by_name = false` and `find_users_by_display_name` still treats a typed `%` as a wildcard — the shipped app guards its own call sites (`searchPeopleByName` in `src/lib/supabase.ts`), which is a UI guard, not enforcement. |
| 037 prayer list (new `prayer_items` table) | **APPLIED** | Robbie ran the full file in the Supabase SQL Editor 2026-09-26 and it reported "Success. No rows returned" with no error — the table exists on production (re-checked 2026-10-24); the RLS / policies / grants detail was not re-verified. |
| 038 prayer list manual ordering (`sort_order` column) | **APPLIED** | `prayer_items.sort_order` exists on production (verified 2026-10-24); the date it was applied is not recorded here. The app selects and writes `sort_order`, so the column had to be live before that UI shipped. |
| 039 feature release stages (`feature_release`, `feature_release_log`, `set_feature_stage`, `current_user_is_owner`) | **APPLIED** | Applied 2026-10-24 by capstone-infra on Robbie's explicit word (whole file, one transaction, COMMIT). Verified read-only afterwards: 8 rows, all `live = true`; grants exactly anon/authenticated SELECT on `feature_release` and authenticated SELECT on `feature_release_log`; `set_feature_stage` not executable by anon (REST call refused 42501); anon REST UPDATE on `feature_release` refused 42501; `feature_release_log` empty. |
| 040 per-game release stages (seven `game_*` rows in `feature_release`) | **NOT APPLIED** | written and committed only; needs Robbie's explicit word. Insert-only: no function, policy or grant changes. Until it runs the app treats every game as Live (fails open) and the owner's Features tab says the per-game rows aren't stored yet. |
| 041 article read marks (new `article_reads` table) | **NOT APPLIED** | written and committed only; needs Robbie's explicit word. One new owner-only table, revoke-to-zero then grant to `authenticated`; no functions. Until it runs the app draws no "Mark this article as read" checkbox and no title check (it detects the missing table and renders nothing). Rehearsed in PGlite 2026-10-29: idempotent, RLS isolates users, `anon` refused. |
| 042 profiles privacy (owner-only `profiles`, `get_profile_cards`, `my_relation_to`, friend_requests integrity, lookups closed to anon) | **APPLIED** | Applied 2026-11-09 by capstone-infra on Robbie's explicit word (whole file, one transaction, COMMIT), after app commit 0378873 was live. Verified read-only afterwards: `profiles` SELECT policies are `profiles_select_own` + `profiles_block_filter` only; `get_profile_cards`, `my_relation_to`, `find_user_id_by_email`, `find_user_by_contact` are SECURITY DEFINER with `search_path` pinned and EXECUTE for authenticated only (anon and PUBLIC have none; anon REST calls refused 42501); `friend_requests_insert_pending_only` (restrictive) is live and `authenticated` UPDATE is limited to `responded_at,status`; anon REST GET `profiles` returns `[]`. |
| 051 About page (`about_page`, `about_page_versions`, `save_about_page`, `about_page_content_ok`) | **APPLIED** | Applied 2026-11-26 by capstone-infra on Robbie's explicit word (whole file from main 895b341, one transaction, COMMIT). Verified read-only afterwards: both tables empty; RLS on; grants exactly anon/authenticated SELECT on `about_page` and authenticated SELECT on `about_page_versions`; policies `about_page_select_all` and `about_page_versions_select_owner` only; `about_page_content_ok` executable by neither anon nor authenticated; `save_about_page` SECURITY DEFINER, `search_path` pinned, EXECUTE authenticated only; anon REST GET `about_page` returns `[]`, anon GET `about_page_versions`, anon RPC `save_about_page` and anon INSERT `about_page` refused 42501; a simulated non-owner `authenticated` session sees 0 versions, `save_about_page` refused 42501 "not authorized", INSERT refused 42501 (rolled back); live /about signed out shows the built-in text, its `about_page` read returns 200, no console errors. No owner save was made (check 5 left to the owner). As written before applying: Two new tables, revoke-to-zero then `select` back (anon+authenticated on `about_page`, authenticated on `about_page_versions` with an owner-only policy); one owner-only SECURITY DEFINER writer with pinned `search_path`, no user-id argument. Seeds nothing, so applying it changes nothing readers see. Until it runs, readers get the built-in text from `src/data/aboutPage.ts` and the editor says saving is off. Rehearsed in PGlite 2026-11-26 (`scripts/sql-rehearsal/051_about_page.mjs`, 42 checks): idempotent, grants exact, anon/member/administrator refused, validation, 40001 conflicts, rollback. |
| 052 report categories + voting off (`report_categories` rows; `report_vote()` EXECUTE; `report_votes` write policies) | **APPLIED** | Applied 2026-11-26 by capstone-infra on Robbie's explicit word (whole file from main b906776, one transaction, its own in-file checks passed, COMMIT). Pre-checks matched the file: 025 objects present; the six 025 categories; `report_votes` had insert/update/delete/select policies; `report_vote()` executable by anon (via PUBLIC) and authenticated; 1 report, 0 votes. Verified read-only afterwards: 10 active categories in the file's order (`incorrect_info` "Content error (article, map or timeline facts)" … `other` "Other"), `typo` kept with `is_active = false`; no orphaned report categories; `report_vote()` ACL is postgres + service_role only; `report_votes` policies are `report_votes_select_advisor` only, RLS still on for `reports`, `report_votes`, `report_categories`; `reports` policies unchanged; row counts unchanged (1 report, still `bug`; 0 votes; vote/priority sums 0). Anon REST: `report_categories` returns the 10 active rows, `reports` and `report_votes` return `[]`, RPC `report_vote` refused 42501. The live site's own form query (`fetchCategories`, run from capstonebible.com with its bundled publishable key) returns the 10 new labels; the form itself is behind sign-in and was not opened. No report or vote was written. |
| 056 groups add-member consent (`add_group_member`, `create_group`) | **NOT APPLIED** | written and committed on `social-reenable` only; needs Robbie's explicit word. Read 2026-11-28: both functions still add any account id with no friendship or block check, have no `search_path`, and are EXECUTE-able by anon. |

**Regenerate `000_baseline.sql` when a migration is APPLIED, not when one is committed.** A
baseline regenerated off a commit would record a schema that does not exist.

---

## Things that will bite you if you clone the groups pattern

### Every new table starts fully granted to `anon` and `authenticated`

This is the one that has already bitten a migration in this directory. Supabase ships the project
with a default ACL:

```
pg_default_acl, role postgres, schema public, object type "r":
  anon=arwdDxtm/postgres | authenticated=arwdDxtm/postgres
```

`arwdDxtm` is every table privilege there is — INSERT, SELECT, UPDATE, DELETE, TRUNCATE,
REFERENCES, TRIGGER, MAINTAIN — applied at `create table` time. **So a `grant select, insert on t
to authenticated` in a new migration changes nothing.** It re-grants what is already there and
leaves UPDATE, DELETE and TRUNCATE standing. The file then reads as a description of a grant set
the database does not have, which is worse than having written nothing.

**Revoke to zero first, then grant back:**

```sql
revoke all on t from anon, authenticated;
grant select, insert on t to authenticated;
```

Verified against production on 2026-09-10: **43 of the 44 tables carry the full default set for
both client roles.** `messages` is the only exception, because `sql/024` revoked UPDATE and
granted back a single column.

Two migrations get the pattern right, and for different reasons: `033_churches` revokes all four
of its tables to zero first and uses column-level grants, and `024_message_update_columns` revokes
UPDATE before granting `update (read_at)`. Every other table-creating migration —
`001`, `008`, `011`, `017`, `018`, `019`, `025`, `028` — granted without revoking. (`019`, `021`,
`025` and `026` do contain `revoke`s, but every one of them is `revoke execute on function`, which
is a different and unrelated trap: Postgres grants function EXECUTE to `PUBLIC` by default, so
functions need revoking too.)

**RLS is what has been holding this, and it has held.** On all five `028` tables an UPDATE or
DELETE from a signed-in user plans as `One-Time Filter: false` — no policy applies, zero rows.
Nothing was ever exposed. But note what the second layer is worth: add one permissive `for all`
policy to a table later and the UPDATE grant already sitting there goes live in the same
statement, to `anon` as well, with no GRANT in the diff for anyone to review.

And note the one privilege RLS would *not* catch: **TRUNCATE is not subject to row security.** It
is not reachable through PostgREST, and `anon` and `authenticated` are both NOLOGIN so nobody can
open a session as them — but it is the reason "RLS covers it" is not a complete answer.

`sql/035` fixes the five tables `028` created. The other 38 are untouched and fixing them is a
separate decision — it means deriving the right grant set for every table from its policies and
its call sites, and getting one wrong takes a working feature off the live site.

### `is_group_member` / `is_group_admin` are the load-bearing helpers

Nearly every policy on `groups`, `group_members`, `group_messages`, `group_join_requests` and
`group_message_reads` calls one of these two `SECURITY DEFINER` functions. That is deliberate and
you should copy it: a policy on `group_members` that reads `group_members` directly earns a
Postgres **42P17, infinite recursion detected in policy**. This project has paid for that twice —
`sql/003` and `sql/012` are both named `fix_rls_recursion`. A `SECURITY DEFINER` helper bypasses
RLS on the table it reads, which is what breaks the cycle.

Neither helper is in `sql/` — both were typed into the Supabase dashboard before this directory
existed. `000_baseline.sql` is the only written description of them that exists.

### 18 `SECURITY DEFINER` functions have no `SET search_path`

Including both helpers above. `sql/034_pin_search_path.sql` fixes this and is **committed but not
applied**. If you clone these functions for a new feature, **pin `search_path` in the new copies
from the start** — `SET search_path TO 'public', 'pg_temp'`, which is what the other 64
`SECURITY DEFINER` functions already do. Do not clone the omission forward.

### `group_messages` enforces one pin per group in the INDEX, not in the function

```sql
CREATE UNIQUE INDEX group_messages_one_pin_per_group
  ON public.group_messages USING btree (group_id) WHERE pinned;
```

A partial unique index. This is why `pin_group_message()` clears the existing pin **before**
setting the new one — an "insert the new pin first" ordering raises a unique violation. If you
clone pinning for a new message table, clone the index and the clear-then-set ordering together,
or you will ship a pin button that throws on the second use.

### `admin_users` is a VIEW, and `admin_users_legacy` is dead

`sql/025` made `user_roles` the single source of truth for admin-ness. It:

- copied every row of the old hand-made `admin_users` table into `user_roles` as `administrator`,
- **renamed the physical table to `admin_users_legacy`** — a rename, not a drop, so the rows are
  still there,
- recreated `admin_users` as a **view over `user_roles`** (`security_invoker = true`) filtering
  `role IN ('administrator', 'owner')`, so the one client query that reads it kept working.

So: `admin_users` is a view over **`user_roles`**, *not* over `admin_users_legacy`. Nothing in
`sql/` touches `admin_users_legacy` at all and nothing reads it. Do not treat it as live data, and
do not wire anything new to either it or the `admin_users` view — **check roles with
`has_role_at_least()` / `is_admin()`**, which is what everything written since 025 does.

---

## Before you add a migration

1. Take the next number from the table at the top of this file — not from `ls`.
2. Read the relevant part of `000_baseline.sql` first. Eighteen tables and eighteen functions on
   production have no `create` statement anywhere in this directory; that file is their only
   description.
3. Migrations are **append-only**. Never edit or renumber one that has been applied.
4. Update this file's tables when you claim a number or when a migration is actually applied.

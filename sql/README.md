# `sql/` — how the numbering works, and what is actually live

Read this before you write a migration. It exists because the same three facts have been
rediscovered from scratch more than once, each time by counting files in this directory — which
is exactly the thing that gives you the wrong answer.

Last verified against production: **2026-10-24** (read-only catalog queries for 027, 029, 033-039).
`sql/000_baseline.sql` is a separate photograph from 2026-09-11 and predates 037-039.

---

## The next free number is 049

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
| **043** | `043_paid_content.sql` — Capstone Plus phase 1: `content_paid`, `entitlements`, `entitlement_events`, `has_entitlement()`, owner comp RPCs, switch `paid.everyone_has_plus` (ships true). Depends on 025 only. Committed on branch `paid-content`, **not applied**. Proof: `sql/tests/043_paid_content_test.sql`; steps: `scripts/paid-content/README.md`. |
| **044** | `044_admin_user_invites.sql` — on main (branch `admin-add-user`), **not applied**. Taken; do not reuse. |
| **045** | `045_stripe_billing.sql` — Capstone Plus web payments: `stripe_customers`, `subscriptions`, `stripe_events`, `billing_status()`, service-role-only webhook RPCs that derive the `stripe` row in `entitlements`; switches `paid.billing_enabled` and `paid.billing_owner_preview` (both ship false). Depends on 025 and 043. Committed on branch `paid-payments`, **not applied**. Proof: `sql/tests/045_stripe_billing_test.sql` (`node scripts/stripe/rls-test.mjs --local`); runbook: `supabase/functions/STRIPE-SETUP.md`. |
| **046** | `046_study_collections.sql` — Capstone Plus Study Collections: owner-only `study_collections` and `study_collection_items` (kind, ref_id), insert/update gated by `has_entitlement('plus')`, read/delete own rows always, caps 100 collections / 500 items, cascade on user delete, `reorder_study_collection_items()`. Depends on 025 and 043 (not 045). Committed on branch `plus-study-collections`, **not applied**. Proof: `sql/tests/046_study_collections_test.sql` (`node scripts/study-collections/rls-test.mjs --local`). |
| **047** | `047_groups_classes.sql` — Capstone Plus for Groups, phases 1-2 (admin pays): `churches.kind` (church/school), `classes`, `class_staff`, `class_members`, `class_agreement_versions`, `class_agreements` (audit, no FK to auth.users), `class_billing`, `class_join_attempts`, `class_invites` + `invite_suppressions` (structure only), `entitlements.source` + `'group'`, private `org-logos` bucket, switches `paid.groups_enabled` / `paid.groups_owner_preview` (both ship false). Students see only their own row; staff only their own class; no client writes. ALSO FIXES two sql/033 bugs that made the account of anyone who registered a church (or is a church's last admin) undeletable. Depends on 025, 033, 043, 045. Committed on branch `groups-classes`, **not applied**. Proof: `sql/tests/047_groups_classes_test.sql` (`node scripts/groups/rls-test.mjs --local`, and `--mutations` breaks 20 rules one at a time and shows each is caught). Edited in place on branch `groups-invites` (still unapplied): the membership helpers `is_class_staff/owner/member(class_id)` and `can_view_org_logo(org_id)` are now SELF-ONLY (no caller-supplied user id), and 033's `church_role_at_least` answers FALSE for any uid other than `auth.uid()` — an outsider who knew two UUIDs could otherwise ask who is in a class or an org. |
| **048** | `048_groups_assignments.sql` — Capstone Plus for Groups phase 4: `assignments`, `assignment_readings` (typed deep-link refs), `assignment_questions` (mc/tf/short/essay, never the answer), `assignment_question_keys` (NO client grant), `assignment_submissions` (one per student per assignment), `assignment_answers`, `assignment_grade_events` (regrade audit), `class_export_log`. NO client table grant on any of them; every read/write is a SECURITY DEFINER RPC; the grader is `submit_assignment()`. Questions/keys lock once a student starts; late penalty snapshotted at submit. Depends on 025, 033, 043, 045, 047. Committed on branch `groups-assignments`, **not applied**. Proof: `sql/tests/048_groups_assignments_test.sql` (`node scripts/groups/assignments-rls-test.mjs --local`; `--mutations` breaks 24 rules one at a time and each is caught). |
| **049** | Next genuinely free number. |

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
021 022 023 024 025 026 027 028 029 030 031 032 033 034 035 036 037 038 039 040 041 042
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

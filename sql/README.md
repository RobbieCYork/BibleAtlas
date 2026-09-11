# `sql/` — how the numbering works, and what is actually live

Read this before you write a migration. It exists because the same three facts have been
rediscovered from scratch more than once, each time by counting files in this directory — which
is exactly the thing that gives you the wrong answer.

Last verified against production: **2026-09-11** (from `sql/000_baseline.sql`, which was generated
by a read-only dump of the live database on that date).

---

## The next free number is 034

| Number | Status |
|---|---|
| **033** | **TAKEN — Capstone for Churches.** Claimed 2026-09-11 while that migration was being written. Do not take it. |
| **034** | `034_pin_search_path.sql` — committed, **not applied**. See below. |
| **035** | Next genuinely free number. |

### Numbers that are TAKEN but MISSING from this directory

`ls sql/` does not list these, and they are **not** free slots:

- **006** — history. Never reuse.
- **020** — history. Never reuse.
- **029** — `029_account_deletion_fk_hygiene.sql` **exists on the unmerged `account-deletion`
  branch**, not on `main`. This is the one most likely to be reused by mistake, because on `main`
  it looks identical to an accidental gap. It is not. Never reuse.

The full list present on `main`:

```
001 002 003 004 005 007 008 009 010 011 012 013 014 015 016 017 018 019
021 022 023 024 025 026 027 028 030 031 032 034
```

`000_baseline.sql` is **not** a migration. It is a photograph of the live schema, numbered `000`
so it sorts above `001` and cannot be mistaken for the next free slot. **Never run it** — its
`create table`s would error against production but its `CREATE OR REPLACE FUNCTION`s would not,
so a partial run would silently overwrite live functions.

---

## Committed is not applied

A file sitting in this directory is **not** evidence that it has been run against production.
Verified against the live database on 2026-09-11:

| Migration | On production? | Evidence |
|---|---|---|
| 027 sermon-note images | **NOT APPLIED** | no `sermon-note-images` storage bucket exists |
| 028 moderation | **APPLIED** | `user_blocks` + the `*_block_filter` policies are live |
| 029 account-deletion FK hygiene | **NOT APPLIED** | and not on `main`; both `winner_id` FKs still `NO ACTION` |
| 030 post-media not enumerable | **APPLIED** | the scoped storage select policy is live |
| 031 avatars not enumerable | **APPLIED** | owner-only avatar select policy is live |
| 032 search respects blocks | **APPLIED** | the three `find_*` functions call `is_blocked_between` |
| 034 pin search_path | **NOT APPLIED** | written and committed only; needs Robbie's explicit word |

**Regenerate `000_baseline.sql` when a migration is APPLIED, not when one is committed.** A
baseline regenerated off a commit would record a schema that does not exist.

---

## Things that will bite you if you clone the groups pattern

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

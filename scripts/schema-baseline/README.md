# `sql/000_baseline.sql` — the schema nobody could read

## Why this exists

`sql/` is numbered and append-only, but it does not start at the beginning. **18 of the 44
tables on production have no `create table` anywhere in the repo** — including `groups`,
`group_members`, `group_join_requests`, `group_messages`, `sermon_notes`, `notes`, `highlights`,
`tags`, `verse_tags`, `profiles` and `messages`. They were typed into the Supabase SQL editor
before `sql/` existed. `sql/014`'s own header says so.

The cost of that is not theoretical. This project has two migrations named `fix_rls_recursion`
(`003` and `012`), both cleaning up a Postgres **42P17 — infinite recursion detected in policy**.
That error happens when a policy on a table reads that same table. You cannot avoid writing one
if you cannot read the policies already there.

`000_baseline.sql` is the fix: a full, dated read of production — every table, column, default,
constraint, index, foreign key, trigger, grant, view, function, and **every RLS policy with its
complete `USING` and `WITH CHECK` expression** — with each object labelled as either "created by
migration NNN" or "hand-made in the dashboard".

## It is documentation. Never run it.

`000` sorts above `001` so it cannot be mistaken for the next free number. The file is full of
bare `create table` and `CREATE OR REPLACE FUNCTION` statements reconstructed from `pg_catalog`.
Against production the `create table`s error and the `CREATE OR REPLACE FUNCTION`s **do not** —
they would silently overwrite live functions. There is no situation in which applying it is right.

## Regenerating

`pg` is not a runtime dependency of the app and must not become one — install it transiently:

```
cd capstone-bible
npm i --no-save pg
node scripts/schema-baseline/dump-schema.mjs
```

The script reads `SUPABASE_DB_URL` from `.env.local`. It issues nothing but `SELECT`s against
`pg_catalog` / `information_schema`, reads **zero application rows**, scrubs the host, user and
password out of every error message, and refuses to leave a file behind that contains a
connection string. Never paste the connection string into a shell you are logging, a commit, or a
report.

There is no `psql` or `pg_dump` on the project machine, which is why this is a Node script rather
than `pg_dump --schema-only`. If a libpq ever gets installed, `pg_dump --schema-only --no-owner
--no-privileges` is *not* a drop-in replacement: it does not annotate which objects came from a
migration, which is the entire point of the file.

`CB_REPO=/path/to/capstone-bible node run.mjs` lets you run a copy from a scratch directory that
has `pg` installed, so the repo's own `node_modules` is never mutated while other agents are
building in it.

## Keeping it honest

Regenerate after any migration is **applied** — not when one is committed. The header records
which of the committed migrations are actually live on production, and that distinction is the
one this repo has got wrong before.

The cross-reference excludes `000_baseline.sql` itself from its scan of `sql/`. It has to: the
baseline contains a `create table` for every table, and counting it would report every hand-made
table as tracked and erase the only thing the file is for.

#!/usr/bin/env node
// rls-test.mjs — rehearse sql/047 (Capstone Plus for Groups) and run its access-rule proof somewhere
// that is NOT production. Same shape as scripts/stripe/rls-test.mjs and scripts/study-collections/.
//
//   Local, throwaway, no account needed (Postgres compiled to WASM, in-process):
//     npm i --no-save @electric-sql/pglite          # or install it anywhere and set PGLITE_MODULE
//     node scripts/groups/rls-test.mjs --local
//
//   The mutation proof — break one rule at a time and show the test FAILS for each:
//     node scripts/groups/rls-test.mjs --local --mutations
//
// Applies a minimal Supabase stand-in (roles, auth, storage, a `profiles` / `sermon_notes` /
// is_blocked_between() stand-in for the live objects sql/033 touches), then the REAL sql/025, 033,
// 043, 045, 047 (047 twice, to prove it is idempotent), then the REAL
// sql/tests/047_groups_classes_test.sql, which ends in ROLLBACK.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

if (!process.argv.includes("--local")) {
  console.error("usage: rls-test.mjs --local [--mutations]   (staging: apply 033, 043, 045, 047 then run sql/tests/047_groups_classes_test.sql with psql)");
  process.exit(2);
}

const SUPABASE_STUB = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, is_anonymous boolean not null default false);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Live objects sql/033 / 047 reference (their real definitions are in sql/000_baseline.sql).
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, avatar_url text);
create table public.sermon_notes (id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, title text, body text,
  created_at timestamptz default now(), updated_at timestamptz default now());
create function public.is_blocked_between(a uuid, b uuid) returns boolean language sql stable as $$ select false $$;

-- Storage, as Supabase ships it in shape: buckets, RLS-protected objects granted to the client roles.
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text not null, owner uuid, created_at timestamptz default now(), unique (bucket_id, name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
`;

let PGlite, pgcrypto;
try {
  const base = process.env.PGLITE_MODULE;
  ({ PGlite } = await import(base ? pathToFileURL(base).href : "@electric-sql/pglite"));
  ({ pgcrypto } = await import(
    base ? pathToFileURL(path.join(path.dirname(base), "contrib/pgcrypto.js")).href : "@electric-sql/pglite/contrib/pgcrypto"
  ));
} catch {
  console.error("NOT RUN: @electric-sql/pglite is not installed (npm i --no-save @electric-sql/pglite, or set PGLITE_MODULE)");
  process.exit(3);
}

const MIGRATION = "sql/047_groups_classes.sql";
const TEST = "sql/tests/047_groups_classes_test.sql";

/** Runs the whole stack once. Returns { ok, failedAt, error, notices }. */
async function runStack(migrationSql, { quiet = false } = {}) {
  const notices = [];
  const db = new PGlite({ extensions: { pgcrypto } });
  const steps = [
    ["supabase stand-in", SUPABASE_STUB],
    ["sql/025_roles_and_reports.sql", read("sql/025_roles_and_reports.sql")],
    ["sql/033_churches.sql", read("sql/033_churches.sql")],
    ["sql/043_paid_content.sql", read("sql/043_paid_content.sql")],
    ["sql/045_stripe_billing.sql", read("sql/045_stripe_billing.sql")],
    [MIGRATION, migrationSql],
    [`${MIGRATION} (again: idempotent)`, migrationSql],
    [TEST, read(TEST)],
  ];
  for (const [label, sql] of steps) {
    try {
      await db.exec(sql, { onNotice: (n) => notices.push(n.message) });
      if (!quiet) console.log(`ok   ${label}`);
    } catch (e) {
      await db.close().catch(() => {});
      return { ok: false, failedAt: label, error: e.message, notices };
    }
  }
  await db.close().catch(() => {});
  const ok = notices.some((n) => n.includes("ALL 047 CHECKS PASSED"));
  return { ok, failedAt: ok ? null : TEST, error: ok ? null : "final notice never arrived", notices };
}

if (!process.argv.includes("--mutations")) {
  const r = await runStack(read(MIGRATION));
  for (const n of r.notices) console.log(`  ${n}`);
  if (!r.ok) {
    console.error(`FAIL ${r.failedAt}: ${r.error}`);
    process.exit(1);
  }
  console.log("ALL 047 CHECKS PASSED");
  process.exit(0);
}

// ------------------------------------------------------------------------------------- mutations
// Each one deliberately breaks ONE rule of the migration. The test must fail for every one of them;
// a mutation the test survives is a rule nothing is checking.
const MUTATIONS = [
  {
    name: "students can read classmates' membership rows",
    find: "  using (user_id = auth.uid() or public.is_class_staff(class_id));\n\n-- class_agreements",
    replace: "  using (user_id = auth.uid() or public.is_class_staff(class_id) or public.is_class_member(class_id));\n\n-- class_agreements",
  },
  {
    name: "students can read the classes table (seat counts, join code)",
    find: "  using (public.is_class_staff(id) or public.has_role_at_least('owner'));",
    replace: "  using (public.is_class_staff(id) or public.is_class_member(id) or public.has_role_at_least('owner'));",
  },
  {
    name: "the revoke-to-zero on classes is dropped (Supabase default ACL left standing)",
    find: "revoke all on public.classes                  from anon, authenticated, public;",
    replace: "",
  },
  {
    name: "the webhook write path is executable by signed-in users",
    find: "\ncommit;\n",
    replace:
      "\ngrant execute on function public.group_apply_subscription_event(text, text, timestamptz, boolean, uuid, uuid, text, jsonb) to authenticated;\ncommit;\n",
  },
  {
    name: "anon can call join_class",
    find: "\ncommit;\n",
    replace: "\ngrant execute on function public.join_class(text) to anon;\ncommit;\n",
  },
  {
    name: "is_class_staff ignores the class id (cross-class access)",
    find: "    select 1 from public.class_staff s where s.class_id = p_class_id and s.user_id = p_uid);",
    replace: "    select 1 from public.class_staff s where s.user_id = p_uid);",
  },
  {
    name: "the seat limit is not enforced on join",
    find: "  if v_active >= v_class.seats_purchased then",
    replace: "  if false then",
  },
  {
    name: "the agreement text hash is not checked",
    find: "                  where v.version = v_version and v.text_sha256 = v_sha) then",
    replace: "                  where v.version = v_version) then",
  },
  {
    name: "class_members does not cascade on account deletion",
    find: "  user_id     uuid        not null references auth.users(id) on delete cascade,\n  joined_at",
    replace: "  user_id     uuid        not null references auth.users(id),\n  joined_at",
  },
  {
    name: "033's last-admin guard still blocks deleting a teacher's account",
    find: "     and exists (select 1 from auth.users u where u.id = old.user_id)\n",
    replace: "",
  },
  {
    name: "033's churches trigger still restores created_by (blocks account deletion)",
    find: "  new.created_by := case when new.created_by is null then null else old.created_by end;",
    replace: "  new.created_by := old.created_by;",
  },
  {
    name: "an older Stripe event overwrites newer billing state",
    find: "    where b.last_event_at <= excluded.last_event_at;",
    replace: ";",
  },
  {
    name: "join-code guessing is not rate limited",
    find: "  if v_tries >= 20 then",
    replace: "  if false then",
  },
  {
    name: "a member keeps Plus after leaving (removed seats still entitle)",
    find: "                       where m.class_id = c.id and m.user_id = p_user_id and m.seat_state = 'active')\n         )",
    replace: "                       where m.class_id = c.id and m.user_id = p_user_id)\n         )",
  },
  {
    name: "my_classes drops the classes a member is in",
    find: "         where m.user_id = v_uid and m.seat_state = 'active'\n      ) q",
    replace: "         where false\n      ) q",
  },
  {
    name: "members-only: guests may create classes",
    find: "    raise exception 'guest_account: create a free account first' using errcode = '42501';",
    replace: "    null;",
  },
  {
    name: "the 5-seat minimum is not enforced in the RPC (the table CHECK is the second wall)",
    find: "  if v_seats < 5 then",
    replace: "  if v_seats < 1 then",
  },
];

const original = read(MIGRATION);
let survived = 0;
console.log("baseline (unmutated) run:");
const base = await runStack(original, { quiet: true });
if (!base.ok) {
  console.error(`FAIL the unmutated stack does not pass: ${base.failedAt}: ${base.error}`);
  process.exit(1);
}
console.log("  ok   ALL 047 CHECKS PASSED");
for (const m of MUTATIONS) {
  if (!original.includes(m.find)) {
    console.error(`BROKEN MUTATION (text not found in ${MIGRATION}): ${m.name}`);
    survived++;
    continue;
  }
  const r = await runStack(original.replace(m.find, m.replace), { quiet: true });
  if (r.ok) {
    console.error(`SURVIVED  ${m.name}`);
    survived++;
  } else {
    const why = (r.error || "").replace(/\s+/g, " ").slice(0, 140);
    console.log(`caught    ${m.name}\n          -> ${r.failedAt}: ${why}`);
  }
}
if (survived) {
  console.error(`${survived} mutation(s) survived`);
  process.exit(1);
}
console.log(`ALL ${MUTATIONS.length} MUTATIONS CAUGHT`);

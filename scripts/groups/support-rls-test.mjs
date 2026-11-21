#!/usr/bin/env node
// support-rls-test.mjs — rehearse sql/050 (Groups: audited owner support access) and run its access-rule
// proof somewhere that is NOT production. Same shape as rls-test.mjs (047) and
// assignments-rls-test.mjs (048).
//
//   Local, throwaway, no account needed (Postgres compiled to WASM, in-process):
//     npm i --no-save @electric-sql/pglite          # or install it anywhere and set PGLITE_MODULE
//     node scripts/groups/support-rls-test.mjs --local
//
//   The mutation proof — break one rule at a time and show the test FAILS for each:
//     node scripts/groups/support-rls-test.mjs --local --mutations
//
// Applies the Supabase stand-in (auth.users WITH email_confirmed_at), the REAL sql/025, 033, 043, 045,
// 047, 048, 049, then 050 twice (idempotent), then the REAL sql/tests/050_groups_support_access_test.sql (ROLLBACK).
// No network, no email: the database cannot send anything, and the reminder clock is a parameter.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

if (!process.argv.includes("--local")) {
  console.error("usage: support-rls-test.mjs --local [--mutations]   (staging: apply 033, 043, 045, 047-050 then run sql/tests/050_groups_support_access_test.sql with psql)");
  process.exit(2);
}

const SUPABASE_STUB = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, is_anonymous boolean not null default false, email_confirmed_at timestamptz);
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

const MIGRATION = "sql/050_groups_support_access.sql";
const TEST = "sql/tests/050_groups_support_access_test.sql";

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
    ["sql/047_groups_classes.sql", read("sql/047_groups_classes.sql")],
    ["sql/048_groups_assignments.sql", read("sql/048_groups_assignments.sql")],
    ["sql/049_groups_invites.sql", read("sql/049_groups_invites.sql")],
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
  const ok = notices.some((n) => n.includes("ALL 050 CHECKS PASSED"));
  return { ok, failedAt: ok ? null : TEST, error: ok ? null : "final notice never arrived", notices };
}

if (!process.argv.includes("--mutations")) {
  const r = await runStack(read(MIGRATION));
  for (const n of r.notices) console.log(`  ${n}`);
  if (!r.ok) {
    console.error(`FAIL ${r.failedAt}: ${r.error}`);
    process.exit(1);
  }
  console.log("ALL 050 CHECKS PASSED");
  process.exit(0);
}

// ------------------------------------------------------------------------------------- mutations
// Each one deliberately breaks ONE rule of the migration. The test must fail for every one of them;
// a mutation the test survives is a rule nothing is checking.
const MUTATIONS = [
  {
    name: "a non-owner (any signed-in user) can look up a roster",
    find: "  if auth.uid() is null or not public.has_role_at_least('owner') then",
    replace: "  if auth.uid() is null then",
  },
  {
    name: "an administrator counts as the owner",
    find: "  if auth.uid() is null or not public.has_role_at_least('owner') then",
    replace: "  if auth.uid() is null or not public.has_role_at_least('administrator') then",
  },
  {
    name: "the reason is not required",
    find: "  if char_length(v_reason) < 10 then",
    replace: "  if false then",
  },
  {
    name: "a roster lookup is not logged",
    find: "  insert into public.class_support_access_log (class_id, actor, kind, reason) values (p_class_id, auth.uid(), 'roster', v_reason);",
    replace: "",
  },
  {
    name: "a gradebook lookup is not logged",
    find: "  insert into public.class_support_access_log (class_id, actor, kind, reason) values (p_class_id, auth.uid(), 'gradebook', v_reason);",
    replace: "",
  },
  {
    name: "students can read the support log",
    find: "  if not public.is_class_staff(p_class_id) then\n    raise exception 'not_class_staff' using errcode = '42501';\n  end if;\n  return jsonb_build_object(\n    'grant'",
    replace: "  if not (public.is_class_staff(p_class_id) or public.is_class_member(p_class_id)) then\n    raise exception 'not_class_staff' using errcode = '42501';\n  end if;\n  return jsonb_build_object(\n    'grant'",
  },
  {
    name: "the gradebook needs no grant",
    find: "  if not exists (select 1 from public.class_support_grants g\n                  where g.class_id = p_class_id and g.revoked_at is null and g.expires_at > now()) then",
    replace: "  if false then",
  },
  {
    name: "an expired grant still works",
    find: "                  where g.class_id = p_class_id and g.revoked_at is null and g.expires_at > now()) then",
    replace: "                  where g.class_id = p_class_id and g.revoked_at is null) then",
  },
  {
    name: "a co-teacher can grant support access",
    find: "  if not public.is_class_owner(p_class_id) then\n    raise exception 'not_class_owner: only",
    replace: "  if not public.is_class_staff(p_class_id) then\n    raise exception 'not_class_owner: only",
  },
  {
    name: "invite addresses are not masked",
    find: "    'invites', coalesce((select jsonb_agg(jsonb_build_object('address', public.support_mask_email(i.address),",
    replace: "    'invites', coalesce((select jsonb_agg(jsonb_build_object('address', i.address,",
  },
  {
    name: "no rate limit",
    find: "       where l.actor = auth.uid() and l.kind in ('search', 'roster', 'gradebook') and l.at > now() - interval '1 hour') >= 30 then",
    replace: "       where false) >= 30 then",
  },
  {
    name: "the support log is readable as a table",
    find: "\ncommit;\n",
    replace: "\ngrant select on public.class_support_access_log to authenticated;\ncommit;\n",
  },
  {
    name: "the roster carries submissions",
    find: "    'invites', coalesce(",
    replace: "    'submissions', (select jsonb_agg(jsonb_build_object('final_score', s.final_score)) from public.assignment_submissions s where s.class_id = p_class_id),\n    'invites', coalesce(",
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
console.log("  ok   ALL 050 CHECKS PASSED");
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

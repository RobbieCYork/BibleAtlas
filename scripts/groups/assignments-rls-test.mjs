#!/usr/bin/env node
// assignments-rls-test.mjs — rehearse sql/048 (Groups phase 4: assignments + grading) and run its
// access-rule proof somewhere that is NOT production. Same shape as scripts/groups/rls-test.mjs (047).
//
//   Local, throwaway, no account needed (Postgres compiled to WASM, in-process):
//     npm i --no-save @electric-sql/pglite          # or install it anywhere and set PGLITE_MODULE
//     node scripts/groups/assignments-rls-test.mjs --local
//
//   The mutation proof — break one rule at a time and show the test FAILS for each:
//     node scripts/groups/assignments-rls-test.mjs --local --mutations
//
// Applies the same Supabase stand-in as rls-test.mjs, then the REAL sql/025, 033, 043, 045, 047, then
// 048 twice (idempotent), then the REAL sql/tests/048_groups_assignments_test.sql (ends in ROLLBACK).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

if (!process.argv.includes("--local")) {
  console.error("usage: assignments-rls-test.mjs --local [--mutations]   (staging: apply 033, 043, 045, 047, 048 then run sql/tests/048_groups_assignments_test.sql with psql)");
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

const MIGRATION = "sql/048_groups_assignments.sql";
const TEST = "sql/tests/048_groups_assignments_test.sql";

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
  const ok = notices.some((n) => n.includes("ALL 048 CHECKS PASSED"));
  return { ok, failedAt: ok ? null : TEST, error: ok ? null : "final notice never arrived", notices };
}

if (!process.argv.includes("--mutations")) {
  const r = await runStack(read(MIGRATION));
  for (const n of r.notices) console.log(`  ${n}`);
  if (!r.ok) {
    console.error(`FAIL ${r.failedAt}: ${r.error}`);
    process.exit(1);
  }
  console.log("ALL 048 CHECKS PASSED");
  process.exit(0);
}

// ------------------------------------------------------------------------------------- mutations
// Each one deliberately breaks ONE rule of the migration. The test must fail for every one of them;
// a mutation the test survives is a rule nothing is checking.
const MUTATIONS = [
  {
    name: "the answer keys are readable by signed-in users (grant + permissive policy)",
    find: "\ncommit;\n",
    replace:
      "\ngrant select on public.assignment_question_keys to authenticated;\ndrop policy if exists k_all on public.assignment_question_keys;\ncreate policy k_all on public.assignment_question_keys for select to authenticated using (true);\ncommit;\n",
  },
  {
    name: "the revoke-to-zero on submissions is dropped (Supabase default ACL left standing)",
    find: "revoke all on public.assignment_submissions   from anon, authenticated, public;",
    replace: "",
  },
  {
    name: "anon can call submit_assignment",
    find: "\ncommit;\n",
    replace: "\ngrant execute on function public.submit_assignment(uuid, jsonb) to anon;\ncommit;\n",
  },
  {
    name: "an internal helper (the grader's answer writer) is callable by clients",
    find: "\ncommit;\n",
    replace: "\ngrant execute on function public.asg_write_answers(uuid, uuid, jsonb) to authenticated;\ncommit;\n",
  },
  {
    name: "my_assignment sends the correct answers before the work is returned",
    find: "               'correct', case when v_key and q.qtype = 'mc' then to_jsonb(k.correct_choice)",
    replace: "               'correct', case when q.qtype = 'mc' then to_jsonb(k.correct_choice)",
  },
  {
    name: "my_assignment sends accepted short answers to every student",
    find: "               'accepted', case when v_key and q.qtype = 'short' then to_jsonb(k.accepted_answers) end)",
    replace: "               'accepted', case when q.qtype = 'short' then to_jsonb(k.accepted_answers) end)",
  },
  {
    name: "a student sees their score before the teacher returns it",
    find: "  v_num := coalesce(v_ret and v_c.scores_visible, false);",
    replace: "  v_num := true;",
  },
  {
    name: "scores_visible is ignored (church groups show numbers)",
    find: "  v_num := coalesce(v_ret and v_c.scores_visible, false);",
    replace: "  v_num := coalesce(v_ret, false);",
  },
  {
    name: "the app owner can read a class's gradebook",
    find: "begin\n  if not public.is_class_staff(p_class_id) then\n    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';\n  end if;\n  return jsonb_build_object(\n    'students'",
    replace: "begin\n  if not (public.is_class_staff(p_class_id) or public.has_role_at_least('owner')) then\n    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';\n  end if;\n  return jsonb_build_object(\n    'students'",
  },
  {
    name: "a classmate can open another student's submission",
    find: "  select * into v_s from public.assignment_submissions where id = p_submission_id;\n  if v_s.id is null or not public.is_class_staff(v_s.class_id) then",
    replace: "  select * into v_s from public.assignment_submissions where id = p_submission_id;\n  if v_s.id is null or not (public.is_class_staff(v_s.class_id) or public.is_class_member(v_s.class_id)) then",
  },
  {
    name: "a teacher can read a student's unsubmitted draft",
    find: "  if v_s.status = 'draft' then\n    raise exception 'not_submitted: this work has not been submitted yet' using errcode = '22023';\n  end if;\n  return jsonb_build_object(",
    replace: "  return jsonb_build_object(",
  },
  {
    name: "questions and keys can be changed after students started (no lock)",
    find: "    if v_locked then\n      raise exception 'assignment_locked",
    replace: "    if false then\n      raise exception 'assignment_locked",
  },
  {
    name: "a student can submit twice",
    find: "  if v_s.status <> 'draft' then\n    raise exception 'already_submitted",
    replace: "  if false then\n    raise exception 'already_submitted",
  },
  {
    name: "a returned grade can be changed with no reason (silent regrade)",
    find: "  if v_s.status = 'returned' and v_changed and v_reason is null then",
    replace: "  if false then",
  },
  {
    name: "the late penalty is not applied",
    find: "  v_pct := case when v_s.penalty_waived then 0 else v_s.late_penalty_pct end;",
    replace: "  v_pct := 0;",
  },
  {
    name: "late work is accepted when the teacher said no late work",
    find: "  if v_a.due_at is not null and now() > v_a.due_at and not v_a.accept_late then",
    replace: "  if false then",
  },
  {
    name: "short answers are matched case-sensitively",
    find: "  select btrim(regexp_replace(regexp_replace(btrim(lower(coalesce(p, ''))), '\\s+', ' ', 'g'), '[.!?]+$', ''));",
    replace: "  select btrim(coalesce(p, ''));",
  },
  {
    name: "students can save work after the class ended",
    find: "  if not public.class_is_open(v_a.class_id) then\n    raise exception 'class_closed: this class or group has ended, so work",
    replace: "  if false then\n    raise exception 'class_closed: this class or group has ended, so work",
  },
  {
    name: "grading never closes after the class ends",
    find: "                   + interval '30 days');",
    replace: "                   + interval '3000 days');",
  },
  {
    name: "a removed student still opens the class's assignments",
    find: "  if v_a.id is null or v_a.published_at is null or not public.is_class_member(v_a.class_id) then\n    raise exception 'not_found' using errcode = '42501';\n  end if;\n  select * into v_c",
    replace: "  if v_a.id is null or v_a.published_at is null or not exists (select 1 from public.class_members m where m.class_id = v_a.class_id and m.user_id = v_uid) then\n    raise exception 'not_found' using errcode = '42501';\n  end if;\n  select * into v_c",
  },
  {
    name: "submissions do not cascade on account deletion",
    find: "  user_id          uuid         not null references auth.users(id) on delete cascade,\n  status",
    replace: "  user_id          uuid         not null references auth.users(id),\n  status",
  },
  {
    name: "a co-teacher can change score visibility (owner-only rule dropped)",
    find: "  if not public.is_class_owner(p_class_id) then\n    raise exception 'not_class_owner",
    replace: "  if not public.is_class_staff(p_class_id) then\n    raise exception 'not_class_owner",
  },
  {
    name: "the 50-question cap is not enforced",
    find: "    if jsonb_array_length(p -> 'questions') > 50 then",
    replace: "    if jsonb_array_length(p -> 'questions') > 500 then",
  },
  {
    name: "the short-answer length cap is not enforced",
    find: "        if v_q.qtype = 'short' and char_length(v_text) > 500 then",
    replace: "        if v_q.qtype = 'short' and char_length(v_text) > 5000 then",
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
console.log("  ok   ALL 048 CHECKS PASSED");
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

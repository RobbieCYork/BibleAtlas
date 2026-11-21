#!/usr/bin/env node
// rls-test.mjs — rehearse sql/045 (Stripe billing) and run its access-rule proof somewhere that is
// NOT production. Same shape as scripts/paid-content/rls-test.mjs.
//
//   Local, throwaway, no account needed (Postgres compiled to WASM, in-process):
//     npm i --no-save @electric-sql/pglite          # or install it anywhere and set PGLITE_MODULE
//     node scripts/stripe/rls-test.mjs --local
//
// Applies a minimal Supabase stand-in, the REAL sql/025, sql/043, sql/045 (045 twice, to prove it is
// idempotent), then the REAL sql/tests/045_stripe_billing_test.sql, which ends in ROLLBACK.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

if (!process.argv.includes("--local")) {
  console.error("usage: rls-test.mjs --local   (staging: apply sql/045 then run sql/tests/045_stripe_billing_test.sql with psql)");
  process.exit(2);
}

// scripts/paid-content/rls-test.mjs's stand-in plus auth.jwt() (sql/025 references it), including Supabase's default ACL that grants
// every new table AND FUNCTION to anon and authenticated — the thing each migration must revoke.
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
`;

let PGlite;
try {
  const spec = process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : "@electric-sql/pglite";
  ({ PGlite } = await import(spec));
} catch {
  console.error("NOT RUN: @electric-sql/pglite is not installed (npm i --no-save @electric-sql/pglite, or set PGLITE_MODULE)");
  process.exit(3);
}

const notices = [];
const onNotice = (n) => notices.push(n.message);
const db = new PGlite();
const exec = async (label, sql) => {
  try {
    await db.exec(sql, { onNotice });
    console.log(`ok   ${label}`);
  } catch (e) {
    for (const n of notices) console.log(`  ${n}`);
    console.error(`FAIL ${label}: ${e.message}`);
    process.exit(1);
  }
};
await exec("supabase stand-in", SUPABASE_STUB);
await exec("sql/025_roles_and_reports.sql", read("sql/025_roles_and_reports.sql"));
await exec("sql/043_paid_content.sql", read("sql/043_paid_content.sql"));
await exec("sql/045_stripe_billing.sql", read("sql/045_stripe_billing.sql"));
await exec("sql/045_stripe_billing.sql (again: idempotent)", read("sql/045_stripe_billing.sql"));
await exec("sql/tests/045_stripe_billing_test.sql", read("sql/tests/045_stripe_billing_test.sql"));
for (const n of notices) console.log(`  ${n}`);
if (!notices.some((n) => n.includes("ALL 045 CHECKS PASSED"))) {
  console.error("FAIL: the final ALL 045 CHECKS PASSED notice never arrived");
  process.exit(1);
}
console.log("ALL 045 CHECKS PASSED");

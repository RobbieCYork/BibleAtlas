#!/usr/bin/env node
// rls-test.mjs — rehearse sql/043 and run its access-rule proof somewhere that is NOT production.
//
//   Local, throwaway, no account needed (Postgres compiled to WASM, in-process):
//     npm i --no-save @electric-sql/pglite
//     node scripts/paid-content/rls-test.mjs --local
//
//   Staging Supabase project (reads STAGING_DB_URL from .env.staging.local, exactly like
//   scripts/staging/apply-clone.mjs; never reads SUPABASE_DB_URL except to refuse its host):
//     npm i --no-save pg
//     node scripts/paid-content/rls-test.mjs --staging
//
// --local builds a minimal Supabase stand-in (anon / authenticated / service_role roles, auth.users,
// auth.uid() reading the PostgREST JWT settings, and Supabase's default ACL that grants new tables
// to anon and authenticated — the thing every migration here has to revoke), then applies the REAL
// sql/025 and sql/043 (043 twice, to prove it is idempotent), the REAL generated seed (twice, same
// reason), and the REAL sql/tests/043_paid_content_test.sql.
//
// --staging applies sql/043 (idempotent), the seed, and the test file. The test file ends in
// ROLLBACK; 043 and the seed stay applied on staging, which is the point of a rehearsal.

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./lib.mjs";

const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
const mode = process.argv.includes("--staging") ? "staging" : process.argv.includes("--local") ? "local" : null;
if (!mode) {
  console.error("usage: rls-test.mjs --local | --staging");
  process.exit(2);
}

const SEED = "scripts/paid-content/out/content_paid.sql";
if (!fs.existsSync(path.join(REPO_ROOT, SEED))) {
  console.error(`missing ${SEED} — run: node scripts/paid-content/split.mjs`);
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
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
function readEnvFile(file) {
  const out = {};
  let text;
  try {
    text = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
  } catch {
    return out;
  }
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function runLocal() {
  let PGlite;
  try {
    ({ PGlite } = await import("@electric-sql/pglite"));
  } catch {
    console.error("NOT RUN: @electric-sql/pglite is not installed. Run: npm i --no-save @electric-sql/pglite");
    process.exit(3);
  }
  const notices = [];
  const db = new PGlite({ onNotice: (n) => notices.push(n.message) });
  const exec = async (label, sql) => {
    try {
      await db.exec(sql);
      console.log(`ok   ${label}`);
    } catch (e) {
      console.error(`FAIL ${label}: ${e.message}`);
      process.exit(1);
    }
  };
  await exec("supabase stand-in", SUPABASE_STUB);
  await exec("sql/025_roles_and_reports.sql", read("sql/025_roles_and_reports.sql"));
  await exec("sql/043_paid_content.sql", read("sql/043_paid_content.sql"));
  await exec("sql/043_paid_content.sql (again: idempotent)", read("sql/043_paid_content.sql"));
  await exec("seed", read(SEED));
  await exec("seed (again: re-runnable)", read(SEED));
  const { rows } = await db.query("select count(*)::int as n from public.content_paid");
  console.log(`content_paid rows after seed: ${rows[0].n}`);
  await exec("sql/tests/043_paid_content_test.sql", read("sql/tests/043_paid_content_test.sql"));
  for (const n of notices) console.log(`  ${n}`);
  // Every check RAISEs on failure, so reaching here without an exception means every check passed.
  // (Notices are shown when the driver surfaces them; they are informational.)
  console.log("ALL 043 CHECKS PASSED (the test file ran to its ROLLBACK without an exception)");
}

async function runStaging() {
  const staging = readEnvFile(".env.staging.local").STAGING_DB_URL;
  const prodHost = hostOf(readEnvFile(".env.local").SUPABASE_DB_URL ?? "");
  if (!staging) {
    console.error("no STAGING_DB_URL in .env.staging.local — nothing to rehearse against");
    process.exit(2);
  }
  if (!hostOf(staging) || hostOf(staging) === prodHost) {
    console.error("REFUSING: STAGING_DB_URL points at the production host (or is unparseable)");
    process.exit(2);
  }
  let pg;
  try {
    ({ default: pg } = await import("pg"));
  } catch {
    console.error("NOT RUN: pg is not installed. Run: npm i --no-save pg");
    process.exit(3);
  }
  const client = new pg.Client({ connectionString: staging });
  const notices = [];
  client.on("notice", (n) => notices.push(n.message));
  await client.connect();
  try {
    for (const [label, rel] of [
      ["sql/043_paid_content.sql", "sql/043_paid_content.sql"],
      ["seed", SEED],
      ["sql/tests/043_paid_content_test.sql", "sql/tests/043_paid_content_test.sql"],
    ]) {
      await client.query(read(rel));
      console.log(`ok   ${label}`);
    }
  } finally {
    await client.end();
  }
  for (const n of notices) console.log(`  ${n}`);
  console.log("ALL 043 CHECKS PASSED (the test file ran to its ROLLBACK without an exception)");
}

(mode === "local" ? runLocal() : runStaging()).catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Rehearses sql/052_report_categories_no_voting.sql in PGlite (Postgres in WASM, in-process, no server) on top of
 * the WHOLE of sql/025 run against a stub of the Supabase pieces it needs: anon/authenticated roles, Supabase's
 * default ACL, auth.users, auth.uid()/auth.jwt() from request claims, `profiles`, and 019's `admin_users`.
 *
 *   PGLITE=/path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/sql-rehearsal/052_report_categories_no_voting.mjs
 *
 * PGlite is not a dependency of this repo; install it outside it and point PGLITE at it. Exit 0 = every check passed.
 *
 * Proves: 052 applies on a 025 database that already holds reports and votes; it is idempotent; no report row and
 * no vote row changes; the category list is exactly as documented; members still file reports (new and old keys);
 * an administrator can re-file a report into another category and a member cannot; nobody can write a vote by any
 * route; a member still cannot read another member's report; advisors still read reports through report_list();
 * the ROLLBACK block restores 025's categories and vote path; 052 re-applies after rollback.
 * Cannot prove: Supabase's real PostgREST or production's actual state.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { PGlite } = await import(process.env.PGLITE ?? "@electric-sql/pglite");
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file052 = process.argv[2] ?? path.join(REPO, "sql/052_report_categories_no_voting.sql");
const file025 = process.argv[3] ?? path.join(REPO, "sql/025_roles_and_reports.sql");
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("PASS", msg); } else { fail++; console.log("FAIL", msg); } };
async function expectErr(sql, code, msg, params) {
  try { await db.query(sql, params); ok(false, `${msg} (no error)`); }
  catch (e) { ok(code === null ? true : e.code === code, `${msg} -> ${e.code} ${e.message}`); }
}
const rows = async (sql, p) => (await db.query(sql, p)).rows;

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create table profiles (id uuid primary key references auth.users(id), display_name text);
  create table admin_users (user_id uuid primary key, granted_at timestamptz default now(), note text);
`);

const OWNER = "00000000-0000-0000-0000-00000000000a";
const ADMIN = "00000000-0000-0000-0000-00000000000b";
const ADVISOR = "00000000-0000-0000-0000-00000000000d";
const M1 = "00000000-0000-0000-0000-00000000000c";
const M2 = "00000000-0000-0000-0000-00000000000e";
await db.exec(`insert into auth.users values ('${OWNER}','o@x.test'),('${ADMIN}','a@x.test'),('${ADVISOR}','v@x.test'),('${M1}','m1@x.test'),('${M2}','m2@x.test');`);
await db.exec(readFileSync(file025, "utf8"));
await db.exec(`insert into user_roles (user_id, role) values ('${OWNER}','owner'),('${ADMIN}','administrator'),('${ADVISOR}','advisor');
  update app_settings set value = '50'::jsonb where key = 'reports.max_per_hour';`);
ok(true, "025 applies on the stub");

const as = async (role, uid) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);
    select set_config('request.jwt.claims', '${uid ? JSON.stringify({ sub: uid, is_anonymous: false }) : ""}', false);`);
  if (role) await db.exec(`set role ${role}`);
};
const file = (uid, cat, title) => db.query(
  `insert into reports (reporter_id, category, title, body) values ($1, $2, $3, 'body text')`, [uid, cat, title]);

// --- a 025 database with history: reports in every old category, and votes ---
await as("authenticated", M1);
for (const c of ["bug", "incorrect_info", "typo", "theological", "idea"]) await file(M1, c, `old ${c}`);
await as("authenticated", M2);
await file(M2, "other", "old other");
await as("authenticated", ADVISOR);
const anyId = (await rows("select id from report_list(p_limit => 1)"))[0].id;
await db.query("select report_vote($1, 1, 'agree')", [anyId]);
await as(null);
const snap = async () => JSON.stringify(await rows(
  "select id, category, title, body, status, vote_agree, vote_disagree, priority_score::text from reports order by id"));
const voteSnap = async () => JSON.stringify(await rows("select report_id, voter_id, vote, note from report_votes order by 1,2"));
const beforeReports = await snap();
const beforeVotes = await voteSnap();
ok(JSON.parse(beforeVotes).length === 1, "pre-state has one vote");

// --- apply, twice ---
const sql052 = readFileSync(file052, "utf8");
await db.exec(sql052);
ok(true, "052 applies cleanly");
await db.exec(sql052);
ok(true, "052 is idempotent (second run clean)");
ok(await snap() === beforeReports, "no report row changed (categories, votes, priority untouched)");
ok(await voteSnap() === beforeVotes, "vote rows kept");

const cats = await rows("select key, label, is_active from report_categories order by sort_order, key");
ok(cats.filter((c) => c.is_active).map((c) => c.key).join() === "incorrect_info,bible_reader,map,timeline,games,account,bug,theological,idea,other",
  `active categories: ${cats.filter((c) => c.is_active).map((c) => c.key)}`);
ok(cats.find((c) => c.key === "typo")?.is_active === false, "typo retired, row kept");
ok(cats.find((c) => c.key === "incorrect_info")?.label === "Content error (article, map or timeline facts)", "incorrect_info relabelled");

// --- filing ---
await as("anon");
ok((await rows("select key from report_categories where is_active")).length === 10, "anon can still read the category list");
await as("authenticated", M1);
await file(M1, "map", "new map report");
ok(true, "member files a report in a new category");
await file(M1, "bug", "new bug report");
ok(true, "member files a report in a reused category");
await expectErr("insert into reports (reporter_id, category, title, body) values ($1, 'nope', 'bad cat', 'x')", "23503", "unknown category refused by FK", [M1]);
ok((await rows("select id from reports where reporter_id <> $1", [M1])).length === 0, "member still cannot read another member's reports");
// a reporter cannot re-categorise their own report (025 trigger keeps it)
const mine = (await rows("select id from reports where title = 'new map report'"))[0].id;
await db.query("update reports set category = 'games', title = 'new map report (edited)' where id = $1", [mine]);
await as(null);
ok((await rows("select category, title from reports where id = $1", [mine]))[0].category === "map", "reporter's own update cannot change category");

// --- re-filing by an administrator (direct table update, as the app does) ---
const typoId = (await rows("select id from reports where category = 'typo'"))[0].id;
await as("authenticated", ADMIN);
const upd = await rows("update reports set category = 'incorrect_info' where id = $1 returning id", [typoId]);
ok(upd.length === 1, "administrator re-files a report (row returned)");
await as(null);
ok((await rows("select category, status from reports where id = $1", [typoId]))[0].category === "incorrect_info", "re-file stuck");
await as("authenticated", ADVISOR);
const advUpd = await rows("update reports set category = 'other' where id = $1 returning id", [typoId]);
ok(advUpd.length === 0, "advisor cannot re-file (zero rows)");
await as("authenticated", M2);
ok((await rows("update reports set category = 'other' where id = $1 returning id", [typoId])).length === 0, "member cannot re-file someone else's report");

// --- voting is gone for every role, every route ---
for (const [label, uid] of [["advisor", ADVISOR], ["administrator", ADMIN], ["owner", OWNER], ["member", M1]]) {
  await as("authenticated", uid);
  await expectErr("select report_vote($1, 1, null)", "42501", `${label}: report_vote() not executable`, [anyId]);
  await expectErr("insert into report_votes (report_id, voter_id, vote) values ($1, $2, -1)", "42501", `${label}: direct vote insert refused`, [anyId, uid]);
  ok((await rows("update report_votes set vote = -1 returning 1")).length === 0, `${label}: direct vote update writes nothing`);
  ok((await rows("delete from report_votes returning 1")).length === 0, `${label}: direct vote delete removes nothing`);
}
await as("anon");
await expectErr("select report_vote($1, 1, null)", "42501", "anon: report_vote() not executable", [anyId]);
await as(null);
ok(await voteSnap() === beforeVotes, "votes unchanged after every attempt");

// --- staff reads still work ---
await as("authenticated", ADVISOR);
const advList = await rows("select id, category, category_label from report_list(p_sort => 'newest', p_limit => 50)");
ok(advList.length === 8, `advisor still reads the queue via report_list (${advList.length})`);
ok(advList.some((r) => r.category === "map" && r.category_label === "Map"), "report_list returns new labels");
const counts = (await rows("select report_counts() c"))[0].c;
ok(counts.by_category.map === 1 && counts.by_category.typo === undefined, `report_counts by_category ${JSON.stringify(counts.by_category)}`);
await as("authenticated", M1);
await expectErr("select * from report_list()", "42501", "member cannot call report_list");

// --- rollback ---
await as(null);
const rb = sql052.slice(sql052.indexOf("-- ROLLBACK")).split("\n").filter((l) => /^--      /.test(l)).map((l) => l.replace(/^--      /, "")).join("\n");
await db.exec(rb);
const after = await rows("select key, label, is_active from report_categories order by sort_order, key");
ok(after.find((c) => c.key === "typo")?.is_active === true && after.find((c) => c.key === "idea")?.label === "Idea or suggestion", "rollback restores 025 labels");
ok(after.find((c) => c.key === "map")?.is_active === false && !after.find((c) => c.key === "games"), "rollback retires used new categories, deletes unused");
await as("authenticated", ADVISOR);
await db.query("select report_vote($1, -1, 'changed')", [anyId]);
ok(true, "after rollback an advisor can vote again");
await as(null);
await db.exec(sql052);
ok(true, "052 re-applies cleanly after rollback");
ok((await rows("select count(*)::int n from report_categories where is_active"))[0].n === 10, "re-applied: 10 active");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

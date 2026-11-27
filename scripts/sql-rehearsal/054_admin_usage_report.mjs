/**
 * Rehearses sql/054_admin_usage_report.sql in PGlite (Postgres in WASM, in-process, no server) on a stub of the
 * pieces it reads, copied in shape from sql/000_baseline.sql: anon/authenticated roles with Supabase's default ACL,
 * auth.users (with is_anonymous), auth.uid() from request claims, user_roles + is_admin() (baseline definition),
 * analytics_sessions / analytics_events (019), chapter_reads, notes, reports, report_categories.
 *
 *   PGLITE=/path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/sql-rehearsal/054_admin_usage_report.mjs
 *
 * PGlite is not a dependency of this repo; install it outside it and point PGLITE at it. Exit 0 = every check passed.
 *
 * Proves: 054 applies and is idempotent; anon, a member and an advisor are refused, an administrator and the owner
 * are answered; no column of the result can carry an id; every metric's numbers on a seeded database whose answers
 * are worked out by hand (accounts and the running total, team and guest toggles, distinct active, returning,
 * games by game with a hostile label folded into "other", reports by category, chapters, notes, articles,
 * history_from); bad bucket and unknown zone refused; "since the first account" range; the ROLLBACK drops it and
 * 054 re-applies. Cannot prove: Supabase's real PostgREST, production's actual tables, or its data.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { PGlite } = await import(process.env.PGLITE ?? "@electric-sql/pglite");
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file054 = process.argv[2] ?? path.join(REPO, "sql/054_admin_usage_report.sql");
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("PASS", msg); } else { fail++; console.log("FAIL", msg); } };
async function expectErr(sql, code, msg, params) {
  try { await db.query(sql, params); ok(false, `${msg} (no error)`); }
  catch (e) { ok(code === null ? true : e.code === code, `${msg} -> ${e.code} ${e.message}`); }
}
const rows = async (sql, p) => (await db.query(sql, p)).rows;

await db.exec(`
  set timezone = 'UTC';
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, created_at timestamptz not null default now(),
                           is_anonymous boolean not null default false);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;

  create table user_roles (user_id uuid primary key references auth.users(id), role text not null
                           check (role in ('advisor','administrator','owner')));
  create function is_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer
    set search_path to 'public', 'pg_temp' as
    $$ select uid is not null and exists (select 1 from user_roles r where r.user_id = uid and r.role in ('administrator','owner')) $$;
  create table analytics_sessions (id uuid primary key, user_id uuid references auth.users(id), is_anonymous boolean not null default false,
                                   started_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
                                   event_count integer not null default 0);
  create table analytics_events (id bigint generated always as identity primary key, user_id uuid references auth.users(id),
                                 session_id uuid not null, event text not null, props jsonb not null default '{}'::jsonb,
                                 created_at timestamptz not null default now());
  create table chapter_reads (user_id uuid not null references auth.users(id), book text not null, chapter integer not null,
                              read_at timestamptz not null default now(), primary key (user_id, book, chapter));
  create table notes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
                      note_text text not null, created_at timestamptz not null default now());
  create table report_categories (key text primary key, label text not null);
  create table reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id),
                        category text not null references report_categories(key), title text not null,
                        created_at timestamptz not null default now());
  alter table user_roles enable row level security; alter table analytics_sessions enable row level security;
  alter table analytics_events enable row level security; alter table chapter_reads enable row level security;
  alter table notes enable row level security; alter table reports enable row level security;
  insert into report_categories values ('bug','Something is broken'),('map','Map');
`);

const U = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const OWNER = U(1), ADMIN = U(2), ADV = U(3), A = U(4), B = U(5), C = U(6), G = U(7);
// Month anchors relative to now(), mid-month so no zone or clock edge moves them.
const M2 = "date_trunc('month', now()) - interval '2 months' + interval '10 days'";
const M1 = "date_trunc('month', now()) - interval '1 month' + interval '10 days'";
const M0 = "date_trunc('month', now()) + interval '1 hour'";
await db.exec(`
  insert into auth.users (id, email, created_at, is_anonymous) values
    ('${OWNER}','o@x.test', ${M2}, false), ('${ADMIN}','a@x.test', ${M2}, false), ('${ADV}','v@x.test', ${M2}, false),
    ('${A}','m1@x.test', ${M2}, false), ('${B}','m2@x.test', ${M1}, false), ('${C}','m3@x.test', ${M0}, false),
    ('${G}', null, ${M1}, true);
  insert into user_roles values ('${OWNER}','owner'),('${ADMIN}','administrator'),('${ADV}','advisor');
  insert into analytics_sessions (id, user_id, started_at) values
    (gen_random_uuid(), '${A}', ${M2}), (gen_random_uuid(), '${A}', ${M1}), (gen_random_uuid(), '${A}', ${M0}),
    (gen_random_uuid(), '${A}', ${M0}), (gen_random_uuid(), '${B}', ${M0}), (gen_random_uuid(), '${OWNER}', ${M0}),
    (gen_random_uuid(), '${G}', ${M1}), (gen_random_uuid(), null, ${M0});
  insert into analytics_events (user_id, session_id, event, props, created_at) values
    ('${C}', gen_random_uuid(), 'game.play', '{"game":"trivia"}', ${M0}),
    ('${A}', gen_random_uuid(), 'game.play', '{"game":"trivia"}', ${M0}),
    ('${A}', gen_random_uuid(), 'game.play', '{"game":"<script>alert(1)</script>"}', ${M1}),
    ('${OWNER}', gen_random_uuid(), 'game.play', '{"game":"chronology"}', ${M0}),
    ('${A}', gen_random_uuid(), 'panel.open', '{"panel":"articles"}', ${M0}),
    ('${A}', gen_random_uuid(), 'panel.open', '{"panel":"map"}', ${M0}),
    (null, gen_random_uuid(), 'panel.open', '{"panel":"articles"}', ${M0});
  insert into chapter_reads values ('${A}','John',3, ${M0}), ('${OWNER}','John',1, ${M0});
  insert into notes (user_id, note_text, created_at) values ('${B}', 'private words', ${M1});
  insert into reports (reporter_id, category, title, created_at) values
    ('${A}','bug','xyzzy title', ${M1}), ('${OWNER}','bug','owner test', ${M0}), ('${B}','map','map wrong', ${M0});
`);

const sql054 = readFileSync(file054, "utf8");
await db.exec(sql054);
ok(true, "054 applies cleanly");
await db.exec(sql054);
ok(true, "054 is idempotent (second run clean)");

const as = async (role, uid) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  if (role) await db.exec(`set role ${role}`);
};
const CALL = "select * from admin_usage_report($1, $2, 'UTC', $3, $4)";
const report = async (bucket = "month", periods = 3, team = true, guests = false) => {
  const r = await rows(CALL, [bucket, periods, team, guests]);
  const by = {};
  for (const x of r) (by[x.metric] ??= []).push(x);
  return by;
};
const vals = (series) => (series ?? []).map((x) => Number(x.value)).join(",");
const cums = (series) => (series ?? []).map((x) => (x.cumulative === null ? "null" : Number(x.cumulative))).join(",");

// --- who may call it ---
await as("anon");
await expectErr(CALL, "42501", "anon refused (no EXECUTE)", ["month", 3, true, false]);
await as("authenticated", A);
await expectErr(CALL, "42501", "member refused (not authorized)", ["month", 3, true, false]);
await as("authenticated", ADV);
await expectErr(CALL, "42501", "advisor refused", ["month", 3, true, false]);
await as("authenticated", null);
await expectErr(CALL, "42501", "authenticated with no uid refused", ["month", 3, true, false]);
await as("authenticated", ADMIN);
ok((await rows(CALL, ["month", 3, true, false])).length > 0, "administrator answered");
await as("authenticated", OWNER);
const r = await report();
ok(Object.keys(r).length > 0, "owner answered");

// --- no column can carry an id or anyone's words ---
const cols = (await db.query("select * from admin_usage_report('month', 1)")).fields.map((f) => f.name).join(",");
ok(cols === "metric,label,period_start,value,cumulative,history_from", `result columns are counts only: ${cols}`);
const everyText = JSON.stringify(await rows("select metric, label from admin_usage_report('month', 3, 'UTC', false, true)"));
ok(![OWNER, ADMIN, ADV, A, B, C, G].some((id) => everyText.includes(id)) && !everyText.includes("private words")
   && !everyText.includes("xyzzy") && !everyText.includes("<script>"), "no user id, note text, report title or raw event prop in any label");

// --- numbers, worked out by hand (team excluded, guests excluded — the defaults) ---
ok(r.accounts.length === 3, "three monthly periods for a scalar metric");
ok(vals(r.accounts) === "2,1,1", `accounts per month 2,1,1 (advisor + A; B; C): ${vals(r.accounts)}`);
ok(cums(r.accounts) === "2,3,4", `accounts running total 2,3,4: ${cums(r.accounts)}`);
ok(vals(r.active_users) === "1,1,3", `active per month 1,1,3 (A; A; A,B,C — C by a game event alone): ${vals(r.active_users)}`);
ok(cums(r.active_users) === "1,1,3", `distinct people ever active 1,1,3: ${cums(r.active_users)}`);
ok(vals(r.returning_users) === "0,1,2", `returning 0,1,2 (A new in M-2; A; A and B, not C): ${vals(r.returning_users)}`);
ok(vals(r.games_played) === "0,1,2", `games played 0,1,2 (owner's excluded): ${vals(r.games_played)}`);
ok(vals(r["game:trivia"]) === "2" && vals(r["game:other"]) === "1" && !r["game:chronology"], "games by game: trivia 2, hostile key folded into 'other', owner's chronology excluded");
ok(r["game:trivia"][0].label === "trivia", "game label is the fixed key");
ok(vals(r.reports) === "0,1,1" && vals(r["report:bug"]) === "1" && vals(r["report:map"]) === "1", "reports 0,1,1; by category bug 1 (owner's excluded), map 1");
ok(r["report:map"][0].label === "Map", "report label comes from report_categories");
ok(vals(r.chapters_read) === "0,0,1" && vals(r.notes) === "0,1,0", "chapters 0,0,1 (owner's excluded); notes 0,1,0");
ok(vals(r.articles_opened) === "0,0,1" && vals(r.articles_marked) === "0,0,0", "articles opened 0,0,1 (map and signed-out opens ignored); marked 0");
ok(r.articles_marked[0].history_from === null, "a metric with no data at all has history_from null (UI: not recorded yet)");
const m1 = (await rows(`select (${M1})::date as d`))[0].d;
ok(String(r.notes[0].history_from) === String(m1), "history_from is the first day the metric has data");

// --- toggles ---
const withTeam = await report("month", 3, false, false);
ok(vals(withTeam.accounts) === "4,1,1", `team included: accounts 4,1,1: ${vals(withTeam.accounts)}`);
ok(vals(withTeam.active_users) === "1,1,4" && vals(withTeam["game:chronology"]) === "1", "team included: owner active and their game counted");
const withGuests = await report("month", 3, true, true);
ok(vals(withGuests.accounts) === "2,2,1" && vals(withGuests.active_users) === "1,2,3", "guests included: guest account and guest activity counted");

// --- buckets, ranges, bad input ---
const days = await report("day", 30);
ok(days.accounts.length === 30, "30 daily periods");
const all = await report("month", 0);
ok(all.accounts.length === 3 && cums(all.accounts) === "2,3,4", "p_periods 0 = since the first account in scope");
const capped = await rows("select count(*)::int n from admin_usage_report('day', 100000) where metric = 'accounts'");
ok(capped[0].n === 730, "periods capped at 730");
await expectErr("select * from admin_usage_report('year', 3)", "22023", "unknown bucket refused");
await expectErr("select * from admin_usage_report('month', 3, 'Mars/Olympus')", "22023", "unknown time zone refused");
const tz = await rows("select count(*)::int n from admin_usage_report('week', 4, 'America/Denver') where metric = 'accounts'");
ok(tz[0].n === 4, "IANA zone accepted");


// --- admin_registered_summary() ---
await as("authenticated", A);
await expectErr("select admin_registered_summary()", "42501", "member refused the registered summary");
await as("anon");
await expectErr("select admin_registered_summary()", "42501", "anon refused the registered summary");
await db.exec(`reset role;
  insert into auth.users (id, email, created_at) values ('${U(8)}','new@x.test', now() - interval '2 hours'), ('${U(9)}','wk@x.test', now() - interval '3 days');
  insert into auth.users (id, created_at, is_anonymous) values ('${U(10)}', now() - interval '1 hour', true);
  insert into analytics_events (user_id, session_id, event, created_at) values ('${U(9)}', gen_random_uuid(), 'panel.open', now() - interval '1 day'),
    ('${U(10)}', gen_random_uuid(), 'panel.open', now() - interval '1 hour');
  insert into analytics_sessions (id, user_id, started_at) values (gen_random_uuid(), '${B}', now() - interval '20 days');`);
const recentReg = (await rows(`select count(distinct uid)::int n from (select user_id uid from analytics_sessions where started_at > now() - interval '7 days'
  union select user_id from analytics_events where created_at > now() - interval '7 days') x join auth.users u on u.id = x.uid where not u.is_anonymous`))[0].n;
await as("authenticated", ADMIN);
const sum = (await rows("select admin_registered_summary() s"))[0].s;
ok(sum.total === 8, `registered total 8 (6 + 2 new, team included, guests not): ${sum.total}`);
ok(sum.new_24h === 1 && sum.new_7d === 2, `new 24h 1, new 7d 2 (guest not counted): ${sum.new_24h}/${sum.new_7d}`);
ok(sum.active_7d === recentReg && sum.team === 2, `active 7d matches an independent count (${recentReg}), team 2: ${sum.active_7d}/${sum.team}`);
ok(Math.abs(new Date(sum.newest_joined_at) - (Date.now() - 2 * 3600e3)) < 120e3, "newest join is the 2-hours-ago registered account, not the 1-hour-ago guest");
ok(Object.keys(sum).sort().join() === "active_7d,new_24h,new_7d,newest_joined_at,team,total", "summary carries counts and one timestamp only");

// --- grants exact ---
await as(null);
ok((await rows("select has_function_privilege('anon','admin_usage_report(text,integer,text,boolean,boolean)','execute') a"))[0].a === false, "anon has no EXECUTE");
ok((await rows("select has_function_privilege('authenticated','admin_usage_report(text,integer,text,boolean,boolean)','execute') a"))[0].a === true, "authenticated has EXECUTE");
await expectErr("select * from admin_usage_report()", "42501", "superuser session with no auth.uid() is refused too");

// --- rollback, then re-apply ---
const rollback = sql054.split("ROLLBACK")[1].split("\n").filter((l) => /^--\s{4,}\S/.test(l)).map((l) => l.replace(/^--\s+/, "")).join("\n");
ok(rollback.includes("drop function"), "rollback block found in the file");
await db.exec(rollback);
ok((await rows("select count(*)::int n from pg_proc where proname in ('admin_usage_report','admin_registered_summary')"))[0].n === 0, "rollback removes both functions");
ok((await rows("select count(*)::int n from notes"))[0].n === 1 && (await rows("select count(*)::int n from auth.users"))[0].n === 10, "rollback touches no data");
await db.exec(sql054);
ok((await rows("select count(*)::int n from pg_proc where proname = 'admin_usage_report'"))[0].n === 1, "054 re-applies after rollback");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

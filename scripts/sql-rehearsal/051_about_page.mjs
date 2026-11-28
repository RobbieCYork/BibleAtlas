/**
 * Rehearses sql/051_about_page.sql in PGlite (Postgres compiled to WASM, in-process, no server) against a
 * stub of the Supabase pieces it depends on: the anon/authenticated roles, Supabase's default ACL that
 * grants every new table to both, auth.users, auth.uid() from the JWT claim, and sql/025's role_rank /
 * user_roles / has_role_at_least copied out of the real migration file.
 *
 *   PGLITE=/path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/sql-rehearsal/051_about_page.mjs
 *
 * PGlite is not a dependency of this repo; install it anywhere outside it (`npm i @electric-sql/pglite` in a
 * scratch folder) and point PGLITE at it, or run from a folder where it resolves. Exit 0 = every check passed.
 *
 * What this cannot prove: Supabase's real PostgREST, its real role setup, or production's actual state. It
 * proves the migration's own logic — grants, RLS, the owner check, validation, conflicts, idempotency,
 * rollback — on a real Postgres. Run it against staging before production when there is a staging project.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { PGlite } = await import(process.env.PGLITE ?? "@electric-sql/pglite");
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [file051, file025] = [
  process.argv[2] ?? path.join(REPO, "sql/051_about_page.sql"),
  process.argv[3] ?? path.join(REPO, "sql/025_roles_and_reports.sql"),
];
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("PASS", msg); } else { fail++; console.log("FAIL", msg); } };
async function expectErr(sql, code, msg, params) {
  try { await db.query(sql, params); ok(false, `${msg} (no error)`); }
  catch (e) { ok(e.code === code, `${msg} -> ${e.code} ${e.message}`); }
}

// --- Supabase stub: roles, auth schema, default ACL like production ---
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);

// role_rank, user_roles, has_role_at_least exactly as sql/025 writes them.
const s025 = readFileSync(file025, "utf8");
const grab = (start, end) => { const i = s025.indexOf(start); const j = s025.indexOf(end, i); return s025.slice(i, j + end.length); };
await db.exec(grab("create or replace function role_rank", "$$;"));
await db.exec(grab("create table if not exists user_roles", ");"));
await db.exec(grab("create or replace function has_role_at_least", "$$;"));

const OWNER = "00000000-0000-0000-0000-00000000000a";
const ADMIN = "00000000-0000-0000-0000-00000000000b";
const MEMBER = "00000000-0000-0000-0000-00000000000c";
await db.exec(`insert into auth.users values ('${OWNER}'), ('${ADMIN}'), ('${MEMBER}');
  insert into user_roles (user_id, role) values ('${OWNER}', 'owner'), ('${ADMIN}', 'administrator');`);

const sql051 = readFileSync(file051, "utf8");
await db.exec(sql051);
ok(true, "051 applies cleanly");
await db.exec(sql051);
ok(true, "051 is idempotent (second run clean)");

const as = async (role, uid) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  if (role) await db.exec(`set role ${role}`);
};
const GOOD = { quote: "Q", sections: [{ heading: null, paragraphs: ["One."] }, { heading: "H", paragraphs: ["Two.", "Three."] }] };
const save = (c, exp = null, over = false) =>
  db.query("select * from save_about_page($1::jsonb, $2::timestamptz, $3)", [JSON.stringify(c), exp, over]);

// --- grants ---
await as(null);
const grants = (await db.query(`select table_name, grantee, string_agg(distinct privilege_type, ', ' order by privilege_type) p
  from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')
  and table_name in ('about_page','about_page_versions') group by 1,2 order by 1,2`)).rows;
ok(JSON.stringify(grants) === JSON.stringify([
  { table_name: "about_page", grantee: "anon", p: "SELECT" },
  { table_name: "about_page", grantee: "authenticated", p: "SELECT" },
  { table_name: "about_page_versions", grantee: "authenticated", p: "SELECT" },
]), `grants exactly SELECT x3: ${JSON.stringify(grants)}`);
const fx = (await db.query(`select p.proname, has_function_privilege('anon', p.oid, 'execute') anon,
  has_function_privilege('authenticated', p.oid, 'execute') authed, p.prosecdef from pg_proc p
  where p.proname in ('about_page_content_ok','save_about_page') order by 1`)).rows;
ok(fx[0].anon === false && fx[0].authed === false, `about_page_content_ok not executable by anon/authenticated ${JSON.stringify(fx[0])}`);
ok(fx[1].anon === false && fx[1].authed === true && fx[1].prosecdef === true, `save_about_page: authenticated only, definer ${JSON.stringify(fx[1])}`);

// --- before any save: anon reads zero rows, no error ---
await as("anon");
ok((await db.query("select * from about_page")).rows.length === 0, "anon reads about_page: empty, no error");
await expectErr("select * from about_page_versions", "42501", "anon cannot read versions");
await expectErr("select save_about_page('{}'::jsonb)", "42501", "anon cannot execute save_about_page");
await expectErr(`insert into about_page (id, content) values (1, '${JSON.stringify(GOOD)}')`, "42501", "anon cannot insert");

// --- member / admin refused ---
await as("authenticated", MEMBER);
await expectErr("select save_about_page($1::jsonb)", "42501", "member save refused", [JSON.stringify(GOOD)]);
await expectErr(`insert into about_page (id, content) values (1, '${JSON.stringify(GOOD)}')`, "42501", "member direct insert refused");
await as("authenticated", ADMIN);
await expectErr("select save_about_page($1::jsonb)", "42501", "administrator save refused (owner only)", [JSON.stringify(GOOD)]);
await expectErr("update about_page set content = content", "42501", "administrator direct update refused");
await expectErr("delete from about_page_versions", "42501", "administrator direct delete refused");

// --- owner: validation ---
await as("authenticated", OWNER);
const bad = [
  [{}, "empty object"],
  [{ quote: "x", sections: [] }, "no sections"],
  [{ quote: "x", sections: [{ heading: null, paragraphs: [] }] }, "section with no paragraphs"],
  [{ quote: "x", sections: [{ heading: null, paragraphs: ["  "] }] }, "blank paragraph"],
  [{ quote: "x", sections: [{ heading: "   ", paragraphs: ["a"] }] }, "blank heading"],
  [{ quote: 5, sections: [{ heading: null, paragraphs: ["a"] }] }, "quote not a string"],
  [{ quote: "x", sections: [{ heading: null, paragraphs: [1] }] }, "paragraph not a string"],
  [{ quote: "x", sections: [{ heading: null, paragraphs: ["a"], html: "<b>" }] }, "extra section key"],
  [{ quote: "x", sections: [{ heading: null, paragraphs: ["a"] }], script: "x" }, "extra top-level key"],
  [{ quote: "x".repeat(1001), sections: [{ heading: null, paragraphs: ["a"] }] }, "quote too long"],
  [{ quote: "x", sections: [{ heading: null, paragraphs: ["a".repeat(10001)] }] }, "paragraph too long"],
];
for (const [c, why] of bad) await expectErr("select save_about_page($1::jsonb)", "22023", `invalid refused: ${why}`, [JSON.stringify(c)]);
ok((await db.query("select count(*)::int n from about_page_versions")).rows[0].n === 0, "invalid saves left no version");

// --- owner: save, conflict, no-op, restore ---
const r1 = (await save(GOOD)).rows[0];
ok(r1.id === 1 && r1.content.quote === "Q", "owner first save (expected=null) works");
await expectErr("select save_about_page($1::jsonb, null)", "40001", "stale save (expected=null after a save) refused", [JSON.stringify({ ...GOOD, quote: "Q2" })]);
const r2 = (await save({ ...GOOD, quote: "Q2" }, r1.updated_at)).rows[0];
ok(r2.content.quote === "Q2", "save with correct expected timestamp works");
const tsText = (await db.query("select updated_at::text t from about_page")).rows[0].t;
const r2b = (await db.query("select * from save_about_page($1::jsonb, $2::timestamptz)", [JSON.stringify({ ...GOOD, quote: "Q3" }), tsText])).rows[0];
ok(r2b.content.quote === "Q3", "expected timestamp round-trips exactly as text (microseconds)");
const before = (await db.query("select count(*)::int n from about_page_versions")).rows[0].n;
await save({ ...GOOD, quote: "Q3" }, r2b.updated_at);
ok((await db.query("select count(*)::int n from about_page_versions")).rows[0].n === before, "identical save is a no-op (no version row)");
await save({ ...GOOD, quote: "Q4" }, null, true);
ok((await db.query("select content->>'quote' q from about_page")).rows[0].q === "Q4", "p_overwrite saves over a conflict");
const vers = (await db.query("select content->>'quote' q, saved_by from about_page_versions order by id")).rows;
ok(vers.map((v) => v.q).join(",") === "Q,Q2,Q3,Q4" && vers.every((v) => v.saved_by === OWNER), `owner reads all versions with saved_by: ${vers.map((v) => v.q)}`);
const markup = { quote: "<script>alert(1)</script>", sections: [{ heading: "<img src=x onerror=alert(1)>", paragraphs: ["<b>x</b>"] }] };
await save(markup, null, true);
ok((await db.query("select content->>'quote' q from about_page")).rows[0].q === "<script>alert(1)</script>", "markup is stored as plain characters (the app renders text, never HTML)");

// --- who sees what after saves ---
await as("anon");
const anonRow = (await db.query("select * from about_page")).rows;
ok(anonRow.length === 1 && Object.keys(anonRow[0]).sort().join() === "content,id,updated_at", "anon reads the saved row; no user id column exists on it");
await as("authenticated", ADMIN);
ok((await db.query("select * from about_page_versions")).rows.length === 0, "administrator sees no versions (RLS)");
await as("authenticated", MEMBER);
ok((await db.query("select * from about_page")).rows.length === 1, "member reads the saved row");
ok((await db.query("select * from about_page_versions")).rows.length === 0, "member sees no versions (RLS)");
await expectErr("truncate about_page", "42501", "member cannot truncate");

// --- account deletion never blocked by history ---
await as(null);
await db.exec(`delete from user_roles where user_id='${OWNER}'; delete from auth.users where id='${OWNER}';`);
ok((await db.query("select count(*)::int n from about_page_versions where saved_by is null")).rows[0].n === 5 && (await db.query("select count(*)::int n from about_page_versions")).rows[0].n === 5, "deleting the owner's account nulls saved_by, keeps history");

// --- rollback block from the file runs ---
const rb = sql051.slice(sql051.indexOf("-- ROLLBACK")).split("\n").filter((l) => /^--      /.test(l)).map((l) => l.replace(/^--      /, "")).join("\n");
await db.exec(rb);
ok((await db.query("select to_regclass('public.about_page') t")).rows[0].t === null, "rollback block drops everything");
await db.exec(sql051);
ok(true, "re-applies cleanly after rollback");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

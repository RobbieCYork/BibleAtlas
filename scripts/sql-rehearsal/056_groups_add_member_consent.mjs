/**
 * Rehearses sql/056_groups_add_member_consent.sql in PGlite (Postgres in WASM, in-process, no server) on a stub
 * of the production group schema as read on 2026-11-28: groups, group_members, friend_requests, user_blocks, and
 * the production bodies of is_group_admin, is_group_member, is_friend, is_blocked_between, add_group_member and
 * create_group (the last two are first installed in their OLD form, to prove the hole, then 056 is applied).
 *
 *   PGLITE=/path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/sql-rehearsal/056_groups_add_member_consent.mjs
 *
 * PGlite is not a dependency of this repo; install it outside it and point PGLITE at it. Exit 0 = every check passed.
 *
 * Proves: before 056 a stranger, and an account that blocked the caller, can be added to a group; after 056
 * neither can, by add_group_member or create_group, and a rejected create_group leaves no group behind; friends
 * still can be added both ways; guests and anon are refused; 056 is idempotent; existing memberships are untouched.
 * Cannot prove: Supabase's real PostgREST or production's actual state.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { PGlite } = await import(process.env.PGLITE ?? "@electric-sql/pglite");
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file056 = process.argv[2] ?? path.join(REPO, "sql/056_groups_add_member_consent.sql");
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("PASS", msg); } else { fail++; console.log("FAIL", msg); } };
const rows = async (sql, p) => (await db.query(sql, p)).rows;

const A = "00000000-0000-0000-0000-00000000000a"; // caller, group owner
const F = "00000000-0000-0000-0000-00000000000f"; // A's accepted friend
const S = "00000000-0000-0000-0000-000000000005"; // stranger
const B = "00000000-0000-0000-0000-00000000000b"; // friend of A who then BLOCKED A
const G = "00000000-0000-0000-0000-000000000009"; // guest (anonymous)

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;

  insert into auth.users values ('${A}'),('${F}'),('${S}'),('${B}'),('${G}');
  create table groups (id uuid primary key default gen_random_uuid(), name text check (char_length(name) between 1 and 80),
    description text, created_by uuid references auth.users(id), created_at timestamptz default now(), is_public boolean default false);
  create table group_members (group_id uuid references groups(id) on delete cascade, user_id uuid references auth.users(id),
    joined_at timestamptz default now(), role text check (role in ('owner','admin','member')), primary key (group_id, user_id));
  create table friend_requests (id uuid primary key default gen_random_uuid(), sender_id uuid, receiver_id uuid, status text,
    created_at timestamptz default now(), responded_at timestamptz);
  create table user_blocks (blocker_id uuid, blocked_id uuid, primary key (blocker_id, blocked_id));
  alter table groups enable row level security; alter table group_members enable row level security;

  create function public.is_group_admin(gid uuid) returns boolean language sql stable security definer as
    $$ select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid() and role in ('owner', 'admin')); $$;
  create function public.is_group_member(gid uuid) returns boolean language sql stable security definer as
    $$ select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid()); $$;
  create function public.is_blocked_between(p_a uuid, p_b uuid) returns boolean language sql stable security definer
    set search_path to 'public', 'pg_temp' as $$
    select case when p_a is null or p_b is null or p_a = p_b then false else exists (
      select 1 from user_blocks b where (b.blocker_id = p_a and b.blocked_id = p_b) or (b.blocker_id = p_b and b.blocked_id = p_a)) end; $$;
  create function public.is_friend(other_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
    select exists (select 1 from public.friend_requests where status = 'accepted'
      and ((sender_id = auth.uid() and receiver_id = other_id) or (sender_id = other_id and receiver_id = auth.uid()))); $$;

  -- Production bodies BEFORE 056.
  create function public.add_group_member(p_group_id uuid, p_member_id uuid) returns void language plpgsql security definer as $f$
  begin
    if not public.is_group_admin(p_group_id) then raise exception 'Only group admins can add members'; end if;
    insert into public.group_members (group_id, user_id, role) values (p_group_id, p_member_id, 'member') on conflict do nothing;
  end; $f$;
  create function public.create_group(p_name text, p_description text, p_member_ids uuid[]) returns uuid language plpgsql security definer as $f$
  declare new_group_id uuid; mid uuid;
  begin
    if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Guests cannot create groups'; end if;
    insert into public.groups (name, description, created_by) values (p_name, nullif(trim(p_description), ''), auth.uid()) returning id into new_group_id;
    insert into public.group_members (group_id, user_id, role) values (new_group_id, auth.uid(), 'owner');
    foreach mid in array p_member_ids loop
      if mid <> auth.uid() then insert into public.group_members (group_id, user_id, role) values (new_group_id, mid, 'member') on conflict do nothing; end if;
    end loop;
    return new_group_id;
  end; $f$;

  insert into friend_requests (sender_id, receiver_id, status, responded_at) values ('${A}','${F}','accepted',now()),('${B}','${A}','accepted',now());
`);

async function as(uid, anonymous, fn) {
  await db.exec("begin");
  try {
    if (uid === null) {
      await db.exec(`set local role anon; select set_config('request.jwt.claim.sub', '', true); select set_config('request.jwt.claims', '', true);`);
    } else {
      await db.exec(`set local role authenticated; select set_config('request.jwt.claim.sub', '${uid}', true);
        select set_config('request.jwt.claims', '${JSON.stringify({ sub: uid, is_anonymous: anonymous })}', true);`);
    }
    const r = await fn();
    await db.exec("commit");
    return { ok: true, r };
  } catch (e) {
    await db.exec("rollback");
    return { ok: false, code: e.code, message: e.message };
  }
}
const call = (sql) => () => db.query(sql);
const memberCount = async (gid, uid) => (await rows(`select count(*)::int n from group_members where group_id = $1 and user_id = $2`, [gid, uid]))[0].n;

// ---- BEFORE: prove the hole ------------------------------------------------------------------
const pre = await as(A, false, call(`select create_group('pre', null, array['${S}']::uuid[]) id`));
const preGroup = pre.r.rows[0].id;
ok(pre.ok && (await memberCount(preGroup, S)) === 1, "BEFORE 056: create_group puts a stranger in a group");
await db.exec(`insert into user_blocks values ('${B}','${A}'); delete from friend_requests where sender_id = '${B}';`);
const preBlock = await as(A, false, call(`select add_group_member('${preGroup}', '${B}')`));
ok(preBlock.ok && (await memberCount(preGroup, B)) === 1, "BEFORE 056: add_group_member adds an account that blocked the caller");

// ---- APPLY 056 twice (idempotent) ------------------------------------------------------------
const sql056 = readFileSync(file056, "utf8");
await db.exec(sql056);
await db.exec(sql056);
ok(true, "056 applies, and applies again");

// existing memberships untouched
ok((await memberCount(preGroup, S)) === 1 && (await memberCount(preGroup, B)) === 1, "existing memberships are not touched");

// ---- AFTER -----------------------------------------------------------------------------------
await db.exec(`delete from group_members where group_id = '${preGroup}' and user_id in ('${S}','${B}')`);
let r = await as(A, false, call(`select add_group_member('${preGroup}', '${S}')`));
ok(!r.ok && r.code === "42501" && /not_friend/.test(r.message), `add_group_member refuses a stranger -> ${r.code} ${r.message}`);
r = await as(A, false, call(`select add_group_member('${preGroup}', '${B}')`));
ok(!r.ok && r.code === "42501", `add_group_member refuses an account that blocked the caller -> ${r.code}`);
// a block the other way, with the friendship still standing
await db.exec(`insert into friend_requests (sender_id, receiver_id, status) values ('${A}','${B}','accepted');`);
r = await as(A, false, call(`select add_group_member('${preGroup}', '${B}')`));
ok(!r.ok && r.code === "42501", "add_group_member refuses across a block even if an accepted friend row survives");
r = await as(A, false, call(`select add_group_member('${preGroup}', '${F}')`));
ok(r.ok && (await memberCount(preGroup, F)) === 1, "add_group_member still adds an accepted friend");
r = await as(F, false, call(`select add_group_member('${preGroup}', '${A}')`));
ok(!r.ok && /admins/.test(r.message), "a plain member still cannot add anyone");

const groupsBefore = (await rows(`select count(*)::int n from groups`))[0].n;
r = await as(A, false, call(`select create_group('mixed', null, array['${F}','${S}']::uuid[]) id`));
ok(!r.ok && r.code === "42501", `create_group with one stranger in the list is refused -> ${r.code}`);
ok((await rows(`select count(*)::int n from groups`))[0].n === groupsBefore, "a refused create_group leaves no group behind");
r = await as(A, false, call(`select create_group('friends', ' d ', array['${F}','${A}','${F}']::uuid[]) id`));
const gid = r.ok ? r.r.rows[0].id : null;
ok(r.ok && (await memberCount(gid, F)) === 1 && (await memberCount(gid, A)) === 1, "create_group with friends (plus self and a duplicate) still works");
ok((await rows(`select role from group_members where group_id=$1 and user_id=$2`, [gid, A]))[0]?.role === "owner", "creator is still owner");
r = await as(A, false, call(`select create_group('solo', null, '{}'::uuid[]) id`));
ok(r.ok, "create_group with an empty member list still works");
r = await as(A, false, call(`select create_group('nullist', null, null) id`));
ok(r.ok, "create_group with a NULL member list no longer errors");

r = await as(G, true, call(`select create_group('guest', null, '{}'::uuid[])`));
ok(!r.ok, "a guest cannot create a group");
r = await as(null, false, call(`select add_group_member('${gid}', '${F}')`));
ok(!r.ok && r.code === "42501", `anon cannot execute add_group_member -> ${r.code}`);
r = await as(null, false, call(`select create_group('x', null, '{}'::uuid[])`));
ok(!r.ok && r.code === "42501", `anon cannot execute create_group -> ${r.code}`);

const cfg = await rows(`select proname, array_to_string(proconfig, ',') c from pg_proc where proname in ('add_group_member','create_group') order by 1`);
ok(cfg.every((x) => x.c === "search_path=public, pg_temp"), "both functions pin search_path");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

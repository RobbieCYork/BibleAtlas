#!/usr/bin/env node
// invites-rls-test.mjs — rehearse sql/049 (Groups phase 3: invites + reminders) and run its access-rule
// and schedule proof somewhere that is NOT production. Same shape as rls-test.mjs (047) and
// assignments-rls-test.mjs (048).
//
//   Local, throwaway, no account needed (Postgres compiled to WASM, in-process):
//     npm i --no-save @electric-sql/pglite          # or install it anywhere and set PGLITE_MODULE
//     node scripts/groups/invites-rls-test.mjs --local
//
//   The mutation proof — break one rule at a time and show the test FAILS for each:
//     node scripts/groups/invites-rls-test.mjs --local --mutations
//
// Applies the Supabase stand-in (auth.users WITH email_confirmed_at), the REAL sql/025, 033, 043, 045,
// 047, 048, then 049 twice (idempotent), then the REAL sql/tests/049_groups_invites_test.sql (ROLLBACK).
// No network, no email: the database cannot send anything, and the reminder clock is a parameter.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

if (!process.argv.includes("--local")) {
  console.error("usage: invites-rls-test.mjs --local [--mutations]   (staging: apply 033, 043, 045, 047, 048, 049 then run sql/tests/049_groups_invites_test.sql with psql)");
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

const MIGRATION = "sql/049_groups_invites.sql";
const TEST = "sql/tests/049_groups_invites_test.sql";

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
  const ok = notices.some((n) => n.includes("ALL 049 CHECKS PASSED"));
  return { ok, failedAt: ok ? null : TEST, error: ok ? null : "final notice never arrived", notices };
}

if (!process.argv.includes("--mutations")) {
  const r = await runStack(read(MIGRATION));
  for (const n of r.notices) console.log(`  ${n}`);
  if (!r.ok) {
    console.error(`FAIL ${r.failedAt}: ${r.error}`);
    process.exit(1);
  }
  console.log("ALL 049 CHECKS PASSED");
  process.exit(0);
}

// ------------------------------------------------------------------------------------- mutations
// Each one deliberately breaks ONE rule of the migration. The test must fail for every one of them;
// a mutation the test survives is a rule nothing is checking.
const MUTATIONS = [
  {
    name: "quiet hours are ignored",
    find: "    continue when extract(hour from (p_now at time zone r.c_tz)) not between 8 and 20;",
    replace: "    continue when extract(hour from (p_now at time zone r.c_tz)) not between 0 and 23;",
  },
  {
    name: "the sending kill switch is ignored",
    find: "  if not public.app_setting_bool('invites.sending_enabled', false) then\n    return v_out;\n  end if;\n\n  select count(*) into v_used",
    replace: "  select count(*) into v_used",
  },
  {
    name: "raw tokens are stored instead of their hash",
    find: "    values (public.invite_token_hash(v_join), r.id, v_send, 'join'),",
    replace: "    values (v_join, r.id, v_send, 'join'),",
  },
  {
    name: "a claim does not advance the schedule (the same email can go out twice)",
    find: "           next_reminder_at = public.invite_next_due(coalesce(r.sent_at, p_now), v_seq, p_now),\n           updated_at = now()\n     where id = r.id;\n\n    v_out",
    replace: "           updated_at = now()\n     where id = r.id;\n\n    v_out",
  },
  {
    name: "the reminder offsets drift from +1,+3,+5,+14,+30",
    find: "  select array[1, 3, 5, 14, 30];  -- INVITE_REMINDER_DAYS",
    replace: "  select array[1, 2, 5, 14, 30];  -- INVITE_REMINDER_DAYS",
  },
  {
    name: "reminders can be closer than 24 hours apart",
    find: "                         p_now + interval '24 hours')",
    replace: "                         p_now)",
  },
  {
    name: "suppressed addresses are still mailed at send time",
    find: "    if exists (select 1 from public.invite_suppressions s where s.address_hash = r.address_hash) then\n      update",
    replace: "    if false then\n      update",
  },
  {
    name: "suppressed addresses can be invited",
    find: "    if exists (select 1 from public.invite_suppressions s where s.address_hash = v_hash)\n       or (v_user",
    replace: "    if (v_user",
  },
  {
    name: "blocked accounts can be invited",
    find: "       or (v_user is not null and public.is_blocked_between(v_uid, v_user)) then",
    replace: "       then",
  },
  {
    name: "the global daily cap is ignored",
    find: "  v_room := least(greatest(coalesce(p_limit, 0), 0), 100, greatest(v_cap - v_used, 0));",
    replace: "  v_room := least(greatest(coalesce(p_limit, 0), 0), 100);",
  },
  {
    name: "the inviter's own email need not be confirmed",
    find: "  if v_me.email is null or v_me.email_confirmed_at is null then",
    replace: "  if v_me.email is null then",
  },
  {
    name: "a note may contain a link",
    find: "    if public.invite_text_has_link(v_note) then",
    replace: "    if false then",
  },
  {
    name: "the seat-based invite cap is 10x seats",
    find: "  v_left_seat := 2 * v_class.seats_purchased",
    replace: "  v_left_seat := 20 * v_class.seats_purchased",
  },
  {
    name: "an unverified org is not capped at 30",
    find: "    v_left_org := 30 - (select count(*)",
    replace: "    v_left_org := 300 - (select count(*)",
  },
  {
    name: "joining by code does not stop the email invite",
    find: "       where class_id = v_class.id and address_hash = v_hash and status = 'pending'\n       for update",
    replace: "       where false\n       for update",
  },
  {
    name: "invite links are reusable",
    find: "  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then\n    insert into public.class_join_attempts (user_id, ok) values (v_uid, false);\n    return jsonb_build_object('ok', false, 'error', case when v_inv.status = 'joined' then 'used' else 'expired' end);\n  end if;\n  perform 1",
    replace: "  perform 1",
  },
  {
    name: "the age attestation is not required",
    find: "  if p_age is null or p_age not in ('13_17', '18_plus') then",
    replace: "  if false then",
  },
  {
    name: "students can list the class's invites",
    find: "begin\n  if not public.is_class_staff(p_class_id) then\n    raise exception 'not_class_staff' using errcode = '42501';\n  end if;\n  return coalesce((\n    select jsonb_agg(jsonb_build_object(\n             'invite_id'",
    replace: "begin\n  if not (public.is_class_staff(p_class_id) or public.is_class_member(p_class_id)) then\n    raise exception 'not_class_staff' using errcode = '42501';\n  end if;\n  return coalesce((\n    select jsonb_agg(jsonb_build_object(\n             'invite_id'",
  },
  {
    name: "signed-in users can call the mailer's claim",
    find: "\ncommit;\n",
    replace: "\ngrant execute on function public.invite_claim_due(timestamptz, integer) to authenticated;\ncommit;\n",
  },
  {
    name: "anon can create invites",
    find: "\ncommit;\n",
    replace: "\ngrant execute on function public.create_class_invites(uuid, text[], text) to anon;\ncommit;\n",
  },
  {
    name: "the token tables are readable by clients (revoke-to-zero dropped)",
    find: "revoke all on public.class_invite_tokens   from anon, authenticated, public;",
    replace: "",
  },
  {
    name: "a global unsubscribe writes no suppression",
    find: "  insert into public.invite_suppressions (address_hash, reason) values (v_inv.address_hash, 'unsubscribe')\n  on conflict (address_hash) do nothing;",
    replace: "",
  },
  {
    name: "a complaint does not pause the inviter",
    find: "    exists (select 1 from public.class_invite_events e\n             where e.actor = p_uid and e.event = 'complained' and e.at > now() - interval '90 days')\n    or (",
    replace: "    false\n    or (",
  },
  {
    name: "a full class keeps sending reminders",
    find: "    continue when (select count(*) from public.class_members m\n                    where m.class_id = r.class_id and m.seat_state = 'active') >= r.c_seats;\n",
    replace: "",
  },
  {
    name: "the 45-day expiry is not applied",
    find: "            where status = 'pending' and expires_at <= p_now for update skip locked loop",
    replace: "            where false for update skip locked loop",
  },
  {
    name: "an ended class keeps sending",
    find: "    elsif r.c_status <> 'active'\n       or (r.c_ends_on is not null and p_now >= public.class_end_ts(r.c_ends_on, r.c_tz)) then",
    replace: "    elsif false then",
  },
  {
    name: "the owner is emailed on every refusal when full",
    find: "     where c.seats_full_at is not null and c.seats_full_emailed_at is null and c.status = 'active'",
    replace: "     where c.seats_full_at is not null and c.status = 'active'",
  },
  {
    name: "resend can exceed six emails",
    find: "  if v_inv.sends >= 6 then\n    raise exception 'send_limit",
    replace: "  if v_inv.sends >= 60 then\n    raise exception 'send_limit",
  },
  {
    name: "webhook replays are applied twice",
    find: "  get diagnostics v_n = row_count;\n  if v_n = 0 then\n    return jsonb_build_object('outcome', 'duplicate');",
    replace: "  get diagnostics v_n = row_count;\n  if false then\n    return jsonb_build_object('outcome', 'duplicate');",
  },
  {
    name: "a revoked invite keeps its address",
    find: "       set status = 'revoked', revoked_at = now(), address = null, next_reminder_at = null,",
    replace: "       set status = 'revoked', revoked_at = now(), next_reminder_at = null,",
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
console.log("  ok   ALL 049 CHECKS PASSED");
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

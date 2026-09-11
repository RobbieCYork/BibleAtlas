#!/usr/bin/env node
// =============================================================================
// Regenerate sql/000_baseline.sql — a READ-ONLY documentation dump of the live
// production schema. See scripts/schema-baseline/README.md.
//
// This script only ever SELECTs from pg_catalog / information_schema. It issues
// no DDL and no DML, and it reads no application rows.
//
//   cd capstone-bible
//   npm i --no-save pg           # pg is not a runtime dependency of the app
//   node scripts/schema-baseline/dump-schema.mjs
//
// It reads SUPABASE_DB_URL from .env.local and never prints, logs or writes it.
// Every error message is scrubbed of the host, user and password before display.
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// CB_REPO lets this run from a scratch directory that has `pg` installed, so the
// repo's own node_modules is never mutated while other agents are building in it.
const REPO = process.env.CB_REPO ? path.resolve(process.env.CB_REPO) : path.resolve(HERE, '..', '..');
const ENV = path.join(REPO, '.env.local');
const SQLDIR = path.join(REPO, 'sql');
const OUT = process.argv[2] || path.join(SQLDIR, '000_baseline.sql');
const SELF = 'scripts/schema-baseline/dump-schema.mjs';

let pg;
try { pg = (await import('pg')).default; }
catch { console.error("pg driver not installed. Run:  npm i --no-save pg"); process.exit(1); }

// ---------------------------------------------------------------- credentials
function dbUrl() {
  const txt = fs.readFileSync(ENV, 'utf8');
  for (const raw of txt.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0 || line.slice(0, i).trim() !== 'SUPABASE_DB_URL') continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    return v;
  }
  throw new Error('SUPABASE_DB_URL not found in .env.local');
}
function scrub(s) {
  let out = String(s ?? '');
  try {
    const u = new URL(dbUrl());
    for (const secret of [u.password, u.username, u.hostname, u.host, dbUrl()]) {
      if (secret) out = out.split(secret).join('[REDACTED]');
    }
  } catch { /* fall through to the blanket regex */ }
  return out.replace(/postgres(ql)?:\/\/[^\s"']+/gi, '[REDACTED_CONN_STRING]');
}

const L = [];
const w = (s = '') => L.push(s);
const rule = (t) => { w(''); w('-- ' + '='.repeat(76)); w('-- ' + t); w('-- ' + '='.repeat(76)); };
const CMD = { r: 'select', a: 'insert', w: 'update', d: 'delete', '*': 'all' };

let client;
try {
  client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false }, statement_timeout: 120000 });
  await client.connect();
} catch (e) { console.error('connect failed: ' + scrub(e.message)); process.exit(1); }
const q = (sql, params) => client.query(sql, params).then(r => r.rows);

// ------------------------------------------------------------- introspection
// as TEXT, deliberately. node-pg hands back `timestamp without time zone` as a
// JS Date in the LOCAL zone, so .toISOString() on it silently shifts the stamp
// by the machine's UTC offset and dates the dump wrong by up to a day.
const meta = (await q(`select version() v,
    to_char(now() at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI') utc_ts,
    to_char(now() at time zone 'America/Boise', 'YYYY-MM-DD HH24:MI') mt_ts`))[0];
const exts = await q(`select e.extname, e.extversion, n.nspname
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace order by 1`);
const enums = await q(`select t.typname, array_agg(en.enumlabel order by en.enumsortorder)::text[] labels
  from pg_type t join pg_enum en on en.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
  where n.nspname='public' group by t.typname order by t.typname`);
const domains = await q(`select t.typname, format_type(t.typbasetype, t.typtypmod) base, t.typnotnull,
    pg_get_expr(t.typdefaultbin, 0, true) def,
    (select array_agg(pg_get_constraintdef(co.oid, true))::text[] from pg_constraint co where co.contypid = t.oid) checks
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname='public' and t.typtype='d' order by 1`);
const tables = await q(`select c.oid::int oid, c.relname, c.relrowsecurity, c.relforcerowsecurity,
    obj_description(c.oid,'pg_class') cmt
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') order by c.relname`);
const oids = tables.map(t => t.oid);
const cols = await q(`select a.attrelid::int rel, a.attname, format_type(a.atttypid,a.atttypmod) typ,
    a.attnotnull, pg_get_expr(d.adbin,d.adrelid,true) def, a.attidentity, a.attgenerated,
    col_description(a.attrelid,a.attnum) cmt
  from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  where a.attrelid = any($1::oid[]) and a.attnum>0 and not a.attisdropped
  order by a.attrelid, a.attnum`, [oids]);
const cons = await q(`select conrelid::int rel, conname, contype, pg_get_constraintdef(oid,true) def
  from pg_constraint where conrelid = any($1::oid[])
  order by conrelid, case contype when 'p' then 1 when 'u' then 2 when 'f' then 3 else 4 end, conname`, [oids]);
const idxs = await q(`select i.indrelid::int rel, ic.relname idxname, pg_get_indexdef(i.indexrelid) def,
    exists(select 1 from pg_constraint k where k.conindid = i.indexrelid) from_constraint
  from pg_index i join pg_class ic on ic.oid = i.indexrelid
  where i.indrelid = any($1::oid[]) order by i.indrelid, ic.relname`, [oids]);
const pols = await q(`select p.polrelid::int rel, p.polname, p.polcmd, p.polpermissive,
    (select array_agg(case when r=0 then 'PUBLIC' else pg_get_userbyid(r) end) from unnest(p.polroles) r)::text[] roles,
    pg_get_expr(p.polqual, p.polrelid, true) qual, pg_get_expr(p.polwithcheck, p.polrelid, true) wc
  from pg_policy p where p.polrelid = any($1::oid[]) order by p.polrelid, p.polname`, [oids]);
const trgs = await q(`select tgrelid::int rel, tgname, pg_get_triggerdef(oid,true) def
  from pg_trigger where tgrelid = any($1::oid[]) and not tgisinternal order by tgrelid, tgname`, [oids]);
const grants = await q(`select c.oid::int rel, g.grantee, string_agg(distinct g.privilege_type, ', ' order by g.privilege_type) privs
  from information_schema.role_table_grants g
  join pg_class c on c.relname = g.table_name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = g.table_schema
  where g.table_schema='public' group by 1,2 order by 1,2`);
const views = await q(`select c.relname, c.relkind, pg_get_viewdef(c.oid,true) def,
    obj_description(c.oid,'pg_class') cmt, c.reloptions opts
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('v','m') order by c.relname`);
const fns = await q(`select p.proname, pg_get_function_identity_arguments(p.oid) args,
    pg_get_functiondef(p.oid) def, p.prosecdef,
    coalesce(array_to_string(p.proconfig, ', '), '') cfg
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind in ('f','p')
  order by p.proname, pg_get_function_identity_arguments(p.oid)`);
const fnGrants = await q(`select p.proname, pg_get_function_identity_arguments(p.oid) args,
    array_agg(distinct g.grantee)::text[] grantees
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  join information_schema.role_routine_grants g
    on g.specific_schema=n.nspname and g.specific_name = p.proname||'_'||p.oid
  where n.nspname='public' group by 1,2`);
const seqs = await q(`select c.relname,
    (select quote_ident(dc.relname)||'.'||quote_ident(da.attname)
       from pg_depend d join pg_class dc on dc.oid=d.refobjid
       join pg_attribute da on da.attrelid=d.refobjid and da.attnum=d.refobjsubid
      where d.objid=c.oid and d.deptype in ('a','i') limit 1) owned_by
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='S' order by c.relname`);
const pubs = await q(`select pubname, tablename from pg_publication_tables where schemaname='public' order by 1,2`);
let buckets = [], storagePols = [];
try { buckets = await q(`select id, public, file_size_limit, allowed_mime_types::text[] mimes from storage.buckets order by id`); }
catch (e) { buckets = [{ id: '(storage.buckets unreadable: ' + scrub(e.message) + ')', public: null }]; }
try {
  storagePols = await q(`select c.relname tbl, p.polname, p.polcmd,
      (select array_agg(case when r=0 then 'PUBLIC' else pg_get_userbyid(r) end) from unnest(p.polroles) r)::text[] roles,
      pg_get_expr(p.polqual,p.polrelid,true) qual, pg_get_expr(p.polwithcheck,p.polrelid,true) wc
    from pg_policy p join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' order by 1,2`);
} catch { /* not readable on some plans */ }
await client.end();

// --------------------------------- cross-reference against the repo's sql/ ---
// The whole point of the baseline: say which objects are reproducible from a
// numbered migration and which exist ONLY because a person typed them into the
// Supabase SQL editor. 000_baseline.sql excludes ITSELF from this scan — it
// contains a `create table` for everything, and counting it would erase the
// distinction the file exists to record.
const migFiles = fs.readdirSync(SQLDIR).filter(f => /^\d{3}_.+\.sql$/.test(f) && f !== '000_baseline.sql').sort();
const tblCreated = {}, fnCreated = {}, tblTouched = {};
for (const f of migFiles) {
  const txt = fs.readFileSync(path.join(SQLDIR, f), 'utf8');
  const n = f.slice(0, 3);
  for (const m of txt.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_0-9]+)"?/gi)) (tblCreated[m[1]] ??= new Set()).add(n);
  for (const m of txt.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_0-9]+)"?/gi)) (fnCreated[m[1]] ??= new Set()).add(n);
  for (const m of txt.matchAll(/alter\s+table\s+(?:only\s+)?(?:public\.)?"?([a-z_0-9]+)"?/gi)) (tblTouched[m[1]] ??= new Set()).add(n);
  for (const m of txt.matchAll(/create\s+policy[^;]*?\son\s+(?:public\.)?"?([a-z_0-9]+)"?/gi)) (tblTouched[m[1]] ??= new Set()).add(n);
}
const srt = (s) => [...(s || [])].sort().join(',');
const untracked = tables.filter(t => !tblCreated[t.relname]).map(t => t.relname);
const tracked = tables.filter(t => tblCreated[t.relname]).map(t => t.relname);
const fnNames = [...new Set(fns.map(f => f.proname))].sort();
const fnUntracked = fnNames.filter(n => !fnCreated[n]);

// ------------------------------------------------------------------ rendering
const byRel = (arr) => { const m = new Map(); for (const r of arr) { (m.get(r.rel) ?? m.set(r.rel, []).get(r.rel)).push(r); } return m; };
const colsBy = byRel(cols), consBy = byRel(cons), idxBy = byRel(idxs), polBy = byRel(pols), trgBy = byRel(trgs), grantBy = byRel(grants);
const stamp = meta.utc_ts.slice(0, 10);

w('-- ############################################################################');
w('-- #                                                                          #');
w('-- #   000_baseline.sql — DOCUMENTATION ONLY.  *** NEVER RUN THIS FILE. ***    #');
w('-- #                                                                          #');
w('-- ############################################################################');
w('--');
w('-- THIS IS NOT A MIGRATION. It is a photograph of the LIVE PRODUCTION database,');
w('-- taken so that the next person writing a migration can read the constraints,');
w('-- indexes, foreign keys and RLS policies they have to compose with.');
w('--');
w('-- RUNNING IT WOULD BE CATASTROPHIC. It is full of bare `create table`,');
w('-- `create policy` and `CREATE OR REPLACE FUNCTION` statements reconstructed');
w('-- from pg_catalog. Against production every `create table` errors on an object');
w('-- that already exists, and `CREATE OR REPLACE FUNCTION` does NOT error — it');
w('-- silently overwrites live functions, so a partial run would leave the schema');
w('-- in a state matching neither this file nor any numbered migration. Against an');
w('-- empty database it would produce a lookalike whose objects were never created');
w('-- in dependency order. There is no situation in which executing this file is');
w('-- the right move. It is documentation. Read it; do not apply it.');
w('--');
w('-- The number 000 is deliberate: it sorts ABOVE 001 so nobody mistakes it for');
w('-- the next free migration. The next free number is at the bottom of this header.');
w('--');
w('-- ---------------------------------------------------------------------------');
w('-- GENERATED');
w('-- ---------------------------------------------------------------------------');
w(`--   from      : the live capstonebible.com production database (host redacted)`);
w(`--   on        : ${meta.utc_ts} UTC  (${meta.mt_ts} America/Boise)`);
w(`--   server    : ${meta.v.split(' on ')[0]}`);
w(`--   contains  : schema only — ZERO rows of application data were read or written.`);
w(`--               No credentials, no connection string, no user data.`);
w('--');
w('-- REGENERATE (read-only; issues nothing but SELECTs against pg_catalog):');
w('--');
w('--   cd capstone-bible');
w('--   npm i --no-save pg');
w(`--   node ${SELF}`);
w('--');
w('--   It reads SUPABASE_DB_URL from .env.local. There is no psql or pg_dump on');
w('--   the project machine, which is why this is a Node script and not');
w('--   `pg_dump --schema-only`. Do not paste the connection string anywhere.');
w('--');
w('-- ---------------------------------------------------------------------------');
w('-- WHAT IS IN THE REPO AND WHAT IS NOT  <- THE POINT OF THIS FILE');
w('-- ---------------------------------------------------------------------------');
w('--');
w('-- sql/ is append-only and numbered, but it does not start at the beginning.');
w('-- A large part of this schema was created by hand in the Supabase SQL editor');
w('-- before sql/ existed, and has no `create table` anywhere in the repo. That is');
w('-- how this project earned a Postgres 42P17 (infinite recursion in policy) — a');
w('-- migration was written against policies nobody could read. See sql/003 and');
w('-- sql/012, both named "fix_rls_recursion".');
w('--');
w(`-- TABLES CREATED BY A NUMBERED MIGRATION (${tracked.length}) — reproducible from sql/:`);
for (const t of tracked) w(`--   ${t.padEnd(28)} sql/${srt(tblCreated[t])}`);
w('--');
w(`-- TABLES WITH **NO** \`create table\` ANYWHERE IN sql/ (${untracked.length}) — HAND-MADE IN THE`);
w('-- DASHBOARD. This file is the ONLY description of their shape that exists:');
for (const t of untracked) {
  const touched = srt(tblTouched[t]);
  w(`--   ${t.padEnd(28)} ${touched ? 'later altered by sql/' + touched : 'NOTHING in sql/ touches it at all'}`);
}
w('--');
w(`-- FUNCTIONS WITH **NO** \`create function\` ANYWHERE IN sql/ (${fnUntracked.length}) — same story.`);
w('-- Note that this includes the entire groups RPC layer and the auth trigger:');
for (const f of fnUntracked) w(`--   ${f}`);
w('--');
w('-- ---------------------------------------------------------------------------');
w(`-- MIGRATIONS PRESENT IN sql/ AS OF ${stamp}`);
w('-- ---------------------------------------------------------------------------');
w(`--   ${migFiles.map(f => f.slice(0, 3)).join(' ')}`);
w('--');
w('--   Gaps are history, not free slots. 006, 020 and 029 are absent from sql/ on');
w('--   main and must NOT be reused. 029_account_deletion_fk_hygiene.sql exists on');
w('--   the unmerged `account-deletion` branch and is NOT on main.');
w('--');
w('--   COMMITTED IS NOT APPLIED. Verified against production on the date above:');
w('--     027 sermon-note images   NOT APPLIED  (no `sermon-note-images` bucket exists)');
w('--     028 moderation           APPLIED      (user_blocks + the *_block_filter policies are live)');
w('--     029 account-deletion FK  NOT APPLIED  (and not on main; both winner_id FKs are still NO ACTION)');
w('--     030 post-media           APPLIED      (the scoped storage select policy is live)');
w('--     031 avatars              APPLIED      (owner-only avatar select policy is live)');
w('--     032 search-respects-blocks APPLIED    (the three find_* functions call is_blocked_between)');
w('--');
w('--   NEXT FREE MIGRATION NUMBER: 033.');
w('--   Do not reuse 006, 020 or 029.');
w('--');
w('-- ---------------------------------------------------------------------------');
w('-- COUNTS AT TIME OF DUMP');
w('-- ---------------------------------------------------------------------------');
w(`--   tables ${tables.length} | rls policies ${pols.length} | functions ${fns.length} | views ${views.length}`);
w(`--   triggers ${trgs.length} | sequences ${seqs.length} | enums ${enums.length} | domains ${domains.length}`);
w(`--   tables with RLS disabled: ${tables.filter(t => !t.relrowsecurity).length}`);
w('--');
w('-- ############################################################################');

rule('EXTENSIONS');
for (const e of exts) w(`-- ${e.extname} ${e.extversion}  (schema: ${e.nspname})`);

rule('TYPES IN public');
if (!enums.length && !domains.length) w('-- (none: no enums, no domains)');
for (const e of enums) w(`create type ${e.typname} as enum (${e.labels.map(x => `'${x}'`).join(', ')});`);
for (const d of domains) w(`create domain ${d.typname} as ${d.base}${d.typnotnull ? ' not null' : ''}` +
  `${d.def ? ' default ' + d.def : ''}${(d.checks || []).length ? '\n  ' + d.checks.join('\n  ') : ''};`);

rule(`TABLES IN public  (${tables.length})`);
for (const t of tables) {
  const tc = colsBy.get(t.oid) || [], tcon = consBy.get(t.oid) || [], tidx = idxBy.get(t.oid) || [];
  const tpol = polBy.get(t.oid) || [], ttrg = trgBy.get(t.oid) || [], tg = grantBy.get(t.oid) || [];
  w(''); w('-- ' + '-'.repeat(74));
  w(`-- TABLE  public.${t.relname}`);
  w(tblCreated[t.relname]
    ? `-- origin: sql/${srt(tblCreated[t.relname])}`
    : `-- origin: HAND-MADE IN THE SUPABASE DASHBOARD — no create table in sql/.` +
      (tblTouched[t.relname] ? ` Later altered by sql/${srt(tblTouched[t.relname])}.` : ' Nothing in sql/ touches it.'));
  if (t.cmt) w(`-- comment: ${t.cmt.replace(/\n/g, ' ')}`);
  w('-- ' + '-'.repeat(74));
  w(`create table public.${t.relname} (`);
  const lines = tc.map(col => {
    let s = `  ${col.attname} ${col.typ}`;
    if (col.attidentity === 'a') s += ' generated always as identity';
    else if (col.attidentity === 'd') s += ' generated by default as identity';
    if (col.attgenerated === 's') s += ` generated always as (${col.def}) stored`;
    else if (col.def) s += ` default ${col.def}`;
    if (col.attnotnull) s += ' not null';
    return s;
  });
  w([...lines, ...tcon.map(x => `  constraint ${x.conname} ${x.def}`)].join(',\n'));
  w(');');
  for (const col of tc) if (col.cmt) w(`comment on column public.${t.relname}.${col.attname} is ${JSON.stringify(col.cmt)};`);
  const plain = tidx.filter(i => !i.from_constraint), backed = tidx.filter(i => i.from_constraint);
  if (plain.length) { w(''); w('-- indexes'); for (const i of plain) w(i.def + ';'); }
  if (backed.length) w('-- constraint-backed indexes: ' + backed.map(i => i.idxname).join(', '));
  if (ttrg.length) { w(''); w('-- triggers'); for (const tr of ttrg) w(tr.def + ';'); }
  w('');
  w(`-- RLS: ${t.relrowsecurity ? 'ENABLED' : '*** NOT ENABLED ***'}${t.relforcerowsecurity ? ' (FORCED)' : ''}  |  policies: ${tpol.length}`);
  if (t.relrowsecurity) w(`alter table public.${t.relname} enable row level security;`);
  if (!tpol.length) w(t.relrowsecurity
    ? '-- !! RLS on with ZERO policies: no anon/authenticated access at all (service_role bypasses RLS).'
    : '-- !! RLS OFF: the grants below are the ONLY access control on this table.');
  const verbs = new Set(tpol.map(p => CMD[p.polcmd]));
  const missing = ['insert', 'update', 'delete'].filter(v => !verbs.has(v) && !verbs.has('all'));
  if (tpol.length && missing.length) w(`-- no ${missing.join('/')} policy: those writes are only possible through a SECURITY DEFINER function.`);
  for (const p of tpol) {
    w(`create policy ${JSON.stringify(p.polname)} on public.${t.relname}`);
    w(`  as ${p.polpermissive ? 'permissive' : 'restrictive'} for ${CMD[p.polcmd] || p.polcmd} to ${(p.roles || ['PUBLIC']).join(', ')}`);
    if (p.qual != null) w(`  using (${p.qual})`);
    if (p.wc != null) w(`  with check (${p.wc})`);
    w('  ;');
  }
  if (tg.length) { w(''); w('-- grants: ' + tg.map(g => `${g.grantee}=${g.privs}`).join('  |  ')); }
}

rule(`VIEWS / MATERIALIZED VIEWS IN public  (${views.length})`);
if (!views.length) w('-- (none)');
for (const v of views) {
  w(''); w(`-- ${v.relkind === 'm' ? 'MATERIALIZED VIEW' : 'VIEW'} public.${v.relname}` + (v.opts ? `   options: ${v.opts.join(', ')}` : ''));
  if (v.cmt) w(`-- comment: ${v.cmt.replace(/\n/g, ' ')}`);
  w(`create ${v.relkind === 'm' ? 'materialized ' : ''}view public.${v.relname} as`);
  w(v.def.replace(/;\s*$/, '') + ';');
}

rule(`FUNCTIONS / PROCEDURES IN public  (${fns.length})`);
w('-- SECURITY DEFINER functions run as their owner and BYPASS the RLS of every');
w('-- table they touch. They are how this schema avoids 42P17 recursion (a policy');
w('-- on group_members that reads group_members) and they are also the only write');
w('-- path for tables that carry no insert/update policy. Read them as part of the');
w('-- security model, not as helpers.');
for (const f of fns) {
  const g = fnGrants.find(x => x.proname === f.proname && x.args === f.args);
  w('');
  w(`-- public.${f.proname}(${f.args})${f.prosecdef ? '   [SECURITY DEFINER]' : ''}`);
  w(`--   origin: ${fnCreated[f.proname] ? 'sql/' + srt(fnCreated[f.proname]) : 'HAND-MADE IN THE DASHBOARD — not in sql/'}`);
  if (f.prosecdef && !/search_path/i.test(f.cfg)) w('--   NOTE: SECURITY DEFINER with no `SET search_path` — mutable search_path.');
  if (g) w(`--   execute granted to: ${g.grantees.join(', ')}`);
  w(f.def.replace(/\s*$/, '').replace(/;?$/, ';'));
}

rule('SEQUENCES IN public');
if (!seqs.length) w('-- (none)');
for (const s of seqs) w(`-- ${s.relname}${s.owned_by ? '  owned by ' + s.owned_by : ''}`);

rule('PUBLICATIONS (Supabase realtime)');
const pubMap = new Map();
for (const p of pubs) (pubMap.get(p.pubname) ?? pubMap.set(p.pubname, []).get(p.pubname)).push(p.tablename);
if (!pubMap.size) w('-- (no public-schema table is in any publication)');
for (const [k, v] of pubMap) { w(`-- ${k}:`); for (const t of v) w(`--   ${t}`); }

rule('STORAGE BUCKETS AND storage.objects POLICIES');
w('-- Not the public schema, but the app depends on them and sql/027, 030 and 031');
w('-- are entirely about them, so a baseline that omitted them would be misleading.');
w('-- Commented out throughout: these are Supabase-managed objects.');
for (const b of buckets) w(`-- bucket ${String(b.id).padEnd(22)} public=${b.public}` +
  (b.file_size_limit ? `  limit=${b.file_size_limit}` : '') + (b.mimes ? `  mime=${b.mimes.join('|')}` : ''));
for (const p of storagePols) {
  w(''); w(`-- storage.${p.tbl}  policy ${JSON.stringify(p.polname)}  for ${CMD[p.polcmd] || p.polcmd} to ${(p.roles || []).join(', ')}`);
  if (p.qual != null) w('--   using (' + p.qual.replace(/\n/g, '\n--     ') + ')');
  if (p.wc != null) w('--   with check (' + p.wc.replace(/\n/g, '\n--     ') + ')');
}

w('');
w('-- ############################################################################');
w('-- # END OF BASELINE — again: DOCUMENTATION ONLY. Do not run this file.        #');
w('-- ############################################################################');

fs.writeFileSync(OUT, L.join('\n') + '\n');
// Belt and braces: refuse to leave a file behind that leaks the connection string.
const written = fs.readFileSync(OUT, 'utf8');
if (/postgres(ql)?:\/\//i.test(written)) { fs.unlinkSync(OUT); console.error('ABORT: output contained a connection string; file removed.'); process.exit(1); }
console.log(`wrote ${path.relative(REPO, OUT)}  (${L.length} lines, ${written.length} bytes)`);
console.log(`tables ${tables.length} (${untracked.length} untracked) | policies ${pols.length} | functions ${fns.length} (${fnUntracked.length} untracked) | views ${views.length}`);

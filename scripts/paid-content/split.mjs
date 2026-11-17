#!/usr/bin/env node
// split.mjs — cut every article record into its FREE part and its PAID body, write the
// `content_paid` seed, and PROVE the cut loses nothing.
//
//   node scripts/paid-content/split.mjs            # write scripts/paid-content/out/*, run every check
//   node scripts/paid-content/split.mjs --check    # run every check, write nothing (exit 1 on failure)
//
// The source of truth does not move: capstone-content keeps editing src/data/*.ts exactly as before.
// This script derives, deterministically, from those files plus src/lib/paidContentSpec.ts:
//
//   out/content_paid.json   [{kind, id, body, content_hash}] sorted by kind then id
//   out/content_paid.sql    one transaction: upsert every row (only rows whose hash changed are
//                           rewritten), delete rows whose record no longer exists, and record the
//                           content version in app_settings 'paid.content_version'. Re-runnable.
//   out/manifest.json       counts, byte sizes and the content version hash
//
// out/ is gitignored: it is a build product. Commit the inputs, never the seed.
//
// CHECKS (all must pass, in both modes):
//   1. round trip  — for every record, canonical JSON of merge(free, paid) is byte-identical to the
//                    canonical JSON of the record as authored. Canonical = keys sorted at every level,
//                    so the proof does not depend on object key order (merge appends the paid keys).
//   2. disjoint    — no key is in both halves.
//   3. no leak     — no paid string of 40+ characters appears in that record's server-mode bundle
//                    emission, except the one documented lead line per place/site and strings the
//                    free half itself carries verbatim (a facsimile URL also cited as a source).
//   4. unique ids  — (kind, id) is unique, so the table's primary key cannot reject the seed.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATASETS, REPO_ROOT, canonicalJson, loadDataAndSpec } from "./lib.mjs";

const CHECK_ONLY = process.argv.includes("--check");
const OUT = path.join(REPO_ROOT, "scripts/paid-content/out");

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const sqlString = (s) => `'${s.replaceAll("'", "''")}'`;

function* stringsIn(v) {
  if (typeof v === "string") yield v;
  else if (Array.isArray(v)) for (const x of v) yield* stringsIn(x);
  else if (v && typeof v === "object") for (const x of Object.values(v)) yield* stringsIn(x);
}

export async function buildSplit(root = REPO_ROOT) {
  const data = await loadDataAndSpec(root);
  const { spec } = data;
  const rows = [];
  const failures = [];
  const sizes = {};
  const seen = new Set();

  for (const { kind, exportName } of DATASETS) {
    const records = data[exportName];
    let freeBytes = 0;
    let paidBytes = 0;
    let fullBytes = 0;
    for (const record of records) {
      const key = `${kind}:${record.id}`;
      if (seen.has(key)) failures.push(`duplicate id ${key}`);
      seen.add(key);

      const { free, paid } = spec.splitRecord(kind, record);
      const overlap = Object.keys(free).filter((k) => k in paid);
      if (overlap.length) failures.push(`${key}: keys in both halves: ${overlap.join(", ")}`);

      const before = canonicalJson(record);
      const after = canonicalJson(spec.mergeRecord(free, paid));
      if (before !== after) failures.push(`${key}: free + paid does not reassemble the record`);

      const emitted = JSON.stringify(spec.freeEmission(kind, record));
      const lead = kind === "place" ? spec.placeLead(record) : kind === "site" ? spec.siteLead(record) : null;
      const firstFact = kind === "place" ? record.history?.notableFacts?.[0] : undefined;
      // A paid string that the free half ALSO carries verbatim (a manuscript's facsimile URL cited
      // again in its sources, a museum named in the facts block and in a citation) is free already.
      const freeStrings = new Set(stringsIn(free));
      for (const s of stringsIn(paid)) {
        if (s.length < 40 || s === lead || s === firstFact || [...freeStrings].some((f) => f.includes(s))) continue;
        if (emitted.includes(JSON.stringify(s).slice(1, -1))) {
          failures.push(`${key}: paid text leaks into the bundle emission: ${JSON.stringify(s.slice(0, 60))}…`);
          break;
        }
      }

      const body = JSON.stringify(paid);
      rows.push({ kind, id: record.id, body: paid, content_hash: sha256(canonicalJson(paid)) });
      freeBytes += JSON.stringify(free).length;
      paidBytes += body.length;
      fullBytes += JSON.stringify(record).length;
    }
    sizes[kind] = { records: records.length, fullBytes, freeBytes, paidBytes };
  }

  rows.sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const version = sha256(rows.map((r) => `${r.kind}\t${r.id}\t${r.content_hash}`).join("\n")).slice(0, 16);
  return { rows, failures, sizes, version };
}

export function seedSql(rows, version) {
  const lines = [
    "-- GENERATED by scripts/paid-content/split.mjs from src/data/*.ts + src/lib/paidContentSpec.ts.",
    "-- Do not edit. Do not commit. Re-run the script instead. Requires sql/043_paid_content.sql applied.",
    `-- content version ${version}, ${rows.length} rows.`,
    "-- Runs as the database owner (psql / SQL editor / service connection): content_paid has no client",
    "-- write path at all, by design.",
    "begin;",
    "",
  ];
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    lines.push("insert into public.content_paid (kind, id, body, content_hash) values");
    lines.push(
      chunk
        .map((r) => `  (${sqlString(r.kind)}, ${sqlString(r.id)}, ${sqlString(JSON.stringify(r.body))}::jsonb, ${sqlString(r.content_hash)})`)
        .join(",\n")
    );
    lines.push(
      "on conflict (kind, id) do update set body = excluded.body, content_hash = excluded.content_hash, updated_at = now()\n" +
        "  where public.content_paid.content_hash is distinct from excluded.content_hash;"
    );
    lines.push("");
  }
  // Records deleted from src/data lose their paid row too — otherwise a withdrawn article's text
  // would sit readable in the table forever.
  lines.push("delete from public.content_paid c where not exists (select 1 from (values");
  lines.push(rows.map((r) => `  (${sqlString(r.kind)}, ${sqlString(r.id)})`).join(",\n"));
  lines.push(") as keep(kind, id) where keep.kind = c.kind and keep.id = c.id);");
  lines.push("");
  lines.push(
    `update public.app_settings set value = to_jsonb(${sqlString(version)}::text), updated_at = now() where key = 'paid.content_version';`
  );
  lines.push("commit;");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const { rows, failures, sizes, version } = await buildSplit();
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  let totFull = 0;
  let totFree = 0;
  let totPaid = 0;
  for (const [kind, s] of Object.entries(sizes)) {
    console.log(`${kind.padEnd(7)} ${String(s.records).padStart(4)} records  full ${kb(s.fullBytes).padStart(8)}  free ${kb(s.freeBytes).padStart(8)}  paid ${kb(s.paidBytes).padStart(8)}`);
    totFull += s.fullBytes;
    totFree += s.freeBytes;
    totPaid += s.paidBytes;
  }
  console.log(`total   ${String(rows.length).padStart(4)} records  full ${kb(totFull).padStart(8)}  free ${kb(totFree).padStart(8)}  paid ${kb(totPaid).padStart(8)}`);
  console.log(`content version ${version}`);

  if (failures.length) {
    for (const f of failures.slice(0, 50)) console.error(`FAIL ${f}`);
    console.error(`${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log(`round trip: ${rows.length}/${rows.length} records reassemble byte-identical (canonical JSON); halves disjoint; no paid text in the bundle emission; ids unique`);

  if (CHECK_ONLY) return;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "content_paid.json"), JSON.stringify(rows) + "\n");
  fs.writeFileSync(path.join(OUT, "content_paid.sql"), seedSql(rows, version));
  fs.writeFileSync(
    path.join(OUT, "manifest.json"),
    JSON.stringify({ version, rows: rows.length, sizes }, null, 2) + "\n"
  );
  console.log(`wrote ${path.relative(REPO_ROOT, OUT)}/content_paid.{json,sql} and manifest.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

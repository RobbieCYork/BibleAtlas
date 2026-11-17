#!/usr/bin/env node
// check-bundle.mjs — look for Capstone Plus text in a BUILT app, from outside it.
//
//   node scripts/paid-content/check-bundle.mjs <distDir>      exit 1 if any paid text is found
//
// Scans every .js file under <distDir>/assets for every paid string of 40+ characters
// (src/lib/paidContentSpec.ts), skipping the same documented exceptions as split.mjs: the one free
// lead line per place/site, and strings the record's free half carries verbatim. Run it on a
// `server`-mode build: a hit means the text is downloadable without an account. On a `bundle`-mode
// build every paid string is expected to be present, which is a useful sanity check that the scan
// itself works (pass --expect-present).
//
// Matching is on the raw text, on its JSON-escaped form (how the server-mode emission embeds it),
// and on the double-escaped form (JSON inside a JS string literal), so a string is not missed just
// because it contains a quote or a backslash.

import fs from "node:fs";
import path from "node:path";
import { DATASETS, REPO_ROOT, loadDataAndSpec } from "./lib.mjs";

const dist = process.argv[2];
const expectPresent = process.argv.includes("--expect-present");
if (!dist) {
  console.error("usage: check-bundle.mjs <distDir> [--expect-present]");
  process.exit(2);
}

function* stringsIn(v) {
  if (typeof v === "string") yield v;
  else if (Array.isArray(v)) for (const x of v) yield* stringsIn(x);
  else if (v && typeof v === "object") for (const x of Object.values(v)) yield* stringsIn(x);
}

const assets = path.join(dist, "assets");
const js = fs
  .readdirSync(assets)
  .filter((f) => f.endsWith(".js"))
  .map((f) => fs.readFileSync(path.join(assets, f), "utf8"))
  .join("\n");

const data = await loadDataAndSpec();
const { spec } = data;

// Text that is free ANYWAY: every record's free emission (a facsimile URL one manuscript cites as a
// source can be another manuscript's free facts-block link), and every other source file in src/
// (the crossword backgrounds reuse the archaeology photos; verseAnnotations.ts quotes a few facts as
// linker exceptions). A paid string found in the bundle that is also here is not a leak of paid text.
const DATA_FILES = new Set(DATASETS.map((d) => path.join(REPO_ROOT, d.file)));
const otherSources = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !DATA_FILES.has(full)) otherSources.push(fs.readFileSync(full, "utf8"));
  }
})(path.join(REPO_ROOT, "src"));
const freeElsewhere =
  DATASETS.flatMap(({ kind, exportName }) => data[exportName].map((r) => JSON.stringify(spec.freeEmission(kind, r)))).join("\n") +
  "\n" +
  otherSources.join("\n");
let alsoFree = 0;
let checked = 0;
let found = 0;
const examples = [];
for (const { kind, exportName } of DATASETS) {
  for (const record of data[exportName]) {
    const { free, paid } = spec.splitRecord(kind, record);
    const freeStrings = [...stringsIn(free)];
    const lead = kind === "place" ? spec.placeLead(record) : kind === "site" ? spec.siteLead(record) : null;
    const firstFact = kind === "place" ? record.history?.notableFacts?.[0] : undefined;
    for (const s of new Set(stringsIn(paid))) {
      if (s.length < 40 || s === lead || s === firstFact || freeStrings.some((f) => f.includes(s))) continue;
      const once = JSON.stringify(s).slice(1, -1);
      if (freeElsewhere.includes(s) || freeElsewhere.includes(once)) {
        alsoFree++;
        continue;
      }
      checked++;
      const twice = JSON.stringify(once).slice(1, -1);
      if (js.includes(s) || js.includes(once) || js.includes(twice)) {
        found++;
        if (examples.length < 10) examples.push(`${kind}:${record.id} ${JSON.stringify(s.slice(0, 50))}…`);
      }
    }
  }
}

console.log(`paid strings checked: ${checked} (${alsoFree} more skipped: also free elsewhere in the app); found in ${dist}/assets/*.js: ${found}`);
for (const e of examples) console.log(`  e.g. ${e}`);
if (expectPresent) {
  // Minification can re-escape a few strings; nearly all must still be found for the scan to be trusted.
  if (found < checked * 0.98) {
    console.error("FAIL: a bundle-mode build should contain the paid text; the scan is not finding it");
    process.exit(1);
  }
  console.log("ok: bundle-mode build contains the paid text (the scan works)");
} else if (found > 0) {
  console.error("FAIL: paid text is in the shipped JS");
  process.exit(1);
} else {
  console.log("ok: no paid text in the shipped JS");
}

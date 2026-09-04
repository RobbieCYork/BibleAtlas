#!/usr/bin/env node
// Regression net for src/lib/verseAnnotations.ts.
//
//   npm run test:linker                                  everything (~1s) — use this
//   node scripts/name-linker/run.mjs --cases-only        just the named cases, no snapshot
//   node scripts/name-linker/run.mjs --update            accept the snapshot as it now stands
//   node scripts/name-linker/run.mjs --ref "Acts 1:13"   how one verse resolves; ";" for several
//   node scripts/name-linker/run.mjs --grep "mark of"    every verse matching a pattern
//
// The default does both halves because the whole thing takes about a second: it asserts the named
// cases in cases.mjs, then regenerates the whole-corpus snapshot (all 31,098 WEB verses and every
// authored prose block, on both rendering paths) and diffs it against the committed baseline.
//
// The snapshot is the part that matters. 9,704 Bible links and 5,783 prose links are far more than
// anyone has read; the diff is what tells you that a one-line data edit moved 400 of them. `--update`
// is how you accept a deliberate move — the snapshot diff then lands in the same commit as the
// change that caused it, and a reviewer can read every moved row.
//
// Exit code is 0 only when the cases pass AND the snapshot is unchanged.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLinker, stripMarkup } from "./loadLinker.mjs";
import { loadBible, loadProseBlocks, snapshotBible, snapshotProse, snapshotKeyTotals } from "./corpus.mjs";
import { CASES } from "./cases.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SNAP_BIBLE = path.join(HERE, "snapshot/bible-links.tsv");
const SNAP_PROSE = path.join(HERE, "snapshot/prose-links.tsv");
const SNAP_KEYS = path.join(HERE, "snapshot/key-totals.tsv");

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const update = has("--update");
const full = !has("--cases-only");
const refArg = argv.includes("--ref") ? argv[argv.indexOf("--ref") + 1] : null;

const RED = "\x1b[31m", GREEN = "\x1b[32m", YELLOW = "\x1b[33m", DIM = "\x1b[2m", OFF = "\x1b[0m";

function parseRef(ref) {
  const m = /^(.+?)\s+(\d+):(\d+)$/.exec(ref);
  if (!m) throw new Error(`Unparseable reference: ${ref}`);
  return { book: m[1], chapter: Number(m[2]), verse: Number(m[3]) };
}

const verses = loadBible();
const byRef = new Map(verses.map((v) => [`${v.book} ${v.chapter}:${v.verse}`, v]));
const { computeLinkAnnotations } = await loadLinker();

// ---------------------------------------------------------------- inspection aids
function showVerse(v) {
  const text = stripMarkup(v.text);
  console.log(`${v.book} ${v.chapter}:${v.verse}\n  ${text}`);
  const reader = computeLinkAnnotations(text, undefined, v.book, v.chapter, v.verse).filter((a) => a.kind === "person");
  const panel = computeLinkAnnotations(text).filter((a) => a.kind === "person");
  const spans = [...new Set([...reader, ...panel].map((a) => `${a.start}:${a.end}`))]
    .sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]));
  if (!spans.length) console.log(`  ${DIM}(no person links either way)${OFF}`);
  for (const key of spans) {
    const [s, e] = key.split(":").map(Number);
    const r = reader.find((a) => a.start === s)?.id ?? "—";
    const p = panel.find((a) => a.start === s)?.id ?? "—";
    const same = r === p;
    console.log(`  @${String(s).padStart(4)} ${JSON.stringify(text.slice(s, e)).padEnd(26)} ` +
      `reader ${String(r).padEnd(30)} ${same ? DIM + "panel same" + OFF : YELLOW + "panel " + p + OFF}`);
  }
  console.log("");
}

// --ref takes one reference, or several separated by ";" (the shell-loop-free way to inspect a set).
if (refArg) {
  for (const ref of refArg.split(";").map((s) => s.trim()).filter(Boolean)) {
    const v = byRef.get(ref);
    if (!v) { console.error(`${RED}No such verse in the corpus: ${ref}${OFF}`); process.exitCode = 2; continue; }
    showVerse(v);
  }
  process.exit(process.exitCode ?? 0);
}

// --grep <regex> shows every verse in the corpus whose text matches, with its resolutions. This is
// how you find the whole population of a fault instead of the examples someone happened to notice.
if (has("--grep")) {
  const re = new RegExp(argv[argv.indexOf("--grep") + 1], "i");
  const bookFilter = has("--book") ? argv[argv.indexOf("--book") + 1] : null;
  let n = 0;
  for (const v of verses) {
    if (bookFilter && v.book !== bookFilter) continue;
    if (!re.test(stripMarkup(v.text))) continue;
    n++;
    showVerse(v);
  }
  console.log(`${DIM}${n} matching verses${OFF}`);
  process.exit(0);
}

// ---------------------------------------------------------------- fast mode: the named cases
//
// A "guard" or "flagged" case must match `expect`.
// A "known-wrong" case is expected NOT to match `expect` yet: `expect` records the answer the app
// ought to give, and the case passes while the app still gives something else. When it starts
// matching, the case FAILS — deliberately — telling you to flip it to "guard" in the same commit.
// That is what keeps this file from drifting into a list of stale claims.

let pass = 0, fail = 0, stillBroken = 0;
const failures = [], newlyFixed = [];

/** Locate the Nth whole-word occurrence of `surface` in `text` by scanning the TEXT, not the
 * annotations — a suppressed link produces no annotation at all, so counting annotations cannot
 * find the occurrence you mean to assert is absent. */
function occurrenceOffset(text, surface, n) {
  const needle = surface.toLowerCase(), hay = text.toLowerCase();
  const offs = [];
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) {
    if (/[a-z0-9]/.test(hay[i - 1] ?? "") || /[a-z0-9]/.test(hay[i + needle.length] ?? "")) continue;
    offs.push(i);
  }
  return offs.length >= n ? offs[n - 1] : null;
}

for (const c of CASES) {
  const { book, chapter, verse } = parseRef(c.ref);
  const v = byRef.get(c.ref);
  const n = c.occurrence ?? 1;
  const label = `${c.ref} ${JSON.stringify(c.surface)}${n > 1 ? `#${n}` : ""} ` +
    `[${c.path ?? "reader"}${c.owner ? ` on ${c.owner}` : ""}]`;
  if (!v) { failures.push(`${label} — verse is not in the corpus`); fail++; continue; }

  const text = stripMarkup(v.text);
  const at = occurrenceOffset(text, c.surface, n);
  if (at === null) {
    failures.push(`${label} — that occurrence is not in the WEB text of the verse.\n` +
      `      ${DIM}${text}${OFF}`);
    fail++; continue;
  }

  // `owner` is the id a detail panel passes as excludeId — the record whose page the text is on.
  // It is the only context LinkedVerseText has (no book, no chapter, no verse), and it is what
  // OWNER_NAME_OVERRIDES reads, so a panel case can pin it. Absent, panel cases pass nothing, as
  // they always have.
  const ctx = c.path === "panel" ? [c.owner] : [undefined, book, chapter, verse];
  // The annotation COVERING the occurrence, not the one starting on it: a longer registered key
  // ("the Counselor", "James the son of Alphaeus") legitimately begins earlier and swallows it.
  const ann = computeLinkAnnotations(text, ...ctx)
    .find((a) => a.start <= at && a.end >= at + c.surface.length);
  const got = ann?.id ?? null;
  const want = c.expect ?? null;
  // `expectSurface` pins the whole span the link covers, not just where it points — the difference
  // between "James is a link to Thaddaeus" (wrong) and "the phrase 'Judas the son of James' is one
  // link to Thaddaeus, and the father is not linked separately" (right).
  const gotSurface = ann?.text ?? null;
  const matches = got === want && (!c.expectSurface || gotSurface === c.expectSurface);

  if (c.status === "known-wrong") {
    if (matches) {
      fail++; newlyFixed.push(c);
      failures.push(`${label} ${GREEN}now resolves correctly${OFF} — but is still marked ` +
        `"known-wrong".\n      ${YELLOW}Flip its status to "guard" in this commit.${OFF}\n` +
        `      ${DIM}${c.why}${OFF}`);
    } else { pass++; stillBroken++; }
  } else if (matches) {
    pass++;
  } else {
    fail++;
    failures.push(`${label}${c.status === "flagged" ? ` ${RED}(FLAGGED — §7, Robbie's call)${OFF}` : ""}\n` +
      `      expected: ${want ?? "(no link)"}${c.expectSurface ? `  covering ${JSON.stringify(c.expectSurface)}` : ""}\n` +
      `      actual:   ${got ?? "(no link)"}${c.expectSurface ? `  covering ${JSON.stringify(gotSurface)}` : ""}\n` +
      `      ${DIM}${c.why}${OFF}`);
  }
}

console.log(`\n${fail === 0 ? GREEN : RED}cases: ${pass} passed, ${fail} failed${OFF} (of ${CASES.length})`);
if (failures.length) {
  console.log(`\n${RED}FAILURES${OFF}`);
  for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
}
if (stillBroken) {
  console.log(`${YELLOW}  ${stillBroken} case(s) still resolve WRONGLY${OFF} ` +
    `${DIM}(status: "known-wrong" — recorded, not yet fixed)${OFF}`);
}
if (newlyFixed.length) {
  console.log(`${GREEN}  ${newlyFixed.length} known-wrong case(s) started passing — record them.${OFF}`);
}

// ---------------------------------------------------------------- full mode: corpus snapshot diff
let snapshotChanged = false;
if (full) {
  const t0 = Date.now();
  const blocks = await loadProseBlocks();
  const bibleRows = await snapshotBible(verses);
  const proseRows = await snapshotProse(blocks);
  const keyRows = await snapshotKeyTotals(verses, blocks);
  console.log(`\n${DIM}corpus: ${verses.length} verses -> ${bibleRows.length} person-link rows; ` +
    `prose -> ${proseRows.length} person-link rows; ${keyRows.length} key totals across all kinds ` +
    `(${((Date.now() - t0) / 1000).toFixed(1)}s)${OFF}`);

  for (const [file, rows, label] of [[SNAP_BIBLE, bibleRows, "bible"], [SNAP_PROSE, proseRows, "prose"],
                                     [SNAP_KEYS, keyRows, "key-totals"]]) {
    const next = rows.join("\n") + "\n";
    if (update) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, next); continue; }
    if (!fs.existsSync(file)) { console.log(`${RED}no baseline snapshot at ${file} — run with --update${OFF}`); snapshotChanged = true; continue; }
    const prev = fs.readFileSync(file, "utf8");
    if (prev === next) { console.log(`${GREEN}snapshot/${label}: unchanged${OFF}`); continue; }
    snapshotChanged = true;
    const a = new Set(prev.trimEnd().split("\n")), b = new Set(next.trimEnd().split("\n"));
    const removed = [...a].filter((r) => !b.has(r)), added = [...b].filter((r) => !a.has(r));
    console.log(`${YELLOW}snapshot/${label}: CHANGED — ${removed.length} rows out, ${added.length} rows in${OFF}`);
    for (const r of removed.slice(0, 40)) console.log(`    ${RED}-${OFF} ${r}`);
    if (removed.length > 40) console.log(`    ${DIM}… ${removed.length - 40} more removed${OFF}`);
    for (const r of added.slice(0, 40)) console.log(`    ${GREEN}+${OFF} ${r}`);
    if (added.length > 40) console.log(`    ${DIM}… ${added.length - 40} more added${OFF}`);
  }
  if (update) console.log(`${YELLOW}snapshots rewritten. Review the git diff — every moved row is a claim.${OFF}`);
} else {
  console.log(`${DIM}(--cases-only: the whole-corpus snapshot was not checked)${OFF}`);
}

process.exit(fail > 0 || (snapshotChanged && !update) ? 1 : 0);

#!/usr/bin/env node
// Every occurrence of one lookup key across Scripture, with the things you need in order to judge
// it: where it is, how it is capitalised, whether it sits at the start of a sentence, and what each
// rendering path resolves it to.
//
//   node scripts/name-linker/census.mjs mark
//   node scripts/name-linker/census.mjs "the adversary" --context 60
//   node scripts/name-linker/census.mjs joram --book "2 Kings"
//
// Written because the alternative — reasoning about how a name "probably" appears — is how wrong
// counts get into reports. Run this before claiming a fix removes N faults.

import { loadLinker, stripMarkup } from "./loadLinker.mjs";
import { loadBible, loadProseBlocks } from "./corpus.mjs";

const argv = process.argv.slice(2);
const key = argv.find((a) => !a.startsWith("--"));
if (!key) { console.error("usage: census.mjs <name> [--book <Book>] [--context N] [--prose]"); process.exit(2); }
const bookFilter = argv.includes("--book") ? argv[argv.indexOf("--book") + 1] : null;
const CTX = Number(argv.includes("--context") ? argv[argv.indexOf("--context") + 1] : 46);
const withProse = argv.includes("--prose");

const DIM = "\x1b[2m", YELLOW = "\x1b[33m", OFF = "\x1b[0m";
const { computeLinkAnnotations } = await loadLinker();

/** Is the match forced into a capital by sitting at the start of a sentence? If so its capital
 * carries no information about whether it is a proper noun — the distinction that decides whether
 * a "capitalised only" rule can help here at all. */
function sentenceInitial(text, at) {
  const before = text.slice(0, at).replace(/[“"'(\[]+\s*$/, "").trimEnd();
  return before === "" || /[.!?:;]$/.test(before);
}

const needle = key.toLowerCase();
const rows = [];
for (const v of loadBible()) {
  if (bookFilter && v.book !== bookFilter) continue;
  const text = stripMarkup(v.text);
  const hay = text.toLowerCase();
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) {
    if (/[a-z0-9]/.test(hay[i - 1] ?? "") || /[a-z0-9]/.test(hay[i + needle.length] ?? "")) continue;
    const surface = text.slice(i, i + needle.length);
    // Find the annotation that COVERS this occurrence, not the one that starts on it. A longer
    // registered key can swallow the word — "the Counselor" is its own key and matches one
    // character earlier than "Counselor" — and looking only at exact starts reports those as
    // unlinked, which is the opposite of the truth.
    const covers = (a) => a.start <= i && a.end >= i + needle.length;
    const reader = computeLinkAnnotations(text, undefined, v.book, v.chapter, v.verse).find(covers);
    const panel = computeLinkAnnotations(text).find(covers);
    rows.push({
      ref: `${v.book} ${v.chapter}:${v.verse}`,
      surface,
      via: reader && reader.start !== i ? text.slice(reader.start, reader.end) : null,
      cap: /^[A-Z]/.test(surface),
      init: sentenceInitial(text, i),
      reader: reader?.id ?? null,
      panel: panel?.id ?? null,
      ctx: text.slice(Math.max(0, i - CTX), i) + `«${surface}»` + text.slice(i + needle.length, i + needle.length + CTX),
    });
  }
}

for (const r of rows) {
  const flags = `${r.cap ? "CAP" : "low"}${r.init ? "/sent-init" : "         "}`;
  if (r.via) console.log(`${" ".repeat(20)} ${DIM}(matched under the longer key ${JSON.stringify(r.via)})${OFF}`);
  console.log(`${r.ref.padEnd(20)} ${flags}  reader=${String(r.reader ?? "—").padEnd(26)}` +
    `${r.reader === r.panel ? DIM + "panel=same" + OFF : YELLOW + "panel=" + (r.panel ?? "—") + OFF}`);
  console.log(`    ${DIM}…${r.ctx}…${OFF}`);
}

const n = rows.length;
const cap = rows.filter((r) => r.cap).length;
const capNonInitial = rows.filter((r) => r.cap && !r.init).length;
const linkedReader = rows.filter((r) => r.reader).length;
console.log(`\n${key}: ${n} occurrences in Scripture` + (bookFilter ? ` (${bookFilter} only)` : ""));
console.log(`  capitalised: ${cap}   of those, NOT sentence-initial: ${capNonInitial}   lowercase: ${n - cap}`);
console.log(`  linked by the reader path: ${linkedReader}   suppressed: ${n - linkedReader}`);
console.log(`  ${DIM}A "capitalised only" rule suppresses the ${n - cap} lowercase ones.${OFF}`);
console.log(`  ${DIM}Additionally ignoring sentence-initial capitals would reach ${n - capNonInitial} — at the cost of every genuine sentence-initial mention.${OFF}`);

if (withProse) {
  const blocks = await loadProseBlocks();
  let pn = 0, plow = 0;
  console.log(`\n--- prose ---`);
  for (const b of blocks) {
    for (const a of computeLinkAnnotations(b.text, b.owner)) {
      if (a.text.toLowerCase() !== needle) continue;
      pn++;
      if (!/^[A-Z]/.test(a.text)) plow++;
      console.log(`${b.src} (${b.owner ?? "-"}) -> ${a.id}`);
      console.log(`    ${DIM}…${b.text.slice(Math.max(0, a.start - CTX), a.start)}«${a.text}»` +
        `${b.text.slice(a.end, a.end + CTX)}…${OFF}`);
    }
  }
  console.log(`\n  prose: ${pn} occurrences, ${plow} of them lowercase`);
}

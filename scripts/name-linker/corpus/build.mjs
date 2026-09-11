#!/usr/bin/env node
// Rebuilds the KJV and ASV corpora from bolls.life's bulk translation files, and — first — proves
// that the same bulk endpoint reproduces the committed WEB corpus exactly. That proof is the whole
// reason the other two are trusted: web-bible.json.gz was fetched chapter by chapter from
// bolls.life/get-text/ in 2026-09-04, the bulk files are a different endpoint, and "it is the same
// service" is an assumption until somebody diffs it.
//
//   node scripts/name-linker/corpus/build.mjs           verify WEB, rebuild KJV and ASV
//   node scripts/name-linker/corpus/build.mjs --verify  verify only, write nothing
//
// It downloads ~31MB. Nothing else in the harness needs the network; this is the only script here
// that touches it, and the corpora it writes are committed so nobody else has to.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { stripMarkup } from "../loadLinker.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const verifyOnly = process.argv.includes("--verify");

const BOOKS = [...fs.readFileSync(path.join(REPO, "src/data/bibleBooks.ts"), "utf8")
  .matchAll(/name: "([^"]+)", chapters: (\d+)/g)].map((m) => m[1]);
if (BOOKS.length !== 66) throw new Error(`expected 66 books from bibleBooks.ts, parsed ${BOOKS.length}`);

/** bolls embeds three things a printed Bible does not have.
 *
 *   <S>1234</S>   Strong's numbers, interleaved with the words. BiblePanel's own search strips
 *                 these (`cleanSearchText`); they must go as a UNIT, because replacing the tags
 *                 alone leaves the digits sitting in the text as if they were words.
 *   <sup>…</sup>  NOT the same thing in the two translations, and this is the one judgement call
 *                 in this file. In the ASV it holds the Psalm superscriptions ("A Psalm of David,
 *                 when he fled from Absalom his son") — printed text, 116 of them, and
 *                 bible-api.com serves them. In the KJV it holds the 1611 translators' MARGINAL
 *                 NOTES ("firmament: Heb. expansion") — 7,716 of them, which bible-api.com does
 *                 not serve and no reader of this app will ever see. Keeping them would have
 *                 invented thousands of links in text nobody renders, so KJV <sup> is dropped with
 *                 its contents and ASV <sup> keeps its words.
 *   <i> / <b>     italics for supplied words. Kept, exactly as the WEB corpus keeps them.
 */
function clean(text, translation) {
  // A Strong's tag's payload is never verse text, so the whole element goes whatever is inside it.
  // Matching `<S>\d+</S>` is not enough and the failure is silent: bolls' ASV — alone of the three,
  // the KJV's 351,812 tags are all well formed — carries 834 tags holding two numbers
  // (`<S>2316, 2532</S>`) and 279 holding outright garbage (`<S>3739, Leviticus2</S>`). Under the
  // narrow pattern those tags survived as words, and 1,008 ASV verses reached the linker reading
  // "to God 2316, 2532 the Father" and "the other disciple outran 4390, Deuteronomy32 Peter".
  let t = text.replace(/<S>[^<]*<\/S>/g, "");
  if (translation === "KJV") t = t.replace(/<sup>.*?<\/sup>/gs, " ");
  return t.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** A removed tag leaves its space behind, and bolls puts the tag AFTER the word and BEFORE the
 * punctuation ("flesh<S>1320</S>:"), so a plain strip yields "flesh :" — spacing no printed Bible
 * has, in 500-odd KJV verses. It matters here beyond tidiness: every offset the harness records is
 * an offset into this string, and `bible-api.com` — what the reader actually renders — prints the
 * punctuation tight.
 *
 * Applied to the KJV and ASV only. The committed WEB corpus carries the same artefact and is NOT
 * repaired, because repairing it would move offsets in all 9,724 rows of `bible-links.tsv` for a
 * cosmetic reason; that is its own change, with its own diff to read. */
function tidy(text) {
  return text
    .replace(/\s+([,.;:!?’'”)\]])/g, "$1")
    .replace(/([(\[“])\s+/g, "$1")
    // Same artefact inside a hyphenated compound, where bolls tags the first element:
    // "fig<S>8384</S> -leaves" -> "fig -leaves", which bible-api.com prints as "fig-leaves".
    .replace(/\s+-(?=[A-Za-z])/g, "-")
    .replace(/(?<=[A-Za-z])-\s+(?=[a-z])/g, "-");
}

async function bulk(translation) {
  const url = `https://bolls.life/static/translations/${translation}.json`;
  process.stderr.write(`fetching ${url} … `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const all = await res.json();
  process.stderr.write(`${all.length} rows\n`);
  // Books above 66 are the deuterocanon, which this app's canon (bibleBooks.ts) does not carry.
  return all.filter((v) => v.book >= 1 && v.book <= 66);
}

function toCorpus(rows, translation, { repairSpacing = false } = {}) {
  const out = rows
    .map((v) => {
      const t = clean(v.text, translation);
      return { book: BOOKS[v.book - 1], chapter: v.chapter, verse: v.verse, text: repairSpacing ? tidy(t) : t };
    })
    .filter((v) => v.text);
  out.sort((a, b) =>
    BOOKS.indexOf(a.book) - BOOKS.indexOf(b.book) || a.chapter - b.chapter || a.verse - b.verse);
  return out;
}

// ---- 1. WEB: the bulk endpoint against the committed corpus -------------------------------
//
// Compared after `stripMarkup`, which is the only form either corpus is ever read in: the 2026-09-04
// WEB file stores bolls' raw bytes (its <b>/<i> Psalm superscriptions, and the double spaces bolls
// leaves where a Strong's tag used to be) and every consumer here normalises it on the way in. The
// KJV and ASV files below are written already normalised, because the KJV needs a cleaning step
// `stripMarkup` has no business knowing about — see `clean` above — so `stripMarkup` is a no-op on
// them and the two paths meet at the same string either way.
const committed = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE, "web-bible.json.gz"))).toString("utf8"));
const webBulk = toCorpus(await bulk("WEB"), "WEB");
const key = (v) => `${v.book} ${v.chapter}:${v.verse}`;
const have = new Map(committed.map((v) => [key(v), stripMarkup(v.text)]));
const bulkMap = new Map(webBulk.map((v) => [key(v), v.text]));
const missing = [...have.keys()].filter((k) => !bulkMap.has(k));
const extra = [...bulkMap.keys()].filter((k) => !have.has(k));
const differing = [...have].filter(([k, t]) => bulkMap.has(k) && bulkMap.get(k) !== t).map(([k]) => k);
console.log(`WEB: committed ${committed.length} verses, bulk ${webBulk.length}`);
console.log(`     missing from bulk: ${missing.length}${missing.length ? " — " + missing.slice(0, 5).join(", ") : ""}`);
console.log(`     extra in bulk:     ${extra.length}${extra.length ? " — " + extra.slice(0, 8).join(", ") : ""}`);
console.log(`     text differs:      ${differing.length}${differing.length ? " — " + differing.slice(0, 5).join(", ") : ""}`);
if (missing.length || differing.length) {
  console.error("\nThe bulk endpoint does NOT reproduce the committed WEB corpus. Do not trust the\n" +
    "KJV and ASV files it would write; find out what moved first.");
  process.exit(1);
}
// The seven extras are Psalm 151, which is deuterocanonical and outside this app's 150-chapter
// Psalms. Anything else appearing here is a real discrepancy.
const unexpectedExtra = extra.filter((k) => !k.startsWith("Psalms 151:"));
if (unexpectedExtra.length) {
  console.error(`\nUnexpected extra verses in the bulk WEB file: ${unexpectedExtra.join(", ")}`);
  process.exit(1);
}
console.log("     (the 7 extras are Psalm 151, outside the 66-book canon — expected)");
console.log("WEB bulk endpoint reproduces the committed corpus exactly.\n");

if (verifyOnly) process.exit(0);

// ---- 2. KJV and ASV ------------------------------------------------------------------------
//
// bolls' ASV — alone of the three — has verses where a proper noun has been REPLACED by a number:
// Deuteronomy 1:38 reads "60 the son of Nun", Joshua 4:17 "60 therefore commanded the priests",
// 1 Chronicles 5:12 "360 the chief". That is not markup and no amount of stripping recovers it; the
// word is gone from the source. Twenty-odd verses, and every one of them destroys exactly the thing
// this harness measures — a name.
//
// They are detected, not listed, so the count cannot go stale, and each is refetched from
// bible-api.com, which is the service the app renders the reader's text from in the first place
// (src/lib/biblePassage.ts). Every repair is printed. If one cannot be fetched the build stops
// rather than committing a corpus with a hole in it.
const CORRUPT = /(?:^|[\s(])\d{2,5}(?:[\s,.;:)]|$)/;
async function repairFromBibleApi(corpus, translation) {
  const broken = corpus.filter((v) => CORRUPT.test(v.text));
  if (!broken.length) return 0;
  console.log(`  ${broken.length} verses carry a number where a word should be; refetching from bible-api.com`);
  const chapters = new Map();
  for (const v of broken) {
    const k = `${v.book} ${v.chapter}`;
    if (!chapters.has(k)) chapters.set(k, []);
    chapters.get(k).push(v);
  }
  for (const [ch, verses] of chapters) {
    let data = null;
    for (let a = 1; a <= 6 && !data; a++) {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ch)}?translation=${translation.toLowerCase()}`);
      const body = await res.text();
      if (res.status === 429 || body.startsWith("Retry")) { await new Promise((r) => setTimeout(r, 1500 * a)); continue; }
      try { const d = JSON.parse(body); if (Array.isArray(d.verses) && d.verses.length) data = d; } catch { /* retry */ }
      if (!data) await new Promise((r) => setTimeout(r, 1500 * a));
    }
    if (!data) throw new Error(`could not refetch ${ch} (${translation}) from bible-api.com to repair it`);
    for (const v of verses) {
      const got = data.verses.find((x) => x.verse === v.verse);
      if (!got) throw new Error(`bible-api.com has no ${ch}:${v.verse} in ${translation}`);
      const fixed = got.text.replace(/[`]/g, "'").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
      console.log(`    ${ch}:${v.verse}  ${JSON.stringify(v.text.slice(0, 46))} -> ${JSON.stringify(fixed.slice(0, 46))}`);
      v.text = fixed;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  const still = corpus.filter((v) => CORRUPT.test(v.text));
  if (still.length) throw new Error(`${still.length} verses still corrupt after repair: ${still.slice(0, 3).map((v) => `${v.book} ${v.chapter}:${v.verse}`).join(", ")}`);
  return broken.length;
}

for (const t of ["KJV", "ASV"]) {
  const corpus = toCorpus(await bulk(t), t, { repairSpacing: true });
  const repaired = await repairFromBibleApi(corpus, t);
  if (repaired) console.log(`  ${t}: ${repaired} verses repaired from bible-api.com`);
  const file = path.join(HERE, `${t.toLowerCase()}-bible.json.gz`);
  fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(corpus), { level: 9 }));
  console.log(`${t}: ${corpus.length} verses -> ${file} (${fs.statSync(file).size} bytes)`);
}

// Shared by the Daily Name generator and the two games' data checks.
//
// Everything here reads the three public-domain Bible corpora the name linker already keeps under
// scripts/name-linker/corpus/ (WEB, KJV, ASV — the three translations the reader offers). They are
// never imported from src/ and never shipped; the games only ship what the generator writes out.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const CORPUS_DIR = path.join(REPO_ROOT, "scripts/name-linker/corpus");

export const TRANSLATIONS = ["web", "kjv", "asv"];

/** Verse text cleaned of the bolls spacing artefacts ("God  created", "flesh :"). */
export const cleanText = (s) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?’”)])/g, "$1")
    .replace(/([“‘(])\s+/g, "$1")
    .trim();

let cache = null;
/** { web, kjv, asv }: each a Map "Book C:V" -> text, plus `order` (WEB verse keys in canon order). */
export function loadCorpora() {
  if (cache) return cache;
  const out = {};
  for (const t of TRANSLATIONS) {
    const rows = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(CORPUS_DIR, `${t}-bible.json.gz`))));
    const map = new Map();
    for (const r of rows) map.set(`${r.book} ${r.chapter}:${r.verse}`, cleanText(r.text));
    out[t] = map;
    if (t === "web") out.order = rows.map((r) => ({ book: r.book, chapter: r.chapter, verse: r.verse, key: `${r.book} ${r.chapter}:${r.verse}` }));
  }
  out.books = [...new Set(out.order.map((r) => r.book))];
  cache = out;
  return out;
}

/** Whole-word, case-sensitive test, so "Ruth" does not match "truth" and "Dan" not "Daniel". */
export const hasWord = (text, word) => new RegExp(`(^|[^A-Za-z])${word}([^A-Za-z]|$)`).test(text);

/** Expand a reference as this app writes them into verse keys, in order. Handles
 *   "Book C:V"  "Book C:V-V"  "Book C:V-C:V"  "Book C-C"  "Book C"  "Book C:V-Book C:V"
 *   and comma continuations ("Numbers 13:30, 14:6-9, 24").
 * Returns [] for anything it cannot read, so callers fail closed rather than guess. */
export function expandReference(ref) {
  const { order, books } = loadCorpora();
  const bookRe = new RegExp(`^(${books.map((b) => b.replace(/ /g, "\\s")).sort((a, b) => b.length - a.length).join("|")})\\s+(.*)$`);
  const m = ref.trim().match(bookRe);
  if (!m) return [];
  const book = m[1].replace(/\s/g, " ");
  const rest = m[2];
  const inBook = order.filter((r) => r.book === book);
  const keys = [];
  const take = (c1, v1, c2, v2) => {
    for (const r of inBook) {
      const afterStart = r.chapter > c1 || (r.chapter === c1 && r.verse >= v1);
      const beforeEnd = r.chapter < c2 || (r.chapter === c2 && r.verse <= v2);
      if (afterStart && beforeEnd) keys.push(r.key);
    }
  };
  // Cross-book range: read the first book from its start verse to the book's end.
  const cross = rest.match(/^(\d+):(\d+)-(?:\d\s)?[A-Z]/);
  if (cross) {
    take(+cross[1], +cross[2], 999, 999);
    return keys;
  }
  let chapter = null;
  for (const part of rest.split(/,\s*/)) {
    let p;
    if ((p = part.match(/^(\d+):(\d+)-(\d+):(\d+)$/))) {
      take(+p[1], +p[2], +p[3], +p[4]);
      chapter = +p[3];
    } else if ((p = part.match(/^(\d+):(\d+)(?:-(\d+))?$/))) {
      chapter = +p[1];
      take(chapter, +p[2], chapter, p[3] ? +p[3] : +p[2]);
    } else if ((p = part.match(/^(\d+)-(\d+)$/)) && chapter === null) {
      take(+p[1], 1, +p[2], 999);
    } else if ((p = part.match(/^(\d+)$/))) {
      if (chapter === null) take(+p[1], 1, +p[1], 999);
      else take(chapter, +p[1], chapter, +p[1]);
    } else if ((p = part.match(/^(\d+)-(\d+)$/)) && chapter !== null) {
      take(chapter, +p[1], chapter, +p[2]);
    } else {
      return [];
    }
  }
  return keys;
}

/** The verse key as a reader writes it ("Exodus 2:10"), for a single verse. */
export const keyToRef = (key) => key;

/** Text of one verse in one translation, or undefined. */
export const verseText = (key, t = "web") => loadCorpora()[t].get(key);

/** Does the word occur in this verse in every translation the reader can pick? */
export const verseHasWordInAll = (key, word) => TRANSLATIONS.every((t) => {
  const text = loadCorpora()[t].get(key);
  return text !== undefined && hasWord(text, word);
});

/** Count of verses (WEB) using the word, split by testament. */
export function wordCounts(word, t = "web") {
  const c = loadCorpora();
  const otEnd = c.books.indexOf("Matthew");
  let ot = 0;
  let nt = 0;
  for (const r of c.order) {
    const text = c[t].get(r.key);
    if (text && hasWord(text, word)) {
      if (c.books.indexOf(r.book) < otEnd) ot++;
      else nt++;
    }
  }
  return { ot, nt, total: ot + nt };
}

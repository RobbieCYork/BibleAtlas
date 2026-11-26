#!/usr/bin/env node
// TEST packs only, for exercising offline reading before the approved files exist. Never deployed:
// every pack is marked `fixture`, and the build refuses fixtures on Vercel.
//
//   node scripts/bible-packs/fixtures.mjs --out /some/scratch/folder
//   BIBLE_PACKS_DIR=/some/scratch/folder npm run build
//
// WEB, KJV and ASV come from the name-linker's test corpora (real words, but NOT the text the app
// ships: see ../name-linker/corpus/PROVENANCE.md). The "BSB" fixture is invented placeholder text,
// so that nothing here can be mistaken for the Berean Standard Bible.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { BOOKS, REPO, writePack } from "./pack.mjs";

const i = process.argv.indexOf("--out");
if (i < 0) { console.error("usage: fixtures.mjs --out <scratch folder>"); process.exit(2); }
const out = resolve(process.argv[i + 1]);
if (out.startsWith(join(REPO, "bible-packs"))) throw new Error("refusing to write test text into bible-packs/");

const number = new Map(BOOKS.map((b, n) => [b.name, n + 1]));
const real = {};
for (const id of ["web", "kjv", "asv"]) {
  const rows = JSON.parse(gunzipSync(readFileSync(join(REPO, `scripts/name-linker/corpus/${id}-bible.json.gz`))));
  const seen = new Set();
  real[id] = rows
    .map((r) => ({ book: number.get(r.book), chapter: r.chapter, verse: r.verse, text: r.text.replace(/<[^>]*>/g, "").trim() }))
    .filter((r) => r.book && r.chapter <= BOOKS[r.book - 1].chapters && r.text)
    .filter((r) => !seen.has(`${r.book}.${r.chapter}.${r.verse}`) && seen.add(`${r.book}.${r.chapter}.${r.verse}`))
    .sort((a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse);
  const pack = writePack(out, id, real[id], { fixture: true });
  console.log(`${id}: ${pack.verses} fixture verses, ${(pack.bytes / 1e6).toFixed(2)} MB`);
}
const placeholder = real.web.map((r) => ({ ...r, text: `[Test fixture, not Bible text] ${BOOKS[r.book - 1].name} ${r.chapter}:${r.verse} mentions Jerusalem and Paul.` }));
const pack = writePack(out, "bsb", placeholder, { fixture: true });
console.log(`bsb: ${pack.verses} placeholder verses, ${(pack.bytes / 1e6).toFixed(2)} MB`);

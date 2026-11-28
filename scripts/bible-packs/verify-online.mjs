#!/usr/bin/env node
// Compares the built WEB / KJV / ASV packs with what bible-api.com serves, chapter by chapter, using
// the same request the app makes. Existing highlights stay in place only if the text is identical.
//
//   node scripts/bible-packs/verify-online.mjs [--sample 40] [--all] [--packs bible-packs]
//   node scripts/bible-packs/verify-online.mjs --chapters "Luke 17,Esther 10"     (just those)
//
// bible-api.com allows 15 requests per 30 seconds: 40 chapters x 3 takes about 4 minutes, --all about
// 2 hours. Writes nothing.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BOOKS, REPO, readCatalog } from "./pack.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const dir = resolve(arg("--packs", join(REPO, "bible-packs")));
const all = process.argv.includes("--all");
const sample = Number(arg("--sample", "40"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chapters = BOOKS.flatMap((b, i) => Array.from({ length: b.chapters }, (_, c) => ({ book: i + 1, name: b.name, chapter: c + 1, single: b.chapters === 1 })));
// An even spread through the canon, plus chapters that mix poetry, supplied words and superscriptions.
const fixed = ["Genesis 1", "Exodus 20", "Psalms 3", "Psalms 119", "Isaiah 53", "Matthew 5", "John 3", "Romans 8", "Revelation 22"];
const only = arg("--chapters", "").split(",").map((s) => s.trim()).filter(Boolean);
const named = chapters.filter((c) => only.includes(`${c.name} ${c.chapter}`));
if (named.length !== only.length) { console.error("unknown chapter in --chapters"); process.exit(2); }
const picked = only.length ? named : all
  ? chapters
  : [...new Set([...chapters.filter((c) => fixed.includes(`${c.name} ${c.chapter}`)), ...chapters.filter((_, i) => i % Math.ceil(chapters.length / Math.max(sample - fixed.length, 1)) === 7)])];

let compared = 0;
const differences = [];
const packs = readCatalog(dir).packs.filter((p) => ["web", "kjv", "asv"].includes(p.id));
if (!packs.length) { console.error("no WEB/KJV/ASV packs to compare"); process.exit(2); }
for (const pack of packs) {
  for (const c of picked) {
    const ours = JSON.parse(readFileSync(join(dir, pack.id, `${String(c.book).padStart(2, "0")}.json`), "utf8")).chapters[c.chapter - 1];
    const ref = c.single ? `${c.name} 1:1-${ours[ours.length - 1][0]}` : `${c.name} ${c.chapter}`;
    let theirs = null;
    for (let attempt = 1; !theirs && attempt <= 5; attempt++) {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=${pack.id}`).catch(() => null);
      if (res?.ok) theirs = (await res.json()).verses.map((v) => [v.verse, v.text.trim()]);
      else await sleep(res?.status === 429 ? 30000 : 3000 * attempt);
    }
    await sleep(2100);
    if (!theirs) { differences.push(`${pack.id} ${ref}: could not be fetched`); continue; }
    compared++;
    const a = new Map(ours);
    const b = new Map(theirs);
    for (const v of new Set([...a.keys(), ...b.keys()])) {
      if (a.get(v) !== b.get(v)) differences.push(`${pack.id} ${c.name} ${c.chapter}:${v}\n    ours   ${JSON.stringify(a.get(v))}\n    online ${JSON.stringify(b.get(v))}`);
    }
    process.stderr.write(`\r${pack.id} ${c.name} ${c.chapter}                    `);
  }
}
console.log(`\n${compared} chapters compared, ${differences.length} differences`);
for (const d of differences.slice(0, 60)) console.log(d);
process.exit(differences.length ? 1 : 0);

#!/usr/bin/env node
// Builds the downloadable Bible packs from the APPROVED source files. See README.md.
//
//   node scripts/bible-packs/build.mjs --from <folder holding the downloaded files> [--only web,kjv] [--out bible-packs]
//
// Reads no network. Each file must be exactly the one listed in sources.json.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { bsbText, osis, usfx, zefania } from "./parsers.mjs";
import { BOOKS, REPO, gitBlobSha1, sha256, writePack } from "./pack.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const from = arg("--from");
if (!from) { console.error("usage: build.mjs --from <folder> [--only web,kjv,asv,bsb] [--out bible-packs]"); process.exit(2); }
const out = resolve(arg("--out", join(REPO, "bible-packs")));
const sources = JSON.parse(readFileSync(join(REPO, "scripts/bible-packs/sources.json"), "utf8"));
const wanted = arg("--only", Object.keys(sources).join(",")).split(",");

for (const id of wanted) {
  const source = sources[id];
  if (!source) throw new Error(`no source listed for ${id}`);
  const path = join(resolve(from), source.file);
  if (!existsSync(path)) throw new Error(`${id}: ${path} is not there`);
  const bytes = readFileSync(path);
  if (source.gitBlobSha1 && gitBlobSha1(bytes) !== source.gitBlobSha1) {
    throw new Error(`${id}: ${source.file} is not the approved file (checksum differs). Download it from the URL in sources.json.`);
  }
  if (bytes.length !== source.bytes) {
    const note = `${id}: ${source.file} is ${bytes.length} bytes; sources.json records ${source.bytes}`;
    // The publisher's BSB file can be re-issued in place; say so and let a person accept it.
    if (source.gitBlobSha1 || !process.argv.includes("--accept-new-size")) throw new Error(`${note}. Check it, then pass --accept-new-size.`);
    console.warn(`WARNING ${note} (accepted)`);
  }
  const text = bytes.toString("utf8");
  if (text.includes("�")) throw new Error(`${id}: ${source.file} is not valid UTF-8`);

  let verses;
  if (source.format === "bsb-txt") {
    const r = bsbText(text, BOOKS.map((b) => b.name));
    verses = r.verses;
    console.log(`${id}: notice lines in the file:\n  ${r.notices.join("\n  ")}`);
    console.log(`${id}: ${r.empty.length} verse rows carry no text and are left out${r.empty.length ? ": " + r.empty.join(", ") : ""}`);
  } else {
    verses = { usfx, osis, zefania }[source.format](text);
  }
  // Some translations number a verse they leave out. bible-api.com serves it empty, so it is kept.
  const blank = verses.filter((v) => !v.text).map((v) => `${BOOKS[v.book - 1].name} ${v.chapter}:${v.verse}`);
  if (blank.length) console.log(`${id}: ${blank.length} numbered verses have no text (kept, as bible-api.com serves them): ${blank.slice(0, 30).join(", ")}`);
  const pack = writePack(out, id, verses, {
    source: { file: source.file, url: source.url, bytes: bytes.length, sha256: sha256(bytes) },
  });
  console.log(`${id}: ${pack.verses} verses, ${(pack.bytes / 1e6).toFixed(2)} MB, version ${pack.version} -> ${out}/${id}/`);
  for (const [b, c, v] of [[1, 1, 1], [19, 23, 1], [43, 3, 16]]) {
    console.log(`    ${BOOKS[b - 1].name} ${c}:${v}  ${JSON.stringify(verses.find((x) => x.book === b && x.chapter === c && x.verse === v)?.text)}`);
  }
}
console.log("\nNext: node scripts/bible-packs/verify-online.mjs --sample 40, then npm run build.");

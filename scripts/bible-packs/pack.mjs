// Verses -> the files the app ships: bible-packs/<id>/<nn>.json plus catalog.json.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** The app's own canon table, so a pack uses exactly the app's book names and chapter counts. */
export const BOOKS = [...readFileSync(join(REPO, "src/data/bibleBooks.ts"), "utf8").matchAll(/name: "([^"]+)", chapters: (\d+)/g)].map(
  (m) => ({ name: m[1], chapters: Number(m[2]) })
);
if (BOOKS.length !== 66) throw new Error(`expected 66 books in bibleBooks.ts, found ${BOOKS.length}`);

export const sha256 = (b) => createHash("sha256").update(b).digest("hex");
export const gitBlobSha1 = (b) => createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex");

/** Refuses anything incomplete. Returns the verses grouped as chapters per book. */
export function group(id, verses) {
  const books = BOOKS.map((b) => Array.from({ length: b.chapters }, () => []));
  for (const v of verses) {
    const chapter = books[v.book - 1]?.[v.chapter - 1];
    if (!chapter) throw new Error(`${id}: no such chapter in the canon: book ${v.book} chapter ${v.chapter}`);
    if (chapter.length && chapter[chapter.length - 1][0] >= v.verse) throw new Error(`${id}: verses out of order at ${BOOKS[v.book - 1].name} ${v.chapter}:${v.verse}`);
    if (/[<>]/.test(v.text)) throw new Error(`${id}: markup left in ${BOOKS[v.book - 1].name} ${v.chapter}:${v.verse}`);
    chapter.push([v.verse, v.text]);
  }
  books.forEach((chapters, b) =>
    chapters.forEach((c, i) => {
      if (!c.length) throw new Error(`${id}: ${BOOKS[b].name} ${i + 1} has no verses`);
    })
  );
  return books;
}

export function readCatalog(outDir) {
  const path = join(outDir, "catalog.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { schema: 1, packs: [] };
}

export function writePack(outDir, id, verses, extra = {}) {
  const grouped = group(id, verses);
  const dir = join(outDir, id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const books = grouped.map((chapters, i) => {
    const bytes = Buffer.from(JSON.stringify({ translation: id, book: i + 1, name: BOOKS[i].name, chapters }) + "\n", "utf8");
    writeFileSync(join(dir, `${String(i + 1).padStart(2, "0")}.json`), bytes);
    return { n: i + 1, bytes: bytes.length, sha256: sha256(bytes), verses: chapters.reduce((s, c) => s + c.length, 0) };
  });
  const pack = {
    id,
    version: sha256(books.map((b) => b.sha256).join("")).slice(0, 12),
    bytes: books.reduce((s, b) => s + b.bytes, 0),
    verses: books.reduce((s, b) => s + b.verses, 0),
    ...extra,
    books,
  };
  const catalog = readCatalog(outDir);
  const ORDER = ["web", "kjv", "asv", "bsb"];
  catalog.packs = [...catalog.packs.filter((p) => p.id !== id), pack].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  writeFileSync(join(outDir, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
  return pack;
}

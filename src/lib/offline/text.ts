/** Scripture read from our own files: the copy downloaded to this device, or the same file served by
 * the site. Both are byte-for-byte the same text, so highlights land in the same places either way. */

import { BOOKS } from "../../data/bibleBooks";
import { bookUrl, packFor, type BookFile } from "./catalog";
import { installedPack, readDownloadedBook } from "./bibles";

export interface VerseRef {
  /** 1..66 */
  book: number;
  chapter: number;
  /** Absent: the whole chapter. */
  start?: number;
  end?: number;
}

/** "John 3", "John 3:16", "John 3:16-18" (and "Jude 5" for a one-chapter book). Null for anything
 * else, which is then left to the online service to interpret. */
export function parseVerseRef(reference: string): VerseRef | null {
  const m = reference.trim().match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!m) return null;
  let name = m[1].replace(/\s+/g, " ").toLowerCase();
  if (name === "psalm") name = "psalms";
  const index = BOOKS.findIndex((b) => b.name.toLowerCase() === name);
  if (index < 0) return null;
  let chapter = Number(m[2]);
  let start = m[3] ? Number(m[3]) : undefined;
  const end = m[4] ? Number(m[4]) : undefined;
  if (start === undefined && BOOKS[index].chapters === 1 && chapter > 1) {
    start = chapter;
    chapter = 1;
  }
  if (chapter < 1 || chapter > BOOKS[index].chapters) return null;
  return { book: index + 1, chapter, start, end };
}

async function hostedBook(translation: string, n: number, signal?: AbortSignal): Promise<BookFile | null> {
  const pack = packFor(translation);
  if (!pack) return null;
  const res = await fetch(bookUrl(translation, pack.version, n), signal ? { signal } : undefined);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const book = (await res.json()) as BookFile;
  if (book.translation !== translation || book.book !== n || !Array.isArray(book.chapters)) throw new Error("Unexpected file");
  return book;
}

/** The downloaded copy first, then the site's file. Null when this build ships no file for the
 * translation and none is downloaded. Throws when a file should exist and cannot be had. */
export async function ownBook(translation: string, n: number, signal?: AbortSignal): Promise<BookFile | null> {
  const local = await readDownloadedBook(translation, n).catch((err) => {
    console.warn("Couldn't read the downloaded copy:", err);
    return null;
  });
  return local ?? hostedBook(translation, n, signal);
}

const plain = (s: string) => s.toLowerCase().replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ");

export interface LocalHit {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

const searchIndex = new Map<string, (LocalHit & { plain: string })[]>();

/** Word search over a downloaded translation: verses with the exact phrase first, then verses with
 * every word, each in Bible order. Null when the translation is not downloaded. */
export async function searchDownloaded(translation: string, query: string, limit: number): Promise<LocalHit[] | null> {
  const pack = await installedPack(translation);
  if (!pack) return null;
  const key = `${translation}/${pack.version}`;
  let index = searchIndex.get(key);
  if (!index) {
    index = [];
    for (const { n } of pack.books) {
      const book = await readDownloadedBook(translation, n);
      if (!book) return null;
      book.chapters.forEach((verses, c) => {
        for (const [verse, text] of verses) index!.push({ book: n, chapter: c + 1, verse, text, plain: plain(text) });
      });
    }
    searchIndex.clear(); // one translation at a time is plenty to keep in memory
    searchIndex.set(key, index);
  }
  const phrase = plain(query).trim();
  const words = phrase.split(" ").filter(Boolean);
  if (!words.length) return [];
  const exact: LocalHit[] = [];
  const all: LocalHit[] = [];
  for (const row of index) {
    if (row.plain.includes(phrase)) exact.push(row);
    else if (words.every((w) => row.plain.includes(w))) all.push(row);
    if (exact.length >= limit) break;
  }
  return [...exact, ...all].slice(0, limit).map(({ book, chapter, verse, text }) => ({ book, chapter, verse, text }));
}

/** The downloadable Bible texts this build ships (see vite-plugin-bible-packs.ts and
 * scripts/bible-packs/). Empty until a pack is built, in which case nothing offline is offered. */

export interface CatalogBook {
  /** 1 = Genesis ... 66 = Revelation (the order of data/bibleBooks.ts). */
  n: number;
  bytes: number;
  sha256: string;
  verses: number;
}

export interface CatalogPack {
  id: string;
  /** Changes whenever any word of the text changes. Part of every file's URL. */
  version: string;
  bytes: number;
  verses: number;
  books: CatalogBook[];
}

/** One book file. `chapters[c - 1]` is chapter c as [verse number, text] pairs. */
export interface BookFile {
  translation: string;
  book: number;
  name: string;
  chapters: [number, string][][];
}

export const PACKS: CatalogPack[] = typeof __BIBLE_CATALOG__ === "undefined" ? [] : __BIBLE_CATALOG__.packs;

export const packFor = (id: string): CatalogPack | undefined => PACKS.find((p) => p.id === id);

/** Where the files are served from. A native app that does not bundle them can point this at the
 * website (VITE_BIBLE_PACK_BASE=https://www.capstonebible.com/bibles/). */
const BASE: string = import.meta.env.VITE_BIBLE_PACK_BASE ?? `${import.meta.env.BASE_URL}bibles/`;

export const bookUrl = (id: string, version: string, n: number) => `${BASE}${id}/${version}/${String(n).padStart(2, "0")}.json`;

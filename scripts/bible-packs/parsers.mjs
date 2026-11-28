// Source file -> verses, for each approved source format.
//
// WHY THE XML PARSERS LOOK ODD. Highlights are stored as character positions in a verse. Readers'
// existing highlights were made against the text bible-api.com serves, which it produces from the
// open-bibles files with the `bible_parser` 1.1.4 Ruby gem and its own importer
// (github.com/seven1m/bible_api, lib/bible_importer.rb). usfx(), osis() and zefania() below are a
// line-for-line port of that logic, quirks included, so a verse read from our copy is the same
// string. Do not "tidy" them. No word of Bible text is edited anywhere in this file: the only change
// is removing white space at the two ends of a verse, which the importer also does.

import { parseXml } from "./xml.mjs";

/** The 66-book canon in order, by USFM code. Books outside it (apocrypha) are left out. */
export const CODES = (
  "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM " +
  "EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP " +
  "COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV"
).split(" ");

/** lib/bible_importer.rb BOOK_IDS. */
const IMPORTER_IDS = { SOS: "SNG", JOE: "JOL", EZE: "EZK", NAH: "NAM" };

/** bible_parser's OSIS book ids for the canon. */
const OSIS_IDS = (
  "Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa " +
  "Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor " +
  "2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev"
).split(" ");
const OSIS_MAP = Object.fromEntries(OSIS_IDS.map((id, i) => [id, CODES[i]]));

export const strip = (s) => s.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "");
const toI = (s) => parseInt(s ?? "", 10) || 0;

/** Common tail of the importer: canon filter, duplicate check, strip, canonical order. */
function collector() {
  const seen = new Set();
  const out = [];
  return {
    add(bookId, chapter, verse, text, { skipDuplicate = false } = {}) {
      const id = IMPORTER_IDS[bookId] ?? bookId;
      const book = CODES.indexOf(id) + 1;
      if (!book) return; // not one of the 66
      if (!(chapter > 0 && verse > 0)) throw new Error(`invalid reference ${id} ${chapter}:${verse}`);
      const key = `${book}.${chapter}.${verse}`;
      if (seen.has(key)) {
        if (skipDuplicate) return;
        throw new Error(`duplicate reference ${id} ${chapter}:${verse}`);
      }
      seen.add(key);
      out.push({ book, chapter, verse, text: strip(text) });
    },
    result: () => out.sort((a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse),
  };
}

export function usfx(source) {
  const out = collector();
  let mode = null;
  let bookId = null;
  let chapter = 0;
  let verse = 0;
  let text = "";
  const endVerse = () => {
    mode = null;
    if (verse) out.add(bookId, chapter, verse, text);
  };
  parseXml(source, {
    start(name, a) {
      if (name === "book") {
        if (mode === "verse") endVerse();
        if (a.id !== "FRT") {
          bookId = a.id;
          mode = "book";
        }
      } else if (name === "h") {
        if (mode === "book") mode = "book-title";
      } else if (name === "c") {
        if (mode === "verse") endVerse();
        chapter = toI(a.id);
      } else if (name === "v") {
        if (mode === "verse") endVerse();
        verse = toI(a.id);
        text = "";
        mode = "verse";
      } else if (name === "ve") endVerse();
      else if (name === "f" || name === "x") mode = `footnote|${mode ?? ""}`;
    },
    end(name) {
      if (name === "book" || name === "c") {
        if (mode === "verse") endVerse();
      } else if (name === "h") mode = null;
      else if (name === "f" || name === "x") {
        // Ruby's split("|") drops trailing empty parts.
        const parts = (mode ?? "").split("|");
        while (parts.length && parts[parts.length - 1] === "") parts.pop();
        mode = parts.pop() ?? null;
      }
    },
    text(s) {
      if (mode === "verse") text += s;
    },
  });
  return out.result();
}

/** Some OSIS sources split a verse into lettered parts; the importer joins them in letter order. */
function osisFragments(source) {
  const parts = new Map();
  const open = []; // { key, letter, text, depth }
  let depth = 0;
  let noteDepth = 0;
  let current = null;
  parseXml(source, {
    start(name, a) {
      depth++;
      const local = name.split(":").pop();
      if (local === "note") noteDepth++;
      if (local === "verse" && !current) {
        const m = a.osisID?.match(/^([^.]+)\.(\d+)\.(\d+)!?([a-z])$/);
        if (m) current = { key: `${OSIS_MAP[m[1]]}.${Number(m[2])}.${Number(m[3])}`, letter: m[4], text: "", depth, notes: noteDepth };
      }
    },
    end(name) {
      if (current && current.depth === depth) {
        open.push(current);
        current = null;
      }
      if (name.split(":").pop() === "note") noteDepth--;
      depth--;
    },
    text(s) {
      if (current && noteDepth === current.notes) current.text += s;
    },
  });
  for (const f of open) {
    if (!parts.has(f.key)) parts.set(f.key, {});
    parts.get(f.key)[f.letter] = f.text;
  }
  return new Map([...parts].map(([k, v]) => [k, Object.keys(v).sort().map((l) => v[l]).join("")]));
}

export function osis(source) {
  const fragments = osisFragments(source);
  const out = collector();
  let mode = null;
  let bookId = null;
  let chapter = 0;
  let verse = 0;
  let text = "";
  let wrappingVerse = false;
  const endVerse = () => {
    mode = null;
    const fragment = fragments.get(`${bookId}.${chapter}.${verse}`);
    if (verse) out.add(bookId, chapter, verse, fragment ?? text, { skipDuplicate: fragment !== undefined });
  };
  const ref = (v) => toI(v.trim().split(/\s+/)[0].split(".").pop());
  parseXml(source, {
    start(name, a) {
      if (name === "div") {
        if (mode === "verse") endVerse();
        if (a.type === "book") {
          // Only the 66 books. The importer cuts an unknown id to three letters, which turns the
          // KJV file's Apocrypha "EsthGr" into Esther; bible-api.com does not serve those verses.
          bookId = OSIS_MAP[a.osisID] ?? null;
          mode = "book";
        }
      } else if (name === "chapter") {
        if (mode === "verse") endVerse();
        if (a.sID) chapter = toI((a.n ?? a.osisID ?? a.sID).split(".").pop());
        else if (a.osisID) chapter = toI(a.osisID.split(".").pop());
      } else if (name === "verse") {
        if (mode === "verse") endVerse();
        if (a.sID) {
          verse = ref(a.n ?? a.osisID ?? a.sID);
          wrappingVerse = false;
        } else if (a.osisID) {
          verse = ref(a.osisID);
          wrappingVerse = true;
        } else return;
        text = "";
        mode = "verse";
      } else if (name === "note") mode = "note";
    },
    end(name) {
      if (name === "div") bookId = null;
      else if (name === "verse") {
        if (mode === "verse" && wrappingVerse) endVerse();
      } else if (name === "note") mode = "verse";
    },
    text(s) {
      if (mode === "verse") text += s;
    },
  });
  return out.result();
}

export function zefania(source) {
  const out = collector();
  let mode = null;
  let bookId = null;
  let chapter = 0;
  let verse = 0;
  let text = "";
  const endVerse = () => {
    mode = null;
    if (verse) out.add(bookId, chapter, verse, text);
  };
  parseXml(source, {
    start(name, a) {
      if (name === "BIBLEBOOK") {
        bookId = CODES[toI(a.bnumber) - 1] ?? null;
        mode = "book";
      } else if (name === "CHAPTER") chapter = toI(a.cnumber);
      else if (name === "VERS") {
        verse = toI(a.vnumber);
        text = "";
        mode = "verse";
      }
    },
    end(name) {
      if (name === "BIBLEBOOK" || name === "CHAPTER") {
        if (mode === "verse") endVerse();
      } else if (name === "VERS") endVerse();
    },
    text(s) {
      if (mode === "verse") text += s;
    },
  });
  return out.result();
}

/** The publisher's plain-text BSB (bereanbible.com/bsb.txt): a few notice lines, then one
 * "Book C:V<TAB>text" row per verse. A row with no text (a verse the translation leaves out) is
 * returned in `empty` for a person to look at, and is not given a verse of its own. */
export function bsbText(source, bookNames) {
  const index = new Map(bookNames.map((n, i) => [n.toLowerCase(), i + 1]));
  index.set("psalm", index.get("psalms"));
  index.set("song of songs", index.get("song of solomon"));
  index.set("revelation of john", index.get("revelation"));
  const out = [];
  const empty = [];
  const other = [];
  for (const line of source.replace(/^﻿/, "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = line.match(/^(.+?) (\d+):(\d+)\t(.*)$/);
    if (!m) {
      other.push(line);
      continue;
    }
    const book = index.get(m[1].trim().toLowerCase());
    if (!book) throw new Error(`BSB: unknown book name ${JSON.stringify(m[1])}`);
    const row = { book, chapter: Number(m[2]), verse: Number(m[3]), text: strip(m[4]) };
    if (row.text) out.push(row);
    else empty.push(`${m[1]} ${m[2]}:${m[3]}`);
  }
  if (other.length > 10) throw new Error(`BSB: ${other.length} lines are not verses, e.g. ${JSON.stringify(other.slice(0, 3))}`);
  out.sort((a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse);
  return { verses: out, empty, notices: other };
}

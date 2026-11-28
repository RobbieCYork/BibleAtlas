/* "Add places from a passage". Which places a passage names comes only from the app's own data:
 *   1. the name linker the Bible reader uses (computeLinkAnnotations), run over each verse with the
 *      same book / chapter / verse context, so it links exactly what the reader links;
 *   2. the verse lists on each place's own page.
 * Verse text is the World English Bible, fetched the way the reader fetches it. */
import { locations } from "../../data/locations";
import { BOOKS } from "../../data/bibleBooks";
import { fetchPassage, PASSAGE_TIMEOUT_MS, type PassageVerse } from "../biblePassage";
import { suggestReference } from "../bibleReference";
import { computeLinkAnnotations } from "../verseAnnotations";
import { PLACES, SHARED_NAMES, placeKey, type PlaceKey } from "./places";

/** bible-api.com limits requests, and a longer range is a reading plan rather than a map. */
export const MAX_CHAPTERS = 8;

const SINGLE_CHAPTER: Record<string, number> = { Obadiah: 21, Philemon: 25, "2 John": 13, "3 John": 14, Jude: 25 };
const END = 999;

export interface PassageRange {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  label: string;
}

/** "Luke 2", "Luke 2:1-20", "Luke 2-3", "Luke 2:41-3:6", "Jonah", "Jude 5". Returns a message
 * instead when the text is not a passage this can load. */
export function parsePassage(input: string): PassageRange | { error: string } {
  const text = input.trim().replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const bad = { error: "Type a passage such as Luke 2, Luke 2:1-20 or Acts 13-14." };
  const m = /^((?:[123] ?)?[A-Za-z][A-Za-z. ]*?)\.? ?(?:(\d{1,3})(?: ?: ?(\d{1,3}))?(?: ?- ?(\d{1,3})(?: ?: ?(\d{1,3}))?)?)?$/.exec(text);
  if (!m) return bad;
  const found = suggestReference(m[1]);
  if (!found) return { error: `No Bible book matches “${m[1]}”.` };
  const book = found.book;
  const chapters = BOOKS.find((b) => b.name === book)!.chapters;
  const [, , n1, v1, n2, v2] = m;
  let startChapter: number, startVerse: number, endChapter: number, endVerse: number;
  if (!n1) {
    [startChapter, startVerse, endChapter, endVerse] = [1, 1, chapters, END];
  } else if (chapters === 1 && !v1 && !v2 && !(n1 === "1" && !n2)) {
    // "Jude 5" and "Jude 5-9" are verses in a one-chapter book; "Jude 1" is the whole of it.
    [startChapter, startVerse, endChapter, endVerse] = [1, Number(n1), 1, Number(n2 ?? n1)];
  } else if (v1) {
    startChapter = Number(n1);
    startVerse = Number(v1);
    if (v2) [endChapter, endVerse] = [Number(n2), Number(v2)];
    else [endChapter, endVerse] = [startChapter, Number(n2 ?? v1)];
  } else if (v2) {
    [startChapter, startVerse, endChapter, endVerse] = [Number(n1), 1, Number(n2), Number(v2)];
  } else {
    [startChapter, startVerse, endChapter, endVerse] = [Number(n1), 1, Number(n2 ?? n1), END];
  }
  if (startChapter < 1 || endChapter > chapters)
    return { error: `${book} has ${chapters} chapter${chapters === 1 ? "" : "s"}.` };
  if (endChapter < startChapter || (endChapter === startChapter && endVerse < startVerse) || startVerse < 1)
    return { error: "That range runs backwards." };
  if (endChapter - startChapter + 1 > MAX_CHAPTERS)
    return { error: `Choose ${MAX_CHAPTERS} chapters or fewer at a time.` };

  const whole = startVerse === 1 && endVerse === END;
  const label =
    chapters === 1
      ? whole ? book : `${book} ${startVerse}${endVerse > startVerse ? `-${endVerse}` : ""}`
      : whole
        ? `${book} ${startChapter}${endChapter > startChapter ? `-${endChapter}` : ""}`
        : startChapter === endChapter
          ? `${book} ${startChapter}:${startVerse}${endVerse > startVerse ? `-${endVerse}` : ""}`
          : `${book} ${startChapter}:${startVerse}-${endChapter}${endVerse === END ? "" : `:${endVerse}`}`;
  return { book, startChapter, startVerse, endChapter, endVerse, label };
}

const position = (chapter: number, verse: number) => chapter * 1000 + verse;

export interface PassagePlace {
  key: PlaceKey;
  /** "2:4, 2:15" — verses that name it. Empty when it comes only from a place page's list. */
  verses: string[];
  /** The reference on the place's own page, for a place the text does not name. */
  listed: string | null;
}

export interface PassageChoice {
  /** The word in the text, e.g. "Antioch". */
  name: string;
  verses: string[];
  /** Every place that goes by it. */
  options: PlaceKey[];
  /** The ones the Bible reader links these verses to. */
  linked: PlaceKey[];
}

export interface PassagePlaces {
  label: string;
  /** Named in the text, in order of first mention. */
  named: PassagePlace[];
  choices: PassageChoice[];
  /** On a place's own verse list for this passage, but not found by name in it. */
  listedOnly: PassagePlace[];
  /** False when the verse text could not be loaded, so only the place pages were consulted. */
  textLoaded: boolean;
}

async function loadVerses(range: PassageRange, signal: AbortSignal): Promise<PassageVerse[]> {
  const out: PassageVerse[] = [];
  for (let c = range.startChapter; c <= range.endChapter; c++) {
    const whole = SINGLE_CHAPTER[range.book];
    const ref = whole ? `${range.book} 1:1-${whole}` : `${range.book} ${c}`;
    const timed = new AbortController();
    const abort = () => timed.abort();
    signal.addEventListener("abort", abort);
    const timer = window.setTimeout(abort, PASSAGE_TIMEOUT_MS);
    try {
      out.push(...(await fetchPassage(ref, "web", timed.signal)).verses);
    } finally {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }
  const from = position(range.startChapter, range.startVerse);
  const to = position(range.endChapter, range.endVerse);
  return out.filter((v) => {
    const p = position(v.chapter, v.verse);
    return p >= from && p <= to;
  });
}

/** "Nehemiah 3:7,15,19" is three references in one chapter. */
function references(listed: string): string[] {
  const [first, ...more] = listed.split(",").map((s) => s.trim());
  const chapter = /^(.*\d+):/.exec(first)?.[1];
  return [first, ...(chapter ? more.map((verse) => `${chapter}:${verse}`) : [])];
}

function listedFor(range: PassageRange): Map<PlaceKey, string> {
  const from = position(range.startChapter, range.startVerse);
  const to = position(range.endChapter, range.endVerse);
  const out = new Map<PlaceKey, string>();
  for (const l of locations) {
    const hit = l.verses.find((v) =>
      references(v.reference).some((one) => {
        const r = parsePassage(one);
        return (
          !("error" in r) &&
          r.book === range.book &&
          position(r.startChapter, r.startVerse) <= to &&
          position(r.endChapter, r.endVerse) >= from
        );
      })
    );
    if (hit) out.set(`loc:${l.id}`, hit.reference);
  }
  return out;
}

export async function findPassagePlaces(range: PassageRange, signal: AbortSignal): Promise<PassagePlaces> {
  let verses: PassageVerse[] = [];
  let textLoaded = true;
  try {
    verses = await loadVerses(range, signal);
  } catch {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    textLoaded = false;
  }
  if (textLoaded && verses.length === 0) throw new Error(`${range.label} has no verses to load.`);

  const named = new Map<PlaceKey, string[]>();
  const choices = new Map<string, PassageChoice>();
  const add = (list: string[], v: string) => void (list.includes(v) || list.push(v));
  for (const verse of verses) {
    const at = `${verse.chapter}:${verse.verse}`;
    const text = verse.text.replace(/\s+/g, " ");
    for (const ann of computeLinkAnnotations(text, undefined, range.book, verse.chapter, verse.verse)) {
      if ((ann.kind !== "location" && ann.kind !== "poi") || !ann.id) continue;
      const key = placeKey(ann.kind, ann.id);
      if (!PLACES.has(key)) continue;
      const word = ann.text.toLowerCase();
      const options = SHARED_NAMES[word];
      if (options) {
        const choice = choices.get(word) ?? { name: ann.text, verses: [], options, linked: [] };
        add(choice.verses, at);
        if (!choice.linked.includes(key)) choice.linked.push(key);
        choices.set(word, choice);
      } else {
        const list = named.get(key) ?? [];
        add(list, at);
        named.set(key, list);
      }
    }
  }
  const offered = new Set<PlaceKey>([...named.keys(), ...[...choices.values()].flatMap((c) => c.options)]);
  // Some places are in the data twice (a Location and a Site, both "Shechem"): offer one.
  const offeredNames = new Set([...offered].map((key) => PLACES.get(key)!.name));
  const listedOnly = [...listedFor(range)]
    .filter(([key]) => !offered.has(key) && !offeredNames.has(PLACES.get(key)!.name))
    .map(([key, listed]) => ({ key, verses: [], listed }));
  return {
    label: range.label,
    named: [...named].map(([key, list]) => ({ key, verses: list, listed: null })),
    choices: [...choices.values()],
    listedOnly,
    textLoaded,
  };
}

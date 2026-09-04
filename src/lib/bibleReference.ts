import { BOOKS } from "../data/bibleBooks";

/* ==============================================================================================
 * ANTICIPATING A SCRIPTURE REFERENCE
 *
 * Turns what someone has typed so far into the reference they are heading for — "matt" into
 * Matthew 1, "1 cor 13" into 1 Corinthians 13 — so the Bible search bar can show the rest of it in
 * grey ahead of the cursor and jump there on Enter.
 *
 * The suggestion is ALWAYS a whole reference, never a bare book. Someone typing a book name is
 * asking to read it, and a book without a chapter is not somewhere the app can go; chapter 1 is
 * both the honest default and what the owner asked for.
 *
 * PRECEDENCE, when several books share what has been typed. Canonical order wins — the book that
 * comes first in the Bible is the one suggested. So "j" is Joshua, "jo" is Joshua, "joh" is John,
 * "ph" is Philippians and "phile" is Philemon. Three reasons it is canonical order and not, say,
 * how often a book is read:
 *   - It is the one ordering the reader can already see, in the book picker directly below.
 *   - It is stable. A popularity ranking is a judgement that would drift, and would have to be
 *     defended book by book.
 *   - It is defeated by typing one more letter, which is what the reader does anyway.
 * The numbered books need no special case: "1 j" can only be 1 John, because the number is matched
 * as part of the name.
 *
 * The suggestion is a SUGGESTION. It is never inserted into the input, never submitted on the
 * reader's behalf, and typing on past it simply changes it — see HeaderTextSearch, which renders it
 * as a separate element behind the input rather than as text in the field.
 * ============================================================================================== */

/** Everything that varies between how a reference is written and how BOOKS spells it: case, the
 * spaces and full stops around a leading numeral, and the trailing dot of an abbreviation.
 * "1 Cor.", "1cor", "I " is deliberately NOT handled — roman numerals for the numbered books are
 * rare in typing and would collide with the letter I. */
function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim()
      // "1cor" and "1 cor" are the same reference typed by two people in a hurry. BOOKS spells the
      // numbered books with a space, so put one back before anything is compared. Only 1/2/3, and
      // only at the very front, so a chapter number is never touched.
      .replace(/^([123]) ?(?=[a-z])/, "$1 ")
  );
}

/** Abbreviations a reader is likely to type that are NOT a prefix of the book's own name, so the
 * prefix search below can never find them. Kept deliberately short: every entry is a claim about
 * what someone meant, and the prefix rule already covers the overwhelming majority ("matt", "gen",
 * "rev", "ps", "phil"). Anything ambiguous is left out rather than guessed at. */
const ALIASES: Record<string, string> = {
  mt: "Matthew",
  mk: "Mark",
  lk: "Luke",
  jn: "John",
  "1 jn": "1 John",
  "2 jn": "2 John",
  "3 jn": "3 John",
  jas: "James",
  phm: "Philemon",
  sos: "Song of Solomon",
};

export interface ReferenceSuggestion {
  /** The book's canonical name, exactly as BOOKS spells it. */
  book: string;
  chapter: number;
  /** The whole reference as it should read — "Matthew 1". This is what gets navigated to, and what
   * the grey completion is derived from. */
  text: string;
  /** True when `text` continues what was typed character for character (ignoring case), so the tail
   * of it can be shown inline after the cursor. False for an alias like "mt", where the reference is
   * right but is not a continuation of the letters on screen and inline grey text would lie. */
  inline: boolean;
  /** True when the reader typed a chapter number themselves, rather than having 1 assumed for them.
   * Used to decide whether Enter should navigate or run an ordinary word search: nobody searching
   * Scripture for a phrase types a book name followed by a number. */
  explicitChapter: boolean;
}

/**
 * Whether Enter on this input should GO somewhere rather than search for the words in it.
 *
 * The bar's first job is still finding a phrase in Scripture, and most of what gets typed into it
 * is a phrase. Two things are strong enough to override that, and nothing else is:
 *   - The grey suggestion is on screen (`inline`). The reader can see where Enter will take them,
 *     so it cannot surprise anyone — this is the "MATT" case the owner asked for.
 *   - A chapter number was typed after a book ("psalm 23", "1 cor 13"). No word search looks like
 *     that, and it is the form people have written references in for four hundred years.
 * An alias with no chapter ("mt", "jn") deliberately fails both: it would navigate off a hint the
 * reader was never shown.
 */
export function shouldNavigate(suggestion: ReferenceSuggestion | null): boolean {
  return !!suggestion && (suggestion.inline || suggestion.explicitChapter);
}

/** The book a partial name is heading for, by the precedence described above. */
function matchBook(partial: string): string | null {
  if (!partial) return null;
  const exact = BOOKS.find((b) => normalize(b.name) === partial);
  if (exact) return exact.name;
  const alias = ALIASES[partial];
  if (alias) return alias;
  // BOOKS is in canonical order, so the first prefix match IS the canonical-order winner.
  const prefix = BOOKS.find((b) => normalize(b.name).startsWith(partial));
  return prefix ? prefix.name : null;
}

/**
 * What the reader is most likely typing, or null if this does not look like a reference at all
 * (an ordinary word search — "love", "shepherd" — which is what the search bar does otherwise).
 *
 * Handles a chapter typed after the book, clamped to what the book actually has: "Psalms 200" is
 * offered as Psalms 150 rather than a chapter that would fail to load. A trailing verse ("john
 * 3:16") is accepted and the verse dropped — the app navigates by chapter, and refusing to
 * recognise the most-typed reference form in the Bible would be a strange place to draw a line.
 */
export function suggestReference(input: string): ReferenceSuggestion | null {
  const q = normalize(input);
  if (!q) return null;

  // Split into "name part" and "chapter part". The leading digit of a numbered book belongs to the
  // name, so the chapter is only the digits that follow at least one letter.
  const m = /^(\d?\s*[a-z][a-z\s]*?)\s*(\d+)?\s*(?::\s*\d+)?$/.exec(q);
  if (!m) return null;
  const namePart = normalize(m[1]);
  const chapterPart = m[2];

  const book = matchBook(namePart);
  if (!book) return null;

  const info = BOOKS.find((b) => b.name === book);
  if (!info) return null;

  // A chapter of 0, or one typed past the end of the book, still resolves to a real place rather
  // than to nothing — someone mid-way through typing "1" of "12" should not see the suggestion
  // flicker out and back.
  const chapter = chapterPart ? Math.min(Math.max(parseInt(chapterPart, 10), 1), info.chapters) : 1;
  const text = `${book} ${chapter}`;

  return {
    book,
    chapter,
    text,
    inline: text.toLowerCase().startsWith(input.toLowerCase().trimStart()),
    explicitChapter: !!chapterPart,
  };
}

/**
 * The part of a suggestion that has not been typed yet — what gets drawn in grey after the cursor.
 * Empty when the reader has already typed the whole thing, and empty for a non-inline suggestion,
 * so a caller can render this unconditionally.
 */
export function completionTail(input: string, suggestion: ReferenceSuggestion | null): string {
  if (!suggestion || !suggestion.inline) return "";
  const typed = input.trimStart();
  return suggestion.text.slice(typed.length);
}

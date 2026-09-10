/* ============================================================================
 * Fetching Scripture text — the one place the app asks bible-api.com for words.
 *
 * This module exists because there are now two callers and there must not be two implementations.
 * BiblePanel loads a whole chapter for the reader; the sermon-notes "Insert Scripture" picker loads
 * one verse or a short range to drop into a note. Both want the same thing from the network — a
 * reference in, verses out, a thrown error on anything that is not verses — and the differences
 * between them (progress saving, annotations, scroll targeting) all sit ABOVE the fetch, in the
 * callers, where they belong.
 *
 * WEB is the app's default translation and the one a note is quoted in: it is a public-domain
 * modern English text, so a passage pasted into someone's notes carries no licence question with
 * it. The translation id is still a parameter, because the reader's panel offers KJV and ASV too
 * and this module has no business deciding for them.
 * ==========================================================================*/

/** One verse exactly as bible-api.com returns it. */
export interface PassageVerse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface PassageResult {
  /** The reference the API echoed back, e.g. "John 3:16-17". */
  reference: string;
  verses: PassageVerse[];
  translationName: string;
}

/** The translation a sermon note quotes when nothing says otherwise. */
export const DEFAULT_TRANSLATION = "web";

/** How long the picker waits before it stops waiting. Someone is typing in a pew with a phone on a
 * congregation's worth of shared signal; a fetch that has not landed in eight seconds is not about
 * to, and the picker needs to say so and offer the reference on its own rather than sit there. */
export const PASSAGE_TIMEOUT_MS = 8000;

/**
 * Asks for a reference and returns its verses, or throws.
 *
 * Throws — rather than returning null — because every caller has a different thing to do about a
 * failure (the reader's panel shows a message under the chapter; the notes picker offers to insert
 * the bare reference) and an exception carries the API's own explanation along for them to use.
 */
export async function fetchPassage(reference: string, translationId: string, signal?: AbortSignal): Promise<PassageResult> {
  const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${translationId}`;
  const res = await fetch(url, signal ? { signal } : undefined);
  const data = await res.json();
  if (!res.ok || data.error || !Array.isArray(data.verses) || data.verses.length === 0) {
    throw new Error(typeof data?.error === "string" ? data.error : "Passage not found");
  }
  return {
    reference: typeof data.reference === "string" ? data.reference : reference,
    verses: data.verses as PassageVerse[],
    translationName: typeof data.translation_name === "string" ? data.translation_name : translationId.toUpperCase(),
  };
}

/** The reference as a human writes it: "John 3:16", "John 3:16-18". An end verse that is missing,
 * equal to the start, or (through a typo) before it collapses back to the single-verse form, so the
 * note never carries a reference that reads backwards. */
export function formatVerseReference(book: string, chapter: number, startVerse: number, endVerse?: number | null): string {
  const base = `${book} ${chapter}:${startVerse}`;
  return endVerse && endVerse > startVerse ? `${base}-${endVerse}` : base;
}

/** Verses -> one run of prose.
 *
 * bible-api.com returns each verse with the line breaks of its own typesetting baked in — a poetic
 * line in the Psalms arrives split across three lines. Inside a sermon note those breaks are noise,
 * so the whole passage is folded to single-spaced prose. The verse NUMBERS are deliberately left
 * out of the text: the reference sits above the quote and says which verses these are, and numerals
 * interleaved through the words are the first thing that makes a quotation hard to read back at
 * speed.
 */
export function passageToPlainText(verses: PassageVerse[]): string {
  return verses
    .map((v) => v.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

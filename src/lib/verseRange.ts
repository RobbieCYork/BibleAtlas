/** Clips a start/end-verse range down to the portion that falls within one specific verse.
 * Returns null if that verse isn't covered at all. Verses strictly between start and end are
 * covered in full (0..textLength); the start/end verses use their real offsets. */
export function clipRangeForVerse(
  startVerse: number,
  startOffset: number,
  endVerse: number,
  endOffset: number,
  verseNum: number,
  textLength: number
): { start: number; end: number } | null {
  if (verseNum < startVerse || verseNum > endVerse) return null;
  if (startVerse === endVerse) return { start: startOffset, end: endOffset };
  if (verseNum === startVerse) return { start: startOffset, end: textLength };
  if (verseNum === endVerse) return { start: 0, end: endOffset };
  return { start: 0, end: textLength };
}

const WORD_CHAR = /[\p{L}\p{N}']/u;

/** Expands a raw tap offset out to the boundaries of the word it landed in/next to — so a single tap
 * selects a whole word instead of a zero-width point. */
export function expandToWord(text: string, offset: number): { start: number; end: number } {
  const clamped = Math.max(0, Math.min(text.length, offset));
  let start = clamped;
  let end = clamped;
  while (end < text.length && WORD_CHAR.test(text[end])) end++;
  while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;
  if (start === end) {
    if (clamped > 0 && WORD_CHAR.test(text[clamped - 1])) {
      end = clamped;
      start = clamped;
      while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;
    } else {
      start = clamped;
      end = Math.min(text.length, clamped + 1);
    }
  }
  return { start, end };
}

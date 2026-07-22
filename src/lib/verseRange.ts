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

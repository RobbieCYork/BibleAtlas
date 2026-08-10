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

/** Orders two verse+offset positions — negative if `a` comes first, positive if `b` does, 0 if equal.
 * Used to keep a dragged highlight handle from crossing past the opposite, stationary edge. */
export function comparePosition(
  aVerse: number,
  aOffset: number,
  bVerse: number,
  bOffset: number
): number {
  if (aVerse !== bVerse) return aVerse - bVerse;
  return aOffset - bOffset;
}

/** Where the reader last was, kept on the device. The server's reading_progress row stays the record
 * across devices; this is what opens the right chapter with no connection. */

const KEY = "bible-last-position";

export interface LastPosition {
  userId: string;
  book: string;
  chapter: number;
  translation: string;
  /** ISO time, comparable with reading_progress.updated_at. */
  at: string;
}

export function saveLastPosition(p: Omit<LastPosition, "at">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, at: new Date().toISOString() }));
  } catch {
    /* blocked storage: offline reading starts at the default chapter */
  }
}

export function readLastPosition(userId: string): LastPosition | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as LastPosition | null;
    return p && p.userId === userId && p.book && p.chapter ? p : null;
  } catch {
    return null;
  }
}

export function clearLastPosition(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing kept */
  }
}

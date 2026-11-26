/** A copy of the reader's own highlights, notes and tags on this device, so a downloaded Bible reads
 * the same with no connection. Kept only on a device that has downloaded a translation, and only
 * for a reader who asked to be remembered there; read-only offline (changes always go to the
 * server); erased at sign-out. */

import { isRememberMe, supabase, type Highlight, type Note, type Tag, type VerseTag } from "../supabase";
import { hasAnyDownload, initOfflineBibles } from "./bibles";
import { transact, get } from "./db";

interface Saved {
  syncedAt: string | null;
  highlights: Highlight[];
  notes: Note[];
  verseTags: VerseTag[];
  tags: Tag[];
}

export interface ChapterAnnotations {
  highlights: Highlight[];
  notes: Note[];
  verseTags: VerseTag[];
}

const empty = (): Saved => ({ syncedAt: null, highlights: [], notes: [], verseTags: [], tags: [] });
const key = (userId: string) => `ann:${userId}`;

/** Raised by clearSavedAnnotations, so a copy already on its way cannot be written after it. */
let generation = 0;

async function wanted(): Promise<boolean> {
  await initOfflineBibles();
  // Without "Remember me" the sign-in ends with the browser session, so nothing is left behind it.
  return isRememberMe() && hasAnyDownload();
}

/** Read, change and write back in one transaction, so two writers cannot lose each other's rows. */
async function update(userId: string, change: (s: Saved) => Saved, startedIn = generation): Promise<void> {
  if (!(await wanted()) || startedIn !== generation) return;
  await transact(["kv"], "readwrite", (tx) => {
    const store = tx.objectStore("kv");
    const req = store.get(key(userId));
    req.onsuccess = () => {
      if (startedIn === generation) store.put(change((req.result as Saved | undefined) ?? empty()), key(userId));
    };
    return () => undefined;
  });
}

export async function savedChapter(userId: string, book: string, chapter: number, translation: string): Promise<ChapterAnnotations | null> {
  const s = await get<Saved>("kv", key(userId)).catch(() => undefined);
  if (!s) return null;
  const here = (r: { book: string; chapter: number }) => r.book === book && r.chapter === chapter;
  return {
    highlights: s.highlights.filter((r) => here(r) && r.translation === translation),
    notes: s.notes.filter(here),
    verseTags: s.verseTags.filter(here),
  };
}

export function saveChapter(userId: string, book: string, chapter: number, translation: string, data: ChapterAnnotations): void {
  const here = (r: { book: string; chapter: number }) => r.book === book && r.chapter === chapter;
  void update(userId, (s) => ({
    ...s,
    highlights: [...s.highlights.filter((r) => !(here(r) && r.translation === translation)), ...data.highlights],
    notes: [...s.notes.filter((r) => !here(r)), ...data.notes],
    verseTags: [...s.verseTags.filter((r) => !here(r)), ...data.verseTags],
  })).catch((err) => console.warn("Couldn't save notes for offline reading:", err));
}

export async function savedTags(userId: string): Promise<Tag[] | null> {
  return (await get<Saved>("kv", key(userId)).catch(() => undefined))?.tags ?? null;
}

export function saveTags(userId: string, tags: Tag[]): void {
  void update(userId, (s) => ({ ...s, tags })).catch(() => {});
}

/** Every row of one table that belongs to this reader. Throws rather than returning part. */
async function all<T>(table: string, userId: string): Promise<T[]> {
  const page = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId).order("id").range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if ((data?.length ?? 0) < page) return rows;
  }
}

/** Replaces the device copy with everything on the server, so chapters never opened on this device
 * show their highlights offline too. Does nothing without a download or a connection. */
export async function syncAnnotations(userId: string): Promise<void> {
  const startedIn = generation;
  if (!navigator.onLine || !(await wanted())) return;
  try {
    const [highlights, notes, verseTags, tags] = await Promise.all([
      all<Highlight>("highlights", userId),
      all<Note>("notes", userId),
      all<VerseTag>("verse_tags", userId),
      all<Tag>("tags", userId),
    ]);
    tags.sort((a, b) => a.name.localeCompare(b.name));
    await update(userId, () => ({ syncedAt: new Date().toISOString(), highlights, notes, verseTags, tags }), startedIn);
  } catch (err) {
    console.warn("Couldn't copy notes for offline reading:", err);
  }
}

/** Sign-out and account deletion: nothing of the reader's stays on the device. */
export async function clearSavedAnnotations(): Promise<void> {
  generation++;
  try {
    await transact(["kv"], "readwrite", (tx) => {
      tx.objectStore("kv").clear();
      return () => undefined;
    });
  } catch {
    /* no storage, so nothing was kept */
  }
}

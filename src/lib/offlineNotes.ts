// Notes with no signal.
//
// Three jobs, all of them about never losing what someone typed:
//   1. Keep a copy of the notes the user has loaded, so they can still read them offline.
//   2. When a note is created or edited and the network is unreachable, QUEUE the change on the device
//      instead of failing, and show it right away.
//   3. When the network is back, send the queue to the server -- without ever overwriting newer
//      server data silently.
//
// Conflict rule (the important one). An offline EDIT remembers the `updated_at` the note had when the
// edit began. At sync time the update is conditional on that exact value (compare-and-swap), so it
// only lands if nobody changed the note in the meantime. If it does not land:
//   - the note was changed elsewhere  -> the offline text is saved as a NEW note beside it; the
//                                        server's version is left exactly as it is;
//   - the note was deleted elsewhere  -> the offline text is saved as a new note, not discarded.
// Either way the person is told. Nothing is dropped and nothing newer is overwritten.
//
// A queued CREATE carries a client-generated id, so a replay after a dropped response (the server
// stored it, the answer never arrived) hits the primary key and is recognised as already synced.
//
// The queue lives in Capacitor Preferences on native and localStorage in a browser (small JSON; it
// cannot be rebuilt, so it is not kept in the evictable IndexedDB cache).
import { Capacitor } from "@capacitor/core";
import { cacheGet, cachePut, isNetworkError } from "./offlineCache";
import type { Note } from "./supabase";

const QUEUE_KEY = "cb.offline.queue.v1";

type NoteAnchor = Pick<Note, "book" | "chapter" | "start_verse" | "end_verse" | "translation" | "quoted_text" | "quoted_start_offset" | "quoted_end_offset">;

export type QueuedOp =
  | { kind: "note-create"; opId: string; userId: string; noteId: string; anchor: NoteAnchor; text: string; queuedAt: string; attempts: number }
  | { kind: "note-edit"; opId: string; userId: string; noteId: string; anchor: NoteAnchor; text: string; baseUpdatedAt: string; queuedAt: string; attempts: number };

export interface SyncReport {
  synced: number;
  /** Offline edits that clashed with a newer server version and were saved as separate notes. */
  conflicts: number;
  /** Ops that could not be sent for a reason other than being offline; they stay queued. */
  failed: number;
}

/** The slice of the Supabase client the sync needs, so tests can fake it. */
export interface NotesDb {
  insertNote(row: Record<string, unknown>): Promise<{ error: { code?: string; message?: string } | null }>;
  /** Conditional update; returns the rows it changed. */
  updateIfUnchanged(id: string, userId: string, baseUpdatedAt: string, fields: { note_text: string; updated_at: string }): Promise<{ rows: Note[]; error: { code?: string; message?: string } | null }>;
  fetchNote(id: string, userId: string): Promise<{ note: Note | null; error: { code?: string; message?: string } | null }>;
}

export interface QueueStore {
  load(): Promise<QueuedOp[]>;
  save(ops: QueuedOp[]): Promise<void>;
}

export interface OfflineNotesDeps {
  db: NotesDb;
  store: QueueStore;
  now?: () => string;
  uuid?: () => string;
}

// ---- default queue store ----------------------------------------------------------------------

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export const defaultQueueStore: QueueStore = {
  async load() {
    try {
      let raw: string | null = null;
      if (isNative()) {
        const { Preferences } = await import("@capacitor/preferences");
        raw = (await Preferences.get({ key: QUEUE_KEY })).value;
      } else {
        raw = localStorage.getItem(QUEUE_KEY);
      }
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as QueuedOp[]) : [];
    } catch {
      return [];
    }
  },
  async save(ops) {
    const raw = JSON.stringify(ops);
    if (isNative()) {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key: QUEUE_KEY, value: raw });
    } else {
      localStorage.setItem(QUEUE_KEY, raw);
    }
  },
};

// ---- the engine -------------------------------------------------------------------------------

export function createOfflineNotes(deps: OfflineNotesDeps) {
  const now = deps.now ?? (() => new Date().toISOString());
  const uuid = deps.uuid ?? (() => crypto.randomUUID());
  let chain: Promise<unknown> = Promise.resolve();
  // Every read-modify-write of the queue runs one at a time, so two quick saves cannot clobber each other.
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn, fn);
    chain = next.catch(() => {});
    return next;
  };

  return {
    /** Queue a brand-new note. Returns the note as it should appear on screen right now. */
    enqueueCreate(userId: string, anchor: NoteAnchor, text: string): Promise<Note> {
      return exclusive(async () => {
        const noteId = uuid();
        const t = now();
        const ops = await deps.store.load();
        ops.push({ kind: "note-create", opId: uuid(), userId, noteId, anchor, text, queuedAt: t, attempts: 0 });
        await deps.store.save(ops);
        return { id: noteId, ...anchor, note_text: text, created_at: t, updated_at: t, is_public: false } as Note;
      });
    },

    /** Queue an edit of an existing note. `base` is the note as the person last saw it from the server. */
    enqueueEdit(userId: string, base: Note, text: string): Promise<Note> {
      return exclusive(async () => {
        const ops = await deps.store.load();
        const pendingCreate = ops.find((o) => o.kind === "note-create" && o.noteId === base.id);
        const pendingEdit = ops.find((o) => o.kind === "note-edit" && o.noteId === base.id);
        if (pendingCreate) {
          // Never reached the server yet: just change the text that will be created.
          pendingCreate.text = text;
        } else if (pendingEdit) {
          // Keep the ORIGINAL baseUpdatedAt: the conflict check is against what the server had when
          // the first offline edit began, not against our own earlier offline edit.
          pendingEdit.text = text;
        } else {
          ops.push({
            kind: "note-edit",
            opId: uuid(),
            userId,
            noteId: base.id,
            anchor: pickAnchor(base),
            text,
            baseUpdatedAt: base.updated_at,
            queuedAt: now(),
            attempts: 0,
          });
        }
        await deps.store.save(ops);
        return { ...base, note_text: text, updated_at: now() };
      });
    },

    async pendingCount(userId?: string): Promise<number> {
      const ops = await deps.store.load();
      return userId ? ops.filter((o) => o.userId === userId).length : ops.length;
    },

    /** Lay the unsynced changes over a list of notes, so what the person sees includes what they typed. */
    async overlayPending(userId: string, notes: Note[], filter?: (n: NoteAnchor) => boolean): Promise<Note[]> {
      const ops = (await deps.store.load()).filter((o) => o.userId === userId);
      if (ops.length === 0) return notes;
      const out = notes.map((n) => ({ ...n }));
      for (const op of ops) {
        const existing = out.find((n) => n.id === op.noteId);
        if (existing) {
          existing.note_text = op.text;
        } else if (op.kind === "note-create" && (!filter || filter(op.anchor))) {
          out.push({ id: op.noteId, ...op.anchor, note_text: op.text, created_at: op.queuedAt, updated_at: op.queuedAt, is_public: false } as Note);
        }
      }
      return out;
    },

    /** Send the queue. Stops quietly at the first "no network"; anything else is recorded and kept. */
    sync(userId: string): Promise<SyncReport> {
      return exclusive(async () => {
        const report: SyncReport = { synced: 0, conflicts: 0, failed: 0 };
        let ops = await deps.store.load();
        const mine = ops.filter((o) => o.userId === userId).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
        const remove = (opId: string) => {
          ops = ops.filter((o) => o.opId !== opId);
        };
        for (const op of mine) {
          let outcome: "done" | "conflict" | "retry" | "stop";
          try {
            outcome = await applyOp(deps.db, op, now, uuid);
          } catch (err) {
            outcome = isNetworkError(err) ? "stop" : "retry";
          }
          if (outcome === "stop") break;
          if (outcome === "retry") {
            const live = ops.find((o) => o.opId === op.opId);
            if (live) live.attempts += 1;
            report.failed += 1;
            continue;
          }
          remove(op.opId);
          if (outcome === "conflict") report.conflicts += 1;
          report.synced += 1;
          await deps.store.save(ops); // after each op: a crash mid-sync never replays what already landed
        }
        await deps.store.save(ops);
        return report;
      });
    },
  };
}

function pickAnchor(n: Note): NoteAnchor {
  return {
    book: n.book,
    chapter: n.chapter,
    start_verse: n.start_verse,
    end_verse: n.end_verse,
    translation: n.translation,
    quoted_text: n.quoted_text,
    quoted_start_offset: n.quoted_start_offset,
    quoted_end_offset: n.quoted_end_offset,
  };
}

type Outcome = "done" | "conflict" | "retry" | "stop";

async function applyOp(db: NotesDb, op: QueuedOp, now: () => string, uuid: () => string): Promise<Outcome> {
  const insertRow = (id: string, text: string) =>
    db.insertNote({ id, user_id: op.userId, ...op.anchor, note_text: text });

  if (op.kind === "note-create") {
    const { error } = await insertRow(op.noteId, op.text);
    if (!error) return "done";
    if (error.code === "23505") return "done"; // already stored by an earlier attempt whose reply was lost
    return isNetworkError(error) ? "stop" : "retry";
  }

  // note-edit: compare-and-swap on the updated_at the person was looking at.
  const upd = await db.updateIfUnchanged(op.noteId, op.userId, op.baseUpdatedAt, { note_text: op.text, updated_at: now() });
  if (upd.error) return isNetworkError(upd.error) ? "stop" : "retry";
  if (upd.rows.length > 0) return "done";

  // Nothing changed. Why? Look at what the server has now.
  const cur = await db.fetchNote(op.noteId, op.userId);
  if (cur.error) return isNetworkError(cur.error) ? "stop" : "retry";
  if (cur.note && cur.note.note_text === op.text) return "done"; // the same words are already there
  // Newer server version, or the note is gone: keep BOTH. The server's copy is untouched.
  const label = cur.note ? "[Edited offline] " : "[Saved offline; the original was deleted] ";
  const { error } = await insertRow(uuid(), label + op.text);
  if (error) return isNetworkError(error) ? "stop" : "retry";
  return "conflict";
}

// ---- cached copies of the notes ---------------------------------------------------------------

const chapterKey = (userId: string, book: string, chapter: number) => `notes:${userId}:${book}:${chapter}`;
const allKey = (userId: string) => `notes:${userId}:all`;

export const cacheChapterNotes = (userId: string, book: string, chapter: number, notes: Note[]) => cachePut(chapterKey(userId, book, chapter), notes);
export const recallChapterNotes = async (userId: string, book: string, chapter: number) => (await cacheGet<Note[]>(chapterKey(userId, book, chapter))) ?? null;
export const cacheAllNotes = (userId: string, notes: Note[]) => cachePut(allKey(userId), notes);
export const recallAllNotes = async (userId: string) => (await cacheGet<Note[]>(allKey(userId))) ?? null;

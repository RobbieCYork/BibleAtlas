/** Downloaded Bibles: download, resume, update, delete, and reading what is on the device.
 *
 * Rules this file keeps:
 *  - A translation is readable offline only when ALL its books are saved. A half-finished download
 *    is kept and resumed; it is never read from.
 *  - Every book file is checked against the checksum in the catalog before it is saved.
 *  - An app update never removes a download. A newer text is offered as an "update", downloaded
 *    beside the old one, and swapped in only when complete.
 */

import { useMemo, useSyncExternalStore } from "react";
import { PACKS, bookUrl, packFor, type BookFile, type CatalogBook } from "./catalog";
import { get, transact } from "./db";
import { ensureShell, removeShell } from "./shell";

export type PauseReason = "offline" | "storage" | "server";

export interface PackRecord {
  id: string;
  version: string;
  complete: boolean;
  books: CatalogBook[];
  totalBytes: number;
  doneBytes: number;
  completedAt?: string;
  /** Why an unfinished download stopped. Absent: it was cut off (app closed) or is still running. */
  reason?: PauseReason;
}

export interface TranslationDownload {
  /** The complete copy on this device, if any — what reading uses. */
  installed?: PackRecord;
  /** An unfinished download (first time, or an update beside `installed`). */
  pending?: PackRecord;
  running: boolean;
}

export interface OfflineSnapshot {
  /** False until the device's storage has been read. */
  ready: boolean;
  /** False when this browser will not store anything (some private modes). */
  storageAvailable: boolean;
  byId: Record<string, TranslationDownload>;
}

let snapshot: OfflineSnapshot = { ready: false, storageAvailable: true, byId: {} };
const listeners = new Set<() => void>();
const running = new Map<string, { controller: AbortController; done: Promise<void> }>();
/** Downloads that stopped, remembered here too: a full device may refuse to record even that. */
const stopped = new Map<string, PackRecord>();
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("cb-offline-bibles");

function emit(next: OfflineSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function patch(id: string, change: Partial<TranslationDownload>) {
  const before = snapshot.byId[id] ?? { running: false };
  emit({ ...snapshot, byId: { ...snapshot.byId, [id]: { ...before, ...change } } });
}

const announce = () => channel?.postMessage("changed");
const range = (id: string, version?: string) =>
  version === undefined ? IDBKeyRange.bound([id], [id, []]) : IDBKeyRange.bound([id, version], [id, version, []]);
const lockName = (id: string) => `cb-bible-${id}`;

async function allRecords(): Promise<PackRecord[]> {
  return transact(["packs"], "readonly", (tx) => {
    const req = tx.objectStore("packs").getAll();
    return () => req.result as PackRecord[];
  });
}

async function refresh(): Promise<void> {
  try {
    const records = await allRecords();
    // Which downloads another tab is running right now.
    const held = new Set((await navigator.locks?.query?.())?.held?.map((l) => l.name) ?? []);
    const byId: Record<string, TranslationDownload> = {};
    for (const r of records) {
      const entry = (byId[r.id] ??= { running: false });
      if (!r.complete) entry.pending = r;
      else if (!entry.installed || (r.completedAt ?? "") > (entry.installed.completedAt ?? "")) entry.installed = r;
    }
    for (const [id, record] of stopped) {
      const entry = (byId[id] ??= { running: false });
      if (!running.has(id)) entry.pending = { ...(entry.pending ?? record), reason: record.reason };
    }
    for (const [id, entry] of Object.entries(byId)) entry.running = running.has(id) || held.has(lockName(id));
    emit({ ready: true, storageAvailable: true, byId });
  } catch (err) {
    console.warn("Offline storage is not available:", err);
    emit({ ready: true, storageAvailable: false, byId: {} });
  }
}

let initialised: Promise<void> | null = null;

/** Called once at startup (main.tsx); also awaited by anything that reads a download. */
export function initOfflineBibles(): Promise<void> {
  if (!initialised) {
    initialised = (async () => {
      if (!PACKS.length) {
        // Nothing downloadable in this build, but an earlier build's downloads must stay readable.
        await refresh();
        if (Object.keys(snapshot.byId).length) void ensureShell();
        return;
      }
      await refresh();
      channel?.addEventListener("message", () => void refresh());
      window.addEventListener("online", () => {
        void ensureShell().catch(() => {});
        resumeInterrupted();
      });
      if (Object.keys(snapshot.byId).length) {
        void ensureShell();
        resumeInterrupted();
      } else if (snapshot.storageAvailable && navigator.onLine) {
        // The last download is gone (deleted elsewhere, or the browser cleared it).
        void removeShell();
      }
    })();
  }
  return initialised;
}

function resumeInterrupted() {
  if (!navigator.onLine) return;
  for (const [id, entry] of Object.entries(snapshot.byId)) {
    // Out of space needs the reader to act; everything else is worth another try.
    if (entry.pending && !entry.running && entry.pending.reason !== "storage") void startDownload(id);
  }
}

class ServerError extends Error {}

const STALL_MS = 30_000;

async function sha256Hex(bytes: Uint8Array): Promise<string | null> {
  if (!crypto.subtle) return null; // not a secure context; the length check below still applies
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchBook(url: string, book: CatalogBook, signal: AbortSignal, onBytes: (n: number) => void): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const stop = () => controller.abort();
    signal.addEventListener("abort", stop);
    let timer = window.setTimeout(stop, STALL_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: attempt ? "reload" : "default" });
      if (!res.ok) throw new ServerError(`HTTP ${res.status}`);
      const bytes = new Uint8Array(book.bytes);
      let received = 0;
      let tooLong = false;
      const reader = res.body!.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        window.clearTimeout(timer);
        timer = window.setTimeout(stop, STALL_MS);
        if (received + value.length > book.bytes) {
          tooLong = true;
          void reader.cancel();
          break;
        }
        bytes.set(value, received);
        received += value.length;
        onBytes(received);
      }
      const hash = !tooLong && received === book.bytes ? await sha256Hex(bytes) : "";
      if (!tooLong && received === book.bytes && (hash === null || hash === book.sha256)) return new TextDecoder().decode(bytes);
      onBytes(0); // damaged or the wrong file: ask once more, past the browser's cache
    } finally {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", stop);
    }
  }
  throw new ServerError("the file did not match");
}

async function savedBooks(id: string, version: string): Promise<Set<number>> {
  return transact(["books"], "readonly", (tx) => {
    const req = tx.objectStore("books").getAllKeys(range(id, version));
    return () => new Set((req.result as [string, string, number][]).map((k) => k[2]));
  });
}

async function deleteVersion(id: string, version: string) {
  await transact(["packs", "books"], "readwrite", (tx) => {
    tx.objectStore("packs").delete([id, version]);
    tx.objectStore("books").delete(range(id, version));
    return () => undefined;
  });
}

async function run(id: string, signal: AbortSignal): Promise<void> {
  const pack = packFor(id);
  if (!pack) return;
  await refresh();
  const entry = snapshot.byId[id];
  if (entry?.installed?.version === pack.version) {
    if (entry.pending) await deleteVersion(id, entry.pending.version);
    return;
  }
  // A half-finished download of a text this build no longer offers cannot be finished.
  if (entry?.pending && entry.pending.version !== pack.version) await deleteVersion(id, entry.pending.version);

  const have = await savedBooks(id, pack.version);
  const record: PackRecord = {
    id,
    version: pack.version,
    complete: false,
    books: pack.books,
    totalBytes: pack.bytes,
    doneBytes: pack.books.filter((b) => have.has(b.n)).reduce((s, b) => s + b.bytes, 0),
  };
  const save = () =>
    transact(["packs"], "readwrite", (tx) => {
      tx.objectStore("packs").put(record);
      return () => undefined;
    });

  try {
    await save();
    patch(id, { pending: { ...record }, running: true });
    announce();
    const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
    const needed = record.totalBytes - record.doneBytes;
    if (estimate?.quota !== undefined && estimate.quota - (estimate.usage ?? 0) < needed * 1.1) {
      throw new DOMException("not enough room", "QuotaExceededError");
    }
    for (const book of pack.books) {
      if (have.has(book.n)) continue;
      signal.throwIfAborted();
      const base = record.doneBytes;
      const text = await fetchBook(bookUrl(id, pack.version, book.n), book, signal, (n) =>
        patch(id, { pending: { ...record, doneBytes: base + n } })
      );
      signal.throwIfAborted();
      // One transaction: the book and the progress that counts it. If the row has gone, someone
      // removed this download (another tab) and nothing more may be written.
      const wanted = await transact(["packs", "books"], "readwrite", (tx) => {
        let still = false;
        const req = tx.objectStore("packs").getKey([id, pack.version]);
        req.onsuccess = () => {
          if (req.result === undefined) return;
          still = true;
          record.doneBytes = base + book.bytes;
          tx.objectStore("books").put(text, [id, pack.version, book.n]);
          tx.objectStore("packs").put(record);
        };
        return () => still;
      });
      if (!wanted) return;
      patch(id, { pending: { ...record } });
      announce();
    }
    record.complete = true;
    record.completedAt = new Date().toISOString();
    const older = (await allRecords()).filter((r) => r.id === id && r.version !== pack.version);
    // The swap: the new copy becomes readable in the same step that removes the old one. Not if the
    // download was removed while its last book was arriving.
    await transact(["packs", "books"], "readwrite", (tx) => {
      const req = tx.objectStore("packs").getKey([id, pack.version]);
      req.onsuccess = () => {
        if (req.result === undefined) return;
        tx.objectStore("packs").put(record);
        for (const r of older) {
          tx.objectStore("packs").delete([id, r.version]);
          tx.objectStore("books").delete(range(id, r.version));
        }
      };
      return () => undefined;
    });
    bookCache.clear();
  } catch (err) {
    if (signal.aborted) return;
    const name = (err as { name?: string })?.name;
    record.complete = false;
    record.reason = name === "QuotaExceededError" ? "storage" : err instanceof ServerError ? "server" : "offline";
    console.warn(`Download of ${id} stopped (${record.reason}):`, err);
    stopped.set(id, { ...record });
    // On a full device even this small write can fail; `stopped` still says why.
    await save().catch(() => {});
  }
}

/** Starts, resumes or updates a download. Safe to call twice. */
export function startDownload(id: string): Promise<void> {
  const current = running.get(id);
  if (current) return current.done;
  const controller = new AbortController();
  stopped.delete(id);
  // Ask the browser not to clear this site's storage when the device runs short.
  void navigator.storage?.persist?.().catch(() => {});
  const work = () => run(id, controller.signal);
  const done = (async () => {
    try {
      if (navigator.locks) {
        // One tab downloads a given translation at a time.
        await navigator.locks.request(lockName(id), { ifAvailable: true }, async (lock) => {
          if (lock) await work();
        });
      } else await work();
    } catch (err) {
      // Storage failed before the download could keep its own account of it.
      console.warn(`Download of ${id} failed:`, err);
      const pack = packFor(id);
      if (pack) stopped.set(id, { id, version: pack.version, complete: false, books: pack.books, totalBytes: pack.bytes, doneBytes: 0, reason: "storage" });
    } finally {
      running.delete(id);
      await refresh();
      announce();
    }
  })();
  running.set(id, { controller, done });
  patch(id, { running: true });
  void ensureShell();
  return done;
}

async function stop(id: string) {
  const current = running.get(id);
  current?.controller.abort();
  await current?.done.catch(() => {});
  stopped.delete(id);
}

async function afterRemoval() {
  bookCache.clear();
  await refresh();
  announce();
  if (snapshot.storageAvailable && !Object.keys(snapshot.byId).length) await removeShell();
}

/** Stops an unfinished download and discards what it fetched. A complete older copy stays. */
export async function cancelDownload(id: string): Promise<void> {
  await stop(id);
  const pending = (await allRecords()).filter((r) => r.id === id && !r.complete);
  for (const r of pending) await deleteVersion(id, r.version);
  await afterRemoval();
}

/** Deletes the translation from this device. */
export async function removeBible(id: string): Promise<void> {
  await stop(id);
  await transact(["packs", "books"], "readwrite", (tx) => {
    tx.objectStore("packs").delete(range(id));
    tx.objectStore("books").delete(range(id));
    return () => undefined;
  });
  await afterRemoval();
}

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */

const bookCache = new Map<string, BookFile>();
const BOOK_CACHE_SIZE = 6;

/** The complete downloaded copy of a translation, or null. */
export async function installedPack(id: string): Promise<PackRecord | null> {
  await initOfflineBibles();
  return snapshot.byId[id]?.installed ?? null;
}

/** One book from the downloaded copy; null when this translation is not downloaded. */
export async function readDownloadedBook(id: string, n: number): Promise<BookFile | null> {
  const record = await installedPack(id);
  if (!record) return null;
  const key = `${id}/${record.version}/${n}`;
  const cached = bookCache.get(key);
  if (cached) return cached;
  const text = await get<string>("books", [id, record.version, n]);
  if (text === undefined) {
    // Part of the copy has gone. Stop calling it downloaded, so it can be fetched again.
    await transact(["packs"], "readwrite", (tx) => {
      tx.objectStore("packs").put({ ...record, complete: false });
      return () => undefined;
    }).catch(() => {});
    await refresh();
    resumeInterrupted();
    return null;
  }
  const book = JSON.parse(text) as BookFile;
  bookCache.set(key, book);
  if (bookCache.size > BOOK_CACHE_SIZE) bookCache.delete(bookCache.keys().next().value!);
  return book;
}

export const getOfflineSnapshot = () => snapshot;
export const hasAnyDownload = () => Object.values(snapshot.byId).some((d) => d.installed || d.pending);

export function subscribeOffline(l: () => void) {
  listeners.add(l);
  void initOfflineBibles();
  return () => {
    listeners.delete(l);
  };
}

/** Everything, progress included: for the download list only. */
export function useOfflineBibles(): OfflineSnapshot {
  return useSyncExternalStore(subscribeOffline, getOfflineSnapshot, getOfflineSnapshot);
}

const summary = () => {
  const entries = Object.entries(snapshot.byId).sort(([a], [b]) => a.localeCompare(b));
  return [
    snapshot.ready,
    snapshot.storageAvailable,
    entries.map(([id]) => id).join(),
    entries.filter(([, d]) => d.installed).map(([id]) => id).join(),
  ].join("|");
};

/** Which translations are on the device. Changes only when that does, so the reader and the app are
 * not redrawn at every step of a download. */
export function useDownloadSummary(): { ready: boolean; storageAvailable: boolean; ids: string[]; installed: string[] } {
  const key = useSyncExternalStore(subscribeOffline, summary, summary);
  return useMemo(() => {
    const [ready, storageAvailable, ids, installed] = key.split("|");
    return {
      ready: ready === "true",
      storageAvailable: storageAvailable === "true",
      ids: ids ? ids.split(",") : [],
      installed: installed ? installed.split(",") : [],
    };
  }, [key]);
}

/** The one IndexedDB database for offline reading. Separate from the service worker's caches, so an
 * app update (or removing the worker) never touches a downloaded Bible.
 *
 *   packs  one row per translation version: what is downloaded and how far it got  [id, version]
 *   books  the book files, exactly as downloaded                                   [id, version, n]
 *   kv     this reader's saved highlights, notes and tags, for reading offline     "ann:<userId>"
 */

// Not "capstone-offline": the native-app branch already uses that name for its own, differently shaped,
// database.
const NAME = "capstone-bible-library";
const VERSION = 1;

export type StoreName = "packs" | "books" | "kv";

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!opening) {
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("no storage"));
        return;
      }
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        // Additive only: a later version adds stores or indexes and must never delete downloads.
        if (!db.objectStoreNames.contains("packs")) db.createObjectStore("packs", { keyPath: ["id", "version"] });
        if (!db.objectStoreNames.contains("books")) db.createObjectStore("books");
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        db.onclose = () => {
          opening = null;
        };
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    }).catch((err) => {
      opening = null;
      throw err;
    });
  }
  return opening;
}

/** Runs `work` in one transaction and resolves only when it has committed. A failed write (storage
 * full, for one) rejects with the browser's own error, whose name is what callers test. */
export async function transact<T>(stores: StoreName[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => () => T): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result: () => T;
    tx.oncomplete = () => resolve(result());
    tx.onabort = () => reject(tx.error ?? new DOMException("aborted", "AbortError"));
    try {
      result = work(tx);
    } catch (err) {
      try {
        tx.abort();
      } catch {
        /* already finished */
      }
      reject(err);
    }
  });
}

/** Reads one value. */
export function get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return transact([store], "readonly", (tx) => {
    const req = tx.objectStore(store).get(key);
    return () => req.result as T | undefined;
  });
}

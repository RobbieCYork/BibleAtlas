// A small key/value cache for things worth having with no signal: Bible chapters the reader opened
// recently and the signed-in user's notes.
//
// IndexedDB is the backend (works in browsers and in the native WebView). If it is unavailable or
// throws, every call degrades to "nothing cached" -- the cache is an optimisation and must never be
// the reason a screen breaks. The write queue for unsynced edits is NOT stored here (see
// offlineNotes.ts: it goes to Capacitor Preferences on native), because that data cannot be rebuilt.

export interface KvBackend {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export function createMemoryBackend(): KvBackend {
  const m = new Map<string, unknown>();
  return {
    get: async (k) => m.get(k),
    set: async (k, v) => void m.set(k, v),
    del: async (k) => void m.delete(k),
    keys: async () => [...m.keys()],
  };
}

const DB_NAME = "capstone-offline";
const STORE = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function createIdbBackend(): KvBackend {
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () => (dbp ??= openDb());
  const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const d = await db();
    return new Promise<T>((resolve, reject) => {
      const req = fn(d.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };
  return {
    get: (k) => run("readonly", (s) => s.get(k)),
    set: async (k, v) => void (await run("readwrite", (s) => s.put(v, k))),
    del: async (k) => void (await run("readwrite", (s) => s.delete(k))),
    keys: async () => (await run("readonly", (s) => s.getAllKeys())).map(String),
  };
}

let backend: KvBackend | null = null;
function getBackend(): KvBackend | null {
  if (backend) return backend;
  try {
    if (typeof indexedDB === "undefined") return null;
    backend = createIdbBackend();
  } catch {
    backend = null;
  }
  return backend;
}

/** Tests inject an in-memory backend. */
export function setCacheBackendForTest(b: KvBackend | null) {
  backend = b;
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await getBackend()?.get(key)) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function cachePut(key: string, value: unknown): Promise<void> {
  try {
    await getBackend()?.set(key, value);
  } catch {
    /* quota or blocked storage: no cache, no harm */
  }
}

/** Removes every cached entry whose key starts with `prefix`. */
export async function cacheDelPrefix(prefix: string): Promise<void> {
  try {
    const b = getBackend();
    if (!b) return;
    for (const k of await b.keys()) if (k.startsWith(prefix)) await b.del(k);
  } catch {
    /* ignore */
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getBackend()?.del(key);
  } catch {
    /* ignore */
  }
}

/** True when a thrown value looks like "the request never reached the server" rather than "the server
 * said no". Only the first kind may be answered from cache or queued for later. */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true;
  const msg = String((err as { message?: string } | null)?.message ?? err ?? "").toLowerCase();
  return /failed to fetch|networkerror|network request failed|load failed|network connection was lost|internet connection appears to be offline|fetch failed/.test(msg);
}

// ---- Bible passages ---------------------------------------------------------------------------

/** How many distinct chapters/passages are kept for offline reading. Each is a few KB. */
export const PASSAGE_CACHE_LIMIT = 40;
const PASSAGE_PREFIX = "passage:";
const PASSAGE_INDEX = "passage-index";

export const passageKey = (translationId: string, reference: string) => `${PASSAGE_PREFIX}${translationId}|${reference}`;

/** Remembers a passage, evicting the least recently used one beyond PASSAGE_CACHE_LIMIT. */
export async function rememberPassage(translationId: string, reference: string, value: unknown): Promise<void> {
  const key = passageKey(translationId, reference);
  await cachePut(key, { value, savedAt: Date.now() });
  const index = ((await cacheGet<string[]>(PASSAGE_INDEX)) ?? []).filter((k) => k !== key);
  index.push(key);
  while (index.length > PASSAGE_CACHE_LIMIT) {
    const evict = index.shift();
    if (evict) await cacheDel(evict);
  }
  await cachePut(PASSAGE_INDEX, index);
}

export async function recallPassage<T>(translationId: string, reference: string): Promise<T | undefined> {
  const hit = await cacheGet<{ value: T }>(passageKey(translationId, reference));
  return hit?.value;
}

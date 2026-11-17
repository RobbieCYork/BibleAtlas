/**
 * paidContent.ts — where an article's text BELOW the references list comes from.
 *
 * Every article panel asks `usePaidContent(kind, record)` for its paid body (the fields listed in
 * paidContentSpec.ts PAID_KEYS) and renders it when the answer is `ready`, or <PaidTeaser> otherwise.
 *
 * TWO SOURCES, chosen at build time (paid-content.config.json, vite-plugin-paid-content.ts):
 *
 *  - 'bundle'  The full record is in the JS bundle, as it always was. The body is cut out of it
 *              locally and synchronously: first render, no request, no flash. This is the default
 *              until sql/043 is applied and seeded, and with it the app is identical to before.
 *
 *  - 'server'  The bundle carries only free fields. The body is read from `content_paid`, whose RLS
 *              allows it only when has_entitlement('plus') is true (sql/043). One rpc per session
 *              decides "entitled or not"; rows are fetched per article on demand, requests made in
 *              the same tick are batched into one `in.(…)` query per kind, and every answer is kept
 *              in memory for the session.
 *
 * OFFLINE (Capacitor and browsers alike): for an ENTITLED reader each fetched body is also kept in
 * IndexedDB, keyed by user id, together with the last entitlement answer. When the network is
 * unreachable (not when the server says no), a body is served from there if the last entitlement
 * check for THIS user said yes within OFFLINE_GRACE_MS. A reader who is not entitled never gets
 * anything written; a "not entitled" answer, a sign-out or a different user signing in deletes the
 * stored copies. The store is a separate IndexedDB database from the store-app branch's
 * `capstone-offline` so the two cannot collide; see scripts/paid-content/README.md for how they merge.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { pickPaid, type PaidBody, type PaidKind, type RecordByKind } from "./paidContentSpec";

export const PAID_CONTENT_SOURCE: "bundle" | "server" = __PAID_CONTENT_SOURCE__;

export type PaidState<K extends PaidKind> =
  | { status: "ready"; body: PaidBody<K> }
  /** Waiting for the entitlement answer or the row. */
  | { status: "loading" }
  /** Signed in, not entitled: show the upgrade teaser. */
  | { status: "gated" }
  /** No connection, nothing usable cached. */
  | { status: "offline" }
  /** Entitled, but the server could not give us the row (missing row, table not there, error). */
  | { status: "unavailable" };

type AnyState = PaidState<PaidKind>;

const LOADING: AnyState = { status: "loading" };
const GATED: AnyState = { status: "gated" };
const OFFLINE: AnyState = { status: "offline" };
const UNAVAILABLE: AnyState = { status: "unavailable" };

const ENTITLEMENT_TTL_MS = 10 * 60 * 1000;
const OFFLINE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
const ROW_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH_MAX = 60;

// ------------------------------------------------------------------------------- store
const states = new Map<string, AnyState>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const keyOf = (kind: PaidKind, id: string) => `${kind}:${id}`;
const setState = (key: string, s: AnyState) => {
  states.set(key, s);
};

// Bundle mode: one stable `ready` object per record, so useSyncExternalStore sees the same snapshot.
const bundleReady = new WeakMap<object, AnyState>();
function bundleSnapshot(kind: PaidKind, record: RecordByKind[PaidKind]): AnyState {
  let s = bundleReady.get(record);
  if (!s) {
    s = { status: "ready", body: pickPaid(kind, record as never) } as AnyState;
    bundleReady.set(record, s);
  }
  return s;
}

// ------------------------------------------------------------------------------- persistence
const DB_NAME = "capstone-paid-content";
const STORE = "kv";
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  try {
    const db = await openDb();
    if (!db) return undefined;
    return await new Promise<T | undefined>((resolve) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}
const persistGet = <T>(k: string) => idb<T>("readonly", (s) => s.get(k));
const persistPut = (k: string, v: unknown) => idb("readwrite", (s) => s.put(v, k));
const persistDelPrefix = async (prefix: string) => {
  const keys = (await idb<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) ?? [];
  await Promise.all(keys.map(String).filter((k) => k.startsWith(prefix)).map((k) => idb("readwrite", (s) => s.delete(k))));
};
/** Deletes every stored paid body on this device. Called on sign-out; exported for account deletion. */
export const clearPaidContentCache = () => idb("readwrite", (s) => s.clear());

// ------------------------------------------------------------------------------- network
function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true;
  const msg = String((err as { message?: string } | null)?.message ?? err ?? "").toLowerCase();
  return /failed to fetch|networkerror|network request failed|load failed|network connection was lost|offline|fetch failed/.test(msg);
}

type Entitlement = { userId: string; value: boolean | "offline-yes" | "offline-unknown" | "error"; at: number };
let entitlementMemo: { userId: string; promise: Promise<Entitlement>; at: number } | null = null;

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

async function askEntitlement(userId: string): Promise<Entitlement> {
  const persistKey = `u:${userId}|ent`;
  try {
    const { data, error } = await supabase.rpc("has_entitlement", { p: "plus" });
    if (error) throw error;
    const value = data === true;
    if (value) void persistPut(persistKey, { value: true, at: Date.now() });
    else void persistDelPrefix(`u:${userId}|`);
    return { userId, value, at: Date.now() };
  } catch (err) {
    if (!isNetworkError(err)) return { userId, value: "error", at: Date.now() };
    const last = await persistGet<{ value: boolean; at: number }>(persistKey);
    const fresh = last?.value === true && Date.now() - last.at < OFFLINE_GRACE_MS;
    return { userId, value: fresh ? "offline-yes" : "offline-unknown", at: Date.now() };
  }
}

function entitlementFor(userId: string): Promise<Entitlement> {
  const now = Date.now();
  if (!entitlementMemo || entitlementMemo.userId !== userId || now - entitlementMemo.at > ENTITLEMENT_TTL_MS) {
    entitlementMemo = { userId, promise: askEntitlement(userId), at: now };
  }
  return entitlementMemo.promise;
}

// ------------------------------------------------------------------------------- batching
const pending = new Map<PaidKind, Set<string>>();
let flushScheduled = false;

function request(kind: PaidKind, id: string) {
  const key = keyOf(kind, id);
  const s = states.get(key);
  // Already answered, or already on its way: nothing to do. A failed answer is asked again.
  if (s && s.status !== "offline" && s.status !== "unavailable") return;
  setState(key, LOADING);
  notify();
  let set = pending.get(kind);
  if (!set) pending.set(kind, (set = new Set()));
  set.add(id);
  if (!flushScheduled) {
    flushScheduled = true;
    setTimeout(() => void flush(), 0);
  }
}

async function fromCache(userId: string, kind: PaidKind, id: string): Promise<AnyState> {
  const hit = await persistGet<{ body: unknown; at: number }>(`u:${userId}|${keyOf(kind, id)}`);
  if (hit && Date.now() - hit.at < ROW_TTL_MS) return { status: "ready", body: hit.body } as AnyState;
  return OFFLINE;
}

async function flush() {
  flushScheduled = false;
  const batch = [...pending.entries()].map(([kind, ids]) => [kind, [...ids]] as const);
  pending.clear();
  if (batch.length === 0) return;

  const userId = await currentUserId();
  const settle = (kind: PaidKind, ids: readonly string[], s: AnyState) => ids.forEach((id) => setState(keyOf(kind, id), s));

  if (!userId) {
    batch.forEach(([kind, ids]) => settle(kind, ids, GATED));
    return notify();
  }

  const ent = await entitlementFor(userId);
  if (ent.value === false) {
    batch.forEach(([kind, ids]) => settle(kind, ids, GATED));
    return notify();
  }
  if (ent.value === "error") {
    batch.forEach(([kind, ids]) => settle(kind, ids, UNAVAILABLE));
    entitlementMemo = null; // ask again on retry
    return notify();
  }
  if (ent.value === "offline-unknown") {
    batch.forEach(([kind, ids]) => settle(kind, ids, OFFLINE));
    entitlementMemo = null;
    return notify();
  }
  if (ent.value === "offline-yes") {
    for (const [kind, ids] of batch) for (const id of ids) setState(keyOf(kind, id), await fromCache(userId, kind, id));
    entitlementMemo = null;
    return notify();
  }

  for (const [kind, allIds] of batch) {
    for (let i = 0; i < allIds.length; i += BATCH_MAX) {
      const ids = allIds.slice(i, i + BATCH_MAX);
      try {
        const { data, error } = await supabase.from("content_paid").select("id, body").eq("kind", kind).in("id", ids);
        if (error) throw error;
        const got = new Map((data ?? []).map((r: { id: string; body: unknown }) => [r.id, r.body]));
        for (const id of ids) {
          const body = got.get(id);
          if (body && typeof body === "object") {
            setState(keyOf(kind, id), { status: "ready", body } as AnyState);
            void persistPut(`u:${userId}|${keyOf(kind, id)}`, { body, at: Date.now() });
          } else {
            setState(keyOf(kind, id), UNAVAILABLE);
          }
        }
      } catch (err) {
        if (isNetworkError(err)) {
          for (const id of ids) setState(keyOf(kind, id), await fromCache(userId, kind, id));
        } else {
          settle(kind, ids, UNAVAILABLE);
        }
      }
    }
  }
  notify();
}

/** Forget one article's answer and ask again (the Retry button on the offline/unavailable states). */
export function retryPaidContent(kind: PaidKind, id: string) {
  states.delete(keyOf(kind, id));
  request(kind, id);
}

// A different account must never see the previous one's answers.
if (PAID_CONTENT_SOURCE === "server") {
  let lastUser: string | null | undefined;
  supabase.auth.onAuthStateChange((event, session) => {
    const uid = session?.user.id ?? null;
    if (lastUser !== undefined && uid !== lastUser) {
      states.clear();
      entitlementMemo = null;
      notify();
    }
    if (event === "SIGNED_OUT") void clearPaidContentCache();
    else if (lastUser && uid && uid !== lastUser) void persistDelPrefix(`u:${lastUser}|`);
    lastUser = uid;
  });
}

// ------------------------------------------------------------------------------- hook
const NONE: AnyState = UNAVAILABLE;

export function usePaidContent<K extends PaidKind>(kind: K, record: RecordByKind[K] | null): PaidState<K> {
  const id = record?.id ?? null;
  const snapshot = useSyncExternalStore(subscribe, () => {
    if (!record || id === null) return NONE;
    if (PAID_CONTENT_SOURCE === "bundle") return bundleSnapshot(kind, record);
    return states.get(keyOf(kind, id)) ?? LOADING;
  });
  useEffect(() => {
    if (PAID_CONTENT_SOURCE === "server" && id !== null) request(kind, id);
  }, [kind, id]);
  return snapshot as PaidState<K>;
}

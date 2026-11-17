// The app-wide wiring for offline notes: the real Supabase-backed engine, the online/offline status the
// banner shows, and the triggers that flush the queue (back online, app start, sign-in, a retry timer
// while anything is waiting). The logic and its conflict rules live in offlineNotes.ts.
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase, type Note } from "./supabase";
import { createOfflineNotes, defaultQueueStore, type NotesDb, type SyncReport } from "./offlineNotes";

const db: NotesDb = {
  async insertNote(row) {
    const { error } = await supabase.from("notes").insert(row);
    return { error };
  },
  async updateIfUnchanged(id, userId, baseUpdatedAt, fields) {
    const { data, error } = await supabase
      .from("notes")
      .update(fields)
      .eq("id", id)
      .eq("user_id", userId)
      .eq("updated_at", baseUpdatedAt)
      .select();
    return { rows: (data as Note[] | null) ?? [], error };
  },
  async fetchNote(id, userId) {
    const { data, error } = await supabase.from("notes").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    return { note: (data as Note | null) ?? null, error };
  },
};

export const offlineNotes = createOfflineNotes({ db, store: defaultQueueStore });

// ---- status -----------------------------------------------------------------------------------

interface Status {
  online: boolean;
  pending: number;
  syncing: boolean;
  /** Set after a sync in which an offline edit clashed with a newer version. Cleared by dismiss. */
  conflicts: number;
}

let status: Status = { online: typeof navigator === "undefined" ? true : navigator.onLine !== false, pending: 0, syncing: false, conflicts: 0 };
const listeners = new Set<() => void>();
const setStatus = (patch: Partial<Status>) => {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
};
export const dismissConflicts = () => setStatus({ conflicts: 0 });

/** React hook for the banner. */
export function useOfflineStatus(): Status {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status
  );
}

export const OFFLINE_SYNCED_EVENT = "capstone:offline-synced";

/** Runs the queue for this user now (no-op if offline or already running). */
export async function flushOfflineQueue(userId: string): Promise<SyncReport | null> {
  if (status.syncing || navigator.onLine === false) return null;
  setStatus({ syncing: true });
  try {
    const report = await offlineNotes.sync(userId);
    const pending = await offlineNotes.pendingCount(userId);
    setStatus({ syncing: false, pending, conflicts: status.conflicts + report.conflicts });
    if (report.synced > 0) window.dispatchEvent(new CustomEvent(OFFLINE_SYNCED_EVENT, { detail: report }));
    return report;
  } catch {
    setStatus({ syncing: false });
    return null;
  }
}

export async function refreshPending(userId: string | null) {
  setStatus({ pending: userId ? await offlineNotes.pendingCount(userId) : 0 });
}

/** Mount once, near the root, with the signed-in user id (or null). */
export function useOfflineSync(userId: string | null) {
  useEffect(() => {
    const onOnline = () => {
      setStatus({ online: true });
      if (userId) void flushOfflineQueue(userId);
    };
    const onOffline = () => setStatus({ online: false });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void refreshPending(userId);
    if (userId) void flushOfflineQueue(userId);
    // While anything is waiting, retry every 30s: the "online" event is not reliable on every WebView.
    const timer = window.setInterval(() => {
      if (userId && status.pending > 0) void flushOfflineQueue(userId);
    }, 30_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(timer);
    };
  }, [userId]);
}

/** Bumps whenever a sync lands, so a screen can re-read its notes. */
export function useOfflineSyncedTick(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const h = () => setN((x) => x + 1);
    window.addEventListener(OFFLINE_SYNCED_EVENT, h);
    return () => window.removeEventListener(OFFLINE_SYNCED_EVENT, h);
  }, []);
  return n;
}

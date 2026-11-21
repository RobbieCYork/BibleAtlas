/**
 * groupsStatus.ts — the one piece of Capstone Plus for Groups that ships in the main bundle: whether
 * to draw the "Classes & Groups" menu row at all. Split out of ./groups (2026-11-21, phase 4) because
 * AuthButton's static import of ./groups put that whole module, the DRAFT agreement text included,
 * in the entry chunk. Everything else stays in the lazy GroupsSheet chunk.
 *
 * `groups_status()` answers `groups_enabled` for the signed-in account (sql/047). FAIL CLOSED: an
 * error, including the function not existing because sql/047 is not applied, means "off".
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { isNativeApp } from "./billing";

interface GroupsStatus {
  loaded: boolean;
  enabled: boolean;
}
const OFF: GroupsStatus = { loaded: true, enabled: false };
let state: GroupsStatus = { loaded: false, enabled: false };
let inflight: Promise<void> | null = null;
let forUser: string | null | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function refreshGroupsStatus(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user ?? null;
      forUser = user?.id ?? null;
      if (!user || user.is_anonymous || isNativeApp()) {
        state = OFF;
        return;
      }
      const { data, error } = await supabase.rpc("groups_status");
      state = !error && data && typeof data === "object" && (data as { groups_enabled?: unknown }).groups_enabled === true
        ? { loaded: true, enabled: true }
        : OFF;
    } catch {
      state = OFF;
    } finally {
      inflight = null;
      notify();
    }
  })();
  return inflight;
}

supabase.auth.onAuthStateChange((_event, session) => {
  const uid = session?.user.id ?? null;
  if (forUser !== undefined && uid !== forUser) {
    state = { loaded: false, enabled: false };
    notify();
    void refreshGroupsStatus();
  }
});

export function useGroupsEnabled(): boolean {
  const snap = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (!state.loaded && !inflight) void refreshGroupsStatus();
  }, []);
  return snap.loaded && snap.enabled && !isNativeApp();
}


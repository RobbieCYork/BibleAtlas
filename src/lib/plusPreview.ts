/**
 * plusPreview.ts — "Plus preview": lets the owner (or a flagged demo account) SEE which parts of
 * the app are Free and which are Capstone Plus. Purely visual. It changes no entitlement, no billing
 * behaviour and no RLS; it only sets `data-plus-preview="on"` on <html>, which src/plusPreview.css
 * keys on to draw badges and outlines around elements carrying `data-tier="free|plus"`.
 *
 * WHO CAN SEE THE SWITCH (all three are checked client-side, none costs a request):
 *   (a) the owner account  — from the owner check lib/features.ts already makes for everyone;
 *   (b) an allow-listed demo account — VITE_PLUS_PREVIEW_USER_IDS, a comma list of user ids, baked
 *       in at BUILD time. (A server-side app_settings allow-list would need a new rpc, i.e. a
 *       migration; see scripts/signed-in-harness/README.md "Plus preview".)
 *   (c) a build made with VITE_PLUS_PREVIEW=1 — the local harness.
 * Never in a native app build (Capacitor), never for anyone else, fail closed on any error.
 *
 * DEFAULT: OFF for the owner (they flip it with the floating legend; remembered in localStorage).
 * ON by default only for (b) and (c), where the whole point is to look at it.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { useFeatureAdmin } from "./features";
import { isNativeApp } from "./billing";

const KEY = "plus-preview";
const FLAG = import.meta.env.VITE_PLUS_PREVIEW === "1";
const DEMO_IDS = (import.meta.env.VITE_PLUS_PREVIEW_USER_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

let userId: string | null = null;
let pref: "on" | "off" | null = null;
try {
  const v = localStorage.getItem(KEY);
  pref = v === "on" || v === "off" ? v : null;
} catch {
  /* private mode: just the default */
}
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
let version = 0;
const snap = () => version;

/** Reads the cached session from storage and follows sign-in/out. Makes no network request. */
function startUserWatch() {
  let stop = () => {};
  try {
    void supabase.auth.getSession().then(({ data }) => {
      userId = data.session?.user.id ?? null;
      version++;
      emit();
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      userId = session?.user.id ?? null;
      version++;
      emit();
    });
    stop = () => data.subscription.unsubscribe();
  } catch {
    /* fail closed */
  }
  return stop;
}

export interface PlusPreviewState {
  /** May this viewer see the legend at all? */
  available: boolean;
  /** Is the overlay drawn right now? Always false when not available. */
  on: boolean;
  setOn: (on: boolean) => void;
}

export function usePlusPreview(): PlusPreviewState {
  useSyncExternalStore(subscribe, snap, snap);
  const { isOwner } = useFeatureAdmin();
  // Only worth watching the session when a demo allow-list exists; otherwise the owner check is enough.
  useEffect(() => (DEMO_IDS.length ? startUserWatch() : undefined), []);

  const demo = FLAG || (!!userId && DEMO_IDS.includes(userId));
  const available = !isNativeApp() && (demo || isOwner);
  const on = available && (pref ? pref === "on" : demo);

  useEffect(() => {
    const root = document.documentElement;
    if (on) root.setAttribute("data-plus-preview", "on");
    else root.removeAttribute("data-plus-preview");
    return () => root.removeAttribute("data-plus-preview");
  }, [on]);

  return {
    available,
    on,
    setOn: (v) => {
      pref = v ? "on" : "off";
      try {
        localStorage.setItem(KEY, pref);
      } catch {
        /* not remembered */
      }
      version++;
      emit();
    },
  };
}

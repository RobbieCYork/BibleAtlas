import { useCallback, useSyncExternalStore } from "react";

/** The translations the reader offers. The one list — the reader's chip and My Profile's "Bible
 * version" select both render from it, so a version added here shows up in both. Public-domain
 * only: no NIV/ESV. */
export const TRANSLATIONS = [
  { id: "web", label: "World English Bible (WEB)", short: "WEB" },
  { id: "kjv", label: "King James Version (KJV)", short: "KJV" },
  { id: "asv", label: "American Standard Version (ASV)", short: "ASV" },
];

export const DEFAULT_TRANSLATION = "web";
const STORAGE_KEY = "bible-translation";
const CHANGE_EVENT = "bible-translation-change";

const isKnown = (id: string | null): id is string => !!id && TRANSLATIONS.some((t) => t.id === id);

/** The saved choice, or null when the reader has never picked one on this device. */
export function getStoredTranslation(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isKnown(v) ? v : null;
  } catch {
    return null;
  }
}

// Kept in memory too, so the choice still holds for the session when localStorage is unavailable.
let current: string = getStoredTranslation() ?? DEFAULT_TRANSLATION;

export function setStoredTranslation(id: string): void {
  if (!isKnown(id)) return;
  current = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode / blocked storage: in-memory value still applies */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      current = getStoredTranslation() ?? DEFAULT_TRANSLATION;
      cb();
    }
  };
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** [translation id, setter] backed by the one saved preference shared by the reader and My Profile. */
export function useBibleTranslation(): [string, (id: string) => void] {
  const value = useSyncExternalStore(subscribe, () => current, () => DEFAULT_TRANSLATION);
  const set = useCallback((id: string) => setStoredTranslation(id), []);
  return [value, set];
}

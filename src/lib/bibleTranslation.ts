import { useCallback, useSyncExternalStore } from "react";
import { packFor } from "./offline/catalog";

export interface Translation {
  id: string;
  label: string;
  short: string;
  /** The full name printed under a chapter and beside a download. */
  name: string;
  /** The rights line printed under a chapter, after `name`. */
  credit: string;
  /** Wording the publisher asks to be shown with the text, and where it points. */
  attribution?: { text: string; url: string };
  /** True when bible-api.com serves the very same text as our own file, so it can stand in when our
   * file cannot be had. Where it is not, mixing the two would move highlights. */
  sameTextOnBibleApi: boolean;
  /** Offered only when this build ships the translation's file (see lib/offline/catalog). */
  needsPack?: boolean;
}

const ALL: Translation[] = [
  { id: "web", label: "World English Bible (WEB)", short: "WEB", name: "World English Bible", credit: "Public Domain", sameTextOnBibleApi: true },
  { id: "kjv", label: "King James Version (KJV)", short: "KJV", name: "King James Version", credit: "Public Domain", sameTextOnBibleApi: true },
  { id: "asv", label: "American Standard Version (ASV)", short: "ASV", name: "American Standard Version (1901)", credit: "Public Domain", sameTextOnBibleApi: true },
  {
    id: "bsb",
    label: "Berean Standard Bible (BSB)",
    short: "BSB",
    name: "Berean Standard Bible",
    credit: "Public Domain",
    // Quoted from https://berean.bible/terms.htm ("appreciated but not required"). Do not reword.
    attribution: {
      text: "The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.com, and the Berean Bible Translation Committee. This text of God's Word has been dedicated to the public domain.",
      url: "https://berean.bible",
    },
    sameTextOnBibleApi: false,
    needsPack: true,
  },
];

/** The translations the reader offers. The one list — the reader's chip, My Profile's "Bible
 * version" select and the offline downloads all render from it, so a version added here shows up in
 * all of them. Public-domain only: no NIV/ESV. A licensed text would need its own storage and expiry
 * rules before it could be listed here as downloadable. */
export const TRANSLATIONS: Translation[] = ALL.filter((t) => !t.needsPack || !!packFor(t.id));

export const translationFor = (id: string): Translation | undefined => TRANSLATIONS.find((t) => t.id === id);

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

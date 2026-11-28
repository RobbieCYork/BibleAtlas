import { createContext, useContext, useEffect, useRef } from "react";

/** What App tells the social screens (Friends, Groups, Messages, Church, a person's profile) about
 * where they stand. */
export interface SocialNav {
  /** True while this screen is what the reader is looking at: not behind another tab and not covered
   * by a full-screen mode. Only then does the browser's Back act on it (the panels stay mounted). */
  onScreen: boolean;
  /** Leave the social screens for wherever the reader came from. The Back of every top-level list. */
  exit: () => void;
}

export const SocialNavContext = createContext<SocialNav>({ onScreen: false, exit: () => {} });

export const useSocialNav = () => useContext(SocialNavContext);

/* --- Browser / hardware Back ---------------------------------------------------------------------
 * The app has no router, so without this the browser's Back (the Android button, the iOS edge swipe)
 * walks off the site from any screen. While a social screen is showing, one extra history entry is
 * kept on top of the page; Back consumes it and runs that screen's own Back, one level at a time.
 * The URL never changes. The entry is removed again when the reader leaves by any other route. */

const HISTORY_KEY = "capstoneSocialBack";
let handler: (() => void) | null = null;
/** Our entry is the current one. */
let armed = false;
/** We called history.back() ourselves and its popstate has not arrived yet. */
let removing = false;
let scheduled = false;

function schedule() {
  if (scheduled) return;
  scheduled = true;
  // Deferred so that one screen handing over to the next in a single render is not a leave and a
  // re-entry.
  window.setTimeout(sync, 0);
}

function sync() {
  scheduled = false;
  if (removing) return;
  if (handler && !armed) {
    window.history.pushState({ ...(window.history.state ?? {}), [HISTORY_KEY]: true }, "");
    armed = true;
  } else if (!handler && armed) {
    armed = false;
    if (!window.history.state?.[HISTORY_KEY]) return;
    removing = true;
    window.history.back();
  }
}

function onPopState() {
  if (removing) {
    removing = false;
    schedule();
    return;
  }
  if (!armed) return;
  armed = false;
  handler?.();
  // After React has re-rendered: re-arm if a social screen is still showing.
  window.setTimeout(schedule, 0);
}

if (typeof window !== "undefined") window.addEventListener("popstate", onPopState);

/** Makes the browser's Back run `onBack` while it is not null. One screen at a time. */
export function useBrowserBack(onBack: (() => void) | null) {
  const latest = useRef(onBack);
  latest.current = onBack;
  const active = onBack !== null;
  useEffect(() => {
    if (!active) return;
    const mine = () => latest.current?.();
    handler = mine;
    schedule();
    return () => {
      if (handler !== mine) return;
      handler = null;
      schedule();
    };
  }, [active]);
}

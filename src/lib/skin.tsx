import { useEffect, useSyncExternalStore } from "react";
import { supabase, storedSession } from "./supabase";

/* ============================================================================
 * Visual skins — a normal feature for every signed-in reader (2026-11).
 *
 * A skin is a set of CSS-variable and component overrides in skins.css, switched on by a
 * `data-skin` attribute on <html>. The default look has NO skin attribute, so it is byte-for-byte
 * the stylesheet that shipped before this file existed.
 *
 * THE RULE
 * ----------------------------------------------------------------------------
 *     active skin = signed in (a real account, not a guest) ? stored choice : null
 *
 * Choosing happens in My Profile → Appearance (SkinPicker, components/SkinPicker.tsx). Signed-out
 * visitors, guests and the sign-in gate are never skinned: they get the default look, whatever a
 * previous visitor left in localStorage.
 *
 * Persistence is per device, in localStorage only. No database column, no migration. Every
 * localStorage access is try/catch'd and an unknown stored value reads as "default" (fail safe).
 *
 * FONTS
 * ----------------------------------------------------------------------------
 * Skin fonts are SELF-HOSTED (public/fonts/skins.css + woff2, SIL OFL). Nothing is requested from
 * Google. The stylesheet is injected only while a skin is active, and each family's files are only
 * fetched by the browser when an element actually uses that family, so a reader on Default (or on
 * one skin) downloads none of the other skins' fonts.
 *
 * THEME INTERPLAY
 * ----------------------------------------------------------------------------
 * The app already has light/dark (`data-theme`) and some rules key off it. A skin is one fixed
 * mode, so while it is active the controller pins `data-theme` to the skin's mode (Midnight =
 * dark, the others light) and puts the reader's own choice back the moment the skin goes.
 * ========================================================================== */

export type SkinId = "sticker" | "clarity" | "midnight" | "sage" | "skyreader" | "trailhead" | "highlighter";
export type SkinChoice = SkinId | "default";

export interface SkinDef {
  id: SkinId;
  label: string;
  blurb: string;
  mode: "light" | "dark";
  swatch: [string, string, string];
}

export const SKINS: ReadonlyArray<SkinDef> = [
  {
    id: "sticker",
    label: "Sticker Pop",
    blurb: "Bold, playful, chunky outlines. Light.",
    mode: "light",
    swatch: ["#FFD43B", "#FF6B3D", "#2F4BFF"],
  },
  {
    id: "clarity",
    label: "Clarity",
    blurb: "Clean, calm, sage accent. Light.",
    mode: "light",
    swatch: ["#FFFFFF", "#3E7B63", "#DCEBE3"],
  },
  {
    id: "midnight",
    label: "Midnight Signal",
    blurb: "Navy and charcoal, violet and teal. Dark.",
    mode: "dark",
    swatch: ["#0B1020", "#7C5CFF", "#2DD4BF"],
  },
  {
    id: "sage",
    label: "Sage Study",
    blurb: "Warm stone, sage green and gold. Light.",
    mode: "light",
    swatch: ["#F6F8F3", "#3F6B57", "#C58B3B"],
  },
  {
    id: "skyreader",
    label: "Sky Reader",
    blurb: "Sky blue, navy and orange; big friendly type. Light.",
    mode: "light",
    swatch: ["#E6F2FF", "#1B58C9", "#FF8A1F"],
  },
  {
    id: "trailhead",
    label: "Trailhead",
    blurb: "Sunny cream, forest green, big friendly controls. Light.",
    mode: "light",
    swatch: ["#FFF6DA", "#25683F", "#FFC83D"],
  },
  {
    id: "highlighter",
    label: "Highlighter",
    blurb: "Cool grey, indigo, yellow highlighter. Light.",
    mode: "light",
    swatch: ["#F2F4FA", "#3338C9", "#FFE45C"],
  },
];

const STORAGE_KEY = "app-skin";

function isSkinId(v: unknown): v is SkinId {
  return v === "sticker" || v === "clarity" || v === "midnight" || v === "sage" || v === "skyreader" || v === "trailhead" || v === "highlighter";
}

function readStored(): SkinChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isSkinId(v) ? v : "default";
  } catch {
    return "default";
  }
}

let stored: SkinChoice = readStored();
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function setSkin(choice: SkinChoice) {
  stored = choice;
  try {
    if (choice === "default") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* private mode / blocked storage: the choice just lasts this page view */
  }
  listeners.forEach((l) => l());
}

/** The reader's saved choice. NOT the active skin — use useActiveSkin() for that. */
export function useStoredSkin(): SkinChoice {
  return useSyncExternalStore(subscribe, () => stored, () => "default" as SkinChoice);
}

// Signed in as a real (non-guest) account. Starts false, so nothing is skinned until the session
// has actually been read; the sign-in gate and signed-out visitors therefore always stay Default.
let signedIn = false;
const authListeners = new Set<() => void>();
let authStarted = false;
function startAuthWatch() {
  if (authStarted) return;
  authStarted = true;
  supabase.auth.onAuthStateChange((event, session) => {
    // No connection to renew an expired token is not a sign-out (see storedSession).
    const current = session ?? (event === "SIGNED_OUT" ? null : storedSession());
    const next = !!current && !current.user.is_anonymous;
    if (next === signedIn) return;
    signedIn = next;
    authListeners.forEach((l) => l());
  });
}
function subscribeAuth(l: () => void) {
  startAuthWatch();
  authListeners.add(l);
  return () => {
    authListeners.delete(l);
  };
}

/** The skin actually in force: the stored choice for a signed-in reader, null for everybody else. */
export function useActiveSkin(): SkinDef | null {
  const isSignedIn = useSyncExternalStore(subscribeAuth, () => signedIn, () => false);
  const choice = useStoredSkin();
  if (!isSignedIn || choice === "default") return null;
  return SKINS.find((s) => s.id === choice) ?? null;
}

const FONT_LINK_ID = "skin-fonts";

function readThemePref(): "light" | "dark" {
  try {
    return localStorage.getItem("app-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Mounts once, renders nothing. Applies / removes data-skin, the skin's fonts and its theme mode. */
export function SkinController() {
  const skin = useActiveSkin();

  useEffect(() => {
    const root = document.documentElement;
    if (!skin) {
      // Touch nothing unless a skin was actually applied: for everyone who never had one this
      // effect is a no-op, so the default look cannot be disturbed by it.
      if (root.hasAttribute("data-skin")) {
        root.removeAttribute("data-skin");
        document.getElementById(FONT_LINK_ID)?.remove();
        root.setAttribute("data-theme", readThemePref());
      }
      return;
    }

    let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = "/fonts/skins.css";

    root.setAttribute("data-skin", skin.id);
    const pin = () => {
      if (root.getAttribute("data-theme") !== skin.mode) root.setAttribute("data-theme", skin.mode);
    };
    pin();
    // ThemeProvider rewrites data-theme whenever the reader flips light/dark; keep the skin's mode.
    const mo = new MutationObserver(pin);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [skin]);

  return null;
}

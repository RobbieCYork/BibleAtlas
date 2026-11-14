import { useEffect, useSyncExternalStore } from "react";
import { useFeatureAdmin } from "./features";

/* ============================================================================
 * Visual skins — OWNER-ONLY EXPERIMENT (2026-11).
 *
 * A skin is a set of CSS-variable and component overrides in skins.css, switched on by a
 * `data-skin` attribute on <html>. The default look has NO skin attribute, so it is byte-for-byte
 * the stylesheet that shipped before this file existed.
 *
 * THE RULE
 * ----------------------------------------------------------------------------
 *     active skin = isOwner ? stored choice : null
 *
 * `useFeatureAdmin().isOwner` is the same owner check that gates the Testing/Live switch
 * (current_user_is_owner()). It FAILS CLOSED: until the check answers, and if it errors, the user is
 * not the owner, so nobody gets a skin by accident. localStorage only ever holds the owner's
 * *preference*; it is never read for anyone the server has not said is the owner, so a value planted
 * in a member's browser does nothing.
 *
 * No database column, no migration: the choice lives in this browser only.
 * Every localStorage access is try/catch'd; an unknown stored value reads as "default".
 *
 * THEME INTERPLAY
 * ----------------------------------------------------------------------------
 * The app already has light/dark (`data-theme`) and some rules key off it. A skin is one fixed
 * mode, so while it is active the controller pins `data-theme` to the skin's mode (Midnight =
 * dark, the other two = light) and puts the reader's own choice back the moment the skin goes.
 * ========================================================================== */

export type SkinId = "sticker" | "clarity" | "midnight";
export type SkinChoice = SkinId | "default";

export interface SkinDef {
  id: SkinId;
  label: string;
  blurb: string;
  mode: "light" | "dark";
  /** Google Fonts families the skin needs; loaded only while it is active. */
  fonts: string;
  swatch: [string, string, string];
}

export const SKINS: ReadonlyArray<SkinDef> = [
  {
    id: "sticker",
    label: "Sticker Pop",
    blurb: "Bold, playful, chunky outlines. Light.",
    mode: "light",
    fonts: "family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400",
    swatch: ["#FFD43B", "#FF6B3D", "#2F4BFF"],
  },
  {
    id: "clarity",
    label: "Clarity",
    blurb: "Clean, calm, sage accent. Light.",
    mode: "light",
    fonts: "family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400",
    swatch: ["#FFFFFF", "#3E7B63", "#DCEBE3"],
  },
  {
    id: "midnight",
    label: "Midnight Signal",
    blurb: "Navy and charcoal, violet and teal. Dark.",
    mode: "dark",
    fonts: "family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400",
    swatch: ["#0B1020", "#7C5CFF", "#2DD4BF"],
  },
];

const STORAGE_KEY = "app-skin";

function isSkinId(v: unknown): v is SkinId {
  return v === "sticker" || v === "clarity" || v === "midnight";
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

/** The owner's saved choice. NOT the active skin — use useActiveSkin() for that. */
export function useStoredSkin(): SkinChoice {
  return useSyncExternalStore(subscribe, () => stored, () => "default" as SkinChoice);
}

/** The skin actually in force: the stored choice for the owner, null for everybody else. */
export function useActiveSkin(): SkinDef | null {
  const { isOwner } = useFeatureAdmin();
  const choice = useStoredSkin();
  if (!isOwner || choice === "default") return null;
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
    link.href = `https://fonts.googleapis.com/css2?${skin.fonts}&display=swap`;

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

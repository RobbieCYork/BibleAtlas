import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const TEXT_SCALE_MIN = 0.8;
export const TEXT_SCALE_MAX = 1.8;
export const TEXT_SCALE_STEP = 0.15;
const STORAGE_KEY = "app-text-scale";
/** Old, Bible-panel-only key from before text size became a global setting — read once as a
 * fallback so an existing user's preference carries over instead of silently resetting to 1. */
const LEGACY_STORAGE_KEY = "bible-font-scale";

interface TextSizeContextValue {
  scale: number;
  increase: () => void;
  decrease: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

function loadInitialScale(): number {
  const saved = Number(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY));
  return saved >= TEXT_SCALE_MIN && saved <= TEXT_SCALE_MAX ? saved : 1;
}

/** Applies text size through a `--text-scale` CSS variable set on <html>. Each scaled root turns
 * it into `--tsz` for its subtree and scales its own inherited size with `calc(1em * ...)`; every
 * `font-size` in the app is then `calc(<n>px * var(--tsz, 1))`. See the "Global text size" rule in
 * App.css for the root list, the nesting rule, and the measurement that retired the old `zoom`
 * implementation — which scaled the boxes but, on iOS, never the letters.
 *
 * It covers both the reading and writing panels (Bible, Details, Notes, Friends/Messages, Articles,
 * Social, Games) and the app's own chrome — the header and the Settings panel inside it, the mobile
 * tab bar, the Timeline's header, the sign-in screen. The chrome was added after the owner reported
 * the setting as doing nothing: he was watching the Settings panel the A-/A+ buttons sit in, and
 * that panel was not wired to this at all.
 *
 * Still deliberately excluded: the map, which has its own fixed UI scale, and the share-card modal,
 * which is portaled to document.body and so never sits under a scaled root. Neither needs naming
 * anywhere — `--tsz` stays 1 outside the roots, so nothing there scales. */
export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(loadInitialScale);

  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", String(scale));
    localStorage.setItem(STORAGE_KEY, String(scale));
  }, [scale]);

  const clamp = (n: number) => Math.round(Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, n)) * 100) / 100;

  const value: TextSizeContextValue = {
    scale,
    increase: () => setScale((s) => clamp(s + TEXT_SCALE_STEP)),
    decrease: () => setScale((s) => clamp(s - TEXT_SCALE_STEP)),
    canIncrease: scale < TEXT_SCALE_MAX,
    canDecrease: scale > TEXT_SCALE_MIN,
  };

  return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>;
}

export function useTextSize(): TextSizeContextValue {
  const ctx = useContext(TextSizeContext);
  if (!ctx) throw new Error("useTextSize must be used within a TextSizeProvider");
  return ctx;
}

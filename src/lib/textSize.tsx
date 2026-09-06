import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { applyGlyphZoomCorrection } from "./glyphZoom";

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

/** Applies text size through a `--text-scale` CSS variable that each scaled root reads with `zoom`
 * (see the two "Global text size" rules in App.css for the full root list and the nesting rules).
 *
 * It covers both the reading and writing panels (Bible, Details, Notes, Friends/Messages, Articles,
 * Social, Games) and the app's own chrome — the header and the Settings panel inside it, the mobile
 * tab bar, the Timeline's header, the sign-in screen. The chrome was added after the owner reported
 * the setting as doing nothing: he was watching the Settings panel the A-/A+ buttons sit in, and
 * that panel was not wired to this at all.
 *
 * Still deliberately excluded: the map, which has its own fixed UI scale, and the share-card modal,
 * which is portaled to document.body specifically to escape the zoom. */
export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(loadInitialScale);

  // The `zoom` this setting works through scales the boxes on every engine, but on iOS WebKit it
  // does not scale the letters — which is what made the whole setting look broken on an iPhone.
  // Measured and corrected once per load. See lib/glyphZoom.ts for why this is a measurement of
  // the engine's actual behaviour rather than a browser check, and why declining is the safe
  // outcome. Runs after mount so the probe has a real document body to lay out in.
  useEffect(() => {
    applyGlyphZoomCorrection();
  }, []);

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

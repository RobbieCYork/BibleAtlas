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

/** Applies text size everywhere reading/writing happens (Bible, Details, Notes, Friends/Messages) via
 * a `--text-scale` CSS variable each of those panels' root class reads with `zoom` — deliberately NOT
 * applied to the map, which has its own fixed UI scale. */
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

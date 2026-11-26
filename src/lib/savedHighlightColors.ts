/**
 * The Colors sheet's saved swatches: per device, in localStorage only. Each entry is the same strict
 * "#rrggbb@NN" string a highlight stores, so a swatch remembers its opacity too. Anything else found
 * in storage is dropped, and every storage access is try/catch'd (private windows, blocked storage):
 * without storage the swatches simply last as long as the open sheet.
 */
import { parseHighlightColor } from "./highlightColor";
import type { CustomHighlightColor } from "./supabase";

export const SAVED_COLORS_KEY = "highlight-saved-colors";
/** Two rows of seven at 375px, counting the add button. The oldest drops off past this. */
export const MAX_SAVED_COLORS = 13;

const isCustom = (v: unknown): v is CustomHighlightColor => typeof v === "string" && parseHighlightColor(v).kind === "custom";

export function loadSavedColors(): CustomHighlightColor[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_COLORS_KEY) ?? "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.filter(isCustom))].slice(-MAX_SAVED_COLORS) : [];
  } catch {
    return [];
  }
}

export function storeSavedColors(colors: CustomHighlightColor[]): void {
  try {
    localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(colors));
  } catch {
    /* storage full or blocked: keep the in-memory list */
  }
}

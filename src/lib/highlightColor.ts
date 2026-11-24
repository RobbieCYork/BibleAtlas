/**
 * Highlight colours: the four legacy names plus reader-picked custom colours.
 *
 * Storage (highlights.color, a plain text column with no CHECK or enum):
 *   - legacy:  "yellow" | "green" | "blue" | "pink"        (rows written before custom colours)
 *   - custom:  "#rrggbb@NN"  lowercase hex, NN = opacity percent 1-100   e.g. "#3a7bd5@60"
 *
 * Everything that turns a stored string into CSS goes through `highlightPresentation`, which
 * validates STRICTLY first — the value is user-controlled data coming back out of the database, and
 * it ends up in an inline style, so anything that does not match the grammar below is treated as
 * the default yellow rather than being passed through.
 */
import type { CSSProperties } from "react";
import { HIGHLIGHT_COLORS, type NamedHighlightColor, type CustomHighlightColor } from "./supabase";

const CUSTOM_RE = /^#([0-9a-f]{6})@(100|[1-9][0-9]?)$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** The fills the four legacy names have always had (see .verse-highlight-* in App.css). */
export const NAMED_HEX: Record<NamedHighlightColor, string> = {
  yellow: "#fbeaa8",
  green: "#bdead0",
  blue: "#c4dcf7",
  pink: "#f7cbe0",
};

export const MIN_OPACITY = 10;

export type ParsedHighlightColor =
  | { kind: "named"; name: NamedHighlightColor }
  | { kind: "custom"; hex: string; opacity: number };

export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}

export function encodeCustomColor(hex: string, opacity: number): CustomHighlightColor | null {
  if (!isValidHex(hex)) return null;
  const o = Math.round(opacity);
  if (!Number.isFinite(o) || o < 1 || o > 100) return null;
  return `${hex.toLowerCase()}@${o}` as CustomHighlightColor;
}

/** Anything that is not a legacy name or a well-formed custom value comes back as plain yellow, so a
 * corrupt row still renders as a highlight that can be removed or changed. */
export function parseHighlightColor(raw: string | null | undefined): ParsedHighlightColor {
  if (raw && (HIGHLIGHT_COLORS as readonly string[]).includes(raw)) return { kind: "named", name: raw as NamedHighlightColor };
  const m = raw ? CUSTOM_RE.exec(raw) : null;
  if (m) return { kind: "custom", hex: `#${m[1]}`, opacity: Number(m[2]) };
  return { kind: "named", name: "yellow" };
}

export function isCustomHighlight(raw: string | null | undefined): boolean {
  return parseHighlightColor(raw).kind === "custom";
}

/** The colour as a plain hex (opaque) — what the Colors sheet preselects and the rainbow dot shows. */
export function highlightHex(raw: string | null | undefined): string {
  const p = parseHighlightColor(raw);
  return p.kind === "named" ? NAMED_HEX[p.name] : p.hex;
}

export function highlightOpacity(raw: string | null | undefined): number {
  const p = parseHighlightColor(raw);
  return p.kind === "custom" ? p.opacity : 100;
}

/** Same colour name for two stored values? (Named compare by name, custom by hex+opacity.) */
export function sameHighlightColor(a: string, b: string): boolean {
  const pa = parseHighlightColor(a);
  const pb = parseHighlightColor(b);
  if (pa.kind === "named" && pb.kind === "named") return pa.name === pb.name;
  if (pa.kind === "custom" && pb.kind === "custom") return pa.hex === pb.hex && pa.opacity === pb.opacity;
  return false;
}

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function lin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const INK_DARK = "#1a1a1a";
const INK_LIGHT = "#f5f5f5";
/** The reading surface in each theme (index.css --reading-bg), only used for the no-relative-colour
 * fallback; browsers that support it pick the ink from the real, skin-aware surface instead. */
const SURFACE_LIGHT: [number, number, number] = [0xf7, 0xef, 0xdf];
const SURFACE_DARK: [number, number, number] = [0x24, 0x1e, 0x16];

function inkOver(hex: string, opacity: number, surface: [number, number, number]): string {
  const a = opacity / 100;
  const [r, g, b] = rgb(hex);
  const blended: [number, number, number] = [
    r * a + surface[0] * (1 - a),
    g * a + surface[1] * (1 - a),
    b * a + surface[2] * (1 - a),
  ];
  const l = luminance(blended);
  return contrast(l, luminance([0x1a, 0x1a, 0x1a])) >= contrast(l, luminance([0xf5, 0xf5, 0xf5])) ? INK_DARK : INK_LIGHT;
}

/** The nearest legacy name by RGB distance — the fallback if the database ever refuses a custom value. */
export function nearestNamedColor(raw: string): NamedHighlightColor {
  const p = parseHighlightColor(raw);
  if (p.kind === "named") return p.name;
  const [r, g, b] = rgb(p.hex);
  let best: NamedHighlightColor = "yellow";
  let bestD = Infinity;
  for (const name of HIGHLIGHT_COLORS) {
    const [nr, ng, nb] = rgb(NAMED_HEX[name]);
    const d = (r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

export interface HighlightPresentation {
  /** Class for the <mark>/chip. */
  className: string;
  /** Inline custom properties for custom colours (undefined for legacy names). Every value is built
   * from parsed integers/validated hex — never from the raw string. */
  style?: CSSProperties;
}

export function highlightPresentation(raw: string | null | undefined, base = "verse-highlight"): HighlightPresentation {
  const p = parseHighlightColor(raw);
  if (p.kind === "named") return { className: `${base}-${p.name}` };
  const [r, g, b] = rgb(p.hex);
  const style = {
    "--hl-hex": p.hex,
    "--hl-pct": `${p.opacity}%`,
    "--hl-bg": `rgba(${r}, ${g}, ${b}, ${(p.opacity / 100).toFixed(2)})`,
    "--hl-ink-light": inkOver(p.hex, p.opacity, SURFACE_LIGHT),
    "--hl-ink-dark": inkOver(p.hex, p.opacity, SURFACE_DARK),
  } as CSSProperties;
  return { className: `${base}-custom`, style };
}

/* --- The Colors grid ------------------------------------------------------------------------- */

export const GRID_COLS = 12;

export const HUE_NAMES = ["Red", "Orange", "Yellow", "Lime", "Green", "Spring green", "Cyan", "Azure", "Blue", "Violet", "Magenta", "Rose"];
const LIGHTNESS_ROWS = [20, 29, 38, 47, 56, 65, 74, 83];

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

export interface GridSwatch {
  hex: string;
  label: string;
}

/** 9 rows x 12 columns, row-major: a grayscale row white -> black, then eight rows of the twelve
 * hues from dark (top) to light (bottom), like the iOS Colors grid. */
export const COLOR_GRID: GridSwatch[] = (() => {
  const out: GridSwatch[] = [];
  for (let i = 0; i < GRID_COLS; i++) {
    const v = Math.round(255 - (255 * i) / (GRID_COLS - 1));
    const h = v.toString(16).padStart(2, "0");
    out.push({ hex: `#${h}${h}${h}`, label: i === 0 ? "White" : i === GRID_COLS - 1 ? "Black" : `Gray, step ${i + 1} of ${GRID_COLS}` });
  }
  LIGHTNESS_ROWS.forEach((l, row) => {
    HUE_NAMES.forEach((name, col) => {
      out.push({ hex: hslToHex(col * 30, 85, l), label: `${name}, shade ${row + 1} of ${LIGHTNESS_ROWS.length}` });
    });
  });
  return out;
})();

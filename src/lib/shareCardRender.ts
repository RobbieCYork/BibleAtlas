import type { ShareBackground } from "../data/shareBackgrounds";

/**
 * Share-card rendering: the scrim geometry (shared by the live preview and the exported PNG) and the
 * canvas composition that produces the final image.
 *
 * Why the export is composited by hand instead of handing the whole card to html2canvas:
 *
 *  1. Resolution. The preview is ~300–340 CSS px wide. html2canvas at `scale: 2` would yield a
 *     ~680px image — visibly soft the moment Instagram or iMessage re-encodes it. Compositing lets
 *     the photograph go into the export at its native 1080×1350 regardless of how big the preview is
 *     on screen, and the text layer is rasterised at whatever scale hits 1080 exactly.
 *  2. Fidelity. html2canvas re-implements CSS painting in JavaScript, and the parts it re-implements
 *     least reliably are exactly the parts this card is built from: multi-stop rgba gradients,
 *     `object-fit: cover` on images, and stacked background layers. Those are drawn natively here —
 *     `drawImage` and `createLinearGradient` are the browser's own painters, so they cannot drift.
 *     html2canvas is left with the one job it is genuinely good at: rasterising styled text.
 *
 * The scrim is therefore defined ONCE, as data, in `scrimLayers()`. `scrimCss()` turns it into the
 * `background-image` the preview paints; `paintScrim()` turns the same numbers into canvas
 * gradients. Preview and export cannot diverge because there is only one set of stops.
 */

export type ShareFormat = "portrait" | "square" | "story";

export interface ShareFormatSpec {
  id: ShareFormat;
  label: string;
  hint: string;
  width: number;
  height: number;
}

export const SHARE_FORMATS: ShareFormatSpec[] = [
  { id: "portrait", label: "4:5", hint: "Post", width: 1080, height: 1350 },
  { id: "square", label: "1:1", hint: "Square", width: 1080, height: 1080 },
  { id: "story", label: "9:16", hint: "Story", width: 1080, height: 1920 },
];

/**
 * Where the text block actually sits, as fractions of the card height (0 = top edge, 1 = bottom).
 * Measured from the live DOM, because it depends on how long the verse is — see ShareCardModal.
 */
export interface TextRegion {
  top: number;
  bottom: number;
}

/** Used before the first measurement lands, and by any caller that has nothing to measure. */
export const DEFAULT_REGION: TextRegion = { top: 0.55, bottom: 0.85 };

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

interface Stop {
  /** 0 = top of the card, 1 = bottom. */
  at: number;
  /** Alpha of the scrim colour at this position. */
  alpha: number;
}

/** The scrim's base colour: near-black under light text, a warm off-white under dark text. */
function scrimRgb(textColor: ShareBackground["textColor"]): [number, number, number] {
  return textColor === "light" ? [8, 10, 14] : [255, 251, 244];
}

/**
 * Where the scrim sits and how hard it bites, as a list of top-to-bottom gradient layers.
 *
 * The rule the numbers encode: a scrim is a *local* protection for the text block, not a wash over
 * the picture. Every layer starts at alpha 0 somewhere, so a good third to half of the photograph is
 * left completely untouched — that is what keeps the card looking like a photograph with words on it
 * rather than a photograph behind a grey sheet.
 *
 * Light-on-dark and dark-on-light are not symmetric. White text survives on a mid-tone; near-black
 * text does not, because a busy photo's bright speckle sits right next to it in luminance. So the
 * light scrim runs hotter (0.90 vs 0.80 at its peak) and starts ramping earlier.
 */
function scrimLayers(background: ShareBackground, region: TextRegion): Stop[][] {
  const light = background.textColor === "light";
  const peak = light ? 0.8 : 0.9;
  const mid = light ? 0.4 : 0.5;
  const top = clamp(region.top, 0, 1);
  const bottom = clamp(region.bottom, top, 1);
  const layers: Stop[][] = [];

  if (background.safeArea === "bottom") {
    // Ramp in above the first line and reach full strength by the foot. `start` tracks the measured
    // text so a six-word verse gets a shallow scrim over the bottom third while a long passage gets
    // one that begins where the passage begins — the alternative (a fixed ramp) either veils half the
    // picture for short text or leaves the top lines of long text unprotected.
    const start = clamp(top - 0.16, 0, 0.82);
    layers.push([
      { at: 0, alpha: 0 },
      { at: start, alpha: 0 },
      // An explicit stop at the text's own first line: the ramp must already be doing real work by
      // the time it reaches a word, not still fading in underneath it.
      { at: clamp(top, start, 1), alpha: mid * 0.7 },
      { at: clamp(top + (1 - top) * 0.5, top, 1), alpha: Math.min(peak, mid * 1.4) },
      { at: 1, alpha: peak },
    ]);
  } else if (background.safeArea === "top") {
    const end = clamp(bottom + 0.16, 0.18, 1);
    layers.push([
      { at: 0, alpha: peak },
      { at: clamp(bottom * 0.5, 0, end), alpha: Math.min(peak, mid * 1.4) },
      { at: clamp(bottom, 0, end), alpha: mid * 0.7 },
      { at: end, alpha: 0 },
      { at: 1, alpha: 0 },
    ]);
  } else {
    // Centre: a band that hugs the text and feathers out at both ends, leaving the head and foot of
    // the picture open.
    const a = clamp(top - 0.16, 0.02, 0.9);
    const b = clamp(bottom + 0.16, a + 0.04, 0.98);
    layers.push([
      { at: 0, alpha: 0.04 },
      { at: a, alpha: 0.06 },
      { at: clamp(top + 0.03, a, b), alpha: peak * 0.85 },
      { at: clamp(bottom - 0.03, a, b), alpha: peak * 0.85 },
      { at: b, alpha: 0.06 },
      { at: 1, alpha: 0.04 },
    ]);
  }

  // A short foot scrim so the wordmark stays legible when the text block (and its scrim) live
  // somewhere other than the bottom of the card.
  if (background.safeArea !== "bottom") {
    layers.push([
      { at: 0.78, alpha: 0 },
      { at: 1, alpha: light ? 0.52 : 0.62 },
    ]);
  }

  // Gradient stops must not run backwards; clamping above can collide two of them, so sort defensively.
  return layers.map((stops) => stops.slice().sort((x, y) => x.at - y.at));
}

function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

/** The scrim as a CSS `background-image` value (one `linear-gradient()` per layer). */
export function scrimCss(background: ShareBackground, region: TextRegion = DEFAULT_REGION): string {
  const rgb = scrimRgb(background.textColor);
  return scrimLayers(background, region)
    .map((stops) => `linear-gradient(to bottom, ${stops.map((s) => `${rgba(rgb, s.alpha)} ${(s.at * 100).toFixed(1)}%`).join(", ")})`)
    .join(", ");
}

/** The same scrim, painted onto a canvas context covering (0,0)–(w,h). */
function paintScrim(ctx: CanvasRenderingContext2D, background: ShareBackground, region: TextRegion, w: number, h: number) {
  const rgb = scrimRgb(background.textColor);
  for (const stops of scrimLayers(background, region)) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    for (const s of stops) grad.addColorStop(Math.min(1, Math.max(0, s.at)), rgba(rgb, s.alpha));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Ink colours. Kept here so the preview CSS and any canvas fallback agree. */
export const INK = {
  light: { text: "#ffffff", shadow: "rgba(0, 0, 0, 0.55)" },
  dark: { text: "#1b1712", shadow: "rgba(255, 255, 255, 0.7)" },
} as const;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Loads an image and resolves only once it is decoded, so `drawImage` never lands on an empty bitmap. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(src);
  if (hit) return hit;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // Same-origin (/share-backgrounds/*), so the canvas stays untainted and toBlob() works. The
    // attribute is set anyway: if the assets ever move to a CDN, this is the difference between a
    // working export and a SecurityError.
    img.crossOrigin = "anonymous";
    // NB: no `img.decode()` here. It looks like the tidier "wait until it is really ready", but on a
    // detached Image (one never inserted into the document) Chrome can leave that promise pending
    // forever — which stalled the export with the button stuck on "Preparing…". `onload` already
    // guarantees the bitmap is decodable by `drawImage`.
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Share background failed to load: ${src}`));
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

/** `object-fit: cover` in numbers: the source rect of `img` that fills a `w`×`h` box. */
function coverRect(img: HTMLImageElement, w: number, h: number) {
  const iw = img.naturalWidth || w;
  const ih = img.naturalHeight || h;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
}

/**
 * Composites the finished card: photograph (native `drawImage`, full resolution) → scrim (native
 * gradients) → the text layer html2canvas rasterised onto transparency.
 */
export async function composeShareCard(opts: {
  background: ShareBackground;
  format: ShareFormatSpec;
  /** Where the text sits, so the exported scrim is the same one the preview showed. */
  region: TextRegion;
  /** The `.share-card-ink` element — text and wordmark only, transparent everywhere else. */
  inkEl: HTMLElement;
  html2canvas: typeof import("html2canvas").default;
}): Promise<Blob> {
  const { background, format, region, inkEl, html2canvas } = opts;
  const { width, height } = format;

  // A missing photograph must not cost the reader their card: fall back to a flat ground in the
  // scrim's own colour family, which the scrim and ink are already legible against.
  const photo = await loadImage(background.file).catch(() => null);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.imageSmoothingQuality = "high";
  if (photo) {
    const rect = coverRect(photo, width, height);
    ctx.drawImage(photo, rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.fillStyle = background.textColor === "light" ? "#2b2f38" : "#e9e2d6";
    ctx.fillRect(0, 0, width, height);
  }
  paintScrim(ctx, background, region, width, height);

  // Rasterise the text at exactly the scale that fills the export width, so glyph edges are as sharp
  // as the device can draw them rather than being upscaled from the preview's size.
  const inkWidth = inkEl.getBoundingClientRect().width || 1;
  const ink = await html2canvas(inkEl, {
    backgroundColor: null,
    scale: width / inkWidth,
    logging: false,
    useCORS: true,
  });
  ctx.drawImage(ink, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas PNG export failed"))), "image/png")
  );
}

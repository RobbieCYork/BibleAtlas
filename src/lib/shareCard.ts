import type { Location, LocationCategory, Person, PointOfInterest } from "../data/types";

/**
 * Client-side share-card image generation — an offscreen <canvas> rendering a flat, accent-gradient
 * card (1080x1350 portrait, the messaging-app sweet spot) with the place/person name or verse
 * reference, a short excerpt, and the app wordmark. No live map screenshot on purpose: the WebGL map
 * canvas isn't reliably capturable without preserveDrawingBuffer, so the card uses the app's pin
 * glyph + category color instead.
 *
 * Colors are the app's LIGHT-theme palette, hardcoded — a shared image should look identical no
 * matter which theme the sender happened to be in (see src/index.css / App.css for the live values).
 */

const CARD_W = 1080;
const CARD_H = 1350;

const ACCENT = "#7c3aed"; // --accent (light)
const ACCENT_DEEP = "#5b21b6"; // darker stop for the gradient
const WORDMARK = "Biblical Atlas";
const SITE_URL = "bible-atlas-alpha.vercel.app";

/** Same stack as --sans in index.css — canvas can't load webfonts reliably, so system stack it is. */
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Mirrors the --pin-* variables in App.css (light theme): city keeps the accent purple, the rest
 * group into region/water/terrain families, POIs get their own amber. */
const CATEGORY_GLYPH_COLORS: Record<LocationCategory, string> = {
  city: ACCENT,
  region: "#0d9488",
  province: "#0d9488",
  nation: "#0d9488",
  sea: "#0284c7",
  river: "#0284c7",
  mountain: "#8d6e63",
  island: "#8d6e63",
};
const POI_GLYPH_COLOR = "#d97706";

/** Same labels the LocationPanel badge shows. */
const CATEGORY_LABELS: Record<LocationCategory, string> = {
  city: "City",
  region: "Region",
  province: "Roman Province",
  nation: "Nation",
  sea: "Sea / Lake",
  river: "River",
  mountain: "Mountain",
  island: "Island",
};

/** The map's teardrop pin (MapView createFlagElement), in its native 28x36 box. */
const PIN_PATH = "M14 34C14 34 4 20 4 12C4 6.5 8.5 2 14 2C19.5 2 24 6.5 24 12C24 20 14 34 14 34Z";

type Glyph = "pin" | "dot" | "person" | "quote";

interface CardSpec {
  /** Small uppercase label above the title, e.g. "City", "Apostle", the translation-less verse tag. */
  badge: string;
  /** The big centered headline — place/person name or verse reference. */
  title: string;
  /** The excerpt/verse body. Already trimmed; wrapping + overflow-ellipsis happen here. */
  body: string;
  glyph: Glyph;
  glyphColor: string;
  /** Wrap the body in curly quotes (verse cards). */
  bodyQuoted?: boolean;
}

/** Collapses whitespace and ellipsizes at a word boundary (~`max` chars). */
export function excerpt(text: string, max = 140): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.]*$/, "") + "…";
}

/** Greedy word-wrap against the ctx's current font. A word too long for the line gets its own line. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas PNG export failed"))), "image/png");
  });
}

function drawGlyph(ctx: CanvasRenderingContext2D, glyph: Glyph, color: string, cx: number, cy: number) {
  ctx.save();
  ctx.fillStyle = color;
  if (glyph === "pin") {
    // Native box is 28x36, tip at (14,34) — scale to ~122px tall, centered in the chip.
    const scale = 3.4;
    ctx.translate(cx - 14 * scale, cy - 18 * scale);
    ctx.scale(scale, scale);
    ctx.fill(new Path2D(PIN_PATH));
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(14, 12, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === "dot") {
    // POI round-dot marker, scaled up: solid dot with a soft outer ring.
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 12;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.stroke();
  } else if (glyph === "person") {
    // Simple head + shoulders bust.
    ctx.beginPath();
    ctx.arc(cx, cy - 28, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 62, 60, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    // Big serif open-quote for verse cards.
    ctx.font = `700 230px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("“", cx, cy + 72);
  }
  ctx.restore();
}

async function drawCard(spec: CardSpec): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Accent gradient background with a couple of soft translucent circles for depth.
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, ACCENT);
  bg.addColorStop(1, ACCENT_DEEP);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.06;
  ctx.beginPath();
  ctx.arc(-60, 180, 400, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CARD_W + 90, CARD_H - 240, 460, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.05;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(CARD_W - 150, 320, 260, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // White glyph chip.
  const chipCx = CARD_W / 2;
  const chipCy = 300;
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(chipCx, chipCy, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawGlyph(ctx, spec.glyph, spec.glyphColor, chipCx, chipCy);

  // --- Measure the text block first so it can be vertically centered between chip and footer. ---
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const maxTextWidth = 880;

  // Title: shrink until it fits in 3 lines (4 for the smallest size).
  let titleSize = 96;
  let titleLines: string[] = [];
  for (const size of [96, 84, 72, 62, 54]) {
    titleSize = size;
    ctx.font = `700 ${size}px ${FONT_STACK}`;
    titleLines = wrapLines(ctx, spec.title, maxTextWidth);
    if (titleLines.length <= 3) break;
  }
  titleLines = titleLines.slice(0, 4);
  const titleLineH = Math.round(titleSize * 1.14);

  const bodyText = spec.bodyQuoted && spec.body ? `“${spec.body}”` : spec.body;
  const bodySize = 40;
  const bodyLineH = 58;
  const maxBodyLines = 9;
  ctx.font = `400 ${bodySize}px ${FONT_STACK}`;
  let bodyLines = wrapLines(ctx, bodyText, maxTextWidth - 40);
  if (bodyLines.length > maxBodyLines) {
    bodyLines = bodyLines.slice(0, maxBodyLines);
    bodyLines[maxBodyLines - 1] = bodyLines[maxBodyLines - 1].replace(/[,;:.]*$/, "") + "…";
  }

  const badgeH = spec.badge ? 34 + 34 : 0; // badge line + gap below it
  const bodyH = bodyLines.length > 0 ? 48 + bodyLines.length * bodyLineH : 0; // gap + lines
  const blockH = badgeH + titleLines.length * titleLineH + bodyH;
  const contentTop = 480;
  const contentBottom = 1170;
  let y = contentTop + Math.max(0, (contentBottom - contentTop - blockH) / 2);

  // Badge.
  if (spec.badge) {
    ctx.save();
    const spacedCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if ("letterSpacing" in ctx) spacedCtx.letterSpacing = "5px";
    ctx.font = `600 30px ${FONT_STACK}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.fillText(spec.badge.toUpperCase(), CARD_W / 2, y);
    ctx.restore();
    y += badgeH;
  }

  // Title.
  ctx.font = `700 ${titleSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#ffffff";
  for (const line of titleLines) {
    ctx.fillText(line, CARD_W / 2, y);
    y += titleLineH;
  }

  // Body.
  if (bodyLines.length > 0) {
    y += 48;
    ctx.font = `${spec.bodyQuoted ? "italic " : ""}400 ${bodySize}px ${FONT_STACK}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    for (const line of bodyLines) {
      ctx.fillText(line, CARD_W / 2, y);
      y += bodyLineH;
    }
  }

  // Footer: divider, wordmark, URL.
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillRect(CARD_W / 2 - 40, 1208, 80, 3);
  ctx.font = `600 34px ${FONT_STACK}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(WORDMARK, CARD_W / 2, 1238);
  ctx.font = `400 27px ${FONT_STACK}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.fillText(SITE_URL, CARD_W / 2, 1288);

  return canvasToBlob(canvas);
}

/** Card for a map place — full Location or lighter-weight PointOfInterest. */
export function generatePlaceCard(entry: Location | PointOfInterest): Promise<Blob> {
  if ("category" in entry) {
    const hook =
      entry.history.notableFacts[0] ?? entry.history.founded ?? entry.history.industry ?? entry.modernName ?? "";
    return drawCard({
      badge: CATEGORY_LABELS[entry.category],
      title: entry.name,
      body: excerpt(hook),
      glyph: "pin",
      glyphColor: CATEGORY_GLYPH_COLORS[entry.category],
    });
  }
  return drawCard({
    badge: entry.tag,
    title: entry.name,
    body: excerpt(entry.description),
    glyph: "dot",
    glyphColor: POI_GLYPH_COLOR,
  });
}

/** Card for a biblical person — role badge + the summary hook. */
export function generatePersonCard(person: Person): Promise<Blob> {
  return drawCard({
    badge: person.role,
    title: person.name,
    body: excerpt(person.summary, 180),
    glyph: "person",
    glyphColor: ACCENT,
  });
}

/** Card for a selected verse (or verse range) — big reference, quoted text. */
export function generateVerseCard(reference: string, text: string): Promise<Blob> {
  return drawCard({
    badge: "Scripture",
    title: reference,
    body: text.trim().replace(/\s+/g, " "),
    glyph: "quote",
    glyphColor: ACCENT,
    bodyQuoted: true,
  });
}

/** Download filename for a card, e.g. "biblical-atlas-john-3-16.png". */
export function shareFilename(title: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "card";
  return `biblical-atlas-${slug}.png`;
}

/**
 * Hands a finished card to the user: Web Share sheet where file-sharing is supported (mobile),
 * otherwise a plain PNG download. "cancelled" = the user dismissed the native share sheet — not an
 * error, and no feedback needed. "NotAllowedError" happens when the async canvas render eats up the
 * user-activation window before share() fires (slow devices, mostly iOS Safari) — that's not a real
 * failure either, since the image generated fine, so fall through to the anchor-download path instead
 * of surfacing an error.
 */
export async function deliverCard(blob: Blob, filename: string): Promise<"shared" | "saved" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) throw err;
      // NotAllowedError: user-activation expired before share() resolved — fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "saved";
}

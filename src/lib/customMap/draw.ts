/* Canvas drawing: pins, journey line and names over a base map, and the finished slide and handout
 * pages. The editor, the presentation view and every export draw through here. */
import { FOOTER_H, MAP_H, MAP_W, SLIDE_H, SLIDE_W, TITLE_H, project, type Point } from "./geometry";
import { placeLabels, type Box, type LabelRequest } from "./labels";
import { PLACES, isDoubtful, type CmPlace, type PlaceKey } from "./places";
import type { MapViewState, Slide } from "./project";

/* The map and its overlay are drawn in fixed colours: a saved PDF or picture must look the same
 * whatever theme or skin the app is in. */
const INK = "#2b1f10";
const MUTED = "#5e4a2c";
const PAPER = "#f6eeda";
const LABEL_BG = "rgba(250,245,232,0.95)";
const EDGE = "#8a6f45";
const PIN = "#8a2f1d";
const HALO = "#fbf3df";

const SERIF = '"EB Garamond", Georgia, serif';
const DISPLAY = '"Cormorant Garamond", "EB Garamond", Georgia, serif';
const SANS = "Archivo, system-ui, sans-serif";

/** Required on every map that leaves the app: see the licence notes in render.ts. */
export const ATTRIBUTION =
  "Map: OpenFreeMap © OpenMapTiles (openmaptiles.org) · Data from OpenStreetMap, openstreetmap.org/copyright (ODbL) · Natural Earth";
export const ROUTE_NOTE = "The dashed line joins places in list order. Straight lines only, not the actual road or sea route.";

export async function loadFonts(): Promise<void> {
  const wanted = [
    `600 20px ${SERIF}`,
    `italic 500 20px ${SERIF}`,
    `600 40px ${DISPLAY}`,
    `500 14px ${SANS}`,
    `700 14px ${SANS}`,
  ];
  // A font that will not load falls back to a system serif; the export still works.
  await Promise.all(wanted.map((f) => document.fonts.load(f, "AaĀȘ’·").catch(() => [])));
}

export interface SlidePin {
  place: CmPlace;
  /** Positions in the list, from 1. More than one on a journey that returns. */
  stops: number[];
  /** Quiz and answer-key number. */
  number: string;
}

/** One pin per place, in order of first appearance. */
export function slidePins(slide: Slide, keys: PlaceKey[] = slide.places): SlidePin[] {
  const pins = new Map<PlaceKey, SlidePin>();
  slide.places.forEach((key, i) => {
    const place = PLACES.get(key);
    if (!place || !keys.includes(key)) return;
    const pin = pins.get(key);
    if (pin) pin.stops.push(i + 1);
    else pins.set(key, { place, stops: [i + 1], number: "" });
  });
  return [...pins.values()].map((p, i) => ({ ...p, number: slide.journey ? p.stops.join(", ") : String(i + 1) }));
}

/** The name printed on a map. Two Antiochs on one slide are told apart by the app's own other name
 * for the Syrian one. */
export function mapName(slide: Slide, place: CmPlace): string {
  return place.key === "loc:antioch-syria" && slide.places.includes("loc:antioch-pisidia") ? "Syrian Antioch" : place.name;
}

/** How many pins sit so close to another, at slide size, that a reader cannot tell them apart. */
export function stackedPins(slide: Slide, view: MapViewState): number {
  const points = [...new Set(placesInFrame(slide, view))].map((k) => project(view, MAP_W, MAP_H, PLACES.get(k)!.coordinates));
  return points.filter((a, i) => points.some((b, n) => n !== i && Math.hypot(a.x - b.x, a.y - b.y) < 12)).length;
}

/** The places that fall inside a map of this size and view. */
export function placesInFrame(slide: Slide, view: MapViewState, width = MAP_W, height = MAP_H): PlaceKey[] {
  return slide.places.filter((key) => {
    const place = PLACES.get(key);
    if (!place) return false;
    const p = project(view, width, height, place.coordinates);
    return p.x >= 2 && p.x <= width - 2 && p.y >= 2 && p.y <= height - 2;
  });
}

export type OverlayMode = "names" | "quiz" | "key";

export interface OverlayOptions {
  width: number;
  height: number;
  /** Size multiplier for pins and type: 1 on an exported slide. */
  ui: number;
  mode: OverlayMode;
}

function roundRect(ctx: CanvasRenderingContext2D, b: Box, r: number) {
  const radius = Math.min(r, b.h / 2, b.w / 2);
  ctx.beginPath();
  ctx.moveTo(b.x + radius, b.y);
  ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, radius);
  ctx.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, radius);
  ctx.arcTo(b.x, b.y + b.h, b.x, b.y, radius);
  ctx.arcTo(b.x, b.y, b.x + b.w, b.y, radius);
  ctx.closePath();
}

function drawRoute(ctx: CanvasRenderingContext2D, points: Point[], ui: number) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const path = () => {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  };
  path();
  ctx.strokeStyle = "rgba(251,243,223,0.85)";
  ctx.lineWidth = 7 * ui;
  ctx.stroke();
  path();
  ctx.setLineDash([9 * ui, 7 * ui]);
  ctx.strokeStyle = PIN;
  ctx.lineWidth = 3 * ui;
  ctx.stroke();
  ctx.setLineDash([]);
  // An arrowhead on each leg long enough to carry one: the direction of travel.
  ctx.fillStyle = PIN;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 60 * ui) continue;
    ctx.save();
    // A little past half way, so the return leg's arrow does not land on the outward one.
    ctx.translate(a.x + (b.x - a.x) * 0.57, a.y + (b.y - a.y) * 0.57);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    ctx.beginPath();
    ctx.moveTo(9 * ui, 0);
    ctx.lineTo(-6 * ui, -7 * ui);
    ctx.lineTo(-6 * ui, 7 * ui);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

type PinShape = "tear" | "ring" | "dot";

function pinGeometry(p: Point, shape: PinShape, ui: number): { box: Box; anchor: Point } {
  if (shape === "tear")
    return { box: { x: p.x - 13 * ui, y: p.y - 36 * ui, w: 26 * ui, h: 37 * ui }, anchor: { x: p.x, y: p.y - 23 * ui } };
  const r = (shape === "ring" ? 10 : 7) * ui;
  return { box: { x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r }, anchor: { x: p.x, y: p.y } };
}

function drawPin(ctx: CanvasRenderingContext2D, p: Point, shape: PinShape, doubtful: boolean, text: string, ui: number) {
  ctx.save();
  if (shape === "tear") {
    const r = 12 * ui;
    const cy = p.y - 23 * ui;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.bezierCurveTo(p.x - 3 * ui, p.y - 7 * ui, p.x - r, cy + 9 * ui, p.x - r, cy);
    ctx.arc(p.x, cy, r, Math.PI, 0);
    ctx.bezierCurveTo(p.x + r, cy + 9 * ui, p.x + 3 * ui, p.y - 7 * ui, p.x, p.y);
    ctx.closePath();
    ctx.shadowColor = "rgba(40,25,10,0.35)";
    ctx.shadowBlur = 5 * ui;
    ctx.shadowOffsetY = 2 * ui;
    // A doubtful location is an outlined, dashed pin; a settled one is solid.
    ctx.fillStyle = doubtful ? HALO : PIN;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = (doubtful ? 2.4 : 1.8) * ui;
    ctx.strokeStyle = doubtful ? PIN : HALO;
    if (doubtful) ctx.setLineDash([4 * ui, 2.5 * ui]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (text) {
      ctx.fillStyle = doubtful ? PIN : "#fff";
      const size = (text.length > 2 ? 10 : 14) * ui;
      ctx.font = `700 ${size}px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text.length > 4 ? `${text.split(",")[0]}+` : text, p.x, cy + 0.5 * ui);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, cy, 4.2 * ui, 0, Math.PI * 2);
      ctx.fillStyle = doubtful ? PIN : HALO;
      ctx.fill();
    }
  } else {
    const r = (shape === "ring" ? 9 : 6) * ui;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = shape === "ring" || doubtful ? "rgba(251,243,223,0.9)" : PIN;
    ctx.fill();
    ctx.lineWidth = (shape === "ring" || doubtful ? 3 : 2) * ui;
    ctx.strokeStyle = shape === "ring" || doubtful ? PIN : HALO;
    if (doubtful) ctx.setLineDash([3.5 * ui, 2 * ui]);
    ctx.stroke();
  }
  ctx.restore();
}

export interface OverlayResult {
  /** Names that had nowhere free to go. */
  crowded: number;
}

/** Draws pins, route and names for the slide onto a map already showing `view`. */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  view: MapViewState,
  { width, height, ui, mode }: OverlayOptions
): OverlayResult {
  const shown = slidePins(slide, placesInFrame(slide, view, width, height));
  const at = (place: CmPlace) => project(view, width, height, place.coordinates);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  if (slide.journey)
    drawRoute(ctx, slide.places.flatMap((k) => (PLACES.has(k) ? [at(PLACES.get(k)!)] : [])), ui);

  const items = shown.map((pin) => {
    const { place } = pin;
    const area = place.certainty?.level === "area";
    const doubtful = isDoubtful(place.certainty);
    const shape: PinShape = area ? "ring" : mode !== "names" ? "dot" : "tear";
    const point = at(place);
    const geometry = pinGeometry(point, shape, ui);
    const mark = doubtful ? " *" : "";
    // The number column is the key to the quiz; on a journey it also repeats in the name.
    const badge = mode === "names" ? (slide.journey ? pin.number : "") : mode === "quiz" ? `${pin.number}${mark}` : pin.number;
    const name = mode === "quiz" ? "" : `${mapName(slide, place)}${mark}`;
    const size = (mode === "quiz" ? 19 : 21) * ui;
    const nameFont = area ? `italic 500 ${size}px ${SERIF}` : `600 ${size}px ${SERIF}`;
    const badgeFont = `700 ${(mode === "quiz" ? 17 : 13) * ui}px ${SANS}`;
    ctx.font = nameFont;
    const nameW = name ? ctx.measureText(name).width : 0;
    ctx.font = badgeFont;
    const badgeH = (mode === "quiz" ? 28 : 21) * ui;
    const badgeW = badge ? Math.max(badgeH, ctx.measureText(badge).width + 12 * ui) : 0;
    const pad = 8 * ui;
    const w = mode === "quiz" ? badgeW : nameW + pad * 2 + (badge ? badgeW + 6 * ui : 0);
    const h = mode === "quiz" ? badgeH : 29 * ui;
    return { shape, doubtful, point, geometry, name, nameFont, badge, badgeFont, badgeW, badgeH, w, h };
  });

  const requests: LabelRequest[] = items.map((i) => ({ pin: i.geometry.box, anchor: i.geometry.anchor, w: i.w, h: i.h }));
  const placed = placeLabels(requests, width, height, ui);

  // Leader lines first, so no line is ever drawn across a name or a pin.
  placed.forEach((p, i) => {
    if (!p.leader) return;
    const from = items[i].geometry.anchor;
    for (const [colour, line] of [[HALO, 4], [MUTED, 1.6]] as const) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(p.leader.x, p.leader.y);
      ctx.strokeStyle = colour;
      ctx.lineWidth = line * ui;
      ctx.stroke();
    }
  });
  // Southern pins over northern ones, as on any printed atlas.
  const pinText = (i: number) => (mode === "names" && slide.journey ? items[i].badge : "");
  items
    .map((_, i) => i)
    .sort((a, b) => items[a].point.y - items[b].point.y)
    .forEach((i) => drawPin(ctx, items[i].point, items[i].shape, items[i].doubtful, pinText(i), ui));

  placed.forEach((p, i) => {
    const item = items[i];
    const box = p.box;
    ctx.save();
    ctx.shadowColor = "rgba(40,25,10,0.28)";
    ctx.shadowBlur = 4 * ui;
    ctx.shadowOffsetY = 1 * ui;
    roundRect(ctx, box, mode === "quiz" ? box.h / 2 : 6 * ui);
    ctx.fillStyle = LABEL_BG;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = (mode === "quiz" ? 1.8 : 1) * ui;
    ctx.stroke();
    const cy = box.y + box.h / 2;
    ctx.textBaseline = "middle";
    let x = box.x + 8 * ui;
    if (mode === "quiz") {
      ctx.fillStyle = INK;
      ctx.font = item.badgeFont;
      ctx.textAlign = "center";
      ctx.fillText(item.badge, box.x + box.w / 2, cy + 0.5 * ui);
      return;
    }
    if (item.badge) {
      const b = { x: box.x + 4 * ui, y: cy - item.badgeH / 2, w: item.badgeW, h: item.badgeH };
      roundRect(ctx, b, b.h / 2);
      ctx.fillStyle = PIN;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = item.badgeFont;
      ctx.textAlign = "center";
      ctx.fillText(item.badge, b.x + b.w / 2, cy + 0.5 * ui);
      x = b.x + b.w + 6 * ui;
    }
    ctx.fillStyle = INK;
    ctx.font = item.nameFont;
    ctx.textAlign = "left";
    ctx.fillText(item.name, x, cy + 1 * ui);
  });
  ctx.restore();
  return { crowded: placed.filter((p) => p.crowded).length };
}

/** One line, shrunk until it fits and cut with an ellipsis only if still too long. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  size: number,
  min: number,
  font: (px: number) => string
) {
  let px = size;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > max) ctx.font = font(--px);
  let out = text;
  if (ctx.measureText(out).width > max) {
    while (out.length > 1 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
    out = `${out.trimEnd()}…`;
  }
  ctx.fillText(out, x, y);
}

/** The footnotes a map carries: what the marks mean, in words. */
export function mapNotes(slide: Slide, pins: SlidePin[], withNames: boolean): string[] {
  const notes: string[] = [];
  // First, so a long list of names can never push it off the line.
  if (slide.journey && slide.places.length > 1) notes.push(ROUTE_NOTE);
  const doubtful = pins.filter((p) => isDoubtful(p.place.certainty));
  if (doubtful.length) {
    const names = doubtful.map((p) => mapName(slide, p.place)).join(", ");
    const list = withNames && names.length <= 90 ? `: ${names}` : "";
    notes.push(`* Location disputed, traditional or approximate${list}`);
  }
  if (pins.some((p) => p.place.certainty?.level === "area"))
    notes.push(withNames ? "Italic names are regions or waters, not exact spots" : "Open circles are regions or waters");
  return notes;
}

function newCanvas(width: number, height: number, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This device could not make the picture.");
  ctx.scale(scale, scale);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
}

function footer(ctx: CanvasRenderingContext2D, notes: string[], x: number, y: number, width: number) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  if (notes.length) fitText(ctx, notes.join("   ·   "), x, y, width, 15, 10, (px) => `500 ${px}px ${SANS}`);
  ctx.fillStyle = MUTED;
  fitText(ctx, ATTRIBUTION, x, y + 24, width - 150, 13, 9, (px) => `500 ${px}px ${SANS}`);
  ctx.textAlign = "right";
  ctx.font = `700 13px ${SANS}`;
  ctx.fillText("capstonebible.com", x + width, y + 24);
  ctx.textAlign = "left";
}

export const slideTitle = (slide: Slide, index: number) => slide.title.trim() || `Map ${index + 1}`;

/** A finished 16:9 slide. `base` is the base map for `view` at MAP_W×MAP_H. */
export function composeSlide(
  base: HTMLCanvasElement,
  slide: Slide,
  view: MapViewState,
  title: string,
  scale: number
): HTMLCanvasElement {
  const { canvas, ctx } = newCanvas(SLIDE_W, SLIDE_H, scale);
  ctx.drawImage(base, 0, TITLE_H, MAP_W, MAP_H);
  ctx.save();
  ctx.translate(0, TITLE_H);
  drawOverlay(ctx, slide, view, { width: MAP_W, height: MAP_H, ui: 1, mode: "names" });
  ctx.restore();
  ctx.fillStyle = EDGE;
  ctx.fillRect(0, TITLE_H - 2, SLIDE_W, 2);
  ctx.fillRect(0, TITLE_H + MAP_H, SLIDE_W, 2);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitText(ctx, title, SLIDE_W / 2, TITLE_H / 2 + 1, SLIDE_W - 64, 44, 24, (px) => `600 ${px}px ${DISPLAY}`);
  const pins = slidePins(slide, placesInFrame(slide, view));
  footer(ctx, mapNotes(slide, pins, true), 24, SLIDE_H - FOOTER_H + 24, SLIDE_W - 48);
  return canvas;
}

/** Handout page: US Letter landscape at 120 reference pixels per inch. */
export const PAGE_W = 1320;
export const PAGE_H = 1020;
const PAGE_M = 40;
const MAP_TOP = 104;
const HANDOUT_MAP_H = 830;
/** Past this many lines one column is too tight to write in. */
const ONE_COLUMN = 21;

export const handoutMapSize = (lines: number) => ({ width: lines > ONE_COLUMN ? 700 : 910, height: HANDOUT_MAP_H });

/** The student page ("quiz") or its answer key. `base` is the base map for `view` at the size
 * handoutMapSize gave. */
export function composeHandout(
  base: HTMLCanvasElement,
  slide: Slide,
  view: MapViewState,
  title: string,
  map: { width: number; height: number },
  mode: "quiz" | "key",
  scale: number
): HTMLCanvasElement {
  const pins = slidePins(slide, placesInFrame(slide, view, map.width, map.height));
  const { canvas, ctx } = newCanvas(PAGE_W, PAGE_H, scale);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  fitText(ctx, title, PAGE_M, 66, 700, 38, 22, (px) => `600 ${px}px ${DISPLAY}`);
  ctx.textAlign = "right";
  ctx.font = `700 17px ${SANS}`;
  if (mode === "key") ctx.fillText("ANSWER KEY", PAGE_W - PAGE_M, 52);
  else ctx.fillText("Name ______________________    Date __________", PAGE_W - PAGE_M, 52);
  ctx.font = `500 15px ${SANS}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(
    mode === "key" ? "Matches the student page" : slide.journey ? "Name each stop on the journey." : "Name each numbered place.",
    PAGE_W - PAGE_M,
    80
  );

  ctx.drawImage(base, PAGE_M, MAP_TOP, map.width, map.height);
  ctx.save();
  ctx.translate(PAGE_M, MAP_TOP);
  drawOverlay(ctx, slide, view, { ...map, ui: 1, mode });
  ctx.restore();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(PAGE_M, MAP_TOP, map.width, map.height);

  const columns = pins.length > ONE_COLUMN ? 2 : 1;
  const listX = PAGE_M + map.width + 24;
  const colW = (PAGE_W - PAGE_M - listX) / columns;
  const rows = Math.max(1, Math.ceil(pins.length / columns));
  const rowH = Math.min(52, map.height / rows);
  pins.forEach((pin, i) => {
    const x = listX + Math.floor(i / rows) * colW;
    const y = MAP_TOP + (i % rows) * rowH + rowH * 0.72;
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = `700 17px ${SANS}`;
    const label = `${pin.number}.`;
    ctx.fillText(label, x, y);
    const textX = x + Math.max(32, ctx.measureText(label).width + 8);
    const right = x + colW - 12;
    if (mode === "quiz") {
      ctx.fillStyle = MUTED;
      ctx.fillRect(textX, y + 4, right - textX, 1.2);
    } else {
      const name = `${mapName(slide, pin.place)}${isDoubtful(pin.place.certainty) ? " *" : ""}`;
      fitText(ctx, name, textX, y, right - textX, 22, 12, (px) => `600 ${px}px ${SERIF}`);
    }
  });

  footer(ctx, mapNotes(slide, pins, mode === "key"), PAGE_M, MAP_TOP + map.height + 34, PAGE_W - PAGE_M * 2);
  return canvas;
}

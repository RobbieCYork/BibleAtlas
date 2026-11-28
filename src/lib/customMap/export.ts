/* Turning a project's slides into pictures and PDF pages. */
import { MAP_H, MAP_W, SLIDE_H, SLIDE_W, fitView } from "./geometry";
import {
  PAGE_H,
  PAGE_W,
  composeHandout,
  composeSlide,
  handoutMapSize,
  loadFonts,
  placesInFrame,
  slidePins,
  slideTitle,
} from "./draw";
import { PLACES } from "./places";
import { buildPdf, type PdfPage } from "./pdf";
import { renderBaseMap } from "./render";
import type { MapViewState, Slide } from "./project";

/** 2560×1440 slides: sharp on a projector and on paper, within a phone's canvas limits. */
const SCALE = 2;

const coordinatesOf = (slide: Slide) => slide.places.flatMap((k) => (PLACES.has(k) ? [PLACES.get(k)!.coordinates] : []));

export const slideView = (slide: Slide): MapViewState => slide.view ?? fitView(coordinatesOf(slide));

export async function renderSlide(slide: Slide, index: number, signal?: AbortSignal, scale = SCALE) {
  await loadFonts();
  const view = slideView(slide);
  const base = await renderBaseMap({ view, width: MAP_W, height: MAP_H, pixelRatio: scale, modern: slide.modern, signal });
  return composeSlide(base, slide, view, slideTitle(slide, index), scale);
}

/** Student page and answer key. They share one base map, with no background names on it, framed to
 * the places the slide shows (all of them, if the teacher has framed none). */
async function renderHandout(slide: Slide, index: number, signal?: AbortSignal) {
  await loadFonts();
  const inFrame = placesInFrame(slide, slideView(slide));
  const asked = inFrame.length ? inFrame : slide.places;
  const size = handoutMapSize(slidePins(slide, asked).length);
  const view = fitView(
    asked.map((k) => PLACES.get(k)!.coordinates),
    size.width,
    size.height
  );
  const base = await renderBaseMap({ view, ...size, pixelRatio: SCALE, modern: false, signal });
  const title = slideTitle(slide, index);
  return (["quiz", "key"] as const).map((mode) => composeHandout(base, slide, view, title, size, mode, SCALE));
}

function toBlob(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg"): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("This device could not save the picture."))), type, 0.92)
  );
}

async function pdfPage(canvas: HTMLCanvasElement, width: number, height: number): Promise<PdfPage> {
  const jpeg = new Uint8Array(await (await toBlob(canvas, "image/jpeg")).arrayBuffer());
  const page = { width, height, jpeg, pixelWidth: canvas.width, pixelHeight: canvas.height };
  // Give the memory back now: iPhones cap the total size of live canvases.
  canvas.width = canvas.height = 0;
  return page;
}

export const fileSlug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "bible-map";

export interface ExportItem {
  slide: Slide;
  /** Position in the project, for the default title and the file name. */
  index: number;
}

export async function makePdf(
  items: ExportItem[],
  options: { slides: boolean; quiz: boolean },
  onProgress: (text: string) => void,
  signal?: AbortSignal
): Promise<File> {
  const total = items.length * ((options.slides ? 1 : 0) + (options.quiz ? 1 : 0));
  let done = 0;
  const step = () => onProgress(`Drawing map ${++done} of ${total}…`);
  const pages: PdfPage[] = [];
  // 16:9 slide pages (13.33 × 7.5 in, PowerPoint's size), then Letter landscape handouts.
  if (options.slides)
    for (const { slide, index } of items) {
      step();
      pages.push(await pdfPage(await renderSlide(slide, index, signal), (SLIDE_W * 3) / 4, (SLIDE_H * 3) / 4));
    }
  if (options.quiz)
    for (const { slide, index } of items) {
      step();
      for (const canvas of await renderHandout(slide, index, signal))
        pages.push(await pdfPage(canvas, (PAGE_W * 3) / 5, (PAGE_H * 3) / 5));
    }
  const title = slideTitle(items[0].slide, items[0].index);
  const suffix = !options.slides ? "-quiz" : "";
  return new File([buildPdf(pages, title)], `${fileSlug(title)}${suffix}.pdf`, { type: "application/pdf" });
}

export async function makePictures(
  items: ExportItem[],
  onProgress: (text: string) => void,
  signal?: AbortSignal
): Promise<File[]> {
  const files: File[] = [];
  for (const { slide, index } of items) {
    onProgress(`Drawing picture ${files.length + 1} of ${items.length}…`);
    const canvas = await renderSlide(slide, index, signal);
    const blob = await toBlob(canvas, "image/png");
    canvas.width = canvas.height = 0;
    const name = `${String(index + 1).padStart(2, "0")}-${fileSlug(slideTitle(slide, index))}.png`;
    files.push(new File([blob], name, { type: "image/png" }));
  }
  return files;
}

/* Web Mercator arithmetic shared by the editor and the exporter, in MapLibre's 512px-tile world. */
import type { MapViewState } from "./project";

/** The slide is 1280×720 "reference pixels": a title band, the map, and a footer. */
export const SLIDE_W = 1280;
export const SLIDE_H = 720;
export const TITLE_H = 76;
export const FOOTER_H = 58;
export const MAP_W = SLIDE_W;
export const MAP_H = SLIDE_H - TITLE_H - FOOTER_H;

const TILE = 512;
const MIN_ZOOM = 1.5;
/** Past this a handful of neighbouring places loses every surrounding landmark. */
const MAX_FIT_ZOOM = 11.5;
/** One place alone: wide enough to show where it is. */
const SINGLE_ZOOM = 8;
const EMPTY_VIEW: MapViewState = { lng: 35.4, lat: 31.9, zoom: 6.4 };

const mercX = (lng: number) => (lng + 180) / 360;
const mercY = (lat: number) => 0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);
const unX = (x: number) => x * 360 - 180;
const unY = (y: number) => (Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 4) * (360 / Math.PI);

export type Point = { x: number; y: number };

/** Where [lng, lat] falls on a width×height map showing `view`. */
export function project(view: MapViewState, width: number, height: number, [lng, lat]: [number, number]): Point {
  const world = TILE * 2 ** view.zoom;
  return {
    x: width / 2 + (mercX(lng) - mercX(view.lng)) * world,
    y: height / 2 + (mercY(lat) - mercY(view.lat)) * world,
  };
}

/** The view that frames the points, leaving room around the edge for their names. */
export function fitView(points: [number, number][], width = MAP_W, height = MAP_H): MapViewState {
  if (points.length === 0) return EMPTY_VIEW;
  const xs = points.map((p) => mercX(p[0]));
  const ys = points.map((p) => mercY(p[1]));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const padX = Math.min(190, width * 0.17);
  // Pins hang above their point, so the top needs more room than the bottom.
  const padTop = Math.min(100, height * 0.18);
  const padBottom = Math.min(70, height * 0.13);
  const usableH = height - padTop - padBottom;
  const spanZoom = Math.min(
    Math.log2((width - 2 * padX) / (Math.max(x1 - x0, 1e-9) * TILE)),
    Math.log2(usableH / (Math.max(y1 - y0, 1e-9) * TILE))
  );
  const single = x1 - x0 < 1e-7 && y1 - y0 < 1e-7;
  const zoom = single ? SINGLE_ZOOM : Math.max(MIN_ZOOM, Math.min(MAX_FIT_ZOOM, spanZoom));
  const world = TILE * 2 ** zoom;
  const cy = (y0 + y1) / 2 - (padTop - padBottom) / 2 / world;
  return { lng: unX((x0 + x1) / 2), lat: unY(cy), zoom };
}

/** The view that shows, in a differently shaped map, at least everything the slide's map shows. */
export function reframe(view: MapViewState, width: number, height: number): MapViewState {
  return { ...view, zoom: view.zoom + Math.log2(Math.min(width / MAP_W, height / MAP_H)) };
}

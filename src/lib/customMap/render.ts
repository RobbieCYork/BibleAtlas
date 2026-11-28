/* The base map for exports, rendered off screen at a fixed size so a slide looks the same whatever
 * device made it.
 *
 * LICENCE (checked 2026-11-27). Everything drawn here comes from the vector basemap:
 *   - OpenFreeMap tiles: commercial use allowed; printed media must credit
 *     "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (openfreemap.org).
 *   - OpenMapTiles design (CC BY 4.0): printed and static maps carry the credit beside the map.
 *   - OpenStreetMap data (ODbL): a printed map must print openstreetmap.org/copyright.
 *   - Natural Earth: public domain.
 * draw.ts ATTRIBUTION prints all of it on every page and picture. The app's Satellite layer (Esri
 * World Imagery) is deliberately NOT available here: Esri requires its permission for static maps
 * in anything sold. Do not add it to an export without that permission in writing. */
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import type { MapViewState } from "./project";

const STYLE_URL = "/map/illuminated.json";
const RENDER_TIMEOUT_MS = 25_000;
/** Roads, borders, buildings and parks are today's world; a Bible map leaves them off by default. */
const MODERN_SOURCE_LAYERS = new Set(["transportation", "transportation_name", "boundary", "building", "park"]);

let styleRequest: Promise<StyleSpecification> | null = null;

function loadStyle(): Promise<StyleSpecification> {
  styleRequest ??= fetch(STYLE_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`style ${r.status}`);
      return r.json() as Promise<StyleSpecification>;
    })
    .catch((err) => {
      styleRequest = null;
      throw err;
    });
  return styleRequest;
}

/** `modern` false: land and water only, so only the teacher's own names are on the map (and a quiz
 * page cannot give an answer away). True: today's roads, borders and place names too. */
export async function mapStyle(modern: boolean): Promise<StyleSpecification> {
  const style = structuredClone(await loadStyle());
  // A style handed over as an object has no base URL for its relative glyph path.
  if (style.glyphs?.startsWith("/")) style.glyphs = `${window.location.origin}${style.glyphs}`;
  // The app's map draws rivers as hairlines until street level. On a slide the Jordan has to be
  // visible from the back of the room.
  for (const layer of style.layers) {
    if (layer.id === "waterway_river" && layer.type === "line")
      layer.paint = {
        ...layer.paint,
        "line-opacity": 1,
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.9, 8, 2.2, 12, 3.2],
      };
  }
  style.layers = modern
    ? style.layers.map((layer) => {
        if (layer.type !== "symbol" || !JSON.stringify(layer.layout?.["text-field"] ?? "").includes("name")) return layer;
        // English names, as on the app's own map.
        return {
          ...layer,
          layout: { ...layer.layout, "text-field": ["coalesce", ["get", "name_en"], ["get", "name:latin"], ["get", "name"]] },
        } as typeof layer;
      })
    : style.layers.filter(
        (layer) =>
          layer.type !== "symbol" && !("source-layer" in layer && MODERN_SOURCE_LAYERS.has(layer["source-layer"] ?? ""))
      );
  return style;
}

/** Renders the base map for `view` at width×height reference pixels. Rejects rather than returning a
 * map with missing tiles. */
export async function renderBaseMap(options: {
  view: MapViewState;
  width: number;
  height: number;
  pixelRatio: number;
  modern: boolean;
  signal?: AbortSignal;
}): Promise<HTMLCanvasElement> {
  const { view, width, height, pixelRatio, modern, signal } = options;
  const failed = new Error("The map couldn't be drawn. Check your connection, keep this screen open and try again.");
  const style = await mapStyle(modern).catch(() => {
    throw failed;
  });
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");

  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`;
  document.body.appendChild(holder);
  let map: maplibregl.Map | null = null;
  try {
    map = new maplibregl.Map({
      container: holder,
      style,
      center: [view.lng, view.lat],
      zoom: view.zoom,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      pixelRatio,
      canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
    });
    const m = map;
    return await new Promise<HTMLCanvasElement>((resolve, reject) => {
      let errors = 0;
      const timer = window.setTimeout(() => reject(failed), RENDER_TIMEOUT_MS);
      const abort = () => reject(new DOMException("Cancelled", "AbortError"));
      signal?.addEventListener("abort", abort, { once: true });
      m.on("error", () => {
        errors++;
      });
      m.once("idle", () => {
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        if (errors > 0 || !m.areTilesLoaded()) return reject(failed);
        const source = m.getCanvas();
        const copy = document.createElement("canvas");
        copy.width = source.width;
        copy.height = source.height;
        const ctx = copy.getContext("2d");
        if (!ctx) return reject(failed);
        ctx.drawImage(source, 0, 0);
        resolve(copy);
      });
    });
  } catch (err) {
    if (err instanceof DOMException || err === failed) throw err;
    throw failed;
  } finally {
    map?.remove();
    holder.remove();
  }
}

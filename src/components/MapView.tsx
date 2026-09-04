import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Geometry, LineString, Point, Polygon } from "geojson";
import type { Location, LocationCategory, PointOfInterest } from "../data/types";
import type { MapMode } from "./ThenNowToggle";

/**
 * "Illuminated" — our own MapLibre style (public/map/illuminated.json), derived from the
 * OpenFreeMap Liberty style but repainted as an aged vellum atlas: parchment land, desaturated
 * tan sea, drawn coastlines and serif (EB Garamond / Cinzel) place names in warm brown ink.
 * It keeps Liberty's source ids ("openmaptiles", "ne2_shaded") and its layer ids, which the
 * river-geometry lookup and the before-layer insertions below both depend on.
 * Regenerate with public/map/build-illuminated-style.py.
 */
const STYLE_URL = "/map/illuminated.json";

/** Paper grain — a stitched fractal-noise tile multiplied over the canvas so the vellum ground
 * reads as fibrous stock rather than flat fill. Inline (not App.css) because the map overlay is
 * owned by this component. */
const PARCHMENT_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/** Initial whole-region overview camera — also where "Show All Pins" falls back to if no pins are visible. */
const DEFAULT_CENTER: [number, number] = [30, 36];
const DEFAULT_ZOOM = 4.2;

/** Zoom level used when flying to a selected location/POI — loose enough to keep surrounding context visible. */
const SELECTED_ZOOM = 8.5;

/** English-only name expression: falls back to the latin transliteration, then the raw name field. */
const ENGLISH_NAME_EXPRESSION = [
  "coalesce",
  ["get", "name_en"],
  ["get", "name:latin"],
  ["get", "name"],
] as unknown as maplibregl.ExpressionSpecification;

/** Force every text label on the base map to English, overriding the style's default bilingual labels. */
function forceEnglishLabels(map: maplibregl.Map) {
  const layers = map.getStyle()?.layers ?? [];
  layers.forEach((layer) => {
    if (layer.type !== "symbol") return;
    const textField = "layout" in layer ? layer.layout?.["text-field"] : undefined;
    if (textField === undefined) return;
    // Skip layers whose text isn't a place/road name (e.g. route-shield layers keyed on "ref").
    if (!JSON.stringify(textField).includes("name")) return;
    map.setLayoutProperty(layer.id, "text-field", ENGLISH_NAME_EXPRESSION);
  });
}

interface MapViewProps {
  locations: Location[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMapLoad: (map: maplibregl.Map) => void;
  mapMode: MapMode;
  locationsVisible: boolean;
  pois: PointOfInterest[];
  poisVisible: boolean;
  selectedPoiId: string | null;
  onSelectPoi: (id: string) => void;
  /** [lng, lat] waypoints of the active seasonal walk, in stop order — drawn as a dashed route
   * line while a walk is open; null clears it. Memoized by App so identity only changes when the
   * walk actually opens/closes (this keys the draw-and-refit effect below). */
  walkRoute: [number, number][] | null;
}

const SATELLITE_SOURCE_ID = "satellite-imagery";
const SATELLITE_LAYER_ID = "satellite-imagery-layer";

/** Adds a hidden Esri World Imagery raster layer beneath roads/labels, so toggling it on gives a satellite-hybrid view. */
function ensureSatelliteLayer(map: maplibregl.Map) {
  if (map.getSource(SATELLITE_SOURCE_ID)) return;

  map.addSource(SATELLITE_SOURCE_ID, {
    type: "raster",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
    attribution: "Esri, Maxar, Earthstar Geographics",
  });

  const layers = map.getStyle()?.layers ?? [];
  const beforeLayer = layers.find((l) => l.type === "line" && /tunnel|road|bridge/.test(l.id));

  map.addLayer(
    {
      id: SATELLITE_LAYER_ID,
      type: "raster",
      source: SATELLITE_SOURCE_ID,
      layout: { visibility: "none" },
    },
    beforeLayer?.id
  );
}

/** Paint overrides that make the atlas's warm brown label ink legible over satellite photography.
 *
 * The parchment styling sets dark brown text on a pale vellum halo — perfect on the drawn map, and
 * essentially invisible over dark saturated imagery (equatorial rainforest, the Carpathians, deep
 * sea). Value contrast, not hue, is the problem: a dark fill only ever works on bright ground. So
 * satellite mode flips every label to a light fill with a dark halo, the standard treatment for
 * type over imagery — it survives both black-green jungle and blown-out desert without a trade-off.
 *
 * Fonts are untouched (the self-hosted Cinzel / EB Garamond SDF glyphs are the only ones served),
 * as are text-size, spacing and case. Only colour and halo change. */
const SATELLITE_LABEL_PAINT: Record<string, Record<string, unknown>> = {};
{
  // Country & state names: Cinzel caps, widely tracked, read at a glance across a whole landmass —
  // the owner's actual complaint. Warmest white, heaviest halo, and the halo grows a little with
  // zoom so it stays proportional to the larger type without bloating at z4.
  const majuscule = {
    "text-color": "#FEFBF2",
    "text-halo-color": "rgba(18,14,9,0.92)",
    "text-halo-width": ["interpolate", ["linear"], ["zoom"], 2, 1.7, 8, 2.3],
    "text-halo-blur": 0.5,
  };
  // Settlements: smaller Garamond, so a lighter halo keeps the letterforms from clogging.
  const settlement = {
    "text-color": "#F8F3E6",
    "text-halo-color": "rgba(18,14,9,0.88)",
    "text-halo-width": 1.5,
    "text-halo-blur": 0.5,
  };
  for (const id of ["label_country_1", "label_country_2", "label_country_3", "label_state"])
    SATELLITE_LABEL_PAINT[id] = majuscule;
  for (const id of ["label_city_capital", "label_city", "label_town", "label_village", "label_other"])
    SATELLITE_LABEL_PAINT[id] = settlement;
  // River and stream names run along the waterway line, so their backdrop is the terrain photo —
  // same failure as the country names over the Congo basin, same fix, in a cooler white.
  SATELLITE_LABEL_PAINT["waterway_line_label"] = {
    "text-color": "#E9F1F4",
    "text-halo-color": "rgba(12,20,26,0.88)",
    "text-halo-width": 1.5,
    "text-halo-blur": 0.6,
  };
  // Sea and lake names (water_name_*) are deliberately left alone: the satellite raster is inserted
  // *below* the water fill, so open water keeps its pale hand-tinted parchment blue in satellite
  // mode too. Those labels never sit on photography, and flipping them to white would break the one
  // case that currently works.
  SATELLITE_LABEL_PAINT["highway-name-major"] = {
    "text-color": "#EFE7D4",
    "text-halo-color": "rgba(18,14,9,0.85)",
    "text-halo-width": 1.3,
    "text-halo-blur": 0.5,
  };
}

/** Per-map cache of each label layer's original (parchment) paint values, read straight off the
 * style the first time we override it. Restoring from this — rather than from a hardcoded copy —
 * is what guarantees Map mode comes back byte-identical however many times you toggle. */
const baseLabelPaint = new WeakMap<maplibregl.Map, Record<string, Record<string, unknown>>>();

function applyLabelMode(map: maplibregl.Map, mode: MapMode) {
  let base = baseLabelPaint.get(map);
  if (!base) {
    base = {};
    baseLabelPaint.set(map, base);
  }
  for (const [layerId, overrides] of Object.entries(SATELLITE_LABEL_PAINT)) {
    if (!map.getLayer(layerId)) continue;
    if (!base[layerId]) {
      const captured: Record<string, unknown> = {};
      for (const prop of Object.keys(overrides)) {
        captured[prop] = map.getPaintProperty(layerId, prop);
      }
      base[layerId] = captured;
    }
    const values = mode === "satellite" ? overrides : base[layerId];
    for (const [prop, value] of Object.entries(values)) {
      map.setPaintProperty(layerId, prop, value);
    }
  }
}

function applyMapMode(map: maplibregl.Map, mode: MapMode) {
  if (!map.getLayer(SATELLITE_LAYER_ID)) return;
  map.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", mode === "satellite" ? "visible" : "none");
  applyLabelMode(map, mode);
}

const HIGHLIGHT_SOURCE_ID = "region-highlight";
const HIGHLIGHT_FILL_LAYER_ID = "region-highlight-fill";
const HIGHLIGHT_OUTLINE_LAYER_ID = "region-highlight-outline";
const HIGHLIGHT_CATEGORIES = new Set(["region", "province", "nation"]);
const EMPTY_FEATURE_COLLECTION: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Default highlight radius (km) by category, used when a location doesn't specify its own. */
const DEFAULT_HIGHLIGHT_RADIUS_KM: Record<string, number> = {
  region: 45,
  province: 45,
  nation: 70,
};

/** Approximates a circle of the given radius (km) around a [lng, lat] center as a GeoJSON polygon. */
function createCircleFeature(center: [number, number], radiusKm: number): Feature<Polygon> {
  const points = 64;
  const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coordinates.push([center[0] + distanceX * Math.cos(theta), center[1] + distanceY * Math.sin(theta)]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coordinates] },
  };
}

const RIVER_HIGHLIGHT_SOURCE_ID = "river-highlight";
const RIVER_HIGHLIGHT_LAYER_ID = "river-highlight-line";
const RIVER_HIGHLIGHT_CASING_LAYER_ID = "river-highlight-line-casing";

/** Adds a hidden fill+outline layer used to softly highlight a selected region/country's general area. */
function ensureHighlightLayer(map: maplibregl.Map) {
  if (map.getSource(HIGHLIGHT_SOURCE_ID)) return;

  map.addSource(HIGHLIGHT_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION });

  const layers = map.getStyle()?.layers ?? [];
  const beforeLayer = layers.find((l) => l.type === "line" && /tunnel|road|bridge/.test(l.id));

  map.addLayer(
    {
      id: HIGHLIGHT_FILL_LAYER_ID,
      type: "fill",
      source: HIGHLIGHT_SOURCE_ID,
      paint: { "fill-color": "#C8912F", "fill-opacity": 0.22 },
    },
    beforeLayer?.id
  );
  map.addLayer(
    {
      id: HIGHLIGHT_OUTLINE_LAYER_ID,
      type: "line",
      source: HIGHLIGHT_SOURCE_ID,
      paint: { "line-color": "#A8761F", "line-width": 2, "line-opacity": 0.75 },
    },
    beforeLayer?.id
  );
}

/** Adds a hidden glowing line layer used to trace a selected river's course (e.g. the Jordan). */
function ensureRiverHighlightLayer(map: maplibregl.Map) {
  if (map.getSource(RIVER_HIGHLIGHT_SOURCE_ID)) return;

  map.addSource(RIVER_HIGHLIGHT_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION });

  const layers = map.getStyle()?.layers ?? [];
  const beforeLayer = layers.find((l) => l.type === "line" && /tunnel|road|bridge/.test(l.id));

  map.addLayer(
    {
      id: RIVER_HIGHLIGHT_CASING_LAYER_ID,
      type: "line",
      source: RIVER_HIGHLIGHT_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#F0E4C2", "line-width": 9, "line-opacity": 0.55 },
    },
    beforeLayer?.id
  );
  map.addLayer(
    {
      id: RIVER_HIGHLIGHT_LAYER_ID,
      type: "line",
      source: RIVER_HIGHLIGHT_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#2E5F7A", "line-width": 4, "line-opacity": 0.95 },
    },
    beforeLayer?.id
  );
}

const WALK_ROUTE_SOURCE_ID = "walk-route";
const WALK_ROUTE_LAYER_ID = "walk-route-line";
const WALK_ROUTE_CASING_LAYER_ID = "walk-route-line-casing";

/** Adds the (initially empty) dashed line layer tracing an active seasonal walk's route between its
 * stops. Fully isolated from the cluster system — its own GeoJSON source, emptied (not removed)
 * when the walk closes, mirroring how the region/river highlight sources are managed. */
function ensureWalkRouteLayer(map: maplibregl.Map) {
  if (map.getSource(WALK_ROUTE_SOURCE_ID)) return;

  map.addSource(WALK_ROUTE_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION });

  const layers = map.getStyle()?.layers ?? [];
  const beforeLayer = layers.find((l) => l.type === "line" && /tunnel|road|bridge/.test(l.id));

  // Fixed hex colors like the other highlight layers — map paint can't read the app's CSS
  // variables, and the base map's canvas doesn't change with the app theme anyway.
  map.addLayer(
    {
      id: WALK_ROUTE_CASING_LAYER_ID,
      type: "line",
      source: WALK_ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#F5EACB", "line-width": 7, "line-opacity": 0.6 },
    },
    beforeLayer?.id
  );
  map.addLayer(
    {
      id: WALK_ROUTE_LAYER_ID,
      type: "line",
      source: WALK_ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#B4472E", "line-width": 3, "line-opacity": 0.9, "line-dasharray": [2, 1.6] },
    },
    beforeLayer?.id
  );
}

/** Draws (or, with null, clears) the walk route polyline. */
function setWalkRouteData(map: maplibregl.Map, coordinates: [number, number][] | null) {
  const source = map.getSource(WALK_ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  if (!coordinates || coordinates.length < 2) {
    source.setData(EMPTY_FEATURE_COLLECTION);
    return;
  }
  source.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } });
}

function setHighlightedLocation(map: maplibregl.Map, location: Location | undefined) {
  const regionSource = map.getSource(HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  const riverSource = map.getSource(RIVER_HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

  if (location?.category === "river" && location.path && location.path.length > 1) {
    // Draw the approximate fallback path immediately so something shows without delay;
    // highlightRealRiverGeometry (called separately) replaces this with the map's real course once loaded.
    riverSource?.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: location.path },
    });
    regionSource?.setData(EMPTY_FEATURE_COLLECTION);
    return;
  }

  riverSource?.setData(EMPTY_FEATURE_COLLECTION);

  if (!location || !HIGHLIGHT_CATEGORIES.has(location.category)) {
    regionSource?.setData(EMPTY_FEATURE_COLLECTION);
    return;
  }

  const radiusKm = location.highlightRadiusKm ?? DEFAULT_HIGHLIGHT_RADIUS_KM[location.category] ?? 45;
  regionSource?.setData(createCircleFeature(location.coordinates, radiusKm));
}

/** Pulls every LineString/MultiLineString segment out of a (Multi)LineString feature into one flat coordinate list. */
function flattenLineCoords(geometry: Geometry): [number, number][] {
  if (geometry.type === "LineString") return geometry.coordinates as [number, number][];
  if (geometry.type === "MultiLineString") return (geometry.coordinates as [number, number][][]).flat();
  return [];
}

/**
 * Replaces the fallback river highlight with the base map's own real waterway geometry for this river,
 * queried from the currently-loaded vector tiles (OpenMapTiles "waterway" source-layer, matched by its
 * "name:en" property). Falls back silently to the already-drawn approximate path if nothing is found
 * (e.g. tiles for the full river extent haven't loaded at the current view).
 */
function highlightRealRiverGeometry(map: maplibregl.Map, riverName: string) {
  const riverSource = map.getSource(RIVER_HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!riverSource) return;

  const attempt = () => {
    const features = map.querySourceFeatures("openmaptiles", {
      sourceLayer: "waterway",
      filter: ["==", ["get", "name:en"], riverName],
    });
    if (features.length === 0) return false;

    const lines: Feature<LineString>[] = [];
    features.forEach((f) => {
      const coords = flattenLineCoords(f.geometry);
      if (coords.length > 1) lines.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
    });
    if (lines.length === 0) return false;

    riverSource.setData({ type: "FeatureCollection", features: lines });
    return true;
  };

  if (attempt()) return;
  // Tiles for the wider view may still be loading — try again once the map settles.
  map.once("idle", attempt);
}

/** Bounding box [[minLng, minLat], [maxLng, maxLat]] around a set of points. */
function boundsOf(points: [number, number][]): [[number, number], [number, number]] {
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

const CLUSTER_SOURCE_ID = "pin-clusters";
const CLUSTER_ANCHOR_LAYER_ID = "pin-clusters-anchor";

/**
 * Invisible GeoJSON source + layer pair used purely as the clustering engine for the DOM pin
 * markers. MapLibre only loads (and clusters) a source's data when some layer consumes it, so a
 * zero-size, fully transparent circle layer keeps the source active without drawing anything —
 * the visible cluster badges are DOM markers (see updateClusterView) so they share the app's
 * CSS/theme instead of depending on the base style's glyph fonts.
 */
function ensureClusterSource(map: maplibregl.Map) {
  if (map.getSource(CLUSTER_SOURCE_ID)) return;

  map.addSource(CLUSTER_SOURCE_ID, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
    cluster: true,
    // Past ~z13 even the dense Jerusalem group spreads out enough to read as individual pins.
    clusterMaxZoom: 13,
    clusterRadius: 42,
  });
  map.addLayer({
    id: CLUSTER_ANCHOR_LAYER_ID,
    type: "circle",
    source: CLUSTER_SOURCE_ID,
    paint: { "circle-radius": 0, "circle-opacity": 0 },
  });
}

/* ==============================================================================================
 * CLICKING A PLACE'S NAME, NOT JUST ITS PIN
 *
 * The names printed on the map are not ours. Our pins are DOM markers carrying an SVG teardrop and
 * nothing else — no text — so every word a reader sees on the map ("Jerusalem", "Damascus", "Sea of
 * Galilee") is painted into the WebGL canvas by MapLibre from the base style's own symbol layers.
 * That is why tapping the name did nothing while tapping the pin two millimetres away opened the
 * panel: the name is not an element, it is a picture of a word, and the only thing under the
 * reader's finger was the map.
 *
 * The fix keeps the pin as the source of truth and makes the label a second door to it. On a click
 * we ask the style what label — if any — is actually rendered under that point, take that label's
 * own anchor coordinate, and look for one of our markers standing at the same spot. If there is
 * one, the click does exactly what clicking that pin does.
 *
 * WHY GEOMETRY AND NOT NAME MATCHING. The obvious version compares the label's text to our
 * location's name, and it fails on the cases that matter most: our names are ancient and the base
 * map's are modern (Sychar/Nablus, Golgotha/Jerusalem), our data transliterates differently, and a
 * name match on its own would happily fly the reader to the Antioch in the wrong country. Standing
 * in the same place is the thing we actually mean, and it is exactly what we can measure.
 *
 * TWO CAPS, BOTH DELIBERATE, so the label never starts swallowing taps meant for the map or for a
 * neighbouring label:
 *   - The click must land on a rendered label. Not "near a pin" — ON the text. A tap on empty
 *     parchment resolves to nothing and the map behaves exactly as it did before.
 *   - The pin must be within LABEL_MATCH_MAX_PX of the label AND within LABEL_MATCH_MAX_KM of it.
 *     The pixel cap is what stops a crowded zoom-12 view; the kilometre cap is what stops a
 *     zoomed-right-out view, where 30px is a hundred miles and every label has *some* pin near it.
 *     Either alone is wrong at the other end of the zoom range.
 * ============================================================================================== */

/** Ground distance allowed between a clicked label and the pin it resolves to — the real test of
 * "these are the same place", and the one that does not change meaning with the zoom level.
 *
 * 2km is measured, not guessed, and the two measurements it sits between are only 0.66km apart.
 * Our coordinates are hand-placed at the ancient site; OpenMapTiles uses OSM's node for the modern
 * settlement, so the two disagree by however far one is from the other. Sampled against the live
 * style at z11:
 *
 *   MUST match      Tyre 0.05km · Sidon 0.43km · Jerusalem 1.63km (our pin is on the Old City,
 *                   OSM's node is not) · "Beit Sahur" to Shepherds' Field 0.58km
 *   MUST NOT match  "Bethlehem" to Shepherds' Field 2.29km — the nearest thing we hold to
 *                   Bethlehem, but two villages away from the word being tapped, and exactly the
 *                   "swallowing the neighbouring label" this is not allowed to do
 *
 * Raise this and Bethlehem starts answering for Beit Sahour. Lower it and Jerusalem — the most
 * important pin on the map — stops answering for itself. Re-measure before touching it. */
const LABEL_MATCH_MAX_KM = 2;

/** Screen distance allowed as well, so the pin you get is one you can see beside the name you
 * tapped. This is the cap that binds when zoomed right in, where 2.5km is most of a mile of
 * screen; the kilometre cap is the one that binds when zoomed out, where 150px is a hundred miles.
 * Whichever is tighter wins, and the conservative direction — do nothing — is the one they fail
 * towards. NOTE this is not the hit area: a click still has to land on the label's own glyphs. */
const LABEL_MATCH_MAX_PX = 150;

/** Padding around the click point when asking the style what is under it, in pixels. A fingertip is
 * not a point, and a label's own hit box is only as tall as its type. Small enough that two
 * separate words still resolve separately. */
const LABEL_HIT_PAD_PX = 3;

/** Rough great-circle distance in km. Same flat-earth approximation as createCircleFeature above,
 * which is far more accuracy than a 6km threshold needs. */
function kmBetween(a: [number, number], b: [number, number]): number {
  const dx = (a[0] - b[0]) * 111.32 * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  const dy = (a[1] - b[1]) * 110.574;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Every symbol layer in the loaded style that actually prints text — i.e. every layer capable of
 * putting a place name under the reader's finger. Read from the style rather than hardcoded so a
 * regenerated illuminated.json can add or rename a label layer without silently making part of the
 * map unclickable again. Our own added layers are raster/circle/fill/line and never match. */
function textLabelLayerIds(map: maplibregl.Map): string[] {
  return map
    .getStyle()
    .layers.filter((layer) => layer.type === "symbol" && "layout" in layer && layer.layout?.["text-field"] !== undefined)
    .map((layer) => layer.id);
}

/** Category → pin color class. Cities keep the default accent purple; the rest group into
 * regions/provinces/nations, water features, and terrain so the map is scannable at a glance
 * (mirrored by the Legend in LayerControls via the shared --pin-* variables in App.css). */
const CATEGORY_PIN_CLASS: Record<LocationCategory, string> = {
  city: "map-pin-cat-city",
  region: "map-pin-cat-region",
  province: "map-pin-cat-region",
  nation: "map-pin-cat-region",
  sea: "map-pin-cat-water",
  river: "map-pin-cat-water",
  mountain: "map-pin-cat-terrain",
  island: "map-pin-cat-terrain",
};

/** Vellum outline stroked around the pin bodies so the pigment fills stay legible against the
 * warm parchment ground of the Illuminated base style. Set as SVG presentation attributes (not
 * CSS) because the pin *fills* are themed from App.css and a class rule there would win — nothing
 * in App.css styles `stroke` on .pin-body, so these attributes take effect without fighting it. */
const PIN_HALO = "#F2E6C8";

/** A flat teardrop pin, haloed in vellum. Anchored at its tip (14, 34) in the 28x36 box. */
function createFlagElement(category: LocationCategory): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `map-pin ${CATEGORY_PIN_CLASS[category]}`;
  el.innerHTML = `
    <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path class="pin-body" stroke="${PIN_HALO}" stroke-width="1.4" stroke-linejoin="round"
        d="M14 33.2C14 33.2 4.7 19.8 4.7 12C4.7 6.9 8.9 2.7 14 2.7C19.1 2.7 23.3 6.9 23.3 12C23.3 19.8 14 33.2 14 33.2Z" />
      <circle class="pin-dot" cx="14" cy="12" r="4.5" />
    </svg>
  `;
  return el;
}

/**
 * A small round dot marker for secondary "Points of Interest" sites — a distinct shape
 * from the main teardrop pins so the two layers read apart at a glance.
 */
function createPoiElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "poi-pin";
  el.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <circle class="poi-pin-body" cx="9" cy="9" r="6.5" />
    </svg>
  `;
  return el;
}

export default function MapView({
  locations,
  selectedId,
  onSelect,
  onMapLoad,
  mapMode,
  locationsVisible,
  pois,
  poisVisible,
  selectedPoiId,
  onSelectPoi,
  walkRoute,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const poiMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const clusterMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  // Current-generation info per cluster id, read by badge click handlers at *click* time. The
  // source re-clusters on every setData and can hand a surviving numeric id to a completely
  // different cluster — a handler that closed over its creation-time coordinates would then fly
  // the camera somewhere unrelated to the badge the user clicked (markers are reused across passes).
  const clusterInfoRef = useRef<Record<string, { coordinates: [number, number]; count: number }>>({});
  const namePopupRef = useRef<maplibregl.Popup | null>(null);
  // Flips true at the map "load" event — drives the loading overlay below, so the blank pre-style
  // window reads as "loading" instead of "broken."
  const [styleReady, setStyleReady] = useState(false);
  // Flips true when the style/source fails before "load" fires (offline, blocked CDN) — without
  // it the overlay spins forever, since styleReady is only ever set in the "load" handler.
  const [styleError, setStyleError] = useState(false);
  // Read by the "error" handler (wired once at mount) to ignore post-load tile errors — the
  // closure's styleReady would be permanently stale at its mount-time false.
  const styleReadyRef = useRef(false);

  // The map "load" handler and its event listeners are wired once (on mount) but need the *current*
  // props — a stale closure here is exactly what caused the Satellite/Map toggle race (the load
  // handler re-applied the mount-time mapMode over a toggle made before the style finished loading,
  // and re-clicking the already-selected mode is a same-value setState that never re-runs the effect).
  const viewStateRef = useRef({ locationsVisible, poisVisible, selectedId, selectedPoiId });
  viewStateRef.current = { locationsVisible, poisVisible, selectedId, selectedPoiId };
  const mapModeRef = useRef(mapMode);
  mapModeRef.current = mapMode;
  // Same current-value-at-load pattern as mapModeRef: if the map (re)mounts mid-walk (e.g. the Map
  // panel was closed and reopened on desktop), the load handler redraws the route from this ref.
  const walkRouteRef = useRef(walkRoute);
  walkRouteRef.current = walkRoute;

  /** Rebuilds the cluster source's data from the currently-visible pin set (empty while a selection
   * isolates the map to a single pin, so no cluster badges compete with it). */
  const refreshClusterData = (map: maplibregl.Map) => {
    const source = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const { locationsVisible: locsOn, poisVisible: poisOn, selectedId: selLoc, selectedPoiId: selPoi } = viewStateRef.current;
    const features: Feature<Point>[] = [];
    if (selLoc === null && selPoi === null) {
      if (locsOn) {
        locations.forEach((loc) => {
          // "loc:"/"poi:" prefixes keep the two datasets in separate namespaces — several ids
          // (e.g. "jericho", "hebron") exist in both, and a shared namespace let one dataset's
          // clustered point pass the other's unclustered check in updateClusterView.
          features.push({ type: "Feature", properties: { id: `loc:${loc.id}` }, geometry: { type: "Point", coordinates: loc.coordinates } });
        });
      }
      if (poisOn) {
        pois.forEach((poi) => {
          features.push({ type: "Feature", properties: { id: `poi:${poi.id}` }, geometry: { type: "Point", coordinates: poi.coordinates } });
        });
      }
    }
    source.setData({ type: "FeatureCollection", features });
  };

  /** Syncs what's shown against the source's current clustering: numbered badge markers for
   * clusters, individual pin markers only for points the source reports as unclustered. */
  const updateClusterView = (map: maplibregl.Map) => {
    const { locationsVisible: locsOn, poisVisible: poisOn, selectedId: selLoc, selectedPoiId: selPoi } = viewStateRef.current;
    const isolated = selLoc !== null || selPoi !== null;

    const clusters = new Map<number, { coordinates: [number, number]; count: number }>();
    // Per-type sets (prefixes stripped) — see the namespace comment in refreshClusterData.
    const unclusteredLocIds = new Set<string>();
    const unclusteredPoiIds = new Set<string>();
    if (!isolated && map.getSource(CLUSTER_SOURCE_ID)) {
      map.querySourceFeatures(CLUSTER_SOURCE_ID).forEach((feature) => {
        const props = feature.properties ?? {};
        if (props.cluster) {
          // The same cluster can appear once per tile it straddles — keep the first occurrence.
          if (!clusters.has(props.cluster_id)) {
            clusters.set(props.cluster_id, {
              coordinates: (feature.geometry as Point).coordinates as [number, number],
              count: props.point_count,
            });
          }
        } else if (typeof props.id === "string") {
          if (props.id.startsWith("loc:")) unclusteredLocIds.add(props.id.slice(4));
          else if (props.id.startsWith("poi:")) unclusteredPoiIds.add(props.id.slice(4));
        }
      });
    }

    // Individual pins: an isolated selection shows only itself; otherwise a pin shows when its
    // layer toggle is on and the source reports it unclustered in the current view.
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const visible = isolated ? id === selLoc : locsOn && unclusteredLocIds.has(id);
      marker.getElement().style.display = visible ? "" : "none";
    });
    Object.entries(poiMarkersRef.current).forEach(([id, marker]) => {
      const visible = isolated ? id === selPoi : poisOn && unclusteredPoiIds.has(id);
      marker.getElement().style.display = visible ? "" : "none";
    });

    // Cluster badges: drop stale ones, then add/refresh the rest.
    Object.entries(clusterMarkersRef.current).forEach(([key, marker]) => {
      if (!clusters.has(Number(key))) {
        marker.remove();
        delete clusterMarkersRef.current[key];
        delete clusterInfoRef.current[key];
      }
    });
    clusters.forEach((info, clusterId) => {
      const key = String(clusterId);
      clusterInfoRef.current[key] = info;
      const existing = clusterMarkersRef.current[key];
      if (existing) {
        existing.setLngLat(info.coordinates);
        const el = existing.getElement();
        const badge = el.querySelector<HTMLSpanElement>(".cluster-marker-badge");
        if (badge) badge.textContent = String(info.count);
        el.title = `${info.count} places — click to zoom in`;
        return;
      }
      const el = document.createElement("div");
      el.className = "cluster-marker";
      el.title = `${info.count} places — click to zoom in`;
      // The count lives in an inner span (not directly on .cluster-marker) so the hover-scale
      // transition can be scoped there — see the CSS comment on .cluster-marker-badge for why.
      const badge = document.createElement("span");
      badge.className = "cluster-marker-badge";
      badge.textContent = String(info.count);
      el.appendChild(badge);
      el.addEventListener("click", () => {
        // Read from clusterInfoRef, not the creation-time `info` closure — see the ref's comment.
        const current = clusterInfoRef.current[key];
        if (!current) return;
        const source = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        source?.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: current.coordinates, zoom, duration: 600 });
        });
      });
      clusterMarkersRef.current[key] = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(info.coordinates)
        .addTo(map);
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("styledata", () => forceEnglishLabels(map));

    map.on("error", () => {
      if (!styleReadyRef.current) setStyleError(true);
    });

    map.on("load", () => {
      forceEnglishLabels(map);
      ensureSatelliteLayer(map);
      ensureHighlightLayer(map);
      ensureRiverHighlightLayer(map);
      ensureWalkRouteLayer(map);
      setWalkRouteData(map, walkRouteRef.current);
      applyMapMode(map, mapModeRef.current);
      locations.forEach((loc) => {
        const el = createFlagElement(loc.category);
        el.title = loc.name;
        // Hidden until the cluster source reports it unclustered (updateClusterView).
        el.style.display = "none";
        el.addEventListener("click", () => onSelect(loc.id));

        const marker = new maplibregl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat(loc.coordinates)
          .addTo(map);
        markersRef.current[loc.id] = marker;
      });
      pois.forEach((poi) => {
        const el = createPoiElement();
        el.title = poi.name;
        el.style.display = "none";
        el.addEventListener("click", () => onSelectPoi(poi.id));

        const marker = new maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat(poi.coordinates)
          .addTo(map);
        poiMarkersRef.current[poi.id] = marker;
      });
      ensureClusterSource(map);
      refreshClusterData(map);
      updateClusterView(map);
      // Clustering changes with the camera (clusters are computed per zoom level) and whenever the
      // source's data (re)loads — both funnel through the same sync.
      map.on("moveend", () => updateClusterView(map));
      map.on("sourcedata", (e) => {
        if (e.sourceId === CLUSTER_SOURCE_ID && e.isSourceLoaded) updateClusterView(map);
      });

      // --- Clicking a place's NAME (see the block comment above LABEL_MATCH_MAX_PX) ------------
      const labelLayerIds = textLabelLayerIds(map);

      /** The pin a click on a rendered place name resolves to, or null for "this was a click on the
       * map". Only ever returns a marker that is currently ON SCREEN — a place folded into a
       * cluster badge has no pin to stand in for it, and jumping to one the reader cannot see would
       * be a different feature than the one asked for. */
      const pinUnderLabel = (e: maplibregl.MapMouseEvent): { kind: "loc" | "poi"; id: string } | null => {
        if (labelLayerIds.length === 0) return null;
        const { x, y } = e.point;
        const hits = map.queryRenderedFeatures(
          [
            [x - LABEL_HIT_PAD_PX, y - LABEL_HIT_PAD_PX],
            [x + LABEL_HIT_PAD_PX, y + LABEL_HIT_PAD_PX],
          ],
          { layers: labelLayerIds },
        );
        if (hits.length === 0) return null;

        // A point label's own coordinate is the honest anchor. River and country names run along a
        // line or sit inside a polygon, where there is no single point to compare against — for
        // those the click itself is the best anchor we have, and the two caps below still apply.
        const top = hits[0];
        const anchor: [number, number] =
          top.geometry.type === "Point"
            ? ((top.geometry as Point).coordinates as [number, number])
            : (map.unproject(e.point).toArray() as [number, number]);
        const anchorPx = map.project(anchor);

        let best: { kind: "loc" | "poi"; id: string } | null = null;
        let bestPx = LABEL_MATCH_MAX_PX;

        const consider = (kind: "loc" | "poi", id: string, marker: maplibregl.Marker) => {
          // display:"none" is exactly how updateClusterView hides a clustered or filtered-out pin.
          if (marker.getElement().style.display === "none") return;
          const lngLat = marker.getLngLat();
          if (kmBetween([lngLat.lng, lngLat.lat], anchor) > LABEL_MATCH_MAX_KM) return;
          const px = map.project(lngLat);
          const d = Math.hypot(px.x - anchorPx.x, px.y - anchorPx.y);
          if (d >= bestPx) return;
          bestPx = d;
          best = { kind, id };
        };

        Object.entries(markersRef.current).forEach(([id, m]) => consider("loc", id, m));
        Object.entries(poiMarkersRef.current).forEach(([id, m]) => consider("poi", id, m));
        return best;
      };

      map.on("click", (e) => {
        const hit = pinUnderLabel(e);
        if (!hit) return;
        // Whatever the pin does, the label does — literally the same two handlers the marker
        // elements' own click listeners call above.
        if (hit.kind === "loc") onSelect(hit.id);
        else onSelectPoi(hit.id);
      });

      // Desktop affordance to match the pin's `cursor: pointer`: a name you can click should say so
      // before you click it. Skipped while the reader is dragging the map, when the pointer is
      // sweeping across labels it has no intention of pressing.
      map.on("mousemove", (e) => {
        if (map.isMoving()) return;
        map.getCanvas().style.cursor = pinUnderLabel(e) ? "pointer" : "";
      });

      styleReadyRef.current = true;
      setStyleReady(true);
      onMapLoad(map);
    });

    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      Object.values(poiMarkersRef.current).forEach((m) => m.remove());
      poiMarkersRef.current = {};
      Object.values(clusterMarkersRef.current).forEach((m) => m.remove());
      clusterMarkersRef.current = {};
      clusterInfoRef.current = {};
      namePopupRef.current?.remove();
      namePopupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) applyMapMode(mapRef.current, mapMode);
  }, [mapMode]);

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.getElement().classList.toggle("map-pin-active", id === selectedId);
    });
    const loc = locations.find((l) => l.id === selectedId);
    if (mapRef.current) {
      setHighlightedLocation(mapRef.current, loc);
      if (loc?.category === "river" && loc.path && loc.path.length > 1) {
        mapRef.current.fitBounds(boundsOf(loc.path), { padding: 60, duration: 1200 });
        if (loc.riverName) highlightRealRiverGeometry(mapRef.current, loc.riverName);
      } else if (loc) {
        mapRef.current.flyTo({ center: loc.coordinates, zoom: SELECTED_ZOOM, duration: 1200 });
      }
    }
  }, [selectedId, locations]);

  useEffect(() => {
    Object.entries(poiMarkersRef.current).forEach(([id, marker]) => {
      marker.getElement().classList.toggle("poi-pin-active", id === selectedPoiId);
    });
    const poi = pois.find((p) => p.id === selectedPoiId);
    if (poi && mapRef.current) {
      mapRef.current.flyTo({ center: poi.coordinates, zoom: SELECTED_ZOOM, duration: 1200 });
    }
  }, [selectedPoiId, pois]);

  // Seasonal walk route: draw/clear the dashed line, and on open refit the camera around the whole
  // route as an overview beat. Deliberately placed AFTER the selection effects above — opening a
  // walk both selects its first stop and sets the route in the same commit, and running last lets
  // this overview fitBounds win over that stop's flyTo (stepping afterwards only changes the
  // selection, so the per-stop flights behave normally from then on). Pre-"load" the source doesn't
  // exist yet and setWalkRouteData no-ops; the load handler draws from walkRouteRef instead.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setWalkRouteData(map, walkRoute);
    if (walkRoute && walkRoute.length > 1 && map.getSource(WALK_ROUTE_SOURCE_ID)) {
      map.fitBounds(boundsOf(walkRoute), { padding: 70, duration: 1200 });
    }
  }, [walkRoute]);

  // Shows the selected pin's name in a floating label — without this, flying to an obscure
  // ancient place name (e.g. "Sychar") gives no on-map indication of what's being shown, since
  // the base map's own labels are modern place names and rarely include it.
  useEffect(() => {
    namePopupRef.current?.remove();
    namePopupRef.current = null;
    if (!mapRef.current) return;

    const loc = locations.find((l) => l.id === selectedId);
    const poi = pois.find((p) => p.id === selectedPoiId);
    const target = loc ?? poi;
    if (!target) return;

    namePopupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: loc ? 40 : 22,
      className: "map-name-popup",
    })
      .setLngLat(target.coordinates)
      .setText(target.name)
      .addTo(mapRef.current);
  }, [selectedId, selectedPoiId, locations, pois]);

  // Selecting any location/POI isolates the map to just that pin; clearing the selection (or
  // toggling a layer) rebuilds the clustered pin set from the normal locationsVisible/poisVisible state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(CLUSTER_SOURCE_ID)) return; // pre-"load" — the load handler seeds this
    refreshClusterData(map);
    updateClusterView(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedPoiId, locationsVisible, poisVisible]);

  return (
    <>
      <div ref={containerRef} className="map-container" />
      {/* Aged-paper pass over the finished canvas: fibrous grain multiplied into the vellum plus a
       * soft inset vignette, so the tiles read as one printed sheet instead of a live raster.
       * Styled inline (App.css belongs to the palette work) and pointer-events:none so every map
       * interaction — pin clicks, cluster clicks, drag, the zoom controls — passes straight through.
       * Hidden in Satellite mode, where a parchment wash over photography just looks like haze. */}
      {mapMode !== "satellite" && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 3,
            backgroundImage: PARCHMENT_GRAIN,
            backgroundSize: "200px 200px",
            mixBlendMode: "multiply",
            opacity: 0.14,
          }}
        />
      )}
      {mapMode !== "satellite" && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 3,
            boxShadow: "inset 0 0 120px 30px rgba(94, 74, 44, 0.16)",
          }}
        />
      )}
      {!styleReady && (
        <div className="map-loading-overlay" role="status">
          <div className="map-loading-pill">
            {!styleError && <span className="map-loading-spinner" aria-hidden="true" />}
            {styleError ? "Map failed to load — check your connection" : "Loading map…"}
          </div>
        </div>
      )}
    </>
  );
}

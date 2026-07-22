import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Geometry, LineString, Polygon } from "geojson";
import type { Location, PointOfInterest } from "../data/types";
import type { MapMode } from "./ThenNowToggle";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

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

function applyMapMode(map: maplibregl.Map, mode: MapMode) {
  if (!map.getLayer(SATELLITE_LAYER_ID)) return;
  map.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", mode === "satellite" ? "visible" : "none");
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
      paint: { "fill-color": "#fde047", "fill-opacity": 0.3 },
    },
    beforeLayer?.id
  );
  map.addLayer(
    {
      id: HIGHLIGHT_OUTLINE_LAYER_ID,
      type: "line",
      source: HIGHLIGHT_SOURCE_ID,
      paint: { "line-color": "#eab308", "line-width": 2, "line-opacity": 0.7 },
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
      paint: { "line-color": "#0c4a6e", "line-width": 9, "line-opacity": 0.4 },
    },
    beforeLayer?.id
  );
  map.addLayer(
    {
      id: RIVER_HIGHLIGHT_LAYER_ID,
      type: "line",
      source: RIVER_HIGHLIGHT_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#38bdf8", "line-width": 4, "line-opacity": 0.95 },
    },
    beforeLayer?.id
  );
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

/** A modern flat teardrop pin. Anchored at its tip (14, 34) in the 28x36 box. */
function createFlagElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "map-pin";
  el.innerHTML = `
    <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path class="pin-body" d="M14 34C14 34 4 20 4 12C4 6.5 8.5 2 14 2C19.5 2 24 6.5 24 12C24 20 14 34 14 34Z" />
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
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const poiMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const namePopupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [30, 36],
      zoom: 4.2,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("styledata", () => forceEnglishLabels(map));

    map.on("load", () => {
      forceEnglishLabels(map);
      ensureSatelliteLayer(map);
      ensureHighlightLayer(map);
      ensureRiverHighlightLayer(map);
      applyMapMode(map, mapMode);
      locations.forEach((loc) => {
        const el = createFlagElement();
        el.title = loc.name;
        el.style.display = locationsVisible ? "" : "none";
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
        el.style.display = poisVisible ? "" : "none";
        el.addEventListener("click", () => onSelectPoi(poi.id));

        const marker = new maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat(poi.coordinates)
          .addTo(map);
        poiMarkersRef.current[poi.id] = marker;
      });
      onMapLoad(map);
    });

    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      Object.values(poiMarkersRef.current).forEach((m) => m.remove());
      poiMarkersRef.current = {};
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

  // Selecting any location/POI isolates the map to just that pin; clearing the selection
  // (or toggling a layer) restores the normal locationsVisible/poisVisible state.
  useEffect(() => {
    const isolated = selectedId !== null || selectedPoiId !== null;
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const visible = isolated ? id === selectedId : locationsVisible;
      marker.getElement().style.display = visible ? "" : "none";
    });
    Object.entries(poiMarkersRef.current).forEach(([id, marker]) => {
      const visible = isolated ? id === selectedPoiId : poisVisible;
      marker.getElement().style.display = visible ? "" : "none";
    });
  }, [selectedId, selectedPoiId, locationsVisible, poisVisible]);

  return <div ref={containerRef} className="map-container" />;
}

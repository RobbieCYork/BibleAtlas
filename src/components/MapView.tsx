import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Geometry, LineString, Point, Polygon } from "geojson";
import type { Location, LocationCategory, PointOfInterest } from "../data/types";
import type { MapMode } from "./ThenNowToggle";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

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
  /** Bumped by App only when "× Show All Pins" is clicked — drives the refit-around-everything
   * flight. An explicit signal rather than watching the selection ids go null, because selecting
   * a person also nulls both ids (people have no map presence) and must not move the camera. */
  showAllNonce: number;
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

/** A modern flat teardrop pin. Anchored at its tip (14, 34) in the 28x36 box. */
function createFlagElement(category: LocationCategory): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `map-pin ${CATEGORY_PIN_CLASS[category]}`;
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
  showAllNonce,
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
        el.textContent = String(info.count);
        el.title = `${info.count} places — click to zoom in`;
        return;
      }
      const el = document.createElement("div");
      el.className = "cluster-marker";
      el.textContent = String(info.count);
      el.title = `${info.count} places — click to zoom in`;
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

  // "× Show All Pins" should do what it says — refit the viewport around every currently-visible
  // pin instead of staying at the tight selected-pin zoom where only a pin or two remains in view.
  // Keyed on App's explicit nonce (see MapViewProps) so only that button triggers the flight.
  useEffect(() => {
    const map = mapRef.current;
    if (showAllNonce === 0 || !map) return; // 0 = initial mount, nothing was clicked
    const points: [number, number][] = [
      ...(locationsVisible ? locations.map((l) => l.coordinates) : []),
      ...(poisVisible ? pois.map((p) => p.coordinates) : []),
    ];
    if (points.length > 1) map.fitBounds(boundsOf(points), { padding: 60, duration: 1200 });
    else map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 1200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllNonce]);

  return (
    <>
      <div ref={containerRef} className="map-container" />
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

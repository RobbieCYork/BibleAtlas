import { useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";

interface LayerControlsProps {
  map: maplibregl.Map | null;
  poisVisible: boolean;
  onTogglePois: () => void;
  poiCount: number;
  locationsVisible: boolean;
  onToggleLocations: () => void;
}

type LayerCategory = "roads" | "places" | "regions" | "boundaries";

const CATEGORY_LABELS: Record<LayerCategory, string> = {
  roads: "Roads",
  places: "Cities & Towns",
  regions: "Countries & Regions",
  boundaries: "National Boundaries",
};

const CATEGORY_ORDER: LayerCategory[] = ["roads", "places", "regions", "boundaries"];

const DEFAULT_VISIBLE: Record<LayerCategory, boolean> = {
  roads: false,
  places: true,
  regions: true,
  boundaries: true,
};

/**
 * Categorize a style layer using OpenMapTiles/OpenFreeMap naming conventions.
 * Points-of-interest (generic modern amenities like cafes/shops) aren't relevant to
 * biblical geography, so they're always kept hidden rather than exposed as a toggle.
 */
function categorize(layerId: string, layerType: string): LayerCategory | null {
  const id = layerId.toLowerCase();

  if (id.includes("boundary") || id.includes("border")) return "boundaries";
  if (id.includes("poi")) return null;

  const isRoad =
    id.includes("road") ||
    id.includes("bridge") ||
    id.includes("tunnel") ||
    id.includes("street") ||
    id.includes("motorway") ||
    id.includes("highway") ||
    id.includes("transportation");

  if (layerType === "symbol") {
    // Country/state-scale name labels stay visible independently of small-place labels.
    if (id.includes("country") || id.includes("state")) return "regions";
    if (isRoad) return "roads";
    if (
      id.includes("label") ||
      id.includes("place") ||
      id.includes("city") ||
      id.includes("town") ||
      id.includes("village") ||
      id.includes("airport")
    ) {
      return "places";
    }
    return null;
  }

  if (isRoad) return "roads";
  return null;
}

/** Layer ids that are always hidden, regardless of any toggle (POI icons: cafes, shops, etc.). */
function isAlwaysHidden(layerId: string): boolean {
  return layerId.toLowerCase().includes("poi");
}

const EMPTY_GROUPS: Record<LayerCategory, string[]> = {
  roads: [],
  places: [],
  regions: [],
  boundaries: [],
};

export default function LayerControls({
  map,
  poisVisible,
  onTogglePois,
  poiCount,
  locationsVisible,
  onToggleLocations,
}: LayerControlsProps) {
  const [groups, setGroups] = useState<Record<LayerCategory, string[]>>(EMPTY_GROUPS);
  const [visible, setVisible] = useState<Record<LayerCategory, boolean>>(DEFAULT_VISIBLE);
  const [minimized, setMinimized] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (!map) return;

    const build = () => {
      const style = map.getStyle();
      const layers = style?.layers ?? [];
      if (layers.length === 0) return;
      const next: Record<LayerCategory, string[]> = { roads: [], places: [], regions: [], boundaries: [] };
      layers.forEach((layer) => {
        if (isAlwaysHidden(layer.id)) {
          if (map.getLayer(layer.id)) {
            map.setLayoutProperty(layer.id, "visibility", "none");
          }
          return;
        }
        const category = categorize(layer.id, layer.type);
        if (category) next[category].push(layer.id);
      });
      // Newly-discovered layers (e.g. on a later "styledata" pass) must match
      // the current toggle state, not the style's built-in default visibility.
      CATEGORY_ORDER.forEach((category) => {
        const shouldShow = visibleRef.current[category];
        next[category].forEach((id) => {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", shouldShow ? "visible" : "none");
          }
        });
      });
      setGroups(next);
    };

    // The style can report isStyleLoaded()/fire "styledata" before all layers are
    // registered, so keep listening until a build actually finds layers.
    build();
    map.on("styledata", build);
    return () => {
      map.off("styledata", build);
    };
  }, [map]);

  const toggle = (category: LayerCategory) => {
    if (!map) return;
    const nextVisible = !visible[category];
    groups[category].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", nextVisible ? "visible" : "none");
      }
    });
    setVisible((v) => ({ ...v, [category]: nextVisible }));
  };

  return (
    <div className={`layer-controls ${minimized ? "layer-controls-minimized" : ""}`}>
      <div className="layer-controls-header">
        <h3>Options</h3>
        <button
          type="button"
          className="layer-controls-minimize"
          onClick={() => setMinimized((m) => !m)}
          aria-label={minimized ? "Expand options" : "Minimize options"}
          title={minimized ? "Expand options" : "Minimize options"}
        >
          {minimized ? "+" : "−"}
        </button>
      </div>
      {!minimized && (
        <>
          {CATEGORY_ORDER.map((category) => (
            <label key={category} className="layer-toggle">
              <input
                type="checkbox"
                checked={visible[category]}
                disabled={groups[category].length === 0}
                onChange={() => toggle(category)}
              />
              {CATEGORY_LABELS[category]}
            </label>
          ))}
          <label className="layer-toggle layer-toggle-poi">
            <input
              type="checkbox"
              checked={locationsVisible}
              onChange={onToggleLocations}
            />
            Geographical Locations
          </label>
          <label className="layer-toggle">
            <input
              type="checkbox"
              checked={poisVisible}
              disabled={poiCount === 0}
              onChange={onTogglePois}
            />
            Points of Interest
          </label>
        </>
      )}
    </div>
  );
}

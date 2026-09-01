#!/usr/bin/env python3
"""Derives the 'Illuminated' parchment map style from the OpenFreeMap Liberty style.

Usage:  python3 public/map/build-illuminated-style.py public/map/illuminated.json

Fetches Liberty fresh from OpenFreeMap and rewrites its palette, fonts and layer set into the
aged-vellum atlas skin the app ships. Liberty's source ids ("openmaptiles", "ne2_shaded") and
layer ids are preserved — MapView.tsx depends on both. Fonts are served from public/fonts
(EB Garamond / Cinzel SDF glyphs; OpenFreeMap's own glyph endpoint has Noto Sans only).
"""
import json, copy, sys, urllib.request

SRC = "https://tiles.openfreemap.org/styles/liberty"
OUT = sys.argv[1]

req = urllib.request.Request(SRC, headers={"User-Agent": "capstone-bible-style-build"})
with urllib.request.urlopen(req) as r:
    d = json.load(r)

VELLUM = "#E4D4B0"
SEA = "#B4A582"
SEA_DEEP = "#A89A78"
COAST = "#9A8760"
INK = "#5E4A2C"
HALO = "rgba(236,225,197,0.9)"

DROP = {
    "poi_r20", "poi_r7", "poi_r1", "poi_transit", "airport",
    "highway-shield-non-us", "highway-shield-us-interstate", "road_shield_us",
    "road_one_way_arrow", "road_one_way_arrow_opposite",
    "building-3d", "road_area_pattern",
    "landuse_residential", "landuse_pitch", "landuse_track",
    "landuse_cemetery", "landuse_hospital", "landuse_school",
    "aeroway_fill", "aeroway_runway", "aeroway_taxiway",
    "highway-name-path", "highway-name-minor",
    "tunnel_major_rail_hatching", "tunnel_transit_rail_hatching",
    "road_major_rail_hatching", "road_transit_rail_hatching",
    "bridge_major_rail_hatching", "bridge_transit_rail_hatching",
}

FILLS = {
    "park": ("#D6C79E", 0.45, "#C3B189"),
    "landcover_wood": ("#D2C197", 0.5, None),
    "landcover_grass": ("#DECEA6", 0.45, None),
    "landcover_ice": ("#F1E9D6", 0.8, None),
    "landcover_wetland": ("#CBBB92", 0.4, None),
    "landcover_sand": ("#EFE2BE", 0.7, None),
    "building": ("#CFBC94", 0.55, "#BCA87F"),
}

LINES = {
    "park_outline": ("#C3B189", 0.5),
    "waterway_tunnel": ("#8C7F5C", 0.45),
    "waterway_river": ("#8C7F5C", 0.85),
    "waterway_other": ("#93865F", 0.7),
    "boundary_2": ("#8A6F45", 0.75),
    "boundary_3": ("#9C8560", 0.5),
    "boundary_disputed": ("#8A6F45", 0.6),
}

ROAD_MAJOR = "#9C8154"
ROAD_MINOR = "#AF9A6C"
ROAD_CASING = "#DBCBA7"
RAIL = "#B3A17B"

# text-font / color / letter-spacing / uppercase overrides for symbol layers
GARAMOND = ["EB Garamond Regular"]
GARAMOND_I = ["EB Garamond Italic"]
CINZEL = ["Cinzel Regular"]

SYMBOLS = {
    # id: (font, color, letter-spacing, uppercase, size_scale)
    "label_country_1": (CINZEL, "#5E4A2C", 0.30, True, 1.05),
    "label_country_2": (CINZEL, "#6A5433", 0.28, True, 1.05),
    "label_country_3": (CINZEL, "#71593A", 0.26, True, 1.05),
    "label_state": (CINZEL, "#7C6644", 0.30, True, 1.1),
    "label_city_capital": (GARAMOND, "#43341C", 0.04, False, 1.15),
    "label_city": (GARAMOND, "#4E3D22", 0.03, False, 1.15),
    "label_town": (GARAMOND_I, "#5E4A2C", 0.02, False, 1.15),
    "label_village": (GARAMOND_I, "#6B5636", 0.02, False, 1.15),
    "label_other": (GARAMOND_I, "#75613F", 0.14, True, 1.1),
    "water_name_point_label": (GARAMOND_I, "#6E6144", 0.26, False, 1.15),
    "water_name_line_label": (GARAMOND_I, "#6E6144", 0.26, False, 1.15),
    "waterway_line_label": (GARAMOND_I, "#6E6144", 0.24, False, 1.1),
    "highway-name-major": (GARAMOND, "#8A7550", 0.05, False, 1.0),
}


def scale_size(v, k):
    if isinstance(v, (int, float)):
        return round(v * k, 1)
    if isinstance(v, list):
        # interpolate expression: ["interpolate", interp, ["zoom"], z0, s0, z1, s1, ...]
        if v and v[0] == "interpolate":
            out = v[:3]
            rest = v[3:]
            for i in range(0, len(rest), 2):
                out.append(rest[i])
                out.append(scale_size(rest[i + 1], k))
            return out
    return v


layers = []
for layer in d["layers"]:
    lid = layer["id"]
    if lid in DROP:
        continue
    l = copy.deepcopy(layer)
    paint = l.setdefault("paint", {})
    layout = l.setdefault("layout", {})

    if lid == "background":
        # In OpenMapTiles the background IS the land — water is a fill drawn on top of it.
        paint["background-color"] = VELLUM
    elif lid == "natural_earth":
        paint["raster-opacity"] = ["interpolate", ["exponential", 1.5], ["zoom"], 0, 0.4, 6, 0.1]
        paint["raster-saturation"] = -0.85
        paint["raster-contrast"] = 0.12
        paint["raster-brightness-max"] = 0.95
    elif lid == "water":
        paint["fill-color"] = [
            "interpolate", ["linear"], ["zoom"], 0, SEA_DEEP, 5, SEA, 10, "#BDAF8D",
        ]
    elif lid in FILLS:
        color, opacity, outline = FILLS[lid]
        paint["fill-color"] = color
        paint["fill-opacity"] = opacity
        if outline:
            paint["fill-outline-color"] = outline
        else:
            paint.pop("fill-outline-color", None)
    elif lid in LINES:
        color, opacity = LINES[lid]
        paint["line-color"] = color
        paint["line-opacity"] = opacity
        if lid == "boundary_2":
            paint["line-dasharray"] = [3, 1.8]
        elif lid in ("boundary_3", "boundary_disputed"):
            paint["line-dasharray"] = [1.5, 2]
    elif l["type"] == "line" and any(t in lid for t in ("road", "tunnel", "bridge")):
        if "rail" in lid:
            paint["line-color"] = RAIL
            paint["line-opacity"] = 0.5
        elif lid.endswith("_casing"):
            paint["line-color"] = ROAD_CASING
            paint["line-opacity"] = 0.7
        elif any(k in lid for k in ("motorway", "trunk_primary")):
            paint["line-color"] = ROAD_MAJOR
            paint["line-opacity"] = 0.85
        else:
            paint["line-color"] = ROAD_MINOR
            paint["line-opacity"] = 0.8
        paint.pop("line-pattern", None)
    elif lid in SYMBOLS:
        font, color, ls, upper, k = SYMBOLS[lid]
        layout["text-font"] = font
        layout["text-letter-spacing"] = ls
        if upper:
            layout["text-transform"] = "uppercase"
        else:
            layout.pop("text-transform", None)
        if "text-size" in layout:
            layout["text-size"] = scale_size(layout["text-size"], k)
        # Strip the sprite dot icons that come with the place labels — an atlas sets names alone.
        for key in ("icon-image", "icon-size", "icon-allow-overlap", "icon-optional",
                    "text-anchor", "text-offset"):
            layout.pop(key, None)
        paint["text-color"] = color
        paint["text-halo-color"] = HALO
        paint["text-halo-width"] = 1.6
        paint["text-halo-blur"] = 0.6
    elif l["type"] == "symbol":
        layout["text-font"] = GARAMOND_I
        paint["text-color"] = INK
        paint["text-halo-color"] = HALO
        paint["text-halo-width"] = 1.4

    if not paint:
        l.pop("paint")
    if not layout:
        l.pop("layout")
    layers.append(l)

    # A drawn coastline right after the water fill — the single strongest "engraved atlas" cue.
    if lid == "water":
        layers.append({
            "id": "water_coastline",
            "type": "line",
            "source": "openmaptiles",
            "source-layer": "water",
            "filter": ["!=", ["get", "brunnel"], "tunnel"],
            "layout": {"line-cap": "round", "line-join": "round"},
            "paint": {
                "line-color": COAST,
                "line-opacity": 0.75,
                "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 2, 0.5, 6, 1.0, 12, 2.0],
            },
        })
        layers.append({
            "id": "water_coastline_glow",
            "type": "line",
            "source": "openmaptiles",
            "source-layer": "water",
            "filter": ["!=", ["get", "brunnel"], "tunnel"],
            "layout": {"line-cap": "round", "line-join": "round"},
            "paint": {
                "line-color": COAST,
                "line-opacity": 0.18,
                "line-blur": 4,
                "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 2, 4, 6, 8, 12, 16],
                "line-offset": ["interpolate", ["exponential", 1.3], ["zoom"], 2, 2, 6, 4, 12, 8],
            },
        })

style = {
    "version": 8,
    "name": "Illuminated",
    "metadata": {
        "derived-from": "OpenFreeMap Liberty (https://openfreemap.org)",
        "description": "Aged-vellum biblical atlas skin over OpenMapTiles vector tiles.",
    },
    "glyphs": "/fonts/{fontstack}/{range}.pbf",
    "sprite": d["sprite"],
    "sources": d["sources"],
    "layers": layers,
}

with open(OUT, "w") as f:
    json.dump(style, f, indent=1)
    f.write("\n")
print("wrote", OUT, len(layers), "layers")

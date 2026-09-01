MapLibre SDF glyph ranges used by the "Illuminated" map style (public/map/illuminated.json).

Fontstacks:
  EB Garamond Regular / EB Garamond Italic — EB Garamond, SIL Open Font License 1.1
    https://github.com/google/fonts/tree/main/ofl/ebgaramond
  Cinzel Regular — Cinzel, SIL Open Font License 1.1
    https://github.com/google/fonts/tree/main/ofl/cinzel

Generated from the upstream variable TTFs with fontnik (fontnik.range, 256-codepoint ranges
across the full 0-65535 space, so no range 404s in the browser console).

These replace the OpenFreeMap glyph endpoint, which serves Noto Sans only — no serif was
available there, and serif place names are the point of the style.

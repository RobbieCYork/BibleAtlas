export interface CrosswordBackground {
  url: string;
  caption: string;
  sourceUrl: string;
}

/** Scenic Holy Land photography for the crossword screen's backdrop — reusing the same, already-
 * vetted Wikimedia Commons URLs this app's own location/POI archaeology sections cite elsewhere
 * (see src/data/locations.ts / pois.ts), rather than sourcing new, unverified images. Which one shows
 * varies by puzzle (see backgroundFor in CrosswordView.tsx) so replaying the same level doesn't always
 * look identical. */
export const CROSSWORD_BACKGROUNDS: CrosswordBackground[] = [
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/1/14/Israel-2013-Aerial_21-Masada.jpg",
    caption: "Masada, with the Dead Sea in the distance",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Israel-2013-Aerial_21-Masada.jpg",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Herodium_from_above_2.jpg",
    caption: "Herodium, Herod the Great's desert fortress",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Herodium_from_above_2.jpg",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Khirbet_Qumr%C4%81n_7.jpg",
    caption: "The cliffs of Qumran, above the Dead Sea",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Khirbet_Qumrān_7.jpg",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Banias_Spring_Cliff_Pan%27s_Cave.JPG",
    caption: "The Banias spring, a source of the Jordan River",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Banias_Spring_Cliff_Pan's_Cave.JPG",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/2/25/Jericho_Tell_es_Sultan_P1190730.JPG",
    caption: "Tell es-Sultan, the site of ancient Jericho",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Jericho_Tell_es_Sultan_P1190730.JPG",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Al-Maghtas_03.jpg",
    caption: "Al-Maghtas, on the Jordan River",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Al-Maghtas_03.jpg",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/5/50/Ruins_of_Bethsaida_village_in_summer_2011_%286%29.JPG",
    caption: "Bethsaida, by the Sea of Galilee",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Ruins_of_Bethsaida_village_in_summer_2011_(6).JPG",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Overview_of_Theater_Beit_Shean_Israel.jpg",
    caption: "The Roman theater at Beit She'an",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Overview_of_Theater_Beit_Shean_Israel.jpg",
  },
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic per (level, puzzleIndex) — same puzzle always gets the same backdrop, but which one
 * varies across puzzles/levels rather than repeating a single fixed image everywhere. */
export function backgroundFor(key: string): CrosswordBackground {
  return CROSSWORD_BACKGROUNDS[hashSeed(key) % CROSSWORD_BACKGROUNDS.length];
}

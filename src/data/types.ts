export type LocationCategory =
  | "city"
  | "region"
  | "province"
  | "nation"
  | "sea"
  | "river"
  | "mountain"
  | "island";

export interface RulerPeriod {
  name: string;
  period: string;
}

export interface VerseRef {
  reference: string;
  note?: string;
}

export interface LocationHistory {
  founded?: string;
  population?: string;
  rulers?: RulerPeriod[];
  industry?: string;
  notableFacts: string[];
}

export interface ArchaeologyPhoto {
  /** Direct, freely-licensed image URL (e.g. a Wikimedia Commons file path). */
  url: string;
  caption: string;
  /** The source/file page, for attribution and license verification. */
  sourceUrl: string;
}

export interface Archaeology {
  note: string;
  photos: ArchaeologyPhoto[];
}

export interface SourceCitation {
  label: string;
  url: string;
}

export interface Location {
  id: string;
  name: string;
  /** Phonetic respelling, e.g. "juh-ROO-suh-lem", shown next to the name. */
  pronunciation?: string;
  alternateNames?: string[];
  category: LocationCategory;
  modernName?: string;
  /** [longitude, latitude] */
  coordinates: [number, number];
  history: LocationHistory;
  verses: VerseRef[];
  modernMapUrl: string;
  archaeology?: Archaeology;
  /** Radius (km) for the soft map highlight shown when this region/province/nation is selected. */
  highlightRadiusKm?: number;
  /** [longitude, latitude] waypoints tracing this feature's course — fallback river highlight if the live map-data lookup below finds nothing. */
  path?: [number, number][];
  /** Exact "name:en" value of this river in the base map's own waterway data — used to highlight its real, exact rendered course. */
  riverName?: string;
  /** Citations backing the historical/archaeological claims above. */
  sources?: SourceCitation[];
}

/**
 * A secondary archaeological/biblical site of interest — lighter-weight than a full Location
 * (no rulers/population/verse list), toggleable as its own "Points of Interest" map layer.
 */
export interface PointOfInterest {
  id: string;
  name: string;
  /** Phonetic respelling, e.g. "juh-ROO-suh-lem", shown next to the name. */
  pronunciation?: string;
  /** Other names/spellings this site is called by in NT verse text, e.g. "Bethesda" for the Pool of Bethesda. */
  alternateNames?: string[];
  /** Short descriptive tag, e.g. "Fortress", "Ancient City", "Religious Site". */
  tag: string;
  modernName?: string;
  /** [longitude, latitude] */
  coordinates: [number, number];
  description: string;
  archaeology: Archaeology;
  modernMapUrl: string;
  /** Citations backing the historical/archaeological claims above. */
  sources?: SourceCitation[];
}

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
  /** Optional journaling question tied to this place — shown as a "Reflect" card in the details
   * panel, with a "Journal this" button that anchors a note to the first entry in `verses`. */
  reflectionPrompt?: string;
}

/** Drives article depth/prominence: major figures get the longest treatment, notable figures the shortest. */
export type PersonTier = "major" | "significant" | "notable";

export interface ExtraBiblicalReference {
  /** e.g. "Josephus, Antiquities of the Jews" or "Tacitus, Annals". */
  source: string;
  /** e.g. "18.5.2 (116–119)" — book/chapter/section, and line numbers where standard. */
  citation: string;
  /** What the source actually says, paraphrased or quoted — not just "he is mentioned." */
  summary: string;
  /** How much weight this carries, e.g. "Contemporary Roman administrative record" vs.
   * "Later church tradition (3rd century+) — not a contemporary historical source." Required so
   * legendary/traditional material is never presented with the same confidence as a contemporary record. */
  reliability: string;
  /** Link to a free public-domain full-text translation of the cited passage (Perseus, LacusCurtius,
   * Sefaria, etc.) — omitted when the citation is too vague to point at a specific passage, or when no
   * free public-domain English text of the work exists online. */
  url?: string;
}

export interface Person {
  id: string;
  name: string;
  /** Phonetic respelling, e.g. "SIGH-mun PEE-ter", shown next to the name. */
  pronunciation?: string;
  /** Other names/titles this person is called by in the text, e.g. "Simon Peter", "Cephas", "Simon". */
  alternateNames?: string[];
  tier: PersonTier;
  /** Short tag, e.g. "Apostle", "Roman Governor of Judea", "Prophetess". */
  role: string;
  /** One or two sentences — the hook shown right under the name. */
  summary: string;
  /** Main narrative — accomplishments, what they did and why it mattered. One paragraph per array entry. */
  lifeStory: string[];
  controversies?: string[];
  occupation?: string;
  /** Free text naming where they lived/were from/traveled to — location names here get auto-linked. */
  placesLived?: string;
  extraBiblicalReferences?: ExtraBiblicalReference[];
  /** Explicit note shown when no extra-biblical record exists, instead of the section being silently absent. */
  noExtraBiblicalRecordNote?: string;
  verses: VerseRef[];
  /** Citations backing the historical claims — general further reading, e.g. a reputable encyclopedia entry. */
  sources?: SourceCitation[];
  /** Optional journaling question tied to this person — shown as a "Reflect" card in the details
   * panel, with a "Journal this" button that anchors a note to the first entry in `verses`. */
  reflectionPrompt?: string;
}

/** Drives which icon/badge a Topic gets — not map-related (topics have no coordinates). */
export type TopicCategory = "practice" | "doctrine" | "people-group" | "concept";

export interface TopicSection {
  heading: string;
  /** One paragraph per array entry, same convention as Person.lifeStory — location/POI/person names
   * here get auto-linked. */
  paragraphs: string[];
}

/**
 * A non-place, non-person subject auto-linked from Bible text — a practice (Passover, casting lots),
 * a doctrine (the Trinity), a people group (Samaritans, Pharisees), or a broader concept (the Torah,
 * the synagogue). No coordinates/map presence, unlike Location/PointOfInterest.
 */
export interface Topic {
  id: string;
  name: string;
  alternateNames?: string[];
  category: TopicCategory;
  /** Short tag, e.g. "Old Testament Practice", "Trinitarian Doctrine", "People Group". */
  role: string;
  /** One or two sentences — the hook shown right under the name. */
  summary: string;
  /** Main body, one heading + paragraphs per major sub-topic (e.g. "Old Testament Background",
   * "Fulfillment in the New Testament") — flexible since topics don't share a person's biographical shape. */
  sections: TopicSection[];
  verses: VerseRef[];
  sources?: SourceCitation[];
  /** Optional journaling question tied to this topic, same convention as Person/Location. */
  reflectionPrompt?: string;
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
  /** Optional journaling question tied to this site — shown as a "Reflect" card in the details
   * panel. POIs carry no verse list, so the card renders prompt-only (no "Journal this" anchor). */
  reflectionPrompt?: string;
}

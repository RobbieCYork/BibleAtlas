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

/** A citation from a historical figure's own writings — e.g. reference "Confessions, Book I" with
 * the quoted line in `note`. Structurally the same as VerseRef but kept as its own type so a
 * quotation can never be mistaken for a Bible reference: VerseRefs are rendered as buttons that
 * navigate the Bible panel, and "Confessions, Book I" is not something that panel can resolve. */
export interface QuoteRef {
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
  /** Signed birth year: negative = BC, positive = AD (e.g. -586 = 586 BC, 5 = AD 5). There is no year 0.
   * Omitted when Scripture and tradition give no basis for even an approximate year. */
  bornYear?: number;
  /** Signed death year, same sign convention as bornYear. Omitted when unrecorded — e.g. a bodily
   * translation like Enoch's, or Scripture simply never stating it. */
  diedYear?: number;
  /** Human-readable lifespan/date range shown in the panel, e.g. "c. 4004-3074 BC" or "d. AD 44 (reigned
   * c. 1050-1010 BC)" — may describe a reign, a floruit ("fl."), or a birth-only/death-only date when the
   * other endpoint isn't recorded. */
  lifespanLabel?: string;
  /** How firmly the lifespan dates are established — same scale and philosophy as
   * TimelineEvent.dateCertainty: "firm" (independently anchored, e.g. by extra-biblical records),
   * "traditional" (the standard scholarly/religious dating, plausible but not independently anchored),
   * "disputed" (two or more seriously-defended date schemes exist), or "legendary" (the date rests on
   * late/apocryphal sources rather than an early historical record). */
  lifespanCertainty?: "firm" | "traditional" | "disputed" | "legendary";
  /** How the lifespan dates were derived, including caveats, textual variants, or competing chronologies
   * — rendered as its own "Dating" section, same convention as TimelineEvent.datingNotes. */
  lifespanDatingNotes?: string;
  /** Which stream of history this person belongs to. Absent means "biblical", so every person
   * carried over from the original Atlas dataset is unaffected.
   * - "biblical": named in Scripture. `verses` holds real Bible references, rendered as links into
   *   the Bible panel, and the evidence section asks what survives *outside* the Bible.
   * - "church": a post-apostolic church-history figure (Augustine, Luther, Wesley, Bonhoeffer, ...),
   *   merged in from the standalone christian-history-atlas app. They are never named in Scripture,
   *   so `verses` stays empty and `quotes` carries citations from their own writings instead. */
  kind?: "biblical" | "church";
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
  /** Citations from this person's own writings, used instead of `verses` for kind: "church"
   * figures — who have no Bible references of their own. Rendered as plain citations, never as
   * links into the Bible panel. */
  quotes?: QuoteRef[];
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

/** Which historical stream a timeline event belongs to — drives its lane/color on the zoomable
 * timeline and the category tag in its details panel.
 * - "biblical": events narrated in Scripture itself, creation through the apostolic age.
 * - "church": church history proper — councils, creeds, schisms, key documents, institutional
 *   milestones, from the post-apostolic era onward.
 * - "world": surrounding world history that shaped or was shaped by the church.
 * - "movement": renewal/reform/revival/mission movements (monastic reform, the Great Awakenings,
 *   the modern missions movement, Pentecostalism, ...).
 * - "religion": milestones of other world religions.
 *
 * "church" and "movement" arrived with the christian-history-atlas merge; the other three predate
 * it and their events were left untouched. */
export type TimelineEventCategory = "biblical" | "church" | "world" | "movement" | "religion";

/** How firmly an event's date is established. Anything other than "firm" surfaces a small badge
 * next to the dateLabel in the details panel, so traditional/legendary material is never presented
 * with the same confidence as an anchored historical date (same philosophy as
 * ExtraBiblicalReference.reliability above).
 * - "firm": anchored by contemporary records/astronomy to within a year or so (e.g. 586 BC, AD 70).
 * - "traditional": the conventional scholarly/religious date, plausible but not independently anchored.
 * - "disputed": two or more seriously-defended dates exist — datingNotes should lay out the debate.
 * - "legendary": the event itself is legend/tradition rather than established history; the date is a
 *   later convention (e.g. Varro's 753 BC for the founding of Rome). */
export type TimelineDateCertainty = "firm" | "traditional" | "disputed" | "legendary";

/**
 * One event on the zoomable historical timeline — biblical history, surrounding world history, and
 * milestones of other world religions side by side. No map presence (like Topic); rendered in the
 * details panel by TimelineEventPanel and auto-linked from text as kind "timeline".
 */
export interface TimelineEvent {
  id: string;
  title: string;
  category: TimelineEventCategory;
  /** Free-text era grouping shown on the timeline, e.g. "United Monarchy", "Life of Christ". */
  era: string;
  /** Signed year: negative = BC, positive = AD (e.g. -586 = 586 BC, 70 = AD 70). There is no year 0.
   * For disputed dates this is the single "best/most conventional" year used to position the event. */
  startYear: number;
  /** Present only for events spanning years (reigns, exiles, wars) — same sign convention. */
  endYear?: number;
  /** Human-readable date shown in the panel header, e.g. "c. 1446 BC (early date) or c. 1260 BC (late date)". */
  dateLabel: string;
  dateCertainty: TimelineDateCertainty;
  /** One or two sentences — the hook shown right under the title. */
  summary: string;
  /** Main narrative. Paragraphs separated by blank lines ("\n\n") — person/location/POI/topic names
   * here get auto-linked, same convention as Person.lifeStory / TopicSection.paragraphs. */
  article: string;
  /** How we know (or don't know) when this happened — rendered as its own "Dating" section.
   * Required in spirit whenever dateCertainty is "disputed" or "legendary". */
  datingNotes?: string;
  /** Bible references, e.g. "2 Kings 25:8-21" — rendered as clickable verse links in References. */
  scriptureRefs?: string[];
  /** Non-biblical sources/witnesses, e.g. "Josephus, The Jewish War 6.249-270" or a URL. */
  externalRefs?: string[];
  /** Ids of the people/locations/POIs/topics most central to this event — for future "show related
   * entries" affordances; not required for the auto-linker, which matches on names in the text. */
  primaryEntityIds?: string[];
  /** DISPLAY ONLY, and only on the timeline canvas: the id of a wider "spanning" TimelineEvent that
   * stands in for this one there — at EVERY zoom level, unconditionally (see `canvasEvents` in
   * TimelineView.tsx). An event carrying this field never gets a mark of its own on the canvas.
   *
   * This changes NOTHING about the record itself. The event stays in `timelineEvents`, keeps its id,
   * its article and its route; it is still listed and searchable in Articles, still openable, and
   * still auto-linked from Bible passages and other articles. The only effect is on the canvas,
   * which draws the one spanning entry named here instead of this mark. "View in Timeline" and the
   * timeline's own search box therefore aim the canvas at the spanning entry instead of at this
   * event, so they never fly to something that was never drawn.
   *
   * The spanning entry is an ordinary TimelineEvent like any other — it is identified purely by
   * being named here, so there is no second field to keep in step. */
  collapsedInto?: string;
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

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
  /** Optional one-clause characterisation of *what kind* of source this is, shown as small muted
   * text after the label — e.g. "primary source, 1900 translation" vs "popular overview". Only
   * worth setting where the distinction genuinely changes how a reader should weigh the link;
   * most citations leave it off. */
  note?: string;
}

export interface Location {
  id: string;
  name: string;
  /** Phonetic respelling, e.g. "juh-ROO-suh-lem", shown next to the name. */
  pronunciation?: string;
  alternateNames?: string[];
  /** Wordings the LINKER should match but that must never be shown to a reader — see
   * `computeLinkAnnotations`. `alternateNames` is user-facing copy ("Also called: ..."), so the
   * near-duplicates a translation forces on us belong here instead: "James the son of Alphaeus"
   * AND "James, the son of Alphaeus", because Matthew and Mark punctuate it differently. Putting
   * those in `alternateNames` would print both to the reader, one comma apart. */
  matchNames?: string[];
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
  /** Other names/titles this person is called by in the text, e.g. "Simon Peter", "Cephas", "Simon".
   * SHOWN TO THE READER as "Also called: ..." — for match-only wordings use `matchNames` below. */
  alternateNames?: string[];
  /** Wordings the LINKER should match but that must never be shown to a reader — see
   * `computeLinkAnnotations`. `alternateNames` is user-facing copy ("Also called: ..."), so the
   * near-duplicates a translation forces on us belong here instead: "James the son of Alphaeus"
   * AND "James, the son of Alphaeus", because Matthew and Mark punctuate it differently. Putting
   * those in `alternateNames` would print both to the reader, one comma apart. */
  matchNames?: string[];
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
   *   so `verses` stays empty and `quotes` carries citations from their own writings instead.
   * - "world": a secular figure from the surrounding world who touches the biblical story without
   *   belonging to either stream — Mark Antony, who argued Herod onto the throne of Judea, is the
   *   first. Named in no Scripture and no church history, so `verses` stays empty, exactly as for
   *   "church". Follows the timeline's own "world" category, which already draws this line.
   *
   * Only "biblical" is treated specially by the app: PersonPanel titles the evidence section
   * "Extra-Biblical Evidence" for a biblical figure and "Historical Evidence" for everyone else, and
   * picks the matching wording for the no-record note. Adding a further non-biblical kind therefore
   * needs no change there beyond that test being written as "is it biblical", not "is it church". */
  kind?: "biblical" | "church" | "world";
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

/** Drives which icon/badge a Topic gets — not map-related (topics have no coordinates).
 *
 * "discovery" and "manuscript" are archaeology's two categories. They are categories on the
 * EXISTING Topic rather than two new record types on purpose: the reader-facing shape archaeology
 * needs — heading + paragraphs, verses, sources, a reflection prompt — is byte-for-byte what Topic
 * already is, while a sixth record kind would have to be threaded through 22 files including
 * `lib/verseAnnotations.ts`, the one file in this repo whose last bad change shipped 50 wrong
 * reader-facing links past both `npm run build` and `npm run test:linker`. The cheap option is also
 * the safe one.
 *
 * Where the line falls between the two, because it is a judgement call and it has to be made the
 * same way 150 times:
 *  - "discovery"  — a specific physical object or find, where the article leads with the find story.
 *                   A composition known only from excavated copies (Gilgamesh, Enuma Elish) belongs
 *                   here too, because its article leads with the excavation, not the text.
 *  - "manuscript" — a written witness to a biblical text: a specific codex or scroll, OR a named
 *                   textual tradition of the Bible (the Septuagint, the Masoretic Text), which
 *                   would otherwise have to be forced into a "one object" mould it does not fit.
 *  - "concept"    — anything considered apart from any object. */
export type TopicCategory =
  | "practice"
  | "doctrine"
  | "people-group"
  | "concept"
  | "discovery"
  | "manuscript";

/** How a source backing an article should be weighed, so the reader can tell a museum's own object
 * page from a Wikipedia article at a glance instead of meeting six identical-looking links.
 *
 * The tiers exist to be counted, not just displayed: an article on a contested object is only worth
 * something if the dispute is cited to the actual dissenting scholarship, and "encyclopedic" is its
 * own tier precisely so Wikipedia can be listed without being allowed to carry the article. */
export type CitationTier =
  /** The holding institution or the excavating body — museum object page, IAA release, excavation
   * project site. The closest thing to a primary witness the web offers for a physical object. */
  | "institution"
  /** Peer-reviewed publication, excavation report or academic monograph. Worth citing even where
   * the reader cannot open it: an unclickable checkable citation beats a clickable unverifiable
   * one, and `paywalled` says which it is. */
  | "scholarly"
  /** Public-domain primary text — Wikisource, Perseus, LacusCurtius, Sefaria, archive.org. */
  | "primary"
  /** Reputable popular or reference writing: Bible Odyssey, Britannica, the Biblical Archaeology
   * Society, a university press office. */
  | "reference"
  /** Wikipedia. */
  | "encyclopedic";

/** A tiered, creditable citation. Distinct from `SourceCitation` (a label and a link, used by the
 * other five record types) because "give credit to the source" needs the credit itself — who is
 * being cited, in what publication, and for which claim. */
export interface Citation {
  tier: CitationTier;
  label: string;
  /** Absent is legitimate: print-only scholarship is still checkable. */
  url?: string;
  /** Author or institution, as they should be credited on the page. */
  credit?: string;
  /** Bibliographic detail for a scholarly cite — journal, volume, year, pages. */
  detail?: string;
  /** True where the reader will hit a paywall, so nobody is sent into a dead end unwarned. */
  paywalled?: boolean;
  /** Which claim in the article this backs. Strongly encouraged on the disputes section: a dispute
   * cited to nothing is an assertion. */
  supports?: string;
}

/** Structured facts for `category: "discovery"`, rendered as a facts block above `sections` so the
 * same five things sit in the same place on every discovery article instead of being buried at a
 * different point in each one's prose. */
export interface DiscoveryFacts {
  /** What kind of object: "Basalt victory stele", "Clay bulla", "Limestone ossuary". "A stone" is
   * not an answer. */
  objectType: string;
  /** Where it was found, as a place name written for a reader. */
  findSite: string;
  /** Optional id of the Location or POI record for the find site, so the panel can offer "See this
   * place on the map". Must resolve to a real record — an unresolved id renders nothing rather
   * than a dead control, but it is still a data bug. */
  findSiteId?: string;
  findSiteKind?: "location" | "poi";
  /** Year or range the object was found: "1868", "1993 and 1994", "1947-1956". */
  foundYear: string;
  /** Who found it, credited as the sources credit them. "Unknown" and "credit is contested — see
   * below" are valid values; a guess is not. */
  foundBy: string;
  /** When the object itself dates from: "c. 840-835 BC". */
  objectDate: string;
  /** How firmly. Deliberately reuses TimelineDateCertainty so the app has ONE vocabulary for "how
   * sure are we about this date" rather than two that drift apart. */
  objectDateCertainty: TimelineDateCertainty;
  /** Museum or collection holding it now. "Destroyed", "Lost" and "Private collection" are
   * legitimate values. */
  currentLocation: string;
  /** Set ONLY where the object's authenticity is itself seriously disputed by specialists — the
   * James Ossuary, the Jehoash Inscription, the Shapira Scroll. Drives a visible badge; absent
   * means "authenticity not in question". */
  authenticityDisputed?: boolean;
  /** Set where the object has no excavation context — it surfaced on the antiquities market. A
   * real epistemic category rather than a slur, and one a reader deserves to be told about before
   * they weigh what the object proves. Drives a visible badge. */
  unprovenanced?: boolean;
}

/** Structured facts for `category: "manuscript"`. */
export interface ManuscriptFacts {
  /** Standard siglum where one exists: "P52", "01 / א", "1QIsaᵃ". Omitted where there is none.
   * Shown to the reader; NOT registered with the auto-linker — see `LINKED_TOPIC_CATEGORIES` in
   * lib/verseAnnotations.ts and the naming rules above it. */
  siglum?: string;
  /** "Papyrus codex", "Parchment uncial codex", "Leather scroll", "Minuscule". */
  manuscriptType: string;
  /** Language(s) of the text as written: "Koine Greek", "Hebrew", "Syriac", "Coptic (Sahidic)". */
  language: string;
  /** What is actually on it — the HONEST extent, not the ideal one. "John 18:31-33, 37-38 (both
   * sides of one fragment)" is the right level of detail; "the Gospel of John" is the blur that
   * produces the "we have the New Testament from AD 125" overclaim. */
  contents: string;
  /** Where it was written or copied. "Unknown" is a legitimate value. */
  origin?: string;
  findSite: string;
  foundYear: string;
  foundBy: string;
  /** The conventional date: "c. AD 125-175". */
  dateAssigned: string;
  dateCertainty: TimelineDateCertainty;
  currentLocation: string;
  /** Shelfmark or inventory number, where the holding institution publishes one. Without it a
   * citation cannot be checked, which defeats the point of citing. */
  shelfmark?: string;
  /** A free, legally viewable digital facsimile. The single highest-value field here: a reader can
   * look at Sinaiticus, Vaticanus or the Great Isaiah Scroll themselves, at full resolution, for
   * nothing. */
  facsimileUrl?: string;
}

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
  /** Wordings the LINKER should match but that must never be shown to a reader — see
   * `computeLinkAnnotations`. `alternateNames` is user-facing copy ("Also called: ..."), so the
   * near-duplicates a translation forces on us belong here instead: "James the son of Alphaeus"
   * AND "James, the son of Alphaeus", because Matthew and Mark punctuate it differently. Putting
   * those in `alternateNames` would print both to the reader, one comma apart. */
  matchNames?: string[];
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
  /** Present iff `category === "discovery"`. Optional on the type so the topics written before
   * archaeology existed still compile; required in practice for every discovery record. */
  discovery?: DiscoveryFacts;
  /** Present iff `category === "manuscript"`. */
  manuscript?: ManuscriptFacts;
  /** Tiered citations. Expected on every discovery/manuscript record and optional elsewhere —
   * which is a data rule, not a compiler one, because making it required would break all 58
   * topics that predate it. `sources` remains the general further-reading list. */
  citations?: Citation[];
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
  /** Linkable further reading, rendered as its own "Further Reading" section below References —
   * the same SourceCitation treatment the location/person/topic/POI panels use. Distinct from
   * externalRefs, which is bare bibliographic text (ancient witnesses, book titles). */
  sources?: SourceCitation[];
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
  /** Wordings the LINKER should match but that must never be shown to a reader — see
   * `computeLinkAnnotations`. `alternateNames` is user-facing copy ("Also called: ..."), so the
   * near-duplicates a translation forces on us belong here instead: "James the son of Alphaeus"
   * AND "James, the son of Alphaeus", because Matthew and Mark punctuate it differently. Putting
   * those in `alternateNames` would print both to the reader, one comma apart. */
  matchNames?: string[];
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

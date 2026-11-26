import { people } from "./people";
import { locations } from "./locations";
import { pois } from "./pois";
import { timelineEvents } from "./timelineEvents";
import { topics } from "./topics";
import { BOOKS } from "./bibleBooks";
import type { LocationCategory, TimelineDateCertainty, TimelineEvent, Topic, VerseRef } from "./types";

export type QuizDifficulty = "easy" | "moderate" | "difficult" | "impossible";
export type QuizCategory = "people" | "places" | "history" | "theology";
export type QuizTestament = "old" | "new" | "both" | null;

export interface QuizQuestion {
  /** Deterministic — derived from the source entity's id, never randomly generated. A room only
   * ever stores an array of these (game_rooms.question_ids); every client resolves the same id back
   * to the exact same prompt/choices/correctIndex from this same module, so nothing about a
   * question's content ever needs to travel over the network. */
  id: string;
  category: QuizCategory;
  /** Which testament this question's subject belongs to — "both"/null for cross-testament doctrines
   * and sites, and null for anything outside both (between the testaments, later church history, or a
   * subject with no verse to place it by). Drives the Old/New Testament topic filters (see
   * TOPIC_PRESETS); a strict filter only matches "old"/"new" exactly. */
  testament: QuizTestament;
  /** True for a question about someone who is not in Scripture (Person.kind "church" or "world").
   * Those stay in "All topics" but are left out of "People of the Bible". */
  extraBiblical?: boolean;
  difficulty: QuizDifficulty;
  points: 1 | 3 | 5 | 10;
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** The real Person/Location/PointOfInterest/TimelineEvent/Topic id this question was built from,
   * for an optional "Learn more" link after the question resolves. */
  entityId?: string;
  /** Lowercased free text (name, alternate names, role/tag/era, category label) — searched by the
   * custom-topic free-text search below. Not shown in the UI. */
  keywords: string;
}

export const DIFFICULTY_POINTS: Record<QuizDifficulty, 1 | 3 | 5 | 10> = {
  easy: 1,
  moderate: 3,
  difficult: 5,
  impossible: 10,
};

// ------------------------------------------------------------------------------------------------
// Deterministic PRNG — every question's distractor selection and choice order is seeded from its own
// id (FNV-1a hash -> mulberry32), so two independently-running clients (no server round trip) always
// derive byte-identical questions for the same id. Never use Math.random() inside a question builder.
// ------------------------------------------------------------------------------------------------

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededPick<T>(items: T[], count: number, rand: () => number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

/** Builds the final 4-choice array (correct + 3 distractors) in a seeded-random order, returning the
 * shuffled choices and where the correct one landed. */
function shuffleChoices(correct: string, distractors: string[], rand: () => number): { choices: string[]; correctIndex: number } {
  const entries = [{ text: correct, correct: true }, ...distractors.map((d) => ({ text: d, correct: false }))];
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  return { choices: entries.map((e) => e.text), correctIndex: entries.findIndex((e) => e.correct) };
}

/** A summary/fact/description sometimes names the very entity it's describing, which would give the
 * answer away outright — skip building a question from text like that. */
function textGivesAwayName(text: string, name: string): boolean {
  const firstToken = name.split(/[\s,]+/)[0];
  if (firstToken.length < 3) return false;
  return text.toLowerCase().includes(firstToken.toLowerCase());
}

// ------------------------------------------------------------------------------------------------
// One right answer — a question never offers a second choice that could also be defended as correct:
// no tied or overlapping dates, no broader or near-synonym label, no description that fits two
// records. Where the content cannot support that, the question is not built at all.
//
// A new generator, or a new entry in the content that two choices could describe, has to answer to
// this rule. The per-record lists below each restate something the record itself says.
// ------------------------------------------------------------------------------------------------

/** Swaps out, in place, any drawn distractor that could also be right. A draw with nothing wrong with
 * it is returned untouched, and replacements come from their own seeded stream, so the other choices
 * and the correct answer keep their positions. Null when there are not enough fit replacements. */
function replaceUnfit<T>(drawn: T[], pool: T[], isFit: (item: T) => boolean, id: string): T[] | null {
  const needed = drawn.filter((item) => !isFit(item)).length;
  if (needed === 0) return drawn;
  const spares = seededPick(
    pool.filter((item) => !drawn.includes(item) && isFit(item)),
    needed,
    mulberry32(hashSeed(`${id}:swap`))
  );
  if (spares.length < needed) return null;
  let next = 0;
  return drawn.map((item) => (isFit(item) ? item : spares[next++]));
}

/** Descriptions carried by more than one record — a "which one does this describe?" question built on
 * one of them has several right answers, whichever of the records happen to be among its choices. */
function sharedTexts(texts: (string | undefined)[]): Set<string> {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    if (seen.has(text)) shared.add(text);
    seen.add(text);
  }
  return shared;
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : `AD ${year}`;
}

const CERTAINTY_TO_DIFFICULTY: Record<TimelineDateCertainty, QuizDifficulty> = {
  firm: "easy",
  traditional: "moderate",
  disputed: "difficult",
  legendary: "impossible",
};
const CERTAINTY_RANK: Record<TimelineDateCertainty, number> = { firm: 0, traditional: 1, disputed: 2, legendary: 3 };

const LOCATION_CATEGORY_LABELS: Record<LocationCategory, string> = {
  city: "City",
  region: "Region",
  province: "Province",
  nation: "Nation",
  sea: "Sea",
  river: "River",
  mountain: "Mountain",
  island: "Island",
};

/** How well-attested/prominent an entry is, used as a difficulty proxy wherever there's no explicit
 * tier/certainty field to lean on (locations and POIs carry neither) — more verse references means
 * the place comes up more often in the text a reader already knows, i.e. it reads as "easier." */
function difficultyFromVerseCount(verseCount: number): QuizDifficulty {
  if (verseCount >= 8) return "easy";
  if (verseCount >= 4) return "moderate";
  if (verseCount >= 1) return "difficult";
  return "impossible";
}

// ------------------------------------------------------------------------------------------------
// Testament classification — BOOKS (src/data/bibleBooks.ts) lists all 66 books in canonical order,
// Genesis first and Matthew (index 39) starting the New Testament. Sorted longest-name-first so a
// multi-word book ("1 Kings", "Song of Solomon") matches before a shorter false-positive prefix would.
// ------------------------------------------------------------------------------------------------

const NT_START_INDEX = BOOKS.findIndex((b) => b.name === "Matthew");
const BOOKS_BY_LENGTH_DESC = [...BOOKS].sort((a, b) => b.name.length - a.name.length);

function testamentFromReference(reference: string): QuizTestament {
  const book = BOOKS_BY_LENGTH_DESC.find((b) => reference.startsWith(b.name));
  if (!book) return null;
  return BOOKS.indexOf(book) >= NT_START_INDEX ? "new" : "old";
}

function testamentFromVerses(verses: VerseRef[] | undefined): QuizTestament {
  if (!verses || verses.length === 0) return null;
  return testamentFromReference(verses[0].reference);
}

function testamentFromRefStrings(refs: string[] | undefined): QuizTestament {
  if (!refs || refs.length === 0) return null;
  return testamentFromReference(refs[0]);
}

/** Which testament a timeline event actually falls in. An intertestamental event is in neither, and
 * neither is anything after AD 100, even though such an entry may cite a verse that foreshadows or
 * explains it (Daniel for Alexander, John 1 for the Council of Nicaea) — a citation is not the event
 * being narrated there. Otherwise the first reference decides, then the sign of the year. */
function testamentFromEvent(event: TimelineEvent): QuizTestament {
  if (event.era === "Intertestamental Period" || event.startYear > 100) return null;
  return testamentFromRefStrings(event.scriptureRefs) ?? (event.startYear < 0 ? "old" : "new");
}

/** Points of interest carry no verse list, so their testament is read from each site's own
 * description in pois.ts: "old" or "new" when the Bible people or passages it names are all from
 * that testament, "both" when it names both, and neither when it names none (a site known from
 * Josephus or the Dead Sea Scrolls alone) or belongs to church history after the New Testament.
 * Anything not listed here is "new" — a newly added Old Testament site must be listed. */
const POI_TESTAMENT_EXCEPTIONS: Record<string, QuizTestament> = {
  "beth-shean": "old",
  bethel: "old",
  shiloh: "old",
  hebron: "old",
  beersheba: "old",
  "mount-sinai": "old",
  jericho: "both",
  megiddo: "both",
  shechem: "both",
  "city-of-david": "both",
  masada: null,
  qumran: null,
  sepphoris: null,
  "herod-winter-palace-jericho": null,
  "tower-of-david": null,
  "church-of-mary-ephesus": null,
  "martyrdom-site-polycarp-smyrna": null,
  "nicaea-council-site": null,
  "chalcedon-council-site": null,
  "catacombs-of-priscilla-rome": null,
  "catacombs-of-callixtus-rome": null,
  "megiddo-church": null,
  "dura-europos-house-church": null,
};

function isExtraBiblical(person: (typeof people)[number]): boolean {
  return person.kind !== undefined && person.kind !== "biblical";
}

function buildKeywords(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

// ------------------------------------------------------------------------------------------------
// Generators — each returns one QuizQuestion per eligible source entity. "Eligible" mostly means
// "has the field this question type needs, and there are at least 3 distinct distractors available."
// ------------------------------------------------------------------------------------------------

/** Roles that are also true of a person whose own role is worded differently. */
const PERSON_ALSO_ROLES: Record<string, string[]> = {
  // Catholic tradition counts Peter as the first pope.
  "simon-peter": ["Pope"],
};

/** True when `other` only restates `role`, or says it more broadly: "Apostle" for "Apostle who
 * betrayed Jesus", "King of Judah" for "King of Judah (not to be confused with …)". */
function isSameOrBroaderRole(other: string, role: string): boolean {
  const bare = (r: string) => r.replace(/\s*\(.*?\)/g, "").trim().toLowerCase();
  const [broad, full] = [bare(other), bare(role)];
  return full === broad || [" ", ",", ";"].some((separator) => full.startsWith(broad + separator));
}

function personRoleQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const person of people) {
    if (!person.role) continue;
    const sameTier = people.filter((p) => p.tier === person.tier && p.id !== person.id && p.role && p.role !== person.role);
    const distractorPool = [...new Set(sameTier.map((p) => p.role))];
    if (distractorPool.length < 3) continue;
    const id = `person-role-${person.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractors = replaceUnfit(
      seededPick(distractorPool, 3, rand),
      distractorPool,
      (role) => !isSameOrBroaderRole(role, person.role) && !PERSON_ALSO_ROLES[person.id]?.includes(role),
      id
    );
    if (!distractors) continue;
    const { choices, correctIndex } = shuffleChoices(person.role, distractors, rand);
    const difficulty: QuizDifficulty = person.tier === "major" ? "easy" : person.tier === "significant" ? "moderate" : "difficult";
    out.push({
      id,
      category: "people",
      testament: testamentFromVerses(person.verses),
      extraBiblical: isExtraBiblical(person),
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `What was ${person.name}'s role?`,
      choices,
      correctIndex,
      entityId: person.id,
      keywords: buildKeywords(person.name, ...(person.alternateNames ?? []), person.role, person.occupation),
    });
  }
  return out;
}

function personSummaryQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const shared = sharedTexts(people.map((p) => p.summary));
  for (const person of people) {
    if (!person.summary || shared.has(person.summary) || textGivesAwayName(person.summary, person.name)) continue;
    const sameTier = people.filter((p) => p.tier === person.tier && p.id !== person.id);
    if (sameTier.length < 3) continue;
    const id = `person-summary-${person.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractors = seededPick(sameTier, 3, rand).map((p) => p.name);
    const { choices, correctIndex } = shuffleChoices(person.name, distractors, rand);
    // "notable" figures with almost nothing recorded about them (see noExtraBiblicalRecordNote) make
    // for the hardest people questions — bumped a level past the plain tier mapping.
    const difficulty: QuizDifficulty =
      person.tier === "major" ? "easy" : person.tier === "significant" ? "moderate" : person.noExtraBiblicalRecordNote ? "impossible" : "difficult";
    out.push({
      id,
      category: "people",
      testament: testamentFromVerses(person.verses),
      extraBiblical: isExtraBiblical(person),
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `Who does this describe: "${person.summary}"?`,
      choices,
      correctIndex,
      entityId: person.id,
      keywords: buildKeywords(person.name, ...(person.alternateNames ?? []), person.role, person.occupation),
    });
  }
  return out;
}

/** Region, province and nation overlap (Macedonia, Edom, Egypt), so when one of them is the answer
 * the others are not offered, and neither is any of the three when the answer is an island. */
const AREA_CATEGORIES: LocationCategory[] = ["region", "province", "nation"];

/** Other kinds of place a location's own record also gives its name to. */
const LOCATION_ALSO_CATEGORIES: Record<string, LocationCategory[]> = {
  babylon: ["nation", "region"], // the city, and the empire named for it
  dan: ["region"], // the city, and the tribe's territory
  edom: ["mountain"], // also called Seir, as is its mountain
  gennesaret: ["sea"], // the plain, and the "lake of Gennesaret" (Luke 5:1)
  jezreel: ["region"], // the city, and the Jezreel Valley
  samaria: ["city"], // the region, and its capital
  sidon: ["region"], // "the region of Tyre and Sidon"
  succoth: ["region"], // Egyptian Tjeku names a district as well as a town
  tyre: ["region"],
};

/** Locations whose category cannot be asked about: Gadara is filed as a region (for "the region of
 * the Gadarenes") while its record describes a city. */
const LOCATION_CATEGORY_UNASKABLE = new Set(["gadara"]);

function isAlsoCategory(location: (typeof locations)[number], other: LocationCategory): boolean {
  const areasOverlap = AREA_CATEGORIES.includes(other) && (AREA_CATEGORIES.includes(location.category) || location.category === "island");
  return areasOverlap || (LOCATION_ALSO_CATEGORIES[location.id]?.includes(other) ?? false);
}

function locationCategoryQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const location of locations) {
    if (LOCATION_CATEGORY_UNASKABLE.has(location.id)) continue;
    const otherCategories = [...new Set(locations.filter((l) => l.category !== location.category).map((l) => l.category))];
    if (otherCategories.length < 3) continue;
    const id = `location-category-${location.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractorCategories = replaceUnfit(
      seededPick(otherCategories, 3, rand),
      otherCategories,
      (category) => !isAlsoCategory(location, category),
      id
    );
    if (!distractorCategories) continue;
    const { choices, correctIndex } = shuffleChoices(
      LOCATION_CATEGORY_LABELS[location.category],
      distractorCategories.map((c) => LOCATION_CATEGORY_LABELS[c]),
      rand
    );
    const difficulty = difficultyFromVerseCount(location.verses.length);
    out.push({
      id,
      category: "places",
      testament: testamentFromVerses(location.verses),
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `What kind of place is ${location.name}?`,
      choices,
      correctIndex,
      entityId: location.id,
      keywords: buildKeywords(location.name, ...(location.alternateNames ?? []), location.category, location.modernName),
    });
  }
  return out;
}

/** Places that a location's first notable fact would also fit — a wider area around it. */
const LOCATION_FACT_ALSO_FITS: Record<string, string[]> = {
  gadara: ["decapolis"], // Gadara was one of the Decapolis cities
};

function locationFactQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const shared = sharedTexts(locations.map((l) => l.history.notableFacts[0]));
  for (const location of locations) {
    const fact = location.history.notableFacts[0];
    if (!fact || shared.has(fact) || textGivesAwayName(fact, location.name)) continue;
    const otherNames = locations.filter((l) => l.id !== location.id).map((l) => l.name);
    if (otherNames.length < 3) continue;
    const id = `location-fact-${location.id}`;
    const rand = mulberry32(hashSeed(id));
    const alsoFits = locations.filter((l) => LOCATION_FACT_ALSO_FITS[location.id]?.includes(l.id)).map((l) => l.name);
    const distractors = replaceUnfit(seededPick(otherNames, 3, rand), otherNames, (name) => !alsoFits.includes(name), id);
    if (!distractors) continue;
    const { choices, correctIndex } = shuffleChoices(location.name, distractors, rand);
    const difficulty = difficultyFromVerseCount(location.verses.length);
    out.push({
      id,
      category: "places",
      testament: testamentFromVerses(location.verses),
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `Which place does this describe? "${fact}"`,
      choices,
      correctIndex,
      entityId: location.id,
      keywords: buildKeywords(location.name, ...(location.alternateNames ?? []), location.category, location.modernName),
    });
  }
  return out;
}

/** Tags that say how a site is regarded rather than what it is. Nearly any site could carry one, so
 * they are never offered as a wrong answer (each can still be the right one). */
const POI_UNFIT_AS_DISTRACTOR = new Set([
  "Ancient Site",
  "Archaeological Site",
  "Historical Site",
  "Modern Pilgrimage Site",
  "Monument",
  "Narrative Site — General Region",
  "Religious Site",
  "Traditional Site",
  "Traditional Site (Location Uncertain)",
  "UNESCO World Heritage Site",
]);

/** Tags close enough in meaning that one site can fit several. Two tags from the same family are never
 * offered in one question as the answer and a wrong answer. */
const POI_TAG_FAMILIES = {
  settlement: [
    "Ancient City",
    "Ancient Greek/Roman City",
    "Ancient Port",
    "Ancient Port City",
    "Ancient Settlement",
    "Ancient Town",
    "Decapolis City",
    "Fishing Village",
    "Fortress City",
    "Patriarchal Site",
    "Roman City",
    "Roman Port City",
  ],
  stronghold: ["Fortress", "Fortress City", "Palace", "Roman Garrison"],
  temple: ["Ancient Temple", "Ancient Wonder / Temple Ruins", "Pagan Cult Site"],
  church: ["Council Basilica", "Earliest Known Christian House-Church", "Early Christian Prayer Hall", "Rock-Cut Chapel"],
  council: ["Council Basilica", "Ecumenical Council Site"],
  road: ["Ancient Roman Road / Legendary Site", "Historic Street", "Waypoints on the Appian Way"],
} satisfies Record<string, string[]>;

type PoiTagFamily = keyof typeof POI_TAG_FAMILIES;

/** What else a site is, going by its own description in pois.ts, beyond what its tag says. Entries are
 * whole families or single tags. A new church, tomb or town site tagged only "Traditional Site" or
 * similar belongs here. */
const POI_ALSO_IS: Record<string, string[]> = (() => {
  const also: Record<string, string[]> = {
    "al-maghtas": ["settlement", "church"],
    antipatris: ["settlement", "stronghold"],
    "apollonia-macedonia": ["settlement"],
    "areopagus-athens": ["Sacred Mountain"],
    assos: ["stronghold"],
    bethel: ["temple"], // Jeroboam's calf shrine
    "caesarea-philippi": ["settlement"],
    "chalcedon-council-site": ["settlement"],
    "circus-of-nero-rome": ["Ancient Theatre", "Traditional Martyrdom Site"],
    "ecce-homo-arch": ["road"],
    "ein-karem": ["settlement"],
    emmaus: ["settlement"],
    "forum-of-appius-three-taverns": ["settlement"],
    "garden-tomb": ["church", "Catacomb"],
    golgotha: ["church", "Catacomb"],
    kursi: ["settlement", "church"],
    "mamertine-prison-rome": ["Traditional Martyrdom Site"],
    "martyrdom-site-polycarp-smyrna": ["Ancient Theatre", "Traditional Martyrdom Site"],
    megiddo: ["Sacred Mountain", "church"], // "Mount of Megiddo"; the Megiddo Church lies beside it
    "mount-of-beatitudes": ["Sacred Mountain"],
    "mount-precipice": ["Sacred Mountain"],
    "nicaea-council-site": ["settlement", "council"],
    shiloh: ["settlement", "temple"],
    "tomb-of-lazarus-bethany": ["church", "Catacomb"],
    "tomb-of-timothy-ephesus": ["Catacomb"],
    "tomb-of-virgin-mary-kidron": ["church", "Catacomb"],
    "western-wall": ["temple"],
  };
  const churchesAndChapels = [
    "appian-way-quo-vadis-rome",
    "bab-kisan-damascus",
    "basilica-of-annunciation-nazareth",
    "basilica-st-john",
    "basilica-st-paul-outside-walls-rome",
    "cave-church-st-peter-antioch",
    "cave-of-apocalypse-patmos",
    "chapel-of-ascension",
    "church-of-pater-noster",
    "dominus-flevit",
    "dormition-abbey",
    "house-of-ananias-damascus",
    "house-of-virgin-mary-ephesus",
    "marys-well-nazareth",
    "milk-grotto-bethlehem",
    "nazareth-synagogue-church",
    "st-peter-gallicantu",
    "tabgha",
    "upper-room",
    "wedding-church-cana",
  ];
  for (const id of churchesAndChapels) also[id] = ["church"];
  return also;
})();

/** Sites whose tag does not describe them: Acrocorinth is tagged a city and is the citadel hill above
 * Corinth. */
const POI_TAG_UNASKABLE = new Set(["acrocorinth"]);

function poiTagAlsoFits(poi: (typeof pois)[number], tag: string): boolean {
  if (POI_UNFIT_AS_DISTRACTOR.has(tag)) return true;
  const also = POI_ALSO_IS[poi.id] ?? [];
  if (also.includes(tag)) return true;
  return (Object.keys(POI_TAG_FAMILIES) as PoiTagFamily[]).some((family) => {
    const members: string[] = POI_TAG_FAMILIES[family];
    return members.includes(tag) && (members.includes(poi.tag) || also.includes(family));
  });
}

function poiTagQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const poi of pois) {
    if (POI_TAG_UNASKABLE.has(poi.id)) continue;
    const otherTags = [...new Set(pois.filter((p) => p.tag !== poi.tag).map((p) => p.tag))];
    if (otherTags.length < 3) continue;
    const id = `poi-tag-${poi.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractorTags = replaceUnfit(seededPick(otherTags, 3, rand), otherTags, (tag) => !poiTagAlsoFits(poi, tag), id);
    if (!distractorTags) continue;
    const { choices, correctIndex } = shuffleChoices(poi.tag, distractorTags, rand);
    // POIs are secondary/archaeological sites by design (lighter-weight than a full Location) — they
    // read as harder trivia regardless, split only by how well the site's history is sourced.
    const difficulty: QuizDifficulty = poi.sources && poi.sources.length > 0 ? "difficult" : "impossible";
    out.push({
      id,
      category: "places",
      testament: Object.hasOwn(POI_TESTAMENT_EXCEPTIONS, poi.id) ? POI_TESTAMENT_EXCEPTIONS[poi.id] : "new",
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `What is ${poi.name}?`,
      choices,
      correctIndex,
      entityId: poi.id,
      keywords: buildKeywords(poi.name, ...(poi.alternateNames ?? []), poi.tag, poi.modernName),
    });
  }
  return out;
}

// Trivia only draws on biblical-history events — "world" and "religion" category entries exist in
// the Timeline view for context (surrounding world history, other world religions' milestones) but
// aren't meant to be quizzed on here.
const biblicalTimelineEvents = timelineEvents.filter((e) => e.category === "biblical");

/** Competing dates a timeline record states in its own dateLabel or datingNotes, as [earliest,
 * latest] signed years. A wrong-answer year must not fall on or near one. */
const EVENT_ALTERNATIVE_YEARS: Record<string, [number, number][]> = {
  "bib-prim-enoch": [[-3317, -3017]], // the whole of his walk with God
  "bib-exo-the-exodus": [[-1299, -1200]], // late date
  "bib-exo-giving-of-the-law": [[-1299, -1200]],
  "bib-exo-death-of-moses": [[-1299, -1200]],
  "bib-cj-jordan-crossing": [[-1299, -1200]],
  "bib-cj-fall-of-jericho": [[-1299, -1200]],
  "bib-cj-achan-ai": [[-1299, -1200]],
  "bib-cj-southern-campaign": [[-1299, -1200]],
  "bib-cj-northern-campaign-hazor": [[-1299, -1200]],
  "bib-cj-ruth": [[-1199, -1100]], // "c. 1100s BC"
  "bib-er-ezras-return": [[-398, -398]], // under Artaxerxes II
  "bib-er-malachis-ministry": [[-460, -440]],
  "bib-it-septuagint-translation": [[-285, -246]], // reign of Ptolemy II
  "bib-it-pharisees-sadducees-essenes-rise": [[-300, -201]],
  "bib-dki-jonah-nineveh": [[-793, -753]], // reign of Jeroboam II
  "bib-dkj-nahum-nineveh": [[-663, -612]],
  "bib-dkj-obadiah-edom": [[-586, -586]],
  "bib-dkj-joel-prophecy": [[-500, -401]], // postexilic date
};
/** How far a wrong-answer year has to be from every date the record gives. */
const YEAR_CLEARANCE = 25;

/** False for the year zero, which does not exist, and for any year inside or close to the event's
 * span or one of its competing dates. */
function isWrongYear(event: TimelineEvent, year: number): boolean {
  if (year === 0) return false;
  const dates: [number, number][] = [[event.startYear, event.endYear ?? event.startYear], ...(EVENT_ALTERNATIVE_YEARS[event.id] ?? [])];
  return dates.every(([earliest, latest]) => year <= earliest - YEAR_CLEARANCE || year >= latest + YEAR_CLEARANCE);
}

function timelineYearQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const event of biblicalTimelineEvents) {
    const id = `history-year-${event.id}`;
    const rand = mulberry32(hashSeed(id));
    const magnitude = Math.max(50, Math.round(Math.abs(event.startYear) * 0.05));
    const deltaCandidates = [magnitude, -magnitude, magnitude * 2, -magnitude * 2, magnitude * 4, -magnitude * 4];
    // The first three in the seeded order, with any that could be defended swapped for a later one.
    const years = [...new Set(seededPick(deltaCandidates, deltaCandidates.length, rand).map((delta) => event.startYear + delta))];
    const spares = years.slice(3).filter((year) => isWrongYear(event, year));
    const distractorYears = years.slice(0, 3).map((year) => (isWrongYear(event, year) ? year : spares.shift()));
    if (distractorYears.length < 3 || !distractorYears.every((year) => year !== undefined)) continue;
    const distractors = distractorYears.map(formatYear);
    const { choices, correctIndex } = shuffleChoices(formatYear(event.startYear), distractors, rand);
    const difficulty = CERTAINTY_TO_DIFFICULTY[event.dateCertainty];
    out.push({
      id,
      category: "history",
      testament: testamentFromEvent(event),
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `About what year did "${event.title}" happen?`,
      choices,
      correctIndex,
      entityId: event.id,
      keywords: buildKeywords(event.title, event.era, event.category),
    });
  }
  return out;
}

function timelineOrderQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const byEra = new Map<string, typeof timelineEvents>();
  for (const event of biblicalTimelineEvents) {
    const group = byEra.get(event.era) ?? [];
    group.push(event);
    byEra.set(event.era, group);
  }
  for (const [era, events] of byEra) {
    const eraSlug = era.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const chunkCount = Math.floor(events.length / 4);
    for (let chunk = 0; chunk < chunkCount; chunk++) {
      const id = `history-order-${eraSlug}-${chunk}`;
      const rand = mulberry32(hashSeed(id));
      const drawn = seededPick(events, 4, rand);
      const earliest = drawn.reduce((min, e) => (e.startYear < min.startYear ? e : min));
      // "Earliest" has one answer only if it is over before any other choice begins. Events sharing
      // its year, or starting while it is still going on, are swapped for later ones from the same
      // era; when the era has too few, there is no question.
      const earliestEnd = earliest.endYear ?? earliest.startYear;
      const group = replaceUnfit(drawn, events, (e) => e === earliest || e.startYear > earliestEnd, id);
      if (!group) continue;
      const distractors = group.filter((e) => e.id !== earliest.id).map((e) => e.title);
      const { choices, correctIndex } = shuffleChoices(earliest.title, distractors, rand);
      const worstCertainty = group.reduce(
        (worst, e) => (CERTAINTY_RANK[e.dateCertainty] > CERTAINTY_RANK[worst] ? e.dateCertainty : worst),
        "firm" as TimelineDateCertainty
      );
      const difficulty = CERTAINTY_TO_DIFFICULTY[worstCertainty];
      // Only meaningfully "old"/"new" if every event in the group agrees — a group can still straddle
      // both testaments (e.g. an era spanning Malachi into the Gospels).
      const testaments = new Set(group.map(testamentFromEvent));
      const testament: QuizTestament = testaments.size === 1 ? [...testaments][0] : "both";
      out.push({
        id,
        category: "history",
        testament,
        difficulty,
        points: DIFFICULTY_POINTS[difficulty],
        prompt: "Which of these four events happened earliest?",
        choices,
        correctIndex,
        keywords: buildKeywords(era, ...group.map((e) => e.title)),
      });
    }
  }
  return out;
}

/** Which quiz category a Topic-derived question actually belongs to.
 *
 * Topics cover four kinds of subject (see TopicCategory in types.ts), and only three of them are
 * theological. The "people-group" topics — Israelites, Pharisees, Philistines, Assyrians, Romans,
 * Gentiles and the rest — are questions about *who a group of people was*, which is a People
 * question, not a doctrine question. Filing all 31 topics under Theology meant the Theology preset
 * was ~59% "which people group was X?", which is exactly what it was reported as being. Doctrines,
 * practices, and concepts stay in Theology; people groups go where they belong.
 *
 * Question *ids* are deliberately left alone ("theology-role-<topic>") even for the reclassified
 * ones — ids are opaque keys already written into existing game_rooms.question_ids rows, and
 * renaming them would break any in-flight or replayed room. */
const TOPIC_QUIZ_CATEGORY: Record<Topic["category"], QuizCategory> = {
  practice: "theology",
  doctrine: "theology",
  concept: "theology",
  "people-group": "people",
  // Archaeology. "Which object bears the name of Pontius Pilate?" is a history question, not a
  // doctrine question, and filing ~150 of them under Theology would repeat exactly the failure the
  // people-group split above was written to fix — only three times the size. Stated here rather
  // than left to fall through a default, so a new category cannot join Theology by accident: this
  // is a Record over the union, so adding one is a compile error until someone answers for it.
  discovery: "history",
  manuscript: "history",
};

function topicQuizCategory(topic: (typeof topics)[number]): QuizCategory {
  return TOPIC_QUIZ_CATEGORY[topic.category];
}

function theologyRoleQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const topic of topics) {
    if (!topic.role) continue;
    const others = topics.filter((t) => t.id !== topic.id && t.role && t.role !== topic.role);
    const distractorPool = [...new Set(others.map((t) => t.role))];
    if (distractorPool.length < 3) continue;
    const id = `theology-role-${topic.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractors = seededPick(distractorPool, 3, rand);
    const { choices, correctIndex } = shuffleChoices(topic.role, distractors, rand);
    out.push({
      id,
      category: topicQuizCategory(topic),
      // Doctrines/practices/people-groups generally span or transcend a single testament.
      testament: "both",
      difficulty: "moderate",
      points: DIFFICULTY_POINTS.moderate,
      prompt: `What best describes "${topic.name}"?`,
      choices,
      correctIndex,
      entityId: topic.id,
      keywords: buildKeywords(topic.name, ...(topic.alternateNames ?? []), topic.role, topic.category),
    });
  }
  return out;
}

/** Collections that a single item's description would also fit. */
const TOPIC_PART_OF: Record<string, string> = {
  "papyrus-66": "bodmer-papyri",
  "papyrus-72": "bodmer-papyri",
  "papyrus-75": "bodmer-papyri",
};

function theologySummaryQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const shared = sharedTexts(topics.map((t) => t.summary));
  for (const topic of topics) {
    if (!topic.summary || shared.has(topic.summary) || textGivesAwayName(topic.summary, topic.name)) continue;
    const others = topics.filter((t) => t.id !== topic.id).map((t) => t.name);
    if (others.length < 3) continue;
    const id = `theology-summary-${topic.id}`;
    const rand = mulberry32(hashSeed(id));
    const collection = topics.find((t) => t.id === TOPIC_PART_OF[topic.id])?.name;
    const distractors = replaceUnfit(seededPick(others, 3, rand), others, (name) => name !== collection, id);
    if (!distractors) continue;
    const { choices, correctIndex } = shuffleChoices(topic.name, distractors, rand);
    out.push({
      id,
      category: topicQuizCategory(topic),
      testament: "both",
      difficulty: "difficult",
      points: DIFFICULTY_POINTS.difficult,
      prompt: `Which topic does this describe: "${topic.summary}"?`,
      choices,
      correctIndex,
      entityId: topic.id,
      keywords: buildKeywords(topic.name, ...(topic.alternateNames ?? []), topic.role, topic.category),
    });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Core doctrine bank — the only hand-written questions in this module.
//
// Everything else here is generated from the app's own content (people/locations/pois/timeline/
// topics), which is great for recall questions but can't produce a genuine doctrine question: the
// content simply doesn't contain "what does justification mean?" anywhere to derive one from. So the
// Theology preset is topped up with a hand-written bank covering the standard loci — theology proper,
// Christology, pneumatology, soteriology, hamartiology, ecclesiology, eschatology, the creeds and the
// classical heresies.
//
// Rule for anything added here: the answer has to be objectively checkable, not a position in a live
// intra-Christian argument. Where a doctrine is genuinely disputed across traditions (predestination,
// baptismal mode and subjects, the millennium, eucharistic presence), the question is either left out
// or reframed around what a *named* creed, council, or tradition actually teaches — "the Nicene Creed
// confesses…", "Chalcedon defines…", "the Filioque dispute concerns…" — which has one right answer no
// matter which pew the player sits in. Definitional questions ("what does X mean?") are fine even for
// terms that live inside one tradition's vocabulary, since the term's meaning isn't the disputed part.
// ------------------------------------------------------------------------------------------------

interface DoctrineQuestionSeed {
  /** Becomes `theology-core-<slug>`; must be stable forever once shipped (ids go into room rows). */
  slug: string;
  difficulty: QuizDifficulty;
  prompt: string;
  answer: string;
  distractors: [string, string, string];
  /** Extra free-text for the custom-topic search, on top of the prompt/answer words. */
  keywords?: string;
}

const DOCTRINE_QUESTIONS: DoctrineQuestionSeed[] = [
  // --- easy ---------------------------------------------------------------------------------------
  {
    slug: "incarnation-term",
    difficulty: "easy",
    prompt: "Which term names the Christian teaching that the eternal Son of God took on human nature in Jesus Christ?",
    answer: "The Incarnation",
    distractors: ["The Ascension", "The Transfiguration", "The Annunciation"],
    keywords: "incarnation christology jesus divine human nature",
  },
  {
    slug: "trinity-persons",
    difficulty: "easy",
    prompt: "The doctrine of the Trinity confesses one God in how many persons?",
    answer: "Three",
    distractors: ["Two", "Four", "Seven"],
    keywords: "trinity father son holy spirit persons godhead",
  },
  {
    slug: "gospel-meaning",
    difficulty: "easy",
    prompt: "The word \"gospel\" translates a Greek word meaning what?",
    answer: "Good news",
    distractors: ["Holy law", "Sacred writing", "Chosen people"],
    keywords: "gospel euangelion good news preaching",
  },
  {
    slug: "grace-definition",
    difficulty: "easy",
    prompt: "In Christian theology, \"grace\" is best defined as what?",
    answer: "God's unearned favor toward people who have not merited it",
    distractors: [
      "A reward God owes to those who keep his law",
      "A vow of poverty taken by monks and nuns",
      "A formal decision issued by a church council",
    ],
    keywords: "grace favor unmerited soteriology",
  },
  {
    slug: "resurrection-doctrine",
    difficulty: "easy",
    prompt: "What does the Christian doctrine of the resurrection of Christ affirm?",
    answer: "That Jesus was raised bodily from the dead",
    distractors: [
      "That Jesus' teachings live on in his followers",
      "That Jesus was taken up to heaven without ever dying",
      "That Jesus' soul survived while his body stayed in the tomb",
    ],
    keywords: "resurrection easter bodily risen christology",
  },
  {
    slug: "monotheism",
    difficulty: "easy",
    prompt: "To call a religion \"monotheistic\" means it teaches what?",
    answer: "That there is only one God",
    distractors: [
      "That many gods exist but one rules the others",
      "That God and the universe are the same thing",
      "That the world had no creator at all",
    ],
    keywords: "monotheism theology proper one god polytheism pantheism",
  },
  {
    slug: "atonement-term",
    difficulty: "easy",
    prompt: "In Christian theology, \"atonement\" refers to what?",
    answer: "The reconciling of sinners to God through the work of Christ",
    distractors: [
      "The ranking of angels into orders",
      "The arrangement of a worship service",
      "The copying and preservation of biblical manuscripts",
    ],
    keywords: "atonement reconciliation cross soteriology",
  },
  {
    slug: "second-coming",
    difficulty: "easy",
    prompt: "Which term names the Christian expectation that Christ will return in glory?",
    answer: "The Second Coming",
    distractors: ["The Transfiguration", "Pentecost", "The Ascension"],
    keywords: "second coming parousia return eschatology advent",
  },
  {
    slug: "creed-definition",
    difficulty: "easy",
    prompt: "The Apostles' Creed and the Nicene Creed are examples of what?",
    answer: "Creeds — short summaries of Christian belief confessed by the church",
    distractors: [
      "Books of the New Testament",
      "Letters written by the apostle Paul",
      "Rules governing monastic communities",
    ],
    keywords: "creed apostles nicene confession symbol of faith",
  },
  {
    slug: "creation-term",
    difficulty: "easy",
    prompt: "Which doctrine concerns God bringing the universe into existence?",
    answer: "Creation",
    distractors: ["Redemption", "Revelation", "Glorification"],
    keywords: "creation creator genesis doctrine",
  },
  {
    slug: "salvation-term",
    difficulty: "easy",
    prompt: "In Christian theology, \"salvation\" most basically means what?",
    answer: "Being rescued from sin and its consequences",
    distractors: [
      "Achieving wealth and long life",
      "Memorizing large portions of Scripture",
      "Being appointed to an office in the church",
    ],
    keywords: "salvation saved soteriology rescue sin",
  },

  // --- moderate -----------------------------------------------------------------------------------
  {
    slug: "original-sin",
    difficulty: "moderate",
    prompt: "Which term names the teaching that human beings come into the world already under a condition of sin traced to Adam?",
    answer: "Original sin",
    distractors: ["Ritual impurity", "Apostasy", "Blasphemy"],
    keywords: "original sin adam fall hamartiology",
  },
  {
    slug: "omniscience",
    difficulty: "moderate",
    prompt: "Which divine attribute means that God knows all things?",
    answer: "Omniscience",
    distractors: ["Omnipotence", "Omnipresence", "Immutability"],
    keywords: "omniscience attributes of god knowledge theology proper",
  },
  {
    slug: "immutability",
    difficulty: "moderate",
    prompt: "Which divine attribute means that God does not change?",
    answer: "Immutability",
    distractors: ["Impassibility", "Omnipresence", "Omniscience"],
    keywords: "immutability unchanging attributes of god",
  },
  {
    slug: "justification-definition",
    difficulty: "moderate",
    prompt: "The doctrine of justification deals with which question?",
    answer: "How a sinner comes to stand righteous before God",
    distractors: [
      "How the church chooses its leaders",
      "How the books of the Bible were collected",
      "How history will finally come to an end",
    ],
    keywords: "justification righteousness soteriology forensic",
  },
  {
    slug: "sanctification-definition",
    difficulty: "moderate",
    prompt: "In Christian theology, sanctification refers to what?",
    answer: "The process of being made holy",
    distractors: [
      "The moment of physical death",
      "The public reading of Scripture in worship",
      "The ordination of clergy",
    ],
    keywords: "sanctification holiness growth soteriology",
  },
  {
    slug: "eschatology-definition",
    difficulty: "moderate",
    prompt: "\"Eschatology\" is the branch of theology that studies what?",
    answer: "Last things — death, judgment, and the age to come",
    distractors: ["The church", "The Holy Spirit", "The doctrine of salvation"],
    keywords: "eschatology last things end times judgment",
  },
  {
    slug: "christology-definition",
    difficulty: "moderate",
    prompt: "\"Christology\" is the branch of theology that studies what?",
    answer: "The person and work of Christ",
    distractors: ["The end times", "The sacraments", "The angels"],
    keywords: "christology jesus person work doctrine",
  },
  {
    slug: "ecclesiology-definition",
    difficulty: "moderate",
    prompt: "\"Ecclesiology\" is the branch of theology that studies what?",
    answer: "The church — its nature, marks, and mission",
    distractors: ["Scripture and its inspiration", "Sin and the fall", "Prophecy and fulfillment"],
    keywords: "ecclesiology church doctrine body of christ",
  },
  {
    slug: "revelation-definition",
    difficulty: "moderate",
    prompt: "In Christian theology, \"revelation\" refers to what?",
    answer: "God making himself known to human beings",
    distractors: [
      "The church's system of government",
      "The practice of fasting before a feast day",
      "Human reasoning about God apart from any disclosure",
    ],
    keywords: "revelation disclosure god makes known doctrine",
  },
  {
    slug: "covenant-definition",
    difficulty: "moderate",
    prompt: "In biblical theology, a \"covenant\" is best described as what?",
    answer: "A binding relationship, with promises and obligations, that God establishes with his people",
    distractors: [
      "A tax paid for the upkeep of the temple",
      "A Roman legal contract for the sale of land",
      "A form of Hebrew poetry using parallel lines",
    ],
    keywords: "covenant berith promise abraham sinai new covenant",
  },
  {
    slug: "providence-definition",
    difficulty: "moderate",
    prompt: "The doctrine of providence concerns what?",
    answer: "God's ongoing preserving and governing of what he has created",
    distractors: [
      "God's act of bringing the world into being",
      "God's final judgment of the nations",
      "God's giving of the law at Sinai",
    ],
    keywords: "providence preservation government creation doctrine",
  },
  {
    slug: "repentance-definition",
    difficulty: "moderate",
    prompt: "In Christian theology, repentance means what?",
    answer: "A change of mind and heart that turns from sin toward God",
    distractors: [
      "Paying a fine set by the church",
      "Reciting a creed in public worship",
      "Fasting for a fixed period each year",
    ],
    keywords: "repentance metanoia turning conversion",
  },
  {
    slug: "nicene-consubstantial",
    difficulty: "moderate",
    prompt: "The Nicene Creed confesses that the Son is what, in relation to the Father?",
    answer: "Of one substance (consubstantial) with the Father",
    distractors: [
      "The first and highest of God's creatures",
      "A human being adopted as Son at his baptism",
      "One of three modes in which one person appears",
    ],
    keywords: "nicene creed homoousios consubstantial son father trinity",
  },
  {
    slug: "arianism",
    difficulty: "moderate",
    prompt: "Which teaching, condemned in the fourth century, held that the Son was a created being and not fully divine?",
    answer: "Arianism",
    distractors: ["Docetism", "Pelagianism", "Montanism"],
    keywords: "arianism arius heresy nicaea son created",
  },
  {
    slug: "docetism",
    difficulty: "moderate",
    prompt: "Which early error denied that Christ had a real, physical human body, holding that he only seemed to?",
    answer: "Docetism",
    distractors: ["Arianism", "Modalism", "Donatism"],
    keywords: "docetism heresy body flesh christology seemed",
  },
  {
    slug: "reformation-solas",
    difficulty: "moderate",
    prompt: "The slogans sola gratia (\"grace alone\") and sola fide (\"faith alone\") are associated with which movement?",
    answer: "The Protestant Reformation",
    distractors: ["The Second Vatican Council", "The Great Schism of 1054", "The Council of Jerusalem in Acts 15"],
    keywords: "reformation sola gratia fide scriptura luther protestant",
  },
  {
    slug: "incarnation-literal",
    difficulty: "moderate",
    prompt: "The word \"incarnation\" literally means what?",
    answer: "Becoming flesh",
    distractors: ["Rising again", "Being anointed", "Being sent out"],
    keywords: "incarnation carnis flesh john 1:14 word became flesh",
  },
  {
    slug: "the-fall",
    difficulty: "moderate",
    prompt: "In Christian theology, \"the fall\" refers to what?",
    answer: "Humanity's turn into sin through Adam and Eve's disobedience",
    distractors: [
      "The collapse of Jerusalem's walls under Nebuchadnezzar",
      "The destruction of the second temple in AD 70",
      "The scattering of the nations at Babel",
    ],
    keywords: "fall adam eve eden disobedience sin hamartiology",
  },
  {
    slug: "redemption-image",
    difficulty: "moderate",
    prompt: "The word \"redemption\" carries which underlying image?",
    answer: "Being bought back, or ransomed, out of bondage",
    distractors: [
      "Being declared not guilty in a courtroom",
      "Being taken into a family as an heir",
      "Being washed clean of defilement",
    ],
    keywords: "redemption ransom bought back slavery soteriology",
  },
  {
    slug: "apostles-creed-communion",
    difficulty: "moderate",
    prompt: "\"The communion of saints\" and \"the forgiveness of sins\" are phrases from which widely recited creed?",
    answer: "The Apostles' Creed",
    distractors: ["The Chalcedonian Definition", "The Athanasian Creed", "The Westminster Confession"],
    keywords: "apostles creed communion of saints forgiveness confession",
  },
  {
    slug: "baptism-universal-rite",
    difficulty: "moderate",
    prompt: "Which rite, commanded in Matthew 28:19, is practiced by virtually every Christian tradition as the sign of entry into the church?",
    answer: "Baptism",
    distractors: ["Foot washing", "Anointing of kings", "Pilgrimage to Jerusalem"],
    keywords: "baptism great commission sacrament ordinance initiation",
  },

  // --- difficult ----------------------------------------------------------------------------------
  {
    slug: "propitiation",
    difficulty: "difficult",
    prompt: "\"Propitiation\" specifically refers to what?",
    answer: "The turning aside of God's wrath by means of a sacrifice",
    distractors: [
      "The freeing of a slave by payment of a price",
      "The declaring of a defendant righteous",
      "The adoption of an outsider as a legal heir",
    ],
    keywords: "propitiation wrath sacrifice hilasterion atonement",
  },
  {
    slug: "expiation",
    difficulty: "difficult",
    prompt: "In contrast to propitiation, \"expiation\" puts the emphasis on what?",
    answer: "The removal or covering of sin itself",
    distractors: [
      "The appeasing of divine anger",
      "The purchase of freedom from slavery",
      "The imputing of righteousness to a believer",
    ],
    keywords: "expiation atonement covering sin removal",
  },
  {
    slug: "aseity",
    difficulty: "difficult",
    prompt: "Which divine attribute is named by the term \"aseity\"?",
    answer: "God's self-existence — that he depends on nothing outside himself",
    distractors: [
      "God's presence at every point of creation",
      "God's changelessness across time",
      "God's exhaustive knowledge of all things",
    ],
    keywords: "aseity self existence independence attributes of god",
  },
  {
    slug: "chalcedon-definition",
    difficulty: "difficult",
    prompt: "The Chalcedonian Definition (AD 451) confesses Christ as what?",
    answer: "One person in two natures, fully divine and fully human",
    distractors: [
      "Two persons joined in a single nature",
      "One nature formed by blending divinity and humanity",
      "A human being permanently indwelt by a divine power",
    ],
    keywords: "chalcedon 451 two natures one person hypostatic christology",
  },
  {
    slug: "hypostatic-union",
    difficulty: "difficult",
    prompt: "The term \"hypostatic union\" refers to what?",
    answer: "The union of divine and human natures in the one person of Christ",
    distractors: [
      "The union of Father, Son, and Spirit in one divine essence",
      "The union of Christ with his church as head and body",
      "The union of soul and body in every human being",
    ],
    keywords: "hypostatic union natures person christ chalcedon",
  },
  {
    slug: "modalism",
    difficulty: "difficult",
    prompt: "Which Trinitarian error treats Father, Son, and Spirit as three modes or masks of a single person rather than three distinct persons?",
    answer: "Modalism (Sabellianism)",
    distractors: ["Arianism", "Tritheism", "Subordinationism"],
    keywords: "modalism sabellianism patripassianism trinity heresy modes",
  },
  {
    slug: "adoptionism",
    difficulty: "difficult",
    prompt: "Which early error held that Jesus was an ordinary man who was made God's Son at a point in his life, such as his baptism?",
    answer: "Adoptionism",
    distractors: ["Docetism", "Modalism", "Apollinarianism"],
    keywords: "adoptionism heresy baptism sonship christology",
  },
  {
    slug: "theodicy",
    difficulty: "difficult",
    prompt: "A \"theodicy\" is an attempt to address which problem?",
    answer: "How a good and all-powerful God can permit evil and suffering",
    distractors: [
      "How Scripture should be interpreted across cultures",
      "How the church ought to be governed",
      "How prophecy is verified after the fact",
    ],
    keywords: "theodicy problem of evil suffering leibniz apologetics",
  },
  {
    slug: "soteriology-definition",
    difficulty: "difficult",
    prompt: "\"Soteriology\" is the branch of theology dealing with what?",
    answer: "Salvation",
    distractors: ["The Holy Spirit", "Creation", "The sacraments"],
    keywords: "soteriology salvation doctrine loci",
  },
  {
    slug: "pneumatology-definition",
    difficulty: "difficult",
    prompt: "\"Pneumatology\" is the branch of theology dealing with what?",
    answer: "The Holy Spirit",
    distractors: ["The soul's state after death", "The angelic hierarchy", "The breathing prayers of the desert monks"],
    keywords: "pneumatology holy spirit doctrine loci",
  },
  {
    slug: "hermeneutics-definition",
    difficulty: "difficult",
    prompt: "\"Hermeneutics\" names which discipline?",
    answer: "The theory and method of interpreting texts",
    distractors: [
      "The copying and transmission of manuscripts",
      "The comparison of competing Bible translations",
      "The composition and delivery of sermons",
    ],
    keywords: "hermeneutics interpretation exegesis method scripture",
  },
  {
    slug: "general-revelation",
    difficulty: "difficult",
    prompt: "\"General revelation\" refers to what?",
    answer: "What can be known of God through creation and conscience, available to everyone",
    distractors: [
      "The public reading of Scripture in worship",
      "The visions recorded in the book of Revelation",
      "Prophecies given to named individuals",
    ],
    keywords: "general revelation natural creation conscience romans 1 special",
  },
  {
    slug: "kenosis",
    difficulty: "difficult",
    prompt: "\"Kenosis,\" drawn from Philippians 2, refers to what?",
    answer: "Christ's self-emptying in taking the form of a servant",
    distractors: [
      "The filling of believers with the Spirit at Pentecost",
      "The emptiness of the tomb on Easter morning",
      "The pouring out of God's wrath in judgment",
    ],
    keywords: "kenosis philippians 2 self emptying servant christology",
  },
  {
    slug: "perichoresis",
    difficulty: "difficult",
    prompt: "In Trinitarian theology, \"perichoresis\" describes what?",
    answer: "The mutual indwelling of the three persons in one another",
    distractors: [
      "The procession of the Spirit from the Father",
      "The ordering of the persons in the work of salvation",
      "The distinction between God's essence and his energies",
    ],
    keywords: "perichoresis circumincession mutual indwelling trinity",
  },
  {
    slug: "imago-dei",
    difficulty: "difficult",
    prompt: "The phrase \"imago Dei\" refers to what?",
    answer: "Humanity's creation in the image of God",
    distractors: [
      "The veneration of painted icons in worship",
      "The seal of the Spirit given at baptism",
      "The likeness of Christ displayed in the sacrament",
    ],
    keywords: "imago dei image of god genesis 1:27 anthropology dignity",
  },
  {
    slug: "filioque",
    difficulty: "difficult",
    prompt: "The \"Filioque\" clause, long disputed between the Eastern and Western churches, concerns which question?",
    answer: "Whether the Holy Spirit proceeds from the Father \"and the Son\"",
    distractors: [
      "Whether Christ possesses one will or two",
      "Whether icons may rightly be venerated",
      "Whether bishops may be married",
    ],
    keywords: "filioque procession holy spirit east west schism creed",
  },
  {
    slug: "apophatic-theology",
    difficulty: "difficult",
    prompt: "Apophatic (or \"negative\") theology proceeds by which method?",
    answer: "Describing God by saying what he is not",
    distractors: [
      "Deducing God's nature from the design of the natural world",
      "Building doctrine only from direct quotations of Scripture",
      "Resting doctrine on the reports of mystical visions",
    ],
    keywords: "apophatic negative theology via negativa cataphatic mystery",
  },
  {
    slug: "federal-headship",
    difficulty: "difficult",
    prompt: "In theology, \"headship\" language about Adam and Christ (as in Romans 5) means what?",
    answer: "That one person acts as the representative of a whole group",
    distractors: [
      "That the church is governed by a single national assembly",
      "That authority in the church descends from the apostles",
      "That Christ's human nature was taken from Adam's line only",
    ],
    keywords: "federal headship representation adam christ romans 5 covenant",
  },

  // --- impossible ---------------------------------------------------------------------------------
  {
    slug: "constantinople-381",
    difficulty: "impossible",
    prompt: "The creed commonly recited today as \"the Nicene Creed\" was given its familiar final form at which council?",
    answer: "The First Council of Constantinople (AD 381)",
    distractors: [
      "The Council of Chalcedon (AD 451)",
      "The Council of Ephesus (AD 431)",
      "The Second Council of Nicaea (AD 787)",
    ],
    keywords: "constantinople 381 nicene creed niceno constantinopolitan council",
  },
  {
    slug: "ephesus-theotokos",
    difficulty: "impossible",
    prompt: "Which council condemned Nestorius and affirmed the title Theotokos (\"God-bearer\") for Mary?",
    answer: "The Council of Ephesus (AD 431)",
    distractors: [
      "The Council of Nicaea (AD 325)",
      "The Council of Chalcedon (AD 451)",
      "The Second Council of Constantinople (AD 553)",
    ],
    keywords: "ephesus 431 theotokos nestorius council christology mary",
  },
  {
    slug: "apollinarianism",
    difficulty: "impossible",
    prompt: "Apollinarianism was condemned for teaching what about Christ?",
    answer: "That the divine Word took the place of Christ's human mind or rational soul",
    distractors: [
      "That Christ only appeared to have a body",
      "That Christ was two persons loosely joined",
      "That Christ became divine at his resurrection",
    ],
    keywords: "apollinarianism apollinaris human soul mind heresy christology",
  },
  {
    slug: "traducianism",
    difficulty: "impossible",
    prompt: "\"Traducianism\" and \"creationism\" (in its older theological sense) are competing explanations of what?",
    answer: "The origin of each individual human soul",
    distractors: [
      "The age of the earth",
      "The authorship of the Pentateuch",
      "The manner of Christ's presence in the Lord's Supper",
    ],
    keywords: "traducianism creationism soul origin anthropology",
  },
  {
    slug: "divine-simplicity",
    difficulty: "impossible",
    prompt: "The classical attribute of divine \"simplicity\" means what?",
    answer: "That God is not composed of parts",
    distractors: [
      "That God's commands are easy to understand",
      "That God's nature can be fully grasped by reason",
      "That God acts directly, without intermediaries",
    ],
    keywords: "divine simplicity parts essence attributes classical theism",
  },
  {
    slug: "prevenient-grace",
    difficulty: "impossible",
    prompt: "In theological vocabulary, \"prevenient grace\" names grace that does what?",
    answer: "Goes before, enabling a person to respond to God at all",
    distractors: [
      "Is given after conversion to sustain a holy life",
      "Is conveyed only through the sacraments",
      "Is granted to angels rather than to human beings",
    ],
    keywords: "prevenient grace preceding wesley arminian enabling",
  },
  {
    slug: "recapitulation",
    difficulty: "impossible",
    prompt: "\"Recapitulation,\" the atonement theme developed by Irenaeus, means what?",
    answer: "That Christ retraces and restores in himself the whole course of human life",
    distractors: [
      "That Christ paid a ransom owed to the devil",
      "That Christ satisfied an offense against God's honor",
      "That Christ's death chiefly serves as a moral example",
    ],
    keywords: "recapitulation irenaeus atonement second adam anakephalaiosis",
  },
  {
    slug: "communicatio-idiomatum",
    difficulty: "impossible",
    prompt: "The \"communicatio idiomatum\" refers to what?",
    answer: "Attributing the properties of either of Christ's natures to his one person",
    distractors: [
      "The sharing of goods among believers in the early church",
      "The exchange of vows between a bishop and his diocese",
      "The transfer of merit from the saints to the living",
    ],
    keywords: "communicatio idiomatum properties natures person christ chalcedon",
  },
];

/** Turns the hand-written seeds above into QuizQuestions — same deterministic id-seeded choice
 * shuffle every other generator uses, so all clients derive identical choice orders from the id
 * alone and nothing about the question ever travels over the wire. */
function doctrineQuestions(): QuizQuestion[] {
  return DOCTRINE_QUESTIONS.map((seed) => {
    const id = `theology-core-${seed.slug}`;
    const rand = mulberry32(hashSeed(id));
    const { choices, correctIndex } = shuffleChoices(seed.answer, seed.distractors, rand);
    return {
      id,
      category: "theology" as const,
      // Doctrine spans the canon; the strict Old/New Testament presets deliberately don't claim these.
      testament: "both" as QuizTestament,
      difficulty: seed.difficulty,
      points: DIFFICULTY_POINTS[seed.difficulty],
      prompt: seed.prompt,
      choices,
      correctIndex,
      keywords: buildKeywords(seed.keywords, seed.prompt, seed.answer),
    };
  });
}

/** The full generated pool — built once at module load from the static content in src/data/*.ts.
 * Grows automatically as that content grows; nothing here needs to be hand-maintained. */
export const ALL_QUESTIONS: QuizQuestion[] = [
  ...personRoleQuestions(),
  ...personSummaryQuestions(),
  ...locationCategoryQuestions(),
  ...locationFactQuestions(),
  ...poiTagQuestions(),
  ...timelineYearQuestions(),
  ...timelineOrderQuestions(),
  ...theologyRoleQuestions(),
  ...theologySummaryQuestions(),
  ...doctrineQuestions(),
];

const QUESTIONS_BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

export function getQuestionById(id: string): QuizQuestion | undefined {
  return QUESTIONS_BY_ID.get(id);
}

// ------------------------------------------------------------------------------------------------
// Topic and difficulty selection — a handful of standard topic presets (filters over
// category/testament, both already on every question) plus a free-text "custom" search over the same
// generated pool (see keywords above), crossed with a difficulty choice (every question carries one).
// The custom search is a ranked local-keyword match against already-generated questions, NOT a live
// AI call — genuinely open-ended "write me brand-new questions about X" would need a server-side LLM
// call (an API key + per-question cost), which nothing in this app currently has.
//
// The rule for both choices: a round is only ever drawn from questions that match them. When fewer
// match than a full game needs, the round is shorter — it is never padded with other topics or other
// difficulties — and below MIN_ROUND_QUESTIONS the app does not offer to start it at all.
// ------------------------------------------------------------------------------------------------

export type QuizTopicPreset = "all" | "people" | "places" | "history" | "theology" | "old-testament" | "new-testament";

export const TOPIC_PRESETS: { key: QuizTopicPreset; label: string; description: string }[] = [
  { key: "all", label: "All topics", description: "A mix drawn from every topic below, plus church history." },
  { key: "people", label: "People of the Bible", description: "Prophets, apostles, kings, and everyone in between." },
  { key: "places", label: "Locations of the Bible", description: "Cities, regions, and archaeological sites." },
  { key: "history", label: "Biblical History", description: "Dates and order of events, plus archaeology and manuscripts." },
  { key: "theology", label: "Theology", description: "Doctrine, the creeds, and the language of the faith." },
  { key: "old-testament", label: "Old Testament", description: "Genesis through Malachi." },
  { key: "new-testament", label: "New Testament", description: "Matthew through Revelation." },
];

/** "mixed" draws from all four levels. */
export type QuizDifficultyChoice = QuizDifficulty | "mixed";

export const DIFFICULTY_CHOICES: { key: QuizDifficultyChoice; label: string }[] = [
  { key: "mixed", label: "Mixed" },
  { key: "easy", label: "Easy" },
  { key: "moderate", label: "Moderate" },
  { key: "difficult", label: "Difficult" },
  { key: "impossible", label: "Nearly Impossible" },
];

/** A full game's worth of questions. */
export const ROUND_QUESTION_COUNT = 24;
/** The fewest matching questions that still make a round worth starting. */
export const MIN_ROUND_QUESTIONS = 5;

export interface QuizSettings {
  preset?: QuizTopicPreset;
  /** When defined (even empty), the custom search is the topic and `preset` is ignored. */
  customQuery?: string;
  /** Omitted means "mixed". */
  difficulty?: QuizDifficultyChoice;
}

function matchesPreset(question: QuizQuestion, preset: QuizTopicPreset): boolean {
  switch (preset) {
    case "all":
      return true;
    case "people":
      return question.category === "people" && !question.extraBiblical;
    case "places":
    case "history":
    case "theology":
      return question.category === preset;
    case "old-testament":
      return question.testament === "old";
    case "new-testament":
      return question.testament === "new";
  }
}

const SEARCH_STOP_WORDS = new Set([
  "about", "and", "are", "did", "for", "from", "her", "his", "how", "its", "that", "the", "their", "this",
  "was", "were", "what", "when", "where", "which", "who", "with",
]);

/** How many distinct query words start a word in each question's keywords/prompt — simple overlap
 * scoring, no external calls. Matching at the start of a word keeps "ark" from matching "Mark".
 * Returns only questions with at least one match, best matches first. */
function scoreSearch(query: string): { q: QuizQuestion; score: number }[] {
  const words = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/))].filter((w) => w.length >= 3 && !SEARCH_STOP_WORDS.has(w));
  if (words.length === 0) return [];
  // No lookbehind: older iOS Safari throws on it. The words are [a-z0-9] only, so need no escaping.
  const patterns = words.map((w) => new RegExp(`(^|[^a-z0-9])${w}`));
  const scored = ALL_QUESTIONS.map((q) => {
    const haystack = `${q.keywords} ${q.prompt.toLowerCase()}`;
    return { q, score: patterns.reduce((sum, p) => sum + (p.test(haystack) ? 1 : 0), 0) };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** Every question matching both choices. A custom search keeps its best-first order. */
function matchingQuestions({ preset = "all", customQuery, difficulty = "mixed" }: QuizSettings): { q: QuizQuestion; score: number }[] {
  const topicPool =
    customQuery !== undefined ? scoreSearch(customQuery) : ALL_QUESTIONS.filter((q) => matchesPreset(q, preset)).map((q) => ({ q, score: 0 }));
  return difficulty === "mixed" ? topicPool : topicPool.filter(({ q }) => q.difficulty === difficulty);
}

/** How many questions a topic + difficulty choice would draw from — used by the create-game screen to
 * show the count, and to withhold a combination too thin to play, before the host commits to it. */
export function countAvailableQuestions(settings: QuizSettings = {}): number {
  return matchingQuestions(settings).length;
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Picks a shuffled sequence of question ids for a new room, every one of them matching the chosen
 * topic and difficulty. Returns fewer than `count` when fewer match.
 *
 * For "mixed" difficulty the aim is roughly 40% easy / 30% moderate / 20% difficult / 10% nearly
 * impossible, so a game has a real on-ramp instead of opening on its hardest questions; where the
 * topic is thin at some level, the places left over are filled from the same topic's other levels.
 *
 * A custom search first narrows to its best-scoring matches — whole score bands, until there are
 * enough for a round — so "miracles of Jesus" favours questions matching both words over either.
 *
 * The selection doesn't need to be deterministic (unlike each question's own content above) — the host
 * runs this once and the resulting id array is written straight into game_rooms.question_ids, which
 * every other client then just reads back. */
export function buildQuestionSequence(count = ROUND_QUESTION_COUNT, settings: QuizSettings = {}): string[] {
  const matches = matchingQuestions(settings);
  const cutoff = matches.length > count ? matches[count - 1].score : -Infinity;
  const pool = shuffled(matches.filter((m) => m.score >= cutoff).map((m) => m.q));

  let picked: QuizQuestion[];
  if ((settings.difficulty ?? "mixed") === "mixed") {
    const easy = Math.round(count * 0.4);
    const moderate = Math.round(count * 0.3);
    const difficult = Math.round(count * 0.2);
    const targets: Record<QuizDifficulty, number> = { easy, moderate, difficult, impossible: Math.max(1, count - easy - moderate - difficult) };
    picked = (Object.keys(targets) as QuizDifficulty[]).flatMap((d) => pool.filter((q) => q.difficulty === d).slice(0, targets[d]));
    const taken = new Set(picked.map((q) => q.id));
    picked.push(...pool.filter((q) => !taken.has(q.id)).slice(0, count - picked.length));
  } else {
    picked = pool.slice(0, count);
  }

  // Shuffle the final order so difficulties interleave rather than arriving in one block.
  return shuffled(picked).map((q) => q.id);
}

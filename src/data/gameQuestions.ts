import { people } from "./people";
import { locations } from "./locations";
import { pois } from "./pois";
import { timelineEvents } from "./timelineEvents";
import { topics } from "./topics";
import { BOOKS } from "./bibleBooks";
import type { LocationCategory, TimelineDateCertainty, VerseRef } from "./types";

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
   * or anything the testament heuristic below couldn't place. Drives the Old/New Testament topic
   * filters (see TOPIC_PRESETS); a strict filter only matches "old"/"new" exactly. */
  testament: QuizTestament;
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

function buildKeywords(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

// ------------------------------------------------------------------------------------------------
// Generators — each returns one QuizQuestion per eligible source entity. "Eligible" mostly means
// "has the field this question type needs, and there are at least 3 distinct distractors available."
// ------------------------------------------------------------------------------------------------

function personRoleQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const person of people) {
    if (!person.role) continue;
    const sameTier = people.filter((p) => p.tier === person.tier && p.id !== person.id && p.role && p.role !== person.role);
    const distractorPool = [...new Set(sameTier.map((p) => p.role))];
    if (distractorPool.length < 3) continue;
    const id = `person-role-${person.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractors = seededPick(distractorPool, 3, rand);
    const { choices, correctIndex } = shuffleChoices(person.role, distractors, rand);
    const difficulty: QuizDifficulty = person.tier === "major" ? "easy" : person.tier === "significant" ? "moderate" : "difficult";
    out.push({
      id,
      category: "people",
      testament: testamentFromVerses(person.verses),
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
  for (const person of people) {
    if (!person.summary || textGivesAwayName(person.summary, person.name)) continue;
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

function locationCategoryQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const location of locations) {
    const otherCategories = [...new Set(locations.filter((l) => l.category !== location.category).map((l) => l.category))];
    if (otherCategories.length < 3) continue;
    const id = `location-category-${location.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractorCategories = seededPick(otherCategories, 3, rand);
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

function locationFactQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const location of locations) {
    const fact = location.history.notableFacts[0];
    if (!fact || textGivesAwayName(fact, location.name)) continue;
    const otherNames = locations.filter((l) => l.id !== location.id).map((l) => l.name);
    if (otherNames.length < 3) continue;
    const id = `location-fact-${location.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractors = seededPick(otherNames, 3, rand);
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

function poiTagQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const poi of pois) {
    const otherTags = [...new Set(pois.filter((p) => p.tag !== poi.tag).map((p) => p.tag))];
    if (otherTags.length < 3) continue;
    const id = `poi-tag-${poi.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractorTags = seededPick(otherTags, 3, rand);
    const { choices, correctIndex } = shuffleChoices(poi.tag, distractorTags, rand);
    // POIs are secondary/archaeological sites by design (lighter-weight than a full Location) — they
    // read as harder trivia regardless, split only by how well the site's history is sourced.
    const difficulty: QuizDifficulty = poi.sources && poi.sources.length > 0 ? "difficult" : "impossible";
    out.push({
      id,
      category: "places",
      // POIs carry no verse list to classify from — most are 1st-century/Roman-era sites tied to the
      // Gospels or Acts, so "new" is a reasonable default rather than leaving every POI unfilterable.
      testament: "new",
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

function timelineYearQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const event of biblicalTimelineEvents) {
    const id = `history-year-${event.id}`;
    const rand = mulberry32(hashSeed(id));
    const magnitude = Math.max(50, Math.round(Math.abs(event.startYear) * 0.05));
    const deltaCandidates = [magnitude, -magnitude, magnitude * 2, -magnitude * 2, magnitude * 4, -magnitude * 4];
    const seen = new Set([formatYear(event.startYear)]);
    const distractors: string[] = [];
    for (const delta of seededPick(deltaCandidates, deltaCandidates.length, rand)) {
      if (distractors.length >= 3) break;
      const label = formatYear(event.startYear + delta);
      if (seen.has(label)) continue;
      seen.add(label);
      distractors.push(label);
    }
    if (distractors.length < 3) continue;
    const { choices, correctIndex } = shuffleChoices(formatYear(event.startYear), distractors, rand);
    const difficulty = CERTAINTY_TO_DIFFICULTY[event.dateCertainty];
    out.push({
      id,
      category: "history",
      testament: testamentFromRefStrings(event.scriptureRefs) ?? (event.startYear < 0 ? "old" : "new"),
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
      const group = seededPick(events, 4, rand);
      const earliest = group.reduce((min, e) => (e.startYear < min.startYear ? e : min));
      const distractors = group.filter((e) => e.id !== earliest.id).map((e) => e.title);
      const { choices, correctIndex } = shuffleChoices(earliest.title, distractors, rand);
      const worstCertainty = group.reduce(
        (worst, e) => (CERTAINTY_RANK[e.dateCertainty] > CERTAINTY_RANK[worst] ? e.dateCertainty : worst),
        "firm" as TimelineDateCertainty
      );
      const difficulty = CERTAINTY_TO_DIFFICULTY[worstCertainty];
      // Only meaningfully "old"/"new" if every event in the group agrees — a group can still straddle
      // both testaments (e.g. an era spanning Malachi into the Gospels).
      const testaments = new Set(group.map((e) => testamentFromRefStrings(e.scriptureRefs) ?? (e.startYear < 0 ? "old" : "new")));
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
function topicQuizCategory(topic: (typeof topics)[number]): QuizCategory {
  return topic.category === "people-group" ? "people" : "theology";
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

function theologySummaryQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const topic of topics) {
    if (!topic.summary || textGivesAwayName(topic.summary, topic.name)) continue;
    const others = topics.filter((t) => t.id !== topic.id).map((t) => t.name);
    if (others.length < 3) continue;
    const id = `theology-summary-${topic.id}`;
    const rand = mulberry32(hashSeed(id));
    const distractors = seededPick(others, 3, rand);
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
// Topic selection — a handful of standard presets (filters over category/testament, both already on
// every question) plus a free-text "custom" search over the same generated pool (see keywords above).
// The custom search is a ranked local-keyword match against ~1,000 already-generated questions, NOT a
// live AI call — genuinely open-ended "write me brand-new questions about X" would need a server-side
// LLM call (an API key + per-question cost), which nothing in this app currently has; this covers a
// lot of realistic asks ("Paul's missionary journeys", "kings of Israel", "miracles of Jesus") for free
// since the underlying content already discusses them, but a very obscure or narrow phrase may come up
// short — buildQuestionSequence pads any shortfall from the general pool so a game is never too short.
// ------------------------------------------------------------------------------------------------

export type QuizTopicPreset = "all" | "people" | "places" | "history" | "theology" | "old-testament" | "new-testament";

export const TOPIC_PRESETS: { key: QuizTopicPreset; label: string; description: string }[] = [
  { key: "all", label: "Mixed", description: "A balanced mix across every topic below." },
  { key: "people", label: "People of the Bible", description: "Prophets, apostles, kings, and everyone in between." },
  { key: "places", label: "Locations of the Bible", description: "Cities, regions, and archaeological sites." },
  { key: "history", label: "Biblical History", description: "When things happened, and in what order." },
  { key: "theology", label: "Theology", description: "Doctrine, the creeds, and the language of the faith." },
  { key: "old-testament", label: "Old Testament", description: "Genesis through Malachi." },
  { key: "new-testament", label: "New Testament", description: "Matthew through Revelation." },
];

function matchesPreset(question: QuizQuestion, preset: QuizTopicPreset): boolean {
  switch (preset) {
    case "all":
      return true;
    case "people":
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

/** Ranks the pool by how many distinct query words appear in each question's keywords/prompt —
 * simple word-overlap scoring, no external calls. Returns only questions with at least one match,
 * best matches first. */
export function searchQuestions(query: string): QuizQuestion[] {
  const words = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3))];
  if (words.length === 0) return [];
  const scored = ALL_QUESTIONS.map((q) => {
    const haystack = `${q.keywords} ${q.prompt.toLowerCase()}`;
    const score = words.reduce((sum, w) => sum + (haystack.includes(w) ? 1 : 0), 0);
    return { q, score };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.q);
}

/** How many questions a preset or custom search would draw from — used by the create-game UI to show
 * "~340 available" (or "12 matched") before the host commits to a topic. */
export function countAvailableQuestions(options: { preset?: QuizTopicPreset; customQuery?: string } = {}): number {
  if (options.customQuery?.trim()) return searchQuestions(options.customQuery).length;
  return ALL_QUESTIONS.filter((q) => matchesPreset(q, options.preset ?? "all")).length;
}

/** Picks a shuffled, difficulty-mixed sequence of question ids for a new room — roughly 40% easy /
 * 30% moderate / 20% difficult / 10% impossible, so a game has a real on-ramp instead of opening on
 * its hardest questions, while still reliably surfacing all four point values before 50 is reached.
 * The selection itself doesn't need to be deterministic (unlike each question's own content above) —
 * the host runs this once and the resulting id array is written straight into game_rooms.question_ids,
 * which every other client then just reads back.
 *
 * `preset`/`customQuery` narrow the candidate pool first (see matchesPreset/searchQuestions above); if
 * that narrowed pool can't fill every difficulty slot (a niche custom search, or a thin preset like
 * Theology), the remaining slots are padded from the *full* pool rather than shrinking the game. */
export function buildQuestionSequence(count = 24, options: { preset?: QuizTopicPreset; customQuery?: string } = {}): string[] {
  const primaryPool = options.customQuery?.trim()
    ? searchQuestions(options.customQuery)
    : ALL_QUESTIONS.filter((q) => matchesPreset(q, options.preset ?? "all"));

  const pickMixed = (pool: QuizQuestion[], n: number): QuizQuestion[] => {
    const byDifficulty: Record<QuizDifficulty, QuizQuestion[]> = { easy: [], moderate: [], difficult: [], impossible: [] };
    for (const q of pool) byDifficulty[q.difficulty].push(q);
    const targetCounts: Record<QuizDifficulty, number> = {
      easy: Math.round(n * 0.4),
      moderate: Math.round(n * 0.3),
      difficult: Math.round(n * 0.2),
      impossible: Math.max(1, n - Math.round(n * 0.4) - Math.round(n * 0.3) - Math.round(n * 0.2)),
    };
    const picked: QuizQuestion[] = [];
    (Object.keys(targetCounts) as QuizDifficulty[]).forEach((difficulty) => {
      const bucket = [...byDifficulty[difficulty]];
      const take = Math.min(targetCounts[difficulty], bucket.length);
      for (let i = 0; i < take; i++) {
        const idx = Math.floor(Math.random() * bucket.length);
        picked.push(bucket.splice(idx, 1)[0]);
      }
    });
    return picked;
  };

  const picked = pickMixed(primaryPool, count);
  if (picked.length < count) {
    const pickedIds = new Set(picked.map((q) => q.id));
    const fallbackPool = ALL_QUESTIONS.filter((q) => !pickedIds.has(q.id));
    picked.push(...pickMixed(fallbackPool, count - picked.length));
  }

  // Shuffle the final order so difficulties (and, for a custom search, matched-vs-padded questions)
  // interleave rather than arriving in one block.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked.map((q) => q.id);
}

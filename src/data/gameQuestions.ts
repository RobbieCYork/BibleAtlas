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

function timelineYearQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const event of timelineEvents) {
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
      testament: event.category === "biblical" ? testamentFromRefStrings(event.scriptureRefs) ?? (event.startYear < 0 ? "old" : "new") : null,
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
  for (const event of timelineEvents) {
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
      // Only meaningfully "old"/"new" if every event in the group agrees — a mixed-era group (common
      // once a handful of "world"/"religion" events are mixed into a biblical era) isn't one testament.
      const testaments = new Set(
        group.map((e) => (e.category === "biblical" ? testamentFromRefStrings(e.scriptureRefs) ?? (e.startYear < 0 ? "old" : "new") : null))
      );
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
      category: "theology",
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
      category: "theology",
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
  { key: "theology", label: "Theology", description: "Doctrines, practices, and people groups." },
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

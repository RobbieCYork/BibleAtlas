import { people } from "./people";
import { locations } from "./locations";
import { pois } from "./pois";
import { timelineEvents } from "./timelineEvents";
import type { LocationCategory, TimelineDateCertainty } from "./types";

export type QuizDifficulty = "easy" | "moderate" | "difficult" | "impossible";
export type QuizCategory = "people" | "places" | "history";

export interface QuizQuestion {
  /** Deterministic — derived from the source entity's id, never randomly generated. A room only
   * ever stores an array of these (game_rooms.question_ids); every client resolves the same id back
   * to the exact same prompt/choices/correctIndex from this same module, so nothing about a
   * question's content ever needs to travel over the network. */
  id: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  points: 1 | 3 | 5 | 10;
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** The real Person/Location/PointOfInterest/TimelineEvent id this question was built from, for an
   * optional "Learn more" link after the question resolves. */
  entityId?: string;
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
    out.push({
      id,
      category: "people",
      difficulty: person.tier === "major" ? "easy" : person.tier === "significant" ? "moderate" : "difficult",
      points: DIFFICULTY_POINTS[person.tier === "major" ? "easy" : person.tier === "significant" ? "moderate" : "difficult"],
      prompt: `What was ${person.name}'s role?`,
      choices,
      correctIndex,
      entityId: person.id,
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
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `Who does this describe: "${person.summary}"?`,
      choices,
      correctIndex,
      entityId: person.id,
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
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `What kind of place is ${location.name}?`,
      choices,
      correctIndex,
      entityId: location.id,
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
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `Which place does this describe? "${fact}"`,
      choices,
      correctIndex,
      entityId: location.id,
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
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `What is ${poi.name}?`,
      choices,
      correctIndex,
      entityId: poi.id,
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
      difficulty,
      points: DIFFICULTY_POINTS[difficulty],
      prompt: `About what year did "${event.title}" happen?`,
      choices,
      correctIndex,
      entityId: event.id,
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
      out.push({
        id,
        category: "history",
        difficulty,
        points: DIFFICULTY_POINTS[difficulty],
        prompt: "Which of these four events happened earliest?",
        choices,
        correctIndex,
      });
    }
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
];

const QUESTIONS_BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

export function getQuestionById(id: string): QuizQuestion | undefined {
  return QUESTIONS_BY_ID.get(id);
}

/** Picks a shuffled, difficulty-mixed sequence of question ids for a new room — roughly 40% easy /
 * 30% moderate / 20% difficult / 10% impossible, so a game has a real on-ramp instead of opening on
 * its hardest questions, while still reliably surfacing all four point values before 50 is reached.
 * The selection itself doesn't need to be deterministic (unlike each question's own content above) —
 * the host runs this once and the resulting id array is written straight into game_rooms.question_ids,
 * which every other client then just reads back. */
export function buildQuestionSequence(count = 24): string[] {
  const byDifficulty: Record<QuizDifficulty, QuizQuestion[]> = { easy: [], moderate: [], difficult: [], impossible: [] };
  for (const q of ALL_QUESTIONS) byDifficulty[q.difficulty].push(q);

  const targetCounts: Record<QuizDifficulty, number> = {
    easy: Math.round(count * 0.4),
    moderate: Math.round(count * 0.3),
    difficult: Math.round(count * 0.2),
    impossible: Math.max(1, count - Math.round(count * 0.4) - Math.round(count * 0.3) - Math.round(count * 0.2)),
  };

  const picked: QuizQuestion[] = [];
  (Object.keys(targetCounts) as QuizDifficulty[]).forEach((difficulty) => {
    const pool = [...byDifficulty[difficulty]];
    const n = Math.min(targetCounts[difficulty], pool.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
  });

  // Shuffle the final order so difficulties interleave rather than arriving in one block per tier.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked.map((q) => q.id);
}

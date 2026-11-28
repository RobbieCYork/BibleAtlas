import { timelineEvents } from "./timelineEvents";
import type { TimelineEvent, TimelineEventCategory } from "./types";
import type { IconName } from "../components/Icon";
import { CHRONOLOGY_HISTORY, CHRONOLOGY_STORY, type ChronologyCategory, type Fame } from "./chronologyPool";

export { CHRONOLOGY_CATEGORIES, type ChronologyCategory } from "./chronologyPool";

/* ============================================================================
 * chronologyRounds — deals Chronology rounds from the hand-graded deck in chronologyPool.ts.
 *
 * Difficulty is two separate dials:
 *   - FAME: which cards may be dealt. Beginner and Easy deal only Sunday-school-famous events;
 *     the higher levels add less familiar ones and require some of them.
 *   - CLOSENESS: how near each card is to the next one, as a "distance class" 0-3 (see `distance`
 *     below): story chapters apart inside the Bible's narrative, years apart outside it. Beginner
 *     needs every neighbour very far apart; Expert requires some from the same chapter.
 *
 * A round never holds two cards whose order is tied or disputed (`canPair`), at any level.
 * scripts/chronology-validate deals thousands of rounds at build time and checks all of it.
 * ========================================================================== */

export type ChronologyLevel = "beginner" | "easy" | "intermediate" | "advanced" | "expert";

type Distance = 0 | 1 | 2 | 3;

export interface ChronologyLevelDef {
  key: ChronologyLevel;
  label: string;
  description: string;
  /** A name from components/Icon.tsx: the shared difficulty ladder (level1..level5). */
  icon: IconName;
  /** How many events the player orders in one round. */
  cardCount: number;
  /** The least famous grade dealt (1 = only the famous). */
  maxFame: Fame;
  /** At least `count` cards must be of grade `fame` (or less famous). */
  deep?: { count: number; fame: Fame };
  /** Every pair of neighbouring cards must be at least this distance class apart. */
  minDistance: Distance;
  /** At least `count` neighbouring pairs must be this close or closer. */
  close?: { count: number; distance: Distance };
}

/** Keys, labels and icons mirror CROSSWORD_LEVELS in crosswordWords.ts — the two games sit next to
 * each other in the Game Center and should read as the same ladder. */
export const CHRONOLOGY_LEVELS: ChronologyLevelDef[] = [
  {
    key: "beginner",
    label: "Beginner",
    description: "Three famous moments, far apart.",
    icon: "level1",
    cardCount: 3,
    maxFame: 1,
    minDistance: 3,
  },
  {
    key: "easy",
    label: "Easy",
    description: "Four famous events, well apart. Sunday-school knowledge is enough.",
    icon: "level2",
    cardCount: 4,
    maxFame: 1,
    minDistance: 2,
  },
  {
    key: "intermediate",
    label: "Intermediate",
    description: "Five events, some less famous, still clearly apart.",
    icon: "level3",
    cardCount: 5,
    maxFame: 2,
    deep: { count: 2, fame: 2 },
    minDistance: 1,
  },
  {
    key: "advanced",
    label: "Advanced",
    description: "Six events, including deeper cuts, some of them neighbours.",
    icon: "level4",
    cardCount: 6,
    maxFame: 3,
    deep: { count: 2, fame: 3 },
    minDistance: 1,
    close: { count: 1, distance: 1 },
  },
  {
    key: "expert",
    label: "Expert",
    description: "Seven events, some from the same chapter of history.",
    icon: "level5",
    cardCount: 7,
    maxFame: 3,
    deep: { count: 3, fame: 3 },
    minDistance: 0,
    close: { count: 2, distance: 0 },
  },
];

export interface ChronologyCard {
  id: string;
  title: string;
  /** Position in the correct order across the whole deck: the answer key. Never shown. */
  order: number;
  /** Human-readable date, revealed only once the round is checked. */
  dateLabel: string;
  category: TimelineEventCategory;
  /** The date is a young-earth one (TimelineEvent.youngEarthDate): the reveal marks it and adds the
   * note from datingDebate.ts. Display only — never read by the deal, the order or the score. */
  youngEarthDate?: boolean;
}

/** One dealable card with everything the pairing rules need. */
export interface DeckCard {
  id: string;
  title: string;
  fame: Fame;
  year: number;
  firm: boolean;
  cats: ChronologyCategory[];
  ties: string[];
  /** Story chapter index, or null outside the Bible's narrative. */
  era: number | null;
  /** Position in the story (rising across chapters), or null outside it. */
  seq: number | null;
  debatedDating: boolean;
  /** Index in the whole deck sorted into the correct order: the answer key. */
  order: number;
  event: TimelineEvent;
}

const EVENTS = new Map(timelineEvents.map((e) => [e.id, e]));
const eventFor = (id: string): TimelineEvent => {
  const e = EVENTS.get(id);
  // The validator names the bad id at build time; this keeps it from rendering as a blank card.
  if (!e) throw new Error(`chronologyPool: no timeline event "${id}"`);
  return e;
};

function buildDeck(): DeckCard[] {
  const cards: Omit<DeckCard, "order">[] = [];
  let seq = 0;
  CHRONOLOGY_STORY.forEach((era, eraIndex) => {
    for (const p of era.events) {
      const e = eventFor(p.id);
      cards.push({
        id: p.id,
        title: p.title ?? e.title,
        fame: p.fame,
        year: e.startYear,
        firm: e.dateCertainty === "firm",
        cats: era.cats,
        ties: p.ties ?? [],
        era: eraIndex,
        seq: seq++,
        debatedDating: !!era.debatedDating,
        event: e,
      });
    }
  });
  for (const p of CHRONOLOGY_HISTORY) {
    const e = eventFor(p.id);
    cards.push({
      id: p.id,
      title: p.title ?? e.title,
      fame: p.fame,
      year: e.startYear,
      firm: e.dateCertainty === "firm",
      cats: p.cats,
      ties: p.ties ?? [],
      era: null,
      seq: null,
      debatedDating: false,
      event: e,
    });
  }
  // By year; inside the story, same-year events keep Scripture's order. Any two cards that may be
  // dealt together are put in the right order by this (the validator proves it), so a card's
  // index here is its answer key.
  const sorted = [...cards].sort((a, b) => a.year - b.year || (a.seq ?? 0) - (b.seq ?? 0));
  return sorted.map((c, order) => ({ ...c, order }));
}

export const CHRONOLOGY_DECK: DeckCard[] = buildDeck();

/** Approximate dates ("c.") are only set against each other when at least this many years apart. */
export const APPROX_MARGIN_YEARS = 25;

/** Can these two cards share a round? False whenever their relative order is tied, uncertain, or
 * rests on a dating question evangelicals themselves disagree about. */
export function canPair(a: DeckCard, b: DeckCard): boolean {
  if (a.id === b.id) return false;
  if (a.ties.some((t) => b.ties.includes(t))) return false;
  // Both in the Bible's story: Scripture's own sequence settles it, whatever the years.
  if (a.seq !== null && b.seq !== null) return true;
  // Pre-monarchy story events are never set against dated events of the ancient world: whether the
  // Flood came before or after the pyramids depends on which chronology one holds.
  const early = (x: DeckCard, y: DeckCard) => x.debatedDating && y.seq === null && y.year < -1000;
  if (early(a, b) || early(b, a)) return false;
  const gap = Math.abs(a.year - b.year);
  if (gap === 0) return false;
  return a.firm && b.firm ? true : gap >= APPROX_MARGIN_YEARS;
}

/** Distance class between two cards: 3 = very far apart, 0 = the same chapter. Inside the story it
 * is chapters apart; otherwise years apart. Whichever is further wins, so the four centuries
 * between Nehemiah and Bethlehem count as far even though those chapters are neighbours. */
export function distance(a: DeckCard, b: DeckCard): Distance {
  const gap = Math.abs(a.year - b.year);
  const byYears: Distance = gap >= 400 ? 3 : gap >= 250 ? 2 : gap >= 50 ? 1 : 0;
  if (a.era === null || b.era === null) return byYears;
  const chapters = Math.min(3, Math.abs(a.era - b.era)) as Distance;
  return Math.max(chapters, byYears) as Distance;
}

export function deckFor(category: ChronologyCategory, level: ChronologyLevelDef): DeckCard[] {
  return CHRONOLOGY_DECK.filter((c) => c.fame <= level.maxFame && (category === "all" || c.cats.includes(category)));
}

const byOrder = (cards: DeckCard[]) => [...cards].sort((a, b) => a.order - b.order);

/** The hard rules for a finished round: size, fame, pairing, neighbour distance. */
export function isFairRound(cards: DeckCard[], level: ChronologyLevelDef): boolean {
  if (cards.length !== level.cardCount) return false;
  if (cards.some((c) => c.fame > level.maxFame)) return false;
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) if (!canPair(cards[i], cards[j])) return false;
  const s = byOrder(cards);
  for (let i = 1; i < s.length; i++) if (distance(s[i - 1], s[i]) < level.minDistance) return false;
  return true;
}

/** The level's requirements on top of the hard rules: enough deep cuts, enough close neighbours. */
export function meetsLevel(cards: DeckCard[], level: ChronologyLevelDef): boolean {
  const { deep, close } = level;
  if (deep && cards.filter((c) => c.fame >= deep.fame).length < deep.count) return false;
  if (close) {
    const s = byOrder(cards);
    let n = 0;
    for (let i = 1; i < s.length; i++) if (distance(s[i - 1], s[i]) <= close.distance) n++;
    if (n < close.count) return false;
  }
  return true;
}

/** Fisher-Yates, same as the other solo games (FillBlankView, CrosswordView). */
function shuffled<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Would adding `c` keep the partial round fair? Its new neighbours must be far enough away. */
function fits(picked: DeckCard[], c: DeckCard, level: ChronologyLevelDef): boolean {
  if (!picked.every((p) => canPair(p, c))) return false;
  let before: DeckCard | null = null;
  let after: DeckCard | null = null;
  for (const p of picked) {
    if (p.order < c.order && (!before || p.order > before.order)) before = p;
    if (p.order > c.order && (!after || p.order < after.order)) after = p;
  }
  return (!before || distance(before, c) >= level.minDistance) && (!after || distance(c, after) >= level.minDistance);
}

/** One try: seed the close pairs the level asks for, then its deep cuts, then fill at random. */
function attempt(pool: DeckCard[], level: ChronologyLevelDef, rand: () => number): DeckCard[] | null {
  const order = shuffled(pool, rand);
  const picked: DeckCard[] = [];
  const add = (want: (c: DeckCard) => boolean, count: number) => {
    for (const c of order) {
      if (count <= 0 || picked.length >= level.cardCount) return;
      if (!picked.includes(c) && want(c) && fits(picked, c, level)) {
        picked.push(c);
        count--;
      }
    }
  };
  const { deep, close } = level;
  if (close) {
    picked.push(order[0]);
    for (let n = 0; n < close.count; n++) add((c) => picked.some((p) => distance(p, c) <= close.distance), 1);
  }
  if (deep) add((c) => c.fame >= deep.fame, deep.count - picked.filter((c) => c.fame >= deep.fame).length);
  add(() => true, level.cardCount);
  return isFairRound(picked, level) && meetsLevel(picked, level) ? picked : null;
}

/** The deck cards of one round, unshuffled. Null only if no fair round turned up, which the
 * build-time validator shows does not happen for any category and level. */
export function dealDeckCards(category: ChronologyCategory, level: ChronologyLevelDef, rand: () => number = Math.random): DeckCard[] | null {
  const pool = deckFor(category, level);
  for (let i = 0; i < 300; i++) {
    const r = attempt(pool, level, rand);
    if (r) return r;
  }
  return null;
}

const toCard = (c: DeckCard): ChronologyCard => ({
  id: c.id,
  title: c.title,
  order: c.order,
  dateLabel: c.event.dateLabel,
  category: c.event.category,
  ...(c.event.youngEarthDate ? { youngEarthDate: true } : {}),
});

/** Deal one round, shuffled so the player has something to sort. */
export function dealRound(level: ChronologyLevelDef, category: ChronologyCategory = "all"): ChronologyCard[] {
  const cards = dealDeckCards(category, level) ?? dealDeckCards("all", level);
  if (!cards) throw new Error(`chronology: no fair ${level.key} round`);
  let out = shuffled(cards.map(toCard), Math.random);
  // Never hand over a round that is already solved.
  for (let i = 0; i < 8 && isOrdered(out); i++) out = shuffled(out, Math.random);
  return out;
}

/** True when the cards sit in the correct order — the win condition for a round. */
export function isOrdered(cards: ChronologyCard[]): boolean {
  return cards.every((c, i) => i === 0 || cards[i - 1].order < c.order);
}

/** Which cards are in the position they'd occupy once sorted — drives the per-card right/wrong
 * marking on check, so a near-miss reads differently from a scrambled guess. */
export function correctPositions(cards: ChronologyCard[]): boolean[] {
  const solution = [...cards].sort((a, b) => a.order - b.order);
  return cards.map((c, i) => solution[i].id === c.id);
}

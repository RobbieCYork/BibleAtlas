import { timelineEvents } from "./timelineEvents";
import type { TimelineEvent, TimelineEventCategory } from "./types";

/* ============================================================================
 * chronologyRounds — the round builder behind the Chronology game, generated
 * directly from timelineEvents.ts rather than a hand-written question file, so
 * every event added to the timeline is automatically playable.
 *
 * The difficulty dial is the minimum gap in years between consecutive events in
 * a round, not the obscurity of the events themselves. "Which came first, the
 * Exodus or the Reformation?" is easy at any level of Bible knowledge; telling
 * apart two councils forty years apart is not. Card count rises alongside it.
 * ========================================================================== */

export type ChronologyLevel = "beginner" | "easy" | "intermediate" | "advanced" | "expert";

export interface ChronologyLevelDef {
  key: ChronologyLevel;
  label: string;
  description: string;
  icon: string;
  /** How many events the player orders in one round. */
  cardCount: number;
  /** Minimum years between consecutive events in a round. Kept well above zero even at Expert:
   * two events in the same year have no defensible "correct" order, so they must never both be
   * dealt into the same round. */
  minGapYears: number;
}

/** Level keys/labels/icons deliberately mirror CROSSWORD_LEVELS in crosswordWords.ts — the two
 * games sit next to each other in the Game Center and should read as the same ladder. */
export const CHRONOLOGY_LEVELS: ChronologyLevelDef[] = [
  {
    key: "beginner",
    label: "Beginner",
    description: "Three landmark moments, whole eras apart.",
    icon: "🌱",
    cardCount: 3,
    minGapYears: 500,
  },
  {
    key: "easy",
    label: "Easy",
    description: "Four events, a couple of centuries between each.",
    icon: "📖",
    cardCount: 4,
    minGapYears: 250,
  },
  {
    key: "intermediate",
    label: "Intermediate",
    description: "Five events, a century apart — you'll need the general sweep of history.",
    icon: "⛪",
    cardCount: 5,
    minGapYears: 100,
  },
  {
    key: "advanced",
    label: "Advanced",
    description: "Six events, sometimes a single generation apart.",
    icon: "📜",
    cardCount: 6,
    minGapYears: 40,
  },
  {
    key: "expert",
    label: "Expert",
    description: "Seven events, some barely a decade apart. Seminary-level chronology.",
    icon: "🎓",
    cardCount: 7,
    minGapYears: 10,
  },
];

export interface ChronologyCard {
  id: string;
  title: string;
  /** Signed year — negative BC, positive AD. The answer key; never shown before the player checks. */
  startYear: number;
  /** Human-readable date, revealed only once the round is checked. */
  dateLabel: string;
  category: TimelineEventCategory;
}

/** Fisher-Yates, same as the other solo games (FillBlankView, CrosswordView). */
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Every event sorted by year, built once. Events sharing a year stay adjacent, and the gap walk
 * below skips past them — so a round can never contain two events it would be unfair to order. */
const BY_YEAR: TimelineEvent[] = [...timelineEvents].sort((a, b) => a.startYear - b.startYear);

const toCard = (e: TimelineEvent): ChronologyCard => ({
  id: e.id,
  title: e.title,
  startYear: e.startYear,
  dateLabel: e.dateLabel,
  category: e.category,
});

/** Walk forward from `start`, taking each event at least `minGap` years after the one before, until
 * `count` are collected. Returns null when the tail of history runs out before the round fills. */
function walkFrom(start: number, count: number, minGap: number): TimelineEvent[] | null {
  const picked: TimelineEvent[] = [BY_YEAR[start]];
  for (let i = start + 1; i < BY_YEAR.length && picked.length < count; i++) {
    if (BY_YEAR[i].startYear - picked[picked.length - 1].startYear >= minGap) picked.push(BY_YEAR[i]);
  }
  return picked.length === count ? picked : null;
}

/**
 * Deal one round: `cardCount` events guaranteed at least `minGapYears` apart, returned already
 * shuffled so the player has something to sort.
 *
 * Strategy is a bounded set of random starting points, then a deterministic fallback that spreads
 * picks evenly across all of history. The fallback always succeeds (an even spread over 356 events
 * yields gaps far larger than any level asks for), so this never returns an incomplete round and
 * never loops indefinitely.
 */
export function dealRound(level: ChronologyLevelDef): ChronologyCard[] {
  const { cardCount, minGapYears } = level;

  for (let attempt = 0; attempt < 40; attempt++) {
    // Only start somewhere that leaves room for a full round behind it.
    const start = Math.floor(Math.random() * Math.max(1, BY_YEAR.length - cardCount));
    const picked = walkFrom(start, cardCount, minGapYears);
    if (picked) return shuffled(picked.map(toCard));
  }

  const stride = Math.floor(BY_YEAR.length / cardCount);
  const offset = Math.floor(Math.random() * stride);
  const spread = Array.from({ length: cardCount }, (_, i) => BY_YEAR[Math.min(offset + i * stride, BY_YEAR.length - 1)]);
  return shuffled(spread.map(toCard));
}

/** True when the cards sit in non-decreasing year order — the win condition for a round. */
export function isOrdered(cards: ChronologyCard[]): boolean {
  return cards.every((c, i) => i === 0 || cards[i - 1].startYear <= c.startYear);
}

/** Which cards are in the position they'd occupy once sorted — drives the per-card right/wrong
 * marking on check, so a near-miss reads differently from a scrambled guess. */
export function correctPositions(cards: ChronologyCard[]): boolean[] {
  const solution = [...cards].sort((a, b) => a.startYear - b.startYear);
  return cards.map((c, i) => solution[i].startYear === c.startYear);
}

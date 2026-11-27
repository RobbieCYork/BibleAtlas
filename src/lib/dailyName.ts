import { DAILY_NAME_ANSWERS, DAILY_NAME_GUESSES, type DailyNameAnswer } from "../data/dailyName";

/* ============================================================================
 * Daily Name — the rules, separate from the screen (components/DailyNameView.tsx).
 *
 * One hidden name per local calendar date, the same for every reader on that date. The answer
 * list (data/dailyName.ts) is generated and ordered most-familiar first; day 1 is EPOCH. When the
 * list runs out the schedule starts over, each later cycle in its own fixed shuffled order, so the
 * sequence never depends on anything but the date.
 *
 * Everything a reader does is kept on this device only (localStorage). No database, no account
 * data, no network.
 * ========================================================================== */

export const MAX_GUESSES = 6;

/** Puzzle #1. A local date, compared as a calendar day, never as an instant. */
const EPOCH = { y: 2026, m: 11, d: 26 };

const GUESSES = new Set(DAILY_NAME_GUESSES.split(" "));

export type LetterMark = "right" | "elsewhere" | "absent";

/** "2026-11-26" for the reader's own local date. */
export function localDateKey(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Whole days from EPOCH to a "YYYY-MM-DD" key. Both ends go through Date.UTC, so a daylight-saving
 * change can never make one day 23 or 25 hours long here. */
function daysSinceEpoch(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(EPOCH.y, EPOCH.m - 1, EPOCH.d)) / 86_400_000);
}

/** The puzzle number shown to readers, from 1. A device whose clock is set before launch gets #1. */
export function puzzleNumber(key: string): number {
  return Math.max(0, daysSinceEpoch(key)) + 1;
}

/** Small deterministic PRNG (mulberry32), so a cycle's shuffle is the same on every device. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cycleOrders = new Map<number, number[]>();
function cycleOrder(cycle: number): number[] {
  const cached = cycleOrders.get(cycle);
  if (cached) return cached;
  const order = DAILY_NAME_ANSWERS.map((_, i) => i);
  if (cycle > 0) {
    const r = rng(0x5eed + cycle);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  cycleOrders.set(cycle, order);
  return order;
}

/** The answer for a puzzle number (from 1). */
export function answerForPuzzle(n: number): DailyNameAnswer {
  const i = Math.max(0, n - 1);
  const count = DAILY_NAME_ANSWERS.length;
  return DAILY_NAME_ANSWERS[cycleOrder(Math.floor(i / count))[i % count]];
}

export function isAcceptedGuess(word: string): boolean {
  return GUESSES.has(word.toUpperCase());
}

/** Letter feedback with duplicate letters handled the standard way: exact matches are claimed
 * first, then each remaining guessed letter is "elsewhere" only while the answer still has an
 * unclaimed copy of it. So guessing ANNA against NOAH marks one N right-or-elsewhere, never two. */
export function markGuess(guess: string, answer: string): LetterMark[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const marks: LetterMark[] = Array.from({ length: g.length }, () => "absent");
  const spare = new Map<string, number>();
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) marks[i] = "right";
    else spare.set(a[i], (spare.get(a[i]) ?? 0) + 1);
  }
  for (let i = 0; i < g.length; i++) {
    if (marks[i] === "right") continue;
    const left = spare.get(g[i]) ?? 0;
    if (left > 0) {
      marks[i] = "elsewhere";
      spare.set(g[i], left - 1);
    }
  }
  return marks;
}

/** A practice word: any answer, picked at random, never today's. */
export function practiceAnswer(todayWord: string): DailyNameAnswer {
  const pool = DAILY_NAME_ANSWERS.filter((a) => a.word !== todayWord);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* --------------------------------------------------------------------------
 * Device storage
 * ------------------------------------------------------------------------ */

export interface DailyRecord {
  /** Guesses made so far, upper case. */
  guesses: string[];
  /** The answer this record was played against — so a later data change can never re-score it. */
  word: string;
}

interface Stored {
  v: 1;
  days: Record<string, DailyRecord>;
}

const STORAGE_KEY = "daily-name-v1";

export function readDays(): Record<string, DailyRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (!parsed || parsed.v !== 1 || typeof parsed.days !== "object" || !parsed.days) return {};
    const out: Record<string, DailyRecord> = {};
    for (const [k, r] of Object.entries(parsed.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && r && Array.isArray(r.guesses) && typeof r.word === "string") {
        out[k] = { guesses: r.guesses.filter((x): x is string => typeof x === "string").slice(0, MAX_GUESSES), word: r.word };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeDay(key: string, record: DailyRecord) {
  try {
    const days = readDays();
    days[key] = record;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, days } satisfies Stored));
  } catch {
    /* Storage blocked or full — today's game still plays; it just won't be remembered. */
  }
}

export const isWon = (r: DailyRecord) => r.guesses.includes(r.word);
export const isFinished = (r: DailyRecord) => isWon(r) || r.guesses.length >= MAX_GUESSES;

export interface DailyStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  /** distribution[i] = games won in i + 1 guesses. */
  distribution: number[];
}

/** Stats are derived from the stored days every time, never kept as running counters, so they
 * cannot drift from the games actually recorded. A streak is consecutive calendar days won; it
 * survives until a day is lost or a whole day passes unplayed (today, still unfinished, does not
 * break it yet). */
export function computeStats(days: Record<string, DailyRecord>, todayKey: string): DailyStats {
  const finished = Object.entries(days).filter(([, r]) => isFinished(r));
  const distribution = Array.from({ length: MAX_GUESSES }, () => 0);
  let won = 0;
  for (const [, r] of finished) {
    if (isWon(r)) {
      won++;
      distribution[r.guesses.indexOf(r.word)]++;
    }
  }
  const wonOn = new Set(finished.filter(([, r]) => isWon(r)).map(([k]) => daysSinceEpoch(k)));
  // Max streak: longest run of consecutive won day numbers.
  let maxStreak = 0;
  for (const d of wonOn) {
    if (wonOn.has(d - 1)) continue;
    let len = 1;
    while (wonOn.has(d + len)) len++;
    maxStreak = Math.max(maxStreak, len);
  }
  const today = daysSinceEpoch(todayKey);
  const todayRecord = days[todayKey];
  let start = todayRecord && isFinished(todayRecord) ? today : today - 1;
  let currentStreak = 0;
  while (wonOn.has(start)) {
    currentStreak++;
    start--;
  }
  return { played: finished.length, won, currentStreak, maxStreak, distribution };
}

const SHARE_MARK: Record<LetterMark, string> = { right: "●", elsewhere: "◐", absent: "○" };

/** The spoiler-free result: puzzle number, score and one row of symbols per guess. No letters. */
export function shareText(n: number, record: DailyRecord): string {
  const score = isWon(record) ? `${record.guesses.indexOf(record.word) + 1}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const rows = record.guesses.map((g) => markGuess(g, record.word).map((m) => SHARE_MARK[m]).join(""));
  return [`Capstone Bible · Daily Name #${n} · ${score}`, ...rows, "● right spot  ◐ wrong spot  ○ not in the name", "capstonebible.com"].join("\n");
}

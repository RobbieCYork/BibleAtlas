import { CROSSWORD_WORDS, type CrosswordLevel, type CrosswordWordEntry } from "./crosswordWords";

export const PUZZLES_PER_LEVEL = 15;

export type CrosswordDirection = "across" | "down";

export interface CrosswordEntry {
  number: number;
  direction: CrosswordDirection;
  row: number;
  col: number;
  length: number;
  answer: string;
  clue: string;
}

export interface CrosswordPuzzle {
  level: CrosswordLevel;
  puzzleIndex: number;
  width: number;
  height: number;
  /** null = a black/unused square. */
  grid: (string | null)[][];
  entries: CrosswordEntry[];
}

// ------------------------------------------------------------------------------------------------
// Deterministic PRNG — same technique as src/data/gameQuestions.ts (FNV-1a hash -> mulberry32), so a
// given (level, puzzleIndex) always produces the exact same puzzle for every player, with no server
// round trip or stored grid — everything's derived client-side from crosswordWords.ts.
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

function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Layout — a standard greedy crossword constructor: place the longest word first, then repeatedly
// find the highest-scoring valid crossing for each remaining word against whatever's already placed,
// looping over leftovers until a full pass places nothing new (a word skipped early sometimes fits
// once more letters exist to cross). A word that never finds a valid crossing is simply left out of
// the puzzle — the picker below oversamples the word bank so this never leaves too few words placed.
//
// Scoring prioritizes COMPACTNESS over raw crossing count: a placement that barely grows (or shrinks
// inside) the puzzle's current bounding box beats one that adds more crossings but flings the word
// out into empty space, which is what used to leave real crosswords looking mostly black — a
// bounding box stretched by a few long, barely-touching arms, with huge dead rows/columns in between.
// Real newspaper-style crosswords stay dense because every word is chosen to hug what's already
// there; this is the cheapest way to get that same effect without a full constraint-based compiler.
// ------------------------------------------------------------------------------------------------

interface Placement {
  row: number;
  col: number;
  dir: CrosswordDirection;
}

interface BBox {
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

function bboxArea(b: BBox): number {
  if (b.minR > b.maxR) return 0;
  return (b.maxR - b.minR + 1) * (b.maxC - b.minC + 1);
}

function growBBox(b: BBox, row: number, col: number, dir: CrosswordDirection, length: number): BBox {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  const endRow = row + dr * (length - 1);
  const endCol = col + dc * (length - 1);
  return {
    minR: Math.min(b.minR, row, endRow),
    maxR: Math.max(b.maxR, row, endRow),
    minC: Math.min(b.minC, col, endCol),
    maxC: Math.max(b.maxC, col, endCol),
  };
}

function canPlace(occupied: Map<string, string>, word: string, row: number, col: number, dir: CrosswordDirection): boolean {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  // The cell immediately before the start and immediately after the end must be empty, or this word
  // would visually run into/merge with another word along the same line.
  if (occupied.has(`${row - dr},${col - dc}`)) return false;
  if (occupied.has(`${row + dr * word.length},${col + dc * word.length}`)) return false;

  let hasCrossing = false;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = occupied.get(`${r},${c}`);
    if (existing) {
      if (existing !== word[i]) return false;
      hasCrossing = true;
    } else {
      // A non-crossing cell can't be directly adjacent (perpendicular to this word's own direction)
      // to another letter — that would silently form an unintended second word along that line.
      const [na, nb] = dir === "across" ? [`${r - 1},${c}`, `${r + 1},${c}`] : [`${r},${c - 1}`, `${r},${c + 1}`];
      if (occupied.has(na) || occupied.has(nb)) return false;
    }
  }
  return hasCrossing;
}

function countCrossings(occupied: Map<string, string>, word: string, row: number, col: number, dir: CrosswordDirection): number {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    if (occupied.has(`${row + dr * i},${col + dc * i}`)) count++;
  }
  return count;
}

/** How heavily a unit of bounding-box growth outweighs one extra crossing — large enough that
 * compactness always wins the comparison first, with crossings only breaking ties between equally
 * compact candidates (rather than the reverse, which is what produced sprawling, mostly-black grids). */
const COMPACTNESS_WEIGHT = 1000;

function findBestPlacement(occupied: Map<string, string>, word: string, bbox: BBox): Placement | null {
  let best: (Placement & { score: number }) | null = null;
  const currentArea = bboxArea(bbox);
  for (const [key, letter] of occupied) {
    const [rStr, cStr] = key.split(",");
    const r = Number(rStr);
    const c = Number(cStr);
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== letter) continue;
      const acrossRow = r;
      const acrossCol = c - i;
      if (canPlace(occupied, word, acrossRow, acrossCol, "across")) {
        const crossings = countCrossings(occupied, word, acrossRow, acrossCol, "across");
        const bboxDelta = bboxArea(growBBox(bbox, acrossRow, acrossCol, "across", word.length)) - currentArea;
        const score = crossings - bboxDelta * COMPACTNESS_WEIGHT;
        if (!best || score > best.score) best = { row: acrossRow, col: acrossCol, dir: "across", score };
      }
      const downRow = r - i;
      const downCol = c;
      if (canPlace(occupied, word, downRow, downCol, "down")) {
        const crossings = countCrossings(occupied, word, downRow, downCol, "down");
        const bboxDelta = bboxArea(growBBox(bbox, downRow, downCol, "down", word.length)) - currentArea;
        const score = crossings - bboxDelta * COMPACTNESS_WEIGHT;
        if (!best || score > best.score) best = { row: downRow, col: downCol, dir: "down", score };
      }
    }
  }
  return best;
}

interface PlacedWord extends Placement {
  word: string;
  clue: string;
}

function layoutWords(candidates: CrosswordWordEntry[]): PlacedWord[] {
  const occupied = new Map<string, string>();
  const placed: PlacedWord[] = [];
  let remaining = [...candidates];

  // First (and longest, since callers pass length-descending) word anchors the grid.
  const first = remaining.shift();
  if (!first) return placed;
  for (let i = 0; i < first.word.length; i++) occupied.set(`0,${i}`, first.word[i]);
  placed.push({ word: first.word, clue: first.clue, row: 0, col: 0, dir: "across" });
  let bbox: BBox = { minR: 0, maxR: 0, minC: 0, maxC: first.word.length - 1 };

  // Keep sweeping the leftovers until a full pass places nothing new — a word skipped early can fit
  // once a later word has opened up a fresh shared letter.
  let progress = true;
  while (progress && remaining.length > 0) {
    progress = false;
    const stillRemaining: CrosswordWordEntry[] = [];
    for (const cand of remaining) {
      const placement = findBestPlacement(occupied, cand.word, bbox);
      if (!placement) {
        stillRemaining.push(cand);
        continue;
      }
      const dr = placement.dir === "down" ? 1 : 0;
      const dc = placement.dir === "across" ? 1 : 0;
      for (let i = 0; i < cand.word.length; i++) occupied.set(`${placement.row + dr * i},${placement.col + dc * i}`, cand.word[i]);
      placed.push({ word: cand.word, clue: cand.clue, row: placement.row, col: placement.col, dir: placement.dir });
      bbox = growBBox(bbox, placement.row, placement.col, placement.dir, cand.word.length);
      progress = true;
    }
    remaining = stillRemaining;
  }

  return placed;
}

/** Builds one crossword from a candidate word list — pass a bigger list than you need placed; any
 * word that can't find a valid crossing is simply left out. */
export function buildCrosswordFromWords(candidates: CrosswordWordEntry[], level: CrosswordLevel, puzzleIndex: number): CrosswordPuzzle {
  const sorted = [...candidates].sort((a, b) => b.word.length - a.word.length);
  const placed = layoutWords(sorted);

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const p of placed) {
    const dr = p.dir === "down" ? 1 : 0;
    const dc = p.dir === "across" ? 1 : 0;
    const endRow = p.row + dr * (p.word.length - 1);
    const endCol = p.col + dc * (p.word.length - 1);
    minR = Math.min(minR, p.row, endRow);
    maxR = Math.max(maxR, p.row, endRow);
    minC = Math.min(minC, p.col, endCol);
    maxC = Math.max(maxC, p.col, endCol);
  }
  let height = maxR - minR + 1;
  let width = maxC - minC + 1;
  let grid: (string | null)[][] = Array.from({ length: height }, () => Array(width).fill(null));
  let normalized = placed.map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }));
  for (const p of normalized) {
    const dr = p.dir === "down" ? 1 : 0;
    const dc = p.dir === "across" ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) grid[p.row + dr * i][p.col + dc * i] = p.word[i];
  }

  // Belt-and-suspenders on top of the compactness scoring above: drop any row/column that ended up
  // entirely black anyway (can still happen — e.g. the very first word's own span before anything
  // else crossed it), closing the gap rather than leaving a dead band running across the whole grid.
  // A row/column is only safe to drop if it's black EVERYWHERE *and* never sits as the one-cell gap
  // between two separate word-ends on the same line — removing that gap would visually weld two
  // distinct words into what reads as one continuous run with no divider.
  {
    const canRemoveCol = (c: number) =>
      grid.every((row) => {
        if (row[c] !== null) return false;
        const left = c > 0 ? row[c - 1] : null;
        const right = c < width - 1 ? row[c + 1] : null;
        return !(left !== null && right !== null);
      });
    const canRemoveRow = (r: number) =>
      grid[r].every((cell, c) => {
        if (cell !== null) return false;
        const above = r > 0 ? grid[r - 1][c] : null;
        const below = r < height - 1 ? grid[r + 1][c] : null;
        return !(above !== null && below !== null);
      });

    const rowMap = new Map<number, number>();
    let nextRow = 0;
    for (let r = 0; r < height; r++) {
      if (!canRemoveRow(r)) rowMap.set(r, nextRow++);
    }
    const colMap = new Map<number, number>();
    let nextCol = 0;
    for (let c = 0; c < width; c++) {
      if (!canRemoveCol(c)) colMap.set(c, nextCol++);
    }

    height = nextRow;
    width = nextCol;
    grid = Array.from({ length: height }, () => Array(width).fill(null));
    normalized = normalized.map((p) => ({ ...p, row: rowMap.get(p.row)!, col: colMap.get(p.col)! }));
    for (const p of normalized) {
      const dr = p.dir === "down" ? 1 : 0;
      const dc = p.dir === "across" ? 1 : 0;
      for (let i = 0; i < p.word.length; i++) grid[p.row + dr * i][p.col + dc * i] = p.word[i];
    }
  }

  // Standard crossword numbering: scan row-major, a cell gets the next number if it starts an across
  // word (has a letter, empty/edge to its left, a letter to its right) and/or a down word (letter,
  // empty/edge above, letter below) — one shared number even if it starts both.
  let nextNumber = 1;
  const numberAt = new Map<string, number>();
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!grid[r][c]) continue;
      const startsAcross = (c === 0 || !grid[r][c - 1]) && c + 1 < width && !!grid[r][c + 1];
      const startsDown = (r === 0 || !grid[r - 1]?.[c]) && r + 1 < height && !!grid[r + 1][c];
      if (startsAcross || startsDown) {
        numberAt.set(`${r},${c}`, nextNumber);
        nextNumber++;
      }
    }
  }

  const entries: CrosswordEntry[] = normalized.map((p) => ({
    number: numberAt.get(`${p.row},${p.col}`) ?? 0,
    direction: p.dir,
    row: p.row,
    col: p.col,
    length: p.word.length,
    answer: p.word,
    clue: p.clue,
  }));
  entries.sort((a, b) => a.number - b.number || (a.direction === "across" ? -1 : 1));

  return { level, puzzleIndex, width, height, grid, entries };
}

const puzzleCache = new Map<string, CrosswordPuzzle>();

/** Base candidate-pool size per level, and the minimum placed-word count worth accepting. Beginner
 * stays deliberately small and simple (a handful of short words, little kids shouldn't face a sprawling
 * grid); every other level is sized to fill a genuinely large board — the puzzle screen scrolls/zooms
 * (see CrosswordView.tsx) specifically so these can be big without becoming unusable. */
const BASE_SUBSET_SIZE: Record<CrosswordLevel, number> = {
  beginner: 12,
  easy: 22,
  intermediate: 24,
  advanced: 20,
  expert: 20,
};
const MIN_ENTRIES: Record<CrosswordLevel, number> = {
  beginner: 6,
  easy: 14,
  intermediate: 14,
  advanced: 12,
  expert: 12,
};

/** The public entry point — deterministic per (level, puzzleIndex), so every call for the same pair
 * returns an identical puzzle (memoized since layout isn't free to redo on every re-render). Starts
 * from a level-appropriate candidate subset (see BASE_SUBSET_SIZE) and, if an unlucky seed still
 * leaves the grid too sparse (see MIN_ENTRIES), grows the subset and retries rather than shipping a
 * near-empty puzzle. */
export function getCrosswordPuzzle(level: CrosswordLevel, puzzleIndex: number): CrosswordPuzzle {
  const cacheKey = `${level}-${puzzleIndex}`;
  const cached = puzzleCache.get(cacheKey);
  if (cached) return cached;

  const bank = CROSSWORD_WORDS[level];
  const rand = mulberry32(hashSeed(`${cacheKey}-pick`));
  const shuffled = seededShuffle(bank, rand);

  let subsetSize = Math.min(bank.length, BASE_SUBSET_SIZE[level]);
  let puzzle = buildCrosswordFromWords(shuffled.slice(0, subsetSize), level, puzzleIndex);
  while (puzzle.entries.length < MIN_ENTRIES[level] && subsetSize < bank.length) {
    subsetSize = Math.min(bank.length, subsetSize + 3);
    puzzle = buildCrosswordFromWords(shuffled.slice(0, subsetSize), level, puzzleIndex);
  }

  puzzleCache.set(cacheKey, puzzle);
  return puzzle;
}

/** Picks a random puzzle index for a level, optionally excluding one (the puzzle just completed) so
 * finishing and choosing the same level again doesn't just hand back the same puzzle. */
export function pickRandomPuzzleIndex(excludeIndex?: number): number {
  if (PUZZLES_PER_LEVEL <= 1) return 0;
  let index = Math.floor(Math.random() * PUZZLES_PER_LEVEL);
  if (excludeIndex !== undefined && PUZZLES_PER_LEVEL > 1) {
    while (index === excludeIndex) index = Math.floor(Math.random() * PUZZLES_PER_LEVEL);
  }
  return index;
}

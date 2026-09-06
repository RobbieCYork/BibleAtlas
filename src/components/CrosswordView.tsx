import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CROSSWORD_LEVELS, type CrosswordLevel } from "../data/crosswordWords";
import { getCrosswordPuzzle, pickRandomPuzzleIndex, type CrosswordEntry, type CrosswordPuzzle } from "../data/generateCrossword";
import { backgroundFor } from "../data/crosswordBackgrounds";
import BackButton from "./BackButton";
import "./Crossword.css";
import Icon from "./Icon";

/** A scenic Holy Land photo behind the screen, tinted with a theme-aware scrim (see .crossword-scenic
 * in Crossword.css) so the actual puzzle content stays fully legible — the grid/clue panels keep their
 * normal solid backgrounds regardless, this only shows through the surrounding margins. */
function scenicStyle(key: string): React.CSSProperties {
  return { "--xw-photo": `url(${backgroundFor(key).url})` } as React.CSSProperties;
}

interface CrosswordViewProps {
  onBack: () => void;
}

type Direction = "across" | "down";

const DEFAULT_CELL_SIZE = 30;
/** Only reachable by deliberately zooming out — a 30-column puzzle cannot fit a 375px phone at any
 * size a finger can hit, so at this end of the range "Fit" is buying an orientation thumbnail, not a
 * playable board. It has to go this low for "Fit" to keep its promise on the widest puzzles the
 * generator produces (~31 columns in a ~325px box). Nothing auto-selects it. */
const MIN_CELL_SIZE = 8;
/** 80px is four columns on a phone, which is the point of zooming in at all. The old ceiling was 44 —
 * exactly the tap-target minimum, i.e. the smallest size that is merely acceptable. */
const MAX_CELL_SIZE = 80;
const ZOOM_STEP = 6;
/** The starting size never drops below this, whatever the puzzle's dimensions. 44px is the tap-target
 * minimum, and no phone width can show a 30-column board at 44px, so this is a compromise: big
 * enough to read and aim at, small enough that panning stays modest. Panning around a board bigger
 * than the screen is the intended experience on a phone — the sticky clue/zoom bar is what keeps the
 * player oriented while they do it, and "Fit" is what puts the whole thing back on screen.
 *
 * Combined with the DEFAULT_CELL_SIZE ceiling this means every puzzle now opens at 28-30px cells
 * whatever its dimensions, instead of Advanced opening at 20px and Expert at 22px. */
const MIN_DEFAULT_CELL_SIZE = 28;
/** Used only for the very first render, before the grid box has been measured. */
const FALLBACK_BOARD_WIDTH = 520;

function clampCellSize(size: number): number {
  return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, Math.round(size)));
}

/** Fit zooms in as well as out, but only to a comfortable reading size — a 7-column Beginner board
 * on a desktop would otherwise fit at 95px a square, which is a wall of enormous boxes and pushes the
 * clue list off its row. 44px is the tap-target minimum: as large as "fit" ever needs to be. */
const FIT_MAX_CELL_SIZE = 44;

/** The largest cell size that puts the whole board inside `availableWidth` — what the "Fit" control
 * gives you. On the big levels this is genuinely tiny; that is the honest answer to "show me all of
 * it on a phone", and it is opt-in rather than the default for exactly that reason. */
function fitCellSizeFor(puzzle: CrosswordPuzzle, availableWidth: number): number {
  return clampCellSize(Math.min(FIT_MAX_CELL_SIZE, Math.floor(availableWidth / puzzle.width)));
}

/** Where a puzzle opens. Previously this divided a hardcoded 520 by the puzzle width — a board width
 * no phone has (the grid box measures ~333px inside a 375px viewport), so the result was neither a
 * fit nor a tappable size: Advanced opened at 20px cells AND still overflowed its box by 190px. Now
 * it fits when the board genuinely fits, and otherwise opens at a size a fingertip can land on. */
function defaultCellSizeFor(puzzle: CrosswordPuzzle, availableWidth: number): number {
  const fit = fitCellSizeFor(puzzle, availableWidth);
  return Math.max(MIN_DEFAULT_CELL_SIZE, Math.min(DEFAULT_CELL_SIZE, fit));
}

function touchDistance(touches: TouchList): number {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function buildAnswerGrid(puzzle: CrosswordPuzzle): string[][] {
  return Array.from({ length: puzzle.height }, () => Array(puzzle.width).fill(""));
}

/** A standalone (single-player) crossword game — pick a difficulty, solve a randomly-assigned puzzle
 * from that level's bank of 15, then either restart it, get another random one from the same level
 * (never immediately repeating the one just finished), or pick a different level entirely. Everything
 * here is generated client-side (see src/data/generateCrossword.ts) — no backend involved. */
export default function CrosswordView({ onBack }: CrosswordViewProps) {
  const [level, setLevel] = useState<CrosswordLevel | null>(null);
  const [puzzleIndex, setPuzzleIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<string[][]>([]);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = useState<Direction>("across");
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);
  const lastCompletedRef = useRef<Partial<Record<CrosswordLevel, number>>>({});
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  /** Mirrors `cellSize` for the native touch/wheel listeners below, which are attached once per
   * puzzle and would otherwise close over a stale value between renders. */
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;
  /** Usable width inside the grid box, measured rather than assumed — null until the box exists.
   * `clientWidth` is in the element's own CSS units, the same units `--xw-cell` is written in, so it
   * stays correct whatever scaling an ancestor applies. */
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);

  const puzzle = level !== null && puzzleIndex !== null ? getCrosswordPuzzle(level, puzzleIndex) : null;

  // Every entry (across/down) that passes through each cell, and which entry (if any) starts there —
  // derived once per puzzle, used for click-to-select, direction toggling, and the small corner number.
  const cellIndex = useMemo(() => {
    const entriesAt = new Map<string, CrosswordEntry[]>();
    const startNumberAt = new Map<string, number>();
    if (puzzle) {
      for (const entry of puzzle.entries) {
        startNumberAt.set(`${entry.row},${entry.col}`, entry.number);
        const dr = entry.direction === "down" ? 1 : 0;
        const dc = entry.direction === "across" ? 1 : 0;
        for (let i = 0; i < entry.length; i++) {
          const key = `${entry.row + dr * i},${entry.col + dc * i}`;
          const list = entriesAt.get(key) ?? [];
          list.push(entry);
          entriesAt.set(key, list);
        }
      }
    }
    return { entriesAt, startNumberAt };
  }, [puzzle]);

  const activeEntry: CrosswordEntry | null =
    selected && puzzle
      ? (cellIndex.entriesAt.get(`${selected.row},${selected.col}`) ?? []).find((e) => e.direction === direction) ?? null
      : null;
  const activeCellKeys = useMemo(() => {
    const keys = new Set<string>();
    if (activeEntry) {
      const dr = activeEntry.direction === "down" ? 1 : 0;
      const dc = activeEntry.direction === "across" ? 1 : 0;
      for (let i = 0; i < activeEntry.length; i++) keys.add(`${activeEntry.row + dr * i},${activeEntry.col + dc * i}`);
    }
    return keys;
  }, [activeEntry]);

  const solved =
    !!puzzle &&
    answers.length > 0 &&
    puzzle.grid.every((row, r) => row.every((cell, c) => !cell || answers[r][c] === cell));

  const startLevel = (lvl: CrosswordLevel, excludeIndex?: number) => {
    const idx = pickRandomPuzzleIndex(excludeIndex);
    const newPuzzle = getCrosswordPuzzle(lvl, idx);
    setLevel(lvl);
    setPuzzleIndex(idx);
    setAnswers(buildAnswerGrid(newPuzzle));
    setSelected(null);
    setCellSize(defaultCellSizeFor(newPuzzle, availableWidth ?? FALLBACK_BOARD_WIDTH));
    inputRefs.current.clear();
  };

  /** Scroll offsets to apply on the very next commit, so a zoom keeps whatever the player was
   * looking at (a pinch's midpoint, or the centre of the box for the +/− buttons) under the same
   * point on screen. Written before setCellSize, consumed by the useLayoutEffect below — it has to
   * land in the same frame as the new layout or the board visibly jumps. */
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const pending = pendingScrollRef.current;
    const el = scrollRef.current;
    pendingScrollRef.current = null;
    if (!pending || !el) return;
    // Assigning past the scrollable range is clamped by the browser, which is the behaviour we want
    // at the board's edges.
    el.scrollLeft = pending.left;
    el.scrollTop = pending.top;
  }, [cellSize]);

  /** Re-zooms about the centre of the visible box — used by the +/− and Fit controls, so pressing +
   * magnifies what you are already looking at instead of drifting toward the board's top-left. */
  const zoomTo = (next: number) => {
    const size = clampCellSize(next);
    const el = scrollRef.current;
    const current = cellSizeRef.current;
    if (el && current > 0 && size !== current) {
      const ratio = size / current;
      const midX = el.scrollLeft + el.clientWidth / 2;
      const midY = el.scrollTop + el.clientHeight / 2;
      pendingScrollRef.current = { left: midX * ratio - el.clientWidth / 2, top: midY * ratio - el.clientHeight / 2 };
    }
    setCellSize(size);
  };

  const zoomIn = () => zoomTo(cellSize + ZOOM_STEP);
  const zoomOut = () => zoomTo(cellSize - ZOOM_STEP);
  /** "Fit" is the escape hatch: whatever the player has pinched their way into, one tap always puts
   * the entire board back on screen. */
  const zoomFit = () => {
    if (puzzle) zoomTo(fitCellSizeFor(puzzle, availableWidth ?? FALLBACK_BOARD_WIDTH));
  };

  // Keep `availableWidth` current: it changes on rotation, on a text-size change, and on the first
  // render after the level picker is replaced by the board.
  //
  // Measured from the grid box's PARENT, not the grid box itself. The box shrink-wraps its board
  // (max-width: 100%, so a 6-column Beginner board sits in a 188px box inside a 335px row), which
  // makes its own width a function of the very cell size we are trying to choose — measuring it fed
  // the current zoom straight back into "what size fits", so zooming out ratcheted downward and
  // could never recover. The parent's content width is the honest answer to "how much room is
  // there", and it does not move when the cells do.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) {
      setAvailableWidth(null);
      return;
    }
    const measure = () => {
      const style = getComputedStyle(el);
      const chrome =
        parseFloat(style.paddingLeft || "0") +
        parseFloat(style.paddingRight || "0") +
        parseFloat(style.borderLeftWidth || "0") +
        parseFloat(style.borderRightWidth || "0");
      const inner = parent.clientWidth - chrome;
      if (inner > 0) setAvailableWidth((prev) => (prev === inner ? prev : inner));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [puzzle]);

  // Choose each puzzle's opening zoom from the box's REAL width, once we have one. Keyed on the
  // puzzle so a player's own zoom is never yanked back mid-solve — only a new board resets it.
  const sizedForRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!puzzle || availableWidth === null) return;
    const key = `${level}-${puzzleIndex}`;
    if (sizedForRef.current === key) return;
    sizedForRef.current = key;
    setCellSize(defaultCellSizeFor(puzzle, availableWidth));
  }, [puzzle, availableWidth, level, puzzleIndex]);

  /* Pinch-to-zoom, and its trackpad equivalent.
   *
   * Zooming here changes the CELL SIZE and lets the grid re-lay out, rather than putting a CSS
   * transform (or `zoom`) over a fixed-size board. That matters for three reasons:
   *   - Hit-testing stays exact. A tap lands in the cell the player aimed at because the cell really
   *     is that big — there is no scaled coordinate space for the browser to invert.
   *   - The letters scale with the cells, since .crossword-cell-input sizes its font off --xw-cell.
   *     A CSS `zoom` would not: WebKit recomputes font size from the specified size and discards
   *     what `zoom` applied, which is the live iPhone text-scaling bug in this app right now.
   *   - The caret, focus and the on-screen keyboard's scroll-into-view all work on real geometry.
   * Panning stays native scrolling on .crossword-grid-scroll — momentum and rubber-banding for free,
   * and tap/focus untouched.
   *
   * These are native listeners rather than React props because they must be non-passive to
   * preventDefault, and React attaches touch handlers passively at the root. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !puzzle) return;

    /** Anchor captured when the second finger lands. Everything is measured against the gesture's
     * start rather than the previous frame, so repeated small moves cannot accumulate drift. */
    let pinch: { startDistance: number; startCell: number; gx: number; gy: number; scrollLeft: number; scrollTop: number } | null =
      null;

    /** Focal point in the board's own coordinate space, measured from the board's top-left corner.
     * The board element is laid out at the scroll container's content origin and overflows to the
     * right/bottom, so its bounding rect's top-left IS the board origin at the current scroll. */
    const focalOnBoard = (clientX: number, clientY: number) => {
      const grid = gridRef.current;
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      // An ancestor may scale this subtree (the app's text-size setting). Derive the ratio from the
      // element itself instead of assuming a value, so the arithmetic is right either way: on an
      // engine where offsetWidth is already scaled this comes out as 1 and the client-pixel and
      // scroll-offset units agree anyway.
      const scale = grid.offsetWidth > 0 ? rect.width / grid.offsetWidth : 1;
      if (!(scale > 0)) return null;
      return { gx: (clientX - rect.left) / scale, gy: (clientY - rect.top) / scale };
    };

    /** Re-zoom about a fixed point on the board. A point sitting `gx` from the board's left edge sits
     * at `gx * next / from` once cells grow from `from` to `next`, so shifting the scroll by the
     * difference leaves it under the same finger. */
    const zoomAbout = (next: number, from: number, gx: number, gy: number, scrollLeft: number, scrollTop: number) => {
      const ratio = next / from;
      pendingScrollRef.current = { left: scrollLeft + gx * (ratio - 1), top: scrollTop + gy * (ratio - 1) };
      setCellSize(next);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) {
        pinch = null;
        return;
      }
      const focal = focalOnBoard(
        (e.touches[0].clientX + e.touches[1].clientX) / 2,
        (e.touches[0].clientY + e.touches[1].clientY) / 2
      );
      const startDistance = touchDistance(e.touches);
      if (!focal || startDistance <= 0) return;
      pinch = {
        startDistance,
        startCell: cellSizeRef.current,
        gx: focal.gx,
        gy: focal.gy,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      // Suppress the browser's own two-finger pan for the duration of the pinch. touch-action on the
      // container already rules out page zoom; this keeps the native scroll from fighting ours.
      e.preventDefault();
      const next = clampCellSize(pinch.startCell * (touchDistance(e.touches) / pinch.startDistance));
      if (next === cellSizeRef.current) return;
      zoomAbout(next, pinch.startCell, pinch.gx, pinch.gy, pinch.scrollLeft, pinch.scrollTop);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };

    /** macOS trackpad pinch and ctrl+wheel arrive as a wheel event with ctrlKey set. Without ctrlKey
     * this does nothing at all, so ordinary wheel scrolling over the board is unchanged. */
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      const from = cellSizeRef.current;
      const focal = focalOnBoard(e.clientX, e.clientY);
      if (!focal || from <= 0) return;
      e.preventDefault();
      const next = clampCellSize(from * (1 - e.deltaY / 100));
      if (next === from) return;
      zoomAbout(next, from, focal.gx, focal.gy, el.scrollLeft, el.scrollTop);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [puzzle]);

  const restartPuzzle = () => {
    if (!puzzle) return;
    setAnswers(buildAnswerGrid(puzzle));
  };

  const nextPuzzleSameLevel = () => {
    if (level === null || puzzleIndex === null) return;
    lastCompletedRef.current[level] = puzzleIndex;
    startLevel(level, puzzleIndex);
  };

  const backToLevelPicker = () => {
    setLevel(null);
    setPuzzleIndex(null);
    setAnswers([]);
    setSelected(null);
  };

  const focusCell = (row: number, col: number) => inputRefs.current.get(`${row},${col}`)?.focus();

  // Tracks the last cell an actual CLICK landed on — deliberately separate from `selected` (which also
  // moves via typing/arrow-key auto-advance). A native <input> click fires both focus and click, and
  // auto-advance also calls .focus() on the next cell, so keying the "click the same cell again to
  // toggle direction" behavior off `selected` double-toggled on every click (once from each event) and
  // also mistakenly toggled the FIRST click onto a cell that typing had merely advanced into.
  const lastClickedRef = useRef<{ row: number; col: number } | null>(null);

  const selectCell = (row: number, col: number) => {
    if (!puzzle || !puzzle.grid[row][col]) return;
    const here = cellIndex.entriesAt.get(`${row},${col}`) ?? [];
    const previousClick = lastClickedRef.current;
    lastClickedRef.current = { row, col };
    if (previousClick && previousClick.row === row && previousClick.col === col) {
      // A second, separate click on the same cell — toggle direction, if this cell serves both.
      const other = here.find((e) => e.direction !== direction);
      if (other) setDirection(other.direction);
      return;
    }
    setSelected({ row, col });
    if (!here.some((e) => e.direction === direction)) {
      setDirection(here[0]?.direction ?? "across");
    }
  };

  /** Moves the input focus one cell forward/backward along `dir`, skipping nothing (crosswords don't
   * have gaps mid-word) — stops at the grid edge or a black square. */
  const stepFocus = (row: number, col: number, dir: Direction, delta: 1 | -1) => {
    if (!puzzle) return;
    const dr = dir === "down" ? delta : 0;
    const dc = dir === "across" ? delta : 0;
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nc < 0 || nr >= puzzle.height || nc >= puzzle.width || !puzzle.grid[nr][nc]) return;
    setSelected({ row: nr, col: nc });
    focusCell(nr, nc);
  };

  const handleLetterInput = (row: number, col: number, raw: string) => {
    const letter = raw.slice(-1).toUpperCase().replace(/[^A-Z]/, "");
    setAnswers((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = letter;
      return next;
    });
    if (letter) stepFocus(row, col, direction, 1);
  };

  const handleKeyDown = (row: number, col: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !answers[row]?.[col]) {
      e.preventDefault();
      stepFocus(row, col, direction, -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setDirection("across");
      stepFocus(row, col, "across", 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setDirection("across");
      stepFocus(row, col, "across", -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setDirection("down");
      stepFocus(row, col, "down", 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDirection("down");
      stepFocus(row, col, "down", -1);
    }
  };

  /** Across/Down toggle for the sticky clue bar. Tapping the same cell twice already does this, but
   * that is an awkward gesture on a phone and impossible to discover; the bar makes it a button. */
  const toggleDirection = () => {
    if (!selected) return;
    const here = cellIndex.entriesAt.get(`${selected.row},${selected.col}`) ?? [];
    const other = here.find((e) => e.direction !== direction);
    if (!other) return;
    setDirection(other.direction);
    // Don't leave this pointing at the cell we just toggled from, or the next tap on it would toggle
    // straight back (see lastClickedRef's note above).
    lastClickedRef.current = null;
    focusCell(selected.row, selected.col);
  };

  const selectEntry = (entry: CrosswordEntry) => {
    setSelected({ row: entry.row, col: entry.col });
    setDirection(entry.direction);
    focusCell(entry.row, entry.col);
  };

  if (!level || puzzleIndex === null || !puzzle) {
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2 className="games-inline-icon">
          <Icon name="crossword" />
          Bible Crossword
        </h2>
        </header>
        <div className="game-body crossword-scenic" style={scenicStyle("crossword-picker")}>
          <div className="crossword-level-picker">
            <div className="games-panel-intro">
              <h2>Choose a difficulty</h2>
              <p>Beginner is for little ones just learning Bible stories; Expert is seminary-level.</p>
            </div>
            <div className="game-center-list">
              {CROSSWORD_LEVELS.map((l) => (
                <button key={l.key} type="button" className="game-center-card crossword-level-card" onClick={() => startLevel(l.key)}>
                  <span className="game-center-card-icon">
                    <Icon name={l.icon} />
                  </span>
                  <span className="game-center-card-body">
                    <span className="game-center-card-title">{l.label}</span>
                    <span className="game-center-card-tagline">{l.description}</span>
                  </span>
                  <span className="game-center-card-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const across = puzzle.entries.filter((e) => e.direction === "across");
  const down = puzzle.entries.filter((e) => e.direction === "down");
  const levelDef = CROSSWORD_LEVELS.find((l) => l.key === level);
  const levelLabel = levelDef?.label ?? level;
  const background = backgroundFor(`${level}-${puzzleIndex}`);

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={backToLevelPicker} ariaLabel="Back to level picker" />
        {/* levelDef.icon is an IconName, not an emoji — rendering it bare printed the literal string
          * ("level4 Crossword — Advanced") in the header of every puzzle. Same treatment as the level
          * picker's own heading a few lines up. */}
        <h2 className="games-inline-icon">
          {levelDef && <Icon name={levelDef.icon} />}
          Crossword — {levelLabel}
        </h2>
      </header>
      <div className="game-body crossword-body crossword-scenic" style={scenicStyle(`${level}-${puzzleIndex}`)}>
        <div className="crossword-toolbar">
          <button type="button" className="games-secondary-button" onClick={restartPuzzle}>
            <Icon name="restart" inline /> Restart Puzzle
          </button>
          <button type="button" className="games-secondary-button" onClick={backToLevelPicker}>
            Choose Different Level
          </button>
        </div>

        {/* Sticky, so zooming in can never strand the player: the clue they are answering and the way
          * back out to a whole-board view both stay on screen however far the board is panned. */}
        <div className="crossword-sticky-bar">
          {activeEntry ? (
            <button
              type="button"
              className="crossword-current-clue"
              onClick={toggleDirection}
              aria-label={`Current clue: ${activeEntry.number} ${activeEntry.direction}. ${activeEntry.clue}. Switch direction.`}
            >
              <span className="crossword-current-clue-tag">
                {activeEntry.number} {activeEntry.direction === "across" ? "Across" : "Down"}
              </span>
              <span className="crossword-current-clue-text">{activeEntry.clue}</span>
            </button>
          ) : (
            <p className="crossword-current-clue crossword-current-clue-empty">Tap a square or a clue to start.</p>
          )}
          <div className="crossword-zoom-controls">
            <button type="button" className="games-secondary-button" onClick={zoomOut} disabled={cellSize <= MIN_CELL_SIZE} aria-label="Zoom out">
              −
            </button>
            <button type="button" className="games-secondary-button" onClick={zoomFit} aria-label="Fit whole board on screen">
              Fit
            </button>
            <button type="button" className="games-secondary-button" onClick={zoomIn} disabled={cellSize >= MAX_CELL_SIZE} aria-label="Zoom in">
              +
            </button>
          </div>
        </div>
        <p className="crossword-scroll-hint">Pinch to zoom the board, drag to pan — or use +/− and Fit.</p>

        {solved && (
          <div className="crossword-solved-banner">
            <p>🎉 Solved! Well done.</p>
            <button type="button" className="games-primary-button" onClick={nextPuzzleSameLevel}>
              New {levelLabel} Puzzle
            </button>
          </div>
        )}

        <div className="crossword-layout">
          <div className="crossword-grid-scroll" ref={scrollRef}>
            <div
              ref={gridRef}
              className="crossword-grid"
              style={
                {
                  "--xw-cell": `${cellSize}px`,
                  gridTemplateColumns: `repeat(${puzzle.width}, var(--xw-cell))`,
                  gridTemplateRows: `repeat(${puzzle.height}, var(--xw-cell))`,
                } as React.CSSProperties
              }
            >
              {puzzle.grid.map((rowCells, r) =>
                rowCells.map((cell, c) => {
                  const key = `${r},${c}`;
                  if (!cell) return <div key={key} className="crossword-cell crossword-cell-block" />;
                  const number = cellIndex.startNumberAt.get(key);
                  const isActive = activeCellKeys.has(key);
                  const isSelected = selected?.row === r && selected?.col === c;
                  return (
                    <div key={key} className={`crossword-cell${isActive ? " crossword-cell-active" : ""}`}>
                      {number !== undefined && <span className="crossword-cell-number">{number}</span>}
                      <input
                        ref={(el) => {
                          if (el) inputRefs.current.set(key, el);
                          else inputRefs.current.delete(key);
                        }}
                        className={`crossword-cell-input${isSelected ? " crossword-cell-selected" : ""}`}
                        value={answers[r]?.[c] ?? ""}
                        maxLength={1}
                        inputMode="text"
                        autoComplete="off"
                        autoCapitalize="characters"
                        onClick={() => selectCell(r, c)}
                        onChange={(e) => handleLetterInput(r, c, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(r, c, e)}
                        aria-label={`Row ${r + 1}, column ${c + 1}`}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="crossword-clues">
            <div className="crossword-clue-column">
              <h3>Across</h3>
              <ul>
                {across.map((e) => (
                  <li key={`a${e.number}`} className={activeEntry === e ? "crossword-clue-active" : ""}>
                    <button type="button" onClick={() => selectEntry(e)}>
                      <strong>{e.number}.</strong> {e.clue}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="crossword-clue-column">
              <h3>Down</h3>
              <ul>
                {down.map((e) => (
                  <li key={`d${e.number}`} className={activeEntry === e ? "crossword-clue-active" : ""}>
                    <button type="button" onClick={() => selectEntry(e)}>
                      <strong>{e.number}.</strong> {e.clue}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <a href={background.sourceUrl} target="_blank" rel="noopener noreferrer" className="crossword-photo-credit">
          <Icon name="camera" inline /> {background.caption} · Wikimedia Commons
        </a>
      </div>
    </div>
  );
}

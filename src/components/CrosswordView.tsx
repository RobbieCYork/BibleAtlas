import { useMemo, useRef, useState } from "react";
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
const MIN_CELL_SIZE = 14;
const MAX_CELL_SIZE = 44;
const ZOOM_STEP = 4;
/** Larger puzzles (Intermediate/Advanced/Expert can run 25-35 cells wide) start a bit more zoomed out
 * so the whole board isn't immediately off-screen — the player can still zoom in from there, and
 * swipes/scrolling on the grid container handle panning around a board bigger than the viewport. */
function defaultCellSizeFor(puzzle: CrosswordPuzzle): number {
  const fitWidth = Math.floor(520 / puzzle.width);
  return Math.max(MIN_CELL_SIZE, Math.min(DEFAULT_CELL_SIZE, fitWidth));
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
    setCellSize(defaultCellSizeFor(newPuzzle));
    inputRefs.current.clear();
  };

  const zoomIn = () => setCellSize((s) => Math.min(MAX_CELL_SIZE, s + ZOOM_STEP));
  const zoomOut = () => setCellSize((s) => Math.max(MIN_CELL_SIZE, s - ZOOM_STEP));
  const zoomReset = () => {
    if (puzzle) setCellSize(defaultCellSizeFor(puzzle));
  };

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
        <h2>
          {levelDef?.icon} Crossword — {levelLabel}
        </h2>
      </header>
      <div className="game-body crossword-body crossword-scenic" style={scenicStyle(`${level}-${puzzleIndex}`)}>
        <div className="crossword-toolbar">
          <button type="button" className="games-secondary-button" onClick={restartPuzzle}>
            🔄 Restart Puzzle
          </button>
          <button type="button" className="games-secondary-button" onClick={backToLevelPicker}>
            Choose Different Level
          </button>
          <div className="crossword-zoom-controls">
            <button type="button" className="games-secondary-button" onClick={zoomOut} disabled={cellSize <= MIN_CELL_SIZE} aria-label="Zoom out">
              −
            </button>
            <button type="button" className="games-secondary-button" onClick={zoomReset} aria-label="Reset zoom">
              Fit
            </button>
            <button type="button" className="games-secondary-button" onClick={zoomIn} disabled={cellSize >= MAX_CELL_SIZE} aria-label="Zoom in">
              +
            </button>
          </div>
        </div>
        <p className="crossword-scroll-hint">Swipe or scroll to pan the board — use +/− to zoom.</p>

        {solved && (
          <div className="crossword-solved-banner">
            <p>🎉 Solved! Well done.</p>
            <button type="button" className="games-primary-button" onClick={nextPuzzleSameLevel}>
              New {levelLabel} Puzzle
            </button>
          </div>
        )}

        <div className="crossword-layout">
          <div className="crossword-grid-scroll">
            <div
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
          📷 {background.caption} · Wikimedia Commons
        </a>
      </div>
    </div>
  );
}

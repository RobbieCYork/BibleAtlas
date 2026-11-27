import { useState } from "react";
import {
  CHRONOLOGY_LEVELS,
  correctPositions,
  dealRound,
  isOrdered,
  type ChronologyCard,
  type ChronologyLevel,
  type ChronologyLevelDef,
} from "../data/chronologyRounds";
import BackButton from "./BackButton";
import "./Chronology.css";
import Icon from "./Icon";
import { GameEntryChoices, LevelSetup } from "./GameEntry";
import { useScrollTop } from "../lib/useScrollTop";

interface ChronologyViewProps {
  onBack: () => void;
}

const STARTING_LIVES = 3;

const CATEGORY_LABELS: Record<ChronologyCard["category"], string> = {
  biblical: "Biblical History",
  church: "Church History",
  world: "World History",
  movement: "Movements & Revivals",
  religion: "World Religions",
};

type Screen = "home" | "menu" | "playing" | "gameover";

/** Chronology — the player is dealt a handful of timeline events in scrambled order and puts them
 * back into the order they happened, earliest at the top. Reordering is done with ▲/▼ buttons
 * rather than drag-and-drop: dragging is awkward on touch, and this stays keyboard-reachable and
 * screen-reader-legible for free. Three lives; any round with a card out of place costs one. */
export default function ChronologyView({ onBack }: ChronologyViewProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [level, setLevel] = useState<ChronologyLevelDef | null>(null);
  const [choice, setChoice] = useState<ChronologyLevel>(CHRONOLOGY_LEVELS[0].key);
  const [cards, setCards] = useState<ChronologyCard[]>([]);
  const [checked, setChecked] = useState(false);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [streak, setStreak] = useState(0);
  const playRef = useScrollTop(`${screen} ${cards.map((c) => c.id).sort().join()}`);

  const startGame = (key: ChronologyLevel) => {
    const def = CHRONOLOGY_LEVELS.find((l) => l.key === key);
    if (!def) return;
    setLevel(def);
    setCards(dealRound(def));
    setChecked(false);
    setLives(STARTING_LIVES);
    setScore(0);
    setStreak(0);
    setScreen("playing");
  };

  const backToMenu = () => {
    setScreen("menu");
    setLevel(null);
  };

  /** Swap a card with its neighbour. Disabled at the ends and once the round is checked, so the
   * revealed answer can't be quietly rearranged. */
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (checked || target < 0 || target >= cards.length) return;
    setCards((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const checkOrder = () => {
    setChecked(true);
    if (isOrdered(cards)) {
      const nextScore = score + 1;
      const nextStreak = streak + 1;
      setScore(nextScore);
      setStreak(nextStreak);
      setBest((b) => Math.max(b, nextStreak));
    } else {
      setStreak(0);
      setLives((l) => l - 1);
    }
  };

  const nextRound = () => {
    if (!level) return;
    if (lives <= 0) {
      setScreen("gameover");
      return;
    }
    setCards(dealRound(level));
    setChecked(false);
  };

  if (screen === "home" || screen === "menu") {
    return (
      <div className="game-root" data-page-bg="game-setup">
        <header className="game-header">
          <BackButton onClick={screen === "home" ? onBack : () => setScreen("home")} ariaLabel={screen === "home" ? "Back to Game Center" : "Back"} />
          <h2 className="games-inline-icon">
          <Icon name="chronology" />
          Chronology
        </h2>
        </header>
        <div className="game-body">
          {screen === "home" ? (
            <GameEntryChoices onSolo={() => setScreen("menu")} />
          ) : (
            <div className="chronology-picker">
              <div className="games-panel-intro">
                <h2>Play solo</h2>
                <p>
                  Put the events back in the order they happened, earliest first. Higher levels deal more
                  cards, closer together in time. Three lives.
                </p>
              </div>
              <LevelSetup name="chronology-level" levels={CHRONOLOGY_LEVELS} value={choice} onChange={setChoice} onStart={() => startGame(choice)} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "gameover") {
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={backToMenu} ariaLabel="Back to difficulty select" />
          <h2 className="games-inline-icon">
          <Icon name="chronology" />
          Chronology
        </h2>
        </header>
        <div className="game-body">
          <div className="chronology-gameover">
            <p className="chronology-gameover-icon" aria-hidden="true">
              <Icon name="heartBreak" />
            </p>
            <h2>Game Over</h2>
            <p className="chronology-gameover-score">
              {score} round{score === 1 ? "" : "s"} solved
            </p>
            <p className="chronology-gameover-best">Best streak: {best}</p>
            <div className="chronology-gameover-actions">
              <button type="button" className="chronology-btn-primary" onClick={() => level && startGame(level.key)}>
                Play Again
              </button>
              <button type="button" className="chronology-btn-secondary" onClick={backToMenu}>
                Change Difficulty
              </button>
              <button type="button" className="chronology-btn-secondary" onClick={onBack}>
                Back to Games
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const marks = checked ? correctPositions(cards) : null;
  const solved = checked && isOrdered(cards);

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={backToMenu} ariaLabel="Back to difficulty select" />
        <h2 className="games-inline-icon">
          <Icon name="chronology" />
          Chronology
        </h2>
      </header>
      <div ref={playRef} className="game-body game-fit chrono-play">
        <div className="chronology-hud">
          <span className="chronology-lives" aria-label={`${lives} lives remaining`}>
            {Array.from({ length: STARTING_LIVES }, (_, i) => (
              <span key={i} className={i < lives ? "chronology-heart" : "chronology-heart chronology-heart-lost"}>
                <Icon name={i < lives ? "heartFull" : "heart"} />
              </span>
            ))}
          </span>
          <span className="chronology-score">Solved: {score}</span>
          <span className="chronology-streak"><Icon name="flame" inline /> {streak}</span>
        </div>

        <p className="chronology-instruction">
          {checked
            ? solved
              ? <><Icon name="check" inline /> Correct — that's the right order.</>
              : <><Icon name="close" inline /> Not quite. The right order is shown below.</>
            : "Earliest at the top. Use ▲ ▼ to reorder."}
        </p>

        <ol className="chronology-list">
          {cards.map((card, i) => {
            const state = marks ? (marks[i] ? " chronology-card-correct" : " chronology-card-wrong") : "";
            return (
              <li key={card.id} className={`chronology-card${state}`}>
                <span className="chronology-card-rank" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="chronology-card-body">
                  <span className="chronology-card-title">{card.title}</span>
                  {checked && (
                    <span className="chronology-card-meta">
                      {card.dateLabel}
                      <span className="chronology-card-category">{CATEGORY_LABELS[card.category]}</span>
                    </span>
                  )}
                </span>
                {!checked && (
                  <span className="chronology-card-controls">
                    <button
                      type="button"
                      className="chronology-move"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move "${card.title}" earlier`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="chronology-move"
                      onClick={() => move(i, 1)}
                      disabled={i === cards.length - 1}
                      aria-label={`Move "${card.title}" later`}
                    >
                      ▼
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {checked && !solved && (
          <div className="chronology-solution">
            <h4>Correct order</h4>
            <ol>
              {[...cards]
                .sort((a, b) => a.startYear - b.startYear)
                .map((c) => (
                  <li key={c.id}>
                    <span className="chronology-solution-title">{c.title}</span>
                    <span className="chronology-solution-date">{c.dateLabel}</span>
                  </li>
                ))}
            </ol>
          </div>
        )}

        <div className="game-pin">
          {!checked ? (
            <button type="button" className="chronology-btn-primary" onClick={checkOrder}>
              Check Order
            </button>
          ) : (
            <button type="button" className="chronology-btn-primary" onClick={nextRound}>
              {lives <= 0 ? "See Results →" : "Next Round →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

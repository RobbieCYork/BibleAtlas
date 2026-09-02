import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTY_LEVELS,
  FILL_BLANK_VERSES,
  timeLimitFor,
  type Difficulty,
  type FillBlankVerse,
} from "../data/fillBlankVerses";
import BackButton from "./BackButton";
import "./FillBlank.css";
import Icon from "./Icon";

interface FillBlankViewProps {
  onBack: () => void;
}

const STARTING_LIVES = 3;

const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9' ]/g, "");

/** Fisher-Yates — used both for a fresh round's queue and to reshuffle once the pool runs dry, so a
 * long session cycles through every verse in the tier before any repeat. */
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Screen = "menu" | "playing" | "gameover";

/** "Fill in the Blank" — a standout OT/NT verse is shown with one or more phrases blanked out; the
 * player types each missing phrase before time runs out. Three lives; a wrong or timed-out answer
 * costs one. Time budget and blank count both scale with difficulty (see fillBlankVerses.ts). */
export default function FillBlankView({ onBack }: FillBlankViewProps) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [queue, setQueue] = useState<FillBlankVerse[]>([]);
  const [current, setCurrent] = useState<FillBlankVerse | null>(null);
  const [inputs, setInputs] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState<boolean | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const pool = useMemo(() => (difficulty ? FILL_BLANK_VERSES.filter((v) => v.difficulty === difficulty) : []), [difficulty]);

  const loadVerse = (fromQueue: FillBlankVerse[]) => {
    let q = fromQueue;
    if (q.length === 0) q = shuffled(pool);
    const [next, ...rest] = q;
    setCurrent(next);
    setInputs(next.blanks.map(() => ""));
    setTimeLeft(timeLimitFor(next));
    setRevealed(false);
    setRoundCorrect(null);
    setQueue(rest);
  };

  const startGame = (d: Difficulty) => {
    setDifficulty(d);
    setLives(STARTING_LIVES);
    setScore(0);
    setScreen("playing");
    const verses = FILL_BLANK_VERSES.filter((v) => v.difficulty === d);
    const q = shuffled(verses);
    const [next, ...rest] = q;
    setCurrent(next);
    setInputs(next.blanks.map(() => ""));
    setTimeLeft(timeLimitFor(next));
    setRevealed(false);
    setRoundCorrect(null);
    setQueue(rest);
  };

  // Countdown — paused once the round is revealed (correct/wrong/timed out) so the player can read
  // the result without the number still ticking behind it.
  useEffect(() => {
    if (screen !== "playing" || revealed || !current) return;
    if (timeLeft <= 0) {
      handleReveal(false);
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, revealed, current, timeLeft]);

  useEffect(() => {
    if (screen === "playing" && !revealed) firstInputRef.current?.focus();
  }, [current, screen, revealed]);

  const isAllCorrect = (): boolean => {
    if (!current) return false;
    return current.blanks.every((b, i) => normalize(inputs[i]) === normalize(b.answerWords.join(" ")));
  };

  const isBlankCorrect = (index: number): boolean => {
    if (!current) return false;
    return normalize(inputs[index]) === normalize(current.blanks[index].answerWords.join(" "));
  };

  const handleReveal = (submitted: boolean) => {
    const correct = submitted && isAllCorrect();
    setRoundCorrect(correct);
    setRevealed(true);
    if (correct) {
      setScore((s) => s + 1);
    } else {
      setLives((l) => {
        const remaining = l - 1;
        if (remaining <= 0) window.setTimeout(() => setScreen("gameover"), 1200);
        return remaining;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (revealed) return;
    handleReveal(true);
  };

  const handleContinue = () => {
    if (lives <= 0) {
      setScreen("gameover");
      return;
    }
    loadVerse(queue);
  };

  const changeInput = (index: number, value: string) => {
    setInputs((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const backToMenu = () => {
    setScreen("menu");
    setDifficulty(null);
    setCurrent(null);
  };

  if (screen === "menu") {
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2 className="games-inline-icon">
          <Icon name="fillBlank" />
          Fill in the Blank
        </h2>
        </header>
        <div className="game-body">
          <div className="fillblank-picker">
            <div className="games-panel-intro">
              <h2>Choose a difficulty</h2>
              <p>Standout verses from the Old and New Testaments — type the missing words before time runs out. Three lives.</p>
            </div>
            <div className="game-center-list">
              {DIFFICULTY_LEVELS.map((l) => (
                <button key={l.key} type="button" className="game-center-card" onClick={() => startGame(l.key)}>
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

  if (screen === "gameover") {
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2 className="games-inline-icon">
          <Icon name="fillBlank" />
          Fill in the Blank
        </h2>
        </header>
        <div className="game-body">
          <div className="fillblank-gameover">
            <p className="fillblank-gameover-icon" aria-hidden="true">
              💔
            </p>
            <h2>Game Over</h2>
            <p className="fillblank-gameover-score">
              {score} verse{score === 1 ? "" : "s"} correct
            </p>
            <div className="fillblank-gameover-actions">
              <button type="button" className="fillblank-btn-primary" onClick={() => difficulty && startGame(difficulty)}>
                Play Again
              </button>
              <button type="button" className="fillblank-btn-secondary" onClick={backToMenu}>
                Change Difficulty
              </button>
              <button type="button" className="fillblank-btn-secondary" onClick={onBack}>
                Back to Games
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const missingWords = current.blanks.reduce((n, b) => n + b.answerWords.length, 0);
  const totalTime = timeLimitFor(current);
  let blankCursor = 0;

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={backToMenu} ariaLabel="Back to difficulty select" />
        <h2 className="games-inline-icon">
          <Icon name="fillBlank" />
          Fill in the Blank
        </h2>
      </header>
      <div className="game-body">
        <div className="fillblank-hud">
          <span className="fillblank-lives" aria-label={`${lives} lives remaining`}>
            {Array.from({ length: STARTING_LIVES }, (_, i) => (
              <span key={i} className={i < lives ? "fillblank-heart" : "fillblank-heart fillblank-heart-lost"}>
                {i < lives ? "❤️" : "🤍"}
              </span>
            ))}
          </span>
          <span className="fillblank-score">Score: {score}</span>
          <span className={`fillblank-timer ${timeLeft <= 5 ? "fillblank-timer-urgent" : ""}`}>⏱ {timeLeft}s</span>
        </div>
        <div className="fillblank-timer-bar">
          <div className="fillblank-timer-bar-fill" style={{ width: `${Math.max(0, (timeLeft / totalTime) * 100)}%` }} />
        </div>

        <p className="fillblank-reference">
          {current.reference} <span className="fillblank-testament-badge">{current.testament === "OT" ? "Old Testament" : "New Testament"}</span>
        </p>

        <form className="fillblank-form" onSubmit={handleSubmit}>
          <p className="fillblank-verse-text">
            {current.words.map((word, wordIdx) => {
              const blank = current.blanks[blankCursor];
              if (blank && wordIdx === blank.startWord) {
                const thisBlankIdx = blankCursor;
                blankCursor++;
                const correct = revealed && isBlankCorrect(thisBlankIdx);
                const wrong = revealed && !isBlankCorrect(thisBlankIdx);
                return (
                  <span key={`blank-${thisBlankIdx}`} className="fillblank-blank-wrap">
                    <input
                      ref={thisBlankIdx === 0 ? firstInputRef : undefined}
                      type="text"
                      className={`fillblank-input ${correct ? "fillblank-input-correct" : ""} ${wrong ? "fillblank-input-wrong" : ""}`}
                      value={inputs[thisBlankIdx] ?? ""}
                      onChange={(e) => changeInput(thisBlankIdx, e.target.value)}
                      disabled={revealed}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      style={{ width: `${Math.max(4, blank.answerWords.join(" ").length) + 2}ch` }}
                      aria-label={`Missing word${blank.answerWords.length > 1 ? "s" : ""} ${thisBlankIdx + 1}`}
                    />
                    {wrong && <span className="fillblank-answer-reveal">{blank.answerWords.join(" ")}</span>}
                  </span>
                );
              }
              if (blank && wordIdx > blank.startWord && wordIdx < blank.endWord) return null;
              return <span key={`word-${wordIdx}`}> {word} </span>;
            })}
          </p>

          {!revealed ? (
            <button type="submit" className="fillblank-btn-primary">
              Check Answer
            </button>
          ) : (
            <div className="fillblank-round-result">
              <p className={roundCorrect ? "fillblank-result-correct" : "fillblank-result-wrong"}>
                {roundCorrect ? "✅ Correct!" : timeLeft <= 0 ? "⏱ Time's up!" : "❌ Not quite."}
              </p>
              {lives > 0 && (
                <button type="button" className="fillblank-btn-primary" onClick={handleContinue}>
                  Next Verse →
                </button>
              )}
            </div>
          )}
        </form>

        <p className="fillblank-missing-count">
          {missingWords} word{missingWords === 1 ? "" : "s"} missing
        </p>
      </div>
    </div>
  );
}

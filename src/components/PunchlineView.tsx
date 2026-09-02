import { useState } from "react";
import {
  JOKE_LEVELS,
  JOKE_COUNT,
  THEME_LABELS,
  dealDeck,
  type JokeLevel,
  type JokeLevelDef,
  type JokeRound,
} from "../data/bibleJokes";
import BackButton from "./BackButton";
import "./Punchline.css";
import Icon from "./Icon";

interface PunchlineViewProps {
  onBack: () => void;
}

const STARTING_LIVES = 3;

type Screen = "menu" | "playing" | "gameover";

/** Guess the Punchline — the setup of a Bible joke, four punchlines, one of them the real one. The
 * three decoys are always punchlines from OTHER jokes in the same book (see bibleJokes.ts), which is
 * what makes this a game rather than a joke viewer: they're the same length and register, so nothing
 * is given away by shape alone, and at Pulpit Ready they're all about the same character too.
 *
 * Structure follows ChronologyView exactly — menu → playing → gameover, three lives, a solved count
 * and a streak — so the two read as siblings in the Game Center rather than two different apps. */
export default function PunchlineView({ onBack }: PunchlineViewProps) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [level, setLevel] = useState<JokeLevelDef | null>(null);
  /** The whole bank, shuffled once per game, so no joke can repeat inside a single run. */
  const [deck, setDeck] = useState<JokeRound[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const startGame = (key: JokeLevel) => {
    const def = JOKE_LEVELS.find((l) => l.key === key);
    if (!def) return;
    setLevel(def);
    setDeck(dealDeck(def));
    setIndex(0);
    setPicked(null);
    setLives(STARTING_LIVES);
    setScore(0);
    setStreak(0);
    setScreen("playing");
  };

  const backToMenu = () => {
    setScreen("menu");
    setLevel(null);
  };

  const choose = (choice: number) => {
    if (picked !== null) return; // answers lock once revealed
    setPicked(choice);
    if (choice === deck[index].correctIndex) {
      const nextStreak = streak + 1;
      setScore((s) => s + 1);
      setStreak(nextStreak);
      setBest((b) => Math.max(b, nextStreak));
    } else {
      setStreak(0);
      setLives((l) => l - 1);
    }
  };

  const nextRound = () => {
    // Running out of jokes ends the game the same way running out of lives does — you've beaten the
    // whole book, which is a win worth stopping on rather than silently looping the deck.
    if (lives <= 0 || index + 1 >= deck.length) {
      setScreen("gameover");
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  if (screen === "menu") {
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2 className="games-inline-icon">
          <Icon name="punchline" />
          Guess the Punchline
        </h2>
        </header>
        <div className="game-body">
          <div className="punchline-picker">
            <div className="games-panel-intro">
              <h2>Choose a difficulty</h2>
              <p>
                {JOKE_COUNT} clean Bible jokes. You get the setup — pick the punchline that actually
                belongs to it. The wrong answers are real punchlines from other jokes, so read
                carefully. Three lives.
              </p>
            </div>
            <div className="game-center-list">
              {JOKE_LEVELS.map((l) => (
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
    const cleared = lives > 0;
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2 className="games-inline-icon">
          <Icon name="punchline" />
          Guess the Punchline
        </h2>
        </header>
        <div className="game-body">
          <div className="punchline-gameover">
            <p className="punchline-gameover-icon" aria-hidden="true">
              <Icon name={cleared ? "trophy" : "heartBreak"} />
            </p>
            <h2>{cleared ? "You got through the whole book!" : "Game Over"}</h2>
            <p className="punchline-gameover-score">
              {score} punchline{score === 1 ? "" : "s"} landed
            </p>
            <p className="punchline-gameover-best">Best streak: {best}</p>
            <div className="punchline-gameover-actions">
              <button type="button" className="punchline-btn-primary" onClick={() => level && startGame(level.key)}>
                Play Again
              </button>
              <button type="button" className="punchline-btn-secondary" onClick={backToMenu}>
                Change Difficulty
              </button>
              <button type="button" className="punchline-btn-secondary" onClick={onBack}>
                Back to Games
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const round = deck[index];
  const answered = picked !== null;
  const right = answered && picked === round.correctIndex;

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={backToMenu} ariaLabel="Back to difficulty select" />
        <h2 className="games-inline-icon">
          <Icon name="punchline" />
          Guess the Punchline
        </h2>
      </header>
      <div className="game-body">
        <div className="punchline-hud">
          <span className="punchline-lives" aria-label={`${lives} lives remaining`}>
            {Array.from({ length: STARTING_LIVES }, (_, i) => (
              <span key={i} className={i < lives ? "punchline-heart" : "punchline-heart punchline-heart-lost"}>
                <Icon name={i < lives ? "heartFull" : "heart"} />
              </span>
            ))}
          </span>
          <span className="punchline-score">Landed: {score}</span>
          <span className="punchline-streak"><Icon name="flame" inline /> {streak}</span>
        </div>

        <div className="punchline-setup">
          <span className="punchline-theme">{THEME_LABELS[round.joke.theme]}</span>
          <p className="punchline-setup-text">{round.joke.setup}</p>
        </div>

        <ul className="punchline-choices">
          {round.choices.map((choice, i) => {
            let state = "";
            if (answered) {
              if (i === round.correctIndex) state = " punchline-choice-correct";
              else if (i === picked) state = " punchline-choice-wrong";
              else state = " punchline-choice-dimmed";
            }
            return (
              <li key={i}>
                <button
                  type="button"
                  className={`punchline-choice${state}`}
                  onClick={() => choose(i)}
                  disabled={answered}
                >
                  <span className="punchline-choice-letter" aria-hidden="true">
                    {"ABCD"[i]}
                  </span>
                  <span className="punchline-choice-text">{choice}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {answered && (
          <p className={`punchline-verdict${right ? " punchline-verdict-right" : " punchline-verdict-wrong"}`}>
            {right ? "😄 That's the one." : "🙈 Not that one — the real punchline is highlighted."}
          </p>
        )}

        {answered && (
          <button type="button" className="punchline-btn-primary" onClick={nextRound}>
            {lives <= 0 || index + 1 >= deck.length ? "See Results →" : "Next Joke →"}
          </button>
        )}
      </div>
    </div>
  );
}

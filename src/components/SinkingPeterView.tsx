import { useMemo, useState } from "react";
import { SINKING_PETER_WORDS } from "../data/sinkingPeterWords";
import BackButton from "./BackButton";

const MAX_WRONG = 6;
// Standard QWERTY row order — easier to scan/type on than strict alphabetical for anyone used to a
// real keyboard, which is most players.
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row) => row.split(""));

interface SinkingPeterViewProps {
  onBack: () => void;
}

/** Hangman, themed around Matthew 14:22-33 — every wrong guess sinks Peter a little further into the
 * water instead of building a gallows; a full miss (MAX_WRONG wrong letters) means he goes under
 * entirely, guessing the word before that means Jesus catches his hand in time. */
export default function SinkingPeterView({ onBack }: SinkingPeterViewProps) {
  const pickWord = () => SINKING_PETER_WORDS[Math.floor(Math.random() * SINKING_PETER_WORDS.length)];
  const [entry, setEntry] = useState(pickWord);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());

  const wrongLetters = useMemo(
    () => [...guessed].filter((l) => !entry.word.includes(l)),
    [guessed, entry]
  );
  const wrongCount = Math.min(wrongLetters.length, MAX_WRONG);
  const won = entry.word.split("").every((l) => guessed.has(l));
  const lost = wrongCount >= MAX_WRONG && !won;
  const over = won || lost;

  // Three photos of Peter (see public/games/sinking-peter) stand in for the old emoji figure —
  // further along by wrong-guess count, unless the round is already decided.
  const peterImage = lost
    ? "/games/sinking-peter/peter-drowning.png"
    : won || wrongCount <= 1
      ? "/games/sinking-peter/peter-standing.png"
      : wrongCount <= 3
        ? "/games/sinking-peter/peter-sinking.png"
        : "/games/sinking-peter/peter-drowning.png";

  const handleGuess = (letter: string) => {
    if (over || guessed.has(letter)) return;
    setGuessed((prev) => new Set(prev).add(letter));
  };

  const handleNewRound = () => {
    setEntry(pickWord());
    setGuessed(new Set());
  };

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={onBack} label="Back" ariaLabel="Back to Game Center" />
        <h2>🌊 Sinking Peter</h2>
      </header>
      <div className="game-body">
        <div className="sinking-peter">
          <div className="sinking-peter-scene">
            <img className="sinking-peter-figure" src={peterImage} alt="" style={{ transform: `translateY(${wrongCount * 11}px)` }} />
            <div className="sinking-peter-water" style={{ height: `${18 + wrongCount * 11}%` }} />
          </div>

          <p className="sinking-peter-status">
            {won
              ? "🎉 Jesus reached out and caught him — you got it!"
              : lost
                ? "🌊 Peter went under — out of guesses."
                : `Wrong guesses so far: ${wrongCount} / ${MAX_WRONG}`}
          </p>

          <p className="sinking-peter-clue">{entry.clue}</p>

          <div className="sinking-peter-word">
            {entry.word.split("").map((letter, i) => (
              <span key={i} className="sinking-peter-letter-slot">
                {guessed.has(letter) || over ? letter : ""}
              </span>
            ))}
          </div>

          {over && !won && <p className="sinking-peter-reveal">The word was: {entry.word}</p>}

          {over ? (
            <button type="button" className="games-primary-button" onClick={handleNewRound}>
              🔄 Play Again
            </button>
          ) : (
            <div className="sinking-peter-keyboard">
              {KEYBOARD_ROWS.map((row, i) => (
                <div key={i} className="sinking-peter-keyboard-row">
                  {row.map((letter) => {
                    const used = guessed.has(letter);
                    const correct = used && entry.word.includes(letter);
                    return (
                      <button
                        key={letter}
                        type="button"
                        className={`sinking-peter-key ${used ? (correct ? "sinking-peter-key-correct" : "sinking-peter-key-wrong") : ""}`}
                        onClick={() => handleGuess(letter)}
                        disabled={used}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

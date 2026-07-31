import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { SAVING_PETER_LEVELS, SAVING_PETER_WORDS, type SavingPeterLevel } from "../data/savingPeterWords";
import BackButton from "./BackButton";
import "./Crossword.css";

const MAX_WRONG = 6;
// Standard QWERTY row order — easier to scan/type on than strict alphabetical for anyone used to a
// real keyboard, which is most players.
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row) => row.split(""));

interface SavingPeterViewProps {
  session: Session;
  onBack: () => void;
}

/** Hangman, themed around Matthew 14:22-33 — every wrong guess sinks Peter a little further into the
 * water instead of building a gallows; a full miss (MAX_WRONG wrong letters) means he goes under
 * entirely, guessing the word before that means Jesus catches his hand in time. Same five difficulty
 * tiers as the Crossword (see data/savingPeterWords.ts), picked the same way. */
export default function SavingPeterView({ session, onBack }: SavingPeterViewProps) {
  const [level, setLevel] = useState<SavingPeterLevel | null>(null);
  const [entry, setEntry] = useState(() => SAVING_PETER_WORDS.beginner[0]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());

  // Best-effort — falls back to the account's email (or a generic "You") if the profile hasn't
  // loaded yet or has no display name, same fallback chain AuthButton's own label uses.
  const [displayName, setDisplayName] = useState<string | null>(null);
  useEffect(() => {
    if (session.user.is_anonymous) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setDisplayName((data as { display_name: string | null } | null)?.display_name ?? null));
  }, [session]);
  const playerName = displayName ?? session.user.email ?? "You";

  const pickWord = (forLevel: SavingPeterLevel) => {
    const bank = SAVING_PETER_WORDS[forLevel];
    return bank[Math.floor(Math.random() * bank.length)];
  };

  const startLevel = (chosen: SavingPeterLevel) => {
    setLevel(chosen);
    setEntry(pickWord(chosen));
    setGuessed(new Set());
  };
  const backToLevelPicker = () => setLevel(null);

  const wrongLetters = useMemo(
    () => [...guessed].filter((l) => !entry.word.includes(l)),
    [guessed, entry]
  );
  const wrongCount = Math.min(wrongLetters.length, MAX_WRONG);
  const won = entry.word.split("").every((l) => guessed.has(l));
  const lost = wrongCount >= MAX_WRONG && !won;
  const over = won || lost;

  // Three photos of Peter (see public/games/saving-peter) stand in for the old emoji figure —
  // further along by wrong-guess count, unless the round is already decided.
  const peterImage = lost
    ? "/games/saving-peter/peter-drowning.png"
    : won || wrongCount <= 1
      ? "/games/saving-peter/peter-standing.png"
      : wrongCount <= 3
        ? "/games/saving-peter/peter-sinking.png"
        : "/games/saving-peter/peter-drowning.png";

  const handleGuess = (letter: string) => {
    if (over || guessed.has(letter)) return;
    setGuessed((prev) => new Set(prev).add(letter));
  };

  const handleNewRound = () => {
    if (!level) return;
    setEntry(pickWord(level));
    setGuessed(new Set());
  };

  if (!level) {
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2>🌊 Saving Peter</h2>
        </header>
        <div className="game-body">
          <div className="crossword-level-picker">
            <div className="games-panel-intro">
              <h2>Choose a difficulty</h2>
              <p>Beginner is for little ones just learning Bible stories; Expert is seminary-level.</p>
            </div>
            <div className="game-center-list">
              {SAVING_PETER_LEVELS.map((l) => (
                <button key={l.key} type="button" className="game-center-card crossword-level-card" onClick={() => startLevel(l.key)}>
                  <span className="game-center-card-icon" aria-hidden="true">
                    {l.icon}
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

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={backToLevelPicker} ariaLabel="Back to level picker" />
        <h2>🌊 Saving Peter</h2>
      </header>
      <div className="game-body">
        <div className="saving-peter">
          <div className="saving-peter-scene">
            <img className="saving-peter-figure" src={peterImage} alt="" style={{ transform: `translateY(${wrongCount * 11}px)` }} />
            <div className="saving-peter-water" style={{ height: `${18 + wrongCount * 11}%` }} />
          </div>

          <p className="saving-peter-status">
            {won
              ? "🎉 Jesus reached out and caught him — you got it!"
              : lost
                ? `Bye bye, Peter! ${playerName} couldn't save you. Fortunately Jesus did.`
                : `Wrong guesses so far: ${wrongCount} / ${MAX_WRONG}`}
          </p>

          <p className="saving-peter-clue">{entry.clue}</p>

          <div className="saving-peter-word">
            {entry.word.split("").map((letter, i) => (
              <span key={i} className="saving-peter-letter-slot">
                {guessed.has(letter) || over ? letter : ""}
              </span>
            ))}
          </div>

          {over && !won && <p className="saving-peter-reveal">The word was: {entry.word}</p>}

          {over ? (
            <div className="saving-peter-post-game">
              <button type="button" className="games-primary-button" onClick={handleNewRound}>
                🔄 Play Again
              </button>
              <button type="button" className="games-secondary-button" onClick={backToLevelPicker}>
                Choose Different Level
              </button>
            </div>
          ) : (
            <div className="saving-peter-keyboard">
              {KEYBOARD_ROWS.map((row, i) => (
                <div key={i} className="saving-peter-keyboard-row">
                  {row.map((letter) => {
                    const used = guessed.has(letter);
                    const correct = used && entry.word.includes(letter);
                    return (
                      <button
                        key={letter}
                        type="button"
                        className={`saving-peter-key ${used ? (correct ? "saving-peter-key-correct" : "saving-peter-key-wrong") : ""}`}
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

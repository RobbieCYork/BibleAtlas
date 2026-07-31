import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { SINKING_PETER_LEVELS, SINKING_PETER_WORDS, type SinkingPeterLevel } from "../data/sinkingPeterWords";
import BackButton from "./BackButton";
import "./Crossword.css";

const MAX_WRONG = 6;
// Standard QWERTY row order — easier to scan/type on than strict alphabetical for anyone used to a
// real keyboard, which is most players.
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row) => row.split(""));

interface SinkingPeterViewProps {
  session: Session;
  onBack: () => void;
}

/** Hangman, themed around Matthew 14:22-33 — every wrong guess sinks Peter a little further into the
 * water instead of building a gallows; a full miss (MAX_WRONG wrong letters) means he goes under
 * entirely, guessing the word before that means Jesus catches his hand in time. Same five difficulty
 * tiers as the Crossword (see data/sinkingPeterWords.ts), picked the same way. */
export default function SinkingPeterView({ session, onBack }: SinkingPeterViewProps) {
  const [level, setLevel] = useState<SinkingPeterLevel | null>(null);
  const [entry, setEntry] = useState(() => SINKING_PETER_WORDS.beginner[0]);
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

  const pickWord = (forLevel: SinkingPeterLevel) => {
    const bank = SINKING_PETER_WORDS[forLevel];
    return bank[Math.floor(Math.random() * bank.length)];
  };

  const startLevel = (chosen: SinkingPeterLevel) => {
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
    if (!level) return;
    setEntry(pickWord(level));
    setGuessed(new Set());
  };

  if (!level) {
    return (
      <div className="game-root">
        <header className="game-header">
          <BackButton onClick={onBack} ariaLabel="Back to Game Center" />
          <h2>🌊 Sinking Peter</h2>
        </header>
        <div className="game-body">
          <div className="crossword-level-picker">
            <div className="games-panel-intro">
              <h2>Choose a difficulty</h2>
              <p>Beginner is for little ones just learning Bible stories; Expert is seminary-level.</p>
            </div>
            <div className="game-center-list">
              {SINKING_PETER_LEVELS.map((l) => (
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
                ? `Bye bye, Peter! ${playerName} couldn't save you. Fortunately Jesus did.`
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
            <div className="sinking-peter-post-game">
              <button type="button" className="games-primary-button" onClick={handleNewRound}>
                🔄 Play Again
              </button>
              <button type="button" className="games-secondary-button" onClick={backToLevelPicker}>
                Choose Different Level
              </button>
            </div>
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

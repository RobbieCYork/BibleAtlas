import { useEffect, useRef, useState, type ReactNode } from "react";
import { resolveSavingPeterRound } from "../data/savingPeterWords";
import {
  fetchGuessesForRound,
  checkAndAdvanceSavingPeter,
  submitSavingPeterGuess,
  type SavingPeterRoom,
  type SavingPeterPlayer,
  type SavingPeterGuess,
} from "../lib/savingPeterMultiplayer";

interface SavingPeterRoundPlayProps {
  room: SavingPeterRoom;
  players: SavingPeterPlayer[];
  userId: string;
  /** Bumped by SavingPeterMultiplayerView every time a saving_peter_guesses row changes for this room. */
  guessesVersion: number;
  renderVideoStrip: (round: { answeredUserIds: Set<string>; revealed: boolean; correctUserIds: Set<string> }) => ReactNode;
}

/** Server-side round window — see check_and_advance_saving_peter() in sql/011_saving_peter_multiplayer.sql. */
const ROUND_SECONDS = 20;
const REVEAL_DELAY_MS = 1200;
const ADVANCE_RETRY_MS = 2_000;
const MANUAL_CONTINUE_AFTER_MS = 8_000;

function normalize(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

/** Live "one guess each, first correct scores" gameplay for one word at a time — the multiplayer
 * counterpart to SavingPeterView's solo hangman, restructured like a buzzer round (clue shown, free-
 * text guess for the whole word) since "who guessed right first" needs a single decisive moment per
 * round rather than incremental shared letter-reveals. Mirrors GameRoomPlay.tsx's round-advance loop. */
export default function SavingPeterRoundPlay({ room, players, userId, guessesVersion, renderVideoStrip }: SavingPeterRoundPlayProps) {
  const index = room.current_round_index;
  const round = resolveSavingPeterRound(room.round_ids[index] ?? "");
  const [guesses, setGuesses] = useState<SavingPeterGuess[]>([]);
  const [guessInput, setGuessInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [myAwardedDelta, setMyAwardedDelta] = useState<number | null>(null);

  const advancingIndexRef = useRef<number>(-1);
  const [roundOverAt, setRoundOverAt] = useState<number | null>(null);

  useEffect(() => {
    setGuesses([]);
    setGuessInput("");
    setSubmitting(false);
    setMyAwardedDelta(null);
    setRoundOverAt(null);
  }, [index]);

  useEffect(() => {
    fetchGuessesForRound(room.id, index)
      .then(setGuesses)
      .catch(() => {});
  }, [room.id, index, guessesVersion]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const startedAt = room.current_round_started_at ? new Date(room.current_round_started_at).getTime() : now;
  const elapsedMs = now - startedAt;
  const secondsLeft = Math.max(0, Math.ceil((ROUND_SECONDS * 1000 - elapsedMs) / 1000));
  const anyoneCorrect = guesses.some((g) => g.correct);
  const everyoneGuessed = players.length > 0 && guesses.length >= players.length;
  const roundOver = anyoneCorrect || everyoneGuessed || elapsedMs >= ROUND_SECONDS * 1000;

  useEffect(() => {
    if (roundOver) setRoundOverAt((prev) => prev ?? Date.now());
  }, [roundOver]);

  useEffect(() => {
    if (!round || !roundOver) return;
    if (advancingIndexRef.current === index) return;
    advancingIndexRef.current = index;
    let cancelled = false;
    const attempt = () => {
      if (cancelled) return;
      checkAndAdvanceSavingPeter(room.id, index).catch(() => {
        if (!cancelled) setTimeout(attempt, ADVANCE_RETRY_MS);
      });
    };
    const timer = setTimeout(attempt, REVEAL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [round, roundOver, room.id, index]);

  const showManualContinue = roundOver && roundOverAt !== null && now - roundOverAt >= MANUAL_CONTINUE_AFTER_MS;

  if (!round) {
    return <p className="games-error">This round's word couldn't be loaded.</p>;
  }

  const myGuess = guesses.find((g) => g.user_id === userId) ?? null;
  const locked = myGuess !== null || submitting || roundOver;
  const answeredUserIds = new Set(guesses.map((g) => g.user_id));
  const correctUserIds = new Set(guesses.filter((g) => g.correct).map((g) => g.user_id));
  const wrongCount = Math.min(guesses.filter((g) => !g.correct).length, 6);

  const peterImage = anyoneCorrect
    ? "/games/saving-peter/peter-standing.png"
    : wrongCount <= 1
      ? "/games/saving-peter/peter-standing.png"
      : wrongCount <= 3
        ? "/games/saving-peter/peter-sinking.png"
        : "/games/saving-peter/peter-drowning.png";

  const handleSubmitGuess = async () => {
    const cleaned = normalize(guessInput);
    if (!cleaned || locked) return;
    setSubmitting(true);
    const correct = cleaned === round.word;
    const scoreBefore = players.find((p) => p.user_id === userId)?.score ?? 0;
    try {
      const result = await submitSavingPeterGuess(room.id, index, cleaned, correct, round.points);
      if (!result.alreadyGuessed) setMyAwardedDelta(result.player.score - scoreBefore);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="game-room-play">
      {renderVideoStrip({ answeredUserIds, revealed: roundOver, correctUserIds })}

      <div className="saving-peter">
        <div className="saving-peter-scene">
          <img className="saving-peter-figure" src={peterImage} alt="" style={{ transform: `translateY(${wrongCount * 11}px)` }} />
          <div className="saving-peter-water" style={{ height: `${18 + wrongCount * 11}%` }} />
        </div>
      </div>

      <div className="game-question-card">
        <div className="game-question-meta">
          <span className={`game-difficulty-badge game-difficulty-${round.level}`}>
            {round.level} · +{round.points} pts
          </span>
          <span className="game-question-index">
            Round {index + 1} of {room.round_ids.length}
          </span>
          {!roundOver && <span className="game-question-timer">⏱ {secondsLeft}s</span>}
          <span className="game-question-answered-count">
            {answeredUserIds.size}/{players.length} guessed
          </span>
          <span className="game-question-bonus-hint">🥇 First correct only</span>
        </div>
        <p className="game-question-prompt">{round.clue}</p>

        {!roundOver ? (
          <form
            className="saving-peter-guess-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitGuess();
            }}
          >
            <input
              type="text"
              className="saving-peter-guess-input"
              placeholder="Type your guess…"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              disabled={locked}
              autoFocus
            />
            <button type="submit" className="games-primary-button" disabled={locked || !guessInput.trim()}>
              Guess
            </button>
          </form>
        ) : null}

        {roundOver ? (
          <p className="game-question-reveal">
            {myGuess
              ? myGuess.correct
                ? `✅ Correct! +${myAwardedDelta ?? round.points}`
                : `❌ Not quite — that's ${myAwardedDelta ?? -round.points}. The word was "${round.word}."`
              : anyoneCorrect
                ? `Someone else got it first. The word was "${round.word}."`
                : `⏱ Time's up. The word was "${round.word}."`}
          </p>
        ) : locked ? (
          <p className="game-question-reveal">Guess locked in — waiting on the rest of the table…</p>
        ) : null}

        {showManualContinue && (
          <button
            type="button"
            className="games-secondary-button"
            onClick={() => checkAndAdvanceSavingPeter(room.id, index).catch(() => {})}
          >
            Continue ▶
          </button>
        )}
      </div>
    </div>
  );
}

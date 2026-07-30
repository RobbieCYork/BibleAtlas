import { useEffect, useRef, useState, type ReactNode } from "react";
import { getQuestionById } from "../data/gameQuestions";
import { fetchBuzzForQuestion, resolveQuestion, forceAdvance, submitBuzz, type GameRoom, type GamePlayer, type GameBuzz } from "../lib/gameSupabase";

interface GameRoomPlayProps {
  room: GameRoom;
  players: GamePlayer[];
  userId: string;
  /** Bumped by GameView every time a game_buzzes row changes for this room — the trigger to refetch
   * the current question's buzz (buzzes aren't otherwise part of GameView's own state). */
  buzzVersion: number;
  videoStrip: ReactNode;
}

const NO_ANSWER_TIMEOUT_MS = 15_000;
// Comfortably past resolve_question()'s server-side grace period (see force_advance() in
// sql/001_game.sql) so a normal in-flight resolution never races this fallback.
const STALL_FALLBACK_MS = 22_000;

/** Live buzzer gameplay for one question at a time. Every client independently derives the same
 * "reveal" (correct/incorrect + who buzzed) the instant a game_buzzes row appears — the buzzing
 * player's own client is then the one that calls resolveQuestion() after a short reveal delay, which
 * is what actually awards points and advances the room. Everyone else is just watching that same
 * state arrive over realtime. See sql/001_game.sql's resolve_question() for why only the buzz's own
 * owner is trusted to report correctness. */
export default function GameRoomPlay({ room, players, userId, buzzVersion, videoStrip }: GameRoomPlayProps) {
  const index = room.current_question_index;
  const question = getQuestionById(room.question_ids[index] ?? "");
  const [buzz, setBuzz] = useState<GameBuzz | null>(null);
  const [myAttemptChoice, setMyAttemptChoice] = useState<number | null>(null);
  const [buzzing, setBuzzing] = useState(false);

  const resolvedIndexRef = useRef<number>(-1);
  const timeoutFiredRef = useRef<number>(-1);
  const stallFiredRef = useRef<number>(-1);

  // Reset per-question local state whenever the room moves to a new question.
  useEffect(() => {
    setBuzz(null);
    setMyAttemptChoice(null);
    setBuzzing(false);
  }, [index]);

  useEffect(() => {
    fetchBuzzForQuestion(room.id, index)
      .then(setBuzz)
      .catch(() => {});
  }, [room.id, index, buzzVersion]);

  const playerByUserId = new Map(players.map((p) => [p.user_id, p]));

  // Happy path: the player who buzzed correctly resolves the question themselves, after a short
  // delay so everyone sees the reveal before the next question replaces it.
  useEffect(() => {
    if (!question || !buzz || buzz.user_id !== userId) return;
    if (resolvedIndexRef.current === index) return;
    resolvedIndexRef.current = index;
    const correct = buzz.answer_index === question.correctIndex;
    const timer = setTimeout(() => {
      resolveQuestion(room.id, index, correct, question.points).catch(() => {
        resolvedIndexRef.current = -1; // Let a retry (e.g. the stall fallback below) try again.
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [buzz, question, room.id, index, userId]);

  // Nobody buzzed in time — any client can report that (resolveQuestion no-ops harmlessly if two
  // clients' timers fire close together, since it's guarded on current_question_index).
  useEffect(() => {
    if (!question || buzz) return;
    if (timeoutFiredRef.current === index) return;
    const startedAt = room.current_question_started_at ? new Date(room.current_question_started_at).getTime() : Date.now();
    const remaining = startedAt + NO_ANSWER_TIMEOUT_MS - Date.now();
    const timer = setTimeout(
      () => {
        timeoutFiredRef.current = index;
        resolveQuestion(room.id, index, false, 0).catch(() => {});
      },
      Math.max(0, remaining)
    );
    return () => clearTimeout(timer);
  }, [buzz, question, room.id, index, room.current_question_started_at]);

  // Safety net: someone buzzed but their client never resolved (tab closed) — force the room past
  // it once the server's own grace period has definitely elapsed.
  useEffect(() => {
    if (!question) return;
    if (stallFiredRef.current === index) return;
    const startedAt = room.current_question_started_at ? new Date(room.current_question_started_at).getTime() : Date.now();
    const remaining = startedAt + STALL_FALLBACK_MS - Date.now();
    const timer = setTimeout(
      () => {
        stallFiredRef.current = index;
        forceAdvance(room.id, index).catch(() => {});
      },
      Math.max(0, remaining)
    );
    return () => clearTimeout(timer);
  }, [question, room.id, index, room.current_question_started_at]);

  if (!question) {
    return <p className="games-error">This game's questions couldn't be loaded.</p>;
  }

  const locked = buzz !== null || buzzing;
  const revealed = buzz !== null;
  const buzzerName = buzz ? playerByUserId.get(buzz.user_id)?.display_name ?? "Someone" : null;
  const buzzerCorrect = buzz ? buzz.answer_index === question.correctIndex : false;

  const handleAnswer = async (choiceIndex: number) => {
    if (locked) return;
    setBuzzing(true);
    setMyAttemptChoice(choiceIndex);
    try {
      const { wonBuzz } = await submitBuzz(room.id, index, userId, choiceIndex);
      if (!wonBuzz) {
        // Someone else's buzz landed first — the realtime subscription will bring their row in
        // shortly; nothing else to do here.
      }
    } catch {
      setBuzzing(false);
      setMyAttemptChoice(null);
    }
  };

  return (
    <div className="game-room-play">
      {videoStrip}

      <div className="game-scoreboard">
        {[...players]
          .sort((a, b) => b.score - a.score)
          .map((p) => (
            <div key={p.user_id} className={`game-scoreboard-row${p.user_id === userId ? " game-scoreboard-you" : ""}`}>
              <span className="game-scoreboard-name">{p.display_name}</span>
              <div className="game-scoreboard-bar-track">
                <div className="game-scoreboard-bar-fill" style={{ width: `${Math.min(100, (p.score / room.target_score) * 100)}%` }} />
              </div>
              <span className="game-scoreboard-score">{p.score}</span>
            </div>
          ))}
      </div>

      <div className="game-question-card">
        <div className="game-question-meta">
          <span className={`game-difficulty-badge game-difficulty-${question.difficulty}`}>
            {question.difficulty === "impossible" ? "Nearly Impossible" : question.difficulty} · {question.points} pt
            {question.points === 1 ? "" : "s"}
          </span>
          <span className="game-question-index">
            Question {index + 1} of {room.question_ids.length}
          </span>
        </div>
        <p className="game-question-prompt">{question.prompt}</p>
        <div className="game-question-choices">
          {question.choices.map((choice, i) => {
            const isCorrectChoice = i === question.correctIndex;
            const isMyChoice = i === myAttemptChoice;
            const isBuzzChoice = buzz && i === buzz.answer_index;
            let stateClass = "";
            if (revealed) {
              if (isCorrectChoice) stateClass = " game-choice-correct";
              else if (isBuzzChoice) stateClass = " game-choice-wrong";
            } else if (isMyChoice) {
              stateClass = " game-choice-pending";
            }
            return (
              <button
                key={i}
                type="button"
                className={`game-choice-button${stateClass}`}
                onClick={() => handleAnswer(i)}
                disabled={locked}
              >
                {choice}
              </button>
            );
          })}
        </div>
        {revealed && (
          <p className="game-question-reveal">
            {buzzerCorrect ? `✅ ${buzzerName} answered first and got it right! +${question.points}` : `❌ ${buzzerName} answered first but got it wrong.`}
          </p>
        )}
      </div>
    </div>
  );
}

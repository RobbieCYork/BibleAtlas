import { useEffect, useRef, useState, type ReactNode } from "react";
import { getQuestionById } from "../data/gameQuestions";
import { fetchAnswersForQuestion, checkAndAdvance, submitAnswer, type GameRoom, type GamePlayer, type GameBuzz } from "../lib/gameSupabase";
import Icon from "./Icon";

interface GameRoomPlayProps {
  room: GameRoom;
  players: GamePlayer[];
  userId: string;
  /** Bumped by GameView every time a game_buzzes row changes for this room — the trigger to refetch
   * the current question's answers (answers aren't otherwise part of GameView's own state). */
  answersVersion: number;
  /** Renders GameVideoStrip — GameRoomPlay just feeds it this question's live round state (who's
   * answered, and once revealed, who got it right) so the score/answered badges overlay the tiles
   * instead of a separate scoreboard competing for vertical space. */
  renderVideoStrip: (round: { answeredUserIds: Set<string>; revealed: boolean; correctUserIds: Set<string> }) => ReactNode;
}

/** Server-side round window — see check_and_advance() in sql/005_everyone_answers.sql. Kept in sync
 * with that function's own `interval '15 seconds'` guard. */
const ROUND_SECONDS = 15;
// Short — just long enough to register "correct/wrong" before moving on, not a dramatic pause. Once
// everyone's answered there's nothing left to wait for, so the question should change quickly rather
// than sitting on the reveal.
const REVEAL_DELAY_MS = 900;
const ADVANCE_RETRY_MS = 2_000;
/** How long a round can sit revealed before the manual "Continue" fallback appears — well past what
 * the retry loop below should ever need, so it's a rarely-seen safety net, not the normal path. */
const MANUAL_CONTINUE_AFTER_MS = 8_000;

/** Live "everyone answers" gameplay for one question at a time. Every seated player gets one shot at
 * each question — submitAnswer() scores their own answer immediately (no separate reveal-then-resolve
 * step; there's no single "buzz winner" to wait on anymore). Once the round's time window elapses (or
 * everyone's answered, whichever's first — computed identically on every client from the same
 * room.current_question_started_at + local answer count, no extra signaling needed), every client
 * shows the same reveal and one of them calls checkAndAdvance() to move the room on; redundant calls
 * from other clients are harmless no-ops. */
export default function GameRoomPlay({ room, players, userId, answersVersion, renderVideoStrip }: GameRoomPlayProps) {
  const index = room.current_question_index;
  const question = getQuestionById(room.question_ids[index] ?? "");
  const [answers, setAnswers] = useState<GameBuzz[]>([]);
  const [myChoice, setMyChoice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // The actual points awarded for my own answer, straight from submit_answer()'s returned score
  // (new score minus what it was right before submitting) — not guessed client-side, so it correctly
  // reflects the first-correct 2x bonus (or its absence) without this component needing to know
  // whether it actually won that race.
  const [myAwardedDelta, setMyAwardedDelta] = useState<number | null>(null);

  // Tracks which question index this component has already scheduled an advance-attempt LOOP for —
  // not "already succeeded," since a single failed RPC call used to permanently stall the room (see
  // the retrying effect below). One loop per index is still enough; it just doesn't give up early.
  const advancingIndexRef = useRef<number>(-1);
  const [roundOverAt, setRoundOverAt] = useState<number | null>(null);

  // Reset per-question local state whenever the room moves to a new question.
  useEffect(() => {
    setAnswers([]);
    setMyChoice(null);
    setSubmitting(false);
    setMyAwardedDelta(null);
    setRoundOverAt(null);
  }, [index]);

  useEffect(() => {
    fetchAnswersForQuestion(room.id, index)
      .then(setAnswers)
      .catch(() => {});
  }, [room.id, index, answersVersion]);

  // Drives the countdown display and the elapsed-time half of "round over."
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const startedAt = room.current_question_started_at ? new Date(room.current_question_started_at).getTime() : now;
  const elapsedMs = now - startedAt;
  const secondsLeft = Math.max(0, Math.ceil((ROUND_SECONDS * 1000 - elapsedMs) / 1000));
  const everyoneAnswered = players.length > 0 && answers.length >= players.length;
  const roundOver = everyoneAnswered || elapsedMs >= ROUND_SECONDS * 1000;

  useEffect(() => {
    if (roundOver) setRoundOverAt((prev) => prev ?? Date.now());
  }, [roundOver]);

  // Once the round's over, every client (independently, from the same shared state above) shows the
  // reveal; after a short pause to let it land, one call to checkAndAdvance() moves the room on. This
  // KEEPS RETRYING every couple seconds rather than trying once — a single failed call (server-clock
  // skew against the RPC's own 15s guard, a backgrounded/throttled tab, a dropped request) used to
  // permanently stall the room, since nothing else was allowed to try again for that question. Every
  // seated player's client runs this same loop, so it's not reliant on any single "host" being
  // present; checkAndAdvance() itself no-ops harmlessly once someone else's call has already landed,
  // which is what actually stops the loop (via the index changing and this effect re-running/cleaning
  // up), not any local success flag.
  useEffect(() => {
    if (!question || !roundOver) return;
    if (advancingIndexRef.current === index) return;
    advancingIndexRef.current = index;
    let cancelled = false;
    const attempt = () => {
      if (cancelled) return;
      checkAndAdvance(room.id, index).catch(() => {
        if (!cancelled) setTimeout(attempt, ADVANCE_RETRY_MS);
      });
    };
    const timer = setTimeout(attempt, REVEAL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [question, roundOver, room.id, index]);

  // Safety net: if a whole round window plus retries goes by with the room still stuck on this
  // question, any player can force it forward by hand — covers the pathological case where every
  // client's own retry loop above is somehow stalled (e.g. every tab backgrounded at once).
  const showManualContinue = roundOver && roundOverAt !== null && now - roundOverAt >= MANUAL_CONTINUE_AFTER_MS;

  if (!question) {
    return <p className="games-error">This game's questions couldn't be loaded.</p>;
  }

  const myAnswer = answers.find((a) => a.user_id === userId) ?? null;
  const locked = myAnswer !== null || submitting;
  const answeredUserIds = new Set(answers.map((a) => a.user_id));
  const correctUserIds = new Set(answers.filter((a) => a.answer_index === question.correctIndex).map((a) => a.user_id));

  const handleAnswer = async (choiceIndex: number) => {
    if (locked) return;
    setSubmitting(true);
    setMyChoice(choiceIndex);
    const correct = choiceIndex === question.correctIndex;
    const scoreBefore = players.find((p) => p.user_id === userId)?.score ?? 0;
    try {
      const result = await submitAnswer(room.id, index, choiceIndex, correct, question.points);
      if (!result.alreadyAnswered) setMyAwardedDelta(result.player.score - scoreBefore);
    } catch {
      setSubmitting(false);
      setMyChoice(null);
    }
  };

  return (
    <div className="game-room-play">
      {renderVideoStrip({ answeredUserIds, revealed: roundOver, correctUserIds })}

      <div className="game-question-card">
        <div className="game-question-meta">
          <span className={`game-difficulty-badge game-difficulty-${question.difficulty}`}>
            {question.difficulty === "impossible" ? "Nearly Impossible" : question.difficulty} · ±{question.points} pt
            {question.points === 1 ? "" : "s"}
          </span>
          <span className="game-question-index">
            Question {index + 1} of {room.question_ids.length}
          </span>
          {!roundOver && <span className="game-question-timer">⏱ {secondsLeft}s</span>}
          <span className="game-question-answered-count">
            {answeredUserIds.size}/{players.length} answered
          </span>
          <span className="game-question-bonus-hint"><Icon name="medal" inline /> First correct = 2×</span>
        </div>
        <p className="game-question-prompt">{question.prompt}</p>
        <div className="game-question-choices">
          {question.choices.map((choice, i) => {
            const isCorrectChoice = i === question.correctIndex;
            const isMyChoice = i === myChoice;
            let stateClass = "";
            if (roundOver) {
              if (isCorrectChoice) stateClass = " game-choice-correct";
              else if (isMyChoice) stateClass = " game-choice-wrong";
            } else if (isMyChoice) {
              stateClass = " game-choice-pending";
            }
            return (
              <button
                key={i}
                type="button"
                className={`game-choice-button${stateClass}`}
                onClick={() => handleAnswer(i)}
                disabled={locked || roundOver}
              >
                {choice}
              </button>
            );
          })}
        </div>
        {roundOver ? (
          <p className="game-question-reveal">
            {myAnswer
              ? correctUserIds.has(userId)
                ? myAwardedDelta && myAwardedDelta > question.points
                  ? <><Icon name="check" inline /> First correct answer — double points! +{myAwardedDelta}</>
                  : <><Icon name="check" inline /> Correct! +{myAwardedDelta ?? question.points}</>
                : <><Icon name="close" inline /> Not quite — that's {myAwardedDelta ?? -question.points}. The answer was "{question.choices[question.correctIndex]}."</>
              : <><Icon name="timer" inline /> Time's up. The answer was "{question.choices[question.correctIndex]}."</>}
          </p>
        ) : locked ? (
          <p className="game-question-reveal">Answer locked in — waiting on the rest of the table…</p>
        ) : null}
        {showManualContinue && (
          <button type="button" className="games-secondary-button" onClick={() => checkAndAdvance(room.id, index).catch(() => {})}>
            Continue ▶
          </button>
        )}
      </div>
    </div>
  );
}

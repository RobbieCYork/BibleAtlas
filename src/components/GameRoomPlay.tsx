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
  /** The room as check_and_advance() returned it, so pressing Continue moves this screen on without
   * waiting for the room's change to arrive over Realtime. */
  onRoomAdvanced: (room: GameRoom) => void;
  /** This player's own answer has been scored. */
  onScored: () => void;
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
/** Continue retries a refused advance this often, this many times, before offering itself again. The
 * usual refusal is a device clock slightly ahead of the server's 15 seconds. */
const CONTINUE_RETRY_MS = 1_000;
const CONTINUE_ATTEMPTS = 15;
/** A second press this soon after the last belongs to the same double tap. Without this, the second
 * tap on Skip would land on the Continue button that takes its place, and the second tap on Continue
 * on the next question's Skip. */
const DOUBLE_TAP_MS = 600;
/** The answer_index a skipped question is recorded with. It matches no choice, so to the server and
 * to every screen it is an ordinary wrong answer. */
const SKIPPED = -1;

/** Everything on screen that belongs to one question. Kept with its question's index, so that a new
 * question never renders, even once, with the previous one's answers. */
interface Turn {
  index: number;
  answers: GameBuzz[];
  myChoice: number | null;
  submitting: boolean;
  /** The actual points awarded for my own answer, straight from submit_answer()'s returned score
   * (new score minus what it was right before submitting) — not guessed client-side, so it correctly
   * reflects the first-correct 2x bonus (or its absence) without this component needing to know
   * whether it actually won that race. */
  awarded: number | null;
  continuing: boolean;
}

const newTurn = (index: number): Turn => ({ index, answers: [], myChoice: null, submitting: false, awarded: null, continuing: false });

/** Live "everyone answers" gameplay for one question at a time. Every seated player gets one shot at
 * each question — submitAnswer() scores their own answer immediately (no separate reveal-then-resolve
 * step; there's no single "buzz winner" to wait on anymore). The round is over once its time window
 * elapses or everyone's answered, whichever's first — computed identically on every client from the
 * same room.current_question_started_at + answer count, no extra signaling needed.
 *
 * Moving on depends on how many are seated:
 * - one player: a Skip button until they answer, then Continue. The question stays up until they
 *   press it. Skip is recorded and scored as a wrong answer; running out of time still scores nothing.
 * - two or more: no Skip. Once the round is over every client shows Continue and also calls
 *   checkAndAdvance() on its own after a short pause. Whichever call arrives first moves the whole
 *   room; check_and_advance() ignores the rest. */
export default function GameRoomPlay({ room, players, userId, answersVersion, onRoomAdvanced, onScored, renderVideoStrip }: GameRoomPlayProps) {
  const index = room.current_question_index;
  const question = getQuestionById(room.question_ids[index] ?? "");
  const [stored, setStored] = useState<Turn>(() => newTurn(index));
  const turn = stored.index === index ? stored : newTurn(index);
  const { answers, myChoice, submitting, awarded, continuing } = turn;
  const [now, setNow] = useState(() => Date.now());

  const promptRef = useRef<HTMLParagraphElement>(null);
  const revealRef = useRef<HTMLParagraphElement>(null);
  const indexRef = useRef(index);
  indexRef.current = index;
  const submittedIndexRef = useRef(-1);
  const lastPressRef = useRef(0);
  const mountedRef = useRef(true);
  const onRoomAdvancedRef = useRef(onRoomAdvanced);
  onRoomAdvancedRef.current = onRoomAdvanced;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Changes the state of question `at`, and does nothing if the room has since moved on. */
  const update = (at: number, change: Partial<Turn>) => {
    if (indexRef.current !== at) return;
    setStored((prev) => ({ ...(prev.index === at ? prev : newTurn(at)), ...change }));
  };
  const refetchAnswers = (at: number) =>
    fetchAnswersForQuestion(room.id, at)
      .then((rows) => update(at, { answers: rows }))
      .catch(() => {});

  useEffect(() => {
    refetchAnswers(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // The same count the rest of this game calls solo (and that submit_answer() withholds the 2x bonus
  // on), except that an empty list means the players have not loaded yet.
  const solo = players.length === 1;
  const advancesItself = players.length > 1;

  // The bar under the question takes up room, so on a small phone bring each new question, and then
  // its answer, into view. "nearest" leaves the page still when they are already showing.
  useEffect(() => {
    promptRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);
  useEffect(() => {
    if (roundOver) revealRef.current?.scrollIntoView({ block: "nearest" });
  }, [roundOver, index]);

  // With others at the table, once the round's over every client (independently, from the same shared
  // state above) shows the reveal; after a short pause to let it land, one call to checkAndAdvance()
  // moves the room on. This KEEPS RETRYING every couple seconds rather than trying once — a single
  // failed call (server-clock skew against the RPC's own 15s guard, a backgrounded/throttled tab, a
  // dropped request) used to permanently stall the room, since nothing else was allowed to try again
  // for that question. Every seated player's client runs this same loop, so it's not reliant on any
  // single "host" being present; checkAndAdvance() itself no-ops harmlessly once someone else's call
  // has already landed, which is what actually stops the loop (via the index changing and this effect
  // cleaning up), not any local success flag.
  useEffect(() => {
    if (!roundOver || !advancesItself) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      checkAndAdvance(room.id, index)
        .then((next) => {
          if (!cancelled) onRoomAdvancedRef.current(next);
        })
        .catch(() => {
          if (!cancelled) timer = setTimeout(attempt, ADVANCE_RETRY_MS);
        });
    };
    timer = setTimeout(attempt, REVEAL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [roundOver, advancesItself, room.id, index]);

  /** False for the second tap of a double tap on the buttons below the question. */
  const acceptPress = () => {
    const pressedAt = Date.now();
    if (pressedAt - lastPressRef.current < DOUBLE_TAP_MS) return false;
    lastPressRef.current = pressedAt;
    return true;
  };

  const handleContinue = () => {
    if (!acceptPress() || continuing) return;
    update(index, { continuing: true });
    const attempt = (left: number) => {
      if (!mountedRef.current || indexRef.current !== index) return;
      checkAndAdvance(room.id, index)
        .then((next) => onRoomAdvancedRef.current(next))
        .catch(() => {
          if (left > 1) setTimeout(() => attempt(left - 1), CONTINUE_RETRY_MS);
          else update(index, { continuing: false });
        });
    };
    attempt(CONTINUE_ATTEMPTS);
  };

  const continueBar = (
    <div className="game-action-bar">
      <button type="button" className="games-primary-button game-action-button" onClick={handleContinue} disabled={!roundOver || continuing}>
        Continue
      </button>
    </div>
  );

  // A room created before an update can name a question that has since been retired. Nothing can be
  // answered, so it is passed over once its time is up.
  if (!question) {
    return (
      <div className="game-room-play">
        <p className="games-error">This question is no longer available.</p>
        {continueBar}
      </div>
    );
  }

  const myAnswer = answers.find((a) => a.user_id === userId) ?? null;
  const locked = myAnswer !== null || submitting;
  const answeredUserIds = new Set(answers.map((a) => a.user_id));
  const correctUserIds = new Set(answers.filter((a) => a.answer_index === question.correctIndex).map((a) => a.user_id));

  const handleAnswer = async (choiceIndex: number) => {
    // The ref refuses a second answer sent before the first has re-rendered the buttons as disabled.
    if (locked || submittedIndexRef.current === index) return;
    submittedIndexRef.current = index;
    update(index, { submitting: true, myChoice: choiceIndex });
    const correct = choiceIndex === question.correctIndex;
    const scoreBefore = players.find((p) => p.user_id === userId)?.score ?? 0;
    try {
      const result = await submitAnswer(room.id, index, choiceIndex, correct, question.points);
      if (!result.alreadyAnswered) update(index, { awarded: result.player.score - scoreBefore });
      onScored();
      await refetchAnswers(index);
    } catch {
      submittedIndexRef.current = -1;
      update(index, { submitting: false, myChoice: null });
    }
  };

  const handleSkip = () => {
    if (acceptPress()) handleAnswer(SKIPPED);
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
        <p ref={promptRef} className="game-question-prompt">{question.prompt}</p>
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
          <p ref={revealRef} className="game-question-reveal">
            {myAnswer
              ? correctUserIds.has(userId)
                ? awarded && awarded > question.points
                  ? <><Icon name="check" inline /> First correct answer — double points! +{awarded}</>
                  : <><Icon name="check" inline /> Correct! +{awarded ?? question.points}</>
                : <><Icon name="close" inline /> Not quite — that's {awarded ?? -question.points}. The answer was "{question.choices[question.correctIndex]}."</>
              : <><Icon name="timer" inline /> Time's up. The answer was "{question.choices[question.correctIndex]}."</>}
          </p>
        ) : locked ? (
          <p className="game-question-reveal">Answer locked in — waiting on the rest of the table…</p>
        ) : null}
      </div>

      {/* Alone, there is always a button here; with others, only once the round is over. It sticks to
          the bottom of the scrolling area so it never has to be scrolled to. */}
      {solo && !roundOver && !locked ? (
        <div className="game-action-bar">
          <button type="button" className="games-secondary-button game-action-button" onClick={handleSkip}>
            Skip
          </button>
        </div>
      ) : solo || roundOver ? (
        continueBar
      ) : null}
    </div>
  );
}

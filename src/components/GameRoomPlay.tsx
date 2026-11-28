import { useEffect, useRef, useState, type ReactNode } from "react";
import { AGE_OF_EARTH_TOPIC_NAME, YOUNG_EARTH_DATE_NOTE } from "../data/datingDebate";
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
  /** The room as check_and_advance() returned it, so this screen moves on without waiting for the
   * room's change to arrive over Realtime. */
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
/** How long the revealed answer stays up before this device moves the game on by itself. */
const REVEAL_HOLD_MS = 4_000;
const ADVANCE_RETRY_MS = 2_000;
/** Continue retries a refused advance this often, this many times, before offering itself again. The
 * usual refusal is a device clock slightly ahead of the server's 15 seconds. */
const CONTINUE_RETRY_MS = 1_000;
const CONTINUE_ATTEMPTS = 15;
/** A second press this soon after the last belongs to the same double tap. Without this, the second
 * tap on Skip would land on the Continue button that takes its place, and the second tap on Continue
 * on the next question's Skip. A new question counts as a press, so a tap aimed at Continue just as
 * the game moves on by itself doesn't skip it. */
const DOUBLE_TAP_MS = 600;
/** Choices no longer than this sit two to a row on a phone (Game.css). */
const SHORT_CHOICE = 22;
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
  /** When the game will move on by itself (this device's clock); null while it isn't counting. */
  advanceAt: number | null;
}

const newTurn = (index: number): Turn => ({ index, answers: [], myChoice: null, submitting: false, awarded: null, continuing: false, advanceAt: null });

function usePageVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

/** Live "everyone answers" gameplay for one question at a time. Every seated player gets one shot at
 * each question — submitAnswer() scores their own answer immediately (no separate reveal-then-resolve
 * step; there's no single "buzz winner" to wait on anymore). The round is over once its time window
 * elapses or everyone's answered, whichever's first — computed identically on every client from the
 * same room.current_question_started_at + answer count, no extra signaling needed.
 *
 * Once the round is over the answer is revealed, and each client calls checkAndAdvance() on its own
 * REVEAL_HOLD_MS after it showed that, or at once if its player presses Continue. Whichever call
 * arrives first moves the whole room; check_and_advance() ignores the rest, because each call names
 * the question it is ending.
 *
 * Alone, there is also a Skip button until the player answers. Skip is recorded and scored as a wrong
 * answer; running out of time scores nothing. */
export default function GameRoomPlay({ room, players, userId, answersVersion, onRoomAdvanced, onScored, renderVideoStrip }: GameRoomPlayProps) {
  const index = room.current_question_index;
  const question = getQuestionById(room.question_ids[index] ?? "");
  const [stored, setStored] = useState<Turn>(() => newTurn(index));
  const turn = stored.index === index ? stored : newTurn(index);
  const { answers, myChoice, submitting, awarded, continuing, advanceAt } = turn;
  const [now, setNow] = useState(() => Date.now());
  const visible = usePageVisible();

  const promptRef = useRef<HTMLParagraphElement>(null);
  const revealRef = useRef<HTMLParagraphElement>(null);
  const indexRef = useRef(index);
  indexRef.current = index;
  const submittedIndexRef = useRef(-1);
  const lastPressRef = useRef(0);
  const onRoomAdvancedRef = useRef(onRoomAdvanced);
  onRoomAdvancedRef.current = onRoomAdvanced;

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

  // The server stamps when each question began; this device's clock may disagree with the server's.
  // A question that arrives while the screen is up (or the opening one) was stamped moments ago, so
  // the difference is measured then and the 15 seconds run on this clock. Otherwise a fast clock
  // would reveal early and move the room on before the others had their time with the answer. A game
  // rejoined partway keeps the server's stamp as it is.
  const stamp = room.current_question_started_at ? new Date(room.current_question_started_at).getTime() : null;
  const clockRef = useRef<{ index: number; offset: number } | null>(null);
  if (stamp !== null && clockRef.current?.index !== index) {
    const sinceStamp = Date.now() - stamp;
    const justBegun = clockRef.current !== null || (index === 0 && Math.abs(sinceStamp) < ROUND_SECONDS * 1000);
    clockRef.current = { index, offset: justBegun ? sinceStamp : 0 };
  }
  const startedAt = stamp !== null ? stamp + (clockRef.current?.offset ?? 0) : now;
  // The quarter-second tick above can end a round late, which would come off another player's time with
  // the answer. This one lands on the deadline.
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, startedAt + ROUND_SECONDS * 1000 - Date.now()) + 5);
    return () => clearTimeout(timer);
  }, [startedAt]);
  const elapsedMs = now - startedAt;
  const secondsLeft = Math.max(0, Math.ceil((ROUND_SECONDS * 1000 - elapsedMs) / 1000));
  const everyoneAnswered = players.length > 0 && answers.length >= players.length;
  const roundOver = everyoneAnswered || elapsedMs >= ROUND_SECONDS * 1000;
  // The same count the rest of this game calls solo (and that submit_answer() withholds the 2x bonus
  // on), except that an empty list means the players have not loaded yet.
  const solo = players.length === 1;

  // The bar under the question takes up room, so on a small phone bring each new question, and then
  // its answer, into view. "nearest" leaves the page still when they are already showing.
  const shownIndexRef = useRef(index);
  useEffect(() => {
    promptRef.current?.scrollIntoView({ block: "nearest" });
    if (shownIndexRef.current !== index) {
      shownIndexRef.current = index;
      lastPressRef.current = Date.now();
    }
  }, [index]);
  useEffect(() => {
    if (roundOver) revealRef.current?.scrollIntoView({ block: "nearest" });
  }, [roundOver, index]);

  // Moving on. There is only ever one of these loops: a Continue press replaces the countdown with an
  // immediate call. The countdown runs only while the page is on screen, so it is measured from when
  // this player could see the answer, and starts over if they were away.
  //
  // Both kinds KEEP RETRYING. A single failed call (server-clock skew against the RPC's own 15s guard,
  // a throttled tab, a dropped request) used to permanently stall the room. After CONTINUE_ATTEMPTS a
  // press gives the button back and the countdown takes over again. Every seated player's client runs
  // this, so it doesn't rely on a "host" being present; the loop stops when the index changes and this
  // effect cleans up.
  useEffect(() => {
    if (!roundOver || !(continuing || visible)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attemptsLeft = CONTINUE_ATTEMPTS;
    const attempt = () => {
      checkAndAdvance(room.id, index)
        .then((next) => {
          if (!cancelled) onRoomAdvancedRef.current(next);
        })
        .catch(() => {
          if (cancelled) return;
          if (continuing && --attemptsLeft === 0) update(index, { continuing: false });
          else timer = setTimeout(attempt, continuing ? CONTINUE_RETRY_MS : ADVANCE_RETRY_MS);
        });
    };
    const hold = continuing ? 0 : REVEAL_HOLD_MS;
    if (!continuing) update(index, { advanceAt: Date.now() + hold });
    timer = setTimeout(attempt, hold);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      update(index, { advanceAt: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOver, continuing, visible, room.id, index]);

  /** False for the second tap of a double tap on the buttons below the question. */
  const acceptPress = () => {
    const pressedAt = Date.now();
    if (pressedAt - lastPressRef.current < DOUBLE_TAP_MS) return false;
    lastPressRef.current = pressedAt;
    return true;
  };

  const handleContinue = () => {
    if (acceptPress() && !continuing) update(index, { continuing: true });
  };

  // `now` ticks every quarter second, so it can lag the moment the countdown was set.
  const countdown =
    advanceAt !== null && !continuing ? Math.min(REVEAL_HOLD_MS / 1000, Math.ceil((advanceAt - now) / 1000)) : 0;

  const continueBar = (
    <div className="game-action-bar">
      <button type="button" className="games-primary-button game-action-button" onClick={handleContinue} disabled={!roundOver || continuing}>
        Continue
        {countdown > 0 && (
          <span className="game-action-countdown" aria-hidden="true">
            {countdown}
          </span>
        )}
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
        <div className={`game-question-choices${question.choices.every((c) => c.length <= SHORT_CHOICE) ? " is-short" : ""}`}>
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
        {roundOver && question.youngEarthDate && (
          <p className="game-question-young-earth">
            {YOUNG_EARTH_DATE_NOTE} See {AGE_OF_EARTH_TOPIC_NAME} in Topics.
          </p>
        )}
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

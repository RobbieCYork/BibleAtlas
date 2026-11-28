import { useEffect, useMemo, useState } from "react";
import { createGameRoom, joinGameRoom, startGameRoom, fetchTopHighScores, type GameHighScore } from "../lib/gameSupabase";
import {
  TOPIC_PRESETS,
  DIFFICULTY_CHOICES,
  DIFFICULTY_POINTS,
  MIN_ROUND_QUESTIONS,
  ROUND_QUESTION_COUNT,
  countAvailableQuestions,
  type QuizDifficultyChoice,
  type QuizSettings,
  type QuizTopicPreset,
} from "../data/gameQuestions";
import Icon from "./Icon";
import { JoinByCode } from "./GameEntry";

interface GamesPanelProps {
  /** Which first-screen choice led here. */
  entry: "solo" | "create" | "join";
  onRoomReady: (roomId: string) => void;
}

const TARGET_SCORE = 50;

const difficultyLabel = (key: QuizDifficultyChoice) => DIFFICULTY_CHOICES.find((d) => d.key === key)?.label ?? key;

/** Bible Trivia's step after its first screen. Play solo and Create show the rules, the topic and
 * difficulty choice, one start button and the standing Top 5; Join is the code and nothing else.
 * Error handling is local rather than following an existing panel's pattern one-for-one. */
export default function GamesPanel({ entry, onRoomReady }: GamesPanelProps) {
  const [preset, setPreset] = useState<QuizTopicPreset>("all");
  const [customMode, setCustomMode] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [difficulty, setDifficulty] = useState<QuizDifficultyChoice>("mixed");
  /** Set when switching topic forced the difficulty back to Mixed, so the change is never silent. */
  const [difficultyNote, setDifficultyNote] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<GameHighScore[] | null>(null);

  useEffect(() => {
    if (entry === "join") return;
    fetchTopHighScores(5)
      .then(setHighScores)
      .catch(() => setHighScores([]));
  }, [entry]);

  const topic: QuizSettings = customMode ? { customQuery } : { preset };
  // How many questions each difficulty has for the current topic. Cheap to recompute — an in-memory
  // scan of the question pool, no network round trip — but useMemo keeps it from re-running on
  // unrelated re-renders (e.g. the join-code field).
  const counts = useMemo(
    () =>
      Object.fromEntries(DIFFICULTY_CHOICES.map((d) => [d.key, countAvailableQuestions({ ...topic, difficulty: d.key })])) as Record<
        QuizDifficultyChoice,
        number
      >,
    [customMode, preset, customQuery] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const settings: QuizSettings = { ...topic, difficulty };
  const availableCount = counts[difficulty];
  const canStart = availableCount >= MIN_ROUND_QUESTIONS;
  const roundLength = Math.min(availableCount, ROUND_QUESTION_COUNT);
  const needsCustomText = customMode && !customQuery.trim();

  const selectTopic = (value: string) => {
    setDifficultyNote(null);
    if (value === "custom") {
      setCustomMode(true);
      return;
    }
    const next = value as QuizTopicPreset;
    setCustomMode(false);
    setPreset(next);
    if (countAvailableQuestions({ preset: next, difficulty }) < MIN_ROUND_QUESTIONS) {
      const label = TOPIC_PRESETS.find((p) => p.key === next)?.label ?? next;
      setDifficultyNote(`${label} has no ${difficultyLabel(difficulty)} questions, so difficulty is back to Mixed.`);
      setDifficulty("mixed");
    }
  };

  /** One line saying what the start button will actually serve — including when it will be a short round. */
  const roundSummary = () => {
    if (needsCustomText) return "Type a topic to see how many questions match.";
    if (!canStart) {
      const kind = difficulty === "mixed" ? "" : `${difficultyLabel(difficulty)} `;
      const found =
        availableCount === 0
          ? `No ${kind}questions match`
          : availableCount === 1
            ? `Only 1 ${kind}question matches`
            : `Only ${availableCount} ${kind}questions match`;
      return `${found} — a game needs at least ${MIN_ROUND_QUESTIONS}. Try another topic or difficulty.`;
    }
    const length =
      availableCount < ROUND_QUESTION_COUNT
        ? `Short game: only ${availableCount} questions match, and you'll get all of them.`
        : `${roundLength} questions, picked from ${availableCount} that match.`;
    // Easy questions are worth 1 point, so even doubled, a full round of them tops out below the target.
    const easyOnly = difficulty === "easy" ? ` Easy is worth 1 point, so the highest score after the last question wins.` : "";
    return length + easyOnly;
  };

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = await createGameRoom(TARGET_SCORE, ROUND_QUESTION_COUNT, settings);
      onRoomReady(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create a game — try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Creates a room and starts it immediately, skipping the lobby's room-code/roster screen entirely
   * — that screen has nothing useful to offer a solo player. The scoring model (everyone answers,
   * first correct doubles, race to the target score) already works fine with just one player. */
  const handlePlaySolo = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = await createGameRoom(TARGET_SCORE, ROUND_QUESTION_COUNT, settings);
      await startGameRoom(room.id);
      onRoomReady(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start a solo game — try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const room = await joinGameRoom(joinCode);
      onRoomReady(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join that game — check the code and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (entry === "join") {
    return <JoinByCode code={joinCode} onCodeChange={setJoinCode} onJoin={handleJoin} busy={busy} error={error} />;
  }
  const solo = entry === "solo";

  return (
    <div className="games-panel">
      <div className="games-panel-intro">
        <h2>{solo ? "Play solo" : "Create multiplayer game"}</h2>
        <p>
          {solo
            ? `Wrong answers cost you, and so does running out of time. Reach ${TARGET_SCORE} points to win, or play until the questions run out.`
            : `Create a room and share the code. Every player answers, wrong answers cost you, first correct doubles. First to ${TARGET_SCORE} wins, or the highest score when the questions run out.`}
        </p>
      </div>

      <div className="games-panel-card games-topic-card">
        <h3 id="games-topic-heading">Choose a topic</h3>
        <select
          className="games-topic-select"
          aria-labelledby="games-topic-heading"
          value={customMode ? "custom" : preset}
          onChange={(e) => selectTopic(e.target.value)}
          disabled={busy}
        >
          {TOPIC_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        <p className="games-topic-description">
          {customMode ? "Type your own focus below." : TOPIC_PRESETS.find((p) => p.key === preset)?.description}
        </p>
        {customMode && (
          <div className="games-topic-custom">
            <input
              type="text"
              className="games-topic-custom-input"
              aria-label="Custom topic"
              placeholder="e.g. Paul's missionary journeys, kings of Israel, miracles of Jesus…"
              value={customQuery}
              onChange={(e) => {
                setDifficultyNote(null);
                setCustomQuery(e.target.value);
              }}
              disabled={busy}
            />
            <p className="games-topic-custom-note">
              Searches this app's own library of questions for your words — not a live AI call, so a very narrow or unusual phrase may
              find only a few, or none.
            </p>
          </div>
        )}

        <fieldset className="games-difficulty" disabled={busy}>
          <legend>Choose a difficulty</legend>
          <div className="games-difficulty-options">
            {DIFFICULTY_CHOICES.map((d) => {
              const selected = difficulty === d.key;
              const unavailable = !needsCustomText && counts[d.key] < MIN_ROUND_QUESTIONS;
              return (
                <label key={d.key} className={`games-difficulty-option${selected ? " is-selected" : ""}${unavailable ? " is-unavailable" : ""}`}>
                  <input
                    type="radio"
                    name="trivia-difficulty"
                    value={d.key}
                    checked={selected}
                    disabled={unavailable}
                    onChange={() => {
                      setDifficultyNote(null);
                      setDifficulty(d.key);
                    }}
                  />
                  <span className="games-difficulty-name">{d.label}</span>
                  <span className="games-difficulty-detail">
                    {d.key === "mixed" ? "All levels" : `${DIFFICULTY_POINTS[d.key]} pt${DIFFICULTY_POINTS[d.key] === 1 ? "" : "s"}`}
                    {!needsCustomText && ` · ${counts[d.key]}`}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {difficultyNote && (
          <p className="games-topic-description" role="status">
            {difficultyNote}
          </p>
        )}
        <p className="games-topic-count games-inline-icon" role="status">
          <Icon name="target" />
          <span>{roundSummary()}</span>
        </p>
      </div>

      <button type="button" className="games-primary-button game-start-button" onClick={solo ? handlePlaySolo : handleCreate} disabled={busy || !canStart}>
        {busy ? (
          solo ? "Starting…" : "Creating…"
        ) : (
          <>
            <Icon name={solo ? "play" : "players"} />
            {solo ? "Start game" : "Create game"}
          </>
        )}
      </button>

      {error && <p className="games-error">{error}</p>}

      <div className="games-high-scores">
        <h3 className="games-inline-icon">
          <Icon name="trophy" />
          Top 5 High Scores
        </h3>
        {highScores === null ? (
          <p className="games-high-scores-empty">Loading…</p>
        ) : highScores.length === 0 ? (
          <p className="games-high-scores-empty">No games finished yet — be the first!</p>
        ) : (
          <ol className="games-high-scores-list">
            {highScores.map((row) => (
              <li key={row.id}>
                <span className="games-high-scores-name">{row.display_name}</span>
                <span className="games-high-scores-score">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

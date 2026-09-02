import { useEffect, useMemo, useState } from "react";
import { createGameRoom, joinGameRoom, startGameRoom, fetchTopHighScores, type GameHighScore } from "../lib/gameSupabase";
import { TOPIC_PRESETS, countAvailableQuestions, type QuizTopicPreset } from "../data/gameQuestions";
import Icon from "./Icon";

interface GamesPanelProps {
  onRoomReady: (roomId: string) => void;
}

const GAME_QUESTION_COUNT = 24;

/** The Games entry screen — pick a topic, create a room (or join one by code), plus the standing Top
 * 5 leaderboard. Mirrors the create/join split every other room-based flow in this app doesn't have
 * yet, so its error handling is local rather than following an existing panel's pattern one-for-one. */
export default function GamesPanel({ onRoomReady }: GamesPanelProps) {
  const [preset, setPreset] = useState<QuizTopicPreset>("all");
  const [customMode, setCustomMode] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<GameHighScore[] | null>(null);

  useEffect(() => {
    fetchTopHighScores(5)
      .then(setHighScores)
      .catch(() => setHighScores([]));
  }, []);

  const topic = customMode ? { customQuery } : { preset };
  // Cheap to recompute on every keystroke — it's an in-memory scan of ~1,000 questions, no network
  // round trip — but useMemo keeps it from re-running on unrelated re-renders (e.g. the join-code field).
  const availableCount = useMemo(() => countAvailableQuestions(topic), [customMode, preset, customQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = await createGameRoom(50, GAME_QUESTION_COUNT, topic);
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
      const room = await createGameRoom(50, GAME_QUESTION_COUNT, topic);
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

  return (
    <div className="games-panel">
      <div className="games-panel-intro">
        <h2 className="games-inline-icon">
          <Icon name="trivia" />
          Bible Trivia
        </h2>
        <p>Play solo or live with friends — every player answers, wrong answers cost you, first correct doubles. First to 50 wins.</p>
      </div>

      <div className="games-panel-card games-topic-card">
        <h3>Choose a topic</h3>
        <select
          className="games-topic-select"
          value={customMode ? "custom" : preset}
          onChange={(e) => {
            if (e.target.value === "custom") {
              setCustomMode(true);
            } else {
              setCustomMode(false);
              setPreset(e.target.value as QuizTopicPreset);
            }
          }}
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
              placeholder="e.g. Paul's missionary journeys, kings of Israel, miracles of Jesus…"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              disabled={busy}
            />
            <p className="games-topic-custom-note">
              Searches this app's own library of {"~1,000"} generated questions for your focus — not a live AI call, so a very
              narrow or unusual phrase may come up short (the rest of the game gets filled in from a general mix so it's
              never too short to play).
            </p>
          </div>
        )}
        <p className="games-topic-count games-inline-icon">
          {customMode && customQuery.trim()
            ? availableCount > 0
              ? <>
                  <Icon name="target" />
                  {`${availableCount} question${availableCount === 1 ? "" : "s"} matched your topic`}
                </>
              : "No matches yet — the game will use a general mix instead"
            : <>
                <Icon name="target" />
                {`${availableCount} questions available in this topic`}
              </>}
        </p>
      </div>

      <div className="games-panel-actions">
        <div className="games-panel-card">
          <h3>Play now</h3>
          <p>Solo practice, or start a room and share the code with others.</p>
          <button type="button" className="games-primary-button" onClick={handlePlaySolo} disabled={busy}>
            {busy ? (
              "Starting…"
            ) : (
              <>
                <Icon name="people" />
                Play Solo
              </>
            )}
          </button>
          <button type="button" className="games-secondary-button" onClick={handleCreate} disabled={busy}>
            {busy ? (
              "Creating…"
            ) : (
              <>
                <Icon name="players" />
                Create Multiplayer Game
              </>
            )}
          </button>
        </div>

        <div className="games-panel-card">
          <h3>Join a game</h3>
          <p>Enter the code the host shared with you.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
          >
            <input
              type="text"
              className="games-code-input"
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              disabled={busy}
            />
            <button type="submit" className="games-primary-button" disabled={busy || !joinCode.trim()}>
              {busy ? "Joining…" : "Join Game"}
            </button>
          </form>
        </div>
      </div>

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
            {highScores.map((entry) => (
              <li key={entry.id}>
                <span className="games-high-scores-name">{entry.display_name}</span>
                <span className="games-high-scores-score">{entry.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

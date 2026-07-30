import { useEffect, useState } from "react";
import { createGameRoom, joinGameRoom, fetchTopHighScores, type GameHighScore } from "../lib/gameSupabase";

interface GamesPanelProps {
  onRoomReady: (roomId: string) => void;
}

/** The Games entry screen — create a room or join one by code, plus the standing Top 5 leaderboard.
 * Mirrors the create/join split every other room-based flow in this app doesn't have yet, so its
 * error handling is local rather than following an existing panel's pattern one-for-one. */
export default function GamesPanel({ onRoomReady }: GamesPanelProps) {
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<GameHighScore[] | null>(null);

  useEffect(() => {
    fetchTopHighScores(5)
      .then(setHighScores)
      .catch(() => setHighScores([]));
  }, []);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = await createGameRoom(50);
      onRoomReady(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create a game — try again.");
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
        <h2>🎮 Bible Trivia</h2>
        <p>
          Play live with friends — people, places, and Bible history questions worth 1 to 10 points. First to 50 wins.
        </p>
      </div>

      <div className="games-panel-actions">
        <div className="games-panel-card">
          <h3>Start a new game</h3>
          <p>You'll get a short code to share with the others.</p>
          <button type="button" className="games-primary-button" onClick={handleCreate} disabled={busy}>
            {busy ? "Creating…" : "Create Game"}
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
        <h3>🏆 Top 5 High Scores</h3>
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

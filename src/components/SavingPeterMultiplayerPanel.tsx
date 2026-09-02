import { useEffect, useState } from "react";
import { createSavingPeterRoom, joinSavingPeterRoom, fetchTopSavingPeterHighScores, type SavingPeterHighScore } from "../lib/savingPeterMultiplayer";
import Icon from "./Icon";

interface SavingPeterMultiplayerPanelProps {
  onRoomReady: (roomId: string) => void;
}

/** The multiplayer entry screen — create a room (share the code) or join one by code, plus the
 * standing Top 5 leaderboard. Mirrors GamesPanel.tsx's create/join split, minus the topic picker —
 * every round already draws from a shuffled mix of all five word-bank difficulties. */
export default function SavingPeterMultiplayerPanel({ onRoomReady }: SavingPeterMultiplayerPanelProps) {
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<SavingPeterHighScore[] | null>(null);

  useEffect(() => {
    fetchTopSavingPeterHighScores(5)
      .then(setHighScores)
      .catch(() => setHighScores([]));
  }, []);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = await createSavingPeterRoom(50);
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
      const room = await joinSavingPeterRoom(joinCode);
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
          <Icon name="savingPeter" />
          Saving Peter — Multiplayer
        </h2>
        <p>
          Up to 4 players with video chat. Every round shows a clue from a random difficulty — only the first correct guess
          scores, wrong guesses cost you. First to 50 wins.
        </p>
      </div>

      <div className="games-panel-actions">
        <div className="games-panel-card">
          <h3>Start a game</h3>
          <p>Create a room and share the code with up to 3 friends.</p>
          <button type="button" className="games-primary-button" onClick={handleCreate} disabled={busy}>
            {busy ? "Creating…" : "👥 Create Room"}
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

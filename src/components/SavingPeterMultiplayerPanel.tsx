import { useEffect, useState } from "react";
import { createSavingPeterRoom, joinSavingPeterRoom, fetchTopSavingPeterHighScores, type SavingPeterHighScore } from "../lib/savingPeterMultiplayer";
import Icon from "./Icon";
import { JoinByCode } from "./GameEntry";

interface SavingPeterMultiplayerPanelProps {
  entry: "create" | "join";
  onRoomReady: (roomId: string) => void;
}

/** The step after Create or Join on Saving Peter's first screen. Create shows the rules, the one
 * start button and the standing Top 5; there is nothing to choose, because every round already draws
 * from a shuffled mix of all five word-bank difficulties. Join is the code and nothing else. */
export default function SavingPeterMultiplayerPanel({ entry, onRoomReady }: SavingPeterMultiplayerPanelProps) {
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<SavingPeterHighScore[] | null>(null);

  useEffect(() => {
    if (entry !== "create") return;
    fetchTopSavingPeterHighScores(5)
      .then(setHighScores)
      .catch(() => setHighScores([]));
  }, [entry]);

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

  if (entry === "join") {
    return <JoinByCode code={joinCode} onCodeChange={setJoinCode} onJoin={handleJoin} busy={busy} error={error} />;
  }

  return (
    <div className="games-panel">
      <div className="games-panel-intro">
        <h2>Create multiplayer game</h2>
        <p>
          Up to 4 players with video chat. Every round shows a clue from a random difficulty — only the first correct guess
          scores, wrong guesses cost you. First to 50 wins.
        </p>
      </div>

      <div className="games-panel-card">
        <p>Create a room and share the code with up to 3 friends.</p>
        <button type="button" className="games-primary-button game-start-button" onClick={handleCreate} disabled={busy}>
          {busy ? "Creating…" : <><Icon name="players" inline /> Create game</>}
        </button>
        {error && <p className="games-error">{error}</p>}
      </div>

      <div className="games-high-scores">
        <h3><Icon name="trophy" inline /> Top 5 High Scores</h3>
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

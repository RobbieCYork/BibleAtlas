import { useEffect, useState } from "react";
import { fetchTopHighScores, type GameRoom, type GamePlayer, type GameHighScore } from "../lib/gameSupabase";

interface GameResultsProps {
  room: GameRoom;
  players: GamePlayer[];
  onPlayAgain: () => void;
}

/** End-of-game screen — winner banner, final scores, and the Top 5 board (refetched here since
 * this game's own result may have just landed a new entry on it via check_and_advance()). */
export default function GameResults({ room, players, onPlayAgain }: GameResultsProps) {
  const [highScores, setHighScores] = useState<GameHighScore[] | null>(null);
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const winner = room.winner_id ? players.find((p) => p.user_id === room.winner_id) : ranked[0];

  useEffect(() => {
    fetchTopHighScores(5)
      .then(setHighScores)
      .catch(() => setHighScores([]));
  }, []);

  return (
    <div className="game-results">
      <div className="game-results-banner">
        <p className="game-results-trophy">🏆</p>
        <h2>{winner ? `${winner.display_name} wins!` : "Game over"}</h2>
        {winner && <p className="game-results-score">{winner.score} points</p>}
      </div>

      <div className="game-results-scores">
        <h3>Final Scores</h3>
        <ol>
          {ranked.map((p) => (
            <li key={p.user_id} className={p.user_id === room.winner_id ? "game-results-winner-row" : ""}>
              <span>{p.display_name}</span>
              <span>{p.score}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="games-high-scores">
        <h3>🏆 Top 5 High Scores</h3>
        {highScores === null ? (
          <p className="games-high-scores-empty">Loading…</p>
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

      <button type="button" className="games-primary-button" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}

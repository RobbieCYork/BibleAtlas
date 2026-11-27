import { useEffect, useState } from "react";
import { fetchTopHighScores, type GameRoom, type GamePlayer, type GameHighScore } from "../lib/gameSupabase";
import Icon from "./Icon";
import { ResultsScoreList, ResultsWinnerPictures } from "./GameResultsStandings";
import { useFinalStandings } from "../hooks/useFinalStandings";

interface GameResultsProps {
  room: GameRoom;
  players: GamePlayer[];
  onPlayAgain: () => void;
}

/** End-of-game screen — winner banner, final scores, and the Top 5 board (refetched here since
 * this game's own result may have just landed a new entry on it via check_and_advance()). */
export default function GameResults({ room, players, onPlayAgain }: GameResultsProps) {
  const [highScores, setHighScores] = useState<GameHighScore[] | null>(null);
  const { ranked, multiplayer, tied, winner, winners, pictures } = useFinalStandings(players, room.winner_id);

  useEffect(() => {
    fetchTopHighScores(5)
      .then(setHighScores)
      .catch(() => setHighScores([]));
  }, []);

  return (
    <div className="game-results">
      <div className="game-results-banner">
        {multiplayer && winners.length > 0 ? (
          <ResultsWinnerPictures winners={winners} pictures={pictures} />
        ) : (
          <p className="game-results-trophy"><Icon name="trophy" /></p>
        )}
        <h2>{winner ? `${winner.display_name} wins!` : tied ? "It's a tie!" : "Game over"}</h2>
        {winner && <p className="game-results-score">{winner.score} points</p>}
        {tied && <p className="game-results-score">{ranked[0].score} points each</p>}
      </div>

      <ResultsScoreList ranked={ranked} winners={winners} pictures={pictures} showPictures={multiplayer} />

      <div className="games-high-scores">
        <h3><Icon name="trophy" inline /> Top 5 High Scores</h3>
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

import { useEffect, useState } from "react";
import {
  fetchTopSavingPeterHighScores,
  type SavingPeterRoom,
  type SavingPeterPlayer,
  type SavingPeterHighScore,
} from "../lib/savingPeterMultiplayer";
import Icon from "./Icon";
import { ResultsScoreList, ResultsWinnerPictures } from "./GameResultsStandings";
import { useFinalStandings } from "../hooks/useFinalStandings";

interface SavingPeterMultiplayerResultsProps {
  room: SavingPeterRoom;
  players: SavingPeterPlayer[];
  onPlayAgain: () => void;
}

/** End-of-game screen — mirrors GameResults.tsx (Bible Trivia). */
export default function SavingPeterMultiplayerResults({ room, players, onPlayAgain }: SavingPeterMultiplayerResultsProps) {
  const [highScores, setHighScores] = useState<SavingPeterHighScore[] | null>(null);
  const { ranked, multiplayer, tied, winner, winners, pictures } = useFinalStandings(players, room.winner_id);

  useEffect(() => {
    fetchTopSavingPeterHighScores(5)
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
        <h2>{winner ? `${winner.display_name} saved Peter!` : tied ? "It's a tie!" : "Game over"}</h2>
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

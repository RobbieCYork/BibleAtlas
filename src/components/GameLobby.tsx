import type { ReactNode } from "react";
import type { GameRoom, GamePlayer } from "../lib/gameSupabase";

interface GameLobbyProps {
  room: GameRoom;
  players: GamePlayer[];
  userId: string;
  onStart: () => void;
  onLeave: () => void;
  starting: boolean;
  videoStrip: ReactNode;
}

/** The waiting room — room code to share, live roster (via GameView's realtime subscription), video
 * previews, and the host's Start button. Needs at least 2 players since a solo "race to buzz in" game
 * isn't a race. */
export default function GameLobby({ room, players, userId, onStart, onLeave, starting, videoStrip }: GameLobbyProps) {
  const isHost = room.host_id === userId;

  return (
    <div className="game-lobby">
      <div className="game-lobby-code-card">
        <p className="game-lobby-code-label">Room Code</p>
        <p className="game-lobby-code">{room.code}</p>
        <p className="game-lobby-code-hint">Share this code so others can join.</p>
      </div>

      {videoStrip}

      <div className="game-lobby-roster">
        <h3>Players ({players.length}/8)</h3>
        <ul>
          {players.map((p) => (
            <li key={p.user_id} className={p.user_id === userId ? "game-lobby-player-you" : ""}>
              {p.display_name}
              {p.user_id === room.host_id && <span title="Host"> 👑</span>}
              {p.user_id === userId && " (you)"}
            </li>
          ))}
        </ul>
      </div>

      <div className="game-lobby-actions">
        {isHost ? (
          <button type="button" className="games-primary-button" onClick={onStart} disabled={starting || players.length < 2}>
            {starting ? "Starting…" : players.length < 2 ? "Waiting for more players…" : "Start Game"}
          </button>
        ) : (
          <p className="game-lobby-waiting">Waiting for the host to start the game…</p>
        )}
        <button type="button" className="games-secondary-button" onClick={onLeave}>
          Leave
        </button>
      </div>
    </div>
  );
}

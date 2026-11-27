import { useState } from "react";
import Icon from "./Icon";

interface ResultPlayer {
  user_id: string;
  display_name: string;
  score: number;
}

type Pictures = Record<string, string | null>;

/** The app's usual avatar circle: the picture, or the initial when there is none or it won't load. */
function PlayerAvatar({ name, src, className }: { name: string; src?: string | null; className: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <span className={`auth-avatar ${className}`} aria-hidden="true">
      {src && src !== failedSrc ? <img src={src} alt="" onError={() => setFailedSrc(src)} /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

/** The top of a multiplayer results screen. One winner gets a large picture with the trophy pinned
 * to it (the headline underneath names them); a tie gets the trophy above every tied player. */
export function ResultsWinnerPictures({ winners, pictures }: { winners: ResultPlayer[]; pictures: Pictures }) {
  const tie = winners.length > 1;
  return (
    <>
      {tie && (
        <p className="game-results-trophy">
          <Icon name="trophy" />
        </p>
      )}
      <div className="game-results-winners">
        {winners.map((p) => (
          <div key={p.user_id} className="game-results-winner">
            <PlayerAvatar
              name={p.display_name}
              src={pictures[p.user_id]}
              className={`game-results-avatar-winner${tie ? " game-results-avatar-tied" : ""}`}
            />
            {tie ? (
              <span className="game-results-winner-name">{p.display_name}</span>
            ) : (
              <span className="game-results-badge">
                <Icon name="trophy" />
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/** Final Scores. Pictures are left out of a solo game, whose list is just the one name. */
export function ResultsScoreList({
  ranked,
  winners,
  pictures,
  showPictures,
}: {
  ranked: ResultPlayer[];
  winners: ResultPlayer[];
  pictures: Pictures;
  showPictures: boolean;
}) {
  return (
    <div className="game-results-scores">
      <h3>Final Scores</h3>
      <ol>
        {ranked.map((p) => (
          <li key={p.user_id} className={winners.some((w) => w.user_id === p.user_id) ? "game-results-winner-row" : ""}>
            {showPictures ? (
              <span className="game-results-player">
                <PlayerAvatar name={p.display_name} src={pictures[p.user_id]} className="game-results-avatar-row" />
                <span>{p.display_name}</span>
              </span>
            ) : (
              <span>{p.display_name}</span>
            )}
            <span>{p.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

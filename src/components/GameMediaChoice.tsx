import type { GameMedia } from "../hooks/useGameWebRTC";
import Icon from "./Icon";

/** The lobby card that comes before any browser permission prompt. It never blocks the room: the
 * player is already seated, and the host can start whether or not anyone has answered. Gone once a
 * choice is made (or a toggle is used); the buttons under the players change it any time. */
export default function GameMediaChoice({ media }: { media: GameMedia }) {
  if (media.hasChosen) return null;
  return (
    <div className="games-panel-card game-media-choice" role="group" aria-labelledby="game-media-choice-title">
      <h3 id="game-media-choice-title">Camera and mic are optional</h3>
      <p>How do you want to join the video chat? You can change this any time.</p>
      <button type="button" className="games-secondary-button" onClick={() => media.choose("both")}>
        <Icon name="video" inline /> Camera and mic
      </button>
      <button type="button" className="games-secondary-button" onClick={() => media.choose("mic")}>
        <Icon name="mic" inline /> Mic only
      </button>
      <button type="button" className="games-secondary-button" onClick={() => media.choose("none")}>
        <Icon name="videoOff" inline /> Play without camera or mic
      </button>
    </div>
  );
}

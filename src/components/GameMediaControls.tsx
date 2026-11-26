import type { GameMedia } from "../hooks/useGameWebRTC";
import Icon from "./Icon";

/** The mic and camera buttons. "Off" really stops the device (see useGameWebRTC). */
export function GameMediaToggles({ media }: { media: GameMedia }) {
  const button = (on: boolean, pending: boolean, name: string, onClick: () => void, icon: "mic" | "video") => {
    const label = pending ? `Cancel turning on ${name}` : `Turn ${name} ${on ? "off" : "on"}`;
    return (
      <button
        type="button"
        className={`game-video-toggle${on ? "" : " game-video-toggle-off"}`}
        onClick={onClick}
        aria-label={label}
        aria-busy={pending}
        title={label}
      >
        <Icon name={on ? icon : `${icon}Off`} />
      </button>
    );
  };
  return (
    <>
      {button(media.micOn, media.micPending, "microphone", media.toggleMic, "mic")}
      {button(media.cameraOn, media.cameraPending, "camera", media.toggleCamera, "video")}
    </>
  );
}

/** One short line under the buttons: waiting on the browser, or why a device didn't turn on. */
export function GameMediaStatus({ media }: { media: GameMedia }) {
  const waiting = media.micPending || media.cameraPending;
  const text = waiting ? "Waiting for permission… you can keep playing." : media.notice;
  return (
    <p className="game-media-status" role="status">
      {text}
    </p>
  );
}

/** The switches on their own, for the results screen (no player tiles there). Everyone can still
 * hear each other at that point, so the off switches have to be there too. */
export function GameMediaBar({ media }: { media: GameMedia }) {
  return (
    <div className="game-video-strip game-media-bar">
      <div className="game-video-controls">
        <GameMediaToggles media={media} />
      </div>
      <GameMediaStatus media={media} />
    </div>
  );
}

import { useEffect, useRef } from "react";
import type { GamePlayer } from "../lib/gameSupabase";

interface GameVideoStripProps {
  players: GamePlayer[];
  userId: string;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  micOn: boolean;
  cameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}

function VideoTile({ stream, muted, label }: { stream: MediaStream | null; muted: boolean; label: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="game-video-tile">
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="game-video-el" />
      ) : (
        <span className="auth-avatar auth-avatar-lg game-video-fallback" aria-hidden="true">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="game-video-label">{label}</span>
    </div>
  );
}

/** The row of local + remote video tiles — falls back to the app's existing initials-avatar circle
 * (same `.auth-avatar` class used everywhere else) for anyone with no stream yet, camera off, or
 * denied permission, so a missing camera never reads as a broken tile. */
export default function GameVideoStrip({
  players,
  userId,
  localStream,
  remoteStreams,
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
}: GameVideoStripProps) {
  return (
    <div className="game-video-strip">
      <div className="game-video-tiles">
        <VideoTile stream={cameraOn ? localStream : null} muted label="You" />
        {players
          .filter((p) => p.user_id !== userId)
          .map((p) => (
            <VideoTile key={p.user_id} stream={remoteStreams[p.user_id] ?? null} muted={false} label={p.display_name} />
          ))}
      </div>
      <div className="game-video-controls">
        <button type="button" className={`game-video-toggle${micOn ? "" : " game-video-toggle-off"}`} onClick={onToggleMic}>
          {micOn ? "🎙️ Mic On" : "🔇 Mic Off"}
        </button>
        <button type="button" className={`game-video-toggle${cameraOn ? "" : " game-video-toggle-off"}`} onClick={onToggleCamera}>
          {cameraOn ? "📷 Camera On" : "📷 Camera Off"}
        </button>
      </div>
    </div>
  );
}

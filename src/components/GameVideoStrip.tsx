import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { GameMediaStatus, GameMediaToggles } from "./GameMediaControls";
import type { GameMedia } from "../hooks/useGameWebRTC";

interface RoundState {
  answeredUserIds: Set<string>;
  revealed: boolean;
  correctUserIds: Set<string>;
}

/** Just the fields this component actually reads — shared structurally by GamePlayer (Bible Trivia,
 * lib/gameSupabase.ts) and SavingPeterPlayer (lib/savingPeterMultiplayer.ts) so this one video strip
 * works for both games' room models without needing its own duplicate. */
interface VideoStripPlayer {
  user_id: string;
  display_name: string;
  score: number;
}

interface GameVideoStripProps {
  players: VideoStripPlayer[];
  userId: string;
  hostId: string;
  media: GameMedia;
  onLeave: () => void;
  /** Only meaningful (and only rendered as a control) when the caller is the host. */
  onKick?: (targetUserId: string) => void;
  /** Live per-question state, for the answered/correct badges — omitted in the lobby, where there's
   * no question in play yet. */
  round?: RoundState;
  /** Solo game — no one to video-chat with, so the mic/camera toggles are hidden (see
   * BibleTriviaView's isSolo gate on useGameWebRTC). The tile itself still shows, since it's also
   * the score display. */
  isSolo?: boolean;
}

function ScoreDeltaPop({ value, popKey }: { value: number; popKey: number }) {
  return (
    <span key={popKey} className={`game-video-delta-pop${value < 0 ? " game-video-delta-pop-negative" : ""}`}>
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

/** Picture only, always muted (so every browser lets it start by itself) — other players' sound
 * comes from GameRemoteAudio. */
function TileVideo({ track }: { track: MediaStreamTrack }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  // Keyed on the track, not the stream around it, so switching the mic doesn't blink the picture.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.srcObject = new MediaStream([track]);
    el.play().catch(() => {});
  }, [track]);
  return <video ref={ref} autoPlay playsInline muted className="game-video-el" />;
}

function VideoTile({
  stream,
  label,
  isHost,
  score,
  round,
  answered,
  correct,
  delta,
  canKick,
  onKick,
}: {
  /** Only when this player's camera is on; otherwise the tile shows their initial and name. */
  stream: MediaStream | null;
  label: string;
  isHost: boolean;
  score: number;
  round?: RoundState;
  answered: boolean;
  correct: boolean;
  delta: { value: number; nonce: number } | null;
  canKick: boolean;
  onKick?: () => void;
}) {
  const videoTrack = stream?.getVideoTracks()[0];

  const revealClass = round?.revealed ? (correct ? " game-video-tile-correct" : answered ? " game-video-tile-wrong" : "") : "";

  return (
    <div className={`game-video-tile${revealClass}`}>
      {videoTrack ? (
        <TileVideo track={videoTrack} />
      ) : (
        <span className="auth-avatar auth-avatar-lg game-video-fallback" aria-hidden="true">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className={`game-video-score-badge${score < 0 ? " game-video-score-negative" : ""}`}>{score}</span>
      {round && !round.revealed && answered && <span className="game-video-answered-badge">✓</span>}
      {delta && <ScoreDeltaPop value={delta.value} popKey={delta.nonce} />}
      {canKick && (
        <button type="button" className="game-video-kick" onClick={onKick} aria-label={`Remove ${label}`} title={`Remove ${label}`}>
          ✕
        </button>
      )}
      <span className="game-video-label">
        {isHost && <Icon name="crown" inline />}
        {label}
      </span>
    </div>
  );
}

/** The row of local + remote video tiles — doubles as the scoreboard (score badge, "answered", and
 * a floating +N/−N pop overlaid right on each tile) so gameplay doesn't need a separate scoreboard
 * list competing for vertical space. Falls back to the app's existing initials-avatar circle (same
 * `.auth-avatar` class used everywhere else) for anyone with no stream yet, camera off, or denied
 * permission, so a missing camera never reads as a broken tile. */
export default function GameVideoStrip({
  players,
  userId,
  hostId,
  media,
  onLeave,
  onKick,
  round,
  isSolo,
}: GameVideoStripProps) {
  const prevScoresRef = useRef<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Record<string, { value: number; nonce: number }>>({});
  const nonceRef = useRef(0);

  useEffect(() => {
    const prev = prevScoresRef.current;
    const changed: Record<string, { value: number; nonce: number }> = {};
    for (const p of players) {
      const prevScore = prev[p.user_id];
      if (prevScore !== undefined && prevScore !== p.score) {
        nonceRef.current += 1;
        changed[p.user_id] = { value: p.score - prevScore, nonce: nonceRef.current };
      }
    }
    prevScoresRef.current = Object.fromEntries(players.map((p) => [p.user_id, p.score]));
    if (Object.keys(changed).length === 0) return;
    setDeltas((d) => ({ ...d, ...changed }));
    const timers = Object.entries(changed).map(([uid, { nonce }]) =>
      setTimeout(() => {
        setDeltas((d) => {
          if (d[uid]?.nonce !== nonce) return d;
          const next = { ...d };
          delete next[uid];
          return next;
        });
      }, 1600)
    );
    return () => timers.forEach(clearTimeout);
  }, [players]);

  const isHost = hostId === userId;

  /** Another player's stream, unless they say their camera is off. (A player still on an older build
   * doesn't say; whatever video they send is shown.) */
  const remoteVideo = (peerId: string) =>
    media.remoteMedia[peerId]?.camera === false ? null : (media.remoteStreams[peerId] ?? null);

  return (
    <div className="game-video-strip">
      <div className="game-video-tiles">
        <VideoTile
          stream={media.cameraOn ? media.localStream : null}
          label="You"
          isHost={isHost}
          score={players.find((p) => p.user_id === userId)?.score ?? 0}
          round={round}
          answered={round?.answeredUserIds.has(userId) ?? false}
          correct={round?.correctUserIds.has(userId) ?? false}
          delta={deltas[userId] ?? null}
          canKick={false}
        />
        {players
          .filter((p) => p.user_id !== userId)
          .map((p) => (
            <VideoTile
              key={p.user_id}
              stream={remoteVideo(p.user_id)}
              label={p.display_name}
              isHost={p.user_id === hostId}
              score={p.score}
              round={round}
              answered={round?.answeredUserIds.has(p.user_id) ?? false}
              correct={round?.correctUserIds.has(p.user_id) ?? false}
              delta={deltas[p.user_id] ?? null}
              canKick={isHost}
              onKick={() => onKick?.(p.user_id)}
            />
          ))}
      </div>
      <div className="game-video-controls">
        {!isSolo && <GameMediaToggles media={media} />}
        <button type="button" className="game-video-toggle game-video-leave" onClick={onLeave}>
          <Icon name="leave" inline /> Leave
        </button>
      </div>
      {!isSolo && <GameMediaStatus media={media} />}
    </div>
  );
}

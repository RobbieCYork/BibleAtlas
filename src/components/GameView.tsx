import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import GamesPanel from "./GamesPanel";
import GameLobby from "./GameLobby";
import GameRoomPlay from "./GameRoomPlay";
import GameResults from "./GameResults";
import GameVideoStrip from "./GameVideoStrip";
import { useGameWebRTC } from "../hooks/useGameWebRTC";
import { fetchRoom, fetchPlayers, startGameRoom, subscribeToRoom, type GameRoom, type GamePlayer } from "../lib/gameSupabase";
import "./Game.css";

const ACTIVE_ROOM_KEY = "bible-atlas-active-game-room";

interface GameViewProps {
  session: Session;
  onClose: () => void;
}

/** Full-screen "Games" takeover — same pattern as TimelineView/MyProfileView (a boolean in App.tsx
 * renders this over the whole app body; the map/Bible layout underneath stays mounted). Owns which
 * room the player is currently in and drives it through lobby -> active -> finished by watching
 * game_rooms/game_players/game_buzzes over one shared realtime channel (see subscribeToRoom). */
export default function GameView({ session, onClose }: GameViewProps) {
  const userId = session.user.id;
  const [roomId, setRoomId] = useState<string | null>(() => sessionStorage.getItem(ACTIVE_ROOM_KEY));
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [buzzVersion, setBuzzVersion] = useState(0);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const setActiveRoom = (id: string | null) => {
    setRoomId(id);
    if (id) sessionStorage.setItem(ACTIVE_ROOM_KEY, id);
    else sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  };

  const refetchRoom = () => {
    if (!roomId) return;
    fetchRoom(roomId)
      .then((r) => {
        if (!r) {
          // Room vanished (shouldn't normally happen) — bounce back to the entry screen.
          setActiveRoom(null);
          setRoom(null);
          return;
        }
        setRoom(r);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load this game."));
  };
  const refetchPlayers = () => {
    if (!roomId) return;
    fetchPlayers(roomId).then(setPlayers).catch(() => {});
  };

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setPlayers([]);
      return;
    }
    setLoadError(null);
    refetchRoom();
    refetchPlayers();
    const unsubscribe = subscribeToRoom(roomId, {
      onRoomChange: refetchRoom,
      onPlayersChange: refetchPlayers,
      onBuzzChange: () => setBuzzVersion((v) => v + 1),
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Video chat spans the whole room lifetime (lobby through results) so players don't have to
  // re-grant camera/mic permission when the game starts — only torn down once there's no active room.
  const webrtc = useGameWebRTC(roomId, userId);

  const handleStart = async () => {
    if (!room) return;
    setStarting(true);
    try {
      await startGameRoom(room.id);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't start the game.");
    } finally {
      setStarting(false);
    }
  };

  const leaveRoom = () => {
    setActiveRoom(null);
    setRoom(null);
    setPlayers([]);
  };

  const videoStrip = roomId ? (
    <GameVideoStrip
      players={players}
      userId={userId}
      localStream={webrtc.localStream}
      remoteStreams={webrtc.remoteStreams}
      micOn={webrtc.micOn}
      cameraOn={webrtc.cameraOn}
      onToggleMic={webrtc.toggleMic}
      onToggleCamera={webrtc.toggleCamera}
    />
  ) : null;

  return (
    <div className="game-root">
      <header className="game-header">
        <button type="button" className="game-back-btn" onClick={onClose} aria-label="Close Games">
          ← Back
        </button>
        <h2>🎮 Bible Trivia</h2>
      </header>
      <div className="game-body">
        {loadError && <p className="games-error">{loadError}</p>}
        {!roomId || !room ? (
          <GamesPanel onRoomReady={setActiveRoom} />
        ) : room.status === "lobby" ? (
          <GameLobby room={room} players={players} userId={userId} onStart={handleStart} onLeave={leaveRoom} starting={starting} videoStrip={videoStrip} />
        ) : room.status === "active" ? (
          <GameRoomPlay room={room} players={players} userId={userId} buzzVersion={buzzVersion} videoStrip={videoStrip} />
        ) : (
          <GameResults room={room} players={players} onPlayAgain={leaveRoom} />
        )}
      </div>
    </div>
  );
}

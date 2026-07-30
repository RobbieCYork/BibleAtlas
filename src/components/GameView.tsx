import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import GameCenter from "./GameCenter";
import GamesPanel from "./GamesPanel";
import GameLobby from "./GameLobby";
import GameRoomPlay from "./GameRoomPlay";
import GameResults from "./GameResults";
import GameVideoStrip from "./GameVideoStrip";
import { useGameWebRTC } from "../hooks/useGameWebRTC";
import {
  fetchRoom,
  fetchPlayers,
  startGameRoom,
  leaveGameRoom,
  kickPlayer,
  subscribeToRoom,
  type GameRoom,
  type GamePlayer,
} from "../lib/gameSupabase";
import "./Game.css";

const ACTIVE_ROOM_KEY = "bible-atlas-active-game-room";
const ACTIVE_GAME_KEY = "bible-atlas-active-game-key";

interface GameViewProps {
  session: Session;
  onClose: () => void;
}

/** Full-screen "Games" takeover — same pattern as TimelineView/MyProfileView (a boolean in App.tsx
 * renders this over the whole app body; the map/Bible layout underneath stays mounted). Landing view
 * is GameCenter (a list of games — one today, Bible Trivia); selecting one hands off to that game's
 * own flow below. Owns which room the player is currently in and drives it through lobby -> active ->
 * finished by watching game_rooms/game_players/game_buzzes over one shared realtime channel (see
 * subscribeToRoom). */
export default function GameView({ session, onClose }: GameViewProps) {
  const userId = session.user.id;
  // Which game's flow is showing — null means GameCenter itself. Persisted the same way roomId is, so
  // a page refresh mid-game doesn't strand the player on GameCenter while their room lives on.
  const [activeGame, setActiveGame] = useState<string | null>(() => sessionStorage.getItem(ACTIVE_GAME_KEY));
  const [roomId, setRoomId] = useState<string | null>(() => sessionStorage.getItem(ACTIVE_ROOM_KEY));
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [answersVersion, setAnswersVersion] = useState(0);
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
          // Room vanished (host left an empty lobby, or it was otherwise cleaned up server-side) —
          // bounce back to the entry screen instead of showing a room that no longer exists.
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
      onAnswersChange: () => setAnswersVersion((v) => v + 1),
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

  const returnToEntry = () => {
    setActiveRoom(null);
    setRoom(null);
    setPlayers([]);
  };

  const handleLeave = async () => {
    const leavingRoomId = roomId;
    returnToEntry(); // Leave feels instant; the RPC below cleans up server-side in the background.
    if (leavingRoomId) await leaveGameRoom(leavingRoomId).catch(() => {});
  };

  const selectGame = (key: string) => {
    setActiveGame(key);
    sessionStorage.setItem(ACTIVE_GAME_KEY, key);
  };

  /** The header's "← Back" button. Mid-room it leaves first (so the player doesn't linger in the
   * roster after their screen has already moved on) and always lands on GameCenter — from GameCenter
   * itself, Back exits Games mode entirely, back to the main app. */
  const handleBack = async () => {
    if (activeGame === null) {
      onClose();
      return;
    }
    if (roomId) await handleLeave();
    else returnToEntry();
    setActiveGame(null);
    sessionStorage.removeItem(ACTIVE_GAME_KEY);
  };

  const handleKick = async (targetUserId: string) => {
    if (!roomId) return;
    try {
      await kickPlayer(roomId, targetUserId);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't remove that player.");
    }
  };

  const renderVideoStrip = (round?: { answeredUserIds: Set<string>; revealed: boolean; correctUserIds: Set<string> }) =>
    room ? (
      <GameVideoStrip
        players={players}
        userId={userId}
        hostId={room.host_id}
        localStream={webrtc.localStream}
        remoteStreams={webrtc.remoteStreams}
        micOn={webrtc.micOn}
        cameraOn={webrtc.cameraOn}
        onToggleMic={webrtc.toggleMic}
        onToggleCamera={webrtc.toggleCamera}
        onLeave={handleLeave}
        onKick={handleKick}
        round={round}
      />
    ) : null;

  return (
    <div className="game-root">
      <header className="game-header">
        <button type="button" className="game-back-btn" onClick={handleBack} aria-label={activeGame === null ? "Close Games" : "Back to Game Center"}>
          ← Back
        </button>
        <h2>{activeGame === null ? "🎮 Game Center" : "🎮 Bible Trivia"}</h2>
      </header>
      <div className="game-body">
        {loadError && <p className="games-error">{loadError}</p>}
        {activeGame === null ? (
          <GameCenter onSelectGame={selectGame} />
        ) : !roomId || !room ? (
          <GamesPanel onRoomReady={setActiveRoom} />
        ) : room.status === "lobby" ? (
          <GameLobby
            room={room}
            players={players}
            userId={userId}
            onStart={handleStart}
            onLeave={handleLeave}
            onKick={handleKick}
            starting={starting}
            videoStrip={renderVideoStrip()}
          />
        ) : room.status === "active" ? (
          <GameRoomPlay room={room} players={players} userId={userId} answersVersion={answersVersion} renderVideoStrip={renderVideoStrip} />
        ) : (
          <GameResults room={room} players={players} onPlayAgain={handleLeave} />
        )}
      </div>
    </div>
  );
}

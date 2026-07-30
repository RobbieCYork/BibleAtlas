import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import GamesPanel from "./GamesPanel";
import GameLobby from "./GameLobby";
import GameRoomPlay from "./GameRoomPlay";
import GameResults from "./GameResults";
import GameVideoStrip from "./GameVideoStrip";
import BackButton from "./BackButton";
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

const ACTIVE_ROOM_KEY = "bible-atlas-active-game-room";

interface BibleTriviaViewProps {
  session: Session;
  /** Returns to GameCenter — called directly from the entry screen's Back, or after leaving a room
   * first if one's currently joined (see handleBack below). */
  onBack: () => void;
}

/** The Bible Trivia game's own flow — extracted out of GameView so that component can stay a thin
 * router across multiple games (see CrosswordView for the other one). Owns which room the player is
 * currently in and drives it through lobby -> active -> finished by watching game_rooms/game_players/
 * game_buzzes over one shared realtime channel (see subscribeToRoom). */
export default function BibleTriviaView({ session, onBack }: BibleTriviaViewProps) {
  const userId = session.user.id;
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

  // Solo play has no one to video-chat with — <= 1 rather than === 1 so this also covers the moment
  // right after a room's created, before its player list has loaded, avoiding a camera-permission
  // flash for a solo game that would otherwise briefly look like it needed video for an instant.
  const isSolo = players.length <= 1;

  // Video chat spans the whole room lifetime (lobby through results) so players don't have to
  // re-grant camera/mic permission when the game starts — only torn down once there's no active room.
  // Passing null instead of roomId when solo means the hook never requests camera/mic access at all.
  const webrtc = useGameWebRTC(isSolo ? null : roomId, userId);

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

  /** The header's "← Back" button — leaves any joined room first (so the player doesn't linger in
   * the roster after their screen has already moved on to GameCenter), then always hands off to
   * GameCenter via onBack. */
  const handleBack = async () => {
    if (roomId) await handleLeave();
    onBack();
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
        isSolo={isSolo}
      />
    ) : null;

  return (
    <div className="game-root">
      <header className="game-header">
        <BackButton onClick={handleBack} ariaLabel="Back to Game Center" />
        <h2>📖 Bible Trivia</h2>
      </header>
      <div className="game-body">
        {loadError && <p className="games-error">{loadError}</p>}
        {!roomId || !room ? (
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

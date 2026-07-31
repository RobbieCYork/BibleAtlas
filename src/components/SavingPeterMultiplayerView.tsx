import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import SavingPeterMultiplayerPanel from "./SavingPeterMultiplayerPanel";
import GameLobby from "./GameLobby";
import SavingPeterRoundPlay from "./SavingPeterRoundPlay";
import SavingPeterMultiplayerResults from "./SavingPeterMultiplayerResults";
import GameVideoStrip from "./GameVideoStrip";
import BackButton from "./BackButton";
import { useGameWebRTC } from "../hooks/useGameWebRTC";
import {
  fetchSavingPeterRoom,
  fetchSavingPeterPlayers,
  startSavingPeterRoom,
  leaveSavingPeterRoom,
  kickSavingPeterPlayer,
  subscribeToSavingPeterRoom,
  type SavingPeterRoom,
  type SavingPeterPlayer,
} from "../lib/savingPeterMultiplayer";

const ACTIVE_ROOM_KEY = "bible-atlas-active-saving-peter-room";

interface SavingPeterMultiplayerViewProps {
  session: Session;
  onBack: () => void;
}

/** Saving Peter's multiplayer flow — up to 4 players, video chat, one shared word per round, only the
 * first correct guess scores. Mirrors BibleTriviaView.tsx's lobby -> active -> finished room lifecycle
 * one-for-one, just against the saving_peter_* tables/RPCs instead of game_*. */
export default function SavingPeterMultiplayerView({ session, onBack }: SavingPeterMultiplayerViewProps) {
  const userId = session.user.id;
  const [roomId, setRoomId] = useState<string | null>(() => sessionStorage.getItem(ACTIVE_ROOM_KEY));
  const [room, setRoom] = useState<SavingPeterRoom | null>(null);
  const [players, setPlayers] = useState<SavingPeterPlayer[]>([]);
  const [guessesVersion, setGuessesVersion] = useState(0);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const setActiveRoom = (id: string | null) => {
    setRoomId(id);
    if (id) sessionStorage.setItem(ACTIVE_ROOM_KEY, id);
    else sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  };

  const refetchRoom = () => {
    if (!roomId) return;
    fetchSavingPeterRoom(roomId)
      .then((r) => {
        if (!r) {
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
    fetchSavingPeterPlayers(roomId).then(setPlayers).catch(() => {});
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
    const unsubscribe = subscribeToSavingPeterRoom(roomId, {
      onRoomChange: refetchRoom,
      onPlayersChange: refetchPlayers,
      onGuessesChange: () => setGuessesVersion((v) => v + 1),
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const isSolo = players.length <= 1;
  const webrtc = useGameWebRTC(isSolo ? null : roomId, userId);

  const handleStart = async () => {
    if (!room) return;
    setStarting(true);
    try {
      await startSavingPeterRoom(room.id);
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
    returnToEntry();
    if (leavingRoomId) await leaveSavingPeterRoom(leavingRoomId).catch(() => {});
  };

  const handleBack = async () => {
    if (roomId) await handleLeave();
    onBack();
  };

  const handleKick = async (targetUserId: string) => {
    if (!roomId) return;
    try {
      await kickSavingPeterPlayer(roomId, targetUserId);
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
        <BackButton onClick={handleBack} ariaLabel="Back to solo/multiplayer picker" />
        <h2>🌊 Saving Peter — Multiplayer</h2>
      </header>
      <div className="game-body">
        {loadError && <p className="games-error">{loadError}</p>}
        {!roomId || !room ? (
          <SavingPeterMultiplayerPanel onRoomReady={setActiveRoom} />
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
            maxPlayers={4}
          />
        ) : room.status === "active" ? (
          <SavingPeterRoundPlay room={room} players={players} userId={userId} guessesVersion={guessesVersion} renderVideoStrip={renderVideoStrip} />
        ) : (
          <SavingPeterMultiplayerResults room={room} players={players} onPlayAgain={handleLeave} />
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import SavingPeterMultiplayerPanel from "./SavingPeterMultiplayerPanel";
import GameLobby from "./GameLobby";
import SavingPeterRoundPlay from "./SavingPeterRoundPlay";
import SavingPeterMultiplayerResults from "./SavingPeterMultiplayerResults";
import GameVideoStrip from "./GameVideoStrip";
import GameMediaChoice from "./GameMediaChoice";
import GameRemoteAudio from "./GameRemoteAudio";
import { GameMediaBar } from "./GameMediaControls";
import BackButton from "./BackButton";
import { useGameWebRTC } from "../hooks/useGameWebRTC";
import Icon from "./Icon";
import { useScrollTop } from "../lib/useScrollTop";
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

/** The room this tab is seated in. SavingPeterHub reads it to go straight back there. */
export const SAVING_PETER_ROOM_KEY = "bible-atlas-active-saving-peter-room";

interface SavingPeterMultiplayerViewProps {
  session: Session;
  /** Which step is behind a room: the create screen or the code entry. Null for a room being
   * rejoined, which has neither. */
  entry: "create" | "join" | null;
  /** Returns to Saving Peter's first screen. */
  onBack: () => void;
  /** False when Saving Peter's stage hides it from this viewer — see BibleTriviaView's prop of the
   * same name. A room already joined carries on; with no room, this hands back instead of offering
   * create / join. */
  available: boolean;
}

/** Saving Peter's multiplayer flow — up to 4 players, video chat, one shared word per round, only the
 * first correct guess scores. Mirrors BibleTriviaView.tsx's lobby -> active -> finished room lifecycle
 * one-for-one, just against the saving_peter_* tables/RPCs instead of game_*. */
export default function SavingPeterMultiplayerView({ session, entry, onBack, available }: SavingPeterMultiplayerViewProps) {
  const userId = session.user.id;
  const [roomId, setRoomId] = useState<string | null>(() => sessionStorage.getItem(SAVING_PETER_ROOM_KEY));
  const [room, setRoom] = useState<SavingPeterRoom | null>(null);
  const [players, setPlayers] = useState<SavingPeterPlayer[]>([]);
  const [guessesVersion, setGuessesVersion] = useState(0);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const bodyRef = useScrollTop(`${room?.id} ${room?.status} ${room?.current_round_index}`);

  const setActiveRoom = (id: string | null) => {
    setRoomId(id);
    if (id) sessionStorage.setItem(SAVING_PETER_ROOM_KEY, id);
    else sessionStorage.removeItem(SAVING_PETER_ROOM_KEY);
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

  useEffect(() => {
    if (!roomId && (!available || !entry)) onBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, entry, roomId]);

  // Any lobby, or a game with someone else in it — see BibleTriviaView's note on the same line.
  const isSolo = !room || (room.status !== "lobby" && players.length <= 1);
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

  /** The header's Back, one level at a time: out of a room to the step it came from, and from that
   * step to the first screen. */
  const handleBack = () => {
    // A room that failed to load is already showing the screen behind it, so Back also steps off it.
    const roomOnScreen = !!roomId && !(loadError && !room && entry);
    if (roomId) handleLeave();
    if (!roomOnScreen) onBack();
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
        media={webrtc}
        onLeave={handleLeave}
        onKick={handleKick}
        round={round}
        isSolo={isSolo}
      />
    ) : null;

  const inRoom = !!(roomId && room);
  const showEntry = !inRoom && available && !!entry && (!roomId || !!loadError);

  return (
    <div className="game-root" data-page-bg={showEntry ? "game-setup" : undefined}>
      <header className="game-header">
        <BackButton onClick={handleBack} ariaLabel="Back" />
        <h2 className="games-inline-icon">
          <Icon name="savingPeter" />
          Saving Peter — Multiplayer
        </h2>
      </header>
      <div ref={bodyRef} className={`game-body${inRoom ? ` game-in-room${room.status === "active" ? " sp-round" : ""}` : ""}`}>
        {loadError && <p className="games-error">{loadError}</p>}
        {!isSolo && <GameRemoteAudio streams={webrtc.remoteStreams} />}
        {!roomId || !room ? (
          showEntry && entry ? (
            <SavingPeterMultiplayerPanel entry={entry} onRoomReady={setActiveRoom} />
          ) : loadError ? null : (
            <p className="games-high-scores-empty">Loading…</p>
          )
        ) : room.status === "lobby" ? (
          <GameLobby
            room={room}
            players={players}
            userId={userId}
            onStart={handleStart}
            onLeave={handleLeave}
            onKick={handleKick}
            starting={starting}
            videoStrip={
              <>
                <GameMediaChoice media={webrtc} />
                {renderVideoStrip()}
              </>
            }
            maxPlayers={4}
          />
        ) : room.status === "active" ? (
          <SavingPeterRoundPlay room={room} players={players} userId={userId} guessesVersion={guessesVersion} renderVideoStrip={renderVideoStrip} />
        ) : (
          <>
            {!isSolo && <GameMediaBar media={webrtc} />}
            <SavingPeterMultiplayerResults room={room} players={players} onPlayAgain={handleLeave} />
          </>
        )}
      </div>
    </div>
  );
}

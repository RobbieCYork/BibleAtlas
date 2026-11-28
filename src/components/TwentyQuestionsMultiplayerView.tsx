import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import GameLobby from "./GameLobby";
import GameVideoStrip from "./GameVideoStrip";
import GameMediaChoice from "./GameMediaChoice";
import GameRemoteAudio from "./GameRemoteAudio";
import { GameMediaBar } from "./GameMediaControls";
import BackButton from "./BackButton";
import Icon from "./Icon";
import HowToPlay, { HowToPlayButton } from "./HowToPlay";
import { JoinByCode } from "./GameEntry";
import TwentyQuestionsRoomPlay, { TwentyQuestionsMultiplayerHelp } from "./TwentyQuestionsRoomPlay";
import { CHOICES, type Choice } from "../lib/twentyQuestionsText";
import { useGameWebRTC } from "../hooks/useGameWebRTC";
import { useScrollTop } from "../lib/useScrollTop";
import { useHowToPlay } from "../lib/howToPlay";
import type { OpenGameArticle } from "../lib/gameArticles";
import { TQ_SETS, type TQCategory } from "../data/twentyQuestions";
import {
  TWENTY_Q_MAX_PLAYERS,
  TWENTY_Q_ROOM_KEY,
  createTwentyQRoom,
  fetchTwentyQMoves,
  fetchTwentyQPlayers,
  fetchTwentyQRoom,
  joinTwentyQRoom,
  kickTwentyQPlayer,
  leaveTwentyQRoom,
  startTwentyQRoom,
  subscribeToTwentyQRoom,
  type TwentyQMove,
  type TwentyQPlayer,
  type TwentyQRoom,
} from "../lib/twentyQuestionsMultiplayer";
import "./TwentyQuestions.css";

interface TwentyQuestionsMultiplayerViewProps {
  session: Session;
  /** The step behind a room: the create screen or the code entry. Null for a room being rejoined. */
  entry: "create" | "join" | null;
  /** Returns to 20 Questions' first screen. */
  onBack: () => void;
  onOpenArticle?: OpenGameArticle;
  /** False when 20 Questions' stage hides it from this viewer — a room already joined carries on. */
  available: boolean;
}

function storeRoom(id: string | null) {
  try {
    if (id) sessionStorage.setItem(TWENTY_Q_ROOM_KEY, id);
    else sessionStorage.removeItem(TWENTY_Q_ROOM_KEY);
  } catch {
    /* Storage blocked — the room still works; a reload just won't come back to it. */
  }
}

function readStoredRoom(): string | null {
  try {
    return sessionStorage.getItem(TWENTY_Q_ROOM_KEY);
  } catch {
    return null;
  }
}

/** 20 Questions with friends — the room lifecycle (create or join → lobby → turns → reveal), mirroring
 * SavingPeterMultiplayerView one-for-one against the twenty_q_* tables of sql/057. */
export default function TwentyQuestionsMultiplayerView({ session, entry, onBack, onOpenArticle, available }: TwentyQuestionsMultiplayerViewProps) {
  const userId = session.user.id;
  const [roomId, setRoomId] = useState<string | null>(readStoredRoom);
  const [room, setRoom] = useState<TwentyQRoom | null>(null);
  const [players, setPlayers] = useState<TwentyQPlayer[]>([]);
  const [moves, setMoves] = useState<TwentyQMove[]>([]);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const help = useHowToPlay("twenty-questions-mp-howto-v1");
  const bodyRef = useScrollTop(`${room?.id} ${room?.status}`);

  const setActiveRoom = (id: string | null) => {
    setRoomId(id);
    storeRoom(id);
  };

  const refetchRoom = () => {
    if (!roomId) return;
    fetchTwentyQRoom(roomId)
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
    fetchTwentyQPlayers(roomId).then(setPlayers).catch(() => {});
  };
  const refetchMoves = () => {
    if (!roomId) return;
    fetchTwentyQMoves(roomId).then(setMoves).catch(() => {});
  };

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setPlayers([]);
      setMoves([]);
      return;
    }
    setLoadError(null);
    refetchRoom();
    refetchPlayers();
    refetchMoves();
    const unsubscribe = subscribeToTwentyQRoom(roomId, {
      onRoomChange: refetchRoom,
      onPlayersChange: refetchPlayers,
      onMovesChange: refetchMoves,
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // A move and the turn change land as two separate events; whenever the room moves on, read the
  // history again too, so nobody sees the next turn before the answer that caused it.
  useEffect(() => {
    if (room) refetchMoves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.turn_no, room?.status]);

  useEffect(() => {
    if (!roomId && (!available || !entry)) onBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, entry, roomId]);

  const isSolo = !room || (room.status !== "lobby" && players.length <= 1);
  const webrtc = useGameWebRTC(isSolo ? null : roomId, userId);

  const handleStart = async () => {
    if (!room) return;
    setStarting(true);
    try {
      await startTwentyQRoom(room.id);
      refetchRoom();
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
    setMoves([]);
  };

  const handleLeave = async () => {
    const leavingRoomId = roomId;
    returnToEntry();
    if (leavingRoomId) await leaveTwentyQRoom(leavingRoomId).catch(() => {});
  };

  const handleBack = () => {
    if (help.open && room) {
      help.close();
      return;
    }
    const roomOnScreen = !!roomId && !(loadError && !room && entry);
    if (roomId) handleLeave();
    if (!roomOnScreen) onBack();
  };

  const handleKick = async (targetUserId: string) => {
    if (!roomId) return;
    try {
      await kickTwentyQPlayer(roomId, targetUserId);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't remove that player.");
    }
  };

  // The video strip doubles as the scoreboard elsewhere; here each tile counts the questions that
  // player has asked.
  const tilePlayers = players.map((p) => ({ user_id: p.user_id, display_name: p.display_name, score: p.asked }));
  const renderVideoStrip = () =>
    room ? (
      <GameVideoStrip
        players={tilePlayers}
        userId={userId}
        hostId={room.host_id}
        media={webrtc}
        onLeave={handleLeave}
        onKick={handleKick}
        isSolo={isSolo}
      />
    ) : null;

  const inRoom = !!(roomId && room);
  const showEntry = !inRoom && available && !!entry && (!roomId || !!loadError);
  const showHelp = inRoom && room.status !== "finished" && help.open;

  return (
    <div className="game-root" data-page-bg={showEntry ? "game-setup" : undefined}>
      <header className={`game-header${inRoom ? " how-header" : ""}`}>
        <BackButton onClick={handleBack} ariaLabel="Back" />
        <h2 className="games-inline-icon">
          <Icon name="twentyQuestions" />
          20 Questions — Multiplayer
        </h2>
        {inRoom && room.status !== "finished" && !help.open && <HowToPlayButton onClick={help.show} />}
      </header>
      {!isSolo && <GameRemoteAudio streams={webrtc.remoteStreams} />}
      {showHelp ? (
        <HowToPlay firstTime={help.firstTime} onClose={help.close}>
          <TwentyQuestionsMultiplayerHelp />
        </HowToPlay>
      ) : (
        <div ref={bodyRef} className={`game-body${inRoom ? " game-in-room tq-body" : ""}`}>
          {loadError && <p className="games-error">{loadError}</p>}
          {!roomId || !room ? (
            showEntry && entry ? (
              <TwentyQuestionsMultiplayerPanel entry={entry} onRoomReady={setActiveRoom} />
            ) : loadError ? null : (
              <p className="games-high-scores-empty">Loading…</p>
            )
          ) : room.status === "lobby" ? (
            <>
              <p className="tq-lobby-category">
                Category: <strong>{TQ_SETS[room.category].label}</strong>
              </p>
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
                maxPlayers={TWENTY_Q_MAX_PLAYERS}
              />
            </>
          ) : (
            <>
              {room.status === "finished" && !isSolo && <GameMediaBar media={webrtc} />}
              <TwentyQuestionsRoomPlay
                room={room}
                players={players}
                moves={moves}
                userId={userId}
                renderVideoStrip={renderVideoStrip}
                onPlayAgain={handleLeave}
                onOpenArticle={onOpenArticle}
                onRoomChanged={setRoom}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The step after Create or Join on 20 Questions' first screen. Create is the category and one
 * button; Join is the code and nothing else. */
function TwentyQuestionsMultiplayerPanel({ entry, onRoomReady }: { entry: "create" | "join"; onRoomReady: (roomId: string) => void }) {
  const [choice, setChoice] = useState<Choice>("people");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const category: TQCategory = choice === "any" ? (["people", "places", "things"] as const)[Math.floor(Math.random() * 3)] : choice;
      const room = await createTwentyQRoom(category);
      onRoomReady(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create a game — try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const room = await joinTwentyQRoom(joinCode);
      onRoomReady(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join that game — check the code and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (entry === "join") return <JoinByCode code={joinCode} onCodeChange={setJoinCode} onJoin={handleJoin} busy={busy} error={error} />;

  return (
    <div className="tq-setup">
      <div className="games-panel-intro">
        <h2>Create multiplayer game</h2>
        <p>
          Up to {TWENTY_Q_MAX_PLAYERS} players take turns asking yes-or-no questions about one secret, chosen by the app. Twenty
          questions for the whole room; the first right guess wins.
        </p>
      </div>
      <form
        className="games-panel-card game-level-setup"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        <fieldset className="games-difficulty">
          <legend>Choose a category</legend>
          <div className="game-center-list">
            {CHOICES.map((c) => (
              <label key={c.key} className={`game-center-card game-level-option${choice === c.key ? " is-selected" : ""}`}>
                <input type="radio" name="tq-mp-category" value={c.key} checked={choice === c.key} onChange={() => setChoice(c.key)} />
                <span className="game-center-card-icon">
                  <Icon name={c.icon} />
                </span>
                <span className="game-center-card-body">
                  <span className="game-center-card-title">{c.label}</span>
                  <span className="game-center-card-tagline">{c.description}</span>
                </span>
                <span className="game-level-check" aria-hidden="true">
                  {choice === c.key && <Icon name="check" />}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="games-primary-button game-start-button" disabled={busy}>
          {busy ? "Creating…" : <><Icon name="players" inline /> Create game</>}
        </button>
        {error && <p className="games-error">{error}</p>}
      </form>
    </div>
  );
}

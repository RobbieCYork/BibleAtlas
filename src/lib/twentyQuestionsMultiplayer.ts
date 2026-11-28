import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { TQ_SETS, answerFor, type TQAnswer, type TQCategory } from "../data/twentyQuestions";

/* 20 Questions, multiplayer — the client side of sql/057_twenty_questions_multiplayer.sql.
 *
 * The secret is chosen by the database and kept in a table no client can read. This file never
 * learns it: it sends the category's whole answer table when a room is created (public data, the
 * same table the solo game answers from), then only question ids and guessed entry ids. Answers and
 * the verdict on a guess come back as rows in twenty_q_moves; the secret itself arrives only as
 * twenty_q_rooms.revealed_entry_id, once the game is over. */

export type TwentyQRoomStatus = "lobby" | "active" | "finished";

export interface TwentyQRoom {
  id: string;
  code: string;
  host_id: string;
  status: TwentyQRoomStatus;
  category: TQCategory;
  question_limit: number;
  questions_used: number;
  turn_user_id: string | null;
  turn_joined_at: string | null;
  turn_no: number;
  turn_started_at: string | null;
  turn_seconds: number;
  /** Set when the last question is used: every move after this seq is someone's one final guess. */
  final_from_seq: number | null;
  winner_id: string | null;
  /** Null until the game is over. */
  revealed_entry_id: string | null;
  created_at: string;
}

export interface TwentyQPlayer {
  room_id: string;
  user_id: string;
  display_name: string;
  /** Questions this player has asked. */
  asked: number;
  joined_at: string;
}

export type TwentyQMoveKind = "question" | "guess" | "pass" | "timeout";

export interface TwentyQMove {
  room_id: string;
  seq: number;
  user_id: string | null;
  display_name: string;
  kind: TwentyQMoveKind;
  /** Question id for a question, entry id for a guess. */
  item_id: string | null;
  answer: TQAnswer | null;
  created_at: string;
}

/** The room this tab is seated in. TwentyQuestionsHub reads it to go straight back there. */
export const TWENTY_Q_ROOM_KEY = "bible-atlas-active-twenty-questions-room";
export const TWENTY_Q_MAX_PLAYERS = 6;

/* ------------------------------------------------------------------ availability probe */

let enabled: boolean | null = null;
let enabledPromise: Promise<boolean> | null = null;

/** True once sql/057 is applied. Until then the rpc does not exist (PGRST202), and multiplayer is
 * simply not offered — 20 Questions opens on its solo screen as it always has. Asked once per page
 * load; any failure counts as "not available". */
export function twentyQMultiplayerEnabled(): Promise<boolean> {
  if (enabled !== null) return Promise.resolve(enabled);
  if (!enabledPromise) {
    enabledPromise = (async () => {
      try {
        const { data, error } = await supabase.rpc("twenty_q_multiplayer_enabled");
        enabled = !error && data === true;
      } catch {
        enabled = false;
      }
      return enabled;
    })();
  }
  return enabledPromise;
}

/** null while the first answer is on its way. */
export function useTwentyQMultiplayerEnabled(): boolean | null {
  const [value, setValue] = useState<boolean | null>(enabled);
  useEffect(() => {
    if (value !== null) return;
    let cancelled = false;
    twentyQMultiplayerEnabled().then((v) => {
      if (!cancelled) setValue(v);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);
  return value;
}

/* ------------------------------------------------------------------ rpcs */

/** The category's whole answer table, in the shape create_twenty_q_room() takes: every entry with the
 * questions answered Yes and Not stated for it (everything else is No — answerFor()). */
export function buildAnswerTable(category: TQCategory) {
  const set = TQ_SETS[category];
  const entries = set.entries.map((e) => {
    const yes: string[] = [];
    const unknown: string[] = [];
    for (const q of set.questions) {
      const a = answerFor(q, e.id);
      if (a === "yes") yes.push(q.id);
      else if (a === "unknown") unknown.push(q.id);
    }
    return { id: e.id, yes, unknown };
  });
  return { entries, questionIds: set.questions.map((q) => q.id) };
}

export async function createTwentyQRoom(category: TQCategory): Promise<TwentyQRoom> {
  const { entries, questionIds } = buildAnswerTable(category);
  const { data, error } = await supabase.rpc("create_twenty_q_room", {
    p_category: category,
    p_entries: entries,
    p_question_ids: questionIds,
  });
  if (error) throw error;
  return data as TwentyQRoom;
}

export async function joinTwentyQRoom(code: string): Promise<TwentyQRoom> {
  const { data, error } = await supabase.rpc("join_twenty_q_room", { p_code: code.trim() });
  if (error) throw error;
  return data as TwentyQRoom;
}

export async function startTwentyQRoom(roomId: string): Promise<TwentyQRoom> {
  const { data, error } = await supabase.rpc("start_twenty_q_room", { p_room_id: roomId });
  if (error) throw error;
  return data as TwentyQRoom;
}

export async function askTwentyQ(roomId: string, questionId: string): Promise<TwentyQRoom> {
  const { data, error } = await supabase.rpc("ask_twenty_q", { p_room_id: roomId, p_question_id: questionId });
  if (error) throw error;
  return data as TwentyQRoom;
}

export async function guessTwentyQ(roomId: string, entryId: string): Promise<TwentyQRoom> {
  const { data, error } = await supabase.rpc("guess_twenty_q", { p_room_id: roomId, p_entry_id: entryId });
  if (error) throw error;
  return data as TwentyQRoom;
}

/** Your own pass, or — once its time is up — anyone else's turn. `turnNo` is the turn you mean, so a
 * repeated or late call moves nothing. Throws "Turn still in progress" when called early. */
export async function passTwentyQTurn(roomId: string, turnNo: number): Promise<TwentyQRoom> {
  const { data, error } = await supabase.rpc("pass_twenty_q_turn", { p_room_id: roomId, p_turn_no: turnNo });
  if (error) throw error;
  return data as TwentyQRoom;
}

export async function leaveTwentyQRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_twenty_q_room", { p_room_id: roomId });
  if (error) throw error;
}

export async function kickTwentyQPlayer(roomId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("kick_twenty_q_player", { p_room_id: roomId, p_target_user_id: targetUserId });
  if (error) throw error;
}

export async function fetchTwentyQRoom(roomId: string): Promise<TwentyQRoom | null> {
  const { data, error } = await supabase.from("twenty_q_rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw error;
  return data as TwentyQRoom | null;
}

/** In turn order — the order they joined. */
export async function fetchTwentyQPlayers(roomId: string): Promise<TwentyQPlayer[]> {
  const { data, error } = await supabase
    .from("twenty_q_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true })
    .order("user_id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TwentyQPlayer[];
}

export async function fetchTwentyQMoves(roomId: string): Promise<TwentyQMove[]> {
  const { data, error } = await supabase.from("twenty_q_moves").select("*").eq("room_id", roomId).order("seq", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TwentyQMove[];
}

export function subscribeToTwentyQRoom(
  roomId: string,
  handlers: { onRoomChange?: () => void; onPlayersChange?: () => void; onMovesChange?: () => void }
) {
  const channel = supabase
    .channel(`twenty-q-room-db-${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "twenty_q_rooms", filter: `id=eq.${roomId}` }, () => {
      handlers.onRoomChange?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "twenty_q_players", filter: `room_id=eq.${roomId}` }, () => {
      handlers.onPlayersChange?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "twenty_q_moves", filter: `room_id=eq.${roomId}` }, () => {
      handlers.onMovesChange?.();
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

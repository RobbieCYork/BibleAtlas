import { supabase } from "./supabase";
import { buildQuestionSequence } from "../data/gameQuestions";

export type GameRoomStatus = "lobby" | "active" | "finished";

export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  status: GameRoomStatus;
  question_ids: string[];
  current_question_index: number;
  current_question_started_at: string | null;
  target_score: number;
  winner_id: string | null;
  created_at: string;
}

export interface GamePlayer {
  room_id: string;
  user_id: string;
  display_name: string;
  score: number;
  joined_at: string;
}

export interface GameBuzz {
  id: string;
  room_id: string;
  question_index: number;
  user_id: string;
  answer_index: number;
  buzzed_at: string;
}

export interface GameHighScore {
  id: string;
  user_id: string;
  display_name: string;
  score: number;
  room_id: string | null;
  achieved_at: string;
}

/** Postgres's unique_violation code — thrown by a submitBuzz() call that lost the race for a
 * question someone else already buzzed on. Not an error worth surfacing; the caller just learns
 * they were too slow. */
const UNIQUE_VIOLATION = "23505";

/** Creates a room, picks its question sequence up front (see buildQuestionSequence), and seats the
 * caller as host + first player — all atomically inside the create_game_room() RPC. */
export async function createGameRoom(targetScore = 50, questionCount = 24): Promise<GameRoom> {
  const questionIds = buildQuestionSequence(questionCount);
  const { data, error } = await supabase.rpc("create_game_room", {
    p_target_score: targetScore,
    p_question_ids: questionIds,
  });
  if (error) throw error;
  return data as GameRoom;
}

/** Looks a room up by its short code and seats the caller — throws if the code doesn't exist, the
 * game already started (and the caller wasn't already in it), or the room is full. */
export async function joinGameRoom(code: string): Promise<GameRoom> {
  const { data, error } = await supabase.rpc("join_game_room", { p_code: code.trim() });
  if (error) throw error;
  return data as GameRoom;
}

/** Host-only — moves a lobby into its first question. */
export async function startGameRoom(roomId: string): Promise<GameRoom> {
  const { data, error } = await supabase.rpc("start_game_room", { p_room_id: roomId });
  if (error) throw error;
  return data as GameRoom;
}

/** Records the caller's buzz-in for the current question. `error?.code === UNIQUE_VIOLATION` means
 * someone else's buzz already landed first for this question — not a real failure, just "too slow." */
export async function submitBuzz(
  roomId: string,
  questionIndex: number,
  userId: string,
  answerIndex: number
): Promise<{ wonBuzz: boolean }> {
  const { error } = await supabase
    .from("game_buzzes")
    .insert({ room_id: roomId, question_index: questionIndex, user_id: userId, answer_index: answerIndex });
  if (!error) return { wonBuzz: true };
  if (error.code === UNIQUE_VIOLATION) return { wonBuzz: false };
  throw error;
}

/** Called by the client that owns the winning buzz for a question — awards points if correct, checks
 * the win condition, and advances the room to the next question. Safe to call more than once (the
 * RPC no-ops if the room already moved past this question). */
export async function resolveQuestion(
  roomId: string,
  questionIndex: number,
  correct: boolean,
  points: number
): Promise<GameRoom> {
  const { data, error } = await supabase.rpc("resolve_question", {
    p_room_id: roomId,
    p_question_index: questionIndex,
    p_correct: correct,
    p_points: points,
  });
  if (error) throw error;
  return data as GameRoom;
}

/** Safety valve — any seated player can force a stuck question (buzz winner's tab vanished) past its
 * 20-second grace period without awarding points. */
export async function forceAdvance(roomId: string, questionIndex: number): Promise<GameRoom> {
  const { data, error } = await supabase.rpc("force_advance", { p_room_id: roomId, p_question_index: questionIndex });
  if (error) throw error;
  return data as GameRoom;
}

export async function fetchRoom(roomId: string): Promise<GameRoom | null> {
  const { data, error } = await supabase.from("game_rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw error;
  return data as GameRoom | null;
}

export async function fetchPlayers(roomId: string): Promise<GamePlayer[]> {
  const { data, error } = await supabase.from("game_players").select("*").eq("room_id", roomId).order("score", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GamePlayer[];
}

export async function fetchBuzzForQuestion(roomId: string, questionIndex: number): Promise<GameBuzz | null> {
  const { data, error } = await supabase
    .from("game_buzzes")
    .select("*")
    .eq("room_id", roomId)
    .eq("question_index", questionIndex)
    .maybeSingle();
  if (error) throw error;
  return data as GameBuzz | null;
}

export async function fetchTopHighScores(limit = 5): Promise<GameHighScore[]> {
  const { data, error } = await supabase.from("game_high_scores").select("*").order("score", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as GameHighScore[];
}

/** One realtime channel covering every table a room's UI needs to react to — players joining/scoring,
 * the room advancing to the next question or finishing, and buzzes landing. Mirrors the
 * one-effect-per-subscription, refetch-on-change pattern used throughout FriendsPanel/GroupsPanel. */
export function subscribeToRoom(
  roomId: string,
  handlers: { onRoomChange?: () => void; onPlayersChange?: () => void; onBuzzChange?: () => void }
) {
  const channel = supabase
    .channel(`game-room-db-${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` }, () => {
      handlers.onRoomChange?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `room_id=eq.${roomId}` }, () => {
      handlers.onPlayersChange?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "game_buzzes", filter: `room_id=eq.${roomId}` }, () => {
      handlers.onBuzzChange?.();
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

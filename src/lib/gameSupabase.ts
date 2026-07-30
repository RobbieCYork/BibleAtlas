import { supabase } from "./supabase";
import { buildQuestionSequence, type QuizTopicPreset } from "../data/gameQuestions";

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

/** Postgres's unique_violation code — thrown by a submitAnswer() call for a question this player
 * already answered (their own client should already have disabled the buttons after one tap; this is
 * just the server-side backstop). Not an error worth surfacing. */
const UNIQUE_VIOLATION = "23505";

/** Creates a room, picks its question sequence up front (see buildQuestionSequence — narrowed by
 * `preset` or `customQuery` if given), and seats the caller as host + first player — all atomically
 * inside the create_game_room() RPC. */
export async function createGameRoom(
  targetScore = 50,
  questionCount = 24,
  topic: { preset?: QuizTopicPreset; customQuery?: string } = {}
): Promise<GameRoom> {
  const questionIds = buildQuestionSequence(questionCount, topic);
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

/** Submits — and immediately scores — the caller's own answer to the current question. Every player
 * gets exactly one shot per question: wrong subtracts `points` (no floor — a player's total can go
 * negative), correct adds `points` — doubled if this was the first correct answer among everyone at
 * the table (decided server-side from answer-arrival order, not something this call controls or can
 * see coming; see submit_answer() in sql/005_everyone_answers.sql). Pass the question's plain,
 * unsigned point value as `points`. `alreadyAnswered: true` means this player already answered this
 * question (their own client should already have disabled the buttons after their first tap; this is
 * just the server-side backstop) — not a real failure. */
export async function submitAnswer(
  roomId: string,
  questionIndex: number,
  answerIndex: number,
  correct: boolean,
  points: number
): Promise<{ alreadyAnswered: false; player: GamePlayer } | { alreadyAnswered: true }> {
  const { data, error } = await supabase.rpc("submit_answer", {
    p_room_id: roomId,
    p_question_index: questionIndex,
    p_answer_index: answerIndex,
    p_correct: correct,
    p_points: points,
  });
  if (!error) return { alreadyAnswered: false, player: data as GamePlayer };
  if (error.code === UNIQUE_VIOLATION) return { alreadyAnswered: true };
  throw error;
}

/** Ends the current round (once its time window has elapsed, or everyone's answered) and advances to
 * the next question, or ends the game — see check_and_advance() in sql/005_everyone_answers.sql. Safe
 * to call redundantly from multiple clients; throws "Question still in progress" if called too early,
 * which callers should just swallow (it means someone else will/did call it once it's actually time). */
export async function checkAndAdvance(roomId: string, questionIndex: number): Promise<GameRoom> {
  const { data, error } = await supabase.rpc("check_and_advance", { p_room_id: roomId, p_question_index: questionIndex });
  if (error) throw error;
  return data as GameRoom;
}

/** Removes the caller from a room — safe to call from the lobby, mid-game, or after it's finished.
 * If that empties the room, the room itself is deleted; if the caller was host, the room hands
 * itself to the earliest-joined remaining player. See leave_game_room() in sql/005. */
export async function leaveGameRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_game_room", { p_room_id: roomId });
  if (error) throw error;
}

/** Host-only — removes another seated player from the room. */
export async function kickPlayer(roomId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("kick_player", { p_room_id: roomId, p_target_user_id: targetUserId });
  if (error) throw error;
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

/** Every player's answer (if any) to one question — unlike the old single-buzz-winner model, this is
 * now one row per player who's answered so far, not at most one row total. */
export async function fetchAnswersForQuestion(roomId: string, questionIndex: number): Promise<GameBuzz[]> {
  const { data, error } = await supabase
    .from("game_buzzes")
    .select("*")
    .eq("room_id", roomId)
    .eq("question_index", questionIndex);
  if (error) throw error;
  return (data ?? []) as GameBuzz[];
}

export async function fetchTopHighScores(limit = 5): Promise<GameHighScore[]> {
  const { data, error } = await supabase.from("game_high_scores").select("*").order("score", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as GameHighScore[];
}

/** One realtime channel covering every table a room's UI needs to react to — players joining/leaving/
 * scoring, the room advancing to the next question or finishing, and answers landing. Mirrors the
 * one-effect-per-subscription, refetch-on-change pattern used throughout FriendsPanel/GroupsPanel. */
export function subscribeToRoom(
  roomId: string,
  handlers: { onRoomChange?: () => void; onPlayersChange?: () => void; onAnswersChange?: () => void }
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
      handlers.onAnswersChange?.();
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

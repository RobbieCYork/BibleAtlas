import { supabase } from "./supabase";
import { buildSavingPeterRoundIds } from "../data/savingPeterWords";

export type SavingPeterRoomStatus = "lobby" | "active" | "finished";

export interface SavingPeterRoom {
  id: string;
  code: string;
  host_id: string;
  status: SavingPeterRoomStatus;
  round_ids: string[];
  current_round_index: number;
  current_round_started_at: string | null;
  target_score: number;
  winner_id: string | null;
  created_at: string;
}

export interface SavingPeterPlayer {
  room_id: string;
  user_id: string;
  display_name: string;
  score: number;
  joined_at: string;
}

export interface SavingPeterGuess {
  id: string;
  room_id: string;
  round_index: number;
  user_id: string;
  guess: string;
  correct: boolean;
  guessed_at: string;
}

export interface SavingPeterHighScore {
  id: string;
  user_id: string;
  display_name: string;
  score: number;
  room_id: string | null;
  achieved_at: string;
}

const UNIQUE_VIOLATION = "23505";

const ROUND_COUNT = 30;

export async function createSavingPeterRoom(targetScore = 50): Promise<SavingPeterRoom> {
  const roundIds = buildSavingPeterRoundIds(ROUND_COUNT);
  const { data, error } = await supabase.rpc("create_saving_peter_room", {
    p_target_score: targetScore,
    p_round_ids: roundIds,
  });
  if (error) throw error;
  return data as SavingPeterRoom;
}

export async function joinSavingPeterRoom(code: string): Promise<SavingPeterRoom> {
  const { data, error } = await supabase.rpc("join_saving_peter_room", { p_code: code.trim() });
  if (error) throw error;
  return data as SavingPeterRoom;
}

export async function startSavingPeterRoom(roomId: string): Promise<SavingPeterRoom> {
  const { data, error } = await supabase.rpc("start_saving_peter_room", { p_room_id: roomId });
  if (error) throw error;
  return data as SavingPeterRoom;
}

/** Submits — and immediately scores — the caller's own guess for the current round. Only the first
 * correct guess (decided server-side from guess-arrival order) scores +points; a correct guess that
 * lands after someone else already got it right scores 0; a wrong guess always costs -points. Pass the
 * round's plain point value (see SAVING_PETER_LEVEL_POINTS). `alreadyGuessed: true` means this player
 * already guessed this round — not a real failure, just the server-side backstop. */
export async function submitSavingPeterGuess(
  roomId: string,
  roundIndex: number,
  guess: string,
  correct: boolean,
  points: number
): Promise<{ alreadyGuessed: false; player: SavingPeterPlayer } | { alreadyGuessed: true }> {
  const { data, error } = await supabase.rpc("submit_saving_peter_guess", {
    p_room_id: roomId,
    p_round_index: roundIndex,
    p_guess: guess,
    p_correct: correct,
    p_points: points,
  });
  if (!error) return { alreadyGuessed: false, player: data as SavingPeterPlayer };
  if (error.code === UNIQUE_VIOLATION) return { alreadyGuessed: true };
  throw error;
}

export async function checkAndAdvanceSavingPeter(roomId: string, roundIndex: number): Promise<SavingPeterRoom> {
  const { data, error } = await supabase.rpc("check_and_advance_saving_peter", { p_room_id: roomId, p_round_index: roundIndex });
  if (error) throw error;
  return data as SavingPeterRoom;
}

export async function leaveSavingPeterRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_saving_peter_room", { p_room_id: roomId });
  if (error) throw error;
}

export async function kickSavingPeterPlayer(roomId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("kick_saving_peter_player", { p_room_id: roomId, p_target_user_id: targetUserId });
  if (error) throw error;
}

export async function fetchSavingPeterRoom(roomId: string): Promise<SavingPeterRoom | null> {
  const { data, error } = await supabase.from("saving_peter_rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw error;
  return data as SavingPeterRoom | null;
}

export async function fetchSavingPeterPlayers(roomId: string): Promise<SavingPeterPlayer[]> {
  const { data, error } = await supabase
    .from("saving_peter_players")
    .select("*")
    .eq("room_id", roomId)
    .order("score", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavingPeterPlayer[];
}

export async function fetchGuessesForRound(roomId: string, roundIndex: number): Promise<SavingPeterGuess[]> {
  const { data, error } = await supabase
    .from("saving_peter_guesses")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_index", roundIndex);
  if (error) throw error;
  return (data ?? []) as SavingPeterGuess[];
}

export async function fetchTopSavingPeterHighScores(limit = 5): Promise<SavingPeterHighScore[]> {
  const { data, error } = await supabase.from("saving_peter_high_scores").select("*").order("score", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as SavingPeterHighScore[];
}

export function subscribeToSavingPeterRoom(
  roomId: string,
  handlers: { onRoomChange?: () => void; onPlayersChange?: () => void; onGuessesChange?: () => void }
) {
  const channel = supabase
    .channel(`saving-peter-room-db-${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "saving_peter_rooms", filter: `id=eq.${roomId}` }, () => {
      handlers.onRoomChange?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "saving_peter_players", filter: `room_id=eq.${roomId}` }, () => {
      handlers.onPlayersChange?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "saving_peter_guesses", filter: `room_id=eq.${roomId}` }, () => {
      handlers.onGuessesChange?.();
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

import { createClient } from "@supabase/supabase-js";

const REMEMBER_ME_KEY = "bible-atlas-remember-me";

/** Whether the current login session should persist across browser restarts (localStorage) or only
 * for this tab session (sessionStorage) — set by the "Remember me" checkbox at login time. */
function getRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) !== "false";
}

/** Call before signing in/up so the session that Supabase is about to write lands in the right place. */
export function setRememberMe(remember: boolean) {
  localStorage.setItem(REMEMBER_ME_KEY, String(remember));
}

/** Routes Supabase's session storage to localStorage or sessionStorage per the "Remember me" choice,
 * instead of the SDK's default of always using localStorage. Clears any stale copy in the other store
 * so switching the preference doesn't leave a duplicate/expired session token behind. */
const rememberAwareStorage = {
  getItem: (key: string) => (getRememberMe() ? window.localStorage : window.sessionStorage).getItem(key),
  setItem: (key: string, value: string) => {
    const remember = getRememberMe();
    (remember ? window.localStorage : window.sessionStorage).setItem(key, value);
    (remember ? window.sessionStorage : window.localStorage).removeItem(key);
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { storage: rememberAwareStorage },
});

export interface ReadingProgress {
  book: string;
  chapter: number;
  translation: string;
}

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** start_verse === end_verse for a highlight entirely within one verse; a span across verses has
 * start_offset relative to start_verse's text and end_offset relative to end_verse's text — verses
 * strictly between the two are covered in full. */
export interface Highlight {
  id: string;
  book: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  translation: string;
  start_offset: number;
  end_offset: number;
  color: HighlightColor;
}

export interface Note {
  id: string;
  book: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  translation: string;
  quoted_text: string | null;
  /** Exact character offsets the quoted text was captured from (start_offset relative to start_verse's
   * text, end_offset relative to end_verse's text — same coordinate system as Highlight). Null for
   * notes saved before this was tracked, which can't be one-tap highlighted from My Notes. */
  quoted_start_offset: number | null;
  quoted_end_offset: number | null;
  note_text: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface VerseTag {
  id: string;
  book: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  translation: string;
  tag_id: string;
  created_at: string;
}

export interface ProfileLike {
  email: string;
  display_name: string | null;
}

/** Falls back to email for the small number of accounts that existed before display names did and
 * haven't logged in yet to set one (see DisplayNameGate) — display_name is otherwise required. */
export function displayFor(profile: ProfileLike): string {
  return profile.display_name ?? profile.email;
}

export interface Profile {
  id: string;
  email: string;
  /** Required for every account going forward — shown instead of raw email everywhere a friend's
   * identity appears. Nullable at the DB level only because accounts created before this existed
   * don't have one yet; the app prompts those users to set one on their next login. */
  display_name: string | null;
  /** Digits-only (no spaces/dashes/parens/plus) — normalized client-side before saving and before
   * searching, so lookups don't depend on how a phone number was typed. */
  phone: string | null;
  created_at: string;
}

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export type GroupRole = "owner" | "admin" | "member";

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export type GroupJoinRequestStatus = "pending" | "approved" | "declined";

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: GroupJoinRequestStatus;
  created_at: string;
  responded_at: string | null;
}

/** One row per group the caller is in — the return shape of the list_my_groups() RPC, which
 * pre-joins the last message and unread count server-side instead of N+1 client queries. */
export interface GroupSummary {
  group_id: string;
  name: string;
  description: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
  my_role: GroupRole;
}

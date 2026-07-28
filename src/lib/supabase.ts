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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: rememberAwareStorage },
});

// Kept in sync with the current session so flushReadingTimeReliably (below) can fire synchronously
// during page teardown, when there's no time to await supabase.auth.getSession().
let cachedAccessToken: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
});
supabase.auth.getSession().then(({ data }) => {
  cachedAccessToken = data.session?.access_token ?? null;
});

/** Reports reading-time seconds via a raw `fetch(..., { keepalive: true })` instead of the normal
 * supabase-js client — used only when the page might be unloading (tab closing, a hard reload, a PWA
 * update swapping in a new build) since an ordinary fetch can be silently cancelled mid-flight during
 * teardown, but a keepalive one is guaranteed to still be sent. Silently no-ops without a cached
 * token (e.g. auth hasn't finished loading yet) — losing a few seconds here is an acceptable tradeoff
 * for never throwing or blocking while the page is closing. */
export function flushReadingTimeReliably(seconds: number) {
  const whole = Math.round(seconds);
  if (whole <= 0 || !cachedAccessToken) return;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_reading_time`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${cachedAccessToken}`,
    },
    body: JSON.stringify({ p_seconds: whole }),
    keepalive: true,
  }).catch(() => {});
}

export interface ReadingProgress {
  book: string;
  chapter: number;
  translation: string;
}

/** One completed chapter, toggled from the "Mark chapter as read" control in the Bible panel.
 * Distinct from ReadingProgress above, which tracks only the single most-recent position, not history. */
export interface ChapterRead {
  user_id: string;
  book: string;
  chapter: number;
  read_at: string;
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
  /** When true, this note shows as a post on the owner's profile and friends can comment on it —
   * defaults to false so notes stay private unless the reader deliberately shares one. */
  is_public: boolean;
}

export interface NoteComment {
  id: string;
  note_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

/** A standalone saved document (unlike Note, not anchored to a specific verse) — one per sermon,
 * browsable as a list, each started fresh rather than appended to an ongoing one. */
export interface SermonNote {
  id: string;
  user_id: string;
  title: string;
  speaker: string | null;
  scripture_ref: string | null;
  body: string;
  created_at: string;
  updated_at: string;
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
  /** Public URL of an uploaded profile photo (avatars storage bucket) — null shows the initial-letter
   * avatar circle used everywhere else in the app. */
  avatar_url: string | null;
  church: string | null;
  /** Free text, not a structured verse reference — shown as-is on the profile, only parsed if the
   * viewer clicks it to jump to the Bible (best-effort; not every string a person types is a valid
   * "Book Chapter:Verse" the Bible panel can resolve). */
  favorite_verse: string | null;
  bio: string | null;
  /** How long a "mark chapter as read" checkmark sticks before it silently stops counting as read —
   * lets an account re-read the Bible on a yearly (or monthly) cycle without manually clearing last
   * cycle's marks. Enforced at query time (a cutoff on chapter_reads.read_at), not by deleting rows. */
  chapter_read_reset: "never" | "monthly" | "yearly";
}

/** ISO timestamp before which a chapter_reads row no longer counts as "read", per an account's
 * chapter_read_reset setting — null means no cutoff (marks never expire). Purely a query-time filter;
 * nothing deletes the underlying row, so switching back to "Never" instantly un-hides old marks. */
export function chapterReadCutoff(reset: Profile["chapter_read_reset"]): string | null {
  if (reset === "never") return null;
  const cutoff = new Date();
  if (reset === "monthly") cutoff.setMonth(cutoff.getMonth() - 1);
  else cutoff.setFullYear(cutoff.getFullYear() - 1);
  return cutoff.toISOString();
}

/** "March 2026" style — shown on a profile as "Joined {this}", from Profile.created_at. */
export function formatJoinDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });
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
  pinned: boolean;
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
  pinned: boolean;
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

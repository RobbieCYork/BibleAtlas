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

/** A standalone status update for "My Posts" — unlike Note, not anchored to any Bible passage, so
 * it can carry photos/video and tagged friends instead. See sql/008_posts.sql. */
export interface Post {
  id: string;
  user_id: string;
  body: string;
  image_urls: string[];
  video_url: string | null;
  tagged_user_ids: string[];
  is_public: boolean;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
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

/** "Jan 5, 2026" style — shown under every post (Newsfeed, My Posts, daily-verse responses) so a
 * reader can tell when something was written, not just what it says. */
export function formatPostDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** "42 sec" below a minute, "3 min" at or above one — so a reading session shorter than a minute still
 * shows real progress instead of floor-dividing to a flat, misleadingly-looking-broken "0 mins". */
export function formatReadingTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

/** One completed reading-plan day (see data/readingPlans.ts). PK is (user_id, plan_id, day_number),
 * so marking a day done twice is an upsert, not a duplicate. */
export interface ReadingPlanProgress {
  user_id: string;
  plan_id: string;
  day_number: number;
  completed_at: string;
}

/** localStorage mirror of plan progress — the only store for logged-out readers, and the silent
 * fallback when the reading_plan_progress table hasn't been created in this environment yet. */
const planProgressStorageKey = (planId: string) => `plan-progress:${planId}`;

export function readLocalPlanProgress(planId: string): number[] {
  try {
    const raw = localStorage.getItem(planProgressStorageKey(planId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((d): d is number => typeof d === "number") : [];
  } catch {
    return [];
  }
}

function writeLocalPlanProgress(planId: string, days: number[]) {
  try {
    localStorage.setItem(planProgressStorageKey(planId), JSON.stringify([...days].sort((a, b) => a - b)));
  } catch {
    // Storage full/blocked — losing a checkmark is not worth surfacing an error over.
  }
}

/** True when an error means the reading_plan_progress table doesn't exist in this database yet —
 * either Postgres's own undefined_table (42P01) or PostgREST's schema-cache miss (PGRST205 /
 * "Could not find the table..."). Those degrade silently to localStorage rather than surfacing. */
function isMissingPlanTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = error.message ?? "";
  return msg.includes("reading_plan_progress") && /does not exist|could not find|schema cache/i.test(msg);
}

/** Day numbers this user has completed for one plan — Supabase when logged in (falling back to the
 * localStorage mirror if the table is missing or the query fails), localStorage otherwise. */
export async function fetchPlanProgress(userId: string | null | undefined, planId: string): Promise<number[]> {
  if (!userId) return readLocalPlanProgress(planId);
  try {
    const { data, error } = await supabase
      .from("reading_plan_progress")
      .select("day_number")
      .eq("user_id", userId)
      .eq("plan_id", planId);
    if (error) {
      if (!isMissingPlanTableError(error)) console.error("Failed to load plan progress:", error.message);
      return readLocalPlanProgress(planId);
    }
    return ((data as { day_number: number }[] | null) ?? []).map((r) => r.day_number);
  } catch {
    return readLocalPlanProgress(planId);
  }
}

/** Marks/unmarks one plan day done. Always writes the localStorage mirror (guest store + warm
 * fallback), then best-effort syncs Supabase for logged-in users — a missing table is silently
 * tolerated, so this environment works before the migration lands. */
export async function setPlanDayDone(
  userId: string | null | undefined,
  planId: string,
  dayNumber: number,
  done: boolean
): Promise<void> {
  const local = readLocalPlanProgress(planId);
  writeLocalPlanProgress(planId, done ? [...new Set([...local, dayNumber])] : local.filter((d) => d !== dayNumber));
  if (!userId) return;
  try {
    if (done) {
      const { error } = await supabase
        .from("reading_plan_progress")
        .upsert(
          { user_id: userId, plan_id: planId, day_number: dayNumber, completed_at: new Date().toISOString() },
          { onConflict: "user_id,plan_id,day_number" }
        );
      if (error && !isMissingPlanTableError(error)) console.error("Failed to save plan progress:", error.message);
    } else {
      const { error } = await supabase
        .from("reading_plan_progress")
        .delete()
        .eq("user_id", userId)
        .eq("plan_id", planId)
        .eq("day_number", dayNumber);
      if (error && !isMissingPlanTableError(error)) console.error("Failed to remove plan progress:", error.message);
    }
  } catch {
    // Network hiccup — the localStorage mirror already holds the change.
  }
}

/** Best-effort one-way merge of any locally-tracked plan progress into Supabase on login, so days a
 * reader checked off before signing in aren't lost. ignoreDuplicates keeps the server's original
 * completed_at for days that were already synced. The local mirror is deliberately left in place. */
export async function mergeLocalPlanProgress(userId: string, planIds: string[]): Promise<void> {
  try {
    const now = new Date().toISOString();
    const rows = planIds.flatMap((planId) =>
      readLocalPlanProgress(planId).map((day) => ({
        user_id: userId,
        plan_id: planId,
        day_number: day,
        completed_at: now,
      }))
    );
    if (rows.length === 0) return;
    await supabase
      .from("reading_plan_progress")
      .upsert(rows, { onConflict: "user_id,plan_id,day_number", ignoreDuplicates: true });
  } catch {
    // Best-effort only — the local copy still exists, and the next login retries.
  }
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

/** A leader-authored, ordered walk through places tied to a passage series — the group-study
 * counterpart of the seasonal walks, except stops live in the database so each group curates its
 * own. Only the group's owner/admins can create or edit trips (enforced by RLS). */
export interface GroupStudyTrip {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  /** Optional link to a named study series — free-form text, not a foreign key. */
  series_id: string | null;
  created_at: string;
  updated_at: string;
}

/** One ordered stop on a study trip. location_id is a raw id from either static dataset
 * (locations OR pois, no prefix) — resolve against both, locations first, same as the seasonal
 * walk stops do. position is 1-based and unique within a trip. */
export interface GroupStudyTripStop {
  id: string;
  trip_id: string;
  position: number;
  location_id: string;
  label: string | null;
  /** e.g. "Acts 16:12" — plain text; only drives the "Read" button when it parses as a real reference. */
  scripture_ref: string | null;
  description: string | null;
  created_at: string;
}

/** A shared note under one stop — visible to the whole group; any member can add one
 * (edit/delete own; admins can delete any). */
export interface GroupStudyTripStopNote {
  id: string;
  stop_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** True when an error means the group study trip tables haven't been created in this database yet —
 * the migration is written but not applied, so the UI degrades to a quiet "coming soon" notice
 * instead of crashing or spamming errors. Same shape as isMissingPlanTableError above: Postgres's
 * undefined_table (42P01) or PostgREST's schema-cache miss (PGRST205 / "Could not find the table"). */
export function isMissingStudyTripTableError(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = error.message ?? "";
  return msg.includes("group_study_trip") && /does not exist|could not find|schema cache/i.test(msg);
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

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

/* ============================================================================
 * Feature release stages — Testing / Live (sql/039_feature_release.sql).
 *
 * THE ONE RULE, AND THE ONE PLACE IT LIVES
 * ----------------------------------------------------------------------------
 *     visible = live || (isOwner && testViewOn)
 *
 * `decide()` below is the only code in the app that answers "should this
 * feature's entry point be drawn?". Every gated tab, menu row and button asks
 * through useFeature(); nothing re-implements the rule at a call site, so the
 * Live view the owner sees cannot drift from what a normal reader sees.
 *
 * Two stages only. There is no "Off": a Testing feature is fully there for the
 * owner in Test view and simply absent for everybody else.
 *
 * WHAT THIS IS NOT
 * ----------------------------------------------------------------------------
 * Hiding happens in the app. The feature's own tables keep their existing RLS,
 * so a member who calls the REST API directly can still use a Testing feature's
 * data paths. Only account deletion is also refused server-side (the
 * delete-account Edge Function reads the same flag). The Admin Console's
 * Features tab says this in plain words.
 *
 * FAILURE MODES — chosen on purpose
 * ----------------------------------------------------------------------------
 *  - Flags fail to load (network, table missing because sql/039 is not applied
 *    yet): every feature is LIVE. Fail open. A flag service hiccup must never
 *    blank the site for real readers.
 *  - Owner check fails: NOT owner. Fail closed. That only ever means the owner
 *    temporarily sees exactly what everyone else sees.
 *  - Before the first load: the last flags this browser saw (localStorage), or
 *    all Live if there are none. Keeps a Testing feature from flashing into a
 *    returning reader's menu for the length of one request.
 * ========================================================================== */

export type FeatureKey =
  | "prayer_list"
  | "sermon_notes"
  | "posts_newsfeed"
  | "timeline"
  | "games_trivia"
  | "library_articles"
  | "account_deletion"
  | "avatars";

/** Display order and copy for the owner's Features list. `where` names the entry points that the
 * flag actually hides, so the owner knows what flipping it does — and what it does not. */
export const FEATURES: ReadonlyArray<{ key: FeatureKey; label: string; where: string }> = [
  { key: "prayer_list", label: "Prayer List", where: "The Prayer List tab in My Notes." },
  { key: "sermon_notes", label: "Sermon Notes", where: "The Sermon Notes tab in My Notes, and church outlines' “Take notes” button." },
  { key: "posts_newsfeed", label: "Posts & Newsfeed", where: "Newsfeed and My Posts on My Profile, and Posts on a friend's profile." },
  { key: "timeline", label: "Timeline", where: "Timeline in the menus and the mobile tab bar." },
  { key: "games_trivia", label: "Games & Trivia", where: "Games in the menus and the mobile tab bar." },
  {
    key: "library_articles",
    label: "Library & Articles",
    where:
      "Articles and Archaeology in the menus and the mobile tab bar. Links in Bible text and map pins still open an article. The public /library pages are static and are not affected.",
  },
  { key: "account_deletion", label: "Account deletion", where: "Delete Account on My Profile (also refused by the server once the Edge Function is redeployed)." },
  { key: "avatars", label: "Profile photos", where: "Change Photo when editing My Profile. Existing photos still display." },
];

const FEATURE_KEYS = FEATURES.map((f) => f.key);

type LiveMap = Record<FeatureKey, boolean>;

const ALL_LIVE: LiveMap = Object.fromEntries(FEATURE_KEYS.map((k) => [k, true])) as LiveMap;

interface FeatureState {
  live: LiveMap;
  updatedAt: Partial<Record<FeatureKey, string | null>>;
  /** True once a load has finished (successfully or not). */
  loaded: boolean;
  /** True when the last load failed and everything is being treated as Live. */
  loadFailed: boolean;
  /** From current_user_is_owner(). Only ever unlocks UI; set_feature_stage re-checks. */
  isOwner: boolean;
  /** The owner's Live/Test view preference. Stored for anyone, HONOURED only for the owner. */
  testViewPref: boolean;
}

const CACHE_KEY = "feature-release-cache-v1";
const TEST_VIEW_KEY = "feature-test-view-v1";

function readCachedLive(): LiveMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return ALL_LIVE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return ALL_LIVE;
    const next = { ...ALL_LIVE };
    for (const key of FEATURE_KEYS) {
      const v = (parsed as Record<string, unknown>)[key];
      if (typeof v === "boolean") next[key] = v;
    }
    return next;
  } catch {
    return ALL_LIVE;
  }
}

function writeCachedLive(live: LiveMap) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(live));
  } catch {
    /* Storage blocked or full — the flags still apply for this page load. */
  }
}

function readTestViewPref(): boolean {
  try {
    return localStorage.getItem(TEST_VIEW_KEY) === "1";
  } catch {
    return false;
  }
}

let state: FeatureState = {
  live: readCachedLive(),
  updatedAt: {},
  loaded: false,
  loadFailed: false,
  isOwner: false,
  testViewPref: readTestViewPref(),
};

const listeners = new Set<() => void>();

function setState(patch: Partial<FeatureState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

/* --------------------------------------------------------------------------
 * The decision
 * ------------------------------------------------------------------------ */

export interface FeatureVisibility {
  /** Draw this feature's entry point at all. */
  visible: boolean;
  /** The owner is seeing it ONLY because Test view is on — draw the orange Testing marker. */
  inTesting: boolean;
}

function decide(s: FeatureState, key: FeatureKey): FeatureVisibility {
  const live = s.live[key] !== false;
  const testView = s.isOwner && s.testViewPref;
  return { visible: live || testView, inTesting: !live && testView };
}

/** THE gate. Every entry point of the eight features asks this, and nothing else. */
export function useFeature(key: FeatureKey): FeatureVisibility {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return decide(s, key);
}

/* --------------------------------------------------------------------------
 * Owner controls — what the Admin Console's Features tab and the Test view strip read and drive.
 * None of this decides visibility; it only reports and changes the inputs to decide().
 * ------------------------------------------------------------------------ */

export interface FeatureAdminState {
  isOwner: boolean;
  /** Test view as it actually applies — always false for a non-owner, whatever is in storage. */
  testView: boolean;
  live: LiveMap;
  updatedAt: Partial<Record<FeatureKey, string | null>>;
  loaded: boolean;
  loadFailed: boolean;
}

export function useFeatureAdmin(): FeatureAdminState {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    isOwner: s.isOwner,
    testView: s.isOwner && s.testViewPref,
    live: s.live,
    updatedAt: s.updatedAt,
    loaded: s.loaded,
    loadFailed: s.loadFailed,
  };
}

export function setTestView(on: boolean) {
  try {
    localStorage.setItem(TEST_VIEW_KEY, on ? "1" : "0");
  } catch {
    /* Applies for this page load only. */
  }
  setState({ testViewPref: on });
}

/** Owner-only, audited server-side (feature_release_log). Throws with a readable message on refusal. */
export async function setFeatureStage(key: FeatureKey, live: boolean): Promise<void> {
  const { data, error } = await supabase.rpc("set_feature_stage", { p_feature: key, p_live: live });
  if (error) {
    if (error.code === "42501") throw new Error("Only the owner can change a feature's stage.");
    if (error.code === "PGRST202" || error.code === "42883")
      throw new Error("The feature-stage migration (sql/039) hasn't been applied to this database yet.");
    throw new Error(error.message);
  }
  const row = data as { feature?: string; live?: boolean; updated_at?: string | null } | null;
  const nextLive = typeof row?.live === "boolean" ? row.live : live;
  const next = { ...state.live, [key]: nextLive };
  writeCachedLive(next);
  setState({ live: next, updatedAt: { ...state.updatedAt, [key]: row?.updated_at ?? new Date().toISOString() } });
}

/* --------------------------------------------------------------------------
 * Loading — once at startup, plus an owner re-check whenever the signed-in account changes.
 * ------------------------------------------------------------------------ */

export async function loadFeatureFlags(): Promise<void> {
  try {
    const { data, error } = await supabase.from("feature_release").select("feature, live, updated_at");
    if (error) throw error;
    const next = { ...ALL_LIVE };
    const updatedAt: Partial<Record<FeatureKey, string | null>> = {};
    for (const row of (data ?? []) as { feature: string; live: boolean; updated_at: string | null }[]) {
      if ((FEATURE_KEYS as string[]).includes(row.feature) && typeof row.live === "boolean") {
        next[row.feature as FeatureKey] = row.live;
        updatedAt[row.feature as FeatureKey] = row.updated_at;
      }
    }
    writeCachedLive(next);
    setState({ live: next, updatedAt, loaded: true, loadFailed: false });
  } catch {
    // Fail OPEN. See the header.
    setState({ live: ALL_LIVE, loaded: true, loadFailed: true });
  }
}

async function refreshOwner(userId: string | null) {
  if (!userId) {
    setState({ isOwner: false });
    return;
  }
  try {
    const { data, error } = await supabase.rpc("current_user_is_owner");
    // Fail CLOSED. See the header.
    setState({ isOwner: !error && data === true });
  } catch {
    setState({ isOwner: false });
  }
}

let started = false;

/** Called once from main.tsx, before the first render. */
export function startFeatureRelease() {
  if (started) return;
  started = true;
  void loadFeatureFlags();
  let lastUserId: string | null | undefined;
  supabase.auth.onAuthStateChange((_event, session) => {
    const uid = session?.user.id ?? null;
    if (uid === lastUserId) return;
    lastUserId = uid;
    // Deferred out of the auth callback: supabase-js warns that awaiting another supabase call
    // inside onAuthStateChange can deadlock its auth lock.
    setTimeout(() => void refreshOwner(uid), 0);
  });
}

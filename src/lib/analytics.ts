import { supabase } from "./supabase";

/* ============================================================================
 * Lightweight, fire-and-forget usage analytics.
 *
 * WHAT THIS RECORDS — and what it deliberately does not.
 * ----------------------------------------------------------------------------
 * Event names and small fixed labels only. Never content: no note or message
 * bodies, no verse text, no search query strings, no post text, no reading
 * position. `props` values must come from a closed set the app itself chose (a
 * panel key, a game id, a plan id) — never anything a person typed. The server
 * enforces the same line with a size cap on the props column (see
 * sql/019_admin_and_analytics.sql), so a mistake here can't quietly turn this
 * into a log of what people are studying.
 *
 * HOW IT'S KEPT CHEAP
 * ----------------------------------------------------------------------------
 * `track()` is synchronous and does nothing but push onto an in-memory array —
 * it never awaits, never touches the network on the calling frame, and can be
 * called from a click handler without adding a millisecond to it. A single
 * timer drains the queue with one RPC (analytics_track) that both records the
 * batch and advances the session's last_seen_at. A heartbeat fires that same
 * RPC with an empty batch when nothing happened, which is what keeps
 * time-on-site accruing while someone reads.
 *
 * FAILURES ARE SILENT, ALWAYS. Every path is wrapped; a rejected RPC drops the
 * batch and moves on, and repeated failures disable the module for the rest of
 * the page's life (so a database without the migration applied, or an offline
 * phone, costs one failed request rather than a retry storm). Analytics must
 * never be the reason something in this app breaks.
 * ========================================================================== */

const SESSION_KEY = "capstone-analytics-session";
/** Drain the queue this often when it has anything in it. */
const FLUSH_MS = 15_000;
/** Touch the session this often while the tab is visible, even with an empty queue —
 * this is the sampling resolution of "time on site". */
const HEARTBEAT_MS = 60_000;
/** Cap the in-memory queue. If we somehow can't reach the server, we drop the
 * oldest rather than growing without bound. */
const MAX_QUEUE = 100;
/** After this many consecutive failures, give up for the rest of the page's life. */
const MAX_FAILURES = 3;

type Props = Record<string, string | number | boolean>;
interface Queued {
  e: string;
  p?: Props;
}

let queue: Queued[] = [];
let sessionId: string | null = null;
let failures = 0;
let disabled = false;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;
let lastTouch = 0;

/** One id per browser TAB, held in sessionStorage: a reload continues the same session
 * (which is what a reader experiences), a new tab starts a fresh one. Falls back to an
 * in-memory id if storage is blocked (private mode, embedded webviews) rather than
 * giving up on capture entirely. */
function getSessionId(): string | null {
  if (sessionId) return sessionId;
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      sessionId = existing;
      return sessionId;
    }
    const fresh = newUuid();
    sessionStorage.setItem(SESSION_KEY, fresh);
    sessionId = fresh;
    return sessionId;
  } catch {
    sessionId = sessionId ?? newUuid();
    return sessionId;
  }
}

function newUuid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // fall through to the manual construction below
  }
  // RFC-4122-shaped fallback for the handful of older webviews without randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** The one network call. Sends whatever is queued (possibly nothing — an empty batch is
 * a valid heartbeat) and never rejects to its caller. */
async function send(): Promise<void> {
  if (disabled || inFlight) return;
  const id = getSessionId();
  if (!id) return;

  const batch = queue;
  queue = [];
  inFlight = true;
  lastTouch = Date.now();
  try {
    const { error } = await supabase.rpc("analytics_track", { p_session_id: id, p_events: batch });
    if (error) throw new Error(error.message);
    failures = 0;
  } catch {
    // The batch is intentionally NOT requeued: a dropped event is worth far less
    // than the risk of an ever-growing retry backlog on a flaky connection.
    failures += 1;
    if (failures >= MAX_FAILURES) disabled = true;
  } finally {
    inFlight = false;
  }
}

/** Record one thing that happened. Cheap, synchronous, and safe to call from anywhere —
 * including a render path or an event handler. Never throws. */
export function track(event: string, props?: Props): void {
  if (disabled) return;
  try {
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push(props && Object.keys(props).length > 0 ? { e: event, p: props } : { e: event });
  } catch {
    // Nothing here should be able to throw, but analytics is never allowed to be
    // the thing that breaks a click.
  }
}

/** Start the session and the timers. Called once from App on mount. Idempotent. */
export function startAnalytics(): () => void {
  if (flushTimer) return () => {};
  getSessionId();
  track("app.open");
  // First flush is quick so a session that lasts ten seconds still registers at all.
  const initial = setTimeout(() => void send(), 3_000);

  flushTimer = setInterval(() => {
    if (queue.length > 0) void send();
  }, FLUSH_MS);

  heartbeatTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (Date.now() - lastTouch >= HEARTBEAT_MS - 1_000) void send();
  }, HEARTBEAT_MS);

  // Backgrounding a tab is the last reliable moment on mobile Safari to get a
  // final timestamp in. `beforeunload`/`pagehide` are deliberately not used —
  // they simply don't fire dependably on iOS, and a session's tail truncating at
  // its last heartbeat undercounts by well under a minute, which is the right
  // direction to be wrong in.
  const onVisibility = () => {
    if (document.visibilityState === "hidden") void send();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    clearTimeout(initial);
    if (flushTimer) clearInterval(flushTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    flushTimer = null;
    heartbeatTimer = null;
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** Signing in or out mid-session: flush what's queued so the events either side of the
 * boundary land with the right attribution, and let the server re-stamp the session's
 * user_id on the next touch. */
export function noteAuthChange(): void {
  void send();
}

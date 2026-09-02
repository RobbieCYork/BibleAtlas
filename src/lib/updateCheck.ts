/**
 * There's no service worker in this app, but it's installed as a standalone PWA on
 * phone home screens. iOS and Android keep that standalone web view's process alive
 * across app switches rather than doing a fresh page load each time it's foregrounded,
 * so a new deployment can otherwise go unnoticed until the OS decides to relaunch the
 * process (sometimes not until a second relaunch).
 *
 * This checks a small, always-uncached version.json and force-reloads if a newer build
 * is live. Two things drive the check:
 *
 *   1. Foreground events — visibilitychange/pageshow/focus, plus once shortly after
 *      startup. This is the case that matters most for the installed home-screen app.
 *   2. A 60-second poll *while the document is visible*. Without this, a tab (or a
 *      standalone app) that is left open and never backgrounded checks exactly once,
 *      at second 5, and never again — a deploy landing after that goes unnoticed until
 *      the user happens to switch away and come back. version.json is a few dozen
 *      bytes, so a minute-granularity poll is negligible on the wire; the poll is torn
 *      down entirely while hidden so a backgrounded phone never spends battery or
 *      radio on it.
 *
 * Repeated failures back off exponentially (60s → 2m → 4m → … capped at 15m) so a
 * flaky connection isn't hammered, and the interval snaps back to 60s on the first
 * success.
 *
 * Reloading is never done blind: see `isReloadRisky` below. A reload in the middle of
 * a half-typed note throws the text away silently, so when anything is at risk the
 * update is *deferred* behind an unobtrusive "A new version is available — Refresh"
 * pill, and applies itself once the risky state ends and the user has gone quiet. An
 * idle reader — the common case — still updates automatically with no prompt.
 */

const BASE_INTERVAL_MS = 60_000;
const MAX_INTERVAL_MS = 15 * 60_000;
/** How often we re-test whether a deferred reload has become safe. */
const RISK_RECHECK_MS = 2_000;
/** Quiet period required after the last keystroke/tap before a deferred reload fires. */
const IDLE_BEFORE_DEFERRED_RELOAD_MS = 5_000;

let started = false;
let checking = false;
let pollTimer: number | null = null;
let riskTimer: number | null = null;
/** Consecutive failed checks; drives the backoff. */
let failures = 0;
/** Set once a newer build has been seen — we stop polling and start trying to apply it. */
let updatePending = false;
let lastInteractionAt = 0;

/* ------------------------------------------------------------------ *
 * Reload safety
 * ------------------------------------------------------------------ */

type ReloadGuard = () => boolean;
const guards = new Set<ReloadGuard>();

/**
 * Opt-in escape hatch for components that know they're in a state a reload would ruin
 * but that the DOM heuristics below can't see (an in-flight save, a realtime turn).
 * Return true from the guard while a reload would be destructive.
 *
 *   useEffect(() => registerReloadGuard(() => hasUnsavedDraft), [hasUnsavedDraft]);
 */
export function registerReloadGuard(guard: ReloadGuard): () => void {
  guards.add(guard);
  return () => {
    guards.delete(guard);
  };
}

const TEXTY_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', '']);

/**
 * Live-play surfaces. Reloading mid-round drops the player out of a realtime
 * multiplayer game and throws away single-player progress, so these defer too.
 */
const IN_PLAY_SELECTORS = [
  '.game-room-play',
  '.game-question-card',
  '.saving-peter-guess-form',
  '.crossword-grid',
  '.fillblank-form',
  '.chronology-card-controls',
].join(',');

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Is there anything on screen a reload would destroy or badly interrupt?
 *
 * Deliberately DOM-driven rather than component-driven: the composers live across a
 * dozen files (several of which other work is in flight on), and every one of them
 * ultimately renders a <textarea> or a contentEditable. Reading the live DOM catches
 * all of them — the reader's verse-note composer and note editing in BiblePanel, the
 * shared InlineTextEditor used by MyNotesPanel and the feeds, the post/comment
 * composers in Newsfeed/PostsFeed/GroupsPanel/FriendsPanel, the sermon-note editor,
 * and the share card's editable ink — with no edits to any of them, and it keeps
 * working for composers that don't exist yet.
 */
function isReloadRisky(): boolean {
  for (const guard of guards) {
    try {
      if (guard()) return true;
    } catch {
      // A throwing guard must not be able to wedge updates off entirely.
    }
  }

  // Any visible textarea holding text. Covers every note/post/comment composer, and
  // the sermon-note editor (which autosaves on an 800ms debounce — so it is genuinely
  // at risk inside that window, and deferring until the user leaves the editor is the
  // right call regardless).
  for (const ta of Array.from(document.querySelectorAll('textarea'))) {
    if (ta.value.trim() && isVisible(ta)) return true;
  }

  // The share card modal's editable content area.
  for (const ce of Array.from(document.querySelectorAll('[contenteditable=""],[contenteditable="true"]'))) {
    if ((ce.textContent ?? '').trim() && isVisible(ce)) return true;
  }

  // A single-line field only counts while it's focused — a search box that still has
  // last query in it shouldn't hold updates off forever, but one being typed into now
  // should.
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && TEXTY_INPUT_TYPES.has(active.type) && active.value.trim()) {
    return true;
  }

  if (document.querySelector(IN_PLAY_SELECTORS)) return true;

  return false;
}

/* ------------------------------------------------------------------ *
 * The deferred-update pill
 * ------------------------------------------------------------------ */

let banner: HTMLElement | null = null;

function showBanner(): void {
  if (banner) return;
  banner = document.createElement('div');
  banner.className = 'update-pill';
  banner.setAttribute('role', 'status');

  const text = document.createElement('span');
  text.className = 'update-pill-text';
  text.textContent = 'A new version is available';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'update-pill-action';
  button.textContent = 'Refresh';
  button.addEventListener('click', () => window.location.reload());

  banner.append(text, button);
  document.body.appendChild(banner);
}

/* ------------------------------------------------------------------ *
 * Applying an update
 * ------------------------------------------------------------------ */

function applyUpdate(): void {
  if (!isReloadRisky()) {
    window.location.reload();
    return;
  }

  // Something would be lost. Say so, then wait: once the risky state is gone *and* the
  // user has been quiet for a moment, take the update ourselves. They can also just tap
  // Refresh. Either way nothing is thrown away and nothing happens mid-keystroke.
  showBanner();
  if (riskTimer !== null) return;
  riskTimer = window.setInterval(() => {
    if (isReloadRisky()) return;
    if (Date.now() - lastInteractionAt < IDLE_BEFORE_DEFERRED_RELOAD_MS) return;
    window.clearInterval(riskTimer!);
    riskTimer = null;
    window.location.reload();
  }, RISK_RECHECK_MS);
}

/* ------------------------------------------------------------------ *
 * Polling
 * ------------------------------------------------------------------ */

async function checkForUpdate(): Promise<void> {
  if (checking || updatePending) return;
  checking = true;
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      failures += 1;
      return;
    }
    const { buildId } = (await res.json()) as { buildId?: string };
    failures = 0;
    if (buildId && buildId !== __BUILD_ID__) {
      updatePending = true;
      stopPolling();
      applyUpdate();
    }
  } catch {
    // Offline or the request failed. Back off, and try again on the next tick or the
    // next time we're foregrounded.
    failures += 1;
  } finally {
    checking = false;
  }
}

function nextDelay(): number {
  if (failures === 0) return BASE_INTERVAL_MS;
  return Math.min(BASE_INTERVAL_MS * 2 ** failures, MAX_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
}

/** Re-arms the single poll timer. Chained timeouts (not an interval) so the backoff can
 * change between ticks, and so a slow check can never let ticks pile up. */
function schedulePoll(): void {
  stopPolling();
  if (updatePending || document.visibilityState !== 'visible') return;
  pollTimer = window.setTimeout(async () => {
    pollTimer = null;
    await checkForUpdate();
    schedulePoll();
  }, nextDelay());
}

async function checkAndReschedule(): Promise<void> {
  await checkForUpdate();
  schedulePoll();
}

export function startUpdateChecks(): void {
  // Idempotent: a second call must not stack a second set of timers/listeners.
  if (started) return;
  started = true;

  const noteInteraction = () => {
    lastInteractionAt = Date.now();
  };
  document.addEventListener('keydown', noteInteraction, { passive: true, capture: true });
  document.addEventListener('pointerdown', noteInteraction, { passive: true, capture: true });

  // Shortly after startup (covers the case where the tab/app was left open across a
  // deploy without ever being backgrounded).
  window.setTimeout(checkAndReschedule, 5000);

  // Whenever the app is brought back to the foreground — this is the case that matters
  // most for the installed home-screen app. Going hidden tears the poll down; coming
  // back checks immediately and restarts it.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkAndReschedule();
    } else {
      stopPolling();
    }
  });
  window.addEventListener('pageshow', () => void checkAndReschedule());
  window.addEventListener('focus', () => void checkAndReschedule());
}

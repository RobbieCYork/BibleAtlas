import type { TargetKind } from "./reportsApi";

/* ============================================================================
 * What a report captures about where the reporter was standing.
 *
 * This is the half of the feature that decides whether a report is actionable.
 * "Something's wrong in an article" is a message; "incorrect_info, target_kind
 * person, target_id 'paul', and the reader had *this exact sentence* selected"
 * is a fix. sql/025 spells the same thing out above the `reports` table.
 *
 * ── WHY THIS IS A MODULE SINGLETON AND NOT REACT STATE ──────────────────────
 * Two of the four things captured here — the reader's current chapter, and the
 * text they had selected — change constantly and are read exactly once, when the
 * report form opens. Holding either in App state would re-render the map, the
 * timeline and every panel on every chapter turn and every drag of a selection,
 * to serve a form that is not on screen. So they are plain module variables,
 * written imperatively by whoever owns them and read only at capture time.
 *
 * Everything that is CHEAP to derive from React state — which surface is on
 * screen, which article is open — stays in React state and arrives as the
 * `ReportSurface` argument to captureReportContext(). App already re-renders
 * when those change, so nothing is added by routing them through here.
 *
 * ── NOTHING IS CAPTURED THAT THE REPORTER IS NOT SHOWN ──────────────────────
 * Every field on CapturedContext is rendered back to the reporter in the form
 * before they send it, including the whole user-agent string. If you add a field
 * here, add it to the form's disclosure in the same commit. There is no
 * `app_context` payload for the same reason: an escape hatch nobody can see is
 * the exact shape of thing this rule exists to prevent.
 * ========================================================================== */

export interface ReportTarget {
  kind: TargetKind;
  id: string;
  label: string;
}

/** What App knows from its own render, handed to captureReportContext(). `route` is a synthetic
 * path — this app has no router and its URL never changes, so without one every report would be
 * filed against "/" and the `route` column would be dead weight. */
export interface ReportSurface {
  route: string;
  title: string;
  target: ReportTarget | null;
}

export interface CapturedContext {
  page_url: string;
  route: string;
  page_title: string;
  target_kind: TargetKind | null;
  target_id: string | null;
  target_label: string | null;
  selected_text: string | null;
  build_id: string | null;
  user_agent: string | null;
  viewport_w: number | null;
  viewport_h: number | null;
  platform: string | null;
}

/* --------------------------------------------------------------------------
 * The current chapter, published by BiblePanel
 * ------------------------------------------------------------------------ */

let activeScripture: { book: string; chapter: number } | null = null;

/** Called by BiblePanel whenever the chapter on screen changes (and with null when it unmounts or
 * shows something that isn't a chapter). Deliberately not a prop callback into App — see the
 * re-render note in the header. */
export function setActiveScripture(position: { book: string; chapter: number } | null) {
  activeScripture = position;
}

export function getActiveScripture(): { book: string; chapter: number } | null {
  return activeScripture;
}

/* --------------------------------------------------------------------------
 * The reporter's text selection
 * ------------------------------------------------------------------------ */

/** Longest selection sql/025 will store. Sliced here rather than left to the CHECK constraint, so
 * an over-long selection files a slightly-trimmed report instead of a 400. */
const MAX_SELECTED_TEXT = 4000;

/** How long a remembered selection stays offerable. The selection itself is destroyed the instant
 * the reporter clicks the account menu — that click lands outside it and every browser collapses
 * it — so reading `window.getSelection()` when the form opens returns nothing, every time. Hence
 * remembering the last one. The window is a staleness guard: something highlighted five minutes and
 * three screens ago is not what this report is about. It is also cleared outright whenever the
 * surface changes (see clearRememberedSelection), which covers the common case; this only covers
 * sitting on one screen for a long time. */
const SELECTION_TTL_MS = 2 * 60 * 1000;

let lastSelection: { text: string; at: number } | null = null;

function handleSelectionChange() {
  const text = window.getSelection()?.toString() ?? "";
  const trimmed = text.trim();
  // An empty selection is what a click produces, and a click is how the reporter reaches the form.
  // Treating it as "they selected nothing" would erase the selection they are reporting about, so
  // clearing is left to clearRememberedSelection() and the TTL above.
  if (trimmed.length === 0) return;
  lastSelection = { text: trimmed.slice(0, MAX_SELECTED_TEXT), at: Date.now() };
}

/** Installed once, from App's mount effect. Returns its own cleanup. */
export function installSelectionCapture(): () => void {
  document.addEventListener("selectionchange", handleSelectionChange);
  return () => document.removeEventListener("selectionchange", handleSelectionChange);
}

export function getRememberedSelection(): string | null {
  if (!lastSelection) return null;
  if (Date.now() - lastSelection.at > SELECTION_TTL_MS) return null;
  return lastSelection.text;
}

/** Called by App when the reader moves to a different surface, and by the form once a report is
 * filed. Text highlighted in an article is not context for a bug report about the Games screen. */
export function clearRememberedSelection() {
  lastSelection = null;
}

/* --------------------------------------------------------------------------
 * Capture
 * ------------------------------------------------------------------------ */

/** `navigator.platform` is deprecated and lies on iPadOS ("MacIntel"); userAgentData.platform is
 * the replacement but is Chromium-only and absent from TypeScript's DOM lib. Try the new one, fall
 * back to the old one, and accept null — this is a nice-to-have column, not a load-bearing one. */
function readPlatform(): string | null {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const value = nav.userAgentData?.platform || navigator.platform || "";
  return value ? value.slice(0, 120) : null;
}

/** The build the reporter is actually running, from the `__BUILD_ID__` that vite-plugin-build-id.ts
 * already defines and lib/updateCheck.ts already compares against — not a second mechanism. Guarded
 * because the define does not exist under `vitest`/SSR or any entry point Vite did not build. */
function readBuildId(): string | null {
  try {
    return typeof __BUILD_ID__ === "string" ? __BUILD_ID__.slice(0, 64) : null;
  } catch {
    return null;
  }
}

/** Assembles everything the form will show and then send. Pure apart from reading the browser —
 * every value here is rendered back to the reporter before anything is filed. */
export function captureReportContext(surface: ReportSurface): CapturedContext {
  const scripture = getActiveScripture();
  // The Bible panel is the one surface whose target App cannot derive from its own state: the
  // chapter lives inside BiblePanel. When App has not identified anything more specific and the
  // reader is in the reader, the chapter IS the subject of the report.
  const target: ReportTarget | null =
    surface.target ??
    (scripture && surface.route.startsWith("bible")
      ? {
          kind: "scripture",
          id: `${scripture.book} ${scripture.chapter}`,
          label: `${scripture.book} ${scripture.chapter}`,
        }
      : null);

  return {
    page_url: window.location.href.slice(0, 2048),
    route: surface.route.slice(0, 200),
    page_title: surface.title.slice(0, 300),
    target_kind: target?.kind ?? null,
    target_id: target ? target.id.slice(0, 200) : null,
    target_label: target ? target.label.slice(0, 300) : null,
    selected_text: getRememberedSelection(),
    build_id: readBuildId(),
    user_agent: navigator.userAgent ? navigator.userAgent.slice(0, 512) : null,
    // Rounded because a fractional device-pixel width fails the integer column, and clamped to the
    // CHECK's 0..20000 rather than letting a rotated tablet's odd reading 400 the insert.
    viewport_w: clampViewport(window.innerWidth),
    viewport_h: clampViewport(window.innerHeight),
    platform: readPlatform(),
  };
}

function clampViewport(value: number): number | null {
  if (!isFinite(value)) return null;
  return Math.min(20000, Math.max(0, Math.round(value)));
}

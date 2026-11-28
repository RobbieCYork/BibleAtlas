import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { timelineEvents } from "../data/timelineEvents";
import { bookWritingWindows } from "../data/bookWritingWindows";
import type { BookWritingWindow } from "../data/bookWritingWindows";
import { people } from "../data/people";
import type { Person, TimelineEvent, TimelineEventCategory } from "../data/types";
import TimelineLaneMenu, { TIMELINE_LANE_ORDER } from "./TimelineLaneMenu";
import TimelineGoToMenu from "./TimelineGoToMenu";
import type { TimelineLaneKey } from "./TimelineLaneMenu";
import BackButton from "./BackButton";
import {
  AXIS_H,
  EVENT_ROW_H,
  LANE_LABEL_RESERVE,
  LANE_LABEL_TOP,
  LIFE_BAR_H,
  LIFE_LABEL_INSIDE_PX,
  LIFE_ROW_H,
  LABEL_MAX_PX,
  PX_PER_YEAR,
  RANGE_LABEL_GAP_PX,
  ROW_PAD,
  TICK_YEARS,
  bandHeight,
  eventExtent,
  lifeExtent,
  packRows,
} from "./timelineLayout";
import "./TimelineView.css";

/* ============================================================================
 * TimelineView — the app's pannable historical timeline.
 *
 * Coordinate model: time is a signed year (negative = BC, positive = AD). There is
 * ONE horizontal scale (PX_PER_YEAR in timelineLayout.ts, a mark every five years)
 * and no zoom, so
 *     worldX = year * PX_PER_YEAR
 * The whole span is a few hundred thousand pixels wide, far wider than anything is
 * asked to paint: only the marks near the screen are in the DOM, positioned from an
 * `origin` that moves in CHUNK_PX steps, and the "scroller" surface is panned from
 * there with translateX. No element or transform ever gets large.
 *
 * Four timelines, top to bottom:
 *   1. Biblical and Church History — ONE continuous chronology carrying biblical events, church
 *                                 history and movements/revivals together, in gold leaf. Nothing
 *                                 inside it is drawn differently from anything else inside it:
 *                                 "they are all just a part of one timeline."
 *   2. Lifespans lane           — bars for Persons carrying bornYear (optional data), brand violet
 *   3. World History lane       — umber
 *   4. Other Religions lane     — verdigris
 *   5. Year axis
 *   (A Books-of-the-Bible band used to sit above all of these; it is disabled behind
 *    SHOW_BOOKS_LANE below, with its code and data intact.)
 *
 * Any of the lanes above the axis can be hidden via the "Lanes" button in the header
 * (TimelineLaneMenu) — the choice persists in localStorage. Hidden lanes are skipped entirely.
 * Each lane has ONE height: the rows it needs at its most crowded point anywhere across the whole
 * span (see `geom` below). It never changes with panning, searching or jumping, and there is no
 * control that changes it. The outer viewport (.tl-canvas-viewport) scrolls vertically whenever
 * the stack is taller than it is.
 *
 * Interactions: two-finger trackpad scroll / mouse wheel = move (vertical scrolls down the lanes,
 * horizontal moves along time; Shift + wheel also moves along time) · drag (mouse or touch) = pan,
 * with momentum on release · left/right arrow keys (canvas focused) = pan · "Go to" = pan to a year
 * or an era. Nothing zooms: pinch and Ctrl/⌘ + wheel are swallowed so that they do not zoom the
 * browser page either.
 * ========================================================================== */

/* ------------------------------------------------------------- data intake */

/** Lifespan fields are being added to Person by parallel work — treat them as
 * optional and possibly absent. A lifespan bar renders only when bornYear is set. */
export interface LifespanEntry {
  id: string;
  name: string;
  bornYear: number;
  diedYear?: number;
  lifespanLabel?: string;
  lifespanCertainty?: string;
}

type PersonMaybeLifespan = Person & {
  bornYear?: number;
  diedYear?: number;
  lifespanLabel?: string;
  lifespanCertainty?: string;
};

const DEFAULT_EVENTS: TimelineEvent[] = Array.isArray(timelineEvents) ? timelineEvents : [];

const BOOK_WINDOWS: BookWritingWindow[] = Array.isArray(bookWritingWindows)
  ? bookWritingWindows
  : [];

const DEFAULT_LIFESPANS: LifespanEntry[] = (Array.isArray(people) ? (people as PersonMaybeLifespan[]) : [])
  .filter((p) => typeof p.bornYear === "number")
  .map((p) => ({
    id: p.id,
    name: p.name,
    bornYear: p.bornYear as number,
    diedYear: p.diedYear,
    lifespanLabel: p.lifespanLabel,
    lifespanCertainty: p.lifespanCertainty,
  }));

/** Visual fallback length for a lifespan whose death year is unknown. */
const UNKNOWN_LIFESPAN_YEARS = 70;

function lifespanEnd(l: LifespanEntry): number {
  return typeof l.diedYear === "number" ? l.diedYear : l.bornYear + UNKNOWN_LIFESPAN_YEARS;
}

/* -------------------------------------------------------------- constants */

/** The shortest piece of a clipped bar that is ever drawn (see clipBar). */
const MIN_CLIP_PX = 12;

/** Cold-start view (no prior view, and the caller passed no `initialView`): this year in the middle
 * of the screen — the life of Jesus, about AD 26–36 on a phone and AD 15–47 on a laptop. */
const DEFAULT_VIEW_CENTER_YEAR = 31;
/** Empty years kept beyond the earliest and latest dated things, so that both can be brought to the
 * middle of an ordinary screen. */
const END_PAD_YEARS = 20;
/** Marks are rendered for the screen plus this much either side of it, and the render origin moves in
 * steps of CHUNK_PX, so panning rebuilds the marks about once per CHUNK_PX travelled. The margin must
 * stay wider than any title pill. */
const CHUNK_PX = 1024;
const RENDER_MARGIN_PX = 600;
/** A jump closer than this many screen widths glides; a longer one lands at once. */
const GLIDE_MAX_SCREENS = 3;
/** Where the start of an era, or of something wider than the screen, lands from the left edge. */
const JUMP_LEFT_MARGIN_PX = 40;
const NOTICE_MS = 6000;

/** Momentum/inertia panning tuning for pointer (mouse + touch) drag release.
 * Trackpad wheel-panning doesn't need this: the OS/browser already emits a
 * naturally decaying stream of wheel events during its own momentum phase. */
const MOMENTUM_MIN_VX = 0.05; // px/ms — below this, a released drag just stops (no glide)
const MOMENTUM_STOP_VX = 0.015; // px/ms — glide ends once decayed velocity drops below this
const MOMENTUM_FRICTION = 0.0028; // per-ms exponential decay rate (~250ms velocity half-life)
const MOMENTUM_MAX_VX = 3.5; // px/ms safety cap on captured fling speed

/** A scroll whose one axis is more than this many times the other is treated as purely that axis, so
 * the small sideways wobble of a downward trackpad scroll doesn't drift the timeline through time. */
const WHEEL_AXIS_LOCK_RATIO = 2;

/** ---------------------------------------------------------------- lane registry
 *
 * There are four timelines, and nothing below that level.
 *
 * The data has always been one array of events carrying a `category`, and this file used to draw
 * one horizontal band PER CATEGORY. That is exactly why the timeline read as several parallel
 * timelines stacked up rather than one: biblical history ran along one track and church history
 * along another, so nothing ever appeared "after" anything else across that seam.
 *
 * "Biblical and Church History" now carries the biblical, church and movement categories together
 * on ONE continuous chronology, packed by year against each other (see `eventPacks` below).
 * Crucially, category does NOT survive as a visual distinction inside that lane — every mark in it
 * is the same shape and the same colour, per the owner: the different types of event "are all just
 * a part of one timeline". `cats` below is purely a data filter saying which events belong to the
 * lane; `markCat` is the single category class every one of that lane's marks is drawn with.
 *
 * World History and Other Religions keep their own lanes and their own single mark colours —
 * they're context running alongside the story, not part of it.
 *
 * Lane order top-to-bottom: Biblical and Church History, Lifespans, World History, Other
 * Religions. The Lifespans band is injected between the first and second entries here (see
 * `geom`). Lane keys are also the visibility keys — see TIMELINE_LANE_ORDER in TimelineLaneMenu. */
const EVENT_LANES: {
  key: TimelineLaneKey;
  label: string;
  /** Which event categories feed this lane. A filter only — never a visual distinction. */
  cats: TimelineEventCategory[];
  /** The one category class every mark in this lane is drawn with, whatever its own category. */
  markCat: TimelineEventCategory;
}[] = [
  {
    key: "bible-church",
    label: "Biblical and Church History",
    cats: ["biblical", "church", "movement"],
    markCat: "biblical",
  },
  { key: "world", label: "World History", cats: ["world"], markCat: "world" },
  { key: "religion", label: "Other Religions", cats: ["religion"], markCat: "religion" },
];

/** The Books-of-the-Bible band (66 translucent writing-window bars along the top) is DISABLED at
 * the owner's request. Its data (src/data/bookWritingWindows.ts), its row-packing, its
 * `booksLayer` renderer, its CSS (.tl-book-bar*, .tl-band-books) and its entry in the lane
 * checklist are all deliberately left intact and working — flipping this single constant back to
 * `true` restores the lane exactly as it was, with no other change anywhere. */
const SHOW_BOOKS_LANE = false;

/* ------------------------------------------------------- lane visibility */

/** Per-row height for the Books-of-the-Bible band, the bar inside it, and the padding around it. */
const BOOK_ROW_H = 20;
const BOOK_BAR_H = 16;
/** A book bar wider than this carries its name inside itself. */
const BOOK_LABEL_INSIDE_PX = 58;

/** Bumped from the unsuffixed "timeline-visible-lanes" when the per-category checkboxes collapsed
 * into one switch per lane: the OLD records are keyed by category (biblical/church/movement/books)
 * and describe a lane set that no longer exists, so they cannot be read as-is. A returning user's
 * old value is migrated once (see below) and then retired. */
const LANE_VISIBILITY_STORAGE_KEY = "timeline-visible-lanes-v2";
const LEGACY_LANE_VISIBILITY_STORAGE_KEY = "timeline-visible-lanes";

const DEFAULT_VISIBLE_LANES: Record<TimelineLaneKey, boolean> = {
  books: true,
  "bible-church": true,
  lifespans: true,
  world: true,
  religion: true,
};

/** Reads a stored record defensively: unknown keys are ignored, non-boolean values are ignored,
 * and anything missing keeps its default of visible. Returns null when nothing usable was found,
 * so callers can tell "no preference" apart from "preference says hide everything". */
function readLaneRecord(
  raw: string | null,
  pick: (parsed: Record<string, unknown>, next: Record<TimelineLaneKey, boolean>) => void,
): Record<TimelineLaneKey, boolean> | null {
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const next = { ...DEFAULT_VISIBLE_LANES };
  pick(parsed as Record<string, unknown>, next);
  return next;
}

/** Same defensive localStorage-read pattern used elsewhere in the app (see readLocalPlanProgress
 * in lib/supabase.ts): anything corrupt, missing, or shaped unexpectedly falls back to "show
 * everything", which is also the behaviour for anyone who has never opened the menu.
 *
 * Two extra guards, because the stored shape genuinely changed under existing users:
 *  - A legacy record (keyed by category) is translated once: the merged lane is visible if ANY of
 *    the biblical / church / movement boxes was still checked, which preserves the only intent a
 *    user could have expressed about it. Lifespans / World / Other Religions carry over directly.
 *  - Whatever the source, a result that would leave EVERY lane hidden is discarded in favour of the
 *    defaults. A stale or hostile record must never be able to strand someone on a blank timeline
 *    (the lane menu would still be reachable, but there'd be nothing on screen explaining why). */
function loadVisibleLanes(): Record<TimelineLaneKey, boolean> {
  const anyVisible = (v: Record<TimelineLaneKey, boolean>) =>
    TIMELINE_LANE_ORDER.some((k) => v[k]);
  try {
    const current = readLaneRecord(
      localStorage.getItem(LANE_VISIBILITY_STORAGE_KEY),
      (parsed, next) => {
        for (const key of TIMELINE_LANE_ORDER) {
          if (typeof parsed[key] === "boolean") next[key] = parsed[key] as boolean;
        }
      },
    );
    if (current) return anyVisible(current) ? current : DEFAULT_VISIBLE_LANES;

    const legacy = readLaneRecord(
      localStorage.getItem(LEGACY_LANE_VISIBILITY_STORAGE_KEY),
      (parsed, next) => {
        const merged = (["biblical", "church", "movement"] as const).filter(
          (k) => typeof parsed[k] === "boolean",
        );
        if (merged.length > 0) next["bible-church"] = merged.some((k) => parsed[k] === true);
        for (const key of ["lifespans", "world", "religion", "books"] as const) {
          if (typeof parsed[key] === "boolean") next[key] = parsed[key] as boolean;
        }
      },
    );
    if (legacy) {
      const migrated = anyVisible(legacy) ? legacy : DEFAULT_VISIBLE_LANES;
      // Retire the old record so this translation runs exactly once per browser.
      try {
        localStorage.setItem(LANE_VISIBILITY_STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_LANE_VISIBILITY_STORAGE_KEY);
      } catch {
        // Storage full/blocked — the migration just re-runs next time, which is harmless.
      }
      return migrated;
    }
    return DEFAULT_VISIBLE_LANES;
  } catch {
    return DEFAULT_VISIBLE_LANES;
  }
}

/* ---------------------------------------------------------------- helpers */

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function formatYear(y: number): string {
  if (y === 0) return "1 BC / AD 1"; // the convention has no year 0 — 0 marks the era boundary
  return y < 0 ? `${-y} BC` : `AD ${y}`;
}

export function formatYearRange(a: number, b: number): string {
  if (a === b) return formatYear(a);
  if (a < 0 && b < 0) return `${-a}–${-b} BC`;
  if (a > 0 && b > 0) return `AD ${a}–${b}`;
  return `${formatYear(a)} – ${formatYear(b)}`;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/* ------------------------------------------------------------------ types */

export interface View {
  /** Year at the viewport's left edge. */
  startYear: number;
}

interface TooltipState {
  x: number;
  y: number;
  title: string;
  sub?: string;
  badge?: string;
}

export interface TimelineViewProps {
  onSelectTimelineEvent: (id: string) => void;
  onSelectPerson: (id: string) => void;
  /** Optional: navigate into the Bible reader when a book band is clicked. */
  onSelectBook?: (book: string) => void;
  onClose: () => void;
  /** When set, the view pans to this entity's associated events (primaryEntityIds match) and/or
   * lifespan bar, with a brief highlight — used by the "View in Timeline" link chooser. */
  focusEntityId?: string;
  /** Dataset overrides for tests/dev harnesses — default to the app's real data. */
  events?: TimelineEvent[];
  lifespans?: LifespanEntry[];
  /** Resume a previously-saved view instead of the cold-start default — used when the
   * caller (App) reopens Timeline mode after the reader followed a cross-link away from it (event,
   * person, or book) and then hit Back. When set, this is used for the FIRST view on mount only;
   * once mounted, further changes to this prop are ignored (the component owns `view` after that). */
  initialView?: View | null;
  /** Fired whenever the view changes (pan, animated jump, or the cold-start/resize clamp) — lets
   * the caller remember the live view so it can be restored later via `initialView`. */
  onViewChange?: (view: View) => void;
}

/* -------------------------------------------------------------- component */

export default function TimelineView({
  onSelectTimelineEvent,
  onSelectPerson,
  onSelectBook,
  onClose,
  focusEntityId,
  events = DEFAULT_EVENTS,
  lifespans = DEFAULT_LIFESPANS,
  initialView,
  onViewChange,
}: TimelineViewProps) {
  /* viewportRef: the outer, scrollable window (vertical scroll, whenever the checked lanes add up to
   * more than fits) — this is what's measured for the width. canvasRef: the inner gesture surface
   * (pointer handlers for horizontal panning; wheel and pinch blocking listen on rootRef), as tall
   * as the bands. */
  const rootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Seeded from `initialView` when the caller supplies one (resuming a saved view after a back-nav
  // round trip) — only consulted for this very first state value; the component owns `view` from
  // here on, so later changes to the `initialView` prop are never re-applied.
  const [view, setView] = useState<View | null>(initialView ?? null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [dragging, setDragging] = useState(false);

  /* ----- lane visibility (persisted) ----- */

  const [visibleLanes, setVisibleLanes] = useState<Record<TimelineLaneKey, boolean>>(loadVisibleLanes);

  useEffect(() => {
    try {
      localStorage.setItem(LANE_VISIBILITY_STORAGE_KEY, JSON.stringify(visibleLanes));
    } catch {
      // Storage full/blocked — losing the lane-visibility preference isn't worth surfacing an error.
    }
  }, [visibleLanes]);

  const toggleLane = useCallback((key: TimelineLaneKey) => {
    setVisibleLanes((v) => ({ ...v, [key]: !v[key] }));
  }, []);

  /* ----- world bounds (from whatever data is present) ----- */

  const { firstYear, lastYear } = useMemo(() => {
    const ys: number[] = [];
    for (const e of events) {
      ys.push(e.startYear);
      if (typeof e.endYear === "number") ys.push(e.endYear);
    }
    for (const w of BOOK_WINDOWS) {
      ys.push(w.startYear, w.endYear);
    }
    for (const l of lifespans) {
      ys.push(l.bornYear, lifespanEnd(l));
    }
    if (ys.length === 0) ys.push(-4000, 2100);
    return { firstYear: Math.min(...ys), lastYear: Math.max(...ys) };
  }, [events, lifespans]);
  const minYear = firstYear - END_PAD_YEARS;
  const maxYear = lastYear + END_PAD_YEARS;

  const viewRef = useRef<View | null>(null);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const clampView = useCallback(
    (startYear: number): View => {
      const spanYears = Math.max(sizeRef.current.w, 1) / PX_PER_YEAR;
      return { startYear: clamp(startYear, minYear, Math.max(maxYear - spanYears, minYear)) };
    },
    [minYear, maxYear],
  );

  /** The view with `year` in the middle of the screen. */
  const centeredOn = useCallback(
    (year: number): View => clampView(year - Math.max(sizeRef.current.w, 1) / (2 * PX_PER_YEAR)),
    [clampView],
  );

  /* ----- measure the canvas ----- */

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // First measurement → open on the cold-start view (or, if the caller passed an `initialView`,
  // `view` was already seeded with it at mount and viewRef.current is non-null here, so this never
  // overwrites a resumed view with the default).
  useEffect(() => {
    if (size.w > 0 && !viewRef.current) setView(centeredOn(DEFAULT_VIEW_CENTER_YEAR));
  }, [size.w, centeredOn]);

  // Let the caller (App) remember the live view as it changes, so it can hand it back in via
  // `initialView` after a round trip away from Timeline mode (event/person/book cross-link + Back).
  useEffect(() => {
    if (view) onViewChange?.(view);
  }, [view, onViewChange]);

  // Keep the view valid when the window resizes.
  useEffect(() => {
    if (size.w > 0 && viewRef.current) {
      const v = viewRef.current;
      setView(clampView(v.startYear));
    }
  }, [size.w, clampView]);

  /* ----- jumps: panning to somewhere else ----- */

  const animRef = useRef<number>(0);

  const cancelAnim = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
  }, []);

  // Momentum-glide cancellation lives here (ahead of panTo and the gesture handlers below)
  // so any of them can stop an in-flight glide the instant a new interaction starts.
  // (startMomentum itself is defined further down, next to the drag-release logic
  // that's its only caller, but shares this same ref.)
  const momentumRef = useRef(0);

  const cancelMomentum = useCallback(() => {
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = 0;
    }
  }, []);

  /** Pan so that `startYear` is at the left edge. Nearby places glide; far ones land at once, since
   * thousands of years streaming past in a third of a second tells the reader nothing. */
  const panTo = useCallback(
    (startYear: number) => {
      cancelAnim();
      cancelMomentum();
      // A marker can unmount mid-pan, so its mouseleave never fires — clear any lingering tooltip
      // up front rather than leaving it stuck on screen.
      setTooltip(null);
      const from = viewRef.current;
      if (!from) return;
      const to = clampView(startYear);
      const distance = Math.abs(to.startYear - from.startYear) * PX_PER_YEAR;
      if (distance > sizeRef.current.w * GLIDE_MAX_SCREENS || document.visibilityState === "hidden") {
        setView(to);
        return;
      }
      const t0 = performance.now();
      // 380ms sits in the natural range for this kind of UI motion — long enough to read as
      // smooth, short enough not to feel sluggish.
      const DURATION = 380;
      const step = (now: number) => {
        const p = clamp((now - t0) / DURATION, 0, 1);
        setView(clampView(from.startYear + (to.startYear - from.startYear) * easeOutCubic(p)));
        animRef.current = p < 1 ? requestAnimationFrame(step) : 0;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [cancelAnim, cancelMomentum, clampView],
  );

  useEffect(() => cancelAnim, [cancelAnim]);
  useEffect(() => cancelMomentum, [cancelMomentum]);

  /* ----- entity focus (opened via "View in Timeline") ----- */

  // Everything on the timeline belonging to the focused entity: its associated events
  // (primaryEntityIds match, or the event itself when a search result's own id is passed in as the
  // focus target — see TimelineSearchBar/App.tsx) and its lifespan bar, plus the year range they
  // collectively span.
  const focusInfo = useMemo(() => {
    if (!focusEntityId) return null;
    // A collapsed episode has no mark of its own on the canvas (see `canvasEvents`
    // below), so aiming AT one — "View in Timeline" on it, or picking it from the timeline search
    // box — is redirected to the spanning entry that stands in for it. Flying to "Public Ministry
    // of Jesus" after searching "Feeding of the Five Thousand" lands on the entry that contains it;
    // flying to the episode itself would land on blank canvas. The article overlay the caller opens
    // alongside this is still the episode's own (see App.handleSelectTimelineSearchResult).
    const direct = events.find((e) => e.id === focusEntityId);
    const targetId = direct?.collapsedInto ?? focusEntityId;
    const eventIds = new Set<string>();
    const ys: number[] = [];
    for (const e of events) {
      // Collapsed members are never drawn, so they must not contribute a highlight or stretch the
      // year range — that would aim at a span whose end marks don't exist on the canvas.
      if (e.collapsedInto) continue;
      if (e.id === targetId || e.primaryEntityIds?.includes(targetId)) {
        eventIds.add(e.id);
        ys.push(e.startYear);
        if (typeof e.endYear === "number") ys.push(e.endYear);
      }
    }
    const life = lifespans.find((l) => l.id === targetId);
    if (life) ys.push(life.bornYear, lifespanEnd(life));
    if (ys.length === 0) return null;
    return { lo: Math.min(...ys), hi: Math.max(...ys), eventIds, lifeId: life?.id ?? null };
  }, [focusEntityId, events, lifespans]);

  // Pulses the focused elements for a few seconds after the pan lands, then fades out.
  const [focusHighlightOn, setFocusHighlightOn] = useState(false);
  const focusAppliedRef = useRef(false);

  // Re-arm the one-shot guard whenever the focus target changes — picking "View in Timeline" for a
  // different entity while Timeline mode is already open must re-run the pan below, which the
  // guard (reset only on remount) would otherwise silently swallow.
  useEffect(() => {
    focusAppliedRef.current = false;
  }, [focusEntityId]);

  // The turn-off timer lives in its own effect: the pan effect (further down, next to the layout it
  // reads) re-runs on every view change, and a cleanup-cleared timeout there would never get
  // re-armed past the focusAppliedRef guard — leaving the pulse on forever.
  useEffect(() => {
    if (!focusHighlightOn) return;
    const t = setTimeout(() => setFocusHighlightOn(false), 5000);
    return () => clearTimeout(t);
  }, [focusHighlightOn]);

  const focusedEventIds = focusHighlightOn && focusInfo ? focusInfo.eventIds : null;
  const focusedLifeId = focusHighlightOn && focusInfo ? focusInfo.lifeId : null;

  /* ----- gestures: drag-pan and wheel scroll (rAF-batched); every zoom gesture swallowed ----- */

  const gestureRef = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    lastX: 0,
    moved: 0,
    suppressClick: false,
    captured: false,
    // Rolling buffer of recent (time, x) samples for the active single-pointer drag,
    // used to compute release velocity for momentum panning. Trimmed to a short window.
    velSamples: [] as { t: number; x: number }[],
  });
  const pendingRef = useRef({ dx: 0, panDx: 0 });
  const rafRef = useRef(0);

  const flushGesture = useCallback(() => {
    rafRef.current = 0;
    const v = viewRef.current;
    if (!v) return;
    const pending = pendingRef.current;
    // Any real pan moves the view out from under a hovered marker without a mouseleave
    // (drag-panning especially), so drop any stale tooltip right here.
    setTooltip(null);
    // dx is a pointer drag, which follows the finger 1:1; panDx is a trackpad swipe, which matches
    // the native `scrollLeft += deltaX` convention and so has the opposite sign.
    const startYear = v.startYear + (pending.panDx - pending.dx) / PX_PER_YEAR;
    pending.dx = 0;
    pending.panDx = 0;
    setView(clampView(startYear));
  }, [clampView]);

  const scheduleFlush = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flushGesture);
  }, [flushGesture]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ----- momentum/inertia panning (pointer + touch drag release) -----
   * momentumRef/cancelMomentum are declared earlier (with cancelAnim) so panTo
   * and the gesture handlers below can all cancel a glide the moment they start. */

  const startMomentum = useCallback(
    (initialVx: number) => {
      cancelMomentum();
      setTooltip(null);
      let vx = clamp(initialVx, -MOMENTUM_MAX_VX, MOMENTUM_MAX_VX);
      let lastT = performance.now();
      const step = (now: number) => {
        const dt = Math.min(Math.max(now - lastT, 0), 48); // clamp dt spikes (tab throttling, etc.)
        lastT = now;
        vx *= Math.exp(-MOMENTUM_FRICTION * dt);
        const v = viewRef.current;
        if (!v || Math.abs(vx) < MOMENTUM_STOP_VX) {
          momentumRef.current = 0;
          return;
        }
        // Same sign convention as pointer-drag: positive vx (finger/pointer moved right)
        // decreases startYear, so content keeps sliding the way the fling was headed.
        const desiredStart = v.startYear - (vx * dt) / PX_PER_YEAR;
        const clamped = clampView(desiredStart);
        setView(clamped);
        if (clamped.startYear !== desiredStart) {
          // Hit a world-bounds edge — stop rather than fake an elastic bounce.
          momentumRef.current = 0;
          return;
        }
        momentumRef.current = requestAnimationFrame(step);
      };
      momentumRef.current = requestAnimationFrame(step);
    },
    [cancelMomentum, clampView],
  );

  /* Wheel and pinch. These must be non-passive native listeners so preventDefault sticks. They sit
   * on the root rather than the canvas so that a pinch anywhere over the timeline (header included)
   * does nothing, instead of zooming the whole browser page.
   *
   *  - Ctrl or ⌘ held (browsers also report a trackpad pinch as a wheel event with ctrlKey set):
   *    swallowed. Nothing zooms.
   *  - Otherwise, over the lanes: move. Vertical scrolls .tl-canvas-viewport, horizontal pans
   *    through time. Both are applied by hand, with the default always prevented: letting the browser
   *    keep some events and not others lets a sideways swipe turn into back/forward navigation,
   *    and can scroll twice when a gesture changes direction part-way. Trackpad momentum arrives as
   *    ordinary wheel events, so it carries through.
   *  - Otherwise, over the header: left alone, so the Go to dropdown still scrolls.
   *
   * Safari's gesture* events and any two-finger touchmove are cancelled too: iOS ignores the
   * viewport tag's user-scalable=no, and .tl-root's touch-action is the first line of defence only. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Sub-pixel scroll distance not yet applied (scrollTop may round what it is given).
    let scrollRemainder = 0;

    const onWheel = (e: WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        return;
      }
      if (!viewport.contains(e.target as Node)) return;
      e.preventDefault();
      cancelAnim();
      cancelMomentum();
      // deltaMode: 0 = pixels, 1 = lines, 2 = pages.
      const scale = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? viewport.clientHeight : 1;
      let dx = e.deltaX * scale;
      let dy = e.deltaY * scale;

      // Shift + wheel is the mouse user's sideways scroll. Some browsers swap the axes themselves.
      if (e.shiftKey && dx === 0) {
        dx = dy;
        dy = 0;
      }
      if (Math.abs(dy) > Math.abs(dx) * WHEEL_AXIS_LOCK_RATIO) dx = 0;
      else if (Math.abs(dx) > Math.abs(dy) * WHEEL_AXIS_LOCK_RATIO) dy = 0;

      if (dy !== 0) {
        setTooltip(null);
        const want = viewport.scrollTop + dy + scrollRemainder;
        viewport.scrollTop = want;
        const rest = want - viewport.scrollTop;
        // A large leftover means the top or bottom was reached; don't bank it.
        scrollRemainder = Math.abs(rest) < 1 ? rest : 0;
      }
      if (dx !== 0) {
        pendingRef.current.panDx += dx;
        scheduleFlush();
      }
    };
    const block = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1 && e.cancelable) e.preventDefault();
    };

    const active = { passive: false };
    root.addEventListener("wheel", onWheel, active);
    root.addEventListener("gesturestart", block, active);
    root.addEventListener("gesturechange", block, active);
    root.addEventListener("gestureend", block, active);
    root.addEventListener("touchmove", onTouchMove, active);
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("gesturestart", block);
      root.removeEventListener("gesturechange", block);
      root.removeEventListener("gestureend", block);
      root.removeEventListener("touchmove", onTouchMove);
    };
  }, [cancelAnim, cancelMomentum, scheduleFlush]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      // NOTE: no setPointerCapture here — capturing on pointerdown would retarget
      // the subsequent `click` to the canvas and swallow marker clicks.
      // Capture starts lazily in onPointerMove once a real drag begins.
      g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelAnim();
      cancelMomentum();
      if (g.pointers.size === 1) {
        g.lastX = e.clientX;
        g.moved = 0;
        g.suppressClick = false;
        g.captured = false;
        g.velSamples = [{ t: performance.now(), x: e.clientX }];
        setDragging(true);
      } else {
        // A second finger is not a gesture here. Stop panning until one finger is left again, and
        // don't let the lift count as a tap or a fling.
        g.moved = Math.max(g.moved, 7);
        g.velSamples = [];
      }
    },
    [cancelAnim, cancelMomentum],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      if (!g.pointers.has(e.pointerId)) return;
      g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (g.pointers.size === 1) {
        const dx = e.clientX - g.lastX;
        g.lastX = e.clientX;
        g.moved += Math.abs(dx);
        // Once this is unambiguously a drag (past click slop), capture the
        // pointer so the pan keeps tracking outside the canvas. Doing it only
        // now keeps plain clicks routed to the markers/bars underneath.
        if (!g.captured && g.moved > 4) {
          canvasRef.current?.setPointerCapture(e.pointerId);
          g.captured = true;
        }
        pendingRef.current.dx += dx;
        // Track a short rolling window of (time, x) samples so release velocity
        // reflects the recent motion, not one noisy last-instant delta.
        const now = performance.now();
        g.velSamples.push({ t: now, x: e.clientX });
        const cutoff = now - 120;
        while (g.velSamples.length > 2 && g.velSamples[0].t < cutoff) g.velSamples.shift();
        scheduleFlush();
      }
    },
    [scheduleFlush],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      g.pointers.delete(e.pointerId);
      if (g.pointers.size === 1) {
        // Back to one finger: resume the pan from where that finger is now, without a jump.
        g.lastX = [...g.pointers.values()][0].x;
        g.velSamples = [{ t: performance.now(), x: g.lastX }];
      }
      if (g.pointers.size === 0) {
        setDragging(false);
        g.suppressClick = g.moved > 6;
        // A real drag (not a click) that was still moving when released gets a
        // decelerating glide, using velocity from the recent sample window.
        if (g.moved > 6 && g.velSamples.length >= 2) {
          const first = g.velSamples[0];
          const last = g.velSamples[g.velSamples.length - 1];
          const dt = last.t - first.t;
          if (dt > 4) {
            const vx = (last.x - first.x) / dt; // px per ms
            if (Math.abs(vx) > MOMENTUM_MIN_VX) startMomentum(vx);
          }
        }
        g.velSamples = [];
      }
    },
    [startMomentum],
  );

  // A real drag must not fire the click handler of whatever marker it ended on.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (gestureRef.current.suppressClick) {
      e.stopPropagation();
      e.preventDefault();
      gestureRef.current.suppressClick = false;
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const v = viewRef.current;
      if (!v || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      const panYears = (Math.max(sizeRef.current.w, 1) * 0.12) / PX_PER_YEAR;
      cancelAnim();
      cancelMomentum();
      setView(clampView(v.startYear + (e.key === "ArrowLeft" ? -panYears : panYears)));
      e.preventDefault();
    },
    [clampView, cancelAnim, cancelMomentum],
  );

  /* ----- "Go to": a year, or an era ----- */

  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  const currentCenterYear = useCallback(
    () => (viewRef.current?.startYear ?? 0) + sizeRef.current.w / (2 * PX_PER_YEAR),
    [],
  );

  const goToYear = useCallback(
    (year: number) => {
      const target = clamp(year, firstYear, lastYear);
      setNotice(
        year < firstYear
          ? `The timeline starts at ${formatYear(firstYear)}. Showing the earliest year.`
          : year > lastYear
            ? `The timeline ends at ${formatYear(lastYear)}. Showing the latest year.`
            : "",
      );
      panTo(centeredOn(target).startYear);
    },
    [firstYear, lastYear, panTo, centeredOn],
  );

  /** An era that fits on screen is centred. A longer one (almost all of them) starts just inside the
   * left edge, at its first event so that the screen never lands on empty years. */
  const goToEra = useCallback(
    (from: number, to: number) => {
      setNotice("");
      if ((to - from) * PX_PER_YEAR <= sizeRef.current.w) {
        panTo(centeredOn((from + to) / 2).startYear);
        return;
      }
      const starts = events
        .filter((e) => !e.collapsedInto && e.startYear >= from && e.startYear <= to)
        .map((e) => e.startYear);
      const first = starts.length > 0 ? Math.min(...starts) : from;
      panTo(first - JUMP_LEFT_MARGIN_PX / PX_PER_YEAR);
    },
    [events, panTo, centeredOn],
  );

  /* ----- tooltip plumbing ----- */

  const showTip = useCallback(
    (e: React.MouseEvent, title: string, sub?: string, badge?: string) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: clamp(e.clientX - rect.left, 12, Math.max(rect.width - 12, 12)),
        y: clamp(e.clientY - rect.top, 40, rect.height),
        title,
        sub,
        badge,
      });
    },
    [],
  );

  const hideTip = useCallback(() => setTooltip(null), []);

  /* ----- layout: which row everything is in, and how tall each band is ----- */

  // Hidden lanes skip their row-packing entirely.
  const showBooksLane = SHOW_BOOKS_LANE && visibleLanes.books;

  const bookPack = useMemo(
    () =>
      packRows(showBooksLane ? BOOK_WINDOWS : [], (w) => ({
        left: w.startYear * PX_PER_YEAR,
        right: w.endYear * PX_PER_YEAR + RENDER_MARGIN_PX / 4,
      })),
    [showBooksLane],
  );

  const lifePack = useMemo(
    () => packRows(visibleLanes.lifespans ? lifespans : [], (l) => lifeExtent(l.bornYear, lifespanEnd(l))),
    [visibleLanes.lifespans, lifespans],
  );

  /** ------------------------------------------------- collapsed detail groups
   *
   * DISPLAY ONLY. Some stretches of the story are made of many small episodes inside a very short
   * span — the Life of Christ era carries roughly a dozen parables, miracles and discourses inside
   * AD 27-30 — and drawing every one of them as its own mark buries the structural events around
   * them. An event may therefore name a wider "spanning" event in `collapsedInto` (see types.ts);
   * the canvas then draws the ONE spanning entry and NEVER its members. This is unconditional on
   * purpose: there is no "detail" mode.
   *
   * Nothing is removed from the dataset by any of this: `events` still holds every record, so the
   * tooltips, the article panel, Articles browse/search, the auto-linker and the games all continue
   * to see all of them — a collapsed episode is a full article that simply has no mark of its own on
   * the canvas. The one path that aims the canvas AT a specific event ("View in Timeline", or
   * picking a result from the timeline search box) is redirected to the spanning entry — see
   * `focusInfo` above — so it never aims at something undrawn. */
  const canvasEvents = useMemo(() => events.filter((e) => !e.collapsedInto), [events]);

  /** Row-packing for the event lanes, over the WHOLE span at once: each item's footprint is its
   * mark plus the widest title pill it can carry, so no two marks in a row can touch wherever the
   * reader pans to. It depends on the data and the lane switches only — never on the view. */
  const eventPacks = useMemo(() => {
    const map = new Map<TimelineLaneKey, ReturnType<typeof packRows<TimelineEvent, ReturnType<typeof eventExtent>>>>();
    for (const lane of EVENT_LANES) {
      // One switch per lane — an unchecked lane simply gets no entry in this map, which means
      // `geom` never allocates it a band.
      if (!visibleLanes[lane.key]) continue;
      map.set(
        lane.key,
        packRows(
          canvasEvents.filter((e) => lane.cats.includes(e.category)),
          (e) => eventExtent(e.startYear, e.endYear),
        ),
      );
    }
    return map;
  }, [canvasEvents, visibleLanes]);

  const geom = useMemo(() => {
    const showBooks = showBooksLane;
    const showLife = visibleLanes.lifespans && lifePack.rowCount > 0;
    const visibleEventLanes = EVENT_LANES.filter((lane) => eventPacks.has(lane.key));

    if (!showBooks && !showLife && visibleEventLanes.length === 0) {
      return { empty: true as const, sectionBottoms: [] as number[], totalH: 0 };
    }

    // Every lane's height is its rows PLUS the LANE_LABEL_RESERVE band its pinned name chip sits
    // in. The layers below all start their row maths at LANE_LABEL_RESERVE, so that band stays
    // empty at every pan offset instead of being drawn over by the lane's first row.
    const booksH = showBooks ? bandHeight(bookPack.rowCount, BOOK_ROW_H) : 0;
    const lifeH = showLife ? bandHeight(lifePack.rowCount, LIFE_ROW_H) : 0;

    // The bottom edge of every visible section — a year-axis row is repeated at each of these, so
    // scrolling to any section still shows its own date labels. Each section is followed by a
    // genuine AXIS_H-tall gap (not an overlay), so dates never sit on top of event content.
    const sectionBottoms: number[] = [];
    let cursor = 0;
    const place = (height: number) => {
      const top = cursor;
      sectionBottoms.push(top + height);
      cursor = top + height + AXIS_H;
      return top;
    };
    const booksTop = showBooks ? place(booksH) : 0;
    let lifeTop = 0;
    const laneTop = new Map<TimelineLaneKey, number>();
    const laneHeights = new Map<TimelineLaneKey, number>();
    const placeEventLane = (key: TimelineLaneKey) => {
      const height = bandHeight(eventPacks.get(key)!.rowCount, EVENT_ROW_H);
      laneTop.set(key, place(height));
      laneHeights.set(key, height);
    };

    // Owner-specified stacking: the merged Biblical and Church History lane first, then Lifespans
    // DIRECTLY beneath it (the people belong next to the events they lived through), then the
    // remaining context lanes.
    if (eventPacks.has("bible-church")) placeEventLane("bible-church");
    if (showLife) lifeTop = place(lifeH);
    for (const lane of visibleEventLanes) {
      if (!laneTop.has(lane.key)) placeEventLane(lane.key);
    }

    return {
      empty: false as const,
      booksTop,
      booksH,
      lifeTop,
      lifeH,
      laneTop,
      laneHeights,
      sectionBottoms,
      totalH: cursor,
    };
  }, [showBooksLane, bookPack.rowCount, lifePack.rowCount, visibleLanes, eventPacks]);

  /* ----- entity focus: pan to it ----- */

  // Once the first view exists, pan to the focused entity — applied exactly once per focus target
  // (the guard above), so it never fights later user pans.
  useEffect(() => {
    if (!focusInfo || focusAppliedRef.current || !view || size.w <= 0) return;
    focusAppliedRef.current = true;
    const widthPx = (focusInfo.hi - focusInfo.lo) * PX_PER_YEAR;
    // Something that fits on screen is centred; something wider shows where it begins.
    panTo(
      widthPx < size.w / 2
        ? centeredOn((focusInfo.lo + focusInfo.hi) / 2).startYear
        : focusInfo.lo - JUMP_LEFT_MARGIN_PX / PX_PER_YEAR,
    );
    setFocusHighlightOn(true);

    // Bands can be much taller than the window, so also scroll down to the mark if it is not
    // showing: the person's own lifespan bar, otherwise the earliest of the events.
    const viewport = viewportRef.current;
    if (!viewport || geom.empty) return;
    let rowTop: number | null = null;
    const life = lifePack.placed.find((p) => p.item.id === focusInfo.lifeId);
    if (life) {
      rowTop = geom.lifeTop + LANE_LABEL_RESERVE + ROW_PAD / 2 + life.row * LIFE_ROW_H;
    } else {
      for (const [key, pack] of eventPacks) {
        // packRows returns events earliest first.
        const hit = pack.placed.find((p) => focusInfo.eventIds.has(p.item.id));
        if (!hit) continue;
        rowTop = (geom.laneTop.get(key) as number) + LANE_LABEL_RESERVE + ROW_PAD / 2 + hit.row * EVENT_ROW_H;
        break;
      }
    }
    if (rowTop === null) return;
    const showing = rowTop >= viewport.scrollTop && rowTop + LIFE_ROW_H <= viewport.scrollTop + viewport.clientHeight;
    if (!showing) viewport.scrollTop = rowTop - viewport.clientHeight / 3;
  }, [focusInfo, view, size.w, panTo, centeredOn, geom, lifePack, eventPacks]);

  /* ----- world-space layers, memoized per render origin -----
   * Panning only changes translateX on the scroller. These element trees are reused untouched until
   * the screen has travelled CHUNK_PX, when they are rebuilt around a new origin. */

  const viewLeft = view ? view.startYear * PX_PER_YEAR : 0;
  const origin = Math.floor(viewLeft / CHUNK_PX) * CHUNK_PX;
  /** The stretch of the world (px from year zero) that is rendered. */
  const renderFrom = origin - RENDER_MARGIN_PX;
  const renderTo = origin + CHUNK_PX + size.w + RENDER_MARGIN_PX;
  const hasView = view !== null && size.w > 0;

  /** A bar cut to the rendered stretch, so that a nine-hundred-year lifetime is not a
   * 35,000px element. The cut ends are always off screen. */
  const clipBar = useCallback(
    (x: number, width: number) => {
      const end = x + width;
      const from = Math.max(x, Math.min(renderFrom, end - MIN_CLIP_PX));
      const to = Math.min(end, Math.max(renderTo, x + MIN_CLIP_PX));
      return { left: from - origin, width: Math.max(to - from, Math.min(width, MIN_CLIP_PX)) };
    },
    [origin, renderFrom, renderTo],
  );

  const booksLayer = useMemo<ReactNode>(() => {
    if (!hasView || geom.empty || geom.booksH <= 0) return null;
    const topPad = LANE_LABEL_RESERVE + ROW_PAD / 2;
    return bookPack.placed
      .filter((p) => p.extent.right > renderFrom && p.extent.left < renderTo)
      .map(({ item, row }) => {
        const x = item.startYear * PX_PER_YEAR;
        const w = Math.max((item.endYear - item.startYear) * PX_PER_YEAR, 3.5);
        const bar = clipBar(x, w);
        const range = formatYearRange(item.startYear, item.endYear);
        const inside = w > BOOK_LABEL_INSIDE_PX;
        return (
          <button
            key={item.book}
            type="button"
            className={`tl-book-bar${item.disputed ? " tl-book-disputed" : ""}`}
            style={{
              left: bar.left,
              top: geom.booksTop + topPad + row * BOOK_ROW_H,
              width: bar.width,
              height: BOOK_BAR_H,
            }}
            onClick={() => onSelectBook?.(item.book)}
            onMouseEnter={(e) =>
              showTip(e, item.book, `Written ${range}`, item.disputed ? "Dating disputed" : undefined)
            }
            onMouseLeave={hideTip}
            aria-label={`${item.book}, written ${range}`}
          >
            <span className={`tl-book-bar-label${inside ? "" : " tl-book-bar-label-outside"}`}>
              <span className="tl-event-label-name">{item.book}</span>
              <span className="tl-event-label-year">{range}</span>
            </span>
          </button>
        );
      });
  }, [hasView, geom, bookPack, renderFrom, renderTo, clipBar, onSelectBook, showTip, hideTip]);

  const lifespansLayer = useMemo<ReactNode>(() => {
    if (!hasView || geom.empty || geom.lifeH <= 0) return null;
    // Same reserved-label-band offset as the event lanes.
    const topPad = LANE_LABEL_RESERVE + ROW_PAD / 2;

    // How far an inside name may run past its own bar: to the next bar in the same row.
    const nextLeft = new Map<string, number>();
    const lastInRow = new Map<number, string>();
    for (const p of lifePack.placed) {
      const previous = lastInRow.get(p.row);
      if (previous) nextLeft.set(previous, p.extent.left);
      lastInRow.set(p.row, p.item.id);
    }

    return lifePack.placed
      .filter((p) => p.extent.right > renderFrom && p.extent.left < renderTo)
      .map(({ item, row, extent }) => {
        const bar = clipBar(extent.left, extent.barW);
        const label =
          item.lifespanLabel ??
          (typeof item.diedYear === "number"
            ? formatYearRange(item.bornYear, item.diedYear)
            : `b. ${formatYear(item.bornYear)}`);
        const inside = extent.barW > LIFE_LABEL_INSIDE_PX;
        const next = nextLeft.get(item.id);
        const room =
          next === undefined ? bar.width + 1000 : Math.max(next - origin - bar.left - 4, bar.width);

        return (
          <button
            key={item.id}
            type="button"
            className={`tl-life-bar${item.id === focusedLifeId ? " tl-focused" : ""}`}
            // --x, --w and --room let an inside name follow the screen's left edge (.tl-life-label).
            style={
              {
                left: bar.left,
                top: geom.lifeTop + topPad + row * LIFE_ROW_H + (LIFE_ROW_H - LIFE_BAR_H) / 2,
                width: bar.width,
                height: LIFE_BAR_H,
                "--x": bar.left,
                "--w": bar.width,
                "--room": room,
              } as CSSProperties
            }
            onClick={() => onSelectPerson(item.id)}
            onMouseEnter={(e) => showTip(e, item.name, label, item.lifespanCertainty)}
            onMouseLeave={hideTip}
            aria-label={`${item.name}, ${label}`}
          >
            <span className={`tl-life-label${inside ? "" : " tl-life-label-outside"}`}>
              <span className="tl-event-label-name">{item.name}</span>
              <span className="tl-event-label-year">{label}</span>
            </span>
          </button>
        );
      });
  }, [hasView, geom, lifePack, origin, renderFrom, renderTo, clipBar, onSelectPerson, showTip, hideTip, focusedLifeId]);

  const eventsLayer = useMemo<ReactNode>(() => {
    if (!hasView || geom.empty) return null;

    const nodes: ReactNode[] = [];

    // Two-line title+year chip shared by markers and range bars, so the date is on screen without a
    // click, not only in the hover tooltip.
    const labelLines = (title: string, year: string) => (
      <>
        <span className="tl-event-label-name">{title}</span>
        <span className="tl-event-label-year">{year}</span>
      </>
    );

    for (const lane of EVENT_LANES) {
      const laneTop = geom.laneTop.get(lane.key);
      const pack = eventPacks.get(lane.key);
      if (laneTop === undefined || !pack) continue;
      // Every mark in a lane is drawn identically, from the LANE's single mark category — never
      // from the event's own. Inside "Biblical and Church History" a biblical event, a church
      // event and a movement event are the same gold disc, because they are all just part of one
      // timeline; the only thing that separates two marks there is where they fall in time.
      const markClass = `tl-cat-${lane.markCat}`;
      // The lane's reserved label band comes off the top before rows start.
      const topPad = LANE_LABEL_RESERVE + ROW_PAD / 2;

      for (const { item: e, row, extent } of pack.placed) {
        if (extent.right <= renderFrom || extent.left >= renderTo) continue;
        const x = e.startYear * PX_PER_YEAR;
        const y = laneTop + topPad + row * EVENT_ROW_H + EVENT_ROW_H / 2;
        const focused = focusedEventIds?.has(e.id) ? " tl-focused" : "";

        if (extent.barW !== null) {
          const bar = clipBar(x, extent.barW);
          // Can the whole bar and its title be on screen together? That decides which edge of the
          // screen the title holds to while part of the bar is off it (.tl-range-bar-label).
          const fits = extent.barW + RANGE_LABEL_GAP_PX + LABEL_MAX_PX <= size.w;
          nodes.push(
            <button
              key={e.id}
              type="button"
              className={`tl-range-bar ${fits ? "tl-range-short" : "tl-range-long"} ${markClass}${focused}`}
              // The fade belongs to the whole span, not to the piece of it that is rendered. --x is
              // where that piece starts; --start and --rest are the first and last places the title
              // may be: the start of the span, and just past its end.
              style={
                {
                  left: bar.left,
                  top: y,
                  width: bar.width,
                  backgroundSize: `${extent.barW}px 100%`,
                  backgroundPosition: `${x - origin - bar.left}px 0`,
                  "--x": bar.left,
                  "--start": x - origin,
                  "--rest": x - origin + extent.barW + RANGE_LABEL_GAP_PX,
                } as CSSProperties
              }
              onClick={() => onSelectTimelineEvent(e.id)}
              onMouseEnter={(ev) => showTip(ev, e.title, e.dateLabel, e.era)}
              onMouseLeave={hideTip}
              aria-label={`${e.title}, ${e.dateLabel}`}
            >
              <span className="tl-range-bar-label">
                {labelLines(e.title, formatYearRange(e.startYear, e.endYear!))}
              </span>
            </button>,
          );
        } else {
          nodes.push(
            <button
              key={e.id}
              type="button"
              className={`tl-marker ${markClass}${focused}`}
              style={{ left: x - origin, top: y }}
              onClick={() => onSelectTimelineEvent(e.id)}
              onMouseEnter={(ev) => showTip(ev, e.title, e.dateLabel, e.era)}
              onMouseLeave={hideTip}
              aria-label={`${e.title}, ${e.dateLabel}`}
            >
              <span className="tl-marker-title">{labelLines(e.title, formatYear(e.startYear))}</span>
            </button>,
          );
        }
      }
    }
    return nodes;
  }, [
    hasView,
    geom,
    eventPacks,
    origin,
    renderFrom,
    renderTo,
    clipBar,
    size.w,
    onSelectTimelineEvent,
    showTip,
    hideTip,
    focusedEventIds,
  ]);

  /* ----- axis ticks: every five years across the rendered stretch ----- */

  const ticks = useMemo(() => {
    if (!hasView) return [];
    const step = TICK_YEARS * PX_PER_YEAR;
    const out: number[] = [];
    for (let i = Math.ceil(renderFrom / step); i * step <= renderTo; i++) out.push(i * TICK_YEARS);
    return out;
  }, [hasView, renderFrom, renderTo]);

  /* ----- render ----- */

  const translateX = origin - viewLeft;
  const visibleFrom = view ? Math.round(view.startYear) : 0;
  const visibleTo = view ? Math.round(view.startYear + size.w / PX_PER_YEAR) : 0;
  const hasLifespans = !geom.empty && geom.lifeH > 0;

  return (
    <section ref={rootRef} className="tl-root" aria-label="Historical timeline">
      <header className="tl-header">
        <BackButton onClick={onClose} ariaLabel="Close timeline" />
        <div className="tl-title-block">
          {/* "Historical" is dropped below 720px (see .tl-title-long in TimelineView.css): the short
              form matches the tab-bar label that got you here and stays whole at large text sizes. */}
          <h2 className="tl-title">
            <span className="tl-title-long">Historical </span>Timeline
          </h2>
          {view && (
            <span className="tl-range-readout">
              {formatYear(visibleFrom || 1)} — {formatYear(visibleTo || 1)}
            </span>
          )}
        </div>
        <div className="tl-header-spacer" />
        <div className="tl-header-controls">
          <TimelineGoToMenu currentYear={currentCenterYear} onGoToYear={goToYear} onGoToEra={goToEra} />
          <TimelineLaneMenu visible={visibleLanes} onToggle={toggleLane} />
        </div>
      </header>

      {/* "Go to" says so here when the year asked for is off the end. Always in the DOM, so that
        * screen readers announce what appears in it. */}
      <div className="tl-notice-anchor" role="status">
        {notice && <p className="tl-notice">{notice}</p>}
      </div>

      {/* Outer scrollable window: vertical-only scroll (native scrollbar / touch), horizontal
       * overflow stays clipped here. This is what's measured for the width; the inner .tl-canvas
       * below is as tall as the bands and commonly taller than this. */}
      <div ref={viewportRef} className="tl-canvas-viewport">
        <div
          ref={canvasRef}
          className={`tl-canvas${dragging ? " tl-dragging" : ""}`}
          style={{ height: geom.empty ? "100%" : geom.totalH }}
          role="application"
          aria-label="Timeline — drag or scroll to move through time and between timelines; the left and right arrow keys also move through time"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onClickCapture={onClickCapture}
          onKeyDown={onKeyDown}
        >
          {geom.empty && (
            <div className="tl-empty-state">
              No lanes selected — pick at least one from the Lanes menu above.
            </div>
          )}
          {!geom.empty && view && (
            <>
              {/* Pinned lane tints + separators (do not pan). Hidden lanes get 0 height from
               * geom, or (books) simply aren't rendered when unchecked. */}
              {geom.booksH > 0 && (
                <div
                  className="tl-lane-underlay tl-band-books"
                  style={{ top: geom.booksTop, height: geom.booksH }}
                />
              )}
              {hasLifespans && (
                <div
                  className="tl-lane-underlay tl-band-life"
                  style={{ top: geom.lifeTop, height: geom.lifeH }}
                />
              )}
              {EVENT_LANES.filter((lane) => geom.laneTop.has(lane.key)).map((lane) => (
                <div
                  key={lane.key}
                  className={`tl-lane-underlay tl-lane-${lane.key}`}
                  style={{ top: geom.laneTop.get(lane.key), height: geom.laneHeights.get(lane.key) }}
                />
              ))}

              {/* Pinned lane name chips. */}
              {geom.booksH > 0 && (
                <span className="tl-lane-label" style={{ top: geom.booksTop + LANE_LABEL_TOP }}>
                  Books of the Bible
                </span>
              )}
              {hasLifespans && (
                <span className="tl-lane-label" style={{ top: geom.lifeTop + LANE_LABEL_TOP }}>
                  <span
                    className="tl-lane-label-dot"
                    style={{ background: "var(--tl-life)" }}
                    aria-hidden="true"
                  />
                  Lifespans
                </span>
              )}
              {/* One swatch, one name, per lane. The merged lane briefly carried a live legend
                * (gold disc = biblical, lapis square = church, rubric ring = movement) back when
                * those were drawn differently; with a single uniform mark there is nothing left
                * for a legend to explain, so it's gone. */}
              {EVENT_LANES.filter((lane) => geom.laneTop.has(lane.key)).map((lane) => (
                <span
                  key={lane.key}
                  className="tl-lane-label"
                  style={{ top: (geom.laneTop.get(lane.key) as number) + LANE_LABEL_TOP }}
                >
                  <span
                    className={`tl-lane-label-dot tl-cat-${lane.markCat}`}
                    aria-hidden="true"
                  />
                  {lane.label}
                </span>
              ))}

              {/* The panning world surface — a single GPU-composited transform, never scaled.
               * translate3d (vs. translateX) explicitly promotes this to its own compositor
               * layer, which keeps large numbers of absolutely-positioned children smooth
               * during momentum glides and trackpad panning. */}
              <div
                className="tl-scroller"
                style={
                  {
                    transform: `translate3d(${translateX}px, 0, 0)`,
                    // Where the screen is, measured from the origin, so that names can hold to its
                    // edges (see .tl-life-label and .tl-range-bar-label).
                    "--tl-view-left": -translateX,
                    "--tl-view-width": size.w,
                  } as CSSProperties
                }
              >
                {ticks.map((y) => (
                  <div
                    key={`g${y}`}
                    className={`tl-gridline${y === 0 ? " tl-gridline-epoch" : ""}`}
                    style={{ left: y * PX_PER_YEAR - origin, height: geom.totalH }}
                  />
                ))}
                {booksLayer}
                {lifespansLayer}
                {eventsLayer}
                {/* A date-axis row at the bottom of EVERY section (Books, Lifespans, each event
                 * lane), not just the very last one — otherwise only whichever lane happens to be
                 * bottommost (previously "Other Religions") ever showed date labels, leaving every
                 * other section's dates a long scroll away. Each section is followed by its own
                 * dedicated AXIS_H-tall gap (see the geom useMemo above), so this never overlaps real
                 * event content the way an overlay-into-existing-space approach would. */}
                {geom.sectionBottoms.map((boundary) => {
                  const top = boundary;
                  return (
                    <div key={`axis-${boundary}`}>
                      {/* As wide as the rendered stretch, so it always runs the width of the screen. */}
                      <div
                        className="tl-axis-strip"
                        style={{ left: renderFrom - origin, width: renderTo - renderFrom, top, height: AXIS_H }}
                      />
                      {ticks.map((y) => (
                        <span
                          key={`t${boundary}-${y}`}
                          className={`tl-axis-label${y === 0 ? " tl-axis-epoch" : ""}`}
                          style={{
                            left: y * PX_PER_YEAR - origin,
                            top,
                            height: AXIS_H,
                            lineHeight: `${AXIS_H}px`,
                            zIndex: 6,
                          }}
                        >
                          {y === 0 ? "BC · AD" : formatYear(y)}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>

              {tooltip && (
                <div className="tl-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                  <div className="tl-tooltip-title">{tooltip.title}</div>
                  {tooltip.sub && <div className="tl-tooltip-sub">{tooltip.sub}</div>}
                  {tooltip.badge && <div className="tl-tooltip-badge">{tooltip.badge}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

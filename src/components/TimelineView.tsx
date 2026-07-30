import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { timelineEvents } from "../data/timelineEvents";
import { bookWritingWindows } from "../data/bookWritingWindows";
import type { BookWritingWindow } from "../data/bookWritingWindows";
import { people } from "../data/people";
import type { Person, TimelineEvent, TimelineEventCategory } from "../data/types";
import TimelineLaneMenu, { TIMELINE_LANE_ORDER } from "./TimelineLaneMenu";
import type { TimelineLaneKey } from "./TimelineLaneMenu";
import BackButton from "./BackButton";
import "./TimelineView.css";

/* ============================================================================
 * TimelineView — the app's zoomable, pannable historical timeline.
 *
 * Coordinate model: time is a signed year (negative = BC, positive = AD). Every
 * element's horizontal position is computed in JS as
 *     worldX = (year - MIN_YEAR) * pxPerYear
 * inside a world-wide "scroller" surface, which is panned with translateX only.
 * Zooming changes pxPerYear and recomputes positions — content is NEVER
 * CSS-scaled, so text and circles stay crisp at every zoom level.
 *
 * Layout, top to bottom:
 *   1. Books of the Bible band  — 66 translucent writing-window bars
 *   2. Lifespans lane           — bars for Persons carrying bornYear (optional data)
 *   3. Biblical events lane     — accent purple
 *   4. World History lane       — slate
 *   5. Other Religions lane     — amber
 *   6. Year axis
 *
 * Any of the five lanes above the axis can be hidden via the "Lanes" button in the header
 * (TimelineLaneMenu) — the choice persists in localStorage. Hidden lanes are skipped entirely (no
 * clustering/label math computed for them — see the `geom`/`bookPack`/`lifePack`/`eventsLayer`
 * memos below). Each visible lane gets its own generous, FIXED height (see `geom` below) — lanes
 * are never stretched to exactly fill the viewport and never squeezed thinner to cram more lanes
 * above the fold. The lane stack's total height is just the sum of whatever's checked, and the
 * outer viewport (.tl-canvas-viewport) scrolls vertically to reach anything below the fold — that's
 * the normal case, not an edge case reserved for checking many lanes at once.
 *
 * Interactions: vertical wheel/trackpad = zoom-to-cursor · horizontal trackpad
 * swipe = pan · drag (mouse or touch) = pan, with momentum on release · pinch =
 * zoom (touch) · +/−/Fit buttons · double-click = zoom in at point · cluster
 * badge click = animated zoom into that bucket's year range.
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

const MAX_PX_PER_YEAR = 48;
const CLUSTER_BUCKET_PX = 24;
const AXIS_H = 30;
/** Cold-start default window (no prior view, and the caller passed no `initialView`): roughly
 * Christ's life through the apostolic era and Revelation. This is ONLY the very first view a fresh
 * mount opens to — the Fit/reset-view button and the "0" key both keep zooming out to the FULL
 * dataset range via fitView() below, unchanged. */
const DEFAULT_VIEW_START_YEAR = -20;
const DEFAULT_VIEW_END_YEAR = 100;
/** Gap (px) an item needs before a neighboring label is drawn — used for a marker's title on both
 * sides (it's centered under the dot), a book/lifespan bar's "outside" name on the one side it
 * extends past its own bar, and a range-bar's title on the one side it extends past the bar's own
 * end. All of those labels are capped to a bounded max-width with ellipsis truncation (see
 * .tl-book-bar-label-outside / .tl-life-label-outside / .tl-range-bar-label in TimelineView.css),
 * so this gap only has to comfortably clear that bounded width, not an arbitrarily long name. */
const LABEL_GAP_PX = 120;

/** Momentum/inertia panning tuning for pointer (mouse + touch) drag release.
 * Trackpad wheel-panning doesn't need this: the OS/browser already emits a
 * naturally decaying stream of wheel events during its own momentum phase. */
const MOMENTUM_MIN_VX = 0.05; // px/ms — below this, a released drag just stops (no glide)
const MOMENTUM_STOP_VX = 0.015; // px/ms — glide ends once decayed velocity drops below this
const MOMENTUM_FRICTION = 0.0028; // per-ms exponential decay rate (~250ms velocity half-life)
const MOMENTUM_MAX_VX = 3.5; // px/ms safety cap on captured fling speed

const LANES: { cat: TimelineEventCategory; label: string; cssVar: string }[] = [
  { cat: "biblical", label: "Biblical History", cssVar: "var(--tl-biblical)" },
  { cat: "world", label: "World History", cssVar: "var(--tl-world)" },
  { cat: "religion", label: "Other Religions", cssVar: "var(--tl-religion)" },
];

/* ------------------------------------------------------- lane visibility */

/** Generous, FIXED per-lane heights (px). Each visible lane gets exactly this much room — it is
 * never stretched to fill the viewport and never squeezed to fit more lanes above the fold. The
 * event lanes (Biblical/World/Religion) carry the actual markers/clusters/range-bars people click
 * on, plus fanned-out same-year markers and cluster badges, so they get the most room. The books
 * band and lifespans lane are inherently less dense (translucent bars, no clustering) so they stay
 * proportionally slimmer, but still comfortable — never smooshed even with several overlapping rows.
 * EVENT_LANE_H is a flat constant (not divided across however many event lanes are checked): the
 * total stack height is just the sum of whatever's visible, and the outer viewport scrolls
 * vertically to reach anything below the fold. That's the normal case now, not an edge case. */
const EVENT_LANE_H = 170;
/** Per-row height for the Books-of-the-Bible band (a book bar's own row) and the padding added
 * above/below the row stack so top/bottom labels never crowd the lane's tint separator. */
const BOOK_ROW_H = 20;
const BOOK_ROW_PAD = 26;
const MIN_BOOKS_H = 76;
/** Per-row height for the Lifespans lane, same idea as the books band above. */
const LIFE_ROW_H = 34;
const LIFE_ROW_PAD = 26;
const MIN_LIFE_H = 84;

/** Per-row height for the event lanes (Biblical/World/Religion) when they're packed into multiple
 * rows — same idea as BOOK_ROW_H/LIFE_ROW_H above, sized to comfortably hold a marker dot or
 * range-bar plus its own always-visible two-line title+year pill (see .tl-marker-title /
 * .tl-range-bar-label in TimelineView.css). */
const EVENT_ROW_H = 27;
const EVENT_ROW_PAD = 18;
const MIN_EVENT_ROWS_H = 64;
/** A point-event marker's required horizontal "reach" in px — its own dot plus its always-visible
 * inline label (bounded by max-width + ellipsis, same idiom as every other label in this file) —
 * used to convert to a year-space span for packRows, so two markers whose labels would actually
 * collide land in different rows instead of overlapping. Built from the same LABEL_GAP_PX the rest
 * of the file already uses as its "safe label clearance" constant, plus the dot's own footprint. */
const EVENT_MARKER_RESERVE_PX = LABEL_GAP_PX + 20;
/** A range-bar event's required reach past its own (real, pixel-accurate) end — just enough for its
 * trailing label, which is all the label needs since the bar itself already occupies real dimension. */
const EVENT_RANGE_LABEL_RESERVE_PX = LABEL_GAP_PX;
/** Row-packing an event lane can, in principle, require an unbounded number of rows once you zoom
 * out far enough that huge swaths of years all compress into overlapping label reach — at that point
 * the lane would need to grow absurdly tall just to label every event individually. Beyond this many
 * required rows, that's the "most extreme zoom-out" case where a numbered cluster badge (see
 * kind: "cluster" below) is kept as the one remaining fallback — every other case gets full
 * always-visible per-event labels, matching the Lifespans lane. As soon as zooming in drops a lane's
 * required rows back to this cap or below, it snaps back to full per-event labels automatically. */
const MAX_EVENT_ROWS = 36;

const LANE_VISIBILITY_STORAGE_KEY = "timeline-visible-lanes";

const DEFAULT_VISIBLE_LANES: Record<TimelineLaneKey, boolean> = {
  books: true,
  lifespans: true,
  biblical: true,
  world: true,
  religion: true,
};

/** Same defensive localStorage-read pattern used elsewhere in the app (see
 * readLocalPlanProgress in lib/supabase.ts) — a corrupt or missing value just falls back to
 * "show everything," which is also today's fixed behavior for anyone who's never opened the menu. */
function loadVisibleLanes(): Record<TimelineLaneKey, boolean> {
  try {
    const raw = localStorage.getItem(LANE_VISIBILITY_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_LANES;
    const parsed = JSON.parse(raw) as Partial<Record<TimelineLaneKey, boolean>>;
    const next = { ...DEFAULT_VISIBLE_LANES };
    for (const key of TIMELINE_LANE_ORDER) {
      if (typeof parsed[key] === "boolean") next[key] = parsed[key] as boolean;
    }
    return next;
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

/** Greedy interval partitioning: packs items into the fewest horizontal rows
 * such that no two items in a row overlap in time. Zoom-independent (pure
 * year-space), so bars never jump rows while zooming. */
function packRows<T>(
  items: T[],
  getStart: (t: T) => number,
  getEnd: (t: T) => number,
): { placed: { item: T; row: number }[]; rowCount: number } {
  const sorted = [...items].sort((a, b) => getStart(a) - getStart(b) || getEnd(a) - getEnd(b));
  const rowEnds: number[] = [];
  const placed = sorted.map((item) => {
    const start = getStart(item);
    let row = rowEnds.findIndex((end) => end <= start);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(getEnd(item));
    } else {
      rowEnds[row] = getEnd(item);
    }
    return { item, row };
  });
  return { placed, rowCount: rowEnds.length };
}

const TICK_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

function pickTickInterval(pxPerYear: number): number {
  for (const step of TICK_STEPS) {
    if (step * pxPerYear >= 92) return step;
  }
  return TICK_STEPS[TICK_STEPS.length - 1];
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/* ------------------------------------------------------------------ types */

export interface View {
  /** Zoom: horizontal pixels per year. */
  pxPerYear: number;
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
  /** When set, the view opens zoomed to this entity's associated events (primaryEntityIds match)
   * and/or lifespan bar, with a brief highlight — used by the "View in Timeline" link chooser. */
  focusEntityId?: string;
  /** Dataset overrides for tests/dev harnesses — default to the app's real data. */
  events?: TimelineEvent[];
  lifespans?: LifespanEntry[];
  /** Resume a previously-saved pan/zoom view instead of the cold-start default — used when the
   * caller (App) reopens Timeline mode after the reader followed a cross-link away from it (event,
   * person, or book) and then hit Back. When set, this is used for the FIRST view on mount only;
   * once mounted, further changes to this prop are ignored (the component owns `view` after that). */
  initialView?: View | null;
  /** Fired whenever the pan/zoom view changes (pan, zoom, animated fly-to, or the cold-start/resize
   * clamp) — lets the caller remember the live view so it can be restored later via `initialView`. */
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
  /* viewportRef: the outer, scrollable window (vertical scroll, whenever the checked lanes' fixed
   * generous heights add up to more than fits — the normal case) — this is what's measured for
   * available layout height/width. canvasRef: the inner gesture surface (pointer/wheel handlers,
   * horizontal-only pan/zoom) — its own height is set explicitly from `geom` below, and routinely
   * grows past the viewport's height since lanes are no longer squeezed to fit inside it. */
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

  const { minYear, maxYear } = useMemo(() => {
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
    if (ys.length === 0) return { minYear: -4000, maxYear: 2100 };
    const rawMin = Math.min(...ys);
    const rawMax = Math.max(...ys);
    const pad = Math.max(60, (rawMax - rawMin) * 0.045);
    return { minYear: Math.floor(rawMin - pad), maxYear: Math.ceil(rawMax + pad) };
  }, [events, lifespans]);

  const viewRef = useRef<View | null>(null);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const clampView = useCallback(
    (pxPerYear: number, startYear: number): View => {
      const w = Math.max(sizeRef.current.w, 1);
      const minPxy = w / (maxYear - minYear);
      const pxy = clamp(pxPerYear, minPxy, MAX_PX_PER_YEAR);
      const spanYears = w / pxy;
      const start =
        spanYears >= maxYear - minYear ? minYear : clamp(startYear, minYear, maxYear - spanYears);
      return { pxPerYear: pxy, startYear: start };
    },
    [minYear, maxYear],
  );

  const fitView = useCallback((): View => {
    const w = Math.max(sizeRef.current.w, 1);
    return { pxPerYear: w / (maxYear - minYear), startYear: minYear };
  }, [minYear, maxYear]);

  /** Cold-start default (no `initialView` prop and no prior view yet): roughly 20 BC – AD 100,
   * covering Christ's life, the apostolic era, and Revelation — a far more useful landing point than
   * fitView()'s full 4272 BC–AD 2207 sweep. Built the same way fitView() is (pxPerYear from the
   * measured width, run through clampView so it can never fall outside the dataset's own bounds or
   * MAX_PX_PER_YEAR), just for a fixed ~120-year window instead of the dataset's computed min/max.
   * Fit/reset-view and the "0" key both keep calling fitView() above, unchanged. */
  const defaultView = useCallback((): View => {
    const w = Math.max(sizeRef.current.w, 1);
    const span = DEFAULT_VIEW_END_YEAR - DEFAULT_VIEW_START_YEAR;
    return clampView(w / span, DEFAULT_VIEW_START_YEAR);
  }, [clampView]);

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

  // First measurement → open to the cold-start default window (or, if the caller passed an
  // `initialView`, `view` was already seeded with it at mount and viewRef.current is non-null here,
  // so this never overwrites a resumed view with the default).
  useEffect(() => {
    if (size.w > 0 && !viewRef.current) setView(defaultView());
  }, [size.w, defaultView]);

  // Let the caller (App) remember the live view as it changes, so it can hand it back in via
  // `initialView` after a round trip away from Timeline mode (event/person/book cross-link + Back).
  useEffect(() => {
    if (view) onViewChange?.(view);
  }, [view, onViewChange]);

  // Keep the view valid when the window resizes.
  useEffect(() => {
    if (size.w > 0 && viewRef.current) {
      const v = viewRef.current;
      setView(clampView(v.pxPerYear, v.startYear));
    }
  }, [size.w, clampView]);

  /* ----- animated transitions (buttons, cluster zoom, reset) ----- */

  const animRef = useRef<number>(0);

  const cancelAnim = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
  }, []);

  // Momentum-glide cancellation lives here (ahead of animateTo/gesture handlers below)
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

  const animateTo = useCallback(
    (target: View) => {
      cancelAnim();
      cancelMomentum();
      // A cluster badge (or any other marker) can unmount mid-zoom, so its mouseleave never
      // fires — clear any lingering tooltip up front rather than leaving it stuck on screen.
      setTooltip(null);
      const from = viewRef.current;
      if (!from) return;
      const w = Math.max(sizeRef.current.w, 1);
      const clamped = clampView(target.pxPerYear, target.startYear);
      const fromCenter = from.startYear + w / (2 * from.pxPerYear);
      const toCenter = clamped.startYear + w / (2 * clamped.pxPerYear);
      const fromLog = Math.log(from.pxPerYear);
      const toLog = Math.log(clamped.pxPerYear);
      const t0 = performance.now();
      // Eased eye-catching "fly-to" transition for button zoom, cluster-click zoom, and
      // Fit/reset. 380ms sits in the natural range for this kind of UI motion — long
      // enough to read as smooth, short enough not to feel sluggish.
      const DURATION = 380;
      const step = (now: number) => {
        const p = clamp((now - t0) / DURATION, 0, 1);
        const e = easeOutCubic(p);
        const pxy = Math.exp(fromLog + (toLog - fromLog) * e);
        const center = fromCenter + (toCenter - fromCenter) * e;
        setView(clampView(pxy, center - w / (2 * pxy)));
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
    const eventIds = new Set<string>();
    const ys: number[] = [];
    for (const e of events) {
      if (e.id === focusEntityId || e.primaryEntityIds?.includes(focusEntityId)) {
        eventIds.add(e.id);
        ys.push(e.startYear);
        if (typeof e.endYear === "number") ys.push(e.endYear);
      }
    }
    const life = lifespans.find((l) => l.id === focusEntityId);
    if (life) ys.push(life.bornYear, lifespanEnd(life));
    if (ys.length === 0) return null;
    return { lo: Math.min(...ys), hi: Math.max(...ys), eventIds, lifeId: life?.id ?? null };
  }, [focusEntityId, events, lifespans]);

  // Pulses the focused elements for a few seconds after the zoom lands, then fades out.
  const [focusHighlightOn, setFocusHighlightOn] = useState(false);
  const focusAppliedRef = useRef(false);

  // Re-arm the one-shot guard whenever the focus target changes — picking "View in Timeline" for a
  // different entity while Timeline mode is already open must re-run the fly-to below, which the
  // guard (reset only on remount) would otherwise silently swallow.
  useEffect(() => {
    focusAppliedRef.current = false;
  }, [focusEntityId]);

  // Once the first fitted view exists, fly to the focused entity's range — applied exactly once per
  // focus target (the guard above), so it never fights later user pans.
  useEffect(() => {
    if (!focusInfo || focusAppliedRef.current || !view || size.w <= 0) return;
    focusAppliedRef.current = true;
    const span = Math.max(focusInfo.hi - focusInfo.lo, 24);
    const pad = span * 0.6;
    const lo = focusInfo.lo - pad;
    const hi = focusInfo.hi + pad;
    const w = Math.max(size.w, 1);
    const pxy = clamp(w / (hi - lo), w / (maxYear - minYear), MAX_PX_PER_YEAR);
    animateTo({ pxPerYear: pxy, startYear: (lo + hi) / 2 - w / (2 * pxy) });
    setFocusHighlightOn(true);
  }, [focusInfo, view, size.w, animateTo, maxYear, minYear]);

  // The turn-off timer lives in its own effect: the zoom effect above re-runs on every view change
  // (its deps include `view`), and a cleanup-cleared timeout there would never get re-armed past
  // the focusAppliedRef guard — leaving the pulse on forever.
  useEffect(() => {
    if (!focusHighlightOn) return;
    const t = setTimeout(() => setFocusHighlightOn(false), 5000);
    return () => clearTimeout(t);
  }, [focusHighlightOn]);

  const focusedEventIds = focusHighlightOn && focusInfo ? focusInfo.eventIds : null;
  const focusedLifeId = focusHighlightOn && focusInfo ? focusInfo.lifeId : null;

  /* ----- gestures: drag-pan, wheel-zoom, pinch-zoom (rAF-batched) ----- */

  const gestureRef = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    lastX: 0,
    moved: 0,
    suppressClick: false,
    captured: false,
    pinch: null as null | { dist: number; anchorYear: number; pxy: number; rectLeft: number },
    // Rolling buffer of recent (time, x) samples for the active single-pointer drag,
    // used to compute release velocity for momentum panning. Trimmed to a short window.
    velSamples: [] as { t: number; x: number }[],
  });
  const pendingRef = useRef({ dx: 0, panDx: 0, wheel: 0, wheelClientX: 0 });
  const rafRef = useRef(0);

  const flushGesture = useCallback(() => {
    rafRef.current = 0;
    const v = viewRef.current;
    if (!v) return;
    const g = gestureRef.current;
    const pending = pendingRef.current;
    // Any real pan/zoom flush moves the view out from under a hovered marker without a
    // mouseleave (drag-panning especially), so drop any stale tooltip right here.
    setTooltip(null);

    if (g.pinch && g.pointers.size >= 2) {
      const pts = [...g.pointers.values()];
      const dist = Math.max(12, Math.abs(pts[0].x - pts[1].x) + Math.abs(pts[0].y - pts[1].y));
      const midX = (pts[0].x + pts[1].x) / 2 - g.pinch.rectLeft;
      const pxy = clamp(
        g.pinch.pxy * (dist / g.pinch.dist),
        Math.max(sizeRef.current.w, 1) / (maxYear - minYear),
        MAX_PX_PER_YEAR,
      );
      setView(clampView(pxy, g.pinch.anchorYear - midX / pxy));
      pending.dx = 0;
      pending.wheel = 0;
      return;
    }

    let { pxPerYear, startYear } = v;
    if (pending.dx !== 0) {
      startYear -= pending.dx / pxPerYear;
      pending.dx = 0;
    }
    if (pending.panDx !== 0) {
      // Trackpad two-finger swipe: matches native `scrollLeft += deltaX` convention
      // (opposite sign from direct pointer-drag, which follows the finger 1:1).
      startYear += pending.panDx / pxPerYear;
      pending.panDx = 0;
    }
    if (pending.wheel !== 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const cursorX = rect ? pending.wheelClientX - rect.left : sizeRef.current.w / 2;
      const factor = Math.exp(-clamp(pending.wheel, -400, 400) * 0.0021);
      const yearAtCursor = startYear + cursorX / pxPerYear;
      const next = clamp(
        pxPerYear * factor,
        Math.max(sizeRef.current.w, 1) / (maxYear - minYear),
        MAX_PX_PER_YEAR,
      );
      // Zoom-to-point: the year under the cursor stays under the cursor.
      startYear = yearAtCursor - cursorX / next;
      pxPerYear = next;
      pending.wheel = 0;
    }
    setView(clampView(pxPerYear, startYear));
  }, [clampView, minYear, maxYear]);

  const scheduleFlush = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flushGesture);
  }, [flushGesture]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ----- momentum/inertia panning (pointer + touch drag release) -----
   * momentumRef/cancelMomentum are declared earlier (with cancelAnim) so animateTo
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
        const desiredStart = v.startYear - (vx * dt) / v.pxPerYear;
        const clamped = clampView(v.pxPerYear, desiredStart);
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

  // Wheel must be a non-passive native listener so preventDefault sticks.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnim();
      cancelMomentum();
      const scale = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 120 : 1;
      const dx = e.deltaX * scale;
      const dy = e.deltaY * scale;
      // Trackpad pinch-to-zoom always carries ctrlKey/metaKey true in every browser.
      // Otherwise, whichever axis dominates the gesture decides pan vs. zoom: a
      // horizontal-dominant two-finger swipe pans, a vertical-dominant wheel/swipe zooms
      // (matching plain mouse-wheel behavior, which only ever has a deltaY component).
      const isZoomGesture = e.ctrlKey || e.metaKey || Math.abs(dy) >= Math.abs(dx);
      if (isZoomGesture) {
        pendingRef.current.wheel += dy;
        pendingRef.current.wheelClientX = e.clientX;
      } else {
        pendingRef.current.panDx += dx;
      }
      scheduleFlush();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cancelAnim, cancelMomentum, scheduleFlush]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      // NOTE: no setPointerCapture here — capturing on pointerdown would retarget
      // the subsequent `click` to the canvas and swallow marker/cluster clicks.
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
      } else if (g.pointers.size === 2 && viewRef.current) {
        const pts = [...g.pointers.values()];
        const rect = canvasRef.current?.getBoundingClientRect();
        const rectLeft = rect ? rect.left : 0;
        const dist = Math.max(12, Math.abs(pts[0].x - pts[1].x) + Math.abs(pts[0].y - pts[1].y));
        const midX = (pts[0].x + pts[1].x) / 2 - rectLeft;
        g.pinch = {
          dist,
          pxy: viewRef.current.pxPerYear,
          anchorYear: viewRef.current.startYear + midX / viewRef.current.pxPerYear,
          rectLeft,
        };
        // Two fingers down means this isn't a single-pointer fling — drop any
        // velocity history so a stray sample from before the pinch can't leak in.
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
      if (g.pinch) {
        g.moved += 2;
        scheduleFlush();
        return;
      }
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
      if (g.pointers.size < 2) g.pinch = null;
      if (g.pointers.size === 1) {
        // Hand-off from pinch back to one-finger pan without a jump.
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

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const v = viewRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!v || !rect) return;
      const cursorX = e.clientX - rect.left;
      const yearAt = v.startYear + cursorX / v.pxPerYear;
      const pxy = clamp(v.pxPerYear * 2.2, v.pxPerYear, MAX_PX_PER_YEAR);
      animateTo({ pxPerYear: pxy, startYear: yearAt - cursorX / pxy });
    },
    [animateTo],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const v = viewRef.current;
      if (!v) return;
      const w = Math.max(sizeRef.current.w, 1);
      const panYears = (w * 0.12) / v.pxPerYear;
      if (e.key === "ArrowLeft") {
        cancelAnim();
        cancelMomentum();
        setView(clampView(v.pxPerYear, v.startYear - panYears));
      } else if (e.key === "ArrowRight") {
        cancelAnim();
        cancelMomentum();
        setView(clampView(v.pxPerYear, v.startYear + panYears));
      } else if (e.key === "+" || e.key === "=") {
        zoomByFactor(1.5);
      } else if (e.key === "-" || e.key === "_") {
        zoomByFactor(1 / 1.5);
      } else if (e.key === "0") {
        animateTo(fitView());
      } else {
        return;
      }
      e.preventDefault();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [clampView, animateTo, fitView, cancelAnim, cancelMomentum],
  );

  /* ----- button zooms ----- */

  function zoomByFactor(factor: number) {
    const v = viewRef.current;
    if (!v) return;
    const w = Math.max(sizeRef.current.w, 1);
    const centerYear = v.startYear + w / (2 * v.pxPerYear);
    const pxy = clamp(v.pxPerYear * factor, w / (maxYear - minYear), MAX_PX_PER_YEAR);
    animateTo({ pxPerYear: pxy, startYear: centerYear - w / (2 * pxy) });
  }

  const zoomToYearRange = useCallback(
    (lo: number, hi: number) => {
      const v = viewRef.current;
      if (!v) return;
      const w = Math.max(sizeRef.current.w, 1);
      const span = Math.max(hi - lo, 1);
      // Spread the bucket across ~40% of the viewport, but always zoom in meaningfully.
      const pxy = clamp(
        Math.max(v.pxPerYear * 2.4, (w * 0.4) / span),
        v.pxPerYear * 1.2,
        MAX_PX_PER_YEAR,
      );
      const center = (lo + hi) / 2;
      animateTo({ pxPerYear: pxy, startYear: center - w / (2 * pxy) });
    },
    [animateTo],
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

  /* ----- vertical geometry ----- */

  // Needed ahead of geom now: the event lanes' row-packing (below) reserves label "reach" in
  // pixels, which only converts to a year-space span once we know the current pxPerYear — unlike
  // the books/lifespans packs, which are pure year-space and don't depend on zoom at all.
  const pxPerYear = view?.pxPerYear ?? 0;

  // Hidden lanes skip their row-packing entirely — no point computing interval placement for
  // content that won't render (this is the "hidden lanes don't need clustering/label math" perf win).
  const bookPack = useMemo(
    () =>
      visibleLanes.books
        ? packRows(BOOK_WINDOWS, (w) => w.startYear, (w) => w.endYear)
        : { placed: [], rowCount: 0 },
    [visibleLanes.books],
  );

  const lifePack = useMemo(
    () =>
      visibleLanes.lifespans
        ? packRows(lifespans, (l) => l.bornYear, (l) => lifespanEnd(l))
        : { placed: [], rowCount: 0 },
    [visibleLanes.lifespans, lifespans],
  );

  /** Per-lane, zoom-dependent row-packing for the Biblical/World/Religion event lanes — the same
   * packRows helper the books band and Lifespans lane use above, just fed a per-item year-space
   * "reach" (start..start+reach for a point event, endYear..endYear+reach for a ranged one) built
   * from EVENT_MARKER_RESERVE_PX/EVENT_RANGE_LABEL_RESERVE_PX at the CURRENT pxPerYear. Doing the
   * conversion at the current zoom (rather than at some fixed worst-case zoom) is deliberate: it's
   * what lets a lane's required row count shrink back down — and its always-visible per-event labels
   * return — as soon as the user zooms into a less crowded span, instead of staying pinned at
   * whatever depth the most extreme zoom-out would ever need.
   * useCluster flips on only when the packed row count would exceed MAX_EVENT_ROWS — i.e., zoomed out
   * so far that individually labeling every event would require an impractically tall lane. That's
   * the one remaining case that falls back to the old numbered cluster badge below; every other case
   * — which is the overwhelming majority of real usage — gets full per-event labels. */
  const eventPacks = useMemo(() => {
    const map = new Map<
      TimelineEventCategory,
      { useCluster: boolean; rowCount: number; placed: { item: TimelineEvent; row: number }[] }
    >();
    if (pxPerYear <= 0) return map;
    for (const lane of LANES) {
      if (!visibleLanes[lane.cat]) continue;
      const laneEvents = events.filter((e) => e.category === lane.cat);
      const withReach = laneEvents.map((e) => {
        const hasRange = typeof e.endYear === "number" && e.endYear > e.startYear;
        const end = hasRange
          ? (e.endYear as number) + EVENT_RANGE_LABEL_RESERVE_PX / pxPerYear
          : e.startYear + EVENT_MARKER_RESERVE_PX / pxPerYear;
        return { e, end };
      });
      const packed = packRows(
        withReach,
        (x) => x.e.startYear,
        (x) => x.end,
      );
      if (packed.rowCount > MAX_EVENT_ROWS) {
        map.set(lane.cat, { useCluster: true, rowCount: 1, placed: [] });
      } else {
        map.set(lane.cat, {
          useCluster: false,
          rowCount: Math.max(packed.rowCount, 1),
          placed: packed.placed.map((p) => ({ item: p.item.e, row: p.row })),
        });
      }
    }
    return map;
  }, [events, visibleLanes, pxPerYear]);

  const geom = useMemo(() => {
    const h = size.h;
    if (h <= 0) return null;
    const avail = h - AXIS_H;

    const showBooks = visibleLanes.books;
    const showLife = visibleLanes.lifespans && lifePack.rowCount > 0;
    const visibleEventLanes = LANES.filter((lane) => visibleLanes[lane.cat]);
    const nEvent = visibleEventLanes.length;
    const visibleCount = (showBooks ? 1 : 0) + (showLife ? 1 : 0) + nEvent;

    if (visibleCount === 0) {
      return { empty: true as const, sectionBottoms: [] as number[], totalH: h, needsScroll: false };
    }

    // Generous per-lane heights — each visible lane simply gets its own comfortable height, never
    // stretched to exactly fill the viewport and never squeezed thinner to let more lanes fit above
    // the fold. Books/lifespans grow with their own row count (more overlapping bars legitimately
    // need more room); the event lanes now do the same via eventPacks above — a lane with more
    // packed rows (denser overlapping events at the current zoom) simply gets a taller band, and a
    // lane in cluster-fallback mode (see eventPacks) keeps the old flat EVENT_LANE_H, which was
    // already tuned for a fixed-row fan-out of badges/markers. Total stack height is just the sum of
    // what's visible (see contentH below); the outer .tl-canvas-viewport scrolls vertically whenever
    // that sum exceeds the viewport, which is the normal case rather than something the layout tries
    // to avoid.
    const bookRows = Math.max(bookPack.rowCount, 1);
    const booksH = showBooks ? Math.max(bookRows * BOOK_ROW_H + BOOK_ROW_PAD, MIN_BOOKS_H) : 0;
    const lifeRows = lifePack.rowCount;
    const lifeH = showLife ? Math.max(lifeRows * LIFE_ROW_H + LIFE_ROW_PAD, MIN_LIFE_H) : 0;

    // The bottom edge of every visible section (Books, Lifespans, then each event lane, in stacking
    // order) — a year-axis row gets repeated at each of these, not just the very last one, so
    // scrolling to any section still shows its own date labels rather than only the bottommost lane's.
    // Each section is followed by a genuine AXIS_H-tall gap (not just an overlay into the next
    // section's own content) so the repeated date labels never sit on top of real event content —
    // `cursor` advances past both the section's content AND that gap before the next section starts.
    const sectionBottoms: number[] = [];
    let cursor = 0;
    let booksTop = 0;
    let lifeTop = 0;
    if (showBooks) {
      booksTop = cursor;
      cursor += booksH;
      sectionBottoms.push(cursor);
      cursor += AXIS_H;
    }
    if (showLife) {
      lifeTop = cursor;
      cursor += lifeH;
      sectionBottoms.push(cursor);
      cursor += AXIS_H;
    }

    const laneTop = new Map<TimelineEventCategory, number>();
    const laneHeights = new Map<TimelineEventCategory, number>();
    for (const lane of visibleEventLanes) {
      const pack = eventPacks.get(lane.cat);
      const laneH =
        pack && !pack.useCluster
          ? Math.max(pack.rowCount * EVENT_ROW_H + EVENT_ROW_PAD, MIN_EVENT_ROWS_H)
          : EVENT_LANE_H;
      laneTop.set(lane.cat, cursor);
      laneHeights.set(lane.cat, laneH);
      cursor += laneH;
      sectionBottoms.push(cursor);
      cursor += AXIS_H;
    }
    // `cursor` already includes one AXIS_H gap after the very last section (added in the loop above),
    // so it IS the total height — no separate "+ AXIS_H" tacked on afterward like before.
    const totalH = cursor;
    const contentH = totalH - AXIS_H;

    // Purely descriptive now (drives the touch-action CSS class below) — no longer a feasibility
    // gate that changes how tall any lane is. With generous heights this will be true for most
    // non-trivial lane selections, which matches Robbie's ask: scrolling below the fold is the
    // expected default, not an edge case.
    const needsScroll = contentH > avail;

    return {
      empty: false as const,
      booksTop,
      booksH,
      lifeTop,
      lifeH,
      laneTop,
      laneHeights,
      sectionBottoms,
      totalH,
      needsScroll,
    };
  }, [size.h, bookPack.rowCount, lifePack.rowCount, visibleLanes, eventPacks]);

  /* ----- world-space layers, memoized per zoom level -----
   * Pan only changes translateX on the scroller — these element trees are
   * reused untouched frame-to-frame during a drag, so React reconciliation
   * is near-free while panning. They rebuild only when zoom changes. */

  const booksLayer = useMemo<ReactNode>(() => {
    if (!geom || geom.empty || geom.booksH <= 0 || pxPerYear <= 0) return null;
    const rowH = (geom.booksH - BOOK_ROW_PAD) / Math.max(bookPack.rowCount, 1);
    const topPad = BOOK_ROW_PAD / 2;
    const barH = clamp(rowH - 1.5, 3.5, 16);

    // Group placements by row — same approach the lifespans lane uses: packRows processes items
    // pre-sorted by start year, so each row's own subsequence is already in increasing x order,
    // letting label crowding be judged against same-row neighbors only (see lifespansLayer below).
    const byRow = new Map<number, { item: BookWritingWindow; row: number }[]>();
    for (const p of bookPack.placed) {
      const list = byRow.get(p.row);
      if (list) list.push(p);
      else byRow.set(p.row, [p]);
    }

    const nodes: ReactNode[] = [];
    for (const rowItems of byRow.values()) {
      for (let i = 0; i < rowItems.length; i++) {
        const { item, row } = rowItems[i];
        const x = (item.startYear - minYear) * pxPerYear;
        const w = Math.max((item.endYear - item.startYear) * pxPerYear, 3.5);
        const y = geom.booksTop + topPad + row * rowH;
        const range = formatYearRange(item.startYear, item.endYear);
        const inside = w > 58 && barH >= 9;

        // Same label-gap guard the lifespans lane uses: skip the book name if a same-row
        // neighbor doesn't leave enough clear horizontal space on either side. This guard only
        // matters for an "outside" label (rendered past the bar's own right edge, where it can
        // collide with whatever's next) — an "inside" label is bounded by its own bar's width
        // (max-width + ellipsis, see .tl-book-bar-label CSS), so a nearby neighbor can't make it
        // overlap and hiding it in that case would just needlessly blank out a label that fits fine.
        const prevX = i > 0 ? (rowItems[i - 1].item.startYear - minYear) * pxPerYear : -Infinity;
        const nextX =
          i < rowItems.length - 1
            ? (rowItems[i + 1].item.startYear - minYear) * pxPerYear
            : Infinity;
        const hasGap = x - prevX > LABEL_GAP_PX && nextX - x > LABEL_GAP_PX;
        const showLabel = inside || hasGap;

        nodes.push(
          <button
            key={item.book}
            type="button"
            className={`tl-book-bar${item.disputed ? " tl-book-disputed" : ""}`}
            style={{ left: x, top: y, width: w, height: barH }}
            onClick={() => onSelectBook?.(item.book)}
            onMouseEnter={(e) =>
              showTip(e, item.book, `Written ${range}`, item.disputed ? "Dating disputed" : undefined)
            }
            onMouseLeave={hideTip}
            aria-label={`${item.book}, written ${range}`}
          >
            {showLabel && (
              <span className={`tl-book-bar-label${inside ? "" : " tl-book-bar-label-outside"}`}>
                <span className="tl-event-label-name">{item.book}</span>
                <span className="tl-event-label-year">{range}</span>
              </span>
            )}
          </button>,
        );
      }
    }
    return nodes;
  }, [geom, pxPerYear, bookPack, minYear, onSelectBook, showTip, hideTip]);

  const lifespansLayer = useMemo<ReactNode>(() => {
    if (!geom || geom.empty || geom.lifeH <= 0 || pxPerYear <= 0) return null;
    const rowH = (geom.lifeH - LIFE_ROW_PAD) / Math.max(lifePack.rowCount, 1);
    const topPad = LIFE_ROW_PAD / 2;
    const barH = clamp(rowH - 3, 8, 22);

    // Group placements by row — packRows processes items pre-sorted by start year, so each
    // row's own subsequence is already in increasing x order — so label crowding can be judged
    // against same-row neighbors only, the same neighbor-gap approach the events lane uses below.
    const byRow = new Map<number, { item: LifespanEntry; row: number }[]>();
    for (const p of lifePack.placed) {
      const list = byRow.get(p.row);
      if (list) list.push(p);
      else byRow.set(p.row, [p]);
    }

    const nodes: ReactNode[] = [];
    for (const rowItems of byRow.values()) {
      for (let i = 0; i < rowItems.length; i++) {
        const { item, row } = rowItems[i];
        const end = lifespanEnd(item);
        const x = (item.bornYear - minYear) * pxPerYear;
        const w = Math.max((end - item.bornYear) * pxPerYear, 6);
        const y = geom.lifeTop + topPad + row * rowH + (rowH - barH) / 2;
        const label =
          item.lifespanLabel ??
          (typeof item.diedYear === "number"
            ? formatYearRange(item.bornYear, item.diedYear)
            : `b. ${formatYear(item.bornYear)}`);
        const inside = w > 72;

        // Same label-gap guard the events lane uses: skip the name if a same-row neighbor
        // doesn't leave enough clear horizontal space on either side, so labels don't pile up
        // into an unreadable smear at full zoom-out on narrow viewports. As with the books band
        // above, this guard only matters for an "outside" label — an "inside" one is bounded by
        // its own bar's width (max-width + ellipsis, see .tl-life-label CSS) so it can't collide
        // with a neighbor regardless of how close that neighbor sits.
        const prevX = i > 0 ? (rowItems[i - 1].item.bornYear - minYear) * pxPerYear : -Infinity;
        const nextX =
          i < rowItems.length - 1 ? (rowItems[i + 1].item.bornYear - minYear) * pxPerYear : Infinity;
        const hasGap = x - prevX > LABEL_GAP_PX && nextX - x > LABEL_GAP_PX;
        const showLabel = barH >= 10 && (inside || hasGap);

        nodes.push(
          <button
            key={item.id}
            type="button"
            className={`tl-life-bar${item.id === focusedLifeId ? " tl-focused" : ""}`}
            style={{ left: x, top: y, width: w, height: barH }}
            onClick={() => onSelectPerson(item.id)}
            onMouseEnter={(e) => showTip(e, item.name, label, item.lifespanCertainty)}
            onMouseLeave={hideTip}
            aria-label={`${item.name}, ${label}`}
          >
            {showLabel && (
              <span className={`tl-life-label${inside ? "" : " tl-life-label-outside"}`}>
                <span className="tl-event-label-name">{item.name}</span>
                <span className="tl-event-label-year">{label}</span>
              </span>
            )}
          </button>,
        );
      }
    }
    return nodes;
  }, [geom, pxPerYear, lifePack, minYear, onSelectPerson, showTip, hideTip, focusedLifeId]);

  const eventsLayer = useMemo<ReactNode>(() => {
    if (!geom || geom.empty || pxPerYear <= 0) return null;

    const nodes: ReactNode[] = [];

    // Two-line title+year chip shared by markers and range bars in the (default) per-event-row
    // mode below — same opaque-pill legibility treatment as .tl-range-bar-label always had, just
    // with a second, smaller/muted line for the year(s) so the date is on-screen without a click,
    // not only in the hover tooltip.
    const labelLines = (title: string, year: string) => (
      <>
        <span className="tl-event-label-name">{title}</span>
        <span className="tl-event-label-year">{year}</span>
      </>
    );

    for (const lane of LANES) {
      const { cat } = lane;
      // Hidden lane: geom never allocated it a top offset — skip clustering/label math for it
      // entirely rather than computing work for something that won't render.
      const laneTop = geom.laneTop.get(cat);
      const laneH = geom.laneHeights.get(cat);
      if (laneTop === undefined || laneH === undefined) continue;
      const pack = eventPacks.get(cat);
      if (!pack) continue;

      if (!pack.useCluster) {
        // Default path: every event got its own row from packRows above (same helper the
        // Lifespans lane uses), so every event gets its own always-visible title+year label — no
        // clicking required to see what's on the timeline. Mirrors lifespansLayer's row math.
        const rowH = Math.max(laneH - EVENT_ROW_PAD, 1) / pack.rowCount;
        const topPad = EVENT_ROW_PAD / 2;
        for (const { item: e, row } of pack.placed) {
          const x = (e.startYear - minYear) * pxPerYear;
          const y = laneTop + topPad + row * rowH + rowH / 2;
          const hasRange = typeof e.endYear === "number" && e.endYear > e.startYear;
          const focused = focusedEventIds?.has(e.id) ? " tl-focused" : "";

          if (hasRange) {
            const barW = Math.max((e.endYear! - e.startYear) * pxPerYear, 12);
            nodes.push(
              <button
                key={e.id}
                type="button"
                className={`tl-range-bar tl-cat-${cat}${focused}`}
                style={{ left: x, top: y, width: barW }}
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
                className={`tl-marker tl-cat-${cat}${focused}`}
                style={{ left: x, top: y }}
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
        continue;
      }

      // Fallback path — only reached when packRows above determined that giving every event in
      // this lane its own row, at the current zoom, would need more than MAX_EVENT_ROWS rows (the
      // "most extreme zoom-out" case). Same fixed-pixel-bucket clustering this lane always used,
      // now reserved for that case instead of being the default: still fans out same-year/
      // unsplittable groups into real markers, still zooms into a splittable cluster on click.
      const laneEvents = events
        .filter((e) => e.category === cat)
        .sort((a, b) => a.startYear - b.startYear);
      const centerY = laneTop + laneH / 2;

      // Fixed-width pixel buckets in world space (pan-invariant at a given zoom).
      const buckets = new Map<number, TimelineEvent[]>();
      for (const e of laneEvents) {
        const bx = Math.floor(((e.startYear - minYear) * pxPerYear) / CLUSTER_BUCKET_PX);
        const list = buckets.get(bx);
        if (list) list.push(e);
        else buckets.set(bx, [e]);
      }

      type Renderable =
        | { kind: "single"; x: number; e: TimelineEvent; yOff: number }
        | { kind: "cluster"; x: number; events: TimelineEvent[]; lo: number; hi: number };
      const items: Renderable[] = [];

      for (const group of buckets.values()) {
        if (group.length === 1) {
          const e = group[0];
          items.push({ kind: "single", x: (e.startYear - minYear) * pxPerYear, e, yOff: 0 });
          continue;
        }
        const lo = group[0].startYear;
        const hi = group[group.length - 1].startYear;
        // A cluster is only useful if zooming further could actually split it.
        const splittable =
          (hi - lo) * MAX_PX_PER_YEAR > CLUSTER_BUCKET_PX * 1.25 &&
          pxPerYear < MAX_PX_PER_YEAR * 0.98;
        if (splittable) {
          items.push({
            kind: "cluster",
            x: ((lo + hi) / 2 - minYear) * pxPerYear,
            events: group,
            lo,
            hi,
          });
        } else {
          // Same-year (or unsplittable) events: fan out vertically as real markers.
          group.forEach((e, i) => {
            items.push({
              kind: "single",
              x: (e.startYear - minYear) * pxPerYear,
              e,
              yOff: clamp((i - (group.length - 1) / 2) * 15, -laneH / 2 + 10, laneH / 2 - 10),
            });
          });
        }
      }

      items.sort((a, b) => a.x - b.x);

      // Range-bar events get their own label-gap check — a bar's label sits just past its own
      // right edge (see .tl-range-bar-label CSS), so what matters is whether the very NEXT item
      // rendered in this lane — regardless of what kind it is — leaves enough clear room after this
      // bar's end. This used to only compare against neighboring bars, on the theory a label
      // wouldn't reach a marker dot or cluster badge sitting nearby; in practice a wide bar's label
      // routinely ran into the very next cluster badge instead (confirmed visually — a bar's title
      // pill overlapping the next cluster's circle), so every item's own occupied left edge is
      // accounted for, not just other bars'.
      const occupiedLeftEdge = (it: Renderable): number => {
        if (it.kind === "cluster") return it.x - 14; // ~28px badge, centered on it.x
        if (typeof it.e.endYear === "number" && it.e.endYear > it.e.startYear) return it.x; // bar's own start
        return it.x - 7; // marker dot, ~13px, centered on it.x
      };
      const barHasGap = new Map<string, boolean>();
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind !== "single" || typeof it.e.endYear !== "number" || it.e.endYear <= it.e.startYear) {
          continue;
        }
        const barW = Math.max((it.e.endYear - it.e.startYear) * pxPerYear, 12);
        const barEnd = it.x + barW;
        const next = items[i + 1];
        const nextLeft = next ? occupiedLeftEdge(next) : Infinity;
        barHasGap.set(it.e.id, nextLeft - barEnd > LABEL_GAP_PX);
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const prevX = i > 0 ? items[i - 1].x : -Infinity;
        const nextX = i < items.length - 1 ? items[i + 1].x : Infinity;

        if (it.kind === "cluster") {
          const label = `${it.events.length} ${cat === "biblical" ? "biblical" : cat === "world" ? "world history" : "religion"} events, ${formatYearRange(it.lo, it.hi)}`;
          nodes.push(
            <button
              key={`c-${cat}-${it.lo}-${it.hi}-${it.events.length}`}
              type="button"
              className={`tl-cluster tl-cat-${cat}`}
              style={{ left: it.x, top: centerY }}
              onClick={() => zoomToYearRange(it.lo, it.hi)}
              onMouseEnter={(e) =>
                showTip(e, `${it.events.length} events`, `${formatYearRange(it.lo, it.hi)} — click to zoom in`)
              }
              onMouseLeave={hideTip}
              aria-label={`${label} — zoom in`}
            >
              {it.events.length}
            </button>,
          );
          continue;
        }

        const e = it.e;
        const hasRange = typeof e.endYear === "number" && e.endYear > e.startYear;
        const showTitle =
          it.yOff === 0 && it.x - prevX > LABEL_GAP_PX && nextX - it.x > LABEL_GAP_PX;

        if (hasRange) {
          const barW = Math.max((e.endYear! - e.startYear) * pxPerYear, 12);
          const hasBarLabelGap = barHasGap.get(e.id) ?? false;
          nodes.push(
            <button
              key={e.id}
              type="button"
              className={`tl-range-bar tl-cat-${cat}${focusedEventIds?.has(e.id) ? " tl-focused" : ""}`}
              style={{ left: it.x, top: centerY + it.yOff, width: barW }}
              onClick={() => onSelectTimelineEvent(e.id)}
              onMouseEnter={(ev) => showTip(ev, e.title, e.dateLabel, e.era)}
              onMouseLeave={hideTip}
              aria-label={`${e.title}, ${e.dateLabel}`}
            >
              {hasBarLabelGap && <span className="tl-range-bar-label">{e.title}</span>}
            </button>,
          );
        } else {
          nodes.push(
            <button
              key={e.id}
              type="button"
              className={`tl-marker tl-cat-${cat}${focusedEventIds?.has(e.id) ? " tl-focused" : ""}`}
              style={{ left: it.x, top: centerY + it.yOff }}
              onClick={() => onSelectTimelineEvent(e.id)}
              onMouseEnter={(ev) => showTip(ev, e.title, e.dateLabel, e.era)}
              onMouseLeave={hideTip}
              aria-label={`${e.title}, ${e.dateLabel}`}
            >
              {showTitle && <span className="tl-marker-title">{e.title}</span>}
            </button>,
          );
        }
      }
    }
    return nodes;
  }, [
    geom,
    pxPerYear,
    events,
    minYear,
    eventPacks,
    onSelectTimelineEvent,
    zoomToYearRange,
    showTip,
    hideTip,
    focusedEventIds,
  ]);

  /* ----- axis ticks (cheap — rebuilt every render for the live window) ----- */

  const ticks = useMemo(() => {
    if (!view || size.w <= 0) return [];
    const interval = pickTickInterval(view.pxPerYear);
    const spanYears = size.w / view.pxPerYear;
    const from = Math.floor((view.startYear - spanYears * 0.5) / interval) * interval;
    const to = view.startYear + spanYears * 1.5;
    const out: number[] = [];
    for (let y = from; y <= to; y += interval) out.push(y);
    return out;
  }, [view, size.w]);

  /* ----- render ----- */

  const translateX = view ? -(view.startYear - minYear) * view.pxPerYear : 0;
  const visibleFrom = view ? Math.round(view.startYear) : 0;
  const visibleTo = view ? Math.round(view.startYear + size.w / view.pxPerYear) : 0;
  const hasLifespans = geom !== null && !geom.empty && geom.lifeH > 0;

  return (
    <section className="tl-root" aria-label="Historical timeline">
      <header className="tl-header">
        <BackButton onClick={onClose} ariaLabel="Close timeline" />
        <div className="tl-title-block">
          <h2 className="tl-title">Historical Timeline</h2>
          {view && (
            <span className="tl-range-readout">
              {formatYear(visibleFrom || 1)} — {formatYear(visibleTo || 1)}
            </span>
          )}
        </div>
        <div className="tl-header-spacer" />
        <div className="tl-zoom-controls">
          <TimelineLaneMenu visible={visibleLanes} onToggle={toggleLane} />
          <button
            type="button"
            className="tl-zoom-btn"
            onClick={() => zoomByFactor(1 / 1.6)}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="tl-zoom-btn"
            onClick={() => zoomByFactor(1.6)}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="tl-zoom-btn tl-zoom-reset"
            onClick={() => animateTo(fitView())}
            aria-label="Reset view to full timeline"
          >
            Fit
          </button>
        </div>
      </header>

      {/* Outer scrollable window: vertical-only scroll (native scrollbar / touch), horizontal
       * overflow stays clipped here so the lane stack's fixed, generous per-lane heights (see geom
       * above) — routinely taller than the viewport now that lanes aren't squeezed to fit — don't
       * widen the page. This is what's measured for available layout height/width — the inner
       * .tl-canvas below is sized explicitly from `geom` and commonly grows past it. */}
      <div ref={viewportRef} className="tl-canvas-viewport">
        <div
          ref={canvasRef}
          className={`tl-canvas${dragging ? " tl-dragging" : ""}${geom && !geom.empty && geom.needsScroll ? " tl-canvas-scroll-y" : ""}`}
          style={{ height: geom && !geom.empty ? geom.totalH : "100%" }}
          role="application"
          aria-label="Zoomable timeline — scroll to zoom, drag to pan, arrow keys to move"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onClickCapture={onClickCapture}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
        >
          {geom && geom.empty && (
            <div className="tl-empty-state">
              No lanes selected — pick at least one from the Lanes menu above.
            </div>
          )}
          {geom && !geom.empty && view && (
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
              {LANES.filter((lane) => geom.laneTop.has(lane.cat)).map((lane) => (
                <div
                  key={lane.cat}
                  className={`tl-lane-underlay tl-lane-${lane.cat}`}
                  style={{ top: geom.laneTop.get(lane.cat), height: geom.laneHeights.get(lane.cat) }}
                />
              ))}

              {/* Pinned lane name chips. */}
              {geom.booksH > 0 && (
                <span className="tl-lane-label" style={{ top: geom.booksTop + 5 }}>
                  Books of the Bible
                </span>
              )}
              {hasLifespans && (
                <span className="tl-lane-label" style={{ top: geom.lifeTop + 5 }}>
                  <span
                    className="tl-lane-label-dot"
                    style={{ background: "var(--tl-life)" }}
                    aria-hidden="true"
                  />
                  Lifespans
                </span>
              )}
              {LANES.filter((lane) => geom.laneTop.has(lane.cat)).map((lane) => (
                <span
                  key={lane.cat}
                  className="tl-lane-label"
                  style={{ top: (geom.laneTop.get(lane.cat) as number) + 5 }}
                >
                  <span
                    className="tl-lane-label-dot"
                    style={{ background: lane.cssVar }}
                    aria-hidden="true"
                  />
                  {lane.label}
                </span>
              ))}

              {/* The panning world surface — a single GPU-composited transform, never scaled.
               * translate3d (vs. translateX) explicitly promotes this to its own compositor
               * layer, which keeps large numbers of absolutely-positioned children smooth
               * during momentum glides and trackpad panning. */}
              <div className="tl-scroller" style={{ transform: `translate3d(${translateX}px, 0, 0)` }}>
                {ticks.map((y) => (
                  <div
                    key={`g${y}`}
                    className={`tl-gridline${y === 0 ? " tl-gridline-epoch" : ""}`}
                    style={{ left: (y - minYear) * view.pxPerYear, height: geom.totalH }}
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
                      <div className="tl-axis-strip" style={{ top, height: AXIS_H }} />
                      {ticks.map((y) => (
                        <span
                          key={`t${boundary}-${y}`}
                          className={`tl-axis-label${y === 0 ? " tl-axis-epoch" : ""}`}
                          style={{
                            left: (y - minYear) * view.pxPerYear,
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { timelineEvents } from "../data/timelineEvents";
import { bookWritingWindows } from "../data/bookWritingWindows";
import type { BookWritingWindow } from "../data/bookWritingWindows";
import { people } from "../data/people";
import type { Person, TimelineEvent, TimelineEventCategory } from "../data/types";
import TimelineLaneMenu, { TIMELINE_LANE_ORDER } from "./TimelineLaneMenu";
import type { TimelineLaneKey } from "./TimelineLaneMenu";
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
 * (TimelineLaneMenu) — the choice persists in localStorage. Hidden lanes are skipped entirely
 * (no clustering/label math computed for them — see the `geom`/`bookPack`/`lifePack`/`eventsLayer`
 * memos below), and the vertical space that would've gone to them is redistributed among whatever
 * lanes remain checked. Checking more lanes than comfortably fit switches the lane stack to fixed
 * minimum-height lanes inside a vertically scrollable container instead of squeezing everyone thin.
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
/** Gap (px) a singleton marker needs on both sides before its title is drawn. */
const LABEL_GAP_PX = 88;

/** Momentum/inertia panning tuning for pointer (mouse + touch) drag release.
 * Trackpad wheel-panning doesn't need this: the OS/browser already emits a
 * naturally decaying stream of wheel events during its own momentum phase. */
const MOMENTUM_MIN_VX = 0.05; // px/ms — below this, a released drag just stops (no glide)
const MOMENTUM_STOP_VX = 0.015; // px/ms — glide ends once decayed velocity drops below this
const MOMENTUM_FRICTION = 0.0028; // per-ms exponential decay rate (~250ms velocity half-life)
const MOMENTUM_MAX_VX = 3.5; // px/ms safety cap on captured fling speed

const LANES: { cat: TimelineEventCategory; label: string; cssVar: string }[] = [
  { cat: "biblical", label: "Biblical", cssVar: "var(--tl-biblical)" },
  { cat: "world", label: "World History", cssVar: "var(--tl-world)" },
  { cat: "religion", label: "Other Religions", cssVar: "var(--tl-religion)" },
];

/* ------------------------------------------------------- lane visibility */

/** Reasonable minimum heights (px) per lane type when the lane stack has more checked lanes than
 * comfortably fit and switches to scroll mode — event lanes carry the actual markers/clusters/bars
 * people click on, so they need more room than the naturally slimmer books band or lifespans lane. */
const MIN_BOOKS_H = 56;
const MIN_LIFE_H = 46;
const MIN_EVENT_LANE_H = 88;

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

interface View {
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
}: TimelineViewProps) {
  /* viewportRef: the outer, scrollable window (vertical scroll only, when the checked lane set needs
   * more height than fits) — this is what's measured for available layout height/width. canvasRef:
   * the inner gesture surface (pointer/wheel handlers, horizontal-only pan/zoom) — its own height is
   * set explicitly from `geom` below, growing past the viewport's height only in scroll mode. */
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
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

  // First measurement → open fitted to the whole sweep of history.
  useEffect(() => {
    if (size.w > 0 && !viewRef.current) setView(fitView());
  }, [size.w, fitView]);

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
      return { empty: true as const, axisTop: avail, totalH: h, needsScroll: false };
    }

    const bookRows = Math.max(bookPack.rowCount, 1);
    const booksContentH = showBooks ? Math.max(bookRows * 9 + 20, MIN_BOOKS_H) : 0;
    const lifeRows = lifePack.rowCount;
    const lifeContentH = showLife ? Math.max(lifeRows * 24 + 20, MIN_LIFE_H) : 0;

    // Feasibility check, not a hardcoded lane count: can the checked lanes fill the viewport at
    // comfortable (content-driven books/life, minimum event lane) heights, or would that squeeze an
    // event lane thinner than its reasonable minimum? Using the actual content-driven books/life
    // heights here (not just their floors) matters — a books band with many rows can itself eat
    // enough of `avail` to push event lanes below the minimum even when only 2-3 lanes are checked,
    // and conversely a roomy viewport can comfortably fill even 4-5 lanes without scrolling at all.
    // Robbie's "~2-3 lanes fit comfortably, 4-5 need to scroll" guidance describes the typical
    // outcome of this math at typical viewport heights — it's not baked in as a fixed count.
    const requiredMin = booksContentH + lifeContentH + nEvent * MIN_EVENT_LANE_H;
    const needsScroll = requiredMin > avail;

    let booksH: number;
    let lifeH: number;
    let laneH: number;
    let contentH: number;

    if (!needsScroll) {
      // Comfortable mode: the checked lanes fill the full viewport height exactly (no scroll),
      // each getting MORE room than the old fixed 5-lane split since hidden lanes contribute nothing.
      booksH = booksContentH;
      lifeH = lifeContentH;
      const remaining = Math.max(avail - booksH - lifeH, 0);
      if (nEvent > 0) {
        laneH = remaining / nEvent;
      } else {
        // Only the books band and/or lifespans lane are checked — let them stretch into the
        // freed-up space rather than sit at their minimum content height.
        laneH = 0;
        const stretchers = (showBooks ? 1 : 0) + (showLife ? 1 : 0);
        if (stretchers > 0 && remaining > 0) {
          const extra = remaining / stretchers;
          if (showBooks) booksH += extra;
          if (showLife) lifeH += extra;
        }
      }
      contentH = avail;
    } else {
      // Scroll mode: books/lifespans keep their content-driven height, event lanes get a flat
      // reasonable minimum, and the lane stack's total height can exceed the viewport — the
      // viewport wrapper (.tl-canvas-viewport) scrolls vertically to reach whatever's checked.
      booksH = booksContentH;
      lifeH = lifeContentH;
      laneH = MIN_EVENT_LANE_H;
      contentH = booksH + lifeH + nEvent * laneH;
    }

    const laneTop = new Map<TimelineEventCategory, number>();
    let cursor = booksH + lifeH;
    for (const lane of visibleEventLanes) {
      laneTop.set(lane.cat, cursor);
      cursor += laneH;
    }

    return {
      empty: false as const,
      booksTop: 0,
      booksH,
      lifeTop: booksH,
      lifeH,
      laneTop,
      laneH,
      axisTop: contentH,
      totalH: contentH + AXIS_H,
      needsScroll,
    };
  }, [size.h, bookPack.rowCount, lifePack.rowCount, visibleLanes]);

  const pxPerYear = view?.pxPerYear ?? 0;

  /* ----- world-space layers, memoized per zoom level -----
   * Pan only changes translateX on the scroller — these element trees are
   * reused untouched frame-to-frame during a drag, so React reconciliation
   * is near-free while panning. They rebuild only when zoom changes. */

  const booksLayer = useMemo<ReactNode>(() => {
    if (!geom || geom.empty || geom.booksH <= 0 || pxPerYear <= 0) return null;
    const rowH = (geom.booksH - 22) / Math.max(bookPack.rowCount, 1);
    const barH = clamp(rowH - 1.5, 3.5, 13);

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
        const y = geom.booksTop + 18 + row * rowH;
        const range = formatYearRange(item.startYear, item.endYear);
        const inside = w > 58 && barH >= 9;

        // Same label-gap guard the lifespans lane uses: skip the book name if a same-row
        // neighbor doesn't leave enough clear horizontal space on either side.
        const prevX = i > 0 ? (rowItems[i - 1].item.startYear - minYear) * pxPerYear : -Infinity;
        const nextX =
          i < rowItems.length - 1
            ? (rowItems[i + 1].item.startYear - minYear) * pxPerYear
            : Infinity;
        const hasGap = x - prevX > LABEL_GAP_PX && nextX - x > LABEL_GAP_PX;

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
            {hasGap && (
              <span className={`tl-book-bar-label${inside ? "" : " tl-book-bar-label-outside"}`}>
                {item.book}
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
    const rowH = (geom.lifeH - 22) / Math.max(lifePack.rowCount, 1);
    const barH = clamp(rowH - 3, 8, 16);

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
        const y = geom.lifeTop + 18 + row * rowH + (rowH - barH) / 2;
        const label =
          item.lifespanLabel ??
          (typeof item.diedYear === "number"
            ? formatYearRange(item.bornYear, item.diedYear)
            : `b. ${formatYear(item.bornYear)}`);
        const inside = w > 72;

        // Same label-gap guard the events lane uses: skip the name if a same-row neighbor
        // doesn't leave enough clear horizontal space on either side, so labels don't pile up
        // into an unreadable smear at full zoom-out on narrow viewports.
        const prevX = i > 0 ? (rowItems[i - 1].item.bornYear - minYear) * pxPerYear : -Infinity;
        const nextX =
          i < rowItems.length - 1 ? (rowItems[i + 1].item.bornYear - minYear) * pxPerYear : Infinity;
        const hasGap = x - prevX > LABEL_GAP_PX && nextX - x > LABEL_GAP_PX;

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
            {barH >= 10 && hasGap && (
              <span className={`tl-life-label${inside ? "" : " tl-life-label-outside"}`}>
                {item.name}
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

    for (const lane of LANES) {
      const { cat } = lane;
      // Hidden lane: geom never allocated it a top offset — skip clustering/label math for it
      // entirely rather than computing work for something that won't render.
      const laneTop = geom.laneTop.get(cat);
      if (laneTop === undefined) continue;
      const laneEvents = events
        .filter((e) => e.category === cat)
        .sort((a, b) => a.startYear - b.startYear);
      const centerY = laneTop + geom.laneH / 2;

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
              yOff: clamp((i - (group.length - 1) / 2) * 15, -geom.laneH / 2 + 10, geom.laneH / 2 - 10),
            });
          });
        }
      }

      items.sort((a, b) => a.x - b.x);

      // Range-bar events get their own label-gap check, scoped to just the bars in this lane —
      // a bar's title only competes for space with other bar titles, not with the marker dots or
      // cluster badges that may sit right next to it. Same neighbor-gap heuristic the lifespans
      // lane uses (see lifespansLayer above / the books band above that), just scoped to bars.
      const barIds: string[] = [];
      const barXs: number[] = [];
      for (const it of items) {
        if (it.kind === "single" && typeof it.e.endYear === "number" && it.e.endYear > it.e.startYear) {
          barIds.push(it.e.id);
          barXs.push(it.x);
        }
      }
      const barHasGap = new Map<string, boolean>();
      for (let bi = 0; bi < barIds.length; bi++) {
        const prevBarX = bi > 0 ? barXs[bi - 1] : -Infinity;
        const nextBarX = bi < barXs.length - 1 ? barXs[bi + 1] : Infinity;
        barHasGap.set(
          barIds[bi],
          barXs[bi] - prevBarX > LABEL_GAP_PX && nextBarX - barXs[bi] > LABEL_GAP_PX,
        );
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
  }, [geom, pxPerYear, events, minYear, onSelectTimelineEvent, zoomToYearRange, showTip, hideTip, focusedEventIds]);

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
        <button type="button" className="tl-back-btn" onClick={onClose} aria-label="Close timeline">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10.5 3 5.5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="tl-back-label">Back</span>
        </button>
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
       * overflow stays clipped here so a taller-than-viewport lane stack (scroll mode, see geom
       * above) doesn't widen the page. This is what's measured for available layout height/width —
       * the inner .tl-canvas below is sized explicitly from `geom` and can grow past it. */}
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
                  style={{ top: geom.laneTop.get(lane.cat), height: geom.laneH }}
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
                    style={{ left: (y - minYear) * view.pxPerYear, height: geom.axisTop }}
                  />
                ))}
                {booksLayer}
                {lifespansLayer}
                {eventsLayer}
                <div className="tl-axis-strip" style={{ top: geom.axisTop, height: AXIS_H }} />
                {ticks.map((y) => (
                  <span
                    key={`t${y}`}
                    className={`tl-axis-label${y === 0 ? " tl-axis-epoch" : ""}`}
                    style={{
                      left: (y - minYear) * view.pxPerYear,
                      top: geom.axisTop,
                      height: AXIS_H,
                      lineHeight: `${AXIS_H}px`,
                      zIndex: 6,
                    }}
                  >
                    {y === 0 ? "BC · AD" : formatYear(y)}
                  </span>
                ))}
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

      <footer className="tl-legend">
        {LANES.filter((lane) => visibleLanes[lane.cat]).map((lane) => (
          <span key={lane.cat} className="tl-legend-item">
            <span className="tl-legend-dot" style={{ background: lane.cssVar }} aria-hidden="true" />
            {lane.label}
          </span>
        ))}
        {visibleLanes.books && (
          <span className="tl-legend-item">
            <span
              className="tl-legend-swatch"
              style={{ background: "rgba(var(--tl-book-rgb), 0.3)", border: "1px solid rgba(var(--tl-book-rgb), 0.45)" }}
              aria-hidden="true"
            />
            Book writing windows
          </span>
        )}
        {hasLifespans && (
          <span className="tl-legend-item">
            <span
              className="tl-legend-swatch"
              style={{
                background: "rgba(var(--tl-life-rgb), 0.25)",
                border: "1px solid rgba(var(--tl-life-rgb), 0.6)",
                borderRadius: 100,
              }}
              aria-hidden="true"
            />
            Lifespans
          </span>
        )}
        <span className="tl-legend-note">
          Book bands{hasLifespans ? " and lifespan bars" : ""} are separate layers above the three
          event lanes.
        </span>
        <span className="tl-legend-hint">Scroll to zoom · drag to pan · click a dot for details</span>
      </footer>
    </section>
  );
}

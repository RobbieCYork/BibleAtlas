import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { timelineEvents } from "../data/timelineEvents";
import { bookWritingWindows } from "../data/bookWritingWindows";
import type { BookWritingWindow } from "../data/bookWritingWindows";
import { people } from "../data/people";
import type { Person, TimelineEvent, TimelineEventCategory } from "../data/types";
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
 * Interactions: wheel = zoom-to-cursor · drag = pan · pinch = zoom (touch) ·
 * +/−/Fit buttons · double-click = zoom in at point · cluster badge click =
 * animated zoom into that bucket's year range.
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

const LANES: { cat: TimelineEventCategory; label: string; cssVar: string }[] = [
  { cat: "biblical", label: "Biblical", cssVar: "var(--tl-biblical)" },
  { cat: "world", label: "World History", cssVar: "var(--tl-world)" },
  { cat: "religion", label: "Other Religions", cssVar: "var(--tl-religion)" },
];

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
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [dragging, setDragging] = useState(false);

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
    const el = canvasRef.current;
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

  const animateTo = useCallback(
    (target: View) => {
      cancelAnim();
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
      const DURATION = 260;
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
    [cancelAnim, clampView],
  );

  useEffect(() => cancelAnim, [cancelAnim]);

  /* ----- entity focus (opened via "View in Timeline") ----- */

  // Everything on the timeline belonging to the focused entity: its associated events
  // (primaryEntityIds match) and its lifespan bar, plus the year range they collectively span.
  const focusInfo = useMemo(() => {
    if (!focusEntityId) return null;
    const eventIds = new Set<string>();
    const ys: number[] = [];
    for (const e of events) {
      if (e.primaryEntityIds?.includes(focusEntityId)) {
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
  });
  const pendingRef = useRef({ dx: 0, wheel: 0, wheelClientX: 0 });
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

  // Wheel must be a non-passive native listener so preventDefault sticks.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnim();
      const scale = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 120 : 1;
      pendingRef.current.wheel += e.deltaY * scale;
      pendingRef.current.wheelClientX = e.clientX;
      scheduleFlush();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cancelAnim, scheduleFlush]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      // NOTE: no setPointerCapture here — capturing on pointerdown would retarget
      // the subsequent `click` to the canvas and swallow marker/cluster clicks.
      // Capture starts lazily in onPointerMove once a real drag begins.
      g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelAnim();
      if (g.pointers.size === 1) {
        g.lastX = e.clientX;
        g.moved = 0;
        g.suppressClick = false;
        g.captured = false;
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
      }
    },
    [cancelAnim],
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
        scheduleFlush();
      }
    },
    [scheduleFlush],
  );

  const endPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size < 2) g.pinch = null;
    if (g.pointers.size === 1) {
      // Hand-off from pinch back to one-finger pan without a jump.
      g.lastX = [...g.pointers.values()][0].x;
    }
    if (g.pointers.size === 0) {
      setDragging(false);
      g.suppressClick = g.moved > 6;
    }
  }, []);

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
        setView(clampView(v.pxPerYear, v.startYear - panYears));
      } else if (e.key === "ArrowRight") {
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
    [clampView, animateTo, fitView],
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

  const bookPack = useMemo(
    () => packRows(BOOK_WINDOWS, (w) => w.startYear, (w) => w.endYear),
    [],
  );

  const lifePack = useMemo(
    () => packRows(lifespans, (l) => l.bornYear, (l) => lifespanEnd(l)),
    [lifespans],
  );

  const geom = useMemo(() => {
    const h = size.h;
    if (h <= 0) return null;
    const avail = h - AXIS_H;
    const bookRows = Math.max(bookPack.rowCount, 1);
    const lifeRows = lifePack.rowCount;
    const booksH = clamp(bookRows * 9 + 20, 56, Math.max(72, avail * 0.3));
    const lifeH = lifeRows > 0 ? clamp(lifeRows * 24 + 20, 46, avail * 0.22) : 0;
    const lanesTop = booksH + lifeH;
    const laneH = Math.max((avail - lanesTop) / LANES.length, 46);
    return {
      booksTop: 0,
      booksH,
      lifeTop: booksH,
      lifeH,
      laneTops: LANES.map((_, i) => lanesTop + i * laneH),
      laneH,
      axisTop: avail,
    };
  }, [size.h, bookPack.rowCount, lifePack.rowCount]);

  const pxPerYear = view?.pxPerYear ?? 0;

  /* ----- world-space layers, memoized per zoom level -----
   * Pan only changes translateX on the scroller — these element trees are
   * reused untouched frame-to-frame during a drag, so React reconciliation
   * is near-free while panning. They rebuild only when zoom changes. */

  const booksLayer = useMemo<ReactNode>(() => {
    if (!geom || pxPerYear <= 0) return null;
    const rowH = (geom.booksH - 22) / Math.max(bookPack.rowCount, 1);
    const barH = clamp(rowH - 1.5, 3.5, 13);
    return bookPack.placed.map(({ item, row }) => {
      const x = (item.startYear - minYear) * pxPerYear;
      const w = Math.max((item.endYear - item.startYear) * pxPerYear, 3.5);
      const y = geom.booksTop + 18 + row * rowH;
      const range = formatYearRange(item.startYear, item.endYear);
      return (
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
          {w > 58 && barH >= 9 && <span className="tl-book-bar-label">{item.book}</span>}
        </button>
      );
    });
  }, [geom, pxPerYear, bookPack, minYear, onSelectBook, showTip, hideTip]);

  const lifespansLayer = useMemo<ReactNode>(() => {
    if (!geom || geom.lifeH <= 0 || pxPerYear <= 0) return null;
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
    if (!geom || pxPerYear <= 0) return null;
    const nodes: ReactNode[] = [];

    for (let li = 0; li < LANES.length; li++) {
      const { cat } = LANES[li];
      const laneEvents = events
        .filter((e) => e.category === cat)
        .sort((a, b) => a.startYear - b.startYear);
      const centerY = geom.laneTops[li] + geom.laneH / 2;

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
              {showTitle && barW > 46 && <span className="tl-marker-title">{e.title}</span>}
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
  const hasLifespans = geom !== null && geom.lifeH > 0;

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

      <div
        ref={canvasRef}
        className={`tl-canvas${dragging ? " tl-dragging" : ""}`}
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
        {geom && view && (
          <>
            {/* Pinned lane tints + separators (do not pan). */}
            <div
              className="tl-lane-underlay tl-band-books"
              style={{ top: geom.booksTop, height: geom.booksH }}
            />
            {hasLifespans && (
              <div
                className="tl-lane-underlay tl-band-life"
                style={{ top: geom.lifeTop, height: geom.lifeH }}
              />
            )}
            {LANES.map((lane, i) => (
              <div
                key={lane.cat}
                className={`tl-lane-underlay tl-lane-${lane.cat}`}
                style={{ top: geom.laneTops[i], height: geom.laneH }}
              />
            ))}

            {/* Pinned lane name chips. */}
            <span className="tl-lane-label" style={{ top: geom.booksTop + 5 }}>
              Books of the Bible
            </span>
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
            {LANES.map((lane, i) => (
              <span key={lane.cat} className="tl-lane-label" style={{ top: geom.laneTops[i] + 5 }}>
                <span
                  className="tl-lane-label-dot"
                  style={{ background: lane.cssVar }}
                  aria-hidden="true"
                />
                {lane.label}
              </span>
            ))}

            {/* The panning world surface — translateX only, never scaled. */}
            <div className="tl-scroller" style={{ transform: `translateX(${translateX}px)` }}>
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

      <footer className="tl-legend">
        {LANES.map((lane) => (
          <span key={lane.cat} className="tl-legend-item">
            <span className="tl-legend-dot" style={{ background: lane.cssVar }} aria-hidden="true" />
            {lane.label}
          </span>
        ))}
        <span className="tl-legend-item">
          <span
            className="tl-legend-swatch"
            style={{ background: "rgba(var(--tl-book-rgb), 0.3)", border: "1px solid rgba(var(--tl-book-rgb), 0.45)" }}
            aria-hidden="true"
          />
          Book writing windows
        </span>
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

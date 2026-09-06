import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatPeriod, type GrowthBucket, type GrowthPoint } from "../lib/growthApi";
import { formatDuration } from "../lib/adminApi";

/* ============================================================================
 * A single-series column chart, hand-rolled in SVG.
 *
 * WHY NOT A CHART LIBRARY. The app ships no charting dependency and this is one
 * series of at most 60 columns. Recharts is ~120KB gzipped onto every user's
 * first load so that two admins can look at a bar chart; the console's existing
 * `Bar` component made the same call for the same reason.
 *
 * FORM. The data's job is "how many in each period" — discrete buckets, one
 * series — which is a column chart, not a line (a line implies a continuous
 * reading between two Tuesdays). The running-total view is the same columns
 * re-valued, deliberately NOT a second series on a second axis: a per-period
 * count and a cumulative total differ by orders of magnitude, and putting them
 * on one plot with two scales is the most misleading thing a chart can do. One
 * at a time, one axis, a toggle between them.
 *
 * COLOR. One series, so one hue and no legend (the panel heading names it): the
 * app's own lapis, stepped per theme and validated against each theme's real
 * panel surface — light #3b5bbf on #ffffff, dark #6474ce on #1e1a15 — for
 * lightness band, chroma floor and >=3:1 contrast. Both steps live as CSS custom
 * properties in index.css, in both theme blocks; nothing here hardcodes a hex,
 * so the theme toggle moves them.
 *
 * WHY THE VIEWBOX IS MEASURED RATHER THAN FIXED. A fixed viewBox scaled to fit
 * either distorts the type and the rounded bar ends (preserveAspectRatio="none")
 * or collapses to ~117px tall on a 375px iPhone. Measuring the container and
 * drawing 1:1 keeps text crisp at every width, and makes the mark spec's "cap
 * bars at 24px" an actual 24 pixels rather than 24 arbitrary units.
 *
 * ACCESSIBILITY. The tooltip never gates a value: every number is also in the
 * table underneath, the peak and latest are direct-labelled, and the columns
 * take keyboard focus with a roving tabindex — one tab stop, arrow keys to move,
 * so 60 columns don't become 60 tab stops.
 * ========================================================================== */

const H = 220;
const PAD_T = 18;
const PAD_B = 26;
const PLOT_H = H - PAD_T - PAD_B;
const MAX_BAR = 24; // never fill the slot — the leftover band is air, per the mark spec
const GAP = 2; // the surface gap that separates neighbours instead of a border

/** A clean gridline interval at or above `x`: 1, 2, 3, 4, 5, 6, 8 or 10 × 10^n.
 *  All integers, because every series here is a count (or seconds) and an axis
 *  labelled 2.5 / 5 / 7.5 for a chart of notes written is nonsense. */
function niceStep(x: number): number {
  const mag = 10 ** Math.floor(Math.log10(x));
  const n = x / mag;
  const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10;
  return s * mag;
}

/** The axis top. Derived from the gridline interval rather than picked directly,
 *  so the ticks land on round numbers AND the tallest bar still fills most of the
 *  plot. Choosing the top first is the obvious way and it wastes the chart: a peak
 *  of 234 snapped up to "a nice 500" leaves the data using half the height. Going
 *  via the step gives 240 — same round ticks, twice the chart. Small counts are
 *  special-cased to whole numbers because a peak of 3 wants an axis of 3, not 4. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  if (v <= 6) return Math.ceil(v);
  return niceStep(v / 4) * 4;
}

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}K`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** Bars with a 4px rounded data-end and a square foot on the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const base = y + h;
  const r = Math.min(4, w / 2, h);
  return `M${x},${base} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${base} Z`;
}

/** Every position the chart draws, as a pure function of the width and the data.
 *
 *  Extracted from the component on purpose: it is the part with arithmetic in it,
 *  and it is the part that has to be right on a 375px iPhone as well as a desktop
 *  panel. As a pure function it can be checked at both widths without a browser —
 *  bars inside the plot, bar width inside the mark spec, axis labels thinned
 *  enough not to collide — which is the difference between "it compiled" and
 *  "the geometry holds at the width he actually reads it on". */
export function chartLayout(width: number, values: number[]) {
  // A narrow phone can't spare 44px for a y-axis gutter the way a desktop can.
  const padL = width < 420 ? 34 : 44;
  const padR = 12;
  const plotW = Math.max(40, width - padL - padR);
  const n = values.length;
  const rawMax = Math.max(...values, 0);
  const axisMax = niceMax(rawMax);
  const slot = n > 0 ? plotW / n : plotW;
  const barW = Math.max(1, Math.min(MAX_BAR, slot - GAP));

  const xOf = (i: number) => padL + i * slot + (slot - barW) / 2;
  const yOf = (v: number) => PAD_T + PLOT_H - (axisMax > 0 ? (v / axisMax) * PLOT_H : 0);

  // Gridlines including the baseline — enough to read a value off, few enough to
  // stay recessive. A tiny axis gets a line per whole number instead of quarters,
  // which would otherwise round to duplicates ("0, 1, 2, 2" for an axis of 3).
  const ticks =
    axisMax <= 6
      ? Array.from({ length: axisMax + 1 }, (_, i) => i)
      : [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(axisMax * f));

  // X labels, thinned so they never collide: roughly one per 62px.
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 62))));
  const candidates = values.map((_, i) => (i === n - 1 || i % labelEvery === 0 ? i : -1)).filter((i) => i >= 0);
  // Drop the second-to-last tick when the final one would sit on top of it.
  const shownX = candidates.filter((i, k) => i === n - 1 || (candidates[k + 1] ?? Infinity) - i >= labelEvery);

  // Direct labels: the peak and the final period only. Any more and they stop working.
  const peakIndex = values.indexOf(rawMax);
  const directLabels = new Set<number>();
  if (rawMax > 0) {
    directLabels.add(n - 1);
    if (peakIndex >= 0 && Math.abs(peakIndex - (n - 1)) * slot > 52) directLabels.add(peakIndex);
  }

  return { padL, padR, plotW, n, rawMax, axisMax, slot, barW, xOf, yOf, ticks, shownX, directLabels };
}

/** The rendered width of the chart, so the SVG can draw at 1:1. Starts at a
 *  sensible desktop width so the first paint isn't a 0-wide chart, then tracks
 *  the container — including the admin sheet being resized or rotated. */
function useMeasuredWidth(initial = 640) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export interface GrowthChartProps {
  points: GrowthPoint[];
  bucket: GrowthBucket;
  /** "value" = how many in each period. "cumulative" = the running total. */
  mode: "value" | "cumulative";
  unit: "count" | "seconds";
  label: string;
  /** First date this metric has any data. Drawn as a boundary so a run of
   *  structural zeros can't be misread as a run of quiet days. */
  historyFrom?: string | null;
}

export default function GrowthChart({ points, bucket, mode, unit, label, historyFrom }: GrowthChartProps) {
  const { ref, width } = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const rectsRef = useRef<(SVGRectElement | null)[]>([]);
  const titleId = useId();

  const values = useMemo(() => points.map((p) => (mode === "cumulative" ? p.cumulative : p.value)), [points, mode]);
  const { padL, padR, n, rawMax, slot, barW, xOf, yOf, ticks, shownX, directLabels } = useMemo(
    () => chartLayout(width, values),
    [width, values]
  );

  useEffect(() => {
    setFocusIndex((i) => Math.min(i, Math.max(0, points.length - 1)));
  }, [points.length]);

  const fmt = (v: number) => (unit === "seconds" ? formatDuration(v) : v.toLocaleString());
  const fmtAxis = (v: number) =>
    unit === "seconds" ? (v >= 3600 ? `${Math.round(v / 3600)}h` : v >= 60 ? `${Math.round(v / 60)}m` : `${v}s`) : compact(v);

  // Where recorded history begins, if that boundary falls inside this window.
  const historyIndex = useMemo(() => {
    if (!historyFrom || n === 0) return -1;
    if (historyFrom <= points[0].period_start) return -1;
    const idx = points.findIndex((p) => p.period_start >= historyFrom);
    return idx > 0 ? idx : -1;
  }, [historyFrom, points, n]);

  const moveFocus = (delta: number) => {
    const next = Math.min(n - 1, Math.max(0, focusIndex + delta));
    setFocusIndex(next);
    setHover(next);
    rectsRef.current[next]?.focus();
  };

  return (
    <div className="growth-chart" ref={ref}>
      <div className="growth-chart-plot">
        <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} className="growth-svg" role="img" aria-labelledby={titleId}>
          <title id={titleId}>
            {label} by {bucket}
            {mode === "cumulative" ? ", running total" : ""}. {n} periods, highest {fmt(rawMax)}.
          </title>

          {/* Gridlines — solid hairlines, one step off the surface, never dashed. */}
          {ticks.map((t) => (
            <line
              key={`g${t}`}
              x1={padL}
              x2={width - padR}
              y1={yOf(t)}
              y2={yOf(t)}
              className={t === 0 ? "growth-axis" : "growth-grid"}
            />
          ))}
          {ticks.map((t) => (
            <text key={`t${t}`} x={padL - 8} y={yOf(t) + 4} className="growth-tick" textAnchor="end">
              {fmtAxis(t)}
            </text>
          ))}

          {/* The "nothing was recorded before here" boundary. */}
          {historyIndex > 0 && (
            <line
              x1={padL + historyIndex * slot - GAP / 2}
              x2={padL + historyIndex * slot - GAP / 2}
              y1={PAD_T}
              y2={PAD_T + PLOT_H}
              className="growth-boundary"
            />
          )}

          {/* The data. */}
          {points.map((p, i) => {
            const v = values[i];
            if (v <= 0) return null;
            const y = yOf(v);
            return (
              <path
                key={p.period_start}
                d={barPath(xOf(i), y, barW, PAD_T + PLOT_H - y)}
                className={`growth-bar${hover === i ? " growth-bar-active" : ""}`}
              />
            );
          })}

          {/* Selective direct labels — the peak and the latest period. */}
          {[...directLabels].map((i) => {
            const v = values[i];
            if (v <= 0) return null;
            const cx = xOf(i) + barW / 2;
            return (
              <text
                key={`d${i}`}
                x={Math.min(width - padR, Math.max(padL, cx))}
                y={Math.max(PAD_T - 4, yOf(v) - 5)}
                className="growth-value-label"
                textAnchor={cx > width - 40 ? "end" : cx < padL + 20 ? "start" : "middle"}
              >
                {fmtAxis(v)}
              </text>
            );
          })}

          {/* X labels. */}
          {shownX.map((i) => (
            <text
              key={`x${i}`}
              x={Math.min(width - padR, xOf(i) + barW / 2)}
              y={H - 8}
              className="growth-tick"
              textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}
            >
              {formatPeriod(points[i].period_start, bucket)}
            </text>
          ))}

          {/* Hit targets — wider than the marks, and focusable with a roving
              tabindex so the keyboard reads exactly what the pointer does. */}
          {points.map((p, i) => (
            <rect
              key={`h${p.period_start}`}
              ref={(el) => {
                rectsRef.current[i] = el;
              }}
              x={padL + i * slot}
              y={PAD_T}
              width={slot}
              height={PLOT_H}
              className="growth-hit"
              tabIndex={i === focusIndex ? 0 : -1}
              role="button"
              aria-label={`${formatPeriod(p.period_start, bucket, true)}: ${fmt(values[i])}`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => {
                setFocusIndex(i);
                setHover(i);
              }}
              onBlur={() => setHover(null)}
              onKeyDown={(e) => {
                const map: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -n, End: n };
                const d = map[e.key];
                if (d === undefined) return;
                e.preventDefault();
                moveFocus(d);
              }}
            />
          ))}
        </svg>

        {/* Value leads, label follows — the reader already has the series. */}
        {hover !== null && points[hover] && (
          <div
            className="growth-tooltip"
            style={{ left: `${Math.min(92, Math.max(8, ((padL + hover * slot + slot / 2) / width) * 100))}%` }}
            role="status"
          >
            <strong>{fmt(values[hover])}</strong>
            <span>{formatPeriod(points[hover].period_start, bucket, true)}</span>
          </div>
        )}
      </div>

      {rawMax === 0 && <p className="admin-note growth-empty-note">Nothing recorded in any of these {n} periods.</p>}
    </div>
  );
}

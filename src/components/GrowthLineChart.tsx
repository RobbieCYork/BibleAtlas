import { useId, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { chartLayout, H, PAD_T, PLOT_H, useMeasuredWidth } from "./GrowthChart";
import {
  addDays,
  addedText,
  daysBetween,
  fullDay,
  noon,
  shortDay,
  type GrowthLinePoint,
  type GrowthStep,
} from "../lib/registeredGrowth";

/* A running total over calendar time, as a line: GrowthChart's hand-rolled SVG, gridlines, tooltip
 * and theme tokens, with a true date axis. One series, so one hue and no legend. The whole plot is
 * the hit target: a pointer or finger anywhere reads the nearest point, and the arrow keys step
 * through every point. The same numbers are in the table under the chart. */

export default function GrowthLineChart({ points, step }: { points: GrowthLinePoint[]; step: GrowthStep }) {
  const { ref, width } = useMeasuredWidth();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const n = points.length;
  const values = useMemo(() => points.map((p) => p.total), [points]);
  const { padL, padR, plotW, yOf, ticks } = useMemo(() => chartLayout(width, values), [width, values]);

  const first = points[0].date;
  const span = daysBetween(first, points[n - 1].date);
  // Inset so the end markers aren't cut by the axis or the edge. A single day sits in the middle.
  const x0 = padL + 5;
  const xSpan = plotW - 10;
  const xAt = (date: string) => (span === 0 ? padL + plotW / 2 : x0 + (daysBetween(first, date) / span) * xSpan);

  // Evenly spaced calendar dates, about one per 74px, always including both ends.
  const xTicks = useMemo(() => {
    if (span === 0) return [first];
    const count = Math.min(span + 1, Math.max(2, Math.floor(plotW / 74)));
    return Array.from(new Set(Array.from({ length: count }, (_, i) => addDays(first, Math.round((i * span) / (count - 1))))));
  }, [first, span, plotW]);
  const tickText = (iso: string) =>
    span > 300 ? `${noon(iso).toLocaleDateString(undefined, { month: "short" })} ’${iso.slice(2, 4)}` : shortDay(iso);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(p.date).toFixed(1)},${yOf(p.total).toFixed(1)}`).join(" ");
  const last = points[n - 1];
  // A range switch can leave a remembered index past the end of the new series.
  const shown = active !== null && active < n ? active : null;
  const current = shown ?? n - 1;

  const nearest = (e: ReactPointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * width;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(xAt(points[i].date) - x) < Math.abs(xAt(points[best].date) - x)) best = i;
    setActive(best);
  };

  const describe = (i: number) => `${fullDay(points[i].date)}: ${points[i].total.toLocaleString()} registered, ${addedText(points, i)}`;

  return (
    <div className="growth-chart" ref={ref}>
      <div className="growth-chart-plot">
        <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} className="growth-svg growth-line-svg" role="group" aria-labelledby={titleId}>
          <title id={titleId}>
            Registered accounts, running total by {step}, {fullDay(first)} to {fullDay(last.date)}: from {points[0].total} to{" "}
            {last.total}.
          </title>

          {ticks.map((t) => (
            <line key={`g${t}`} x1={padL} x2={width - padR} y1={yOf(t)} y2={yOf(t)} className={t === 0 ? "growth-axis" : "growth-grid"} />
          ))}
          {ticks.map((t) => (
            <text key={`t${t}`} x={padL - 8} y={yOf(t) + 4} className="growth-tick" textAnchor="end">
              {t.toLocaleString()}
            </text>
          ))}
          {xTicks.map((d, i) => (
            <text
              key={d}
              x={xAt(d)}
              y={H - 8}
              className="growth-tick growth-tick-x"
              textAnchor={span === 0 ? "middle" : i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            >
              {tickText(d)}
            </text>
          ))}

          {shown !== null && (
            <line x1={xAt(points[shown].date)} x2={xAt(points[shown].date)} y1={PAD_T} y2={PAD_T + PLOT_H} className="growth-crosshair" />
          )}

          {n > 1 && <path d={line} className="growth-line" />}

          {/* The latest point, always marked and labelled. */}
          <circle cx={xAt(last.date)} cy={yOf(last.total)} r={4} className="growth-dot" />
          <text x={xAt(last.date) + (span === 0 ? 0 : 4)} y={Math.max(11, yOf(last.total) - 9)} className="growth-value-label" textAnchor={span === 0 ? "middle" : "end"}>
            {last.total.toLocaleString()}
          </text>
          {shown !== null && <circle cx={xAt(points[shown].date)} cy={yOf(points[shown].total)} r={5} className="growth-dot growth-dot-active" />}

          <rect
            x={padL}
            y={0}
            width={plotW}
            height={PAD_T + PLOT_H}
            className="growth-hit growth-line-hit"
            tabIndex={0}
            role="slider"
            aria-label="Point on the growth line. Arrow keys move through the dates."
            aria-valuemin={1}
            aria-valuemax={n}
            aria-valuenow={current + 1}
            aria-valuetext={describe(current)}
            onPointerDown={nearest}
            onPointerMove={nearest}
            // A finger lifting also "leaves": keep a tapped value on screen until focus moves on.
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            onFocus={() => setActive((a) => a ?? n - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              const delta: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, Home: -n, End: n };
              const d = delta[e.key];
              if (d === undefined) return;
              e.preventDefault();
              setActive(Math.min(n - 1, Math.max(0, current + d)));
            }}
          />
        </svg>

        {shown !== null && (
          <div
            className="growth-tooltip growth-line-tooltip"
            // Beside the crosshair, on whichever side has room, so it never leaves the chart.
            style={
              xAt(points[shown].date) > width / 2
                ? { right: `${width - xAt(points[shown].date) + 8}px` }
                : { left: `${xAt(points[shown].date) + 8}px` }
            }
            role="status"
          >
            <strong>{points[shown].total.toLocaleString()} registered</strong>
            <span>{fullDay(points[shown].date)}</span>
            <span>{addedText(points, shown)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

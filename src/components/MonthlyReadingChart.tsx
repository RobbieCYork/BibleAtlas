import { useState } from "react";
import type { MonthlyChapterCount } from "../lib/supabase";

interface MonthlyReadingChartProps {
  /** Oldest first, current month last (chaptersReadByMonth's order). */
  months: MonthlyChapterCount[];
}

const monthShort = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });
const monthLong = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
const chapters = (n: number) => `${n} ${n === 1 ? "chapter" : "chapters"}`;

/** Round the axis top up to a 1/2/5 × 10^n step so the single gridline carries a clean number. */
function niceMax(n: number): number {
  if (n <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(n));
  for (const step of [1, 2, 5, 10]) if (step * mag >= n) return step * mag;
  return 10 * mag;
}

/** Chapters read per month for the last 12 months, single series, one axis. Each bar is a button
 * spanning the full column height so it is tappable on a phone; the selected month's exact figure
 * sits in the readout line above the plot (defaults to the current month), so no value is printed
 * on every bar. A visually hidden table carries the same numbers for screen readers. */
export default function MonthlyReadingChart({ months }: MonthlyReadingChartProps) {
  const [selected, setSelected] = useState(months.length - 1);
  const top = niceMax(Math.max(0, ...months.map((m) => m.count)));
  const sel = months[selected];

  return (
    <div className="monthly-reading">
      <div className="monthly-reading-head">
        <span className="monthly-reading-title">Chapters read per month</span>
        {sel && (
          <span className="monthly-reading-readout" aria-live="polite">
            {monthLong(sel.monthStart)}: <strong>{sel.count}</strong>
          </span>
        )}
      </div>
      <div className="monthly-reading-plot" aria-hidden="true">
        <span className="monthly-reading-axis-top">{top}</span>
        <div className="monthly-reading-bars">
          {months.map((m, i) => (
            <button
              key={m.monthStart.toISOString()}
              type="button"
              tabIndex={-1}
              className={`monthly-reading-col${i === selected ? " monthly-reading-col-selected" : ""}`}
              onClick={() => setSelected(i)}
              onMouseEnter={() => setSelected(i)}
              title={`${monthLong(m.monthStart)}: ${chapters(m.count)}`}
            >
              <span
                className="monthly-reading-bar"
                style={{ height: m.count > 0 ? `max(${(m.count / top) * 100}%, 3px)` : 0 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="monthly-reading-labels" aria-hidden="true">
        {months.map((m, i) => (
          <span
            key={m.monthStart.toISOString()}
            className={i === selected ? "monthly-reading-label-selected" : undefined}
          >
            {monthShort(m.monthStart)}
          </span>
        ))}
      </div>
      <table className="growth-sr-only">
        <caption>Chapters read per month, last {months.length} months</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Chapters read</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.monthStart.toISOString()}>
              <th scope="row">{monthLong(m.monthStart)}</th>
              <td>{m.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

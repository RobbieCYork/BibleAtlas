import { useCallback, useEffect, useId, useRef, useState } from "react";
import GrowthLineChart from "./GrowthLineChart";
import { fetchRegisteredHistory, viewerTimeZone } from "../lib/usageApi";
import {
  addDays,
  addMonths,
  fullDay,
  GROWTH_RANGES,
  linePoints,
  resolveRange,
  stepFor,
  totalAt,
  type GrowthRangeKey,
  type RegisteredHistory,
} from "../lib/registeredGrowth";

/* Directly under "Registered accounts" on the Users tab: that card's number over time. Same accounts
 * (email sign-ups, team included, old guest accounts left out), so the line ends on the card's total.
 * One fetch per visit; changing the range only re-slices it. */
export default function RegisteredGrowthCard() {
  const [history, setHistory] = useState<RegisteredHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeKey, setRangeKey] = useState<GrowthRangeKey>("all");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const reqId = useRef(0);
  const errorId = useId();

  const load = useCallback(() => {
    const id = ++reqId.current;
    setError(null);
    fetchRegisteredHistory()
      .then((h) => reqId.current === id && setHistory(h))
      .catch((e) => reqId.current === id && setError(e instanceof Error ? e.message : "Unknown error."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pick = (key: GrowthRangeKey) => {
    // Custom opens on the last month, so there is a graph to adjust rather than two empty boxes.
    if (key === "custom" && history && !custom.start && !custom.end) {
      const monthAgo = addMonths(history.today, -1);
      const first = history.firstDate ?? monthAgo;
      setCustom({ start: monthAgo > first ? monthAgo : first, end: history.today });
    }
    setRangeKey(key);
  };

  const range = history?.firstDate ? resolveRange(rangeKey, history.today, history.firstDate, custom) : null;
  const step = range?.kind === "ok" ? stepFor(range.start, range.end) : "day";
  const points = history && range?.kind === "ok" ? linePoints(history.counts, range.start, range.end, step) : null;
  const gained =
    history && range?.kind === "ok" ? totalAt(history.counts, range.end) - totalAt(history.counts, addDays(range.start, -1)) : 0;
  const lastPoint = points?.[points.length - 1];

  return (
    <section className="admin-registered-card admin-growth-card" aria-label="Registered account growth">
      <header className="usage-card-head">
        <h4 className="usage-card-title">Growth of registered accounts</h4>
        {lastPoint && history && (
          <p className="usage-headline">
            <strong>{lastPoint.total.toLocaleString()}</strong>{" "}
            <span>
              {lastPoint.date === history.today ? "now" : `on ${fullDay(lastPoint.date)}`} · +{gained.toLocaleString()} in this range
            </span>
          </p>
        )}
      </header>

      {error && (
        <>
          <p className="auth-status auth-error" role="alert">
            Couldn't draw the growth graph. {error}
          </p>
          <button type="button" className="admin-growth-retry" onClick={load}>
            Try again
          </button>
        </>
      )}
      {!history && !error && <p className="admin-note">Loading the graph…</p>}
      {history && !history.firstDate && <p className="admin-note usage-gap">No registered accounts yet, so there is no line to draw.</p>}

      {history?.firstDate && (
        <>
          <div className="admin-window-picker usage-range-picker" role="group" aria-label="Growth date range">
            {GROWTH_RANGES.map((r) => (
              <button key={r.key} type="button" className={rangeKey === r.key ? "active" : ""} aria-pressed={rangeKey === r.key} onClick={() => pick(r.key)}>
                {r.label}
              </button>
            ))}
          </div>

          {rangeKey === "custom" && (
            <div className="admin-growth-dates">
              {(["start", "end"] as const).map((field) => (
                <label key={field}>
                  {field === "start" ? "Start date" : "End date"}
                  <input
                    type="date"
                    value={custom[field]}
                    max={history.today}
                    aria-invalid={range?.kind === "invalid" && range.field === field}
                    aria-describedby={range?.kind === "invalid" && range.field === field ? errorId : undefined}
                    onChange={(e) => setCustom((c) => ({ ...c, [field]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          )}

          {range?.kind === "invalid" && (
            <p id={errorId} className="auth-status auth-error" role="alert">
              {range.message}
            </p>
          )}
          {range?.kind === "before" && (
            <p className="admin-note usage-gap">
              No registered accounts in these dates. The oldest account was created {fullDay(history.firstDate)}.
            </p>
          )}

          {points && range?.kind === "ok" && (
            <>
              {/* Keyed so a value tapped in one range isn't carried into the next. */}
              <GrowthLineChart key={`${range.start}:${range.end}`} points={points} step={step} />
              <p className="admin-note">
                {range.start === range.end ? fullDay(range.start) : `${fullDay(range.start)} – ${fullDay(range.end)}`} · one point
                per {step}
                {step === "week" ? " (Monday start)" : ""} · days run midnight to midnight, your time ({viewerTimeZone()})
                {lastPoint?.date === history.today ? " · today is still in progress" : ""}. Tap or point at the line for a date's
                numbers.
                {range.clamped ? ` The line starts ${fullDay(range.start)}, when the oldest account was created.` : ""}
              </p>
              <details className="growth-table-details">
                <summary>Show the numbers</summary>
                <div className="growth-table-scroll">
                  <table className="growth-table">
                    <thead>
                      <tr>
                        <th scope="col">{step === "day" ? "Day" : step === "week" ? "Through" : "Month through"}</th>
                        <th scope="col">Registered</th>
                        <th scope="col">New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {points
                        .map((p) => (
                          <tr key={p.date}>
                            <th scope="row">{fullDay(p.date)}</th>
                            <td>{p.total.toLocaleString()}</td>
                            <td>+{p.added.toLocaleString()}</td>
                          </tr>
                        ))
                        .reverse()}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}

          <p className="admin-note">
            Same accounts as the card above, team included. Built from the accounts that exist today: a deleted account is gone
            from the whole line, so past totals can be lower than they were at the time.
          </p>
        </>
      )}
    </section>
  );
}

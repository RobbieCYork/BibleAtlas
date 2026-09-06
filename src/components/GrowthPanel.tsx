import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BUCKET_LABELS,
  deltaDirection,
  fetchGrowth,
  formatDelta,
  formatPeriod,
  PERIODS_FOR,
  type GrowthBucket,
  type GrowthData,
  type GrowthMetric,
} from "../lib/growthApi";
import { formatDuration } from "../lib/adminApi";
import GrowthChart from "./GrowthChart";

/* ============================================================================
 * GROWTH — "I want to see how this thing grows over time."
 *
 * THE SHAPE, AND WHY. This is a TABLE by default and a chart on request. Every
 * metric is one row of numbers — this period, last period, the change, the
 * all-time total — and each row has a control that expands a chart underneath
 * it. Nothing draws a chart nobody asked for: on a phone, twenty-seven charts
 * stacked vertically is not a dashboard, it's a scroll.
 *
 * ONE FILTER ROW, ABOVE EVERYTHING. Day / week / month scopes the whole panel,
 * so every row and every open chart always describes the same slice and the
 * numbers can't disagree with each other. There is deliberately no per-chart
 * range control and no chart-configuration UI.
 *
 * WHAT IT REFUSES TO IMPLY. Two things are stated rather than smoothed over:
 *   * A metric whose recording started after launch (sessions and active people
 *     began with migration 019, reading time with the reading tracker) says so,
 *     and its chart draws a boundary at that date. A flat run of zeros before
 *     instrumentation is a gap in the record, not a finding about behaviour, and
 *     the console already makes that distinction elsewhere (AnalyticsSinceNote).
 *   * When migration 026 is not applied, this falls back to the three series
 *     migration 019 can answer and says which three and why — rather than
 *     showing a third of the picture as if it were all of it.
 * ========================================================================== */

const BUCKETS: GrowthBucket[] = ["day", "week", "month"];

/** The order the groups appear in. Anything the catalogue adds later that isn't
 *  listed here still renders, at the end — the list is a preference, not a gate. */
const CATEGORY_ORDER = ["People", "Reading", "Study", "Social", "Feedback"];

const PERIOD_NOUN: Record<GrowthBucket, string> = { day: "day", week: "week", month: "month" };

export default function GrowthPanel() {
  const [bucket, setBucket] = useState<GrowthBucket>("week");
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [modes, setModes] = useState<Record<string, "value" | "cumulative">>({});
  const reqId = useRef(0);

  const load = useCallback(async (b: GrowthBucket) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchGrowth(b);
      // A slower earlier request must not overwrite a newer one — the bucket
      // toggle is three taps away from a race.
      if (reqId.current === id) setData(d);
    } catch (err) {
      if (reqId.current === id) setError(err instanceof Error ? err.message : "Couldn't load the growth history.");
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(bucket);
  }, [bucket, load]);

  const grouped = useMemo(() => {
    const byCat = new Map<string, GrowthMetric[]>();
    for (const m of data?.metrics ?? []) {
      if (!byCat.has(m.category)) byCat.set(m.category, []);
      byCat.get(m.category)!.push(m);
    }
    return [...byCat.entries()].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a[0]);
      const ib = CATEGORY_ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [data]);

  const fmt = (n: number, unit: GrowthMetric["unit"]) => (unit === "seconds" ? formatDuration(n) : n.toLocaleString());

  return (
    <div className="growth-panel">
      {/* One filter row, above everything it scopes. */}
      <div className="admin-window-picker growth-bucket-picker" role="group" aria-label="Time period">
        {BUCKETS.map((b) => (
          <button key={b} type="button" className={bucket === b ? "active" : ""} aria-pressed={bucket === b} onClick={() => setBucket(b)}>
            {BUCKET_LABELS[b]}
          </button>
        ))}
      </div>

      <p className="admin-note">
        The last {PERIODS_FOR[bucket]} {PERIOD_NOUN[bucket]}s, bucketed in your own time zone. Every figure is a count —
        no one's notes, messages or reading are readable from here. Tap <em>Chart</em> on any row to see its shape over
        time.
      </p>

      {error && <p className="auth-status auth-error">{error}</p>}

      {data?.source === "fallback" && (
        <p className="admin-note growth-fallback-note">
          <strong>Showing three series instead of twenty-seven.</strong> The full history function
          (<code>admin_growth_series</code>, migration 026) isn't applied to this database yet, so this is falling back to
          what migration 019 can already answer: accounts, sessions and active people. Everything else — notes,
          highlights, posts, chapters read, groups, messages — has real history sitting in the tables and needs that one
          migration run to be queryable. Nothing else has to be deployed.
        </p>
      )}

      {loading && !data && <p className="admin-note">Loading…</p>}

      {/* Refetch holds the previous render at reduced opacity — no skeleton, no
          layout jump when the bucket changes. */}
      <div className={loading && data ? "growth-groups growth-reloading" : "growth-groups"}>
        {grouped.map(([category, metrics]) => (
          <div className="admin-block" key={category}>
            <h4 className="admin-block-heading">{category}</h4>
            <ul className="growth-rows">
              {metrics.map((m) => {
                const points = data?.series[m.metric] ?? [];
                const last = points[points.length - 1];
                const prev = points.length > 1 ? points[points.length - 2] : null;
                const latest = last?.value ?? 0;
                const previous = prev ? prev.value : null;
                const total = last?.cumulative ?? 0;
                const delta = formatDelta(latest, previous);
                const dir = deltaDirection(latest, previous);
                const isOpen = !!open[m.metric];
                const mode = modes[m.metric] ?? "value";
                const panelId = `growth-panel-${m.metric}`;

                return (
                  <li key={m.metric} className={`growth-row${isOpen ? " growth-row-open" : ""}`}>
                    <div className="growth-row-head">
                      <div className="growth-row-figures">
                        <span className="growth-row-label">{m.label}</span>
                        <span className="growth-row-numbers">
                          <span className="growth-figure">
                            <strong>{fmt(latest, m.unit)}</strong>
                            <span className="growth-figure-label">this {PERIOD_NOUN[bucket]}</span>
                          </span>
                          {delta !== null && (
                            <span className={`growth-delta growth-delta-${dir}`}>
                              {delta}
                              <span className="growth-figure-label">vs last</span>
                            </span>
                          )}
                          <span className="growth-figure">
                            <strong>{fmt(total, m.unit)}</strong>
                            <span className="growth-figure-label">{m.distinct_by ? "people, all time" : "all time"}</span>
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        className="growth-chart-toggle"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpen((o) => ({ ...o, [m.metric]: !o[m.metric] }))}
                      >
                        <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span> Chart
                        <span className="growth-sr-only"> for {m.label}</span>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="growth-expansion" id={panelId}>
                        <div className="growth-mode-picker" role="group" aria-label={`What to plot for ${m.label}`}>
                          <button
                            type="button"
                            className={mode === "value" ? "active" : ""}
                            aria-pressed={mode === "value"}
                            onClick={() => setModes((s) => ({ ...s, [m.metric]: "value" }))}
                          >
                            Per {PERIOD_NOUN[bucket]}
                          </button>
                          <button
                            type="button"
                            className={mode === "cumulative" ? "active" : ""}
                            aria-pressed={mode === "cumulative"}
                            onClick={() => setModes((s) => ({ ...s, [m.metric]: "cumulative" }))}
                          >
                            Running total
                          </button>
                        </div>

                        <GrowthChart
                          points={points}
                          bucket={bucket}
                          mode={mode}
                          unit={m.unit}
                          label={m.label}
                          historyFrom={m.history_from}
                        />

                        {m.distinct_by === "user" && mode === "cumulative" && (
                          <p className="admin-note">
                            A running count of <em>different people</em> — somebody active in three separate{" "}
                            {PERIOD_NOUN[bucket]}s counts once, so this is lower than adding the columns up.
                          </p>
                        )}

                        {m.history_from && points.length > 0 && m.history_from > points[0].period_start && (
                          <p className="admin-note">
                            Nothing was recorded for this before{" "}
                            {new Date(`${m.history_from}T12:00:00`).toLocaleDateString(undefined, {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                            , marked on the chart. The zeros to the left of that line are a gap in the record, not quiet
                            days — it can't be backfilled.
                          </p>
                        )}

                        {/* The table-view twin. Every plotted value is readable
                            without hovering anything. */}
                        <details className="growth-table-details">
                          <summary>Show the numbers</summary>
                          <div className="growth-table-scroll">
                            <table className="growth-table">
                              <thead>
                                <tr>
                                  <th scope="col">{BUCKET_LABELS[bucket]}</th>
                                  <th scope="col">{m.label}</th>
                                  <th scope="col">Running total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {points
                                  .slice()
                                  .reverse()
                                  .map((p) => (
                                    <tr key={p.period_start}>
                                      <th scope="row">{formatPeriod(p.period_start, bucket, true)}</th>
                                      <td>{fmt(p.value, m.unit)}</td>
                                      <td>{fmt(p.cumulative, m.unit)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {data && data.metrics.length === 0 && !loading && (
        <p className="admin-note">No metrics are registered. That means migration 026 applied but returned an empty catalogue.</p>
      )}
    </div>
  );
}

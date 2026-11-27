import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GrowthChart from "./GrowthChart";
import { formatPeriod, type GrowthBucket, type GrowthPoint } from "../lib/growthApi";
import {
  fetchUsageReport,
  USAGE_RANGES,
  type UsageBreakdown,
  type UsageMetric,
  type UsageRange,
  type UsageReport,
  type UsageSeries,
} from "../lib/usageApi";
import { GAMES } from "./GameCenter";

/* ============================================================================
 * USAGE REPORTS — "I want to see graphs of things like total users, active users by month."
 *
 * Graphs first: every card draws its chart without a tap, under a headline number and a one-line
 * definition that says exactly what is counted. One range control and two "who is counted" toggles
 * above everything scope every card, so no two numbers on the page can describe different slices.
 * Every value is readable without hovering (the tooltip, and "Show the numbers" under each chart).
 *
 * Honest gaps: a period before a metric was recorded shows "not recorded" in its table and a dashed
 * boundary on its chart; a graph the live database can't answer yet says so instead of drawing
 * zeros. Aggregates only — nothing here can show what any one person did.
 * ========================================================================== */

const PERIOD_NOUN: Record<GrowthBucket, string> = { day: "day", week: "week", month: "month" };

const gameTitle = (key: string): string => GAMES.find((g) => g.key === key)?.title ?? (key === "other" ? "Other" : key);

interface CardSpec {
  metric: UsageMetric;
  title: (b: GrowthBucket) => string;
  /** What the headline is: the running total now, the range's sum, or the latest period. */
  headline: "total" | "sum" | "latest";
  mode: "value" | "cumulative";
  definition: string;
  breakdown?: "games" | "reports";
}

const CARDS: CardSpec[] = [
  {
    metric: "accounts",
    title: () => "Total users",
    headline: "total",
    mode: "cumulative",
    definition:
      "Registered accounts that exist at the end of each period: every account signed up with an email and not deleted.",
  },
  {
    metric: "accounts",
    title: (b) => `New sign-ups by ${PERIOD_NOUN[b]}`,
    headline: "sum",
    mode: "value",
    definition: "Registered accounts created in each period.",
  },
  {
    metric: "active_users",
    title: (b) => `Active users by ${PERIOD_NOUN[b]}`,
    headline: "latest",
    mode: "value",
    definition:
      "Different signed-in accounts that opened the app (started a session) or did anything the app records (opened a section, marked a chapter, started a game…) in that period. Someone active on five days counts once in the week.",
  },
  {
    metric: "returning_users",
    title: (b) => `Returning users by ${PERIOD_NOUN[b]}`,
    headline: "latest",
    mode: "value",
    definition: "Active users (as above) whose account was created before that period began — people coming back, not new arrivals.",
  },
  {
    metric: "chapters_read",
    title: () => "Chapters read",
    headline: "sum",
    mode: "value",
    definition:
      "Bible chapters ticked as read, by the date of the tick. Ticking a chapter again moves it to the later date; unticking removes it.",
  },
  {
    metric: "articles_opened",
    title: () => "Articles opened",
    headline: "sum",
    mode: "value",
    definition: "Times the Articles section was opened. Which article is not recorded, by design.",
  },
  {
    metric: "articles_marked",
    title: () => "Articles marked as read",
    headline: "sum",
    mode: "value",
    definition: "Ticks of “Mark this article as read”.",
  },
  {
    metric: "games_played",
    title: () => "Games played",
    headline: "sum",
    mode: "value",
    definition: "Games started from Game Center, split by game below.",
    breakdown: "games",
  },
  {
    metric: "notes",
    title: () => "Notes written",
    headline: "sum",
    mode: "value",
    definition: "Verse notes created, by creation date. A note its writer deleted is no longer counted.",
  },
  {
    metric: "reports",
    title: () => "Problem reports",
    headline: "sum",
    mode: "value",
    definition: "Reports filed with Report a Problem, by the date filed, split by category below.",
    breakdown: "reports",
  },
];

const longDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

function headlineFor(spec: CardSpec, s: UsageSeries, bucket: GrowthBucket): { value: number; label: string } {
  const pts = s.points;
  const last = pts[pts.length - 1];
  if (spec.headline === "total") return { value: last?.cumulative ?? 0, label: "now" };
  if (spec.headline === "latest") return { value: last?.value ?? 0, label: `this ${PERIOD_NOUN[bucket]} so far` };
  const recorded = pts.filter((p) => !s.historyFrom || p.period_start >= periodKey(s.historyFrom, bucket));
  return { value: recorded.reduce((sum, p) => sum + p.value, 0), label: "in this range" };
}

/** The period a date falls in — so "recorded from Sept 1" includes the month of September. */
function periodKey(iso: string, bucket: GrowthBucket): string {
  const d = iso.slice(0, 10);
  if (bucket === "day") return d;
  if (bucket === "month") return `${d.slice(0, 7)}-01`;
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function Breakdown({ data, title }: { data: UsageBreakdown; title: string }) {
  const max = Math.max(1, ...data.rows.map((r) => r.value));
  return (
    <div className="usage-breakdown">
      <h5 className="usage-breakdown-heading">
        {title} <span>({data.scope})</span>
      </h5>
      {data.rows.length === 0 ? (
        <p className="admin-note">None in this range.</p>
      ) : (
        <ul className="admin-rows">
          {data.rows.map((r) => (
            <li key={r.key} className="admin-row">
              <span className="admin-row-label usage-breakdown-label">{r.label}</span>
              <span className="admin-bar" aria-hidden="true">
                <span className="admin-bar-fill" style={{ width: `${Math.max(2, Math.round((r.value / max) * 100))}%` }} />
              </span>
              <span className="admin-row-value">{r.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
      {data.caveat && <p className="admin-note">{data.caveat}</p>}
    </div>
  );
}

function NumbersTable({ points, bucket, mode, label, historyFrom }: { points: GrowthPoint[]; bucket: GrowthBucket; mode: "value" | "cumulative"; label: string; historyFrom: string | null }) {
  const from = historyFrom ? periodKey(historyFrom, bucket) : null;
  return (
    <details className="growth-table-details">
      <summary>Show the numbers</summary>
      <div className="growth-table-scroll">
        <table className="growth-table">
          <thead>
            <tr>
              <th scope="col">{bucket === "day" ? "Day" : bucket === "week" ? "Week" : "Month"}</th>
              <th scope="col">{label}</th>
            </tr>
          </thead>
          <tbody>
            {points
              .slice()
              .reverse()
              .map((p) => (
                <tr key={p.period_start}>
                  <th scope="row">{formatPeriod(p.period_start, bucket, true)}</th>
                  <td>
                    {from !== null && p.period_start < from ? (
                      <span className="usage-not-recorded">not recorded</span>
                    ) : (
                      (mode === "cumulative" ? p.cumulative : p.value).toLocaleString()
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function UsageCard({ spec, report }: { spec: CardSpec; report: UsageReport }) {
  const bucket = report.range.bucket;
  const title = spec.title(bucket);
  const s = report.series[spec.metric];
  const total = report.totals[spec.metric];
  const unavailable = report.unavailable[spec.metric];
  const breakdown = spec.breakdown === "games" ? report.games : spec.breakdown === "reports" ? report.reportsByCategory : null;
  // A cumulative chart with no series at all (fallback active users) has nothing to plot.
  const head = s ? headlineFor(spec, s, bucket) : total ? { value: total.value, label: total.scope } : null;
  const firstShown = s?.points[0]?.period_start ?? null;
  const notRecordedYet = s && s.historyFrom === null;
  const gapInside = s && s.historyFrom && firstShown && periodKey(s.historyFrom, bucket) > firstShown;

  return (
    <section className="usage-card" aria-label={title}>
      <header className="usage-card-head">
        <h4 className="usage-card-title">{title}</h4>
        {head && !notRecordedYet && (
          <p className="usage-headline">
            <strong>{head.value.toLocaleString()}</strong> <span>{head.label}</span>
          </p>
        )}
      </header>
      <p className="usage-definition">{spec.definition}</p>

      {s && !notRecordedYet && (
        <>
          <GrowthChart points={s.points} bucket={bucket} mode={spec.mode} unit="count" label={title} historyFrom={s.historyFrom} />
          {gapInside && (
            <p className="admin-note">
              Not recorded before {longDate(s.historyFrom!)} — the dashed line. Periods to its left are a gap in the record, not
              zero.
            </p>
          )}
          {s.caveat && <p className="admin-note usage-caveat">{s.caveat}</p>}
          <NumbersTable points={s.points} bucket={bucket} mode={spec.mode} label={title} historyFrom={s.historyFrom} />
        </>
      )}
      {notRecordedYet && <p className="admin-note usage-gap">Not recorded yet — nothing of this kind has been counted for the accounts in scope.</p>}
      {!s && total?.caveat && <p className="admin-note usage-caveat">{total.caveat}</p>}
      {unavailable && <p className="admin-note usage-gap">{unavailable}</p>}

      {breakdown && <Breakdown data={breakdown} title={spec.breakdown === "games" ? "By game" : "By category"} />}
    </section>
  );
}

export default function UsageReportsPanel() {
  const [rangeKey, setRangeKey] = useState<UsageRange["key"]>("12m");
  const [excludeTeam, setExcludeTeam] = useState(true);
  // Guests are never counted: "Continue as Guest" is retired and an anonymous session only reaches the
  // sign-in gate (showAuthGate in App.tsx). Their old rows stay in the database and are left out.
  const includeGuests = false;
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const range = useMemo(() => USAGE_RANGES.find((r) => r.key === rangeKey) ?? USAGE_RANGES[2], [rangeKey]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchUsageReport(range, { excludeTeam, includeGuests }, gameTitle);
      if (reqId.current === id) setReport(r);
    } catch (err) {
      if (reqId.current === id) setError(err instanceof Error ? err.message : "Couldn't load the usage reports.");
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, [range, excludeTeam, includeGuests]);

  useEffect(() => {
    void load();
  }, [load]);

  const fallback = report?.source === "fallback";

  return (
    <div className="usage-panel">
      <div className="usage-controls">
        <div className="admin-window-picker usage-range-picker" role="group" aria-label="Date range">
          {USAGE_RANGES.map((r) => (
            <button key={r.key} type="button" className={rangeKey === r.key ? "active" : ""} aria-pressed={rangeKey === r.key} onClick={() => setRangeKey(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="usage-toggles">
          <label className={fallback ? "usage-toggle usage-toggle-off" : "usage-toggle"}>
            <input type="checkbox" checked={excludeTeam} disabled={fallback} onChange={(e) => setExcludeTeam(e.target.checked)} />
            Leave out the team (owner and administrators)
          </label>
        </div>
        <p className="admin-note">
          {range.bucket === "day" ? "By day" : range.bucket === "week" ? "By week (Monday start)" : "By month"}, in your own time
          zone; the latest period is still in progress. Registered accounts only — accounts left from the retired “Continue as
          Guest” are never counted. Counts only — nobody's activity is visible here. Test accounts aren't marked in the database,
          so they're counted unless they hold a team role.
        </p>
      </div>

      {fallback && (
        <p className="admin-note growth-fallback-note usage-fallback-note">
          <strong>Some graphs need one database step.</strong> Migration 054 (<code>admin_usage_report</code>) isn't applied yet, so
          this page is drawing what the live database can already answer: total users, sign-ups, daily active users, games by game
          and reports by category. Those include the team, and the toggle above stays off until then. The cards that can't be
          drawn yet say so.
        </p>
      )}

      {error && <p className="auth-status auth-error">{error}</p>}
      {loading && !report && <p className="admin-note">Loading…</p>}

      {report && (
        <div className={loading ? "usage-grid growth-reloading" : "usage-grid"}>
          {CARDS.map((c) => (
            <UsageCard key={`${c.metric}-${c.headline}`} spec={c} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

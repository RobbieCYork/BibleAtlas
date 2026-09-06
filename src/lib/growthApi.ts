import { supabase } from "./supabase";
import { fetchDailyActivity } from "./adminApi";

/* ============================================================================
 * GROWTH — the history layer behind the admin console's Growth tab.
 *
 * Same boundary as adminApi.ts: every read here is a SECURITY DEFINER Postgres
 * function that opens with `if not is_admin() then raise`, so a non-admin
 * calling this from the browser console gets a 42501, not a smaller answer.
 * See sql/026_admin_growth_series.sql.
 *
 * ----------------------------------------------------------------------------
 * WHY THERE IS A FALLBACK PATH
 * ----------------------------------------------------------------------------
 * Migration 026 is written but applied on the owner's word, one at a time — so
 * this ships into a production database that does not have it yet. Rather than
 * render an error until someone runs a .sql file, `fetchGrowth` degrades to
 * `admin_daily_activity` (migration 019, already live), which can answer three
 * of the twenty-seven series, and reports `source: "fallback"` so the UI can
 * say which world it is in instead of quietly showing a third of the truth.
 *
 * The moment 026 is applied the full set appears with no redeploy: the code
 * tries the real function first on every load.
 *
 * ----------------------------------------------------------------------------
 * bigint ARRIVES AS A STRING
 * ----------------------------------------------------------------------------
 * PostgREST serialises Postgres `bigint` and `numeric` as JSON strings, because
 * they can exceed IEEE-754's safe integer range. `count(*)` is a bigint, so
 * every `value` and `cumulative` below arrives as "17", not 17 — and "17" - "5"
 * is NaN while "17" + "5" is "175". Both would plot silently wrong. `toNum` is
 * the single conversion point; nothing else in this file or its callers should
 * have to remember.
 * ========================================================================== */

export type GrowthBucket = "day" | "week" | "month";

export interface GrowthMetric {
  metric: string;
  label: string;
  category: string;
  /** 'count' renders as a plain number; 'seconds' renders through formatDuration. */
  unit: "count" | "seconds";
  /** Non-null when the value counts PEOPLE rather than events — changes the wording,
   *  and means the running total is a distinct count, not a sum of the columns. */
  distinct_by: string | null;
  /** The first date this metric has any data at all. Anything before it is an
   *  absence of records, not an absence of activity — the chart says so. */
  history_from: string | null;
}

export interface GrowthPoint {
  /** ISO date of the period's first day, bucketed in the viewer's own time zone. */
  period_start: string;
  value: number;
  cumulative: number;
}

export interface GrowthData {
  metrics: GrowthMetric[];
  series: Record<string, GrowthPoint[]>;
  /** "full" = migration 026 is applied. "fallback" = three series from 019. */
  source: "full" | "fallback";
}

interface RawSeriesRow {
  metric: string;
  period_start: string;
  value: string | number;
  cumulative: string | number;
}

function toNum(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** How much history each bucket asks for. Chosen so every view covers the app's
 *  whole life today and keeps covering it for a while: 60 days, 6 months of
 *  weeks, 2 years of months. */
export const PERIODS_FOR: Record<GrowthBucket, number> = { day: 60, week: 26, month: 24 };

export const BUCKET_LABELS: Record<GrowthBucket, string> = { day: "Day", week: "Week", month: "Month" };

/** The viewer's own zone, so "today" means their today. Postgres does the bucketing
 *  with it — see p_tz in migration 026. A browser that won't tell us falls back to UTC,
 *  which is what the server would have assumed anyway. */
function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** True when the failure is "migration 026 isn't applied here", rather than a real error.
 *  PostgREST answers an unknown function with PGRST202; Postgres itself with 42883. Both
 *  arrive as message text through supabase-js, so this matches on both the codes and the
 *  wording rather than trusting one shape. */
function isMissingFunction(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("pgrst202") ||
    m.includes("42883") ||
    m.includes("could not find the function") ||
    m.includes("does not exist") ||
    m.includes("schema cache")
  );
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

/* ----------------------------------------------------------------------------
 * THE FALLBACK.
 *
 * `admin_daily_activity` returns one row per DAY for the last N days, capped at
 * 180 server-side. Weeks and months are therefore rolled up here, client-side,
 * which is fine for a sum but has one honest limit worth stating: its window
 * starts 180 days ago, so the running total is "since then", not "since launch".
 * Today those are the same number — the app is younger than 180 days — and this
 * whole path disappears the moment 026 is applied, so it is not worth more
 * machinery than the note it carries in the UI.
 * -------------------------------------------------------------------------- */
const FALLBACK_METRICS: GrowthMetric[] = [
  { metric: "accounts", label: "Accounts created", category: "People", unit: "count", distinct_by: null, history_from: null },
  { metric: "sessions", label: "Sessions", category: "People", unit: "count", distinct_by: null, history_from: null },
  { metric: "active_users", label: "Active people", category: "People", unit: "count", distinct_by: "user", history_from: null },
];

/** Monday-start week, matching Postgres `date_trunc('week', ...)` so the two paths
 *  bucket identically and switching between them doesn't shift the columns. */
function bucketStart(iso: string, bucket: GrowthBucket): string {
  const d = new Date(`${iso}T00:00:00`);
  if (bucket === "day") return iso;
  if (bucket === "month") return `${iso.slice(0, 7)}-01`;
  const dow = (d.getDay() + 6) % 7; // Sunday=0 → 6, Monday=0
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchGrowthFallback(bucket: GrowthBucket): Promise<GrowthData> {
  const daily = await fetchDailyActivity(180);
  const series: Record<string, GrowthPoint[]> = {};

  for (const m of FALLBACK_METRICS) {
    const totals = new Map<string, number>();
    for (const row of daily ?? []) {
      const key = bucketStart(row.day, bucket);
      const v =
        m.metric === "accounts" ? toNum(row.signups) : m.metric === "sessions" ? toNum(row.sessions) : toNum(row.active_users);
      totals.set(key, (totals.get(key) ?? 0) + v);
    }
    let running = 0;
    series[m.metric] = [...totals.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-PERIODS_FOR[bucket])
      .map(([period_start, value]) => {
        running += value;
        return { period_start, value, cumulative: running };
      });
  }

  // The daily rows carry the true first-activity date, which is the honest
  // history_from for this path.
  const firstWithData = (pick: (r: { signups: number; sessions: number; active_users: number }) => number) =>
    (daily ?? []).find((r) => pick(r) > 0)?.day ?? null;

  const metrics = FALLBACK_METRICS.map((m) => ({
    ...m,
    history_from:
      m.metric === "accounts"
        ? firstWithData((r) => r.signups)
        : m.metric === "sessions"
          ? firstWithData((r) => r.sessions)
          : firstWithData((r) => r.active_users),
  }));

  return { metrics, series, source: "fallback" };
}

/** One round trip for the catalogue, one for the numbers. Falls back to the three
 *  series migration 019 can answer if 026 hasn't been applied to this database. */
export async function fetchGrowth(bucket: GrowthBucket): Promise<GrowthData> {
  const tz = viewerTimeZone();
  try {
    const [metrics, rows] = await Promise.all([
      rpc<GrowthMetric[]>("admin_growth_metrics"),
      rpc<RawSeriesRow[]>("admin_growth_series", {
        p_bucket: bucket,
        p_periods: PERIODS_FOR[bucket],
        p_tz: tz,
      }),
    ]);

    const series: Record<string, GrowthPoint[]> = {};
    for (const row of rows ?? []) {
      (series[row.metric] ??= []).push({
        period_start: row.period_start,
        value: toNum(row.value),
        cumulative: toNum(row.cumulative),
      });
    }
    return { metrics: metrics ?? [], series, source: "full" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isMissingFunction(message)) return fetchGrowthFallback(bucket);
    // A real refusal (42501) or a real outage must surface, not be papered over
    // with a smaller dashboard that looks like it worked.
    throw err;
  }
}

/* ----------------------------------------------------------------------------
 * Formatting.
 * -------------------------------------------------------------------------- */

/** Axis and row labels. A day needs its month for context; a month needs its year
 *  only when the range crosses one, which at 24 months it always does. */
export function formatPeriod(iso: string, bucket: GrowthBucket, long = false): string {
  const d = new Date(`${iso}T12:00:00`);
  if (bucket === "month") {
    return d.toLocaleDateString(undefined, { month: "short", year: long ? "numeric" : "2-digit" });
  }
  const base = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return bucket === "week" && long ? `Week of ${base}` : base;
}

/** Signed change against the previous period, as a string, or null when there is
 *  no previous period to compare against. "+3" / "−1" / "0". */
export function formatDelta(current: number, previous: number | null): string | null {
  if (previous === null) return null;
  const d = current - previous;
  if (d === 0) return "0";
  return d > 0 ? `+${d.toLocaleString()}` : `−${Math.abs(d).toLocaleString()}`;
}

export function deltaDirection(current: number, previous: number | null): "up" | "down" | "flat" | null {
  if (previous === null) return null;
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

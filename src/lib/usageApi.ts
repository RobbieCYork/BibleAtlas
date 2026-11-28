import { supabase } from "./supabase";
import {
  fetchDailyActivity,
  fetchFeatureBreakdown,
  fetchGuestSummary,
  fetchOverview,
  fetchUsers,
  type AdminDailyRow,
  type AdminGuestSummary,
  type AdminOverview,
} from "./adminApi";
import { countReports, fetchAllCategories } from "./reportsApi";
import type { GrowthBucket, GrowthPoint } from "./growthApi";

/* ============================================================================
 * USAGE REPORTS — the data behind the Admin Console's "Usage reports" graphs and the Users tab's
 * "Registered accounts" card.
 *
 * TWO WORLDS, SAID OUT LOUD.
 *   * sql/054 applied: one call to admin_usage_report() answers every graph, with the team and
 *     guest toggles applied server-side. admin_registered_summary() answers the card.
 *   * sql/054 NOT applied (production today): everything that can honestly be rebuilt from the
 *     functions already live (019/021/025) is rebuilt here, and each graph that cannot is marked
 *     unavailable with the reason. Nothing is guessed; nothing is shown as zero that is really
 *     "not computable yet". `source` tells the UI which world it is in.
 *
 * Same boundary as adminApi.ts: every call is a SECURITY DEFINER function gated on is_admin(), so a
 * non-admin gets 42501, never a smaller answer. Only counts cross the wire for the graphs. The one
 * exception is the fallback for the card's "newest join" date, which reads the user list the Users
 * tab already shows an administrator.
 * ========================================================================== */

export type UsageMetric =
  | "accounts"
  | "active_users"
  | "returning_users"
  | "chapters_read"
  | "articles_opened"
  | "articles_marked"
  | "games_played"
  | "notes"
  | "reports";

export interface UsageRange {
  key: "30d" | "12w" | "12m" | "all";
  label: string;
  bucket: GrowthBucket;
  /** 0 = from the first account to now (054 computes it; the fallback uses its whole window). */
  periods: number;
  /** Calendar days the range spans, for the fallback's "last N days" functions (capped at 365 there). */
  days: number;
}

export const USAGE_RANGES: UsageRange[] = [
  { key: "30d", label: "30 days", bucket: "day", periods: 30, days: 30 },
  { key: "12w", label: "12 weeks", bucket: "week", periods: 12, days: 84 },
  { key: "12m", label: "12 months", bucket: "month", periods: 12, days: 365 },
  { key: "all", label: "Since launch", bucket: "month", periods: 0, days: 365 },
];

export interface UsageSeries {
  points: GrowthPoint[];
  /** First date this metric has any data. Periods before it are "not recorded", never zero. */
  historyFrom: string | null;
  /** A caveat that applies only to this series in the current world (e.g. "includes the team"). */
  caveat?: string;
}

export interface UsageBreakdownRow {
  key: string;
  label: string;
  value: number;
}

export interface UsageBreakdown {
  rows: UsageBreakdownRow[];
  /** What the totals cover, in words: "in this range" or the fallback's narrower truth. */
  scope: string;
  caveat?: string;
}

export interface UsageReport {
  source: "full" | "fallback";
  range: UsageRange;
  /** A metric missing from here is not computable in this world; `unavailable` says why. */
  series: Partial<Record<UsageMetric, UsageSeries>>;
  /** For a metric with no series but an honest single total (fallback only). */
  totals: Partial<Record<UsageMetric, { value: number; scope: string; caveat?: string }>>;
  unavailable: Partial<Record<UsageMetric, string>>;
  games: UsageBreakdown | null;
  reportsByCategory: UsageBreakdown | null;
  /** Whether the team / guest toggles were applied (false in the fallback, which cannot apply them). */
  filtersApplied: boolean;
}

export interface UsageFilters {
  excludeTeam: boolean;
  includeGuests: boolean;
}

export const NEEDS_DB_STEP = "Needs the database step (migration 054) before it can be drawn.";

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** "Function not in this database" (PGRST202 / 42883), as opposed to a refusal or an outage. */
export function isMissingFunction(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("pgrst202") ||
    m.includes("42883") ||
    m.includes("could not find the function") ||
    (m.includes("function") && m.includes("does not exist")) ||
    m.includes("schema cache")
  );
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new Error(`${error.code ? `${error.code}: ` : ""}${error.message}`);
  return data as T;
}

/* ----------------------------------------------------------------------------
 * Date helpers. Period keys are ISO dates of the period's first day. Weeks start Monday, like
 * Postgres date_trunc('week').
 * -------------------------------------------------------------------------- */
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function periodStart(iso: string, bucket: GrowthBucket): string {
  if (bucket === "day") return iso;
  if (bucket === "month") return `${iso.slice(0, 7)}-01`;
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoOf(d);
}

function nextPeriod(iso: string, bucket: GrowthBucket): string {
  const d = new Date(`${iso}T12:00:00`);
  if (bucket === "day") d.setDate(d.getDate() + 1);
  else if (bucket === "week") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1, 1);
  return isoOf(d);
}

/** Every period key from `from` to `to` inclusive. */
function spine(from: string, to: string, bucket: GrowthBucket): string[] {
  const out: string[] = [];
  for (let p = periodStart(from, bucket); p <= to && out.length < 800; p = nextPeriod(p, bucket)) out.push(p);
  return out;
}

/* ----------------------------------------------------------------------------
 * THE FULL PATH — sql/054.
 * -------------------------------------------------------------------------- */
interface RawUsageRow {
  metric: string;
  label: string | null;
  period_start: string;
  value: string | number;
  cumulative: string | number | null;
  history_from: string | null;
}

const SCALARS: UsageMetric[] = [
  "accounts",
  "active_users",
  "returning_users",
  "chapters_read",
  "articles_opened",
  "articles_marked",
  "games_played",
  "notes",
  "reports",
];

function fromFull(range: UsageRange, rows: RawUsageRow[], filters: UsageFilters, gameLabel: (k: string) => string): UsageReport {
  const series: Partial<Record<UsageMetric, UsageSeries>> = {};
  const games = new Map<string, UsageBreakdownRow>();
  const reports = new Map<string, UsageBreakdownRow>();
  for (const r of rows ?? []) {
    if (r.metric.startsWith("game:")) {
      const key = r.metric.slice(5);
      const row = games.get(key) ?? { key, label: gameLabel(key), value: 0 };
      row.value += toNum(r.value);
      games.set(key, row);
      continue;
    }
    if (r.metric.startsWith("report:")) {
      const key = r.metric.slice(7);
      const row = reports.get(key) ?? { key, label: r.label ?? key, value: 0 };
      row.value += toNum(r.value);
      reports.set(key, row);
      continue;
    }
    if (!SCALARS.includes(r.metric as UsageMetric)) continue;
    const s = (series[r.metric as UsageMetric] ??= { points: [], historyFrom: r.history_from ?? null });
    s.points.push({ period_start: r.period_start, value: toNum(r.value), cumulative: toNum(r.cumulative) });
  }
  for (const s of Object.values(series)) s?.points.sort((a, b) => a.period_start.localeCompare(b.period_start));
  const sortDesc = (m: Map<string, UsageBreakdownRow>) => [...m.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const who = filters.excludeTeam ? "team left out" : "team included";
  return {
    source: "full",
    range,
    series,
    totals: {},
    unavailable: {},
    games: { rows: sortDesc(games), scope: `in this range (${who})` },
    reportsByCategory: { rows: sortDesc(reports), scope: `in this range (${who})` },
    filtersApplied: true,
  };
}

/* ----------------------------------------------------------------------------
 * THE FALLBACK — what 019/021/025 can answer, rebuilt honestly.
 *
 *   accounts     REGISTERED sign-ups per day = admin_daily_activity.signups (every account) minus
 *                admin_guest_summary's new_guests that day (both bucket by the UTC date). The running
 *                total is counted BACKWARDS from admin_overview.users_registered, so it is a true
 *                total-over-time inside the 180-day window the daily function reaches. Team included.
 *   active_users DAILY only: active_users minus that day's active_guests (both are distinct
 *                accounts with a session STARTED that day). A week's or month's distinct count
 *                cannot be built from daily ones, so week/month is marked unavailable.
 *   games        admin_feature_breakdown('game.play','game', days): totals per game for the range,
 *                team and guests included, no per-period chart.
 *   articles     admin_feature_breakdown('panel.open','panel', days) → the "articles" row: one total.
 *   reports      report_list() counts per category (the same counts the Problem reports tab shows):
 *                all time, every status, team included.
 * Everything else (returning, chapters, notes, articles marked) is unavailable until 054.
 * -------------------------------------------------------------------------- */
async function fromFallback(range: UsageRange, gameLabel: (k: string) => string): Promise<UsageReport> {
  const days = Math.min(range.days, 365);
  const [overview, daily, guests, gameRows, panelRows, cats] = await Promise.all([
    fetchOverview(),
    fetchDailyActivity(180),
    fetchGuestSummary(180),
    fetchFeatureBreakdown("game.play", "game", days).catch(() => null),
    fetchFeatureBreakdown("panel.open", "panel", days).catch(() => null),
    fetchAllCategories().catch(() => null),
  ]);

  const series: Partial<Record<UsageMetric, UsageSeries>> = {};
  const unavailable: Partial<Record<UsageMetric, string>> = {};
  const totals: UsageReport["totals"] = {};
  const bucket = range.bucket;

  const guestNew = new Map<string, number>();
  const guestActive = new Map<string, number>();
  for (const d of guests?.days ?? []) {
    guestNew.set(d.day, toNum(d.new_guests));
    guestActive.set(d.day, toNum(d.active_guests));
  }
  const dailyRows: AdminDailyRow[] = (daily ?? []).slice().sort((a, b) => a.day.localeCompare(b.day));
  const windowStart = dailyRows[0]?.day ?? null;
  const today = dailyRows[dailyRows.length - 1]?.day ?? isoOf(new Date());

  // The periods to show.
  let first: string;
  if (range.periods > 0) {
    let p = periodStart(today, bucket);
    for (let i = 1; i < range.periods; i++) {
      const d = new Date(`${p}T12:00:00`);
      if (bucket === "day") d.setDate(d.getDate() - 1);
      else if (bucket === "week") d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1, 1);
      p = isoOf(d);
    }
    first = p;
  } else {
    const firstSignup = dailyRows.find((r) => toNum(r.signups) - (guestNew.get(r.day) ?? 0) > 0)?.day ?? today;
    first = periodStart(firstSignup, bucket);
  }
  const periods = spine(first, periodStart(today, bucket), bucket);

  // Registered sign-ups per day, then per period.
  const regByDay = dailyRows.map((r) => ({ day: r.day, v: Math.max(0, toNum(r.signups) - (guestNew.get(r.day) ?? 0)) }));
  const regTotal = toNum(overview?.users_registered);
  const perPeriod = new Map<string, number>();
  for (const r of regByDay) perPeriod.set(periodStart(r.day, bucket), (perPeriod.get(periodStart(r.day, bucket)) ?? 0) + r.v);
  const firstReg = regByDay.find((r) => r.v > 0)?.day ?? null;
  // Running total: total now minus everything that joined after the period ended.
  const accountsPoints: GrowthPoint[] = periods.map((p) => {
    const end = nextPeriod(p, bucket);
    const after = regByDay.filter((r) => r.day >= end).reduce((s, r) => s + r.v, 0);
    return { period_start: p, value: perPeriod.get(p) ?? 0, cumulative: Math.max(0, regTotal - after) };
  });
  // Periods older than the 180-day window cannot be split per period; say so via historyFrom.
  series.accounts = {
    points: accountsPoints,
    historyFrom: firstReg ?? windowStart,
    caveat:
      "Includes the team (the toggles need the database step). Sign-ups per period reach back 180 days; the running total is exact.",
  };

  if (bucket === "day") {
    const dau = new Map(dailyRows.map((r) => [r.day, Math.max(0, toNum(r.active_users) - (guestActive.get(r.day) ?? 0))]));
    const firstActive = dailyRows.find((r) => toNum(r.sessions) > 0)?.day ?? overview?.analytics_since?.slice(0, 10) ?? null;
    series.active_users = {
      points: periods.map((p) => ({ period_start: p, value: dau.get(p) ?? 0, cumulative: 0 })),
      historyFrom: firstActive,
      caveat:
        "Until the database step this counts only accounts that STARTED a session that day (not other tracked actions), includes the team, and has no running total of different people.",
    };
  } else {
    unavailable.active_users = `Active users by ${bucket} need the database step (migration 054): a ${bucket}'s count of different people can't be added up from daily counts. Choose "30 days" to see daily active users now.`;
  }

  let gamesBreakdown: UsageBreakdown | null = null;
  if (gameRows) {
    const rows = gameRows
      .map((g) => ({ key: g.label, label: gameLabel(g.label), value: toNum(g.uses) }))
      .filter((g) => g.value > 0)
      .sort((a, b) => b.value - a.value);
    totals.games_played = { value: rows.reduce((s, r) => s + r.value, 0), scope: `in the last ${days} days`, caveat: "Includes the team, and may include a few sessions left from the retired guest path." };
    unavailable.games_played = "A per-period chart of games needs the database step (migration 054).";
    gamesBreakdown = { rows, scope: `last ${days} days, team included` };
  } else {
    unavailable.games_played = NEEDS_DB_STEP;
  }

  const articles = panelRows?.find((r) => r.label === "articles");
  if (panelRows) {
    totals.articles_opened = { value: toNum(articles?.uses), scope: `in the last ${days} days`, caveat: "Includes the team, and may include a few sessions left from the retired guest path." };
    unavailable.articles_opened = "A per-period chart needs the database step (migration 054).";
  } else unavailable.articles_opened = NEEDS_DB_STEP;

  let reportsBreakdown: UsageBreakdown | null = null;
  if (cats) {
    const counts = await Promise.all(
      cats.map(async (c) => ({ key: c.key, label: c.label, value: await countReports({ category: c.key }).catch(() => 0) }))
    );
    const rows = counts.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
    reportsBreakdown = { rows, scope: "all time, every status, team included" };
    totals.reports = { value: rows.reduce((s, r) => s + r.value, 0), scope: "all time" };
    unavailable.reports = "A per-period chart of reports needs the database step (migration 054).";
  } else unavailable.reports = NEEDS_DB_STEP;

  for (const m of ["returning_users", "chapters_read", "notes", "articles_marked"] as UsageMetric[]) unavailable[m] = NEEDS_DB_STEP;

  return {
    source: "fallback",
    range,
    series,
    totals,
    unavailable,
    games: gamesBreakdown,
    reportsByCategory: reportsBreakdown,
    filtersApplied: false,
  };
}

export async function fetchUsageReport(range: UsageRange, filters: UsageFilters, gameLabel: (k: string) => string): Promise<UsageReport> {
  try {
    const rows = await rpc<RawUsageRow[]>("admin_usage_report", {
      p_bucket: range.bucket,
      p_periods: range.periods,
      p_tz: viewerTimeZone(),
      p_exclude_team: filters.excludeTeam,
      p_include_guests: filters.includeGuests,
    });
    return fromFull(range, rows, filters, gameLabel);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isMissingFunction(message)) return fromFallback(range, gameLabel);
    throw err;
  }
}

/* ----------------------------------------------------------------------------
 * The Users tab's "Registered accounts" card.
 * -------------------------------------------------------------------------- */
export interface RegisteredSummary {
  total: number;
  new_24h: number;
  new_7d: number;
  active_7d: number;
  /** null = no registered account at all; undefined = not determinable in this world. */
  newest_joined_at: string | null | undefined;
  /** How many of `total` are the owner/administrators (054 only). */
  team: number | null;
  source: "full" | "fallback";
}

/**
 * 054: admin_registered_summary(), counted over the whole of auth.users.
 * Fallback: admin_overview minus admin_guest_summary — total and new counts are exact; "active in 7d"
 * is the overview's (last heartbeat in 7 days) minus guests'; the newest join comes from the user list
 * fetched UNSEARCHED, newest first, so a search typed into the Users tab cannot change it.
 */
export async function fetchRegisteredSummary(prefetched?: {
  overview?: AdminOverview | null;
  guests?: AdminGuestSummary | null;
}): Promise<RegisteredSummary> {
  try {
    const s = await rpc<Record<string, unknown>>("admin_registered_summary");
    return {
      total: toNum(s.total),
      new_24h: toNum(s.new_24h),
      new_7d: toNum(s.new_7d),
      active_7d: toNum(s.active_7d),
      newest_joined_at: (s.newest_joined_at as string | null) ?? null,
      team: toNum(s.team),
      source: "full",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!isMissingFunction(message)) throw err;
  }
  const [overview, guests, newest] = await Promise.all([
    prefetched?.overview ?? fetchOverview(),
    prefetched?.guests ?? fetchGuestSummary(30),
    fetchUsers(null, 200, 0).catch(() => null),
  ]);
  const firstRegistered = newest?.find((u) => !u.is_anonymous);
  const listIsComplete = !!newest && newest.length < 200;
  return {
    total: toNum(overview?.users_registered),
    new_24h: Math.max(0, toNum(overview?.users_new_24h) - toNum(guests?.new_24h)),
    new_7d: Math.max(0, toNum(overview?.users_new_7d) - toNum(guests?.new_7d)),
    active_7d: Math.max(0, toNum(overview?.active_7d) - toNum(guests?.active_7d)),
    newest_joined_at: firstRegistered ? firstRegistered.created_at : listIsComplete ? null : undefined,
    team: null,
    source: "fallback",
  };
}

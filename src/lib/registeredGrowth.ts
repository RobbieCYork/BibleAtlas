/* ============================================================================
 * REGISTERED ACCOUNT GROWTH — the arithmetic behind the Users tab's line graph.
 *
 * Pure functions, no imports. Every date is an ISO "YYYY-MM-DD" CALENDAR day that Postgres has already
 * bucketed in the viewer's own time zone (p_tz in admin_usage_report), so nothing here converts a
 * zone: day arithmetic is done on UTC day numbers, which have no daylight-saving short or long days.
 * ========================================================================== */

/** One stored count: `total` registered accounts existed at the end of the day `through`. */
export interface AccountCount {
  through: string;
  total: number;
}

export interface RegisteredHistory {
  /** Oldest first. One per day; only beyond the function's 730-day reach is it one per week. */
  counts: AccountCount[];
  /** The day the oldest existing registered account was created; null = there are none. */
  firstDate: string | null;
  /** Today in the viewer's time zone, as the database saw it. */
  today: string;
}

export type GrowthRangeKey = "all" | "month" | "ytd" | "custom";

export const GROWTH_RANGES: ReadonlyArray<{ key: GrowthRangeKey; label: string }> = [
  { key: "all", label: "All time" },
  { key: "month", label: "Last month" },
  { key: "ytd", label: "Year to date" },
  { key: "custom", label: "Custom" },
];

export type GrowthStep = "day" | "week" | "month";

export interface GrowthLinePoint {
  date: string;
  /** Registered accounts at the end of `date`. */
  total: number;
  /** How many more than at the previous point (the first point: created on that day). */
  added: number;
}

const DAY_MS = 86_400_000;
const dayNumber = (iso: string): number => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
const fromDayNumber = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

export const addDays = (iso: string, n: number): string => fromDayNumber(dayNumber(iso) + n);
/** `to` minus `from`, in days. */
export const daysBetween = (from: string, to: string): number => dayNumber(to) - dayNumber(from);

/** The same day-of-month `n` months away, held to that month's last day (Mar 31 − 1 → Feb 28). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))).toISOString().slice(0, 10);
}

/** A real calendar date in a believable year. A date box being typed into reports years like 0002. */
export function isFullDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || s < "2000-01-01") return false;
  const n = dayNumber(s);
  return Number.isFinite(n) && fromDayNumber(n) === s;
}

export type ResolvedRange =
  | { kind: "ok"; start: string; end: string; clamped: boolean }
  | { kind: "invalid"; message: string; field: "start" | "end" }
  /** The whole range is before the first account that still exists. */
  | { kind: "before" };

export function resolveRange(
  key: GrowthRangeKey,
  today: string,
  firstDate: string,
  custom: { start: string; end: string }
): ResolvedRange {
  let start: string;
  let end = today;
  if (key === "all") start = firstDate;
  else if (key === "month") start = addMonths(today, -1);
  else if (key === "ytd") start = `${today.slice(0, 4)}-01-01`;
  else {
    if (!isFullDate(custom.start)) return { kind: "invalid", field: "start", message: "Enter a full start date." };
    if (!isFullDate(custom.end)) return { kind: "invalid", field: "end", message: "Enter a full end date." };
    if (custom.start > today) return { kind: "invalid", field: "start", message: "The start date can't be in the future." };
    if (custom.end > today) return { kind: "invalid", field: "end", message: "The end date can't be in the future." };
    if (custom.start > custom.end) return { kind: "invalid", field: "end", message: "The end date is before the start date." };
    start = custom.start;
    end = custom.end;
  }
  if (end < firstDate) return { kind: "before" };
  // Nothing to draw before the first account: begin there rather than with months of flat zero.
  const clamped = start < firstDate;
  return { kind: "ok", start: clamped ? firstDate : start, end, clamped: clamped && key !== "all" };
}

/** Daily up to about three months, weekly up to two years, monthly beyond. */
export function stepFor(start: string, end: string): GrowthStep {
  const days = daysBetween(start, end) + 1;
  return days <= 92 ? "day" : days <= 731 ? "week" : "month";
}

/** The total at the end of `date`: the newest stored count that had closed by then. */
export function totalAt(counts: AccountCount[], date: string): number {
  let lo = 0;
  let hi = counts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (counts[mid].through <= date) lo = mid + 1;
    else hi = mid;
  }
  return lo === 0 ? 0 : counts[lo - 1].total;
}

/** True when `date` closes a bucket: any day, a Sunday (weeks start Monday), or a month's last day. */
function closes(date: string, step: GrowthStep): boolean {
  if (step === "day") return true;
  if (step === "week") return new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
  return addDays(date, 1).endsWith("-01");
}

/** The line: the first day of the range, the end of every full day/week/month after it, and the last day. */
export function linePoints(counts: AccountCount[], start: string, end: string, step: GrowthStep): GrowthLinePoint[] {
  const dates = [start];
  for (let d = addDays(start, 1); d < end; d = addDays(d, 1)) if (closes(d, step)) dates.push(d);
  if (end > start) dates.push(end);
  let previous = totalAt(counts, addDays(start, -1));
  return dates.map((date) => {
    const total = totalAt(counts, date);
    const point = { date, total, added: total - previous };
    previous = total;
    return point;
  });
}

/* Labels. Noon, so formatting a bare calendar day can never slide it onto its neighbour. */
export const noon = (iso: string): Date => new Date(`${iso}T12:00:00`);
export const shortDay = (iso: string): string => noon(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fullDay = (iso: string): string =>
  noon(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** "+2 that day" for a single day, otherwise "+9 since Nov 15" (the point before). */
export function addedText(points: GrowthLinePoint[], i: number): string {
  const previous = i > 0 ? points[i - 1].date : null;
  const since = previous !== null && daysBetween(previous, points[i].date) > 1 ? `since ${shortDay(previous)}` : "that day";
  return `+${points[i].added.toLocaleString()} ${since}`;
}

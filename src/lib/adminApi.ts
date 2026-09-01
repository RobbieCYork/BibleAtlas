import { supabase } from "./supabase";

/* ============================================================================
 * The Admin Console's data layer.
 *
 * WHERE THE BOUNDARY ACTUALLY IS — this file is not it.
 * ----------------------------------------------------------------------------
 * Every call below is a Postgres function that starts with `if not is_admin()
 * then raise` (see sql/019_admin_and_analytics.sql). The gate is server-side and
 * unconditional: calling any of these from a non-admin account — from this
 * module, from the browser console, or from curl against the REST endpoint —
 * returns a 4xx, not a smaller result set. Hiding the menu entry is a courtesy
 * to the UI; it is not the security model.
 *
 * WHY THERE IS NO SERVICE_ROLE KEY AND NO SERVERLESS FUNCTION.
 * ----------------------------------------------------------------------------
 * The one thing this console needs that ordinary RLS can't give it is a read of
 * `auth.users` (emails, signup dates, last sign-in, anonymous flag), which
 * PostgREST does not expose. Supabase's usual answer is the Admin API and a
 * service_role key — which cannot live in a Vite SPA, since anything in the
 * bundle is public and that key bypasses all RLS. Instead the privileged read
 * happens INSIDE the database, in a SECURITY DEFINER function behind is_admin().
 * Nothing elevated ever reaches the client, so no Edge Function and no Vercel
 * route is needed for anything the console currently does.
 *
 * The operations that genuinely still require service_role are deliberately not
 * built: deleting an account, changing someone's email, and confirming a user by
 * fiat. See ADMIN_ACTIONS_NOT_BUILT at the bottom of this file.
 * ========================================================================== */

export interface AdminOverview {
  users_total: number;
  users_registered: number;
  users_anonymous: number;
  users_new_24h: number;
  users_new_7d: number;
  users_new_30d: number;
  active_24h: number;
  active_7d: number;
  active_30d: number;
  sessions_24h: number;
  sessions_7d: number;
  events_total: number;
  analytics_since: string | null;
}

export interface AdminDailyRow {
  day: string;
  signups: number;
  sessions: number;
  active_users: number;
}

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_anonymous: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  last_seen_at: string | null;
  session_count: number;
  total_seconds: number;
  is_admin: boolean;
  total_count: number;
}

export interface AdminFeatureRow {
  event: string;
  uses: number;
  users: number;
  last_used: string;
}

export interface AdminBreakdownRow {
  label: string;
  uses: number;
  users: number;
}

export interface AdminEngagement {
  sessions: number;
  bounces: number;
  median_seconds: number | null;
  mean_seconds: number | null;
  p90_seconds: number | null;
  total_seconds: number;
  sessions_per_user: number;
  returning_users: number;
}

export type AdminContentCounts = Record<string, number>;

export interface AdminContentRow {
  kind: "post" | "comment";
  id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

/** Whether this account is an admin. Reads the caller's OWN admin_users row — the table's only
 * SELECT policy is `user_id = auth.uid()`, so this can neither enumerate other admins nor be
 * answered affirmatively by a client that simply decides to. A false here only hides the UI;
 * the real refusal happens in the database on every call below. */
export async function fetchIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    // A missing table (migration 019 not applied in this environment) is "not an admin", not an error
    // worth surfacing — same silent-degradation pattern as fetchPlanProgress in lib/supabase.ts.
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

export const fetchOverview = () => rpc<AdminOverview>("admin_overview");
export const fetchDailyActivity = (days = 30) => rpc<AdminDailyRow[]>("admin_daily_activity", { p_days: days });
export const fetchFeatureUsage = (days = 30) => rpc<AdminFeatureRow[]>("admin_feature_usage", { p_days: days });
export const fetchEngagement = (days = 30) => rpc<AdminEngagement>("admin_engagement", { p_days: days });
export const fetchContentCounts = () => rpc<AdminContentCounts>("admin_content_counts");
export const fetchRecentPublicContent = (limit = 40) =>
  rpc<AdminContentRow[]>("admin_recent_public_content", { p_limit: limit });

export const fetchFeatureBreakdown = (event: string, key: string, days = 30) =>
  rpc<AdminBreakdownRow[]>("admin_feature_breakdown", { p_event: event, p_key: key, p_days: days });

export const fetchUsers = (search: string | null, limit = 50, offset = 0) =>
  rpc<AdminUserRow[]>("admin_list_users", { p_search: search, p_limit: limit, p_offset: offset });

export const deleteContent = (kind: "post" | "comment", id: string) =>
  rpc<void>("admin_delete_content", { p_kind: kind, p_id: id });

/* ----------------------------------------------------------------------------
 * PASSWORD RESET.
 *
 * This sends the SAME email the "Forgot password?" link on the sign-in form
 * sends (AuthButton.tsx does the identical call). The admin triggers it; the
 * account holder completes it in their own inbox, choosing their own password,
 * which ResetPasswordGate then collects.
 *
 * An admin cannot read, choose, or set anyone's password here, and nothing in
 * this codebase provides a way to — that is a deliberate design constraint, not
 * a gap. Supabase's admin API could overwrite a password with a service_role
 * key; that capability is exactly why the key stays out of this app.
 *
 * Supabase deliberately returns success for an address it has never seen (so the
 * endpoint can't be used to test whether an email has an account), so a resolved
 * promise here means "the request was accepted", not "the mail was delivered".
 * The UI says so rather than over-claiming.
 * -------------------------------------------------------------------------- */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw new Error(error.message);
}

/** Admin capabilities that were considered and deliberately NOT built, because each one requires the
 * Supabase service_role key — which cannot exist in a client bundle without handing over the whole
 * database. Surfaced in the console itself so the boundary is visible rather than mysterious. */
export const ADMIN_ACTIONS_NOT_BUILT = [
  "Deleting an account outright (auth.admin.deleteUser)",
  "Changing someone's email address",
  "Manually confirming an unverified email",
  "Signing in as another user to reproduce a bug",
] as const;

/** Seconds → "3m 20s" / "1h 4m". Used for session durations, which are commonly under a minute. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !isFinite(seconds) || seconds <= 0) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** "Jan 5, 2:04 PM" for recent things, "Jan 5, 2026" for older — a last-seen column is only useful
 * if the recent end of it is precise. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const daysAgo = (Date.now() - d.getTime()) / 86_400_000;
  return daysAgo < 7
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Turns an event name into something readable in the ranked list without maintaining a second
 * vocabulary: "panel.open" → "Panel · open". Unknown events (added later, or from an older build)
 * still render sensibly, which is the point of doing it structurally rather than with a lookup map. */
export function labelEvent(event: string): string {
  return event
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" · ");
}

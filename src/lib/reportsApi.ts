import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/* ============================================================================
 * The issue reporter's data layer — the client half of sql/025_roles_and_reports.sql.
 *
 * WHERE THE BOUNDARY IS. Not here. Every privileged call below is a Postgres
 * function whose first statement is `if not has_role_at_least(...) then raise
 * '42501 not authorized'`. Hiding a menu item is a courtesy; the refusal that
 * matters happens in the database, to this module, to the browser console, and
 * to curl alike. useCurrentRole() below decides only what to DRAW.
 *
 * ── THE ONE TRAP THAT LOOKS LIKE AN EMPTY DASHBOARD ─────────────────────────
 * An advisor has NO SELECT privilege on `reports` at all — deliberately, so that
 * flipping `reports.reveal_reporter_to_advisors` can hide the reporter's name
 * with one UPDATE instead of a migration (RLS is row-level; it cannot hide a
 * column). PostgREST answers a select an advisor is not permitted to see with an
 * EMPTY ARRAY, not an error. So:
 *
 *     supabase.from("reports").select()      // advisor → [] forever, silently
 *
 * would render "No reports yet" on a dashboard with a hundred rows in it and
 * nothing anywhere would say why. Every staff read therefore goes through
 * report_list() / report_detail(), which are SECURITY DEFINER and do raise.
 * The only direct table read in this file is fetchMyReports(), which reads the
 * caller's own rows through the policy written for exactly that.
 *
 * ── NUMERICS ARRIVE AS STRINGS ──────────────────────────────────────────────
 * `total_count` is `bigint`, which PostgREST ships as a JSON string. coerceRow()
 * below is the single place that converts it, so no call site has to remember.
 *
 * ── THERE IS NO VOTING ANY MORE ─────────────────────────────────────────────
 * sql/025 let advisors cast agree/disagree votes that fed `priority_score`.
 * Robbie removed that (2026-11-26) and sql/052 closes every write path to it.
 * report_list()/report_detail() still RETURN the old vote columns (changing a
 * RETURNS TABLE is a drop-and-recreate, not worth the risk for an unused
 * column), so the types below simply leave them out and nothing reads them.
 * Do not reintroduce a `priority` sort: the score is frozen vote history.
 *
 * ── ERRORS ARE IDENTIFIED BY MESSAGE PREFIX, NOT BY CODE ────────────────────
 * The migration raises `rate_limited:`, `duplicate_submission:`, `report_locked:`,
 * `self_assignment:` and `last_owner:` as prefixed messages (some share sqlstate
 * 23505 or 42501 with unrelated failures, so the code cannot tell them apart).
 * humanizeReportError() is the one translator; nothing should show a reporter a
 * raw Postgres string.
 * ========================================================================== */

export type Role = "user" | "advisor" | "administrator" | "owner";

export type ReportStatus =
  | "new"
  | "triaged"
  | "accepted"
  | "in_progress"
  | "resolved"
  | "declined"
  | "duplicate";

export type Severity = "low" | "medium" | "high" | "critical";

export type TargetKind =
  | "article"
  | "poi"
  | "timeline_event"
  | "person"
  | "topic"
  | "reading_plan"
  | "scripture"
  | "game"
  | "profile"
  | "other";

/** Ascending privilege. Mirrors role_rank() in sql/025 — the database is the authority; this exists
 * only so the UI can ask "is this account at least an advisor?" without a round trip per question. */
const ROLE_RANK: Record<Role, number> = { user: 0, advisor: 1, administrator: 2, owner: 3 };

export function hasRoleAtLeast(role: Role | null, needed: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[needed];
}

export const ROLE_LABELS: Record<Role, string> = {
  user: "Member",
  advisor: "Advisor",
  administrator: "Administrator",
  owner: "Owner",
};

/** A row of `report_categories`. DATA, not a union type: an administrator can add a category at
 * runtime through report_upsert_category(), so a hardcoded list here would be wrong the moment they
 * did — and the new category's reports would render with a blank label. Always read the table.
 *
 * `is_active = false` is a RETIRED category (sql/052 retires `typo`): not offered to a reporter, but
 * old reports still point at it, so label lookups must use fetchAllCategories(). */
export interface ReportCategory {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

/** One row of report_list(). Column order and names are fixed by the function's RETURNS TABLE. */
export interface ReportListRow {
  id: string;
  created_at: string;
  updated_at: string;
  category: string;
  category_label: string | null;
  title: string;
  body: string;
  reporter_severity: Severity | null;
  status: ReportStatus;
  page_url: string | null;
  route: string | null;
  page_title: string | null;
  target_kind: TargetKind | null;
  target_id: string | null;
  target_label: string | null;
  selected_text: string | null;
  build_id: string | null;
  user_agent: string | null;
  viewport_w: number | null;
  viewport_h: number | null;
  platform: string | null;
  duplicate_of: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  assigned_to: string | null;
  /** Null unless the viewer is an administrator, or `reports.reveal_reporter_to_advisors` is on. */
  reporter_id: string | null;
  reporter_name: string | null;
  /** bigint in Postgres — see the header note. REPEATED ON EVERY ROW: it is the total matching the
   * filter, not this row's anything. Read it from row 0 and use it for paging. */
  total_count: number;
}

export interface ReportHistoryRow {
  at: string;
  actor_id: string | null;
  actor_name: string | null;
  old_status: ReportStatus | null;
  new_status: ReportStatus;
  note: string | null;
}

/** The `reports` TABLE row, exactly as report_detail() ships it: `to_jsonb(r)`, the base table and
 * nothing else.
 *
 * NOT a ReportListRow, and typing it as one is a trap rather than a shortcut. report_list() is a
 * RETURNS TABLE that joins and computes, so the two shapes differ in BOTH directions. Missing here:
 * `category_label` (joined from report_categories), `reporter_name` (joined from profiles/
 * auth.users) and `total_count` (a paging total, which one row has no meaning for) — read the first
 * two off ReportDetail itself. Present here and absent from report_list(): `app_context`,
 * `resolved_by`, `triaged_at`.
 *
 * The failure mode this type exists to prevent is silent: `detail.report.reporter_name`
 * type-checks against ReportListRow, compiles, and is `undefined` at runtime forever. */
export interface ReportRow {
  id: string;
  /** ABSENT, not null, when the viewer is an advisor and `reports.reveal_reporter_to_advisors` is
   * off — report_detail() deletes the key from the jsonb. For identity read ReportDetail's own
   * `reporter_name`, which is the field that knows about the setting. */
  reporter_id?: string;
  category: string;
  title: string;
  body: string;
  reporter_severity: Severity | null;
  page_url: string | null;
  route: string | null;
  page_title: string | null;
  target_kind: TargetKind | null;
  target_id: string | null;
  target_label: string | null;
  selected_text: string | null;
  build_id: string | null;
  user_agent: string | null;
  viewport_w: number | null;
  viewport_h: number | null;
  platform: string | null;
  /** sql/025's size-capped escape hatch, and `{}` on every row this app files: the reporter is shown
   * every field before they send, and a payload they cannot see is exactly what that rule exists to
   * prevent. Typed because it is really there, not because anything should start filling it. */
  app_context: Record<string, unknown>;
  status: ReportStatus;
  duplicate_of: string | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  triaged_at: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

/** report_detail()'s jsonb. `report` is the whole table row (minus reporter_id when identity is
 * hidden). The jsonb also still carries sql/025's `votes` array; it is deliberately not typed. */
export interface ReportDetail {
  report: ReportRow;
  reporter_name: string | null;
  category_label: string | null;
  history: ReportHistoryRow[];
}

export interface ReportCounts {
  by_status: Partial<Record<ReportStatus, number>>;
  by_category: Record<string, number>;
  open: number;
  untriaged: number;
}

export interface UserRoleRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
  granted_at: string;
  granted_by: string | null;
  granted_by_name: string | null;
  note: string | null;
}

/** Exactly the columns sql/025's INSERT policy and before-insert trigger accept from a client.
 * Everything else on `reports` is server-owned: the trigger overwrites status, the frozen
 * priority/vote columns and the timestamps on the way in, so sending them is at best a no-op and at
 * worst a bug that looks like it worked. This type is the enforcement — there is no field here
 * that must not be sent. */
export interface NewReport {
  reporter_id: string;
  category: string;
  title: string;
  body: string;
  reporter_severity: Severity | null;
  page_url: string | null;
  route: string | null;
  page_title: string | null;
  target_kind: TargetKind | null;
  target_id: string | null;
  target_label: string | null;
  selected_text: string | null;
  build_id: string | null;
  user_agent: string | null;
  viewport_w: number | null;
  viewport_h: number | null;
  platform: string | null;
}

/** A reporter's own report, read straight from the table through reports_select_own_or_staff. This
 * is the one place a direct `from("reports")` is correct — see the header note. */
export interface MyReportRow {
  id: string;
  created_at: string;
  updated_at: string;
  category: string;
  title: string;
  body: string;
  reporter_severity: Severity | null;
  status: ReportStatus;
  page_title: string | null;
  target_kind: TargetKind | null;
  target_label: string | null;
  selected_text: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  new: "New",
  triaged: "Triaged",
  accepted: "Accepted",
  in_progress: "In progress",
  resolved: "Resolved",
  declined: "Declined",
  duplicate: "Duplicate",
};

/** What a reporter is told their report's status means. Deliberately warmer and less internal than
 * STATUS_LABELS: "Declined" on its own reads as a door closing, and the person on the other end
 * took the trouble to write in. */
export const STATUS_BLURBS: Record<ReportStatus, string> = {
  new: "Waiting to be looked at. You can still edit or delete it.",
  triaged: "Read and sorted. It can no longer be edited.",
  accepted: "Agreed it's a real problem — queued to be fixed.",
  in_progress: "Someone is working on it now.",
  resolved: "Done. Thank you for reporting it.",
  declined: "Looked at and not taken forward. Any reason given is below.",
  duplicate: "Already reported by someone else — merged with the original.",
};

/** The category a feature suggestion is filed under: sql/025's `idea` key ("Idea or suggestion", and
 * "Suggestion" since sql/052). The form sets it itself when the reader chooses "Suggest a feature",
 * so it is left out of the problem form's category picker. */
export const SUGGESTION_CATEGORY = "idea";

export function isSuggestion(report: { category: string }): boolean {
  return report.category === SUGGESTION_CATEGORY;
}

/** STATUS_BLURBS for a suggestion: the same statuses, without the words that assume something is wrong. */
export const SUGGESTION_STATUS_BLURBS: Record<ReportStatus, string> = {
  new: "Waiting to be looked at. You can still edit or delete it.",
  triaged: "Read and sorted. It can no longer be edited.",
  accepted: "We'd like to do this. It's on the list.",
  in_progress: "Someone is working on it now.",
  resolved: "Done. Thank you for suggesting it.",
  declined: "Looked at and not taken forward. Any reason given is below.",
  duplicate: "Already suggested by someone else — merged with the original.",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Minor",
  medium: "Noticeable",
  high: "Serious",
  critical: "Blocks me from using the app",
};

/** Human names for the schema's fixed target_kind list. `article` is the Places dataset
 * (src/data/locations.ts): sql/025 gave POIs, people, topics and timeline events kinds of their
 * own, which leaves `article` as the kind for the fifth thing the Articles panel browses. */
export const TARGET_KIND_LABELS: Record<TargetKind, string> = {
  article: "Place",
  poi: "Point of interest",
  timeline_event: "Timeline event",
  person: "Person",
  topic: "Topic",
  reading_plan: "Reading plan",
  scripture: "Scripture",
  game: "Game",
  profile: "Profile",
  other: "Elsewhere",
};

/* --------------------------------------------------------------------------
 * Errors
 * ------------------------------------------------------------------------ */

/** Turns what sql/025 raises into a sentence a reporter can act on.
 *
 * Matching on the message PREFIX rather than the sqlstate is not laziness — it is the only thing
 * that works. `duplicate_submission:` is raised with 23505, which is also every ordinary unique
 * violation in the database; `report_locked:` has no distinguishing code at all; `self_assignment:`
 * and `last_owner:` share 42501 with the plain tier refusal. The prefixes are the discriminator the
 * migration deliberately provides. */
export function humanizeReportError(err: unknown, suggestion = false): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (raw.startsWith("rate_limited:")) {
    if (suggestion) {
      return "You've sent several reports or suggestions in a short time. Give it an hour and try again — the limit is there to stop a stuck button flooding the queue, not to stop you writing in.";
    }
    return "You've filed several reports in a short time. Give it an hour and try again — the limit is there to stop a stuck button flooding the queue, not to stop you reporting things.";
  }
  if (raw.startsWith("duplicate_submission:")) {
    if (suggestion) return "That looks like the suggestion you just sent. It's already in — no need to send it twice.";
    return "That looks like the report you just sent. It's already in — no need to send it twice.";
  }
  if (raw.startsWith("report_locked:")) {
    if (suggestion) {
      return "The team has already picked this suggestion up, so it can't be changed or withdrawn now. Send a new one if there's something to add.";
    }
    return "The team has already picked this report up, so it can't be changed or withdrawn now. File a new one if there's something to add.";
  }
  if (raw.startsWith("self_assignment:")) {
    return "You can't change your own role. Ask the other owner to do it.";
  }
  if (raw.startsWith("last_owner:")) {
    return "There has to be at least one owner. Promote someone else first, then change this one.";
  }
  // THE RLS REFUSAL, WHICH HAS NO PREFIX BECAUSE POSTGRES WROTE IT, NOT THE MIGRATION. PostgREST
  // hands the policy's own text through verbatim — "new row violates row-level security policy for
  // table \"reports\"" — and without this case it falls all the way to `return raw` and a reader
  // sees those words. The way to get one is a guest: reports_insert_own requires a non-anonymous
  // JWT unless app_settings 'reports.allow_anonymous' says otherwise, and it ships false.
  //
  // This is the SEATBELT, not the fix. ReportIssueSheet's guest branch is what actually stops an
  // anonymous session ever reaching a form it cannot submit, and AuthGate stops one reaching the
  // header at all today. But `allow_anonymous` is a live app_settings row that flips with one
  // UPDATE, in either direction, with no deploy — so this path is one setting away from real, and
  // a raw Postgres string is never an acceptable thing to show a reader.
  if (raw.includes("row-level security policy")) {
    if (suggestion) {
      return "Sending a suggestion needs a full account, so the team can come back to you about it — guest browsing can't. Sign in with an account you created and try again.";
    }
    return "Filing a report needs a full account, so the team can come back to you about it — guest browsing can't. Sign in with an account you created and try again.";
  }
  // The tier refusal every gated function raises, plus the bare table-grant refusal that reads the
  // same to a reader. Reachable if a role was revoked between the menu being drawn and the call
  // being made.
  if (raw.includes("not authorized") || raw.startsWith("permission denied")) {
    return "Your account doesn't have access to that. If that's a surprise, your role may have changed since this screen loaded — reload and try again.";
  }
  if (!raw) return "Something went wrong. Try again.";
  // THE LAST RESORT, AND THE REASON THIS FUNCTION NO LONGER ENDS IN `return raw`.
  //
  // Every branch above translates a message we put there on purpose. Anything reaching this line is
  // by definition a string nobody wrote for a reader: a Postgres constraint name, a PostgREST
  // envelope, a fetch failure, a future migration's new error that this file hasn't learned yet.
  // Showing it leaks schema details and reads as a crash; there is no wording of it that helps.
  //
  // But it is the only evidence of a case we haven't handled, so it is not discarded — it goes to
  // the console, where a developer looking at a bug report can find it, and where it costs a reader
  // nothing. When one of these shows up, the fix is to add a branch above, not to widen this one.
  console.error("[reports] unhandled error, showing the generic message instead:", raw, err);
  return "Something went wrong. Try again.";
}

/* --------------------------------------------------------------------------
 * Role
 * ------------------------------------------------------------------------ */

/** The caller's own role, or null for an ordinary member (current_user_role() returns null when
 * there is no user_roles row) AND for every failure. Those two are collapsed on purpose: this
 * answer only ever unlocks UI, so an unreachable database, a revoked grant and a genuine "you are
 * a member" must all come out as the least privilege, never the most. */
export async function fetchCurrentRole(): Promise<Role | null> {
  try {
    const { data, error } = await supabase.rpc("current_user_role");
    if (error) return null;
    const value = data as string | null;
    return value && value in ROLE_RANK ? (value as Role) : null;
  } catch {
    return null;
  }
}

/** The single role gate the UI uses, so every entry point asks the same question the same way —
 * the same reason lib/adminApi.ts has useIsAdmin() rather than a check per call site.
 *
 * FAILS CLOSED, and says which kind of "no" it is. `loading` starts true and only clears once an
 * answer has actually arrived, so a slow network renders nothing privileged rather than flashing a
 * member-level screen at an owner (or, worse, the other way round if this ever gated a hide). */
export function useCurrentRole(userId: string | null | undefined): { role: Role | null; loading: boolean } {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchCurrentRole().then((r) => {
      if (cancelled) return;
      setRole(r);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { role, loading };
}

/* --------------------------------------------------------------------------
 * Categories
 * ------------------------------------------------------------------------ */

/** report_categories is world-readable (it is a dropdown), so this is a plain table select and not
 * an RPC. Only active rows, in the order an administrator gave them. */
export async function fetchCategories(): Promise<ReportCategory[]> {
  const { data, error } = await supabase
    .from("report_categories")
    .select("key,label,description,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as ReportCategory[] | null) ?? [];
}

/** Active AND retired categories, for turning a stored key back into a label. A report filed under a
 * category that has since been retired (sql/052 retires `typo`) must still show its real name, not
 * its key and not "Uncategorised". The table's select policy is `using (true)`, so this works for
 * every reader. */
export async function fetchAllCategories(): Promise<ReportCategory[]> {
  const { data, error } = await supabase
    .from("report_categories")
    .select("key,label,description,sort_order,is_active")
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as ReportCategory[] | null) ?? [];
}

/** What a report shows when its key matches no category row at all. The FK on reports.category makes
 * that impossible today; the label exists so a future data fault reads as a gap, not as a raw key. */
export const UNCATEGORISED_LABEL = "Uncategorised";

export function categoryLabelFor(key: string | null | undefined, categories: ReportCategory[]): string {
  if (!key) return UNCATEGORISED_LABEL;
  return categories.find((c) => c.key === key)?.label ?? UNCATEGORISED_LABEL;
}

/** The category to preselect from where the report was opened — only where the screen makes it
 * obvious, and only if that key is actually offered (before sql/052 is applied the area keys do not
 * exist, so nothing is preselected and the reporter chooses, exactly as before). The reporter can
 * always change it. */
export function suggestedCategoryForRoute(route: string, categories: ReportCategory[]): string {
  const head = route.split("/")[0];
  const key =
    head === "bible"
      ? "bible_reader"
      : head === "map"
        ? "map"
        : head === "timeline"
          ? "timeline"
          : head === "games"
            ? "games"
            : head === "settings"
              ? "account"
              : head === "articles" && route !== "articles"
                ? "incorrect_info"
                : "";
  return key && categories.some((c) => c.key === key && c.is_active) ? key : "";
}

/* --------------------------------------------------------------------------
 * Filing and reading your own reports
 * ------------------------------------------------------------------------ */

export async function submitReport(report: NewReport): Promise<void> {
  const { error } = await supabase.from("reports").insert(report);
  if (error) throw new Error(error.message);
}

export async function fetchMyReports(userId: string): Promise<MyReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id,created_at,updated_at,category,title,body,reporter_severity,status,page_title,target_kind,target_label,selected_text,resolution_note,resolved_at"
    )
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as MyReportRow[] | null) ?? [];
}

/** Administrator re-files a report into another category. A plain table update, because sql/025
 * already allows it: the RLS UPDATE policy admits administrators, and reports_before_update() lets
 * staff change `category` (it freezes the reporter's body and every auto-captured field). Works the
 * same before and after sql/052. Zero rows back means the policy filtered it — i.e. not an admin. */
export async function setReportCategory(reportId: string, category: string): Promise<void> {
  const { data, error } = await supabase.from("reports").update({ category }).eq("id", reportId).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("not authorized");
}

/** Title, body and severity only — the three columns reports_before_update() lets a reporter touch,
 * and only while the report is still 'new'. Anything else silently reverts to its old value, so
 * sending more would produce a save that appeared to work and didn't.
 *
 * ── WHY THIS CHECKS THE ROW COUNT INSTEAD OF WAITING FOR `report_locked:` ────
 * reports_before_update() does raise `report_locked:` when a reporter edits a triaged report — but
 * a reporter can never reach it. The RLS policy's USING clause is
 * `(reporter_id = auth.uid() and status = 'new') or has_role_at_least('administrator')`, and a row
 * a policy filters out is not "denied", it is NOT THERE: PostgREST updates zero rows and returns
 * 200 with no error at all. The trigger's message is for a privileged connection.
 *
 * So the only signal that an edit was refused is that nothing came back. `.select()` asks for the
 * updated rows, and an empty result means staff triaged this report between the editor opening and
 * Save being pressed. Raising the migration's own prefix here keeps humanizeReportError() as the
 * single translator rather than inventing a second vocabulary for the same event. */
export async function updateMyReport(
  reportId: string,
  fields: { title: string; body: string; reporter_severity: Severity | null }
): Promise<void> {
  const { data, error } = await supabase.from("reports").update(fields).eq("id", reportId).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("report_locked: this report has been triaged and can no longer be edited");
  }
}

/** Same zero-rows-is-a-refusal reasoning as updateMyReport — reports_delete_own_untriaged filters
 * rather than denies, so a delete of a triaged report is a silent no-op without this check. */
export async function deleteMyReport(reportId: string): Promise<void> {
  const { data, error } = await supabase.from("reports").delete().eq("id", reportId).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("report_locked: this report has been triaged and can no longer be deleted");
  }
}

/* --------------------------------------------------------------------------
 * Staff
 * ------------------------------------------------------------------------ */

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

/** The one place the bigint paging total stops being a string. See the header note. */
function coerceRow(row: ReportListRow): ReportListRow {
  return { ...row, total_count: Number(row.total_count ?? 0) };
}

export interface ReportListFilters {
  status?: ReportStatus[] | null;
  category?: string | null;
  targetKind?: TargetKind | null;
  search?: string | null;
  sort?: "newest" | "oldest";
  limit?: number;
  offset?: number;
}

/** Returns the page plus the total the filter matches. `total` comes off row 0's `total_count`,
 * which report_list() repeats on every row — an empty page genuinely has no total to report, which
 * is exactly 0. */
export async function fetchReportList(
  filters: ReportListFilters = {}
): Promise<{ rows: ReportListRow[]; total: number }> {
  const raw = await rpc<ReportListRow[]>("report_list", {
    p_status: filters.status && filters.status.length > 0 ? filters.status : null,
    p_category: filters.category ?? null,
    p_target_kind: filters.targetKind ?? null,
    p_search: filters.search?.trim() || null,
    p_sort: filters.sort ?? "newest",
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });
  const rows = (raw ?? []).map(coerceRow);
  return { rows, total: rows.length > 0 ? rows[0].total_count : 0 };
}

export async function fetchReportDetail(reportId: string): Promise<ReportDetail> {
  return rpc<ReportDetail>("report_detail", { p_report_id: reportId });
}

/** How many reports match these filters, without fetching them — report_list() repeats its total on
 * every row, so a one-row page is enough. Used for the per-category counts in the Admin Console, so
 * the numbers on the category tabs follow the status chips and search instead of counting everything. */
export async function countReports(filters: Omit<ReportListFilters, "limit" | "offset" | "sort">): Promise<number> {
  const { total } = await fetchReportList({ ...filters, limit: 1, offset: 0 });
  return total;
}

export async function fetchReportCounts(): Promise<ReportCounts> {
  return rpc<ReportCounts>("report_counts");
}

export async function setReportStatus(
  reportId: string,
  status: ReportStatus,
  resolutionNote: string | null,
  duplicateOf: string | null
): Promise<void> {
  await rpc<void>("report_set_status", {
    p_report_id: reportId,
    p_status: status,
    p_resolution_note: resolutionNote?.trim() || null,
    p_duplicate_of: duplicateOf,
  });
}

export async function assignReport(reportId: string, assignee: string | null): Promise<void> {
  await rpc<void>("report_assign", { p_report_id: reportId, p_assignee: assignee });
}

export async function fetchUserRoles(): Promise<UserRoleRow[]> {
  return (await rpc<UserRoleRow[]>("list_user_roles")) ?? [];
}

/** Owner only. `role: "user"` deletes the user_roles row — that is how a grant is revoked. */
export async function setUserRole(userId: string, role: Role, note: string | null): Promise<void> {
  await rpc<void>("set_user_role", { p_user_id: userId, p_role: role, p_note: note?.trim() || null });
}

/** "3 hours ago" / "Jan 5" — a report queue is read by how fresh things are, and an ISO string
 * makes that arithmetic the reader's job. Falls back to a date past a week, where "9 days ago"
 * stops being more useful than the date itself. */
export function formatAge(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return "—";
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

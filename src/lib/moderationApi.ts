import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

/* ============================================================================
 * The client half of sql/028_moderation.sql — blocking, reporting, hiding, and
 * the administrator's queue.
 *
 * ── WHERE THE BOUNDARY IS. NOT HERE. ────────────────────────────────────────
 * A blocked account's posts, comments, messages and profile are filtered by
 * RESTRICTIVE row-level security policies, so they are absent from the response
 * before this file sees it — to the app, to the browser console, and to curl
 * with the anon key alike. Nothing in this module filters a blocked user out of
 * anything, and nothing in this module could be edited to let one back in.
 * What is here is the UI's half: the calls that create a block, and the screens
 * that manage them.
 *
 * The one thing this file DOES filter is `content_hides` — "hide this post",
 * a personal preference the reader chose and can undo, which sql/028
 * deliberately did not spend a policy on. See that file's section 2.
 *
 * ── THE MIGRATION IS NOT APPLIED YET, AND THIS BUILD SHIPS ANYWAY ───────────
 * sql/028 needs a human to run it (there is no migrations tooling in this repo)
 * and applying it to production is not a decision a deploy gets to make. So
 * every entry point in the app asks isModerationAvailable() first, and until
 * the migration lands the answer is false and the moderation UI is simply not
 * drawn. Nothing throws, nothing renders a broken sheet, and no reader meets a
 * "Report" button that cannot report.
 *
 * The probe is ONE query — `select key from moderation_reasons limit 1` — whose
 * result is also the taxonomy the report form needs, cached module-wide for the
 * page's lifetime. PostgREST answers a missing table with PGRST205 (and a
 * missing function with PGRST202); isMissingSchema() below recognises both, and
 * treats every other failure as "available but something went wrong", because
 * a network blip must not silently disable the safety features for the session.
 *
 * When the migration is applied there is nothing to deploy: the next page load
 * finds the table and the UI appears.
 * ========================================================================== */

/** Published contact address, App Store Review Guideline 1.2's fourth requirement.
 *
 * Defined here rather than typed into each of the four places it appears (the sign-in card, the
 * in-app Safety screen, the report form's acknowledgement, and the pre-rendered library footer in
 * scripts/seo/render.mjs — which cannot import this file and carries its own copy with a comment
 * pointing back here). One address, changed in one place, except for the static one. */
export const MODERATION_CONTACT_EMAIL = "admin@capstonebible.com";

/** What we tell people about turnaround, and what the admin queue is therefore promising. Apple
 * asks for "timely" responses; a stated number is what makes that checkable. */
export const MODERATION_RESPONSE_WINDOW = "within 24 hours";

export type ModerationTargetKind =
  | "post"
  | "post_comment"
  | "note"
  | "note_comment"
  | "message"
  | "group_message"
  | "profile";

/** What a reader sees named on the "why are you reporting this" list. DATA, not a union type, for
 * the same reason reportsApi.ts gives for report_categories: an administrator can retire or add a
 * reason at runtime, and a hardcoded list here would be wrong the moment they did. */
export interface ModerationReason {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export type ModerationStatus = "new" | "reviewing" | "actioned" | "dismissed";

export type ModerationAction =
  | "none"
  | "content_removed"
  | "note_unpublished"
  | "user_warned"
  | "referred";

/** One row of moderation_queue(). Column names and order are fixed by that function's RETURNS TABLE. */
export interface ModerationQueueRow {
  id: string;
  created_at: string;
  updated_at: string;
  target_kind: ModerationTargetKind;
  target_id: string;
  target_owner_id: string | null;
  target_owner_name: string | null;
  reason: string;
  reason_label: string | null;
  details: string | null;
  /** A snapshot of what the reporter was looking at, taken by their browser at the moment they
   * pressed the button — NOT a server-verified copy of the row as it stands now. The author may
   * have edited or deleted it since, which is exactly why the snapshot exists. The queue labels
   * it as the reporter's account of what they saw. */
  content_excerpt: string | null;
  context_label: string | null;
  status: ModerationStatus;
  action_taken: ModerationAction | null;
  resolution_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  reporter_id: string | null;
  reporter_name: string | null;
  target_still_exists: boolean | null;
  /** bigint in Postgres — arrives as a string, coerced by coerceQueueRow(). Every report ever filed
   * against this account, not just the open ones. One is an incident; eleven is a pattern. */
  reports_against_owner: number;
  /** bigint in Postgres. REPEATED ON EVERY ROW: it is the total matching the filter, not this
   * row's anything. Read it off row 0. Same shape (and same trap) as report_list()'s. */
  total_count: number;
}

export interface ModerationCounts {
  new: number;
  reviewing: number;
  actioned: number;
  dismissed: number;
  open: number;
  last_24h: number;
  blocks: number;
}

export interface BlockedAccount {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
  reason: string | null;
}

export interface ModerationHistoryRow {
  at: string;
  actor_name: string | null;
  target_kind: string | null;
  action: string;
  new_status: string | null;
  note: string | null;
}

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  actioned: "Actioned",
  dismissed: "Dismissed",
};

export const MODERATION_ACTION_LABELS: Record<ModerationAction, string> = {
  none: "No action",
  content_removed: "Content removed",
  note_unpublished: "Note unpublished",
  user_warned: "User warned",
  referred: "Referred / handled outside the app",
};

/** Human names for the seven things a report can be about. Used in the queue and in the report
 * sheet's own heading, so a reporter is told what they are reporting. */
export const MODERATION_TARGET_LABELS: Record<ModerationTargetKind, string> = {
  post: "post",
  post_comment: "comment",
  note: "public note",
  note_comment: "note comment",
  message: "direct message",
  group_message: "group message",
  profile: "profile",
};

/* --------------------------------------------------------------------------
 * Availability
 * ------------------------------------------------------------------------ */

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

/** True when the failure means "sql/028 has not been run", and false for every other failure.
 *
 * The asymmetry is deliberate and it points one way on purpose: a timeout, a dropped connection or
 * a 500 must NOT be read as "moderation isn't installed", because that would quietly remove the
 * block and report buttons from a live app for the rest of the session. Only the two errors that
 * specifically mean "no such relation / no such function" count. */
function isMissingSchema(error: PostgrestLikeError | null | undefined): boolean {
  if (!error) return false;
  // PGRST205: table not found in the schema cache. PGRST202: function not found.
  // 42P01 / 42883: Postgres' own "undefined table" / "undefined function", which is what comes
  // back when PostgREST passes the database's error through instead of answering from its cache.
  if (error.code && ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code)) return true;
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    msg.includes("could not find the function") ||
    (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("function")))
  );
}

/** null = not asked yet. Cached for the life of the page: the answer only changes when a human runs
 * a migration, which is not something a React render should re-check. */
let availability: boolean | null = null;
let cachedReasons: ModerationReason[] | null = null;
let probe: Promise<boolean> | null = null;

async function runProbe(): Promise<boolean> {
  const { data, error } = await supabase
    .from("moderation_reasons")
    .select("key,label,description,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    if (isMissingSchema(error)) {
      availability = false;
      return false;
    }
    // Something else went wrong. Assume the feature IS there — see isMissingSchema's note — but
    // do NOT cache that as a settled answer, so the next caller retries and can populate reasons.
    console.error("[moderation] reason list failed, assuming the feature is installed:", error.message);
    return true;
  }
  cachedReasons = (data as ModerationReason[] | null) ?? [];
  availability = true;
  return true;
}

export function isModerationAvailable(): Promise<boolean> {
  if (availability !== null) return Promise.resolve(availability);
  if (!probe) {
    probe = runProbe().finally(() => {
      // Cleared only when the answer was inconclusive, so a transient failure retries rather than
      // pinning the session to a guess.
      if (availability === null) probe = null;
    });
  }
  return probe;
}

/** `null` while the answer is still in flight. Every caller renders NOTHING privileged for null —
 * a "Report" button that flashes in and then disappears is worse than one that arrives a beat late,
 * and a "Block" button that appears when the feature is missing is worse than both. */
export function useModerationAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(availability);
  useEffect(() => {
    if (availability !== null) {
      setAvailable(availability);
      return;
    }
    let cancelled = false;
    void isModerationAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}

/** The reason list, already fetched by the probe in the common case. Returns [] rather than
 * throwing when the migration is missing — the sheet that calls this is only ever mounted behind
 * useModerationAvailable(), so [] there means a genuinely empty active taxonomy. */
export async function fetchModerationReasons(): Promise<ModerationReason[]> {
  if (cachedReasons) return cachedReasons;
  await isModerationAvailable();
  if (cachedReasons) return cachedReasons;
  const { data, error } = await supabase
    .from("moderation_reasons")
    .select("key,label,description,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  cachedReasons = (data as ModerationReason[] | null) ?? [];
  return cachedReasons;
}

/* --------------------------------------------------------------------------
 * Errors
 * ------------------------------------------------------------------------ */

/** Turns what sql/028 raises into a sentence a reader can act on.
 *
 * Matched on the message PREFIX, not the sqlstate, for the reason reportsApi.ts's own translator
 * spells out: `duplicate_report:` is raised with 23505, which is also every ordinary unique
 * violation in the database, and `self_report:` shares 22023 with three unrelated refusals. The
 * prefixes are the discriminator the migration deliberately provides. */
export function humanizeModerationError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (raw.startsWith("duplicate_report:")) {
    return "You've already reported this — it's with the team. Reporting it again doesn't move it up the queue.";
  }
  if (raw.startsWith("report_target_missing:")) {
    return "That's no longer there to report — it may have been deleted, or you may have blocked the account since. If you've already blocked them, you don't need to report it as well.";
  }
  if (raw.startsWith("self_report:")) {
    return "That's your own content. Delete it instead of reporting it.";
  }
  if (raw.startsWith("report_reason_invalid:") || raw.startsWith("report_target_invalid:")) {
    return "Something about that report didn't make sense to the server. Reload the page and try again.";
  }
  if (raw.startsWith("rate_limited:")) {
    return `You've sent a lot of reports in the last hour. Give it a while — everything already sent is in the queue, and the team looks at it ${MODERATION_RESPONSE_WINDOW}.`;
  }
  if (raw.startsWith("self_block:")) {
    return "You can't block your own account.";
  }
  if (raw.startsWith("block_target_missing:")) {
    return "That account isn't there any more, so there's nothing to block.";
  }
  if (raw.startsWith("no_takedown_for_profile:")) {
    return "A profile can't be removed from this console — record the decision here, then act in the Supabase dashboard.";
  }
  if (raw.startsWith("use_note_unpublished:")) {
    return "A note is unpublished rather than deleted. Choose “Note unpublished” instead.";
  }
  if (raw.startsWith("invalid_status:") || raw.startsWith("invalid_action:") || raw.startsWith("report_missing:")) {
    return "That didn't go through. Reload the queue and try again — someone else may have handled it first.";
  }
  if (isMissingSchema({ message: raw })) {
    return "The safety features aren't switched on in this database yet (sql/028 hasn't been run). Nothing was sent.";
  }
  if (raw.includes("row-level security policy")) {
    return "The database refused that. If you've just blocked this account, that's why — block or report, not both.";
  }
  if (raw.includes("not authorized") || raw.startsWith("permission denied")) {
    return "Your account doesn't have access to that. If that's a surprise, your role may have changed since this screen loaded — reload and try again.";
  }
  if (!raw) return "Something went wrong. Try again.";
  // Same last resort, and the same reasoning, as humanizeReportError(): anything reaching here is
  // a string nobody wrote for a reader. It goes to the console, where a developer can find it.
  console.error("[moderation] unhandled error, showing the generic message instead:", raw, err);
  return "Something went wrong. Try again.";
}

/* --------------------------------------------------------------------------
 * Reporting
 * ------------------------------------------------------------------------ */

export interface NewModerationReport {
  targetKind: ModerationTargetKind;
  targetId: string;
  reason: string;
  details?: string | null;
  /** What the reporter was looking at. Trimmed to 1000 chars by the database. Sent because the
   * author can delete the evidence between the report and the review; see ModerationQueueRow. */
  excerpt?: string | null;
  /** Where they were — "Group: Wednesday Study", "Direct messages with Sam". Helps an administrator
   * find the thing without a uuid lookup. */
  context?: string | null;
}

export async function submitModerationReport(report: NewModerationReport): Promise<void> {
  const { error } = await supabase.rpc("moderation_report_submit", {
    p_target_kind: report.targetKind,
    p_target_id: report.targetId,
    p_reason: report.reason,
    p_details: report.details?.trim() || null,
    p_excerpt: report.excerpt?.slice(0, 1000) || null,
    p_context: report.context?.slice(0, 200) || null,
  });
  if (error) throw new Error(error.message);
}

/* --------------------------------------------------------------------------
 * Blocking
 * ------------------------------------------------------------------------ */

export async function blockUser(userId: string, reason?: string | null): Promise<void> {
  const { error } = await supabase.rpc("block_user", { p_user_id: userId, p_reason: reason?.trim() || null });
  if (error) throw new Error(error.message);
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("unblock_user", { p_user_id: userId });
  if (error) throw new Error(error.message);
}

/** Who you have blocked, by name.
 *
 * An RPC and not a table select, and the reason is the feature working: the restrictive policy on
 * `profiles` hides a blocked account's row from the account that blocked it, so joining
 * user_blocks to profiles from the client returns a list of uuids with no names on it.
 * list_my_blocks() is SECURITY DEFINER for exactly that — see sql/028. */
export async function fetchMyBlocks(): Promise<BlockedAccount[]> {
  const { data, error } = await supabase.rpc("list_my_blocks");
  if (error) throw new Error(error.message);
  return (data as BlockedAccount[] | null) ?? [];
}

/** The set of accounts this viewer has blocked, for the handful of places the UI needs to know
 * BEFORE the row is gone — chiefly so a conversation the reader just blocked can say why it
 * emptied instead of rendering "No messages yet — say hello!".
 *
 * Never used to filter content. RLS has already done that, and a second filter here would be an
 * invitation to believe this one is what keeps people safe. */
export function useBlockedIds(userId: string | null | undefined): {
  blockedIds: Set<string>;
  refresh: () => void;
} {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!userId) {
      setBlockedIds(new Set());
      return;
    }
    let cancelled = false;
    void isModerationAvailable().then(async (ok) => {
      if (!ok || cancelled) return;
      try {
        const rows = await fetchMyBlocks();
        if (!cancelled) setBlockedIds(new Set(rows.map((r) => r.user_id)));
      } catch {
        // A failure here costs a cosmetic hint, never a boundary. Stay quiet.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, nonce]);

  return { blockedIds, refresh };
}

/* --------------------------------------------------------------------------
 * Hiding — the reader's own filter
 * ------------------------------------------------------------------------ */

export type HideableKind = "post" | "post_comment" | "note" | "note_comment";

function hideKey(kind: HideableKind, id: string): string {
  return `${kind}:${id}`;
}

/** Loads this reader's hidden items once and hands back a predicate plus a hide/unhide pair.
 *
 * The filtering happens in the caller's render, not in RLS, and sql/028 section 2 explains at
 * length why that is the right place for THIS feature and the wrong place for blocking. The short
 * version: a hide is a preference the reader chose and can undo, and nobody is harmed if a
 * determined reader curls past their own hide list. */
export function useHiddenContent(userId: string | null | undefined): {
  isHidden: (kind: HideableKind, id: string) => boolean;
  hide: (kind: HideableKind, id: string) => Promise<void>;
  unhide: (kind: HideableKind, id: string) => Promise<void>;
  hiddenCount: number;
} {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setHidden(new Set());
      return;
    }
    let cancelled = false;
    void isModerationAvailable().then(async (ok) => {
      if (!ok || cancelled) return;
      const { data, error } = await supabase.from("content_hides").select("target_kind,target_id").eq("user_id", userId);
      if (cancelled || error) return;
      const rows = (data as { target_kind: HideableKind; target_id: string }[] | null) ?? [];
      setHidden(new Set(rows.map((r) => hideKey(r.target_kind, r.target_id))));
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isHidden = useCallback((kind: HideableKind, id: string) => hidden.has(hideKey(kind, id)), [hidden]);

  const hide = useCallback(
    async (kind: HideableKind, id: string) => {
      if (!userId) return;
      // Optimistic: the item leaves the feed on the click, not on the round trip. A failed write
      // is recovered on the next load, and the cost of being wrong is one post reappearing.
      setHidden((prev) => new Set(prev).add(hideKey(kind, id)));
      const { error } = await supabase
        .from("content_hides")
        .upsert(
          { user_id: userId, target_kind: kind, target_id: id },
          // DO NOTHING, not DO UPDATE. sql/028 grants this role select/insert/delete on
          // content_hides and deliberately not update, so a plain upsert would be refused by the
          // GRANT before RLS ever got a look — and re-hiding an already-hidden item has nothing
          // to update anyway.
          { onConflict: "user_id,target_kind,target_id", ignoreDuplicates: true }
        );
      if (error) console.error("[moderation] couldn't save that hide:", error.message);
    },
    [userId]
  );

  const unhide = useCallback(
    async (kind: HideableKind, id: string) => {
      if (!userId) return;
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(hideKey(kind, id));
        return next;
      });
      const { error } = await supabase
        .from("content_hides")
        .delete()
        .eq("user_id", userId)
        .eq("target_kind", kind)
        .eq("target_id", id);
      if (error) console.error("[moderation] couldn't undo that hide:", error.message);
    },
    [userId]
  );

  return { isHidden, hide, unhide, hiddenCount: hidden.size };
}

/* --------------------------------------------------------------------------
 * The administrator's queue
 * ------------------------------------------------------------------------ */

/** bigint columns arrive from PostgREST as JSON STRINGS — the same trap reportsApi.ts documents.
 * Untouched, `row.total_count / pageSize` is NaN and paging silently stops working. */
function coerceQueueRow(row: ModerationQueueRow): ModerationQueueRow {
  return {
    ...row,
    reports_against_owner: Number(row.reports_against_owner ?? 0),
    total_count: Number(row.total_count ?? 0),
  };
}

export async function fetchModerationQueue(filters: {
  status?: ModerationStatus[] | null;
  reason?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ rows: ModerationQueueRow[]; total: number }> {
  const { data, error } = await supabase.rpc("moderation_queue", {
    p_status: filters.status && filters.status.length > 0 ? filters.status : null,
    p_reason: filters.reason ?? null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  const rows = ((data as ModerationQueueRow[] | null) ?? []).map(coerceQueueRow);
  return { rows, total: rows.length > 0 ? rows[0].total_count : 0 };
}

export async function fetchModerationCounts(): Promise<ModerationCounts> {
  const { data, error } = await supabase.rpc("moderation_counts");
  if (error) throw new Error(error.message);
  const raw = (data as Record<string, unknown> | null) ?? {};
  const n = (key: string) => Number(raw[key] ?? 0);
  return {
    new: n("new"),
    reviewing: n("reviewing"),
    actioned: n("actioned"),
    dismissed: n("dismissed"),
    open: n("open"),
    last_24h: n("last_24h"),
    blocks: n("blocks"),
  };
}

export async function resolveModerationReport(
  reportId: string,
  status: ModerationStatus,
  action: ModerationAction,
  note: string | null
): Promise<void> {
  const { error } = await supabase.rpc("moderation_resolve", {
    p_report_id: reportId,
    p_status: status,
    p_action: action,
    p_note: note?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchModerationHistory(ownerId: string): Promise<ModerationHistoryRow[]> {
  const { data, error } = await supabase.rpc("moderation_history", { p_owner_id: ownerId });
  if (error) throw new Error(error.message);
  return (data as ModerationHistoryRow[] | null) ?? [];
}

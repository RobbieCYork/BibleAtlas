import { useCallback, useEffect, useState } from "react";
import {
  MODERATION_ACTION_LABELS,
  MODERATION_CONTACT_EMAIL,
  MODERATION_RESPONSE_WINDOW,
  MODERATION_STATUS_LABELS,
  MODERATION_TARGET_LABELS,
  fetchModerationCounts,
  fetchModerationHistory,
  fetchModerationQueue,
  humanizeModerationError,
  resolveModerationReport,
  useModerationAvailable,
  type ModerationAction,
  type ModerationCounts,
  type ModerationHistoryRow,
  type ModerationQueueRow,
  type ModerationStatus,
} from "../lib/moderationApi";
import { formatWhen } from "../lib/adminApi";
import Icon from "./Icon";

/* ============================================================================
 * The abuse queue, inside the Admin Console rather than beside it.
 *
 * ── WHY IT IS NOT IN ReportsDashboard ───────────────────────────────────────
 * sql/025's dashboard is an issue tracker: bug / typo / theological / idea,
 * with advisor voting and a computed priority. Neither the voting nor the
 * priority means anything for "this person is being harassed", and the rows
 * here carry verbatim excerpts of private direct messages — which sql/025's
 * table is one app_settings boolean away from showing every advisor. So this
 * queue is administrator-only, in the console administrators already have.
 *
 * ── WHAT AN ADMINISTRATOR CAN AND CANNOT DO FROM HERE ───────────────────────
 * Can: remove a post, comment, note comment, direct message or group message;
 * unpublish a public note (not delete it — it is someone's own study writing,
 * and the offence was publishing it); record a warning; mark a report as
 * handled elsewhere; dismiss it.
 *
 * Cannot: suspend, ban or delete an account. That is an auth.users operation
 * and needs the service_role key, which does not exist in a client bundle for
 * the reason lib/adminApi.ts's ADMIN_ACTIONS_NOT_BUILT spells out. A report
 * against a profile therefore resolves to a recorded decision plus an action in
 * the Supabase dashboard, and this panel says so on screen rather than offering
 * a button that quietly does nothing.
 * ========================================================================== */

const STATUS_FILTERS: { key: string; label: string; statuses: ModerationStatus[] | null }[] = [
  { key: "open", label: "Open", statuses: ["new", "reviewing"] },
  { key: "new", label: "New", statuses: ["new"] },
  { key: "reviewing", label: "Reviewing", statuses: ["reviewing"] },
  { key: "actioned", label: "Actioned", statuses: ["actioned"] },
  { key: "dismissed", label: "Dismissed", statuses: ["dismissed"] },
  { key: "all", label: "All", statuses: null },
];

/** Which actions make sense for which target. Offering "Remove content" on a profile report would
 * be a button whose only outcome is the database refusing it — sql/028 raises rather than silently
 * doing nothing, and this list is why a reader never gets there. */
function actionsFor(kind: ModerationQueueRow["target_kind"]): ModerationAction[] {
  if (kind === "profile") return ["none", "user_warned", "referred"];
  if (kind === "note") return ["none", "note_unpublished", "user_warned", "referred"];
  return ["none", "content_removed", "user_warned", "referred"];
}

export default function ModerationQueuePanel() {
  const available = useModerationAvailable();
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState<ModerationQueueRow[] | null>(null);
  const [counts, setCounts] = useState<ModerationCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<ModerationStatus>("actioned");
  const [draftAction, setDraftAction] = useState<ModerationAction>("none");
  const [draftNote, setDraftNote] = useState("");
  const [history, setHistory] = useState<Record<string, ModerationHistoryRow[]>>({});
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const chosen = STATUS_FILTERS.find((f) => f.key === filter) ?? STATUS_FILTERS[0];
      const [queue, c] = await Promise.all([
        fetchModerationQueue({ status: chosen.statuses, limit: 100 }),
        fetchModerationCounts(),
      ]);
      setRows(queue.rows);
      setCounts(c);
    } catch (err) {
      setRows([]);
      setError(humanizeModerationError(err));
    }
  }, [filter]);

  useEffect(() => {
    if (available !== true) return;
    void load();
  }, [available, load]);

  if (available === null) return <p className="comment-status">Loading…</p>;

  if (available === false) {
    return (
      <div className="admin-note admin-note-warn">
        <p>
          <strong>The safety features are not switched on in this database.</strong> The app code for blocking,
          reporting and this queue has shipped, but <code>sql/028_moderation.sql</code> has not been run — so there is
          no <code>moderation_reports</code> table to read, and the Report and Block controls are not drawn anywhere in
          the app.
        </p>
        <p>
          Applying it is a decision, not a deploy step: <code>psql "$SUPABASE_DB_URL" -f sql/028_moderation.sql</code>.
          Nothing here works, and App Store Review Guideline 1.2 is not met, until it has run.
        </p>
      </div>
    );
  }

  const openDetail = async (row: ModerationQueueRow) => {
    if (openId === row.id) {
      setOpenId(null);
      return;
    }
    setOpenId(row.id);
    setDraftStatus(row.status === "new" ? "reviewing" : "actioned");
    setDraftAction(actionsFor(row.target_kind)[0]);
    setDraftNote(row.resolution_note ?? "");
    if (row.target_owner_id && !history[row.target_owner_id]) {
      try {
        const h = await fetchModerationHistory(row.target_owner_id);
        setHistory((prev) => ({ ...prev, [row.target_owner_id as string]: h }));
      } catch {
        // A missing history costs context, not correctness.
      }
    }
  };

  const handleResolve = async (row: ModerationQueueRow) => {
    if (draftAction === "content_removed") {
      const label = MODERATION_TARGET_LABELS[row.target_kind];
      if (!window.confirm(`Permanently delete this ${label}? This cannot be undone.`)) return;
    }
    setBusyId(row.id);
    setError(null);
    setStatus(null);
    try {
      await resolveModerationReport(row.id, draftStatus, draftAction, draftNote);
      setStatus(
        `Report marked ${MODERATION_STATUS_LABELS[draftStatus].toLowerCase()} — ${MODERATION_ACTION_LABELS[draftAction].toLowerCase()}.`
      );
      setOpenId(null);
      await load();
    } catch (err) {
      setError(humanizeModerationError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-moderation-queue">
      <p className="admin-note">
        Abuse reports from readers — posts, comments, notes, direct messages, group messages and profiles. Administrator
        only: these rows quote private messages. We tell people a person reads every report{" "}
        {MODERATION_RESPONSE_WINDOW}, so this queue is a promise, not a backlog. Anything that needs a reply by email
        goes to <a href={`mailto:${MODERATION_CONTACT_EMAIL}`}>{MODERATION_CONTACT_EMAIL}</a>.
      </p>

      {counts && (
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat-value">{counts.open}</span>
            <span className="admin-stat-label">Open</span>
            <span className="admin-stat-hint">{counts.new} not yet looked at</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{counts.last_24h}</span>
            <span className="admin-stat-label">Last 24 hours</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{counts.actioned}</span>
            <span className="admin-stat-label">Actioned</span>
            <span className="admin-stat-hint">{counts.dismissed} dismissed</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{counts.blocks}</span>
            <span className="admin-stat-label">Blocks in force</span>
            <span className="admin-stat-hint">across all accounts</span>
          </div>
        </div>
      )}

      <div className="admin-window-picker" role="group" aria-label="Report status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={filter === f.key ? "active" : ""}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {status && <p className="admin-note">{status}</p>}
      {error && <p className="auth-status auth-error">{error}</p>}

      {rows === null && <p className="comment-status">Loading…</p>}
      {rows !== null && rows.length === 0 && <p className="comment-status">Nothing in this view.</p>}

      {rows !== null && rows.length > 0 && (
        <ul className="admin-mod-list">
          {rows.map((row) => {
            const isOpen = openId === row.id;
            const ownerHistory = row.target_owner_id ? history[row.target_owner_id] : undefined;
            return (
              <li key={row.id} className="admin-mod-item">
                <div className="admin-mod-head">
                  <span className="admin-badge admin-badge-muted">{MODERATION_TARGET_LABELS[row.target_kind]}</span>
                  <span className="admin-badge">{row.reason_label ?? row.reason}</span>
                  <span className="admin-badge admin-badge-muted">{MODERATION_STATUS_LABELS[row.status]}</span>
                  <span className="admin-mod-when">{formatWhen(row.created_at)}</span>
                </div>

                <p className="admin-mod-author">
                  Against <strong>{row.target_owner_name ?? "an unnamed account"}</strong>
                  {row.reports_against_owner > 1 && (
                    <span className="mod-flag-count"> · {row.reports_against_owner} reports against this account</span>
                  )}
                  {row.target_still_exists === false && <span className="mod-flag-gone"> · content already gone</span>}
                </p>

                {row.content_excerpt && <p className="mod-queue-excerpt">{row.content_excerpt}</p>}
                {row.details && <p className="mod-queue-details">Reporter said: {row.details}</p>}
                <p className="admin-mod-when">
                  Reported by {row.reporter_name ?? "an unnamed account"}
                  {row.context_label ? ` · ${row.context_label}` : ""}
                </p>

                {row.status !== "new" && row.status !== "reviewing" && (
                  <p className="admin-mod-when">
                    {MODERATION_ACTION_LABELS[row.action_taken ?? "none"]}
                    {row.handled_at ? ` · ${formatWhen(row.handled_at)}` : ""}
                    {row.resolution_note ? ` · ${row.resolution_note}` : ""}
                  </p>
                )}

                <button type="button" className="mod-queue-toggle" onClick={() => void openDetail(row)}>
                  {isOpen ? "Close" : "Handle this"}
                </button>

                {isOpen && (
                  <div className="mod-queue-form">
                    {row.target_kind === "profile" && (
                      <p className="admin-note admin-note-warn">
                        A profile cannot be removed from this console — suspending or deleting an account needs the
                        service_role key, which is deliberately not in this app. Record the decision here, then act in
                        the Supabase dashboard.
                      </p>
                    )}
                    {row.target_kind === "note" && (
                      <p className="admin-note">
                        A public note is <em>unpublished</em>, not deleted — it is the author's own study writing
                        against a verse, and the offence is that it was published.
                      </p>
                    )}

                    <label className="mod-field-label" htmlFor={`status-${row.id}`}>
                      Status
                    </label>
                    <select
                      id={`status-${row.id}`}
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value as ModerationStatus)}
                    >
                      {(["reviewing", "actioned", "dismissed"] as ModerationStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {MODERATION_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>

                    <label className="mod-field-label" htmlFor={`action-${row.id}`}>
                      What was done
                    </label>
                    <select
                      id={`action-${row.id}`}
                      value={draftAction}
                      onChange={(e) => setDraftAction(e.target.value as ModerationAction)}
                    >
                      {actionsFor(row.target_kind).map((a) => (
                        <option key={a} value={a}>
                          {MODERATION_ACTION_LABELS[a]}
                        </option>
                      ))}
                    </select>

                    <label className="mod-field-label" htmlFor={`note-${row.id}`}>
                      Note for the record
                    </label>
                    <textarea
                      id={`note-${row.id}`}
                      className="mod-textarea"
                      rows={2}
                      maxLength={2000}
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Why this decision. Kept in the audit trail."
                    />

                    <button
                      type="button"
                      className="mod-dialog-primary"
                      disabled={busyId === row.id}
                      onClick={() => void handleResolve(row)}
                    >
                      {busyId === row.id ? "Saving…" : "Save decision"}
                    </button>

                    {ownerHistory && ownerHistory.length > 0 && (
                      <div className="mod-queue-history">
                        <h5>
                          <Icon name="doc" inline /> Previous decisions about this account
                        </h5>
                        <ul>
                          {ownerHistory.map((h, i) => (
                            <li key={`${h.at}-${i}`}>
                              {formatWhen(h.at)} · {h.actor_name ?? "someone"} ·{" "}
                              {MODERATION_ACTION_LABELS[(h.action as ModerationAction) ?? "none"] ?? h.action}
                              {h.note ? ` — ${h.note}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

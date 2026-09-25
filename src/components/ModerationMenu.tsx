import { useEffect, useRef, useState } from "react";
import {
  MODERATION_CONTACT_EMAIL,
  MODERATION_RESPONSE_WINDOW,
  MODERATION_TARGET_LABELS,
  blockUser,
  fetchModerationReasons,
  humanizeModerationError,
  submitModerationReport,
  useModerationAvailable,
  type ModerationReason,
  type ModerationTargetKind,
} from "../lib/moderationApi";
import Icon from "./Icon";

/* ============================================================================
 * The one control every reportable surface uses.
 *
 * There is exactly one of these because there are six surfaces — a post, a
 * comment, a public note, a note comment, a direct message, a group message and
 * a profile — and Guideline 1.2 asks the same three things of all of them:
 * report it, hide it, block whoever wrote it. Six copies of that would drift,
 * and the one that drifted would be the one a reviewer opened.
 *
 * ── WHY REPORT COMES BEFORE BLOCK IN THE MENU ───────────────────────────────
 * Not house style — a data dependency. sql/028's block filters hide the blocked
 * account's content from the blocker, and sql/028's report path resolves the
 * target through the reporter's own RLS. So a report filed AFTER a block finds
 * nothing to report and is refused. Report first, block second, and the block
 * confirmation says so.
 *
 * ── WHY IT RENDERS NOTHING WHEN THE MIGRATION IS MISSING ────────────────────
 * sql/028 needs a human to run it. Until then useModerationAvailable() is false
 * and this component returns null, so nobody meets a Report button that cannot
 * report. See lib/moderationApi.ts's header.
 * ========================================================================== */

interface ModerationMenuProps {
  /** The signed-in account. Its own content is never offered these actions. */
  viewerId: string;
  targetKind: ModerationTargetKind;
  targetId: string;
  /** Who wrote it. Null when the caller genuinely doesn't know (an unresolved profile), in which
   * case Block is not offered — blocking the wrong account is worse than not offering it. */
  authorId: string | null;
  authorName?: string | null;
  /** What the reader is looking at, sent with the report. The author can delete it before anyone
   * reviews the report, which is exactly why a snapshot travels with it. */
  excerpt?: string | null;
  /** Where they were — "Group: Wednesday Study". Saves an administrator a uuid lookup. */
  context?: string | null;
  /** Supplied only where hiding one item makes sense: feed items, not messages (hiding one line of
   * a conversation leaves a hole in it). Omitted means the option isn't drawn. */
  onHide?: () => void;
  /** Called after a successful block so the parent can drop the now-invisible rows from its state.
   * Nothing depends on it for correctness — RLS has already removed them from the database's
   * answers, and the next fetch is empty with or without this. */
  onBlocked?: () => void;
  /** Extra class on the trigger, so a caller can place it without this component knowing where. */
  className?: string;
}

type Sheet = "menu" | "report" | "block" | null;

const DETAIL_MAX = 4000;

export default function ModerationMenu({
  viewerId,
  targetKind,
  targetId,
  authorId,
  authorName,
  excerpt,
  context,
  onHide,
  onBlocked,
  className,
}: ModerationMenuProps) {
  const available = useModerationAvailable();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [reasons, setReasons] = useState<ModerationReason[] | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"reported" | "blocked" | null>(null);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const kindLabel = MODERATION_TARGET_LABELS[targetKind];
  const who = authorName?.trim() || "this account";

  useEffect(() => {
    if (sheet !== "report" || reasons) return;
    let cancelled = false;
    void fetchModerationReasons()
      .then((rows) => {
        if (!cancelled) setReasons(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(humanizeModerationError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [sheet, reasons]);

  // Close the little popover on an outside click, the same way AuthButton's dropdown does. The
  // full-screen sheets are NOT dismissed this way — a form someone has typed a paragraph into
  // should not vanish because they missed a button.
  useEffect(() => {
    if (sheet !== "menu") return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setSheet(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sheet]);

  // Nothing to offer: the feature isn't installed, the answer hasn't arrived, or this is the
  // reader's own content (which has Edit and Delete already, and which sql/028 refuses to report).
  if (!available) return null;
  if (authorId && authorId === viewerId) return null;

  const close = () => {
    setSheet(null);
    setError(null);
    setDone(null);
    setReason("");
    setDetails("");
    setAlsoBlock(false);
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitModerationReport({
        targetKind,
        targetId,
        reason,
        details,
        excerpt,
        context,
      });
      // Block AFTER the report, never before — the report needs to be able to see the content.
      // See the header. A failure here is reported separately so the reader is not told their
      // report failed when it didn't.
      if (alsoBlock && authorId) {
        try {
          await blockUser(authorId, `Blocked while reporting a ${kindLabel}`);
          onBlocked?.();
        } catch (blockErr) {
          setDone("reported");
          setError(
            `Your report was sent, but blocking ${who} didn't go through: ${humanizeModerationError(blockErr)}`
          );
          setBusy(false);
          return;
        }
      }
      setDone("reported");
    } catch (err) {
      setError(humanizeModerationError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleBlock = async () => {
    if (!authorId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await blockUser(authorId, null);
      setDone("blocked");
      onBlocked?.();
    } catch (err) {
      setError(humanizeModerationError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mod-menu ${className ?? ""}`} ref={wrapRef}>
      <button
        type="button"
        className="mod-menu-trigger"
        onClick={() => setSheet(sheet === "menu" ? null : "menu")}
        aria-label={`Report or block — options for this ${kindLabel}`}
        title="Report, hide or block"
      >
        <Icon name="flag" />
      </button>

      {sheet === "menu" && (
        <div className="mod-menu-popover" role="menu">
          <button
            type="button"
            className="mod-menu-item"
            role="menuitem"
            onClick={() => {
              setSheet("report");
              setError(null);
            }}
          >
            <Icon name="flag" inline /> Report this {kindLabel}
          </button>
          {onHide && (
            <button
              type="button"
              className="mod-menu-item"
              role="menuitem"
              onClick={() => {
                onHide();
                setSheet(null);
              }}
            >
              <Icon name="eyeOff" inline /> Hide this {kindLabel}
            </button>
          )}
          {authorId && (
            <button
              type="button"
              className="mod-menu-item mod-menu-item-strong"
              role="menuitem"
              onClick={() => {
                setSheet("block");
                setError(null);
              }}
            >
              <Icon name="ban" inline /> Block {who}
            </button>
          )}
        </div>
      )}

      {sheet === "report" && (
        <div className="mod-dialog-backdrop" role="dialog" aria-modal="true" aria-label={`Report this ${kindLabel}`}>
          <div className="mod-dialog">
            {done === "reported" ? (
              <>
                <h3 className="mod-dialog-title">Report sent</h3>
                <p className="mod-dialog-text">
                  Thank you. A person reads every report, usually {MODERATION_RESPONSE_WINDOW}. We don't write back
                  about the outcome of every one — but if this is urgent, or someone is in danger, email{" "}
                  <a href={`mailto:${MODERATION_CONTACT_EMAIL}`}>{MODERATION_CONTACT_EMAIL}</a> and say so.
                </p>
                {alsoBlock && !error && (
                  <p className="mod-dialog-text">
                    {who} is blocked. You won't see each other's posts, comments or messages, and neither of you can
                    contact the other. You can undo this in Settings → Blocked accounts.
                  </p>
                )}
                {error && <p className="mod-dialog-error">{error}</p>}
                <div className="mod-dialog-actions">
                  <button type="button" className="mod-dialog-primary" onClick={close}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleReport}>
                <h3 className="mod-dialog-title">Report this {kindLabel}</h3>
                <p className="mod-dialog-text">
                  Tell us what's wrong with it. Reports are private — {who} is never told who reported them.
                </p>

                {reasons === null && <p className="comment-status">Loading…</p>}
                {reasons !== null && (
                  <div className="mod-reason-list">
                    {reasons.map((r) => (
                      <label key={r.key} className={`mod-reason ${reason === r.key ? "mod-reason-on" : ""}`}>
                        <input
                          type="radio"
                          name="mod-reason"
                          value={r.key}
                          checked={reason === r.key}
                          onChange={() => setReason(r.key)}
                        />
                        <span>
                          <span className="mod-reason-label">{r.label}</span>
                          {r.description && <span className="mod-reason-desc">{r.description}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <label className="mod-field-label" htmlFor="mod-details">
                  Anything else we should know? (optional)
                </label>
                <textarea
                  id="mod-details"
                  className="mod-textarea"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={DETAIL_MAX}
                  placeholder="What happened, and anything we'd need to understand it."
                />

                {excerpt && (
                  <details className="mod-excerpt">
                    <summary>What gets sent with this report</summary>
                    <p className="mod-excerpt-body">{excerpt.slice(0, 1000)}</p>
                    <p className="mod-excerpt-note">
                      A copy of what you're looking at, plus the reason and anything you typed above — so the team can
                      still see it if it's deleted before they get to it.
                    </p>
                  </details>
                )}

                {authorId && (
                  <label className="mod-check">
                    <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
                    Also block {who} — you'll stop seeing each other entirely
                  </label>
                )}

                {error && <p className="mod-dialog-error">{error}</p>}

                <div className="mod-dialog-actions">
                  <button type="button" className="mod-dialog-secondary" onClick={close} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className="mod-dialog-primary" disabled={!reason || busy}>
                    {busy ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {sheet === "block" && (
        <div className="mod-dialog-backdrop" role="dialog" aria-modal="true" aria-label={`Block ${who}`}>
          <div className="mod-dialog">
            {done === "blocked" ? (
              <>
                <h3 className="mod-dialog-title">{who} is blocked</h3>
                <p className="mod-dialog-text">
                  You won't see their posts, comments or messages, and they can't message or comment at you. They aren't
                  told about this. Undo it any time in Settings → Blocked accounts.
                </p>
                <div className="mod-dialog-actions">
                  <button type="button" className="mod-dialog-primary" onClick={close}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mod-dialog-title">Block {who}?</h3>
                <ul className="mod-consequences">
                  <li>Their posts, comments and messages disappear for you — and yours for them.</li>
                  <li>Neither of you can message or comment at the other.</li>
                  <li>They are not told, and there's no way for them to find out from the app.</li>
                  <li>
                    <strong>If you're friends, you won't be any more.</strong> Unblocking does not put that back — you'd
                    have to send a new friend request.
                  </li>
                  <li>
                    Blocking hides their content from you, so you can't report it afterwards.{" "}
                    <strong>If you also want to report something, do that first.</strong>
                  </li>
                </ul>
                {error && <p className="mod-dialog-error">{error}</p>}
                <div className="mod-dialog-actions">
                  <button type="button" className="mod-dialog-secondary" onClick={close} disabled={busy}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="mod-dialog-secondary"
                    onClick={() => {
                      setSheet("report");
                      setAlsoBlock(true);
                      setError(null);
                    }}
                    disabled={busy}
                  >
                    Report first
                  </button>
                  <button type="button" className="mod-dialog-danger" onClick={handleBlock} disabled={busy}>
                    {busy ? "Blocking…" : "Block"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

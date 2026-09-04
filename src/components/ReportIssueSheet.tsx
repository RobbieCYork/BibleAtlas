import { useEffect, useMemo, useState } from "react";
import {
  fetchCategories,
  humanizeReportError,
  submitReport,
  SEVERITY_LABELS,
  TARGET_KIND_LABELS,
  type ReportCategory,
  type Severity,
} from "../lib/reportsApi";
import {
  captureReportContext,
  clearRememberedSelection,
  type CapturedContext,
  type ReportSurface,
} from "../lib/reportContext";
import Icon from "./Icon";

interface ReportIssueSheetProps {
  userId: string;
  /** True for the retired "Continue as Guest" accounts. `reports.allow_anonymous` ships FALSE, so
   * reports_insert_own would refuse the insert — this sheet says so up front rather than letting
   * someone write out a paragraph and then get rejected by an RLS policy.
   *
   * EXPLAIN RATHER THAN HIDE, because that is how this app already handles a guest meeting an
   * account-only feature: FriendsPanel keeps its view and swaps the contents for "Log in with an
   * account (not just as a guest) to add friends and message them", and the mobile "My Profile"
   * entry stays put and lands a guest on Settings. An entry point that silently is not there
   * teaches a reader nothing; both of those tell them what the account buys. So the menu item
   * stays and this branch answers it.
   *
   * The database is still the boundary, and humanizeReportError() now translates the RLS refusal
   * too — so if `reports.allow_anonymous` is ever flipped back the other way, or a guest reaches
   * a submit some other way, the worst case is a sentence rather than Postgres's own words. */
  isGuest: boolean;
  /** Where the reporter was standing, from App's own render. Captured once on mount, not read
   * live: the context that matters is the screen they pressed "Report" on, and App keeps
   * re-rendering underneath a full-screen sheet. */
  surface: ReportSurface;
  onClose: () => void;
  /** So the account menu can offer "see it in My Reports" straight after a successful send. */
  onOpenMyReports?: () => void;
}

const TITLE_MAX = 200;
const BODY_MAX = 8000;

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];

/** One captured field, shown to the reporter before anything is sent. Rendered for every field on
 * CapturedContext — see the "nothing is captured that the reporter is not shown" rule in
 * lib/reportContext.ts. */
function CapturedRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="report-captured-row">
      <span className="report-captured-label">{label}</span>
      <span className="report-captured-value">{value ?? "—"}</span>
    </div>
  );
}

export default function ReportIssueSheet({ userId, isGuest, surface, onClose, onOpenMyReports }: ReportIssueSheetProps) {
  // Captured ONCE, on mount. Re-capturing on every render would let the page underneath (a chapter
  // auto-advancing, a selection being cleared) rewrite what the reporter is looking at while they
  // are typing about it.
  const [context, setContext] = useState<CapturedContext>(() => captureReportContext(surface));
  const [categories, setCategories] = useState<ReportCategory[] | null>(null);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [showCaptured, setShowCaptured] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Not fetched for a guest: the guest branch below returns before the form exists, so this would
  // be a round trip for a <select> nobody will see — and a failure would park an error in state
  // that the guest branch does not render, which is the kind of thing that looks like a ghost later.
  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    void fetchCategories()
      .then((rows) => {
        if (cancelled) return;
        setCategories(rows);
        // Don't preselect a kind of problem on the reporter's behalf — an unchosen category is a
        // question they have to answer, and it is the field that routes the report.
      })
      .catch((err) => {
        if (!cancelled) setError(humanizeReportError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  const selectedCategory = useMemo(
    () => (categories ?? []).find((c) => c.key === category) ?? null,
    [categories, category]
  );

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSend = !!category && trimmedTitle.length >= 3 && trimmedBody.length >= 1 && !sending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await submitReport({
        reporter_id: userId,
        category,
        title: trimmedTitle,
        body: trimmedBody,
        reporter_severity: severity || null,
        page_url: context.page_url,
        route: context.route,
        page_title: context.page_title,
        target_kind: context.target_kind,
        target_id: context.target_id,
        target_label: context.target_label,
        selected_text: context.selected_text,
        build_id: context.build_id,
        user_agent: context.user_agent,
        viewport_w: context.viewport_w,
        viewport_h: context.viewport_h,
        platform: context.platform,
      });
      // The selection has now been spent. Leaving it would attach the same highlighted sentence to
      // the next report filed from anywhere in the app.
      clearRememberedSelection();
      setSent(true);
    } catch (err) {
      setError(humanizeReportError(err));
    } finally {
      setSending(false);
    }
  };

  if (isGuest) {
    return (
      <div className="report-sheet" role="dialog" aria-label="Report a problem">
        <div className="report-sheet-head">
          <button type="button" className="auth-back-link" onClick={onClose}>
            ← Back
          </button>
          <h3 className="report-sheet-title">Report a problem</h3>
        </div>
        <div className="report-sheet-body">
          <p className="report-intro">
            Reports are tied to an account so the team can come back to you about them, and so a
            fix can be told apart from a flood. Guest browsing can't file one. Sign in with a real
            account and the option appears in this menu.
          </p>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="report-sheet" role="dialog" aria-label="Report sent">
        <div className="report-sheet-head">
          <button type="button" className="auth-back-link" onClick={onClose}>
            ← Back
          </button>
          <h3 className="report-sheet-title">Thank you</h3>
        </div>
        <div className="report-sheet-body">
          <p className="report-intro">
            Your report is in. It goes to the team's review queue, where advisors read it and vote
            on how urgent it is. You can see where it's got to any time under <strong>My Reports</strong>,
            and you can still edit or delete it until someone picks it up.
          </p>
          <div className="report-actions">
            {onOpenMyReports && (
              <button type="button" className="report-btn report-btn-primary" onClick={onOpenMyReports}>
                See my reports
              </button>
            )}
            <button type="button" className="report-btn" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-sheet" role="dialog" aria-label="Report a problem">
      <div className="report-sheet-head">
        <button type="button" className="auth-back-link" onClick={onClose}>
          ← Back
        </button>
        <h3 className="report-sheet-title">Report a problem or suggest an idea</h3>
      </div>
      <div className="report-sheet-body">
        {/* The whole point of the feature: the reporter can see what the report will say about
            where they were, before they write a word of it. */}
        <div className="report-context-card">
          <p className="report-context-line">
            <Icon name="pin" inline /> Reporting from: <strong>{context.page_title}</strong>
          </p>
          {context.target_kind && (
            <p className="report-context-target">
              About this {TARGET_KIND_LABELS[context.target_kind].toLowerCase()}:{" "}
              <strong>{context.target_label ?? context.target_id}</strong>
              <button
                type="button"
                className="report-chip-clear"
                onClick={() => setContext((c) => ({ ...c, target_kind: null, target_id: null, target_label: null }))}
              >
                Not this
              </button>
            </p>
          )}
        </div>

        {context.selected_text && (
          <div className="report-selection">
            <p className="report-selection-head">
              You had this selected — it'll be sent with the report so the exact wording can be found:
              <button
                type="button"
                className="report-chip-clear"
                onClick={() => setContext((c) => ({ ...c, selected_text: null }))}
              >
                Remove
              </button>
            </p>
            <blockquote className="report-selection-quote">{context.selected_text}</blockquote>
          </div>
        )}

        <form className="report-form" onSubmit={handleSubmit}>
          <label className="report-field">
            <span className="report-field-label">What kind of thing is it?</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required disabled={!categories}>
              <option value="">{categories ? "Choose one…" : "Loading…"}</option>
              {(categories ?? []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            {selectedCategory?.description && (
              <span className="report-field-hint">{selectedCategory.description}</span>
            )}
          </label>

          <label className="report-field">
            <span className="report-field-label">In one line, what's wrong?</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="e.g. Nazareth article says Galilee is a city"
              maxLength={TITLE_MAX}
              required
            />
            <span className="report-field-hint">
              {trimmedTitle.length > 0 && trimmedTitle.length < 3
                ? "A few more characters, please."
                : `${title.length}/${TITLE_MAX}`}
            </span>
          </label>

          <label className="report-field">
            <span className="report-field-label">Tell us more</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
              rows={6}
              placeholder="What did you expect, and what happened instead? If it's about wording or a fact, quoting the bit that's wrong helps most."
              maxLength={BODY_MAX}
              required
            />
            <span className="report-field-hint">
              {body.length}/{BODY_MAX}
            </span>
          </label>

          <label className="report-field">
            <span className="report-field-label">How much does it matter? (optional)</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "")}>
              <option value="">Not sure / no view</option>
              {SEVERITY_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
            <span className="report-field-hint">
              Your view, not a final answer — advisors vote on priority separately.
            </span>
          </label>

          {/* Every field on CapturedContext, verbatim. Collapsed by default because it is long and
              dull, present because sending someone's browser string without showing it to them is
              not a thing this app does. */}
          <div className="report-captured">
            <button
              type="button"
              className="report-captured-toggle"
              aria-expanded={showCaptured}
              onClick={() => setShowCaptured((v) => !v)}
            >
              {showCaptured ? "▾" : "▸"} What gets sent with this report
            </button>
            {showCaptured && (
              <div className="report-captured-list">
                <CapturedRow label="Page" value={context.page_title} />
                <CapturedRow label="Screen" value={context.route} />
                <CapturedRow label="Address" value={context.page_url} />
                <CapturedRow
                  label="Subject"
                  value={
                    context.target_kind
                      ? `${TARGET_KIND_LABELS[context.target_kind]} — ${context.target_label ?? context.target_id}`
                      : null
                  }
                />
                <CapturedRow label="Selected text" value={context.selected_text} />
                <CapturedRow label="App version" value={context.build_id} />
                <CapturedRow
                  label="Screen size"
                  value={context.viewport_w && context.viewport_h ? `${context.viewport_w} × ${context.viewport_h}` : null}
                />
                <CapturedRow label="Device" value={context.platform} />
                <CapturedRow label="Browser" value={context.user_agent} />
                <p className="report-captured-note">
                  Your name and account are attached, so the team can follow up. Nothing else about
                  what you were reading is collected.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="auth-status auth-error" role="alert">
              {error}
            </p>
          )}

          <div className="report-actions">
            <button type="submit" className="report-btn report-btn-primary" disabled={!canSend}>
              {sending ? "Sending…" : "Send report"}
            </button>
            <button type="button" className="report-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Chevron from "./Chevron";
import {
  fetchCategories,
  humanizeReportError,
  submitReport,
  SEVERITY_LABELS,
  SUGGESTION_CATEGORY,
  suggestedCategoryForRoute,
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
import { removeReportScreenshot, screenshotsEnabled, uploadReportScreenshot } from "../lib/reportScreenshots";
import type { PendingCapture } from "../lib/screenCapture";

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
  /** The picture of the screen taken at the tap that opened this form (lib/reportScreenshots.ts), or
   * null/absent when there is none to offer (reached from My Reports, a guest, or screenshots off).
   * It stays in memory on this device; it is uploaded only if the reporter ticks the box. */
  screenshot?: PendingCapture | null;
}

/** What the form knows about the screenshot. "none" draws nothing at all: no capture, or sql/055 is
 * not applied, which must look exactly like the form did before screenshots existed. */
type Shot =
  | { state: "none" }
  | { state: "pending" }
  | { state: "failed" }
  | { state: "ready"; blob: Blob; url: string; width: number; height: number };

const TITLE_MAX = 200;
const BODY_MAX = 8000;

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];

type Kind = "problem" | "suggestion";

/** Every piece of wording that differs between reporting a fault and suggesting a feature. */
const COPY = {
  problem: {
    choice: "Report a problem",
    choiceIcon: "flag",
    from: "Reporting from:",
    selection: "You had this selected — it'll be sent with the report so the exact wording can be found:",
    titleLabel: "In one line, what's wrong?",
    titlePlaceholder: "e.g. Nazareth article says Galilee is a city",
    bodyLabel: "Tell us more",
    bodyPlaceholder:
      "What did you expect, and what happened instead? If it's about wording or a fact, quoting the bit that's wrong helps most.",
    captured: "What gets sent with this report",
    send: "Send report",
    sentLabel: "Report sent",
    mine: "See my reports",
  },
  suggestion: {
    choice: "Suggest a feature",
    choiceIcon: "plus",
    from: "Suggesting from:",
    selection: "You had this selected — it'll be sent with your suggestion:",
    titleLabel: "In one line, what's your idea?",
    titlePlaceholder: "e.g. Let me compare two translations side by side",
    bodyLabel: "Describe the feature",
    bodyPlaceholder: "What would you like to be able to do, and when would you use it?",
    captured: "What gets sent with this suggestion",
    send: "Send suggestion",
    sentLabel: "Suggestion sent",
    mine: "See my suggestions",
  },
} as const;

const KINDS: Kind[] = ["problem", "suggestion"];

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

export default function ReportIssueSheet({ userId, isGuest, surface, onClose, onOpenMyReports, screenshot }: ReportIssueSheetProps) {
  // Captured ONCE, on mount. Re-capturing on every render would let the page underneath (a chapter
  // auto-advancing, a selection being cleared) rewrite what the reporter is looking at while they
  // are typing about it.
  const [context, setContext] = useState<CapturedContext>(() => captureReportContext(surface));
  const [kind, setKind] = useState<Kind>("problem");
  const [categories, setCategories] = useState<ReportCategory[] | null>(null);
  // Kept apart from the send error: only the problem form has a category list to fail to load.
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [showCaptured, setShowCaptured] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [shot, setShot] = useState<Shot>({ state: "none" });
  // OFF until the reporter turns it on. Never defaulted on, never remembered between reports.
  const [includeShot, setIncludeShot] = useState(false);
  const [viewingShot, setViewingShot] = useState(false);

  // The capture was started by the tap that opened this form; here it is only collected. Shown only
  // once the database says screenshots exist (sql/055) — until then this stays "none" and the form is
  // unchanged. Nothing here uploads anything.
  useEffect(() => {
    if (!screenshot || isGuest) return;
    let cancelled = false;
    let url: string | null = null;
    void screenshotsEnabled().then((on) => {
      if (cancelled || !on) return;
      setShot((s) => (s.state === "none" ? { state: "pending" } : s));
      screenshot.result.then(
        (r) => {
          if (cancelled) return;
          url = URL.createObjectURL(r.blob);
          setShot({ state: "ready", blob: r.blob, url, width: r.width, height: r.height });
        },
        () => {
          if (!cancelled) setShot({ state: "failed" });
        }
      );
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [screenshot, isGuest]);

  useEffect(() => {
    if (!viewingShot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewingShot(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewingShot]);

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
        // Preselected only where the screen makes the area obvious (Bible reader, map, timeline,
        // games, settings, an open article) and only if that category is on offer; otherwise the
        // reporter must choose — it is required, and it is what files the report in the Admin
        // Console. Never overwrites a choice they already made.
        const suggested = suggestedCategoryForRoute(context.route, rows);
        if (suggested) setCategory((current) => current || suggested);
      })
      .catch((err) => {
        if (!cancelled) setCategoriesError(humanizeReportError(err));
      });
    return () => {
      cancelled = true;
    };
    // context.route is fixed at mount (the context is captured once), so this still runs once.
  }, [isGuest, context.route]);

  const suggesting = kind === "suggestion";
  const copy = COPY[kind];

  // The suggestion category is chosen with the switch at the top, so the problem picker leaves it out.
  const problemCategories = useMemo(
    () => (categories ?? []).filter((c) => c.key !== SUGGESTION_CATEGORY),
    [categories]
  );
  const selectedCategory = useMemo(
    () => problemCategories.find((c) => c.key === category) ?? null,
    [problemCategories, category]
  );

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSend = (suggesting || !!category) && trimmedTitle.length >= 3 && trimmedBody.length >= 1 && !sending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    // Uploaded only now, only for a problem report, and only if the box is ticked.
    let screenshotPath: string | null = null;
    try {
      if (!suggesting && includeShot && shot.state === "ready") {
        screenshotPath = await uploadReportScreenshot(userId, shot.blob);
      }
      await submitReport({
        reporter_id: userId,
        category: suggesting ? SUGGESTION_CATEGORY : category,
        title: trimmedTitle,
        body: trimmedBody,
        // How much a fault matters; a suggestion is not asked, and anything picked before switching is dropped.
        reporter_severity: suggesting ? null : severity || null,
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
        // The key is left out entirely when there is no screenshot, so a database without sql/055
        // (no such column) receives exactly the insert it always has.
        ...(screenshotPath ? { screenshot_path: screenshotPath } : {}),
      });
      // The selection has now been spent. Leaving it would attach the same highlighted sentence to
      // the next report filed from anywhere in the app.
      clearRememberedSelection();
      setSent(true);
    } catch (err) {
      // The report did not go in, so the image it would have pointed at must not stay behind.
      if (screenshotPath) void removeReportScreenshot(screenshotPath);
      setError(humanizeReportError(err, suggesting));
    } finally {
      setSending(false);
    }
  };

  const showShot = !suggesting && shot.state !== "none";

  if (isGuest) {
    return (
      <div className="report-sheet" role="dialog" aria-label="Report a problem or suggest a feature">
        <div className="report-sheet-head">
          <button type="button" className="auth-back-link" onClick={onClose}>
            ← Back
          </button>
          <h3 className="report-sheet-title">Report a problem or suggest a feature</h3>
        </div>
        <div className="report-sheet-body">
          <p className="report-intro">
            Reports and suggestions are tied to an account so the team can come back to you about
            them, and so a fix can be told apart from a flood. Guest browsing can't send one. Sign
            in with a real account and the option appears in this menu.
          </p>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="report-sheet" role="dialog" aria-label={copy.sentLabel}>
        <div className="report-sheet-head">
          <button type="button" className="auth-back-link" onClick={onClose}>
            ← Back
          </button>
          <h3 className="report-sheet-title">Thank you</h3>
        </div>
        <div className="report-sheet-body">
          <p className="report-intro">
            {suggesting
              ? "Your suggestion is in. It goes to the team's review queue with the other suggestions."
              : "Your report is in. It goes to the team's review queue, filed under the category you chose."}{" "}
            You can see where it's got to any time under <strong>My Reports &amp; Suggestions</strong>,
            and you can still edit or delete it until someone picks it up.
          </p>
          <div className="report-actions">
            {onOpenMyReports && (
              <button type="button" className="report-btn report-btn-primary" onClick={onOpenMyReports}>
                {copy.mine}
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
    <div className="report-sheet" role="dialog" aria-label={copy.choice}>
      <div className="report-sheet-head">
        <button type="button" className="auth-back-link" onClick={onClose}>
          ← Back
        </button>
        <h3 className="report-sheet-title">{copy.choice}</h3>
      </div>
      <div className="report-sheet-body">
        {/* Native radios, so arrow keys and screen readers treat the pair as one either/or choice.
            What has been typed stays put when the reader switches. */}
        <fieldset className="report-kind" disabled={sending}>
          <legend className="report-kind-legend">What would you like to send?</legend>
          {KINDS.map((k) => (
            <label key={k} className="report-kind-option">
              <input
                type="radio"
                name="report-kind"
                value={k}
                checked={kind === k}
                onChange={() => {
                  setKind(k);
                  setError(null);
                }}
              />
              <span>
                <Icon name={COPY[k].choiceIcon} inline /> {COPY[k].choice}
              </span>
            </label>
          ))}
        </fieldset>

        {/* The whole point of the feature: the reporter can see what the report will say about
            where they were, before they write a word of it. */}
        <div className="report-context-card">
          <p className="report-context-line">
            <Icon name="pin" inline /> {copy.from} <strong>{context.page_title}</strong>
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
              {copy.selection}
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
          {!suggesting && (
            <label className="report-field">
              <span className="report-field-label">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required disabled={!categories}>
                <option value="">{categories ? "Choose one…" : "Loading…"}</option>
                {problemCategories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              {selectedCategory?.description && (
                <span className="report-field-hint">{selectedCategory.description}</span>
              )}
            </label>
          )}

          <label className="report-field">
            <span className="report-field-label">{copy.titleLabel}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder={copy.titlePlaceholder}
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
            <span className="report-field-label">{copy.bodyLabel}</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
              rows={6}
              placeholder={copy.bodyPlaceholder}
              maxLength={BODY_MAX}
              required
            />
            <span className="report-field-hint">
              {body.length}/{BODY_MAX}
            </span>
          </label>

          {!suggesting && (
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
                Your view helps the team decide what to look at first.
              </span>
            </label>
          )}

          {showShot && (
            <div className="report-shot">
              <p className="report-field-label">Screenshot</p>
              {shot.state === "pending" && <p className="report-field-hint">Taking a picture of the screen…</p>}
              {shot.state === "failed" && (
                <p className="report-field-hint">
                  A picture of this screen couldn't be taken, so this report will be sent without one.
                </p>
              )}
              {shot.state === "ready" && (
                <div className="report-shot-row">
                  <button
                    type="button"
                    className="report-shot-thumb"
                    onClick={() => setViewingShot(true)}
                    aria-label="View the screenshot full size"
                  >
                    <img src={shot.url} alt="The screen as it was when you opened this form" />
                  </button>
                  <div className="report-shot-text">
                    <label className="report-shot-include">
                      <input
                        type="checkbox"
                        checked={includeShot}
                        onChange={(e) => setIncludeShot(e.target.checked)}
                        disabled={sending}
                      />
                      <span>Include this screenshot</span>
                    </label>
                    <p className="report-field-hint">
                      It may show your notes, messages or anything else that was on your screen. It is
                      sent only if you tick the box, and only you and the site's administrators can see it.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

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
              {copy.captured}
              <Chevron open={showCaptured} />
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
                {showShot && (
                  <CapturedRow
                    label="Screenshot"
                    value={
                      shot.state === "ready" && includeShot
                        ? "Included — the picture shown above"
                        : "Not included"
                    }
                  />
                )}
                <p className="report-captured-note">
                  Your name and account are attached, so the team can follow up. Nothing else about
                  what you were reading is collected
                  {showShot ? ", and the screenshot is sent only if you tick “Include this screenshot”." : "."}
                </p>
              </div>
            )}
          </div>

          {(error || (!suggesting && categoriesError)) && (
            <p className="auth-status auth-error" role="alert">
              {error ?? categoriesError}
            </p>
          )}

          <div className="report-actions">
            <button type="submit" className="report-btn report-btn-primary" disabled={!canSend}>
              {sending ? "Sending…" : copy.send}
            </button>
            <button type="button" className="report-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
      {viewingShot &&
        shot.state === "ready" &&
        createPortal(
          <div
            className="report-shot-viewer"
            role="dialog"
            aria-label="Screenshot, full size"
            onClick={() => setViewingShot(false)}
          >
            <img src={shot.url} alt="The screen as it was when you opened this form" />
            <button type="button" className="report-btn report-shot-viewer-close" onClick={() => setViewingShot(false)}>
              Close
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

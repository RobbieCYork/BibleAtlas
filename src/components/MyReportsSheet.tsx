import { useCallback, useEffect, useState } from "react";
import {
  deleteMyReport,
  fetchCategories,
  fetchMyReports,
  formatAge,
  humanizeReportError,
  updateMyReport,
  SEVERITY_LABELS,
  STATUS_BLURBS,
  STATUS_LABELS,
  TARGET_KIND_LABELS,
  type MyReportRow,
  type ReportCategory,
  type Severity,
} from "../lib/reportsApi";

interface MyReportsSheetProps {
  userId: string;
  onClose: () => void;
  /** "Nothing here yet — report something" needs somewhere to go. */
  onReportSomething?: () => void;
}

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];

/** Editing is only ever offered on a report that is still 'new'. That is not a courtesy — it is the
 * shape of the permission: sql/025's UPDATE policy is
 * `reporter_id = auth.uid() AND status = 'new'`, so a form rendered over a triaged report would
 * accept a paragraph of typing and then save nothing. Better to say why the fields are gone.
 * The editor still handles the refusal (see updateMyReport), because staff can triage a report
 * while this form is open. */
function ReportEditor({
  report,
  onSaved,
  onCancel,
}: {
  report: MyReportRow;
  onSaved: (fields: { title: string; body: string; reporter_severity: Severity | null }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(report.title);
  const [body, setBody] = useState(report.body);
  const [severity, setSeverity] = useState<Severity | "">(report.reporter_severity ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const fields = { title: title.trim(), body: body.trim(), reporter_severity: (severity || null) as Severity | null };
    if (fields.title.length < 3 || fields.body.length < 1) {
      setError("A title of at least 3 characters and some detail are both required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateMyReport(report.id, fields);
      onSaved(fields);
    } catch (err) {
      setError(humanizeReportError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="report-editor">
      <label className="report-field">
        <span className="report-field-label">Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 200))} maxLength={200} />
      </label>
      <label className="report-field">
        <span className="report-field-label">Details</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 8000))} rows={5} maxLength={8000} />
      </label>
      <label className="report-field">
        <span className="report-field-label">How much it matters</span>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "")}>
          <option value="">Not sure / no view</option>
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="auth-status auth-error" role="alert">
          {error}
        </p>
      )}
      <div className="report-actions">
        <button type="button" className="report-btn report-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="report-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function MyReportsSheet({ userId, onClose, onReportSomething }: MyReportsSheetProps) {
  const [reports, setReports] = useState<MyReportRow[] | null>(null);
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rows, cats] = await Promise.all([fetchMyReports(userId), fetchCategories().catch(() => [])]);
      setReports(rows);
      setCategories(cats);
    } catch (err) {
      setError(humanizeReportError(err));
      setReports([]);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryLabel = (key: string) => categories.find((c) => c.key === key)?.label ?? key;

  const handleDelete = async (report: MyReportRow) => {
    if (!window.confirm(`Withdraw "${report.title}"? This can't be undone.`)) return;
    setNotice(null);
    try {
      await deleteMyReport(report.id);
      setReports((prev) => (prev ?? []).filter((r) => r.id !== report.id));
      setNotice("Report withdrawn.");
    } catch (err) {
      setError(humanizeReportError(err));
      // Its status changed under us, so what's on screen is stale in more ways than one.
      void load();
    }
  };

  return (
    <div className="report-sheet" role="dialog" aria-label="My reports">
      <div className="report-sheet-head">
        <button type="button" className="auth-back-link" onClick={onClose}>
          ← Back
        </button>
        <h3 className="report-sheet-title">My Reports</h3>
      </div>
      <div className="report-sheet-body">
        {error && (
          <p className="auth-status auth-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="auth-status">{notice}</p>}

        {reports === null && <p className="report-intro">Loading…</p>}

        {reports !== null && reports.length === 0 && (
          <div className="report-empty">
            <p className="report-intro">
              You haven't reported anything yet. If you spot a mistake, a misspelling, something
              that looks wrong, or you think of something the app should do — that's what this is
              for.
            </p>
            {onReportSomething && (
              <button type="button" className="report-btn report-btn-primary" onClick={onReportSomething}>
                Report something
              </button>
            )}
          </div>
        )}

        {(reports ?? []).map((report) => {
          const editable = report.status === "new";
          return (
            <article key={report.id} className="report-card">
              <div className="report-card-head">
                <h4 className="report-card-title">{report.title}</h4>
                <span className={`report-status report-status-${report.status}`}>{STATUS_LABELS[report.status]}</span>
              </div>
              <p className="report-card-meta">
                {categoryLabel(report.category)} · filed {formatAge(report.created_at)}
                {report.page_title && ` · from ${report.page_title}`}
              </p>
              <p className="report-card-blurb">{STATUS_BLURBS[report.status]}</p>

              {editingId === report.id ? (
                <ReportEditor
                  report={report}
                  onCancel={() => setEditingId(null)}
                  onSaved={(fields) => {
                    setReports((prev) => (prev ?? []).map((r) => (r.id === report.id ? { ...r, ...fields } : r)));
                    setEditingId(null);
                    setNotice("Changes saved.");
                  }}
                />
              ) : (
                <>
                  <p className="report-card-body">{report.body}</p>
                  {report.target_kind && (
                    <p className="report-card-meta">
                      About: {TARGET_KIND_LABELS[report.target_kind]} — {report.target_label ?? "—"}
                    </p>
                  )}
                  {report.selected_text && (
                    <blockquote className="report-selection-quote">{report.selected_text}</blockquote>
                  )}
                  {report.resolution_note && (
                    <p className="report-resolution">
                      <strong>From the team:</strong> {report.resolution_note}
                    </p>
                  )}
                  {editable && (
                    <div className="report-actions">
                      <button type="button" className="report-btn" onClick={() => setEditingId(report.id)}>
                        Edit
                      </button>
                      <button type="button" className="report-btn report-btn-danger" onClick={() => handleDelete(report)}>
                        Withdraw
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

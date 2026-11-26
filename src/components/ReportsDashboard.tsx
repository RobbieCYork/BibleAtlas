import { useCallback, useEffect, useState } from "react";
import {
  assignReport,
  categoryLabelFor,
  countReports,
  fetchAllCategories,
  fetchReportCounts,
  fetchReportDetail,
  fetchReportList,
  fetchUserRoles,
  formatAge,
  hasRoleAtLeast,
  humanizeReportError,
  setReportCategory,
  setReportStatus,
  setUserRole,
  ROLE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  TARGET_KIND_LABELS,
  type ReportCategory,
  type ReportCounts,
  type ReportDetail,
  type ReportListRow,
  type ReportStatus,
  type Role,
  type TargetKind,
  type UserRoleRow,
} from "../lib/reportsApi";
import { fetchUsers, type AdminUserRow } from "../lib/adminApi";

interface ReportsDashboardProps {
  /** The role current_user_role() actually returned. Never widened here: every gate below asks
   * hasRoleAtLeast() against this one value, and every action it unlocks is refused again by the
   * database if this were somehow wrong. */
  role: Role;
  viewerId: string;
  /** Required for the full-screen sheet (its ← Back); unused when `embedded`. */
  onClose?: () => void;
  /** Rendered inline inside another page (the Admin Console's Reports tab) instead of as its own
   * full-screen sheet: no fixed overlay, no head of its own — the host already has one. Everything
   * else, including every gate, is the same component. */
  embedded?: boolean;
}

const STATUS_ORDER: ReportStatus[] = [
  "new",
  "triaged",
  "accepted",
  "in_progress",
  "resolved",
  "declined",
  "duplicate",
];

/** What "open" means everywhere in this dashboard and in report_counts() — kept as one list so the
 * default filter and the `open` badge can never disagree about which statuses they are counting. */
const OPEN_STATUSES: ReportStatus[] = ["new", "triaged", "accepted", "in_progress"];

const TARGET_KINDS: TargetKind[] = [
  "article",
  "poi",
  "timeline_event",
  "person",
  "topic",
  "reading_plan",
  "scripture",
  "game",
  "profile",
  "other",
];

const PAGE_SIZE = 25;

type Tab = "queue" | "roles";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-value">{value}</span>
      <span className="admin-stat-label">{label}</span>
    </div>
  );
}

/* ==========================================================================
 * Detail view — one report, its context, its history, and whatever the
 * viewer's tier lets them do about it. (sql/025's advisor voting was removed
 * 2026-11-26; see the header of lib/reportsApi.ts.)
 * ======================================================================== */

function ReportDetailView({
  reportId,
  role,
  categories,
  onBack,
  onChanged,
}: {
  reportId: string;
  role: Role;
  /** Every category, retired ones included — for the label and for the re-file picker. */
  categories: ReportCategory[];
  onBack: () => void;
  /** Bumped after any write, so the queue behind this view reloads rather than showing the status
   * and category the row had before it was touched. */
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categoryChoice, setCategoryChoice] = useState("");

  const isAdmin = hasRoleAtLeast(role, "administrator");

  const [statusChoice, setStatusChoice] = useState<ReportStatus>("triaged");
  const [resolutionNote, setResolutionNote] = useState("");
  const [dupSearch, setDupSearch] = useState("");
  const [dupResults, setDupResults] = useState<ReportListRow[]>([]);
  const [dupChoice, setDupChoice] = useState<string | null>(null);
  const [staff, setStaff] = useState<UserRoleRow[] | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await fetchReportDetail(reportId);
      setDetail(d);
      setStatusChoice(d.report.status);
      setResolutionNote(d.report.resolution_note ?? "");
      setDupChoice(d.report.duplicate_of);
      setCategoryChoice(d.report.category);
    } catch (err) {
      setError(humanizeReportError(err));
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Only administrators can assign, and only advisors-and-above can be assigned to —
  // list_user_roles() returns exactly that set, so it doubles as the assignee list.
  useEffect(() => {
    if (!isAdmin || staff !== null) return;
    void fetchUserRoles()
      .then(setStaff)
      .catch(() => setStaff([]));
  }, [isAdmin, staff]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      await load();
      onChanged();
    } catch (err) {
      setError(humanizeReportError(err));
    } finally {
      setBusy(false);
    }
  };

  const searchDuplicates = async () => {
    setError(null);
    try {
      const { rows } = await fetchReportList({ search: dupSearch, limit: 10, sort: "newest" });
      // A duplicate must point at the canonical report, never at another duplicate or at itself —
      // report_set_status() refuses both, so they are filtered out rather than offered and rejected.
      setDupResults(rows.filter((r) => r.id !== reportId && r.status !== "duplicate"));
    } catch (err) {
      setError(humanizeReportError(err));
    }
  };

  if (!detail) {
    return (
      <div className="report-detail">
        <button type="button" className="auth-back-link" onClick={onBack}>
          ← Back to queue
        </button>
        {error ? (
          <p className="auth-status auth-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="report-intro">Loading…</p>
        )}
      </div>
    );
  }

  const r = detail.report;
  const categoryLabel = detail.category_label ?? categoryLabelFor(r.category, categories);
  // Re-file targets: every active category, plus the report's current one even if it is retired, so
  // the select can show where it sits now.
  const refileOptions = categories.filter((c) => c.is_active || c.key === r.category);

  return (
    <div className="report-detail">
      <button type="button" className="auth-back-link" onClick={onBack}>
        ← Back to queue
      </button>

      <div className="report-card-head">
        <h4 className="report-detail-title">{r.title}</h4>
        <span className={`report-status report-status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
      </div>
      <p className="report-card-meta">
        {categoryLabel} · filed {formatAge(r.created_at)}
        {/* Null whenever reveal_reporter_to_advisors is off and the viewer is not an administrator.
            Says "hidden" rather than nothing, so an advisor can tell a setting from a data gap. */}
        {" · by "}
        {detail.reporter_name ?? "hidden"}
        {r.reporter_severity && ` · they called it: ${SEVERITY_LABELS[r.reporter_severity]}`}
      </p>

      <p className="report-card-body">{r.body}</p>

      {r.selected_text && (
        <>
          <p className="admin-block-heading">Text they had selected</p>
          <blockquote className="report-selection-quote">{r.selected_text}</blockquote>
        </>
      )}

      <p className="admin-block-heading">Where they were</p>
      <div className="report-captured-list">
        <div className="report-captured-row">
          <span className="report-captured-label">Page</span>
          <span className="report-captured-value">{r.page_title ?? "—"}</span>
        </div>
        <div className="report-captured-row">
          <span className="report-captured-label">Screen</span>
          <span className="report-captured-value">{r.route ?? "—"}</span>
        </div>
        <div className="report-captured-row">
          <span className="report-captured-label">Subject</span>
          <span className="report-captured-value">
            {r.target_kind ? `${TARGET_KIND_LABELS[r.target_kind]} — ${r.target_label ?? r.target_id}` : "—"}
          </span>
        </div>
        <div className="report-captured-row">
          <span className="report-captured-label">Content id</span>
          <span className="report-captured-value">{r.target_id ?? "—"}</span>
        </div>
        <div className="report-captured-row">
          <span className="report-captured-label">App version</span>
          <span className="report-captured-value">{r.build_id ?? "—"}</span>
        </div>
        <div className="report-captured-row">
          <span className="report-captured-label">Screen size</span>
          <span className="report-captured-value">
            {r.viewport_w && r.viewport_h ? `${r.viewport_w} × ${r.viewport_h}` : "—"}
          </span>
        </div>
        <div className="report-captured-row">
          <span className="report-captured-label">Device</span>
          <span className="report-captured-value">{r.platform ?? "—"}</span>
        </div>
        <div className="report-captured-row">
          <span className="report-captured-label">Browser</span>
          <span className="report-captured-value">{r.user_agent ?? "—"}</span>
        </div>
      </div>

      {/* --- Administrator-only from here down. Advisors see the report; they do not move it,
              re-file it, assign it, or write on it. The database refuses all four regardless. --- */}
      {isAdmin && (
        <>
          <p className="admin-block-heading">Category</p>
          <div className="report-admin-box">
            <div className="report-dup-search">
              <select
                value={categoryChoice}
                onChange={(e) => setCategoryChoice(e.target.value)}
                aria-label="Category for this report"
                disabled={busy}
              >
                {refileOptions.length === 0 && <option value={r.category}>{categoryLabel}</option>}
                {refileOptions.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                    {!c.is_active ? " (retired)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="report-btn"
                disabled={busy || !categoryChoice || categoryChoice === r.category}
                onClick={() => run(() => setReportCategory(r.id, categoryChoice))}
              >
                Re-file
              </button>
            </div>
            <p className="admin-note">Moves this report to another category. The reporter's own words are not changed.</p>
          </div>

          <p className="admin-block-heading">Move this report</p>
          <div className="report-admin-box">
            <label className="report-field">
              <span className="report-field-label">Status</span>
              <select value={statusChoice} onChange={(e) => setStatusChoice(e.target.value as ReportStatus)}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>

            {statusChoice === "duplicate" && (
              <div className="report-dup">
                <p className="admin-note">
                  A duplicate has to name the original. Search for it — reports already marked
                  duplicate are left out, because the database refuses a chain.
                </p>
                <div className="report-dup-search">
                  <input
                    type="text"
                    value={dupSearch}
                    onChange={(e) => setDupSearch(e.target.value)}
                    placeholder="Search reports…"
                  />
                  <button type="button" className="report-btn" onClick={searchDuplicates}>
                    Search
                  </button>
                </div>
                {dupResults.map((d) => (
                  <label key={d.id} className="report-dup-option">
                    <input
                      type="radio"
                      name="duplicate-of"
                      checked={dupChoice === d.id}
                      onChange={() => setDupChoice(d.id)}
                    />
                    <span>
                      {d.title} <em>({STATUS_LABELS[d.status]}, {formatAge(d.created_at)})</em>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <label className="report-field">
              <span className="report-field-label">Resolution note (shown to the reporter)</span>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value.slice(0, 4000))}
                rows={3}
                maxLength={4000}
                placeholder="What was done, or why this isn't being taken forward."
              />
            </label>

            <button
              type="button"
              className="report-btn report-btn-primary"
              disabled={busy || (statusChoice === "duplicate" && !dupChoice)}
              onClick={() =>
                run(() =>
                  setReportStatus(
                    r.id,
                    statusChoice,
                    resolutionNote,
                    statusChoice === "duplicate" ? dupChoice : null
                  )
                )
              }
            >
              Save status
            </button>
          </div>

          <p className="admin-block-heading">Assign</p>
          <div className="report-admin-box">
            <select
              value={r.assigned_to ?? ""}
              disabled={busy || staff === null}
              onChange={(e) => run(() => assignReport(r.id, e.target.value || null))}
            >
              <option value="">Nobody</option>
              {(staff ?? []).map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.display_name ?? s.email ?? s.user_id} — {ROLE_LABELS[s.role]}
                </option>
              ))}
            </select>
            <p className="admin-note">Only advisors and above can be assigned a report.</p>
          </div>
        </>
      )}

      <p className="admin-block-heading">History</p>
      {detail.history.length === 0 ? (
        <p className="admin-note">Nothing has moved this report yet.</p>
      ) : (
        <ul className="admin-rows">
          {detail.history.map((h, i) => (
            <li key={i} className="report-history-row">
              {h.old_status ? `${STATUS_LABELS[h.old_status]} → ` : ""}
              {STATUS_LABELS[h.new_status]} · {h.actor_name ?? "someone"} · {formatAge(h.at)}
              {h.note && <span className="report-history-note">{h.note}</span>}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="auth-status auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ==========================================================================
 * Roles — owners assign, administrators can only look.
 * ======================================================================== */

function RolesTab({ role, viewerId }: { role: Role; viewerId: string }) {
  const isOwner = role === "owner";
  const [rows, setRows] = useState<UserRoleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<AdminUserRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await fetchUserRoles());
    } catch (err) {
      setError(humanizeReportError(err));
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const change = async (userId: string, next: Role, label: string) => {
    if (!window.confirm(`Make ${label} ${ROLE_LABELS[next]}?`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await setUserRole(userId, next, null);
      setNotice(`${label} is now ${ROLE_LABELS[next]}.`);
      await load();
    } catch (err) {
      setError(humanizeReportError(err));
    } finally {
      setBusy(false);
    }
  };

  // sql/019's account search, reused deliberately rather than adding a second one — sql/025's own
  // comment above list_user_roles() says to. It is administrator-gated, which every owner also is.
  const runSearch = async () => {
    setError(null);
    try {
      setFound(await fetchUsers(search.trim() || null, 20, 0));
    } catch (err) {
      setError(humanizeReportError(err));
    }
  };

  return (
    <div className="report-roles">
      {!isOwner && (
        <p className="admin-note">
          You can see who holds which role, but only an owner can change one. That is enforced in the
          database — set_user_role() refuses an administrator outright.
        </p>
      )}
      {error && (
        <p className="auth-status auth-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="auth-status">{notice}</p>}

      <p className="admin-block-heading">Current roles</p>
      {rows === null && <p className="report-intro">Loading…</p>}
      {rows !== null && rows.length === 0 && <p className="admin-note">Nobody has been given a role yet.</p>}
      {(rows ?? []).map((row) => {
        const label = row.display_name ?? row.email ?? row.user_id;
        const isSelf = row.user_id === viewerId;
        return (
          <div key={row.user_id} className="report-role-row">
            <div>
              <p className="report-role-name">
                {label} <span className="report-role-tag">{ROLE_LABELS[row.role]}</span>
              </p>
              <p className="report-card-meta">
                {row.email ?? "—"} · granted {formatAge(row.granted_at)}
                {row.granted_by_name && ` by ${row.granted_by_name}`}
              </p>
            </div>
            {isOwner && (
              <select
                value={row.role}
                disabled={busy || isSelf}
                // set_user_role() refuses `self_assignment:` in either direction — an owner cannot
                // promote or demote themselves. Disabling the control says so before the round trip.
                title={isSelf ? "You can't change your own role" : undefined}
                onChange={(e) => change(row.user_id, e.target.value as Role, label)}
              >
                <option value="user">{ROLE_LABELS.user} (revoke)</option>
                <option value="advisor">{ROLE_LABELS.advisor}</option>
                <option value="administrator">{ROLE_LABELS.administrator}</option>
                <option value="owner">{ROLE_LABELS.owner}</option>
              </select>
            )}
          </div>
        );
      })}

      {isOwner && (
        <>
          <p className="admin-block-heading">Give someone a role</p>
          <div className="report-dup-search">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
            />
            <button type="button" className="report-btn" onClick={runSearch}>
              Search
            </button>
          </div>
          {(found ?? [])
            .filter((u) => !u.is_anonymous && u.user_id !== viewerId)
            .map((u) => (
              <div key={u.user_id} className="report-role-row">
                <div>
                  <p className="report-role-name">{u.display_name ?? u.email ?? u.user_id}</p>
                  <p className="report-card-meta">{u.email ?? "—"}</p>
                </div>
                <select
                  value=""
                  disabled={busy}
                  onChange={(e) =>
                    e.target.value &&
                    change(u.user_id, e.target.value as Role, u.display_name ?? u.email ?? u.user_id)
                  }
                >
                  <option value="">Make…</option>
                  <option value="advisor">{ROLE_LABELS.advisor}</option>
                  <option value="administrator">{ROLE_LABELS.administrator}</option>
                  <option value="owner">{ROLE_LABELS.owner}</option>
                </select>
              </div>
            ))}
          {found !== null && found.length === 0 && <p className="admin-note">No accounts matched.</p>}
        </>
      )}
    </div>
  );
}

/* ==========================================================================
 * The dashboard itself.
 * ======================================================================== */

export default function ReportsDashboard({ role, viewerId, onClose, embedded = false }: ReportsDashboardProps) {
  const [tab, setTab] = useState<Tab>("queue");
  const [rows, setRows] = useState<ReportListRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<ReportCounts | null>(null);
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<ReportStatus[]>(OPEN_STATUSES);
  const [category, setCategory] = useState("");
  const [targetKind, setTargetKind] = useState<TargetKind | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(0);
  /** Per-category totals for the CURRENT status / subject / search filters, so the numbers on the
   * category tabs always agree with what the list under them shows. `null` until the first answer. */
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number> | null>(null);
  const [countsTick, setCountsTick] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { rows: got, total: n } = await fetchReportList({
        status: statuses,
        category: category || null,
        targetKind: targetKind || null,
        search,
        sort,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(got);
      setTotal(n);
    } catch (err) {
      setError(humanizeReportError(err));
      setRows([]);
    }
  }, [statuses, category, targetKind, search, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchReportCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
    void fetchAllCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // One small report_list() call per category (limit 1 — it repeats the total on every row). A
  // handful of round trips on a staff-only screen, and it needs no new database function, so the
  // counts work the same before and after sql/052.
  useEffect(() => {
    if (categories.length === 0) return;
    let cancelled = false;
    const base = { status: statuses, targetKind: targetKind || null, search };
    void Promise.all(
      categories.map((c) =>
        countReports({ ...base, category: c.key })
          .then((n) => [c.key, n] as const)
          .catch(() => [c.key, -1] as const)
      )
    ).then((pairs) => {
      if (cancelled) return;
      setCategoryCounts(Object.fromEntries(pairs.filter(([, n]) => n >= 0)));
    });
    return () => {
      cancelled = true;
    };
  }, [categories, statuses, targetKind, search, countsTick]);

  const reloadAll = useCallback(() => {
    void load();
    void fetchReportCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
    setCountsTick((t) => t + 1);
  }, [load]);

  // Tabs: every active category (even at 0, so the list of places a report can be filed is always
  // visible), plus any RETIRED category that still holds reports matching the filters — that is
  // where old reports wait to be re-filed. Retired and empty is hidden.
  const categoryTabs = categories.filter((c) => c.is_active || (categoryCounts?.[c.key] ?? 0) > 0);
  const allCount = categoryCounts
    ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
    : null;
  const selectCategory = (key: string) => {
    setPage(0);
    setCategory(key);
  };

  const toggleStatus = (s: ReportStatus) => {
    setPage(0);
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className={embedded ? "report-embedded" : "report-sheet"} role={embedded ? "region" : "dialog"} aria-label="Reports">
      {!embedded && (
        <div className="report-sheet-head">
          <button type="button" className="auth-back-link" onClick={onClose}>
            ← Back
          </button>
          <h3 className="report-sheet-title">Reports</h3>
          <span className="report-role-tag">{ROLE_LABELS[role]}</span>
        </div>
      )}
      <div className={embedded ? "report-sheet-body report-sheet-body-embedded" : "report-sheet-body"}>
        {/* The Roles tab is offered to administrators as a read-only roster and to owners as the
            place they grant roles. Nobody below administrator can load list_user_roles() at all. */}
        {hasRoleAtLeast(role, "administrator") && (
          <div className="admin-tabs" role="tablist" aria-label="Reports sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "queue"}
              className={`admin-tab${tab === "queue" ? " admin-tab-active" : ""}`}
              onClick={() => setTab("queue")}
            >
              Queue
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "roles"}
              className={`admin-tab${tab === "roles" ? " admin-tab-active" : ""}`}
              onClick={() => setTab("roles")}
            >
              Roles
            </button>
          </div>
        )}

        {tab === "roles" && hasRoleAtLeast(role, "administrator") && <RolesTab role={role} viewerId={viewerId} />}

        {tab === "queue" && openId && (
          <ReportDetailView
            reportId={openId}
            role={role}
            categories={categories}
            onBack={() => setOpenId(null)}
            onChanged={reloadAll}
          />
        )}

        {tab === "queue" && !openId && (
          <>
            {counts && (
              <div className="admin-stat-grid">
                <Stat label="Open" value={counts.open} />
                <Stat label="Untriaged" value={counts.untriaged} />
              </div>
            )}

            <div className="report-filters">
              {/* Category tabs first: this is how the queue is sorted into piles. Each count follows
                  the status chips, subject and search below, so a tab says how many you would see. */}
              <div className="report-category-tabs" role="tablist" aria-label="Report categories">
                <button
                  type="button"
                  role="tab"
                  aria-selected={category === ""}
                  className={`report-category-tab${category === "" ? " active" : ""}`}
                  onClick={() => selectCategory("")}
                >
                  All
                  {allCount !== null && <span className="report-category-count">{allCount}</span>}
                </button>
                {categoryTabs.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={category === c.key}
                    className={`report-category-tab${category === c.key ? " active" : ""}${c.is_active ? "" : " retired"}`}
                    onClick={() => selectCategory(c.key)}
                    title={c.is_active ? c.description ?? undefined : "Retired category — re-file these reports"}
                  >
                    {c.label}
                    {!c.is_active && " (retired)"}
                    {categoryCounts && <span className="report-category-count">{categoryCounts[c.key] ?? 0}</span>}
                  </button>
                ))}
              </div>

              <div className="report-status-chips" role="group" aria-label="Filter by status">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`report-chip${statuses.includes(s) ? " active" : ""}`}
                    aria-pressed={statuses.includes(s)}
                    onClick={() => toggleStatus(s)}
                  >
                    {STATUS_LABELS[s]}
                    {counts?.by_status?.[s] ? ` ${counts.by_status[s]}` : ""}
                  </button>
                ))}
              </div>

              <div className="report-filter-row">
                <select
                  value={targetKind}
                  onChange={(e) => {
                    setPage(0);
                    setTargetKind(e.target.value as TargetKind | "");
                  }}
                  aria-label="Filter by what it's about"
                >
                  <option value="">Anything</option>
                  {TARGET_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {TARGET_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <select
                  value={sort}
                  onChange={(e) => {
                    setPage(0);
                    setSort(e.target.value as "newest" | "oldest");
                  }}
                  aria-label="Sort"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>

              <form
                className="report-dup-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(0);
                  setSearch(searchInput);
                }}
              >
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search titles, detail, selected text…"
                  aria-label="Search reports"
                />
                <button type="submit" className="report-btn">
                  Search
                </button>
              </form>
            </div>

            {error && (
              <p className="auth-status auth-error" role="alert">
                {error}
              </p>
            )}

            {rows === null && <p className="report-intro">Loading…</p>}
            {rows !== null && rows.length === 0 && !error && (
              <p className="admin-note">
                No reports match those filters. {statuses.length === 0 && "No status is selected — pick at least one."}
              </p>
            )}

            {(rows ?? []).map((r) => (
              <button key={r.id} type="button" className="report-queue-row" onClick={() => setOpenId(r.id)}>
                <span className="report-queue-main">
                  <span className="report-queue-title">{r.title}</span>
                  <span className="report-card-meta">
                    {r.category_label ?? categoryLabelFor(r.category, categories)} · {formatAge(r.created_at)}
                    {r.reporter_name && ` · ${r.reporter_name}`}
                    {r.target_kind && ` · ${TARGET_KIND_LABELS[r.target_kind]}: ${r.target_label ?? r.target_id}`}
                  </span>
                </span>
                <span className="report-queue-side">
                  <span className={`report-status report-status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                  {r.reporter_severity && (
                    <span className="report-queue-severity">{SEVERITY_LABELS[r.reporter_severity]}</span>
                  )}
                </span>
              </button>
            ))}

            {total > PAGE_SIZE && (
              <div className="report-actions">
                <button type="button" className="report-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  ← Newer page
                </button>
                <span className="admin-note">
                  {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
                </span>
                <button
                  type="button"
                  className="report-btn"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Older page →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

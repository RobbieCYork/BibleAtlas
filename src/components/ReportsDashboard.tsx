import { useCallback, useEffect, useState } from "react";
import {
  assignReport,
  castVote,
  fetchCategories,
  fetchReportCounts,
  fetchReportDetail,
  fetchReportList,
  fetchUserRoles,
  formatAge,
  hasRoleAtLeast,
  humanizeReportError,
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
import Icon from "./Icon";

interface ReportsDashboardProps {
  /** The role current_user_role() actually returned. Never widened here: every gate below asks
   * hasRoleAtLeast() against this one value, and every action it unlocks is refused again by the
   * database if this were somehow wrong. */
  role: Role;
  viewerId: string;
  onClose: () => void;
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
 * Detail view — one report, its context, its votes, its history, and whatever
 * the viewer's tier lets them do about it.
 * ======================================================================== */

function ReportDetailView({
  reportId,
  role,
  viewerId,
  categories,
  onBack,
  onChanged,
}: {
  reportId: string;
  role: Role;
  viewerId: string;
  categories: ReportCategory[];
  onBack: () => void;
  /** Bumped after any write, so the queue behind this view reloads rather than showing the vote
   * count and status the row had before it was touched. */
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [voteNote, setVoteNote] = useState("");

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
      const mine = d.votes.find((v) => v.voter_id === viewerId);
      setVoteNote(mine?.note ?? "");
    } catch (err) {
      setError(humanizeReportError(err));
    }
  }, [reportId, viewerId]);

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
  const myVote = detail.votes.find((v) => v.voter_id === viewerId)?.vote ?? null;
  const categoryLabel = detail.category_label ?? categories.find((c) => c.key === r.category)?.label ?? r.category;

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
        {categoryLabel} · priority {r.priority_score.toFixed(1)} · filed {formatAge(r.created_at)}
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

      {/* --- Voting: every advisor and above, one vote each, changeable and retractable. --- */}
      <p className="admin-block-heading">Your vote</p>
      <div className="report-vote-box">
        <div className="report-vote-buttons" role="group" aria-label="Vote on this report">
          <button
            type="button"
            className={`report-vote-btn${myVote === 1 ? " active agree" : ""}`}
            disabled={busy}
            onClick={() => run(() => castVote(r.id, 1, voteNote))}
          >
            <Icon name="thumbsUp" inline /> Agree
          </button>
          <button
            type="button"
            className={`report-vote-btn${myVote === -1 ? " active disagree" : ""}`}
            disabled={busy}
            onClick={() => run(() => castVote(r.id, -1, voteNote))}
          >
            <Icon name="thumbsDown" inline /> Disagree
          </button>
          <button
            type="button"
            className="report-vote-btn"
            disabled={busy || myVote === null}
            onClick={() => run(() => castVote(r.id, 0, null))}
          >
            Retract
          </button>
        </div>
        <textarea
          className="report-vote-note"
          value={voteNote}
          onChange={(e) => setVoteNote(e.target.value.slice(0, 2000))}
          rows={2}
          placeholder="Why? (optional — saved with your vote when you press Agree or Disagree)"
          maxLength={2000}
        />
      </div>

      <p className="admin-block-heading">
        Votes — {r.vote_agree} agree, {r.vote_disagree} disagree
      </p>
      {detail.votes.length === 0 ? (
        <p className="admin-note">Nobody has voted on this yet.</p>
      ) : (
        <ul className="admin-rows">
          {detail.votes.map((v) => (
            <li key={v.voter_id} className="report-vote-row">
              <span className={`report-vote-mark ${v.vote === 1 ? "agree" : "disagree"}`}>
                {v.vote === 1 ? "Agree" : "Disagree"}
              </span>
              <span className="report-vote-who">
                {v.voter_name ?? "Someone"} · {ROLE_LABELS[v.voter_role]} · {formatAge(v.updated_at)}
              </span>
              {v.note && <span className="report-vote-text">{v.note}</span>}
            </li>
          ))}
        </ul>
      )}

      {/* --- Administrator-only from here down. Advisors see the report and vote; they do not move
              it, assign it, or write on it. sql/025 refuses all three regardless. --- */}
      {isAdmin && (
        <>
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
              {h.note && <span className="report-vote-text">{h.note}</span>}
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

export default function ReportsDashboard({ role, viewerId, onClose }: ReportsDashboardProps) {
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
  const [sort, setSort] = useState<"priority" | "newest" | "oldest">("priority");
  const [page, setPage] = useState(0);

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
    void fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const reloadAll = useCallback(() => {
    void load();
    void fetchReportCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, [load]);

  const toggleStatus = (s: ReportStatus) => {
    setPage(0);
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="report-sheet" role="dialog" aria-label="Reports">
      <div className="report-sheet-head">
        <button type="button" className="auth-back-link" onClick={onClose}>
          ← Back
        </button>
        <h3 className="report-sheet-title">Reports</h3>
        <span className="report-role-tag">{ROLE_LABELS[role]}</span>
      </div>
      <div className="report-sheet-body">
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
            viewerId={viewerId}
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
                <Stat label="You haven't voted" value={counts.unvoted_by_me} />
              </div>
            )}

            <div className="report-filters">
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
                  value={category}
                  onChange={(e) => {
                    setPage(0);
                    setCategory(e.target.value);
                  }}
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
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
                    setSort(e.target.value as "priority" | "newest" | "oldest");
                  }}
                  aria-label="Sort"
                >
                  <option value="priority">Highest priority</option>
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
                <span className="report-queue-score" title="Priority score">
                  {r.priority_score.toFixed(1)}
                </span>
                <span className="report-queue-main">
                  <span className="report-queue-title">{r.title}</span>
                  <span className="report-card-meta">
                    {r.category_label ?? r.category} · {formatAge(r.created_at)}
                    {r.reporter_name && ` · ${r.reporter_name}`}
                    {r.target_kind && ` · ${TARGET_KIND_LABELS[r.target_kind]}: ${r.target_label ?? r.target_id}`}
                  </span>
                </span>
                <span className="report-queue-side">
                  <span className={`report-status report-status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                  <span className="report-queue-votes">
                    <Icon name="thumbsUp" inline /> {r.vote_agree} <Icon name="thumbsDown" inline /> {r.vote_disagree}
                    {r.my_vote === 1 && <em> · you agreed</em>}
                    {r.my_vote === -1 && <em> · you disagreed</em>}
                  </span>
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

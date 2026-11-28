import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_ACTIONS_NOT_BUILT,
  deleteContent,
  fetchContentCounts,
  fetchDailyActivity,
  fetchEngagement,
  fetchFeatureBreakdown,
  fetchFeatureUsage,
  fetchGuestSummary,
  fetchOverview,
  fetchRecentPublicContent,
  fetchUsers,
  formatDuration,
  formatWhen,
  labelEvent,
  sendPasswordReset,
  type AdminBreakdownRow,
  type AdminContentCounts,
  type AdminContentRow,
  type AdminDailyRow,
  type AdminEngagement,
  type AdminFeatureRow,
  type AdminGuestSummary,
  type AdminOverview,
  type AdminUserRow,
} from "../lib/adminApi";
import AboutPageEditor from "./AboutPageEditor";
import AdminAddUser from "./AdminAddUser";
import GrowthPanel from "./GrowthPanel";
import UsageReportsPanel from "./UsageReportsPanel";
import RegisteredAccountsCard from "./RegisteredAccountsCard";
import RegisteredGrowthCard from "./RegisteredGrowthCard";
import ModerationQueuePanel from "./ModerationQueuePanel";
import ReportsDashboard from "./ReportsDashboard";
import type { Role } from "../lib/reportsApi";
import { FeatureStagesPanel, LiveTestSwitch } from "./FeatureRelease";
import { useFeatureAdmin } from "../lib/features";
import { confirmDiscardUnsaved } from "../lib/unsavedChanges";

/** Every section loads on demand, so opening the console costs one small query (the overview) rather
 * than eight. `AdminSection` is both the tab key and the loader key. */
type AdminSection =
  | "overview"
  | "growth"
  | "users"
  | "engagement"
  | "features"
  | "content"
  | "moderation"
  | "safety"
  | "reports"
  | "release"
  | "about";

/** "Moderation" and "Safety" are deliberately two tabs, not one, because they answer two different
 * questions. Moderation is a BROWSE — the most recent public posts and comments, whether or not
 * anyone has complained about them, which is how you find something nobody reported. Safety is a
 * QUEUE — the things readers actually flagged, oldest open first, each with a decision to make and
 * an audit trail behind it (sql/028). Folding the queue into the browse would bury the reports. */
const SECTION_LABELS: Record<AdminSection, string> = {
  overview: "Overview",
  // The usage graphs (sql/054; draws what it can before that). Was "Growth", a table of counts with a chart
  // behind each row; Robbie looked for graphs under "Reports", so both tabs now say which kind of report.
  growth: "Usage reports",
  users: "Users",
  engagement: "Engagement",
  // The usage ranking. Was labelled "Features" until the owner's Testing/Live controls arrived and
  // needed that name — two tabs both called "Features" would mean two different things.
  features: "Feature use", // "Usage" alone sat next to "Usage reports" and read as the same thing.
  content: "Content",
  moderation: "Moderation",
  safety: "Safety",
  // The reader-filed reports queue (sql/025) — what the account menu's top-level "Reports" row used to open.
  reports: "Problem reports",
  // Testing / Live stages (sql/039). Owner only — the tab is not drawn for anyone else.
  release: "Features",
  // The words of About Capstone Bible (sql/051). Owner only, like Features — the other site-wide
  // setting this console edits. save_about_page() refuses everyone else, administrators included.
  about: "About page",
};

const WINDOW_OPTIONS = [7, 30, 90] as const;

/** A tiny inline bar, sized as a share of the row with the largest value. Deliberately not a chart
 * library — this is one number per row and it has to read on a phone. */
function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <span className="admin-bar" aria-hidden="true">
      <span className="admin-bar-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-value">{value}</span>
      <span className="admin-stat-label">{label}</span>
      {hint && <span className="admin-stat-hint">{hint}</span>}
    </div>
  );
}

/** Shown wherever a section depends on analytics that only started accruing when migration 019
 * shipped. Being explicit about this matters: a zero here means "no data yet", not "nobody uses it",
 * and those are very different things to read off a dashboard. */
function AnalyticsSinceNote({ since }: { since: string | null | undefined }) {
  return (
    <p className="admin-note">
      {since
        ? `Usage data collected since ${new Date(since).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}. Nothing before that exists — analytics can't be backfilled.`
        : "No usage data has been recorded yet. Counts here stay at zero until people use the app with this build installed."}
    </p>
  );
}

export interface AdminConsoleReports {
  /** current_user_role() as resolved by the caller; the Reports tab is drawn only when this is given. */
  role: Role;
  viewerId: string;
  /** Untriaged count, shown as a badge on the tab. */
  untriaged: number;
}

export default function AdminConsole({ reports }: { reports?: AdminConsoleReports } = {}) {
  const [section, setSection] = useState<AdminSection>("overview");
  const { isOwner } = useFeatureAdmin();
  const sectionKeys = (Object.keys(SECTION_LABELS) as AdminSection[]).filter(
    (k) => ((k !== "release" && k !== "about") || isOwner) && (k !== "reports" || !!reports)
  );
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [daily, setDaily] = useState<AdminDailyRow[] | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [guests, setGuests] = useState<AdminGuestSummary | null>(null);
  const [engagement, setEngagement] = useState<AdminEngagement | null>(null);
  const [features, setFeatures] = useState<AdminFeatureRow[] | null>(null);
  const [panelBreakdown, setPanelBreakdown] = useState<AdminBreakdownRow[] | null>(null);
  const [gameBreakdown, setGameBreakdown] = useState<AdminBreakdownRow[] | null>(null);
  const [counts, setCounts] = useState<AdminContentCounts | null>(null);
  const [moderation, setModeration] = useState<AdminContentRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      // Includes the deliberate "not authorized" a non-admin gets from every one of these RPCs.
      setError(err instanceof Error ? err.message : "Something went wrong loading that.");
    } finally {
      setBusy(false);
    }
  }, []);

  // The overview is always loaded — it's the landing section and it's one round trip.
  useEffect(() => {
    void run(async () => {
      // The guest summary is fetched only to SUBTRACT the retired guest accounts: every number on the
      // Overview is registered accounts only. Nothing about guests is shown.
      const [ov, d, g] = await Promise.all([fetchOverview(), fetchDailyActivity(30), fetchGuestSummary(30)]);
      setOverview(ov);
      setDaily(d);
      setGuests(g);
    });
  }, [run]);

  const loadUsers = useCallback(
    (search: string) => run(async () => setUsers(await fetchUsers(search.trim() || null, 100, 0))),
    [run]
  );

  // Per-section lazy loading, re-firing when the time window changes for the windowed sections.
  useEffect(() => {
    if (section === "users" && users === null) void loadUsers("");
    if (section === "users" && guests === null) void run(async () => setGuests(await fetchGuestSummary(30)));
    if (section === "engagement") void run(async () => setEngagement(await fetchEngagement(days)));
    if (section === "features")
      void run(async () => {
        const [f, p, g] = await Promise.all([
          fetchFeatureUsage(days),
          fetchFeatureBreakdown("panel.open", "panel", days),
          fetchFeatureBreakdown("game.play", "game", days),
        ]);
        setFeatures(f);
        setPanelBreakdown(p);
        setGameBreakdown(g);
      });
    if (section === "content" && counts === null) void run(async () => setCounts(await fetchContentCounts()));
    if (section === "moderation" && moderation === null)
      void run(async () => setModeration(await fetchRecentPublicContent(40)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, days]);

  const handlePasswordReset = async (user: AdminUserRow) => {
    if (!user.email) return;
    setResetTarget(null);
    setActionStatus(null);
    try {
      await sendPasswordReset(user.email);
      setActionStatus(
        `Password reset email requested for ${user.email}. They set the new password themselves from the link — you never see or choose it.`
      );
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : "Couldn't send that reset email.");
    }
  };

  const handleDelete = async (row: AdminContentRow) => {
    if (!window.confirm(`Permanently delete this ${row.kind}? This cannot be undone.`)) return;
    await run(async () => {
      await deleteContent(row.kind, row.id);
      setModeration((prev) => (prev ?? []).filter((r) => r.id !== row.id));
      setActionStatus(`Deleted one ${row.kind}.`);
    });
  };

  // Registered accounts only: each day's sign-ups and sessions minus that day's retired-guest ones
  // (both functions bucket by the UTC date). "—" until the guest figures arrive, never a guest-inflated number.
  const minusGuests = (all: number, guest: number | undefined) =>
    guests ? Math.max(0, Number(all ?? 0) - Number(guest ?? 0)) : "—";
  const guestDay = new Map((guests?.days ?? []).map((g) => [g.day, g]));
  const regDaily = guests
    ? (daily ?? []).map((d) => ({
        ...d,
        signups: Math.max(0, Number(d.signups) - Number(guestDay.get(d.day)?.new_guests ?? 0)),
        sessions: Math.max(0, Number(d.sessions) - Number(guestDay.get(d.day)?.sessions ?? 0)),
      }))
    : [];
  const maxDaily = Math.max(1, ...regDaily.map((d) => Math.max(d.signups, d.sessions)));
  const maxFeature = Math.max(1, ...(features ?? []).map((f) => f.uses));
  // Registered accounts only. Old anonymous ("Continue as Guest") rows are never listed or counted.
  const registeredUsers = (users ?? []).filter((u) => !u.is_anonymous);

  return (
    <div className="admin-console">
      {/* Owner only (renders nothing otherwise). Kept above the tabs so the view can be switched
          from any section without hunting for it. */}
      <LiveTestSwitch />

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {sectionKeys.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            className={`admin-tab${section === key ? " admin-tab-active" : ""}`}
            onClick={() => {
              // The About page editor may be holding unsaved text; switching tabs unmounts it.
              if (key !== section && !confirmDiscardUnsaved()) return;
              setSection(key);
            }}
          >
            {SECTION_LABELS[key]}
            {key === "reports" && reports && reports.untriaged > 0 && (
              <span className="panel-menu-item-badge">{reports.untriaged}</span>
            )}
          </button>
        ))}
      </div>

      {(section === "engagement" || section === "features") && (
        <div className="admin-window-picker" role="group" aria-label="Time window">
          {WINDOW_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              className={days === w ? "active" : ""}
              aria-pressed={days === w}
              onClick={() => setDays(w)}
            >
              {w}d
            </button>
          ))}
        </div>
      )}

      {error && <p className="auth-status auth-error">{error}</p>}
      {actionStatus && <p className="auth-status admin-action-status">{actionStatus}</p>}
      {busy && <p className="admin-note">Loading…</p>}

      {/* -------------------------------------------------------------- OVERVIEW */}
      {section === "overview" && overview && (
        <>
          <div className="admin-stat-grid">
            <Stat label="Registered accounts" value={overview.users_registered} hint="signed up with an email" />
            <Stat label="New (24h)" value={minusGuests(overview.users_new_24h, guests?.new_24h)} />
            <Stat label="New (7d)" value={minusGuests(overview.users_new_7d, guests?.new_7d)} />
            <Stat label="New (30d)" value={minusGuests(overview.users_new_30d, guests?.new_30d)} />
            <Stat label="Active (24h)" value={minusGuests(overview.active_24h, guests?.active_24h)} hint="last seen in 24h" />
            <Stat label="Active (7d)" value={minusGuests(overview.active_7d, guests?.active_7d)} hint="last seen in 7 days" />
          </div>
          <p className="admin-note">
            Registered accounts only — accounts left over from the retired “Continue as Guest” are not counted here. The graphs
            are under Usage reports.
          </p>
          <AnalyticsSinceNote since={overview.analytics_since} />
          {regDaily.length > 0 && (
            <div className="admin-block">
              <h4 className="admin-block-heading">Last 30 days</h4>
              <ul className="admin-rows">
                {regDaily
                  .slice()
                  .reverse()
                  .filter((d) => d.signups > 0 || d.sessions > 0)
                  .slice(0, 14)
                  .map((d) => (
                    <li key={d.day} className="admin-row">
                      <span className="admin-row-label">
                        {new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Bar value={Math.max(d.signups, d.sessions)} max={maxDaily} />
                      <span className="admin-row-value">
                        {d.signups} new · {d.sessions} sessions
                      </span>
                    </li>
                  ))}
              </ul>
              {regDaily.every((d) => d.signups === 0 && d.sessions === 0) && (
                <p className="admin-note">No activity recorded in this window yet.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------------------- GROWTH */}
      {/* Owns its own period control and its own fetch: its day/week/month toggle
          scopes only this section, and folding it into the console's 7/30/90-day
          picker would give two controls that mean different things the same name. */}
      {section === "growth" && (
        <>
          <UsageReportsPanel />
          {/* The older catalogue of every count (sql/026), kept one tap away rather than as a second tab. */}
          <details className="usage-more">
            <summary>Every other count, as a table (notes, highlights, posts, groups, messages…)</summary>
            <GrowthPanel />
          </details>
        </>
      )}

      {/* ----------------------------------------------------------------- USERS */}
      {section === "users" && (
        <>
          {/* First thing on the tab: real accounts, counted over the whole database, never over the
              (searchable, capped) list below. Guests are not shown anywhere in this console any more:
              "Continue as Guest" is retired and an anonymous session only ever reaches the sign-in gate
              (showAuthGate in App.tsx). Their old rows stay in the database, untouched, and are left out. */}
          <RegisteredAccountsCard overview={overview} guests={guests} />
          <RegisteredGrowthCard />
          {/* Above the search box: an invitation, never a password (see AdminAddUser). On success the
              list is re-searched for the new address so the row is right there. */}
          <AdminAddUser
            onAdded={(email) => {
              setUserSearch(email);
              void loadUsers(email);
            }}
          />
          <form
            className="admin-search-row"
            onSubmit={(e) => {
              e.preventDefault();
              void loadUsers(userSearch);
            }}
          >
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search email or display name…"
              aria-label="Search users"
            />
            <button type="submit">Search</button>
          </form>
          {users && (
            <>
              <p className="admin-note">
                {registeredUsers.length} registered account{registeredUsers.length === 1 ? "" : "s"} in this result
                {users.length < (users[0]?.total_count ?? 0) ? `, from the newest ${users.length} sign-ups — search to find older ones` : ""}
                .
              </p>

              <ul className="admin-user-list">
                {registeredUsers.map((u) => (
                  <li key={u.user_id} className="admin-user">
                    <div className="admin-user-main">
                      <span className="admin-user-name">
                        {u.display_name || u.email || "—"}
                        {u.is_admin && <span className="admin-badge">admin</span>}
                      </span>
                      {u.email && <span className="admin-user-email">{u.email}</span>}
                    </div>
                    <div className="admin-user-meta">
                      <span>Joined {formatWhen(u.created_at)}</span>
                      <span>Last seen {formatWhen(u.last_seen_at ?? u.last_sign_in_at)}</span>
                      <span>
                        {u.session_count} session{u.session_count === 1 ? "" : "s"} · {formatDuration(u.total_seconds)}
                      </span>
                    </div>
                    {u.email && (
                      <div className="admin-user-actions">
                        <button type="button" onClick={() => setResetTarget(u)}>
                          Send password reset
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {registeredUsers.length === 0 && (
                <p className="admin-note">
                  No registered account matches that search.
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ------------------------------------------------------------ ENGAGEMENT */}
      {section === "engagement" && engagement && (
        <>
          {/* These windowed figures come from 019 functions that cannot tell a retired guest session from
              a registered one. Separating them needs a database change, so say so instead of hiding it. */}
          <p className="admin-note">
            May include a few sessions left over from the retired “Continue as Guest”; the Usage reports graphs leave them out.
          </p>
          <div className="admin-stat-grid">
            <Stat label="Sessions" value={engagement.sessions} hint={`last ${days} days`} />
            <Stat label="Median session" value={formatDuration(engagement.median_seconds)} hint="excludes bounces" />
            <Stat label="Average session" value={formatDuration(engagement.mean_seconds)} />
            <Stat label="Top 10% session" value={formatDuration(engagement.p90_seconds)} />
            <Stat label="Bounces" value={engagement.bounces} hint="under 5 seconds" />
            <Stat label="Sessions / user" value={Number(engagement.sessions_per_user ?? 0).toFixed(1)} />
            <Stat label="Returning" value={engagement.returning_users} hint="came back on another day" />
            <Stat label="Total time" value={formatDuration(engagement.total_seconds)} />
          </div>
          <p className="admin-note">
            A session is one browser tab. Time on site is measured from the session's first moment to its last
            heartbeat (roughly every minute while the tab is in front), so a session's final minute is never counted —
            these numbers under-report slightly rather than over-report. Mobile browsers don't reliably tell a page when
            it is closing, so there is no honest way to capture that last minute.
          </p>
        </>
      )}

      {/* -------------------------------------------------------------- FEATURES */}
      {section === "features" && features && (
        <>
          {/* These windowed figures come from 019 functions that cannot tell a retired guest session from
              a registered one. Separating them needs a database change, so say so instead of hiding it. */}
          <p className="admin-note">
            May include a few sessions left over from the retired “Continue as Guest”; the Usage reports graphs leave them out.
          </p>
          {features.length === 0 ? (
            <>
              <p className="admin-note">Nothing recorded in the last {days} days yet.</p>
              <AnalyticsSinceNote since={overview?.analytics_since} />
            </>
          ) : (
            <>
              <div className="admin-block">
                <h4 className="admin-block-heading">Most used → least used</h4>
                <ul className="admin-rows">
                  {features.map((f) => (
                    <li key={f.event} className="admin-row">
                      <span className="admin-row-label">{labelEvent(f.event)}</span>
                      <Bar value={f.uses} max={maxFeature} />
                      <span className="admin-row-value">
                        {f.uses} · {f.users} user{f.users === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {panelBreakdown && panelBreakdown.length > 0 && (
                <div className="admin-block">
                  <h4 className="admin-block-heading">Which panels get opened</h4>
                  <ul className="admin-rows">
                    {panelBreakdown.map((b) => (
                      <li key={b.label} className="admin-row">
                        <span className="admin-row-label">{b.label}</span>
                        <Bar value={b.uses} max={Math.max(1, ...panelBreakdown.map((x) => x.uses))} />
                        <span className="admin-row-value">{b.uses}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {gameBreakdown && gameBreakdown.length > 0 && (
                <div className="admin-block">
                  <h4 className="admin-block-heading">Which games get played</h4>
                  <ul className="admin-rows">
                    {gameBreakdown.map((b) => (
                      <li key={b.label} className="admin-row">
                        <span className="admin-row-label">{b.label}</span>
                        <Bar value={b.uses} max={Math.max(1, ...gameBreakdown.map((x) => x.uses))} />
                        <span className="admin-row-value">{b.uses}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="admin-note">
                Only feature names and counts are recorded — never what anyone searched for, wrote, read, or
                highlighted. A feature that isn't listed has never been used in this window (or isn't instrumented).
              </p>
            </>
          )}
        </>
      )}

      {/* --------------------------------------------------------------- CONTENT */}
      {section === "content" && counts && (
        <>
          <div className="admin-stat-grid">
            <Stat label="Notes" value={counts.notes} hint={`${counts.notes_public} shared publicly`} />
            <Stat label="Highlights" value={counts.highlights} />
            <Stat label="Posts" value={counts.posts} />
            <Stat label="Post comments" value={counts.post_comments} />
            <Stat label="Note comments" value={counts.note_comments} />
            <Stat label="Sermon notes" value={counts.sermon_notes} />
            <Stat label="Chapters read" value={counts.chapter_reads} />
            <Stat label="Plans started" value={counts.reading_plans_started} hint={`${counts.reading_plan_days} days done`} />
            <Stat label="Groups" value={counts.groups} />
            <Stat label="Friendships" value={counts.friendships} />
            <Stat label="Game rooms" value={counts.game_rooms} />
            <Stat label="With a photo" value={counts.profiles_with_avatar} hint="profiles" />
          </div>
          <p className="admin-note">Row counts only. Nobody's note, message, or sermon text is readable from here.</p>
        </>
      )}

      {/* ------------------------------------------------------------ MODERATION */}
      {/* Loads itself — it has its own availability probe, its own filters and its own error state,
          and it must be able to say "sql/028 hasn't been run" without this console knowing that is
          a thing that can happen. */}
      {section === "safety" && <ModerationQueuePanel />}

      {section === "reports" && reports && (
        <ReportsDashboard embedded role={reports.role} viewerId={reports.viewerId} />
      )}

      {/* -------------------------------------------------------------- RELEASE */}
      {section === "release" && isOwner && <FeatureStagesPanel />}

      {/* ------------------------------------------------------------ ABOUT PAGE */}
      {section === "about" && isOwner && <AboutPageEditor />}

      {section === "moderation" && moderation && (
        <>
          <p className="admin-note">
            Public posts and their comments, newest first — the only content an admin can read here. Private notes,
            direct messages, and group messages are deliberately unreachable from this console.
          </p>
          <ul className="admin-mod-list">
            {moderation.map((row) => (
              <li key={`${row.kind}-${row.id}`} className="admin-mod-item">
                <div className="admin-mod-head">
                  <span className="admin-badge admin-badge-muted">{row.kind}</span>
                  <span className="admin-mod-author">{row.author_name ?? "Unknown"}</span>
                  <span className="admin-mod-when">{formatWhen(row.created_at)}</span>
                </div>
                <p className="admin-mod-body">{row.body}</p>
                <button type="button" className="admin-danger" onClick={() => void handleDelete(row)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
          {moderation.length === 0 && <p className="admin-note">No public posts or comments yet.</p>}
        </>
      )}

      {/* Password reset confirmation — deliberately spells out what it does and doesn't do, because
          "reset this person's password" is exactly the phrase people expect to mean something more
          invasive than it does here. */}
      {resetTarget && (
        <div className="admin-confirm">
          <p>
            Email a password-reset link to <strong>{resetTarget.email}</strong>?
          </p>
          <p className="admin-note">
            This is the same link the "Forgot password?" form sends. They choose their own new password from it — you
            can't see it or set it, and this console has no way to.
          </p>
          <div className="admin-confirm-actions">
            <button type="button" onClick={() => void handlePasswordReset(resetTarget)}>
              Send reset email
            </button>
            <button type="button" onClick={() => setResetTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <details className="admin-limits">
        <summary>What this console deliberately can't do</summary>
        <ul>
          {ADMIN_ACTIONS_NOT_BUILT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="admin-note">
          Each of those needs Supabase's service_role key, which bypasses every access rule in the database. This app is
          a static bundle, so anything it holds is public — the key stays out of it. Do these from the Supabase
          dashboard.
        </p>
      </details>
    </div>
  );
}

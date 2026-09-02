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
import Icon from "./Icon";

/** Every section loads on demand, so opening the console costs one small query (the overview) rather
 * than eight. `AdminSection` is both the tab key and the loader key. */
type AdminSection = "overview" | "users" | "engagement" | "features" | "content" | "moderation";

const SECTION_LABELS: Record<AdminSection, string> = {
  overview: "Overview",
  users: "Users",
  engagement: "Engagement",
  features: "Features",
  content: "Content",
  moderation: "Moderation",
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

export default function AdminConsole() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [daily, setDaily] = useState<AdminDailyRow[] | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [guests, setGuests] = useState<AdminGuestSummary | null>(null);
  const [guestsOpen, setGuestsOpen] = useState(false);
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
      const [ov, d] = await Promise.all([fetchOverview(), fetchDailyActivity(30)]);
      setOverview(ov);
      setDaily(d);
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

  const maxDaily = Math.max(1, ...(daily ?? []).map((d) => Math.max(d.signups, d.sessions)));
  const maxFeature = Math.max(1, ...(features ?? []).map((f) => f.uses));
  // Guests are rolled into one card; only real accounts get a row of their own.
  const registeredUsers = (users ?? []).filter((u) => !u.is_anonymous);
  const guestRowCount = (users ?? []).length - registeredUsers.length;
  const maxGuestDay = Math.max(1, ...(guests?.days ?? []).map((d) => Math.max(d.new_guests, d.sessions)));

  return (
    <div className="admin-console">
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {(Object.keys(SECTION_LABELS) as AdminSection[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            className={`admin-tab${section === key ? " admin-tab-active" : ""}`}
            onClick={() => setSection(key)}
          >
            {SECTION_LABELS[key]}
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
            <Stat label="Total accounts" value={overview.users_total} />
            <Stat label="Registered" value={overview.users_registered} hint="with an email" />
            <Stat label="Guests" value={overview.users_anonymous} hint="anonymous sessions" />
            <Stat label="New (24h)" value={overview.users_new_24h} />
            <Stat label="New (7d)" value={overview.users_new_7d} />
            <Stat label="New (30d)" value={overview.users_new_30d} />
            <Stat label="Active (24h)" value={overview.active_24h} hint="daily actives" />
            <Stat label="Active (7d)" value={overview.active_7d} hint="weekly actives" />
            <Stat label="Sessions (7d)" value={overview.sessions_7d} />
          </div>
          <AnalyticsSinceNote since={overview.analytics_since} />
          {daily && daily.length > 0 && (
            <div className="admin-block">
              <h4 className="admin-block-heading">Last 30 days</h4>
              <ul className="admin-rows">
                {daily
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
              {daily.every((d) => d.signups === 0 && d.sessions === 0) && (
                <p className="admin-note">No activity recorded in this window yet.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ----------------------------------------------------------------- USERS */}
      {section === "users" && (
        <>
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
                {registeredUsers.length} registered account{registeredUsers.length === 1 ? "" : "s"}
                {guestRowCount > 0 ? ` and ${guestRowCount} guest session${guestRowCount === 1 ? "" : "s"}` : ""} in
                this result
                {users.length < (users[0]?.total_count ?? 0) ? ` — showing the newest ${users.length} of ${users[0]?.total_count}` : ""}
                .
              </p>

              {/* Guests are throwaway: "Continue as Guest" mints a new anonymous account on every
                  tap, so they outnumber real people several to one and listing them individually
                  buries the handful of accounts worth looking at. One card stands in for all of
                  them; the people who matter stay listed below, one row each. */}
              {guestRowCount > 0 && guests && (
                <div className="admin-guest-card">
                  <button
                    type="button"
                    className="admin-guest-summary"
                    aria-expanded={guestsOpen}
                    onClick={() => setGuestsOpen((v) => !v)}
                  >
                    <span className="admin-guest-head">
                      <span className="admin-guest-title">
                        <Icon name="people" inline /> Guests
                        <span className="admin-badge admin-badge-muted">{guests.total}</span>
                      </span>
                      <span className="admin-guest-chevron" aria-hidden="true">
                        {guestsOpen ? "▾" : "▸"}
                      </span>
                    </span>
                    <span className="admin-guest-figures">
                      <span>
                        <strong>{guests.new_24h}</strong> new in 24h
                      </span>
                      <span>
                        <strong>{guests.new_7d}</strong> new in 7d
                      </span>
                      <span>
                        <strong>{guests.active_7d}</strong> active in 7d
                      </span>
                      <span>Newest {formatWhen(guests.newest_seen)}</span>
                      <span>First {formatWhen(guests.first_seen)}</span>
                    </span>
                  </button>

                  {guestsOpen && (
                    <div className="admin-guest-detail">
                      <div className="admin-stat-grid">
                        <Stat label="Guest accounts" value={guests.total} hint="one per “Continue as Guest” tap" />
                        <Stat
                          label="Measured"
                          value={guests.guests_with_sessions}
                          hint="have session data"
                        />
                        <Stat label="Sessions" value={guests.sessions_total} />
                        <Stat label="Median session" value={formatDuration(guests.median_session_seconds)} />
                        <Stat label="Total time" value={formatDuration(guests.sessions_seconds_total)} />
                        <Stat label="Came back" value={guests.returning_guests} hint="more than one session" />
                        <Stat label="Active (24h)" value={guests.active_24h} />
                        <Stat label="Last active" value={formatWhen(guests.last_active_at)} />
                      </div>

                      {/* The caveat, stated where the numbers are — not in a footnote. Most guests
                          predate migration 019, so they have a creation date and nothing else. A
                          small "sessions" figure next to a large "guests" figure is a gap in the
                          record, not a finding about behaviour. */}
                      {guests.guests_before_analytics > 0 && (
                        <p className="admin-note">
                          {guests.guests_before_analytics} of these {guests.total} guests were created before usage
                          tracking started
                          {guests.analytics_since
                            ? ` on ${new Date(guests.analytics_since).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`
                            : ""}
                          . We know when they arrived and nothing else — no session lengths, no times, no activity.
                          Every session figure above and every time below covers only the{" "}
                          {guests.guests_with_sessions} guest{guests.guests_with_sessions === 1 ? "" : "s"} who arrived
                          after that. It can't be backfilled.
                        </p>
                      )}

                      <div className="admin-block">
                        <h4 className="admin-block-heading">By day</h4>
                        {guests.days.length === 0 ? (
                          <p className="admin-note">No guest arrived and no guest session started in the last 30 days.</p>
                        ) : (
                          <ul className="admin-rows">
                            {guests.days.map((d) => (
                              <li key={d.day} className="admin-row">
                                <span className="admin-row-label">
                                  {new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                <Bar value={Math.max(d.new_guests, d.sessions)} max={maxGuestDay} />
                                <span className="admin-row-value">
                                  {d.new_guests} new
                                  {d.sessions > 0
                                    ? ` · ${d.sessions} session${d.sessions === 1 ? "" : "s"} · ${formatDuration(d.seconds)}`
                                    : " · no session data"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="admin-block">
                        <h4 className="admin-block-heading">Most recent guest visits</h4>
                        {guests.recent_sessions.length === 0 ? (
                          <p className="admin-note">
                            No guest session has been recorded yet. Guests created before tracking started don't have
                            one, so this stays empty until a new guest visits with this build installed.
                          </p>
                        ) : (
                          <ul className="admin-rows">
                            {guests.recent_sessions.map((sn) => (
                              <li key={sn.session_id} className="admin-row admin-row-stacked">
                                <span className="admin-row-label">{formatWhen(sn.started_at)}</span>
                                <span className="admin-row-value">
                                  {formatDuration(sn.seconds)} · {sn.event_count} action
                                  {sn.event_count === 1 ? "" : "s"} · left{" "}
                                  {new Date(sn.last_seen_at).toLocaleTimeString(undefined, {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <p className="admin-note">
                        A guest has no name, email, or profile — nothing here identifies anyone. A guest who later
                        creates an account appears as a separate registered row below; the two are not linked.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <ul className="admin-user-list">
                {registeredUsers.map((u) => (
                  <li key={u.user_id} className="admin-user">
                    <div className="admin-user-main">
                      <span className="admin-user-name">
                        {u.display_name || u.email || (u.is_anonymous ? "Guest" : "—")}
                        {u.is_admin && <span className="admin-badge">admin</span>}
                        {u.is_anonymous && <span className="admin-badge admin-badge-muted">guest</span>}
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
                  {guestRowCount > 0
                    ? "No registered account matches that search — only guests, which are summarised above."
                    : "No accounts match that search."}
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ------------------------------------------------------------ ENGAGEMENT */}
      {section === "engagement" && engagement && (
        <>
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

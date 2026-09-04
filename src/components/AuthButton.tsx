import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, setRememberMe, type Profile } from "../lib/supabase";
import { useTextSize } from "../lib/textSize";
import { useTheme } from "../lib/theme";
import { MIN_VISIBLE_TABS, MOBILE_TAB_META, MOBILE_TAB_ORDER, LOCKED_TAB, useMobileTabs } from "../lib/mobileTabs";
import AdminConsole from "./AdminConsole";
import ReportIssueSheet from "./ReportIssueSheet";
import MyReportsSheet from "./MyReportsSheet";
import ReportsDashboard from "./ReportsDashboard";
import { useIsAdmin } from "../lib/adminApi";
import { fetchReportCounts, hasRoleAtLeast, useCurrentRole } from "../lib/reportsApi";
import type { ReportSurface } from "../lib/reportContext";
import Icon from "./Icon";

interface AuthButtonProps {
  session: Session | null;
  /** Bumped by the mobile "More" sheet's "My Profile" entry — opens the full-screen My Profile view
   * straight away for a real account. Undefined until first triggered, so mounting doesn't pop
   * anything open unprompted. Falls back to this menu's Settings view for guests, who have no
   * profile page to show. */
  openProfileNonce?: number;
  /** Desktop's entry point for Reading Plans, now that the in-reader toolbar chip is gone — mirrors
   * the mobile "More" sheet's "Reading Plans" entry (see MobileTabBar/App/BiblePanel). Closes this
   * menu and hands off to the Bible panel, which isn't rendered inside this dropdown. */
  onOpenReadingPlans?: () => void;
  /** Opens the full-screen My Profile view (see MyProfileView/App) — replaces the old in-menu
   * "profile" flyout view. Closes this menu itself before handing off, same as onOpenReadingPlans. */
  onOpenMyProfile?: () => void;
  /** Bumped by App whenever MyProfileView saves a display-name change, so the fetch below (keyed on
   * session alone otherwise) refreshes the label shown on the trigger button/menu without needing a
   * full session change. */
  profileVersion?: number;
  /** Where the reader is standing right now, derived by App from its own render (see its
   * `reportSurface` memo). Handed to the report form so a report knows which article, person,
   * chapter or screen it is about.
   *
   * WHY THE ENTRY POINT IS HERE AT ALL. "From anywhere in the app" needs a control that is on
   * screen everywhere, and this menu's trigger is: the header renders above every panel and outlives
   * all three full-screen takeovers (Timeline, Games, My Profile). The two alternatives were both
   * worse. The mobile bottom bar is customisable and capped, and an eighth destination there — or
   * an eighth row in MobileNavMenu — is exactly the clutter the owner has already complained about.
   * A floating action button would have to dodge the map controls, the timeline canvas, the walk
   * banner and the tab bar on every screen. This menu already hosts the app's other
   * "about your account, not about the content" entries, which is what reporting is. */
  reportSurface?: ReportSurface;
}

type Mode = "login" | "signup" | "reset";

/** Shared with both the logged-in and logged-out dropdown states — text size is a setting, not an
 * account action, so it lives in this menu but isn't gated on being signed in. */
function TextSizeControl() {
  const { scale, increase, decrease, canIncrease, canDecrease } = useTextSize();
  return (
    <div className="auth-settings-section">
      <span className="auth-settings-label">Text Size</span>
      <div className="auth-text-size">
        <button type="button" onClick={decrease} disabled={!canDecrease} aria-label="Decrease text size">
          A⁻
        </button>
        <span className="auth-text-size-value">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={increase} disabled={!canIncrease} aria-label="Increase text size">
          A⁺
        </button>
      </div>
    </div>
  );
}

/** Shared with both the logged-in and logged-out dropdown states, same as TextSizeControl — the
 * app's appearance defaults to dark (see lib/theme.tsx) and is a plain local preference, not tied to
 * an account. */
function AppearanceControl() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="auth-settings-section">
      <span className="auth-settings-label">Appearance</span>
      <div className="auth-appearance-toggle">
        <button type="button" className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
          <Icon name="sun" inline /> Light
        </button>
        <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
          <Icon name="moon" inline /> Dark
        </button>
      </div>
    </div>
  );
}

/** Lets a reader choose which of the seven destinations the mobile bottom bar shows. Seven tabs on
 * a 375px phone is a crowded row, and not everyone uses all seven — so each can be switched off and
 * back on here, in the same account-menu Settings view as text size and appearance.
 *
 * Mobile-only, matching the same 768px breakpoint App uses: desktop navigates via the hamburger
 * PanelMenu and the footer, neither of which this touches. Rendered only when the viewport is
 * actually narrow, so the control never appears as a dead setting on a desktop screen.
 *
 * Two guards, both surfaced rather than silent: Bible has no switch at all (it's the cold-start
 * landing tab and the fallback every other safety path points at), and once the bar is down to
 * MIN_VISIBLE_TABS the remaining switches are disabled with a line of copy saying why. */
function TabBarControl() {
  const { visible, canHide, setTabVisible, resetTabs, isDefault } = useMobileTabs();
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia("(max-width: 768px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  if (!isNarrow) return null;

  const atMinimum = MOBILE_TAB_ORDER.filter((k) => visible[k]).length <= MIN_VISIBLE_TABS;

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">Tab Bar</span>
      <p className="auth-benefits auth-tabbar-note">
        Choose which buttons appear in the bar at the bottom of the screen. Bible always stays, and at least{" "}
        {MIN_VISIBLE_TABS} tabs are always shown.
      </p>
      <ul className="auth-tabbar-list">
        {MOBILE_TAB_ORDER.map((key) => {
          const on = visible[key];
          const locked = key === LOCKED_TAB;
          // A visible tab can only be switched off while above the minimum; a hidden one can always
          // be switched back on.
          const disabled = locked || (on && !canHide(key));
          return (
            <li key={key} className={`auth-tabbar-row${disabled ? " disabled" : ""}`}>
              <span className="auth-tabbar-name">
                <span aria-hidden="true">{MOBILE_TAB_META[key].icon}</span>
                {MOBILE_TAB_META[key].label}
              </span>
              {locked ? (
                <span className="auth-tabbar-always">Always on</span>
              ) : (
                <label className="auth-tabbar-switch">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    onChange={(e) => setTabVisible(key, e.target.checked)}
                    aria-label={`Show ${MOBILE_TAB_META[key].label} in the tab bar`}
                  />
                  <span className="auth-tabbar-track" aria-hidden="true" />
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {atMinimum && (
        <p className="auth-tabbar-limit" role="status">
          That's the minimum of {MIN_VISIBLE_TABS} tabs — turn another one on before hiding any more.
        </p>
      )}
      <button type="button" className="auth-tabbar-reset" onClick={resetTabs} disabled={isDefault}>
        Reset to default
      </button>
    </div>
  );
}

/** Lets an account choose how long a "mark chapter as read" checkmark sticks before it silently stops
 * counting — e.g. reset every year to re-read the Bible on an annual cycle without clearing old marks
 * by hand. Purely a query-time filter (see chapterReadCutoff) — switching back to Never instantly
 * un-hides everything, nothing was ever deleted. */
function ReadingResetControl({ userId }: { userId: string }) {
  const [reset, setReset] = useState<Profile["chapter_read_reset"]>("never");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("chapter_read_reset")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setReset((data as { chapter_read_reset: Profile["chapter_read_reset"] } | null)?.chapter_read_reset ?? "never");
        setLoaded(true);
      });
  }, [userId]);

  const handleChange = async (value: Profile["chapter_read_reset"]) => {
    setReset(value);
    setSaving(true);
    setSaved(null);
    const { error } = await supabase.from("profiles").update({ chapter_read_reset: value }).eq("id", userId);
    setSaving(false);
    setSaved(error ? "Couldn't save — try again." : "Saved!");
  };

  if (!loaded) return null;

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">Reset "Read" Marks</span>
      <p className="auth-benefits">
        Automatically stop counting a chapter as read after this long — handy for reading through the Bible on a
        yearly cycle.
      </p>
      <select value={reset} onChange={(e) => handleChange(e.target.value as Profile["chapter_read_reset"])} disabled={saving}>
        <option value="never">Never</option>
        <option value="monthly">1 month after reading</option>
        <option value="yearly">1 year after reading</option>
      </select>
      {saved && <p className="auth-status">{saved}</p>}
    </div>
  );
}

type MenuView = "menu" | "settings" | "admin" | "report" | "myReports" | "reports";

/** Fallback for the one render where App hasn't told us where the reader is. A report filed against
 * it is still a valid report — it just says less. Never left blank: `route`/`page_title` are what a
 * triager reads first. */
const UNKNOWN_SURFACE: ReportSurface = { route: "app", title: "Capstone Bible", target: null };

export default function AuthButton({
  session,
  openProfileNonce,
  onOpenReadingPlans,
  onOpenMyProfile,
  profileVersion,
  reportSurface,
}: AuthButtonProps) {
  const [open, setOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("menu");
  // The second entry point to the Admin Console (My Profile has the first). Same gate, same hook,
  // same component — nothing about access is decided here. useIsAdmin only answers "should this
  // menu draw the item?"; a non-admin who forced the item open would get a console of "not
  // authorized", because every admin_* function in sql/019 and sql/021 raises 42501 before doing any
  // work. Asked for every signed-in account, guests included, deliberately: the question is answered
  // by whether the database holds an admin_users row, and adding a second client-side rule about who
  // is even allowed to ask is exactly the kind of divergence this hook exists to prevent.
  const isAdmin = useIsAdmin(session?.user.id ?? null);

  // The reports tier gate. Separate from useIsAdmin above on purpose: that hook answers sql/019's
  // "is there an admin_users row", this one answers sql/025's four-tier current_user_role(), and an
  // ADVISOR is neither an admin nor a plain member. Both fail closed, and neither decides anything
  // — every reports_* function re-refuses on its own.
  const { role: reportsRole, loading: roleLoading } = useCurrentRole(session?.user.id ?? null);
  const canSeeReports = !roleLoading && hasRoleAtLeast(reportsRole, "advisor");
  // Guests are the retired "Continue as Guest" accounts. `reports.allow_anonymous` ships false, so
  // the INSERT policy would refuse them — the form says so instead of failing at submit time.
  const isGuest = !!session?.user.is_anonymous;

  /** Untriaged count for the menu badge — report_counts()'s whole purpose ("badge counts for the
   * dashboard nav", per sql/025). Only asked once the role check has actually said advisor+, so a
   * member's account never fires a call the database is going to refuse. */
  const [untriaged, setUntriaged] = useState(0);
  useEffect(() => {
    if (!canSeeReports) {
      setUntriaged(0);
      return;
    }
    let cancelled = false;
    void fetchReportCounts()
      .then((c) => {
        if (!cancelled) setUntriaged(c.untriaged ?? 0);
      })
      .catch(() => {
        // A badge is not worth an error message. The dashboard itself surfaces real failures.
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeReports, menuView]);

  useEffect(() => {
    if (openProfileNonce === undefined) return;
    // A real account jumps straight to the full-screen My Profile view; guests have no profile page,
    // so they still get this menu's Settings view instead.
    if (session && !session.user.is_anonymous) {
      onOpenMyProfile?.();
      return;
    }
    setOpen(true);
    setMenuView("settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProfileNonce]);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState<string | null>(null);
  const [rememberMe, setRememberMeChecked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetched once per real session so the avatar/label can show it instead of the raw email. Also
  // re-fetched whenever profileVersion bumps (MyProfileView saved a display-name change) — that view
  // no longer lives inside this dropdown, so this is the only way this button's own label learns
  // about an edit without waiting for the next session change.
  useEffect(() => {
    if (!session || session.user.is_anonymous) {
      setSavedDisplayName(null);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setSavedDisplayName((data as { display_name: string | null } | null)?.display_name ?? null);
      });
  }, [session, profileVersion]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const resetForm = () => {
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (err) throw err;
        setInfo("Check your email for a link to reset your password.");
      } else if (mode === "login") {
        setRememberMe(rememberMe);
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        setOpen(false);
        setEmail("");
        setPassword("");
      } else {
        const trimmedName = displayName.trim();
        const { data: available } = await supabase.rpc("is_display_name_available", { p_name: trimmedName });
        if (available === false) {
          setError("That display name is taken — try another.");
          return;
        }
        setRememberMe(true);
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: trimmedName } },
        });
        if (err) throw err;
        setInfo("Account created! Check your email to confirm, then log in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
  };

  if (session) {
    const label = session.user.is_anonymous ? "Guest" : savedDisplayName ?? session.user.email ?? "Account";
    return (
      <div className="auth-button" ref={containerRef}>
        <button
          type="button"
          className="auth-trigger"
          onClick={() => {
            setOpen((o) => !o);
            setMenuView("menu");
          }}
          aria-label="Settings and account"
        >
          <span className="auth-avatar" aria-hidden="true">
            {session.user.is_anonymous ? <Icon name="people" /> : label.charAt(0).toUpperCase()}
          </span>
        </button>
        {open && menuView === "menu" && (
          <div className="auth-dropdown">
            <div className="auth-identity">
              <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
                {session.user.is_anonymous ? <Icon name="people" /> : label.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="auth-current-user">{label}</p>
                {!session.user.is_anonymous && session.user.email && savedDisplayName && (
                  <p className="auth-guest-note">{session.user.email}</p>
                )}
                {session.user.is_anonymous && <p className="auth-guest-note">Browsing as a guest</p>}
              </div>
            </div>
            <div className="auth-settings-divider" />
            {!session.user.is_anonymous && onOpenMyProfile && (
              <button
                type="button"
                className="auth-menu-item"
                onClick={() => {
                  setOpen(false);
                  onOpenMyProfile();
                }}
              >
                <Icon name="people" inline /> My Profile
              </button>
            )}
            {canSeeReports && (
              <button type="button" className="auth-menu-item" onClick={() => setMenuView("reports")}>
                <Icon name="flag" inline /> Reports
                {untriaged > 0 && <span className="panel-menu-item-badge">{untriaged}</span>}
              </button>
            )}
            {isAdmin && (
              <button type="button" className="auth-menu-item" onClick={() => setMenuView("admin")}>
                <Icon name="shield" inline /> Admin Console
              </button>
            )}
            <button type="button" className="auth-menu-item" onClick={() => setMenuView("settings")}>
              <Icon name="settings" inline /> Settings
            </button>
            {onOpenReadingPlans && (
              <button
                type="button"
                className="auth-menu-item"
                onClick={() => {
                  setOpen(false);
                  onOpenReadingPlans();
                }}
              >
                <Icon name="calendar" inline /> Reading Plans
              </button>
            )}
            {/* Everyone signed in, guests included — the guest branch of the sheet explains why
                they can't file one, which is a better answer than an item that isn't there. */}
            <div className="auth-settings-divider" />
            <button type="button" className="auth-menu-item" onClick={() => setMenuView("report")}>
              <Icon name="flag" inline /> Report a Problem
            </button>
            {!session.user.is_anonymous && (
              <button type="button" className="auth-menu-item" onClick={() => setMenuView("myReports")}>
                <Icon name="doc" inline /> My Reports
              </button>
            )}
            <button type="button" className="auth-menu-item auth-signout" onClick={handleSignOut}>
              Log Out
            </button>
          </div>
        )}
        {open && menuView === "admin" && isAdmin && (
          <div className="auth-admin-sheet" role="dialog" aria-label="Admin Console">
            <div className="auth-admin-sheet-head">
              <button type="button" className="auth-back-link" onClick={() => setMenuView("menu")}>
                ← Back
              </button>
              <h3 className="auth-admin-sheet-title">Admin Console</h3>
            </div>
            <div className="auth-admin-sheet-body">
              <p className="auth-benefits">
                Usage, engagement, and moderation for the whole site. Only accounts listed in <code>admin_users</code>{" "}
                can load any of it — the database refuses the queries for everyone else, not just this menu.
              </p>
              <AdminConsole />
            </div>
          </div>
        )}
        {/* The three reports surfaces borrow the Admin Console's full-screen treatment for the same
            reason it does: none of them fits in a 240px flyout, and a form the reader has to write a
            paragraph into least of all. `open` stays true so ← Back returns to the menu. */}
        {open && menuView === "report" && (
          <ReportIssueSheet
            userId={session.user.id}
            isGuest={isGuest}
            surface={reportSurface ?? UNKNOWN_SURFACE}
            onClose={() => setMenuView("menu")}
            onOpenMyReports={() => setMenuView("myReports")}
          />
        )}
        {open && menuView === "myReports" && !session.user.is_anonymous && (
          <MyReportsSheet
            userId={session.user.id}
            onClose={() => setMenuView("menu")}
            onReportSomething={() => setMenuView("report")}
          />
        )}
        {/* Gated on the resolved role, never on `reportsRole` being merely non-null: canSeeReports
            is false while the check is still in flight, so a slow network shows nothing privileged
            rather than a dashboard that then empties itself. */}
        {open && menuView === "reports" && canSeeReports && reportsRole && (
          <ReportsDashboard role={reportsRole} viewerId={session.user.id} onClose={() => setMenuView("menu")} />
        )}
        {open && menuView === "settings" && (
          <div className="auth-dropdown">
            <button type="button" className="auth-back-link" onClick={() => setMenuView("menu")}>
              ← Back
            </button>
            <TextSizeControl />
            <AppearanceControl />
            <TabBarControl />
            {!session.user.is_anonymous && (
              <>
                <div className="auth-settings-divider" />
                <ReadingResetControl userId={session.user.id} />
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="auth-button" ref={containerRef}>
      <button type="button" className="auth-trigger auth-trigger-loggedout" onClick={() => setOpen((o) => !o)} aria-label="Settings, log in, or sign up">
        <span className="auth-avatar" aria-hidden="true">
          <Icon name="people" />
        </span>
        <span className="auth-trigger-label">Log In</span>
      </button>
      {open && (
        <div className="auth-dropdown">
          <TextSizeControl />
          <AppearanceControl />
          <TabBarControl />
          <div className="auth-settings-divider" />
          <p className="auth-benefits">
            Create a free account to sync your notes, highlights, and tags — and pick up right where you left off on any
            device.
          </p>
          {mode !== "reset" && (
            <div className="auth-mode-toggle">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  resetForm();
                }}
              >
                Log In
              </button>
              <button
                type="button"
                className={mode === "signup" ? "active" : ""}
                onClick={() => {
                  setMode("signup");
                  resetForm();
                }}
              >
                Sign Up
              </button>
            </div>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setMode("login");
                resetForm();
              }}
            >
              ← Back to Log In
            </button>
          )}
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Display Name (what friends see)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {mode !== "reset" && (
              <div className="auth-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </div>
            )}
            {mode === "login" && (
              <div className="auth-form-extras">
                <label className="auth-remember-me">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMeChecked(e.target.checked)} />
                  Remember me
                </label>
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => {
                    setMode("reset");
                    resetForm();
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button type="submit" disabled={loading}>
              {loading ? "…" : mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
            </button>
          </form>
          {error && <p className="auth-status auth-error">{error}</p>}
          {info && <p className="auth-status">{info}</p>}
        </div>
      )}
    </div>
  );
}

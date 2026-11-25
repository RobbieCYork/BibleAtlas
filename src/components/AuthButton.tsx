import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, setRememberMe } from "../lib/supabase";
import AccountSettingsBody, { TextSizeControl, AppearanceControl, NavBarControl } from "./AccountSettings";
import AdminConsole from "./AdminConsole";
import ReportIssueSheet from "./ReportIssueSheet";
import MyReportsSheet from "./MyReportsSheet";
import ReportsDashboard from "./ReportsDashboard";
import SafetySheet from "./SafetySheet";
import { SOCIAL_CONNECTIONS_ENABLED } from "../lib/features";
import { useIsAdmin } from "../lib/adminApi";
import { fetchReportCounts, hasRoleAtLeast, useCurrentRole } from "../lib/reportsApi";
import type { ReportSurface } from "../lib/reportContext";
import Icon from "./Icon";
import Chevron from "./Chevron";
import SocialLinks from "./SocialLinks";

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
  /** Opens the full-screen My Profile view (see MyProfileView/App). Used by the phone routes that arrive
   * as openProfileNonce, and by the identity header when profileHeaderLink is set. Closes this menu
   * itself before handing off, same as onOpenReadingPlans. */
  onOpenMyProfile: () => void;
  /** Desktop only: make the menu's identity header (avatar, name, email) the way into My Profile. There
   * is no other desktop entry point, so do not turn this off there. A phone has the "My Profile" tab
   * and header menu row, which is always listed, so its header stays plain. */
  profileHeaderLink: boolean;
  /** Opens the full-screen Settings view (see SettingsView/App) for a real account. Same hand-off as
   * onOpenMyProfile. */
  onOpenSettings: () => void;
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

type MenuView = "menu" | "settings" | "admin" | "report" | "myReports" | "reports" | "safety";

/** Fallback for the one render where App hasn't told us where the reader is. A report filed against
 * it is still a valid report — it just says less. Never left blank: `route`/`page_title` are what a
 * triager reads first. */
const UNKNOWN_SURFACE: ReportSurface = { route: "app", title: "Capstone Bible", target: null };

/** Shortest password Supabase will accept for a *new* account, checked here so signup can say so
 * instead of making the round trip.
 *
 * WHY THIS IS A CHECK IN handleSubmit AND NOT `minLength` ON THE INPUT. This is the same finding
 * AuthGate.tsx already carries, on the surviving second copy of the same form. There is ONE
 * password field here and all three modes share it, so a `minLength` attribute applied to Log In
 * as well — and a login form has no business enforcing a password policy. The credential either
 * matches what is stored or it does not; a client-side minimum only locks out accounts whose
 * password predates the rule, which is exactly what happened to a real account on this site (a
 * five-character password that had been working stopped being accepted).
 *
 * Worse, `minLength` fails SILENTLY as far as this component is concerned: the browser blocks the
 * submit, handleSubmit never runs, no error state is ever set, and all the reader gets is a native
 * bubble that fades in a few seconds. That is why it went unnoticed here long after the identical
 * bug was fixed in AuthGate. Enforcing it below means the rule applies to signup only, and that
 * failing it produces a message that stays on screen. */
const MIN_NEW_PASSWORD_LENGTH = 6;

export default function AuthButton({
  session,
  openProfileNonce,
  onOpenReadingPlans,
  onOpenMyProfile,
  profileHeaderLink,
  onOpenSettings,
  profileVersion,
  reportSurface,
}: AuthButtonProps) {
  const [open, setOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("menu");
  // The entry point to the Admin Console (My Profile used to have a second; it was removed). Same
  // gate, same hook, same component — nothing about access is decided here. useIsAdmin only answers "should this
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
      onOpenMyProfile();
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
      // maybeSingle(), not single(): a row this account cannot read comes back data:null AND an
      // error, so a dropped request or an RLS refusal was indistinguishable from "no display name"
      // and reverted the label to the raw email. Only a real answer changes it now.
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return;
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
        // Checked before the display-name lookup so the reader gets the cheapest failure first, and
        // before signUp so a password Supabase would reject anyway never costs a round trip. Same
        // order, and the same reasoning, as AuthGate's copy.
        if (password.length < MIN_NEW_PASSWORD_LENGTH) {
          setError(`That password is too short — use at least ${MIN_NEW_PASSWORD_LENGTH} characters.`);
          return;
        }
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
    // Guests have no profile page, so theirs is never a link.
    const linkHeader = profileHeaderLink && !session.user.is_anonymous;
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
          <div className={`auth-dropdown${linkHeader ? " auth-dropdown-account" : ""}`}>
            {linkHeader ? (
              <button
                type="button"
                className="auth-identity auth-identity-link"
                aria-label={`Open My Profile (${label})`}
                onClick={() => {
                  setOpen(false);
                  onOpenMyProfile();
                }}
              >
                <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
                  {label.charAt(0).toUpperCase()}
                </span>
                <span className="auth-identity-text">
                  <span className="auth-current-user">{label}</span>
                  {session.user.email && savedDisplayName && (
                    <span className="auth-guest-note">{session.user.email}</span>
                  )}
                </span>
                <Chevron open={false} size={18} />
              </button>
            ) : (
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
            )}
            <div className="auth-settings-divider" />
            {/* Everyone signed in. A real account gets the full-screen Settings view; a guest gets the
                same controls inside this dropdown. */}
            <button
              type="button"
              className="auth-menu-item"
              onClick={() => {
                if (session.user.is_anonymous) {
                  setMenuView("settings");
                  return;
                }
                setOpen(false);
                onOpenSettings();
              }}
            >
              <Icon name="settings" inline /> Settings
            </button>
            {/* Reports lives inside the Admin Console now (Reports tab, same unread badge). This row
                remains ONLY for an advisor who is not an admin: they hold the reports tier but have no
                Admin Console to find it in, and removing the row would strand them. */}
            {canSeeReports && !isAdmin && (
              <button type="button" className="auth-menu-item" onClick={() => setMenuView("reports")}>
                <Icon name="flag" inline /> Reports
                {untriaged > 0 && <span className="panel-menu-item-badge">{untriaged}</span>}
              </button>
            )}
            {isAdmin && (
              <button type="button" className="auth-menu-item" onClick={() => setMenuView("admin")}>
                <Icon name="shield" inline /> Admin Console
                {untriaged > 0 && <span className="panel-menu-item-badge">{untriaged}</span>}
              </button>
            )}
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
            {/* App Store Review Guideline 1.2 asks for published contact information and a visible
                account for how reporting and blocking work. This is where a reviewer — and a reader
                who has just been harassed — is meant to find both, two taps from anywhere in the
                app. It stays for guests too: the sheet reads fine without an account, and the
                contact address is the part a guest is most likely to need. */}
            {/* Robbie, 2026-11-15: no friends interacting, so no Safety & Contact page. Hidden behind
                SOCIAL_CONNECTIONS_ENABLED (the sheet is mostly about blocking people and harassment);
                flip that constant and this row and the sheet below return. */}
            {SOCIAL_CONNECTIONS_ENABLED && (
              <button type="button" className="auth-menu-item" onClick={() => setMenuView("safety")}>
                <Icon name="shield" inline /> Safety &amp; Contact
              </button>
            )}
            <button type="button" className="auth-menu-item auth-signout" onClick={handleSignOut}>
              Log Out
            </button>
            {/* The MOBILE home for Capstone Bible's own accounts. On desktop they sit in the header
                itself, immediately left of this menu's trigger (App.tsx, .header-social); this copy
                is hidden there by CSS so they are never on screen twice.
                WHY HERE ON A PHONE. The mobile header has room for logo + search + avatar and
                nothing else, and the alternatives all cost reading height — the one thing several
                changes this week were spent reclaiming. A footer row in the menu the reader opens
                deliberately costs none of it, is reached from the same top-right control as the
                desktop placement, and sits with the app's other "about your account, not about the
                content" entries. Muted, below Log Out, deliberately last: a footnote. */}
            <SocialLinks className="auth-social" />
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
              <AdminConsole reports={reportsRole && canSeeReports ? { role: reportsRole, viewerId: session.user.id, untriaged } : undefined} />
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
        {open && SOCIAL_CONNECTIONS_ENABLED && menuView === "safety" && <SafetySheet onClose={() => setMenuView("menu")} />}
        {open && menuView === "reports" && canSeeReports && reportsRole && (
          <ReportsDashboard role={reportsRole} viewerId={session.user.id} onClose={() => setMenuView("menu")} />
        )}
        {open && menuView === "settings" && (
          <div className="auth-dropdown">
            <button type="button" className="auth-back-link" onClick={() => setMenuView("menu")}>
              ← Back
            </button>
            <AccountSettingsBody userId={session.user.is_anonymous ? null : session.user.id} />
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
          <NavBarControl />
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
                  /* No minLength — see MIN_NEW_PASSWORD_LENGTH at the top of this file. One field
                     serves Log In and Sign Up, and a length rule on Log In locks out legacy
                     passwords with no error anyone can see. */
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

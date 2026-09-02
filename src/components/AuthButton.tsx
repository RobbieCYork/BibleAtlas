import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, setRememberMe, type Profile } from "../lib/supabase";
import { useTextSize } from "../lib/textSize";
import { useTheme } from "../lib/theme";
import { MIN_VISIBLE_TABS, MOBILE_TAB_META, MOBILE_TAB_ORDER, LOCKED_TAB, useMobileTabs } from "../lib/mobileTabs";
import AdminConsole from "./AdminConsole";
import { useIsAdmin } from "../lib/adminApi";

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
          ☀️ Light
        </button>
        <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
          🌙 Dark
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

type MenuView = "menu" | "settings";

export default function AuthButton({ session, openProfileNonce, onOpenReadingPlans, onOpenMyProfile, profileVersion }: AuthButtonProps) {
  const [open, setOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("menu");

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

  const handleGuest = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      setRememberMe(true);
      const { error: err } = await supabase.auth.signInAnonymously();
      if (err) throw err;
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't continue as guest.");
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
            {session.user.is_anonymous ? "👤" : label.charAt(0).toUpperCase()}
          </span>
        </button>
        {open && menuView === "menu" && (
          <div className="auth-dropdown">
            <div className="auth-identity">
              <span className="auth-avatar auth-avatar-lg" aria-hidden="true">
                {session.user.is_anonymous ? "👤" : label.charAt(0).toUpperCase()}
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
                👤 My Profile
              </button>
            )}
            {isAdmin && (
              <button type="button" className="auth-menu-item" onClick={() => setMenuView("admin")}>
                🛡️ Admin Console
              </button>
            )}
            <button type="button" className="auth-menu-item" onClick={() => setMenuView("settings")}>
              ⚙️ Settings
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
                🗓️ Reading Plans
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
          👤
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
                  {showPassword ? "🙈" : "👁️"}
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
          <div className="auth-guest-divider">or</div>
          <button type="button" className="auth-guest-button" onClick={handleGuest} disabled={loading}>
            Continue as Guest
          </button>
        </div>
      )}
    </div>
  );
}

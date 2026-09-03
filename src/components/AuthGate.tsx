import { useState } from "react";
import { supabase, setRememberMe } from "../lib/supabase";
import Icon from "./Icon";
import "./AuthGate.css";

type Mode = "login" | "signup" | "reset";

/** The front door of the entire app. Rendered by App.tsx above every panel, takeover, header and
 * tab bar whenever there is no *real* signed-in session — no session at all, or one that's merely
 * anonymous (Supabase's "Continue as Guest", now retired as an entry path but still sitting in the
 * live database for ~30 existing sessions we were told not to touch). Nothing behind this gate
 * mounts until sign-in or sign-up succeeds and hands back a non-anonymous session.
 *
 * Two deliberate exceptions live in App.tsx, not here: the password-recovery link flow
 * (ResetPasswordGate) and a first-time display name backfill (DisplayNameGate) both require a real
 * session to already exist, which by definition can't happen while this gate is showing — so there
 * is no ordering conflict to resolve on this end.
 *
 * IMPORTANT — what this gate is and isn't: it stops casual browsing and captures signups. It does
 * NOT make Scripture, articles, map or timeline content private — all of that ships in the public
 * JS bundle regardless of who's signed in, same as before this gate existed. The thing actually
 * protected by a real boundary is user data (notes, highlights, posts, profiles), via row-level
 * security in the database — signing up doesn't change that boundary, it was already there. */
export default function AuthGate() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMeChecked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetStatus = () => {
    setError(null);
    setInfo(null);
  };

  const friendlyError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : "";
    const lower = msg.toLowerCase();
    if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already"))
      return "That email already has an account — try logging in instead, or use “Forgot password?”";
    if (lower.includes("invalid login credentials"))
      return "Email or password didn't match — check both and try again.";
    if (lower.includes("email not confirmed"))
      return "Almost there — check your email for a confirmation link before logging in.";
    if (lower.includes("password") && (lower.includes("least") || lower.includes("short") || lower.includes("weak")))
      return "That password's too short — use at least 6 characters.";
    if (lower.includes("rate limit"))
      return "Too many attempts — wait a minute and try again.";
    if (lower.includes("failed to fetch") || lower.includes("network"))
      return "Couldn't reach the server — check your connection and try again.";
    return msg || "Something went wrong — try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();
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
      } else {
        const trimmedName = displayName.trim();
        const { data: available } = await supabase.rpc("is_display_name_available", { p_name: trimmedName });
        if (available === false) {
          setError("That display name is taken — try another.");
          setLoading(false);
          return;
        }
        setRememberMe(true);
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: trimmedName } },
        });
        if (err) throw err;
        // Supabase deliberately doesn't return an error for signing up with an email that's already
        // registered and confirmed — it answers with a look-alike "success" payload instead, to
        // avoid letting this form be used to test which emails have accounts. The tell is an empty
        // `identities` array (a brand-new signup always has exactly one, for the email provider).
        if (data.user && data.user.identities?.length === 0) {
          setError("That email already has an account — try logging in instead, or use “Forgot password?”");
          setLoading(false);
          return;
        }
        setInfo("Account created! Check your email to confirm, then log in.");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gate">
      <div className="auth-gate-backdrop" aria-hidden="true" />
      <div className="auth-gate-scrim" aria-hidden="true" />
      <div className="auth-gate-content">
        <div className="auth-gate-intro">
          <div className="auth-gate-brand">
            <img src="/favicon.svg" className="auth-gate-logo" alt="" aria-hidden="true" />
            <div className="auth-gate-brand-text">
              <h1>Capstone Bible</h1>
              <p className="auth-gate-tagline">God&rsquo;s Word. Every day.</p>
            </div>
          </div>
          <p className="auth-gate-pitch">
            Read Scripture alongside the places, people and history behind it — an interactive map, a
            timeline, articles, and games — then keep notes, highlights and reading plans that sync
            everywhere you sign in.
          </p>
        </div>

        <div className="auth-gate-card">
          <div className="auth-gate-mode-toggle" role="tablist" aria-label="Sign in or sign up">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                resetStatus();
              }}
            >
              Sign Up
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                resetStatus();
              }}
            >
              Log In
            </button>
          </div>

          {mode === "signup" && <p className="auth-gate-free">Free to join — just a name and email.</p>}
          {mode === "reset" && (
            <button
              type="button"
              className="auth-gate-back"
              onClick={() => {
                setMode("login");
                resetStatus();
              }}
            >
              ← Back to Log In
            </button>
          )}

          <form className="auth-gate-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
                autoFocus
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus={mode !== "signup"}
            />
            {mode !== "reset" && (
              <div className="auth-gate-password-field">
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
                  className="auth-gate-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </div>
            )}
            {mode === "login" && (
              <div className="auth-gate-form-extras">
                <label className="auth-gate-remember-me">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMeChecked(e.target.checked)} />
                  Remember me
                </label>
                <button
                  type="button"
                  className="auth-gate-forgot-link"
                  onClick={() => {
                    setMode("reset");
                    resetStatus();
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button type="submit" className="auth-gate-submit" disabled={loading}>
              {loading ? "…" : mode === "login" ? "Log In" : mode === "signup" ? "Create Free Account" : "Send Reset Link"}
            </button>
          </form>
          {error && (
            <p className="auth-gate-status auth-gate-error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="auth-gate-status" role="status">
              {info}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase, setRememberMe } from "../lib/supabase";
import Icon from "./Icon";
import SocialLinks from "./SocialLinks";
import "./AuthGate.css";

type Mode = "login" | "signup" | "reset";

/** Seconds a "Resend confirmation email" control stays disabled after firing — long enough that a
 * few impatient clicks in a row can't burn through Supabase's (very small) hourly email quota by
 * themselves. Doesn't prevent the quota being exhausted by other traffic, only by this button. */
const RESEND_COOLDOWN_SECONDS = 60;

/** Shortest password Supabase will accept for a *new* account, mirrored here so signup can say so in
 * the card instead of making the round trip. Matches ResetPasswordGate's own MIN_PASSWORD_LENGTH and
 * the project's auth setting; if that setting is ever raised, Supabase's own message still surfaces
 * through friendlyError() below, so this being stale degrades to a slower answer, not a wrong one.
 *
 * WHY THIS IS A CHECK IN handleSubmit AND NOT `minLength` ON THE INPUT. There is one password field
 * on this card and both tabs share it, so a `minLength` attribute applies to Log In as well — and a
 * login form has no business enforcing a password policy. The credential either matches what is
 * stored or it does not; a client-side minimum only locks out accounts whose password predates the
 * rule, which is exactly what happened to a real account here (a five-character password that had
 * been working stopped being accepted). Worse, `minLength` fails *silently* as far as this component
 * is concerned: the browser blocks the submit, handleSubmit never runs, no error state is ever set,
 * and all the reader gets is a native bubble that fades in a few seconds. Enforcing it here instead
 * means the rule applies to signup only, and that failing it produces a message that stays on screen. */
const MIN_NEW_PASSWORD_LENGTH = 6;

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
  // Opens on Log In, not Sign Up. Nearly everyone who reaches this gate already has an account —
  // signed out, or back on a new device — and defaulting to signup made all of them click across
  // before they could type. Sign Up is one tap away in the toggle below and otherwise unchanged.
  // Nothing deep-links in expecting a particular tab: this component takes no props, and the only
  // query params the app reads (`invite`, `joinGroup`, recovery `code`) either stash to
  // localStorage and apply after *any* successful auth, or bypass this gate entirely.
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMeChecked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Set right after a successful signup — while this holds an address, the card shows the
  // "check your email" screen instead of the login/signup form. Cleared by "Back to Log In".
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  // Set when a *login* attempt bounces off "email not confirmed" — offers the same resend action
  // without leaving login mode, for someone who signed up earlier and is coming back unconfirmed.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Ticks the resend cooldown down to zero once a second.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const resetStatus = () => {
    setError(null);
    setInfo(null);
  };

  const handleResend = async (target: string) => {
    resetStatus();
    setResending(true);
    try {
      const { error: err } = await supabase.auth.resend({ type: "signup", email: target });
      if (err) throw err;
      setInfo("Confirmation email sent again — check your inbox (and your spam or junk folder).");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setResending(false);
    }
  };

  /** HTTP status carried by supabase-js's auth errors (AuthApiError and AuthRetryableFetchError both
   * have one; AuthRetryableFetchError uses 0 for a fetch that never got a response at all). */
  const errorStatus = (err: unknown): number | undefined => {
    const status = (err as { status?: unknown } | null)?.status;
    return typeof status === "number" ? status : undefined;
  };

  const friendlyError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : "";
    const status = errorStatus(err);
    // supabase-js throws away the response body for every 5xx before anyone can read it: handleError()
    // in @supabase/auth-js short-circuits on status 500-504/520-530 and builds an
    // AuthRetryableFetchError from the *Response object* rather than the JSON inside it. Its message
    // helper then falls through to JSON.stringify(response) — which for a Response is "{}". So the
    // literal two characters "{}" is what a server-side auth failure hands this function, and until
    // now it was passed straight through to the card as the error text. A reader who has just had a
    // signup fail sees "{}" under the button, reads it as nothing at all, and reasonably concludes
    // the click did nothing — which is exactly what happened on the live site when Resend rejected
    // the SMTP credentials, GoTrue answered /signup with a 500, and the half-made account was rolled
    // back. Treat that placeholder as no message, and answer from the status instead.
    const msg = raw.trim() === "{}" ? "" : raw;
    const lower = msg.toLowerCase();
    if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already"))
      return "That email already has an account — try logging in instead, or use “Forgot password?”";
    if (lower.includes("invalid login credentials"))
      return "Email or password didn't match — check both and try again.";
    if (lower.includes("email not confirmed"))
      return "Almost there — check your email for a confirmation link before logging in.";
    if (lower.includes("password") && (lower.includes("least") || lower.includes("short") || lower.includes("weak")))
      return `That password's too short — use at least ${MIN_NEW_PASSWORD_LENGTH} characters.`;
    if (lower.includes("rate limit"))
      return "Too many attempts — wait a minute and try again.";
    // Status 0 is supabase-js's "the fetch itself failed" — no response, so genuinely the reader's
    // connection (or ours being unreachable), not a server that answered with a fault.
    if (status === 0 || lower.includes("failed to fetch") || lower.includes("network"))
      return "Couldn't reach the server — check your connection and try again.";
    if (status !== undefined && status >= 500) {
      // Deliberately does NOT promise the account/email was or wasn't created: a 500 can land either
      // side of that line, and telling someone "nothing was saved" when something was is worse than
      // telling them less. What it does promise is true of every 5xx — the fault is ours, and what
      // they typed is not the problem.
      console.error("[auth-gate] server error, body unavailable (supabase-js discards 5xx bodies):", {
        status,
        name: err instanceof Error ? err.name : typeof err,
        rawMessage: raw,
      });
      return "Something went wrong on our end and the request didn't complete — this isn't a problem with what you typed. Wait a minute and try again; if it keeps happening, email admin@capstonebible.com.";
    }
    if (msg) return msg;
    console.error("[auth-gate] unhandled auth error, showing the generic message instead:", err);
    return "Something went wrong — try again.";
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
        if (err) {
          // A returning user who signed up, never clicked the link, and is now trying to log
          // in — give them a way forward right here instead of just a dead-end error.
          if (err.message.toLowerCase().includes("email not confirmed")) setUnconfirmedEmail(email);
          throw err;
        }
      } else {
        // Checked before the display-name lookup so the reader gets the cheapest failure first, and
        // before signUp so a password Supabase would reject anyway never costs a round trip.
        if (password.length < MIN_NEW_PASSWORD_LENGTH) {
          setError(`That password is too short — use at least ${MIN_NEW_PASSWORD_LENGTH} characters.`);
          return;
        }
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
        setPendingEmail(email);
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
          {pendingEmail ? (
            <div className="auth-gate-check-email">
              {/* Says the account was created *and* names the address, because those are the two
                * things a new reader can't otherwise tell: whether the click did anything at all,
                * and whether the address they typed is the one the mail is going to. A typo here is
                * the other reason a confirmation email never arrives, and it can only be caught by
                * showing it back to them. */}
              <h2>Account created — check your email</h2>
              <p>
                Your account is set up, and a confirmation email is on its way to{" "}
                <strong>{pendingEmail}</strong>. Click the link in it to activate the account, then come
                back here and log in.
              </p>
              <p className="auth-gate-spam-note">
                Don&rsquo;t see it after a few minutes? Check your spam or junk folder — first-time mail
                from a new sender often lands there.
              </p>
              <button
                type="button"
                className="auth-gate-submit"
                disabled={resending || resendCooldown > 0}
                onClick={() => handleResend(pendingEmail)}
              >
                {resending ? "Sending…" : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend confirmation email"}
              </button>
              <button
                type="button"
                className="auth-gate-back auth-gate-check-email-back"
                onClick={() => {
                  setPendingEmail(null);
                  setMode("login");
                  resetStatus();
                }}
              >
                ← Back to Log In
              </button>
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
          ) : (
            <>
              <div className="auth-gate-mode-toggle" role="tablist" aria-label="Sign in or sign up">
                {/* Log In sits first, Sign Up second, so reading order matches the tab this card
                  * opens on. Safe to reorder: `mode` is the only source of truth for which tab is
                  * selected — nothing here or in AuthGate.css derives it from position or index
                  * (the toggle is a plain flex row with no :nth-child rules), and the shared
                  * password input below is a sibling of this toggle, not a child, so moving these
                  * two buttons doesn't remount it or disturb its mode-driven `autocomplete`. */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  className={mode === "login" ? "active" : ""}
                  onClick={() => {
                    setMode("login");
                    setUnconfirmedEmail(null);
                    resetStatus();
                  }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  className={mode === "signup" ? "active" : ""}
                  onClick={() => {
                    setMode("signup");
                    setUnconfirmedEmail(null);
                    resetStatus();
                  }}
                >
                  Sign Up
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
                    name="name"
                    placeholder="Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    autoComplete="name"
                    autoFocus
                  />
                )}
                {/* `username`, not `email`. Both autofill an address, but only `username` tells a
                 * password manager this is the *account identifier* half of a credential pair, so
                 * it has something to file the password under and something to fill next to it
                 * later. Chrome and iOS Safari both want it on sign-in and sign-up alike. The
                 * `name` attributes on these three fields are the same story from the other end:
                 * Safari's heuristics key off them, and a form of anonymous inputs is a form it
                 * can decline to offer to save. Nothing here stores a password — the browser's
                 * own manager does that, which is the only place it belongs. */}
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (unconfirmedEmail) setUnconfirmedEmail(null);
                  }}
                  required
                  autoComplete="username"
                  autoFocus={mode !== "signup"}
                />
                {mode !== "reset" && (
                  <div className="auth-gate-password-field">
                    {/* Already mode-aware, and left that way deliberately: React writes the new
                     * `autocomplete` onto this same DOM node when the tab flips, so the field
                     * never sits there advertising `new-password` on the Log In tab. Not keyed to
                     * `mode` on purpose — remounting it would make managers treat each tab switch
                     * as a brand-new form.
                     *
                     * Deliberately carries no `minLength`: this one node serves both tabs, so the
                     * attribute enforced a signup rule on Log In and locked out an existing shorter
                     * password. The signup minimum is MIN_NEW_PASSWORD_LENGTH, applied in
                     * handleSubmit — see the constant at the top of this file. */}
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMeChecked(e.target.checked)}
                      />
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
              {mode === "login" && unconfirmedEmail && (
                <div className="auth-gate-unconfirmed">
                  <p>Haven&rsquo;t gotten the confirmation email, or lost it?</p>
                  <button
                    type="button"
                    className="auth-gate-resend-link"
                    disabled={resending || resendCooldown > 0}
                    onClick={() => handleResend(unconfirmedEmail)}
                  >
                    {resending
                      ? "Sending…"
                      : resendCooldown > 0
                        ? `Resend available in ${resendCooldown}s`
                        : "Resend confirmation email"}
                  </button>
                </div>
              )}
              {info && (
                <p className="auth-gate-status" role="status">
                  {info}
                </p>
              )}
            </>
          )}
        </div>

        {/* Under the card, not above it. Every social post drives a stranger to this screen, and a
          * brand with no visible social presence on its own front door reads thinner than it is —
          * but the card is what they came to use, so the marks go below the fold of attention
          * rather than between the pitch and the form. Placement matters mechanically too: this
          * column is centred (see .auth-gate-content), so a row added *below* the card lifts the
          * card slightly rather than pushing it down, which is the opposite of what a row above it
          * would have done to the phone layout that was just tightened. */}
        <SocialLinks className="auth-gate-social" />
      </div>
    </div>
  );
}

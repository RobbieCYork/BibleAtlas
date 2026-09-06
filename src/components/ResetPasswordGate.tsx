import { useState } from "react";
import { isAuthWeakPasswordError, type AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import Icon from "./Icon";

interface ResetPasswordGateProps {
  onDone: () => void;
}

/** The minimum this project's Supabase actually enforces, measured rather than assumed: a
 * `PUT /auth/v1/user` carrying a five-character password answers 422 `weak_password`,
 * `"Password should be at least 6 characters."`, `reasons: ["length"]` (GoTrue v2.196.0, checked
 * against the live project). The inputs and the pre-flight check below use it so the reader is told
 * before a round trip, and humanizePasswordError() names it again for the server's own refusal —
 * which is what a minimum raised in the Supabase dashboard would come back as, with no deploy here. */
const MIN_PASSWORD_LENGTH = 6;

/** Turns what `supabase.auth.updateUser({ password })` can actually come back with into a sentence
 * the reader can act on. The same job humanizeReportError() does for sql/025, kept local because
 * these are GoTrue error codes rather than the prefixed errors that migration raises.
 *
 * THIS IS THE POINT OF THE FIX, so do not collapse it back into one message. This card used to
 * answer every failure with "Couldn't update your password — try again", behind a fixed,
 * full-screen overlay that had no other control on it. For the two likeliest failures that advice
 * cannot work: retyping the password you already have returns `same_password` again, and retyping a
 * five-character one returns `weak_password` again. The reader does the only thing the screen told
 * them to do, gets the same sentence back, and has nowhere else to click.
 *
 * Every branch ends in a written sentence, so a raw GoTrue string can never reach the card; the
 * unrecognised ones go to the console instead, where a developer can find them. */
function humanizePasswordError(err: AuthError): string {
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();

  // 422 same_password. GoTrue refuses a new password equal to the current one, and this is the
  // single most likely way to fail here: a reader who clicked the reset link because they thought
  // they'd forgotten, then remembered. "Try again" sends them round the same loop forever, so name
  // what happened — and point out that keeping the old password is a legitimate answer with an exit.
  if (code === "same_password" || msg.includes("different from the old password")) {
    return "That's the password you already have. Choose a different one — or, if you'd rather keep it, use “Sign out instead” below and log in with it as usual.";
  }

  // 422 weak_password, whose `reasons` say which rule it broke. The form checks length before
  // sending, so reaching this branch for length means the project's minimum has been raised above
  // MIN_PASSWORD_LENGTH in the dashboard; the sentence still tells the reader something they can do.
  const weakReasons = isAuthWeakPasswordError(err) ? err.reasons : [];
  if (code === "weak_password" || weakReasons.length > 0 || msg.includes("password should be at least")) {
    if (weakReasons.includes("pwned")) {
      return "That password has appeared in a known data breach, so it can't be used here. Pick one you haven't used on another site.";
    }
    if (weakReasons.includes("characters")) {
      return "That password needs more variety — mix in numbers or punctuation as well as letters.";
    }
    return `That password is too short — use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  // The recovery session itself is gone: the link was already used, it sat in an inbox past its
  // expiry, or this tab was left open long enough for the token to lapse. Nothing typed into this
  // form can succeed, so send them for a fresh email rather than telling them to try again.
  if (
    code === "session_not_found" ||
    code === "session_expired" ||
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "bad_jwt" ||
    err.status === 401 ||
    msg.includes("auth session missing") ||
    msg.includes("jwt expired")
  ) {
    return "This password-reset link has expired. Use “Sign out instead” below, then “Forgot password?” on the login screen to send yourself a fresh one.";
  }

  // GoTrue can be set to demand a recent re-authentication before a password change. It is off for
  // this project today, but it is one dashboard toggle and no deploy away, and its raw message
  // ("A reauthentication is needed to change the password") reads like a dead end.
  if (code === "reauthentication_needed" || code === "reauthentication_not_valid" || code === "reauth_nonce_missing") {
    return "For security, this needs a newer reset link before the password can change. Use “Sign out instead” below, then “Forgot password?” on the login screen.";
  }

  // 429. Distinguish it from a bad password, because it is not one — the password they chose may be
  // perfectly fine, and retyping it immediately only extends the block.
  if (code.startsWith("over_") || err.status === 429 || msg.includes("rate limit")) {
    return "Too many attempts in a short time. Wait a minute and try again — there's nothing wrong with the password you chose.";
  }

  // The auth-side equivalent of the RLS refusal humanizeSaveError() covers in DisplayNameGate: the
  // server understood and said no. Never show the reader "User is banned".
  if (code === "user_banned" || code === "not_admin" || err.status === 403) {
    return "Your account isn't allowed to change its password. Email admin@capstonebible.com and we'll sort it out.";
  }

  // A dead network arrives as AuthRetryableFetchError: status 0, no code at all. This is the branch
  // the escape below exists for, so say that the escape works from here.
  if (!err.status || msg.includes("failed to fetch") || msg.includes("network")) {
    return "Couldn't reach the server — check your connection and try again. “Sign out instead” below still works offline if you need out of this screen.";
  }

  // THE LAST RESORT. Anything reaching here is a GoTrue error this file hasn't learned yet; showing
  // its own words would read as a crash and help nobody, so it goes to the console — where a
  // developer chasing a bug report can find it — and the reader gets a route out, not "try again".
  console.error("[reset-password] unhandled auth error, showing the generic message instead:", {
    code: err.code,
    status: err.status,
    message: err.message,
  });
  return "Couldn't update your password. Try once more, and if it keeps failing use “Sign out instead” below and send yourself a new reset link from the login screen.";
}

/** Shown when Supabase's password-reset email link lands back on the app — that link already signs
 * the browser in (see the PKCE `?code=` exchange in App.tsx), so this just blocks the app until a new
 * password is actually set, rather than silently dropping the visitor into their old session.
 *
 * KEEP THE GATE, KEEP THE ESCAPE. The blocking is deliberate and stays: someone who arrived by
 * clicking a reset link should be led to finish setting a password, and it must not be dismissible
 * by a stray click or an Escape key that leaves them signed in on their old credentials.
 *
 * But this overlay is `position: fixed`, covers the viewport, and until now had no close, no back
 * and no sign out — its only exit was updateUser() succeeding. A reader whose new password was
 * refused (the same as their old one, too short, or the network gone) had one button, one message
 * that said "try again", and no way off the screen except closing the tab. An authenticated reader
 * always gets a way out, so the exit here is a deliberate, quiet sign-out rather than a dismissal:
 * it ends the recovery session instead of waving it through, and lands them on AuthGate, which is
 * where "Forgot password?" lives. */
export default function ResetPasswordGate({ onDone }: ResetPasswordGateProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`That password is too short — use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match — retype them and this will go through.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      setError(humanizePasswordError(err));
      return;
    }
    onDone();
  };

  // No fallback needed for a failed request: supabase-js clears the local session before returning
  // the error on anything that isn't a 401/403/404 (see GoTrueClient._signOut), and clears it on
  // those too, so SIGNED_OUT fires and App swaps this overlay for AuthGate even with the network
  // down. That is what makes it a real exit rather than one more button that can fail. App.tsx also
  // clears its passwordRecovery flag on SIGNED_OUT, so logging back in afterwards does not drop the
  // reader straight back onto this screen.
  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  return (
    <div className="display-name-gate-overlay">
      <div className="display-name-gate-card">
        <h3>Set a new password</h3>
        <p>
          Choose a new password for your account — at least {MIN_PASSWORD_LENGTH} characters, and not the one you have
          now.
        </p>
        {/* Not the bare `.display-name-gate-card form` row DisplayNameGate uses: this one has two
            password fields AND the submit button in it, and in a row at 375px that left each field
            59.4px wide (measured in Chrome 152) — too narrow to read what you typed, with the
            show/hide eye toggle crammed inside it. See the stacking rule in App.css. */}
        <form className="reset-password-form" onSubmit={handleSubmit}>
          <div className="auth-password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              autoFocus
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
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
          <div className="auth-password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm Password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
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
          <button type="submit" disabled={saving || signingOut || !password || !confirm}>
            {saving ? "…" : "Update Password"}
          </button>
        </form>
        {error && <p className="auth-status auth-error">{error}</p>}
        <button
          type="button"
          className="display-name-gate-escape"
          onClick={handleSignOut}
          disabled={saving || signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out instead"}
        </button>
      </div>
    </div>
  );
}

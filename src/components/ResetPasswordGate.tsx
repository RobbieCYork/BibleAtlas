import { useState } from "react";
import { supabase } from "../lib/supabase";
import Icon from "./Icon";

interface ResetPasswordGateProps {
  onDone: () => void;
}

/** Shown when Supabase's password-reset email link lands back on the app — that link already signs
 * the browser in (see the PKCE `?code=` exchange in App.tsx), so this just blocks the app until a new
 * password is actually set, rather than silently dropping the visitor into their old session. */
export default function ResetPasswordGate({ onDone }: ResetPasswordGateProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      setError("Couldn't update your password — try again.");
      return;
    }
    onDone();
  };

  return (
    <div className="display-name-gate-overlay">
      <div className="display-name-gate-card">
        <h3>Set a new password</h3>
        <p>Choose a new password for your account.</p>
        <form onSubmit={handleSubmit}>
          <div className="auth-password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              autoFocus
              required
              minLength={6}
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
              minLength={6}
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
          <button type="submit" disabled={saving || !password || !confirm}>
            {saving ? "…" : "Update Password"}
          </button>
        </form>
        {error && <p className="auth-status auth-error">{error}</p>}
      </div>
    </div>
  );
}

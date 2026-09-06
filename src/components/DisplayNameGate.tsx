import { useState } from "react";
import { supabase } from "../lib/supabase";

interface DisplayNameGateProps {
  userId: string;
  onSaved: () => void;
}

/** Turns what the profiles update can actually come back with into a sentence the reader can act
 * on. The same job humanizeReportError() does for sql/025, kept local because these are ordinary
 * PostgREST/Postgres failures rather than the prefixed errors that migration raises.
 *
 * The `raw` fallthrough that reportsApi.ts guards against does not exist here — every branch ends
 * in a written sentence, so a Postgres string can never reach the card. */
function humanizeSaveError(err: { code?: string; message?: string }): string {
  // 23505 is the unique index on profiles.display_name. Signup checks availability up front via
  // is_display_name_available(); this prompt does not, so for these accounts the constraint IS the
  // check and this is the branch a reader most often sees.
  if (err.code === "23505") return "That name is taken — try another.";
  // PostgREST hands an RLS policy's own text through verbatim. It cannot be reached by a reader
  // updating their own row under the current policy, but a policy change is one dashboard edit and
  // no deploy away, and "new row violates row-level security policy" is never an acceptable thing
  // to show someone.
  if (err.code === "42501" || (err.message ?? "").includes("row-level security policy")) {
    return "Your account isn't allowed to change that name. Sign out and back in, and if it keeps happening email admin@capstonebible.com.";
  }
  // supabase-js surfaces a dead network as a TypeError from fetch with no Postgres code at all.
  // This is the branch behind the Sign out escape below: offline, nothing here will ever succeed.
  if (!err.code) return "Couldn't reach the server — check your connection and try again.";
  return "Couldn't save — try again.";
}

/** Blocks the app for real accounts created before display names existed, until they set one — a
 * one-time prompt, not shown again once profiles.display_name is set. New signups never see this;
 * they set their name in the signup form itself.
 *
 * ON THE ZERO-ROW UPDATE, because it reads like a bug and is deliberate. A PATCH that matches no
 * row answers 204 with no error (verified against the live project), so if this account somehow has
 * no profiles row at all, `err` is null, onSaved() fires and the overlay dismisses without having
 * saved anything — the prompt simply returns next session. That is the RIGHT failure: this gate is
 * a one-time backfill, not a security boundary, and a reader whose profile row is missing should
 * still get their Bible. Do not "fix" it into a blocking error. It was once reported the other way
 * round — as a lockout for an account with no profile row — and it is not one.
 *
 * The escape below is for the case that genuinely would trap someone: a save that keeps failing
 * (offline, or a policy refusal) behind a fixed, full-screen overlay with nothing else on it. An
 * authenticated reader always gets a way out. */
export default function DisplayNameGate({ userId, onSaved }: DisplayNameGateProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);
    setSaving(false);
    if (err) {
      setError(humanizeSaveError(err));
      return;
    }
    onSaved();
  };

  // No fallback needed for a failed request: supabase-js clears the local session before returning
  // the error on anything that isn't a 401/403/404 (see GoTrueClient._signOut), so this lands on
  // AuthGate via onAuthStateChange even with the network down. That is what makes it a real exit
  // rather than one more button that can fail.
  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  return (
    <div className="display-name-gate-overlay">
      <div className="display-name-gate-card">
        <h3>What should friends call you?</h3>
        <p>Pick a display name — this is what shows up in Friends and Messages instead of your email.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display Name"
            autoFocus
            required
          />
          <button type="submit" disabled={saving || signingOut || !name.trim()}>
            {saving ? "…" : "Continue"}
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

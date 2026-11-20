import { useEffect, useRef, useState, type FormEvent } from "react";
import { ADD_USER_LIMITS, AddUserError, addUserByInvite, addUserInputProblem } from "../lib/adminApi";
import { useFeatureAdmin } from "../lib/features";

/**
 * "Add user" on the Admin Console's Users tab.
 *
 * Sends Supabase's invitation email through the admin-add-user Edge Function. There is no password
 * field and there never should be: the person chooses their own from the link. Whether the caller is
 * allowed to do this is decided by the function (is_admin() on the caller's validated token) — this
 * component is only drawn inside the console, which is itself only drawn for admins, but neither of
 * those is the security boundary.
 *
 * TEST VIEW. When the owner has Test view on, this does NOT call the function: it waits a moment and
 * shows a success clearly labelled as simulated. Nothing is sent and no account is created. That lets
 * the flow be rehearsed on the live site without inviting a real address. (Other admin actions —
 * password reset, deleting a post — do not have a Test-view mode; this one does because its effect is
 * an email to a stranger that cannot be taken back.)
 */
export default function AdminAddUser({ onAdded }: { onAdded: (email: string) => void }) {
  const { testView } = useFeatureAdmin();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; simulated: boolean } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !sent) emailRef.current?.focus();
  }, [open, sent]);

  const reset = () => {
    setEmail("");
    setDisplayName("");
    setNote("");
    setError(null);
    setErrorCode(null);
    setSent(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const input = { email, displayName, note };
    const problem = addUserInputProblem(input);
    if (problem) {
      setError(problem);
      setErrorCode(null);
      return;
    }
    setSending(true);
    setError(null);
    setErrorCode(null);
    try {
      if (testView) {
        await new Promise((r) => setTimeout(r, 400));
        setSent({ email: email.trim().toLowerCase(), simulated: true });
      } else {
        const to = await addUserByInvite(input);
        setSent({ email: to, simulated: false });
        onAdded(to);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The invitation couldn't be sent.");
      setErrorCode(err instanceof AddUserError ? err.code : null);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <div className="admin-add-user-bar">
        <button type="button" className="admin-add-user-open" onClick={() => setOpen(true)}>
          + Add user
        </button>
      </div>
    );
  }

  return (
    <div className="admin-confirm admin-add-user" role="region" aria-label="Add user">
      <div className="admin-add-user-head">
        <strong>Add user</strong>
        {testView && <span className="admin-badge admin-badge-muted">Test view</span>}
      </div>

      {sent ? (
        <>
          <p className="admin-add-user-success" role="status">
            {sent.simulated ? (
              <>
                Simulated: an invitation <em>would</em> go to <strong>{sent.email}</strong>. Test view is on, so nothing was
                sent and no account was created.
              </>
            ) : (
              <>
                Invitation sent to <strong>{sent.email}</strong>. They'll choose their own password from the link in the
                email. They're shown in the list below.
              </>
            )}
          </p>
          <div className="admin-confirm-actions">
            <button type="button" onClick={reset}>
              Add another
            </button>
            <button type="button" onClick={close}>
              Done
            </button>
          </div>
        </>
      ) : (
        <form className="admin-add-user-form" onSubmit={(e) => void submit(e)} noValidate>
          <label className="admin-add-user-field">
            <span>Email</span>
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              required
              maxLength={ADD_USER_LIMITS.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label className="admin-add-user-field">
            <span>Display name</span>
            <input
              type="text"
              autoComplete="off"
              required
              maxLength={ADD_USER_LIMITS.displayName}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How their name appears in the app"
            />
          </label>
          <label className="admin-add-user-field">
            <span>
              Note <span className="admin-add-user-optional">(optional, admins only)</span>
            </span>
            <textarea
              rows={2}
              maxLength={ADD_USER_LIMITS.note}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. asked to join after Sunday class"
            />
          </label>
          <p className="admin-note">
            They'll get an email invitation and choose their own password — you never see or set it. The note is kept in
            the admin audit log, not shown to them.
          </p>
          {error && (
            <p className="auth-status auth-error" role="alert">
              {error}
              {errorCode === "exists" && " Search for it in the list below."}
            </p>
          )}
          <div className="admin-confirm-actions">
            <button type="submit" disabled={sending}>
              {sending ? "Sending…" : testView ? "Send invitation (simulated)" : "Send invitation"}
            </button>
            <button type="button" onClick={close} disabled={sending}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

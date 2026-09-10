import { useState } from "react";
import Icon from "./Icon";
import { AccountDeletionError, deleteMyAccount, endSessionAfterDeletion } from "../lib/accountDeletion";
import {
  ACCOUNT_DELETION_CONFIRM_WORD,
  ACCOUNT_DELETION_CONTACT,
  ACCOUNT_DELETION_HEADLINE,
  DELETED_FOR_GOOD,
  KEPT_AND_WHY,
  type DeletionNoticeLine,
} from "../data/accountDeletionNotice";

/**
 * "Delete My Account" — the in-app half of account deletion.
 *
 * ── WHY IT TAKES FOUR DELIBERATE ACTS AND NOT ONE TAP ───────────────────────────────────────────
 * This is the only control in the app that destroys everything a person has written, with no undo
 * and no recovery window. A single button next to "Back Up My Data" is a mis-tap away from that. So
 * the path is: open the section, read what goes, type the word, and confirm a second time on a
 * button that has changed its own label to say what it is about to do. None of those four is
 * skippable and none is a default.
 *
 * The typed word is checked again on the server (see the Edge Function) — this UI is a guard against
 * accident, not the security boundary, and it does not pretend otherwise.
 *
 * ── WHY THE COPY IS NOT WRITTEN HERE ────────────────────────────────────────────────────────────
 * Every line below comes from src/data/accountDeletionNotice.ts, which the public /delete-account
 * page is generated from as well. The person who reads the warning inside the app and the Play
 * reviewer who reads the public page are being told the same thing because it is the same string.
 */

const noticeList = (lines: DeletionNoticeLine[]) => (
  <ul className="delete-account-list">
    {lines.map((line) => (
      <li key={line.label}>
        <b>{line.label}.</b> {line.detail}
      </li>
    ))}
  </ul>
);

type Stage = "closed" | "reading" | "armed" | "deleting" | "deleted";

export default function DeleteAccountControl() {
  const [stage, setStage] = useState<Stage>("closed");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wordMatches = typed.trim().toUpperCase() === ACCOUNT_DELETION_CONFIRM_WORD;

  const reset = () => {
    setStage("closed");
    setTyped("");
    setError(null);
  };

  const handleDelete = async () => {
    setStage("deleting");
    setError(null);
    try {
      await deleteMyAccount(typed);
      setStage("deleted");
    } catch (err) {
      setStage("armed");
      setError(err instanceof AccountDeletionError ? err.message : "Something went wrong. Nothing was deleted.");
    }
  };

  // The end state. The session is still nominally in memory at this point so this panel can be read
  // before it disappears; `endSessionAfterDeletion` clears it and reloads to the signed-out app.
  if (stage === "deleted") {
    return (
      <div className="auth-settings-section auth-settings-section-stacked delete-account-section">
        <span className="auth-settings-label">Account deleted</span>
        <p className="auth-benefits">
          Your account and everything in it have been deleted. There is nothing left to sign in to, and nothing to
          restore. Thank you for the time you spent with Capstone Bible.
        </p>
        <button type="button" className="delete-account-danger" onClick={() => void endSessionAfterDeletion()}>
          Close Capstone Bible
        </button>
      </div>
    );
  }

  return (
    <div className="auth-settings-section auth-settings-section-stacked delete-account-section">
      <span className="auth-settings-label">
        <Icon name="ban" inline /> Delete My Account
      </span>

      {stage === "closed" ? (
        <>
          <p className="auth-benefits">
            Permanently deletes your account and everything in it — profile, notes, highlights, sermon notes, posts,
            messages and files. This cannot be undone. Back up your data first if you want to keep a copy.
          </p>
          <button type="button" onClick={() => setStage("reading")}>
            Delete My Account…
          </button>
        </>
      ) : (
        <>
          <p className="delete-account-headline">{ACCOUNT_DELETION_HEADLINE}</p>

          <h4 className="delete-account-heading">What is deleted</h4>
          {noticeList(DELETED_FOR_GOOD)}

          <h4 className="delete-account-heading">What is not deleted, and why</h4>
          {noticeList(KEPT_AND_WHY)}

          <p className="auth-benefits">
            Prefer to ask a person? Write to {ACCOUNT_DELETION_CONTACT} from the address on this account instead.
          </p>

          <label className="delete-account-confirm-label" htmlFor="delete-account-confirm">
            Type <b>{ACCOUNT_DELETION_CONFIRM_WORD}</b> to confirm
          </label>
          <input
            id="delete-account-confirm"
            type="text"
            className="delete-account-confirm-input"
            value={typed}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={ACCOUNT_DELETION_CONFIRM_WORD}
            disabled={stage === "deleting"}
            onChange={(e) => {
              setTyped(e.target.value);
              setError(null);
              // Editing the word after arming disarms the second confirmation, so the final button
              // can never be reached without the word being right at the moment it is pressed.
              setStage(stage === "armed" ? "reading" : stage);
            }}
          />

          <div className="delete-account-actions">
            {stage === "armed" ? (
              <button type="button" className="delete-account-danger" onClick={() => void handleDelete()}>
                Yes — delete my account permanently
              </button>
            ) : (
              <button
                type="button"
                className="delete-account-danger"
                disabled={!wordMatches || stage === "deleting"}
                onClick={() => setStage("armed")}
              >
                {stage === "deleting" ? "Deleting…" : "Delete my account"}
              </button>
            )}
            <button type="button" onClick={reset} disabled={stage === "deleting"}>
              Cancel
            </button>
          </div>

          {stage === "armed" && !error && (
            <p className="auth-status delete-account-final">
              Last chance — the next tap deletes everything listed above and cannot be undone.
            </p>
          )}
          {error && <p className="auth-status auth-error">{error}</p>}
        </>
      )}
    </div>
  );
}

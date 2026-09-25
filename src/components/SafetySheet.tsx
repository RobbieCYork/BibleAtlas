import { useEffect, useState } from "react";
import {
  MODERATION_CONTACT_EMAIL,
  MODERATION_RESPONSE_WINDOW,
  fetchMyBlocks,
  humanizeModerationError,
  unblockUser,
  useModerationAvailable,
  type BlockedAccount,
} from "../lib/moderationApi";
import Icon from "./Icon";

/* ============================================================================
 * "Safety & Contact" — the screen that answers all four of App Store Review
 * Guideline 1.2 in one place, and the one to open if a reviewer asks where any
 * of it is.
 *
 *   1. Filtering        — what Hide and Block do, and where the controls are.
 *   2. Reporting        — where the Report control lives on every surface, and
 *                         what happens after it is used.
 *   3. Blocking         — the live list, with an Unblock next to each name.
 *   4. Contact          — admin@capstonebible.com, as a mailto, in prose, on a
 *                         screen reachable in two taps from anywhere signed in.
 *
 * The contact address also appears on the sign-in card (AuthGate.tsx) and in
 * the pre-rendered library footer (scripts/seo/render.mjs), because a reviewer
 * who never gets past the front door still has to find it — and because
 * "published" means published, not "available once you have an account".
 *
 * ── THE LIST IS AN RPC, NOT A JOIN ──────────────────────────────────────────
 * sql/028's restrictive policy on `profiles` hides a blocked account's row from
 * the account that blocked it. That is the feature working. It also means a
 * client-side join from user_blocks to profiles returns uuids with no names on
 * them, which would make this screen useless — so list_my_blocks() is SECURITY
 * DEFINER and reads past the policy. It discloses nothing: every name it
 * returns belongs to someone this reader blocked, by name, on purpose.
 * ========================================================================== */

interface SafetySheetProps {
  onClose: () => void;
}

function formatBlockedDate(iso: string): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SafetySheet({ onClose }: SafetySheetProps) {
  const available = useModerationAvailable();
  const [blocks, setBlocks] = useState<BlockedAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (available !== true) return;
    let cancelled = false;
    void fetchMyBlocks()
      .then((rows) => {
        if (!cancelled) setBlocks(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setBlocks([]);
          setError(humanizeModerationError(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [available]);

  const handleUnblock = async (row: BlockedAccount) => {
    setBusyId(row.user_id);
    setError(null);
    try {
      await unblockUser(row.user_id);
      setBlocks((prev) => (prev ?? []).filter((b) => b.user_id !== row.user_id));
    } catch (err) {
      setError(humanizeModerationError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="auth-admin-sheet" role="dialog" aria-label="Safety and contact">
      <div className="auth-admin-sheet-head">
        <button type="button" className="auth-back-link" onClick={onClose}>
          ← Back
        </button>
        <h3 className="auth-admin-sheet-title">Safety & Contact</h3>
      </div>
      <div className="auth-admin-sheet-body">
        {/* WHY THESE FOUR SECTIONS ARE GATED AND THE LAST TWO ARE NOT.
          *
          * sql/028 has to be run by a human, and until it is there is no Report control, no Block
          * control and no hide list anywhere in the app — so describing them here would be telling
          * a reader about buttons that are not on their screen. The contact address and the
          * standards below are true either way, and they are the half a reader actually needs when
          * the controls are missing: email a person, and we act on it by hand.
          *
          * The alternative — showing the sections with a "not switched on yet" note — puts our
          * migration state in front of someone who has just been harassed. That is our problem to
          * solve, not theirs to read about. */}
        {available === false && (
          <section className="safety-section">
            <h4 className="safety-heading">
              <Icon name="flag" inline /> Reporting something
            </h4>
            <p className="safety-text">
              Email us and we'll deal with it directly — a person reads it, usually{" "}
              {MODERATION_RESPONSE_WINDOW}. Tell us what you saw and where, and we can remove content or act on an
              account. The address is below.
            </p>
          </section>
        )}

        {available === true && (
          <>
            <section className="safety-section">
              <h4 className="safety-heading">
                <Icon name="flag" inline /> Reporting something
              </h4>
              <p className="safety-text">
                Every post, comment, note, direct message, group message and profile has a flag control on it. Use it
                and tell us what's wrong — harassment, hate speech, threats, sexual content, spam, impersonation, or
                content written to inflame rather than to disagree. A person reads every report, usually{" "}
                {MODERATION_RESPONSE_WINDOW}. The account you report is never told who reported them.
              </p>
              <p className="safety-text">
                If someone is in immediate danger, contact your local emergency services first. Then email us so we can
                act on the account.
              </p>
            </section>

            <section className="safety-section">
              <h4 className="safety-heading">
                <Icon name="ban" inline /> Blocking someone
              </h4>
              <p className="safety-text">
                Blocking is in the same flag menu. It is not a mute: their posts, comments and messages stop reaching
                you, yours stop reaching them, and neither of you can message or comment at the other. It is enforced by
                the database, not by this app — signing out, using a different browser or calling the API directly does
                not get around it. They are not told.
              </p>
              <p className="safety-text">
                Blocking a friend ends the friendship, and unblocking does not restore it. Blocking also hides their
                content from you, so report anything you want us to see <em>before</em> you block.
              </p>
            </section>

            <section className="safety-section">
              <h4 className="safety-heading">
                <Icon name="eyeOff" inline /> Hiding one thing
              </h4>
              <p className="safety-text">
                If it's one post rather than one person, "Hide this post" removes it from your feed and leaves
                everything else alone. Nobody is told, and nothing is reported.
              </p>
            </section>

            <section className="safety-section">
              <h4 className="safety-heading">
                <Icon name="people" inline /> Blocked accounts
              </h4>
              {blocks === null && <p className="comment-status">Loading…</p>}
              {blocks !== null && blocks.length === 0 && <p className="comment-status">You haven't blocked anyone.</p>}
              {blocks !== null && blocks.length > 0 && (
                <ul className="safety-block-list">
                  {blocks.map((b) => (
                    <li key={b.user_id} className="safety-block-row">
                      <span className="auth-avatar" aria-hidden="true">
                        {b.avatar_url ? (
                          <img src={b.avatar_url} alt="" />
                        ) : (
                          (b.display_name ?? "?").charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="safety-block-name">
                        {b.display_name ?? "A deleted account"}
                        <span className="safety-block-date">Blocked {formatBlockedDate(b.blocked_at)}</span>
                      </span>
                      <button
                        type="button"
                        className="safety-unblock"
                        onClick={() => handleUnblock(b)}
                        disabled={busyId === b.user_id}
                      >
                        {busyId === b.user_id ? "…" : "Unblock"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {error && <p className="auth-status auth-error">{error}</p>}
            </section>
          </>
        )}

        <section className="safety-section">
          <h4 className="safety-heading">
            <Icon name="messages" inline /> Contact us
          </h4>
          <p className="safety-text">
            Anything this screen doesn't cover — a report that needs a person now, an account you think we've got wrong,
            a legal or copyright question, or a request about your own data:
          </p>
          <p className="safety-contact">
            <a href={`mailto:${MODERATION_CONTACT_EMAIL}`}>{MODERATION_CONTACT_EMAIL}</a>
          </p>
          <p className="safety-text safety-text-muted">
            Capstone Bible · capstonebible.com. We aim to answer {MODERATION_RESPONSE_WINDOW}.
          </p>
        </section>

        <section className="safety-section">
          <h4 className="safety-heading">
            <Icon name="shield" inline /> What isn't allowed here
          </h4>
          <p className="safety-text">
            This is a Bible study app, and people disagree here — about doctrine, about translations, about tradition.
            Disagreement is welcome. What isn't: harassing a person, attacking anyone over their race, faith,
            disability, sex or origin, threats, sexual content, anything involving a minor, spam, scams, impersonation,
            and religious commentary written to demean people of another tradition rather than to argue with what they
            believe. Content that crosses those lines is removed, and accounts that keep crossing them lose access.
          </p>
        </section>
      </div>
    </div>
  );
}

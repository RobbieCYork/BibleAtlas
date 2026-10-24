import { useState, type ReactNode } from "react";
import { FEATURES, setFeatureStage, setTestView, useFeatureAdmin, type FeatureDef, type FeatureKey } from "../lib/features";
import { formatWhen } from "../lib/adminApi";

/* ============================================================================
 * The owner's Testing / Live controls and the two signals that go with them.
 *
 * Nothing in this file decides whether a feature is visible — that is
 * lib/features.ts's decide(), reached through useFeature(). These components
 * only show the owner which view he is in and let him change the inputs.
 * ========================================================================== */

/** The small orange dot drawn beside a Testing feature's own entry point. It only ever renders for
 * the owner in Test view — callers pass useFeature(key).inTesting, which is false for everyone
 * else — so a normal reader never sees one. Carries a title and screen-reader text, so the colour
 * is never the only signal. */
export function TestingMarker({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="release-testing-marker" title="Testing — only you can see this">
      <span className="release-dot release-dot-test" aria-hidden="true" />
      <span className="sr-only"> (Testing — only you can see this)</span>
    </span>
  );
}

/** The slim strip across the top of the app while the owner is in Test view. Never rendered for
 * anyone else, and gone the moment he switches back to Live view — in Live view the owner sees
 * exactly what every other reader sees. */
export function TestViewStrip() {
  const { testView } = useFeatureAdmin();
  if (!testView) return null;
  return (
    <div className="release-test-strip" role="status">
      <span className="release-dot release-dot-test" aria-hidden="true" />
      <span className="release-test-strip-text">Test view — features in Testing are showing, marked with an orange dot. Only you can see them.</span>
      <button type="button" className="release-test-strip-exit" onClick={() => setTestView(false)}>
        Switch to Live view
      </button>
    </div>
  );
}

/** The Live / Test segmented switch. Owner only — renders nothing for anyone else. */
export function LiveTestSwitch() {
  const { isOwner, testView } = useFeatureAdmin();
  if (!isOwner) return null;
  return (
    <div className="release-view-switch" role="group" aria-label="View the app as">
      <button
        type="button"
        className={`release-view-option${!testView ? " active" : ""}`}
        aria-pressed={!testView}
        onClick={() => setTestView(false)}
      >
        <span className="release-dot release-dot-live" aria-hidden="true" /> Live view
      </button>
      <button
        type="button"
        className={`release-view-option${testView ? " active" : ""}`}
        aria-pressed={testView}
        onClick={() => setTestView(true)}
      >
        <span className="release-dot release-dot-test" aria-hidden="true" /> Test view
      </button>
    </div>
  );
}

/** Admin Console → Features. Owner only. One row per feature, each with a dot that flips it. Child
 * features (each game under Games & Trivia) are listed nested beneath their parent's row. */
export function FeatureStagesPanel() {
  const { isOwner, testView, live, updatedAt, loaded, loadFailed, present } = useFeatureAdmin();
  const [pending, setPending] = useState<FeatureKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!isOwner) {
    return <p className="admin-note">Feature stages are managed by the owner account only.</p>;
  }

  const flip = async (key: FeatureKey, label: string) => {
    const nextLive = !live[key];
    setPending(key);
    setError(null);
    setStatus(null);
    try {
      await setFeatureStage(key, nextLive);
      setStatus(
        nextLive
          ? `${label} is Live — everyone can see it.`
          : `${label} is in Testing — hidden from everyone but you${testView ? "" : ". Switch to Test view to see it"}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change that feature's stage.");
    } finally {
      setPending(null);
    }
  };

  // One row. A child (an individual game) also says when its parent is hiding it regardless, and when
  // its own row doesn't exist yet (sql/040 not applied — it is treated as Live until then).
  const renderRow = ({ key, label, where, parent }: FeatureDef, nested: ReactNode) => {
    const isLive = live[key] !== false;
    const stage = isLive ? "Live" : "Testing";
    const parentDef = parent ? FEATURES.find((p) => p.key === parent) : undefined;
    const parentTesting = parent !== undefined && live[parent] === false;
    const missingRow = parent !== undefined && loaded && !loadFailed && !present[key];
    return (
      <li key={key} className={`release-row${parent ? " release-row-child" : ""}`}>
        <button
          type="button"
          className="release-flip"
          onClick={() => void flip(key, label)}
          disabled={pending !== null}
          aria-label={`${label}: ${stage}. Switch to ${isLive ? "Testing" : "Live"}.`}
          title={`Switch to ${isLive ? "Testing" : "Live"}`}
        >
          <span className={`release-dot ${parent ? "" : "release-dot-lg "}${isLive ? "release-dot-live" : "release-dot-test"}`} aria-hidden="true" />
        </button>
        <div className="release-row-text">
          <span className="release-row-head">
            <span className="release-row-label">{label}</span>
            <span className={`release-stage ${isLive ? "release-stage-live" : "release-stage-test"}`}>
              {pending === key ? "Saving…" : stage}
            </span>
          </span>
          <span className="release-row-where">{where}</span>
          {parentTesting && isLive && (
            <span className="release-row-where">Hidden from everyone but you anyway, because {parentDef?.label ?? "its section"} is in Testing.</span>
          )}
          {missingRow && (
            <span className="release-row-where">Not stored yet — the per-game migration (sql/040) hasn't been applied, so this game follows {parentDef?.label ?? "its section"}.</span>
          )}
          {updatedAt[key] && <span className="release-row-when">Changed {formatWhen(updatedAt[key])}</span>}
        </div>
        {nested}
      </li>
    );
  };

  return (
    <div className="release-panel">
      <p className="admin-note">
        <strong>Live</strong> features are on for everyone. <strong>Testing</strong> features are hidden from every
        other account — admins and advisors included — and show for you only in Test view. Tap a dot to switch. Every
        change is recorded with who made it and when.
      </p>

      {loadFailed && (
        <p className="auth-status auth-error">
          Couldn't load the current stages, so the app is treating every feature as Live. If the feature-stage
          migration (sql/039) hasn't been applied yet, that's why.
        </p>
      )}
      {error && <p className="auth-status auth-error">{error}</p>}
      {status && <p className="auth-status admin-action-status">{status}</p>}
      {!loaded && <p className="admin-note">Loading…</p>}

      <ul className="release-list">
        {FEATURES.filter((f) => !f.parent).map((f) => {
          const children = FEATURES.filter((c) => c.parent === f.key);
          return renderRow(f, children.length > 0 && (
            <ul className="release-list release-sublist" aria-label={`${f.label} — individual stages`}>
              {children.map((c) => renderRow(c, null))}
            </ul>
          ));
        })}
      </ul>

      <p className="admin-note">
        Honest limits: hiding happens in the app, not in the database. For everything except account deletion, a
        Testing feature's data is still reachable by a signed-in member who calls the database directly — the stage
        only removes the buttons, tabs and menu rows that lead to it. Account deletion is also refused by the server
        once the delete-account function is redeployed. The public pages at /library, /places, /people and so on are
        generated at build time and are never affected by these switches.
      </p>
    </div>
  );
}

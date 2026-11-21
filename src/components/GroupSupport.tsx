import { useEffect, useState } from "react";
import "./Groups.css";
import {
  classSupportLog,
  grantSupportAccess,
  revokeSupportAccess,
  SUPPORT_ACCESS_POLICY_DRAFT,
  supportFindClasses,
  supportGradebook,
  supportRoster,
  type SupportClass,
  type SupportGradebook,
  type SupportLog,
  type SupportRoster,
} from "../lib/groupSupport";
import type { MyClass } from "../lib/groups";

/**
 * sql/050. Two halves, both lazy:
 *   default export  — the owner's "Class support" tab in the Admin Console (search, reason, roster,
 *                     and the gradebook only under the class owner's grant);
 *   SupportAccessPanel — the class staff's "Support access log", and the owner's grant button.
 */
export default function GroupSupportConsole() {
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<SupportClass[] | null>(null);
  const [roster, setRoster] = useState<SupportRoster | null>(null);
  const [grades, setGrades] = useState<SupportGradebook | null>(null);
  const reasonOk = reason.trim().length >= 10;

  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await f();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="groups-support" data-tier="plus">
      <p className="admin-note">
        Look up one class at a time to help its teacher or leader. Every lookup is logged with your reason, and the class's teacher or leader
        can read that log. Grades need the class owner to grant access first; answers and essays are never shown here.
      </p>
      <p className="groups-draft">DRAFT FOR COUNSEL (Privacy and Terms): {SUPPORT_ACCESS_POLICY_DRAFT}</p>
      <label className="report-field">
        <span className="report-field-label">Reason (shown to the class's teacher or leader)</span>
        <input type="text" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Teacher emailed: a student can't join" />
      </label>
      <div className="groups-join-row">
        <input type="search" aria-label="Class or organisation name" placeholder="Class or organisation name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button
          type="button"
          className="paid-teaser-button"
          disabled={busy || !reasonOk || query.trim().length < 3}
          onClick={() => void run(async () => (setRoster(null), setGrades(null), setFound(await supportFindClasses(query, reason))))}
        >
          Search
        </button>
      </div>
      {!reasonOk && <p className="groups-small">A reason of at least 10 characters is required.</p>}
      {error && (
        <p className="plus-error" role="alert">
          {error}
        </p>
      )}
      {found && found.length === 0 && <p className="groups-small">No classes found.</p>}
      {found && found.length > 0 && (
        <ul className="groups-invite-list">
          {found.map((c) => (
            <li key={c.class_id} className="groups-invite-row" data-support-class={c.class_id}>
              <span className="groups-invite-addr">
                <strong>{c.name}</strong> · {c.org_name} · {c.status} · {c.seats_used}/{c.seats_purchased} seats
              </span>
              <span className="groups-invite-actions">
                <button type="button" className="auth-back-link" disabled={busy || !reasonOk} onClick={() => void run(async () => (setGrades(null), setRoster(await supportRoster(c.class_id, reason))))}>
                  Roster
                </button>
                <button type="button" className="auth-back-link" disabled={busy || !reasonOk} onClick={() => void run(async () => (setRoster(null), setGrades(await supportGradebook(c.class_id, reason))))}>
                  Grades (needs grant)
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {roster && (
        <section className="groups-section groups-support-roster" aria-label="Roster">
          <h4 className="groups-h">
            {roster.class.name}: {roster.class.seats_used} of {roster.class.seats_purchased} seats
          </h4>
          <ul className="groups-roster">
            {roster.staff.map((s, i) => (
              <li key={`s${i}`}>
                {s.display_name ?? "(no name)"} · {s.role === "owner" ? "owner" : "co-teacher / co-leader"}
              </li>
            ))}
            {roster.members.map((m, i) => (
              <li key={`m${i}`}>
                {m.display_name ?? "(no name)"} · {m.seat_state === "active" ? "member" : "left"}
              </li>
            ))}
          </ul>
          {roster.invites.length > 0 && (
            <ul className="groups-roster">
              {roster.invites.map((v, i) => (
                <li key={`i${i}`}>
                  Invite {v.address ?? "(address removed)"} · {v.status} · {v.sends} sent
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {grades && (
        <section className="groups-section" aria-label="Grades">
          <p className="groups-small">
            {grades.students.length} students · {grades.assignments.length} assignments · {grades.cells.length} submissions (status and score only)
          </p>
        </section>
      )}
    </div>
  );
}

export function SupportAccessPanel({ c }: { c: MyClass }) {
  const [log, setLog] = useState<SupportLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = () => classSupportLog(c.classId).then(setLog, (e) => setError((e as Error).message));
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.classId]);
  const isOwner = c.role === "owner";
  const act = (f: () => Promise<unknown>) => void f().then(reload, (e) => setError((e as Error).message));
  return (
    <section className="groups-invite-block groups-support-log" aria-label="Support access log">
      <h5 className="groups-h">Support access log</h5>
      <p className="groups-small">
        Capstone Bible staff can look at this {c.kind === "school" ? "class" : "group"}'s roster to help you; every look is listed here with the reason. They can see
        grades only if you grant access, and never answers or essays.
      </p>
      {isOwner &&
        (log?.grant ? (
          <p className="groups-small">
            Support can see grades until {new Date(log.grant.expires_at).toLocaleString()}.{" "}
            <button type="button" className="auth-back-link" onClick={() => act(() => revokeSupportAccess(c.classId))}>
              Remove access now
            </button>
          </p>
        ) : (
          <button type="button" className="paid-teaser-button paid-teaser-button--quiet" onClick={() => act(() => grantSupportAccess(c.classId, 24))}>
            Grant support access for 24 hours
          </button>
        ))}
      {log && log.entries.length === 0 && <p className="groups-small">No support access yet.</p>}
      {log && log.entries.length > 0 && (
        <ul className="groups-roster">
          {log.entries.slice(0, 50).map((e, i) => (
            <li key={i}>
              {new Date(e.at).toLocaleString()} · {e.by === "class" ? (e.kind === "grant" ? "access granted" : "access removed") : `Capstone support: ${e.kind}`}
              {e.reason ? ` · "${e.reason}"` : ""}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="plus-error">{error}</p>}
    </section>
  );
}

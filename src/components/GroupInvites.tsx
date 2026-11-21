import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  ageBlocked,
  ageBracketFrom,
  classShareLink,
  createInvites,
  INVITE_MAX_PER_CALL,
  INVITE_NOTE_MAX,
  INVITE_RESULT_LABEL,
  INVITE_STATUS_LABEL,
  listInvites,
  parseEmailList,
  previewInvite,
  redeemInvite,
  resendInvite,
  revokeInvite,
  setAgeBlocked,
  smsHref,
  textHasLink,
  type InviteOutcome,
  type InvitePreview,
  type InviteRow,
} from "../lib/groupInvites";
import { joinClassByCode, type AgeBracket, type MyClass } from "../lib/groups";
import { clearPendingJoinClass, type PendingJoin } from "../lib/groupsJoinParam";
import { groupWording, type GroupKind } from "../lib/groupWording";
import { renderInviteEmail } from "../../supabase/functions/_shared/inviteEmail.ts";

/**
 * Capstone Plus for Groups phase 3 (sql/049): the teacher's invite panel and the invitee's join
 * screen. Lazy Groups chunk only. The app sends nothing itself: email goes out from the server on
 * its own schedule (when that is switched on), and "Text it from your phone" opens the teacher's own
 * messages app.
 */

// ------------------------------------------------------------------------------------- teacher
export function InvitePanel({ c }: { c: MyClass }) {
  const w = groupWording(c.kind);
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ outcomes: InviteOutcome[]; sendingEnabled: boolean } | null>(null);
  const [rows, setRows] = useState<InviteRow[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseEmailList(emails), [emails]);
  const noteLink = note.trim() !== "" && textHasLink(note);
  const link = c.joinCode ? classShareLink(c.joinCode) : "";
  const textBody = `${w.inviteLine(c.name, teacherName)}. Join here: ${link} (or use the code ${c.joinCode ?? ""})`;

  const reload = async () => setRows(await listInvites(c.classId));
  useEffect(() => {
    void reload();
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle();
      setTeacherName((data as { display_name?: string | null } | null)?.display_name ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.classId]);

  const preview = useMemo(
    () =>
      renderInviteEmail({
        kind: c.kind,
        stage: "invite",
        seq: 1,
        className: c.name,
        orgName: c.orgName,
        teacherName,
        personalNote: note || null,
        joinUrl: `${window.location.origin}/?joinClass=your-private-link`,
        unsubscribeUrl: `${window.location.origin}/email/unsubscribe.html`,
        reportUrl: "mailto:admin@capstonebible.com",
        postalAddress: null,
        expiresAt: null,
      }),
    [c.kind, c.name, c.orgName, teacherName, note],
  );

  const send = async () => {
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const r = await createInvites(c.classId, parsed.valid, note);
      setResults({ outcomes: r.results, sendingEnabled: r.sendingEnabled });
      if (r.invited > 0) setEmails("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it yourself.");
    }
  };

  const canSend = !busy && parsed.valid.length > 0 && !parsed.tooMany && note.length <= INVITE_NOTE_MAX && !noteLink;

  return (
    <div className="groups-invites" data-tier="plus">
      <section className="groups-invite-block" aria-label="Share a link or code">
        <h5 className="groups-h">Share a link or code</h5>
        <p className="groups-small">
          Anyone with the link or code can join while there are seats. Share it only with your {w.participants}.
        </p>
        <div className="groups-share-row">
          <code className="groups-code groups-share-link">{link}</code>
        </div>
        <div className="groups-share-actions">
          <button type="button" className="paid-teaser-button paid-teaser-button--quiet" onClick={() => void copyLink()}>
            {copied ? "Copied" : "Copy link"}
          </button>
          <a className="paid-teaser-button paid-teaser-button--quiet groups-sms" href={smsHref(textBody)}>
            Text it from your phone
          </a>
        </div>
        <p className="groups-small">Capstone Bible doesn't send texts. This opens your own messages app with the link filled in.</p>
      </section>

      <section className="groups-invite-block" aria-label="Invite by email">
        <h5 className="groups-h">Invite by email</h5>
        <label className="report-field">
          <span className="report-field-label">Email addresses (one per line, up to {INVITE_MAX_PER_CALL})</span>
          <textarea rows={4} value={emails} onChange={(e) => setEmails(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        {(parsed.valid.length > 0 || parsed.invalid.length > 0) && (
          <p className="groups-small groups-invite-count">
            {parsed.valid.length} to invite
            {parsed.duplicates > 0 ? ` · ${parsed.duplicates} duplicate${parsed.duplicates === 1 ? "" : "s"} removed` : ""}
            {parsed.invalid.length > 0 ? ` · not email addresses: ${parsed.invalid.slice(0, 3).join(", ")}${parsed.invalid.length > 3 ? "…" : ""}` : ""}
          </p>
        )}
        {parsed.tooMany && <p className="plus-error">Up to {INVITE_MAX_PER_CALL} addresses at a time.</p>}
        <label className="report-field">
          <span className="report-field-label">
            Personal note (optional, {note.length}/{INVITE_NOTE_MAX})
          </span>
          <input type="text" value={note} maxLength={INVITE_NOTE_MAX} onChange={(e) => setNote(e.target.value)} />
        </label>
        {noteLink && <p className="plus-error">The note can't contain a web or email address.</p>}
        <p className="groups-small">
          Only people you actually teach or lead. If someone doesn't join, we send up to 5 reminders over a month (days 1, 3, 5, 14 and 30), then stop. Everyone can unsubscribe.
        </p>
        <button type="button" className="auth-back-link groups-preview-toggle" onClick={() => setShowPreview(!showPreview)} aria-expanded={showPreview}>
          {showPreview ? "Hide the email preview" : "Preview the email"}
        </button>
        {showPreview && (
          <div className="groups-email-preview" aria-label="Email preview">
            <p className="groups-draft">DRAFT FOR COUNSEL: the email wording and the postal address are not final.</p>
            <p className="groups-small">
              <strong>From:</strong> Capstone Bible
            </p>
            <p className="groups-small">
              <strong>Subject:</strong> {preview.subject}
            </p>
            <pre className="groups-email-text">{preview.text}</pre>
          </div>
        )}
        <button type="button" className="paid-teaser-button groups-invite-send" disabled={!canSend} onClick={() => void send()}>
          {busy ? "Inviting…" : parsed.valid.length > 1 ? `Invite ${parsed.valid.length} people` : "Invite"}
        </button>
        {error && (
          <p className="plus-error" role="alert">
            {error}
          </p>
        )}
        {results && (
          <div className="groups-invite-results" role="status">
            {!results.sendingEnabled && (
              <p className="groups-small">Invites are saved. Email sending isn't switched on yet, so nothing has been sent.</p>
            )}
            <ul className="groups-roster">
              {results.outcomes.map((o) => (
                <li key={o.email}>
                  {o.email}: {INVITE_RESULT_LABEL[o.result] ?? o.result}
                  {o.result === "limit" && o.limit === "unverified_org" ? " (30 invites until your organisation is verified)" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="groups-invite-block" aria-label="Invites sent">
        <h5 className="groups-h">Invites</h5>
        {rows === null && <p className="groups-small">Loading…</p>}
        {rows && rows.length === 0 && <p className="groups-small">No email invites yet.</p>}
        {rows && rows.length > 0 && (
          <ul className="groups-invite-list">
            {rows.map((r) => (
              <li key={r.inviteId} className="groups-invite-row" data-invite-id={r.inviteId}>
                <span className="groups-invite-addr">{r.address ?? "(address removed)"}</span>
                <span className={`groups-pill groups-pill--invite-${r.status}`}>{INVITE_STATUS_LABEL[r.status] ?? r.status}</span>
                <span className="groups-small">
                  {r.sends === 0 ? "not sent yet" : `${r.sends} email${r.sends === 1 ? "" : "s"} sent`}
                </span>
                {r.status === "pending" && (
                  <span className="groups-invite-actions">
                    {r.canResend && (
                      <button type="button" className="auth-back-link" onClick={() => void resendInvite(r.inviteId).then(reload, (e) => setError((e as Error).message))}>
                        Send again
                      </button>
                    )}
                    <button type="button" className="auth-back-link" onClick={() => void revokeInvite(r.inviteId).then(reload, (e) => setError((e as Error).message))}>
                      Cancel invite
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------------------------- invitee
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Neutral age question (plan §5, DRAFT FOR COUNSEL): month and year, no defaults, no hint. */
function AgeQuestion({ onAnswer }: { onAnswer: (b: AgeBracket | "under13" | null) => void }) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => thisYear - i);
  useEffect(() => {
    onAnswer(month && year ? ageBracketFrom(Number(month), Number(year)) : null);
  }, [month, year, onAnswer]);
  return (
    <fieldset className="groups-fieldset groups-age">
      <legend className="report-field-label">When were you born?</legend>
      <div className="groups-row">
        <label className="report-field">
          <span className="report-field-label">Month</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Birth month">
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="report-field">
          <span className="report-field-label">Year</span>
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Birth year">
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="groups-small">We keep only an age range, never your birth date.</p>
    </fieldset>
  );
}

export function JoinClassPanel({ pending, onDone }: { pending: PendingJoin; onDone: (joinedName: string | null) => void }) {
  const [info, setInfo] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [age, setAge] = useState<AgeBracket | "under13" | null>(null);
  const [blocked, setBlocked] = useState(ageBlocked());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pending.kind !== "token") return;
    previewInvite(pending.value).then(setInfo, (e) => setLoadError((e as Error).message));
  }, [pending]);

  const kind: GroupKind = info?.kind ?? "school";
  const w = groupWording(kind);
  const unitWords = info ? w.unit : "class or group";
  const adminWords = info ? w.admin.toLowerCase() : "teacher or leader";

  const join = async () => {
    if (age === "under13") {
      setAgeBlocked();
      setBlocked(true);
      return;
    }
    if (!age) return;
    setBusy(true);
    setError(null);
    try {
      const r = pending.kind === "token" ? await redeemInvite(pending.value, age) : await joinClassByCode(pending.value, age);
      clearPendingJoinClass();
      onDone(r.name);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className="groups-section groups-joinpanel" aria-label="Join a class or group" data-tier="plus">
      <h4 className="groups-h">{info ? `Join ${info.name}` : pending.kind === "code" ? `Join with code ${pending.value}` : "Join a class or group"}</h4>
      {info && (
        <p className="groups-small">
          {info.orgName ?? ""}
          {info.leaderName ? ` · ${w.admin}: ${info.leaderName}` : ""}
        </p>
      )}
      {loadError && (
        <p className="plus-error" role="alert">
          {loadError}
        </p>
      )}
      {blocked ? (
        <p className="auth-status" role="status">
          Sorry, you can't join this {unitWords} right now.
        </p>
      ) : (
        !loadError && (
          <>
            <p className="groups-small">
              Your {adminWords} will see your answers and scores on this {unitWords}'s assignments. They won't see your notes, highlights, prayer list, messages or
              anything else you do in Capstone Bible. Other members don't see who else is in it. Capstone Plus is included while you're in it.
            </p>
            <AgeQuestion onAnswer={setAge} />
            <button type="button" className="paid-teaser-button groups-join-confirm" disabled={busy || !age} onClick={() => void join()}>
              {busy ? "Joining…" : "Join"}
            </button>
          </>
        )
      )}
      {error && (
        <p className="plus-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="auth-back-link"
        onClick={() => {
          clearPendingJoinClass();
          onDone(null);
        }}
      >
        Not now
      </button>
    </section>
  );
}

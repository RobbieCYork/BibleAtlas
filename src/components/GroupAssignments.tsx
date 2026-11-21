import { useCallback, useEffect, useMemo, useState } from "react";
import "./GroupAssignments.css";
import type { MyClass } from "../lib/groups";
import { cap, groupWording, type GroupWording } from "../lib/groupWording";
import { openInApp } from "../lib/deepLink";
import {
  answersPayload,
  assignmentProblems,
  blankAssignment,
  blankQuestion,
  canonicalBibleRef,
  cellKey,
  deleteAssignment,
  duplicateAssignment,
  fetchClassAssignments,
  fetchGradebook,
  fetchMyAssignment,
  fetchStaffAssignment,
  fetchStaffSubmission,
  fmtPoints,
  formatDue,
  fromLocalInput,
  gradeSubmission,
  gradebookCsv,
  logExport,
  MAX_ESSAY,
  MAX_FEEDBACK,
  MAX_SHORT,
  publishAssignment,
  QUESTION_TYPE_LABEL,
  READING_KIND_LABEL,
  readingHref,
  readingTitle,
  returnSubmissions,
  saveAssignment,
  saveDraft,
  searchLibrary,
  setScoresVisible,
  statusLabel,
  submitAssignment,
  toLocalInput,
  type AssignmentDoc,
  type ClassAssignments,
  type EditQuestion,
  type Gradebook,
  type QuestionType,
  type Reading,
  type StaffSubmission,
  type TakeAssignment,
} from "../lib/groupAssignments";
import type { DeepLinkKind } from "../lib/deepLink";

/**
 * Capstone Plus for Groups phase 4 (sql/048): a class's assignments.
 *   staff  — list, editor (readings + questions + answer keys), gradebook, one submission's grading.
 *   member — their list (due, status, grade), taking an assignment (drafts, one submit), their results.
 * Every word that differs between a school class and a church group comes from groupWording(kind).
 * Answer keys exist only in the staff views: the student views are built from my_assignment(), which
 * never carries one until the teacher returns the work and chose to show answers.
 */
type StaffView = { k: "list" } | { k: "edit"; id: string | null } | { k: "gradebook" } | { k: "grade"; submissionId: string; back: "gradebook" | "list" };
type MemberView = { k: "list" } | { k: "take"; id: string };

export default function ClassWork({ c, onNavigate }: { c: MyClass; onNavigate: () => void }) {
  const w = groupWording(c.kind);
  const isStaff = c.role !== "member";
  return isStaff ? <StaffWork c={c} w={w} /> : <MemberWork c={c} w={w} onNavigate={onNavigate} />;
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p className="plus-error" role="alert">
      {error}
    </p>
  ) : null;
}

// ============================================================================================ staff
function StaffWork({ c, w }: { c: MyClass; w: GroupWording }) {
  const [view, setView] = useState<StaffView>({ k: "list" });
  const tab = view.k === "gradebook" || (view.k === "grade" && view.back === "gradebook") ? "gradebook" : "list";
  return (
    <div className="asg" data-tier="plus">
      <div className="asg-tabs" role="tablist" aria-label={`${cap(w.unit)} work`}>
        <button type="button" role="tab" aria-selected={tab === "list"} className={`asg-tab${tab === "list" ? " is-on" : ""}`} onClick={() => setView({ k: "list" })}>
          {w.workItems}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "gradebook"}
          className={`asg-tab${tab === "gradebook" ? " is-on" : ""}`}
          onClick={() => setView({ k: "gradebook" })}
        >
          {w.gradebook}
        </button>
      </div>
      {view.k === "list" && <StaffList c={c} w={w} onOpen={(id) => setView({ k: "edit", id })} />}
      {view.k === "edit" && <AssignmentEditor c={c} w={w} id={view.id} onDone={() => setView({ k: "list" })} onOpenId={(id) => setView({ k: "edit", id })} />}
      {view.k === "gradebook" && <GradebookView c={c} w={w} onOpen={(submissionId) => setView({ k: "grade", submissionId, back: "gradebook" })} />}
      {view.k === "grade" && <SubmissionGrader w={w} submissionId={view.submissionId} onBack={() => setView({ k: view.back === "gradebook" ? "gradebook" : "list" })} />}
    </div>
  );
}

function StaffList({ c, w, onOpen }: { c: MyClass; w: GroupWording; onOpen: (id: string | null) => void }) {
  const [data, setData] = useState<ClassAssignments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await fetchClassAssignments(c.classId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [c.classId]);
  useEffect(() => {
    void load();
  }, [load]);
  const items = data?.role === "staff" ? data.items : [];
  const returnAll = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await returnSubmissions(id, null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="asg-section" aria-label={w.workItems}>
      <button type="button" className="paid-teaser-button asg-new" onClick={() => onOpen(null)}>
        New {w.workItem.toLowerCase()}
      </button>
      {c.role === "owner" && <ScoresToggle c={c} w={w} />}
      <ErrorLine error={error} />
      {data === null && !error && <p className="groups-small">Loading…</p>}
      {data && items.length === 0 && <p className="groups-small">No {w.workItems.toLowerCase()} yet.</p>}
      <ul className="asg-list">
        {items.map((a) => (
          <li key={a.id} className="asg-item" data-assignment-id={a.id}>
            <button type="button" className="asg-item-main" onClick={() => onOpen(a.id)}>
              <span className="asg-item-title">{a.title}</span>
              <span className={`groups-pill${a.publishedAt ? " groups-pill--active" : ""}`}>{a.publishedAt ? "Published" : "Draft"}</span>
            </button>
            <p className="groups-small">
              Due {formatDue(a.dueAt)} · {a.questions} question{a.questions === 1 ? "" : "s"} · {a.maxPoints} pts · {a.readings} reading
              {a.readings === 1 ? "" : "s"}
            </p>
            {a.publishedAt && (
              <p className="groups-small">
                {a.submitted} handed in · {a.toGrade} to grade · {a.toReturn} ready to return
              </p>
            )}
            {a.toReturn > 0 && (
              <button type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline" disabled={busy === a.id} onClick={() => void returnAll(a.id)}>
                {busy === a.id ? "Returning…" : `Return ${a.toReturn} to ${w.participants}`}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScoresToggle({ c, w }: { c: MyClass; w: GroupWording }) {
  // MyClass does not carry scores_visible; the default is known from kind (sql/047) and the toggle
  // says what it will do rather than claiming the current state.
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = async (v: boolean) => {
    setError(null);
    try {
      await setScoresVisible(c.classId, v);
      setMsg(v ? `${cap(w.participants)} will see their numeric ${w.score.toLowerCase()}s.` : `${cap(w.participants)} will see "${w.gradedLabel}" and your feedback, not a number.`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <details className="asg-details">
      <summary>What {w.participants} see when work is returned</summary>
      <p className="groups-small">
        {c.kind === "church" ? "Church groups start with numbers hidden." : "School classes start with numbers shown."} Feedback is always shown.
      </p>
      <div className="asg-row">
        <button type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline" onClick={() => void set(true)}>
          Show numbers
        </button>
        <button type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline" onClick={() => void set(false)}>
          Hide numbers
        </button>
      </div>
      {msg && (
        <p className="auth-status" role="status">
          {msg}
        </p>
      )}
      <ErrorLine error={error} />
    </details>
  );
}

// ------------------------------------------------------------------------------------------ editor
function AssignmentEditor({
  c,
  w,
  id,
  onDone,
  onOpenId,
}: {
  c: MyClass;
  w: GroupWording;
  id: string | null;
  onDone: () => void;
  onOpenId: (id: string) => void;
}) {
  const [a, setA] = useState<AssignmentDoc | null>(id ? null : blankAssignment(c.classId));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) return;
    fetchStaffAssignment(id)
      .then(setA)
      .catch((e) => setError((e as Error).message));
  }, [id]);
  const problems = useMemo(() => (a ? assignmentProblems(a) : []), [a]);
  if (!a) return error ? <ErrorLine error={error} /> : <p className="groups-small">Loading…</p>;
  const set = <K extends keyof AssignmentDoc>(k: K, v: AssignmentDoc[K]) => setA((x) => (x ? { ...x, [k]: v } : x));
  const setQ = (i: number, q: Partial<EditQuestion>) => set("questions", a.questions.map((x, j) => (j === i ? { ...x, ...q } : x)));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      const r = await saveAssignment(a);
      setA(await fetchStaffAssignment(r.id));
      setSaved("Saved.");
    });
  const publish = (on: boolean) =>
    run(async () => {
      const r = await saveAssignment(a);
      await publishAssignment(r.id, on);
      setA(await fetchStaffAssignment(r.id));
      setSaved(on ? `Published. ${cap(w.participants)} can see it now.` : "Unpublished.");
    });
  const duplicate = () =>
    run(async () => {
      if (!a.id) return;
      const nid = await duplicateAssignment(a.id);
      onOpenId(nid);
    });
  const remove = () =>
    run(async () => {
      if (!a.id || !window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
      await deleteAssignment(a.id);
      onDone();
    });

  const locked = a.locked;
  return (
    <form className="asg-form groups-form" onSubmit={(e) => (e.preventDefault(), void save())}>
      <button type="button" className="auth-back-link" onClick={onDone}>
        ← All {w.workItems.toLowerCase()}
      </button>
      <h4 className="groups-h">{a.id ? `Edit ${w.workItem.toLowerCase()}` : `New ${w.workItem.toLowerCase()}`}</h4>
      {a.publishedAt && <p className="groups-small">Published {formatDue(a.publishedAt)}.</p>}

      <label className="report-field">
        <span className="report-field-label">Title</span>
        <input type="text" maxLength={200} value={a.title} onChange={(e) => set("title", e.target.value)} />
      </label>
      <label className="report-field">
        <span className="report-field-label">Instructions</span>
        <textarea maxLength={10000} rows={4} value={a.instructions} onChange={(e) => set("instructions", e.target.value)} />
      </label>
      <div className="groups-row">
        <label className="report-field">
          <span className="report-field-label">Due (your time)</span>
          <input type="datetime-local" value={toLocalInput(a.dueAt)} onChange={(e) => set("dueAt", fromLocalInput(e.target.value))} />
        </label>
      </div>
      <fieldset className="groups-fieldset">
        <legend className="report-field-label">Late work</legend>
        <label className="groups-check">
          <input type="checkbox" checked={a.acceptLate} onChange={(e) => set("acceptLate", e.target.checked)} /> Accept work after the due date
        </label>
        {a.acceptLate && (
          <div className="groups-row">
            <label className="report-field">
              <span className="report-field-label">Penalty % per day late</span>
              <input type="number" min={0} max={100} value={a.latePenaltyPerDay} onChange={(e) => set("latePenaltyPerDay", clampInt(e.target.value, 0, 100))} />
            </label>
            <label className="report-field">
              <span className="report-field-label">Maximum penalty %</span>
              <input type="number" min={0} max={100} value={a.latePenaltyMax} onChange={(e) => set("latePenaltyMax", clampInt(e.target.value, 0, 100))} />
            </label>
          </div>
        )}
        <p className="groups-small">Late work is always marked late for you. The penalty is fixed when it is handed in.</p>
      </fieldset>
      <fieldset className="groups-fieldset">
        <legend className="report-field-label">Results</legend>
        <label className="groups-check">
          <input type="checkbox" checked={a.autoRelease} onChange={(e) => set("autoRelease", e.target.checked)} /> Show the {w.score.toLowerCase()} as soon as it is
          handed in (only when every question is marked automatically)
        </label>
        <label className="groups-check">
          <input type="checkbox" checked={a.showCorrectAnswers} onChange={(e) => set("showCorrectAnswers", e.target.checked)} /> After I return work, show{" "}
          {w.participants} the correct answers
        </label>
      </fieldset>

      <ReadingsEditor readings={a.readings} onChange={(r) => set("readings", r)} />

      <fieldset className="groups-fieldset">
        <legend className="report-field-label">Questions</legend>
        {locked && (
          <p className="asg-locked" role="note">
            {cap(w.participants)} have started this, so its questions and answers are locked: nothing already handed in can change under them. Duplicate it to make a new
            version.
          </p>
        )}
        {a.questions.length === 0 && <p className="groups-small">No questions: {w.participants} read and mark it done.</p>}
        {a.questions.map((q, i) => (
          <QuestionEditor
            key={i}
            n={i + 1}
            q={q}
            locked={locked}
            onChange={(p) => setQ(i, p)}
            onRemove={() => set("questions", a.questions.filter((_, j) => j !== i))}
            onMove={(d) => {
              const j = i + d;
              if (j < 0 || j >= a.questions.length) return;
              const qs = [...a.questions];
              [qs[i], qs[j]] = [qs[j], qs[i]];
              set("questions", qs);
            }}
          />
        ))}
        {!locked && (
          <div className="asg-row asg-addq" aria-label="Add a question">
            {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => (
              <button key={t} type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline" onClick={() => set("questions", [...a.questions, blankQuestion(t)])}>
                + {QUESTION_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        )}
        <p className="groups-small">Total {a.questions.reduce((s, q) => s + (q.points || 0), 0)} points.</p>
      </fieldset>

      {problems.length > 0 && (
        <ul className="groups-problems" aria-label="Still needed">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <ErrorLine error={error} />
      {saved && (
        <p className="auth-status" role="status">
          {saved}
        </p>
      )}
      <div className="asg-row asg-actions">
        <button type="submit" className="paid-teaser-button asg-inline" disabled={busy || problems.length > 0}>
          {busy ? "Saving…" : "Save"}
        </button>
        {!a.publishedAt ? (
          <button type="button" className="paid-teaser-button asg-inline" disabled={busy || problems.length > 0} onClick={() => void publish(true)}>
            Save and publish
          </button>
        ) : (
          !locked && (
            <button type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline" disabled={busy} onClick={() => void publish(false)}>
              Unpublish
            </button>
          )
        )}
        {a.id && (
          <button type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline" disabled={busy} onClick={() => void duplicate()}>
            Duplicate
          </button>
        )}
        {a.id && !locked && (
          <button type="button" className="auth-back-link asg-danger" disabled={busy} onClick={() => void remove()}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

const clampInt = (v: string, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.floor(Number(v) || 0)));

function QuestionEditor({
  n,
  q,
  locked,
  onChange,
  onRemove,
  onMove,
}: {
  n: number;
  q: EditQuestion;
  locked: boolean;
  onChange: (p: Partial<EditQuestion>) => void;
  onRemove: () => void;
  onMove: (d: number) => void;
}) {
  const group = `q${n}`;
  return (
    <div className="asg-q" role="group" aria-label={`Question ${n}`}>
      <div className="asg-q-head">
        <strong>
          {n}. {QUESTION_TYPE_LABEL[q.type]}
        </strong>
        {!locked && (
          <span className="asg-q-tools">
            <button type="button" className="auth-back-link" aria-label={`Move question ${n} up`} onClick={() => onMove(-1)}>
              ↑
            </button>
            <button type="button" className="auth-back-link" aria-label={`Move question ${n} down`} onClick={() => onMove(1)}>
              ↓
            </button>
            <button type="button" className="auth-back-link asg-danger" aria-label={`Remove question ${n}`} onClick={onRemove}>
              Remove
            </button>
          </span>
        )}
      </div>
      <label className="report-field">
        <span className="report-field-label">Question {n}</span>
        <textarea rows={2} maxLength={2000} disabled={locked} value={q.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
      </label>
      <label className="report-field asg-points">
        <span className="report-field-label">Points</span>
        <input type="number" min={0} max={100} disabled={locked} value={q.points} onChange={(e) => onChange({ points: clampInt(e.target.value, 0, 100) })} />
      </label>
      {q.type === "mc" && (
        <fieldset className="asg-options">
          <legend className="groups-small">Options (choose the correct one)</legend>
          {q.options.map((o, i) => (
            <div key={i} className="asg-option">
              <input
                type="radio"
                name={group}
                aria-label={`Option ${i + 1} is correct`}
                disabled={locked}
                checked={q.correct === i}
                onChange={() => onChange({ correct: i })}
              />
              <input
                type="text"
                maxLength={300}
                aria-label={`Option ${i + 1}`}
                disabled={locked}
                value={o}
                onChange={(e) => onChange({ options: q.options.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              {!locked && q.options.length > 2 && (
                <button
                  type="button"
                  className="auth-back-link"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() =>
                    onChange({
                      options: q.options.filter((_, j) => j !== i),
                      correct: typeof q.correct === "number" ? (q.correct === i ? null : q.correct > i ? q.correct - 1 : q.correct) : null,
                    })
                  }
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {!locked && q.options.length < 8 && (
            <button type="button" className="auth-back-link" onClick={() => onChange({ options: [...q.options, ""] })}>
              + Option
            </button>
          )}
        </fieldset>
      )}
      {q.type === "tf" && (
        <fieldset className="asg-options">
          <legend className="groups-small">Correct answer</legend>
          <label className="groups-check">
            <input type="radio" name={group} disabled={locked} checked={q.correct === true} onChange={() => onChange({ correct: true })} /> True
          </label>
          <label className="groups-check">
            <input type="radio" name={group} disabled={locked} checked={q.correct === false} onChange={() => onChange({ correct: false })} /> False
          </label>
        </fieldset>
      )}
      {q.type === "short" && (
        <label className="report-field">
          <span className="report-field-label">Accepted answers, one per line</span>
          <textarea
            rows={2}
            disabled={locked}
            value={q.accepted.join("\n")}
            onChange={(e) => onChange({ accepted: e.target.value.split("\n").slice(0, 20) })}
          />
          <span className="groups-small">Capital letters, extra spaces and a final full stop do not matter.</span>
        </label>
      )}
      {q.type === "essay" && <p className="groups-small">You mark essays by hand, with feedback.</p>}
    </div>
  );
}

function ReadingsEditor({ readings, onChange }: { readings: Reading[]; onChange: (r: Reading[]) => void }) {
  const [kind, setKind] = useState<DeepLinkKind>("bible");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const matches = kind === "bible" ? [] : searchLibrary(kind, text);
  const add = (r: Reading) => {
    if (readings.length >= 20) return setError("At most 20 readings.");
    if (readings.some((x) => x.kind === r.kind && x.ref === r.ref)) return setError("That reading is already on the list.");
    onChange([...readings, r]);
    setText("");
    setError(null);
  };
  const addBible = () => {
    const ref = canonicalBibleRef(text);
    if (!ref) return setError('Type a passage with a chapter, like "John 3" or "Romans 8:28-39".');
    add({ kind: "bible", ref });
  };
  return (
    <fieldset className="groups-fieldset">
      <legend className="report-field-label">Readings</legend>
      {readings.length === 0 && <p className="groups-small">Each reading opens the app at that exact spot.</p>}
      <ol className="asg-readings">
        {readings.map((r, i) => {
          const t = readingTitle(r);
          return (
            <li key={`${r.kind}:${r.ref}`} className={t.missing ? "is-missing" : ""}>
              <span className="asg-reading-kind">{READING_KIND_LABEL[r.kind]}</span> {t.title}
              <button type="button" className="auth-back-link asg-danger" aria-label={`Remove reading ${t.title}`} onClick={() => onChange(readings.filter((_, j) => j !== i))}>
                ×
              </button>
            </li>
          );
        })}
      </ol>
      <div className="asg-row asg-reading-add">
        <label className="report-field">
          <span className="report-field-label">Kind</span>
          <select value={kind} onChange={(e) => (setKind(e.target.value as DeepLinkKind), setText(""), setError(null))}>
            {(Object.keys(READING_KIND_LABEL) as DeepLinkKind[]).map((k) => (
              <option key={k} value={k}>
                {READING_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="report-field asg-grow">
          <span className="report-field-label">{kind === "bible" ? "Passage" : "Search the library"}</span>
          <input
            type="text"
            value={text}
            placeholder={kind === "bible" ? "Romans 8:28-39" : "Type 2+ letters"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (kind === "bible") addBible();
              }
            }}
          />
        </label>
        {kind === "bible" && (
          <button type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline" onClick={addBible}>
            Add
          </button>
        )}
      </div>
      {matches.length > 0 && (
        <ul className="asg-matches" aria-label="Library matches">
          {matches.map((m) => (
            <li key={m.id}>
              <button type="button" className="auth-back-link" onClick={() => add({ kind, ref: m.id })}>
                + {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorLine error={error} />
    </fieldset>
  );
}

// ------------------------------------------------------------------------------------------ gradebook
function GradebookView({ c, w, onOpen }: { c: MyClass; w: GroupWording; onOpen: (submissionId: string) => void }) {
  const [g, setG] = useState<Gradebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchGradebook(c.classId)
      .then(setG)
      .catch((e) => setError((e as Error).message));
  }, [c.classId]);
  const unnamed = `A Capstone ${w.participant}`;
  const exportCsv = async () => {
    if (!g) return;
    setError(null);
    try {
      await logExport(c.classId);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const blob = new Blob([gradebookCsv(g, unnamed)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${c.name.replace(/[^A-Za-z0-9 _-]/g, "").trim() || "class"} - ${w.gradebook.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (error) return <ErrorLine error={error} />;
  if (!g) return <p className="groups-small">Loading…</p>;
  if (g.assignments.length === 0) return <p className="groups-small">Nothing published yet. The {w.gradebook.toLowerCase()} fills in as {w.participants} hand work in.</p>;

  const studentTotal = (uid: string) => {
    let got = 0;
    let of = 0;
    for (const a of g.assignments) {
      const cell = g.cells.get(cellKey(a.id, uid));
      if (cell?.finalScore != null && (cell.status === "graded" || cell.status === "submitted" || cell.status === "late")) {
        got += cell.finalScore;
        of += cell.maxPoints ?? a.maxPoints;
      }
    }
    return of > 0 ? `${fmtPoints(got)} / ${of}` : "—";
  };
  const assignmentSummary = (aid: string) => {
    const cells = g.students.map((s) => g.cells.get(cellKey(aid, s.userId))).filter((x) => x && x.submissionId);
    const scored = cells.filter((x) => x!.finalScore != null && !x!.needsGrading);
    const avg = scored.length ? scored.reduce((s, x) => s + (x!.finalScore ?? 0), 0) / scored.length : null;
    return { handedIn: cells.length, avg };
  };

  return (
    <section className="asg-section" aria-label={w.gradebook}>
      <p className="groups-small">Only you and any co-{w.admin.toLowerCase()}s can see this. Select a cell to open that {w.participant}'s work.</p>
      <div className="asg-scroll" tabIndex={0} aria-label={`${w.gradebook} table, scrolls sideways`}>
        <table className="asg-grid">
          <thead>
            <tr>
              <th scope="col">{cap(w.participant)}</th>
              {g.assignments.map((a) => (
                <th key={a.id} scope="col">
                  <span className="asg-col-title">{a.title}</span>
                  <span className="groups-small">{a.maxPoints} pts</span>
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {g.students.length === 0 && (
              <tr>
                <td colSpan={g.assignments.length + 2} className="groups-small">
                  No {w.participants} yet.
                </td>
              </tr>
            )}
            {g.students.map((s) => (
              <tr key={s.userId} className={s.active ? "" : "is-left"}>
                <th scope="row">
                  {s.name ?? unnamed}
                  {!s.active && <span className="groups-small"> (left)</span>}
                </th>
                {g.assignments.map((a) => {
                  const cell = g.cells.get(cellKey(a.id, s.userId));
                  const st = cell?.status ?? (a.dueAt && Date.parse(a.dueAt) < Date.now() ? "missing" : "not_started");
                  const label = cell?.needsGrading ? "To grade" : cell?.finalScore != null ? fmtPoints(cell.finalScore) : statusLabel(st, w.gradedLabel);
                  return (
                    <td key={a.id} className={`asg-cell asg-cell--${st}${cell?.needsGrading ? " asg-cell--tograde" : ""}`}>
                      {cell?.submissionId ? (
                        <button
                          type="button"
                          className="asg-cell-btn"
                          aria-label={`${s.name ?? unnamed}, ${a.title}: ${label}${cell.isLate ? ", late" : ""}. Open`}
                          onClick={() => onOpen(cell.submissionId!)}
                        >
                          {label}
                          {cell.isLate && <span className="asg-late"> late</span>}
                        </button>
                      ) : (
                        <span className="groups-small">{label}</span>
                      )}
                    </td>
                  );
                })}
                <td className="asg-total">{studentTotal(s.userId)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Handed in · average</th>
              {g.assignments.map((a) => {
                const sm = assignmentSummary(a.id);
                return (
                  <td key={a.id} className="groups-small">
                    {sm.handedIn} · {sm.avg == null ? "—" : fmtPoints(Math.round(sm.avg * 100) / 100)}
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline asg-export" onClick={() => void exportCsv()}>
        Export CSV
      </button>
      <p className="groups-small">The export lists names, {w.score.toLowerCase()}s and dates (no email addresses). Each export is recorded.</p>
    </section>
  );
}

// ------------------------------------------------------------------------------------------ grading one
function SubmissionGrader({ w, submissionId, onBack }: { w: GroupWording; submissionId: string; onBack: () => void }) {
  const [s, setS] = useState<StaffSubmission | null>(null);
  const [draft, setDraft] = useState<Record<string, { points: string; feedback: string }>>({});
  const [feedback, setFeedback] = useState("");
  const [waive, setWaive] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const x = await fetchStaffSubmission(submissionId);
    setS(x);
    setFeedback(x.feedback ?? "");
    setWaive(x.penaltyWaived);
    setDraft(
      Object.fromEntries(
        x.answers.map((a) => [a.questionId, { points: a.manualPoints == null ? "" : String(a.manualPoints), feedback: a.feedback ?? "" }])
      )
    );
  }, [submissionId]);
  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);
  if (!s) return error ? <ErrorLine error={error} /> : <p className="groups-small">Loading…</p>;

  const save = async (andReturn: boolean) => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const answers = s.answers
        .filter((a) => {
          const d = draft[a.questionId];
          return d && (d.points !== (a.manualPoints == null ? "" : String(a.manualPoints)) || d.feedback !== (a.feedback ?? ""));
        })
        .map((a) => {
          const d = draft[a.questionId];
          return { question_id: a.questionId, points: d.points === "" ? null : Number(d.points), feedback: d.feedback || null };
        });
      await gradeSubmission(s.id, { answers, feedback: feedback || null, waive_late_penalty: waive, reason: reason || null });
      if (andReturn) await returnSubmissions(s.assignmentId, [s.id]);
      await load();
      setReason("");
      setMsg(andReturn ? `Returned to the ${w.participant}.` : "Saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const readOnly = !s.gradingOpen;
  return (
    <section className="asg-section asg-grader" aria-label={`${s.name ?? w.participant}'s work`}>
      <button type="button" className="auth-back-link" onClick={onBack}>
        ← Back
      </button>
      <h4 className="groups-h">
        {s.name ?? `A Capstone ${w.participant}`}
        {!s.active && <span className="groups-small"> (left the {w.unit})</span>}
      </h4>
      <p className="groups-small">
        Handed in {formatDue(s.submittedAt)}
        {s.isLate && (
          <>
            {" "}
            · <strong className="asg-late">late by {s.lateDays} day{s.lateDays === 1 ? "" : "s"}</strong>
            {s.latePenaltyPct > 0 && ` (−${s.latePenaltyPct}%${s.penaltyWaived ? ", waived" : ""})`}
          </>
        )}
        {" · "}
        {s.status === "returned" ? `Returned ${formatDue(s.returnedAt)}` : s.needsGrading ? "Needs grading" : "Ready to return"}
      </p>
      <p className="asg-score">
        {fmtPoints(s.finalScore)} / {s.maxPoints}
      </p>
      {readOnly && <p className="asg-locked">Grading closed 30 days after the {w.unit} ended. This is a read-only record.</p>}
      <ol className="asg-answers">
        {s.answers.map((a, i) => {
          const d = draft[a.questionId] ?? { points: "", feedback: "" };
          return (
            <li key={a.questionId} className="asg-answer">
              <p className="asg-prompt">
                <strong>{i + 1}.</strong> {a.prompt} <span className="groups-small">({a.points} pts · {QUESTION_TYPE_LABEL[a.type]})</span>
              </p>
              <StaffAnswerBody a={a} />
              <p className="groups-small">
                {a.type === "essay"
                  ? a.autoPoints === 0 && (a.text ?? "").trim() === ""
                    ? "Left blank: 0."
                    : "Marked by you."
                  : `Marked automatically: ${a.isCorrect ? "correct" : "not correct"}, ${fmtPoints(a.autoPoints)} pts.`}
                {a.manualPoints != null && ` Your override: ${fmtPoints(a.manualPoints)} pts.`}
              </p>
              <div className="asg-row">
                <label className="report-field asg-points">
                  <span className="report-field-label">{a.type === "essay" ? "Points" : "Override points"}</span>
                  <input
                    type="number"
                    min={0}
                    max={a.points}
                    step={0.5}
                    disabled={readOnly}
                    value={d.points}
                    onChange={(e) => setDraft((x) => ({ ...x, [a.questionId]: { ...d, points: e.target.value } }))}
                  />
                </label>
                <label className="report-field asg-grow">
                  <span className="report-field-label">Feedback on this answer</span>
                  <input
                    type="text"
                    maxLength={2000}
                    disabled={readOnly}
                    value={d.feedback}
                    onChange={(e) => setDraft((x) => ({ ...x, [a.questionId]: { ...d, feedback: e.target.value } }))}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ol>
      <label className="report-field">
        <span className="report-field-label">Overall feedback</span>
        <textarea rows={3} maxLength={MAX_FEEDBACK} disabled={readOnly} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </label>
      {s.isLate && s.latePenaltyPct > 0 && (
        <label className="groups-check">
          <input type="checkbox" disabled={readOnly} checked={waive} onChange={(e) => setWaive(e.target.checked)} /> Waive the late penalty
        </label>
      )}
      {s.status === "returned" && (
        <label className="report-field">
          <span className="report-field-label">Reason for changing a returned {w.score.toLowerCase()} (required, kept in the log)</span>
          <input type="text" maxLength={500} disabled={readOnly} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
      <ErrorLine error={error} />
      {msg && (
        <p className="auth-status" role="status">
          {msg}
        </p>
      )}
      {!readOnly && (
        <div className="asg-row asg-actions">
          <button type="button" className="paid-teaser-button asg-inline" disabled={busy} onClick={() => void save(false)}>
            {busy ? "Saving…" : "Save"}
          </button>
          {s.status !== "returned" && (
            <button type="button" className="paid-teaser-button asg-inline" disabled={busy} onClick={() => void save(true)}>
              Save and return to {w.participant}
            </button>
          )}
        </div>
      )}
      {s.events.length > 0 && (
        <details className="asg-details">
          <summary>Change log ({s.events.length})</summary>
          <ul className="asg-log">
            {s.events.map((e, i) => (
              <li key={i}>
                {formatDue(e.at)} · {e.by ?? "Staff"} · {eventText(e)}
                {e.reason && <> · “{e.reason}”</>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function eventText(e: StaffSubmission["events"][number]): string {
  if (e.kind === "return") return `returned at ${fmtPoints(e.new)}`;
  if (e.kind === "waive") return e.new === 1 ? "late penalty waived" : "late penalty restored";
  if (e.kind === "final") return `total ${fmtPoints(e.old) || "—"} → ${fmtPoints(e.new)}`;
  return `answer ${fmtPoints(e.old) || "—"} → ${fmtPoints(e.new)}`;
}

function StaffAnswerBody({ a }: { a: StaffSubmission["answers"][number] }) {
  if (a.type === "mc")
    return (
      <ul className="asg-opts-view">
        {a.options.map((o, i) => (
          <li key={i} className={`${a.choice === i ? "is-chosen" : ""}${a.correct === i ? " is-key" : ""}`}>
            {o}
            {a.choice === i && <span className="asg-tag"> their answer</span>}
            {a.correct === i && <span className="asg-tag asg-tag--key"> correct</span>}
          </li>
        ))}
      </ul>
    );
  if (a.type === "tf")
    return (
      <p className="groups-small">
        Their answer: <strong>{a.value == null ? "none" : a.value ? "True" : "False"}</strong> · Correct: {a.correct === true ? "True" : "False"}
      </p>
    );
  if (a.type === "short")
    return (
      <p className="groups-small">
        Their answer: <strong>{a.text?.trim() || "none"}</strong> · Accepted: {(a.accepted ?? []).join(" / ")}
      </p>
    );
  return <div className="asg-essay">{a.text?.trim() ? a.text : <em>Left blank.</em>}</div>;
}

// ============================================================================================ member
function MemberWork({ c, w, onNavigate }: { c: MyClass; w: GroupWording; onNavigate: () => void }) {
  const [view, setView] = useState<MemberView>({ k: "list" });
  return (
    <div className="asg" data-tier="plus">
      {view.k === "list" ? (
        <MemberList c={c} w={w} onNavigate={onNavigate} onOpen={(id) => setView({ k: "take", id })} />
      ) : (
        <TakeView w={w} id={view.id} onNavigate={onNavigate} onBack={() => setView({ k: "list" })} />
      )}
    </div>
  );
}

function ReadingLinks({ readings, onNavigate }: { readings: Reading[]; onNavigate: () => void }) {
  if (readings.length === 0) return null;
  return (
    <ul className="asg-reading-links" aria-label="Readings">
      {readings.map((r) => {
        const t = readingTitle(r);
        return (
          <li key={`${r.kind}:${r.ref}`}>
            {t.missing ? (
              <span className="groups-small">{t.title}</span>
            ) : (
              <a
                href={readingHref(r)}
                className="asg-reading-link"
                onClick={(e) => {
                  e.preventDefault();
                  openInApp(r);
                  onNavigate();
                }}
              >
                <span className="asg-reading-kind">{READING_KIND_LABEL[r.kind]}</span> {t.title}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MemberList({ c, w, onOpen, onNavigate }: { c: MyClass; w: GroupWording; onOpen: (id: string) => void; onNavigate: () => void }) {
  const [data, setData] = useState<ClassAssignments | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchClassAssignments(c.classId)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [c.classId]);
  const items = data?.role === "member" ? data.items : [];
  return (
    <section className="asg-section" aria-label={w.workItems}>
      <h4 className="groups-h">{w.workItems}</h4>
      <ErrorLine error={error} />
      {data === null && !error && <p className="groups-small">Loading…</p>}
      {data && items.length === 0 && <p className="groups-small">Nothing assigned yet.</p>}
      <ul className="asg-list">
        {items.map((a) => (
          <li key={a.id} className="asg-item" data-assignment-id={a.id}>
            <button type="button" className="asg-item-main" onClick={() => onOpen(a.id)}>
              <span className="asg-item-title">{a.title}</span>
              <span className={`groups-pill asg-status--${a.status}`}>{statusLabel(a.status, w.gradedLabel)}</span>
            </button>
            <p className="groups-small">
              Due {formatDue(a.dueAt)}
              {a.status === "graded" && a.finalScore != null && ` · ${w.score}: ${fmtPoints(a.finalScore)} / ${a.maxPoints}`}
            </p>
            <ReadingLinks readings={a.readings} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TakeView({ w, id, onBack, onNavigate }: { w: GroupWording; id: string; onBack: () => void; onNavigate: () => void }) {
  const [t, setT] = useState<TakeAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const load = useCallback(async () => setT(await fetchMyAssignment(id)), [id]);
  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);
  if (!t) return error ? <ErrorLine error={error} /> : <p className="groups-small">Loading…</p>;

  const state = t.submission?.state ?? "draft";
  const editable = t.open && state === "draft" && !(t.dueAt && Date.parse(t.dueAt) < Date.now() && !t.acceptLate);
  const setQ = (qid: string, p: Partial<TakeAssignment["questions"][number]>) => {
    setT((x) => (x ? { ...x, questions: x.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)) } : x));
    setDirty(true);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      await saveDraft(t.id, answersPayload(t.questions));
      setDirty(false);
      setMsg("Draft saved. Only you can see it until you hand it in.");
    });
  const submit = () =>
    run(async () => {
      const blanks = t.questions.filter((q) => (q.type === "mc" ? q.choice == null : q.type === "tf" ? q.value == null : !q.text.trim())).length;
      const warn = blanks ? ` ${blanks} question${blanks === 1 ? " is" : "s are"} unanswered.` : "";
      if (!window.confirm(`Hand in "${t.title}"? You can only hand it in once.${warn}`)) return;
      const r = await submitAssignment(t.id, answersPayload(t.questions));
      await load();
      setDirty(false);
      setMsg(r.returned ? "Handed in and marked." : `Handed in${r.late ? " (late)" : ""}. Your ${w.admin.toLowerCase()} will return it with feedback.`);
    });

  const sub = t.submission;
  const returned = state === "returned";
  const late = t.dueAt && Date.parse(t.dueAt) < Date.now();
  return (
    <section className="asg-section asg-take" aria-label={t.title}>
      <button type="button" className="auth-back-link" onClick={onBack}>
        ← All {w.workItems.toLowerCase()}
      </button>
      <h4 className="groups-h">{t.title}</h4>
      <p className="groups-small">
        Due {formatDue(t.dueAt)}
        {sub && ` · ${statusLabel(sub.status, w.gradedLabel)}`}
        {late && state === "draft" && (t.acceptLate ? (t.latePenaltyPerDay > 0 ? ` · late work loses ${t.latePenaltyPerDay}% a day (up to ${t.latePenaltyMax}%)` : " · late work is accepted") : " · no longer accepting work")}
      </p>
      {!t.open && state === "draft" && <p className="asg-locked">This {w.unit} has ended, so work can no longer be handed in.</p>}
      {returned && (
        <div className="asg-result" role="status">
          {sub?.finalScore != null ? (
            <p className="asg-score">
              {w.score}: {fmtPoints(sub.finalScore)} / {sub.maxPoints}
              {sub.latePenaltyPct ? <span className="groups-small"> (late: −{sub.latePenaltyPct}%)</span> : null}
            </p>
          ) : (
            <p className="asg-score">{w.gradedLabel}</p>
          )}
          {sub?.feedback && <p className="asg-feedback">{sub.feedback}</p>}
        </div>
      )}
      {state === "submitted" && <p className="auth-status">Handed in {formatDue(sub?.submittedAt ?? null)}. Waiting for your {w.admin.toLowerCase()}.</p>}
      {t.instructions && <p className="asg-instructions">{t.instructions}</p>}
      <ReadingLinks readings={t.readings} onNavigate={onNavigate} />
      <ol className="asg-answers">
        {t.questions.map((q, i) => (
          <li key={q.id} className="asg-answer">
            <fieldset className="asg-q-take" disabled={!editable}>
              <legend className="asg-prompt">
                <strong>{i + 1}.</strong> {q.prompt} <span className="groups-small">({q.points} pts)</span>
              </legend>
              {q.type === "mc" &&
                q.options.map((o, j) => (
                  <label key={j} className={`groups-check${returned && q.correct === j ? " is-key" : ""}`}>
                    <input type="radio" name={`a-${q.id}`} checked={q.choice === j} onChange={() => setQ(q.id, { choice: j })} /> {o}
                    {returned && q.correct === j && <span className="asg-tag asg-tag--key"> correct answer</span>}
                  </label>
                ))}
              {q.type === "tf" &&
                [true, false].map((v) => (
                  <label key={String(v)} className={`groups-check${returned && q.correct === v ? " is-key" : ""}`}>
                    <input type="radio" name={`a-${q.id}`} checked={q.value === v} onChange={() => setQ(q.id, { value: v })} /> {v ? "True" : "False"}
                    {returned && q.correct === v && <span className="asg-tag asg-tag--key"> correct answer</span>}
                  </label>
                ))}
              {q.type === "short" && (
                <label className="report-field">
                  <span className="report-field-label">Your answer</span>
                  <input type="text" maxLength={MAX_SHORT} value={q.text} onChange={(e) => setQ(q.id, { text: e.target.value })} />
                </label>
              )}
              {q.type === "essay" && (
                <label className="report-field">
                  <span className="report-field-label">Your answer</span>
                  <textarea rows={6} maxLength={MAX_ESSAY} value={q.text} onChange={(e) => setQ(q.id, { text: e.target.value })} />
                  <span className="groups-small">
                    {q.text.length.toLocaleString()} / {MAX_ESSAY.toLocaleString()}
                  </span>
                </label>
              )}
            </fieldset>
            {returned && q.type === "short" && q.accepted && <p className="groups-small">Accepted: {q.accepted.join(" / ")}</p>}
            {returned && (q.earned != null || q.feedback) && (
              <p className="groups-small asg-q-result">
                {q.earned != null && `${fmtPoints(q.earned)} / ${q.points} pts`}
                {q.earned != null && q.feedback && " · "}
                {q.feedback}
              </p>
            )}
          </li>
        ))}
      </ol>
      <ErrorLine error={error} />
      {msg && (
        <p className="auth-status" role="status">
          {msg}
        </p>
      )}
      {editable && (
        <div className="asg-row asg-actions">
          <button type="button" className="paid-teaser-button paid-teaser-button--quiet asg-inline" disabled={busy || !dirty} onClick={() => void save()}>
            {busy ? "Saving…" : "Save draft"}
          </button>
          <button type="button" className="paid-teaser-button asg-inline" disabled={busy} onClick={() => void submit()}>
            Hand it in
          </button>
        </div>
      )}
      <p className="groups-small">{w.privacyNote}</p>
    </section>
  );
}

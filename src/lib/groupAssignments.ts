/**
 * groupAssignments.ts — Capstone Plus for Groups phase 4 (sql/048): assignments, taking them, grading.
 * Imported only by the lazy Groups chunk (components/GroupsSheet.tsx); nothing here is in the main bundle.
 *
 * TRUST: none of this decides anything. Answer keys never reach a student's browser (sql/048 keeps
 * them in a table no client can read; the student RPCs redact; the grader runs in submit_assignment on
 * the server). The staff RPCs re-check that the caller teaches THIS class. What this file mirrors (caps,
 * shapes) is only so a form can say what is wrong before the server refuses it.
 */
import { supabase } from "./supabase";
import { groupErrorMessage } from "./groups";
import { canonicalVerseRef } from "./studyCollections";
import { recordName } from "./collectionItemInfo";
import { deepLinkHref, type DeepLink, type DeepLinkKind } from "./deepLink";
import { locations } from "../data/locations";
import { pois } from "../data/pois";
import { people } from "../data/people";
import { topics } from "../data/topics";
import { timelineEvents } from "../data/timelineEvents";

// ------------------------------------------------------------------------------- caps (sql/048)
export const MAX_QUESTIONS = 50;
export const MAX_READINGS = 20;
export const MAX_OPTIONS = 8;
export const MAX_ACCEPTED = 20;
export const MAX_SHORT = 500;
export const MAX_ESSAY = 20000;
export const MAX_PROMPT = 2000;
export const MAX_INSTRUCTIONS = 10000;
export const MAX_FEEDBACK = 5000;
export const MAX_ANSWER_FEEDBACK = 2000;
export const MAX_POINTS_PER_QUESTION = 100;
export const MAX_POINTS_TOTAL = 1000;

// ------------------------------------------------------------------------------- readings
export type Reading = DeepLink & { label?: string | null };

export const READING_KIND_LABEL: Record<DeepLinkKind, string> = {
  bible: "Scripture",
  place: "Place",
  site: "Site",
  person: "Person",
  topic: "Article",
  event: "Timeline event",
};

/** What a reading is called on screen: the teacher's label, else the record's current name. */
export function readingTitle(r: Reading): { title: string; missing: boolean } {
  if (r.label) return { title: r.label, missing: false };
  if (r.kind === "bible") return { title: r.ref, missing: false };
  const n = recordName(r.kind, r.ref);
  return { title: n.missing ? "No longer in the library" : n.name, missing: n.missing };
}

export const readingHref = (r: Reading) => deepLinkHref({ kind: r.kind, ref: r.ref });

/** Library search for the reading picker: up to 8 records of one kind whose name contains the text. */
export function searchLibrary(kind: Exclude<DeepLinkKind, "bible">, q: string): { id: string; name: string }[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const rows: { id: string; name: string }[] =
    kind === "place" ? locations.map((r) => ({ id: r.id, name: r.name }))
    : kind === "site" ? pois.map((r) => ({ id: r.id, name: r.name }))
    : kind === "person" ? people.map((r) => ({ id: r.id, name: r.name }))
    : kind === "topic" ? topics.map((r) => ({ id: r.id, name: r.name }))
    : timelineEvents.map((r) => ({ id: r.id, name: r.title }));
  return rows.filter((r) => r.name.toLowerCase().includes(needle)).slice(0, 8);
}

export const canonicalBibleRef = canonicalVerseRef;

// ------------------------------------------------------------------------------- shapes
export type QuestionType = "mc" | "tf" | "short" | "essay";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  mc: "Multiple choice",
  tf: "True / false",
  short: "Short answer",
  essay: "Essay",
};

/** The teacher's editable question (keys included: this shape exists only for staff). */
export interface EditQuestion {
  id?: string;
  type: QuestionType;
  prompt: string;
  points: number;
  options: string[];
  /** mc: option index; tf: boolean */
  correct: number | boolean | null;
  accepted: string[];
}

export interface AssignmentDoc {
  id?: string;
  classId: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  acceptLate: boolean;
  latePenaltyPerDay: number;
  latePenaltyMax: number;
  autoRelease: boolean;
  showCorrectAnswers: boolean;
  publishedAt: string | null;
  locked: boolean;
  readings: Reading[];
  questions: EditQuestion[];
}

export function blankAssignment(classId: string): AssignmentDoc {
  return {
    classId,
    title: "",
    instructions: "",
    dueAt: null,
    acceptLate: true,
    latePenaltyPerDay: 0,
    latePenaltyMax: 100,
    autoRelease: false,
    showCorrectAnswers: false,
    publishedAt: null,
    locked: false,
    readings: [],
    questions: [],
  };
}

export function blankQuestion(type: QuestionType): EditQuestion {
  return {
    type,
    prompt: "",
    points: type === "essay" ? 10 : 1,
    options: type === "mc" ? ["", ""] : [],
    correct: type === "tf" ? true : type === "mc" ? null : null,
    accepted: type === "short" ? [""] : [],
  };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && !isNaN(Number(v)) ? Number(v) : d);
const isKind = (v: unknown): v is DeepLinkKind => ["bible", "place", "site", "person", "topic", "event"].includes(String(v));

function toReadings(v: unknown): Reading[] {
  return Array.isArray(v)
    ? (v as Record<string, unknown>[]).filter((r) => isKind(r.kind)).map((r) => ({ kind: r.kind as DeepLinkKind, ref: str(r.ref), label: typeof r.label === "string" ? r.label : null }))
    : [];
}

/** Problems the server would refuse, worded for the form. Empty = ready to save. */
export function assignmentProblems(a: AssignmentDoc): string[] {
  const p: string[] = [];
  if (!a.title.trim()) p.push("Give the assignment a title.");
  if (a.title.length > 200) p.push("The title is 200 characters at most.");
  if (a.instructions.length > MAX_INSTRUCTIONS) p.push("Instructions are 10,000 characters at most.");
  if (a.readings.length > MAX_READINGS) p.push(`At most ${MAX_READINGS} readings.`);
  if (a.questions.length > MAX_QUESTIONS) p.push(`At most ${MAX_QUESTIONS} questions.`);
  let total = 0;
  a.questions.forEach((q, i) => {
    const n = i + 1;
    total += q.points;
    if (!q.prompt.trim()) p.push(`Question ${n} needs a prompt.`);
    if (q.prompt.length > MAX_PROMPT) p.push(`Question ${n}'s prompt is too long.`);
    if (!Number.isInteger(q.points) || q.points < 0 || q.points > MAX_POINTS_PER_QUESTION) p.push(`Question ${n}: points are 0 to 100.`);
    if (q.type === "mc") {
      const opts = q.options.map((o) => o.trim());
      if (opts.length < 2 || opts.length > MAX_OPTIONS || opts.some((o) => !o || o.length > 300)) p.push(`Question ${n} needs 2 to 8 filled-in options.`);
      if (typeof q.correct !== "number" || q.correct >= opts.length) p.push(`Mark the correct option for question ${n}.`);
    }
    if (q.type === "tf" && typeof q.correct !== "boolean") p.push(`Mark true or false for question ${n}.`);
    if (q.type === "short") {
      const acc = q.accepted.map((x) => x.trim()).filter(Boolean);
      if (acc.length < 1 || acc.length > MAX_ACCEPTED || acc.some((x) => x.length > 200)) p.push(`Question ${n} needs 1 to 20 accepted answers.`);
    }
  });
  if (total > MAX_POINTS_TOTAL) p.push("An assignment is worth 1,000 points at most.");
  return p;
}

// ------------------------------------------------------------------------------- staff calls
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(groupErrorMessage(error));
  return data as T;
}

export async function fetchStaffAssignment(id: string): Promise<AssignmentDoc> {
  const d = await rpc<Record<string, unknown>>("staff_assignment", { p_assignment_id: id });
  return {
    id: str(d.id),
    classId: str(d.class_id),
    title: str(d.title),
    instructions: str(d.instructions),
    dueAt: typeof d.due_at === "string" ? d.due_at : null,
    acceptLate: d.accept_late !== false,
    latePenaltyPerDay: num(d.late_penalty_pct_per_day),
    latePenaltyMax: num(d.late_penalty_max_pct, 100),
    autoRelease: d.auto_release === true,
    showCorrectAnswers: d.show_correct_answers === true,
    publishedAt: typeof d.published_at === "string" ? d.published_at : null,
    locked: d.locked === true,
    readings: toReadings(d.readings),
    questions: Array.isArray(d.questions)
      ? (d.questions as Record<string, unknown>[]).map((q) => ({
          id: str(q.id),
          type: (["mc", "tf", "short", "essay"].includes(str(q.type)) ? q.type : "essay") as QuestionType,
          prompt: str(q.prompt),
          points: num(q.points),
          options: Array.isArray(q.options) ? (q.options as unknown[]).map(str) : [],
          correct: typeof q.correct === "number" || typeof q.correct === "boolean" ? q.correct : null,
          accepted: Array.isArray(q.accepted) ? (q.accepted as unknown[]).map(str) : [],
        }))
      : [],
  };
}

export async function saveAssignment(a: AssignmentDoc): Promise<{ id: string; locked: boolean }> {
  const p: Record<string, unknown> = {
    id: a.id ?? null,
    class_id: a.classId,
    title: a.title.trim(),
    instructions: a.instructions,
    due_at: a.dueAt,
    accept_late: a.acceptLate,
    late_penalty_pct_per_day: a.latePenaltyPerDay,
    late_penalty_max_pct: a.latePenaltyMax,
    auto_release: a.autoRelease,
    show_correct_answers: a.showCorrectAnswers,
    readings: a.readings.map((r) => ({ kind: r.kind, ref: r.ref, label: r.label ?? null })),
  };
  // Questions and keys only while unlocked: sql/048 refuses them once a student has started.
  if (!a.locked)
    p.questions = a.questions.map((q) => ({
      type: q.type,
      prompt: q.prompt.trim(),
      points: q.points,
      ...(q.type === "mc" ? { options: q.options.map((o) => o.trim()), correct: q.correct } : {}),
      ...(q.type === "tf" ? { correct: q.correct } : {}),
      ...(q.type === "short" ? { accepted: q.accepted.map((x) => x.trim()).filter(Boolean) } : {}),
    }));
  const d = await rpc<{ assignment_id?: string; locked?: boolean }>("save_assignment", { p });
  return { id: d.assignment_id ?? "", locked: d.locked === true };
}

export const publishAssignment = (id: string, publish: boolean) => rpc<void>("publish_assignment", { p_assignment_id: id, p_publish: publish });
export const deleteAssignment = (id: string) => rpc<void>("delete_assignment", { p_assignment_id: id });
export const duplicateAssignment = (id: string) => rpc<string>("duplicate_assignment", { p_assignment_id: id });
export const returnSubmissions = (assignmentId: string, ids: string[] | null) =>
  rpc<number>("return_submissions", { p_assignment_id: assignmentId, p_submission_ids: ids });
export const setScoresVisible = (classId: string, visible: boolean) => rpc<void>("set_class_scores_visible", { p_class_id: classId, p_visible: visible });

// ------------------------------------------------------------------------------- the list
export type StudentStatus = "not_started" | "in_progress" | "submitted" | "late" | "graded" | "missing";

export interface StaffListItem {
  id: string;
  title: string;
  dueAt: string | null;
  publishedAt: string | null;
  maxPoints: number;
  questions: number;
  readings: number;
  submitted: number;
  toGrade: number;
  toReturn: number;
  locked: boolean;
}

export interface MemberListItem {
  id: string;
  title: string;
  dueAt: string | null;
  readings: Reading[];
  status: StudentStatus;
  isLate: boolean;
  finalScore: number | null;
  maxPoints: number | null;
}

export type ClassAssignments =
  | { role: "staff"; items: StaffListItem[] }
  | { role: "member"; scoresVisible: boolean; items: MemberListItem[] };

const asStatus = (v: unknown): StudentStatus =>
  (["not_started", "in_progress", "submitted", "late", "graded", "missing"].includes(String(v)) ? v : "not_started") as StudentStatus;

export async function fetchClassAssignments(classId: string): Promise<ClassAssignments> {
  const d = await rpc<Record<string, unknown>>("class_assignments", { p_class_id: classId });
  const rows = Array.isArray(d.assignments) ? (d.assignments as Record<string, unknown>[]) : [];
  if (d.role === "staff")
    return {
      role: "staff",
      items: rows.map((r) => ({
        id: str(r.id),
        title: str(r.title),
        dueAt: typeof r.due_at === "string" ? r.due_at : null,
        publishedAt: typeof r.published_at === "string" ? r.published_at : null,
        maxPoints: num(r.max_points),
        questions: num(r.questions),
        readings: num(r.readings),
        submitted: num(r.submitted),
        toGrade: num(r.to_grade),
        toReturn: num(r.to_return),
        locked: r.locked === true,
      })),
    };
  return {
    role: "member",
    scoresVisible: d.scores_visible === true,
    items: rows.map((r) => ({
      id: str(r.id),
      title: str(r.title),
      dueAt: typeof r.due_at === "string" ? r.due_at : null,
      readings: toReadings(r.readings),
      status: asStatus(r.status),
      isLate: r.is_late === true,
      finalScore: r.final_score == null ? null : num(r.final_score),
      maxPoints: r.max_points == null ? null : num(r.max_points),
    })),
  };
}

// ------------------------------------------------------------------------------- student: take
export interface TakeQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  points: number;
  choice: number | null;
  value: boolean | null;
  text: string;
  /** After return only (and only if scores show). */
  earned: number | null;
  feedback: string | null;
  /** After return only, and only if the teacher chose to show answers. */
  correct: number | boolean | null;
  accepted: string[] | null;
}

export interface TakeAssignment {
  id: string;
  classId: string;
  kind: "school" | "church";
  className: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  acceptLate: boolean;
  latePenaltyPerDay: number;
  latePenaltyMax: number;
  open: boolean;
  readings: Reading[];
  submission: null | {
    status: StudentStatus;
    state: "draft" | "submitted" | "returned";
    savedAt: string | null;
    submittedAt: string | null;
    isLate: boolean;
    feedback: string | null;
    finalScore: number | null;
    maxPoints: number | null;
    latePenaltyPct: number | null;
  };
  questions: TakeQuestion[];
}

export async function fetchMyAssignment(id: string): Promise<TakeAssignment> {
  const d = await rpc<Record<string, unknown>>("my_assignment", { p_assignment_id: id });
  const s = d.submission as Record<string, unknown> | null;
  return {
    id: str(d.id),
    classId: str(d.class_id),
    kind: d.kind === "school" ? "school" : "church",
    className: str(d.class_name),
    title: str(d.title),
    instructions: str(d.instructions),
    dueAt: typeof d.due_at === "string" ? d.due_at : null,
    acceptLate: d.accept_late !== false,
    latePenaltyPerDay: num(d.late_penalty_pct_per_day),
    latePenaltyMax: num(d.late_penalty_max_pct, 100),
    open: d.open === true,
    readings: toReadings(d.readings),
    submission: s
      ? {
          status: asStatus(s.status),
          state: s.state === "returned" ? "returned" : s.state === "submitted" ? "submitted" : "draft",
          savedAt: typeof s.saved_at === "string" ? s.saved_at : null,
          submittedAt: typeof s.submitted_at === "string" ? s.submitted_at : null,
          isLate: s.is_late === true,
          feedback: typeof s.feedback === "string" ? s.feedback : null,
          finalScore: s.final_score == null ? null : num(s.final_score),
          maxPoints: s.max_points == null ? null : num(s.max_points),
          latePenaltyPct: s.late_penalty_pct == null ? null : num(s.late_penalty_pct),
        }
      : null,
    questions: Array.isArray(d.questions)
      ? (d.questions as Record<string, unknown>[]).map((q) => ({
          id: str(q.id),
          type: (["mc", "tf", "short", "essay"].includes(str(q.type)) ? q.type : "essay") as QuestionType,
          prompt: str(q.prompt),
          options: Array.isArray(q.options) ? (q.options as unknown[]).map(str) : [],
          points: num(q.points),
          choice: typeof q.choice === "number" ? q.choice : null,
          value: typeof q.value === "boolean" ? q.value : null,
          text: str(q.text),
          earned: q.earned == null ? null : num(q.earned),
          feedback: typeof q.feedback === "string" ? q.feedback : null,
          correct: typeof q.correct === "number" || typeof q.correct === "boolean" ? q.correct : null,
          accepted: Array.isArray(q.accepted) ? (q.accepted as unknown[]).map(str) : null,
        }))
      : [],
  };
}

export type AnswerPayload = { question_id: string; choice?: number | null; value?: boolean | null; text?: string | null };

export function answersPayload(qs: TakeQuestion[]): AnswerPayload[] {
  return qs.map((q) =>
    q.type === "mc" ? { question_id: q.id, choice: q.choice } : q.type === "tf" ? { question_id: q.id, value: q.value } : { question_id: q.id, text: q.text }
  );
}

export const saveDraft = (assignmentId: string, answers: AnswerPayload[]) =>
  rpc<{ ok: boolean }>("save_assignment_draft", { p_assignment_id: assignmentId, p_answers: answers });
export const submitAssignment = (assignmentId: string, answers: AnswerPayload[]) =>
  rpc<{ ok: boolean; late?: boolean; returned?: boolean }>("submit_assignment", { p_assignment_id: assignmentId, p_answers: answers });

// ------------------------------------------------------------------------------- gradebook
export interface Gradebook {
  students: { userId: string; name: string | null; active: boolean }[];
  assignments: { id: string; title: string; dueAt: string | null; maxPoints: number }[];
  cells: Map<string, GradeCell>;
}

export interface GradeCell {
  assignmentId: string;
  userId: string;
  submissionId: string | null;
  status: StudentStatus;
  isLate: boolean;
  needsGrading: boolean;
  finalScore: number | null;
  maxPoints: number | null;
  submittedAt: string | null;
}

export const cellKey = (assignmentId: string, userId: string) => `${assignmentId}|${userId}`;

export async function fetchGradebook(classId: string): Promise<Gradebook> {
  const d = await rpc<Record<string, unknown>>("class_gradebook", { p_class_id: classId });
  const cells = new Map<string, GradeCell>();
  for (const c of Array.isArray(d.cells) ? (d.cells as Record<string, unknown>[]) : []) {
    const cell: GradeCell = {
      assignmentId: str(c.assignment_id),
      userId: str(c.user_id),
      submissionId: typeof c.submission_id === "string" ? c.submission_id : null,
      status: asStatus(c.status),
      isLate: c.is_late === true,
      needsGrading: c.needs_grading === true,
      finalScore: c.final_score == null ? null : num(c.final_score),
      maxPoints: c.max_points == null ? null : num(c.max_points),
      submittedAt: typeof c.submitted_at === "string" ? c.submitted_at : null,
    };
    cells.set(cellKey(cell.assignmentId, cell.userId), cell);
  }
  return {
    students: (Array.isArray(d.students) ? (d.students as Record<string, unknown>[]) : []).map((s) => ({
      userId: str(s.user_id),
      name: typeof s.display_name === "string" ? s.display_name : null,
      active: s.active === true,
    })),
    assignments: (Array.isArray(d.assignments) ? (d.assignments as Record<string, unknown>[]) : []).map((a) => ({
      id: str(a.id),
      title: str(a.title),
      dueAt: typeof a.due_at === "string" ? a.due_at : null,
      maxPoints: num(a.max_points),
    })),
    cells,
  };
}

/** One CSV cell. Quotes always; a leading = + - @ (or tab / CR) is prefixed with ' so a spreadsheet
 * never runs a student's display name as a formula (CSV injection). */
export function csvCell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Plan §9: display name, assignment, score, out of, status, submitted at, late. No emails. */
export function gradebookCsv(g: Gradebook, unnamed: string): string {
  const lines = [["Name", "Assignment", "Score", "Out of", "Status", "Submitted at", "Late", "Still in class"].map(csvCell).join(",")];
  for (const s of g.students) {
    for (const a of g.assignments) {
      const c = g.cells.get(cellKey(a.id, s.userId));
      lines.push(
        [
          s.name ?? unnamed,
          a.title,
          c?.finalScore ?? "",
          c?.maxPoints ?? a.maxPoints,
          c?.status ?? (a.dueAt && Date.parse(a.dueAt) < Date.now() ? "missing" : "not_started"),
          c?.submittedAt ?? "",
          c?.isLate ? "yes" : "no",
          s.active ? "yes" : "no",
        ]
          .map(csvCell)
          .join(",")
      );
    }
  }
  return lines.join("\r\n") + "\r\n";
}

export const logExport = (classId: string) => rpc<void>("log_gradebook_export", { p_class_id: classId });

// ------------------------------------------------------------------------------- one submission (staff)
export interface StaffAnswer {
  questionId: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  points: number;
  correct: number | boolean | null;
  accepted: string[] | null;
  choice: number | null;
  value: boolean | null;
  text: string | null;
  autoPoints: number | null;
  isCorrect: boolean | null;
  manualPoints: number | null;
  feedback: string | null;
}

export interface StaffSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  name: string | null;
  active: boolean;
  status: "submitted" | "returned";
  submittedAt: string | null;
  returnedAt: string | null;
  isLate: boolean;
  lateDays: number;
  latePenaltyPct: number;
  penaltyWaived: boolean;
  maxPoints: number;
  rawPoints: number | null;
  finalScore: number | null;
  needsGrading: boolean;
  feedback: string | null;
  gradingOpen: boolean;
  answers: StaffAnswer[];
  events: { kind: string; old: number | null; new: number | null; reason: string | null; at: string; by: string | null }[];
}

export async function fetchStaffSubmission(id: string): Promise<StaffSubmission> {
  const d = await rpc<Record<string, unknown>>("staff_submission", { p_submission_id: id });
  return {
    id: str(d.id),
    assignmentId: str(d.assignment_id),
    userId: str(d.user_id),
    name: typeof d.display_name === "string" ? d.display_name : null,
    active: d.active === true,
    status: d.status === "returned" ? "returned" : "submitted",
    submittedAt: typeof d.submitted_at === "string" ? d.submitted_at : null,
    returnedAt: typeof d.returned_at === "string" ? d.returned_at : null,
    isLate: d.is_late === true,
    lateDays: num(d.late_days),
    latePenaltyPct: num(d.late_penalty_pct),
    penaltyWaived: d.penalty_waived === true,
    maxPoints: num(d.max_points),
    rawPoints: d.raw_points == null ? null : num(d.raw_points),
    finalScore: d.final_score == null ? null : num(d.final_score),
    needsGrading: d.needs_grading === true,
    feedback: typeof d.feedback === "string" ? d.feedback : null,
    gradingOpen: d.grading_open === true,
    answers: (Array.isArray(d.answers) ? (d.answers as Record<string, unknown>[]) : []).map((a) => ({
      questionId: str(a.question_id),
      type: (["mc", "tf", "short", "essay"].includes(str(a.type)) ? a.type : "essay") as QuestionType,
      prompt: str(a.prompt),
      options: Array.isArray(a.options) ? (a.options as unknown[]).map(str) : [],
      points: num(a.points),
      correct: typeof a.correct === "number" || typeof a.correct === "boolean" ? a.correct : null,
      accepted: Array.isArray(a.accepted) ? (a.accepted as unknown[]).map(str) : null,
      choice: typeof a.choice === "number" ? a.choice : null,
      value: typeof a.value === "boolean" ? a.value : null,
      text: typeof a.text === "string" ? a.text : null,
      autoPoints: a.auto_points == null ? null : num(a.auto_points),
      isCorrect: typeof a.is_correct === "boolean" ? a.is_correct : null,
      manualPoints: a.manual_points == null ? null : num(a.manual_points),
      feedback: typeof a.feedback === "string" ? a.feedback : null,
    })),
    events: (Array.isArray(d.events) ? (d.events as Record<string, unknown>[]) : []).map((e) => ({
      kind: str(e.kind),
      old: e.old == null ? null : num(e.old),
      new: e.new == null ? null : num(e.new),
      reason: typeof e.reason === "string" ? e.reason : null,
      at: str(e.at),
      by: typeof e.by === "string" ? e.by : null,
    })),
  };
}

export interface GradeInput {
  answers?: { question_id: string; points?: number | null; feedback?: string | null }[];
  feedback?: string | null;
  waive_late_penalty?: boolean;
  reason?: string | null;
}

export const gradeSubmission = (id: string, p: GradeInput) =>
  rpc<{ final_score: number | null; needs_grading: boolean }>("grade_submission", { p_submission_id: id, p });

// ------------------------------------------------------------------------------- display helpers
export function formatDue(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "No due date";
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** datetime-local value (the browser's own time zone) <-> ISO. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function statusLabel(s: StudentStatus, gradedLabel: string): string {
  switch (s) {
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "submitted":
      return "Submitted";
    case "late":
      return "Submitted late";
    case "graded":
      return gradedLabel;
    case "missing":
      return "Missing";
  }
}

export const fmtPoints = (n: number | null | undefined) => (n == null ? "" : Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));

/**
 * Capstone Plus for Groups phase 4 (sql/048, src/lib/groupAssignments.ts, components/GroupAssignments.tsx).
 *
 *   node scripts/signed-in-harness/run.mjs --persona teacher --viewport 390x844 \
 *     --script scripts/signed-in-harness/examples/groups-assignments.mjs
 *   node scripts/signed-in-harness/run.mjs --persona teacher --viewport 1280x800 \
 *     --script scripts/signed-in-harness/examples/groups-assignments.mjs
 *
 * One run drives teacher, student and outsider against one fake database. Proves, against the real
 * production build:
 *   1. teacher: "Assignments & gradebook" on the class card; the list (Published/Draft, counts);
 *      the editor: readings (Scripture canonicalised, library search), MC/TF/short/essay with keys,
 *      Save and publish sends save_assignment + publish_assignment; NO price, class id from the card.
 *   2. a LOCKED assignment: the lock note shows, question inputs are disabled, and Save sends NO
 *      `questions` key (sql/048 would refuse it).
 *   3. gradebook: students x assignments, "To grade" cell opens the submission with the answer key and
 *      the essay; points + feedback + Save and return sends grade_submission then
 *      return_submissions([id]); CSV export calls log_gradebook_export FIRST and the file escapes a
 *      display name that looks like a formula.
 *   4. student: their list (status, due, readings), a reading link closes the menu and opens the app
 *      at that place; drafts save; Hand it in sends only {question_id, choice|value|text}; a returned
 *      assignment shows the grade, feedback and (when the teacher chose) the correct answer.
 *      The student never calls a staff RPC.
 *   5. church wording: a returned church-group assignment says "Reviewed" and shows no number.
 *   6. outsider: no class, no Assignments button, no assignment RPC.
 *   7. `?open=person:<id>` on load opens that person and is stripped from the address bar.
 *
 * Cannot prove: real RLS, real grading, key secrecy (sql/tests/048_groups_assignments_test.sql
 * proves those). The RPCs below are a stand-in that answers what each persona's client expects.
 */

const TEACHER = "00000000-0000-4000-8000-000000000007";
const STUDENT = "00000000-0000-4000-8000-000000000008";
const CLASS_A = "0c0c0c0c-0000-4000-8000-000000000001";
const CLASS_CH = "0c0c0c0c-0000-4000-8000-000000000003";
const A1 = "0a0a0a0a-0000-4000-8000-000000000001";
const A2 = "0a0a0a0a-0000-4000-8000-000000000002";
const ACH = "0a0a0a0a-0000-4000-8000-000000000003";
const SUB1 = "05050505-0000-4000-8000-000000000001";
const Q = (n) => `0e0e0e0e-0000-4000-8000-00000000000${n}`;
const SNEAKY = "=HYPERLINK(\"http://x.invalid\",\"x\")";

const INIT = `
  (() => {
    window.confirm = () => true;
    window.__opens = [];
    window.addEventListener("capstone:open", (e) => window.__opens.push(e.detail));
    window.__csv = [];
    const orig = URL.createObjectURL;
    URL.createObjectURL = function (b) { if (b && b.text) b.text().then((t) => window.__csv.push(t)); return orig.call(URL, b); };
  })();
`;

const STAFF_RPCS = ["staff_assignment", "class_gradebook", "staff_submission", "grade_submission", "return_submissions", "save_assignment", "publish_assignment", "log_gradebook_export"];
const ASG_RPCS = [...STAFF_RPCS, "class_assignments", "my_assignment", "save_assignment_draft", "submit_assignment"];

function install(h, log) {
  const who = () => h.backend.persona?.id ?? null;
  const deny = () => {
    throw { status: 403, code: "42501", message: "not_class_staff: only this class's teacher or leader can do that" };
  };
  const rec = (name) => (args) => (log.push({ name, args }), args);
  h.backend.setRpc("groups_status", () => ({ groups_enabled: true }));
  h.backend.setRpc("my_classes", () => {
    if (who() === TEACHER)
      return [{ class_id: CLASS_A, kind: "school", name: "Bible 101", status: "active", role: "owner", org_name: "Valley Christian School",
                seats_requested: 10, seats_purchased: 10, seat_cap: 50, seats_used: 3, join_code: "K7M2QX", billing_interval: "month", billing_status: "active" }];
    if (who() === STUDENT)
      return [
        { class_id: CLASS_A, kind: "school", name: "Bible 101", status: "active", role: "member", org_name: "Valley Christian School", leader_name: "Harness Teacher" },
        { class_id: CLASS_CH, kind: "church", name: "Tuesday Study", status: "active", role: "member", org_name: "Grace Church", leader_name: "Pastor Dan" },
      ];
    return [];
  });
  const readings = [
    { kind: "bible", ref: "Romans 1:1-17", label: null },
    { kind: "place", ref: "jerusalem", label: null },
    { kind: "person", ref: "paul-of-tarsus", label: null },
  ];
  h.backend.setRpc("class_assignments", ({ p_class_id }) => {
    rec("class_assignments")({ p_class_id });
    if (who() === TEACHER && p_class_id === CLASS_A)
      return { role: "staff", assignments: [
        { id: A1, title: "Week 1: Romans 1", due_at: "2027-01-15T17:00:00Z", published_at: "2026-11-20T00:00:00Z", max_points: 16, questions: 4, readings: 3, submitted: 2, to_grade: 1, to_return: 1, locked: true },
        { id: A2, title: "Week 2 (draft)", due_at: null, published_at: null, max_points: 0, questions: 0, readings: 0, submitted: 0, to_grade: 0, to_return: 0, locked: false },
      ] };
    if (who() === STUDENT && p_class_id === CLASS_A)
      return { role: "member", scores_visible: true, assignments: [
        { id: A1, title: "Week 1: Romans 1", due_at: "2027-01-15T17:00:00Z", readings, status: log.submitted ? "submitted" : "in_progress", is_late: false, final_score: null, max_points: null },
      ] };
    if (who() === STUDENT && p_class_id === CLASS_CH)
      return { role: "member", scores_visible: false, assignments: [
        { id: ACH, title: "Read John 1", due_at: null, readings: [{ kind: "bible", ref: "John 1", label: null }], status: "graded", is_late: false, final_score: null, max_points: null },
      ] };
    throw { status: 403, code: "42501", message: "not_found" };
  });
  h.backend.setRpc("staff_assignment", ({ p_assignment_id }) => {
    if (who() !== TEACHER) deny();
    return {
      id: p_assignment_id, class_id: CLASS_A, title: "Week 1: Romans 1", instructions: "Read, then answer.", due_at: "2027-01-15T17:00:00Z",
      accept_late: true, late_penalty_pct_per_day: 10, late_penalty_max_pct: 30, auto_release: false, show_correct_answers: false,
      published_at: "2026-11-20T00:00:00Z", locked: true, readings,
      questions: [
        { id: Q(1), type: "mc", prompt: "Who wrote Romans?", options: ["Peter", "Paul", "James"], points: 2, correct: 1, accepted: null },
        { id: Q(2), type: "essay", prompt: "What is the gospel?", options: null, points: 10, correct: null, accepted: null },
      ],
    };
  });
  h.backend.setRpc("save_assignment", ({ p }) => {
    if (who() !== TEACHER) deny();
    log.push({ name: "save_assignment", args: p });
    return { assignment_id: p.id ?? "0a0a0a0a-0000-4000-8000-000000000099", locked: !!p.id };
  });
  h.backend.setRpc("publish_assignment", (args) => (who() !== TEACHER && deny(), rec("publish_assignment")(args), null));
  h.backend.setRpc("class_gradebook", ({ p_class_id }) => {
    if (who() !== TEACHER || p_class_id !== CLASS_A) deny();
    return {
      students: [
        { user_id: STUDENT, display_name: "Harness Student", active: true },
        { user_id: "00000000-0000-4000-8000-0000000000b2", display_name: SNEAKY, active: true },
        { user_id: "00000000-0000-4000-8000-0000000000b3", display_name: "Ruth B.", active: false },
      ],
      assignments: [{ id: A1, title: "Week 1: Romans 1", due_at: "2027-01-15T17:00:00Z", max_points: 16 }],
      cells: [
        { assignment_id: A1, user_id: STUDENT, submission_id: SUB1, status: "submitted", is_late: false, needs_grading: true, final_score: 2, max_points: 16, submitted_at: "2026-11-21T10:00:00Z" },
        { assignment_id: A1, user_id: "00000000-0000-4000-8000-0000000000b3", submission_id: "05050505-0000-4000-8000-000000000003", status: "graded", is_late: true, needs_grading: false, final_score: 11, max_points: 16, submitted_at: "2026-11-21T09:00:00Z" },
      ],
    };
  });
  h.backend.setRpc("staff_submission", ({ p_submission_id }) => {
    if (who() !== TEACHER) deny();
    return {
      id: p_submission_id, assignment_id: A1, user_id: STUDENT, display_name: "Harness Student", active: true, status: "submitted",
      submitted_at: "2026-11-21T10:00:00Z", returned_at: null, is_late: false, late_days: 0, late_penalty_pct: 0, penalty_waived: false,
      max_points: 12, raw_points: 2, final_score: 2, needs_grading: true, feedback: null, grading_open: true,
      answers: [
        { question_id: Q(1), type: "mc", prompt: "Who wrote Romans?", options: ["Peter", "Paul", "James"], points: 2, correct: 1, accepted: null, choice: 1, value: null, text: null, auto_points: 2, is_correct: true, manual_points: null, feedback: null },
        { question_id: Q(2), type: "essay", prompt: "What is the gospel?", options: null, points: 10, correct: null, accepted: null, choice: null, value: null, text: "Christ died for our sins and rose again.", auto_points: null, is_correct: null, manual_points: null, feedback: null },
      ],
      events: [],
    };
  });
  h.backend.setRpc("grade_submission", (args) => (who() !== TEACHER && deny(), rec("grade_submission")(args), { final_score: 9, needs_grading: false }));
  h.backend.setRpc("return_submissions", (args) => (who() !== TEACHER && deny(), rec("return_submissions")(args), 1));
  h.backend.setRpc("log_gradebook_export", (args) => (who() !== TEACHER && deny(), rec("log_gradebook_export")(args), null));

  const takeQs = (returned) => [
    { id: Q(1), type: "mc", prompt: "Who wrote Romans?", options: ["Peter", "Paul", "James"], points: 2, choice: 1, value: null, text: null,
      earned: returned ? 2 : null, feedback: null, correct: returned ? 1 : null, accepted: null },
    { id: Q(3), type: "tf", prompt: "Romans was written to Corinth.", options: null, points: 1, choice: null, value: null, text: null,
      earned: returned ? 0 : null, feedback: null, correct: returned ? false : null, accepted: null },
    { id: Q(4), type: "short", prompt: "Paul's earlier name?", options: null, points: 3, choice: null, value: null, text: "", earned: returned ? 3 : null,
      feedback: null, correct: null, accepted: returned ? ["Saul"] : null },
    { id: Q(2), type: "essay", prompt: "What is the gospel?", options: null, points: 10, choice: null, value: null, text: "", earned: returned ? 7.5 : null,
      feedback: returned ? "Good start." : null, correct: null, accepted: null },
  ];
  h.backend.setRpc("my_assignment", ({ p_assignment_id }) => {
    if (who() !== STUDENT) throw { status: 403, code: "42501", message: "not_found" };
    if (p_assignment_id === ACH)
      return { id: ACH, class_id: CLASS_CH, kind: "church", class_name: "Tuesday Study", title: "Read John 1", instructions: null, due_at: null, accept_late: true,
               late_penalty_pct_per_day: 0, late_penalty_max_pct: 100, open: true, readings: [{ kind: "bible", ref: "John 1", label: null }],
               submission: { status: "graded", state: "returned", saved_at: null, submitted_at: "2026-11-20T00:00:00Z", is_late: false, returned_at: "2026-11-20T01:00:00Z",
                             feedback: "Thanks for sharing.", final_score: null, max_points: null, late_penalty_pct: null },
               questions: [{ id: Q(5), type: "tf", prompt: "In the beginning was the Word.", options: null, points: 1, choice: null, value: true, text: null, earned: null, feedback: null, correct: null, accepted: null }] };
    const returned = !!log.returnedView;
    return {
      id: A1, class_id: CLASS_A, kind: "school", class_name: "Bible 101", title: "Week 1: Romans 1", instructions: "Read, then answer.",
      due_at: "2027-01-15T17:00:00Z", accept_late: true, late_penalty_pct_per_day: 10, late_penalty_max_pct: 30, open: true, readings,
      submission: returned
        ? { status: "graded", state: "returned", saved_at: null, submitted_at: "2026-11-21T10:00:00Z", is_late: false, returned_at: "2026-11-21T12:00:00Z",
            feedback: "Well done overall.", final_score: 12.5, max_points: 16, late_penalty_pct: 0 }
        : log.submitted
        ? { status: "submitted", state: "submitted", saved_at: null, submitted_at: "2026-11-21T10:00:00Z", is_late: false, returned_at: null, feedback: null, final_score: null, max_points: null, late_penalty_pct: null }
        : { status: "in_progress", state: "draft", saved_at: "2026-11-21T09:00:00Z", submitted_at: null, is_late: false, returned_at: null, feedback: null, final_score: null, max_points: null, late_penalty_pct: null },
      questions: takeQs(returned),
    };
  });
  h.backend.setRpc("save_assignment_draft", (args) => (who() !== STUDENT && deny(), rec("save_assignment_draft")(args), { ok: true }));
  h.backend.setRpc("submit_assignment", (args) => {
    if (who() !== STUDENT) deny();
    rec("submit_assignment")(args);
    log.submitted = true;
    return { ok: true, late: false, returned: false };
  });
}

async function openMenu(h) {
  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
}
async function openGroups(h) {
  await openMenu(h);
  await h.click({ css: ".auth-menu-item", text: "Classes & Groups" });
  await h.waitFor(".groups-sheet");
  await h.sleep(400);
}
const calls = (h, from, names) => h.requests.slice(from).filter((r) => names.some((n) => r.path === `/rest/v1/rpc/${n}`));
const last = (log, name) => [...log].reverse().find((l) => l.name === name)?.args;
const fits = (h) =>
  h.evaluate(() => {
    const vw = window.innerWidth;
    const wide = [...document.querySelectorAll(".groups-sheet *")].filter((e) => {
      if (e.closest(".asg-scroll")) return false; // the gradebook scrolls sideways inside its own box
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > vw + 1 || r.left < -1);
    });
    return { vw, overflow: wide.length, first: wide[0]?.className ?? null, scrollW: document.documentElement.scrollWidth };
  });
const setField = (h, label, value, root = ".asg") =>
  h.evaluate(
    (label, value, root) => {
      const lab = [...document.querySelectorAll(`${root} label.report-field`)].find((l) => l.querySelector(".report-field-label")?.textContent?.trim().startsWith(label));
      const el = lab?.querySelector("input, textarea, select");
      if (!el) return false;
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, String(value));
      el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      return true;
    },
    label,
    value,
    root
  );
const setNth = (h, css, i, value) =>
  h.evaluate(
    (css, i, value) => {
      const el = document.querySelectorAll(css)[i];
      if (!el) return false;
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, String(value));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    },
    css,
    i,
    value
  );

export default async function (h) {
  await h.addInitScript(INIT);
  const log = [];
  const vw = () => h.evaluate(() => window.innerWidth);

  // ------------------------------------------------------------------------------------------ 1
  h.section("1. teacher: list and a new assignment");
  await h.asPersona("teacher");
  install(h, log);
  await h.reload();
  await h.sleep(800);
  await openGroups(h);
  h.assert(await h.exists({ css: `[data-class-id="${CLASS_A}"] button`, text: "Assignments & gradebook" }), "class card offers Assignments & gradebook");
  await h.click({ css: `[data-class-id="${CLASS_A}"] button`, text: "Assignments & gradebook" });
  await h.waitFor(".asg-list");
  await h.sleep(300);
  let t = await h.text(".asg");
  h.assert(/Week 1: Romans 1/.test(t) && /Published/.test(t) && /Draft/.test(t), "list shows the published and the draft assignment");
  h.assert(/2 handed in · 1 to grade · 1 ready to return/.test(t), "list shows handed-in / to grade / to return counts");
  h.assert(await h.exists({ css: "button", text: "Return 1 to students" }), "Return N to students offered (school wording)");
  let f = await fits(h);
  h.assert(f.overflow === 0 && f.scrollW <= f.vw, `teacher list fits ${f.vw}px (${f.overflow} ${f.first ?? ""})`);
  await h.screenshot(`asg-teacher-list-${await vw()}.png`);

  await h.click({ css: "button", text: "New assignment" });
  await h.waitFor(".asg-form");
  await setField(h, "Title", "Week 3: Romans 8");
  await setField(h, "Instructions", "Read Romans 8 and answer.");
  await setField(h, "Due (your time)", "2027-02-01T09:00");
  await setField(h, "Passage", "romans 8:28-39");
  await h.click({ css: ".asg-reading-add button", text: "Add" });
  await setField(h, "Kind", "place");
  await setField(h, "Search the library", "jerus");
  await h.sleep(200);
  await h.click({ css: ".asg-matches button", text: "Jerusalem" });
  await h.sleep(150);
  t = await h.text(".asg-readings");
  h.assert(/Scripture\s+Romans 8:28-39/i.test(t) && /Place\s+Jerusalem/i.test(t), `readings: canonical passage + library place (${t?.replace(/\s+/g, " ")})`);
  await h.click({ css: ".asg-addq button", text: "+ Multiple choice" });
  await h.click({ css: ".asg-addq button", text: "+ True / false" });
  await h.click({ css: ".asg-addq button", text: "+ Short answer" });
  await h.click({ css: ".asg-addq button", text: "+ Essay" });
  await h.sleep(200);
  await setNth(h, ".asg-q textarea", 0, "Who wrote Romans?");
  await setNth(h, ".asg-option input[type=text]", 0, "Peter");
  await setNth(h, ".asg-option input[type=text]", 1, "Paul");
  h.assert(await h.exists(".groups-problems"), "incomplete: problems listed (no correct option yet)");
  h.assert(await h.evaluate(() => document.querySelector('.asg-actions button[type=submit]')?.disabled === true), "Save disabled while incomplete");
  await h.click('[aria-label="Option 2 is correct"]');
  await setNth(h, ".asg-q textarea", 1, "Romans was written to Corinth.");
  await h.evaluate(() => {
    const qs = document.querySelectorAll(".asg-q");
    const r = [...qs[1].querySelectorAll("label.groups-check")].find((l) => /False/.test(l.textContent))?.querySelector("input");
    r?.click();
  });
  await setNth(h, ".asg-q textarea", 2, "Paul's earlier name?");
  await setNth(h, ".asg-q textarea", 3, "Saul\nSaul of Tarsus");
  await setNth(h, ".asg-q textarea", 4, "What does 'no condemnation' mean?");
  await h.sleep(200);
  h.assert(!(await h.exists(".groups-problems")), "complete form: no problems");
  f = await fits(h);
  h.assert(f.overflow === 0 && f.scrollW <= f.vw, `editor fits ${f.vw}px (${f.overflow} ${f.first ?? ""})`);
  await h.screenshot(`asg-teacher-editor-${await vw()}.png`);
  await h.click({ css: ".asg-actions button", text: "Save and publish" });
  await h.sleep(800);
  const saved = log.find((l) => l.name === "save_assignment")?.args ?? {};
  h.assert(saved.class_id === CLASS_A && !saved.id && saved.title === "Week 3: Romans 8", "save_assignment: new, for this class, with the title");
  h.assert(JSON.stringify(saved.readings) === JSON.stringify([{ kind: "bible", ref: "Romans 8:28-39", label: null }, { kind: "place", ref: "jerusalem", label: null }]), `readings sent as typed refs (${JSON.stringify(saved.readings)})`);
  const qs = saved.questions ?? [];
  h.assert(qs.length === 4 && qs[0].type === "mc" && qs[0].correct === 1 && qs[1].correct === false && JSON.stringify(qs[2].accepted) === '["Saul","Saul of Tarsus"]' && qs[3].type === "essay",
    "questions + keys sent by the TEACHER (mc index, tf false, short accepted list, essay)");
  h.assert(typeof saved.due_at === "string" && saved.due_at.startsWith("2027-02-01"), "due date sent as an ISO instant");
  h.assert(!JSON.stringify(saved).includes("price"), "no price anywhere");
  h.assert(log.some((l) => l.name === "publish_assignment" && l.args.p_publish === true), "publish_assignment(true) called after the save");

  // ------------------------------------------------------------------------------------------ 2
  h.section("2. a locked assignment");
  await h.click({ css: ".asg-tab", text: "Assignments" });
  await h.sleep(300);
  await h.click({ css: `[data-assignment-id="${A1}"] .asg-item-main` });
  await h.waitFor(".asg-locked");
  h.assert(/questions and answers are locked/.test(await h.text(".asg-locked")), "lock note shows");
  h.assert(await h.evaluate(() => [...document.querySelectorAll(".asg-q textarea, .asg-q input")].every((e) => e.disabled)), "every question input is disabled");
  h.assert(!(await h.exists(".asg-addq")), "no add-question buttons when locked");
  const before = log.length;
  await h.click({ css: ".asg-actions button", text: "Save" });
  await h.sleep(600);
  const lockedSave = log.slice(before).find((l) => l.name === "save_assignment")?.args ?? {};
  h.assert(lockedSave.id === A1 && !("questions" in lockedSave), "locked save sends NO questions key");
  h.assert(await h.exists({ css: ".asg-actions button", text: "Duplicate" }) && !(await h.exists({ css: ".asg-actions button", text: "Unpublish" })), "Duplicate offered; no Unpublish once started");

  // ------------------------------------------------------------------------------------------ 3
  h.section("3. gradebook, one submission, CSV");
  await h.click({ css: ".asg-tab", text: "Gradebook" });
  await h.waitFor(".asg-grid");
  await h.sleep(300);
  t = await h.text(".asg-grid");
  h.assert(/Harness Student/.test(t) && /To grade/.test(t) && /Ruth B\.\s*\(left\)/.test(t) && /late/.test(t), "gradebook: names, To grade, a student who left, a late flag");
  h.assert(/Handed in · average/.test(t), "per-assignment summary row");
  f = await fits(h);
  h.assert(f.overflow === 0 && f.scrollW <= f.vw, `gradebook page fits ${f.vw}px (table scrolls inside its box)`);
  await h.screenshot(`asg-gradebook-${await vw()}.png`);
  const mark = h.requests.length;
  await h.click({ css: ".asg-export", text: "Export CSV" });
  await h.sleep(600);
  const exp = h.requests.slice(mark).map((r) => r.path);
  h.assert(exp.includes("/rest/v1/rpc/log_gradebook_export"), "export is logged on the server");
  await h.sleep(400);
  const csvAll = await h.evaluate(() => window.__csv);
  // Other code also makes blob URLs (a worker); the export is the one that starts with the header.
  const csv = csvAll.find((x) => x.startsWith('"Name"')) ?? "";
  h.assert(/"Name","Assignment","Score","Out of","Status","Submitted at","Late","Still in class"/.test(csv), "CSV header");
  h.assert(csv.includes(`"'=HYPERLINK(""http://x.invalid"",""x"")"`) && !csv.includes(`"=HYPERLINK`), "a formula-looking name is neutralised in the CSV");
  h.assert(!csv.includes("@"), "no email addresses in the export");

  await h.click({ css: ".asg-cell-btn", text: "To grade" });
  await h.waitFor(".asg-grader");
  t = await h.text(".asg-grader");
  h.assert(/correct/i.test(t) && /their answer/i.test(t), "teacher sees the key beside the student's choice");
  h.assert(/Christ died for our sins/.test(t), "teacher sees the essay");
  await setNth(h, ".asg-grader .asg-answer input[type=number]", 1, "7.5");
  await setNth(h, ".asg-grader .asg-answer input[type=text]", 1, "Good start.");
  await setField(h, "Overall feedback", "Well done overall.", ".asg-grader");
  f = await fits(h);
  h.assert(f.overflow === 0 && f.scrollW <= f.vw, `grading view fits ${f.vw}px`);
  await h.screenshot(`asg-grade-${await vw()}.png`);
  await h.click({ css: ".asg-actions button", text: "Save and return to student" });
  await h.sleep(800);
  const g = last(log, "grade_submission") ?? {};
  h.assert(g.p_submission_id === SUB1 && JSON.stringify(g.p?.answers) === JSON.stringify([{ question_id: Q(2), points: 7.5, feedback: "Good start." }]) && g.p?.feedback === "Well done overall.",
    `grade_submission sends only the changed answer + feedback (${JSON.stringify(g.p)})`);
  const rt = last(log, "return_submissions") ?? {};
  h.assert(rt.p_assignment_id === A1 && JSON.stringify(rt.p_submission_ids) === JSON.stringify([SUB1]), "then return_submissions for exactly this submission");

  // ------------------------------------------------------------------------------------------ 4
  h.section("4. student: list, a reading link, draft, hand in, results");
  await h.asPersona("student");
  install(h, log);
  let m = h.requests.length;
  await h.reload();
  await h.sleep(800);
  await openGroups(h);
  await h.click({ css: `[data-class-id="${CLASS_A}"] button`, text: "Assignments" });
  await h.waitFor(".asg-list");
  await h.sleep(300);
  t = await h.text(".asg");
  h.assert(/Week 1: Romans 1/.test(t) && /In progress/.test(t) && /Due /.test(t), "student list: title, status, due");
  h.assert(/Scripture\s+Romans 1:1-17/i.test(t) && /Place\s+Jerusalem/i.test(t) && /Person\s+Paul/i.test(t), "readings listed by their current names");
  h.assert(!/Gradebook/.test(t) && !(await h.exists(".asg-tabs")), "no gradebook for a student");
  f = await fits(h);
  h.assert(f.overflow === 0 && f.scrollW <= f.vw, `student list fits ${f.vw}px`);
  await h.screenshot(`asg-student-list-${await vw()}.png`);
  const href = await h.evaluate(() => [...document.querySelectorAll(".asg-reading-link")].find((a) => /Jerusalem/.test(a.textContent))?.getAttribute("href"));
  h.assert(href === "?open=place%3Ajerusalem", `reading href is the deep link (${href})`);
  await h.click({ css: ".asg-reading-link", text: "Jerusalem" });
  await h.sleep(900);
  h.assert(!(await h.exists(".groups-sheet")), "the menu closes");
  const opens = await h.evaluate(() => window.__opens);
  h.assert(opens.length === 1 && opens[0].kind === "place" && opens[0].ref === "jerusalem", "the app was asked to open place:jerusalem");
  h.assert(await h.evaluate(() => [...document.querySelectorAll("h1,h2,h3")].some((e) => /^Jerusalem/.test(e.innerText.trim()))), "the Jerusalem article is open");

  await openGroups(h);
  await h.click({ css: `[data-class-id="${CLASS_A}"] button`, text: "Assignments" });
  await h.waitFor(".asg-list");
  await h.click({ css: `[data-assignment-id="${A1}"] .asg-item-main` });
  await h.waitFor(".asg-take");
  await h.sleep(300);
  h.assert(!/correct answer/i.test(await h.text(".asg-take")), "no correct answer shown before return");
  await h.evaluate(() => {
    const qs = document.querySelectorAll(".asg-take .asg-answer");
    [...qs[1].querySelectorAll("label")].find((l) => /True/.test(l.textContent))?.querySelector("input")?.click();
  });
  await setField(h, "Your answer", "Saul", ".asg-take");
  await setNth(h, ".asg-take textarea", 0, "Christ died for our sins and rose again.");
  await h.click({ css: ".asg-actions button", text: "Save draft" });
  await h.sleep(500);
  const dr = last(log, "save_assignment_draft") ?? {};
  h.assert(dr.p_assignment_id === A1 && dr.p_answers?.length === 4, "draft saves all four answers");
  h.assert(/Only you can see it/.test(await h.text(".asg-take")), "draft saved message says it is private");
  f = await fits(h);
  h.assert(f.overflow === 0 && f.scrollW <= f.vw, `take view fits ${f.vw}px`);
  await h.screenshot(`asg-student-take-${await vw()}.png`);
  await h.click({ css: ".asg-actions button", text: "Hand it in" });
  await h.sleep(800);
  const sb = last(log, "submit_assignment") ?? {};
  const keysOk = (sb.p_answers ?? []).every((a) => Object.keys(a).every((k) => ["question_id", "choice", "value", "text"].includes(k)));
  h.assert(sb.p_assignment_id === A1 && keysOk && JSON.stringify(sb.p_answers?.[1]) === JSON.stringify({ question_id: Q(3), value: true }), "submit sends only answers (no points, no correctness)");
  h.assert(/Waiting for your teacher/.test(await h.text(".asg-take")), "after hand-in: waiting for the teacher");
  h.assert(!(await h.exists({ css: ".asg-actions button", text: "Hand it in" })), "cannot hand in twice from the UI");
  h.assert(calls(h, m, STAFF_RPCS).length === 0, "the student never called a staff rpc");

  log.returnedView = true;
  await h.click({ css: ".asg-take .auth-back-link" });
  await h.sleep(300);
  await h.click({ css: `[data-assignment-id="${A1}"] .asg-item-main` });
  await h.waitFor(".asg-result");
  t = await h.text(".asg-take");
  h.assert(/Grade: 12\.5 \/ 16/.test(t) && /Well done overall\./.test(t) && /Good start\./.test(t), "returned: grade, overall and per-answer feedback");
  h.assert(/correct answer/i.test(t) && /Accepted: Saul/.test(t), "returned with answers shown: correct answer and accepted list");
  await h.screenshot(`asg-student-returned-${await vw()}.png`);

  // ------------------------------------------------------------------------------------------ 5
  h.section("5. church wording: Reviewed, no number");
  await h.click({ css: ".groups-sheet .report-sheet-head .auth-back-link" });
  await h.sleep(400);
  await h.click({ css: `[data-class-id="${CLASS_CH}"] button`, text: "Assignments" });
  await h.waitFor(".asg-list");
  await h.sleep(300);
  t = await h.text(".asg");
  h.assert(/Reviewed/.test(t) && !/Graded/.test(t) && !/Score:/.test(t), "church list: Reviewed, no score");
  await h.click({ css: `[data-assignment-id="${ACH}"] .asg-item-main` });
  await h.waitFor(".asg-result");
  t = await h.text(".asg-result");
  h.assert(/Reviewed/.test(t) && !/\d+ \/ \d+/.test(t) && /Thanks for sharing/.test(t), "church returned: Reviewed + feedback, no number");
  h.assert(/Your leader will see your answers/.test(await h.text(".asg-take")), "church privacy wording (leader)");

  // ------------------------------------------------------------------------------------------ 6
  h.section("6. outsider");
  await h.asPersona("outsider");
  install(h, log);
  m = h.requests.length;
  await h.reload();
  await h.sleep(800);
  await openGroups(h);
  h.assert(!(await h.exists({ css: "button", text: "Assignments" })), "outsider: no Assignments button");
  h.assert(calls(h, m, ASG_RPCS).length === 0, "outsider: no assignment rpc called");

  // ------------------------------------------------------------------------------------------ 7
  h.section("7. ?open= on load");
  await h.goto("/?open=person:paul-of-tarsus");
  await h.sleep(1500);
  h.assert(!(await h.evaluate(() => location.search.includes("open="))), "?open= stripped from the address bar");
  h.assert(await h.evaluate(() => [...document.querySelectorAll("h1,h2,h3")].some((e) => /Paul/.test(e.innerText))), "the person's article is open");
  await h.goto("/?open=place:not%20an%20id%3Cscript%3E");
  await h.sleep(1200);
  h.assert(!(await h.evaluate(() => location.search.includes("open="))), "a malformed ?open= is stripped and ignored");
}

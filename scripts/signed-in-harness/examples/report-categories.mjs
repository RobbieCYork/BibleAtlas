/**
 * Report a Problem: categories instead of voting (sql/052, branch report-categories).
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/report-categories.mjs
 *   (also --persona administrator / owner, and at 1280x800)
 *
 * member:         the form's category is required; after sql/052 it offers the ten area categories and
 *                 preselects the one the screen makes obvious; BEFORE sql/052 (six old categories) it
 *                 preselects nothing and still files a report; My Reports names a report filed under the
 *                 retired `typo` category by its real label; no voting wording anywhere; no Admin Console.
 * administrator / owner:
 *                 Admin Console -> Reports: category tabs with counts that follow the status chips; a
 *                 retired category with reports shows as its own "(retired)" tab; a tab filters the list;
 *                 no vote, priority or "Highest priority" anywhere; open a report -> Category -> Re-file
 *                 sends ONE PATCH of `category` and the counts move; no phone-width overflow.
 * Every persona:  report_vote is never called.
 *
 * The fake backend does NOT enforce RLS or triggers — who can re-file and that votes cannot be written is
 * proven by scripts/sql-rehearsal/052_report_categories_no_voting.mjs. This proves the UI and its wiring.
 */
import { PERSONAS } from "../lib/personas.mjs";

const OLD = [
  { key: "bug", label: "Something is broken", sort_order: 10, is_active: true },
  { key: "incorrect_info", label: "Incorrect information", sort_order: 20, is_active: true },
  { key: "typo", label: "Typo or grammar", sort_order: 30, is_active: true },
  { key: "theological", label: "Theological concern", sort_order: 40, is_active: true },
  { key: "idea", label: "Idea or suggestion", sort_order: 50, is_active: true },
  { key: "other", label: "Something else", sort_order: 90, is_active: true },
].map((c) => ({ description: null, ...c }));
const NEW = [
  ["incorrect_info", "Content error (article, map or timeline facts)", 10, true],
  ["bible_reader", "Bible reader", 20, true],
  ["map", "Map", 30, true],
  ["timeline", "Timeline", 40, true],
  ["games", "Games", 50, true],
  ["account", "Account or sign-in", 60, true],
  ["bug", "Something is broken", 70, true],
  ["theological", "Theological concern", 75, true],
  ["idea", "Suggestion", 80, true],
  ["other", "Other", 90, true],
  ["typo", "Typo or grammar", 95, false],
].map(([key, label, sort_order, is_active]) => ({ key, label, sort_order, is_active, description: `${label} hint` }));

const me = PERSONAS[process.env.HARNESS_PERSONA ?? ""] ?? null;
const OTHER = "00000000-0000-4000-8000-0000000000ff";
const row = (id, category, status, title, reporter = OTHER) => ({
  id, reporter_id: reporter, category, status, title, body: `${title} body`, reporter_severity: null,
  created_at: "2026-11-20T10:00:00Z", updated_at: "2026-11-20T10:00:00Z", page_title: "Bible reader", route: "bible",
  target_kind: null, target_id: null, target_label: null, selected_text: null, resolution_note: null, resolved_at: null,
  page_url: null, build_id: null, user_agent: null, viewport_w: null, viewport_h: null, platform: null,
  duplicate_of: null, assigned_to: null, app_context: {}, resolved_by: null, triaged_at: null,
  // sql/025's frozen vote columns: still returned by the real report_list(), must never be drawn.
  vote_agree: 7, vote_disagree: 3, priority_score: "4", my_vote: 1,
});

const VOTE_WORDS = /\b(vote|votes|voted|voting|agree|disagree|priority)\b/i;
const overflowX = (h) => h.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 ||
  [...document.querySelectorAll(".report-sheet *, .report-embedded *")].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1; }));
const selectValue = (h, sel, value) => h.evaluate((s, v) => {
  const el = document.querySelector(s);
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, v);
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, sel, value);

function installReportRpcs(h, getRows, cats) {
  const label = (k) => cats().find((c) => c.key === k)?.label ?? null;
  h.backend.setRpc("report_list", (a) => {
    let out = getRows().filter((r) => (!a.p_status || a.p_status.includes(r.status)) && (!a.p_category || r.category === a.p_category));
    if (a.p_search) out = out.filter((r) => (r.title + r.body).toLowerCase().includes(a.p_search.toLowerCase()));
    const total = out.length;
    out = out.slice(a.p_offset ?? 0, (a.p_offset ?? 0) + (a.p_limit ?? 50));
    return out.map((r) => ({ ...r, category_label: label(r.category), reporter_name: "Someone", total_count: String(total) }));
  });
  h.backend.setRpc("report_detail", (a) => {
    const r = getRows().find((x) => x.id === a.p_report_id);
    return { report: r, reporter_name: "Someone", category_label: label(r.category), history: [],
      votes: [{ voter_id: OTHER, voter_name: "Old Advisor", voter_role: "advisor", vote: 1, note: "old vote note", updated_at: r.created_at }] };
  });
  h.backend.setRpc("report_counts", () => {
    const rows = getRows();
    const open = rows.filter((r) => ["new", "triaged", "accepted", "in_progress"].includes(r.status)).length;
    return { by_status: {}, by_category: {}, open, untriaged: rows.filter((r) => r.status === "new").length, unvoted_by_me: 99 };
  });
}

export default async (h) => {
  const persona = h.persona;
  const isStaff = persona === "administrator" || persona === "owner";
  const meId = (PERSONAS[persona] ?? me)?.id;

  // ------------------------------------------------------------------ member / everyone: the form
  h.section(`${persona}: the form after sql/052`);
  h.backend.setTable("report_categories", NEW);
  h.backend.setTable("reports", [row("00000000-0000-4000-8000-000000000001", "typo", "triaged", "Old typo report", meId)]);
  await h.reload(); await h.sleep(1200);

  await h.click('[aria-label="Settings and account"]'); await h.sleep(300);
  await h.click({ css: ".auth-menu-item", text: "Report a Problem" });
  await h.waitFor(".report-sheet select"); await h.sleep(600);
  const form = await h.evaluate(() => {
    const s = document.querySelector(".report-sheet select");
    return { from: document.querySelector(".report-context-line")?.textContent ?? "", value: s.value, required: s.required,
      options: [...s.options].map((o) => o.value).filter(Boolean), text: document.querySelector(".report-sheet").innerText };
  });
  h.assert(form.required, "category is required");
  h.assert(form.options.join() === "incorrect_info,bible_reader,map,timeline,games,account,bug,theological,idea,other",
    `form offers the ten active categories, retired typo hidden: ${form.options}`);
  const expected = /Bible reader/.test(form.from) ? "bible_reader" : /Map/.test(form.from) ? "map" : "";
  h.assert(form.value === expected, `preselected "${form.value}" for "${form.from.trim()}" (expected "${expected}")`);
  h.assert(!VOTE_WORDS.test(form.text), "form has no voting wording");
  h.assert(!(await overflowX(h)), "form: no sideways overflow");
  await h.screenshot(`form-${persona}.png`);

  await selectValue(h, ".report-sheet select", "games");
  await h.type(".report-sheet input[type=text]", "Harness games report");
  await h.type(".report-sheet textarea", "Filed by report-categories.");
  await h.click({ css: ".report-sheet button", text: "Send report" }); await h.sleep(700);
  const ins = h.writes.find((w) => w.table === "reports" && w.op === "insert");
  h.assert(ins?.rows?.[0]?.category === "games", `insert carries the chosen category: ${ins?.rows?.[0]?.category}`);
  h.assert(!VOTE_WORDS.test(await h.text(".report-sheet")), "thank-you screen has no voting wording");

  await h.click({ css: ".report-sheet button", text: "See my reports" }); await h.sleep(800);
  const mine = await h.text(".report-sheet");
  h.assert(/Old typo report/.test(mine) && /Typo or grammar/.test(mine), "My Reports shows the retired category by its label");
  h.assert(!/\btypo\b/.test(mine.replace(/Typo or grammar|Old typo report|Old typo report body/g, "")), "My Reports never shows the raw key");
  await h.click({ css: ".report-sheet button", text: "← Back" }); await h.sleep(300);

  // ------------------------------------------------------------------ before sql/052
  h.section(`${persona}: the form BEFORE sql/052 (six old categories)`);
  h.backend.setTable("report_categories", OLD);
  await h.reload(); await h.sleep(1200);
  await h.click('[aria-label="Settings and account"]'); await h.sleep(300);
  await h.click({ css: ".auth-menu-item", text: "Report a Problem" });
  await h.waitFor(".report-sheet select"); await h.sleep(600);
  const before = await h.evaluate(() => { const s = document.querySelector(".report-sheet select"); return { value: s.value, n: [...s.options].filter((o) => o.value).length }; });
  h.assert(before.n === 6 && before.value === "", `old list: 6 options, nothing preselected (${JSON.stringify(before)})`);
  await h.type(".report-sheet input[type=text]", "Pre-052 report");
  await h.type(".report-sheet textarea", "Still files.");
  h.assert(await h.evaluate(() => [...document.querySelectorAll(".report-sheet button")].find((b) => b.textContent.includes("Send report")).disabled), "Send disabled until a category is chosen");
  await selectValue(h, ".report-sheet select", "bug");
  await h.click({ css: ".report-sheet button", text: "Send report" }); await h.sleep(700);
  h.assert(h.writes.some((w) => w.table === "reports" && w.rows?.[0]?.title === "Pre-052 report" && w.rows[0].category === "bug"), "pre-052: report still submits");
  await h.click({ css: ".report-sheet button", text: "Done" }); await h.sleep(300);

  // ------------------------------------------------------------------ admin console
  h.section(`${persona}: Admin Console reports`);
  h.backend.setTable("report_categories", NEW);
  const rows = [
    row("00000000-0000-4000-8000-0000000000a1", "typo", "new", "Retired typo one"),
    row("00000000-0000-4000-8000-0000000000a2", "incorrect_info", "new", "Wrong date"),
    row("00000000-0000-4000-8000-0000000000a3", "incorrect_info", "resolved", "Fixed date"),
    row("00000000-0000-4000-8000-0000000000a4", "map", "triaged", "Marker missing"),
    row("00000000-0000-4000-8000-0000000000a5", "bug", "new", "Button dead"),
  ];
  // The fake's PATCH changes its own copy of `reports`; the rpcs re-read the same edits from the write
  // log so report_list / report_detail see a re-file the way the real functions would.
  const live = () => rows.map((r) => {
    const ups = h.writes.filter((w) => w.table === "reports" && w.op === "update").flatMap((w) => w.rows).filter((x) => x.id === r.id);
    return ups.length ? { ...r, category: ups.at(-1).category } : r;
  });
  installReportRpcs(h, live, () => NEW);
  h.backend.setTable("reports", rows);
  await h.reload(); await h.sleep(1200);
  await h.sleep(1500);
  // Not lib/app.mjs's openAdminConsole: its exact-text match misses the row once the untriaged badge
  // ("Admin Console3") is drawn, which it is here because these fixtures hold new reports.
  await h.click('[aria-label="Settings and account"]'); await h.sleep(400);
  const opened = await h.exists({ css: ".auth-menu-item", text: "Admin Console" });
  if (opened) {
    h.assert(/Admin Console\s*3$/.test(await h.text({ css: ".auth-menu-item", text: "Admin Console" })), "menu badge shows 3 untriaged");
    await h.click({ css: ".auth-menu-item", text: "Admin Console" });
    await h.waitFor('[role=tablist][aria-label="Admin sections"]');
  }
  if (!isStaff) {
    h.assert(!opened, `${persona} has no Admin Console`);
  } else {
    h.assert(opened, "Admin Console opens");
    await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Reports" });
    await h.waitFor(".report-category-tabs"); await h.sleep(900);
    const tabs = () => h.evaluate(() => [...document.querySelectorAll(".report-category-tab")].map((t) => t.innerText.replace(/\s+/g, " ").trim()));
    let t = await tabs();
    // Default status filter is open (new, triaged, accepted, in_progress): 4 rows.
    h.assert(t[0] === "All 4", `All tab counts open reports: ${t[0]}`);
    h.assert(t.includes("Content error (article, map or timeline facts) 1") && t.includes("Map 1") && t.includes("Something is broken 1") && t.includes("Games 0"),
      `active tabs with counts: ${JSON.stringify(t)}`);
    h.assert(t.includes("Typo or grammar (retired) 1"), "retired category with a report has its own tab");
    const page = await h.text(".report-embedded");
    h.assert(!VOTE_WORDS.test(page), "queue has no vote / priority wording");
    h.assert(!(await h.evaluate(() => [...document.querySelectorAll(".report-embedded option")].some((o) => /priority/i.test(o.textContent)))), "no Highest priority sort");
    h.assert(!(await h.exists(".report-queue-score")), "no priority score column");
    h.assert(!(await overflowX(h)), "queue: no sideways overflow");
    await h.screenshot(`queue-${persona}.png`);

    // status chips drive the tab counts
    await h.click({ css: ".report-chip", text: "Resolved" }); await h.sleep(900);
    t = await tabs();
    h.assert(t[0] === "All 5" && t.includes("Content error (article, map or timeline facts) 2"), `counts follow the status chips: ${t[0]}, ${t.find((x) => x.startsWith("Content"))}`);
    await h.click({ css: ".report-chip", text: "Resolved" }); await h.sleep(900);

    // a tab filters the list
    await h.click({ css: ".report-category-tab", text: "Typo or grammar" }); await h.sleep(900);
    const titles = await h.evaluate(() => [...document.querySelectorAll(".report-queue-title")].map((e) => e.textContent));
    h.assert(titles.join() === "Retired typo one", `retired tab lists its report: ${titles}`);
    const listCalls = h.requests.filter((r) => r.path.endsWith("/rpc/report_list"));
    h.assert(listCalls.length > 0, "queue reads through report_list");

    // re-file
    await h.click({ css: ".report-queue-row", text: "Retired typo one" });
    await h.waitFor('[aria-label="Category for this report"]'); await h.sleep(500);
    const detail = await h.text(".report-detail");
    h.assert(!VOTE_WORDS.test(detail) && !/Old Advisor|old vote note/.test(detail), "detail shows no votes even though report_detail still returns them");
    const opts = await h.evaluate(() => [...document.querySelector('[aria-label="Category for this report"]').options].map((o) => o.value + (o.textContent.includes("retired") ? "*" : "")));
    h.assert(opts.length === 11 && opts.includes("typo*"), `re-file options: 10 active + the current retired one (${opts})`);
    await h.screenshot(`detail-${persona}.png`);
    h.assert(!(await overflowX(h)), "detail: no sideways overflow");
    const before = h.writes.length;
    await selectValue(h, '[aria-label="Category for this report"]', "incorrect_info");
    await h.click({ css: ".report-detail button", text: "Re-file" }); await h.sleep(900);
    const w = h.writes.slice(before);
    h.assert(w.length === 1 && w[0].table === "reports" && w[0].op === "update" && w[0].rows[0]?.id === "00000000-0000-4000-8000-0000000000a1",
      `one PATCH on reports for that id: ${JSON.stringify(w.map((x) => [x.table, x.op, x.rows?.length]))}`);
    h.assert((await h.text(".report-card-meta")).startsWith("Content error"), "detail now shows the new category");
    await h.click({ css: ".report-detail button", text: "← Back to queue" }); await h.sleep(1000);
    t = await tabs();
    h.assert(!t.some((x) => x.startsWith("Typo")) && t.includes("Content error (article, map or timeline facts) 2"), `after re-file the retired tab is gone and Content error has 2: ${JSON.stringify(t)}`);
  }

  h.section(`${persona}: never votes`);
  h.assert(!h.requests.some((r) => r.path.includes("report_vote")), "report_vote never called");
};

/**
 * The report flag does both jobs: "Report a problem" or "Suggest a feature" (branch suggest-a-feature).
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/report-suggest.mjs
 *   (also --persona owner, and at 375x667 and 1280x800)
 *
 * Every persona: the header flag, account menu, About button and My Profile row name both uses; the form
 * opens on "Report a problem" with the either-or first; a problem still needs a category (idea is not in
 * the picker) and files category + severity; a suggestion has no category or severity field, files
 * category `idea` with severity null, even if a severity was picked before switching, and typed text
 * survives the switch; confirmation, My Reports & Suggestions cards, editor, withdraw and error wording
 * match the kind; a suggestion still sends if the category list fails to load, and before sql/052.
 * Staff: the Admin Console shows the suggestion under its category tab, with no "they called it".
 *
 * The fake backend does not run sql/025's constraints, triggers or RLS. The insert's values are checked
 * here against what that file allows: category is an FK (`idea` is seeded by 025) and
 * reporter_severity is nullable.
 */
const cats = [
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
].map(([key, label, sort_order, is_active]) => ({ key, label, sort_order, is_active, description: null }));

const FLAG = "Report a problem or suggest a feature";
const MENU = "Report a Problem or Suggest a Feature";
const MINE = "My Reports & Suggestions";

const selectValue = (h, sel, value) => h.evaluate((s, v) => {
  const el = document.querySelector(s);
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, v);
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, sel, value);

const form = (h) => h.evaluate(() => {
  const root = document.querySelector(".report-sheet");
  const body = root.querySelector(".report-sheet-body");
  const send = root.querySelector('button[type="submit"]');
  const radios = [...root.querySelectorAll('input[name="report-kind"]')];
  return {
    dialog: root.getAttribute("aria-label"),
    heading: root.querySelector(".report-sheet-title")?.textContent,
    firstClass: body.firstElementChild?.className,
    checked: radios.find((r) => r.checked)?.value,
    choices: radios.map((r) => r.parentElement.textContent.trim()),
    boxes: radios.map((r) => { const b = r.parentElement.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right }; }),
    from: root.querySelector(".report-context-line")?.textContent.trim(),
    labels: [...root.querySelectorAll(".report-field-label")].map((e) => e.textContent),
    placeholders: [...root.querySelectorAll(".report-form input, .report-form textarea")].map((e) => e.placeholder),
    title: root.querySelector(".report-form input[type=text]")?.value,
    body: root.querySelector(".report-form textarea")?.value,
    selects: root.querySelectorAll("select").length,
    categories: [...(root.querySelector(".report-form select")?.options ?? [])].map((o) => o.value).filter(Boolean),
    captured: root.querySelector(".report-captured-toggle")?.textContent.trim(),
    send: send?.textContent, disabled: send?.disabled,
    text: root.innerText,
  };
});

const overflowX = (h) => h.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 ||
  [...document.querySelectorAll(".report-sheet *")].some((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.right > window.innerWidth + 1; }));

export default async (h) => {
  const persona = h.persona;
  const isStaff = persona === "administrator" || persona === "owner";
  const size = h.viewport;
  const shot = (name) => h.screenshot(`${name}-${persona}-${size}.png`);
  // sql/025's before-insert trigger sets status; the fake does not, and My Reports needs it.
  const settle = () => (h.backend.tables.reports ?? []).forEach((r) => { r.status ??= "new"; r.updated_at ??= r.created_at; });
  const inserts = () => h.writes.filter((w) => w.table === "reports" && w.op === "insert").flatMap((w) => w.rows);
  const choose = async (kind) => {
    await h.click({ css: ".report-kind-option", text: kind === "problem" ? "Report a problem" : "Suggest a feature" });
    await h.sleep(250);
  };
  const submit = async () => { await h.click('.report-sheet button[type="submit"]'); await h.sleep(800); settle(); };
  const openFlag = async () => { await h.click(".header-report"); await h.waitFor(".report-kind"); await h.sleep(600); };

  h.backend.setTable("report_categories", cats);
  h.backend.setTable("reports", []);
  await h.reload(); await h.sleep(1500);

  h.section(`${persona} ${size}: the flag`);
  const flag = await h.evaluate(() => { const b = document.querySelector(".header-report"); return b && { label: b.getAttribute("aria-label"), title: b.title, shown: b.getBoundingClientRect().width > 0 }; });
  h.assert(flag?.shown && flag.label === FLAG && flag.title === FLAG, `header flag is labelled for both: ${JSON.stringify(flag)}`);

  h.section(`${persona} ${size}: problem (the default)`);
  await openFlag();
  let f = await form(h);
  h.assert(f.firstClass === "report-kind", `the either-or is the first thing in the form: ${f.firstClass}`);
  h.assert(f.choices.join("|") === "Report a problem|Suggest a feature", `two choices: ${f.choices}`);
  h.assert(f.boxes.every((b) => b.h >= 44 && b.x >= 0 && b.r <= parseInt(size)) && Math.abs(f.boxes[0].y - f.boxes[1].y) < 1 && Math.abs(f.boxes[0].w - f.boxes[1].w) < 1,
    `side by side, same size, at least 44px tall: ${JSON.stringify(f.boxes.map((b) => [Math.round(b.w), Math.round(b.h)]))}`);
  h.assert(f.checked === "problem" && f.heading === "Report a problem" && f.dialog === "Report a problem", `opens on problem: ${f.checked} / ${f.heading}`);
  h.assert(f.from.startsWith("Reporting from:"), f.from);
  h.assert(f.labels.join("|") === "Category|In one line, what's wrong?|Tell us more|How much does it matter? (optional)", `problem fields unchanged: ${f.labels}`);
  h.assert(f.categories.join() === "incorrect_info,bible_reader,map,timeline,games,account,bug,theological,other", `picker leaves out idea and retired typo: ${f.categories}`);
  h.assert(f.send === "Send report" && f.captured.startsWith("What gets sent with this report"), `${f.send} / ${f.captured}`);
  h.assert(!(await overflowX(h)), "problem form: no sideways overflow");
  await shot("1-problem");
  await h.type(".report-sheet input[type=text]", "Marker is in the sea");
  await h.type(".report-sheet textarea", "The Joppa marker sits offshore.");
  const preset = await h.evaluate(() => document.querySelector(".report-form select").value);
  h.assert(preset === (f.from.includes("Bible reader") ? "bible_reader" : ""), `category still preselected from the screen: "${preset}"`);
  await selectValue(h, ".report-form select", "");
  await h.sleep(200);
  h.assert((await form(h)).disabled, "problem: Send stays disabled without a category");
  await selectValue(h, ".report-form select", "map");
  await selectValue(h, ".report-form label:last-of-type select", "high");
  await submit();
  let row = inserts().at(-1);
  h.assert(inserts().length === 1 && row.category === "map" && row.reporter_severity === "high" && row.title === "Marker is in the sea", `problem insert: ${row?.category}/${row?.reporter_severity}`);
  let text = await h.text(".report-sheet");
  h.assert(/Your report is in\./.test(text) && /filed under the category you chose/.test(text) && text.includes("See my reports"), "problem confirmation");
  await h.click({ css: ".report-sheet button", text: "Done" }); await h.sleep(300);

  h.section(`${persona} ${size}: suggestion`);
  await openFlag();
  await h.type(".report-sheet input[type=text]", "Side by side translations");
  await h.type(".report-sheet textarea", "Show two versions next to each other.");
  await selectValue(h, ".report-form select", "bug");
  await selectValue(h, ".report-form label:last-of-type select", "critical");
  await choose("suggestion");
  f = await form(h);
  h.assert(f.checked === "suggestion" && f.heading === "Suggest a feature" && f.dialog === "Suggest a feature", `switched: ${f.heading}`);
  h.assert(f.selects === 0, `no category or severity picker: ${f.selects} selects`);
  h.assert(f.title === "Side by side translations" && f.body === "Show two versions next to each other.", "typed text survives the switch");
  h.assert(f.from.startsWith("Suggesting from:"), f.from);
  h.assert(f.labels.join("|") === "In one line, what's your idea?|Describe the feature", `suggestion fields: ${f.labels}`);
  h.assert(f.send === "Send suggestion" && f.captured.startsWith("What gets sent with this suggestion"), `${f.send} / ${f.captured}`);
  h.assert(!/wrong|Category|How much|Send report|expect/i.test(f.text), "no fault wording left on the suggestion form");
  await choose("problem");
  f = await form(h);
  h.assert(f.categories.length === 9 && f.send === "Send report" && !f.disabled, "switching back keeps the problem choices");
  await choose("suggestion");
  await h.type(".report-sheet input[type=text]", "");
  await h.evaluate(() => {
    for (const el of document.querySelectorAll(".report-form input[type=text], .report-form textarea")) {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await h.sleep(200);
  f = await form(h);
  h.assert(f.disabled && f.placeholders[0] === "e.g. Let me compare two translations side by side" && /would you like to be able to do/.test(f.placeholders[1]), `empty: disabled, ${f.placeholders[0]}`);
  h.assert(!(await overflowX(h)), "suggestion form: no sideways overflow");
  await shot("2-suggestion-empty");
  await h.type(".report-sheet input[type=text]", "Side by side translations");
  await h.type(".report-sheet textarea", "Show two versions next to each other.");
  h.assert(!(await form(h)).disabled, "suggestion needs only a title and a description");
  await shot("3-suggestion-filled");
  await submit();
  row = inserts().at(-1);
  h.assert(inserts().length === 2 && row.category === "idea" && row.reporter_severity === null && row.title === "Side by side translations",
    `suggestion insert: ${row?.category}/${row?.reporter_severity}`);
  h.assert(Object.keys(row).sort().join() === Object.keys(inserts()[0]).sort().join(), "same columns as a problem report");
  text = await h.text(".report-sheet");
  h.assert(/Your suggestion is in\./.test(text) && text.includes(MINE) && !/Your report|category you chose/.test(text), "suggestion confirmation");
  h.assert((await h.evaluate(() => document.querySelector(".report-sheet").getAttribute("aria-label"))) === "Suggestion sent", "confirmation dialog name");
  await shot("4-suggestion-sent");

  h.section(`${persona} ${size}: ${MINE}`);
  await h.click({ css: ".report-sheet button", text: "See my suggestions" }); await h.sleep(900);
  const cards = () => h.evaluate(() => [...document.querySelectorAll(".report-card")].map((c) => c.innerText));
  let list = await cards();
  h.assert((await h.text(".report-sheet-title")) === MINE && list.length === 2, `list titled ${MINE}, ${list.length} cards`);
  h.assert(list.some((c) => c.includes("Side by side translations") && /Suggestion · filed/.test(c)), "suggestion card is labelled Suggestion");
  h.assert(!(await overflowX(h)), "list: no sideways overflow");
  await shot("5-mine");
  const editorSelects = async (title) => {
    await h.evaluate((t) => [...document.querySelectorAll(".report-card")].find((c) => c.innerText.includes(t)).querySelector(".report-actions button").click(), title);
    await h.sleep(250);
    return h.count(".report-editor select");
  };
  h.assert((await editorSelects("Side by side translations")) === 0, "editing a suggestion asks no severity");
  await h.type(".report-editor input", "Two translations at once");
  await h.click({ css: ".report-editor button", text: "Save changes" }); await h.sleep(700);
  const up = h.writes.filter((w) => w.table === "reports" && w.op === "update").at(-1)?.rows?.[0];
  h.assert(up?.title === "Two translations at once" && up.reporter_severity === null && up.category === "idea", "suggestion edit saved, severity still null");
  h.assert((await editorSelects("Marker is in the sea")) === 1, "editing a problem still offers severity");
  await h.click({ css: ".report-editor button", text: "Cancel" }); await h.sleep(200);

  const base = h.backend.tables.reports.find((r) => r.category === "idea");
  h.backend.setTable("reports", ["accepted", "resolved", "duplicate"].map((status, i) => ({ ...base, id: `00000000-0000-4000-8000-00000000000${i + 1}`, status, title: `Idea ${status}` })));
  await h.click({ css: ".report-sheet button", text: "← Back" }); await h.sleep(300);
  await openFlag(); await choose("suggestion");
  await h.type(".report-sheet input[type=text]", "Another idea");
  await h.type(".report-sheet textarea", "More.");
  await submit();
  await h.click({ css: ".report-sheet button", text: "See my suggestions" }); await h.sleep(900);
  list = (await cards()).join("\n");
  h.assert(/like to do this/.test(list) && /Thank you for suggesting it/.test(list) && /Already suggested by someone else/.test(list) && !/real problem|for reporting|Already reported/.test(list),
    "status wording for suggestions never calls them problems");
  await h.evaluate(() => { window.confirm = () => true; });
  await h.click({ css: ".report-card button", text: "Withdraw" }); await h.sleep(700);
  h.assert((await h.text(".report-sheet")).includes("Suggestion withdrawn."), "withdraw notice");

  h.backend.setTable("reports", []);
  await h.click({ css: ".report-sheet button", text: "← Back" }); await h.sleep(300);

  h.section(`${persona} ${size}: errors and an unavailable category list`);
  h.backend.setTableError("report_categories", { status: 500, code: "500", message: "boom" });
  await openFlag();
  h.assert(await h.exists(".report-sheet .auth-error"), "problem form says the category list failed");
  await choose("suggestion");
  h.assert(!(await h.exists(".report-sheet .auth-error")), "suggestion form does not");
  await h.type(".report-sheet input[type=text]", "Works anyway");
  await h.type(".report-sheet textarea", "No list needed.");
  h.backend.setTableError("reports", { status: 409, code: "23505", message: "duplicate_submission: an identical report was filed moments ago" });
  await h.click('.report-sheet button[type="submit"]'); await h.sleep(700);
  h.assert(/the suggestion you just sent/.test(await h.text(".report-sheet .auth-error")), "refusal worded for a suggestion");
  h.backend.setTableError("reports", null);
  await choose("problem");
  h.assert(!/suggestion you just sent/.test((await form(h)).text), "switching clears the send error");
  await choose("suggestion");
  await submit();
  h.assert(inserts().at(-1)?.title === "Works anyway" && inserts().at(-1).category === "idea", "suggestion sent without the list");
  await h.click({ css: ".report-sheet button", text: "Done" }); await h.sleep(300);
  h.backend.setTableError("report_categories", null);

  h.backend.setTable("report_categories", ["bug", "incorrect_info", "idea", "other"].map((key, i) => ({ key, label: key === "idea" ? "Idea or suggestion" : key, sort_order: i, is_active: true, description: null })));
  await openFlag();
  h.assert((await form(h)).categories.join() === "bug,incorrect_info,other", "before sql/052 the picker also leaves out idea");
  await h.click({ css: ".report-sheet button", text: "Cancel" }); await h.sleep(300);
  h.backend.setTable("report_categories", cats);

  h.section(`${persona} ${size}: the other entry points`);
  await h.click('[aria-label="Settings and account"]'); await h.sleep(400);
  const item = await h.evaluate(() => { const b = document.querySelector('[data-menu="report"]'); const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), h: r.height, over: b.scrollWidth > b.clientWidth + 1 }; });
  h.assert(item.t === MENU && !item.over, `account menu row: ${item.t} (${Math.round(item.h)}px)`);
  await shot("6-account-menu");
  await h.click('[data-menu="report"]'); await h.waitFor(".report-kind"); await h.sleep(400);
  h.assert((await form(h)).checked === "problem", "menu opens the same form");
  await h.click({ css: ".report-sheet button", text: "← Back" }); await h.sleep(300);

  // My Profile's row, and the empty list.
  if (parseInt(size) < 769) {
    await h.click('[aria-label="Settings and account"]'); await h.sleep(300); // close the account menu
    await h.click('.mobile-tab-bar [data-menu="social"]');
  } else await h.click(".auth-identity-link");
  await h.waitFor(".myprofile-link-row"); await h.sleep(400);
  h.assert((await h.text(".myprofile-link-row")) === MINE, "My Profile row");
  h.backend.setTable("reports", []);
  await h.click(".myprofile-link-row"); await h.waitFor(".report-empty"); await h.sleep(300);
  h.assert(/haven't sent anything yet/.test(await h.text(".report-empty")), "empty list covers both");
  await h.click({ css: ".report-empty button", text: "Report or suggest something" }); await h.sleep(500);
  h.assert(await h.exists(".report-kind"), "empty-list button opens the form");

  h.section(`${persona} ${size}: dark and largest text`);
  await h.setTheme("dark"); await choose("suggestion"); await shot("7-suggestion-dark");
  const contrast = await h.evaluate(() => {
    const s = getComputedStyle(document.querySelector(".report-kind-option input:checked + span"));
    const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const [a, b] = [lum(s.color), lum(s.backgroundColor)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  });
  h.assert(contrast >= 4.5, `chosen option contrast in dark: ${contrast.toFixed(2)}`);
  await h.setTheme("light");
  await h.evaluate(() => document.documentElement.style.setProperty("--text-scale", "1.8"));
  await h.evaluate(() => document.documentElement.style.setProperty("--tsz", "1.8"));
  await h.evaluate(() => document.querySelectorAll(".report-sheet").forEach((e) => e.style.setProperty("--tsz", "1.8")));
  await h.sleep(300);
  f = await form(h);
  h.assert(!(await overflowX(h)) && f.boxes.every((b) => b.r <= parseInt(size)), `largest text: no sideways overflow ${JSON.stringify(f.boxes.map((b) => [Math.round(b.w), Math.round(b.h)]))}`);
  await shot("8-largest-text");

  h.section(`${persona} ${size}: About page button`);
  await h.reload(); await h.sleep(1500);
  await h.click('[aria-label^="Menu"]'); await h.sleep(400);
  await h.click('[data-menu="about"]'); await h.waitFor(".about-report"); await h.sleep(500);
  h.assert((await h.text(".about-report")) === MENU, "About button");
  const about = await h.evaluate(() => { const r = document.querySelector(".about-report").getBoundingClientRect(); return r.right <= window.innerWidth; });
  h.assert(about, "About button fits the screen");

  if (isStaff) {
    h.section(`${persona} ${size}: Admin Console shows the suggestion under its category`);
    const mk = (id, category, title, sev) => ({ id, category, title, body: `${title} body`, reporter_severity: sev, status: "new", created_at: "2026-11-27T10:00:00Z", updated_at: "2026-11-27T10:00:00Z", page_title: "Bible reader", route: "bible", target_kind: null, app_context: {} });
    const rows = [mk("00000000-0000-4000-8000-0000000000a1", "idea", "Please add reading streaks", null), mk("00000000-0000-4000-8000-0000000000a2", "bug", "Button dead", "high")];
    const label = (k) => cats.find((c) => c.key === k)?.label;
    h.backend.setRpc("report_list", (a) => {
      const out = rows.filter((r) => (!a.p_status || a.p_status.includes(r.status)) && (!a.p_category || r.category === a.p_category));
      return out.slice(a.p_offset ?? 0, (a.p_offset ?? 0) + (a.p_limit ?? 50)).map((r) => ({ ...r, category_label: label(r.category), reporter_name: "Someone", total_count: String(out.length) }));
    });
    h.backend.setRpc("report_detail", (a) => { const r = rows.find((x) => x.id === a.p_report_id); return { report: r, reporter_name: "Someone", category_label: label(r.category), history: [] }; });
    h.backend.setRpc("report_counts", () => ({ by_status: {}, by_category: {}, open: 2, untriaged: 2 }));
    await h.reload(); await h.sleep(2000);
    await h.click('[aria-label="Settings and account"]'); await h.sleep(400);
    await h.click({ css: ".auth-menu-item", text: "Admin Console" });
    await h.waitFor('[role=tablist][aria-label="Admin sections"]');
    await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Problem reports" });
    await h.waitFor(".report-category-tabs"); await h.sleep(1000);
    const tabs = await h.evaluate(() => [...document.querySelectorAll(".report-category-tab")].map((t) => t.innerText.replace(/\s+/g, " ").trim()));
    h.assert(tabs.includes("Suggestion 1"), `category tab: ${JSON.stringify(tabs.filter((t) => /Suggestion/.test(t)))}`);
    await h.click({ css: ".report-category-tab", text: "Suggestion" }); await h.sleep(900);
    const titles = await h.evaluate(() => [...document.querySelectorAll(".report-queue-title")].map((e) => e.textContent));
    h.assert(titles.join() === "Please add reading streaks", `Suggestion tab lists it: ${titles}`);
    await shot("9-admin-queue");
    await h.click({ css: ".report-queue-row", text: "Please add reading streaks" }); await h.waitFor(".report-detail-title"); await h.sleep(600);
    const meta = await h.text(".report-card-meta");
    h.assert(meta.startsWith("Suggestion") && !meta.includes("they called it"), `detail: ${meta}`);
    await shot("10-admin-detail");
  }

  h.section(`${persona} ${size}: errors`);
  const errs = h.consoleErrors.filter((e) => !/Failed to load resource|ERR_|boom|bible-api|WebSocket|\[reports\]/.test(e));
  h.assert(errs.length === 0, `no unexpected page errors ${JSON.stringify(errs.slice(0, 3))}`);
};

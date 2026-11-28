/**
 * Admin Console -> Users: the growth line under "Registered accounts" (RegisteredGrowthCard, sql/054).
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 390x844 --script scripts/signed-in-harness/examples/registered-growth.mjs
 *   (also --viewport 1280x800 and --persona administrator; SKINS=0 skips the theme pass)
 *
 * The line sits directly under the card and ends on the card's number; it asks admin_usage_report once, by day,
 * since the first account, team included, guests left out, in the browser's zone; All time / Last month / Year to
 * date / Custom re-slice without asking again; custom dates are validated; tap, drag and arrow keys read values;
 * the table lists the same points; empty, error (with retry) and missing-function states; nothing sideways; the
 * tooltip stays on the chart; light, dark and every skin.
 *
 * The fake does not run the SQL. What the function counts is proven by scripts/sql-rehearsal/054_admin_usage_report.mjs.
 */
import { openAdminConsole } from "../lib/app.mjs";

const SKINS = ["sticker", "clarity", "midnight", "sage", "skyreader", "trailhead", "highlighter"];
const pad = (n) => String(n).padStart(2, "0");
const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plus = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return local(d); };
const TODAY = local(new Date());
const FIRST = plus(TODAY, -129);

// 23 accounts over 130 days, shaped like admin_usage_report's "accounts" rows (bigints arrive as strings).
const JOINED = [0, 0, 3, 9, 14, 21, 30, 33, 41, 55, 60, 61, 70, 77, 84, 90, 96, 101, 108, 112, 118, 124, 127];
const accountRows = () => {
  let total = 0;
  const rows = Array.from({ length: 130 }, (_, i) => {
    const added = JOINED.filter((d) => d === i).length;
    total += added;
    return { metric: "accounts", label: null, period_start: plus(FIRST, i), value: String(added), cumulative: String(total), history_from: FIRST };
  });
  // Another metric comes back too if the filter is ignored; the app must not draw it.
  rows.push({ metric: "notes", label: null, period_start: TODAY, value: "999", cumulative: "999", history_from: FIRST });
  return rows;
};
const TOTAL = JOINED.length;

const missing = () => { throw { status: 404, code: "PGRST202", message: "Could not find the function public.admin_usage_report in the schema cache" }; };
const broken = () => { throw { status: 500, code: "XX000", message: "the database is unwell" }; };

export default async (h) => {
  const tag = `${h.persona}-${h.viewport.replace("x", "-")}`;
  const asked = [];
  const answer = (args) => { asked.push(args); return accountRows(); };
  h.backend.setRpc("admin_registered_summary", { total: String(TOTAL), new_24h: "0", new_7d: "1", active_7d: "5", newest_joined_at: `${plus(FIRST, 127)}T18:57:00Z`, team: "1" });

  const card = ".admin-growth-card";
  const text = () => h.evaluate(() => document.querySelector(".admin-growth-card")?.innerText ?? "");
  const range = async (label) => { await h.click({ css: `${card} .usage-range-picker button`, text: label }); await h.sleep(300); };
  const rows = () => h.evaluate(() => [...document.querySelectorAll(".admin-growth-card tbody tr")].map((r) => [...r.children].map((c) => c.textContent.trim())));
  const content = (s) => h.evaluate((s) => document.querySelector(s)?.textContent ?? null, s);
  const hasLine = () => h.exists(`${card} .growth-line`);
  const setDate = async (i, value) => {
    await h.evaluate((i, value) => {
      const el = document.querySelectorAll(".admin-growth-dates input")[i];
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, i, value);
    await h.sleep(200);
  };
  const open = async () => {
    await h.reload();
    await h.sleep(1500);
    h.assert(await openAdminConsole(h), "Admin Console opens");
    await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Users" });
    await h.waitFor(card, { timeout: 6000 });
    await h.sleep(600);
  };
  const show = () => h.evaluate(() => document.querySelector(".admin-growth-card").scrollIntoView({ block: "center", behavior: "instant" }));
  const sideways = () => h.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 ||
    [...document.querySelectorAll(".admin-growth-card, .admin-growth-card *")].filter((e) => !e.closest(".growth-table-scroll"))
      .some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1); }));
  const xLabelsClash = () => h.evaluate(() => {
    const r = [...document.querySelectorAll(".admin-growth-card .growth-tick-x")].map((t) => t.getBoundingClientRect()).sort((a, b) => a.left - b.left);
    return r.some((a, i) => i > 0 && a.left < r[i - 1].right + 2);
  });

  // ---- missing function, error + retry, no accounts ----
  h.section("states");
  h.backend.setRpc("admin_usage_report", missing);
  await open();
  h.assert(/Couldn't draw the growth graph\. Needs the database step \(migration 054\)/.test(await text()) && !(await hasLine()), "missing function: says it needs the database step, draws nothing");
  h.backend.setRpc("admin_usage_report", broken);
  await open();
  h.assert(/Couldn't draw the growth graph\..*database is unwell/.test(await text()) && !(await hasLine()), "database error is shown, no chart");
  await show(); await h.screenshot(`growth-error-${tag}.png`);
  h.backend.setRpc("admin_usage_report", answer);
  await h.click(".admin-growth-retry");
  await h.sleep(700);
  h.assert((await hasLine()) && !/Couldn't draw/.test(await text()), "Try again draws the graph");
  h.backend.setRpc("admin_usage_report", () => [{ metric: "accounts", label: null, period_start: TODAY, value: "0", cumulative: "0", history_from: null }]);
  await open();
  h.assert(/No registered accounts yet/.test(await text()) && !(await hasLine()), "no accounts: empty state");

  // ---- all time ----
  h.section("all time");
  h.backend.setRpc("admin_usage_report", answer);
  asked.length = 0;
  await open();
  const order = await h.evaluate(() => {
    const a = document.querySelector(".admin-registered-card"), b = document.querySelector(".admin-growth-card");
    return { next: a.nextElementSibling === b, gap: b.getBoundingClientRect().top - a.getBoundingClientRect().bottom, count: a.querySelector(".admin-badge")?.textContent };
  });
  h.assert(order.next && order.gap >= 0 && order.gap < 40, "directly under the Registered accounts card");
  const zone = await h.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const a = asked.at(-1);
  h.assert(a.p_bucket === "day" && a.p_periods === 0 && a.p_exclude_team === false && a.p_include_guests === false && a.p_tz === zone, `asks by day, since the first account, team in, guests out, zone ${zone}: ${JSON.stringify(a)}`);
  const head = await h.text(`${card} .usage-headline`);
  const endLabel = await content(`${card} .growth-value-label`);
  h.assert(order.count === String(TOTAL) && endLabel === String(TOTAL) && new RegExp(`^${TOTAL}\\s+now · \\+${TOTAL} in this range`).test(head), `line ends on the card's number: badge ${order.count}, end label ${endLabel}, "${head}"`);
  let t = await rows();
  h.assert(await hasLine() && /one point per week \(Monday start\)/.test(await text()) && t[0][1] === String(TOTAL) && t.at(-1)[1] === "2", `weekly line, table newest ${t[0]?.join(" ")}, oldest ${t.at(-1)?.join(" ")}`);
  h.assert(t.reduce((s, r) => s + Number(r[2]), 0) === TOTAL, "the New column adds up to the total");
  h.assert(/deleted account is gone/.test(await text()), "caption says deleted accounts can't appear");
  h.assert(!(await sideways()), "all time: nothing sideways");
  h.assert(!(await xLabelsClash()), "all time: date labels don't collide");
  await show(); await h.screenshot(`growth-all-${tag}.png`);

  // ---- tap, drag, keyboard ----
  h.section("reading values");
  await show();
  const box = await h.rect(`${card} .growth-line-hit`);
  const y = box.y + box.height / 2;
  const tip = () => h.evaluate(() => {
    const t = document.querySelector(".admin-growth-card .growth-line-tooltip"); if (!t) return null;
    const r = t.getBoundingClientRect(), p = t.parentElement.getBoundingClientRect();
    return { text: t.innerText.replace(/\n/g, " / "), inside: r.left >= p.left - 1 && r.right <= p.right + 1 };
  });
  for (const [name, x] of [["left end", box.x + 1], ["middle", box.x + box.width / 2], ["right end", box.x + box.width - 1]]) {
    await h.touch([{ x, y }]);
    await h.sleep(250);
    const v = await tip();
    h.assert(!!v && /\d+ registered \/ .+\d{4} \/ \+\d+ (that day|since )/.test(v.text) && v.inside, `tap ${name}: ${v?.text} (inside the chart: ${v?.inside})`);
    h.assert((await h.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)) === "none", `tap ${name}: no ring around the plot`);
    if (name === "middle") await h.screenshot(`growth-tap-${tag}.png`);
  }
  await h.touch(Array.from({ length: 16 }, (_, i) => ({ x: box.x + box.width - 2 - ((box.width - 4) * i) / 15, y })).concat({ x: box.x + 2, y }));
  await h.sleep(250);
  h.assert(/^2 registered/.test((await tip())?.text ?? ""), `drag to the start reads the first point: ${(await tip())?.text}`);
  const key = async (k) => { await h.evaluate((k) => { const r = document.querySelector(".admin-growth-card .growth-line-hit"); r.focus(); r.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); }, k); await h.sleep(150); };
  await key("End");
  h.assert(new RegExp(`^${TOTAL} registered`).test((await tip())?.text ?? ""), "End key reads the latest point");
  await key("ArrowLeft");
  const spoken = await h.evaluate(() => document.querySelector(".admin-growth-card .growth-line-hit").getAttribute("aria-valuetext"));
  h.assert(/registered, \+\d+/.test(spoken) && (await tip())?.text.startsWith(spoken.match(/: (\d+ registered)/)[1]), `arrow key steps back and is spoken: ${spoken}`);

  // ---- presets ----
  h.section("presets");
  const before = asked.length;
  await range("Last month");
  t = await rows();
  h.assert(await hasLine() && /one point per day/.test(await text()) && t.length >= 29 && t.length <= 32 && t[0][1] === String(TOTAL), `last month: ${t.length} daily rows ending on ${t[0]?.[1]}`);
  h.assert(!(await tip()), "a tapped value isn't carried into another range");
  h.assert(!(await xLabelsClash()) && !(await sideways()), "last month: labels clear, nothing sideways");
  await show(); await h.screenshot(`growth-month-${tag}.png`);
  await range("Year to date");
  t = await rows();
  const startsBeforeApp = `${TODAY.slice(0, 4)}-01-01` < FIRST;
  h.assert(await hasLine() && t[0][1] === String(TOTAL) && /The line starts/.test(await text()) === startsBeforeApp, `year to date drawn${startsBeforeApp ? ", says it starts at the first account" : ""}`);
  await show(); await h.screenshot(`growth-ytd-${tag}.png`);

  // ---- custom ----
  h.section("custom");
  await range("Custom");
  const inputs = await h.evaluate(() => [...document.querySelectorAll(".admin-growth-dates input")].map((i) => ({ v: i.value, max: i.max, size: parseFloat(getComputedStyle(i).fontSize), h: i.getBoundingClientRect().height })));
  h.assert(inputs.length === 2 && inputs[1].v === TODAY && inputs[0].v < TODAY && inputs.every((i) => i.max === TODAY && i.size >= 16 && i.h >= 38) && (await hasLine()), `two date boxes, prefilled and drawn: ${JSON.stringify(inputs)}`);
  const invalid = async (s, e, message) => {
    await setDate(0, s); await setDate(1, e);
    const body = await text();
    h.assert(body.includes(message) && !(await hasLine()) && (await h.count(`${card} [aria-invalid="true"]`)) === 1, `${s || "(empty)"} to ${e || "(empty)"}: "${message}", no chart`);
  };
  await invalid(plus(TODAY, -3), plus(TODAY, -10), "The end date is before the start date.");
  await show(); await h.screenshot(`growth-custom-invalid-${tag}.png`);
  await invalid("", TODAY, "Enter a full start date.");
  await invalid(plus(TODAY, -10), "", "Enter a full end date.");
  await invalid(plus(TODAY, -10), plus(TODAY, 3), "The end date can't be in the future.");
  await invalid(plus(TODAY, 2), plus(TODAY, 3), "The start date can't be in the future.");
  await setDate(0, plus(FIRST, 10)); await setDate(1, plus(FIRST, 40));
  t = await rows();
  const expected = JOINED.filter((d) => d <= 40).length, gained = JOINED.filter((d) => d >= 10 && d <= 40).length;
  h.assert(t.length === 31 && t[0][1] === String(expected) && (await h.text(`${card} .usage-headline`)).includes(`+${gained} in this range`) && /\bon [A-Z]/.test(await h.text(`${card} .usage-headline`)), `past range: ${t.length} days, ${t[0]?.[1]} at its end, +${gained}`);
  await show(); await h.screenshot(`growth-custom-${tag}.png`);
  await setDate(0, plus(FIRST, 20)); await setDate(1, plus(FIRST, 20));
  h.assert((await rows()).length === 1 && (await h.exists(`${card} .growth-dot`)) && !(await hasLine()) && !(await sideways()), "a single day draws one point");
  await setDate(0, plus(FIRST, -60)); await setDate(1, plus(FIRST, -30));
  h.assert(/No registered accounts in these dates/.test(await text()) && !(await h.exists(`${card} .growth-svg`)), "before the first account: empty state");
  await setDate(0, plus(FIRST, -60)); await setDate(1, TODAY);
  h.assert((await hasLine()) && /The line starts/.test(await text()), "a start before the app is clamped and said so");
  h.assert(asked.length === before, `changing range never asks again (${asked.length - before} extra calls)`);

  // ---- themes ----
  if (process.env.SKINS === "0") return;
  h.section("themes");
  for (const look of ["light", "dark", ...SKINS]) {
    const skin = SKINS.includes(look) ? look : null;
    await h.evaluate((s) => { s ? localStorage.setItem("app-skin", s) : localStorage.removeItem("app-skin"); }, skin);
    if (!skin) await h.setTheme(look);
    await open();
    await range("Custom");
    await show();
    const b = await h.rect(`${card} .growth-line-hit`);
    await h.touch([{ x: b.x + b.width * 0.55, y: b.y + b.height / 2 }]);
    await h.sleep(250);
    const c = await h.evaluate(() => {
      const rgb = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const q = (s) => document.querySelector(`.admin-growth-card ${s}`);
      const surface = rgb(getComputedStyle(q(".growth-chart-plot")).backgroundColor);
      const input = getComputedStyle(q(".admin-growth-dates input"));
      return {
        skin: document.documentElement.getAttribute("data-skin"), theme: document.documentElement.getAttribute("data-theme"),
        line: ratio(rgb(getComputedStyle(q(".growth-line")).stroke), surface),
        tick: ratio(rgb(getComputedStyle(q(".growth-tick")).fill), surface),
        input: ratio(rgb(input.color), rgb(input.backgroundColor)), scheme: input.colorScheme,
        tip: !!q(".growth-line-tooltip"),
      };
    });
    h.assert((skin ? c.skin === skin : !c.skin) && c.line >= 3 && c.tick >= 4.5 && c.input >= 4.5 && c.tip && !(await sideways()),
      `${look}: line ${c.line.toFixed(1)}:1, axis text ${c.tick.toFixed(1)}:1, date box ${c.input.toFixed(1)}:1, theme ${c.theme}, scheme ${c.scheme}`);
    await h.screenshot(`growth-${look}-${tag}.png`);
  }
};

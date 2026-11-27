/**
 * Admin Console -> Usage reports (graphs) and Users -> Registered accounts card (sql/054, branch usage-graphs).
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 390x844 --script scripts/signed-in-harness/examples/usage-reports.mjs
 *   (also --persona administrator / member, and at 1280x800; THEME=dark for dark)
 *
 * owner / administrator, in BOTH worlds:
 *   BEFORE sql/054 (admin_usage_report / admin_registered_summary answer PGRST202, as on production today):
 *     the tab draws total users, sign-ups and daily active users from the 019/021 functions, games by game and
 *     reports by category as totals; every other card says it needs the database step; the toggles are off;
 *     week/month active users say why they can't be drawn yet; the Registered card is overview minus guests.
 *   AFTER sql/054 (fake rows shaped like the real function's): every card draws a chart; toggles are sent to
 *     the function; a period before history_from reads "not recorded"; breakdowns sum the per-period rows.
 *   Both: tooltip shows an exact value on a bar; "Show the numbers" lists every period; no sideways overflow;
 *   tabs are "Usage reports" and "Problem reports"; Users opens with Registered accounts above Guests, and the
 *   card's numbers do not change when the list is searched.
 * member: no Admin Console, and no usage function is ever requested.
 *
 * The fake does not run the real SQL. What the function counts and who may call it is proven by
 * scripts/sql-rehearsal/054_admin_usage_report.mjs (PGlite). This proves the UI and its wiring.
 */
import { openAdminConsole, adminTabs } from "../lib/app.mjs";

const missing = () => { throw { status: 404, code: "PGRST202", message: "Could not find the function public.admin_usage_report in the schema cache" }; };
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const daysAgo = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() - n); return iso(d); };

// 019-shaped daily rows: 60 days, a sign-up every third day, guests on some, sessions from day 40 back.
const daily = Array.from({ length: 60 }, (_, i) => {
  const n = 59 - i;
  return { day: daysAgo(n), signups: n % 3 === 0 ? 2 : 0, sessions: n < 40 ? 5 : 0, active_users: n < 40 ? 3 : 0 };
});
const guestDays = daily.filter((d, i) => i % 6 === 0).map((d) => ({ day: d.day, new_guests: d.signups > 0 ? 1 : 0, sessions: 1, active_guests: d.active_users > 0 ? 1 : 0, seconds: 60, first_session_at: null, last_session_at: null }));
const guestSummary = { total: 40, new_24h: 1, new_7d: 3, new_30d: 9, first_seen: "2026-08-01T00:00:00Z", newest_seen: `${daysAgo(0)}T08:00:00Z`, active_24h: 1, active_7d: 4, last_active_at: null, guests_with_sessions: 5, guests_before_analytics: 0, analytics_since: "2026-09-01T00:00:00Z", sessions_total: 5, sessions_seconds_total: 300, median_session_seconds: 60, returning_guests: 1, days: guestDays, recent_sessions: [] };
const users = [
  { user_id: "u1", email: null, display_name: null, is_anonymous: true, created_at: `${daysAgo(0)}T09:00:00Z`, last_sign_in_at: null, last_seen_at: null, session_count: 0, total_seconds: 0, is_admin: false, total_count: 3 },
  { user_id: "u2", email: "newest@example.test", display_name: "Newest", is_anonymous: false, created_at: "2026-11-26T15:00:00Z", last_sign_in_at: null, last_seen_at: null, session_count: 1, total_seconds: 60, is_admin: false, total_count: 3 },
  { user_id: "u3", email: "older@example.test", display_name: "Older", is_anonymous: false, created_at: "2026-10-01T15:00:00Z", last_sign_in_at: null, last_seen_at: null, session_count: 1, total_seconds: 60, is_admin: false, total_count: 3 },
];

// 054-shaped rows for any bucket/periods.
function fullRows({ p_bucket = "month", p_periods = 12, p_exclude_team = true }) {
  const n = p_periods > 0 ? p_periods : 5;
  const starts = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (p_bucket === "day") d.setUTCDate(d.getUTCDate() - i);
    else if (p_bucket === "week") { d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7 * i); }
    else { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); }
    starts.push(iso(d));
  }
  const rows = [];
  const scalar = (metric, f, historyFrom, cum = true) => {
    let run = 10;
    starts.forEach((p, i) => { const v = f(i); run += v; rows.push({ metric, label: null, period_start: p, value: String(v), cumulative: cum ? String(run) : null, history_from: historyFrom }); });
  };
  const team = p_exclude_team ? 0 : 1;
  scalar("accounts", (i) => i + 1 + team, "2026-07-22");
  scalar("active_users", (i) => (i < 2 ? 0 : i + 2), starts[2]);
  scalar("returning_users", (i) => (i < 2 ? 0 : i), starts[2], false);
  scalar("chapters_read", (i) => 3 * i, "2026-07-28");
  scalar("articles_opened", (i) => i, "2026-09-01");
  scalar("articles_marked", () => 0, null);
  scalar("games_played", (i) => 2 * i, "2026-09-01");
  scalar("notes", (i) => i % 2, "2026-07-25");
  scalar("reports", (i) => (i === n - 1 ? 2 : 0), "2026-08-10");
  rows.push({ metric: "game:bible-trivia", label: "bible-trivia", period_start: starts[n - 1], value: "5", cumulative: null, history_from: "2026-09-01" });
  rows.push({ metric: "game:chronology", label: "chronology", period_start: starts[n - 1], value: "2", cumulative: null, history_from: "2026-09-02" });
  rows.push({ metric: "report:bug", label: "Something is broken", period_start: starts[n - 1], value: "2", cumulative: null, history_from: "2026-08-10" });
  return rows;
}

const overflowX = (h) => h.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 ||
  [...document.querySelectorAll(".admin-console *")].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1; }));
const cardText = (h, title) => h.evaluate((t) => [...document.querySelectorAll(".usage-card")].find((c) => c.querySelector(".usage-card-title")?.textContent.trim() === t)?.innerText ?? null, title);

function seed(h, world) {
  h.backend.setRpc("admin_daily_activity", daily);
  h.backend.setRpc("admin_guest_summary", guestSummary);
  h.backend.setRpc("admin_list_users", users);
  h.backend.setRpc("admin_feature_breakdown", ({ p_event }) => p_event === "game.play"
    ? [{ label: "bible-trivia", uses: "7", users: "3" }, { label: "daily-name", uses: "2", users: "1" }]
    : [{ label: "articles", uses: "11", users: "4" }, { label: "map", uses: "30", users: "6" }]);
  h.backend.setTable("report_categories", [
    { key: "bug", label: "Something is broken", description: null, sort_order: 10, is_active: true },
    { key: "map", label: "Map", description: null, sort_order: 20, is_active: true },
  ]);
  h.backend.setRpc("report_list", ({ p_category }) => (p_category === "bug" ? [{ total_count: "3" }] : p_category === "map" ? [{ total_count: "1" }] : []));
  if (world === "before") {
    h.backend.setRpc("admin_usage_report", missing);
    h.backend.setRpc("admin_registered_summary", missing);
  } else {
    h.backend.setRpc("admin_usage_report", fullRows);
    h.backend.setRpc("admin_registered_summary", { total: "41", new_24h: "1", new_7d: "4", active_7d: "12", newest_joined_at: "2026-11-26T15:00:00Z", team: "2" });
  }
}

async function openTab(h, label) {
  await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: label });
  await h.sleep(700);
}

export default async (h) => {
  const tag = `${h.persona}-${h.viewport.replace("x", "-")}-${h.theme ?? "light"}`;
  if (h.persona === "member") {
    seed(h, "after");
    await h.reload();
    await h.sleep(1500);
    h.assert(!(await openAdminConsole(h)), "member: no Admin Console in the account menu");
    h.assert(!h.requests.some((r) => /admin_usage_report|admin_registered_summary/.test(r.path)), "member: no usage function was ever requested");
    return;
  }

  for (const world of ["before", "after"]) {
    h.section(`${h.persona}: ${world} sql/054`);
    seed(h, world);
    await h.reload();
    await h.sleep(1500);
    h.assert(await openAdminConsole(h), "Admin Console opens");
    const tabs = await adminTabs(h);
    h.assert(tabs.includes("Usage reports") && tabs.some((t) => t.startsWith("Problem reports")) && !tabs.includes("Growth"), `tabs say which reports: ${tabs.join(" | ")}`);

    // ---- Users: Registered accounts first ----
    await openTab(h, "Users");
    await h.waitFor(".admin-registered-card", { timeout: 6000 });
    await h.sleep(500);
    const order = await h.evaluate(() => {
      const first = document.querySelector(".admin-registered-card"), add = document.querySelector(".admin-search-row");
      const addBar = document.querySelector(".admin-add-user-bar");
      return { regTop: first?.getBoundingClientRect().top, searchTop: add?.getBoundingClientRect().top, reg: first?.innerText,
        firstIsCard: !!first && !!addBar && first.getBoundingClientRect().bottom <= addBar.getBoundingClientRect().top,
        guestCard: !!document.querySelector(".admin-guest-card"), names: [...document.querySelectorAll(".admin-user-name")].map((n) => n.innerText),
        guestWords: /\bguests?\b/i.test([...document.querySelectorAll(".admin-user-list, .admin-console > .admin-note")].map((n) => n.innerText).join(" ")) };
    });
    h.assert(order.firstIsCard && order.regTop < order.searchTop, "Registered accounts card is the first thing on the Users tab");
    h.assert(!order.guestCard, "no Guests card");
    h.assert(order.names.length === 2 && !order.names.some((n) => /guest/i.test(n)), `user list: registered accounts only, no guest rows or badges: ${order.names.join(" | ")}`);
    h.assert(!order.guestWords, "the list and its summary line never mention guests");
    if (world === "before") {
      // overview: registered 80, new 24h 2 / 7d 9, active 7d 55; guests: new 1 / 3, active 4.
      h.assert(/80/.test(order.reg) && /\b1\b new in 24h/.test(order.reg) && /\b6\b new in 7d/.test(order.reg) && /\b51\b active in 7d/.test(order.reg), `fallback card = overview minus guests: ${order.reg.replace(/\n/g, " / ")}`);
    } else {
      h.assert(/41/.test(order.reg) && /\b4\b new in 7d/.test(order.reg) && /\b12\b active in 7d/.test(order.reg) && /team \(2\)/.test(order.reg), `054 card: ${order.reg.replace(/\n/g, " / ")}`);
    }
    h.assert(/Newest join/.test(order.reg) && !/older than/.test(order.reg), "newest join date shown");
    await h.screenshot(`users-${world}-${tag}.png`);
    await h.type('input[aria-label="Search users"]', "older");
    await h.click({ css: ".admin-search-row button", text: "Search" });
    await h.sleep(600);
    h.assert((await h.text(".admin-registered-card")) === order.reg, "searching the user list does not change the Registered card");

    // ---- Overview: registered only ----
    await openTab(h, "Overview");
    const ov = await h.evaluate(() => [...document.querySelectorAll(".admin-stat")].map((s) => s.innerText.replace(/\n/g, " ")));
    h.assert(!ov.some((t) => /guest|total accounts/i.test(t)), `overview has no guest or all-accounts figure: ${ov.join(" / ")}`);
    // overview fixture: registered 80, new 24h 2 / 7d 9 / 30d 31, active 24h 14 / 7d 55; guests 1/3/9, active 1/4.
    h.assert(ov.some((t) => /^80 Registered/i.test(t)) && ov.some((t) => /^6 New \(7d\)/i.test(t)) && ov.some((t) => /^22 New \(30d\)/i.test(t)) && ov.some((t) => /^51 Active \(7d\)/i.test(t)), "overview numbers are registered-only (all minus old guests)");

    // ---- Usage reports ----
    await openTab(h, "Usage reports");
    await h.waitFor(".usage-card", { timeout: 6000 });
    await h.sleep(800);
    const cards = await h.evaluate(() => [...document.querySelectorAll(".usage-card")].map((c) => ({
      title: c.querySelector(".usage-card-title")?.textContent.trim(), chart: !!c.querySelector(".growth-svg .growth-bar"), gap: c.querySelector(".usage-gap")?.textContent ?? null,
      def: c.querySelector(".usage-definition")?.textContent ?? "", headline: c.querySelector(".usage-headline")?.textContent ?? null,
    })));
    h.assert(!(await h.evaluate(() => /count guests/i.test(document.querySelector(".usage-panel").innerText))), "no guest toggle");
    h.assert(cards.length === 10 && cards.every((c) => c.def.length > 10), `ten cards, each with a definition: ${cards.map((c) => c.title).join(", ")}`);
    const by = Object.fromEntries(cards.map((c) => [c.title, c]));
    h.assert(by["Total users"]?.chart && by["New sign-ups by month"]?.chart, "total users and sign-ups by month are drawn");
    h.assert(/different signed-in accounts/i.test(by["Active users by month"]?.def ?? ""), "active users definition says exactly what counts");
    const fallbackNote = await h.exists(".usage-fallback-note");
    if (world === "before") {
      h.assert(fallbackNote, "says some graphs need the database step");
      h.assert(!by["Active users by month"].chart && /database step/.test(by["Active users by month"].gap ?? ""), "monthly active users: explains it needs the database step (no fake chart)");
      for (const t of ["Returning users by month", "Chapters read", "Notes written", "Articles marked as read"]) h.assert(!by[t].chart && /database step/.test(by[t].gap ?? ""), `${t}: needs the database step`);
      h.assert(/9/.test(by["Games played"].headline ?? "") && /Bible Trivia/.test(await cardText(h, "Games played")), "games: total 9 and by game with real names");
      h.assert(/Something is broken[\s\S]*3/.test(await cardText(h, "Problem reports")), "reports by category totals");
      h.assert(await h.evaluate(() => [...document.querySelectorAll(".usage-toggle input")].every((i) => i.disabled)), "team toggle disabled until the database step");
      // Daily active users ARE drawable now.
      await h.click({ css: ".usage-range-picker button", text: "30 days" });
      await h.sleep(900);
      h.assert(await h.evaluate(() => !![...document.querySelectorAll(".usage-card")].find((c) => c.querySelector(".usage-card-title")?.textContent.trim() === "Active users by day")?.querySelector(".growth-bar")), "daily active users drawn before the database step");
      await h.screenshot(`usage-before-30d-${tag}.png`);
      await h.click({ css: ".usage-range-picker button", text: "12 months" });
      await h.sleep(900);
    } else {
      h.assert(!fallbackNote, "no database-step note once 054 answers");
      const drawn = cards.filter((c) => c.chart).map((c) => c.title);
      h.assert(drawn.length === 9, `nine charts drawn (articles-marked has no data at all): ${drawn.join(", ")}`);
      h.assert(/Not recorded yet/.test(by["Articles marked as read"].gap ?? ""), "a metric with no history says 'not recorded yet', not zero");
      const before = h.requests.filter((r) => r.path.includes("admin_usage_report")).length;
      await h.click({ css: ".usage-toggle", text: "Leave out the team" });
      await h.sleep(900);
      h.assert(h.requests.filter((r) => r.path.includes("admin_usage_report")).length > before, "team toggle re-asks the function");
      h.assert(/Bible Trivia[\s\S]*5/.test(await cardText(h, "Games played")), "games by game summed from per-period rows");
    }

    // Exact values: tooltip on a bar, and the table.
    const hit = await h.evaluate(() => {
      const c = [...document.querySelectorAll(".usage-card")].find((x) => x.querySelector(".usage-card-title")?.textContent.trim() === "Total users");
      const r = [...c.querySelectorAll(".growth-hit")].at(-1).getBoundingClientRect();
      c.scrollIntoView({ block: "center", behavior: "instant" });
      const r2 = [...c.querySelectorAll(".growth-hit")].at(-1).getBoundingClientRect();
      return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2, w: r.width };
    });
    await h.evaluate((x, y) => document.elementFromPoint(x, y)?.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })) , hit.x, hit.y);
    await h.touch([{ x: hit.x, y: hit.y }]);
    await h.sleep(300);
    const tip = await h.evaluate(() => document.querySelector(".usage-card .growth-tooltip")?.innerText ?? null);
    h.assert(!!tip && /\d/.test(tip), `tooltip shows an exact value: ${tip?.replace(/\n/g, " ")}`);
    const table = await h.evaluate(() => {
      const c = [...document.querySelectorAll(".usage-card")].find((x) => x.querySelector(".usage-card-title")?.textContent.trim() === "Active users by month");
      const d = c.querySelector("details"); if (!d) return null; d.open = true;
      return [...d.querySelectorAll("tbody tr")].map((tr) => tr.innerText.replace(/\s+/g, " "));
    });
    if (world === "after") h.assert(table && table.length === 12 && table.some((t) => /not recorded/.test(t)), `table lists every period; before history_from reads 'not recorded' (${table?.length} rows)`);

    h.assert(!(await overflowX(h)), "nothing sticks out sideways");
    await h.evaluate(() => document.querySelector(".usage-panel")?.scrollIntoView({ block: "start", behavior: "instant" }));
    await h.screenshot(`usage-${world}-${tag}.png`);
    await h.evaluate(() => [...document.querySelectorAll(".usage-card")][2]?.scrollIntoView({ block: "start", behavior: "instant" }));
    await h.screenshot(`usage-${world}-cards-${tag}.png`);

    // Problem reports tab still opens the queue.
    await openTab(h, "Problem reports");
    h.assert(await h.exists(".report-embedded"), "Problem reports tab opens the reports queue");
  }
};

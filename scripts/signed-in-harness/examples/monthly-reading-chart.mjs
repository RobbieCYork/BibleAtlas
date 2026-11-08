/**
 * My Profile → My Reading: the 12-month "chapters read per month" bar chart.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 375x667 --script scripts/signed-in-harness/examples/monthly-reading-chart.mjs
 * Seeds chapter_reads across known months (plus one row older than the window, which must not count),
 * then checks the bars and the screen-reader table against the seeded numbers.
 */
import { BOOKS } from "../../../src/data/bibleBooks.ts";
import { PERSONAS } from "../lib/personas.mjs";

export default async function (h) {
  h.section("Monthly reading chart");
  const userId = PERSONAS[h.persona].id;
  const now = new Date();
  const at = (monthsAgo, day = 10) => new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 12).toISOString();
  // months ago → chapters read in that month
  const plan = { 0: 3, 1: 12, 3: 7, 11: 1, 14: 5 };
  const chapters = BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ book: b.name, chapter: i + 1 })));
  const rows = [];
  for (const [ago, n] of Object.entries(plan))
    for (let i = 0; i < n; i++) rows.push({ user_id: userId, ...chapters[rows.length], read_at: at(Number(ago)) });
  h.backend.setTable("chapter_reads", rows);
  await h.reload();

  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
  await h.click({ css: "button, [role=menuitem]", text: "My Profile" });
  await h.waitFor(".monthly-reading", { timeout: 8000 });

  const table = await h.evaluate(() =>
    [...document.querySelectorAll(".monthly-reading table tbody tr")].map((tr) => Number(tr.querySelector("td").textContent)));
  h.assert(table.length === 12, `12 months in the table (${table.length})`);
  const expected = Array.from({ length: 12 }, (_, i) => plan[11 - i] ?? 0);
  h.assert(JSON.stringify(table) === JSON.stringify(expected), `counts oldest→newest ${JSON.stringify(table)} == ${JSON.stringify(expected)}`);

  const heights = await h.evaluate(() => [...document.querySelectorAll(".monthly-reading-bar")].map((b) => Math.round(b.getBoundingClientRect().height)));
  h.assert(heights[10] > heights[8] && heights[8] > heights[11] && heights[11] > 0, `bar heights ordered by count ${JSON.stringify(heights)}`);
  h.assert(heights[0] > 0 && heights[1] === 0, "a 1-chapter month still shows; a 0-chapter month is empty");

  const readout = await h.text(".monthly-reading-readout");
  h.assert(/: 3$/.test(readout.trim()), `readout defaults to this month (${readout})`);
  const thisMonth = await h.evaluate(() => document.querySelector(".reading-progress-summary span:nth-child(2) strong").textContent);
  h.assert(thisMonth === "3", `chart agrees with "chapters read this month" (${thisMonth})`);

  await h.click(".monthly-reading-col", { index: 10 });
  const readout2 = await h.text(".monthly-reading-readout");
  h.assert(/: 12$/.test(readout2.trim()), `tapping last month's bar shows its count (${readout2})`);

  const plot = await h.rect(".monthly-reading-plot");
  const vw = await h.evaluate(() => window.innerWidth);
  h.assert(plot && plot.right <= vw, `chart fits the viewport (${plot?.right} <= ${vw})`);
  const overflow = await h.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  h.assert(!overflow, "no horizontal page scroll");
  await h.evaluate(() => document.querySelector(".monthly-reading").scrollIntoView({ block: "center", behavior: "instant" }));
  await h.screenshot("monthly-reading.png");
}

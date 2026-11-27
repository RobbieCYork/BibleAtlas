/**
 * Compact timeline: bands only as tall as what is on screen, the five-year working zoom, smooth
 * re-fitting that never moves the scrolled view, large text, and jumping to an event.
 *
 *   node scripts/signed-in-harness/run.mjs --viewport 390x844  --script scripts/signed-in-harness/examples/timeline-compact.mjs
 *   node scripts/signed-in-harness/run.mjs --viewport 1280x800 --script scripts/signed-in-harness/examples/timeline-compact.mjs
 */
const CTRL = 2;
const LABEL_RESERVE = 24, EVENT_ROW = 26, LIFE_ROW = 28, PAD = 4, EMPTY = 6;

export default async function (h) {
  const [W, H] = h.viewport.split("x").map(Number);
  const openTimeline = async () => {
    await h.sleep(1500);
    if (!(await h.exists(".timeline-mode"))) {
      const direct = { css: ".mobile-tab-bar button, .desktop-footer button, footer button", text: "Timeline" };
      if (await h.exists(direct)) await h.click(direct);
      else {
        await h.click(".hamburger-button, .panel-menu-button, .mobile-nav-menu-button");
        await h.click({ css: ".mobile-nav-menu-item, .panel-menu-link", text: "Timeline" });
      }
    }
    await h.waitFor(".tl-life-bar");
    await h.sleep(900);
  };
  const size = (height) => h.cdp("Emulation.setDeviceMetricsOverride", { width: W, height, deviceScaleFactor: 1, mobile: false });

  /* Everything measured from the DOM, with the pointer parked on the header so that nothing is
   * hovered (a hovered mark is drawn larger, on purpose). */
  const state = async () => {
    await h.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
    await h.sleep(200);
    return measure();
  };
  const measure = () => h.evaluate(() => {
    const vpEl = document.querySelector(".tl-canvas-viewport");
    const vp = vpEl.getBoundingClientRect();
    const ticks = [...document.querySelectorAll(".tl-axis-label")].filter((e) => !e.textContent.includes("·"))
      .map((e) => ({ y: (e.textContent.startsWith("AD") ? 1 : -1) * parseInt(e.textContent.replace(/\D+/g, ""), 10), x: parseFloat(e.style.left) }));
    const years = [...new Set(ticks.map((t) => t.y))].sort((a, b) => a - b);
    const interval = Math.min(...years.slice(1).map((y, i) => y - years[i]));
    const first = ticks[0], other = ticks.find((t) => t.y !== first.y);
    const pxy = (other.x - first.x) / (other.y - first.y);
    const tx = new DOMMatrix(getComputedStyle(document.querySelector(".tl-scroller")).transform).m41;
    const start = first.y - first.x / pxy - tx / pxy;
    const items = [...document.querySelectorAll(".tl-marker,.tl-range-bar,.tl-life-bar,.tl-cluster")];
    const bands = [...document.querySelectorAll(".tl-lane-underlay")].map((u) => {
      const r = u.getBoundingClientRect();
      return { name: u.className.replace("tl-lane-underlay ", "").replace(/tl-(lane|band)-/, ""), top: r.top - vp.top, h: r.height, styleTop: parseFloat(u.style.top), styleH: parseFloat(u.style.height), rows: new Set(), pills: [], outside: [] };
    });
    for (const i of items) {
      const b = i.getBoundingClientRect();
      const label = i.querySelector(".tl-marker-title,.tl-range-bar-label,.tl-life-label-outside");
      const boxes = [b, label?.getBoundingClientRect()].filter(Boolean);
      const left = Math.min(...boxes.map((x) => x.left)), right = Math.max(...boxes.map((x) => x.right));
      if (right <= vp.left + 0.5 || left >= vp.right - 0.5) continue;
      const cy = b.top + b.height / 2 - vp.top;
      const band = bands.find((x) => cy >= x.top && cy < x.top + x.h);
      if (!band) { continue; }
      band.rows.add(Math.round(cy));
      const top = Math.min(...boxes.map((x) => x.top)) - vp.top, bottom = Math.max(...boxes.map((x) => x.bottom)) - vp.top;
      if (top < band.top + 22 - 0.5 || bottom > band.top + band.h + 0.5) band.outside.push(`${i.getAttribute("aria-label")} ${Math.round(top - band.top)}..${Math.round(bottom - band.top)} of ${band.h}`);
      if (label) { const l = label.getBoundingClientRect(); band.pills.push({ n: i.getAttribute("aria-label"), t: l.top, b: l.bottom, l: l.left, r: l.right }); }
    }
    let inView = 0, orphan = 0;
    for (const i of items) {
      const b = i.getBoundingClientRect();
      if (b.right <= vp.left + 0.5 || b.left >= vp.right - 0.5) continue;
      inView++;
      const cy = b.top + b.height / 2 - vp.top;
      if (!bands.some((x) => cy >= x.top && cy < x.top + x.h)) orphan++;
    }
    return {
      pxy, start, span: vp.width / pxy, interval, readout: document.querySelector(".tl-range-readout").textContent,
      scrollTop: vpEl.scrollTop, viewportH: vpEl.clientHeight, scrollH: vpEl.scrollHeight, orphan, inView,
      overlaps: bands.flatMap((x) => x.pills.flatMap((p, i) => x.pills.slice(i + 1).filter((q) => Math.min(p.b, q.b) - Math.max(p.t, q.t) > 2 && Math.min(p.r, q.r) - Math.max(p.l, q.l) > 8).map((q) => `${p.n} / ${q.n}`))),
      bands: bands.map((x) => ({ name: x.name, top: x.top, h: x.h, rows: x.rows.size, outside: x.outside })),
    };
  });
  const fits = (s, label) => {
    const bad = s.bands.filter((b) => {
      const row = b.name === "life" ? LIFE_ROW : EVENT_ROW;
      return Math.abs(b.h - (LABEL_RESERVE + (b.rows ? b.rows * row + PAD : EMPTY))) > 0.6;
    });
    h.assert(bad.length === 0, `${label}: every band is exactly its visible rows (${s.bands.map((b) => `${b.name} ${b.rows} rows ${Math.round(b.h)}px`).join(", ")})`);
    h.assert(s.orphan === 0 && s.bands.every((b) => b.outside.length === 0), `${label}: every mark on screen is inside its band ${JSON.stringify(s.bands.flatMap((b) => b.outside))}`);
    h.assert(s.overlaps.length === 0, `${label}: no title pills on top of each other ${JSON.stringify(s.overlaps.slice(0, 4))}`);
  };
  const rect = () => h.rect(".tl-canvas-viewport");
  const wheel = async (deltaX, deltaY, { modifiers = 0, times = 1, wait = 700 } = {}) => {
    const r = await rect();
    for (let i = 0; i < times; i++) {
      await h.cdp("Input.dispatchMouseEvent", { type: "mouseWheel", x: Math.round(r.x + r.width / 2), y: Math.round(r.y + 40), deltaX, deltaY, modifiers });
      await h.sleep(30);
    }
    await h.sleep(wait);
  };
  const panToYear = async (year) => {
    for (let i = 0; i < 4; i++) { const s = await state(); const d = (year - s.start) * s.pxy; if (Math.abs(d) < 1) return; await wheel(d, 0); }
  };
  const reset = async () => {
    await h.evaluate(() => document.querySelector(".tl-canvas").focus({ preventScroll: true }));
    await h.cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "0", text: "0", code: "Digit0", windowsVirtualKeyCode: 48 });
    await h.cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "0", code: "Digit0", windowsVirtualKeyCode: 48 });
    await h.sleep(900);
  };

  await openTimeline();

  h.section("opening view");
  let s = await state();
  console.log(`    ${s.readout} | ${s.pxy.toFixed(2)} px/yr | ${s.span.toFixed(2)} years | ticks ${s.interval}`);
  h.assert(Math.abs(s.pxy - 40) < 0.01 && s.interval === 5, "opens at 40px per year with five-year ticks");
  h.assert(Math.abs(s.start + s.span / 2 - 31) < 0.05, "centred on AD 31");
  h.assert(s.bands.length === 4 && s.bands.every((b) => b.top + b.h <= s.viewportH), `all four bands fit one screen (viewport ${s.viewportH}px)`);
  h.assert(s.scrollH <= s.viewportH + 1, "nothing to scroll at the opening view");
  fits(s, "opening");
  await h.screenshot("compact-open.png");

  h.section("targets and legibility");
  const t = await h.evaluate(() => {
    const min = (sel) => Math.min(...[...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect().height));
    const m = [...document.querySelectorAll(".tl-marker")].find((e) => { const b = e.getBoundingClientRect(); return b.left > 20 && b.right < innerWidth - 20; });
    const r = m.getBoundingClientRect();
    return {
      pill: min(".tl-marker-title"), life: min(".tl-life-bar"), header: min(".tl-header button"),
      dotHit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2 + 11)?.closest("button") === m,
      name: getComputedStyle(document.querySelector(".tl-event-label-name")).fontSize,
      year: getComputedStyle(document.querySelector(".tl-event-label-year")).fontSize,
    };
  });
  h.assert(t.pill >= 24 && t.life >= 26 && t.header >= 36, `title pill ${t.pill}px, lifespan bar ${t.life}px, header button ${t.header}px`);
  h.assert(t.dotHit, "a marker dot can be hit 11px from its centre");
  h.assert(t.name === "10px" && t.year === "8.5px", `canvas type sizes unchanged (${t.name} / ${t.year})`);
  const named = await h.evaluate(() => {
    const vp = document.querySelector(".tl-canvas-viewport").getBoundingClientRect();
    return [...document.querySelectorAll(".tl-life-bar")].filter((b) => { const r = b.getBoundingClientRect(); return r.right > vp.left + 60 && r.left < vp.right - 60; })
      .map((b) => { const n = b.querySelector(".tl-event-label-name"); const r = n?.getBoundingClientRect(); return { who: b.getAttribute("aria-label"), ok: !!r && r.left >= vp.left - 0.5 && r.left < vp.right }; });
  });
  h.assert(named.length > 0 && named.every((n) => n.ok), `every lifespan on screen shows its name: ${named.filter((n) => !n.ok).map((n) => n.who)}`);

  h.section("fits after panning and zooming");
  for (const year of [-1446, -605, 29, 320, 1515, 1735]) {
    await panToYear(year);
    s = await state();
    fits(s, `${s.readout}`);
  }
  await reset();
  await wheel(0, 25, { modifiers: CTRL, times: 3 });
  fits(await state(), "zoomed out");
  await wheel(0, -25, { modifiers: CTRL, times: 7 });
  fits(await state(), "zoomed in");

  h.section("no breathing during a drag, glide afterwards");
  await reset();
  await panToYear(-1000);
  // Record every band height on every frame while panning forward through busy and empty years.
  await h.evaluate(() => {
    window.__log = [];
    const tick = () => { window.__log.push([...document.querySelectorAll(".tl-lane-underlay")].map((u) => [parseFloat(u.style.height), u.getBoundingClientRect().height])); if (window.__log.length < 600) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const r0 = await rect();
  for (let i = 0; i < 60; i++) { await h.cdp("Input.dispatchMouseEvent", { type: "mouseWheel", x: r0.x + 100, y: r0.y + 40, deltaX: 30, deltaY: 0 }); await h.sleep(25); }
  const during = await h.evaluate(() => window.__log.length);
  await h.sleep(900);
  const log = await h.evaluate(() => window.__log);
  let shrankDuring = 0;
  for (let f = 1; f < during - 1; f++) for (let b = 0; b < 4; b++) if (log[f][b][0] < log[f - 1][b][0]) shrankDuring++;
  const between = log.filter((f) => f.some(([target, drawn]) => Math.abs(target - drawn) > 1)).length;
  h.assert(shrankDuring <= 1, `bands do not shrink while the view is moving (${shrankDuring} shrink steps in ${during} frames)`);
  h.assert(between >= 3, `height changes are animated (${between} in-between frames)`);
  fits(await state(), "at rest after the drag");

  h.section("a scrolled view does not leap");
  await size(Math.min(H, 430));
  await h.sleep(600);
  await reset();
  await panToYear(1515);
  // Put the Lifespans band at the top of the window, then move to years where the band above is taller.
  const scrollTo = async (top) => { await h.evaluate((v) => { document.querySelector(".tl-canvas-viewport").scrollTop = v; }, top); await h.sleep(500); };
  s = await state();
  await scrollTo(s.scrollTop + s.bands.find((b) => b.name === "life").top + 10);
  let a = await state();
  await panToYear(29);
  let b = await state();
  const at = (st, n) => st.bands.find((x) => x.name === n);
  console.log(`    band above ${Math.round(at(a, "bible-church").h)} -> ${Math.round(at(b, "bible-church").h)} | scrollTop ${a.scrollTop} -> ${b.scrollTop} | lifespans top ${at(a, "life").top} -> ${at(b, "life").top}`);
  h.assert(Math.abs(at(b, "bible-church").h - at(a, "bible-church").h) > 20, "the band above changed height");
  h.assert(Math.abs(at(b, "life").top - at(a, "life").top) <= 1, "the band at the top of the window stayed put");
  // Bottom of the stack, then shrink everything.
  await panToYear(1515);
  await scrollTo(99999);
  a = await state();
  await panToYear(1990);
  b = await state();
  const anchorName = a.bands.find((x) => x.top + x.h + 22 > 0).name;
  console.log(`    at the bottom: anchor ${anchorName} top ${at(a, anchorName).top} -> ${at(b, anchorName).top} | scrollTop ${a.scrollTop} -> ${b.scrollTop} of ${b.scrollH - b.viewportH}`);
  h.assert(at(b, anchorName).top >= at(a, anchorName).top - at(a, anchorName).h && Math.abs(at(b, anchorName).top - at(a, anchorName).top) <= Math.max(1, at(a, anchorName).h - at(b, anchorName).h), "bands shrinking under a bottom-scrolled view keep the top band in place");
  await wheel(0, -600, { times: 4 });
  b = await state();
  const stack = b.bands.reduce((n, x) => n + x.h + 22, 0);
  h.assert(b.scrollTop === 0 && b.scrollH <= Math.max(stack, b.viewportH) + 1, `scrolling back up releases the spare room (scroll height ${b.scrollH}, bands ${Math.round(stack)}, window ${b.viewportH})`);
  await size(H);
  await h.sleep(600);

  h.section("lanes menu");
  await reset();
  await h.click({ css: ".tl-lane-menu-button:not(.tl-era-menu-button)" });
  await h.click({ css: ".tl-lane-menu-item", text: "Lifespans" });
  await h.sleep(600);
  s = await state();
  h.assert(s.bands.length === 3, "unchecking Lifespans removes its band");
  fits(s, "three bands");
  await h.click({ css: ".tl-lane-menu-item", text: "Lifespans" });
  await h.click({ css: ".tl-lane-menu-button:not(.tl-era-menu-button)" });
  await h.sleep(500);

  h.section("the whole span");
  await h.click(".tl-era-menu-button"); await h.click(".tl-era-menu-all"); await h.sleep(1200);
  s = await state();
  h.assert(s.span > 5000 && (await h.exists(".tl-cluster")), `whole span still reachable (${s.readout})`);
  console.log(`    bands: ${s.bands.map((x) => `${x.name} ${Math.round(x.h)}`).join(", ")}`);
  await h.screenshot("compact-whole-span.png");

  h.section("jump to an event");
  await h.type('input[placeholder="Search timeline"]', "Diet of Worms");
  await h.sleep(600);
  await h.click({ css: "button, li, [role=option]", text: "Diet of Worms" });
  await h.sleep(900);
  if (await h.exists(".timeline-event-overlay")) await h.screenshot("compact-jump-article.png");
  s = await state();
  console.log(`    ${s.readout} | ${s.pxy.toFixed(2)} px/yr`);
  h.assert(Math.abs(s.pxy - 40) < 0.5 && Math.abs(s.start + s.span / 2 - 1521) < 0.6, "lands on the event at the working zoom");

  h.section("large text");
  await h.evaluate(() => localStorage.setItem("app-text-scale", "1.8"));
  await h.reload();
  await openTimeline();
  s = await state();
  fits(s, "large text");
  const head = await h.evaluate(() => {
    const q = (e) => document.querySelector(e);
    const buttons = [...document.querySelectorAll(".tl-header button")].map((e) => e.getBoundingClientRect());
    return {
      right: Math.max(...buttons.map((r) => r.right)), width: innerWidth,
      title: q(".tl-title").scrollWidth - q(".tl-title").clientWidth, readout: q(".tl-range-readout").scrollWidth - q(".tl-range-readout").clientWidth,
      oneRow: Math.max(...buttons.map((r) => r.top + r.height / 2)) - Math.min(...buttons.map((r) => r.top + r.height / 2)),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  h.assert(head.right <= head.width && head.oneRow < 2 && head.overflow <= 0, `header stays one row on screen ${JSON.stringify(head)}`);
  h.assert(head.title <= 0 && head.readout <= 0, "title and year readout are not truncated");
  await h.screenshot("compact-large-text.png");
}

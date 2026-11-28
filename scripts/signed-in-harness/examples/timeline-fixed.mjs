/**
 * The timeline with one fixed scale: five-year marks 195px apart, no zoom of any kind, band heights
 * that never change, "Go to" a year or an era, and trackpad / touch scrolling.
 *
 *   node scripts/signed-in-harness/run.mjs --viewport 402x874  --script scripts/signed-in-harness/examples/timeline-fixed.mjs
 *   node scripts/signed-in-harness/run.mjs --viewport 1280x800 --script scripts/signed-in-harness/examples/timeline-fixed.mjs
 *
 * Input goes through CDP (real browser input) except where noted: the whole-span sweep dispatches its
 * wheel events in the page, and Chrome has no Safari gesture* events, so those are synthetic too.
 * It cannot prove anything about iOS Safari itself.
 */
const CTRL = 2, META = 4;
const PX_PER_YEAR = 39, STEP_PX = 5 * PX_PER_YEAR;
/* In the order the bands stack. */
const HEIGHTS = { "bible-church": 340, life: 308, world: 184, religion: 158 };

export default async function (h) {
  const [W] = h.viewport.split("x").map(Number);
  const mobile = W < 768;
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

  /* Everything read from the DOM. The pixels-per-year figure comes from the drawn date labels. */
  const MEASURE = `(() => {
    const vpEl = document.querySelector(".tl-canvas-viewport");
    const vp = vpEl.getBoundingClientRect();
    const labels = [...document.querySelector(".tl-scroller").querySelectorAll(".tl-axis-strip + .tl-axis-label")];
    const strip = document.querySelector(".tl-axis-strip").parentElement;
    const ticks = [...strip.querySelectorAll(".tl-axis-label")].map((e) => {
      const r = e.getBoundingClientRect();
      const t = e.textContent;
      return { y: t.includes("·") ? 0 : (t.startsWith("AD") ? 1 : -1) * parseInt(t.replace(/\\D+/g, ""), 10), x: r.x + r.width / 2 - vp.x };
    }).sort((a, b) => a.x - b.x);
    const gaps = ticks.slice(1).map((t, i) => [t.x - ticks[i].x, t.y - ticks[i].y]);
    const startYear = ticks[0].y - ticks[0].x / ${PX_PER_YEAR};
    const bands = Object.fromEntries([...document.querySelectorAll(".tl-lane-underlay")].sort((p, q) => parseFloat(p.style.top) - parseFloat(q.style.top)).map((u) => [
      u.className.replace("tl-lane-underlay ", "").replace(/tl-(lane|band)-/, ""), Math.round(u.getBoundingClientRect().height * 10) / 10]));
    return {
      gaps, startYear, centerYear: startYear + vp.width / ${2 * PX_PER_YEAR}, bands,
      readout: document.querySelector(".tl-range-readout").textContent,
      top: Math.round(vpEl.scrollTop), scrollH: vpEl.scrollHeight, windowH: vpEl.clientHeight,
      scale: window.visualViewport.scale, width: innerWidth,
    };
  })()`;
  /* The pointer is parked on the app's top bar before measuring: a hovered mark is drawn larger, on
   * purpose, and must not be mistaken for two marks touching. */
  const park = () => h.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
  const state = async () => { await park(); await h.sleep(150); return h.evaluate(MEASURE); };
  const steady = (s) => s.gaps.length > 0 && s.gaps.every(([px, years]) => Math.abs(px - STEP_PX) < 0.75 && years === 5);
  const sameHeights = (s) => JSON.stringify(s.bands) === JSON.stringify(HEIGHTS);
  const check = (s, label) =>
    h.assert(steady(s) && sameHeights(s) && s.scale === 1,
      `${label}: five-year marks ${STEP_PX}px apart, heights ${Object.values(s.bands).join("/")}, page scale ${s.scale} ("${s.readout}")`);
  const goTo = async (text, era) => {
    await h.click(".tl-goto-button");
    await h.waitFor(".tl-goto-input");
    await h.type(".tl-goto-input", text);
    await h.click({ css: ".tl-goto-era button", text: era });
    await h.click(".tl-goto-submit");
    await h.sleep(800);
  };
  const press = async (key, code, windowsVirtualKeyCode, modifiers = 0) => {
    await h.cdp("Input.dispatchKeyEvent", { type: "keyDown", key, text: key.length === 1 ? key : key === "Enter" ? "\r" : undefined, code, windowsVirtualKeyCode, modifiers });
    await h.cdp("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode, modifiers });
    await h.sleep(250);
  };
  /* Marks on screen that are fully inside the window. */
  const onScreen = (title) => h.evaluate((title) => {
    const vp = document.querySelector(".tl-canvas-viewport").getBoundingClientRect();
    const el = [...document.querySelectorAll(".tl-marker,.tl-range-bar,.tl-life-bar")].find((e) => e.getAttribute("aria-label").startsWith(title));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x - vp.x), y: Math.round(r.y - vp.y), inView: r.right > vp.x && r.x < vp.right && r.y >= vp.y - 1 && r.bottom <= vp.bottom + 1, focused: el.classList.contains("tl-focused") };
  }, title);

  await openTimeline();

  h.section("opening view");
  let s = await state();
  console.log(`    ${s.readout} | window ${s.windowH}px, stack ${s.scrollH}px`);
  check(s, "opening");
  h.assert(Math.abs(s.centerYear - 31) < 0.05, `the life of Jesus is in the middle (centre year ${s.centerYear.toFixed(2)})`);
  for (const title of ["The Crucifixion", "The Resurrection", "Public Ministry of Jesus"]) {
    const m = await onScreen(title);
    h.assert(!!m && m.inView, `"${title}" is on the first screen ${JSON.stringify(m)}`);
  }
  const header = await h.evaluate(() => ({
    buttons: [...document.querySelectorAll(".tl-header button")].map((b) => b.getAttribute("aria-label")),
    goto: document.querySelector(".tl-goto-button").innerText.trim(),
    aria: document.querySelector(".tl-canvas").getAttribute("aria-label"),
    text: document.querySelector(".tl-root").innerText + [...document.querySelectorAll(".tl-root [aria-label], .tl-root [title]")].map((e) => (e.getAttribute("aria-label") || "") + (e.getAttribute("title") || "")).join(" "),
  }));
  h.assert(JSON.stringify(header.buttons) === JSON.stringify(["Close timeline", "Go to a year or era", "Choose visible timelines"]) && header.goto === "Go to",
    `header: Back, a labelled "Go to", Lanes ${JSON.stringify(header.buttons)}`);
  h.assert(!/zoom|pinch|whole span/i.test(header.text), "nothing on the timeline mentions zooming or the whole span");
  await h.screenshot(`fixed-${W}-open.png`);

  h.section("no zooming");
  const zoomStart = await state();
  const unchanged = async (label) => {
    await h.sleep(600);
    const now = await state();
    h.assert(now.scale === 1 && now.width === zoomStart.width && steady(now) && sameHeights(now) && Math.abs(now.startYear - zoomStart.startYear) < 0.05,
      `${label}: nothing changes (scale ${now.scale}, start ${now.startYear.toFixed(2)})`);
  };
  const rect = await h.rect(".tl-canvas-viewport");
  const at = { x: Math.round(rect.x + rect.width * 0.7), y: Math.round(rect.y + rect.height * 0.5) };
  const hdr = await h.rect(".tl-title");
  await h.evaluate(() => { window.__wheel = []; window.addEventListener("wheel", (e) => window.__wheel.push(e.defaultPrevented), { passive: true }); });
  const wheel = async (deltaX, deltaY, { modifiers = 0, times = 1, point = at } = {}) => {
    await h.evaluate(() => { window.__wheel = []; });
    for (let i = 0; i < times; i++) {
      await h.cdp("Input.dispatchMouseEvent", { type: "mouseWheel", x: point.x, y: point.y, deltaX, deltaY, modifiers });
      await h.sleep(30);
    }
    await h.sleep(500);
    return h.evaluate(() => window.__wheel.slice());
  };
  for (const [label, opts, dy] of [
    ["Ctrl + wheel in", { modifiers: CTRL }, -40], ["Ctrl + wheel out", { modifiers: CTRL }, 40],
    ["Cmd + wheel", { modifiers: META }, -100], ["pinch over the header (ctrl wheel)", { modifiers: CTRL, point: { x: Math.round(hdr.x + 5), y: Math.round(hdr.y + 5) } }, -10],
  ]) {
    const log = await wheel(0, dy, { ...opts, times: 5 });
    h.assert(log.length === 5 && log.every(Boolean), `${label}: swallowed, so the page cannot zoom either`);
    await unchanged(label);
  }
  const prevented = await h.evaluate((x, y) => [".tl-canvas", ".tl-header"].flatMap((sel) =>
    [["gesturestart", 1], ["gesturechange", 1.8], ["gestureend", 1.8]].map(([type, scale]) => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(e, { scale, clientX: x, clientY: y });
      document.querySelector(sel).dispatchEvent(e);
      return e.defaultPrevented;
    })), at.x, at.y);
  h.assert(prevented.every(Boolean), "Safari gesture events (synthetic) are all cancelled, over the lanes and the header");
  await unchanged("Safari gesture");
  await h.evaluate(() => document.querySelector(".tl-canvas").focus({ preventScroll: true }));
  for (const [key, code, vk] of [["+", "Equal", 187], ["=", "Equal", 187], ["-", "Minus", 189], ["_", "Minus", 189], ["0", "Digit0", 48]]) await press(key, code, vk);
  await unchanged("+ = - _ 0 keys");
  /* a point with open timeline under it */
  const open = await h.evaluate(() => {
    const r = document.querySelector(".tl-canvas-viewport").getBoundingClientRect();
    for (let y = r.y + 10; y < r.bottom - 10; y += 7)
      for (let x = r.x + r.width * 0.3; x < r.x + r.width * 0.9; x += 11)
        if ([-12, 0, 12].every((d) => { const e = document.elementFromPoint(x, y + d); return e?.closest(".tl-canvas") && !e.closest("button"); })) return { x: Math.round(x), y: Math.round(y) };
    return null;
  });
  for (const [type, clickCount] of [["mousePressed", 1], ["mouseReleased", 1], ["mousePressed", 2], ["mouseReleased", 2]])
    await h.cdp("Input.dispatchMouseEvent", { type, x: open.x, y: open.y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount });
  await unchanged("double-click");
  h.section("scrolling and panning");
  const swipeOrWheel = async (dx, dy) => {
    if (!mobile) return wheel(dx, dy);
    const r = await h.rect(".tl-canvas-viewport");
    await h.cdp("Input.synthesizeScrollGesture", { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), xDistance: -dx, yDistance: -dy, gestureSourceType: "touch", speed: 900, preventFling: true });
    await h.sleep(700);
  };
  if (mobile) await h.cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
  let a = await state();
  await swipeOrWheel(0, 200);
  let b = await state();
  h.assert(b.top - a.top > 150 && Math.abs(b.startYear - a.startYear) < 0.3, `vertical ${mobile ? "swipe" : "trackpad scroll"} moves down (${a.top} -> ${b.top}) without moving in time`);
  for (let i = 0; i < 6; i++) await swipeOrWheel(0, 300);
  b = await state();
  const lastAxis = await h.evaluate(() => {
    const vp = document.querySelector(".tl-canvas-viewport").getBoundingClientRect();
    const tab = document.querySelector(".mobile-tab-bar")?.getBoundingClientRect();
    return { gap: Math.round(vp.bottom - Math.max(...[...document.querySelectorAll(".tl-axis-strip")].map((e) => e.getBoundingClientRect().bottom))), clear: !tab || vp.bottom <= tab.top + 1 };
  });
  h.assert(b.top === Math.max(b.scrollH - b.windowH, 0) && lastAxis.gap >= -1 && lastAxis.clear, `reaches the bottom band and its dates (${b.top} of ${b.scrollH - b.windowH}) ${JSON.stringify(lastAxis)}`);
  await h.screenshot(`fixed-${W}-bottom.png`);
  for (let i = 0; i < 6; i++) await swipeOrWheel(0, -300);
  a = await state();
  await swipeOrWheel(200, 0);
  b = await state();
  h.assert(a.top === 0 && (b.startYear - a.startYear) * PX_PER_YEAR > 150 && b.top === 0, `horizontal ${mobile ? "swipe" : "trackpad swipe"} moves forward in time (${a.readout} -> ${b.readout})`);
  check(b, "after scrolling");
  a = b;
  if (mobile) await h.touch([...Array(8).keys()].map((i) => ({ x: 300 - i * 25, y: at.y })));
  else {
    const mouse = (type, x, buttons) => h.cdp("Input.dispatchMouseEvent", { type, x, y: open.y, button: "left", buttons, clickCount: 1 });
    await mouse("mouseMoved", open.x, 0); await mouse("mousePressed", open.x, 1);
    for (let i = 1; i <= 8; i++) { await mouse("mouseMoved", open.x - i * 22, 1); await h.sleep(30); }
    await h.sleep(200); await mouse("mouseReleased", open.x - 176, 0);
  }
  await h.sleep(900);
  b = await state();
  h.assert((b.startYear - a.startYear) * PX_PER_YEAR > 120 && !(await h.exists(".timeline-event-overlay")), `dragging pans (${a.readout} -> ${b.readout}) and opens nothing`);
  await h.evaluate(() => document.querySelector(".tl-canvas").focus({ preventScroll: true }));
  a = b; await press("ArrowLeft", "ArrowLeft", 37); await h.sleep(300); b = await state();
  h.assert(b.startYear < a.startYear, "left arrow key moves back in time");

  h.section("Go to a year");
  await h.click(".tl-goto-button");
  await h.waitFor(".tl-goto-input");
  const form = await h.evaluate(() => {
    const i = document.querySelector(".tl-goto-input"), d = document.querySelector(".tl-goto-dropdown").getBoundingClientRect();
    return { font: parseFloat(getComputedStyle(i).fontSize), mode: i.inputMode, pattern: i.pattern, hint: i.enterKeyHint, focused: document.activeElement === i,
      pressed: [...document.querySelectorAll(".tl-goto-era button")].find((x) => x.getAttribute("aria-pressed") === "true").textContent,
      targets: Math.min(...[...document.querySelectorAll(".tl-goto-row button, .tl-goto-input")].map((e) => e.getBoundingClientRect().height)),
      left: d.left, right: d.right, width: innerWidth, eras: document.querySelectorAll(".tl-era-menu-item").length,
      text: document.querySelector(".tl-goto-dropdown").innerText };
  });
  h.assert(form.font >= 16 && form.mode === "numeric" && form.pattern === "[0-9]*", `year box: ${form.font}px (no iOS focus zoom), numeric keypad`);
  h.assert(form.focused === !mobile, mobile ? "touch screen: the keyboard does not pop up by itself" : "mouse and keyboard: the year box has focus");
  h.assert(form.left >= 0 && form.right <= form.width + 0.5 && form.targets >= 40, `menu on screen, controls ${form.targets}px tall`);
  h.assert(form.eras === 13 && !/whole span|zoom/i.test(form.text), "13 eras, no whole span, no caption about zooming");
  await h.screenshot(`fixed-${W}-goto.png`);
  await h.type(".tl-goto-input", "0");
  await h.click(".tl-goto-submit");
  h.assert((await h.text(".tl-goto-error"))?.includes("no year 0"), "year 0 is refused, menu stays open");
  await h.screenshot(`fixed-${W}-goto-zero.png`);
  await h.type(".tl-goto-input", "a-b");
  await h.click(".tl-goto-submit");
  h.assert((await h.evaluate(() => document.querySelector(".tl-goto-input").value)) === "" && (await h.text(".tl-goto-error"))?.includes("Enter a year"), "letters are not accepted; an empty box asks for a year");
  await press("Escape", "Escape", 27);
  h.assert(!(await h.exists(".tl-goto-dropdown")), "Escape closes the menu");
  for (const [text, era, year] of [["1446", "BC", -1446], ["1517", "AD", 1517], ["1", "BC", -1], ["325", "AD", 325], ["4004", "BC", -4004], ["2021", "AD", 2021], ["30", "AD", 30]]) {
    await goTo(text, era);
    s = await state();
    const notice = await h.exists(".tl-notice");
    h.assert(Math.abs(s.centerYear - year) < 0.05 || (!mobile && Math.abs(year) > 3000 && Math.abs(s.centerYear - year) < 10), `${text} ${era}: centred (${s.centerYear.toFixed(2)}, "${s.readout}")`);
    h.assert(!notice && !(await h.exists(".tl-goto-dropdown")), "menu closes, no message");
    check(s, `${text} ${era}`);
  }
  for (const [text, era, year, words] of [["9999", "AD", 2021, "ends at AD 2021"], ["9000", "BC", -4004, "starts at 4004 BC"], ["2026", "AD", 2021, "ends at AD 2021"]]) {
    await goTo(text, era);
    s = await state();
    const msg = await h.text(".tl-notice");
    h.assert(Math.abs(s.centerYear - year) < 0.05 && !!msg && msg.includes(words), `${text} ${era}: nearest end, "${msg}"`);
    check(s, `${text} ${era}`);
  }
  await h.screenshot(`fixed-${W}-out-of-range.png`);
  await h.sleep(6000);
  h.assert(!(await h.exists(".tl-notice")), "the message goes away");
  if (!mobile) {
    await h.click(".tl-goto-button");
    for (const c of "1066") await press(c, `Digit${c}`, c.charCodeAt(0));
    await press("Enter", "Enter", 13);
    await h.sleep(800);
    s = await state();
    h.assert(Math.abs(s.centerYear - 1066) < 0.05, `keyboard only: type a year and press Enter (${s.centerYear.toFixed(2)})`);
    await goTo("586", "BC");
    await h.click(".tl-goto-button");
    h.assert((await h.evaluate(() => document.querySelector('.tl-goto-era button[aria-pressed="true"]').textContent)) === "BC", "reopened in BC years, BC is selected");
    await press("Escape", "Escape", 27);
  }

  h.section("eras");
  for (let i = 0; i < 13; i++) {
    await h.click(".tl-goto-button");
    await h.click(".tl-era-menu-item", { index: i });
    await h.sleep(800);
    s = await state();
    const seen = await h.evaluate(() => {
      const vp = document.querySelector(".tl-canvas-viewport").getBoundingClientRect();
      return [...document.querySelectorAll(".tl-marker,.tl-range-bar")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > vp.x && r.x < vp.right; }).length;
    });
    h.assert(steady(s) && sameHeights(s) && seen > 0, `era ${i + 1}: "${s.readout}", ${seen} events across the screen, heights unchanged`);
  }

  h.section("search jumps");
  for (const [query, label, year] of [["Diet of Worms", "Diet of Worms", 1521], ["Korah", "Korah's Rebellion", -1444], ["The Resurrection", "The Resurrection", 30]]) {
    await h.type('input[placeholder="Search timeline"]', query);
    await h.sleep(600);
    await h.click({ css: "button, li, [role=option]", text: query });
    await h.sleep(900);
    if (await h.exists(".timeline-event-overlay")) await h.click({ css: ".timeline-event-overlay button", text: "Back" }).catch(async () => h.click(".timeline-event-overlay .back-btn"));
    await h.sleep(500);
    s = await state();
    const m = await onScreen(label);
    h.assert(!!m && m.inView && Math.abs(s.centerYear - year) < 1.5, `"${query}": panned there and scrolled to it ${JSON.stringify(m)} ("${s.readout}")`);
    check(s, query);
    if (query === "Korah") await h.screenshot(`fixed-${W}-search.png`);
  }
  const target = await h.evaluate(() => {
    const vp = document.querySelector(".tl-canvas-viewport").getBoundingClientRect();
    const el = [...document.querySelectorAll(".tl-marker")].find((e) => { const r = e.getBoundingClientRect(); return r.x > vp.x + 5 && r.right < vp.right - 5 && r.y > vp.y + 5 && r.bottom < vp.bottom - 5 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e; });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (mobile) await h.touch([target]);
  else for (const type of ["mousePressed", "mouseReleased"]) await h.cdp("Input.dispatchMouseEvent", { type, x: target.x, y: target.y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
  await h.sleep(700);
  h.assert(await h.exists(".timeline-event-overlay"), "tapping a mark still opens its article");
  await h.click({ css: ".timeline-event-overlay button", text: "Back" }).catch(async () => h.click(".timeline-event-overlay .back-btn"));
  await h.sleep(500);

  h.section("pan across the whole span");
  await goTo("4004", "BC");
  await park();
  await h.sleep(300);
  const sweep = await h.evaluate(async (measure) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const vpEl = document.querySelector(".tl-canvas-viewport");
    const seen = new Set(), heights = new Set(), problems = [];
    let steps = 0, maxDomPx = 0, maxShift = 0, maxNodes = 0, badTicks = 0, shortStrips = 0, first = null, last = null, prev = null;
    for (;;) {
      await frame();
      const s = (0, eval)(measure);
      const vp = vpEl.getBoundingClientRect();
      first ??= s.readout; last = s.readout;
      heights.add(JSON.stringify(s.bands));
      if (!s.gaps.every(([px, years]) => Math.abs(px - 195) < 0.75 && years === 5)) badTicks++;
      if ([...document.querySelectorAll(".tl-axis-strip")].some((e) => { const r = e.getBoundingClientRect(); return r.left > vp.left + 0.5 || r.right < vp.right - 0.5; })) shortStrips++;
      const scroller = document.querySelector(".tl-scroller");
      maxShift = Math.max(maxShift, Math.abs(new DOMMatrix(getComputedStyle(scroller).transform).m41));
      const marks = [...scroller.querySelectorAll(".tl-marker,.tl-range-bar,.tl-life-bar")];
      maxNodes = Math.max(maxNodes, scroller.querySelectorAll("*").length);
      let lo = Infinity, hi = -Infinity;
      const boxes = [];
      const bands = [...document.querySelectorAll(".tl-lane-underlay")].map((u) => u.getBoundingClientRect());
      for (const m of marks) {
        const label = m.querySelector(".tl-marker-title,.tl-range-bar-label,.tl-life-label-outside");
        const rs = [m.getBoundingClientRect(), label?.getBoundingClientRect()].filter(Boolean);
        const r = { l: Math.min(...rs.map((x) => x.left)), r: Math.max(...rs.map((x) => x.right)), t: Math.min(...rs.map((x) => x.top)), b: Math.max(...rs.map((x) => x.bottom)), n: m.getAttribute("aria-label") };
        lo = Math.min(lo, r.l); hi = Math.max(hi, r.r);
        boxes.push(r);
        if (r.r > vp.left && r.l < vp.right) {
          seen.add(r.n);
          if (!bands.some((band) => r.t >= band.top + 21 - 0.5 && r.b <= band.bottom + 0.5)) problems.push(`outside its band: ${r.n}`);
        }
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const p = boxes[i], q = boxes[j];
          if (Math.min(p.b, q.b) - Math.max(p.t, q.t) > 1 && Math.min(p.r, q.r) - Math.max(p.l, q.l) > 0.5) problems.push(`overlap: ${p.n} / ${q.n}`);
        }
      if (boxes.length) maxDomPx = Math.max(maxDomPx, hi - lo);
      steps++;
      if (prev !== null && Math.abs(s.startYear - prev) < 0.001) break;
      prev = s.startYear;
      vpEl.dispatchEvent(new WheelEvent("wheel", { deltaX: Math.round(vp.width * 0.75), bubbles: true, cancelable: true }));
      if (steps > 2000) break;
    }
    return { steps, first, last, seen: seen.size, heights: [...heights], problems: [...new Set(problems)].slice(0, 8), problemCount: new Set(problems).size, maxDomPx: Math.round(maxDomPx), maxShift: Math.round(maxShift), maxNodes, badTicks, shortStrips, overflow: document.documentElement.scrollWidth - innerWidth };
  }, MEASURE);
  console.log(`    ${JSON.stringify({ ...sweep, heights: sweep.heights })}`);
  h.assert(sweep.heights.length === 1 && sweep.heights[0] === JSON.stringify(HEIGHTS), `${sweep.steps} stops from "${sweep.first}" to "${sweep.last}": one set of band heights throughout`);
  h.assert(sweep.badTicks === 0, "five-year marks 195px apart at every stop");
  h.assert(sweep.shortStrips === 0, `the date row runs the full width at every stop (${sweep.shortStrips} short)`);
  h.assert(sweep.problemCount === 0, `no mark or label overlaps another or leaves its band ${JSON.stringify(sweep.problems)}`);
  h.assert(sweep.seen === 403, `every drawn event and lifetime comes on screen (${sweep.seen} of 403)`);
  h.assert(sweep.maxShift <= 1024 && sweep.overflow <= 0, `largest transform ${sweep.maxShift}px, marks span at most ${sweep.maxDomPx}px, ${sweep.maxNodes} nodes at most`);

  h.section("lifetimes keep their names");
  await goTo("900", "BC");
  const unnamed = [];
  for (const [text, era] of [["3500", "BC"], ["2000", "BC"], ["30", "AD"], ["60", "AD"], ["1950", "AD"]]) {
    await goTo(text, era);
    unnamed.push(...(await h.evaluate(() => {
      const vp = document.querySelector(".tl-canvas-viewport").getBoundingClientRect();
      return [...document.querySelectorAll(".tl-life-bar")].filter((b) => { const r = b.getBoundingClientRect(); return r.right > vp.left + 150 && r.left < vp.right - 150; })
        .filter((b) => { const n = b.querySelector(".tl-event-label-name"); const r = n.getBoundingClientRect(); return !(r.right > vp.left && r.left >= vp.left - 0.5 && r.left < vp.right); })
        .map((b) => b.getAttribute("aria-label"));
    })));
  }
  h.assert(unnamed.length === 0, `every long lifetime on screen shows its name ${JSON.stringify(unnamed)}`);

  h.section("lanes menu");
  await goTo("30", "AD");
  await h.click({ css: ".tl-lane-menu-button[aria-label='Choose visible timelines']" });
  const menu = await h.evaluate(() => {
    const d = document.querySelector(".tl-lane-menu-dropdown");
    const last = d.lastElementChild;
    return { text: d.innerText, caption: !!d.querySelector(".tl-lane-menu-caption"), last: last.className, border: getComputedStyle(last).borderBottomWidth,
      below: Math.round(d.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom) };
  });
  h.assert(!menu.caption && !/generous height|more scrolling/.test(menu.text) && menu.last === "tl-lane-menu-item" && menu.border === "0px" && menu.below <= 10,
    `no caption or divider under the checklist ${JSON.stringify({ last: menu.last, below: menu.below })}`);
  await h.screenshot(`fixed-${W}-lanes.png`);
  await h.click({ css: ".tl-lane-menu-item", text: "Lifespans" });
  await h.sleep(500);
  s = await state();
  h.assert(JSON.stringify(s.bands) === JSON.stringify({ "bible-church": 340, world: 184, religion: 158 }), `hiding a lane removes it and leaves the others' heights ${JSON.stringify(s.bands)}`);
  await h.click({ css: ".tl-lane-menu-item", text: "Lifespans" });
  await h.click({ css: ".tl-lane-menu-button[aria-label='Choose visible timelines']" });
  await h.sleep(500);
  check(await state(), "lane shown again");

  h.section("resizing the window");
  const [, H] = h.viewport.split("x").map(Number);
  for (const [w, hgt] of [[W, 480], [mobile ? 320 : 900, H], [mobile ? 844 : 1920, mobile ? 390 : 1080]]) {
    await h.cdp("Emulation.setDeviceMetricsOverride", { width: w, height: hgt, deviceScaleFactor: 1, mobile: false });
    await h.sleep(700);
    s = await state();
    h.assert(steady(s) && sameHeights(s), `${w}x${hgt}: same scale and heights`);
  }
  await h.cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile });
  await h.sleep(500);

  h.section("large text");
  await h.evaluate(() => localStorage.setItem("app-text-scale", "1.8"));
  await h.reload();
  await openTimeline();
  s = await state();
  check(s, "large text");
  const head = await h.evaluate(() => {
    const buttons = [...document.querySelectorAll(".tl-header button")].map((e) => e.getBoundingClientRect());
    const q = (e) => document.querySelector(e);
    return { right: Math.max(...buttons.map((r) => r.right)), width: innerWidth,
      oneRow: Math.max(...buttons.map((r) => r.top + r.height / 2)) - Math.min(...buttons.map((r) => r.top + r.height / 2)),
      overflow: document.documentElement.scrollWidth - innerWidth,
      title: q(".tl-title").scrollWidth - q(".tl-title").clientWidth, readout: q(".tl-range-readout").scrollWidth - q(".tl-range-readout").clientWidth };
  });
  h.assert(head.right <= head.width && head.oneRow < 2 && head.overflow <= 0, `header stays one row on screen ${JSON.stringify(head)}`);
  console.log(`    large text: title cut by ${head.title}px, year readout cut by ${head.readout}px`);
  await h.click(".tl-goto-button");
  const big = await h.evaluate(() => { const d = document.querySelector(".tl-goto-dropdown").getBoundingClientRect(); const g = document.querySelector(".tl-goto-submit").getBoundingClientRect(); return { left: d.left, right: d.right, go: g.right, width: innerWidth }; });
  h.assert(big.left >= 0 && big.right <= big.width + 0.5 && big.go <= big.right, `large text: the Go to menu fits ${JSON.stringify(big)}`);
  await h.screenshot(`fixed-${W}-large-text.png`);

  if (!mobile) return;
  h.section("touch: pinch and double-tap");
  /* Lift the page's own "no zooming" viewport tag (iOS ignores it) so that only the timeline's own
   * defences are being tested. Last in the script because the init script stays for good. */
  await h.addInitScript(`new MutationObserver((_, o) => { const m = document.querySelector('meta[name="viewport"]'); if (m) { m.setAttribute("content", "width=device-width, initial-scale=1"); o.disconnect(); } }).observe(document, { childList: true, subtree: true });`);
  await h.evaluate(() => localStorage.removeItem("app-text-scale"));
  await h.cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
  await h.reload(); await openTimeline();
  const lanes = await h.rect(".tl-canvas-viewport");
  const title = await h.rect(".tl-title");
  const cx = Math.round(lanes.x + lanes.width / 2), cy = Math.round(lanes.y + lanes.height * 0.4);
  const start = await state();
  const still = async (label) => {
    await h.sleep(700);
    const now = await state();
    h.assert(now.scale === 1 && now.width === start.width && steady(now) && sameHeights(now), `${label}: scale ${now.scale}, marks and heights unchanged`);
  };
  const pinch = async (y, from, to) => {
    const send = (type, d) => h.cdp("Input.dispatchTouchEvent", { type, touchPoints: d === null ? [] : [{ x: cx - d, y, id: 0 }, { x: cx + d, y, id: 1 }] });
    await send("touchStart", from);
    for (let i = 1; i <= 10; i++) { await h.sleep(30); await send("touchMove", from + ((to - from) * i) / 10); }
    await h.sleep(100); await send("touchEnd", null);
  };
  await pinch(cy, 30, 160); await still("two fingers apart on the lanes");
  await pinch(cy, 160, 30); await still("two fingers together on the lanes");
  await pinch(Math.round(title.y + title.height / 2), 30, 150); await still("two fingers apart on the header");
  h.assert(!(await h.exists(".timeline-event-overlay")), "a pinch opens no article");
  await h.cdp("Input.synthesizePinchGesture", { x: cx, y: cy, scaleFactor: 2.5, gestureSourceType: "touch" });
  await still("browser pinch gesture over the lanes");
  for (let i = 0; i < 2; i++) await h.cdp("Input.synthesizeTapGesture", { x: cx, y: Math.round(lanes.bottom - 20), gestureSourceType: "touch", tapCount: 2 });
  await still("double-tap");
  if (await h.exists(".timeline-event-overlay")) await h.click(".timeline-event-overlay .back-btn");
  /* Control: the very same gestures over a plain block laid on top DO zoom the page here. */
  await h.evaluate(() => { const d = document.createElement("div"); d.id = "pinch-control"; d.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.01)"; document.body.appendChild(d); });
  await h.sleep(300);
  await h.cdp("Input.synthesizePinchGesture", { x: cx, y: cy, scaleFactor: 2, gestureSourceType: "touch" });
  await h.sleep(700);
  const control = await h.evaluate(() => window.visualViewport.scale);
  h.assert(control > 1.2, `control: the same gesture off the timeline does zoom the page (scale ${control.toFixed(2)})`);
}

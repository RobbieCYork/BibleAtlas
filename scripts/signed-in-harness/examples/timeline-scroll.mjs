/**
 * Timeline gestures. A plain wheel / two-finger scroll moves and never zooms; Ctrl or ⌘ + wheel
 * (which is how browsers report a trackpad pinch) zooms at the pointer; mouse drag and touch behave.
 *
 *   node scripts/signed-in-harness/run.mjs --viewport 1280x800 --script scripts/signed-in-harness/examples/timeline-scroll.mjs
 *   node scripts/signed-in-harness/run.mjs --viewport 390x844  --script scripts/signed-in-harness/examples/timeline-scroll.mjs
 *
 * Input goes through CDP (real browser input), except the Safari gesture* events, which Chrome does
 * not have and are therefore synthetic.
 */
const CTRL = 2, META = 4, SHIFT = 8;

export default async function (h) {
  const mobile = Number(h.viewport.split("x")[0]) < 768;
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
  await h.sleep(800);

  await h.evaluate(() => {
    window.__wheel = [];
    window.addEventListener("wheel", (e) => window.__wheel.push(e.defaultPrevented), { passive: true });
  });

  /* The widest lifespan bar is the zoom gauge: its width is proportional to pixels-per-year. */
  const gauge = await h.evaluate(() => {
    const bars = [...document.querySelectorAll(".tl-life-bar")];
    bars.sort((a, b) => parseFloat(b.style.width) - parseFloat(a.style.width));
    return bars[0].getAttribute("aria-label");
  });
  const state = () => h.evaluate((label) => {
    const vp = document.querySelector(".tl-canvas-viewport");
    const bar = [...document.querySelectorAll(".tl-life-bar")].find((b) => b.getAttribute("aria-label") === label);
    const m = new DOMMatrix(getComputedStyle(document.querySelector(".tl-scroller")).transform);
    return {
      top: Math.round(vp.scrollTop), max: vp.scrollHeight - vp.clientHeight,
      zoom: Math.round(parseFloat(bar.style.width) * 100) / 100,
      tx: Math.round(m.m41 * 10) / 10,
      range: document.querySelector(".tl-range-readout").textContent,
      scale: window.visualViewport.scale, innerWidth: window.innerWidth,
      path: location.pathname, history: history.length,
    };
  }, gauge);
  const show = (name, a, b) =>
    console.log(`    ${name}: scrollTop ${a.top} -> ${b.top} | zoom ${a.zoom} -> ${b.zoom} | x ${a.tx} -> ${b.tx} | "${b.range}"`);

  const rect = await h.rect(".tl-canvas-viewport");
  const at = { x: Math.round(rect.x + rect.width * 0.7), y: Math.round(rect.y + rect.height * 0.5) };
  const wheel = async (deltaX, deltaY, { modifiers = 0, times = 1, point = at } = {}) => {
    await h.evaluate(() => { window.__wheel = []; });
    for (let i = 0; i < times; i++) {
      await h.cdp("Input.dispatchMouseEvent", { type: "mouseWheel", x: point.x, y: point.y, deltaX, deltaY, modifiers });
      await h.sleep(30);
    }
    await h.sleep(500);
    return h.evaluate(() => window.__wheel.slice());
  };
  const allPrevented = (log) => log.length > 0 && log.every(Boolean);
  /* Position of the pointer in units of the gauge bar: unchanged if the zoom is centred there. */
  const under = (s, x) => (x - rect.x - s.tx) / s.zoom;
  const startUrl = await state();

  if (!mobile) {
    h.section("plain two-finger / mouse wheel scroll");
    let a = await state();
    let log = await wheel(0, 40, { times: 5 });
    let b = await state(); show("down 5x40", a, b);
    h.assert(a.max > 0, `lanes overflow the window (max scrollTop ${a.max})`);
    h.assert(Math.abs(b.top - Math.min(a.top + 200, a.max)) <= 2, "vertical scroll moves down by the scrolled distance");
    h.assert(b.zoom === a.zoom && b.tx === a.tx, "vertical scroll changes neither zoom nor time position");
    h.assert(allPrevented(log), "events consumed by the timeline");

    a = b; await wheel(0, -40, { times: 2 }); b = await state(); show("up 2x40", a, b);
    h.assert(b.top < a.top && b.zoom === a.zoom, "scrolling up moves up, no zoom");

    a = b; await wheel(0, 100); b = await state(); show("one mouse notch 100", a, b);
    h.assert(b.top > a.top && b.zoom === a.zoom, "a plain mouse-wheel notch scrolls, no zoom");

    a = b; log = await wheel(0, 600, { times: 12 }); b = await state(); show("past the bottom", a, b);
    h.assert(b.top >= b.max - 1 && b.zoom === a.zoom, "stops at the bottom, no zoom");
    h.assert(allPrevented(log), "bottom: nothing chains to the page");
    a = b; await wheel(0, -40); b = await state(); show("first scroll back up", a, b);
    h.assert(a.top - b.top >= 38, "no dead zone after hitting the bottom");
    a = b; log = await wheel(0, -600, { times: 12 }); b = await state(); show("past the top", a, b);
    h.assert(b.top === 0 && b.zoom === a.zoom && allPrevented(log), "stops at the top, nothing chains, no zoom");
    a = b; await wheel(0, 40); b = await state(); show("first scroll back down", a, b);
    h.assert(b.top >= 38, "no dead zone after hitting the top");

    a = b; await wheel(0, 0.5, { times: 12 }); b = await state(); show("12x0.5 (momentum tail)", a, b);
    h.assert(b.top > a.top, "sub-pixel momentum deltas are not lost");

    h.section("horizontal swipe");
    a = b; log = await wheel(60, 0, { times: 4 }); b = await state(); show("right 4x60", a, b);
    h.assert(Math.abs(a.tx - b.tx - 240) <= 2, "moves forward in time by the swiped distance");
    h.assert(b.zoom === a.zoom && b.top === a.top, "no zoom, no vertical move");
    h.assert(allPrevented(log), "horizontal events prevented (no swipe-back navigation)");
    a = b; await wheel(-60, 0, { times: 2 }); b = await state(); show("left 2x60", a, b);
    h.assert(b.tx > a.tx && b.zoom === a.zoom, "moves back in time");
    a = b; await wheel(5, 60, { times: 3 }); b = await state(); show("mostly down with wobble", a, b);
    h.assert(b.top > a.top && b.tx === a.tx, "small sideways wobble does not drift in time");
    a = b; await wheel(30, 30, { times: 3 }); b = await state(); show("diagonal", a, b);
    h.assert(b.top > a.top && b.tx < a.tx && b.zoom === a.zoom, "diagonal moves both, no zoom");
    a = b; await wheel(0, 60, { modifiers: SHIFT, times: 2 }); b = await state(); show("shift + wheel", a, b);
    h.assert(b.tx < a.tx && b.top === a.top && b.zoom === a.zoom, "Shift + wheel moves along time");

    h.section("zoom: ctrl (pinch) and cmd");
    for (const [name, modifiers, dy, times] of [
      ["pinch open (ctrl, -4 x10)", CTRL, -4, 10], ["pinch closed (ctrl, +4 x10)", CTRL, 4, 10],
      ["ctrl + mouse notch -100", CTRL, -100, 1], ["cmd + mouse notch -100", META, -100, 1], ["cmd + mouse notch +100", META, 100, 1],
    ]) {
      a = await state(); log = await wheel(0, dy, { modifiers, times }); b = await state(); show(name, a, b);
      const ratio = b.zoom / a.zoom;
      h.assert(dy < 0 ? ratio > 1.15 : ratio < 0.87, `${name}: zoom factor ${ratio.toFixed(3)}`);
      h.assert(Math.abs(under(a, at.x) - under(b, at.x)) * b.zoom < 2, `${name}: point under the pointer stays put`);
      h.assert(allPrevented(log) && b.scale === 1 && b.innerWidth === a.innerWidth, `${name}: browser page zoom prevented`);
    }
    for (const fx of [0.15, 0.9]) {
      const point = { x: Math.round(rect.x + rect.width * fx), y: at.y };
      a = await state(); await wheel(0, -6, { modifiers: CTRL, times: 5, point }); b = await state(); show(`pinch at ${fx} width`, a, b);
      h.assert(b.zoom > a.zoom && Math.abs(under(a, point.x) - under(b, point.x)) * b.zoom < 2, `centred on the pointer at ${fx} of the width`);
    }

    h.section("header");
    const hdr = await h.rect(".tl-title");
    const point = { x: Math.round(hdr.x + 5), y: Math.round(hdr.y + 5) };
    a = await state(); log = await wheel(0, -5, { modifiers: CTRL, times: 4, point }); b = await state(); show("pinch over header", a, b);
    h.assert(allPrevented(log) && b.zoom > a.zoom && b.scale === 1, "pinch over the header zooms the timeline, not the page");
    a = b; log = await wheel(0, 40, { point }); b = await state(); show("plain scroll over header", a, b);
    h.assert(log.length === 1 && !log[0] && b.zoom === a.zoom && b.top === a.top, "plain scroll over the header is left to the browser");
    await h.click(".tl-era-menu-button");
    await h.waitFor(".tl-era-menu-dropdown");
    const menu = await h.rect(".tl-era-menu-dropdown");
    const menuTop = () => h.evaluate(() => { const d = document.querySelector(".tl-era-menu-dropdown"); return { top: d.scrollTop, max: d.scrollHeight - d.clientHeight }; });
    const m0 = await menuTop();
    a = await state(); await wheel(0, 100, { times: 2, point: { x: Math.round(menu.x + 40), y: Math.round(menu.y + 80) } }); b = await state();
    const m1 = await menuTop();
    h.assert(m0.max <= 0 || m1.top > m0.top, `Eras dropdown still scrolls (${m0.top} -> ${m1.top} of ${m0.max})`);
    h.assert(b.top === a.top && b.zoom === a.zoom, "and the timeline behind it does not move");
    await h.click(".tl-era-menu-button");

    h.section("Safari gesture events (synthetic)");
    a = await state();
    const prevented = await h.evaluate((x, y) => {
      const el = document.querySelector(".tl-canvas");
      const out = [];
      for (const [type, scale] of [["gesturestart", 1], ["gesturechange", 1.25], ["gesturechange", 1.5], ["gestureend", 1.5]]) {
        const e = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(e, { scale, clientX: x, clientY: y });
        el.dispatchEvent(e);
        out.push(e.defaultPrevented);
      }
      return out;
    }, at.x, at.y);
    await h.sleep(400); b = await state(); show("gesture scale 1.5", a, b);
    h.assert(prevented.every(Boolean), "all gesture events prevented");
    h.assert(Math.abs(b.zoom / a.zoom - 1.5) < 0.01, `zoom follows gesture scale (${(b.zoom / a.zoom).toFixed(3)})`);
    h.assert(Math.abs(under(a, at.x) - under(b, at.x)) * b.zoom < 2, "gesture zoom centred on the pointer");

    h.section("on-screen buttons");
    for (const [sel, dir] of [['.tl-zoom-controls [aria-label="Zoom out"]', -1], ['.tl-zoom-controls [aria-label="Zoom in"]', 1]]) {
      a = await state(); await h.click(sel); await h.sleep(700); b = await state(); show(sel, a, b);
      h.assert((b.zoom - a.zoom) * dir > 0, `${sel} works`);
    }

    h.section("mouse click-drag");
    a = await state();
    const mouse = (type, x, buttons) => h.cdp("Input.dispatchMouseEvent", { type, x, y: at.y, button: "left", buttons, clickCount: 1 });
    await mouse("mouseMoved", at.x, 0); await mouse("mousePressed", at.x, 1);
    for (let i = 1; i <= 10; i++) { await mouse("mouseMoved", at.x - i * 20, 1); await h.sleep(30); }
    await h.sleep(200); // rest before release: no fling
    await mouse("mouseMoved", at.x - 200, 1); await mouse("mouseReleased", at.x - 200, 0);
    await h.sleep(600); b = await state(); show("drag left 200", a, b);
    h.assert(a.tx - b.tx >= 195 && b.zoom === a.zoom, `drag pans (moved ${(a.tx - b.tx).toFixed(1)}px), no zoom`);
    h.assert(!(await h.exists(".timeline-event-overlay")), "drag did not open an article");

    h.section("Fit");
    await h.click(".tl-zoom-reset"); await h.sleep(700);
    a = await state(); log = await wheel(-300, 0, { times: 3 }); b = await state(); show("swipe left at the start of time", a, b);
    h.assert(allPrevented(log) && a.tx === b.tx, "swiping at the edge of the data is still consumed (no swipe-back)");
    a = b; await wheel(0, 25, { modifiers: CTRL, times: 3 }); b = await state(); show("zoom out past Fit", a, b);
    h.assert(b.zoom === a.zoom, "cannot zoom out past the whole timeline");
  } else {
    h.section("touch");
    await h.cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
    const touch = async (frames) => {
      const send = (type, pts) => h.cdp("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p, id) => ({ x: p[0], y: p[1], id })) });
      await send("touchStart", frames[0]);
      for (const f of frames.slice(1)) { await h.sleep(30); await send("touchMove", f); }
      await h.sleep(200);
      await send("touchMove", frames[frames.length - 1]);
      await send("touchEnd", []);
      await h.sleep(700);
    };
    const cx = Math.round(rect.x + rect.width / 2), cy = at.y;
    const steps = [...Array(11).keys()];
    let a = await state();
    await touch(steps.map((i) => [[cx + 80 - i * 12, cy]]));
    let b = await state(); show("one finger drag left 120", a, b);
    h.assert(a.tx - b.tx >= 100 && b.zoom === a.zoom, "one-finger horizontal drag pans, no zoom");
    a = b; await touch(steps.map((i) => [[cx, cy + 120 - i * 24]]));
    b = await state(); show("one finger swipe up 240", a, b);
    h.assert(b.top > a.top && b.zoom === a.zoom, "one-finger vertical swipe scrolls, no zoom");
    a = b; await touch(steps.map((i) => [[cx - 40 - i * 8, cy], [cx + 40 + i * 8, cy]]));
    b = await state(); show("pinch out", a, b);
    h.assert(b.zoom / a.zoom > 1.8, `two-finger pinch out zooms in (x${(b.zoom / a.zoom).toFixed(2)})`);
    h.assert(Math.abs(under(a, cx) - under(b, cx)) * b.zoom < 4, "centred between the fingers");
    h.assert(b.scale === 1, "page not zoomed");
    a = b; await touch(steps.map((i) => [[cx - 120 + i * 8, cy], [cx + 120 - i * 8, cy]]));
    b = await state(); show("pinch in", a, b);
    h.assert(b.zoom / a.zoom < 0.6 && b.scale === 1, `pinch in zooms out (x${(b.zoom / a.zoom).toFixed(2)})`);
    for (const sel of ['.tl-zoom-controls [aria-label="Zoom in"]', '.tl-zoom-controls [aria-label="Zoom out"]']) {
      a = await state(); await h.click(sel); await h.sleep(700); b = await state(); show(sel, a, b);
      h.assert(a.zoom !== b.zoom, `${sel} works`);
    }
  }

  h.section("nowhere else");
  const end = await state();
  h.assert(end.path === startUrl.path && end.history === startUrl.history && (await h.exists(".timeline-mode")), "still on the timeline; no navigation");
  const overflow = await h.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  h.assert(overflow <= 0, "no sideways page overflow");
}

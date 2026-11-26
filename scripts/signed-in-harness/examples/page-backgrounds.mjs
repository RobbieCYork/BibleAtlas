/**
 * The photographs behind the bare landing screens (src/pageBackgrounds.css): Game Center, each game's
 * first screen, the difficulty screens, the code entry, Saving Peter's create screen, About and the
 * Articles home.
 *
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844  --script scripts/signed-in-harness/examples/page-backgrounds.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/page-backgrounds.mjs
 *
 * Checks, in light, dark, every skin and at the largest text size: the right picture (phone or wide)
 * is behind each screen and was not fetched before the screen was opened; every piece of text has an
 * opaque panel between it and the picture and reaches 4.5:1 on it; nothing overflows sideways; taking
 * the picture away (a failed load) moves nothing; it stays put while the content scrolls.
 *
 * SHOTS_ONLY=1 takes the screenshots and checks nothing, for "before" pictures of an older build.
 */
import { MENU_BUTTON } from "../lib/app.mjs";

const SHOTS_ONLY = !!process.env.SHOTS_ONLY;
const LOOKS = [
  ["default", "light"], ["default", "dark"], ["sticker", "light"], ["clarity", "light"], ["midnight", "dark"],
  ["sage", "light"], ["skyreader", "light"], ["trailhead", "light"], ["highlighter", "light"],
];
/** screen -> [root selector, picture name] */
const SCREENS = {
  "game-center": [".game-root", "galilee-dawn"],
  "about": [".about-root", "jerusalem-morning"],
  "articles": [".articles-panel", "scroll-lamp"],
  "setup-fill-blank": [".game-root", "judean-road"],
  "setup-chronology": [".game-root", "judean-road"],
  "setup-peter-level": [".game-root", "judean-road"],
  "setup-peter-create": [".game-root", "judean-road"],
  "join-trivia": [".game-root", "judean-road"],
  "join-peter": [".game-root", "judean-road"],
  "first-bible-trivia": [".game-root", "judean-road"],
  "first-saving-peter": [".game-root", "judean-road"],
  "first-fill-blank": [".game-root", "judean-road"],
  "first-memorization": [".game-root", "judean-road"],
  "first-chronology": [".game-root", "judean-road"],
};

export default async function (h) {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";
  const variant = phone ? "phone" : "wide";
  const esc = () => h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  const fetched = () => h.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name.split("/").pop()).filter((n) => /\.webp$/.test(n) && /-(wide|phone)-/.test(n)));

  const openGames = async () => {
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else { await h.click(MENU_BUTTON); await h.sleep(200); await h.click({ css: ".panel-menu-link", text: "Games" }); }
    await h.waitFor(".game-center-card");
  };
  const firstScreen = async (title) => { await openGames(); await h.click({ css: ".game-center-card", text: title }); await h.waitFor(".game-entry-card"); };
  const entry = async (title, choice, ready) => { await firstScreen(title); await h.click({ css: ".game-entry-card", text: choice }); await h.waitFor(ready); };
  const openers = {
    "game-center": openGames,
    "about": async () => { await h.click(MENU_BUTTON); await h.sleep(300); await h.click(phone ? ".mobile-nav-menu-about" : ".panel-menu-about"); await h.waitFor(".about-root"); },
    "articles": async () => {
      if (phone) await h.click({ css: ".mobile-tab", text: "Articles" });
      else { await h.click(MENU_BUTTON); await h.sleep(200); await h.click({ css: ".panel-menu-item", text: "Articles" }); await esc(); }
      await h.waitFor(".articles-section-header");
    },
    "setup-fill-blank": () => entry("Fill in the Blank", "Play solo", ".fillblank-picker"),
    "setup-chronology": () => entry("Chronology", "Play solo", ".chronology-picker"),
    "setup-peter-level": () => entry("Saving Peter", "Play solo", ".level-picker"),
    "setup-peter-create": () => entry("Saving Peter", "Create multiplayer game", ".game-start-button"),
    "join-trivia": () => entry("Bible Trivia", "Join multiplayer game", ".games-code-input"),
    "join-peter": () => entry("Saving Peter", "Join multiplayer game", ".games-code-input"),
    "first-bible-trivia": () => firstScreen("Bible Trivia"),
    "first-saving-peter": () => firstScreen("Saving Peter"),
    "first-fill-blank": () => firstScreen("Fill in the Blank"),
    "first-memorization": () => firstScreen("Scripture Memorization Challenge"),
    "first-chronology": () => firstScreen("Chronology"),
  };

  /** Every visible text under the screen: is there an opaque ground between it and the picture, and
   * what is its contrast on it? */
  const readability = (rootSel) => h.evaluate((sel) => {
    const root = document.querySelector(sel);
    const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
    const rgba = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
    const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3]));
    const lum = (c) => [0, 1, 2].map((i) => { const v = c[i] / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const bare = [], low = [];
    let count = 0, min = 99;
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement;
      // The search box's clear button is drawn over its sibling input, which an ancestor walk cannot see.
      if (!t.textContent.trim() || el.closest("option, :disabled, [aria-hidden=true], .articles-search-clear") || !el.checkVisibility()) continue;
      const label = `${el.className || el.tagName} "${t.textContent.trim().slice(0, 24)}"`;
      const layers = [];
      let solid = null;
      for (let n = el; n && n !== root; n = n.parentElement) {
        const c = rgba(getComputedStyle(n).backgroundColor);
        if (c[3] >= 0.99) { solid = c; break; }
        if (c[3] > 0) layers.push(c);
      }
      if (!solid) { bare.push(label); continue; }
      const bg = layers.reverse().reduce((under, layer) => over(layer, under), solid);
      const fg = over(rgba(getComputedStyle(el).color), bg);
      const [a, b] = [lum(fg), lum(bg)];
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      count++; min = Math.min(min, ratio);
      if (ratio < 4.5) low.push(`${label} ${ratio.toFixed(2)}`);
    }
    return { count, min: Math.round(min * 100) / 100, bare: bare.slice(0, 5), low: low.slice(0, 5) };
  }, rootSel);

  /** Where everything is, to compare with and without the picture. */
  const boxes = (rootSel) => h.evaluate((sel) => [...document.querySelectorAll(`${sel}, ${sel} *`)].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(","); }).join(";"), rootSel);

  const visit = async (screen, tag) => {
    await h.reload(); await h.sleep(900);
    const early = SHOTS_ONLY ? [] : await fetched();
    await openers[screen]();
    await h.sleep(900);
    const [rootSel, picture] = SCREENS[screen];
    if (!SHOTS_ONLY) {
      const style = await h.evaluate((sel) => getComputedStyle(document.querySelector(sel)).backgroundImage, rootSel);
      const url = /url\("([^"]+)"\)/.exec(style)?.[1] ?? "";
      const loaded = await h.evaluate((u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = u; }), url);
      h.assert(url.includes(`${picture}-${variant}-`) && loaded > 0, `${screen} ${tag}: ${url.split("/").pop() || style.slice(0, 80)} (${loaded}px wide)`);
      h.assert(!early.some((n) => n.startsWith(`${picture}-`)) || picture === "judean-road", `${screen} ${tag}: picture not fetched before the screen was opened ${JSON.stringify(early)}`);
      h.assert((await fetched()).every((n) => n.includes(`-${variant}-`)), `${screen} ${tag}: only ${variant} copies fetched ${JSON.stringify(await fetched())}`);
      const r = await readability(rootSel);
      h.assert(r.count >= 2 && !r.bare.length && !r.low.length, `${screen} ${tag}: ${r.count} texts, lowest contrast ${r.min} ${r.bare.length || r.low.length ? JSON.stringify(r) : ""}`);
      const sideways = await h.evaluate((sel) => {
        const root = document.querySelector(sel);
        const wide = [root, ...root.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 0.5 || b.left < -0.5); });
        return Math.max(wide.length, document.documentElement.scrollWidth - innerWidth);
      }, rootSel);
      h.assert(sideways <= 0, `${screen} ${tag}: nothing sideways (${sideways})`);
      const spill = await h.evaluate((sel) => [...document.querySelectorAll(`${sel} :is(.about-text, .about-text blockquote, .about-text p, .about-text h3, .games-panel-intro, .games-panel-intro > *, .articles-title, .articles-subtitle)`)]
        .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => `${e.className || e.tagName} ${e.scrollWidth}>${e.clientWidth}`), rootSel);
      h.assert(!spill.length, `${screen} ${tag}: no words spill out of their panel ${spill.length ? JSON.stringify(spill) : ""}`);
      const split = await h.evaluate((sel) => [...document.querySelectorAll(`${sel} :is(.about-quote, .about-text h3, .games-panel-intro h2, .articles-title)`)].flatMap((el) => {
        const found = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {
          for (const m of t.textContent.matchAll(/[^\s\u2014-]+/g)) {
            const range = document.createRange();
            range.setStart(t, m.index);
            range.setEnd(t, m.index + m[0].length);
            if (new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1) found.push(m[0]);
          }
        }
        return found;
      }), rootSel);
      h.assert(!split.length, `${screen} ${tag}: no word in a heading is broken across lines ${split.length ? JSON.stringify(split) : ""}`);
    }
    await h.screenshot(`${screen}-${tag}-${dev}.png`);
    if (!SHOTS_ONLY) {
      const before = await boxes(rootSel);
      await h.evaluate((sel) => document.querySelector(sel).style.setProperty("--page-bg-wide", 'url("/assets/missing.webp")') || document.querySelector(sel).style.setProperty("--page-bg-phone", 'url("/assets/missing.webp")'), rootSel);
      await h.sleep(300);
      h.assert((await boxes(rootSel)) === before, `${screen} ${tag}: a picture that fails to load moves nothing`);
      if (tag === "default-light") await h.screenshot(`${screen}-failed-${dev}.png`);
    }
  };

  const setLook = async (skin, theme, scale = 1) => {
    await h.evaluate((s, sc) => { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); localStorage.setItem("app-text-scale", String(sc)); }, skin, scale);
    await h.setTheme(theme);
  };

  for (const [skin, theme] of LOOKS) {
    h.section(`${skin} / ${theme} (${dev})`);
    await setLook(skin, theme);
    for (const screen of Object.keys(SCREENS)) await visit(screen, `${skin}-${theme}`);
  }

  for (const [skin, theme] of [["default", "light"], ["skyreader", "light"], ["default", "dark"]]) {
    h.section(`largest text, ${skin} / ${theme} (${dev})`);
    await setLook(skin, theme, 1.8);
    for (const screen of Object.keys(SCREENS)) await visit(screen, `${skin}-${theme}-large`);
  }

  if (!SHOTS_ONLY) {
    h.section("scrolling and the plain screens");
    await setLook("skyreader", "light");
    await h.reload(); await h.sleep(900);
    await openers.about(); await h.sleep(500);
    const s = await h.evaluate(() => {
      const root = document.querySelector(".about-root"), body = root.querySelector(".myprofile-body");
      const a = root.getBoundingClientRect().y;
      body.scrollTo({ top: body.scrollHeight, behavior: "instant" });
      return { moved: root.getBoundingClientRect().y - a, rootScroll: root.scrollTop, bodyScroll: body.scrollTop, attach: getComputedStyle(root).backgroundAttachment };
    });
    h.assert(s.bodyScroll > 0 && s.moved === 0 && s.rootScroll === 0 && !s.attach.includes("fixed"), `About scrolls over a still picture ${JSON.stringify(s)}`);
    await h.screenshot(`about-scrolled-${dev}.png`);

    await h.reload(); await h.sleep(900);
    await openers.articles();
    await h.type(".articles-search input", "Jer");
    await h.sleep(300);
    const r = await readability(".articles-panel");
    h.assert(!r.bare.length && !r.low.length, `Articles search results sit on a solid ground, lowest ${r.min} ${JSON.stringify(r.bare)} ${JSON.stringify(r.low)}`);
    await h.screenshot(`articles-search-${dev}.png`);
    await h.click(".articles-search-clear");
    await h.click(".articles-section-header");
    await h.sleep(500);
    h.assert((await h.evaluate(() => getComputedStyle(document.querySelector(".articles-panel")).backgroundImage)) === "none", "an Articles category page has no picture");

    for (const [name, title, ready] of [["Memorization's verse list", "Scripture Memorization Challenge", ".memchallenge-picker"], ["Bible Trivia's topic screen", "Bible Trivia", ".games-topic-select"]]) {
      await h.reload(); await h.sleep(900);
      await entry(title, "Play solo", ready);
      await h.sleep(600);
      h.assert((await h.evaluate(() => getComputedStyle(document.querySelector(".game-root")).backgroundImage)) === "none", `${name} has no picture`);
    }
    await setLook("default", "light");
  }

  const real = h.consoleErrors.filter((e) => !/openfreemap|bible-api|Failed to fetch|WebSocket|missing\.webp/i.test(e));
  h.assert(real.length === 0, `no page errors ${real.slice(0, 3).join(" | ")}`);
}

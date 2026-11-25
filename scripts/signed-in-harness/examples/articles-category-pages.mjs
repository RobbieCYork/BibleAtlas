/**
 * Articles: each category opens its own page (Back, title, count, search, list) instead of a drop-down.
 *
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 375x812 \
 *        --script scripts/signed-in-harness/examples/articles-category-pages.mjs --out <dir>
 *   (and again with --viewport 1280x800; --persona owner adds nothing but SKINS runs for any signed-in reader)
 *
 * Env: SKINS=sticker,midnight,... (default all) screenshots the People page in each skin, light and dark.
 */
import { MENU_BUTTON } from "../lib/app.mjs";

const SKINS = (process.env.SKINS ?? "default,sticker,clarity,midnight,sage,skyreader,trailhead,highlighter").split(",").filter(Boolean);
const CATEGORIES = ["Places", "Points of Interest", "People", "Topics", "Archaeology", "Timeline Events"];
const SEARCHES = [
  // [category, a name query, a query that only an alias or subtitle can match]
  ["Places", "beth", "Kfar Nahum"],
  ["Points of Interest", "pool", "Armageddon"],
  ["People", "john", "Cephas"],
];

export default async function (h) {
  const phone = await h.evaluate(() => window.innerWidth <= 768);
  const tag = phone ? "phone" : "desktop";
  const shot = async (name) => console.log("  screenshot:", await h.screenshot(`${tag}-${name}.png`));
  const closeMenus = () => h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));

  const openArticlesPanel = async () => {
    if (phone) await h.click({ css: ".mobile-tab", text: "Articles" });
    else {
      await h.click(MENU_BUTTON);
      await h.sleep(250);
      await h.click({ css: ".panel-menu-item", text: "Articles" });
      await closeMenus();
    }
    await h.sleep(400);
  };

  const state = () =>
    h.evaluate(() => {
      const panel = document.querySelector(".articles-panel");
      if (!panel) return { panel: false };
      const page = panel.querySelector(".articles-page");
      const scroller = panel.querySelector(".articles-page-scroll");
      const rows = [...panel.querySelectorAll(".articles-result-row")];
      return {
        panel: true,
        hidden: getComputedStyle(panel).display === "none",
        page: !!page,
        title: page?.querySelector("h2")?.textContent ?? panel.querySelector(".articles-title")?.textContent,
        subtitle: page?.querySelector(".article-head-sub")?.textContent ?? null,
        query: panel.querySelector(".articles-search input")?.value ?? null,
        rows: rows.length,
        names: rows.map((r) => r.querySelector(".articles-result-name").textContent),
        scrollTop: scroller?.scrollTop ?? null,
        scrollHeight: scroller?.scrollHeight ?? null,
        clientHeight: scroller?.clientHeight ?? null,
        empty: panel.querySelector(".articles-page-empty p")?.textContent ?? null,
        categoryRows: panel.querySelectorAll(".articles-section-header").length,
        focus: document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.innerText?.split("\n").join(" ") ?? null,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        panelOverflowX: panel.scrollWidth - panel.clientWidth,
      };
    });

  const openCategory = async (label) => {
    await h.click({ css: ".articles-section-header", text: label });
    await h.waitFor(".articles-page");
    await h.sleep(250);
  };
  const back = async () => {
    await h.click(".articles-page .back-btn");
    await h.sleep(300);
  };
  const articleBack = async () => {
    await h.click('.article-head .back-btn');
    await h.sleep(500);
  };
  const search = async (text) => {
    await h.type(".articles-page .articles-search input", text);
    await h.sleep(300);
  };

  /** Scroll the category list, then tap the row sitting in the middle of it. Returns where the list was. */
  const scrollAndOpen = async (top) => {
    await h.evaluate((t) => { document.querySelector(".articles-page-scroll").scrollTop = t; }, top);
    await h.sleep(300);
    const target = await h.evaluate(() => {
      const s = document.querySelector(".articles-page-scroll").getBoundingClientRect();
      const rows = [...document.querySelectorAll(".articles-result-row")];
      const mid = s.y + s.height / 2;
      let best = 0;
      rows.forEach((r, i) => {
        const b = r.getBoundingClientRect();
        const c = rows[best].getBoundingClientRect();
        if (Math.abs(b.y + b.height / 2 - mid) < Math.abs(c.y + c.height / 2 - mid)) best = i;
      });
      document.addEventListener("mousedown", () => { window.__topAtTap = document.querySelector(".articles-page-scroll")?.scrollTop; }, { capture: true, once: true });
      return { index: best, name: rows[best].querySelector(".articles-result-name").textContent };
    });
    await h.click(".articles-result-row", { index: target.index });
    await h.waitFor(".article-head");
    await h.sleep(500);
    return { ...target, top: await h.evaluate(() => window.__topAtTap) };
  };
  const articleTitle = () =>
    h.evaluate(() => [...document.querySelectorAll(".article-head h2")].find((el) => el.getBoundingClientRect().width > 0 && !el.closest(".articles-panel"))?.textContent?.trim() ?? null);

  await openArticlesPanel();

  h.section("category list");
  let s = await state();
  h.assert(s.categoryRows === 6 && s.rows === 0 && !s.page, `6 category rows, no inline lists (${s.categoryRows} rows, ${s.rows} entries)`);
  h.assert(await h.evaluate(() => !document.querySelector(".articles-panel [aria-expanded]")), "no expandable controls left in the panel");
  h.assert(s.overflowX <= 0 && s.panelOverflowX <= 0, `no horizontal overflow (${s.overflowX}/${s.panelOverflowX})`);
  await shot("01-categories");

  h.section("every category opens");
  for (const label of CATEGORIES) {
    const count = await h.evaluate((l) => {
      const row = [...document.querySelectorAll(".articles-section-header")].find((r) => r.querySelector(".articles-section-label").textContent === l);
      return Number(row.querySelector(".articles-section-count").textContent);
    }, label);
    await openCategory(label);
    s = await state();
    h.assert(s.page && s.title === label, `${label}: page opened with that title`);
    h.assert(s.rows === count && s.subtitle === `${count} articles`, `${label}: ${s.rows} rows, header says "${s.subtitle}", list said ${count}`);
    h.assert(s.query === "" && s.scrollTop === 0, `${label}: starts with empty search at the top`);
    h.assert(s.focus === "Back", `${label}: focus moved to Back (${s.focus})`);
    h.assert(s.overflowX <= 0 && s.panelOverflowX <= 0, `${label}: no horizontal overflow`);
    const geo = await h.evaluate(() => {
      const box = (q) => { const r = document.querySelector(q).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height }; };
      return { panel: box(".articles-panel"), head: box(".articles-page .article-head"), input: box(".articles-page .articles-search input"), scroll: box(".articles-page-scroll") };
    });
    h.assert(geo.head.top >= geo.panel.top - 1 && geo.head.bottom <= geo.input.top + 1 && geo.input.bottom <= geo.scroll.top + 1 && geo.scroll.bottom <= geo.panel.bottom + 1 && geo.scroll.h > 200,
      `${label}: header, search, list stack inside the panel (list ${Math.round(geo.scroll.h)}px)`);
    // Each shelf is alphabetical on its own.
    const sorted = await h.evaluate(() => [...document.querySelectorAll(".articles-page-list")].map((ul) => {
      const n = [...ul.querySelectorAll(".articles-result-name")].map((e) => e.textContent);
      return { n: n.length, ok: n.every((x, i) => i === 0 || n[i - 1].localeCompare(x) <= 0) };
    }));
    h.assert(sorted.every((x) => x.ok), `${label}: alphabetical within each of ${sorted.length} list(s)`);
    const shelves = await h.evaluate(() => [...document.querySelectorAll(".articles-shelf-label")].map((e) => e.innerText.replace(/\s+/g, " ")));
    h.assert(label === "Archaeology" ? shelves.length === 2 : shelves.length === 0, `${label}: shelf headings ${JSON.stringify(shelves)}`);
    // Header and search stay put while the list scrolls, all the way to the last row.
    await h.evaluate(() => { const e = document.querySelector(".articles-page-scroll"); e.scrollTop = e.scrollHeight; });
    await h.sleep(250);
    const end = await h.evaluate(() => {
      const sc = document.querySelector(".articles-page-scroll").getBoundingClientRect();
      const last = [...document.querySelectorAll(".articles-result-row")].at(-1).getBoundingClientRect();
      return { head: document.querySelector(".articles-page .article-head").getBoundingClientRect().top, lastBottom: last.bottom, scBottom: sc.bottom };
    });
    h.assert(Math.abs(end.head - geo.head.top) < 1 && end.lastBottom <= end.scBottom + 1, `${label}: scrolls to the last row with the header fixed`);
    await h.evaluate(() => { document.querySelector(".articles-page-scroll").scrollTop = 0; });
    await h.sleep(150);
    await shot(`02-page-${label.toLowerCase().replace(/ /g, "-")}`);
    if (label === "Archaeology") {
      await h.evaluate(() => { document.querySelectorAll(".articles-shelf")[1].querySelectorAll(".articles-result-row")[2].scrollIntoView({ block: "center", behavior: "instant" }); });
      await h.sleep(200);
      await shot("02b-archaeology-second-shelf");
      await search("papyrus");
      s = await state();
      h.assert(s.rows > 0 && /of \d+ articles/.test(s.subtitle), `Archaeology search "papyrus": ${s.subtitle}`);
      await shot("02c-archaeology-search");
    }
    await back();
    s = await state();
    h.assert(!s.page && s.categoryRows === 6, `${label}: Back returns to the category list`);
    h.assert(s.focus?.startsWith(label), `${label}: focus returns to its row (${s.focus})`);
  }

  for (const [label, q, hidden] of SEARCHES) {
    h.section(`${label}: search`);
    await openCategory(label);
    const total = (await state()).rows;
    await search(q);
    s = await state();
    h.assert(s.rows > 0 && s.rows < total && s.subtitle === `${s.rows} of ${total} articles`, `"${q}" filters to ${s.subtitle}`);
    const allMatch = await h.evaluate((needle) => [...document.querySelectorAll(".articles-result-row")].filter((r) => r.innerText.toLowerCase().includes(needle)).length, q);
    console.log(`  rows whose visible name/subtitle contain "${q}": ${allMatch} of ${s.rows} (the rest match an alias)`);
    h.assert((await h.text(".articles-panel [role=status]")) !== undefined, "status region present");
    await shot(`03-${label.toLowerCase().replace(/ /g, "-")}-search`);

    await search(hidden);
    s = await state();
    h.assert(s.rows >= 1 && !s.names.some((n) => n.toLowerCase().includes(hidden.toLowerCase())), `alias "${hidden}" finds ${JSON.stringify(s.names)}`);

    await search("zzqqxx");
    s = await state();
    h.assert(s.rows === 0 && s.empty?.includes("No results") && s.subtitle === `0 of ${total} articles`, `no-results state: "${s.empty}"`);
    await shot(`04-${label.toLowerCase().replace(/ /g, "-")}-no-results`);
    await h.click(".articles-page-empty-clear");
    await h.sleep(300);
    s = await state();
    h.assert(s.query === "" && s.rows === total, "Clear search button restores the whole list");
    await search(q);
    await h.click(".articles-page .articles-search-clear");
    await h.sleep(300);
    s = await state();
    h.assert(s.query === "" && s.rows === total, "the x button clears too");
    h.assert(s.focus === `Search ${label}`, `focus stays in the search box after x (${s.focus})`);

    h.section(`${label}: open an article and come back (no search)`);
    const first = await scrollAndOpen(1500);
    s = await state();
    h.assert(s.hidden && (await articleTitle())?.startsWith(first.name), `"${first.name}" opened (title "${await articleTitle()}"), list hidden behind it`);
    await shot(`05-${label.toLowerCase().replace(/ /g, "-")}-article`);
    await articleBack();
    s = await state();
    h.assert(!s.hidden && s.page && s.title === label, "article Back lands on the category page");
    h.assert(first.top > 500 && Math.abs(s.scrollTop - first.top) <= 1, `scroll kept: ${s.scrollTop} (was ${first.top})`);
    await shot(`06-${label.toLowerCase().replace(/ /g, "-")}-back-scroll`);

    h.section(`${label}: open an article and come back (with search)`);
    await search("a");
    s = await state();
    h.assert(s.scrollTop === 0, "a new search starts at the top");
    const second = await scrollAndOpen(700);
    await articleBack();
    s = await state();
    h.assert(s.page && s.query === "a" && s.rows > 0, `search text kept: "${s.query}", ${s.subtitle}`);
    h.assert(second.top > 300 && Math.abs(s.scrollTop - second.top) <= 1, `scroll kept with search: ${s.scrollTop} (was ${second.top})`);
    await shot(`07-${label.toLowerCase().replace(/ /g, "-")}-back-search-and-scroll`);

    if (phone) {
      h.section(`${label}: switching tabs keeps the page`);
      const before = await state();
      await h.click({ css: ".mobile-tab", text: "Bible" });
      await h.sleep(500);
      await h.click({ css: ".mobile-tab", text: "Articles" });
      await h.sleep(500);
      s = await state();
      h.assert(s.page && s.query === "a" && Math.abs(s.scrollTop - before.scrollTop) <= 1, `after Bible and back: "${s.query}" at ${s.scrollTop}`);
    }

    await back();
    await openCategory(label);
    s = await state();
    h.assert(s.query === "" && s.scrollTop === 0, "re-entering from the list starts fresh");
    await back();
  }

  h.section("cross-link trail from an article, then Back to the page");
  await openCategory("People");
  await search("peter");
  await h.click({ css: ".articles-result-row", text: "Simon Peter" });
  await h.waitFor(".article-head");
  await h.sleep(500);
  const linked = await h.evaluate(() => {
    const panel = document.querySelector(".person-panel, .location-panel:not(.articles-panel)");
    const link = [...panel.querySelectorAll(".verse-location-link")].find((e) => e.getBoundingClientRect().width > 0);
    if (!link) return null;
    link.scrollIntoView({ block: "center", behavior: "instant" });
    link.setAttribute("data-harness-link", "1");
    return link.textContent;
  });
  h.assert(!!linked, `found a cross-link in the article (${linked})`);
  if (linked) {
    await h.click("[data-harness-link]");
    await h.sleep(600);
    if (await h.exists(".link-choice-popup button")) { await h.click(".link-choice-popup button"); await h.sleep(500); }
    console.log("  now reading:", await articleTitle());
    await articleBack();
    h.assert((await articleTitle())?.startsWith("Simon Peter"), `first Back returns to Simon Peter (${await articleTitle()})`);
    await articleBack();
    s = await state();
    h.assert(s.page && s.title === "People" && s.query === "peter", `second Back returns to People with "${s.query}"`);
  } else await articleBack();
  await back();

  h.section("all-categories search on the list page still works, and survives an article");
  await h.type(".articles-search input", "jerusalem");
  await h.sleep(300);
  s = await state();
  h.assert(!s.page && s.rows > 5, `global search shows ${s.rows} results`);
  await h.evaluate(() => { const e = document.querySelector(".articles-panel .articles-results"); e.scrollTop = 200; });
  await h.sleep(250);
  const beforeTop = await h.evaluate(() => document.querySelector(".articles-panel .articles-results").scrollTop);
  const idx = await h.evaluate(() => {
    const s = document.querySelector(".articles-panel .articles-results").getBoundingClientRect();
    return [...document.querySelectorAll(".articles-result-row")].findIndex((r) => r.getBoundingClientRect().top > s.top + s.height / 2 - 30);
  });
  await shot("08-global-search");
  await h.click(".articles-result-row", { index: idx });
  await h.waitFor(".article-head");
  await h.sleep(400);
  await articleBack();
  s = await state();
  const afterTop = await h.evaluate(() => document.querySelector(".articles-panel .articles-results")?.scrollTop);
  h.assert(s.query === "jerusalem" && Math.abs(afterTop - beforeTop) <= 40, `global search kept: "${s.query}", scroll ${afterTop} (was about ${beforeTop})`);
  await h.click(".articles-panel .articles-search-clear");
  await h.sleep(250);

  h.section("header 'Search anything' opens an article over a category page");
  await openCategory("Places");
  await search("beth");
  // A phone only draws the header search on the Bible and Map tabs, so Back from the article goes to
  // that tab (as before) and the Articles tab still holds the page.
  if (phone) {
    await h.click({ css: ".mobile-tab", text: "Bible" });
    await h.sleep(500);
  }
  await h.waitFor('.app-header input[aria-label="Search anything"]');
  await h.evaluate(() => document.querySelector('.app-header input[aria-label="Search anything"]').setAttribute("data-harness-header", "1"));
  await h.type("[data-harness-header]", "Nazareth");
  await h.sleep(900);
  const opened = await h.evaluate(() => {
    const row = [...document.querySelectorAll(".unified-row")].find((b) => b.closest(".unified-section:not(.unified-section-scripture)") && /^\s*Nazareth\b/.test(b.innerText));
    row?.setAttribute("data-harness-hit", "1");
    return !!row;
  });
  h.assert(opened, "unified search lists Nazareth");
  if (opened) {
    await h.click("[data-harness-hit]");
    await h.waitFor(".article-head");
    await h.sleep(600);
    h.assert((await articleTitle())?.startsWith("Nazareth"), `unified search opened "${await articleTitle()}"`);
    await articleBack();
    if (phone) {
      h.assert(await h.exists('.app-header input[aria-label="Search anything"]'), "phone: Back returns to the Bible tab it came from");
      await h.click({ css: ".mobile-tab", text: "Articles" });
      await h.sleep(500);
    }
    s = await state();
    h.assert(s.page && s.title === "Places" && s.query === "beth" && !s.hidden, `Places is still there with "${s.query}"`);
  }
  await back();

  h.section("Archaeology menu entry");
  await h.click(MENU_BUTTON);
  await h.sleep(300);
  const hasEntry = await h.exists({ css: ".panel-menu-link, .panel-menu-item, .mobile-nav-menu-item", text: "Archaeology" });
  await h.click(MENU_BUTTON); // close it again
  await h.sleep(300);
  if (!hasEntry) console.log("  skipped: the menu row is hidden (ARCHAEOLOGY_MENU_ROW_VISIBLE in lib/features.ts)");
  else {
    await openCategory("People");
    const viaMenu = async () => {
      await h.click(MENU_BUTTON);
      await h.sleep(300);
      await h.click({ css: ".panel-menu-link, .panel-menu-item, .mobile-nav-menu-item", text: "Archaeology" });
      await closeMenus();
      await h.sleep(600);
    };
    await viaMenu();
    s = await state();
    h.assert(s.page && s.title === "Archaeology" && s.query === "" && s.scrollTop === 0, `menu opens the Archaeology page (${s.title})`);
    await search("scroll");
    await viaMenu();
    s = await state();
    h.assert(s.title === "Archaeology" && s.query === "", "picking it again starts the page afresh");
    await back();
    s = await state();
    h.assert(!s.page && s.categoryRows === 6, "Back goes to the category list");
    if (!phone) {
      await openArticlesPanel(); // untick: closes the panel
      await openArticlesPanel(); // tick: opens it again
      s = await state();
      h.assert(s.panel && !s.page, "closing and reopening the panel does not replay the old Archaeology request");
    }
  }

  h.section("category list keeps its scroll on a short screen");
  if (phone) {
    await h.setViewport(375, 480);
    await h.sleep(900);
    await openArticlesPanel();
    await h.evaluate(() => { document.querySelector(".articles-sections").scrollTop = 9999; });
    await h.sleep(300);
    const rootTop = await h.evaluate(() => document.querySelector(".articles-sections").scrollTop);
    await openCategory("Timeline Events");
    await back();
    const rootAfter = await h.evaluate(() => document.querySelector(".articles-sections").scrollTop);
    h.assert(rootTop > 0 && Math.abs(rootAfter - rootTop) <= 1, `category list scroll ${rootAfter} (was ${rootTop})`);
    await h.setViewport(375, 812);
    await h.sleep(900);
    await openArticlesPanel();
  } else console.log("  (phone run only)");

  h.section("typing cost on the longest lists");
  for (const label of ["Timeline Events", "People"]) {
    await openCategory(label);
    await h.evaluate(() => document.querySelector(".articles-page .articles-search input").focus());
    const times = await h.evaluate(async () => {
      const input = document.querySelector(".articles-page .articles-search input");
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      const out = [];
      for (const v of ["a", "an", "a", "", "j", "je", "j", ""]) {
        const t0 = performance.now();
        set.call(input, v);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
        out.push(Math.round(performance.now() - t0));
      }
      return out;
    });
    h.assert(Math.max(...times) < 250, `${label}: keystroke to painted frame (ms) ${times.join(", ")}`);
    await back();
  }

  // A skin pins its own light or dark mode, so dark mode proper is the default look's.
  h.section("skins and dark mode");
  const looks = SKINS.map((skin) => [skin, "light"]).concat([["default", "dark"]]);
  for (const [skin, theme] of looks) {
    await h.evaluate((sk) => { if (sk === "default") localStorage.removeItem("app-skin"); else localStorage.setItem("app-skin", sk); }, skin);
    await h.setTheme(theme);
    await h.reload();
    await h.sleep(1500);
    await openArticlesPanel();
    const applied = await h.evaluate(() => [document.documentElement.getAttribute("data-skin"), document.documentElement.getAttribute("data-theme")]);
    h.assert(applied[0] === (skin === "default" ? null : skin), `${skin}/${theme} in force: data-skin=${applied[0]}, data-theme=${applied[1]}`);
    await shot(`09-${skin}-${theme}-categories`);
    await openCategory("Archaeology");
    await h.evaluate(() => { document.querySelector(".articles-page-scroll").scrollTop = 300; });
    await h.sleep(300);
    const look = await h.evaluate(() => {
      const rgb = (c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
      const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
      const panel = getComputedStyle(document.querySelector(".articles-panel")).backgroundColor;
      const shelf = getComputedStyle(document.querySelector(".articles-shelf-label"));
      const name = getComputedStyle(document.querySelector(".articles-result-name")).color;
      const label = document.querySelector(".articles-shelf-label").getBoundingClientRect();
      const sc = document.querySelector(".articles-page-scroll").getBoundingClientRect();
      return { panel, shelfBg: shelf.backgroundColor, name: ratio(rgb(name), rgb(panel)), shelfText: ratio(rgb(shelf.color), rgb(shelf.backgroundColor)), stuck: Math.abs(label.top - sc.top) < 1.5 };
    });
    h.assert(look.shelfBg === look.panel && look.name >= 4.5 && look.shelfText >= 3 && look.stuck,
      `${skin}/${theme}: row contrast ${look.name.toFixed(1)}, shelf heading ${look.shelfText.toFixed(1)}, sticky ${look.stuck}, shelf bg matches panel ${look.shelfBg === look.panel}`);
    await shot(`10-${skin}-${theme}-archaeology`);
    await search("zzqqxx");
    await shot(`11-${skin}-${theme}-empty`);
    await back();
  }
  h.assert(h.consoleErrors.length === 0, `no page errors (${h.consoleErrors.slice(0, 2).join(" | ")})`);
}

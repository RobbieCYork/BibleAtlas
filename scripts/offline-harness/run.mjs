#!/usr/bin/env node
/**
 * Offline reading, end to end: the real production build in real headless Chrome, against the
 * signed-in harness's fake Supabase, with fixture Bible packs. The network is cut for real (the
 * preview server is stopped, the fake backend refuses, and Chrome is put offline).
 *
 *   node scripts/offline-harness/run.mjs [--viewport 375x812] [--theme light|dark] [--out <folder>]
 *
 * Nothing reaches the internet (see ../signed-in-harness/README.md).
 */
import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONAS, FAKE_HOST, FAKE_URL, FAKE_ANON_KEY, STORAGE_KEY } from "../signed-in-harness/lib/personas.mjs";
import { createBackend } from "../signed-in-harness/lib/backend.mjs";
import { launchChrome, openTab, closeNetwork, sleep } from "../signed-in-harness/lib/browser.mjs";
import { createPage } from "../signed-in-harness/lib/page.mjs";
import { sha256 } from "../bible-packs/pack.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VITE = join(ROOT, "node_modules/vite/bin/vite.js");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const viewport = arg("--viewport", "375x812");
const theme = arg("--theme", "light");
const outDir = arg("--out") ?? mkdtempSync(join(tmpdir(), "offline-harness-out."));
mkdirSync(outDir, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "offline-harness-work."));
const cleanups = [() => rmSync(work, { recursive: true, force: true })];
let exitCode = 0;

function node(args, env = {}) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${args.join(" ")} failed:\n${(r.stdout + r.stderr).slice(-3000)}`);
}
function build(name, packs) {
  const dist = join(work, name);
  node([VITE, "build", "--outDir", dist, "--emptyOutDir"], { VITE_SUPABASE_URL: FAKE_URL, VITE_SUPABASE_ANON_KEY: FAKE_ANON_KEY, BIBLE_PACKS_DIR: packs });
  return dist;
}

/** The same packs with one WEB verse reworded: "the next release shipped a corrected text". */
function changedPacks(from) {
  const to = join(work, "packs-v2");
  cpSync(from, to, { recursive: true });
  const catalog = JSON.parse(readFileSync(join(to, "catalog.json"), "utf8"));
  const web = catalog.packs.find((p) => p.id === "web");
  const path = join(to, "web", "01.json");
  const bytes = Buffer.from(readFileSync(path, "utf8").replace("In the beginning", "In the very beginning"));
  writeFileSync(path, bytes);
  Object.assign(web.books[0], { bytes: bytes.length, sha256: sha256(bytes) });
  web.bytes = web.books.reduce((s, b) => s + b.bytes, 0);
  web.version = sha256(web.books.map((b) => b.sha256).join("")).slice(0, 12);
  writeFileSync(join(to, "catalog.json"), JSON.stringify(catalog));
  return to;
}

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });

try {
  process.stdout.write("building fixtures and two production bundles... ");
  const packs = join(work, "packs-v1");
  node([join(ROOT, "scripts/bible-packs/fixtures.mjs"), "--out", packs]);
  const distV1 = build("dist-v1", packs);
  const distV2 = build("dist-v2", changedPacks(packs));
  console.log("done");

  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  let server = null;
  const stopServer = async () => {
    if (!server) return;
    const gone = new Promise((r) => server.once("exit", r));
    server.kill();
    await gone;
    server = null;
  };
  const startServer = async (dist) => {
    await stopServer();
    server = spawn(process.execPath, [VITE, "preview", "--outDir", dist, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
    for (let i = 0; i < 80; i++) { try { if ((await fetch(origin)).ok) return; } catch { /* not yet */ } await sleep(250); }
    throw new Error("preview server did not start");
  };
  cleanups.push(() => server?.kill());
  await startServer(distV1);

  const me = PERSONAS.member;
  const row = (n, extra) => ({ id: `00000000-0000-4000-a000-${String(n).padStart(12, "0")}`, user_id: me.id, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", ...extra });
  const backend = createBackend({
    persona: "member",
    overrides: {
      tables: {
        highlights: [row(1, { book: "John", chapter: 3, start_verse: 16, end_verse: 16, start_offset: 4, end_offset: 22, translation: "web", color: "yellow" })],
        notes: [row(2, { book: "John", chapter: 3, start_verse: 16, end_verse: 16, translation: "web", quoted_text: "God so loved", quoted_start_offset: 4, quoted_end_offset: 16, note_text: "A note saved before going offline", is_public: false })],
        tags: [row(3, { name: "Gospel" })],
        verse_tags: [row(4, { book: "John", chapter: 3, start_verse: 16, end_verse: 16, translation: "web", tag_id: "00000000-0000-4000-a000-000000000003" })],
      },
    },
  });

  const chrome = await launchChrome();
  cleanups.push(() => chrome.close());
  const tab = await openTab(chrome.cdpPort);
  let cut = false;
  let slowBibles = 0;
  const bibleRequests = [];
  const ledger = await closeNetwork(tab, {
    previewOrigin: origin,
    serve: backend.handle,
    gate: async (request) => {
      const url = new URL(request.url);
      if (cut && (url.host === FAKE_HOST || url.host === `127.0.0.1:${port}`)) return "fail";
      if (url.pathname.startsWith("/bibles/")) {
        bibleRequests.push(url.pathname);
        if (slowBibles) await sleep(slowBibles);
        if (cut) return "fail";
      }
    },
  });
  const consoleErrors = [];
  await tab.send("Runtime.enable");
  tab.on("Runtime.exceptionThrown", (p) => consoleErrors.push(`exception: ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`));
  const [w, h] = viewport.split("x").map(Number);
  await tab.send("Page.enable");
  await tab.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await tab.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(()=>{ try { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded','1');
      localStorage.setItem('bible-atlas-remember-me','true'); localStorage.setItem('app-theme', ${JSON.stringify(theme)});
      localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(backend.session))}); } catch (e) {} })()`,
  });
  const page = createPage({ tab, backend, ledger, consoleErrors, outDir, meta: { persona: "member", viewport, theme, previewOrigin: origin } });

  const network = async (on) => {
    cut = !on;
    await tab.send("Network.emulateNetworkConditions", { offline: !on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  };
  const goOffline = async () => { await stopServer(); await network(false); };
  const goOnline = async (dist) => { await startServer(dist); await network(true); };

  const mobile = w < 768;
  const until = async (fn, what, timeout = 20000) => {
    const t0 = Date.now();
    for (;;) {
      const v = await page.evaluate(fn).catch(() => false);
      if (v) return v;
      if (Date.now() - t0 > timeout) { page.assert(false, `timed out waiting for ${what}`); await page.screenshot(`timeout-${page.checks.length}.png`); throw new Error(`timed out waiting for ${what}`); }
      await sleep(150);
    }
  };
  const body = () => page.evaluate(() => document.body.innerText);
  const verseText = (n) => page.evaluate(`(()=>{ const p = [...document.querySelectorAll('.bible-verses p')].find(p => p.querySelector('.bible-verse-num')?.textContent === '${n}'); return p ? p.innerText : null })()`);
  const heading = () => page.evaluate(() => document.querySelector(".bible-passage-title-label")?.textContent ?? null);
  const waitHeading = (ref) => until(`document.querySelector('.bible-passage-title-label')?.textContent === ${JSON.stringify(ref)} && document.querySelectorAll('.bible-verses p').length > 0`, ref);
  const chooseTranslation = (id) => page.evaluate((v) => {
    const s = document.querySelector(".bible-translation-select");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, v);
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }, id);
  const openSheet = async () => { await chooseTranslation("__offline__"); await page.waitFor(".offline-sheet .offline-bible"); };
  const closeSheet = () => page.click(".offline-sheet .share-modal-close");
  const rowText = (id) => page.evaluate(`document.querySelector('.offline-bible[data-translation="${id}"]')?.innerText.replace(/\\s+/g,' ') ?? ''`);
  const rowButton = (id, label) => page.click({ css: `.offline-bible[data-translation="${id}"] button`, text: label });
  const waitRow = (id, text, timeout) => until(`document.querySelector('.offline-bible[data-translation="${id}"]')?.innerText.includes(${JSON.stringify(text)})`, `${id} row "${text}"`, timeout);
  const idb = (store) => page.evaluate((s) => new Promise((resolve, reject) => {
    const open = indexedDB.open("capstone-bible-library");
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(s)) { db.close(); return resolve({ count: 0, keys: [], values: [] }); }
      const t = db.transaction(s, "readonly");
      const keys = t.objectStore(s).getAllKeys();
      const values = s === "books" ? null : t.objectStore(s).getAll();
      t.oncomplete = () => { db.close(); resolve({ count: keys.result.length, keys: keys.result, values: values?.result ?? [] }); };
    };
    open.onerror = () => reject(open.error);
  }), store);
  const swState = () => page.evaluate(async () => ({
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    controlled: !!navigator.serviceWorker.controller,
    caches: await caches.keys(),
  }));
  const goToReference = async (book, chapter) => {
    await page.click(".bible-passage-title-btn");
    await page.waitFor(".ref-picker");
    await page.click({ css: ".ref-picker-book", text: book });
    await page.click(`.ref-picker-cell:nth-child(${chapter})`);
    await waitHeading(`${book} ${chapter}`);
  };
  const openJohn3 = () => goToReference("John", 3);
  const highlightText = () => page.evaluate(() => [...document.querySelectorAll(".bible-verses mark, .bible-verses [class*=highlight]")].map((e) => e.textContent).join("|"));

  /* ---------------------------------------------------------------- */
  page.section(`1. Online, nothing downloaded (${viewport}, ${theme})`);
  await page.goto("/");
  await waitHeading("Matthew 1");
  page.assert(/World English Bible, Public Domain/.test(await body()), "footer names the translation and Public Domain");
  page.assert(bibleRequests.some((p) => p.startsWith("/bibles/web/")), "online reading uses our own file");
  let sw = await swState();
  page.assert(sw.registrations === 0 && sw.caches.length === 0, "no service worker and no caches for a reader who has downloaded nothing");
  const options = await page.evaluate(() => [...document.querySelectorAll(".bible-translation-select option")].map((o) => o.textContent));
  page.assert(options.includes("Berean Standard Bible (BSB)"), `BSB is in the reader's list: ${options.join(" / ")}`);
  await openJohn3();
  await until(() => document.querySelector(".verse-note-indicator") !== null, "note indicator online");
  const onlineVerse = await verseText(16);
  const onlineHighlight = await highlightText();
  page.assert(onlineHighlight.length > 0, `existing highlight is drawn online: "${onlineHighlight}"`);
  await goToReference("Matthew", 1);

  page.section("2. Download");
  await openSheet();
  page.assert(/4\.\d MB to download/.test(await rowText("web")), `size is shown before downloading: ${await rowText("web")}`);
  slowBibles = 60;
  await rowButton("web", "Download");
  await waitRow("web", "Downloading:");
  await until(() => Number(document.querySelector('.offline-bible[data-translation="web"] progress')?.value) > 200000, "progress moving");
  page.assert(true, `progress is shown: ${await rowText("web")}`);
  await page.screenshot("downloading.png");
  slowBibles = 0;
  await waitRow("web", "Downloaded,", 60000);
  const books = await idb("books");
  page.assert(books.count === 66, `66 book files saved (${books.count})`);
  await rowButton("bsb", "Download");
  await waitRow("bsb", "Downloaded,", 60000);
  await until(() => !!document.querySelector(".offline-bible-shell-ready"), "app saved for offline", 30000);
  sw = await swState();
  page.assert(sw.registrations === 1 && sw.caches.some((c) => c.startsWith("cb-shell-")), "service worker registered and the app saved");
  await until(() => new Promise((res) => { const o = indexedDB.open("capstone-bible-library"); o.onsuccess = () => { const q = o.result.transaction("kv").objectStore("kv").getAll(); q.onsuccess = () => res(q.result.some((s) => s.syncedAt && s.highlights.length === 1 && s.notes.length === 1)); }; }), "annotations copied to the device");
  page.assert(true, "highlights, notes and tags copied to the device");
  const fits = await page.evaluate(() => { const s = document.querySelector(".offline-sheet"); return s.scrollWidth <= s.clientWidth + 1 && s.getBoundingClientRect().right <= innerWidth + 1; });
  page.assert(fits, "download window fits the screen width");
  await page.screenshot("downloaded.png");
  await closeSheet();

  page.section("3. Network cut, access token expired, app opened again");
  await goOffline();
  await page.evaluate((key) => { const s = JSON.parse(localStorage.getItem(key)); s.expires_at = Math.floor(Date.now() / 1000) - 3600; localStorage.setItem(key, JSON.stringify(s)); }, STORAGE_KEY);
  let t0 = Date.now();
  await page.reload();
  await waitHeading("Matthew 1");
  page.assert(true, `app and last chapter open with no connection (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  page.assert(await page.evaluate(() => navigator.onLine === false), "device reports offline");
  page.assert(/Offline: reading the copy downloaded on this device\./.test(await body()), "reader says it is offline");
  await openJohn3();
  await until(() => document.querySelector(".verse-note-indicator") !== null, "note indicator offline");
  page.assert((await verseText(16)) === onlineVerse, "verse text is identical offline");
  page.assert((await highlightText()) === onlineHighlight, `highlight covers the same words offline: "${await highlightText()}"`);
  page.assert(await page.exists(".verse-tag-indicator"), "tag indicator offline");
  await page.screenshot("offline-john3.png");
  await page.click(".verse-note-indicator");
  await page.waitFor(".verse-sheet");
  const sheetText = await page.text(".verse-sheet");
  page.assert(sheetText.includes("A note saved before going offline"), "saved note can be read offline");
  page.assert(sheetText.includes("need a connection"), "sheet says changes need a connection");
  page.assert(!(await page.exists(".verse-popup-inline-note")) && !(await page.exists(".verse-popup-color")) && !(await page.exists(".verse-popup-note-delete")), "no controls that would write are offered");
  page.assert(await page.exists(".verse-popup-share-btn"), "Share is still offered");
  await page.screenshot("offline-note-sheet.png");
  await page.click(".verse-popup-close");
  page.assert(await page.exists({ css: ".bible-mark-read", text: "needs a connection" }), "mark-as-read says it needs a connection");
  await page.click(".bible-listen-chip");
  await page.waitFor({ css: ".bible-audio-error", text: "Narration needs a connection." });
  page.assert(true, "Listen says narration needs a connection");

  page.section("4. Offline: moving around, links, search");
  await page.click('.bible-passage-header [aria-label="Next chapter"]');
  await waitHeading("John 4");
  page.assert(true, "next chapter");
  await goToReference("Genesis", 1);
  page.assert(true, "another book through the chapter picker");
  await goToReference("Matthew", 2);
  const tapName = (name) => page.evaluate((n) => {
    const a = [...document.querySelectorAll(".bible-verses button")].find((e) => e.textContent.trim() === n);
    a?.scrollIntoView({ block: "center", behavior: "instant" });
    a?.click();
    return !!a;
  }, name);
  const linkNames = await page.evaluate(() => [...document.querySelectorAll(".bible-verses button[class*=link]")].map((e) => e.textContent.trim()));
  page.assert(linkNames.includes("Herod") && linkNames.includes("Jerusalem"), `people and place names are linked offline (${linkNames.length} links)`);
  await tapName("Herod");
  await sleep(800);
  await page.evaluate(() => document.querySelector(".link-choice-popup button")?.click());
  await sleep(800);
  page.assert(/Herod the Great/.test(await body()), "a person's name opens their article offline");
  await page.screenshot("offline-link-person.png");
  await page.goto("/");
  await waitHeading("Matthew 2");
  await tapName("Jerusalem");
  await sleep(800);
  await page.evaluate(() => document.querySelector(".link-choice-popup button")?.click());
  await sleep(800);
  page.assert(/Jerusalem/.test(await body()), "a place name goes to its pin offline, as it does online");
  await page.screenshot("offline-link-place.png");
  await page.goto("/");
  await waitHeading("Matthew 2");
  page.assert(true, "reopened offline on the chapter last read");
  await page.evaluate(() => { const input = document.querySelector('.app-header input'); input?.focus(); });
  if (await page.exists(".app-header input")) {
    await page.type(".app-header input", "his one and only Son");
    await sleep(1500);
    const all = await body();
    page.assert(/John 3:16/.test(all), "header Scripture search finds the verse offline");
    await page.screenshot("offline-search.png");
    await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await page.goto("/");
    await waitHeading("Matthew 2");
  } else page.assert(false, "header search box not found");

  page.section("5. Offline: translations");
  await chooseTranslation("kjv");
  await page.waitFor({ css: ".bible-error", text: "isn't downloaded" });
  page.assert(true, "a translation that is not downloaded says so");
  await page.screenshot("offline-not-downloaded.png");
  await page.click({ css: ".offline-switch button", text: "Read the downloaded BSB" });
  await waitHeading("Matthew 2");
  page.assert((await verseText(1)).includes("[Test fixture, not Bible text]"), "switched to the downloaded BSB fixture");
  const foot = await page.text(".bible-translation-credit");
  page.assert(foot.startsWith("Berean Standard Bible, Public Domain") && foot.includes("Berean Bible Translation Committee"), "BSB rights line and requested attribution");
  await chooseTranslation("web");
  await until(() => document.querySelector(".bible-translation-credit")?.innerText.startsWith("World English Bible"), "back to WEB");
  await openSheet();
  page.assert(/Downloading needs a connection/.test(await page.text(".offline-sheet")), "download window says downloading needs a connection");
  page.assert(await page.evaluate(() => document.querySelector('.offline-bible[data-translation="kjv"] button').disabled), "Download is disabled offline");
  await closeSheet();

  page.section("6. Back online");
  await goOnline(distV1);
  await until(() => !/You're offline|Offline: reading/.test(document.body.innerText), "offline line gone");
  await openJohn3();
  await page.click(".verse-note-indicator");
  await page.waitFor(".verse-popup-inline-note");
  page.assert(true, "editing controls return");
  await page.click(".verse-popup-close");

  page.section("7. Half-finished download: connection drops, then app reopened offline, then resumes");
  await openSheet();
  slowBibles = 120;
  await rowButton("kjv", "Download");
  await until(() => Number(document.querySelector('.offline-bible[data-translation="kjv"] progress')?.value) > 700000, "kjv part way");
  await goOffline();
  await waitRow("kjv", "connection dropped");
  const part = (await idb("books")).keys.filter((k) => k[0] === "kjv").length;
  page.assert(part > 0 && part < 66, `partial download kept (${part} of 66 books)`);
  await page.screenshot("paused.png");
  slowBibles = 0;
  await page.reload();
  await page.waitFor(".bible-passage-title-label");
  await chooseTranslation("kjv");
  await page.waitFor({ css: ".bible-error", text: "isn't downloaded" });
  page.assert(true, "a half-downloaded translation is not read from");
  await page.click({ css: ".offline-switch button", text: "Read the downloaded WEB" });
  await page.waitFor(".bible-translation-select");
  const before = bibleRequests.length;
  await goOnline(distV1);
  await openSheet();
  await waitRow("kjv", "Downloaded,", 60000);
  const resumed = bibleRequests.slice(before).filter((p) => p.startsWith("/bibles/kjv/")).length;
  page.assert(resumed <= 66 - part + 1, `resumed rather than restarted (${resumed} more requests for ${66 - part} missing books)`);

  page.section("8. App closed mid-download");
  slowBibles = 120;
  await rowButton("asv", "Download");
  await until(() => Number(document.querySelector('.offline-bible[data-translation="asv"] progress')?.value) > 500000, "asv part way");
  await page.reload();
  slowBibles = 0;
  await page.waitFor(".bible-translation-select");
  await openSheet();
  await waitRow("asv", "Downloaded,", 60000);
  page.assert((await idb("books")).count === 66 * 4, "resumed by itself after reopening; all four complete");

  page.section("9. Delete, storage full, cancel");
  await rowButton("asv", "Delete");
  page.assert(/Delete from this device\?/.test(await rowText("asv")), "delete asks first");
  await rowButton("asv", "Delete");
  await waitRow("asv", "to download");
  page.assert((await idb("books")).keys.every((k) => k[0] !== "asv"), "deleted translation's files are gone");
  slowBibles = 100;
  await rowButton("asv", "Download");
  await until(() => Number(document.querySelector('.offline-bible[data-translation="asv"] progress')?.value) > 400000, "asv part way");
  // Chrome now refuses further writes, as a full device does. Its database engine keeps the old
  // figure for up to 30 seconds, so the rest of the download is held slow enough to outlast that.
  await tab.send("Storage.overrideQuotaForOrigin", { origin, quotaSize: 1 });
  slowBibles = 1200;
  await waitRow("asv", "out of space", 75000);
  slowBibles = 0;
  page.assert(true, `storage full is explained: ${await rowText("asv")}`);
  await page.screenshot("storage-full.png");
  page.assert((await idb("packs")).values.filter((p) => p.complete).length === 3, "other downloads are untouched");
  await tab.send("Storage.overrideQuotaForOrigin", { origin });
  await rowButton("asv", "Resume");
  await waitRow("asv", "Downloaded,", 60000);
  page.assert(true, "resumes once there is room");
  await rowButton("asv", "Delete");
  await rowButton("asv", "Delete");
  await waitRow("asv", "to download");
  slowBibles = 150;
  await rowButton("asv", "Download");
  await waitRow("asv", "Downloading:");
  await sleep(500);
  await rowButton("asv", "Cancel");
  slowBibles = 0;
  await waitRow("asv", "to download");
  await sleep(600);
  page.assert((await idb("books")).keys.every((k) => k[0] !== "asv"), "cancel discards the partial download");
  await closeSheet();

  page.section("10. A new app version with a changed text");
  const oldShell = (await swState()).caches.filter((c) => c.startsWith("cb-shell-"));
  await goOnline(distV2);
  await page.reload();
  await page.waitFor(".bible-translation-select");
  await until(`caches.keys().then(k => k.some(n => n.startsWith('cb-shell-') && !${JSON.stringify(oldShell)}.includes(n)))`, "new shell saved", 30000);
  page.assert(true, "the new app version replaced the saved copy");
  page.assert((await idb("books")).count === 66 * 3, "downloads survived the app update");
  await chooseTranslation("web");
  await goToReference("Genesis", 1);
  page.assert((await verseText(1)).includes("In the beginning"), "reading stays on the downloaded text until updated");
  await openSheet();
  await waitRow("web", "A newer copy is available");
  await page.screenshot("update-available.png");
  await rowButton("web", "Update");
  await until(() => { const t = document.querySelector('.offline-bible[data-translation="web"]')?.innerText ?? ""; return t.includes("Downloaded,") && !t.includes("newer") && !t.includes("Updating"); }, "web updated", 60000);
  page.assert((await idb("books")).keys.filter((k) => k[0] === "web").length === 66, "old copy replaced, not duplicated");
  await closeSheet();
  await goOffline();
  await page.reload();
  await page.waitFor(".bible-passage-title-label");
  await goToReference("Genesis", 1);
  page.assert((await verseText(1)).includes("In the very beginning"), "updated app and updated text open offline");

  page.section("11. Offline sign-out erases the reader's copies");
  if (mobile) {
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /social|profile/i.test(b.textContent) && b.closest("[class*=tab]"))?.click());
    await sleep(500);
  }
  if (!(await page.exists({ css: "button", text: "Log Out" }))) { await page.evaluate(() => document.querySelector(".auth-trigger")?.click()); await sleep(500); }
  const out = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((b) => /^(log|sign) ?out$/i.test(b.textContent.trim())); b?.click(); return !!b; });
  page.assert(out, "log out control found");
  await until(() => !document.querySelector(".app-shell"), "sign-in screen", 15000);
  page.assert((await idb("kv")).count === 0, "saved highlights, notes and tags erased");
  page.assert(await page.evaluate((k) => !localStorage.getItem(k) && !localStorage.getItem("bible-last-position"), STORAGE_KEY), "session and reading position erased");
  page.assert((await idb("books")).count === 66 * 3, "downloaded Bibles stay");

  page.section("12. Deleting the last download removes the service worker");
  await goOnline(distV2);
  await page.evaluate((k, s) => { localStorage.setItem(k, s); }, STORAGE_KEY, JSON.stringify(backend.session));
  await page.reload();
  await page.waitFor(".bible-translation-select");
  await openSheet();
  for (const id of ["web", "kjv", "bsb"]) {
    await rowButton(id, "Delete");
    await rowButton(id, "Delete");
    await waitRow(id, "to download");
  }
  await until(async () => (await navigator.serviceWorker.getRegistrations()).length === 0 && (await caches.keys()).length === 0, "worker and caches removed");
  page.assert((await idb("books")).count === 0 && (await idb("kv")).count === 0, "nothing left on the device");
  await closeSheet();
  page.assert((await heading()) !== null, "reader still works online");

  const failed = page.checks.filter((c) => !c.ok).length;
  console.log("\n================ OFFLINE HARNESS SUMMARY ================");
  console.log(`assertions: ${page.checks.length - failed} passed, ${failed} failed`);
  console.log(`requests that reached the network beyond the local preview: ${ledger.continuedExternal}`);
  console.log(`page errors: ${consoleErrors.length}${consoleErrors.length ? "\n  " + consoleErrors.slice(0, 5).map((e) => e.slice(0, 200)).join("\n  ") : ""}`);
  console.log(`screenshots: ${outDir}`);
  if (failed || consoleErrors.length || ledger.continuedExternal) exitCode = 1;
  console.log(exitCode ? "RESULT: FAIL" : "RESULT: OK");
} catch (e) {
  console.error("harness error:", e?.stack ?? e);
  console.log(`screenshots: ${outDir}`);
  exitCode = 1;
} finally {
  for (const c of cleanups.reverse()) c();
}
process.exit(exitCode);

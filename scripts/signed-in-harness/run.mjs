#!/usr/bin/env node
/**
 * Signed-in verification harness. See README.md.
 *
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 375x667 --script my-checks.mjs
 *
 *   --persona   member | advisor | administrator | owner | guest | signedout   (default member)
 *   --viewport  WxH via Emulation.setDeviceMetricsOverride (default 1280x800)
 *   --theme     light | dark (default light)
 *   --script    a module whose default export is async (h) => {...}; omit for a smoke run
 *   --fixtures  JSON file of per-run overrides: { "tables": {name: rows}, "rpc": {name: value} }
 *   --dist      reuse an existing build made WITH the fake env (see README); default builds a fresh one
 *   --out       directory for screenshots (default: a fresh temp dir)
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PERSONAS, FAKE_URL, FAKE_ANON_KEY, STORAGE_KEY } from "./lib/personas.mjs";
import { createBackend } from "./lib/backend.mjs";
import { launchChrome, openTab, closeNetwork, sleep } from "./lib/browser.mjs";
import { createPage } from "./lib/page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };

const persona = arg("--persona", "member");
const viewport = arg("--viewport", "1280x800");
const theme = arg("--theme", "light");
if (!(persona in PERSONAS)) { console.error(`unknown persona "${persona}". one of: ${Object.keys(PERSONAS).join(", ")}`); process.exit(2); }
const scriptPath = arg("--script");
const fixturesPath = arg("--fixtures");
const outDir = arg("--out") ?? mkdtempSync(join(tmpdir(), "signed-in-harness-out."));
mkdirSync(outDir, { recursive: true });

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });

/** The real Supabase host, if this machine has one configured - used ONLY to prove nothing talks to it.
 * Read from the environment or .env.local; the value is never printed. */
function realSupabaseHost() {
  try {
    let url = process.env.VITE_SUPABASE_URL;
    if (!url) {
      const common = spawnSync("git", ["rev-parse", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
      for (const dir of [ROOT, resolve(ROOT, common, "..")]) {
        const f = join(dir, ".env.local");
        if (existsSync(f)) { url = /^VITE_SUPABASE_URL=(.*)$/m.exec(readFileSync(f, "utf8"))?.[1]?.trim().replace(/^["']|["']$/g, ""); if (url) break; }
      }
    }
    return url ? new URL(url).host : null;
  } catch { return null; }
}

const cleanups = [];
let exitCode = 0;
try {
  // 1. A production build whose Supabase URL is the fake host. The real URL is not in the bundle.
  let dist = arg("--dist");
  if (!dist) {
    const tmp = mkdtempSync(join(tmpdir(), "signed-in-harness-dist."));
    cleanups.push(() => rmSync(tmp, { recursive: true, force: true }));
    dist = join(tmp, "dist");
    process.stdout.write("building production bundle against the fake backend... ");
    const t0 = Date.now();
    const b = spawnSync(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "build", "--outDir", dist, "--emptyOutDir"], {
      cwd: ROOT, encoding: "utf8",
      env: { ...process.env, VITE_SUPABASE_URL: FAKE_URL, VITE_SUPABASE_ANON_KEY: FAKE_ANON_KEY },
    });
    if (b.status !== 0) { console.error("\nvite build failed:\n" + (b.stdout + b.stderr).slice(-2000)); process.exit(1); }
    console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // 2. vite preview of that build, own port, killed by PID.
  const port = await freePort();
  const preview = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "preview", "--outDir", dist, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  cleanups.push(() => { try { preview.kill(); } catch { /* gone */ } });
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(origin)).ok) break; } catch { /* not yet */ } await sleep(250); }

  // 3. Fake backend, closed-network Chrome.
  const overrides = fixturesPath ? JSON.parse(readFileSync(resolve(fixturesPath), "utf8")) : {};
  const backend = createBackend({ persona: persona === "signedout" ? null : persona, overrides });
  const chrome = await launchChrome();
  cleanups.push(() => chrome.close());
  const tab = await openTab(chrome.cdpPort);
  const forbidden = realSupabaseHost();
  const ledger = await closeNetwork(tab, { previewOrigin: origin, serve: backend.handle, forbiddenHosts: forbidden ? [forbidden] : [] });
  const consoleErrors = [];
  await tab.send("Runtime.enable");
  tab.on("Runtime.exceptionThrown", (p) => consoleErrors.push(`exception: ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`));
  tab.on("Runtime.consoleAPICalled", (p) => { if (p.type === "error") consoleErrors.push(`console.error: ${p.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300)}`); });

  const [w, h] = viewport.split("x").map(Number);
  await tab.send("Page.enable");
  await tab.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  // 4. The signed-in state: a session in the client's own storage, seeded once per tab.
  const seed = `(()=>{ try { if (sessionStorage.getItem('__harness_seeded')) return; sessionStorage.setItem('__harness_seeded','1');
    localStorage.setItem('bible-atlas-remember-me','true'); localStorage.setItem('app-theme', ${JSON.stringify(theme)});
    ${backend.session ? `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(backend.session))});` : ""} } catch (e) {} })()`;
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: seed });

  const page = createPage({ tab, backend, ledger, consoleErrors, outDir, meta: { persona, viewport, theme, previewOrigin: origin } });
  console.log(`persona=${persona}  viewport=${viewport}  theme=${theme}  preview=${origin}  chrome pid=${chrome.pid}`);
  await page.goto("/");
  await page.sleep(1500); // let startup requests (auth, feature flags, role checks) settle

  if (scriptPath) {
    const mod = await import(pathToFileURL(resolve(scriptPath)).href);
    await mod.default(page);
  } else {
    page.section("smoke run (no --script)");
    page.assert(await page.exists("#root > *"), "app mounted");
    const signedIn = await page.exists('[aria-label="Settings and account"]');
    console.log(`  signed-in app shell (account menu) visible: ${signedIn}  [expected: ${["member", "advisor", "administrator", "owner"].includes(persona)}; guest and signedout land on the sign-in gate by design]`);
    console.log("  body text:", JSON.stringify((await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 160)));
    console.log("  screenshot:", await page.screenshot("smoke.png"));
  }
  await page.sleep(500);

  // 5. The ledger. The leak assertion is the one that matters.
  const failed = page.checks.filter((c) => !c.ok).length;
  const reached = ledger.continuedExternal;
  console.log("\n================ HARNESS SUMMARY ================");
  console.log(`assertions: ${page.checks.length - failed} passed, ${failed} failed`);
  console.log(`requests that reached the REAL Supabase host: ${reached === 0 && ledger.forbiddenAttempts === 0 ? "0" : `${ledger.forbiddenAttempts} attempted (all blocked), ${reached} reached the network`}`);
  console.log(`  network ledger: ${ledger.app} to the local preview, ${ledger.fake} answered by the fake backend, ${ledger.blocked.length} external blocked, ${reached} let through to the network`);
  console.log(`  real-host check: ${forbidden ? "a production Supabase host is configured on this machine and was watched for" : "no production host configured here (nothing to watch for; DNS is closed regardless)"}`);
  if (ledger.websockets.length) console.log(`  websockets opened: ${[...new Set(ledger.websockets)].join(", ")} (fake host does not resolve)`);
  if (ledger.blocked.length) console.log(`  blocked external requests (first 8): ${[...new Set(ledger.blocked)].slice(0, 8).join(" | ")}`);
  const gaps = [...new Set(backend.log.gaps)];
  console.log(`fixture gaps (answered empty - add a fixture if a check depends on them): ${gaps.length ? gaps.join(", ") : "none"}`);
  console.log(`writes the app made to the fake backend: ${backend.log.writes.length}; set_feature_stage audit entries: ${backend.log.audit.length}`);
  console.log(`page errors: ${consoleErrors.length}${consoleErrors.length ? " (first: " + consoleErrors[0].slice(0, 160) + ")" : ""}`);
  console.log(`screenshots: ${outDir}`);
  if (reached !== 0) { console.log("LEAK: a request was let through to the network. This run is invalid."); exitCode = 1; }
  if (failed) exitCode = 1;
  console.log(exitCode ? "RESULT: FAIL" : "RESULT: OK");
} catch (e) {
  console.error("harness error:", e?.stack ?? e);
  exitCode = 1;
} finally {
  for (const c of cleanups.reverse()) c();
}
process.exit(exitCode);

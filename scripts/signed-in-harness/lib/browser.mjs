/**
 * Real Google Chrome over CDP, no npm dependencies (Node 24's global WebSocket). Headless, a fresh
 * mktemp profile, killed by PID only - never pkill (AGENTS.md).
 *
 * THE NETWORK IS CLOSED. Three independent layers, so one failing cannot leak:
 *   1. Chrome is started with --host-resolver-rules that fail DNS for every host except 127.0.0.1.
 *   2. CDP Fetch.enable pauses every request: loopback is continued, the fake Supabase host is
 *      fulfilled from the in-memory backend, everything else is failed and logged as BLOCKED.
 *   3. The built bundle points at harness-fake.supabase.invalid (a name that cannot resolve), so the
 *      production Supabase URL is not in the bundle at all.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FAKE_HOST } from "./personas.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchChrome() {
  if (!existsSync(CHROME)) throw new Error(`Google Chrome not found at ${CHROME}`);
  const profile = mkdtempSync(join(tmpdir(), "signed-in-harness-chrome."));
  const proc = spawn(CHROME, [
    "--headless=new", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--no-default-browser-check",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
    "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1",
    `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank",
  ], { stdio: "ignore" });
  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 80 && !(existsSync(portFile) && readFileSync(portFile, "utf8").trim()); i++) await sleep(250);
  if (!existsSync(portFile)) { proc.kill(); throw new Error("Chrome did not open a debugging port"); }
  const cdpPort = Number(readFileSync(portFile, "utf8").split("\n")[0]);
  return {
    cdpPort, pid: proc.pid,
    close() { try { proc.kill(); } catch { /* already gone */ } try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ } },
  };
}

export async function openTab(cdpPort) {
  const tab = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(`${m.error.message}`)) : res(m.result); }
    else if (m.method) for (const fn of listeners.get(m.method) ?? []) fn(m.params);
  };
  return {
    id: tab.id,
    send: (method, params = {}) => new Promise((res, rej) => { const id = ++nextId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); }),
    on: (method, fn) => { (listeners.get(method) ?? listeners.set(method, []).get(method)).push(fn); },
    async close() { try { ws.close(); await fetch(`http://127.0.0.1:${cdpPort}/json/close/${tab.id}`); } catch { /* ignore */ } },
  };
}

/**
 * Close the network on a tab. Returns the ledger the run asserts on.
 * `serve(req)` answers fake-host requests. `allowHosts` are extra hosts to let through (rare; each
 * one is a hole, so the default is none).
 */
export async function closeNetwork(tab, { previewOrigin, serve, allowHosts = [], forbiddenHosts = [] }) {
  const ledger = { app: 0, fake: 0, blocked: [], continuedExternal: 0, forbiddenAttempts: 0, websockets: [] };
  const previewHost = new URL(previewOrigin).host;
  await tab.send("Network.enable");
  tab.on("Network.webSocketCreated", (p) => ledger.websockets.push(p.url));
  await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  tab.on("Fetch.requestPaused", async (p) => {
    const { requestId, request } = p;
    let host = "";
    try { host = new URL(request.url).host; } catch { /* data: etc. */ }
    try {
      if (host === previewHost || request.url.startsWith("data:") || request.url.startsWith("blob:")) {
        ledger.app++;
        return await tab.send("Fetch.continueRequest", { requestId });
      }
      if (host === FAKE_HOST) {
        ledger.fake++;
        const headers = Object.fromEntries(Object.entries(request.headers).map(([k, v]) => [k.toLowerCase(), v]));
        const res = serve({ method: request.method, url: request.url, headers, body: request.postData });
        const cors = {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
          "access-control-allow-headers": "*, authorization, apikey, content-type, prefer, accept-profile, content-profile, x-client-info, range",
          "access-control-expose-headers": "content-range",
        };
        if (request.method === "OPTIONS") cors["access-control-allow-headers"] = request.headers["Access-Control-Request-Headers"] ?? "authorization, apikey, content-type, prefer, x-client-info";
        const all = { ...cors, ...res.headers };
        return await tab.send("Fetch.fulfillRequest", {
          requestId, responseCode: res.status,
          responseHeaders: Object.entries(all).map(([name, value]) => ({ name, value: String(value) })),
          body: Buffer.from(res.body ?? "").toString("base64"),
        });
      }
      if (allowHosts.includes(host)) {
        ledger.continuedExternal++;
        return await tab.send("Fetch.continueRequest", { requestId });
      }
      if (forbiddenHosts.includes(host)) ledger.forbiddenAttempts++; // a real-Supabase request was attempted - and is failed below
      ledger.blocked.push(`${request.method} ${host}${new URL(request.url).pathname}`);
      return await tab.send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
    } catch { /* the page navigated away mid-request */ }
  });
  return ledger;
}

export { sleep, writeFileSync };

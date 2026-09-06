/**
 * Drives the real Google Chrome on this machine over the DevTools Protocol, with
 * no npm dependencies: Node 24 ships a global WebSocket, which is all CDP needs.
 * Nothing to install, nothing to keep in sync with the app's dependency tree.
 *
 *   node drive-chrome.mjs --url <url> --cdp-port <n> [options]
 *
 *   --watch-ms <n>     how long to keep sampling. Default 30000.
 *   --sample-ms <n>    gap between samples. Default 2000.
 *   --block-storage    make window.sessionStorage throw before any page script
 *                      runs, emulating private mode / cookies off. Injected with
 *                      Page.addScriptToEvaluateOnNewDocument so it beats the
 *                      inline <script> in index.html, which nothing else can.
 *   --viewport <WxH>   set the viewport via Emulation.setDeviceMetricsOverride.
 *                      Use this and NOT --window-size: headless Chrome on macOS
 *                      silently floors the window width at 500px, so a "375px"
 *                      run is really a cropped 500px render. See AGENTS.md.
 *
 * Each sample prints the counter, the visible text and whether React mounted.
 * Treat these as corroboration. The server's request log is the evidence.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}
const has = (name) => process.argv.includes(name);

const URL_ = arg('--url');
const CDP_PORT = Number(arg('--cdp-port'));
const WATCH_MS = Number(arg('--watch-ms', 30000));
const SAMPLE_MS = Number(arg('--sample-ms', 2000));
const VIEWPORT = arg('--viewport');

if (!URL_ || !CDP_PORT) {
  console.error('usage: node drive-chrome.mjs --url <url> --cdp-port <n> [--watch-ms n] [--block-storage] [--viewport WxH]');
  process.exit(2);
}

// Chrome takes a moment to open its debugging endpoint.
for (let i = 0; i < 80; i++) {
  try {
    await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    break;
  } catch {
    await sleep(250);
  }
}

const tab = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));

let nextId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
}

await send('Page.enable');

if (VIEWPORT) {
  const [width, height] = VIEWPORT.split('x').map(Number);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
}

if (has('--block-storage')) {
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: function () { throw new DOMException('The operation is insecure.', 'SecurityError'); }
    });`,
  });
}

await send('Page.navigate', { url: URL_ });

const SNAPSHOT = `(function () {
  var storageThrows = false, counter = null;
  try { counter = window.sessionStorage.getItem('cb:asset-recovery'); }
  catch (e) { storageThrows = true; }
  var root = document.getElementById('root');
  return JSON.stringify({
    counter: counter,
    storageThrows: storageThrows,
    innerWidth: window.innerWidth,
    rootChildren: root ? root.children.length : -1,
    bodyText: (document.body ? document.body.innerText : '').trim().slice(0, 100)
  });
})()`;

const startedAt = Date.now();
while (Date.now() - startedAt < WATCH_MS) {
  await sleep(SAMPLE_MS);
  console.log(`[t+${String(Date.now() - startedAt).padStart(6)}ms] ${await evaluate(SNAPSHOT)}`);
}

console.log('---FINAL---');
console.log(await evaluate(SNAPSHOT));
ws.close();
process.exit(0);

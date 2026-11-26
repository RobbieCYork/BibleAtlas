/* Capstone Bible offline shell (service worker).
 *
 * Source: scripts/offline-shell/sw.template.js. vite-plugin-offline-shell.ts fills in the three
 * constants below and writes the result to /sw.js. The app registers it ONLY on a device that has
 * downloaded a translation (see src/lib/offline/shell.ts), and removes it when the last one is deleted.
 *
 * What it may and may not do:
 *   - The page itself ("/") is always fetched from the network first. The saved copy is used only
 *     when the network fails, answers with a server error, or takes longer than NAV_TIMEOUT_MS.
 *   - The saved copy is replaced only when a whole new build installs: page and assets together, so
 *     the offline app can never be a page that names files it does not have.
 *   - /version.json, /bibles/, every other page and every other origin (Supabase, maps, audio) are
 *     not intercepted at all.
 */
const BUILD = __BUILD__;
const PRECACHE = __PRECACHE__;
const MUST_APPEAR = __ENTRY__;

const SHELL_PREFIX = "cb-shell-";
const SHELL = SHELL_PREFIX + BUILD;
const RUNTIME = "cb-runtime-v1";
const NAV_TIMEOUT_MS = 6000;
const STATIC_PREFIXES = ["/fonts/", "/people/", "/share-backgrounds/", "/map/", "/games/"];
const STATIC_FILES = ["/manifest.webmanifest", "/favicon.ico", "/favicon.svg", "/favicon-32.png", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png"];

const isHtml = (res) => (res.headers.get("content-type") || "").includes("text/html");
const match = (cacheName, key) => caches.open(cacheName).then((c) => c.match(key, { ignoreVary: true }));

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      try {
        const page = await fetch("/", { cache: "no-store" });
        if (!page.ok) throw new Error("shell: HTTP " + page.status);
        const html = await page.text();
        // Right after a deploy an edge cache can still hand out the previous build's page. Saving
        // that beside this build's assets would make an offline app that cannot start.
        if (!MUST_APPEAR.every((p) => html.includes(p))) throw new Error("shell: page is from another build");
        await cache.put("/", new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }));
        await Promise.all(
          PRECACHE.map(async (path) => {
            // Hashed files never change, so an older shell's copy is as good as a new download.
            const have = path.startsWith("/assets/") ? await caches.match(path, { ignoreVary: true }) : undefined;
            const res = have || (await fetch(path));
            // A missing file can come back as the HTML page with status 200.
            if (!res.ok || isHtml(res)) throw new Error("shell: could not save " + path);
            await cache.put(path, res);
          })
        );
      } catch (err) {
        await caches.delete(SHELL);
        throw err; // the previous worker (if any) stays in charge; the browser tries again later
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Keep the one previous shell too: a page still open from that build may ask for its files.
      const shells = (await caches.keys())
        .filter((k) => k.startsWith(SHELL_PREFIX) && k !== SHELL)
        .sort((a, b) => Number(b.slice(SHELL_PREFIX.length)) - Number(a.slice(SHELL_PREFIX.length)));
      await Promise.all(shells.slice(1).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function page(request) {
  const saved = () => match(SHELL, "/");
  const network = fetch(request);
  let timer;
  const slow = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), NAV_TIMEOUT_MS);
  });
  try {
    const first = await Promise.race([network, slow]);
    if (first && first.status < 500) return first;
    return (await saved()) || first || (await network);
  } catch (err) {
    const copy = await saved();
    if (copy) return copy;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function asset(request) {
  const have = await caches.match(request.url, { ignoreVary: true });
  if (have) return have;
  const res = await fetch(request);
  if (res.ok && !isHtml(res)) {
    const copy = res.clone();
    caches.open(SHELL).then((c) => c.put(request.url, copy)).catch(() => {});
  }
  return res;
}

function staticFile(event) {
  const request = event.request;
  const fresh = fetch(request).then(async (res) => {
    if (res.ok && !isHtml(res)) await (await caches.open(RUNTIME)).put(request.url, res.clone()).catch(() => {});
    return res;
  });
  event.waitUntil(fresh.catch(() => {}));
  return caches.match(request.url, { ignoreVary: true }).then((have) => have || fresh);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    if (url.pathname === "/" || url.pathname === "/index.html") event.respondWith(page(request));
    return;
  }
  if (url.pathname.startsWith("/assets/")) return event.respondWith(asset(request));
  if (STATIC_FILES.includes(url.pathname) || STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(staticFile(event));
  }
});

/** The service worker that lets the app itself open with no connection (/sw.js, built by
 * vite-plugin-offline-shell.ts). Registered only on a device that has asked for a download, so
 * readers who never use offline reading are not affected by it at all. */

export type ShellState = "unsupported" | "off" | "saving" | "ready" | "failed";

/** The web app only. A native wrapper already carries its files on the device. */
function supported(): boolean {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || !("caches" in window)) return false;
  const capacitor = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (capacitor?.isNativePlatform?.()) return false;
  const { protocol, hostname } = window.location;
  return protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";
}

let state: ShellState = supported() ? "off" : "unsupported";
const listeners = new Set<() => void>();
const set = (next: ShellState) => {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
};

export const getShellState = () => state;
export function subscribeShell(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** True once some saved copy of the app page exists — the thing an offline start actually needs. */
async function hasSavedPage(): Promise<boolean> {
  const names = (await caches.keys()).filter((k) => k.startsWith("cb-shell-"));
  for (const name of names) if (await (await caches.open(name)).match("/")) return true;
  return false;
}

function watch(worker: ServiceWorker | null) {
  if (!worker) return;
  set("saving");
  const check = () => {
    if (worker.state === "activated") set("ready");
    // "redundant" is how a failed install ends; an older saved copy may still be there.
    if (worker.state === "redundant") void hasSavedPage().then((has) => set(has ? "ready" : "failed"));
  };
  worker.addEventListener("statechange", check);
  check();
}

export async function ensureShell(): Promise<void> {
  if (!supported()) return;
  try {
    if (await hasSavedPage()) set("ready");
    else set("saving");
    if (!navigator.onLine) {
      if (state !== "ready") set("failed");
      return;
    }
    const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    if (state !== "ready") {
      watch(registration.installing ?? registration.waiting ?? registration.active);
      registration.addEventListener("updatefound", () => watch(registration.installing));
    }
    // A previous attempt that failed (a deploy in progress, a dropped connection) is retried here.
    if (!registration.installing && !(await hasSavedPage())) await registration.update();
  } catch (err) {
    console.warn("Couldn't save the app for offline use:", err);
    set("failed");
  }
}

/** Removes the worker and its saved files, once nothing is downloaded any more. */
export async function removeShell(): Promise<void> {
  if (!supported()) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
    await Promise.all((await caches.keys()).filter((k) => k.startsWith("cb-")).map((k) => caches.delete(k)));
    set("off");
  } catch (err) {
    console.warn("Couldn't remove the offline app copy:", err);
  }
}

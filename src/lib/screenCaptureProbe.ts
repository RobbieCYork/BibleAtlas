/**
 * FIDELITY PROBE ONLY. Compiled in when the build sets VITE_CAPTURE_PROBE=1, and dead-code-eliminated
 * otherwise (main.tsx imports it behind that constant), so it never reaches a production bundle.
 *
 * Every tap on a "Report a Problem" control is caught in the CAPTURE phase on window, which runs
 * before React's own handler, so the freeze happens at the same instant the real feature's will:
 * with any open menu still open and before the report sheet is drawn. The image and its timings are
 * POSTed to /__capture on the page's own origin, which only the local fidelity server answers.
 */
import { beginScreenCapture } from "./screenCapture";

declare global {
  interface Window {
    __cbCapture?: (label?: string) => Promise<unknown>;
    __cbLast?: Promise<unknown>;
  }
}

async function send(label: string, trigger: string) {
  const pending = beginScreenCapture();
  try {
    const r = await pending.result;
    const q = new URLSearchParams({
      label,
      trigger,
      w: String(r.width),
      h: String(r.height),
      sync: String(r.timings.syncMs),
      total: String(r.timings.totalMs),
      phases: JSON.stringify(r.timings.phases),
      notes: JSON.stringify(r.notes.slice(0, 20)),
      ua: navigator.userAgent,
      standalone: String(matchMedia("(display-mode: standalone)").matches),
    });
    await fetch(`/__capture?${q}`, { method: "POST", body: r.blob }).catch(() => {});
    const dataUrl = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(r.blob); });
    return { dataUrl, ok: true, syncMs: r.timings.syncMs, totalMs: r.timings.totalMs, phases: r.timings.phases, notes: r.notes, size: r.blob.size };
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    await fetch(`/__capture?${new URLSearchParams({ label, trigger, error: msg, sync: String(pending.syncMs) })}`, { method: "POST" }).catch(() => {});
    return { ok: false, error: msg, syncMs: pending.syncMs };
  }
}

export function installCaptureProbe() {
  window.__cbCapture = (label = "manual") => send(label, "manual");
  // Screens that cover the flag (a full-screen sheet) can be captured on the fidelity server's word:
  // it answers /__trigger with "1" once after `GET /__label?l=<name>&fire=1`.
  window.setInterval(() => {
    fetch("/__trigger", { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => {
        if (t.trim() === "1") window.__cbLast = send("remote", "remote");
      })
      .catch(() => {});
  }, 700);
  window.addEventListener(
    "click",
    (ev) => {
      const t = ev.target as Element | null;
      const hit = t?.closest?.('.header-report, .about-report, button, [role="menuitem"]');
      if (!hit) return;
      if (!/^report a problem/i.test(hit.getAttribute("aria-label") ?? "") && !/Report a Problem/i.test(hit.textContent ?? "")) return;
      const label = (document.querySelector("[data-capture-label]") as HTMLElement | null)?.dataset.captureLabel ?? location.hash ?? "tap";
      window.__cbLast = send(label || "tap", "tap");
    },
    true,
  );
}

/* ============================================================================
 * Unsaved-changes guard, shared by any editor that can be closed from outside itself.
 *
 * An editor marks itself dirty with markUnsaved(key, message). While anything is
 * dirty, the browser's own "Leave site?" prompt guards a reload, a tab close or
 * navigating away, and the app's own exits (Admin Console tabs, its Back button,
 * clicking outside the account menu) ask confirmDiscardUnsaved() first.
 * ========================================================================== */

const dirty = new Map<string, string>();

function onBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
  // Ignored by modern browsers, which show their own wording, but still required by some.
  e.returnValue = "";
}

/** message = what to ask before discarding; null = clean again. */
export function markUnsaved(key: string, message: string | null) {
  const before = dirty.size;
  if (message) dirty.set(key, message);
  else dirty.delete(key);
  if (before === 0 && dirty.size > 0) window.addEventListener("beforeunload", onBeforeUnload);
  if (before > 0 && dirty.size === 0) window.removeEventListener("beforeunload", onBeforeUnload);
}

export const hasUnsaved = () => dirty.size > 0;

/** true = go ahead (nothing unsaved, or the reader agreed to discard it). */
export function confirmDiscardUnsaved(): boolean {
  if (dirty.size === 0) return true;
  const message = [...dirty.values()][0];
  return window.confirm(message);
}

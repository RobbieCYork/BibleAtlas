// Sharing and public links, aware of the native app.
//
// In a browser nothing here changes behaviour: callers fall through to the Web Share API, the
// clipboard or a download exactly as before. In the iOS/Android app the system share sheet comes from
// @capacitor/share (loaded with a dynamic import, so browsers never download it).
import { Capacitor } from "@capacitor/core";

/** The address the WEBSITE lives at. Inside the native app window.location.origin is
 * capacitor://localhost (or http://localhost), which is useless in an invite link, and Supabase
 * e-mail confirmation / password-reset links must point at the real site. */
export const PUBLIC_ORIGIN = "https://capstonebible.com";

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** window.location.origin in a browser; the public website address inside the native app. */
export function webOrigin(): string {
  return isNative() ? PUBLIC_ORIGIN : window.location.origin;
}

/** window.location.pathname in a browser; "/" inside the native app (where the path is the app's own). */
export function webPathname(): string {
  return isNative() ? "/" : window.location.pathname;
}

/**
 * Opens the native share sheet for a link or text. Returns:
 *  - "shared"      the sheet was shown (or the share completed)
 *  - "cancelled"   the person dismissed it
 *  - "unavailable" not in the native app, so the caller should use its existing browser path
 */
export async function nativeShareLink(opts: { title?: string; text?: string; url?: string }): Promise<"shared" | "cancelled" | "unavailable"> {
  if (!isNative()) return "unavailable";
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
    return "shared";
  } catch (err) {
    const msg = String((err as { message?: string } | null)?.message ?? err).toLowerCase();
    if (msg.includes("cancel") || msg.includes("dismiss")) return "cancelled";
    return "unavailable";
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  return btoa(bin);
}

/** Shares an image file through the native share sheet. Same return values as nativeShareLink. */
export async function nativeShareImage(blob: Blob, filename: string): Promise<"shared" | "cancelled" | "unavailable"> {
  if (!isNative()) return "unavailable";
  try {
    const [{ Share }, { Filesystem, Directory }] = await Promise.all([import("@capacitor/share"), import("@capacitor/filesystem")]);
    const written = await Filesystem.writeFile({ path: filename, data: await blobToBase64(blob), directory: Directory.Cache });
    try {
      await Share.share({ files: [written.uri] });
      return "shared";
    } finally {
      // The temp copy is only needed while the sheet is up; best-effort cleanup.
      void Filesystem.deleteFile({ path: filename, directory: Directory.Cache }).catch(() => {});
    }
  } catch (err) {
    const msg = String((err as { message?: string } | null)?.message ?? err).toLowerCase();
    if (msg.includes("cancel") || msg.includes("dismiss")) return "cancelled";
    return "unavailable";
  }
}

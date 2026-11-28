/**
 * Report a Problem screenshots — the client half of sql/055_report_screenshots.sql.
 *
 * THE RULE: the picture stays on the reader's device unless they tick "Include this screenshot".
 * beginReportScreenshot() renders it into memory at the tap (lib/screenCapture.ts); nothing is
 * uploaded until the report is sent with the box ticked, and the box starts unticked.
 *
 * BEFORE sql/055 IS APPLIED nothing here is visible. screenshotsEnabled() asks the database once per
 * page load; the probe function does not exist yet, so the answer is false, the form shows no
 * thumbnail, no upload happens and no report carries `screenshot_path` (a column that would not exist).
 * The capture itself may still run once at the first tap (the answer is not known yet at that
 * instant); its image is then simply dropped. It never leaves the device.
 *
 * Who can see an uploaded screenshot is decided by Storage policies in sql/055, not here: the
 * reporter, and administrators/owner for a screenshot a report points at.
 */
import { supabase } from "./supabase";
import { beginScreenCapture, type PendingCapture } from "./screenCapture";

export const SCREENSHOT_BUCKET = "report-screenshots";
/** Matches the bucket's file_size_limit in sql/055. */
export const SCREENSHOT_MAX_BYTES = 3 * 1024 * 1024;

let enabled: boolean | null = null;
let enabledPromise: Promise<boolean> | null = null;

/** Whether sql/055 is applied. Asked once per page load; any failure means "off". */
export function screenshotsEnabled(): Promise<boolean> {
  if (enabled !== null) return Promise.resolve(enabled);
  if (!enabledPromise) {
    enabledPromise = (async () => {
      try {
        const { data, error } = await supabase.rpc("report_screenshots_enabled");
        enabled = !error && data === true;
      } catch {
        enabled = false;
      }
      return enabled;
    })();
  }
  return enabledPromise;
}

/** Call from the tap that opens Report a Problem, BEFORE the sheet opens. Returns null when
 * screenshots are known to be off, so no work is done at all. */
export function beginReportScreenshot(): PendingCapture | null {
  if (enabled === false) return null;
  void screenshotsEnabled();
  return beginScreenCapture();
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // RFC 4122 v4 from getRandomValues, for engines without randomUUID (iOS < 15.4).
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Uploads the image to `<userId>/<random>.jpg` and returns that path. Never overwrites. */
export async function uploadReportScreenshot(userId: string, blob: Blob): Promise<string> {
  if (blob.size > SCREENSHOT_MAX_BYTES) throw new Error("screenshot_too_large");
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId.toLowerCase()}/${randomId()}.${ext}`;
  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false, cacheControl: "3600" });
  if (error) throw new Error(`screenshot_upload: ${error.message}`);
  return path;
}

/** Best effort: used after a failed send and when the reporter deletes their report. */
export async function removeReportScreenshot(path: string): Promise<void> {
  try {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([path]);
  } catch {
    /* an orphan is listed by report_screenshot_orphans() */
  }
}

/** A short-lived link for the reporter or an administrator. Storage refuses anyone else. */
export async function screenshotUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(SCREENSHOT_BUCKET).createSignedUrl(path, 600);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "no link");
  return data.signedUrl;
}

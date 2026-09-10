/* ============================================================================
 * Photographs in Sermon Notes — downscaling, upload, and turning a stored path back into
 * something a browser will display.
 *
 * ── THE MOMENT THIS IS BUILT FOR ───────────────────────────────────────────
 * The pastor has put a slide up. It has four lines of text on it and it will be gone in fifteen
 * seconds — far too fast to type. So the reader photographs it. Everything below exists to make
 * that photograph cheap to keep and private to them.
 *
 * ── WHY THE BUCKET IS PRIVATE, WHICH IS THE DECISION THAT MATTERS ──────────
 * The two buckets this app already has — `avatars` and `post-media` — are PUBLIC read. That is
 * correct for a profile picture and defensible for a post, both of which are things a reader is
 * publishing. A sermon note is the opposite: it is a private document, readable only by the
 * account that wrote it (the list query filters on `user_id` and the table's policy enforces it),
 * and a photograph inside one inherits that expectation. A public bucket would not merely leak on
 * a guessed URL; `storage.objects` SELECT policies also govern `list()`, so a policy of
 * `bucket_id = '…'` lets ANY signed-in account enumerate every object under another account's
 * folder and read them. One user reading another's photographs is exactly the failure to design
 * against, so this bucket's read policy matches the owner's id — see
 * sql/027_sermon_note_images.sql — and display goes through a signed URL minted for that session.
 *
 * ── WHY EVERY IMAGE IS RE-ENCODED BEFORE IT LEAVES THE DEVICE ──────────────
 * A modern phone photograph is 2–5 MB, and none of that detail is doing any work: the subject is a
 * projected slide, four lines of text, read back later on the same phone. Downscaled to 1600px on
 * the long edge and re-encoded as JPEG it lands around 200–350 KB — roughly a tenth of the storage
 * and a tenth of the egress, on the one line item in this app's costs that has no natural ceiling.
 * It is also the difference between an upload that finishes during the sermon and one that does
 * not. This is not an optimisation to do later; uncapped is a decision too, and a worse one.
 * ==========================================================================*/

import { supabase } from "./supabase";
import { IMAGE_CLASS, IMAGE_PATH_ATTR, isNoteImagePath } from "./richText";

/** The private bucket these live in. Created by sql/027_sermon_note_images.sql. */
export const NOTE_IMAGE_BUCKET = "sermon-note-images";

/** Longest edge, in pixels, of a stored photograph. 1600 keeps 12–14pt slide text legible when the
 * note is read back at arm's length on a phone and comfortably readable zoomed in on a laptop,
 * which is the whole job. Above this the file grows quadratically and nothing becomes readable
 * that was not readable already. */
const MAX_STORED_EDGE = 1600;

/** Fallback pass for the occasional photograph that is still large at 1600px — a slide shot in a
 * dim room comes back noisy, and noise is what JPEG spends bits on. */
const FALLBACK_EDGE = 1200;
const FALLBACK_QUALITY = 0.7;
const STORED_QUALITY = 0.82;

/** Above this, re-encode again at FALLBACK_EDGE rather than store it. */
const SOFT_SIZE_LIMIT = 1_200_000;

/** A hard stop applied to the file the picker hands back, BEFORE it is decoded. Decoding is what
 * costs memory, and a 100 MB image on a mid-range phone is a tab crash that loses the note. No
 * ordinary phone photograph is anywhere near this; a RAW file or a screen recording renamed .jpg
 * is. */
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

/** How long a display URL is signed for. An hour is far longer than a sitting with a note open,
 * and every fresh open mints new ones, so there is no benefit in a longer window and a real cost
 * to it: a signed URL is a bearer token for that object, and the shorter it lives the less a
 * copied link is worth. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Re-sign a minute early rather than hand out a URL that expires between the assignment and the
 * request. */
const SIGN_EARLY_MS = 60_000;

export class NoteImageError extends Error {}

/** Signed URLs already minted this session, so scrolling a note with six photographs in it does
 * not make six round trips per render. Keyed by path; values carry their own expiry. */
const signedUrls = new Map<string, { url: string; expiresAt: number }>();

/** Decodes a file into a bitmap with its EXIF rotation already applied.
 *
 * `imageOrientation: "from-image"` is the load-bearing part. A phone held upright records the
 * sensor's landscape frame plus an orientation tag, and a canvas draw that ignores the tag stores
 * the slide on its side — permanently, because re-encoding is where the tag is lost. */
async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new NoteImageError("That file could not be read as an image.");
  }
}

/** Draws a bitmap onto a canvas, scaled so its longest edge is at most `maxEdge`. Never enlarges:
 * upscaling a small photograph adds bytes and no information. */
function drawScaled(bitmap: ImageBitmap, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new NoteImageError("This browser could not process the photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new NoteImageError("This browser could not process the photo."))),
      "image/jpeg",
      quality
    );
  });
}

export interface PreparedImage {
  /** What gets uploaded: downscaled, re-encoded, EXIF rotation baked in. */
  blob: Blob;
  /** An object URL for the on-screen preview. The caller MUST revoke it — see releasePreview. */
  previewUrl: string;
  width: number;
  height: number;
}

/**
 * A picked file, ready to be uploaded or read.
 *
 * Everything the rest of the feature does works on the OUTPUT of this function, never on the
 * original file — including OCR, which reads a further-processed copy of the same downscaled
 * bitmap rather than a 12-megapixel frame it would only have to shrink itself.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new NoteImageError("That is not an image file.");
  if (file.size > MAX_SOURCE_BYTES) throw new NoteImageError("That photo is too large to add.");

  const bitmap = await decode(file);
  try {
    let canvas = drawScaled(bitmap, MAX_STORED_EDGE);
    let blob = await toBlob(canvas, STORED_QUALITY);
    if (blob.size > SOFT_SIZE_LIMIT) {
      canvas = drawScaled(bitmap, FALLBACK_EDGE);
      blob = await toBlob(canvas, FALLBACK_QUALITY);
    }
    return { blob, previewUrl: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
  } finally {
    bitmap.close();
  }
}

export function releasePreview(prepared: PreparedImage | null): void {
  if (prepared) URL.revokeObjectURL(prepared.previewUrl);
}

/**
 * Puts a prepared photograph in the bucket and returns the path to store in the note.
 *
 * The path is `<account id>/<random>.jpg`, and the account id being the first folder is not
 * cosmetic — it is the entire access rule. Every policy on this bucket compares
 * `(storage.foldername(name))[1]` with `auth.uid()`, so an object written anywhere else is one
 * nobody can read, and an object written under someone else's id is one the database refuses.
 */
export async function uploadNoteImage(userId: string, prepared: PreparedImage): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  // Checked here rather than trusted, because the shape of this string is what the sanitiser will
  // later hold the note to. A userId that is not a uuid would produce an image that uploads
  // successfully and then silently disappears from the note on the next save.
  if (!isNoteImagePath(path)) throw new NoteImageError("Couldn't save the photo.");
  const { error } = await supabase.storage.from(NOTE_IMAGE_BUCKET).upload(path, prepared.blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new NoteImageError("Couldn't save the photo — you can still add its text.");
  return path;
}

/** Mints (or reuses) a display URL for one stored path. Returns null rather than throwing: a
 * picture that will not load should leave a gap in the note, not take the note down with it. */
async function signedUrlFor(path: string): Promise<string | null> {
  const cached = signedUrls.get(path);
  if (cached && cached.expiresAt - SIGN_EARLY_MS > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(NOTE_IMAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  signedUrls.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 });
  return data.signedUrl;
}

/**
 * Gives every unresolved `sn-image` in a live DOM subtree something to display.
 *
 * This is the other half of the storage format: the note holds a path, and this is where the path
 * becomes a picture. It writes `src` and `alt` DIRECTLY onto the elements, which is safe and
 * deliberate — the sanitiser allows neither attribute, so both are dropped again the moment the
 * note is saved, and the signed URL can never end up in the database where it would expire.
 *
 * "Unresolved" is simply "has no src yet". Nothing else in the app ever sets one, and a freshly
 * mounted editor is always unresolved because its content came through noteBodyToHtml().
 */
export async function resolveNoteImages(root: ParentNode): Promise<void> {
  const pending = [...root.querySelectorAll<HTMLImageElement>(`img.${IMAGE_CLASS}:not([src])`)];
  await Promise.all(
    pending.map(async (img) => {
      const path = img.getAttribute(IMAGE_PATH_ATTR);
      if (!path || !isNoteImagePath(path)) return;
      const url = await signedUrlFor(path);
      if (!url) return;
      // Re-checked after the await: the editor may have been remounted, or the writer may have
      // deleted the image, while the URL was being minted.
      if (!img.isConnected) return;
      img.src = url;
      // The one accessible name available. `alt` is not on the sanitiser's allowlist, so it lives
      // only in the DOM — which is the only place a screen reader is looking anyway.
      img.alt = "Photo added to this note";
    })
  );
}

/**
 * Removes stored objects, best effort.
 *
 * Called when a note is deleted, so a deleted note does not leave its photographs on the bill
 * forever. It is deliberately not the whole story and should not be described as if it were:
 * an image the writer deletes out of a note they keep is orphaned, and nothing here collects it.
 * That wants a server-side sweep against the notes table, which is a migration and therefore
 * Robbie's call — see the note at the end of sql/027_sermon_note_images.sql.
 */
export async function deleteNoteImages(paths: string[]): Promise<void> {
  const safe = paths.filter(isNoteImagePath);
  if (safe.length === 0) return;
  safe.forEach((path) => signedUrls.delete(path));
  await supabase.storage.from(NOTE_IMAGE_BUCKET).remove(safe);
}

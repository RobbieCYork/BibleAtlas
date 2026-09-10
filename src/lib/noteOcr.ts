/* ============================================================================
 * Reading the text off a photographed slide.
 *
 * ── THE DECISION: THIS RUNS ON THE DEVICE, NOT IN A DATA CENTRE ────────────
 * Every recogniser below runs inside the reader's own browser. No photograph leaves the phone for
 * this. Three reasons, in the order they will matter:
 *
 *   COST. A per-image cloud OCR call is priced per image and this feature fires every Sunday, four
 *   or five times a service, for every subscriber who takes notes. At ten thousand subscribers that
 *   is a couple of million calls a year — around $3,000 at the going rate for the cheap tier, on a
 *   line item nobody would notice until the invoice. On-device it is $0, permanently, and it does
 *   not grow with the userbase.
 *
 *   SIGNAL. A church basement, or eight hundred people sharing one cell. The model download is the
 *   only network this needs and it happens once per device; after that the recogniser works with
 *   the aeroplane mode on.
 *
 *   THE PHOTOGRAPH. It is a picture taken inside somebody's church. Not sending it to a third
 *   party is the correct default and costs nothing to hold to.
 *
 * ── WHAT ACTUALLY DOES THE READING ─────────────────────────────────────────
 * 1. The platform's own recogniser, via the Shape Detection API's TextDetector, IF this browser
 *    has one. Where it exists it is free, instant, and better than anything shippable — it is the
 *    same engine behind the phone's own Live Text. It is also non-standard and, in 2026, present
 *    almost nowhere, so it is tried and never relied on.
 * 2. Otherwise Tesseract, compiled to WebAssembly, LOADED ONLY WHEN SOMEBODY ASKS FOR IT. Nothing
 *    in this file is reachable from app startup: the import below is dynamic, so the recogniser
 *    lands in its own chunk and the app's first paint is untouched. What it then fetches is stated
 *    plainly in the constants below, because a feature that quietly pulls megabytes is a feature
 *    that gets blamed for a slow app.
 *
 * ── WHAT IT IS HONESTLY GOOD FOR ───────────────────────────────────────────
 * A projected slide is a hard target: low contrast, keystoned, photographed at an angle in a dark
 * room, often light text on a dark ground. Tesseract will get most of a clean slide and mangle
 * parts of a bad one. That is why the result is inserted as ordinary editable paragraphs rather
 * than as anything that looks authoritative — the writer fixes the two wrong words and moves on,
 * which is still enormously faster than typing four lines in fifteen seconds.
 * ==========================================================================*/

import type { Block, Worker as TesseractWorker } from "tesseract.js";

/* The recogniser's own assets, self-hosted.
 *
 * `?url` hands the file to Vite as a build asset: it is copied into dist/ with a hashed name and
 * what lands in the code is the string. It is NOT bundled into a chunk — the JS below stays small
 * and these are fetched, once, by the worker that needs them.
 *
 * Self-hosted rather than left on tesseract.js's default jsDelivr CDN, for the same reason the OCR
 * itself is local: this should not depend on a third party's uptime on a Sunday morning, and there
 * is no reason for anyone else to see which of this app's readers are photographing slides. */
import simdCoreUrl from "tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url";
import baseCoreUrl from "tesseract.js-core/tesseract-core-lstm.wasm.js?url";
import tesseractWorkerUrl from "tesseract.js/dist/worker.min.js?url";

/** Where public/tessdata/eng.traineddata is served from.
 *
 * Uncompressed on purpose. The recogniser can fetch a `.gz` and unpack it itself, which would save
 * about 2 MB — but only as long as the host does not ALSO advertise the file as gzip-encoded, in
 * which case the browser unpacks it first and the recogniser is handed something it cannot read.
 * That is a failure that would appear on the live site and nowhere else. Serving the plain file
 * cannot go wrong either way, and transport compression, which is transparent, gets most of the
 * saving back regardless of who is hosting. */
const LANG_PATH = `${import.meta.env.BASE_URL}tessdata`;

/** What the first use of this feature costs the reader, so it is written down somewhere:
 *   ~3.9 MB  the WebAssembly core (base64-inlined; ~1.2 MB over the wire once compressed)
 *   ~4.1 MB  the English model (~2 MB over the wire)
 *   ~110 KB  the recogniser's worker script
 * Fetched once per device. The model is then kept in IndexedDB by tesseract.js and the rest is
 * ordinary HTTP cache, so every later use is local. Nothing here is fetched until somebody taps
 * "Add text from image". */

/** WebAssembly SIMD probe — the module from `wasm-feature-detect`, inlined rather than depended on
 * (it is tesseract.js's transitive dependency, not ours, and a four-line check is not worth
 * reaching into someone else's tree for).
 *
 * We choose the core ourselves rather than handing tesseract.js a directory to choose from,
 * because Vite gives every emitted asset a content hash — there is no directory whose filenames it
 * could guess. SIMD is the difference between a slide read in three seconds and one read in eight,
 * and is present in every browser since about 2021; the plain core is here for the iPads that
 * never made it to Safari 16.4. */
const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
]);

function corePath(): string {
  try {
    return WebAssembly.validate(SIMD_PROBE) ? simdCoreUrl : baseCoreUrl;
  } catch {
    return baseCoreUrl;
  }
}

/** Longest edge handed to the recogniser.
 *
 * Larger than the 1600px the STORED copy is downscaled to, and deliberately so: these are
 * different jobs. The stored copy is paid for by the gigabyte-month and only has to be readable;
 * this one is thrown away the instant it has been read, and every pixel of it buys accuracy on the
 * small print at the bottom of a slide. 2400 is where Tesseract stops improving on this kind of
 * subject and starts merely taking longer. */
const OCR_MAX_EDGE = 2400;

/** Below this mean luminance the image is treated as light-text-on-dark and inverted. Projected
 * slides are very often white text on a dark ground, and Tesseract reads dark-on-light far better
 * than the reverse — this one line is worth more accuracy on a real sermon slide than any amount
 * of parameter tuning. 110 sits well below a photograph of a white slide in a dim room (which
 * still comes out around 150–200) and well above a dark slide. */
const INVERT_BELOW_MEAN = 110;

export type OcrStage = "preparing" | "loading" | "reading";

export interface OcrProgress {
  stage: OcrStage;
  /** 0–1 where the recogniser reports it, null where it does not. */
  ratio: number | null;
}

export class OcrCancelled extends Error {}

/** Greyscale, and inverted if the slide was light-on-dark. Returns a canvas, which is what
 * tesseract.js reads fastest — handing it a Blob makes it decode the image a second time. */
async function prepareForOcr(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, OCR_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = frame.data;
    let total = 0;
    for (let i = 0; i < px.length; i += 4) {
      // Rec. 601 luma. Integer weights out of 1000 so this stays in the integer fast path — it runs
      // over five million pixels on a phone.
      const luma = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
      px[i] = px[i + 1] = px[i + 2] = luma;
      total += luma;
    }
    const mean = total / (px.length / 4);
    if (mean < INVERT_BELOW_MEAN) {
      for (let i = 0; i < px.length; i += 4) {
        px[i] = px[i + 1] = px[i + 2] = 255 - px[i];
      }
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}

/** Below this line confidence (0–100) a line is treated as something the camera saw rather than
 * something the slide said, and dropped.
 *
 * Measured, not guessed. On a real photograph of a church noticeboard — light lettering on a dark
 * board, foliage and a car park around it — Tesseract returned the five lines of actual text at
 * 59, 65, 69, 79, 80 and 89, and thirteen lines of hedge, frame and unreadable posters at 45 and
 * below. There is a clean gap, and 55 sits in it.
 *
 * The trade is deliberate and it goes this way round: a line the recogniser is unsure of is
 * usually wrong, and a wrong line in somebody's sermon notes is worse than a missing one — they
 * still have the photograph, and they were sitting there when it was said. */
const MIN_LINE_CONFIDENCE = 55;

/** Frame, edge and shadow read as punctuation, and it clings to the start and end of otherwise
 * perfect lines: `| For details of Sunday…`, `_ Rector: Revd. …`. Stripping leading and trailing
 * tokens that contain no letter or digit at all removes those and cannot touch real content —
 * a numbered slide point ("1.") keeps its digit and survives. */
function trimEdgeNoise(line: string): string {
  const words = line.split(" ");
  while (words.length && !/[\p{L}\p{N}]/u.test(words[0])) words.shift();
  while (words.length && !/[\p{L}\p{N}]/u.test(words[words.length - 1])) words.pop();
  return words.join(" ");
}

/** Tidies what a recogniser hands back into something that reads like a note.
 *
 * OCR of a slide produces a line per line of the slide, plus stray marks read as text from the
 * screen's edges, the room and the speaker's head. A line with no letter in it is one of those and
 * is dropped; a lone character is too. Nothing beyond that is second-guessed — a misread WORD is
 * left exactly as it came, because the writer can see the slide and this cannot, and a plausible
 * correction of the wrong word is far more damaging in a sermon note than an obvious mistake. */
function tidy(raw: string): string {
  return raw
    .split(/\r\n|\r|\n/)
    .map((line) => trimEdgeNoise(line.replace(/\s+/g, " ").trim()))
    .filter((line) => line.length > 1 && /\p{L}/u.test(line))
    .join("\n")
    .trim();
}

/** The lines Tesseract was confident about, joined back into text — or null if this build did not
 * return the structure, in which case the caller falls back to the flat `text` and keeps working. */
function confidentLines(blocks: Block[] | null | undefined): string | null {
  if (!blocks) return null;
  const kept: string[] = [];
  blocks.forEach((block) =>
    (block.paragraphs ?? []).forEach((para) =>
      (para.lines ?? []).forEach((line) => {
        if (line.confidence >= MIN_LINE_CONFIDENCE) kept.push(line.text);
      })
    )
  );
  // Nothing cleared the bar. Better to hand back the unfiltered text and let the writer judge it
  // than to tell somebody looking at a slide covered in words that there were none.
  return kept.length === 0 ? null : kept.join("\n");
}

/** The platform's own recogniser, where one exists. */
async function detectNatively(canvas: HTMLCanvasElement): Promise<string | null> {
  const Detector = (window as unknown as { TextDetector?: new () => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } })
    .TextDetector;
  if (typeof Detector !== "function") return null;
  try {
    const found = await new Detector().detect(canvas);
    return tidy(found.map((block) => block.rawValue).join("\n"));
  } catch {
    // Present but unable — some builds expose the constructor and reject on use. Fall through.
    return null;
  }
}

/**
 * Reads whatever text is in `file` and returns it, or "" if there was none to find.
 *
 * `onProgress` is called often enough to drive a bar: the first run on a device spends most of its
 * time downloading the model, and a spinner with no numbers on it during a thirty-second download
 * on church wifi is how a reader concludes the app has hung.
 *
 * `signal` aborts. The reader in the pew has a second option — "Add image" — sitting right next to
 * this one, and the moment they lose patience with the recogniser they should be able to take it.
 * Aborting terminates the worker, so a cancelled read stops costing the phone anything.
 */
export async function extractTextFromImage(
  file: Blob,
  onProgress: (progress: OcrProgress) => void,
  signal?: AbortSignal
): Promise<string> {
  const stop = () => {
    if (signal?.aborted) throw new OcrCancelled();
  };

  stop();
  onProgress({ stage: "preparing", ratio: null });
  const canvas = await prepareForOcr(file);
  stop();

  const native = await detectNatively(canvas);
  // An empty result from the native detector is treated as "this detector could not", not as "there
  // is no text here". The reader tapped a button that says "Add text from image"; they can see the
  // slide and we cannot, and being told there is no text on a slide covered in text is worse than
  // the download.
  if (native) return native;
  stop();

  onProgress({ stage: "loading", ratio: 0 });
  const { createWorker } = await import("tesseract.js");
  stop();

  let worker: TesseractWorker | null = null;
  const abort = () => {
    void worker?.terminate();
  };
  signal?.addEventListener("abort", abort);
  try {
    worker = await createWorker("eng", 1, {
      corePath: corePath(),
      workerPath: tesseractWorkerUrl,
      langPath: LANG_PATH,
      // The model is served as a plain .traineddata, not a .gz — see LANG_PATH.
      gzip: false,
      logger: (m: { status: string; progress: number }) => {
        const ratio = typeof m.progress === "number" ? m.progress : null;
        onProgress({ stage: m.status === "recognizing text" ? "reading" : "loading", ratio });
      },
    });
    stop();
    onProgress({ stage: "reading", ratio: 0 });
    // `blocks` is asked for so the per-line confidences below are available. It is not the default
    // output and costs nothing extra to produce — the recogniser already has them.
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    stop();
    return tidy(confidentLines(data.blocks) ?? data.text ?? "");
  } catch (err) {
    if (signal?.aborted) throw new OcrCancelled();
    throw err;
  } finally {
    signal?.removeEventListener("abort", abort);
    // Always, on every path. A live Tesseract worker holds the model in memory and a Web Worker
    // open; leaking one per photograph would have a note-taker's phone crawling by the sermon's
    // end. Terminating a worker that the abort handler already terminated is a no-op that can
    // reject, hence the catch.
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        /* already gone */
      }
    }
  }
}

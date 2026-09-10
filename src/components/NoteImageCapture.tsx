import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import {
  NoteImageError,
  prepareImage,
  releasePreview,
  uploadNoteImage,
  type PreparedImage,
} from "../lib/noteImages";
import { OcrCancelled, extractTextFromImage, type OcrProgress } from "../lib/noteOcr";

interface NoteImageCaptureProps {
  /** The photograph the reader just took or picked. Prepared on mount; never used raw. */
  file: File;
  userId: string;
  /** Hands back the text read off the picture, as the writer's own words. */
  onInsertText: (text: string) => void;
  /** Hands back the storage path of the uploaded picture. */
  onInsertImage: (path: string) => void;
  onCancel: () => void;
}

type Phase = "preparing" | "ready" | "reading" | "uploading";

function progressLabel({ stage, ratio }: OcrProgress): string {
  const pct = ratio === null ? null : `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
  if (stage === "preparing") return "Preparing the photo…";
  // Named for what it IS, because the first time this runs on a device it is a multi-megabyte
  // download on church wifi and "Reading…" sitting there for thirty seconds looks like a hang.
  if (stage === "loading") return pct ? `Getting the text reader ready… ${pct}` : "Getting the text reader ready…";
  return pct ? `Reading the text… ${pct}` : "Reading the text…";
}

/* ============================================================================
 * The panel under the note, after a photograph has been taken.
 *
 * ── THE MOMENT ─────────────────────────────────────────────────────────────
 * A slide has gone up with four lines on it. It will be gone in fifteen seconds and there is no
 * chance of typing it. So: tap "Add photo", the phone's own sheet offers Camera or Library, take
 * the shot — and land here, on two buttons.
 *
 *   "Add text from image"  reads the slide and types it into the note as ordinary paragraphs.
 *   "Add image"            keeps the picture itself.
 *
 * That is the whole interface, because there is nothing else worth asking somebody in a pew. No
 * crop, no rotate, no filename, no confirm step. If the text comes back wrong they fix it in the
 * note like any other typo, which they can do afterwards, which is the point.
 *
 * ── WHY IT IS NOT A MODAL ──────────────────────────────────────────────────
 * Same reason as the Insert Scripture panel it sits beside, and the reason is worth restating: it
 * expands in FLOW between the notes box and the footer, so the half-finished sentence is still on
 * screen and the caret is still in it. A sheet over the note would hide the thing they were
 * writing and then have to put the caret back afterwards, which is where insertion bugs live.
 * Nothing here touches the note until one of the two buttons is pressed.
 *
 * ── WHAT HAPPENS WHEN SOMETHING FAILS ──────────────────────────────────────
 * Both paths are independent and either can fail without taking the other with it. The recogniser
 * needs a large one-time download and might be slow or find nothing; the upload needs a storage
 * bucket that may not exist yet. In every one of those cases the panel STAYS OPEN with the other
 * button still live, and the note is untouched. The one thing this must never do is eat somebody's
 * photograph and their place in the sermon at the same time.
 * ==========================================================================*/
export default function NoteImageCapture({ file, userId, onInsertText, onInsertImage, onCancel }: NoteImageCaptureProps) {
  const [phase, setPhase] = useState<Phase>("preparing");
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [progress, setProgress] = useState<OcrProgress>({ stage: "preparing", ratio: null });
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** The prepared image, for the unmount cleanup — reading it out of state in an effect that must
   * not re-run on every change would either capture a stale value or revoke a live object URL. */
  const preparedRef = useRef<PreparedImage | null>(null);

  useEffect(() => {
    let live = true;
    setPhase("preparing");
    setMessage(null);
    prepareImage(file)
      .then((result) => {
        if (!live) {
          // Prepared after the panel closed: revoke immediately rather than leaking the object URL.
          releasePreview(result);
          return;
        }
        preparedRef.current = result;
        setPrepared(result);
        setPhase("ready");
      })
      .catch((err) => {
        if (!live) return;
        setMessage(err instanceof NoteImageError ? err.message : "That photo could not be read.");
        setPhase("ready");
      });
    return () => {
      live = false;
    };
  }, [file]);

  // Unmount only. Aborts a recogniser still running and releases the preview.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      releasePreview(preparedRef.current);
      preparedRef.current = null;
    },
    []
  );

  const busy = phase === "reading" || phase === "uploading";

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancel]);

  const readText = async () => {
    if (busy) return;
    setMessage(null);
    setPhase("reading");
    setProgress({ stage: "preparing", ratio: null });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // The ORIGINAL file, not the downscaled copy: the stored version is shrunk to keep the
      // storage bill down, and those lost pixels are exactly the ones the recogniser wants.
      const text = await extractTextFromImage(file, setProgress, controller.signal);
      if (controller.signal.aborted) return;
      if (!text) {
        setMessage("No text could be read from that photo. You can still add the picture.");
        setPhase("ready");
        return;
      }
      onInsertText(text);
    } catch (err) {
      if (err instanceof OcrCancelled || controller.signal.aborted) return;
      setMessage("The text couldn't be read. You can still add the picture.");
      setPhase("ready");
    } finally {
      abortRef.current = null;
    }
  };

  const addImage = async () => {
    if (busy || !prepared) return;
    setMessage(null);
    setPhase("uploading");
    try {
      const path = await uploadNoteImage(userId, prepared);
      onInsertImage(path);
    } catch (err) {
      setMessage(err instanceof NoteImageError ? err.message : "Couldn't save the photo — you can still add its text.");
      setPhase("ready");
    }
  };

  const stopReading = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("ready");
    setMessage(null);
  };

  return (
    <div className="note-image-panel no-print" role="group" aria-label="Add this photo to your note">
      <div className="note-image-panel-head">
        {prepared ? (
          <img className="note-image-thumb" src={prepared.previewUrl} alt="" />
        ) : (
          <div className="note-image-thumb note-image-thumb-empty" aria-hidden="true" />
        )}
        <div className="note-image-actions">
          <button
            type="button"
            className="note-image-primary"
            onClick={readText}
            disabled={busy || phase === "preparing"}
          >
            <Icon name="doc" inline />
            Add text from image
          </button>
          <button type="button" onClick={addImage} disabled={busy || !prepared}>
            <Icon name="image" inline />
            Add image
          </button>
        </div>
      </div>

      {phase === "reading" && (
        <p className="note-image-status" role="status">
          {progressLabel(progress)}{" "}
          <button type="button" className="note-image-link" onClick={stopReading}>
            Stop
          </button>
        </p>
      )}
      {phase === "uploading" && (
        <p className="note-image-status" role="status">
          Saving the photo…
        </p>
      )}
      {message && (
        <p className="note-image-status note-image-status-warn" role="status">
          {message}
        </p>
      )}

      <div className="note-image-panel-foot">
        <button type="button" onClick={cancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

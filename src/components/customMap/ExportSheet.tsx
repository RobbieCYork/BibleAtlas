import { useEffect, useRef, useState } from "react";
import { canShareFiles, downloadFile, shareFiles } from "../../lib/customMap/deliver";
import { makePdf, makePictures, type ExportItem } from "../../lib/customMap/export";
import { slideTitle } from "../../lib/customMap/draw";
import type { Project } from "../../lib/customMap/project";
import Sheet from "./Sheet";

/** Save as PDF or as 16:9 pictures. Files are made first; a second tap hands them over. */
export default function ExportSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const currentIndex = Math.max(0, project.slides.findIndex((s) => s.id === project.current));
  const usable: ExportItem[] = project.slides
    .map((slide, index) => ({ slide, index }))
    .filter((i) => i.slide.places.length > 0);
  const current = usable.find((i) => i.index === currentIndex);
  const [scope, setScope] = useState<"all" | "one">(project.slides.length > 1 || !current ? "all" : "one");
  const [maps, setMaps] = useState(true);
  const [quiz, setQuiz] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const items = scope === "one" && current ? [current] : usable;
  const skipped = scope === "all" ? project.slides.length - usable.length : 0;
  const busy = progress !== null;

  const run = async (make: (signal: AbortSignal) => Promise<File[]>) => {
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setFiles([]);
    setProgress("Preparing…");
    try {
      const made = await make(controller.signal);
      if (!controller.signal.aborted) setFiles(made);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "That couldn't be saved.");
    } finally {
      if (!controller.signal.aborted) setProgress(null);
    }
  };
  const reset = () => {
    setFiles([]);
    setError(null);
  };
  const share = files.length > 0 && canShareFiles(files);

  return (
    <Sheet title="Save your map" onClose={onClose}>
      {usable.length === 0 ? (
        <p className="cm-notice">Add a place to a slide first.</p>
      ) : (
        <>
          {project.slides.length > 1 && (
            <fieldset className="cm-group" disabled={busy}>
              <legend>Which slides</legend>
              <label className="cm-check">
                <input type="radio" name="cm-scope" checked={scope === "all" || !current} onChange={() => (setScope("all"), reset())} />
                <span>All slides with places ({usable.length})</span>
              </label>
              <label className="cm-check">
                <input
                  type="radio"
                  name="cm-scope"
                  disabled={!current}
                  checked={scope === "one" && !!current}
                  onChange={() => (setScope("one"), reset())}
                />
                <span>
                  This slide only
                  {current ? `: ${slideTitle(current.slide, current.index)}` : " (it has no places yet)"}
                </span>
              </label>
              {skipped > 0 && <p className="cm-hint">{skipped} empty slide{skipped === 1 ? " is" : "s are"} left out.</p>}
            </fieldset>
          )}
          <fieldset className="cm-group" disabled={busy}>
            <legend>PDF</legend>
            <label className="cm-check">
              <input type="checkbox" checked={maps} onChange={() => (setMaps(!maps), reset())} />
              <span>Maps, one landscape page per slide</span>
            </label>
            <label className="cm-check">
              <input type="checkbox" checked={quiz} onChange={() => (setQuiz(!quiz), reset())} />
              <span>Quiz handout: a student page with blank numbered pins, and an answer key</span>
            </label>
            <button
              type="button"
              className="cm-button cm-button-primary"
              disabled={!maps && !quiz}
              onClick={() => void run(async (signal) => [await makePdf(items, { slides: maps, quiz }, setProgress, signal)])}
            >
              Save as PDF
            </button>
          </fieldset>
          <fieldset className="cm-group" disabled={busy}>
            <legend>Pictures</legend>
            <p className="cm-hint">16:9 PNG, for PowerPoint, Keynote or ProPresenter.</p>
            <button type="button" className="cm-button" onClick={() => void run((signal) => makePictures(items, setProgress, signal))}>
              Make {items.length === 1 ? "picture" : `${items.length} pictures`}
            </button>
          </fieldset>
        </>
      )}
      <div aria-live="polite">
        {busy && <p className="cm-notice">{progress} Keep this screen open.</p>}
        {error && <p className="cm-error" role="alert">{error}</p>}
        {files.length > 0 && (
          <div className="cm-ready">
            <p>
              <strong>Ready.</strong> {files.length === 1 ? files[0].name : `${files.length} pictures`}
            </p>
            {share ? (
              <button
                type="button"
                className="cm-button cm-button-primary"
                onClick={() => void shareFiles(files).catch((err: Error) => setError(err.message))}
              >
                Share or save to Files
              </button>
            ) : (
              <>
                {files.map((file) => (
                  <button key={file.name} type="button" className="cm-button cm-button-primary" onClick={() => downloadFile(file)}>
                    Download {file.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

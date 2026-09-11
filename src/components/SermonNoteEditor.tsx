import { useEffect, useRef, useState, type ReactNode } from "react";
import BackButton from "./BackButton";
import Icon from "./Icon";
import RichTextEditor, { type RichTextEditorHandle } from "./RichTextEditor";
import ScriptureInsertPicker from "./ScriptureInsertPicker";
import NoteImageCapture from "./NoteImageCapture";
import { track } from "../lib/analytics";
import {
  buildNoteImageHtml,
  buildNoteTextHtml,
  buildScriptureHtml,
  buildStoredBody,
  isHtmlEmpty,
  noteBodyToHtml,
} from "../lib/richText";
import { resolveNoteImages } from "../lib/noteImages";

/* ============================================================================
 * ONE sermon editor, mounted by TWO surfaces.
 *
 * This was the whole of SermonNotesView.tsx's editor screen until Capstone for
 * Churches needed the same thing: a church's staff writing an outline and a
 * member taking notes on it are doing the same activity, on the same body
 * format, and they must not drift into two implementations. Rich text, Insert
 * Scripture and photo/OCR were each written once; extracting this is what keeps
 * them written once.
 *
 * What it owns: the four fields, the 800ms debounced autosave, the "Saving…/
 * Saved" state, the Insert Scripture panel, the photograph capture flow, and
 * the delete confirmation. What it does NOT own is where any of that is stored.
 * `onSave` is injected, and the two callers write to two different tables:
 *
 *   SermonNotesView  -> sermon_notes,   the reader's own private note
 *   ChurchPanel      -> church_sermons, the church's outline
 *
 * That split is deliberate and it is load-bearing. Sharing the editor is what
 * keeps the feature coherent; sharing the TABLE would have meant widening the
 * SELECT policy on the table holding every user's private notes to "…or a
 * church published it and you're a member", permanently, to save one table.
 * See sql/033's header.
 *
 * THE BODY IS OPAQUE HERE. What is stored is either legacy plain text or
 * sanitised HTML behind a sentinel prefix; lib/richText.ts owns that format and
 * nothing in this file touches the markup directly. It converts at the two
 * boundaries — noteBodyToHtml on the way in, buildStoredBody on the way out —
 * and treats the stored string as opaque in between.
 * ========================================================================== */

export interface SermonEditorDraft {
  title: string;
  speaker: string;
  scriptureRef: string;
  /** The STORED body — buildStoredBody() has already run. Not editor HTML. */
  body: string;
}

interface SermonNoteEditorProps {
  /** Whose storage folder a photograph goes into. Always the signed-in reader,
   * even when the document being edited belongs to a church: a picture taken in
   * a service is taken by a person. */
  userId: string;

  initialTitle?: string;
  initialSpeaker?: string;
  initialScriptureRef?: string;
  /** The STORED body of the document being opened (plain text or rich), not
   * editor HTML. */
  initialBody?: string;

  /** Bumped by the parent every time a DIFFERENT document is loaded, and used as
   * the whole editor's React key by the parent OR as the inner editor's key
   * here. The rich-text editor is uncontrolled — it owns its own DOM so the
   * caret survives typing — so a remount is the only way to load different
   * content into it. */
  sessionKey: number;

  /** True for a document that has never been written to the database. Flips to
   * false internally after the first successful save, so the parent does not
   * have to signal back mid-sentence. */
  startsUnsaved: boolean;

  /**
   * Persists the draft. Called at most once per 800ms of quiet, with `isNew`
   * telling the caller whether this is the first write (insert) or a later one
   * (update). Return true if it was stored; returning false leaves the editor
   * marked new so the next keystroke retries the insert rather than issuing an
   * update against a row that does not exist.
   */
  onSave: (draft: SermonEditorDraft, isNew: boolean) => Promise<boolean>;

  onBack: () => void;
  backLabel?: string;

  /** Shown in the title input when it is empty, and used as the saved title when
   * the writer never typed one. */
  titlePlaceholder: string;
  bodyPlaceholder?: string;
  bodyAriaLabel?: string;
  speakerPlaceholder?: string;
  scripturePlaceholder?: string;

  /** Absent means the document cannot be deleted from here (a brand-new one, or
   * a surface where deletion is someone else's call). Receives the CURRENT
   * stored body, read out of the live editor rather than the last saved row, so
   * a photograph added seconds ago — before the autosave landed — is not left in
   * the bucket with nothing pointing at it. */
  onDelete?: (currentBody: string) => void | Promise<void>;
  deletePrompt?: string;
  deleteLabel?: string;

  /** Fields this surface adds — the church's service date and series. Rendered
   * between the meta row and the body. */
  extraFields?: ReactNode;
  /** Above the title. Provenance on a forked note; draft/published state on a
   * church outline. */
  banner?: ReactNode;
  /** Beside the save status in the top toolbar — the church's Publish control. */
  toolbarExtra?: ReactNode;
  /** Extra buttons in the footer's left-hand group, beside Insert Scripture. */
  footerExtra?: ReactNode;
}

export default function SermonNoteEditor({
  userId,
  initialTitle = "",
  initialSpeaker = "",
  initialScriptureRef = "",
  initialBody = "",
  sessionKey,
  startsUnsaved,
  onSave,
  onBack,
  backLabel = "Back to list",
  titlePlaceholder,
  bodyPlaceholder = "Start typing your notes…",
  bodyAriaLabel = "Sermon note body",
  speakerPlaceholder = "Speaker (optional)",
  scripturePlaceholder = "Scripture reference (optional)",
  onDelete,
  deletePrompt = "Delete this sermon note?",
  deleteLabel = "Delete",
  extraFields,
  banner,
  toolbarExtra,
  footerExtra,
}: SermonNoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [speaker, setSpeaker] = useState(initialSpeaker);
  const [scriptureRef, setScriptureRef] = useState(initialScriptureRef);
  /** The editor's live HTML, NOT the stored body. Converted to the stored form
   * only when saving, so sanitisation runs once per save rather than once per
   * keystroke. */
  const [bodyHtml, setBodyHtml] = useState(() => noteBodyToHtml(initialBody));
  /** False until the writer actually changes something. Merely OPENING a
   * document used to fire the autosave effect and rewrite the row — harmless
   * when body was plain text, but with a rich body it would silently convert
   * every note just for being looked at. Nothing is written until something is
   * typed. */
  const [dirty, setDirty] = useState(false);
  const [persisted, setPersisted] = useState(!startsUnsaved);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** Whether the Insert Scripture panel is expanded. It sits BETWEEN the notes
   * box and the footer rather than over them, so opening it never hides the
   * sentence being written and closing it never has to restore anything. */
  const [insertingScripture, setInsertingScripture] = useState(false);
  /** The photograph just taken or picked, waiting for the writer to say what to
   * do with it. Null when the capture panel is closed. */
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  const photoInput = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The editor's insert-at-the-caret handle. The editor is uncontrolled on
   * purpose — writing to it through state would put the caret back at the start
   * on every keystroke — so a passage reaches it through this rather than
   * through `bodyHtml`. */
  const editorApi = useRef<RichTextEditorHandle | null>(null);
  /** Held in a ref so the debounced save always calls the CURRENT closure. The
   * parent's onSave usually closes over an id that only exists after the first
   * insert; without this, the second save would run the first render's version
   * and insert a duplicate. */
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const isBlank = !title.trim() && !speaker.trim() && !scriptureRef.trim() && isHtmlEmpty(bodyHtml);

  /** Debounced autosave — inserts on the first non-trivial edit to a brand-new
   * document (so opening "+ New" and immediately backing out never creates a
   * stray empty row), then updates in place. */
  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (isBlank && !persisted) return;
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const draft: SermonEditorDraft = {
        title: title.trim() || titlePlaceholder,
        speaker: speaker.trim(),
        scriptureRef: scriptureRef.trim(),
        body: buildStoredBody(bodyHtml),
      };
      const wasNew = !persisted;
      const ok = await onSaveRef.current(draft, wasNew);
      if (ok) {
        if (wasNew) setPersisted(true);
        setSaveStatus("saved");
      } else {
        // Deliberately back to "idle" and NOT to an error banner. The parent
        // surfaces the reason (it is the one that knows what the database said);
        // what this editor must not do is claim "Saved" over a write that did
        // not happen.
        setSaveStatus("idle");
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, speaker, scriptureRef, bodyHtml, dirty]);

  const handleBack = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    onBack();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    await onDelete(buildStoredBody(bodyHtml));
  };

  /** One tap from the footer button to the phone's own Camera-or-Library sheet.
   *
   * `accept="image/*"` with NO `capture` attribute is what produces that sheet.
   * Adding `capture="environment"` would force the camera and remove the
   * library, which is wrong for the writer who took the picture with their
   * normal camera app first, or who is writing the note up on the way home. */
  const handlePhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    // Cleared immediately so picking the SAME file twice still fires a change event.
    e.target.value = "";
    if (!file) return;
    setInsertingScripture(false);
    setPendingPhoto(file);
  };

  return (
    <div className="sermon-notes-editor">
      <div className="sermon-notes-editor-toolbar">
        <BackButton onClick={handleBack} ariaLabel={backLabel} />
        <span className="sermon-notes-save-status">
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
        </span>
        {toolbarExtra}
      </div>

      {banner}

      <input
        type="text"
        className="sermon-notes-title-input"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        placeholder={titlePlaceholder}
      />
      <div className="sermon-notes-meta-row">
        <input
          type="text"
          value={speaker}
          onChange={(e) => {
            setSpeaker(e.target.value);
            setDirty(true);
          }}
          placeholder={speakerPlaceholder}
        />
        <input
          type="text"
          value={scriptureRef}
          onChange={(e) => {
            setScriptureRef(e.target.value);
            setDirty(true);
          }}
          placeholder={scripturePlaceholder}
        />
      </div>

      {extraFields}

      <RichTextEditor
        key={sessionKey}
        initialHtml={bodyHtml}
        onChange={(html) => {
          setBodyHtml(html);
          setDirty(true);
        }}
        placeholder={bodyPlaceholder}
        ariaLabel={bodyAriaLabel}
        apiRef={editorApi}
        // Photographs are stored as a path, not a URL (see IMAGE_CLASS in
        // lib/richText.ts), so something has to turn each one into a signed URL
        // before it can be displayed. Runs after the document is loaded and
        // after every insert. Not awaited: an image that is slow to sign should
        // not hold up the editor, and one that cannot be signed leaves a gap
        // rather than an error.
        onContentMounted={(root) => void resolveNoteImages(root)}
      />

      {insertingScripture && (
        <ScriptureInsertPicker
          onCancel={() => setInsertingScripture(false)}
          onInsert={(reference, passage) => {
            setInsertingScripture(false);
            // The markup is built and sanitised in lib/richText.ts and inserted
            // at the caret by the editor itself. Nothing in this file assembles
            // HTML, and nothing here writes the body — the editor reports the
            // result back through onChange like any other edit, which is what
            // marks it dirty and starts the autosave.
            editorApi.current?.insertHtml(buildScriptureHtml(reference, passage));
            track("sermon_note.insert_scripture");
          }}
        />
      )}

      {pendingPhoto && (
        <NoteImageCapture
          file={pendingPhoto}
          userId={userId}
          onCancel={() => setPendingPhoto(null)}
          onInsertText={(text) => {
            setPendingPhoto(null);
            editorApi.current?.insertHtml(buildNoteTextHtml(text));
            setDirty(true);
            track("sermon_note.insert_image_text");
          }}
          onInsertImage={(path) => {
            setPendingPhoto(null);
            editorApi.current?.insertHtml(buildNoteImageHtml(path));
            setDirty(true);
            track("sermon_note.insert_image");
          }}
        />
      )}

      {/* Robbie's layout: Insert Scripture bottom left, Delete over on the
          right. The row is rendered even for an unsaved document (which has
          nothing to delete yet) so the Insert button does not jump across the
          screen the moment the first autosave lands. */}
      <div className="sermon-notes-footer">
        {/* Grouped, so `space-between` on the row puts the pair on the left and
            Delete on the right rather than spreading three items evenly. */}
        <div className="sermon-notes-insert-group">
          <button
            type="button"
            className="sermon-notes-insert-scripture"
            onClick={() => setInsertingScripture((open) => !open)}
            aria-expanded={insertingScripture}
          >
            <Icon name="bible" inline />
            Insert Scripture
          </button>
          <button
            type="button"
            className="sermon-notes-insert-scripture"
            onClick={() => photoInput.current?.click()}
          >
            <Icon name="camera" inline />
            Add photo
          </button>
          {/* Hidden and driven by the button above, so the whole thing is ONE
              tap from the note to the phone's Camera-or-Library sheet — a slide
              is up for about fifteen seconds and every extra screen in between
              is a slide missed. */}
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoPicked}
            aria-hidden="true"
            tabIndex={-1}
          />
          {footerExtra}
        </div>
        {onDelete && persisted && (
          <div className="sermon-notes-danger-zone">
            {confirmingDelete ? (
              <>
                <span>{deletePrompt}</span>
                <button type="button" className="friends-decline" onClick={handleDelete}>
                  Yes, delete
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="friends-decline" onClick={() => setConfirmingDelete(true)}>
                {deleteLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

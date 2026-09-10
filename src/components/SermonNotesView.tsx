import { useEffect, useRef, useState } from "react";
import { supabase, type SermonNote } from "../lib/supabase";
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
  noteBodyToPlainText,
  noteImagePaths,
} from "../lib/richText";
import { deleteNoteImages, resolveNoteImages } from "../lib/noteImages";

interface SermonNotesViewProps {
  userId: string | null | undefined;
  /** Free-text filter from the header search bar, shared with the My Notes tab. Matched against the
   * title, speaker, reference and the note's PLAIN-TEXT projection — see noteBodyToPlainText — so a
   * word that only appears inside `<b>…</b>` is still found. */
  searchQuery?: string;
}

type Screen = "list" | "editor";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function defaultTitle(): string {
  return `Sermon Notes — ${formatDate(new Date().toISOString())}`;
}

function snippet(body: string): string {
  const trimmed = noteBodyToPlainText(body).trim().replace(/\s+/g, " ");
  if (trimmed) return trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed;
  // A note can be nothing but photographed slides, and an image has no words — so the plain-text
  // projection is honestly empty and this row would otherwise read as a blank note. The count goes
  // in the list only; noteBodyToPlainText is left alone, because it also feeds search, and a note
  // should not become findable under a word its writer never typed.
  const images = noteImagePaths(body).length;
  if (images === 0) return "";
  return images === 1 ? "1 photo" : `${images} photos`;
}

/** Sermon Notes are standalone saved documents (one per sermon), unlike My Notes which anchor to a
 * specific verse — so this is its own list-then-editor flow rather than living inline with verses.
 *
 * The body is rich text. What is stored in `sermon_notes.body` is either legacy plain text or
 * sanitised HTML behind a sentinel prefix; lib/richText.ts owns that format, and NOTHING in this
 * file touches the markup directly — it converts at the two boundaries (noteBodyToHtml on the way
 * in, buildStoredBody on the way out) and treats the stored string as opaque in between. */
export default function SermonNotesView({ userId, searchQuery }: SermonNotesViewProps) {
  const [screen, setScreen] = useState<Screen>("list");
  const [entries, setEntries] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(false);
  /** null while editing a brand-new, not-yet-saved entry; set once the first autosave completes. */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  /** The editor's live HTML, NOT the stored body. Converted to the stored form only when saving,
   * so sanitisation runs once per save rather than once per keystroke. */
  const [bodyHtml, setBodyHtml] = useState("");
  /** Bumped every time a different document is loaded into the editor, and used as its React key.
   * The editor is uncontrolled (it owns its own DOM so the caret survives typing), so a remount is
   * the only way to load different content into it — and `activeId` cannot serve, because it
   * changes from null to a real id the moment a new note first autosaves, which would remount the
   * editor mid-sentence and throw away the caret. */
  const [editorSession, setEditorSession] = useState(0);
  /** False until the reader actually changes something. Merely OPENING a note used to fire the
   * autosave effect and rewrite the row — harmless when body was plain text, but with a rich body
   * it would silently convert every note just for being looked at. Now nothing is written until
   * something is typed. */
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** Whether the Insert Scripture panel is expanded. It sits BETWEEN the notes box and the footer
   * rather than over them, so opening it never hides the sentence being written and closing it
   * never has to restore anything. */
  const [insertingScripture, setInsertingScripture] = useState(false);
  /** The photograph just taken or picked, waiting for the reader to say what to do with it. Null
   * when the capture panel is closed. */
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The editor's insert-at-the-caret handle. The editor is uncontrolled on purpose — writing to it
   * through state would put the caret back at the start on every keystroke — so a passage reaches
   * it through this rather than through `bodyHtml`. */
  const editorApi = useRef<RichTextEditorHandle | null>(null);
  const isNew = activeId === null;

  const fetchEntries = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("sermon_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setEntries((data as SermonNote[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isBlank = !title.trim() && !speaker.trim() && !scriptureRef.trim() && isHtmlEmpty(bodyHtml);

  /** Debounced autosave — inserts on the first non-trivial edit to a brand-new entry (so opening
   * "+ New" and immediately backing out never creates a stray empty row), then updates in place. */
  useEffect(() => {
    if (screen !== "editor") return;
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (isBlank && isNew) return;
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      if (!userId) return;
      const body = buildStoredBody(bodyHtml);
      if (isNew) {
        track("sermon_note.create");
        const { data, error } = await supabase
          .from("sermon_notes")
          .insert({
            user_id: userId,
            title: title.trim() || defaultTitle(),
            speaker: speaker.trim() || null,
            scripture_ref: scriptureRef.trim() || null,
            body,
          })
          .select()
          .single();
        if (!error && data) {
          const saved = data as SermonNote;
          setActiveId(saved.id);
          setEntries((prev) => [saved, ...prev]);
        }
      } else {
        const { data, error } = await supabase
          .from("sermon_notes")
          .update({
            title: title.trim() || defaultTitle(),
            speaker: speaker.trim() || null,
            scripture_ref: scriptureRef.trim() || null,
            body,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeId)
          .select()
          .single();
        if (!error && data) {
          const saved = data as SermonNote;
          setEntries((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
        }
      }
      setSaveStatus("saved");
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, speaker, scriptureRef, bodyHtml, dirty]);

  const openNew = () => {
    setActiveId(null);
    // Left blank (not pre-filled with defaultTitle()) so an untouched new note is genuinely blank —
    // the title input shows the default as a placeholder instead, and save falls back to it via
    // `title.trim() || defaultTitle()`.
    setTitle("");
    setSpeaker("");
    setScriptureRef("");
    setBodyHtml("");
    setEditorSession((n) => n + 1);
    setDirty(false);
    setSaveStatus("idle");
    setConfirmingDelete(false);
    setInsertingScripture(false);
    setPendingPhoto(null);
    setScreen("editor");
  };

  const openEntry = (entry: SermonNote) => {
    setActiveId(entry.id);
    setTitle(entry.title);
    setSpeaker(entry.speaker ?? "");
    setScriptureRef(entry.scripture_ref ?? "");
    // A legacy plain-text body becomes escaped paragraphs here, for display only. It is not written
    // back in the rich format unless the reader actually edits the note.
    setBodyHtml(noteBodyToHtml(entry.body));
    setEditorSession((n) => n + 1);
    setDirty(false);
    setSaveStatus("idle");
    setConfirmingDelete(false);
    setInsertingScripture(false);
    setPendingPhoto(null);
    setScreen("editor");
  };

  const backToList = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setScreen("list");
  };

  const handleDelete = async () => {
    if (!activeId) return;
    // The photographs go with the note. Read out of the CURRENT editor contents rather than the
    // last saved row, so a picture added seconds ago — before the 800ms autosave landed — is not
    // left in the bucket forever with nothing pointing at it. Deliberately not awaited and
    // deliberately unable to fail loudly: the reader asked to delete a note, and a storage hiccup
    // must not turn that into an error message about something they never thought about.
    void deleteNoteImages(noteImagePaths(buildStoredBody(bodyHtml)));
    await supabase.from("sermon_notes").delete().eq("id", activeId);
    setEntries((prev) => prev.filter((e) => e.id !== activeId));
    setScreen("list");
  };

  /** One tap from the footer button to the phone's own Camera-or-Library sheet.
   *
   * `accept="image/*"` with NO `capture` attribute is what produces that sheet. Adding
   * `capture="environment"` would force the camera and remove the library, which is wrong for the
   * reader who took the picture with their normal camera app first, or who is writing the note up
   * on the way home. The OS offers both in one sheet; there is no reason to ask first. */
  const handlePhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    // Cleared immediately so picking the SAME file twice still fires a change event.
    e.target.value = "";
    if (!file) return;
    setInsertingScripture(false);
    setPendingPhoto(file);
  };

  if (!userId) {
    return <p className="bible-status no-print">Log in (or continue as guest) to write sermon notes.</p>;
  }

  if (screen === "list") {
    const trimmedSearch = searchQuery?.trim().toLowerCase() ?? "";
    const visible = trimmedSearch
      ? entries.filter((e) =>
          `${e.title} ${e.speaker ?? ""} ${e.scripture_ref ?? ""} ${noteBodyToPlainText(e.body)}`.toLowerCase().includes(trimmedSearch)
        )
      : entries;
    return (
      <div className="sermon-notes-list-screen">
        <button type="button" className="sermon-notes-new-button" onClick={openNew}>
          + New Sermon Note
        </button>
        {loading && <p className="bible-status">Loading…</p>}
        {!loading && entries.length === 0 && (
          <p className="comment-status">No sermon notes yet — start one above.</p>
        )}
        {!loading && entries.length > 0 && visible.length === 0 && (
          <p className="comment-status">No sermon notes match “{searchQuery?.trim()}”.</p>
        )}
        <ul className="sermon-notes-list">
          {visible.map((e) => {
            const preview = snippet(e.body);
            return (
              <li key={e.id} className="sermon-notes-list-item" onClick={() => openEntry(e)}>
                <span className="sermon-notes-list-title">{e.title}</span>
                <span className="sermon-notes-list-date">{formatDate(e.created_at)}</span>
                {preview && <span className="sermon-notes-list-snippet">{preview}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="sermon-notes-editor">
      <div className="sermon-notes-editor-toolbar">
        <BackButton onClick={backToList} />
        <span className="sermon-notes-save-status">
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
        </span>
      </div>
      <input
        type="text"
        className="sermon-notes-title-input"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        placeholder={defaultTitle()}
      />
      <div className="sermon-notes-meta-row">
        <input
          type="text"
          value={speaker}
          onChange={(e) => {
            setSpeaker(e.target.value);
            setDirty(true);
          }}
          placeholder="Speaker (optional)"
        />
        <input
          type="text"
          value={scriptureRef}
          onChange={(e) => {
            setScriptureRef(e.target.value);
            setDirty(true);
          }}
          placeholder="Scripture reference (optional)"
        />
      </div>
      <RichTextEditor
        key={editorSession}
        initialHtml={bodyHtml}
        onChange={(html) => {
          setBodyHtml(html);
          setDirty(true);
        }}
        placeholder="Start typing your notes…"
        ariaLabel="Sermon note body"
        apiRef={editorApi}
        // Photographs are stored as a path, not a URL (see IMAGE_CLASS in lib/richText.ts), so
        // something has to turn each one into a signed URL before it can be displayed. Runs after
        // the note is loaded and after every insert. Not awaited: an image that is slow to sign
        // should not hold up the editor, and one that cannot be signed leaves a gap rather than an
        // error.
        onContentMounted={(root) => void resolveNoteImages(root)}
      />

      {insertingScripture && (
        <ScriptureInsertPicker
          onCancel={() => setInsertingScripture(false)}
          onInsert={(reference, passage) => {
            setInsertingScripture(false);
            // The markup is built and sanitised in lib/richText.ts and inserted at the caret by the
            // editor itself. Nothing in this file assembles HTML, and nothing here writes the note
            // body — the editor reports the result back through onChange like any other edit, which
            // is what marks it dirty and starts the autosave.
            editorApi.current?.insertHtml(buildScriptureHtml(reference, passage));
            track("sermon_note.insert_scripture");
          }}
        />
      )}

      {pendingPhoto && userId && (
        <NoteImageCapture
          file={pendingPhoto}
          userId={userId}
          onCancel={() => setPendingPhoto(null)}
          onInsertText={(text) => {
            setPendingPhoto(null);
            // Plain paragraphs, built and sanitised in lib/richText.ts and dropped in at the caret
            // by the editor. Exactly the same route a quoted passage takes; nothing in this file
            // assembles markup and nothing here writes the note body.
            editorApi.current?.insertHtml(buildNoteTextHtml(text));
            track("sermon_note.insert_image_text");
          }}
          onInsertImage={(path) => {
            setPendingPhoto(null);
            editorApi.current?.insertHtml(buildNoteImageHtml(path));
            track("sermon_note.insert_image");
          }}
        />
      )}

      {/* Robbie's layout: Insert Scripture bottom left, Delete moved over to the right. The row is
          rendered even for an unsaved note (which has nothing to delete yet) so the Insert button
          does not jump across the screen the moment the first autosave lands. Add photo sits
          beside Insert Scripture: both are "put something in the note that is not typing". */}
      <div className="sermon-notes-footer">
        {/* Grouped, so `space-between` on the row puts the pair on the left and Delete on the right
            rather than spreading three items evenly across the screen. */}
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
        {/* The picker itself. Hidden and driven by the button above, so the whole thing is ONE tap
            from the note to the phone's Camera-or-Library sheet — a slide is up for about fifteen
            seconds and every extra screen in between is a slide missed. */}
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={handlePhotoPicked}
          aria-hidden="true"
          tabIndex={-1}
        />
        </div>
        {!isNew && (
          <div className="sermon-notes-danger-zone">
            {confirmingDelete ? (
              <>
                <span>Delete this sermon note?</span>
                <button type="button" className="friends-decline" onClick={handleDelete}>
                  Yes, delete
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="friends-decline" onClick={() => setConfirmingDelete(true)}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

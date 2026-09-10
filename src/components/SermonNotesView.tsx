import { useEffect, useRef, useState } from "react";
import { supabase, type SermonNote } from "../lib/supabase";
import BackButton from "./BackButton";
import RichTextEditor from "./RichTextEditor";
import { track } from "../lib/analytics";
import { buildStoredBody, isHtmlEmpty, noteBodyToHtml, noteBodyToPlainText } from "../lib/richText";

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
  return trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed;
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setScreen("editor");
  };

  const backToList = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setScreen("list");
  };

  const handleDelete = async () => {
    if (!activeId) return;
    await supabase.from("sermon_notes").delete().eq("id", activeId);
    setEntries((prev) => prev.filter((e) => e.id !== activeId));
    setScreen("list");
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
      />
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
  );
}

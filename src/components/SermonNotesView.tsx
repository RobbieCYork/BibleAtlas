import { useEffect, useRef, useState } from "react";
import { supabase, type SermonNote } from "../lib/supabase";
import BackButton from "./BackButton";

interface SermonNotesViewProps {
  userId: string | null | undefined;
}

type Screen = "list" | "editor";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function defaultTitle(): string {
  return `Sermon Notes — ${formatDate(new Date().toISOString())}`;
}

function snippet(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  return trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed;
}

/** Sermon Notes are standalone saved documents (one per sermon), unlike My Notes which anchor to a
 * specific verse — so this is its own list-then-editor flow rather than living inline with verses. */
export default function SermonNotesView({ userId }: SermonNotesViewProps) {
  const [screen, setScreen] = useState<Screen>("list");
  const [entries, setEntries] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(false);
  /** null while editing a brand-new, not-yet-saved entry; set once the first autosave completes. */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  const [body, setBody] = useState("");
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

  const isBlank = !title.trim() && !speaker.trim() && !scriptureRef.trim() && !body.trim();

  /** Debounced autosave — inserts on the first non-trivial edit to a brand-new entry (so opening
   * "+ New" and immediately backing out never creates a stray empty row), then updates in place. */
  useEffect(() => {
    if (screen !== "editor") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (isBlank && isNew) return;
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      if (!userId) return;
      if (isNew) {
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
  }, [title, speaker, scriptureRef, body]);

  const openNew = () => {
    setActiveId(null);
    // Left blank (not pre-filled with defaultTitle()) so an untouched new note is genuinely blank —
    // the title input shows the default as a placeholder instead, and save falls back to it via
    // `title.trim() || defaultTitle()`.
    setTitle("");
    setSpeaker("");
    setScriptureRef("");
    setBody("");
    setSaveStatus("idle");
    setConfirmingDelete(false);
    setScreen("editor");
  };

  const openEntry = (entry: SermonNote) => {
    setActiveId(entry.id);
    setTitle(entry.title);
    setSpeaker(entry.speaker ?? "");
    setScriptureRef(entry.scripture_ref ?? "");
    setBody(entry.body);
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
    return (
      <div className="sermon-notes-list-screen">
        <button type="button" className="sermon-notes-new-button" onClick={openNew}>
          + New Sermon Note
        </button>
        {loading && <p className="bible-status">Loading…</p>}
        {!loading && entries.length === 0 && (
          <p className="comment-status">No sermon notes yet — start one above.</p>
        )}
        <ul className="sermon-notes-list">
          {entries.map((e) => (
            <li key={e.id} className="sermon-notes-list-item" onClick={() => openEntry(e)}>
              <span className="sermon-notes-list-title">{e.title}</span>
              <span className="sermon-notes-list-date">{formatDate(e.created_at)}</span>
              {e.body.trim() && <span className="sermon-notes-list-snippet">{snippet(e.body)}</span>}
            </li>
          ))}
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
        onChange={(e) => setTitle(e.target.value)}
        placeholder={defaultTitle()}
      />
      <div className="sermon-notes-meta-row">
        <input type="text" value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="Speaker (optional)" />
        <input
          type="text"
          value={scriptureRef}
          onChange={(e) => setScriptureRef(e.target.value)}
          placeholder="Scripture reference (optional)"
        />
      </div>
      <textarea
        className="sermon-notes-body-input"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Start typing your notes…"
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

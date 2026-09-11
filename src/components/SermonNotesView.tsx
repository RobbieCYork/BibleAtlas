import { useEffect, useState } from "react";
import { supabase, type SermonNote } from "../lib/supabase";
import Icon from "./Icon";
import SermonNoteEditor, { type SermonEditorDraft } from "./SermonNoteEditor";
import { track } from "../lib/analytics";
import { noteBodyToPlainText, noteImagePaths } from "../lib/richText";
import { deleteNoteImages } from "../lib/noteImages";

interface SermonNotesViewProps {
  userId: string | null | undefined;
  /** Free-text filter from the header search bar, shared with the My Notes tab. Matched against the
   * title, speaker, reference and the note's PLAIN-TEXT projection — see noteBodyToPlainText — so a
   * word that only appears inside `<b>…</b>` is still found. */
  searchQuery?: string;
  /** Set by ChurchPanel's "Take notes on this": the id of a note that was just forked from a
   * church's outline, so this tab opens straight into it instead of making someone find it in a
   * list. Cleared by the parent once it has been consumed. */
  openNoteId?: string | null;
  onOpenedNote?: () => void;
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

/** "From First Baptist Church — 'The Prodigal Son'", for a note that started life as a church's
 * outline.
 *
 * Read off the SNAPSHOT columns (source_church_name / source_sermon_title), never off a join. That
 * is the whole reason those two columns exist: the attribution has to survive the church deleting
 * the outline, renaming itself, or leaving the platform, and a join cannot survive any of the three.
 * `source_church_sermon_id` going null is exactly what "the original is no longer available" means,
 * and the words beside it do not change when it happens. */
function provenanceLine(note: SermonNote): string | null {
  if (!note.source_church_name && !note.source_sermon_title) return null;
  const from = note.source_church_name ?? "a church";
  const what = note.source_sermon_title ? ` — “${note.source_sermon_title}”` : "";
  return `From ${from}${what}`;
}

/** Sermon Notes are standalone saved documents (one per sermon), unlike My Notes which anchor to a
 * specific verse — so this is its own list-then-editor flow rather than living inline with verses.
 *
 * The editor itself now lives in <SermonNoteEditor>, shared with the church surface — see that
 * file's header for why the component is shared and the table deliberately is not. What is left
 * here is this surface's half: the list, the search filter, and the four calls that read and write
 * `sermon_notes`.
 *
 * NOTHING ABOUT A CHURCH CAN REACH THESE ROWS. sermon_notes' RLS is `auth.uid() = user_id` and
 * sql/033 adds no policy and no grant to it; a note that started as a fork is storage-
 * indistinguishable from one that was typed from scratch, apart from five nullable columns that
 * record where it came from. */
export default function SermonNotesView({ userId, searchQuery, openNoteId, onOpenedNote }: SermonNotesViewProps) {
  const [screen, setScreen] = useState<Screen>("list");
  const [entries, setEntries] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(false);
  /** null while editing a brand-new, not-yet-saved entry; set once the first autosave completes. */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<SermonNote | null>(null);
  /** Bumped every time a different document is loaded into the editor, and used as its React key —
   * the editor owns its own state and its own DOM, so a remount is how a different note is loaded. */
  const [editorSession, setEditorSession] = useState(0);

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

  const openEntry = (entry: SermonNote) => {
    setActiveId(entry.id);
    setActive(entry);
    setEditorSession((n) => n + 1);
    setScreen("editor");
  };

  // A fork lands here: ChurchPanel creates the note through fork_church_sermon() and hands the new
  // id over, and this opens it. Refetches first, because the row was created by a SECURITY DEFINER
  // function and is not in `entries` yet.
  useEffect(() => {
    if (!openNoteId || !userId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("sermon_notes").select("*").eq("id", openNoteId).maybeSingle();
      if (cancelled) return;
      const note = (data as SermonNote | null) ?? null;
      await fetchEntries();
      if (cancelled) return;
      if (note) openEntry(note);
      onOpenedNote?.();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId, userId]);

  const openNew = () => {
    setActiveId(null);
    setActive(null);
    setEditorSession((n) => n + 1);
    setScreen("editor");
  };

  /** The editor's injected save. Inserts on the first call for a new note, then updates in place.
   * Returns false on failure so the editor does not claim "Saved" over a write that did not land. */
  const handleSave = async (draft: SermonEditorDraft, isNew: boolean): Promise<boolean> => {
    if (!userId) return false;
    if (isNew) {
      track("sermon_note.create");
      const { data, error } = await supabase
        .from("sermon_notes")
        .insert({
          user_id: userId,
          title: draft.title,
          speaker: draft.speaker || null,
          scripture_ref: draft.scriptureRef || null,
          body: draft.body,
        })
        .select()
        .single();
      if (error || !data) return false;
      const saved = data as SermonNote;
      setActiveId(saved.id);
      setEntries((prev) => [saved, ...prev]);
      return true;
    }
    const { data, error } = await supabase
      .from("sermon_notes")
      .update({
        title: draft.title,
        speaker: draft.speaker || null,
        scripture_ref: draft.scriptureRef || null,
        body: draft.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeId)
      .select()
      .single();
    if (error || !data) return false;
    const saved = data as SermonNote;
    setEntries((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
    return true;
  };

  const handleDelete = async (currentBody: string) => {
    if (!activeId) return;
    // The photographs go with the note. Read out of the CURRENT editor contents rather than the
    // last saved row, so a picture added seconds ago — before the 800ms autosave landed — is not
    // left in the bucket forever with nothing pointing at it. Deliberately not awaited and
    // deliberately unable to fail loudly: the reader asked to delete a note, and a storage hiccup
    // must not turn that into an error message about something they never thought about.
    void deleteNoteImages(noteImagePaths(currentBody));
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
          `${e.title} ${e.speaker ?? ""} ${e.scripture_ref ?? ""} ${e.source_church_name ?? ""} ${noteBodyToPlainText(e.body)}`
            .toLowerCase()
            .includes(trimmedSearch)
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
            const from = provenanceLine(e);
            return (
              <li key={e.id} className="sermon-notes-list-item" onClick={() => openEntry(e)}>
                <span className="sermon-notes-list-title">{e.title}</span>
                <span className="sermon-notes-list-date">{formatDate(e.created_at)}</span>
                {from && (
                  <span className="sermon-notes-list-source">
                    <Icon name="church" inline /> {from}
                  </span>
                )}
                {preview && <span className="sermon-notes-list-snippet">{preview}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const from = active ? provenanceLine(active) : null;

  return (
    <SermonNoteEditor
      key={editorSession}
      sessionKey={editorSession}
      userId={userId}
      initialTitle={active?.title ?? ""}
      initialSpeaker={active?.speaker ?? ""}
      initialScriptureRef={active?.scripture_ref ?? ""}
      initialBody={active?.body ?? ""}
      startsUnsaved={activeId === null}
      titlePlaceholder={defaultTitle()}
      backLabel="Back to sermon notes"
      onBack={() => setScreen("list")}
      onSave={handleSave}
      onDelete={handleDelete}
      banner={
        from ? (
          <p className="sermon-notes-provenance">
            <Icon name="church" inline /> {from}
            {/* Stated plainly, because it is the promise the whole design rests on. */}
            <span className="sermon-notes-provenance-note">
              This is your copy. Nothing you write here is visible to the church, and they cannot
              change or delete it.
            </span>
          </p>
        ) : undefined
      }
    />
  );
}

import { useEffect, useRef, useState } from "react";
import { supabase, type PrayerItem } from "../lib/supabase";
import BackButton from "./BackButton";
import RichTextEditor from "./RichTextEditor";
import { track } from "../lib/analytics";
import { buildStoredBody, isHtmlEmpty, noteBodyToHtml, noteBodyToPlainText } from "../lib/richText";

interface PrayerListViewProps {
  userId: string | null | undefined;
  /** Free-text filter from the header search bar, shared with the other My Notes tabs. Matched
   * against the item and the notes' plain-text projection, same as SermonNotesView does. */
  searchQuery?: string;
}

type Screen = "list" | "editor";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function snippet(notes: string): string {
  const trimmed = noteBodyToPlainText(notes).trim().replace(/\s+/g, " ");
  return trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed;
}

/** A prayer list is nobody's business but its owner's — sql/037 gives `prayer_items` exactly one
 * policy shape, four times: `auth.uid() = user_id`. No church, no advisor, no reveal toggle;
 * nothing else in this codebase can ever read a row here.
 *
 * Structured like SermonNotesView (list, then a full-screen editor) rather than an inline
 * checklist, because the notes field wants the same rich-text toolbar sermon notes get, and that
 * needs real screen space on a phone. The one thing that does NOT wait for the editor to open is
 * the checkbox — toggling "answered" saves immediately, on the list row or inside the editor,
 * the same way MyNotesPanel's public/private toggle does; only the item text and notes autosave
 * on the usual debounce. */
export default function PrayerListView({ userId, searchQuery }: PrayerListViewProps) {
  const [screen, setScreen] = useState<Screen>("list");
  const [entries, setEntries] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<PrayerItem | null>(null);
  const [editorSession, setEditorSession] = useState(0);

  const fetchEntries = async () => {
    if (!userId) return;
    setLoading(true);
    // Unanswered first (still being prayed for), newest of each group first — an item just
    // checked off does not need to keep top billing over what is still open.
    const { data } = await supabase
      .from("prayer_items")
      .select("*")
      .eq("user_id", userId)
      .order("answered", { ascending: true })
      .order("created_at", { ascending: false });
    setEntries((data as PrayerItem[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const openEntry = (entry: PrayerItem) => {
    setActiveId(entry.id);
    setActive(entry);
    setEditorSession((n) => n + 1);
    setScreen("editor");
  };

  const openNew = () => {
    setActiveId(null);
    setActive(null);
    setEditorSession((n) => n + 1);
    setScreen("editor");
  };

  /** Immediate, not debounced — the same reasoning as MyNotesPanel's is_public toggle: a checkbox
   * is a decisive tap, not something still being composed, so it should not sit behind an
   * autosave timer. Works from the list row (no editor open, so it writes with what is already in
   * `entries`) and from inside the editor (which keeps `active` in sync itself). */
  const handleToggleAnswered = async (row: PrayerItem) => {
    const nextAnswered = !row.answered;
    const nextAnsweredAt = nextAnswered ? new Date().toISOString() : null;
    setEntries((prev) => prev.map((e) => (e.id === row.id ? { ...e, answered: nextAnswered, answered_at: nextAnsweredAt } : e)));
    if (active?.id === row.id) setActive((a) => (a ? { ...a, answered: nextAnswered, answered_at: nextAnsweredAt } : a));
    track(nextAnswered ? "prayer_item.mark_answered" : "prayer_item.mark_unanswered");
    await supabase.from("prayer_items").update({ answered: nextAnswered, answered_at: nextAnsweredAt }).eq("id", row.id);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("prayer_items").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setScreen("list");
  };

  if (!userId) {
    return <p className="bible-status no-print">Log in (or continue as guest) to keep a prayer list.</p>;
  }

  if (screen === "list") {
    const trimmedSearch = searchQuery?.trim().toLowerCase() ?? "";
    const visible = trimmedSearch
      ? entries.filter((e) => `${e.item} ${noteBodyToPlainText(e.notes)}`.toLowerCase().includes(trimmedSearch))
      : entries;
    return (
      <div className="prayer-list-screen">
        <button type="button" className="prayer-list-new-button" onClick={openNew}>
          + New Prayer
        </button>
        {loading && <p className="bible-status">Loading…</p>}
        {!loading && entries.length === 0 && (
          <p className="comment-status">Nothing here yet — add what you're praying for above.</p>
        )}
        {!loading && entries.length > 0 && visible.length === 0 && (
          <p className="comment-status">Nothing matches “{searchQuery?.trim()}”.</p>
        )}
        <ul className="prayer-list">
          {visible.map((e) => {
            const preview = snippet(e.notes);
            return (
              <li key={e.id} className={`prayer-list-item ${e.answered ? "prayer-list-item-answered" : ""}`}>
                <label className="prayer-list-checkbox no-print" onClick={(ev) => ev.stopPropagation()}>
                  <input type="checkbox" checked={e.answered} onChange={() => handleToggleAnswered(e)} aria-label={`Mark "${e.item}" as ${e.answered ? "not answered" : "answered"}`} />
                </label>
                <div className="prayer-list-item-body" onClick={() => openEntry(e)}>
                  <span className="prayer-list-item-title">{e.item}</span>
                  <span className="sermon-notes-list-date">
                    {formatDate(e.created_at)}
                    {e.answered && e.answered_at && <> · answered {formatDate(e.answered_at)}</>}
                  </span>
                  {preview && <span className="sermon-notes-list-snippet">{preview}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <PrayerItemEditor
      key={editorSession}
      userId={userId}
      entry={active}
      onBack={() => setScreen("list")}
      onSaved={(saved, isNew) => {
        setActiveId(saved.id);
        setActive(saved);
        setEntries((prev) => (isNew ? [saved, ...prev] : prev.map((e) => (e.id === saved.id ? saved : e))));
      }}
      onToggleAnswered={handleToggleAnswered}
      onDelete={activeId ? () => handleDelete(activeId) : undefined}
    />
  );
}

interface PrayerItemEditorProps {
  userId: string;
  /** Null for a brand-new, not-yet-saved item. */
  entry: PrayerItem | null;
  onBack: () => void;
  onSaved: (saved: PrayerItem, isNew: boolean) => void;
  onToggleAnswered: (row: PrayerItem) => void;
  /** Absent for a new item — nothing to delete yet. */
  onDelete?: () => void;
}

/** The editor half of the Prayer List tab. Deliberately its own small component rather than a
 * reuse of SermonNoteEditor: that editor's speaker/scripture-reference fields and photo capture
 * do not apply here, and bolting props onto it to hide them would leave a "sermon" editor wearing
 * a prayer-shaped disguise. What IS shared, on purpose, is the rich-text engine underneath —
 * RichTextEditor and lib/richText.ts's storage format are feature-agnostic, so this gets bold,
 * underline and bullets for free instead of a second implementation of them. */
function PrayerItemEditor({ userId, entry, onBack, onSaved, onToggleAnswered, onDelete }: PrayerItemEditorProps) {
  const [item, setItem] = useState(entry?.item ?? "");
  const [notesHtml, setNotesHtml] = useState(() => noteBodyToHtml(entry?.notes ?? ""));
  const [dirty, setDirty] = useState(false);
  const [persisted, setPersisted] = useState(!!entry);
  const [savedRow, setSavedRow] = useState<PrayerItem | null>(entry);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBlank = !item.trim() && isHtmlEmpty(notesHtml);

  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (isBlank && !persisted) return;
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const wasNew = !persisted;
      const fields = { item: item.trim() || "Untitled", notes: buildStoredBody(notesHtml) };
      if (wasNew) {
        track("prayer_item.create");
        const { data, error } = await supabase
          .from("prayer_items")
          .insert({ user_id: userId, ...fields })
          .select()
          .single();
        if (error || !data) {
          setSaveStatus("idle");
          return;
        }
        const saved = data as PrayerItem;
        setPersisted(true);
        setSavedRow(saved);
        setSaveStatus("saved");
        onSaved(saved, true);
        return;
      }
      const { data, error } = await supabase
        .from("prayer_items")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", savedRow!.id)
        .select()
        .single();
      if (error || !data) {
        setSaveStatus("idle");
        return;
      }
      const saved = data as PrayerItem;
      setSavedRow(saved);
      setSaveStatus("saved");
      onSaved(saved, false);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, notesHtml, dirty]);

  const handleBack = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    onBack();
  };

  return (
    <div className="sermon-notes-editor">
      <div className="sermon-notes-editor-toolbar">
        <BackButton onClick={handleBack} ariaLabel="Back to prayer list" />
        <span className="sermon-notes-save-status">
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
        </span>
      </div>

      <input
        type="text"
        className="sermon-notes-title-input"
        value={item}
        onChange={(e) => {
          setItem(e.target.value);
          setDirty(true);
        }}
        placeholder="What are you praying for?"
      />

      <div className="prayer-editor-meta">
        {savedRow && <span className="sermon-notes-list-date">Added {formatDate(savedRow.created_at)}</span>}
        <label className="prayer-editor-answered">
          <input
            type="checkbox"
            checked={savedRow?.answered ?? false}
            disabled={!savedRow}
            onChange={() => savedRow && onToggleAnswered(savedRow)}
          />
          Answered
          {savedRow?.answered && savedRow.answered_at && <span className="prayer-editor-answered-date"> — {formatDate(savedRow.answered_at)}</span>}
        </label>
      </div>
      {!savedRow && (
        <p className="prayer-editor-hint">The "Answered" checkbox appears once this is saved — start typing and it saves itself.</p>
      )}

      <RichTextEditor
        initialHtml={notesHtml}
        onChange={(html) => {
          setNotesHtml(html);
          setDirty(true);
        }}
        placeholder="Notes — how it's going, updates, anything you want to remember…"
        ariaLabel="Prayer notes"
      />

      {onDelete && persisted && (
        <div className="sermon-notes-danger-zone">
          {confirmingDelete ? (
            <>
              <span>Delete this prayer item?</span>
              <button type="button" className="friends-decline" onClick={onDelete}>
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

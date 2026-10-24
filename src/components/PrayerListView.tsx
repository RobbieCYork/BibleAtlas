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

/** Every entry sharing `answered`'s value, in manual order — the one grouping rule both moveItem()
 * and the render's edge-detection share, so they can never disagree about who is adjacent to whom. */
function sortedGroup(entries: PrayerItem[], answered: boolean): PrayerItem[] {
  return entries.filter((e) => e.answered === answered).sort((a, b) => a.sort_order - b.sort_order);
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
    // Unanswered first (still being prayed for), then by the reader's own manual order within
    // each group — an item just checked off does not need to keep top billing over what is still
    // open, but does not lose its place among other answered ones either.
    const { data } = await supabase
      .from("prayer_items")
      .select("*")
      .eq("user_id", userId)
      .order("answered", { ascending: true })
      .order("sort_order", { ascending: true });
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

  /** Swaps this entry with its neighbour one step toward `direction`, within its OWN group
   * (answered items and unanswered items each have their own order, never mixed) — found by
   * sorting the full `entries` array, not the search-filtered `visible` one, so a move made while
   * filtered still swaps with the row that is actually adjacent in the real list. That is also why
   * the buttons that call this are hidden while a filter is active: "adjacent in this search" and
   * "adjacent in the whole list" can disagree, and showing a control that would sometimes jump an
   * item past rows the search is hiding is worse than not offering it there at all.
   *
   * Persists by swapping just the two `sort_order` VALUES rather than renumbering the whole group,
   * so a move only ever writes the two rows it actually changed. */
  const moveItem = async (entry: PrayerItem, direction: "up" | "down") => {
    const group = sortedGroup(entries, entry.answered);
    const index = group.findIndex((e) => e.id === entry.id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || neighborIndex < 0 || neighborIndex >= group.length) return;
    const neighbor = group[neighborIndex];
    const [a, b] = [entry.sort_order, neighbor.sort_order];
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, sort_order: b } : e.id === neighbor.id ? { ...e, sort_order: a } : e))
    );
    track("prayer_item.reorder");
    await Promise.all([
      supabase.from("prayer_items").update({ sort_order: b }).eq("id", entry.id),
      supabase.from("prayer_items").update({ sort_order: a }).eq("id", neighbor.id),
    ]);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("prayer_items").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setScreen("list");
  };

  // Where a brand-new item's sort_order starts — one below the lowest existing value, so it takes
  // top billing in its group the same way "newest first" used to. Computed here, not inside the
  // "list" screen below, because the editor screen (where the insert actually happens) needs it too.
  const minSortOrder = entries.length ? Math.min(...entries.map((e) => e.sort_order)) : 0;

  if (!userId) {
    return <p className="bible-status no-print">Log in (or continue as guest) to keep a prayer list.</p>;
  }

  if (screen === "list") {
    const trimmedSearch = searchQuery?.trim().toLowerCase() ?? "";
    const visible = trimmedSearch
      ? entries.filter((e) => `${e.item} ${noteBodyToPlainText(e.notes)}`.toLowerCase().includes(trimmedSearch))
      : entries;
    // Which end of ITS OWN group (unanswered vs. answered) each row sits at — moveItem() groups
    // the same way, so "first in its group" here always matches "has no up neighbour" there.
    const groupEdge = new Map<string, { first: boolean; last: boolean }>();
    for (const answered of [false, true]) {
      const group = sortedGroup(entries, answered);
      group.forEach((e, i) => groupEdge.set(e.id, { first: i === 0, last: i === group.length - 1 }));
    }
    const reorderable = !trimmedSearch;
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
        {trimmedSearch && visible.length > 1 && (
          <p className="prayer-list-reorder-hint">Clear the search to reorder items.</p>
        )}
        <ul className="prayer-list">
          {visible.map((e) => {
            const preview = snippet(e.notes);
            const edge = groupEdge.get(e.id);
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
                {reorderable && (
                  <div className="prayer-list-reorder no-print" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      type="button"
                      className="prayer-list-reorder-btn"
                      disabled={edge?.first}
                      onClick={() => moveItem(e, "up")}
                      aria-label={`Move "${e.item}" up`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="prayer-list-reorder-btn"
                      disabled={edge?.last}
                      onClick={() => moveItem(e, "down")}
                      aria-label={`Move "${e.item}" down`}
                    >
                      ▼
                    </button>
                  </div>
                )}
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
      newItemSortOrder={minSortOrder - 1}
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
  /** The sort_order a brand-new item gets on its first save — one below the lowest value already
   * in the list, so it takes top billing in its group. Unused when `entry` is set (an existing
   * item keeps whatever sort_order it already has; only moveItem() changes that). */
  newItemSortOrder: number;
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
function PrayerItemEditor({ userId, entry, newItemSortOrder, onBack, onSaved, onToggleAnswered, onDelete }: PrayerItemEditorProps) {
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
          .insert({ user_id: userId, sort_order: newItemSortOrder, ...fields })
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

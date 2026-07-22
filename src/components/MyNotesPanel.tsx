import { useEffect, useRef, useState } from "react";
import { supabase, HIGHLIGHT_COLORS, type Highlight, type HighlightColor, type Note, type Tag, type VerseTag } from "../lib/supabase";
import { BOOKS } from "../data/bibleBooks";
import TagPicker from "./TagPicker";

interface MyNotesPanelProps {
  userId: string | null | undefined;
  onClose: () => void;
  onGoToVerse: (reference: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
  refreshKey?: number;
}

interface Entry {
  key: string;
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  note?: Note;
  verseTags: VerseTag[];
}

const TRANSLATION_LABELS: Record<string, string> = { web: "WEB", kjv: "KJV", asv: "ASV" };

function translationLabel(id: string | undefined): string {
  if (!id) return "";
  return TRANSLATION_LABELS[id] ?? id.toUpperCase();
}

function bookOrder(book: string): number {
  const idx = BOOKS.findIndex((b) => b.name === book);
  return idx === -1 ? BOOKS.length : idx;
}

function refLabel(e: Entry): string {
  return e.startVerse === e.endVerse ? `${e.book} ${e.chapter}:${e.startVerse}` : `${e.book} ${e.chapter}:${e.startVerse}-${e.endVerse}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function MyNotesPanel({ userId, onClose, onGoToVerse, expand, style, hidden, refreshKey }: MyNotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [verseTags, setVerseTags] = useState<VerseTag[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookFilter, setBookFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [openTagPickerKey, setOpenTagPickerKey] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportMenuOpen]);

  const fetchAll = async () => {
    if (!userId) {
      setNotes([]);
      setTags([]);
      setVerseTags([]);
      setHighlights([]);
      return;
    }
    setLoading(true);
    const [notesRes, tagsRes, verseTagsRes, highlightsRes] = await Promise.all([
      supabase.from("notes").select("*").eq("user_id", userId),
      supabase.from("tags").select("*").eq("user_id", userId).order("name"),
      supabase.from("verse_tags").select("*").eq("user_id", userId),
      supabase.from("highlights").select("*").eq("user_id", userId),
    ]);
    setNotes((notesRes.data as Note[] | null) ?? []);
    setTags((tagsRes.data as Tag[] | null) ?? []);
    setVerseTags((verseTagsRes.data as VerseTag[] | null) ?? []);
    setHighlights((highlightsRes.data as Highlight[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey]);

  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  // Every note gets its own entry (keyed by note id, not range) — two notes can share the exact same
  // verse range without one silently hiding the other. Verse tags attach to every note-entry sharing
  // their range; a range with only a tag (no note at all) still gets its own standalone entry.
  const entriesByKey = new Map<string, Entry>();
  notes.forEach((n) => {
    const key = `note:${n.id}`;
    entriesByKey.set(key, { key, book: n.book, chapter: n.chapter, startVerse: n.start_verse, endVerse: n.end_verse, note: n, verseTags: [] });
  });
  verseTags.forEach((vt) => {
    const matchingNoteEntries = [...entriesByKey.values()].filter(
      (e) => e.note && e.book === vt.book && e.chapter === vt.chapter && e.startVerse === vt.start_verse && e.endVerse === vt.end_verse
    );
    if (matchingNoteEntries.length > 0) {
      matchingNoteEntries.forEach((e) => e.verseTags.push(vt));
      return;
    }
    const rangeKey = `range:${vt.book}|${vt.chapter}|${vt.start_verse}|${vt.end_verse}`;
    const existing = entriesByKey.get(rangeKey);
    if (existing) existing.verseTags.push(vt);
    else entriesByKey.set(rangeKey, { key: rangeKey, book: vt.book, chapter: vt.chapter, startVerse: vt.start_verse, endVerse: vt.end_verse, verseTags: [vt] });
  });

  const allEntries = [...entriesByKey.values()].sort((a, b) => {
    const byBook = bookOrder(a.book) - bookOrder(b.book);
    if (byBook !== 0) return byBook;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.startVerse - b.startVerse;
  });

  const booksWithEntries = [...new Set(allEntries.map((e) => e.book))].sort((a, b) => bookOrder(a) - bookOrder(b));
  const tagCounts = Object.fromEntries(
    tags.map((t) => [t.id, allEntries.filter((e) => e.verseTags.some((vt) => vt.tag_id === t.id)).length])
  );

  const visibleEntries = allEntries.filter((e) => {
    if (bookFilter && e.book !== bookFilter) return false;
    if (tagFilter && !e.verseTags.some((vt) => vt.tag_id === tagFilter)) return false;
    return true;
  });

  // Group into consecutive runs so each book only gets one header, in the already-sorted order.
  const groups: { book: string; entries: Entry[] }[] = [];
  visibleEntries.forEach((e) => {
    const last = groups[groups.length - 1];
    if (last && last.book === e.book) last.entries.push(e);
    else groups.push({ book: e.book, entries: [e] });
  });

  const handleDeleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleRemoveTag = async (verseTagId: string) => {
    await supabase.from("verse_tags").delete().eq("id", verseTagId);
    setVerseTags((prev) => prev.filter((vt) => vt.id !== verseTagId));
  };

  const highlightsForEntry = (e: Entry) =>
    highlights.filter((h) => h.book === e.book && h.chapter === e.chapter && h.start_verse === e.startVerse && h.end_verse === e.endVerse);

  /** Highlights the exact quoted-text span this note was captured from — only possible for notes saved
   * after quoted_start_offset/quoted_end_offset started being tracked. */
  const handleCreateEntryHighlight = async (entry: Entry, color: HighlightColor) => {
    if (!userId || !entry.note || entry.note.quoted_start_offset == null || entry.note.quoted_end_offset == null) return;
    const { data, error } = await supabase
      .from("highlights")
      .insert({
        user_id: userId,
        book: entry.book,
        chapter: entry.chapter,
        start_verse: entry.note.start_verse,
        end_verse: entry.note.end_verse,
        translation: entry.note.translation,
        start_offset: entry.note.quoted_start_offset,
        end_offset: entry.note.quoted_end_offset,
        color,
      })
      .select()
      .single();
    if (!error && data) setHighlights((prev) => [...prev, data as Highlight]);
  };

  const handleRemoveEntryHighlight = async (highlightId: string) => {
    await supabase.from("highlights").delete().eq("id", highlightId);
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  };

  const isEntryTagged = (entry: Entry, tagId: string) => entry.verseTags.some((vt) => vt.tag_id === tagId);

  const handleToggleEntryTag = async (entry: Entry, tagId: string) => {
    if (!userId) return;
    const existing = verseTags.find(
      (vt) => vt.tag_id === tagId && vt.book === entry.book && vt.chapter === entry.chapter && vt.start_verse === entry.startVerse && vt.end_verse === entry.endVerse
    );
    if (existing) {
      await supabase.from("verse_tags").delete().eq("id", existing.id);
      setVerseTags((prev) => prev.filter((vt) => vt.id !== existing.id));
    } else {
      const translation = entry.note?.translation ?? entry.verseTags[0]?.translation ?? "web";
      const { data, error } = await supabase
        .from("verse_tags")
        .insert({ user_id: userId, book: entry.book, chapter: entry.chapter, start_verse: entry.startVerse, end_verse: entry.endVerse, translation, tag_id: tagId })
        .select()
        .single();
      if (!error && data) setVerseTags((prev) => [...prev, data as VerseTag]);
    }
  };

  /** Creates a new custom tag (reusing an existing one of the same name if it already exists) and applies it to this entry. */
  const handleAddNewTagToEntry = async (entry: Entry) => {
    if (!userId) return;
    const name = newTagName.trim();
    if (!name) return;
    setNewTagName("");
    const existingTag = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    let tag = existingTag;
    if (!tag) {
      const { data, error } = await supabase.from("tags").insert({ user_id: userId, name }).select().single();
      if (error || !data) return;
      tag = data as Tag;
      setTags((prev) => [...prev, tag!].sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (!isEntryTagged(entry, tag.id)) await handleToggleEntryTag(entry, tag.id);
  };

  const handlePrint = () => {
    setExportMenuOpen(false);
    window.print();
  };

  const handleExportWord = () => {
    setExportMenuOpen(false);
    const filterLabel = [tagFilter && tagsById[tagFilter]?.name, bookFilter].filter(Boolean).join(" — ");
    const title = `My Notes${filterLabel ? ` (${filterLabel})` : ""}`;
    const bodyHtml = groups
      .map(
        (g) => `
      <h2>${escapeHtml(g.book)}</h2>
      ${g.entries
        .map((e) => {
          const tagNames = e.verseTags.map((vt) => tagsById[vt.tag_id]?.name).filter(Boolean);
          return `
        <p><strong>${escapeHtml(refLabel(e))}</strong></p>
        ${e.note?.quoted_text ? `<p><em>"${escapeHtml(e.note.quoted_text)}"${e.note.translation ? ` (${escapeHtml(translationLabel(e.note.translation))})` : ""}</em></p>` : ""}
        ${e.note ? `<p>${escapeHtml(e.note.note_text)}</p>` : `<p><em>(tagged verse, no note)</em></p>`}
        ${tagNames.length ? `<p>Tags: ${tagNames.map(escapeHtml).join(", ")}</p>` : ""}
        <hr/>
      `;
        })
        .join("")}
    `
      )
      .join("");
    const html = `<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(
      title
    )}</h1>${bodyHtml || "<p>No notes or tagged verses match this filter.</p>"}</body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-notes.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`my-notes-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
      <div className="bible-panel-header no-print">
        <h3>My Notes</h3>
        <button className="panel-close" onClick={onClose} aria-label="Close My Notes panel">
          ×
        </button>
      </div>

      {!userId && <p className="bible-status no-print">Log in (or continue as guest) to write and see notes.</p>}

      {userId && (
        <>
          <div className="my-notes-filters no-print">
            <select className="bible-nav-select" aria-label="Filter by book" value={bookFilter} onChange={(e) => setBookFilter(e.target.value)}>
              <option value="">All books ({allEntries.length})</option>
              {booksWithEntries.map((b) => (
                <option key={b} value={b}>
                  {b} ({allEntries.filter((e) => e.book === b).length})
                </option>
              ))}
            </select>
            <select className="bible-nav-select" aria-label="Filter by tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({tagCounts[t.id] ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div className="my-notes-export no-print" ref={exportMenuRef}>
            <button type="button" className="my-notes-export-button" onClick={() => setExportMenuOpen((o) => !o)}>
              Export ▾
            </button>
            {exportMenuOpen && (
              <div className="my-notes-export-dropdown">
                <button type="button" onClick={handlePrint}>
                  🖨️ Print / Save as PDF
                </button>
                <button type="button" onClick={handleExportWord}>
                  📄 Export to Word
                </button>
              </div>
            )}
          </div>

          {loading && <p className="bible-status no-print">Loading…</p>}

          {!loading && visibleEntries.length === 0 && (
            <p className="bible-status no-print">
              {allEntries.length === 0
                ? 'No notes or tags yet — select some text in the Bible reader and choose "Note" or "Tag" to add one.'
                : "Nothing matches this filter."}
            </p>
          )}

          <h1 className="my-notes-print-title">
            My Notes{[tagFilter && tagsById[tagFilter]?.name, bookFilter].filter(Boolean).length > 0
              ? ` (${[tagFilter && tagsById[tagFilter]?.name, bookFilter].filter(Boolean).join(" — ")})`
              : ""}
          </h1>

          <div className="my-notes-list">
            {groups.map((group) => (
              <div key={group.book} className="my-notes-book-group">
                <h4 className="my-notes-book-heading">{group.book}</h4>
                {group.entries.map((e) => (
                  <div key={e.key} className="my-notes-item">
                    <button type="button" className="my-notes-ref no-print" onClick={() => onGoToVerse(`${e.book} ${e.chapter}`)}>
                      {refLabel(e)}
                    </button>
                    <strong className="my-notes-ref-print">{refLabel(e)}</strong>
                    {e.note?.quoted_text && (
                      <p className="verse-popup-quoted">
                        "{e.note.quoted_text}"
                        {e.note.translation && <span className="my-notes-translation-tag"> ({translationLabel(e.note.translation)})</span>}
                      </p>
                    )}
                    {e.note && <p className="my-notes-text">{e.note.note_text}</p>}
                    {!e.note && <p className="my-notes-text my-notes-text-muted">(tagged verse, no note)</p>}
                    {e.verseTags.length > 0 && (
                      <div className="my-notes-tag-chips">
                        {e.verseTags.map((vt) => {
                          const tag = tagsById[vt.tag_id];
                          if (!tag) return null;
                          return (
                            <span key={vt.id} className="my-notes-tag-chip">
                              {tag.name}
                              <button type="button" className="no-print" aria-label={`Remove tag ${tag.name}`} onClick={() => handleRemoveTag(vt.id)}>
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {(highlightsForEntry(e).length > 0 || (e.note?.quoted_start_offset != null && e.note?.quoted_end_offset != null)) && (
                      <div className="my-notes-highlight-row no-print">
                        {e.note?.quoted_start_offset != null &&
                          e.note?.quoted_end_offset != null &&
                          HIGHLIGHT_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`verse-popup-color verse-popup-color-${color}`}
                              aria-label={`Highlight ${color}`}
                              onClick={() => handleCreateEntryHighlight(e, color)}
                            />
                          ))}
                        {highlightsForEntry(e).map((h) => (
                          <span key={h.id} className={`my-notes-highlight-chip my-notes-highlight-chip-${h.color}`}>
                            <button type="button" aria-label={`Remove ${h.color} highlight`} onClick={() => handleRemoveEntryHighlight(h.id)}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="my-notes-tag-toggle no-print">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenTagPickerKey((k) => (k === e.key ? null : e.key));
                          setNewTagName("");
                        }}
                      >
                        {openTagPickerKey === e.key ? "Close tags" : "+ Tag"}
                      </button>
                    </div>
                    {openTagPickerKey === e.key && (
                      <TagPicker
                        tags={tags}
                        isActive={(tagId) => isEntryTagged(e, tagId)}
                        onToggle={(tagId) => handleToggleEntryTag(e, tagId)}
                        newTagName={newTagName}
                        onNewTagNameChange={setNewTagName}
                        onAddNewTag={() => handleAddNewTagToEntry(e)}
                      />
                    )}
                    {e.note && (
                      <button type="button" className="my-notes-delete no-print" onClick={() => handleDeleteNote(e.note!.id)}>
                        Delete note
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

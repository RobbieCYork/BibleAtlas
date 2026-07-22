import { useEffect, useRef, useState } from "react";
import { supabase, type Note, type Tag, type VerseTag } from "../lib/supabase";
import { BOOKS } from "../data/bibleBooks";

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
  const [loading, setLoading] = useState(false);
  const [bookFilter, setBookFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

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
      return;
    }
    setLoading(true);
    const [notesRes, tagsRes, verseTagsRes] = await Promise.all([
      supabase.from("notes").select("*").eq("user_id", userId),
      supabase.from("tags").select("*").eq("user_id", userId).order("name"),
      supabase.from("verse_tags").select("*").eq("user_id", userId),
    ]);
    setNotes((notesRes.data as Note[] | null) ?? []);
    setTags((tagsRes.data as Tag[] | null) ?? []);
    setVerseTags((verseTagsRes.data as VerseTag[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey]);

  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  // Merge notes and verse tags sharing the exact same verse range into one entry, so a range with
  // only a tag (no note) still shows up, and a note tagged via the same selection shows both together.
  const entriesByKey = new Map<string, Entry>();
  notes.forEach((n) => {
    const key = `${n.book}|${n.chapter}|${n.start_verse}|${n.end_verse}`;
    entriesByKey.set(key, { key, book: n.book, chapter: n.chapter, startVerse: n.start_verse, endVerse: n.end_verse, note: n, verseTags: [] });
  });
  verseTags.forEach((vt) => {
    const key = `${vt.book}|${vt.chapter}|${vt.start_verse}|${vt.end_verse}`;
    const existing = entriesByKey.get(key);
    if (existing) existing.verseTags.push(vt);
    else entriesByKey.set(key, { key, book: vt.book, chapter: vt.chapter, startVerse: vt.start_verse, endVerse: vt.end_verse, verseTags: [vt] });
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
        ${e.note?.quoted_text ? `<p><em>"${escapeHtml(e.note.quoted_text)}"</em></p>` : ""}
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
                    {e.note?.quoted_text && <p className="verse-popup-quoted">"{e.note.quoted_text}"</p>}
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

import { useEffect, useState } from "react";
import { supabase, type Note } from "../lib/supabase";
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

function bookOrder(book: string): number {
  const idx = BOOKS.findIndex((b) => b.name === book);
  return idx === -1 ? BOOKS.length : idx;
}

export default function MyNotesPanel({ userId, onClose, onGoToVerse, expand, style, hidden, refreshKey }: MyNotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookFilter, setBookFilter] = useState("");

  const fetchNotes = async () => {
    if (!userId) {
      setNotes([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("notes").select("*").eq("user_id", userId);
    setNotes(
      ((data as Note[] | null) ?? []).sort((a, b) => {
        const byBook = bookOrder(a.book) - bookOrder(b.book);
        if (byBook !== 0) return byBook;
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.verse - b.verse;
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey]);

  const handleDelete = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const booksWithNotes = [...new Set(notes.map((n) => n.book))].sort((a, b) => bookOrder(a) - bookOrder(b));
  const visibleNotes = bookFilter ? notes.filter((n) => n.book === bookFilter) : notes;

  // Group into consecutive runs so each book only gets one header, in the already-sorted order.
  const groups: { book: string; notes: Note[] }[] = [];
  visibleNotes.forEach((n) => {
    const last = groups[groups.length - 1];
    if (last && last.book === n.book) last.notes.push(n);
    else groups.push({ book: n.book, notes: [n] });
  });

  return (
    <div className={`my-notes-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
      <div className="bible-panel-header">
        <h3>My Notes</h3>
        <button className="panel-close" onClick={onClose} aria-label="Close My Notes panel">
          ×
        </button>
      </div>

      {!userId && <p className="bible-status">Log in (or continue as guest) to write and see notes.</p>}

      {userId && (
        <>
          <select
            className="bible-nav-select"
            aria-label="Filter by book"
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
          >
            <option value="">All books ({notes.length})</option>
            {booksWithNotes.map((b) => (
              <option key={b} value={b}>
                {b} ({notes.filter((n) => n.book === b).length})
              </option>
            ))}
          </select>

          {loading && <p className="bible-status">Loading…</p>}

          {!loading && notes.length === 0 && (
            <p className="bible-status">
              No notes yet — select some text in the Bible reader and choose "Note" to add one.
            </p>
          )}

          <div className="my-notes-list">
            {groups.map((group) => (
              <div key={group.book} className="my-notes-book-group">
                <h4 className="my-notes-book-heading">{group.book}</h4>
                {group.notes.map((n) => (
                  <div key={n.id} className="my-notes-item">
                    <button
                      type="button"
                      className="my-notes-ref"
                      onClick={() => onGoToVerse(`${n.book} ${n.chapter}`)}
                    >
                      {n.book} {n.chapter}:{n.verse}
                    </button>
                    {n.quoted_text && <p className="verse-popup-quoted">"{n.quoted_text}"</p>}
                    <p className="my-notes-text">{n.note_text}</p>
                    <button type="button" className="my-notes-delete" onClick={() => handleDelete(n.id)}>
                      Delete
                    </button>
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

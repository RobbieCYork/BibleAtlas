import { useEffect, useState } from "react";
import { supabase, chapterReadCutoff, formatReadingTime, type Profile } from "../lib/supabase";
import { BOOKS } from "../data/bibleBooks";

interface ReadingProgressGridProps {
  userId: string;
  /** Shown in the "Read by ___" subtitle for someone else's progress — ignored when isOwn is set. */
  displayName?: string;
  /** Cosmetic only — swaps the subtitle/summary to "you" phrasing for the signed-in account's own view. */
  isOwn?: boolean;
}

const RESET_WINDOW_LABEL: Record<Profile["chapter_read_reset"], string> = {
  never: "since joining",
  monthly: "in the last month",
  yearly: "in the last year",
};

const key = (book: string, chapter: number) => `${book}:${chapter}`;

/** Supabase sends an upsert as a single request; the whole Bible is 1189 chapters, so a
 * "mark everything" edit is chunked rather than posted as one oversized body. */
const UPSERT_CHUNK = 400;

/** Every book in the canon, each chapter shown as a small cell lit up once read. Backs both the
 * Settings "My Reading" section and a friend's profile view — RLS on chapter_reads/reading_time_daily
 * (owner or an accepted friend) decides whether the caller can actually see the data either way.
 *
 * On your own profile the book-by-book breakdown can be switched into an edit mode that marks
 * chapters read/unread by hand — for the reading you did before you started using the app, or
 * anywhere the per-chapter checkbox in the Bible panel was missed. Edits are staged locally and
 * written on Save (a single pass, not a request per tap), so a big backfill is one round trip and
 * Cancel genuinely undoes it. */
export default function ReadingProgressGrid({ userId, displayName, isOwn }: ReadingProgressGridProps) {
  const [readSet, setReadSet] = useState<Set<string> | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [resetSetting, setResetSetting] = useState<Profile["chapter_read_reset"]>("never");
  const [booksOpen, setBooksOpen] = useState(false);

  /** Non-null only while editing — the staged copy every toggle mutates, so Cancel is just
   * throwing it away and `readSet` stays the last known server state until Save succeeds. */
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReadSet(null);
    setSeconds(null);
    (async () => {
      const { data: profileRow } = await supabase.from("profiles").select("chapter_read_reset").eq("id", userId).single();
      const reset = (profileRow as { chapter_read_reset: Profile["chapter_read_reset"] } | null)?.chapter_read_reset ?? "never";
      if (cancelled) return;
      setResetSetting(reset);
      const cutoff = chapterReadCutoff(reset);
      let query = supabase.from("chapter_reads").select("book, chapter").eq("user_id", userId);
      if (cutoff) query = query.gte("read_at", cutoff);
      const { data } = await query;
      if (!cancelled) setReadSet(new Set((data as { book: string; chapter: number }[] | null ?? []).map((r) => key(r.book, r.chapter))));
    })();
    supabase
      .rpc("reading_seconds_this_month", { p_user_id: userId })
      .then(({ data }) => {
        if (!cancelled) setSeconds(typeof data === "number" ? data : 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const startEdit = () => {
    if (!readSet) return;
    setDraft(new Set(readSet));
    setSaveError(null);
  };

  const cancelEdit = () => {
    setDraft(null);
    setSaveError(null);
  };

  const toggleChapter = (book: string, chapter: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      const k = key(book, chapter);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  /** Whole-book toggle — marking Psalms a cell at a time is 150 taps, which is the main reason
   * hand-editing needs to exist at all. Mixed/none becomes all read; fully read becomes none. */
  const toggleBook = (book: string, chapters: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      const allRead = Array.from({ length: chapters }, (_, i) => i + 1).every((c) => next.has(key(book, c)));
      for (let c = 1; c <= chapters; c++) {
        if (allRead) next.delete(key(book, c));
        else next.add(key(book, c));
      }
      return next;
    });
  };

  /** Structured diff over the canon rather than parsing "Book:N" strings back apart — book names
   * are free text and this never has to care whether one contains a colon. */
  const diffDraft = (base: Set<string>, next: Set<string>) => {
    const added: { book: string; chapter: number }[] = [];
    const removed: { book: string; chapter: number }[] = [];
    for (const b of BOOKS) {
      for (let c = 1; c <= b.chapters; c++) {
        const k = key(b.name, c);
        const was = base.has(k);
        const now = next.has(k);
        if (now && !was) added.push({ book: b.name, chapter: c });
        else if (!now && was) removed.push({ book: b.name, chapter: c });
      }
    }
    return { added, removed };
  };

  const saveEdits = async () => {
    if (!draft || !readSet) return;
    const { added, removed } = diffDraft(readSet, draft);
    if (added.length === 0 && removed.length === 0) {
      setDraft(null);
      return;
    }
    setSaving(true);
    setSaveError(null);

    const readAt = new Date().toISOString();
    // Upsert rather than insert, for the same reason the Bible panel's checkbox does: a chapter can
    // already have a row that's simply aged past this account's reset window, and re-marking it has
    // to refresh read_at instead of colliding on the primary key.
    const rows = added.map((a) => ({ user_id: userId, book: a.book, chapter: a.chapter, read_at: readAt }));
    let failed: string | null = null;

    for (let i = 0; i < rows.length && !failed; i += UPSERT_CHUNK) {
      const { error } = await supabase.from("chapter_reads").upsert(rows.slice(i, i + UPSERT_CHUNK));
      if (error) failed = error.message;
    }

    // Deletes go one book at a time — at most 150 chapter numbers per request (Psalms), which keeps
    // every `in (...)` list comfortably short.
    if (!failed) {
      const byBook = new Map<string, number[]>();
      for (const r of removed) byBook.set(r.book, [...(byBook.get(r.book) ?? []), r.chapter]);
      for (const [book, chapters] of byBook) {
        const { error } = await supabase
          .from("chapter_reads")
          .delete()
          .eq("user_id", userId)
          .eq("book", book)
          .in("chapter", chapters);
        if (error) {
          failed = error.message;
          break;
        }
      }
    }

    setSaving(false);
    if (failed) {
      // Keep edit mode open so the staged work isn't thrown away on a failed write.
      setSaveError(failed);
      return;
    }
    setReadSet(new Set(draft));
    setDraft(null);
  };

  if (!readSet) return <p className="comment-status">Loading reading progress…</p>;

  const totalChapters = BOOKS.reduce((sum, b) => sum + b.chapters, 0);
  const editing = draft !== null;
  const shown = draft ?? readSet;
  const pending = editing ? (() => {
    const { added, removed } = diffDraft(readSet, draft);
    return added.length + removed.length;
  })() : 0;

  return (
    <div className="reading-progress">
      <p className="reading-progress-subtitle">
        Read by {isOwn ? "you" : (displayName ?? "this friend")} {RESET_WINDOW_LABEL[resetSetting]}
      </p>
      <div className="reading-progress-summary">
        <span>
          <strong>{shown.size}</strong> / {totalChapters} chapters read
        </span>
        <span>
          <strong>{seconds !== null ? formatReadingTime(seconds) : "…"}</strong> {isOwn ? "read this month" : "this month"}
        </span>
      </div>
      <button
        type="button"
        className="reading-progress-toggle"
        onClick={() => setBooksOpen((o) => !o)}
        aria-expanded={booksOpen}
      >
        {booksOpen ? "▾ Hide" : "▸ Show"} book-by-book progress
      </button>
      {booksOpen && (
        <>
          {/* Editing is offered only on your own progress — a friend's grid is read-only regardless
              (RLS would reject the write anyway; not rendering the button avoids offering it at all). */}
          {isOwn && (
            <div className="reading-progress-edit-bar">
              {!editing ? (
                <button type="button" className="reading-progress-edit-btn" onClick={startEdit}>
                  ✏️ Edit
                </button>
              ) : (
                <>
                  <span className="reading-progress-edit-hint">
                    {pending === 0 ? "Tap chapters to mark them read" : `${pending} change${pending === 1 ? "" : "s"}`}
                  </span>
                  <span className="reading-progress-edit-actions">
                    <button type="button" className="reading-progress-edit-cancel" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </button>
                    <button type="button" className="reading-progress-edit-btn" onClick={saveEdits} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </span>
                </>
              )}
            </div>
          )}
          {saveError && <p className="reading-progress-edit-error">Couldn't save: {saveError}</p>}
          <div className={`reading-progress-books${editing ? " reading-progress-books-editing" : ""}`}>
            {BOOKS.map((book) => {
              const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
              const readInBook = chapters.filter((c) => shown.has(key(book.name, c))).length;
              return (
                <div key={book.name} className="reading-progress-book">
                  <div className="reading-progress-book-header">
                    <span className="reading-progress-book-name">{book.name}</span>
                    {editing ? (
                      <button
                        type="button"
                        className="reading-progress-book-all"
                        onClick={() => toggleBook(book.name, book.chapters)}
                      >
                        {readInBook === book.chapters ? "Clear" : "All"} ({readInBook}/{book.chapters})
                      </button>
                    ) : (
                      <span className="reading-progress-book-count">
                        {readInBook}/{book.chapters}
                      </span>
                    )}
                  </div>
                  <div className={`reading-progress-chapters${editing ? " reading-progress-chapters-editing" : ""}`}>
                    {chapters.map((c) => {
                      const isRead = shown.has(key(book.name, c));
                      // Read-only view keeps the dense 8px dot grid; edit mode swaps in numbered
                      // buttons, since an 8px target is far too small to tap accurately.
                      return editing ? (
                        <button
                          key={c}
                          type="button"
                          className={`reading-progress-chip${isRead ? " reading-progress-chip-read" : ""}`}
                          onClick={() => toggleChapter(book.name, c)}
                          aria-pressed={isRead}
                          aria-label={`${book.name} ${c}${isRead ? ", read" : ", not read"}`}
                        >
                          {c}
                        </button>
                      ) : (
                        <span
                          key={c}
                          className={`reading-progress-cell${isRead ? " reading-progress-cell-read" : ""}`}
                          title={`${book.name} ${c}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

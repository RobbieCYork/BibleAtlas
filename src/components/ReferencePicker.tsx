import { useEffect, useMemo, useRef, useState } from "react";
import { BOOKS } from "../data/bibleBooks";
import { supabase, chapterReadCutoff, type Profile } from "../lib/supabase";

const NT_START_INDEX = BOOKS.findIndex((b) => b.name === "Matthew");

type Step = "book" | "chapter";

/** How the book list is ordered. "canonical" is the order the books appear in the Bible and is the
 * default — a reader who never touches the toggle gets the list they have always had. */
type SortOrder = "canonical" | "alphabetical";

const SORT_STORAGE_KEY = "bible-book-sort";

/** Anything unrecognised — missing, corrupt, or written by an older build — falls back to
 * canonical, so a bad value can never leave a new reader in an order they did not choose. */
function loadSortOrder(): SortOrder {
  try {
    return localStorage.getItem(SORT_STORAGE_KEY) === "alphabetical" ? "alphabetical" : "canonical";
  } catch {
    return "canonical";
  }
}

interface ReferencePickerProps {
  open: boolean;
  /** The book/chapter on screen behind the sheet — used to pre-highlight and scroll to where the
   * reader already is, so reopening the picker doesn't mean re-finding their place in 66 books. */
  currentBook: string | null;
  currentChapter: number | null;
  /** The signed-in account, and its "forget reads after..." setting, so the chapter grid can show
   * which chapters of the chosen book are already read. Same table, same cutoff as the reader's own
   * "Mark chapter as read" checkbox. No user means no marks and no summary line. */
  userId?: string | null;
  chapterReadReset?: Profile["chapter_read_reset"];
  /** Live state of the checkbox for the chapter on screen, which may be ahead of the database
   * while its write is in flight. */
  currentChapterRead?: boolean;
  onClose: () => void;
  onPickIntro: (book: string) => void;
  /** Loads the chapter. Resolves true once the passage is rendered behind the sheet, which is when
   * the sheet closes — a false result means the fetch failed, and the sheet stays open on the
   * chapter grid rather than dismissing onto the passage the reader was trying to leave. */
  onPickChapter: (book: string, chapter: number) => Promise<boolean>;
}

/** The reader's whole book/chapter/verse navigation, collapsed into one sheet behind the chapter
 * heading.
 *
 * This replaces the three side-by-side dropdowns that used to sit under the search bar. They cost a
 * permanent row of every phone screen to serve a tap that happens once a session; the heading was
 * already on screen saying exactly what those dropdowns said, so it does the job instead and the row
 * goes back to scripture.
 *
 * Two steps, and it ends at two: book, then that book's chapters, then the reader is on the passage
 * with the sheet gone.
 *
 * There was a third step. Picking a chapter used to leave the sheet open over the passage it had
 * just loaded, offering that chapter's verses under "Jump to a verse, or close — you're already
 * there". It was meant as an optional extra and read as an obstacle: a grid of verse numbers and a
 * Done button standing between the reader and a chapter they had already navigated to. Removed on
 * Robbie's instruction — book, chapter, done. A reader who wants verse 14 scrolls to it, which is
 * what the sheet's own hint was telling him to do.
 *
 * This is the MANUAL flow only. Programmatic verse targeting is untouched and lives elsewhere:
 * BiblePanel's `pendingScrollVerse` still scrolls and flashes a verse for deep links, search
 * results, reading-plan jumps and a book intro's Key Passages. */
export default function ReferencePicker({
  open,
  currentBook,
  currentChapter,
  userId,
  chapterReadReset = "never",
  currentChapterRead = false,
  onClose,
  onPickIntro,
  onPickChapter,
}: ReferencePickerProps) {
  const [step, setStep] = useState<Step>("book");
  const [book, setBook] = useState<string | null>(null);
  const [loadingChapter, setLoadingChapter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(loadSortOrder);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  /** Chapters of `book` this account has read; null while loading or if the read failed (then no
   * marks and no count are drawn - never a claim of "0 read" that was really a failure). */
  const [readChapters, setReadChapters] = useState<Set<number> | null>(null);

  const alphabetical = sortOrder === "alphabetical";

  // Alphabetical sorts on the name exactly as it is printed in the list, which puts the numbered
  // books first ("1 Chronicles" … "3 John") rather than filing them under their letter. That is the
  // literal reading of A–Z, and it is the only one a reader can predict from what is on screen:
  // sorting on a hidden key that skips the leading numeral would put "1 Corinthians" under C, where
  // nothing visible explains why.
  const bookList = useMemo(
    () => (alphabetical ? [...BOOKS].sort((a, b) => a.name.localeCompare(b.name, "en")) : BOOKS),
    [alphabetical],
  );

  const toggleSort = () => {
    setSortOrder((prev) => {
      const next: SortOrder = prev === "alphabetical" ? "canonical" : "alphabetical";
      try {
        localStorage.setItem(SORT_STORAGE_KEY, next);
      } catch {
        // A full or blocked store costs the reader the preference next session, not this one.
      }
      return next;
    });
  };

  // Read through a ref, not the dependency array: choosing a chapter navigates the reader, which
  // changes currentBook. If it were a dependency this reset would fire on that navigation and throw
  // the reader back to the book list on the way out of the sheet.
  const latest = useRef({ currentBook });
  latest.current = { currentBook };

  // Every opening starts at the book step: the heading that opens this sheet is a "take me
  // somewhere else" control, and somewhere else usually starts with a different book.
  useEffect(() => {
    if (!open) return;
    setStep("book");
    setBook(latest.current.currentBook);
    setLoadingChapter(null);
  }, [open]);

  // Bring the current book/chapter into view rather than making the reader scroll to Revelation.
  // Re-runs on sortOrder too: re-ordering the list under a fixed scroll position would otherwise
  // leave the reader looking at whichever books happened to land at that offset.
  useEffect(() => {
    if (!open || !bodyRef.current) return;
    const target = bodyRef.current.querySelector('[data-current="true"]');
    target?.scrollIntoView({ block: "center" });
  }, [open, step, sortOrder]);

  // One select of this book's rows, the same query the reader and My Reading already make, only when
  // the chapter grid is showing.
  useEffect(() => {
    setReadChapters(null);
    if (!open || step !== "chapter" || !book || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        let query = supabase.from("chapter_reads").select("chapter").eq("user_id", userId).eq("book", book);
        const cutoff = chapterReadCutoff(chapterReadReset);
        if (cutoff) query = query.gte("read_at", cutoff);
        const { data, error } = await query;
        if (cancelled || error) return;
        setReadChapters(new Set((data as { chapter: number }[] | null ?? []).map((r) => r.chapter)));
      } catch {
        // Stay null: draw nothing rather than claim nothing is read.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, step, book, userId, chapterReadReset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bookInfo = book ? BOOKS.find((b) => b.name === book) : undefined;

  const handleChapter = async (n: number) => {
    if (!book) return;
    setLoadingChapter(n);
    const ok = await onPickChapter(book, n);
    setLoadingChapter(null);
    // The chapter is the destination. Close on success and leave the reader on it; on failure stay
    // put, so a dead fetch does not dismiss the sheet onto the passage he was trying to leave.
    if (ok) onClose();
  };

  // The checkbox for the chapter on screen wins over the fetched row: it is what the reader just did.
  const isRead = (n: number) => {
    if (!readChapters) return false;
    if (bookInfo && bookInfo.name === currentBook && n === currentChapter) return currentChapterRead;
    return readChapters.has(n);
  };
  const readCount = bookInfo && readChapters
    ? Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).filter(isRead).length
    : null;

  const title = step === "book" ? "Choose a book" : (book ?? "Choose a chapter");

  return (
    <>
      <div className="ref-picker-backdrop" onClick={onClose} />
      <div className="ref-picker" role="dialog" aria-modal="true" aria-label="Choose a passage">
        <div className="ref-picker-head">
          {step === "book" ? (
            /* The sort toggle takes the head slot the book step used to leave empty, so offering a
             * second order costs no vertical space — this whole area exists to give scripture more
             * of the screen, and a control row would have taken some of it straight back. */
            <button
              type="button"
              className={alphabetical ? "ref-picker-sort is-on" : "ref-picker-sort"}
              onClick={toggleSort}
              aria-pressed={alphabetical}
              title={alphabetical ? "Sorted A–Z — switch to Bible order" : "Sort the books A–Z"}
              aria-label={
                alphabetical ? "Sorted alphabetically. Switch to Bible order." : "Sort the books alphabetically"
              }
            >
              A–Z
            </button>
          ) : (
            <button
              type="button"
              className="ref-picker-back"
              onClick={() => setStep("book")}
              aria-label="Back to books"
            >
              ‹
            </button>
          )}
          <span className="ref-picker-title">{title}</span>
          <button type="button" className="ref-picker-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="ref-picker-body" ref={bodyRef}>
          {step === "book" && (
            <ul className="ref-picker-books">
              {bookList.map((b, i) => (
                <li key={b.name}>
                  {/* Testament headings only mean anything while the list is in Bible order. A–Z
                   * interleaves the testaments, so it gets a flat list instead of two headings
                   * sitting over books that no longer belong under them. */}
                  {!alphabetical && (i === 0 || i === NT_START_INDEX) && (
                    <p className="ref-picker-section">{i === 0 ? "Old Testament" : "New Testament"}</p>
                  )}
                  <button
                    type="button"
                    data-current={b.name === currentBook ? "true" : undefined}
                    className={b.name === currentBook ? "ref-picker-book is-current" : "ref-picker-book"}
                    onClick={() => {
                      setBook(b.name);
                      setStep("chapter");
                    }}
                  >
                    <span>{b.name}</span>
                    <span className="ref-picker-book-count">{b.chapters}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {step === "chapter" && bookInfo && (
            <>
              <button
                type="button"
                className="ref-picker-intro"
                onClick={() => {
                  onPickIntro(bookInfo.name);
                  onClose();
                }}
              >
                Introduction to {bookInfo.name}
              </button>
              {/* Always rendered for a signed-in reader, with a fixed line height, so the grid does not
               * jump when the count arrives. */}
              {userId && (
                <p className="ref-picker-progress" aria-live="polite">
                  {readCount !== null && bookInfo
                    ? `${readCount} of ${bookInfo.chapters} chapters read`
                    : "\u00a0"}
                </p>
              )}
              <div className="ref-picker-grid">
                {Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map((n) => {
                  const isCurrent = bookInfo.name === currentBook && n === currentChapter;
                  const read = isRead(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      data-current={isCurrent ? "true" : undefined}
                      className={`ref-picker-cell${isCurrent ? " is-current" : ""}${
                        loadingChapter === n ? " is-loading" : ""
                      }${read ? " is-read" : ""}`}
                      data-read={read ? "true" : undefined}
                      aria-current={isCurrent ? "true" : undefined}
                      aria-label={`Chapter ${n}${isCurrent ? ", current chapter" : ""}${read ? ", read" : ""}`}
                      disabled={loadingChapter !== null}
                      onClick={() => handleChapter(n)}
                    >
                      {n}
                      {read && (
                        <svg className="ref-picker-check" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                          <path d="M2.6 6.4l2.3 2.3 4.5-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

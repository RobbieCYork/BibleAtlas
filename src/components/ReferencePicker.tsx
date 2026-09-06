import { useEffect, useRef, useState } from "react";
import { BOOKS } from "../data/bibleBooks";

const NT_START_INDEX = BOOKS.findIndex((b) => b.name === "Matthew");

type Step = "book" | "chapter" | "verse";

interface ReferencePickerProps {
  open: boolean;
  /** The book/chapter on screen behind the sheet — used to pre-highlight and scroll to where the
   * reader already is, so reopening the picker doesn't mean re-finding their place in 66 books. */
  currentBook: string | null;
  currentChapter: number | null;
  /** Verse numbers of the chapter currently loaded. Empty until a chapter is on screen. */
  verses: number[];
  onClose: () => void;
  onPickIntro: (book: string) => void;
  /** Loads the chapter. Resolves true once the passage is rendered behind the sheet — the sheet
   * only advances to its optional verse step after that, so the verse list it offers is the
   * loaded chapter's and not the previous one's. */
  onPickChapter: (book: string, chapter: number) => Promise<boolean>;
  onPickVerse: (verse: number) => void;
}

/** The reader's whole book/chapter/verse navigation, collapsed into one sheet behind the chapter
 * heading.
 *
 * This replaces the three side-by-side dropdowns that used to sit under the search bar. They cost a
 * permanent row of every phone screen to serve a tap that happens once a session; the heading was
 * already on screen saying exactly what those dropdowns said, so it does the job instead and the row
 * goes back to scripture.
 *
 * Two steps, not three at once: book, then that book's chapters. Choosing a chapter navigates
 * immediately — the passage is already behind the sheet — and the sheet then offers that chapter's
 * verses as an optional third step. Dismissing at any point leaves the reader on the chapter they
 * chose, so the verse step can never block the common case of just wanting a chapter. */
export default function ReferencePicker({
  open,
  currentBook,
  currentChapter,
  verses,
  onClose,
  onPickIntro,
  onPickChapter,
  onPickVerse,
}: ReferencePickerProps) {
  const [step, setStep] = useState<Step>("book");
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [loadingChapter, setLoadingChapter] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Read through a ref, not the dependency array: choosing a chapter navigates the reader while the
  // sheet is still open, which changes currentBook/currentChapter. If those were dependencies this
  // reset would fire on that navigation and throw the reader back to the book list mid-flow.
  const latest = useRef({ currentBook, currentChapter });
  latest.current = { currentBook, currentChapter };

  // Every opening starts at the book step: the heading that opens this sheet is a "take me
  // somewhere else" control, and somewhere else usually starts with a different book.
  useEffect(() => {
    if (!open) return;
    setStep("book");
    setBook(latest.current.currentBook);
    setChapter(latest.current.currentChapter);
    setLoadingChapter(null);
  }, [open]);

  // Bring the current book/chapter into view rather than making the reader scroll to Revelation.
  useEffect(() => {
    if (!open || !bodyRef.current) return;
    const target = bodyRef.current.querySelector('[data-current="true"]');
    target?.scrollIntoView({ block: "center" });
  }, [open, step]);

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
    if (!ok) return;
    setChapter(n);
    setStep("verse");
  };

  const title =
    step === "book" ? "Choose a book" : step === "chapter" ? (book ?? "Choose a chapter") : `${book} ${chapter}`;

  return (
    <>
      <div className="ref-picker-backdrop" onClick={onClose} />
      <div className="ref-picker" role="dialog" aria-modal="true" aria-label="Choose a passage">
        <div className="ref-picker-head">
          {step === "book" ? (
            <span className="ref-picker-head-spacer" aria-hidden="true" />
          ) : (
            <button
              type="button"
              className="ref-picker-back"
              onClick={() => setStep(step === "verse" ? "chapter" : "book")}
              aria-label={step === "verse" ? "Back to chapters" : "Back to books"}
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
              {BOOKS.map((b, i) => (
                <li key={b.name}>
                  {(i === 0 || i === NT_START_INDEX) && (
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
              <div className="ref-picker-grid">
                {Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map((n) => {
                  const isCurrent = bookInfo.name === currentBook && n === currentChapter;
                  return (
                    <button
                      key={n}
                      type="button"
                      data-current={isCurrent ? "true" : undefined}
                      className={`ref-picker-cell${isCurrent ? " is-current" : ""}${
                        loadingChapter === n ? " is-loading" : ""
                      }`}
                      disabled={loadingChapter !== null}
                      onClick={() => handleChapter(n)}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === "verse" && (
            <>
              {/* Optional by design: the chapter is already open behind this sheet. */}
              <p className="ref-picker-hint">Jump to a verse, or close — you&rsquo;re already there.</p>
              {verses.length === 0 ? (
                <p className="ref-picker-hint">No verses loaded.</p>
              ) : (
                <div className="ref-picker-grid">
                  {verses.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="ref-picker-cell"
                      onClick={() => {
                        onPickVerse(v);
                        onClose();
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="ref-picker-done" onClick={onClose}>
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

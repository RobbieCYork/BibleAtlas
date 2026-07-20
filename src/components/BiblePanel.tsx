import { useEffect, useState } from "react";
import LinkedVerseText from "./LinkedVerseText";
import { BOOKS } from "../data/bibleBooks";

interface BiblePanelProps {
  reference: string | null;
  onClose: () => void;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
}

interface VerseData {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface PassageResult {
  reference: string;
  verses: VerseData[];
  translationName: string;
}

const TRANSLATIONS = [
  { id: "web", label: "World English Bible (WEB)" },
  { id: "kjv", label: "King James Version (KJV)" },
  { id: "asv", label: "American Standard Version (ASV)" },
];

function findBookIndex(name: string): number {
  return BOOKS.findIndex((b) => b.name.toLowerCase() === name.toLowerCase());
}

/** Pulls the book name and chapter number out of any verse reference, e.g. "1 Corinthians 13:4-7" -> {book: "1 Corinthians", chapter: 13}. */
function parseBookChapter(ref: string): { book: string; chapter: number } | null {
  const match = ref.trim().match(/^(.*?)\s+(\d+)(?::\d+(?:-\d+)?)?$/);
  if (!match) return null;
  return { book: match[1].trim(), chapter: parseInt(match[2], 10) };
}

export default function BiblePanel({ reference, onClose, onSelectLocation, onSelectPoi, expand, style }: BiblePanelProps) {
  const [translation, setTranslation] = useState("asv");
  const [inputValue, setInputValue] = useState(reference ?? "");
  const [passage, setPassage] = useState<PassageResult | null>(null);
  const [currentBook, setCurrentBook] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boundaryMessage, setBoundaryMessage] = useState<string | null>(null);

  /** Loads a whole chapter. Returns whether it succeeded, without touching `error` — callers decide how to surface a failure. */
  const loadChapter = async (book: string, chapter: number, translationId: string): Promise<boolean> => {
    if (chapter < 1) return false;
    setLoading(true);
    try {
      const ref = `${book} ${chapter}`;
      const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${translationId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error || !data.verses || data.verses.length === 0) {
        throw new Error(data.error ?? "Chapter not found");
      }
      setPassage({
        reference: data.reference,
        verses: data.verses,
        translationName: data.translation_name ?? translationId.toUpperCase(),
      });
      setCurrentBook(book);
      setCurrentChapter(chapter);
      setInputValue(ref);
      setError(null);
      setBoundaryMessage(null);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  /** Loads the full chapter containing any reference the user typed or a verse link passed in. */
  const loadReference = async (rawRef: string, translationId: string) => {
    const trimmed = rawRef.trim();
    if (!trimmed) return;
    setError(null);
    setBoundaryMessage(null);
    const parsed = parseBookChapter(trimmed);
    const ok = parsed ? await loadChapter(parsed.book, parsed.chapter, translationId) : false;
    if (!ok) {
      setError('Couldn\'t load that passage. Try a format like "John 3:16" or "Acts 18".');
    }
  };

  useEffect(() => {
    if (reference) {
      loadReference(reference, translation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const handleTranslationChange = async (next: string) => {
    setTranslation(next);
    if (currentBook && currentChapter !== null) {
      const ok = await loadChapter(currentBook, currentChapter, next);
      if (!ok) setError("Couldn't load this passage in that translation.");
    } else if (inputValue.trim()) {
      await loadReference(inputValue, next);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReference(inputValue, translation);
  };

  /** True once we know for certain there's no earlier/later chapter to go to (start of Genesis / end of Revelation). */
  const atBibleStart = () => {
    if (!currentBook || currentChapter === null) return false;
    const idx = findBookIndex(currentBook);
    return idx === 0 && currentChapter <= 1;
  };
  const atBibleEnd = () => {
    if (!currentBook || currentChapter === null) return false;
    const idx = findBookIndex(currentBook);
    return idx === BOOKS.length - 1 && currentChapter >= BOOKS[idx].chapters;
  };

  const goToChapter = async (delta: number) => {
    if (!currentBook || currentChapter === null) return;
    const idx = findBookIndex(currentBook);
    let targetBook = currentBook;
    let targetChapter = currentChapter + delta;

    if (idx !== -1 && targetChapter < 1) {
      if (idx === 0) {
        setBoundaryMessage("That's the first chapter of the Bible.");
        return;
      }
      targetBook = BOOKS[idx - 1].name;
      targetChapter = BOOKS[idx - 1].chapters;
    } else if (idx !== -1 && targetChapter > BOOKS[idx].chapters) {
      if (idx === BOOKS.length - 1) {
        setBoundaryMessage("That's the last chapter of the Bible.");
        return;
      }
      targetBook = BOOKS[idx + 1].name;
      targetChapter = 1;
    } else if (targetChapter < 1) {
      // Unknown book (not in the canon table) — can't cross a boundary we don't know the shape of.
      setBoundaryMessage(`That's the first chapter of ${currentBook}.`);
      return;
    }

    const ok = await loadChapter(targetBook, targetChapter, translation);
    if (!ok) {
      setBoundaryMessage(
        delta > 0 ? `Couldn't load the next chapter.` : `Couldn't load the previous chapter.`
      );
    }
  };

  return (
    <div className={`bible-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      <div className="bible-panel-header">
        <h3>Bible</h3>
        <button className="panel-close" onClick={onClose} aria-label="Close Bible panel">
          ×
        </button>
      </div>

      <form className="bible-search" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. John 3:16 or Acts 18"
        />
        <button type="submit">Go</button>
      </form>

      <select
        className="bible-translation-select"
        value={translation}
        onChange={(e) => handleTranslationChange(e.target.value)}
      >
        {TRANSLATIONS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <p className="bible-translation-note">
        NIV isn't freely licensed for embedding, so these public-domain translations are used instead.
        Any reference loads its whole chapter.
      </p>

      {loading && <p className="bible-status">Loading…</p>}
      {error && <p className="bible-status bible-error">{error}</p>}

      {passage && !loading && !error && (
        <div className="bible-passage">
          <div className="bible-passage-header">
            <button
              type="button"
              className="bible-chapter-nav-small"
              onClick={() => goToChapter(-1)}
              disabled={atBibleStart()}
              aria-label="Previous chapter"
              title="Previous chapter"
            >
              ‹
            </button>
            <h4>{passage.reference}</h4>
            <button
              type="button"
              className="bible-chapter-nav-small"
              onClick={() => goToChapter(1)}
              disabled={atBibleEnd()}
              aria-label="Next chapter"
              title="Next chapter"
            >
              ›
            </button>
          </div>
          <div className="bible-verses">
            {passage.verses.map((v) => (
              <p key={`${v.chapter}:${v.verse}`}>
                <span className="bible-verse-num">{v.verse}</span>
                <LinkedVerseText text={v.text.trim()} onSelectLocation={onSelectLocation} onSelectPoi={onSelectPoi} />
              </p>
            ))}
          </div>

          <div className="bible-chapter-nav">
            <button
              type="button"
              onClick={() => goToChapter(-1)}
              disabled={atBibleStart()}
            >
              ← Previous Chapter
            </button>
            <button type="button" onClick={() => goToChapter(1)} disabled={atBibleEnd()}>
              Next Chapter →
            </button>
          </div>
          {boundaryMessage && <p className="bible-status">{boundaryMessage}</p>}

          <p className="bible-translation-credit">{passage.translationName}, Public Domain</p>
        </div>
      )}

      {!passage && !loading && !error && (
        <p className="bible-status">Search a reference, or tap a verse in a location's panel.</p>
      )}
    </div>
  );
}

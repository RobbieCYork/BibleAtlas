import { useEffect, useRef, useState } from "react";
import LinkedVerseText from "./LinkedVerseText";
import { BOOKS } from "../data/bibleBooks";
import { supabase } from "../lib/supabase";

interface BiblePanelProps {
  reference: string | null;
  onClose: () => void;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
  /** Signed-in (or guest) user id — when set, every chapter load is saved as their reading position. */
  userId?: string | null;
  /** One-shot translation to apply the next time `reference` changes — used to restore a saved position. */
  restoreTranslation?: string;
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

interface SearchHit {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

const TRANSLATIONS = [
  { id: "web", label: "World English Bible (WEB)" },
  { id: "kjv", label: "King James Version (KJV)" },
  { id: "asv", label: "American Standard Version (ASV)" },
];

const MAX_SEARCH_RESULTS = 30;

function findBookIndex(name: string): number {
  return BOOKS.findIndex((b) => b.name.toLowerCase() === name.toLowerCase());
}

/** Pulls the book name and chapter number out of any verse reference, e.g. "1 Corinthians 13:4-7" -> {book: "1 Corinthians", chapter: 13}. */
function parseBookChapter(ref: string): { book: string; chapter: number } | null {
  const match = ref.trim().match(/^(.*?)\s+(\d+)(?::\d+(?:-\d+)?)?$/);
  if (!match) return null;
  return { book: match[1].trim(), chapter: parseInt(match[2], 10) };
}

/** Strips the Strong's-number and match-highlight markup bolls.life embeds in search result text. */
function cleanSearchText(raw: string): string {
  return raw.replace(/<S>\d+<\/S>/g, "").replace(/<\/?mark>/g, "");
}

export default function BiblePanel({
  reference,
  onClose,
  onSelectLocation,
  onSelectPoi,
  expand,
  style,
  userId,
  restoreTranslation,
}: BiblePanelProps) {
  const [translation, setTranslation] = useState("asv");
  const [passage, setPassage] = useState<PassageResult | null>(null);
  const [currentBook, setCurrentBook] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boundaryMessage, setBoundaryMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingScrollVerse, setPendingScrollVerse] = useState<number | null>(null);
  const verseRefs = useRef<Record<number, HTMLParagraphElement | null>>({});

  /** Fire-and-forget save of the current reading position — failures are logged, not surfaced (saving shouldn't interrupt reading). */
  const saveProgress = (book: string, chapter: number, translationId: string) => {
    if (!userId) return;
    supabase
      .from("reading_progress")
      .upsert({ user_id: userId, book, chapter, translation: translationId, updated_at: new Date().toISOString() })
      .then(({ error: saveError }) => {
        if (saveError) console.error("Failed to save reading progress:", saveError.message);
      });
  };

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
      setError(null);
      setBoundaryMessage(null);
      saveProgress(book, chapter, translationId);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  /** Loads the full chapter containing any reference typed elsewhere in the app (e.g. a verse link). */
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
      // restoreTranslation arrives once, asynchronously, when a saved position is fetched after
      // login — apply it for this load instead of whatever the (still-default) translation state is.
      const effectiveTranslation = restoreTranslation ?? translation;
      if (restoreTranslation) setTranslation(restoreTranslation);
      loadReference(reference, effectiveTranslation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, restoreTranslation]);

  // Scroll to a verse once its chapter has finished loading and rendering (used after jumping
  // in from a keyword search result, which lands on a specific verse within a whole new chapter).
  useEffect(() => {
    if (pendingScrollVerse !== null && passage) {
      verseRefs.current[pendingScrollVerse]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingScrollVerse(null);
    }
  }, [passage, pendingScrollVerse]);

  const handleTranslationChange = async (next: string) => {
    setTranslation(next);
    if (currentBook && currentChapter !== null) {
      const ok = await loadChapter(currentBook, currentChapter, next);
      if (!ok) setError("Couldn't load this passage in that translation.");
    }
  };

  const handleBookChange = (bookName: string) => {
    if (!bookName) return;
    loadChapter(bookName, 1, translation);
  };

  const handleChapterChange = (chapterNum: number) => {
    if (!currentBook) return;
    loadChapter(currentBook, chapterNum, translation);
  };

  const handleVerseJump = (verseNum: number) => {
    verseRefs.current[verseNum]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const url = `https://bolls.life/find/${translation.toUpperCase()}/?search=${encodeURIComponent(q)}&match_case=false&match_whole=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      const data: SearchHit[] = await res.json();
      setSearchResults(data.slice(0, MAX_SEARCH_RESULTS));
    } catch {
      setSearchError("Couldn't search right now — try again in a moment.");
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchResultClick = async (hit: SearchHit) => {
    const bookName = BOOKS[hit.book - 1]?.name;
    if (!bookName) return;
    const ok = await loadChapter(bookName, hit.chapter, translation);
    if (ok) {
      setPendingScrollVerse(hit.verse);
      setSearchResults(null);
      setSearchQuery("");
    }
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

  const currentBookInfo = currentBook ? BOOKS.find((b) => b.name === currentBook) : undefined;

  return (
    <div className={`bible-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      <div className="bible-panel-header">
        <h3>Bible</h3>
        <button className="panel-close" onClick={onClose} aria-label="Close Bible panel">
          ×
        </button>
      </div>

      <p className="bible-status">Pick a book below, or search for a word or phrase.</p>

      <div className="bible-nav">
        <select
          className="bible-nav-select"
          aria-label="Book"
          value={currentBook ?? ""}
          onChange={(e) => handleBookChange(e.target.value)}
        >
          <option value="" disabled>
            Book…
          </option>
          {BOOKS.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          className="bible-nav-select bible-nav-select-narrow"
          aria-label="Chapter"
          value={currentChapter ?? ""}
          onChange={(e) => handleChapterChange(Number(e.target.value))}
          disabled={!currentBookInfo}
        >
          <option value="" disabled>
            Ch.
          </option>
          {currentBookInfo &&
            Array.from({ length: currentBookInfo.chapters }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
        </select>
        <select
          key={currentChapter ?? "no-chapter"}
          className="bible-nav-select bible-nav-select-narrow"
          aria-label="Jump to verse"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) handleVerseJump(Number(e.target.value));
          }}
          disabled={!passage}
        >
          <option value="" disabled>
            Verse…
          </option>
          {passage?.verses.map((v) => (
            <option key={v.verse} value={v.verse}>
              {v.verse}
            </option>
          ))}
        </select>
      </div>

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

      <form className="bible-keyword-search" onSubmit={handleSearch}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Scripture for a word or phrase…"
        />
        <button type="submit" disabled={searching}>
          {searching ? "…" : "Search"}
        </button>
      </form>

      {searchError && <p className="bible-status bible-error">{searchError}</p>}

      {searchResults && (
        <div className="bible-search-results">
          <div className="bible-search-results-header">
            <span>{searchResults.length === 0 ? "No matches" : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}</span>
            <button type="button" className="bible-search-results-clear" onClick={() => setSearchResults(null)}>
              Clear
            </button>
          </div>
          <ul>
            {searchResults.map((hit) => {
              const bookName = BOOKS[hit.book - 1]?.name;
              if (!bookName) return null;
              return (
                <li key={`${hit.book}-${hit.chapter}-${hit.verse}`}>
                  <button type="button" onClick={() => handleSearchResultClick(hit)}>
                    <span className="bible-search-result-ref">
                      {bookName} {hit.chapter}:{hit.verse}
                    </span>
                    <span className="bible-search-result-text">{cleanSearchText(hit.text)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {loading && <p className="bible-status">Loading…</p>}
      {error && <p className="bible-status bible-error">{error}</p>}

      {passage && !loading && !error && !searchResults && (
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
              <p
                key={`${v.chapter}:${v.verse}`}
                ref={(el) => {
                  verseRefs.current[v.verse] = el;
                }}
              >
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
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { chapterCount, matchBooks, suggestReference } from "../lib/bibleReference";
import {
  DEFAULT_TRANSLATION,
  PASSAGE_TIMEOUT_MS,
  fetchPassage,
  formatVerseReference,
  passageToPlainText,
} from "../lib/biblePassage";

interface ScriptureInsertPickerProps {
  /** Reports the finished quotation upward. The reference is already formatted for the page. */
  onInsert: (reference: string, passage: string) => void;
  onCancel: () => void;
}

/* ============================================================================
 * "Insert Scripture", from the sermon-notes editor.
 *
 * ── THE MOMENT THIS IS BUILT FOR ───────────────────────────────────────────
 * Someone is standing in a service with a phone, typing as fast as they can, and the preacher has
 * just said "John three sixteen". They have perhaps eight seconds before the next sentence they
 * need to catch. Every decision below is that constraint:
 *
 *   - It is NOT a modal. It expands in place between the notes box and the footer, so the note is
 *     still on screen, the caret is still where it was, and nothing has to be restored afterwards.
 *     A sheet over the note would hide the sentence they were half way through writing.
 *   - The book field takes a WHOLE reference. Typing "john 3:16" and pressing Enter fills the
 *     chapter and verse and quotes the passage — one field, one key. The separate chapter and verse
 *     boxes are for the reader who prefers to tab through them, not a toll everyone pays.
 *   - Book suggestions appear from the first letter and are tappable, because "j" -> "John" is two
 *     characters instead of four and, on a phone keyboard, a tap instead of a guess.
 *   - Enter moves forward through the fields and submits from the last one, so the whole thing can
 *     be done without the screen being touched again after the first tap.
 *
 * ── WHAT IT REUSES ─────────────────────────────────────────────────────────
 * All of the hard parts already existed and none of them are reimplemented here. matchBooks() and
 * suggestReference() (lib/bibleReference) own every rule about what "1cor", "mt" and "phile" mean;
 * fetchPassage() (lib/biblePassage) is the same call the reader's own Bible panel makes;
 * buildScriptureHtml() (lib/richText) owns the markup. This file is the form and nothing else.
 *
 * ── WHEN THE NETWORK IS THE PROBLEM ────────────────────────────────────────
 * A congregation shares one overloaded cell. The fetch is on a timeout, the picker stays open and
 * usable while it runs, and a failure offers the reference on its own — a note that says
 * "John 3:16" and nothing more is still the note they were trying to write, and is infinitely
 * better than a spinner that ate their place in the sermon. Nothing here can lose or block the
 * note, because nothing here touches it until a passage is actually in hand.
 * ==========================================================================*/
export default function ScriptureInsertPicker({ onInsert, onCancel }: ScriptureInsertPickerProps) {
  const [bookText, setBookText] = useState("");
  const [chapter, setChapter] = useState("");
  const [startVerse, setStartVerse] = useState("");
  const [endVerse, setEndVerse] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  /** The reference the failed attempt was for, so "insert the reference anyway" knows what to write
   * even if the fields have been touched since. */
  const [failedRef, setFailedRef] = useState<string | null>(null);

  const bookRef = useRef<HTMLInputElement | null>(null);
  const chapterRef = useRef<HTMLInputElement | null>(null);
  const startRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bookRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const suggestions = matchBooks(bookText, 5);
  const book = suggestions[0] ?? null;
  const chapters = book ? chapterCount(book) : null;
  const ready = !!book && !!chapter.trim() && !!startVerse.trim();

  const digitsOnly = (value: string) => value.replace(/[^0-9]/g, "");

  /** Pulls a whole reference out of whatever is in the book field, if there is one there.
   *
   * Runs on Enter and on the Insert button, never on every keystroke: absorbing mid-word would
   * rewrite the field under someone's thumb halfway through "john 3:16" and leave them typing the
   * verse into a field that had already become "John". */
  const absorbTypedReference = (): boolean => {
    const parsed = suggestReference(bookText);
    if (!parsed || !parsed.explicitChapter) return false;
    setBookText(parsed.book);
    setChapter(String(parsed.chapter));
    if (parsed.verse) setStartVerse(String(parsed.verse));
    if (parsed.endVerse) setEndVerse(String(parsed.endVerse));
    return !!parsed.verse;
  };

  const chooseBook = (name: string) => {
    setBookText(name);
    setStatus("idle");
    chapterRef.current?.focus();
  };

  const handleBookKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const parsed = suggestReference(bookText);
    if (parsed?.explicitChapter) {
      absorbTypedReference();
      // A whole reference in this one field is the fast path: one field, one key, done. The values
      // come from `parsed` rather than from the state just set, because that state has not landed
      // yet — this is the same render.
      if (parsed.verse) {
        void insert(String(parsed.chapter), String(parsed.verse), parsed.endVerse ? String(parsed.endVerse) : "");
        return;
      }
      // A book and chapter but no verse: they are still typing the reference, so meet them at the
      // next thing they have to fill in.
      startRef.current?.focus();
      return;
    }
    if (ready) {
      void insert(chapter, startVerse, endVerse);
      return;
    }
    if (book) chooseBook(book);
  };

  const insert = async (rawChapter: string, rawStart: string, rawEnd: string) => {
    if (!book) {
      bookRef.current?.focus();
      return;
    }
    const chapterNum = Math.min(Math.max(parseInt(rawChapter, 10) || 1, 1), chapters ?? 150);
    const start = Math.max(parseInt(rawStart, 10) || 1, 1);
    const parsedEnd = parseInt(rawEnd, 10);
    // An end verse below the start is a typo, not a backwards range: drop it and quote the one
    // verse rather than asking about it.
    const end = Number.isFinite(parsedEnd) && parsedEnd > start ? parsedEnd : null;
    const reference = formatVerseReference(book, chapterNum, start, end);

    setStatus("loading");
    setFailedRef(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PASSAGE_TIMEOUT_MS);
    try {
      const result = await fetchPassage(reference, DEFAULT_TRANSLATION, controller.signal);
      const text = passageToPlainText(result.verses);
      if (!text) throw new Error("Empty passage");
      onInsert(`${reference} (${DEFAULT_TRANSLATION.toUpperCase()})`, text);
    } catch {
      setStatus("error");
      setFailedRef(reference);
      return;
    } finally {
      clearTimeout(timer);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;
    // Someone who typed the whole reference into the book field and then hit the button rather than
    // Enter gets the same result as Enter would have given them.
    const parsed = suggestReference(bookText);
    if (parsed?.explicitChapter && parsed.verse && !startVerse.trim()) {
      absorbTypedReference();
      void insert(String(parsed.chapter), String(parsed.verse), parsed.endVerse ? String(parsed.endVerse) : "");
      return;
    }
    if (!ready) return;
    void insert(chapter, startVerse, endVerse);
  };

  const showSuggestions = suggestions.length > 0 && suggestions[0].toLowerCase() !== bookText.trim().toLowerCase();

  return (
    <form className="scripture-picker no-print" onSubmit={handleSubmit} aria-label="Insert scripture">
      <div className="scripture-picker-head">
        <span className="scripture-picker-title">Insert Scripture</span>
        <button type="button" className="scripture-picker-close" onClick={onCancel} aria-label="Close">
          <Icon name="close" inline />
        </button>
      </div>

      <div className="scripture-picker-fields">
        <label className="scripture-picker-book">
          <span className="scripture-picker-label">Book</span>
          <input
            ref={bookRef}
            type="text"
            value={bookText}
            onChange={(e) => {
              setBookText(e.target.value);
              setStatus("idle");
            }}
            onKeyDown={handleBookKeyDown}
            placeholder="John — or “John 3:16”"
            autoCapitalize="words"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label="Book"
          />
        </label>
        <label className="scripture-picker-num">
          <span className="scripture-picker-label">Chapter</span>
          <input
            ref={chapterRef}
            type="text"
            inputMode="numeric"
            value={chapter}
            onChange={(e) => setChapter(digitsOnly(e.target.value))}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              startRef.current?.focus();
            }}
            placeholder={chapters ? `1–${chapters}` : "—"}
            aria-label="Chapter"
          />
        </label>
        <label className="scripture-picker-num">
          <span className="scripture-picker-label">Verse</span>
          <input
            ref={startRef}
            type="text"
            inputMode="numeric"
            value={startVerse}
            onChange={(e) => setStartVerse(digitsOnly(e.target.value))}
            placeholder="16"
            aria-label="First verse"
          />
        </label>
        <label className="scripture-picker-num">
          {/* "to" rather than "End verse": it is optional, and a labelled pair of boxes reading
              "Verse 16 to —" says that without a sentence of help text. */}
          <span className="scripture-picker-label">to</span>
          <input
            type="text"
            inputMode="numeric"
            value={endVerse}
            onChange={(e) => setEndVerse(digitsOnly(e.target.value))}
            placeholder="opt."
            aria-label="Last verse (optional)"
          />
        </label>
      </div>

      {showSuggestions && (
        <div className="scripture-picker-suggestions" role="listbox" aria-label="Matching books">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={name === bookText}
              className="scripture-picker-suggestion"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chooseBook(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {status === "error" && failedRef && (
        <p className="scripture-picker-error">
          Couldn’t load {failedRef}.{" "}
          <button type="button" className="scripture-picker-linkish" onClick={() => onInsert(failedRef, "")}>
            Insert the reference on its own
          </button>
          , or try again.
        </p>
      )}

      <div className="scripture-picker-actions">
        <button type="submit" className="scripture-picker-go" disabled={status === "loading" || (!ready && !suggestReference(bookText)?.verse)}>
          {status === "loading" ? "Fetching…" : "Insert"}
        </button>
        <button type="button" className="scripture-picker-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

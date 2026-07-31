import { useEffect, useRef, useState } from "react";
import VerseText from "./VerseText";
import type { ClippedHighlight } from "./VerseText";
import TagPicker from "./TagPicker";
import InlinePicker, { type PickerHandle } from "./InlinePicker";
import BookIntroView from "./BookIntroView";
import ReadingPlansView from "./ReadingPlansView";
import { BOOKS } from "../data/bibleBooks";
import { READING_PLANS, formatPlanDayReference, type ReadingPlan, type ReadingPlanDay } from "../data/readingPlans";
import {
  supabase,
  chapterReadCutoff,
  fetchPlanProgress,
  flushReadingTimeReliably,
  formatReadingTime,
  mergeLocalPlanProgress,
  setPlanDayDone,
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type Highlight,
  type Note,
  type Tag,
  type VerseTag,
  type Profile,
} from "../lib/supabase";
import { getTextOffsetInRoot } from "../lib/domTextOffset";
import { CHAPTER_AUDIO_CREDIT, chapterAudioUrl, fallbackChapterAudioUrl } from "../lib/chapterAudio";
import { clipRangeForVerse } from "../lib/verseRange";
import { shareFilename, verseCardSpec, type ShareCardSpec } from "../lib/shareCard";
import ShareCardModal from "./ShareCardModal";

interface BiblePanelProps {
  reference: string | null;
  /** Bumped by the caller on every "go to this reference" request — the load effect keys off this
   * (in addition to `reference`) so re-navigating to the same reference string still triggers a load. */
  referenceNonce?: number;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  /** Plan-day variants of the two map-focus callbacks above: same pin focus, but on mobile the
   * reader stays on the Bible tab — the tap's primary intent is reading the day's passage, so the
   * map focus happens silently in the background. */
  onPlanDaySelectLocation: (id: string) => void;
  onPlanDaySelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onSelectTopic: (id: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
  /** Signed-in (or guest) user id — when set, every chapter load is saved as their reading position,
   * and highlights/notes for the current chapter are loaded and can be created. */
  userId?: string | null;
  /** One-shot translation to apply the next time `reference` changes — used to restore a saved position. */
  restoreTranslation?: string;
  /** Kept mounted but visually hidden (rather than unmounted) so book/chapter/search state survives
   * switching to another mobile tab and back. */
  hidden?: boolean;
  /** Called after a note, tag, or verse-tag is saved/deleted, so the My Notes panel (which fetches
   * once on mount) knows to refetch. */
  onNotesChanged?: () => void;
  /** Word/phrase search now lives in the app header (only shown while Bible is the active panel) —
   * these mirror the reference/referenceNonce pattern so submitting there (Enter key) runs a search
   * here without duplicating the search UI inside the panel itself. */
  externalSearchQuery?: string;
  externalSearchNonce?: number;
  /** One-shot request from a details-panel reflection prompt's "Journal this" (see App): once the
   * request's reference has loaded as the current chapter, open the note composer anchored to that
   * reference's first verse with the prompt quoted into the draft. The nonce makes journaling the
   * same prompt twice still re-trigger. */
  journalRequest?: { reference: string; prompt: string; nonce: number } | null;
  /** Bumped by the mobile "More" sheet's "Reading Plans" entry and the desktop account-menu
   * equivalent (see App/MobileTabBar/AuthButton) — pops this panel straight to the Reading Plans
   * view, resuming whichever plan was last open. Undefined until first triggered so mounting doesn't
   * switch away from whatever's currently being read. */
  openReadingPlansRequest?: number;
  /** One-shot request from the Timeline's Books-of-the-Bible band — opens straight to that book's
   * Introduction (see handleBookSelect/handleChapterSelect below for the same setCurrentBook +
   * setShowIntro pair, triggered here for a book that may not currently be selected at all). */
  openBookIntroRequest?: { book: string; nonce: number } | null;
  /** Set only while the currently-open Book Introduction was reached via the Timeline's
   * Books-of-the-Bible band (App gates this on its detailsHistory back-trail) — passed straight
   * through to BookIntroView as its "Back to Timeline" affordance. */
  onBookIntroBack?: () => void;
  /** True while App is still resolving the session and (for a signed-in user) any saved reading
   * position — holds back the cold-start welcome screen below so a returning reader doesn't see it
   * flash before their restored chapter lands. See App's bibleInitializing. */
  initializing?: boolean;
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

/** Everything the bottom action sheet can be showing at once. A selection/note/tag can span more
 * than one verse (start_verse..end_verse) — offsets are relative to their own verse's text. */
type PopupState =
  | {
      kind: "selection";
      startVerse: number;
      startOffset: number;
      endVerse: number;
      endOffset: number;
      /** True once we've cleared the native selection on touchend (so iOS has nothing left to show its
       * Copy/Look Up menu over) and swapped in our own preview mark in its place. Must stay false/absent
       * while a native selection is still live — mutating the DOM under an active native selection
       * causes the browser to reset/corrupt it (see the touchend handler below). */
      viaTouch?: boolean;
    }
  | { kind: "note-editor"; startVerse: number; startOffset: number; endVerse: number; endOffset: number; quotedText: string }
  | { kind: "highlight-actions"; highlight: Highlight }
  | { kind: "verse-notes"; verse: number }
  | { kind: "tag-picker"; startVerse: number; endVerse: number };

/** bible-api.com's reference parser treats "<Book> 1" as verse 1 (not "chapter 1, every verse") for
 * every book that has only a single chapter — since "1" alone is genuinely ambiguous between chapter
 * and verse there. Requesting an explicit verse range sidesteps it; each book's last verse number is
 * listed here (confirmed against the API itself: the number requested is valid, N+1 is not). */
const SINGLE_CHAPTER_BOOK_LAST_VERSE: Record<string, number> = {
  Obadiah: 21,
  Philemon: 25,
  "2 John": 13,
  "3 John": 14,
  Jude: 25,
};

const TRANSLATIONS = [
  { id: "web", label: "World English Bible (WEB)" },
  { id: "kjv", label: "King James Version (KJV)" },
  { id: "asv", label: "American Standard Version (ASV)" },
];

const MAX_SEARCH_RESULTS = 30;

/** Whether the chapter-audio bar was left open — restored on load so a listener's setup survives
 * a refresh (restoring never autoplays; playback always waits for a fresh press of play). */
const AUDIO_BAR_OPEN_KEY = "bible-audio-bar-open";

function findBookIndex(name: string): number {
  return BOOKS.findIndex((b) => b.name.toLowerCase() === name.toLowerCase());
}

/** Pulls the book name, chapter number, and (when present) first verse number out of any verse
 * reference, e.g. "1 Corinthians 13:4-7" -> {book: "1 Corinthians", chapter: 13, verse: 4}. */
function parseBookChapter(ref: string): { book: string; chapter: number; verse?: number } | null {
  const match = ref.trim().match(/^(.*?)\s+(\d+)(?::(\d+)(?:-\d+)?)?$/);
  if (!match) return null;
  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verse: match[3] ? parseInt(match[3], 10) : undefined,
  };
}

/** Strips the Strong's-number and match-highlight markup bolls.life embeds in search result text. */
function cleanSearchText(raw: string): string {
  return raw.replace(/<S>\d+<\/S>/g, "").replace(/<\/?mark>/g, "");
}

export default function BiblePanel({
  reference,
  referenceNonce,
  onSelectLocation,
  onSelectPoi,
  onPlanDaySelectLocation,
  onPlanDaySelectPoi,
  onSelectPerson,
  onSelectTopic,
  expand,
  style,
  userId,
  restoreTranslation,
  hidden,
  onNotesChanged,
  externalSearchQuery,
  externalSearchNonce,
  journalRequest,
  openReadingPlansRequest,
  openBookIntroRequest,
  onBookIntroBack,
  initializing,
}: BiblePanelProps) {
  const [translation, setTranslation] = useState("web");
  const [passage, setPassage] = useState<PassageResult | null>(null);
  const [currentBook, setCurrentBook] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boundaryMessage, setBoundaryMessage] = useState<string | null>(null);
  /** True while showing the selected book's Introduction (an entry in the chapter picker) instead
   * of a loaded chapter. currentChapter/passage are left untouched while true, so leaving the intro
   * (picking a real chapter, or a key-passage link) can resume exactly where reading left off. */
  const [showIntro, setShowIntro] = useState(false);
  /** True while showing the Reading Plans view instead of a loaded chapter — same state-driven view
   * swap as showIntro above, so leaving the plans (loading any chapter) resumes reading in place. */
  const [showPlans, setShowPlans] = useState(false);
  /** Which plan's day list the plans view has open (null = the plan cards). Kept here, not in
   * ReadingPlansView, so jumping out to read a day and coming back lands on the same plan. */
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  /** Completed day numbers per plan id — localStorage for guests, Supabase (with a silent
   * localStorage fallback while the table doesn't exist) once logged in. */
  const [planProgress, setPlanProgress] = useState<Record<string, number[]>>({});
  const chapterPickerRef = useRef<PickerHandle>(null);
  const versePickerRef = useRef<PickerHandle>(null);

  const [searchResults, setSearchResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingScrollVerse, setPendingScrollVerse] = useState<number | null>(null);
  /** Verse currently wearing the temporary "you landed here" background flash — set alongside the
   * pending scroll so a deep link lands the eye on the exact verse, cleared once the flash ends. */
  const [flashVerse, setFlashVerse] = useState<number | null>(null);
  const verseRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
  const textRefs = useRef<Record<number, HTMLSpanElement | null>>({});

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [verseTags, setVerseTags] = useState<VerseTag[]>([]);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [newTagName, setNewTagName] = useState("");
  /** Set when the verse-selection popup's Share action is used — ShareCardModal owns its own
   * open/closed state elsewhere in the app (see ShareCardButton), but the popup here calls
   * verseCardSpec() directly instead of going through that button, so this panel renders the modal
   * itself. Kept separate from `popup` (which closes on selection change) so the modal survives that. */
  const [shareCardSpec, setShareCardSpec] = useState<ShareCardSpec | null>(null);

  // Whether the currently-loaded chapter is marked read by this account, and this account's total
  // seconds read so far this calendar month (both visible to friends too — see chapter_reads/
  // reading_time_daily RLS). Both are chapter/account-scoped, so they're refetched on either change.
  // Kept as raw seconds (not pre-divided minutes) so a session under a minute still shows real
  // progress instead of a flat "0" — see formatReadingTime for the display formatting.
  const [chapterMarkedRead, setChapterMarkedRead] = useState(false);
  const [secondsThisMonth, setSecondsThisMonth] = useState<number | null>(null);
  /** This account's chapter_read_reset setting (see Settings) — fetched once per login, used to decide
   * whether an old chapter_reads row still counts as "read" for the checkbox above. */
  const [chapterReadReset, setChapterReadReset] = useState<Profile["chapter_read_reset"]>("never");

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

  /** Loads this account's highlights (translation-specific — offsets only make sense for the exact
   * text they were made against), notes, and verse tags (both shown regardless of translation) for one chapter. */
  const fetchAnnotations = async (book: string, chapter: number, translationId: string) => {
    if (!userId) {
      setHighlights([]);
      setNotes([]);
      setVerseTags([]);
      return;
    }
    const [hlRes, notesRes, verseTagsRes] = await Promise.all([
      supabase.from("highlights").select("*").eq("user_id", userId).eq("book", book).eq("chapter", chapter).eq("translation", translationId),
      supabase.from("notes").select("*").eq("user_id", userId).eq("book", book).eq("chapter", chapter),
      supabase.from("verse_tags").select("*").eq("user_id", userId).eq("book", book).eq("chapter", chapter),
    ]);
    setHighlights((hlRes.data as Highlight[] | null) ?? []);
    setNotes((notesRes.data as Note[] | null) ?? []);
    setVerseTags((verseTagsRes.data as VerseTag[] | null) ?? []);
  };

  /** Loads this account's full custom-tag list — not chapter-scoped, so it's fetched once per login state. */
  const fetchTags = async () => {
    if (!userId) {
      setTags([]);
      return;
    }
    const { data } = await supabase.from("tags").select("*").eq("user_id", userId).order("name");
    setTags((data as Tag[] | null) ?? []);
  };

  // Re-fetch highlights/notes/tags for the current chapter when login state changes (e.g. after signing in).
  useEffect(() => {
    fetchTags();
    if (currentBook && currentChapter !== null) fetchAnnotations(currentBook, currentChapter, translation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reading-plan progress, refetched on login state changes. On login, any days checked off while
  // logged out are first merged into Supabase (best-effort) so they follow the account.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (userId) await mergeLocalPlanProgress(userId, READING_PLANS.map((p) => p.id));
      const entries = await Promise.all(
        READING_PLANS.map(async (p) => [p.id, await fetchPlanProgress(userId, p.id)] as const)
      );
      if (!cancelled) setPlanProgress(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Optimistic toggle of one plan day's checkmark — the persistence layer (localStorage always,
   * Supabase when logged in) is fire-and-forget, same as saveProgress above. */
  const handleTogglePlanDay = (planId: string, dayNumber: number) => {
    const wasDone = (planProgress[planId] ?? []).includes(dayNumber);
    setPlanProgress((prev) => {
      const days = prev[planId] ?? [];
      return { ...prev, [planId]: wasDone ? days.filter((d) => d !== dayNumber) : [...days, dayNumber] };
    });
    setPlanDayDone(userId, planId, dayNumber, !wasDone);
  };

  /** Opening a plan day drives the normal go-to-reference path (chapter load + verse scroll/flash),
   * and focuses the day's place on the map when the plan ties one to it — via the plan-day variants,
   * which on mobile keep the reader on the Bible tab so the passage (the tap's primary intent) shows. */
  const handleSelectPlanDay = (_plan: ReadingPlan, day: ReadingPlanDay) => {
    setShowPlans(false);
    loadReference(formatPlanDayReference(day), translation);
    if (day.locationId) onPlanDaySelectLocation(day.locationId);
    else if (day.poiId) onPlanDaySelectPoi(day.poiId);
  };

  const openPlansView = (planId: string | null) => {
    setOpenPlanId(planId);
    setShowPlans(true);
    setShowIntro(false);
  };

  // External request to open Reading Plans (mobile "More" sheet, desktop account menu) — resumes
  // whichever plan was last open, same as re-tapping the old toolbar chip.
  useEffect(() => {
    if (openReadingPlansRequest === undefined) return;
    openPlansView(openPlanId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReadingPlansRequest]);

  // External request to open a specific book's Introduction (Timeline's Books-of-the-Bible band).
  useEffect(() => {
    if (!openBookIntroRequest) return;
    setCurrentBook(openBookIntroRequest.book);
    setShowIntro(true);
    setShowPlans(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBookIntroRequest]);

  // Fetched once per login — governs whether an old chapter_reads row still counts below.
  useEffect(() => {
    if (!userId) {
      setChapterReadReset("never");
      return;
    }
    supabase
      .from("profiles")
      .select("chapter_read_reset")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setChapterReadReset((data as { chapter_read_reset: Profile["chapter_read_reset"] } | null)?.chapter_read_reset ?? "never");
      });
  }, [userId]);

  /** Whether this exact chapter has already been marked read (and not yet aged past this account's
   * reset window), for the "Mark chapter as read" checkbox. */
  const fetchChapterReadState = async (book: string, chapter: number) => {
    if (!userId) {
      setChapterMarkedRead(false);
      return;
    }
    let query = supabase.from("chapter_reads").select("book").eq("user_id", userId).eq("book", book).eq("chapter", chapter);
    const cutoff = chapterReadCutoff(chapterReadReset);
    if (cutoff) query = query.gte("read_at", cutoff);
    const { data } = await query.maybeSingle();
    setChapterMarkedRead(!!data);
  };

  useEffect(() => {
    if (currentBook && currentChapter !== null) fetchChapterReadState(currentBook, currentChapter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentBook, currentChapter, chapterReadReset]);

  const handleToggleChapterRead = async () => {
    if (!userId || !currentBook || currentChapter === null) return;
    const next = !chapterMarkedRead;
    setChapterMarkedRead(next); // optimistic — this is a personal checklist, not worth a loading state
    if (next) {
      // Upsert, not insert — re-checking a chapter that's already read but aged past the reset window
      // (row still exists, just too old to count) must refresh read_at rather than hit a duplicate key.
      await supabase
        .from("chapter_reads")
        .upsert({ user_id: userId, book: currentBook, chapter: currentChapter, read_at: new Date().toISOString() });
    } else {
      await supabase.from("chapter_reads").delete().eq("user_id", userId).eq("book", currentBook).eq("chapter", currentChapter);
    }
  };

  const fetchSecondsThisMonth = async (forUserId: string) => {
    const { data } = await supabase.rpc("reading_seconds_this_month", { p_user_id: forUserId });
    setSecondsThisMonth(typeof data === "number" ? data : 0);
  };

  useEffect(() => {
    if (userId) fetchSecondsThisMonth(userId);
    else setSecondsThisMonth(null);
  }, [userId]);

  // Reading-time heartbeat — tracks real elapsed foreground time via Date.now() deltas (not fixed-size
  // ticks), so a reading session shorter than one flush interval still gets credited instead of being
  // silently lost. Flushes periodically through the normal Supabase client while the tab stays open,
  // and immediately through a keepalive-fetch fallback (flushReadingTimeReliably) whenever the page
  // might be about to close or reload — a tab switch, the app backgrounding, or a PWA update swapping
  // in a new build — since a plain fetch can be cancelled mid-flight during teardown but a keepalive
  // one is guaranteed to still be sent.
  useEffect(() => {
    if (!userId || !passage || hidden) return;
    const FLUSH_INTERVAL_MS = 15000;
    let visibleSince = document.visibilityState === "visible" ? Date.now() : null;

    const applyToDisplay = (wholeSeconds: number) => {
      setSecondsThisMonth((s) => (s ?? 0) + wholeSeconds);
    };

    const flush = (reliable: boolean) => {
      if (visibleSince === null) return;
      const elapsed = Math.round((Date.now() - visibleSince) / 1000);
      visibleSince = Date.now();
      if (elapsed < 1) return;
      if (reliable) flushReadingTimeReliably(elapsed);
      else supabase.rpc("increment_reading_time", { p_seconds: elapsed });
      applyToDisplay(elapsed);
    };

    const interval = window.setInterval(() => flush(false), FLUSH_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush(true);
        visibleSince = null;
      } else {
        visibleSince = Date.now();
      }
    };
    const handlePageHide = () => flush(true);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      flush(true); // e.g. navigating to a different chapter — shouldn't lose whatever had accrued
    };
  }, [userId, passage, hidden]);

  // A stray popup from the previous chapter/tab makes no sense once either changes.
  useEffect(() => {
    setPopup(null);
  }, [currentBook, currentChapter, hidden]);

  // --- Chapter audio (human-narrated WEB recording — see src/lib/chapterAudio.ts) ---

  /** Whether the sticky audio bar is open. Restored from localStorage so the preference survives
   * reloads; audio itself only ever starts from an explicit press of play (or auto-advance). */
  const [audioOpen, setAudioOpen] = useState(() => localStorage.getItem(AUDIO_BAR_OPEN_KEY) === "1");
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  /** True while the reader is actually listening (play/pause events) — a chapter change mid-
   * playback (manual nav or auto-advance) then continues seamlessly into the new chapter, while
   * navigating with the player paused stays paused. */
  const isPlayingRef = useRef(false);
  /** One-shot autoplay intents: pressing "Listen" open, and auto-advance after a chapter ends. */
  const shouldAutoplayRef = useRef(false);
  /** Guards the error handler so the eBible.org fallback is tried at most once per chapter. */
  const triedFallbackRef = useRef(false);
  /** Mirrors the chapter currently shown, for async audio callbacks to detect navigation —
   * comparing against the book/chapter state captured in the same closure is always true. */
  const audioChapterRef = useRef<{ book: string; chapter: number } | null>(null);
  useEffect(() => {
    audioChapterRef.current =
      currentBook !== null && currentChapter !== null ? { book: currentBook, chapter: currentChapter } : null;
  }, [currentBook, currentChapter]);

  const audioEligible = translation === "web" && !!passage && !!currentBook && currentChapter !== null;

  // Point the player at the current chapter's primary URL whenever the bar is open. The bar (and
  // the <audio> element with it) unmounts when closed or when the translation isn't WEB, which is
  // also what stops playback.
  useEffect(() => {
    if (!audioOpen || !audioEligible || !currentBook || currentChapter === null) {
      setAudioSrc(null);
      setAudioError(null);
      isPlayingRef.current = false;
      return;
    }
    triedFallbackRef.current = false;
    setAudioError(null);
    setAudioSrc(chapterAudioUrl(currentBook, currentChapter));
  }, [audioOpen, audioEligible, currentBook, currentChapter]);

  // Continue playback across a src swap when the reader was (or asked to be) listening.
  useEffect(() => {
    if (!audioSrc) return;
    if (shouldAutoplayRef.current || isPlayingRef.current) {
      shouldAutoplayRef.current = false;
      audioElRef.current?.play().catch(() => {
        // Autoplay was blocked (e.g. no user activation yet) — the bar's own controls still work.
      });
    }
  }, [audioSrc]);

  const toggleAudioBar = () => {
    const next = !audioOpen;
    setAudioOpen(next);
    localStorage.setItem(AUDIO_BAR_OPEN_KEY, next ? "1" : "0");
    shouldAutoplayRef.current = next; // opening the bar IS the intent to listen
  };

  /** Primary URL failed — swap in the pre-scraped eBible.org fallback once, then give up gently. */
  const handleAudioError = () => {
    if (!audioSrc || !currentBook || currentChapter === null) return;
    if (triedFallbackRef.current) {
      setAudioError("Couldn't load audio for this chapter — try again later.");
      return;
    }
    triedFallbackRef.current = true;
    const book = currentBook;
    const chapter = currentChapter;
    // Keep the listening intent across the swap: the error stopped playback, but isPlayingRef
    // still reflects the pre-error state, so the src-change effect above resumes automatically.
    fallbackChapterAudioUrl(book, chapter).then((url) => {
      // The reader may have navigated while the manifest loaded — the ref (unlike the state this
      // closure captured) reflects the chapter shown *now*, so bail out when it has moved on.
      const shown = audioChapterRef.current;
      if (!shown || shown.book !== book || shown.chapter !== chapter) return;
      if (url) setAudioSrc(url);
      else setAudioError("Couldn't load audio for this chapter — try again later.");
    });
  };

  /** Auto-advance: a finished chapter rolls into the next one, navigating the reader with it
   * (same path as the Next Chapter button, so progress saving etc. all still apply). */
  const handleAudioEnded = () => {
    isPlayingRef.current = false;
    if (atBibleEnd()) return;
    shouldAutoplayRef.current = true;
    goToChapter(1);
  };

  /** Loads a whole chapter. Returns whether it succeeded, without touching `error` — callers decide how to surface a failure. */
  const loadChapter = async (book: string, chapter: number, translationId: string): Promise<boolean> => {
    if (chapter < 1) return false;
    setLoading(true);
    try {
      const lastVerse = chapter === 1 ? SINGLE_CHAPTER_BOOK_LAST_VERSE[book] : undefined;
      const ref = lastVerse ? `${book} 1:1-${lastVerse}` : `${book} ${chapter}`;
      const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${translationId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error || !data.verses || data.verses.length === 0) {
        throw new Error(data.error ?? "Chapter not found");
      }
      setPassage({
        // The explicit "1:1-25" verse-range workaround above makes the API echo back a verbose
        // reference (e.g. "Philemon 1:1-25") — show the plain "Philemon 1" chapter heading instead.
        reference: lastVerse ? `${book} ${chapter}` : data.reference,
        verses: data.verses,
        translationName: data.translation_name ?? translationId.toUpperCase(),
      });
      setCurrentBook(book);
      setCurrentChapter(chapter);
      setError(null);
      setBoundaryMessage(null);
      saveProgress(book, chapter, translationId);
      fetchAnnotations(book, chapter, translationId);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  /** Loads the full chapter containing any reference typed elsewhere in the app (e.g. a verse link),
   * then scrolls to the specific verse when the reference names one (e.g. "Matthew 21:10"). */
  const loadReference = async (rawRef: string, translationId: string) => {
    const trimmed = rawRef.trim();
    if (!trimmed) return;
    setShowIntro(false);
    setShowPlans(false);
    setError(null);
    setBoundaryMessage(null);
    const parsed = parseBookChapter(trimmed);
    const ok = parsed ? await loadChapter(parsed.book, parsed.chapter, translationId) : false;
    if (!ok) {
      setError('Couldn\'t load that passage. Try a format like "John 3:16" or "Acts 18".');
    } else if (parsed?.verse) {
      setPendingScrollVerse(parsed.verse);
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
  }, [reference, referenceNonce, restoreTranslation]);

  // Scroll to a verse once its chapter has finished loading and rendering (used after jumping in
  // from a keyword search result or a "Book 3:16"-style reference, which lands on a specific verse
  // within a whole new chapter), and flash that verse so the eye finds it without hunting.
  useEffect(() => {
    if (pendingScrollVerse !== null && passage) {
      verseRefs.current[pendingScrollVerse]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashVerse(pendingScrollVerse);
      setPendingScrollVerse(null);
    }
  }, [passage, pendingScrollVerse]);

  // The flash is one-shot — drop the class once the CSS animation has had time to finish, so a
  // later unrelated re-render doesn't replay it.
  useEffect(() => {
    if (flashVerse === null) return;
    const timeout = window.setTimeout(() => setFlashVerse(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [flashVerse]);

  /** Locates which verse a selection boundary point falls in and its character offset within that
   * verse's text. A point can land either inside the verse's own text span (the common case) or inside
   * the verse-number superscript that precedes it (e.g. a drag that starts right at the start of a
   * line easily catches the number first) — the latter isn't part of any textRefs entry, so it's
   * treated as offset 0 of that same verse's text, the natural interpretation of "started here." */
  const findVerseAndOffset = (node: Node, offset: number): { verse: number; offset: number } | null => {
    const textEntry = Object.entries(textRefs.current).find(([, el]) => el && el.contains(node));
    if (textEntry && textEntry[1]) {
      return { verse: Number(textEntry[0]), offset: getTextOffsetInRoot(textEntry[1], node, offset) };
    }
    const pEntry = Object.entries(verseRefs.current).find(([, el]) => el && el.contains(node));
    if (pEntry && pEntry[1]) {
      return { verse: Number(pEntry[0]), offset: 0 };
    }
    return null;
  };

  /** Reads the current native selection, if it's a valid non-empty range entirely within verse text,
   * as a normalized (start before end) start/end verse+offset pair. */
  const readSelectionRange = (): { startVerse: number; startOffset: number; endVerse: number; endOffset: number } | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const start = findVerseAndOffset(range.startContainer, range.startOffset);
    const end = findVerseAndOffset(range.endContainer, range.endOffset);
    if (!start || !end) return null;
    let startVerse = start.verse;
    let endVerse = end.verse;
    let startOffset = start.offset;
    let endOffset = end.offset;
    if (startVerse > endVerse || (startVerse === endVerse && startOffset > endOffset)) {
      [startVerse, endVerse] = [endVerse, startVerse];
      [startOffset, endOffset] = [endOffset, startOffset];
    }
    if (startVerse === endVerse && startOffset === endOffset) return null;
    return { startVerse, startOffset, endVerse, endOffset };
  };

  // Calling removeAllRanges() ourselves (below) asynchronously fires its own selectionchange event —
  // this flag tells that self-inflicted event to skip nulling the popup we just set, instead of only
  // reacting to selectionchange events caused by the user actually changing their selection.
  const suppressSelectionClearRef = useRef(false);

  // Closes the action sheet if the selection is cleared (e.g. tapping/clicking elsewhere). Deliberately
  // does NOT show the sheet while a selection is still growing — showing it live, mid-drag, put a large
  // DOM element right where the next verse would be, which blocked the browser's own drag-to-extend
  // gesture from ever reaching it (you'd drag onto the sheet instead of onto verse text). The sheet only
  // appears once the gesture finishes (see the mouseup/touchend handlers below), well clear of the drag.
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) return;
      if (suppressSelectionClearRef.current) {
        suppressSelectionClearRef.current = false;
        return;
      }
      setPopup((p) => (p?.kind === "selection" ? null : p));
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // Mouse drag-selection path (desktop): show the sheet once the drag finishes, not while it's ongoing
  // (same reasoning as the touch path below — and mirrors how the browser's own selection UI behaves,
  // only settling once you release the mouse button).
  useEffect(() => {
    const handleMouseUp = () => {
      const result = readSelectionRange();
      if (!result) return;
      setPopup({ kind: "selection", ...result });
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // The instant a touch ends, clear whatever native selection exists and swap in our own preview mark
  // in its place — iOS only shows its Copy/Look Up menu once a selection has "settled," so clearing it
  // immediately on lift-off leaves nothing for that menu to attach to. Doing this only on touchend (not
  // during the drag) lets the normal long-press-and-drag gesture work exactly like it does everywhere
  // else; this listener never fires from mouse input, so desktop is unaffected.
  useEffect(() => {
    const handleTouchEnd = () => {
      const result = readSelectionRange();
      if (!result) return;
      suppressSelectionClearRef.current = true;
      window.getSelection()?.removeAllRanges();
      setPopup({ kind: "selection", ...result, viaTouch: true });
    };
    document.addEventListener("touchend", handleTouchEnd);
    return () => document.removeEventListener("touchend", handleTouchEnd);
  }, []);

  const closePopup = () => {
    window.getSelection()?.removeAllRanges();
    setNoteDraft("");
    setNewTagName("");
    setPopup(null);
  };

  const handleCreateHighlight = async (color: HighlightColor) => {
    if (!popup || popup.kind !== "selection" || !userId || !currentBook || currentChapter === null) return;
    const { startVerse, startOffset, endVerse, endOffset } = popup;
    const { data, error: hlError } = await supabase
      .from("highlights")
      .insert({
        user_id: userId,
        book: currentBook,
        chapter: currentChapter,
        start_verse: startVerse,
        end_verse: endVerse,
        translation,
        start_offset: startOffset,
        end_offset: endOffset,
        color,
      })
      .select()
      .single();
    if (!hlError && data) setHighlights((hs) => [...hs, data as Highlight]);
    closePopup();
  };

  /** Reconstructs the exact quoted text for a (possibly multi-verse) selection from the loaded passage. */
  const buildQuotedText = (startVerse: number, startOffset: number, endVerse: number, endOffset: number): string => {
    if (!passage) return "";
    return passage.verses
      .filter((v) => v.verse >= startVerse && v.verse <= endVerse)
      .map((v) => {
        const text = v.text.trim();
        const from = v.verse === startVerse ? startOffset : 0;
        const to = v.verse === endVerse ? endOffset : text.length;
        return text.slice(from, to);
      })
      .join(" ");
  };

  /** Opens the share editor for the current selection. Selection values are read up front — on
   * desktop the click itself collapses the native selection and closes the sheet (see the
   * selectionchange handler), so this can't wait and re-read `popup` later. Works signed out too:
   * sharing needs no account. */
  const handleShareVerseCard = () => {
    if (!popup || popup.kind !== "selection" || !currentBook || currentChapter === null) return;
    const { startVerse, startOffset, endVerse, endOffset } = popup;
    const text = buildQuotedText(startVerse, startOffset, endVerse, endOffset);
    const reference = `${currentBook} ${currentChapter}:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ""}`;
    setShareCardSpec(verseCardSpec(reference, text));
  };

  const handleOpenNoteEditor = () => {
    if (!popup || popup.kind !== "selection") return;
    const quotedText = buildQuotedText(popup.startVerse, popup.startOffset, popup.endVerse, popup.endOffset);
    setNoteDraft("");
    setPopup({
      kind: "note-editor",
      startVerse: popup.startVerse,
      startOffset: popup.startOffset,
      endVerse: popup.endVerse,
      endOffset: popup.endOffset,
      quotedText,
    });
  };

  // A journal request arrives together with (or just before) the chapter load it triggered, so it's
  // remembered here until that chapter is actually the one on screen — the composer can only anchor
  // to verses of the currently-loaded passage.
  const pendingJournalRef = useRef<{ reference: string; prompt: string } | null>(null);
  useEffect(() => {
    if (journalRequest) pendingJournalRef.current = { reference: journalRequest.reference, prompt: journalRequest.prompt };
  }, [journalRequest]);

  // Opens the note composer for a pending journal request once its chapter has landed — anchored to
  // the reference's first verse (or the chapter's first when the reference names none), exactly as
  // if that whole verse had been selected and "📝 Note" tapped, with the prompt quoted into the
  // draft. Declared after the chapter-change popup-clearing effect above so that in the commit where
  // the requested chapter arrives, the clear runs first and this open wins.
  useEffect(() => {
    const pending = pendingJournalRef.current;
    if (!pending || !passage || !currentBook || currentChapter === null || loading || !userId) return;
    const parsed = parseBookChapter(pending.reference);
    if (!parsed || parsed.book.toLowerCase() !== currentBook.toLowerCase() || parsed.chapter !== currentChapter) return;
    pendingJournalRef.current = null;
    const verseNum = parsed.verse ?? passage.verses[0]?.verse ?? 1;
    const verseText = passage.verses.find((v) => v.verse === verseNum)?.text.trim() ?? "";
    setNoteDraft(`Prompt: ${pending.prompt}\n\n`);
    setPopup({
      kind: "note-editor",
      startVerse: verseNum,
      startOffset: 0,
      endVerse: verseNum,
      endOffset: verseText.length,
      quotedText: verseText,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage, currentBook, currentChapter, loading, userId]);

  const handleSaveNote = async () => {
    if (!popup || popup.kind !== "note-editor" || !userId || !currentBook || currentChapter === null) return;
    const text = noteDraft.trim();
    if (!text) return;
    const { data, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        book: currentBook,
        chapter: currentChapter,
        start_verse: popup.startVerse,
        end_verse: popup.endVerse,
        translation,
        quoted_text: popup.quotedText || null,
        quoted_start_offset: popup.startOffset,
        quoted_end_offset: popup.endOffset,
        note_text: text,
      })
      .select()
      .single();
    if (!noteError && data) {
      setNotes((prev) => [...prev, data as Note]);
      onNotesChanged?.();
    }
    closePopup();
  };

  const handleRemoveHighlight = async () => {
    if (!popup || popup.kind !== "highlight-actions") return;
    const id = popup.highlight.id;
    await supabase.from("highlights").delete().eq("id", id);
    setHighlights((hs) => hs.filter((h) => h.id !== id));
    setPopup(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    await supabase.from("notes").delete().eq("id", noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    onNotesChanged?.();
  };

  const notesForVerse = (verse: number) => notes.filter((n) => n.start_verse <= verse && verse <= n.end_verse);
  const tagsForVerse = (verse: number) => verseTags.filter((vt) => vt.start_verse <= verse && verse <= vt.end_verse);

  /** True if some verse_tags row for this tag overlaps the given range at all — used to show a tag chip as active. */
  const isRangeTagged = (startVerse: number, endVerse: number, tagId: string) =>
    verseTags.some((vt) => vt.tag_id === tagId && vt.start_verse <= endVerse && vt.end_verse >= startVerse);

  /** Toggles one existing tag on/off the popup's verse range. Turning off an overlapping multi-verse
   * tag removes that whole span — tags can't be partially detached from just one verse of a range. */
  const handleToggleVerseTag = async (tagId: string) => {
    if (!popup || popup.kind !== "tag-picker" || !userId || !currentBook || currentChapter === null) return;
    const { startVerse, endVerse } = popup;
    const existing = verseTags.find((vt) => vt.tag_id === tagId && vt.start_verse <= endVerse && vt.end_verse >= startVerse);
    if (existing) {
      await supabase.from("verse_tags").delete().eq("id", existing.id);
      setVerseTags((prev) => prev.filter((vt) => vt.id !== existing.id));
    } else {
      const { data, error: vtError } = await supabase
        .from("verse_tags")
        .insert({ user_id: userId, book: currentBook, chapter: currentChapter, start_verse: startVerse, end_verse: endVerse, translation, tag_id: tagId })
        .select()
        .single();
      if (!vtError && data) setVerseTags((prev) => [...prev, data as VerseTag]);
    }
    onNotesChanged?.();
  };

  /** Creates a new custom tag (reusing an existing one of the same name if it already exists) and applies it to the popup's verse range. */
  const handleAddNewTag = async () => {
    if (!popup || popup.kind !== "tag-picker" || !userId) return;
    const name = newTagName.trim();
    if (!name) return;
    setNewTagName("");
    const existingTag = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    let tag = existingTag;
    if (!tag) {
      const { data, error: tagError } = await supabase.from("tags").insert({ user_id: userId, name }).select().single();
      if (tagError || !data) return;
      tag = data as Tag;
      setTags((prev) => [...prev, tag!].sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (!isRangeTagged(popup.startVerse, popup.endVerse, tag.id)) await handleToggleVerseTag(tag.id);
  };

  const handleTranslationChange = async (next: string) => {
    setTranslation(next);
    if (currentBook && currentChapter !== null) {
      const ok = await loadChapter(currentBook, currentChapter, next);
      if (!ok) setError("Couldn't load this passage in that translation.");
    }
  };

  /** Picking a book jumps straight to chapter 1 (existing behavior) and immediately opens the
   * chapter picker so the user can pick a different chapter right away without an extra tap —
   * setting currentBook synchronously here (loadChapter will redundantly set it again once its
   * fetch resolves) is what lets the chapter picker's option list be correct before that fetch
   * finishes, instead of still showing the previous book's chapter count. */
  const handleBookSelect = (bookName: string) => {
    if (!bookName) return;
    setCurrentBook(bookName);
    setShowIntro(false);
    setShowPlans(false);
    loadChapter(bookName, 1, translation);
    chapterPickerRef.current?.open();
  };

  /** Picking "Introduction" shows the book intro instead of loading a chapter. Picking a real
   * chapter loads it and, once loaded, opens the verse picker (chained the same way as the book
   * picker above) — this has to wait for the fetch since verse counts aren't known until then. */
  const handleChapterSelect = async (value: string) => {
    if (value === "intro") {
      setShowIntro(true);
      setShowPlans(false);
      return;
    }
    if (!currentBook) return;
    setShowIntro(false);
    setShowPlans(false);
    const ok = await loadChapter(currentBook, Number(value), translation);
    if (ok) versePickerRef.current?.open();
  };

  const handleIntroJumpToChapter = async (chapter: number, verse?: number) => {
    if (!currentBook) return;
    setShowIntro(false);
    setShowPlans(false);
    const ok = await loadChapter(currentBook, chapter, translation);
    if (ok && verse) setPendingScrollVerse(verse);
  };

  const handleVerseJump = (verseNum: number) => {
    verseRefs.current[verseNum]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const runSearch = async (rawQuery: string) => {
    const q = rawQuery.trim();
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

  // Search input lives in the app header now (see externalSearchQuery/externalSearchNonce) —
  // submitting there (Enter key) bumps the nonce, which is the only thing this effect keys off so a
  // repeated identical search still re-runs.
  useEffect(() => {
    if (externalSearchNonce === undefined) return;
    if (externalSearchQuery) runSearch(externalSearchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSearchNonce]);

  const handleSearchResultClick = async (hit: SearchHit) => {
    const bookName = BOOKS[hit.book - 1]?.name;
    if (!bookName) return;
    const ok = await loadChapter(bookName, hit.chapter, translation);
    if (ok) {
      setPendingScrollVerse(hit.verse);
      setSearchResults(null);
      setShowPlans(false);
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
    <div
      className={`bible-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`}
      style={expand ? undefined : style}
    >
      <div className="bible-panel-scroll">

      {secondsThisMonth !== null && (
        <p className="bible-minutes-this-month no-print">📖 {formatReadingTime(secondsThisMonth)} read this month</p>
      )}

      <div className="bible-nav">
        <InlinePicker
          ariaLabel="Book"
          placeholder="Book…"
          value={currentBook ?? ""}
          onSelect={handleBookSelect}
          options={BOOKS.map((b) => ({ value: b.name, label: b.name }))}
          className="bible-nav-picker"
        />
        <InlinePicker
          ref={chapterPickerRef}
          ariaLabel="Chapter"
          placeholder="Ch."
          value={showIntro ? "intro" : currentChapter !== null ? String(currentChapter) : ""}
          onSelect={handleChapterSelect}
          disabled={!currentBookInfo}
          className="bible-nav-picker bible-nav-picker-narrow"
          options={
            currentBookInfo
              ? [
                  { value: "intro", label: "📖 Introduction" },
                  ...Array.from({ length: currentBookInfo.chapters }, (_, i) => ({
                    value: String(i + 1),
                    label: String(i + 1),
                  })),
                ]
              : []
          }
        />
        <InlinePicker
          ref={versePickerRef}
          ariaLabel="Jump to verse"
          placeholder="Verse…"
          value=""
          onSelect={(v) => handleVerseJump(Number(v))}
          disabled={!passage}
          className="bible-nav-picker bible-nav-picker-narrow"
          options={passage?.verses.map((v) => ({ value: String(v.verse), label: String(v.verse) })) ?? []}
        />
      </div>

      <div className="bible-toolbar">
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
        {audioEligible && (
          <button
            type="button"
            className={`bible-plans-chip${audioOpen ? " bible-plans-chip-active" : ""}`}
            onClick={toggleAudioBar}
            aria-pressed={audioOpen}
            aria-label="Listen to this chapter"
            title={CHAPTER_AUDIO_CREDIT}
          >
            🔊 Listen
          </button>
        )}
      </div>

      {searching && <p className="bible-status">Searching…</p>}
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

      {/* Cold-start welcome — nothing else renders here until a book is picked, and a silently
          blank column reads as broken rather than waiting for input. Held back while `initializing`
          (App is still resolving the session and any saved reading position) so a returning
          signed-in reader doesn't see this flash before their restored chapter lands instead — see
          App's bibleInitializing. A plain loading line stands in for that brief window. */}
      {!showPlans && !currentBook && !showIntro && !passage && !loading && !error && !searching && !searchResults && (
        initializing ? (
          <p className="bible-status">Loading…</p>
        ) : (
          <div className="bible-welcome">
            <p className="bible-welcome-title">Select a book to start reading</p>
            <p className="bible-welcome-text">
              Pick a book and chapter above — places and people in the text link to the interactive map and their full histories.
            </p>
            <div className="bible-welcome-plans">
              <p className="bible-welcome-plans-title">Or follow a guided reading plan</p>
              {READING_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className="bible-welcome-plan-link"
                  onClick={() => openPlansView(plan.id)}
                >
                  <span>{plan.title}</span>
                  <span className="bible-welcome-plan-days">{plan.days.length} days</span>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {showPlans && !searchResults && (
        <ReadingPlansView
          openPlanId={openPlanId}
          onOpenPlan={setOpenPlanId}
          progress={planProgress}
          onSelectDay={handleSelectPlanDay}
          onToggleDay={handleTogglePlanDay}
          onClose={() => setShowPlans(false)}
        />
      )}

      {!showPlans && showIntro && currentBook && !searchResults && (
        <BookIntroView
          book={currentBook}
          onJumpToChapter={handleIntroJumpToChapter}
          onBack={onBookIntroBack}
          onSelectLocation={onSelectLocation}
          onSelectPoi={onSelectPoi}
          onSelectPerson={onSelectPerson}
          onSelectTopic={onSelectTopic}
        />
      )}

      {!showPlans && !showIntro && passage && !loading && !error && !searchResults && (
        <div className="bible-passage">
          {audioOpen && audioEligible && (
            <div className="bible-audio-bar no-print">
              {audioSrc && !audioError && (
                <audio
                  ref={audioElRef}
                  className="bible-audio-player"
                  controls
                  preload="metadata"
                  src={audioSrc}
                  onPlay={() => {
                    isPlayingRef.current = true;
                  }}
                  onPause={() => {
                    isPlayingRef.current = false;
                  }}
                  onEnded={handleAudioEnded}
                  onError={handleAudioError}
                />
              )}
              {audioError && <p className="bible-audio-error">{audioError}</p>}
              <p className="bible-audio-credit">{CHAPTER_AUDIO_CREDIT}</p>
            </div>
          )}
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
            {passage.verses.map((v) => {
              const text = v.text.trim();
              const verseNotes = notesForVerse(v.verse);
              const verseTagList = tagsForVerse(v.verse);
              const clippedHighlights: ClippedHighlight[] = highlights.flatMap((h) => {
                const clip = clipRangeForVerse(h.start_verse, h.start_offset, h.end_verse, h.end_offset, v.verse, text.length);
                return clip ? [{ highlight: h, startOffset: clip.start, endOffset: clip.end }] : [];
              });
              const previewRange =
                popup?.kind === "selection" && popup.viaTouch
                  ? clipRangeForVerse(popup.startVerse, popup.startOffset, popup.endVerse, popup.endOffset, v.verse, text.length)
                  : null;
              return (
                <p
                  key={`${v.chapter}:${v.verse}`}
                  className={flashVerse === v.verse ? "verse-flash" : undefined}
                  ref={(el) => {
                    verseRefs.current[v.verse] = el;
                  }}
                >
                  <span className="bible-verse-num">{v.verse}</span>
                  <VerseText
                    text={text}
                    book={currentBook ?? undefined}
                    chapter={v.chapter}
                    verse={v.verse}
                    onSelectLocation={onSelectLocation}
                    onSelectPoi={onSelectPoi}
                    onSelectPerson={onSelectPerson}
                    onSelectTopic={onSelectTopic}
                    highlights={clippedHighlights}
                    onHighlightClick={(highlight) => setPopup({ kind: "highlight-actions", highlight })}
                    previewRange={previewRange}
                    textRef={(el) => {
                      textRefs.current[v.verse] = el;
                    }}
                  />
                  {verseNotes.length > 0 && (
                    <button
                      type="button"
                      className="verse-note-indicator"
                      aria-label={`View ${verseNotes.length === 1 ? "note" : "notes"} on this verse`}
                      onClick={() => setPopup({ kind: "verse-notes", verse: v.verse })}
                    >
                      📝
                    </button>
                  )}
                  {verseTagList.length > 0 && (
                    <button
                      type="button"
                      className="verse-tag-indicator"
                      aria-label={`View ${verseTagList.length === 1 ? "tag" : "tags"} on this verse`}
                      onClick={() => setPopup({ kind: "tag-picker", startVerse: v.verse, endVerse: v.verse })}
                    >
                      🏷️
                    </button>
                  )}
                </p>
              );
            })}
          </div>

          {userId && (
            <label className="bible-mark-read no-print">
              <input type="checkbox" checked={chapterMarkedRead} onChange={handleToggleChapterRead} />
              Mark {passage.reference} as read
            </label>
          )}

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

      {shareCardSpec && (
        <ShareCardModal
          spec={shareCardSpec}
          filename={shareFilename(shareCardSpec.title)}
          onClose={() => setShareCardSpec(null)}
        />
      )}

      {popup && (
        <div className="verse-sheet">
          {popup.kind === "selection" && (
            <div className="verse-sheet-actions">
              {userId ? (
                <>
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`verse-popup-color verse-popup-color-${color}`}
                      aria-label={`Highlight ${color}`}
                      onClick={() => handleCreateHighlight(color)}
                    />
                  ))}
                  <button type="button" className="verse-popup-note-btn" onClick={handleOpenNoteEditor}>
                    📝 Note
                  </button>
                  <button
                    type="button"
                    className="verse-popup-tag-btn"
                    onClick={() => setPopup({ kind: "tag-picker", startVerse: popup.startVerse, endVerse: popup.endVerse })}
                  >
                    🏷️ Tag
                  </button>
                </>
              ) : (
                <span className="verse-popup-signin-note">Log in to highlight or add notes</span>
              )}
              <button type="button" className="verse-popup-share-btn" onClick={handleShareVerseCard}>
                📤 Share
              </button>
              <button type="button" className="verse-popup-close" onClick={closePopup} aria-label="Close">
                ×
              </button>
            </div>
          )}

          {popup.kind === "note-editor" && (
            <div className="verse-popup-note-editor">
              {popup.quotedText && <p className="verse-popup-quoted">"{popup.quotedText}"</p>}
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Write a note…"
                autoFocus
              />
              <div className="verse-popup-note-actions">
                <button type="button" onClick={closePopup}>
                  Cancel
                </button>
                <button type="button" className="verse-popup-save" onClick={handleSaveNote} disabled={!noteDraft.trim()}>
                  Save
                </button>
              </div>
            </div>
          )}

          {popup.kind === "highlight-actions" && (
            <div className="verse-sheet-actions">
              <button type="button" className="verse-popup-remove" onClick={handleRemoveHighlight}>
                Remove Highlight
              </button>
              <button type="button" className="verse-popup-close" onClick={() => setPopup(null)} aria-label="Close">
                ×
              </button>
            </div>
          )}

          {popup.kind === "tag-picker" && (
            <div className="verse-popup-tag-picker">
              <TagPicker
                tags={tags}
                isActive={(tagId) => isRangeTagged(popup.startVerse, popup.endVerse, tagId)}
                onToggle={handleToggleVerseTag}
                newTagName={newTagName}
                onNewTagNameChange={setNewTagName}
                onAddNewTag={handleAddNewTag}
              />
              <button type="button" className="verse-popup-close-full" onClick={() => setPopup(null)}>
                Close
              </button>
            </div>
          )}

          {popup.kind === "verse-notes" && (
            <div className="verse-popup-notes-list">
              {notesForVerse(popup.verse).map((n) => (
                <div key={n.id} className="verse-popup-note-item">
                  {n.quoted_text && <p className="verse-popup-quoted">"{n.quoted_text}"</p>}
                  <p>{n.note_text}</p>
                  <button type="button" onClick={() => handleDeleteNote(n.id)}>
                    Delete
                  </button>
                </div>
              ))}
              <button type="button" className="verse-popup-close-full" onClick={() => setPopup(null)}>
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

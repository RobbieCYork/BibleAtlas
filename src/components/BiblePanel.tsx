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
import { clipRangeForVerse, comparePosition } from "../lib/verseRange";
import { shareFilename, verseCardSpec, type ShareCardSpec } from "../lib/shareCard";
import ShareCardModal from "./ShareCardModal";
import HighlightHandles from "./HighlightHandles";

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

/** A stretch of Scripture the action sheet is acting on. May span more than one verse; offsets are
 * relative to their own verse's text (start_offset to start_verse's, end_offset to end_verse's) —
 * the same coordinate system Highlight and Note rows use. */
interface VerseRange {
  startVerse: number;
  startOffset: number;
  endVerse: number;
  endOffset: number;
}

/** The one unified verse-action sheet. Whether it was opened by dragging out a fresh selection, by
 * tapping an existing highlight, or by tapping a verse's 📝/🏷️ indicator, it shows the same full set
 * of actions — colour swatches (apply / change / remove), the notes already on this range with edit
 * and delete, "Add note", Tag, and Share — and reflects the current state of the range rather than
 * offering a single dead-end "remove" the way the old separate highlight/note popups did. */
interface VerseActionsPopup extends VerseRange {
  kind: "verse-actions";
  /** True when this sheet was raised by the reader dragging out a text selection — those close again
   * when the selection is cleared (tapping elsewhere), whereas a sheet raised by tapping an existing
   * highlight or a verse's note/tag indicator has no selection behind it and must survive. */
  openedBySelection?: boolean;
  /** True once we've cleared the native selection on touchend (so iOS has nothing left to show its
   * Copy/Look Up menu over) and swapped in our own preview mark in its place. Must stay false/absent
   * while a native selection is still live — mutating the DOM under an active native selection
   * causes the browser to reset/corrupt it (see the touchend handler below). */
  viaTouch?: boolean;
  /** The highlight row this range currently wears, if any — set when the sheet was opened by tapping
   * an existing highlight, when the selection sits inside one, or once a swatch has been tapped here.
   * Drives which swatch reads as active (and so carries the ✕ that removes it), and makes a tap on a
   * *different* swatch re-colour that same row instead of inserting a duplicate overlapping one. */
  highlightId?: string;
}

/** Everything the bottom action sheet can be showing at once. */
type PopupState =
  | VerseActionsPopup
  | (VerseRange & {
      kind: "note-editor";
      quotedText: string;
      /** Writing a note always highlights the text it's about (owner's item 3) — this is the colour
       * that highlight will get on save, seeded from any highlight already on the range and
       * changeable from the swatches inside the composer. */
      highlightColor: HighlightColor;
      /** Existing highlight on this range, if any — re-coloured on save rather than duplicated. */
      highlightId?: string;
      /** Sheet to return to after Save/Cancel, so composing a note doesn't dead-end the sheet. */
      returnTo?: VerseActionsPopup;
    })
  | { kind: "tag-picker"; startVerse: number; endVerse: number; returnTo?: VerseActionsPopup };

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

/** Writing a note always highlights the text it's about (owner's item 3). Yellow is the default —
 * the plain "I marked this" colour — and the composer offers the full swatch row to change it before
 * saving, or the sheet afterwards. */
const DEFAULT_NOTE_HIGHLIGHT_COLOR: HighlightColor = "yellow";

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
  /** The scrollable reading area (see .bible-panel-scroll) — passed to HighlightHandles so its
   * portaled knobs reposition as the chapter scrolls underneath them. */
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  /** Live (uncommitted) position of a highlight boundary being dragged via HighlightHandles — null
   * whenever no drag is in progress. Rendered in place of the highlight's stored offsets both for
   * the handles themselves and for the highlight's own on-screen extent, so the mark grows/shrinks
   * live as the user drags. Persisted (delete+insert — see handleHighlightDragEnd) only on release. */
  const [handleDrag, setHandleDrag] = useState<{
    highlightId: string;
    startVerse: number;
    startOffset: number;
    endVerse: number;
    endOffset: number;
  } | null>(null);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  /** Mirror of `highlights` readable from the document-level mouseup/touchend listeners, which are
   * registered once (empty dep array) and would otherwise close over the first render's empty array. */
  const highlightsRef = useRef<Highlight[]>([]);
  highlightsRef.current = highlights;
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [verseTags, setVerseTags] = useState<VerseTag[]>([]);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  /** Inline editing of an already-saved note listed in the verse-action sheet — the saved row stays
   * untouched until the update succeeds, so Cancel just drops the draft and a failed save keeps
   * the reader's text on screen. Mirrors the same flow in MyNotesPanel. */
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [savingNoteEdit, setSavingNoteEdit] = useState(false);
  const [noteEditError, setNoteEditError] = useState<string | null>(null);
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
      // Only a sheet opened *by* a selection closes with it — one opened by tapping an existing
      // highlight or a verse's note/tag indicator has no selection behind it to lose.
      setPopup((p) => (p?.kind === "verse-actions" && p.openedBySelection ? null : p));
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // Mouse drag-selection path (desktop): show the sheet once the drag finishes, not while it's ongoing
  // (same reasoning as the touch path below — and mirrors how the browser's own selection UI behaves,
  // only settling once you release the mouse button).
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // A mouseup on the sheet itself (e.g. clicking a highlight color) still sees the old selection
      // still technically live in the DOM — without this guard, that reconstructs a brand-new
      // sheet right on top of the one handleApplyHighlightColor just updated, silently dropping its
      // highlightId and causing the next color tap to insert a duplicate, overlapping highlight
      // instead of re-colouring the one already there.
      if ((e.target as HTMLElement | null)?.closest(".verse-sheet")) return;
      const result = readSelectionRange();
      if (!result) return;
      setPopup({ kind: "verse-actions", ...result, openedBySelection: true, highlightId: enclosingHighlightId(result) });
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
      setPopup({
        kind: "verse-actions",
        ...result,
        viaTouch: true,
        openedBySelection: true,
        highlightId: enclosingHighlightId(result),
      });
    };
    document.addEventListener("touchend", handleTouchEnd);
    return () => document.removeEventListener("touchend", handleTouchEnd);
  }, []);

  /** The id of an existing highlight that fully CONTAINS `range`, if any — so selecting (or tapping)
   * text inside something already highlighted opens the sheet with that colour showing as active,
   * ready to be changed or removed. Deliberately "contains" rather than "overlaps": a fresh selection
   * that merely brushes a smaller existing highlight should get its own new highlight, not silently
   * re-colour and shrink to that other one. */
  const enclosingHighlightId = (range: VerseRange): string | undefined =>
    highlightsRef.current.find(
      (h) =>
        comparePosition(h.start_verse, h.start_offset, range.startVerse, range.startOffset) <= 0 &&
        comparePosition(h.end_verse, h.end_offset, range.endVerse, range.endOffset) >= 0
    )?.id;

  const closePopup = () => {
    window.getSelection()?.removeAllRanges();
    setNoteDraft("");
    setNewTagName("");
    setPopup(null);
  };

  /** Writes a highlight of `color` over `range`, re-colouring `existingId` in place when one is
   * already there. Returns the row now on screen, or null if the write failed.
   *
   * Re-colouring is a real UPDATE (sql/016 added the "update own highlights" RLS policy — the table
   * previously had only select/insert/delete, which is why this used to be a delete-then-insert).
   * Keeping the row id stable matters: the drag handles, the sheet's own highlightId, and the note
   * auto-highlight path all hold onto it. `.select().single()` is the safety check — an RLS refusal
   * comes back as zero rows rather than an error, so a highlight belonging to someone else can never
   * silently appear to have changed. */
  const writeHighlight = async (
    range: VerseRange,
    color: HighlightColor,
    existingId?: string
  ): Promise<Highlight | null> => {
    if (!userId || !currentBook || currentChapter === null) return null;
    if (existingId) {
      const { data, error: updateError } = await supabase
        .from("highlights")
        .update({ color })
        .eq("id", existingId)
        .select()
        .single();
      if (updateError || !data) {
        console.error("Failed to recolor highlight:", updateError?.message ?? "no rows updated");
        return null;
      }
      const updated = data as Highlight;
      setHighlights((hs) => hs.map((h) => (h.id === updated.id ? updated : h)));
      return updated;
    }
    const { data, error: hlError } = await supabase
      .from("highlights")
      .insert({
        user_id: userId,
        book: currentBook,
        chapter: currentChapter,
        start_verse: range.startVerse,
        end_verse: range.endVerse,
        translation,
        start_offset: range.startOffset,
        end_offset: range.endOffset,
        color,
      })
      .select()
      .single();
    if (hlError || !data) {
      console.error("Failed to create highlight:", hlError?.message ?? "no rows inserted");
      return null;
    }
    const inserted = data as Highlight;
    setHighlights((hs) => [...hs, inserted]);
    return inserted;
  };

  /** The single swatch control behind the owner's items 2 and 4: one tap applies, changes, or removes.
   * Tapping the colour that's already on the range (the swatch drawn with the ✕ through it) removes
   * the highlight; tapping any other swatch applies or re-colours. The sheet deliberately stays open
   * either way, so Note/Tag/Share can follow on the same passage without re-selecting it. */
  const handleApplyHighlightColor = async (color: HighlightColor) => {
    if (!popup || popup.kind !== "verse-actions" || !userId) return;
    const range: VerseRange = {
      startVerse: popup.startVerse,
      startOffset: popup.startOffset,
      endVerse: popup.endVerse,
      endOffset: popup.endOffset,
    };
    const existing = popup.highlightId ? highlights.find((h) => h.id === popup.highlightId) : undefined;
    if (existing && existing.color === color) {
      await handleRemoveHighlight(existing.id);
      return;
    }
    const saved = await writeHighlight(range, color, existing?.id);
    if (saved) setPopup((p) => (p?.kind === "verse-actions" ? { ...p, highlightId: saved.id } : p));
  };

  /** Removes one highlight and leaves the sheet open showing the (now unhighlighted) range, so the
   * swatch row goes back to "none active" instead of the sheet vanishing out from under the tap. */
  const handleRemoveHighlight = async (highlightId: string) => {
    const { error: deleteError } = await supabase.from("highlights").delete().eq("id", highlightId);
    if (deleteError) {
      console.error("Failed to remove highlight:", deleteError.message);
      return;
    }
    setHighlights((hs) => hs.filter((h) => h.id !== highlightId));
    setPopup((p) => (p?.kind === "verse-actions" && p.highlightId === highlightId ? { ...p, highlightId: undefined } : p));
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
    if (!popup || popup.kind !== "verse-actions" || !currentBook || currentChapter === null) return;
    const { startVerse, startOffset, endVerse, endOffset } = popup;
    const text = buildQuotedText(startVerse, startOffset, endVerse, endOffset);
    const reference = `${currentBook} ${currentChapter}:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ""}`;
    setShareCardSpec(verseCardSpec(reference, text));
  };

  /** Opens the note composer over the sheet's current range. Carries the sheet forward as `returnTo`
   * so Save/Cancel lands back on it (now listing the new note) rather than dismissing everything, and
   * seeds the auto-highlight colour from whatever is already on the range — so adding a note to
   * already-highlighted text keeps that colour instead of silently repainting it. */
  const handleOpenNoteEditor = () => {
    if (!popup || popup.kind !== "verse-actions") return;
    const quotedText = buildQuotedText(popup.startVerse, popup.startOffset, popup.endVerse, popup.endOffset);
    const existing = popup.highlightId ? highlights.find((h) => h.id === popup.highlightId) : undefined;
    setNoteDraft("");
    setPopup({
      kind: "note-editor",
      startVerse: popup.startVerse,
      startOffset: popup.startOffset,
      endVerse: popup.endVerse,
      endOffset: popup.endOffset,
      quotedText,
      highlightColor: existing?.color ?? DEFAULT_NOTE_HIGHLIGHT_COLOR,
      highlightId: existing?.id,
      returnTo: popup,
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
    const range: VerseRange = { startVerse: verseNum, startOffset: 0, endVerse: verseNum, endOffset: verseText.length };
    const existing = highlightsRef.current.find(
      (h) =>
        comparePosition(h.start_verse, h.start_offset, range.startVerse, range.startOffset) <= 0 &&
        comparePosition(h.end_verse, h.end_offset, range.endVerse, range.endOffset) >= 0
    );
    setPopup({
      kind: "note-editor",
      ...range,
      quotedText: verseText,
      highlightColor: existing?.color ?? DEFAULT_NOTE_HIGHLIGHT_COLOR,
      highlightId: existing?.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage, currentBook, currentChapter, loading, userId]);

  /** Saves a new note AND (owner's item 3) highlights the text it's about, in the colour chosen in
   * the composer — re-colouring the highlight already on the range rather than stacking a second one.
   * The note is written first: if the highlight write fails the reader still has their note, whereas
   * the reverse would leave a mark with nothing behind it. Lands back on the action sheet (now
   * listing the note, with its colour showing as active) instead of dismissing outright. */
  const handleSaveNote = async () => {
    if (!popup || popup.kind !== "note-editor" || !userId || !currentBook || currentChapter === null) return;
    const text = noteDraft.trim();
    if (!text) return;
    const editor = popup;
    const { data, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        book: currentBook,
        chapter: currentChapter,
        start_verse: editor.startVerse,
        end_verse: editor.endVerse,
        translation,
        quoted_text: editor.quotedText || null,
        quoted_start_offset: editor.startOffset,
        quoted_end_offset: editor.endOffset,
        note_text: text,
      })
      .select()
      .single();
    if (noteError || !data) {
      console.error("Failed to save note:", noteError?.message ?? "no rows inserted");
      return;
    }
    setNotes((prev) => [...prev, data as Note]);
    onNotesChanged?.();
    const saved = await writeHighlight(editor, editor.highlightColor, editor.highlightId);
    setNoteDraft("");
    setPopup({
      kind: "verse-actions",
      startVerse: editor.startVerse,
      startOffset: editor.startOffset,
      endVerse: editor.endVerse,
      endOffset: editor.endOffset,
      viaTouch: editor.returnTo?.viaTouch,
      openedBySelection: false,
      highlightId: saved?.id ?? editor.highlightId,
    });
  };

  /** The highlight whose drag handles should currently be shown — whichever one the open sheet is
   * pointing at, whether it was tapped or applied from the sheet itself. */
  const activeHandleHighlightId = popup?.kind === "verse-actions" ? popup.highlightId : undefined;
  const activeHandleHighlight = highlights.find((h) => h.id === activeHandleHighlightId) ?? null;

  // A drag in progress belongs to a specific highlight id — once the popup moves on to a different
  // (or no) highlight, any stale in-flight drag position needs to stop being applied.
  useEffect(() => {
    if (!activeHandleHighlightId) setHandleDrag(null);
  }, [activeHandleHighlightId]);

  const handleRange = activeHandleHighlight
    ? handleDrag && handleDrag.highlightId === activeHandleHighlight.id
      ? handleDrag
      : {
          highlightId: activeHandleHighlight.id,
          startVerse: activeHandleHighlight.start_verse,
          startOffset: activeHandleHighlight.start_offset,
          endVerse: activeHandleHighlight.end_verse,
          endOffset: activeHandleHighlight.end_offset,
        }
    : null;

  /** Live-updates the dragged edge, clamped so it can't cross past the opposite (stationary) edge —
   * past that point "start" and "end" stop being meaningful. */
  const handleHighlightDragChange = (edge: "start" | "end", pos: { verse: number; offset: number }) => {
    if (!handleRange) return;
    if (edge === "start") {
      if (comparePosition(pos.verse, pos.offset, handleRange.endVerse, handleRange.endOffset) >= 0) return;
      setHandleDrag({ ...handleRange, startVerse: pos.verse, startOffset: pos.offset });
    } else {
      if (comparePosition(pos.verse, pos.offset, handleRange.startVerse, handleRange.startOffset) <= 0) return;
      setHandleDrag({ ...handleRange, endVerse: pos.verse, endOffset: pos.offset });
    }
  };

  // Commits a finished edge drag as an in-place UPDATE (possible since sql/016 added the "update own
  // highlights" RLS policy — this used to be a delete-then-insert, which churned the row id and could
  // lose the highlight outright if the insert half failed after the delete had already gone through).
  // A refused update comes back as zero rows via .select().single(), and the on-screen mark simply
  // snaps back to where it was.
  const handleHighlightDragEnd = async () => {
    const drag = handleDrag;
    if (!drag || !userId || !currentBook || currentChapter === null) {
      setHandleDrag(null);
      return;
    }
    const original = highlights.find((h) => h.id === drag.highlightId);
    if (
      !original ||
      (drag.startVerse === original.start_verse &&
        drag.startOffset === original.start_offset &&
        drag.endVerse === original.end_verse &&
        drag.endOffset === original.end_offset)
    ) {
      setHandleDrag(null);
      return;
    }
    const { data, error: hlError } = await supabase
      .from("highlights")
      .update({
        start_verse: drag.startVerse,
        end_verse: drag.endVerse,
        start_offset: drag.startOffset,
        end_offset: drag.endOffset,
      })
      .eq("id", drag.highlightId)
      .select()
      .single();
    setHandleDrag(null);
    if (hlError || !data) {
      // Nothing was written, so the stored row is still the pre-drag one already on screen —
      // clearing handleDrag above is all it takes to snap the mark back to it.
      console.error("Failed to move highlight:", hlError?.message ?? "no rows updated");
      return;
    }
    const moved = data as Highlight;
    setHighlights((hs) => hs.map((h) => (h.id === moved.id ? moved : h)));
    // The row id is unchanged, so the open sheet keeps pointing at it — but its range moved, and the
    // sheet's own range needs to follow so a colour tap or a note lands on the text now marked.
    setPopup((p) =>
      p?.kind === "verse-actions" && p.highlightId === moved.id
        ? {
            ...p,
            startVerse: moved.start_verse,
            startOffset: moved.start_offset,
            endVerse: moved.end_verse,
            endOffset: moved.end_offset,
          }
        : p
    );
  };

  const handleDeleteNote = async (noteId: string) => {
    await supabase.from("notes").delete().eq("id", noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (editingNoteId === noteId) cancelNoteEdit();
    onNotesChanged?.();
  };

  const startNoteEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditNoteDraft(note.note_text);
    setNoteEditError(null);
  };

  const cancelNoteEdit = () => {
    setEditingNoteId(null);
    setEditNoteDraft("");
    setNoteEditError(null);
    setSavingNoteEdit(false);
  };

  const handleSaveNoteEdit = async (note: Note) => {
    const text = editNoteDraft.trim();
    if (!text || savingNoteEdit) return;
    if (text === note.note_text) {
      cancelNoteEdit();
      return;
    }
    setSavingNoteEdit(true);
    setNoteEditError(null);
    const { data, error: updateError } = await supabase
      .from("notes")
      .update({ note_text: text, updated_at: new Date().toISOString() })
      .eq("id", note.id)
      .select()
      .single();
    setSavingNoteEdit(false);
    if (updateError || !data) {
      setNoteEditError(
        updateError?.message ? `Couldn't save: ${updateError.message}` : "Couldn't save your changes. Your text is still here — try again."
      );
      return;
    }
    const saved = data as Note;
    setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
    cancelNoteEdit();
    onNotesChanged?.();
  };

  const notesForVerse = (verse: number) => notes.filter((n) => n.start_verse <= verse && verse <= n.end_verse);
  /** Every note touching the sheet's range at all — a note anchored to verses 3-4 belongs in the sheet
   * for a selection inside verse 3, and vice versa. */
  const notesForRange = (startVerse: number, endVerse: number) =>
    notes.filter((n) => n.start_verse <= endVerse && n.end_verse >= startVerse);

  /** The highlight currently on the open sheet's range, if any — the swatch matching its colour is the
   * one drawn active, with the ✕ that removes it. */
  const activeHighlight = activeHandleHighlight;
  /** Notes on the open sheet's range — listed inside the sheet with Edit and ✕, so a note can be read,
   * revised, or deleted without leaving the colour swatches behind. */
  const rangeNotes = popup?.kind === "verse-actions" ? notesForRange(popup.startVerse, popup.endVerse) : [];

  /** Raises the unified sheet from a verse's 📝/🏷️ indicator, which points at a whole verse rather
   * than at a dragged-out range. If a highlight already touches that verse the sheet opens on *that
   * highlight's* own range instead of the whole verse — otherwise its colour wouldn't read as active
   * (a mark over half a verse doesn't enclose the whole one) and the next swatch tap would stack a
   * second, verse-wide highlight on top of the one already there. */
  const openVerseActionsForVerse = (verse: number, textLength: number) => {
    const overlapping = highlights.find((h) => h.start_verse <= verse && h.end_verse >= verse);
    if (overlapping) {
      setPopup({
        kind: "verse-actions",
        startVerse: overlapping.start_verse,
        startOffset: overlapping.start_offset,
        endVerse: overlapping.end_verse,
        endOffset: overlapping.end_offset,
        highlightId: overlapping.id,
      });
      return;
    }
    setPopup({ kind: "verse-actions", startVerse: verse, startOffset: 0, endVerse: verse, endOffset: textLength });
  };
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
      <div className="bible-panel-scroll" ref={scrollContainerRef}>

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
                // While this highlight's handle is being dragged, render its live (uncommitted)
                // extent instead of the stored one, so the mark visibly grows/shrinks with the drag.
                const live = handleDrag && handleDrag.highlightId === h.id ? handleDrag : null;
                const clip = clipRangeForVerse(
                  live?.startVerse ?? h.start_verse,
                  live?.startOffset ?? h.start_offset,
                  live?.endVerse ?? h.end_verse,
                  live?.endOffset ?? h.end_offset,
                  v.verse,
                  text.length
                );
                return clip ? [{ highlight: h, startOffset: clip.start, endOffset: clip.end }] : [];
              });
              const previewRange =
                popup?.kind === "verse-actions" && popup.viaTouch
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
                    // Tapping an existing highlight raises the same full sheet a fresh selection does
                    // (owner's item 4) — its colour showing as active with the ✕ that removes it, and
                    // Note/Tag/Share right there, so a note can be added to already-highlighted text.
                    onHighlightClick={(highlight) =>
                      setPopup({
                        kind: "verse-actions",
                        startVerse: highlight.start_verse,
                        startOffset: highlight.start_offset,
                        endVerse: highlight.end_verse,
                        endOffset: highlight.end_offset,
                        highlightId: highlight.id,
                      })
                    }
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
                      // Opens the same unified sheet as everything else, anchored to this whole verse
                      // — the note is listed there with Edit/✕ alongside the colour swatches, so the
                      // note popup is no longer a separate, note-only dead end.
                      onClick={() => openVerseActionsForVerse(v.verse, text.length)}
                    >
                      📝
                    </button>
                  )}
                  {verseTagList.length > 0 && (
                    <button
                      type="button"
                      className="verse-tag-indicator"
                      aria-label={`View ${verseTagList.length === 1 ? "tag" : "tags"} on this verse`}
                      onClick={() => openVerseActionsForVerse(v.verse, text.length)}
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

      {handleRange && (
        <HighlightHandles
          start={{ verse: handleRange.startVerse, offset: handleRange.startOffset }}
          end={{ verse: handleRange.endVerse, offset: handleRange.endOffset }}
          getVerseTextEl={(verse) => textRefs.current[verse] ?? null}
          findVerseAndOffset={findVerseAndOffset}
          onDragChange={handleHighlightDragChange}
          onDragEnd={handleHighlightDragEnd}
          scrollContainer={scrollContainerRef.current}
        />
      )}

      {popup && (
        <div className="verse-sheet">
          {/* The one unified verse-action sheet. Same contents no matter how it was opened, and every
              control reflects the current state of the range rather than offering a one-way action:
              the swatch already on the passage wears a ✕ that removes it, any other swatch changes it,
              and notes sit right underneath with Edit and ✕ of their own. */}
          {popup.kind === "verse-actions" && (
            <>
              <div className="verse-sheet-actions">
                {userId ? (
                  <>
                    {HIGHLIGHT_COLORS.map((color) => {
                      const isActive = activeHighlight?.color === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          className={`verse-popup-color verse-popup-color-${color}${isActive ? " is-active" : ""}`}
                          aria-pressed={isActive}
                          aria-label={isActive ? `Remove ${color} highlight` : `Highlight ${color}`}
                          title={isActive ? `Remove ${color} highlight` : `Highlight ${color}`}
                          // Clicking a button naturally collapses the mouse-drag text selection on desktop
                          // (a real, user-driven selectionchange), which the effect above treats the same as
                          // tapping/clicking elsewhere and closes the sheet — preventDefault on mousedown
                          // stops the browser from collapsing the selection in the first place, so the sheet
                          // and its selection both survive the click and Note/Tag/Share can still follow.
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleApplyHighlightColor(color)}
                        />
                      );
                    })}
                    <button
                      type="button"
                      className="verse-popup-note-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleOpenNoteEditor}
                    >
                      📝 {rangeNotes.length > 0 ? "Add note" : "Note"}
                    </button>
                    <button
                      type="button"
                      className="verse-popup-tag-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        setPopup({ kind: "tag-picker", startVerse: popup.startVerse, endVerse: popup.endVerse, returnTo: popup })
                      }
                    >
                      🏷️ Tag
                    </button>
                  </>
                ) : (
                  <span className="verse-popup-signin-note">Log in to highlight or add notes</span>
                )}
                <button type="button" className="verse-popup-share-btn" onMouseDown={(e) => e.preventDefault()} onClick={handleShareVerseCard}>
                  📤 Share
                </button>
                <button type="button" className="verse-popup-close" onClick={closePopup} aria-label="Close">
                  ×
                </button>
              </div>

              {rangeNotes.length > 0 && (
                <div className="verse-popup-notes-list">
                  {rangeNotes.map((n) => (
                    <div key={n.id} className="verse-popup-note-item">
                      {n.quoted_text && <p className="verse-popup-quoted">"{n.quoted_text}"</p>}
                      {editingNoteId === n.id ? (
                        <>
                          <textarea
                            className="verse-popup-note-edit-textarea"
                            value={editNoteDraft}
                            onChange={(ev) => setEditNoteDraft(ev.target.value)}
                            rows={3}
                            maxLength={8000}
                            aria-label="Edit note"
                            autoFocus
                          />
                          {noteEditError && <p className="verse-popup-note-error">{noteEditError}</p>}
                          <div className="verse-popup-note-item-actions">
                            <button type="button" onClick={() => handleSaveNoteEdit(n)} disabled={!editNoteDraft.trim() || savingNoteEdit}>
                              {savingNoteEdit ? "Saving…" : "Save"}
                            </button>
                            <button type="button" onClick={cancelNoteEdit} disabled={savingNoteEdit}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="verse-popup-note-row">
                          <p>{n.note_text}</p>
                          <div className="verse-popup-note-item-actions">
                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => startNoteEdit(n)}>
                              ✎ Edit
                            </button>
                            {/* ✕ deletes only the note — the highlight underneath it survives (owner's item 4). */}
                            <button
                              type="button"
                              className="verse-popup-note-delete"
                              aria-label="Delete note"
                              title="Delete note"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleDeleteNote(n.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
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
              {/* Saving also highlights the quoted text (owner's item 3); these pick the colour it gets. */}
              <div className="verse-popup-note-highlight-row">
                <span className="verse-popup-note-highlight-label">Highlight</span>
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`verse-popup-color verse-popup-color-${color}${popup.highlightColor === color ? " is-chosen" : ""}`}
                    aria-pressed={popup.highlightColor === color}
                    aria-label={`Highlight this note's text ${color}`}
                    title={color}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setPopup((p) => (p?.kind === "note-editor" ? { ...p, highlightColor: color } : p))}
                  />
                ))}
              </div>
              <div className="verse-popup-note-actions">
                <button type="button" onClick={() => (popup.returnTo ? setPopup(popup.returnTo) : closePopup())}>
                  Cancel
                </button>
                <button type="button" className="verse-popup-save" onClick={handleSaveNote} disabled={!noteDraft.trim()}>
                  Save
                </button>
              </div>
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
              <button
                type="button"
                className="verse-popup-close-full"
                onClick={() => (popup.returnTo ? setPopup(popup.returnTo) : setPopup(null))}
              >
                {popup.returnTo ? "Done" : "Close"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

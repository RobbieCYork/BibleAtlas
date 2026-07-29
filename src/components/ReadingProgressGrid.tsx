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

/** Every book in the canon, each chapter shown as a small cell lit up once read. Backs both the
 * Settings "My Reading" section and a friend's profile view — RLS on chapter_reads/reading_time_daily
 * (owner or an accepted friend) decides whether the caller can actually see the data either way. */
export default function ReadingProgressGrid({ userId, displayName, isOwn }: ReadingProgressGridProps) {
  const [readSet, setReadSet] = useState<Set<string> | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [resetSetting, setResetSetting] = useState<Profile["chapter_read_reset"]>("never");
  const [booksOpen, setBooksOpen] = useState(false);

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
      if (!cancelled) setReadSet(new Set((data as { book: string; chapter: number }[] | null ?? []).map((r) => `${r.book}:${r.chapter}`)));
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

  if (!readSet) return <p className="comment-status">Loading reading progress…</p>;

  const totalChapters = BOOKS.reduce((sum, b) => sum + b.chapters, 0);

  return (
    <div className="reading-progress">
      <p className="reading-progress-subtitle">
        Read by {isOwn ? "you" : (displayName ?? "this friend")} {RESET_WINDOW_LABEL[resetSetting]}
      </p>
      <div className="reading-progress-summary">
        <span>
          <strong>{readSet.size}</strong> / {totalChapters} chapters read
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
        <div className="reading-progress-books">
          {BOOKS.map((book) => {
            const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
            const readInBook = chapters.filter((c) => readSet.has(`${book.name}:${c}`)).length;
            return (
              <div key={book.name} className="reading-progress-book">
                <div className="reading-progress-book-header">
                  <span className="reading-progress-book-name">{book.name}</span>
                  <span className="reading-progress-book-count">
                    {readInBook}/{book.chapters}
                  </span>
                </div>
                <div className="reading-progress-chapters">
                  {chapters.map((c) => (
                    <span
                      key={c}
                      className={`reading-progress-cell${readSet.has(`${book.name}:${c}`) ? " reading-progress-cell-read" : ""}`}
                      title={`${book.name} ${c}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

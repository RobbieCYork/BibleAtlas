import { BOOKS } from "../data/bibleBooks";

/** Human-narrated WEB chapter audio (Winfred W. Henson's public-domain recording of the World
 * English Bible). Primary source is an Internet Archive mirror whose paths ARE templatable
 * (verified live: CORS `*`, range requests, audio/mpeg for all 1,189 chapters); the original
 * eBible.org files are the fallback, but their filenames follow several inconsistent hand-named
 * patterns (spelled-out chapter words, stray double spaces, a "Chapter Thirteen 1.mp3"), so the
 * fallback ships as a pre-scraped manifest in public/web-audio-manifest.json rather than a URL
 * template — see scripts/generate-profile-audio.mjs's sibling generator notes in README-AUDIO.md. */

export const CHAPTER_AUDIO_CREDIT =
  "Audio: Winfred W. Henson's recording of the World English Bible, via eBible.org";

/** Book name (canon table spelling, case-insensitive) -> 01..66 Protestant canon number. */
const BOOK_NUMBER = new Map(BOOKS.map((b, i) => [b.name.toLowerCase(), i + 1]));

const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** Primary audio URL for one chapter, or null for a book name outside the canon table. */
export function chapterAudioUrl(book: string, chapter: number): string | null {
  const num = BOOK_NUMBER.get(book.trim().toLowerCase());
  if (!num || chapter < 1) return null;
  return `https://archive.org/download/legacy-web-audio/out/web-audio/${pad(num, 2)}/${pad(chapter, 3)}.mp3`;
}

/** The fallback manifest ("Book|chapter" -> full eBible.org URL), fetched lazily once — it's
 * ~120 KB, only needed if archive.org ever fails, so it must not ride in the main bundle. */
let manifestPromise: Promise<Record<string, string> | null> | null = null;

function loadFallbackManifest(): Promise<Record<string, string> | null> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${import.meta.env.BASE_URL}web-audio-manifest.json`)
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, string>>) : null))
      .catch(() => {
        // Allow a retry on the next chapter rather than caching a transient network failure forever.
        manifestPromise = null;
        return null;
      });
  }
  return manifestPromise;
}

/** eBible.org fallback URL for one chapter (used when the primary <audio> errors), or null. */
export async function fallbackChapterAudioUrl(book: string, chapter: number): Promise<string | null> {
  const manifest = await loadFallbackManifest();
  return manifest?.[`${book.trim()}|${chapter}`] ?? null;
}

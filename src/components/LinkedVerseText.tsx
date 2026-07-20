import { locations } from "../data/locations";
import { pois } from "../data/pois";
import { BOOKS } from "../data/bibleBooks";

interface NameEntry {
  name: string;
  id: string;
  kind: "location" | "poi";
}

interface VerseEntry {
  name: string;
  kind: "verse";
}

type MatchEntry = NameEntry | VerseEntry;

/** Every location's (any category) primary + alternate name, plus every POI's name — longest first so multi-word names win over their substrings. */
const NAME_ENTRIES: NameEntry[] = (() => {
  const entries: NameEntry[] = [];
  locations.forEach((loc) => {
    entries.push({ name: loc.name, id: loc.id, kind: "location" });
    (loc.alternateNames ?? []).forEach((alt) => entries.push({ name: alt, id: loc.id, kind: "location" }));
  });
  pois.forEach((poi) => {
    entries.push({ name: poi.name, id: poi.id, kind: "poi" });
    (poi.alternateNames ?? []).forEach((alt) => entries.push({ name: alt, id: poi.id, kind: "poi" }));
  });
  return entries.sort((a, b) => b.name.length - a.name.length);
})();

const NAME_TO_ENTRY = new Map(NAME_ENTRIES.map((e) => [e.name.toLowerCase(), e]));

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One regex fragment per Bible book: the book name followed by an optional chapter[:verse[-verse]], e.g. "Acts 16:12" or "Acts 19:23-41". */
const VERSE_PATTERN_FRAGMENTS = BOOKS.map(
  (b) => `${escapeRegExp(b.name)}\\s+\\d{1,3}(?::\\d{1,3}(?:-\\d{1,3})?)?`
);

/** Case-insensitive so lowercase-in-translation phrases like "city of David" and "upper room" still link.
 * Verse-reference fragments are listed first since they're the more specific match. A matched string is
 * treated as a verse reference if it contains a digit (no location/POI name in this app's data does). */
const NAME_PATTERN =
  NAME_ENTRIES.length > 0
    ? new RegExp(
        `\\b(?:${VERSE_PATTERN_FRAGMENTS.join("|")})\\b|\\b(${NAME_ENTRIES.map((e) => escapeRegExp(e.name)).join("|")})\\b`,
        "gi"
      )
    : null;

interface LinkedVerseTextProps {
  text: string;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  /** Called when a Bible verse reference (e.g. "Acts 16:12") is clicked. If omitted, verse references render as plain text. */
  onSelectVerse?: (reference: string) => void;
  /** Skip linking mentions of this id — used so a location/POI's own page doesn't link to itself. */
  excludeId?: string;
}

/** Renders text with any mention of a mapped location, point of interest, or Bible verse reference turned into a clickable link. */
export default function LinkedVerseText({
  text,
  onSelectLocation,
  onSelectPoi,
  onSelectVerse,
  excludeId,
}: LinkedVerseTextProps) {
  if (!NAME_PATTERN) return <>{text}</>;

  const parts: Array<string | MatchEntry> = [];
  let lastIndex = 0;
  NAME_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAME_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const name = match[0];
    if (/\d/.test(name)) {
      // Any match containing a digit is a Bible verse reference (no location/POI name does).
      parts.push({ name, kind: "verse" });
    } else {
      const entry = NAME_TO_ENTRY.get(name.toLowerCase());
      // Keep the verse's own casing/spelling for display, but the canonical id/kind for navigation.
      if (entry && entry.id !== excludeId) parts.push({ ...entry, name });
      else parts.push(name);
    }
    lastIndex = match.index + name.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === "string") return <span key={i}>{part}</span>;
        if (part.kind === "verse") {
          if (!onSelectVerse) return <span key={i}>{part.name}</span>;
          return (
            <button
              key={i}
              type="button"
              className="verse-location-link"
              onClick={() => onSelectVerse(part.name)}
            >
              {part.name}
            </button>
          );
        }
        return (
          <button
            key={i}
            type="button"
            className="verse-location-link"
            onClick={() => (part.kind === "location" ? onSelectLocation(part.id) : onSelectPoi(part.id))}
          >
            {part.name}
          </button>
        );
      })}
    </>
  );
}

import { locations } from "../data/locations";
import { pois } from "../data/pois";
import { people } from "../data/people";
import { BOOKS } from "../data/bibleBooks";

export interface LinkAnnotation {
  start: number;
  end: number;
  text: string;
  kind: "location" | "poi" | "person" | "verse";
  /** Location/POI/person id — present for kind "location" | "poi" | "person". */
  id?: string;
}

interface NameEntry {
  name: string;
  id: string;
  kind: "location" | "poi" | "person";
}

/** Every location's (any category) primary + alternate name, every POI's name, and every person's
 * name — longest first so multi-word names win over their substrings. Where a name is shared (e.g.
 * "James" is both a book of the Bible's traditional author-adjacent name and several different NT
 * people), whichever entry is pushed LAST for that exact lowercase name wins the lookup map below —
 * people are pushed after locations/POIs so a place name never accidentally shadows a person's name
 * sharing it, and within `people` the most prominent bearer of an ambiguous bare name (added first in
 * the array) is deliberately overwritten by later, more-specific entries only when their name strings
 * differ (e.g. "James son of Alphaeus" is its own distinct string, not a collision with plain "James"). */
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
  people.forEach((person) => {
    entries.push({ name: person.name, id: person.id, kind: "person" });
    (person.alternateNames ?? []).forEach((alt) => entries.push({ name: alt, id: person.id, kind: "person" }));
  });
  return entries.sort((a, b) => b.name.length - a.name.length);
})();

const NAME_TO_ENTRY = new Map(NAME_ENTRIES.map((e) => [e.name.toLowerCase(), e]));

/** Some bare names are genuinely ambiguous between two prominent, frequently-recurring people, and
 * whichever one "owns" the name globally (see the comments in people.ts) will be wrong within a
 * specific book. Rather than trying to disambiguate at the individual-verse level (which would need
 * per-verse annotation data we don't have), this overrides the resolved person id when the mention
 * falls within a named book where the OTHER bearer is essentially always the one meant.
 * - "Joseph": Genesis's Joseph (son of Jacob) is the global default (vastly more frequent bare
 *   mentions), but every "Joseph" in Matthew or Luke is Mary's husband — neither book ever names the
 *   Genesis Joseph in running text, so this override has no false positives within those books.
 * - "John": John the Baptist is the global default, but in Acts nearly every solo "John" is the
 *   Apostle (paired with Peter). Not perfect — Acts 4:6 names an unrelated minor "John" of the high
 *   priest's family — but a large net improvement over zero disambiguation. */
const BOOK_NAME_OVERRIDES: Record<string, Record<string, string>> = {
  joseph: { Matthew: "joseph-husband-of-mary", Luke: "joseph-husband-of-mary" },
  john: { Acts: "john-the-apostle" },
};

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

/** Finds every location/POI/person/verse-reference mention in `text`, as character-offset annotations.
 * `book` (e.g. "Matthew") is optional context used to resolve a handful of ambiguous bare names via
 * BOOK_NAME_OVERRIDES above — omit it (as the verse-list views in person/location/POI panels do) and
 * ambiguous names just resolve to their global default owner. */
export function computeLinkAnnotations(text: string, excludeId?: string, book?: string): LinkAnnotation[] {
  if (!NAME_PATTERN) return [];
  const annotations: LinkAnnotation[] = [];
  NAME_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAME_PATTERN.exec(text)) !== null) {
    const name = match[0];
    const start = match.index;
    const end = start + name.length;
    if (/\d/.test(name)) {
      // Any match containing a digit is a Bible verse reference (no location/POI name does).
      annotations.push({ start, end, text: name, kind: "verse" });
    } else {
      const entry = NAME_TO_ENTRY.get(name.toLowerCase());
      if (entry) {
        const overrideId = book ? BOOK_NAME_OVERRIDES[name.toLowerCase()]?.[book] : undefined;
        const id = overrideId ?? entry.id;
        if (id !== excludeId) {
          annotations.push({ start, end, text: name, kind: entry.kind, id });
        }
      }
    }
  }
  return annotations;
}

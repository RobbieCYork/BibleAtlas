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

/** id -> kind, so a BOOK_NAME_OVERRIDES redirect can report the *target's* kind — every override so far
 * happens to redirect person-to-person, but the Edom fix below redirects location-to-person, and a
 * stale kind (e.g. still "location" for a person id) sends the click to the wrong handler entirely. */
const ID_TO_KIND = new Map(NAME_ENTRIES.map((e) => [e.id, e.kind]));

// "Edom" is the one case where the general "people win over locations" default (see the comment on
// NAME_ENTRIES above) picks the wrong global owner: Esau's personal nickname (Genesis 36's "Esau is
// Edom") is vastly outnumbered by "Edom" the nation/region throughout the rest of the Old Testament.
// Force the location to be the default here; BOOK_NAME_OVERRIDES below recovers Esau within Genesis.
const edomLocationEntry = NAME_ENTRIES.find((e) => e.kind === "location" && e.name.toLowerCase() === "edom");
if (edomLocationEntry) NAME_TO_ENTRY.set("edom", edomLocationEntry);

/** Some bare names are genuinely ambiguous between two prominent, frequently-recurring people, and
 * whichever one "owns" the name globally (see the comments in people.ts) will be wrong within a
 * specific book. Rather than trying to disambiguate at the individual-verse level (which would need
 * per-verse annotation data we don't have), this overrides the resolved person id when the mention
 * falls within a named book where the OTHER bearer is essentially always the one meant. Every entry
 * here accepts some residual imperfection where the two bearers' legitimate mentions overlap in the
 * SAME book (documented per-entry) — a net improvement over zero disambiguation, not a perfect fix;
 * that would need chapter/verse-level data this app doesn't track.
 * - "Joseph": Genesis's Joseph (son of Jacob) is the global default (vastly more frequent bare
 *   mentions). Matthew/Luke are Mary's husband; Mark and John are Joseph of Arimathea (Mark 15:43-45;
 *   John 19:38) — John also has one genuine Genesis-Joseph cross-reference (John 4:5), accepted as the
 *   residual imperfection since Arimathea's mentions are more frequent there.
 * - "John": John the Baptist is the global default, but in Acts nearly every solo "John" is the
 *   Apostle (paired with Peter). Not perfect — Acts 4:6 names an unrelated minor "John" of the high
 *   priest's family — but a large net improvement over zero disambiguation. Mark has the same
 *   Baptist/Apostle mix as Acts but isn't overridden — unlike Acts, Mark's Baptist mentions are frequent
 *   enough that a blanket redirect would trade one set of misses for another with no clear net gain.
 * - "James": James, son of Zebedee is the global default, but Galatians, 1 Corinthians, and Acts
 *   overwhelmingly mean James, brother of Jesus (leader of the Jerusalem church) once Zebedee's son is
 *   long dead (Acts 12:2) — Acts 12:17/15:13/21:18 all mean the brother.
 * - "Saul": Saul of Tarsus (Paul, before his renaming) is the global default, but every "Saul" in
 *   1/2 Samuel and 1 Chronicles is King Saul, centuries earlier.
 * - "Edom": default owner is the Edom location (see edomLocationEntry above) — Genesis is the one book
 *   where "Edom" means Esau himself (Genesis 36's "Esau is Edom"). */
const BOOK_NAME_OVERRIDES: Record<string, Record<string, string>> = {
  joseph: {
    Matthew: "joseph-husband-of-mary",
    Luke: "joseph-husband-of-mary",
    Mark: "joseph-of-arimathea",
    John: "joseph-of-arimathea",
  },
  john: { Acts: "john-the-apostle" },
  james: { Galatians: "james-brother-of-jesus", "1 Corinthians": "james-brother-of-jesus", Acts: "james-brother-of-jesus" },
  saul: { "1 Samuel": "saul-king-of-israel", "2 Samuel": "saul-king-of-israel", "1 Chronicles": "saul-king-of-israel" },
  edom: { Genesis: "esau" },
};

/** Names where, unlike the overrides above, there's no good redirect target outside a short list of
 * books — the bare name resolves to a person entry that owns it globally, but every OTHER mention
 * refers to someone/something this app has no entry for (a different, unrepresented person; a tribe
 * named after the person; an unrelated common noun the regex's case-insensitive match happens to
 * catch), so the least-wrong move is no link at all rather than a confidently wrong one. Each entry
 * lists the book(s) this person's own `verses` field actually cites — see people.ts.
 * - "Manasseh": only entry is the King of Judah (2 Kings 21/2 Chronicles 33/Matthew 1:10), but far more
 *   frequent is the tribe descended from Joseph's son, throughout Genesis/Numbers/Deuteronomy/Joshua/
 *   Judges/1 Chronicles/Ezekiel/Revelation.
 * - "Levi": only entry is Matthew/Levi the apostle, but far more frequent is Levi son of Jacob and the
 *   tribe of Levi (Genesis 29:34 onward, constantly through Numbers/Deuteronomy).
 * - "Simeon": only entry is Simeon at the temple (Luke 2), but Simeon son of Jacob and the tribe of
 *   Simeon appear constantly from Genesis 29:33 through Joshua 19.
 * - "Zechariah"/"Zacharias": only entry is John the Baptist's father, but "Zechariah" alone names a
 *   king of Israel (2 Kings 15), the prophet who wrote the book of Zechariah, and Zechariah son of
 *   Jehoiada (2 Chronicles 24) — three unrelated figures with no entries here.
 * - "Lazarus": only entry is Lazarus of Bethany, but the beggar in Jesus's parable (Luke 16:19-31) is a
 *   distinct, unrelated (parabolic) figure sharing the name.
 * - "Rahab": only entry is Rahab of Jericho, but "Rahab" is also a poetic name for a sea-monster/chaos
 *   figure (and by extension Egypt) in Job, Psalms, and Isaiah 51:9.
 * - "Deborah": only entry is the judge/prophetess, but Genesis 35:8 names an unrelated minor figure,
 *   Rebekah's nurse, also Deborah.
 * - "Boaz": only entry is Ruth's Boaz, but 1 Kings 7:21/2 Chronicles 3:17 name one of the temple's two
 *   bronze pillars "Boaz" — not a person at all.
 * - "Joshua": only entry is Joshua son of Nun, but Zechariah 3 and Haggai name a post-exilic high
 *   priest also called Joshua, centuries later.
 * - "Zerah": only entry is Zerah son of Judah, but 2 Chronicles 14:9 names a much later Cushite/
 *   Ethiopian military commander of the same name.
 * - "Ram": only entry is Ram son of Hezron (in genealogies), but the case-insensitive match also catches
 *   the common noun "ram" (a sacrificial animal) throughout Genesis 22 onward.
 * - "Abijah": only entry is King Abijah/Abijam of Judah, but Luke 1:5 names a priestly division founded
 *   by an earlier, different Abijah (1 Chronicles 24:10).
 * - "Jotham": only entry is King Jotham of Judah, but Judges 9 centers on an earlier Jotham, youngest
 *   son of Jerubbaal (Gideon), famous for the parable of the trees.
 * - "Zadok": only entry is a minor Zadok in Jesus's genealogy (Matthew 1), but the far more prominent
 *   Zadok the priest under David and Solomon (2 Samuel 8:17 onward) has no entry here.
 * - "Eleazar": only entry is a minor Eleazar in Jesus's genealogy (Matthew 1), but the far more
 *   prominent Eleazar son of Aaron, Israel's third high priest (Exodus 6:23 onward), has no entry here.
 * - "Hezron": only entry is Hezron son of Perez (Matthew's genealogy), but Exodus 6:14 names a
 *   different Hezron, son of Reuben.
 * - "Amminadab": only entry is the one in Ruth/Matthew's genealogy, but 1 Chronicles 6:22 names a
 *   different, Levite/Kohathite Amminadab.
 * - "Josiah": only entry is King Josiah of Judah, but Zechariah 6:10 names an unrelated, minor
 *   post-exilic figure also called Josiah.
 * - "Jeremiah": only entry is the prophet, but 2 Kings 23:31 names an unrelated Jeremiah of Libnah
 *   (Josiah's father-in-law).
 * - "Ahaz": only entry is King Ahaz of Judah, but 1 Chronicles 8:35-36/9:42 name an unrelated, minor
 *   Benjaminite descendant of Saul also called Ahaz.
 * - "Amon": only entry is King Amon of Judah, but 1 Kings 22:26 names a different city governor also
 *   called Amon, and Jeremiah 46:25 names the Egyptian deity Amun (rendered "Amon" in WEB).
 * - "Azariah": only entry is King Uzziah of Judah (also called Azariah), but Daniel 1 uses "Azariah" as
 *   the original Hebrew name of Abednego, one of Daniel's three companions — a well-known, unrelated
 *   figure. (Restricting this key only affects the "Azariah" alternate name — "Uzziah" itself is
 *   unambiguous and still links everywhere.) */
const BOOK_NAME_ALLOWLIST: Record<string, string[]> = {
  manasseh: ["2 Kings", "2 Chronicles", "Matthew"],
  levi: ["Matthew", "Mark"],
  simeon: ["Luke"],
  zechariah: ["Luke"],
  zacharias: ["Luke"],
  lazarus: ["John"],
  rahab: ["Joshua", "Matthew", "Hebrews", "James"],
  deborah: ["Judges"],
  boaz: ["Ruth", "Matthew"],
  joshua: ["Numbers", "Deuteronomy", "Joshua", "Acts", "Hebrews"],
  zerah: ["Genesis", "Numbers", "Joshua"],
  ram: ["Ruth", "1 Chronicles", "Matthew"],
  abijah: ["1 Kings", "2 Chronicles", "Matthew"],
  jotham: ["2 Kings", "2 Chronicles", "Matthew"],
  zadok: ["Matthew"],
  eleazar: ["Matthew"],
  hezron: ["Genesis", "Ruth", "Matthew"],
  amminadab: ["Ruth", "Exodus", "Matthew"],
  josiah: ["2 Kings", "2 Chronicles", "Matthew"],
  jeremiah: ["Jeremiah", "Lamentations", "Matthew"],
  ahaz: ["2 Kings", "2 Chronicles", "Isaiah", "Matthew"],
  amon: ["2 Kings", "2 Chronicles", "Matthew"],
  azariah: ["2 Kings", "2 Chronicles", "Matthew"],
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
        const allowlist = BOOK_NAME_ALLOWLIST[name.toLowerCase()];
        const suppressed = !!allowlist && !!book && !allowlist.includes(book);
        if (!suppressed) {
          const overrideId = book ? BOOK_NAME_OVERRIDES[name.toLowerCase()]?.[book] : undefined;
          const id = overrideId ?? entry.id;
          const kind = overrideId ? (ID_TO_KIND.get(overrideId) ?? entry.kind) : entry.kind;
          if (id !== excludeId) {
            annotations.push({ start, end, text: name, kind, id });
          }
        }
      }
    }
  }
  return annotations;
}

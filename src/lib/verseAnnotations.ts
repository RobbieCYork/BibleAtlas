import { locations } from "../data/locations";
import { pois } from "../data/pois";
import { people } from "../data/people";
import { topics } from "../data/topics";
import { timelineEvents } from "../data/timelineEvents";
import { BOOKS } from "../data/bibleBooks";

export interface LinkAnnotation {
  start: number;
  end: number;
  text: string;
  kind: "location" | "poi" | "person" | "topic" | "timeline" | "verse";
  /** Location/POI/person/topic/timeline-event id — present for every kind except "verse". */
  id?: string;
}

interface NameEntry {
  name: string;
  id: string;
  kind: "location" | "poi" | "person" | "topic" | "timeline";
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
  // `alternateNames` is reader-facing copy — PersonPanel, LocationPanel and TopicPanel print it as
  // "Also called: ...". `matchNames` is for wordings that exist only so the linker can match them
  // and would be noise on the page: the same phrase punctuated two ways because two translations
  // punctuate it two ways. Both feed the pattern; only the first is ever shown.
  const names = (r: { name: string; alternateNames?: string[]; matchNames?: string[] }) =>
    [r.name, ...(r.alternateNames ?? []), ...(r.matchNames ?? [])];
  locations.forEach((loc) => {
    names(loc).forEach((n) => entries.push({ name: n, id: loc.id, kind: "location" }));
  });
  pois.forEach((poi) => {
    names(poi).forEach((n) => entries.push({ name: n, id: poi.id, kind: "poi" }));
  });
  people.forEach((person) => {
    names(person).forEach((n) => entries.push({ name: n, id: person.id, kind: "person" }));
  });
  topics.forEach((topic) => {
    names(topic).forEach((n) => entries.push({ name: n, id: topic.id, kind: "topic" }));
  });
  // Timeline events (no alternateNames field) — pushed last, so an event title would win a collision
  // with any earlier entry's name; titles are deliberately long, distinctive phrases ("Fall of
  // Jerusalem to Babylon"), so in practice they only match when the full title is written out.
  timelineEvents.forEach((event) => {
    entries.push({ name: event.title, id: event.id, kind: "timeline" });
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
  // "Caesar": Tiberius (the global default — see his alternateNames) is correct for every bare
  // mention in the four Gospels, since Jesus's entire ministry and death fell within his reign. Acts'
  // bare "Caesar" mentions are almost all Nero (Paul's appeal, Acts 25:8 onward) except one much
  // earlier exception (Acts 17:7, Claudius's reign) handled by VERSE_NAME_OVERRIDES below. Philippians
  // was written from Paul's Roman imprisonment under Nero (Philippians 4:22, "Caesar's household").
  caesar: { Acts: "nero-caesar", Philippians: "nero-caesar" },
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
/** Finest-grained override: some bare names are ambiguous even within a single book (BOOK_NAME_OVERRIDES
 * can't help — two+ legitimate bearers' mentions overlap in the SAME book). Keyed by lowercase bare name
 * -> book -> "chapter:verse" -> target person id, or `null` to suppress the link entirely (the mention is
 * a real, different person this app has no entry for, so the least-wrong move is no link — same
 * philosophy as BOOK_NAME_ALLOWLIST above). Every entry below independently confirmed against the WEB
 * translation text. Takes precedence over BOOK_NAME_ALLOWLIST/BOOK_NAME_OVERRIDES when present.
 * - "Mary": the default owner (mary-mother-of-jesus) is correct for the large majority of bare mentions,
 *   but is wrong at every verse listed under `mary` below — Mary of Bethany (Luke 10, John 11-12), Mary
 *   Magdalene (Luke 8:2, John 20:11/16), and Mary "the mother of James/Joses" (Matthew 27:56/61, 28:1;
 *   Mark 15:40/47, 16:1; Luke 24:10) all get bare "Mary" mentions in the same books as the mother of
 *   Jesus. Acts 12:12's "Mary, the mother of John [Mark]" is a fourth, distinct Mary with no entry here.
 * - "Philip": Philip the Apostle (the default) is correct except Luke 3:1, which names Philip the
 *   Tetrarch, and Acts 6:5/8:5-40/21:8, which name Philip the Evangelist (one of the seven, distinct
 *   from both — see his own lifeStory note). Mark 6:17/Matthew 14:3's "his brother Philip" is a third,
 *   different Herodian half-brother (see the note in philip-the-tetrarch's lifeStory) with no entry —
 *   suppressed rather than mislinked.
 * - "Simon": Simon Peter (the default) is correct except John 6:71/12:4/13:2/13:26, where "Simon('s
 *   son)/Simon Iscariot" names Judas Iscariot's father — a distinct person with no entry — suppressed;
 *   and except Matthew 13:55/Mark 6:3, where the Nazareth crowd lists Jesus' brothers (see "James" and
 *   "Judas" below) — that Simon is not Peter and not Simon the Zealot, and has no entry — suppressed.
 * - "James": James, son of Zebedee owns the bare name globally, but the Nazareth crowd's list of Jesus'
 *   brothers in Matthew 13:55/Mark 6:3 means James "the Just," already an entry here (james-brother-of-
 *   jesus, whose own `verses` field cites Mark 6:3). Luke 6:16's "Judas the son of James" names a third
 *   James — the apostle Judas's father, an otherwise unmentioned man with no entry. That whole wording
 *   is now registered on thaddaeus (see people.ts) and is matched as one phrase, so no bare "James" is
 *   produced at Luke 6:16 at all and the `Luke` entry below no longer fires. It is left in place
 *   because it agrees with the result, but the phrase is what does the work, not the suppression.
 *   Acts 1:13 is fixed, and was not always. Its apostle list names three DIFFERENT men called James
 *   (Zebedee's son; Alphaeus's son; Judas's father), and a per-verse override applies one answer to
 *   every match of the key, so while all three were bare "James" matches any single value was wrong
 *   twice over. Registering the two longer wordings — "James the son of Alphaeus" on james-son-of-
 *   alphaeus, and the "James" inside "Judas the son of James" on thaddaeus (both in people.ts) —
 *   takes those two out of this key, leaving exactly one bare "James": the son of Zebedee, which the
 *   Acts entry below now sets. Without it the Acts entry in BOOK_NAME_OVERRIDES would send him to
 *   the brother of Jesus. Same technique as Acts 10:32's two Simons.
 * - "Judas": Judas Iscariot owns the bare name globally, and is right at most mentions, but is wrong at
 *   three places naming the OTHER apostle Judas — "Judas, son of James," i.e. Thaddaeus (Luke 6:16;
 *   Acts 1:13; John 14:22, where the text itself says "Judas (not Iscariot)"). Of those three only
 *   John 14:22 still needs its entry below: at Luke 6:16 and Acts 1:13 the full wording "Judas the son
 *   of James" is registered on thaddaeus (see people.ts) and is matched as one phrase, so no bare
 *   "Judas" survives at either verse and the `Luke` entry below no longer fires. (Luke 6:16's second
 *   Judas is matched as the longer registered name "Judas Iscariot" and resolves on its own.) Wrong
 *   again at Matthew 13:55, where the Judas listed is a brother of Jesus — a fourth, distinct man with
 *   no entry here, so suppressed. (Mark 6:3, the parallel passage, needs no entry: WEB renders that
 *   same brother's name "Judah," which no entry in this app claims, so it already produces no link.) */
const VERSE_NAME_OVERRIDES: Record<string, Record<string, Record<string, string | null>>> = {
  mary: {
    Matthew: { "27:56": "mary-mother-of-james-the-less", "27:61": "mary-mother-of-james-the-less", "28:1": "mary-mother-of-james-the-less" },
    Mark: { "15:40": "mary-mother-of-james-the-less", "15:47": "mary-mother-of-james-the-less", "16:1": "mary-mother-of-james-the-less" },
    Luke: { "8:2": "mary-magdalene", "10:39": "mary-of-bethany", "10:42": "mary-of-bethany", "24:10": "mary-mother-of-james-the-less" },
    John: {
      "11:1": "mary-of-bethany",
      "11:2": "mary-of-bethany",
      "11:19": "mary-of-bethany",
      "11:20": "mary-of-bethany",
      "11:28": "mary-of-bethany",
      "11:31": "mary-of-bethany",
      "11:32": "mary-of-bethany",
      "11:45": "mary-of-bethany",
      "12:3": "mary-of-bethany",
      "20:11": "mary-magdalene",
      "20:16": "mary-magdalene",
    },
    Acts: { "12:12": null },
  },
  philip: {
    Luke: { "3:1": "philip-the-tetrarch" },
    Mark: { "6:17": null },
    Matthew: { "14:3": null },
    Acts: {
      "6:5": "philip-the-evangelist",
      "8:5": "philip-the-evangelist",
      "8:6": "philip-the-evangelist",
      "8:12": "philip-the-evangelist",
      "8:13": "philip-the-evangelist",
      "8:26": "philip-the-evangelist",
      "8:29": "philip-the-evangelist",
      "8:30": "philip-the-evangelist",
      "8:31": "philip-the-evangelist",
      "8:34": "philip-the-evangelist",
      "8:35": "philip-the-evangelist",
      "8:38": "philip-the-evangelist",
      "8:39": "philip-the-evangelist",
      "8:40": "philip-the-evangelist",
      "21:8": "philip-the-evangelist",
    },
  },
  simon: {
    John: { "6:71": null, "12:4": null, "13:2": null, "13:26": null },
    // Matthew 27:32 words it "a man of Cyrene, Simon by name", so the registered key "Simon of
    // Cyrene" — which does resolve Mark 15:21 and Luke 23:26 correctly — cannot reach it, and the
    // man who carried the cross rendered as Simon Peter.
    Matthew: { "13:55": null, "27:32": "simon-of-cyrene" },
    Mark: { "6:3": null },
    // Luke 7:36-50, the anointing at the Pharisee's house: the host is named Simon three times and
    // is not Peter. simon-the-pharisee has an entry; the text never gives it a longer wording.
    Luke: { "7:40": "simon-the-pharisee", "7:43": "simon-the-pharisee", "7:44": "simon-the-pharisee" },
    Acts: {
      // Acts 8:9-24 — the sorcerer who tries to buy the Holy Spirit, rendered as the chief apostle
      // in the very passage where Peter rebukes him. simon-magus has an entry; Acts only ever calls
      // him "Simon".
      "8:9": "simon-magus",
      "8:13": "simon-magus",
      "8:18": "simon-magus",
      "8:24": "simon-magus",
      // Simon the tanner of Joppa, whose house Peter lodges in — a different man, with no entry.
      // Acts 10:17's "Simon's house" is genuinely ambiguous between the two and is left alone.
      // Acts 10:32 names BOTH men — "summon Simon, who is also called Peter... in the house of a
      // tanner named Simon" — which a per-verse override alone cannot separate, because it applies
      // one answer to every match of the key. Registering "Simon, who is also called Peter" as a
      // phrase on simon-peter (see people.ts) takes the apostle out of this key here, so the entry
      // below reaches only the tanner. Same technique as Acts 1:13's three Jameses.
      "9:43": null,
      "10:6": null,
      "10:32": null,
    },
  },
  james: {
    Matthew: { "13:55": "james-brother-of-jesus" },
    Mark: { "6:3": "james-brother-of-jesus" },
    Luke: { "6:16": null },
    // Acts 1:13's apostle list names three different men called James. Two of them are now matched
    // as whole phrases — "James the son of Alphaeus", and the "James" inside "Judas the son of
    // James" — leaving exactly one bare "James", the son of Zebedee, which the Acts book override
    // would otherwise send to the brother of Jesus. That is what makes this verse fixable: it is
    // no longer three occurrences needing three answers, it is one.
    Acts: { "1:13": "james-son-of-zebedee" },
  },
  judas: {
    Matthew: { "13:55": null },
    Luke: { "6:16": "thaddaeus" },
    John: { "14:22": "thaddaeus" },
    Acts: { "1:13": "thaddaeus" },
  },
  // "Enoch": the patriarch (Genesis 5, Hebrews 11:5, Jude 1:14-15) is the default owner of bare
  // "Enoch," but Genesis 4:17-18, one chapter earlier, names a completely different Enoch — Cain's
  // son, after whom Cain named a city — so those two verses are suppressed rather than mislinked.
  enoch: {
    Genesis: { "4:17": null, "4:18": null },
  },
  // "Caesar" in Acts is Nero almost everywhere (BOOK_NAME_OVERRIDES above), except Acts 17:7 —
  // Paul's very early ministry in Thessalonica, which falls within Claudius's reign (compare Acts
  // 18:2's mention of Claudius's expulsion edict, not long after).
  caesar: {
    Acts: { "17:7": "claudius-caesar" },
  },
  // "Ananias": ananias-and-sapphira (the best-known of the three) is the default owner of bare
  // "Ananias," but Acts 9/22 name a different Ananias — the Damascus disciple who restores Saul's
  // sight — and Acts 23-24 name a third, the high priest who prosecutes Paul.
  // "Joram" / "Jehoram": two kings of the same name reigning at the same time, one in Israel (son of
  // Ahab) and one in Judah (son of Jehoshaphat), and 2 Kings 8-9 moves between them sentence by
  // sentence. The bare names belong to the king of Judah; every verse below means the king of
  // Israel. Read one by one against the WEB text — the deciding phrase is usually "the son of Ahab"
  // or "king of Israel" in the same clause, or Jehu's coup, which is entirely an Israelite affair.
  //
  // The two verses that name BOTH men are handled by matching the longer wording rather than by a
  // per-verse answer, since a per-verse override applies one answer to every match of a key:
  // 2 Chronicles 22:6 is settled entirely by the registered phrase "Jehoram the son of Ahab", and
  // 2 Kings 1:17 by registering "Jehoram the son of Jehoshaphat" on the king of Judah, which
  // leaves one bare "Jehoram" for the entry below to point at Israel. Neither needs
  // occurrence-aware resolution after all.
  joram: {
    "2 Kings": {
      "8:16": "joram-king-of-israel", "8:25": "joram-king-of-israel",
      "8:28": "joram-king-of-israel", "8:29": "joram-king-of-israel",
      "9:14": "joram-king-of-israel", "9:15": "joram-king-of-israel",
      "9:16": "joram-king-of-israel", "9:17": "joram-king-of-israel",
      "9:21": "joram-king-of-israel", "9:22": "joram-king-of-israel",
      "9:23": "joram-king-of-israel", "9:24": "joram-king-of-israel",
      "9:29": "joram-king-of-israel",
    },
    "2 Chronicles": { "22:5": "joram-king-of-israel", "22:7": "joram-king-of-israel" },
    // Joram son of Toi of Hamath, a Syrian prince sent to congratulate David — no entry.
    "2 Samuel": { "8:10": null },
    // A Levite descended from Eliezer, in the temple-treasury lists — no entry.
    "1 Chronicles": { "26:25": null },
  },
  jehoram: {
    "2 Kings": {
      "3:1": "joram-king-of-israel", "3:6": "joram-king-of-israel",
      // "Jehoram began to reign in his place in the second year of Jehoram the son of Jehoshaphat
      // king of Judah" — the first is Israel's (Ahaziah of Israel has just died with no son); the
      // second is matched as a phrase and never reaches this key.
      "1:17": "joram-king-of-israel",
    },
    "2 Chronicles": {
      "22:5": "joram-king-of-israel", "22:7": "joram-king-of-israel",
      "17:8": null,  // "Elishama and Jehoram, the priests" — a Levite, no entry.
    },
  },
  // "Hoshea": the bare name is Joshua's — Numbers 13:16 records Moses renaming him — and the
  // allowlist below keeps it to Numbers for that reason. These four are the last king of Israel,
  // whose reign 2 Kings 17 narrates; the verses that introduce him as "Hoshea the son of Elah"
  // (2 Kings 15:30, 17:1, 18:1, 18:9) match that longer phrase and need no entry here.
  hoshea: {
    "2 Kings": {
      "17:3": "hoshea-king-of-israel",
      "17:4": "hoshea-king-of-israel",
      "17:6": "hoshea-king-of-israel",
      "18:10": "hoshea-king-of-israel",
    },
  },
  // "Mark": the capitalisation test in CAPITALISED_ONLY below removes the 24 lowercase matches — the
  // mark of the beast, "signs to mark seasons", "set a mark on the foreheads". Four capitalised ones
  // survive it, and all four are the imperative verb rather than the evangelist. They are the only
  // "Mark"s in Scripture that are not the man; the other eight (Acts 12:12 onward) are.
  mark: {
    "2 Samuel": { "13:28": null },   // "Mark now, when Amnon's heart is merry with wine"
    Job: { "33:31": null },          // "Mark well, Job, and listen to me"
    Psalms: { "37:37": null, "48:13": null }, // "Mark the perfect man"; "Mark well her bulwarks"
  },
  // "Counselor": lowercase matches are human royal advisers and are removed by capitalisation.
  // 1 John 2:1 is capitalised, so only a per-verse entry can reach it, and the link it produced was
  // plainly wrong: "we have a Counselor with the Father, Jesus Christ, the righteous" names its own
  // referent in the next clause, and the link said Holy Spirit. Removing it is not a judgement call.
  //
  // What IS a judgement call is what replaces it, and this is NOT the Isaiah 9:6 question — an
  // earlier version of this comment said it was, and that is wrong. Isaiah 9:6 asks whether a
  // throne-name in a prophetic oracle is messianic; 1 John 2:1 asks nothing, because the verse
  // identifies the Counselor itself. The reason for no link rather than a link to Jesus is simpler:
  // the verse already names him three words later, so the link would carry no information a reader
  // does not already have — and making "Counselor" point at Jesus here while it points at the Holy
  // Spirit in John 14:16, 14:26 and 15:26 is a decision about the key as a whole, not about this
  // verse. Whoever takes that up should take it up for all five at once. Isaiah 9:6 is left exactly
  // as it is, pending Robbie's ruling (§7.3).
  counselor: {
    "1 John": { "2:1": null },
  },
  // "The accuser": see CAPITALISED_ONLY — the key is not flagged, because Revelation 12:10 is
  // genuinely Satan. Job 31:35's accuser is the legal opponent in Job's imagined lawsuit.
  "the accuser": {
    Job: { "31:35": null },
  },
  // "Nathan": the court prophet is the only Nathan with an entry, and until his name was registered
  // at all (see people.ts) he could not be linked from anywhere. Several other men share it. The
  // allowlist below keeps him to the books where he acts; these are the exceptions inside those
  // books — all of them a different Nathan, none of them with an entry, so: no link.
  nathan: {
    "2 Samuel": { "5:14": null, "23:36": null },
    "1 Chronicles": { "2:36": null, "3:5": null, "11:38": null, "14:4": null },
    // 1 Kings 4:5 names "Azariah the son of Nathan" and "Zabud the son of Nathan": commentators
    // divide over whether that Nathan is the prophet or David's son of the same name. Left unlinked
    // rather than resolved on a guess.
    "1 Kings": { "4:5": null },
  },
  ananias: {
    Acts: {
      "9:10": "ananias-of-damascus",
      "9:12": "ananias-of-damascus",
      "9:13": "ananias-of-damascus",
      "9:17": "ananias-of-damascus",
      "22:12": "ananias-of-damascus",
      "23:2": "ananias-the-high-priest",
      "24:1": "ananias-the-high-priest",
    },
  },
};

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
  // "Nathan": the prophet acts in 2 Samuel, 1 Kings and 1-2 Chronicles, and Psalm 51's
  // superscription names him. Everywhere else — Ezra 8:16 and 10:39, Zechariah 12:12, Luke 3:31 —
  // the name belongs to someone else with no entry here. Exceptions inside the allowed books are
  // handled verse by verse in VERSE_NAME_OVERRIDES above.
  nathan: ["2 Samuel", "1 Kings", "1 Chronicles", "2 Chronicles", "Psalms"],
  // "Hoshea" is Joshua's own original name and means him in Numbers 13:8 and 13:16 — and nowhere
  // else. Everywhere outside Numbers it names the last king of Israel (recovered verse by verse
  // above), an Ephraimite officer under David (1 Chronicles 27:20), or a signer of Nehemiah's
  // covenant (Nehemiah 10:23) — the last two with no entry here, so no link.
  hoshea: ["Numbers"],
};

/** Names that are also ordinary English words. The match is case-insensitive on purpose — it is what
 * lets lowercase-in-translation phrases like "city of David" and "upper room" link — but that same
 * insensitivity meant *the mark of the beast* pointed at Mark the Evangelist in six verses of
 * Revelation, "let them be for signs to mark seasons" in Genesis 1:14, a king's *counselor* pointed
 * at the Holy Spirit, and every sacrificial *ram* from Genesis 22 onward pointed at Ram son of
 * Hezron. For the keys listed here, and only these, the match must also LOOK like a name.
 *
 * Unlike the book and verse tables above, this works on both rendering paths — it needs no context —
 * so it is the first correction in this file that fixes our own articles as well as the Bible reader.
 *
 * Measured by turning the rule off and diffing the whole-corpus snapshot (scripts/name-linker).
 * State the SURFACE with every one of these numbers — they differ by an order of magnitude between
 * them, and quoting the panel figure as if it were the article surface is the single mistake this
 * work has made most often:
 *
 *   key             Scripture, reader   Scripture, panel   our own articles (prose)
 *   mark                    24                 24                    30
 *   counselor                9                  9                     1
 *   the counselor            1                  1                     0
 *   the adversary           15                 15                     0
 *   ram                      0                 92                     7
 *
 * "ram" is the clearest illustration: 92 is a PANEL-path number. The reader path never had those
 * links to lose — BOOK_NAME_ALLOWLIST already confines "ram" to Ruth, 1 Chronicles and Matthew —
 * and on the article surface the rule takes 7 links out, leaving 2, both of them the real man.
 * The capitalised stragglers this rule cannot see are handled verse by verse above.
 *
 * "the accuser" is deliberately NOT in this list. Both its occurrences are lowercase, and one of
 * them — Revelation 12:10, "the accuser of our brothers... who accuses them before our God" — is
 * genuinely Satan. Flagging the key would take that correct link out to fix the one wrong one, so
 * Job 31:35 gets a per-verse entry instead. */
const CAPITALISED_ONLY = new Set(["mark", "counselor", "the counselor", "the adversary", "ram"]);

/** Does this match's capitalisation mark it as a name rather than the common word?
 *
 * A leading article carries no information — "The adversary" opening Lamentations 1:10 is
 * capitalised by position, not because anyone is being named — so it is stripped before the test,
 * and what is judged is the noun itself.
 *
 * Sentence position is deliberately NOT consulted beyond that. It is tempting to discount every
 * capital that opens a sentence, but "Ram" opens both 1 Chronicles 2:10 and Matthew 1:4 and is the
 * man in each, and "Mark" opens genuine sentences in our own articles. Doing so would trade a
 * handful of fixes for a pile of real links. */
function looksLikeAName(matched: string): boolean {
  return /^[A-Z]/.test(matched.replace(/^(?:the|a|an)\s+/i, ""));
}

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

/** Finds every location/POI/person/topic/timeline-event/verse-reference mention in `text`, as
 * character-offset annotations.
 * `book` (e.g. "Matthew") is optional context used to resolve a handful of ambiguous bare names via
 * BOOK_NAME_OVERRIDES/VERSE_NAME_OVERRIDES above. `chapter`/`verse` narrow further to VERSE_NAME_OVERRIDES
 * (exact chapter:verse) when all three are supplied — the Bible reader passes all three per-verse; the
 * verse-list views in person/location/POI panels pass none, so ambiguous names there just resolve to
 * their global default owner. */
export function computeLinkAnnotations(
  text: string,
  excludeId?: string,
  book?: string,
  chapter?: number,
  verse?: number
): LinkAnnotation[] {
  if (!NAME_PATTERN) return [];
  const annotations: LinkAnnotation[] = [];
  NAME_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAME_PATTERN.exec(text)) !== null) {
    const name = match[0];
    const start = match.index;
    const end = start + name.length;
    if (/\d/.test(name) && !NAME_TO_ENTRY.has(name.toLowerCase())) {
      // A match containing a digit is a Bible verse reference — UNLESS it is itself a registered
      // entity name. Almost no name in this app's data contains a digit, but a few must: manuscript
      // sigla like "P52" are how the artefact articles are actually referred to in prose, and
      // without this exception they rendered as a verse link that the Bible panel cannot resolve.
      // Safe because the verse-reference fragments are listed FIRST in NAME_PATTERN's alternation,
      // so a real reference like "John 3:16" is matched as a verse before the name branch is tried
      // — this exception can only fire on a whole match that is exactly a registered name.
      annotations.push({ start, end, text: name, kind: "verse" });
    } else {
      const nameLower = name.toLowerCase();
      const entry = NAME_TO_ENTRY.get(nameLower);
      if (entry) {
        const verseKey = chapter != null && verse != null ? `${chapter}:${verse}` : undefined;
        const verseOverrides = book && verseKey ? VERSE_NAME_OVERRIDES[nameLower]?.[book] : undefined;
        const hasVerseOverride = !!verseOverrides && Object.prototype.hasOwnProperty.call(verseOverrides, verseKey!);

        if (hasVerseOverride) {
          const verseId = verseOverrides![verseKey!];
          if (verseId !== null && verseId !== excludeId) {
            annotations.push({ start, end, text: name, kind: ID_TO_KIND.get(verseId) ?? entry.kind, id: verseId });
          }
          // verseId === null means this exact mention is a different, unrepresented person — no link.
        } else if (CAPITALISED_ONLY.has(nameLower) && !looksLikeAName(name)) {
          // An ordinary English word, not the name it shares. No link. Checked AFTER the per-verse
          // table on purpose: a verse override can still force a link on a lowercase match if some
          // future translation ever needs one, and it is what suppresses the handful of capitalised
          // stragglers this test cannot see (Psalm 37:37's "Mark the perfect man", 1 John 2:1).
        } else {
          const allowlist = BOOK_NAME_ALLOWLIST[nameLower];
          const suppressed = !!allowlist && !!book && !allowlist.includes(book);
          if (!suppressed) {
            const overrideId = book ? BOOK_NAME_OVERRIDES[nameLower]?.[book] : undefined;
            const id = overrideId ?? entry.id;
            const kind = overrideId ? (ID_TO_KIND.get(overrideId) ?? entry.kind) : entry.kind;
            if (id !== excludeId) {
              annotations.push({ start, end, text: name, kind, id });
            }
          }
        }
      }
    }
  }
  return annotations;
}

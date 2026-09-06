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

// SAUL_DEFAULT.
// "Saul" is the same problem between two people, and it was the largest single wrong-link fault the
// harness has measured. Two men share the bare name: Israel's first king, and Paul before his
// renaming. Paul owned the key globally, and BOOK_NAME_OVERRIDES recovered the king inside 1-2
// Samuel and 1 Chronicles — which fixed the Bible reader and nothing else, because no other surface
// passes a book. Measured with scripts/name-linker, per surface:
//
//   surface                                          king   Paul
//   Scripture, reader path (book passed)              386     30   ← the 5 Psalms superscriptions
//                                                                    were Paul's, wrongly
//   Scripture, panel path (verse lists, no book)        0    416
//   the app's own prose (articles, panels, intros)      0    126
//
// The king is the referent of 391 of the 416 bare "Saul"s in Scripture and 100 of the 126 in our own
// prose, so he — not Paul — is the honest global default, exactly as "Edom" above belongs to the
// nation and not to Esau. Forcing it here rather than relying on people.ts array order, for the same
// reason Edom does: the order that makes it come out right today is an accident of where the record
// happens to sit in the file.
//
// Paul is recovered three ways once the default moves: BOOK_NAME_OVERRIDES sends every bare "Saul"
// in Acts back to him on the reader path; OWNER_NAME_OVERRIDES sends the seven records whose own
// article is about him back to him on the prose path; and "Saul the son of Kish" stays registered
// on the king (people.ts) so Acts 13:21 survives the Acts override. What is left is the 25 bare
// "Saul"s of Acts as they appear in a PANEL verse list with no owner — genuinely context-free, and
// the same residual every key in this file carries there.
const saulKingEntry = NAME_ENTRIES.find((e) => e.id === "saul-king-of-israel" && e.name.toLowerCase() === "saul");
if (saulKingEntry) NAME_TO_ENTRY.set("saul", saulKingEntry);

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
 * - "John": John the Baptist stays the global default, and the whole-Bible count is why — of the 132
 *   bare "John"s in the WEB text, 92 are the Baptist, 30 the Apostle, 5 John Mark, 1 the
 *   high-priestly John of Acts 4:6, and 4 the John of Revelation. He is the honest majority owner
 *   in Scripture, though NOT in our own articles, where the article surface needs
 *   OWNER_NAME_OVERRIDES below. The book overrides are Acts (9 of its 24 are the Apostle, and the
 *   other 15 are corrected verse by verse below — a blanket Acts redirect on its own scored exactly
 *   as badly as no redirect at all, 9 right and 15 wrong either way) and Galatians (whose single
 *   occurrence, the "pillars" of Galatians 2:9, is the Apostle). The Gospels are NOT overridden —
 *   the Baptist is right in 64 of their 83 mentions — so the 19 apostle occurrences there are
 *   corrected verse by verse instead.
 * - "James": James, son of Zebedee is the global default, but Galatians, 1 Corinthians, and Acts
 *   overwhelmingly mean James, brother of Jesus (leader of the Jerusalem church) once Zebedee's son is
 *   long dead (Acts 12:2) — Acts 12:17/15:13/21:18 all mean the brother.
 * - "Saul": the direction of this one REVERSED — see the SAUL_DEFAULT block above. King Saul is now
 *   the global default, and Acts is the one book where a bare "Saul" means Paul before his
 *   renaming. Acts 13:21's "Saul the son of Kish" is the king even so, and is matched as that
 *   longer registered wording rather than by an exception here.
 * - "Edom": default owner is the Edom location (see edomLocationEntry above) — Genesis is the one book
 *   where "Edom" means Esau himself (Genesis 36's "Esau is Edom"). */
const BOOK_NAME_OVERRIDES: Record<string, Record<string, string>> = {
  joseph: {
    Matthew: "joseph-husband-of-mary",
    Luke: "joseph-husband-of-mary",
    Mark: "joseph-of-arimathea",
    John: "joseph-of-arimathea",
  },
  john: { Acts: "john-the-apostle", Galatians: "john-the-apostle" },
  james: { Galatians: "james-brother-of-jesus", "1 Corinthians": "james-brother-of-jesus", Acts: "james-brother-of-jesus" },
  saul: { Acts: "paul-of-tarsus" },
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
 *   produced at Luke 6:16 at all. There WAS a `Luke: { "6:16": null }` entry below; it could not fire
 *   once the phrase was registered, and it has been removed rather than left standing as a claim
 *   about behaviour it no longer has. `run.mjs --ref "Luke 6:16"` is the check: the verse returns only
 *   whole-phrase annotations.
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
 *   "Judas" survives at either verse. Luke 6:16's own entry has been removed for the same reason as
 *   "James"'s above — it could not fire, and a dead entry reads as a live claim. (Luke 6:16's second
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
    // Acts 1:13's apostle list names three different men called James. Two of them are now matched
    // as whole phrases — "James the son of Alphaeus", and the "James" inside "Judas the son of
    // James" — leaving exactly one bare "James", the son of Zebedee, which the Acts book override
    // would otherwise send to the brother of Jesus. That is what makes this verse fixable: it is
    // no longer three occurrences needing three answers, it is one.
    Acts: { "1:13": "james-son-of-zebedee" },
  },
  judas: {
    Matthew: { "13:55": null },
    John: { "14:22": "thaddaeus" },
    Acts: { "1:13": "thaddaeus" },
  },
  // "John". Five different men share the bare name in the New Testament, and until this entry
  // existed the app gave all of them to the Baptist except in Acts, where a blanket book override
  // gave all of them to the Apostle. The reported fault was Matthew 17:1 — "Peter, James, and John
  // his brother" at the Transfiguration, rendered as John the Baptist.
  //
  // Every verse below was read against the WEB text one at a time (the list is in
  // scripts/name-linker; `run.mjs --ref` reproduces any of them). Each contains exactly ONE "John",
  // which is what makes a per-verse answer safe here — the mechanism applies one value to every
  // match of the key in a verse, so a verse naming two Johns could not be fixed this way. None does.
  //
  // The GOSPELS are not book-overridden, because the Baptist is right in 64 of their 83 mentions.
  // The 19 below are the Apostle: the calling of Zebedee's sons, the apostle lists, the inner three
  // at the Transfiguration, Jairus's house and Gethsemane, the Sons of Thunder, the request for the
  // seats of honour, the Samaritan village, and the two sent to prepare the Passover.
  //
  // ACTS keeps its book override to the Apostle (correct at 1:13, 3:1-11, 4:13, 4:19, 8:14, 12:2 —
  // nine verses), and these fifteen are the exceptions:
  //   the Baptist, in every "the baptism of John" retrospective — 1:5, 1:22, 10:37, 11:16, 13:24,
  //     13:25, 18:25, 19:3, 19:4;
  //   John Mark, bare, at 13:5 ("they had also John as their attendant") and 13:13 ("John departed
  //     from them and returned to Jerusalem") — Acts 12:12, 12:25 and 15:37 name him in a longer
  //     wording now registered on john-mark in people.ts and never reach this key in WEB;
  //   4:6, the John of the high-priestly family listed beside Annas and Caiaphas — a real, distinct
  //     man this app has no entry for, so no link. That is the same "link to nobody, or link to the
  //     wrong man" question §7.12 of automation/manager/name-linker-scope.md is already holding for
  //     Robbie; suppression is the interim this file uses everywhere else (Simon the tanner, Mary
  //     at Acts 12:12, Judas at Matthew 13:55) and is not a new position.
  //
  // NOT here, and deliberately: Revelation 1:1, 1:4, 1:9 and 22:8. The John who names himself there
  // is certainly not the Baptist, who died some sixty years earlier — but whether he is the Apostle,
  // John the Elder/Presbyter, or an otherwise unknown John of Patmos is a live scholarly question,
  // and the app must not settle it as a side effect of a linking pass. Those four are recorded as
  // `flagged` cases in scripts/name-linker/cases.mjs and are pending Robbie's ruling. They still
  // resolve to John the Baptist today, which is wrong under every view; the flagged cases exist so
  // that stays visible instead of quietly becoming the answer.
  john: {
    Matthew: {
      "4:21": "john-the-apostle", // "James the son of Zebedee, and John his brother"
      "10:2": "john-the-apostle", // the apostle list
      "17:1": "john-the-apostle", // the Transfiguration — the verse this whole pass began from
    },
    Mark: {
      "1:19": "john-the-apostle", // "James the son of Zebedee, and John, his brother"
      "1:29": "john-the-apostle", // "with James and John"
      "3:17": "john-the-apostle", // "John, the brother of James" — Boanerges
      "5:37": "john-the-apostle", // Jairus's house: "Peter, James, and John the brother of James"
      "9:2": "john-the-apostle", // the Transfiguration
      "9:38": "john-the-apostle", // "John said to him, 'Teacher, we saw someone…'"
      "10:35": "john-the-apostle", // "James and John, the sons of Zebedee"
      "10:41": "john-the-apostle", // "indignant towards James and John"
      "13:3": "john-the-apostle", // "Peter, James, John, and Andrew asked him privately"
      "14:33": "john-the-apostle", // Gethsemane
    },
    Luke: {
      "5:10": "john-the-apostle", // "James and John, sons of Zebedee"
      "6:14": "john-the-apostle", // the apostle list
      "8:51": "john-the-apostle", // Jairus's house
      "9:28": "john-the-apostle", // the Transfiguration
      "9:49": "john-the-apostle", // "John answered, 'Master, we saw someone…'"
      "9:54": "john-the-apostle", // the Samaritan village
      "22:8": "john-the-apostle", // "He sent Peter and John" to prepare the Passover
    },
    Acts: {
      "1:5": "john-the-baptist",
      "1:22": "john-the-baptist",
      "4:6": null, // John of the high-priestly family — no entry; see the note above
      "10:37": "john-the-baptist",
      "11:16": "john-the-baptist",
      "13:5": "john-mark",
      "13:13": "john-mark",
      "13:24": "john-the-baptist",
      "13:25": "john-the-baptist",
      // Dead in WEB and in KJV, live in ASV, and kept for that reason rather than as a stale claim:
      // WEB reads "John, who was called Mark" and KJV "John, whose surname was Mark", both of which
      // people.ts now matches as whole phrases, so no bare "John" survives for this entry to answer.
      // ASV reads "John also, who was called Mark" — the interposed "also" defeats a whole-phrase
      // match, and per-verse overrides are translation-blind, so this covers the ASV reader.
      "15:37": "john-mark",
      "18:25": "john-the-baptist",
      "19:3": "john-the-baptist",
      "19:4": "john-the-baptist",
    },
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

/** The coarsest correction in this file, and the ONLY one that reaches the app's own articles.
 *
 * BOOK_NAME_OVERRIDES and VERSE_NAME_OVERRIDES both need a book, and the only surface that passes
 * one is the Bible reader (VerseText). Every panel renders through LinkedVerseText, which passes no
 * book, no chapter and no verse — so an ambiguous bare name in a timeline article, a person's life
 * story or a POI description gets the global default and nothing else. That is how 44 "Saul"s in
 * united-monarchy and conquest timeline articles came to point at Paul of Tarsus.
 *
 * What those surfaces DO pass is `excludeId`: the id of the record whose page the text belongs to.
 * PersonPanel passes `person.id`, LocationPanel `location.id`, PoiPanel `poi.id`, TopicPanel
 * `topic.id` and TimelineEventPanel `event.id`. It exists so a page does not link to itself, but it
 * is also a fact about the text — "this paragraph is the article on X" — and that is exactly the
 * context an ambiguous name needs when there is no verse to look at. This table reads it as such:
 * lowercase bare name -> owning record id -> target person id, or `null` to suppress the link.
 *
 * Its reach is honest about what it is NOT. BookIntroView passes no id (a book intro has no record
 * id to pass), so nothing here can reach one; where a bare name is wrong inside a book intro the
 * only lever is the global default or a longer registered wording. And a whole record gets ONE
 * answer — if an article legitimately names both bearers, this cannot split them, and the longer
 * wording has to do the work instead (see Acts 1:13 and Acts 10:32 above).
 *
 * Checked AFTER the per-verse table and the capitalisation test, and BEFORE the book allowlist and
 * book overrides — in practice a book and an owner never arrive together, since the reader passes no
 * excludeId and the panels pass no book, but the order makes the precedence explicit rather than
 * incidental.
 *
 * An entry pointing a name at its own owner (`"paul-of-tarsus": "paul-of-tarsus"`) is not a no-op:
 * it hands the mention back to the exclusion rule, which is what suppresses a page linking to
 * itself. That is how bare "Saul" behaves on Paul's own page, and it is what it did before the
 * global default moved. */
const OWNER_NAME_OVERRIDES: Record<string, Record<string, string | null>> = {
  // "Saul": the king is now the global default (see SAUL_DEFAULT above), which is right for 100 of
  // the 126 bare "Saul"s in our prose. These are the seven records that hold the other 26 — every
  // one of them an article about the conversion, the Damascus disciple who baptised him, the man
  // who sent him to Antioch, or the martyrdom he watched. Read one by one; no record below names
  // both men.
  saul: {
    // Paul's own page: "Paul was born Saul in Tarsus", "Saul, Saul, why do you persecute me?".
    // Mapped to himself so the self-link exclusion suppresses it, unchanged from before.
    "paul-of-tarsus": "paul-of-tarsus",
    // Acts 9:10-19 told from the other side — "ask for Saul", "Brother Saul", "scales fell from
    // Saul's eyes". Eight mentions, all Paul.
    "ananias-of-damascus": "paul-of-tarsus",
    // "the newly converted Saul (Paul)", "traveled to Tarsus to bring Saul in as a teacher",
    // "commissioned Barnabas and Saul".
    barnabas: "paul-of-tarsus",
    // "the witnesses laid their coats at the feet of a young man named Saul".
    "stephen-the-martyr": "paul-of-tarsus",
    // The house where Ananias was sent "to lay hands on the blinded Saul".
    "house-of-ananias-damascus": "paul-of-tarsus",
    "bib-ac-paul-conversion": "paul-of-tarsus",
    "bib-ac-antioch-church-founded": "paul-of-tarsus",
    "bib-ac-paul-first-journey": "paul-of-tarsus",
  },
  // "Levi": the only entry is Matthew/Levi the apostle, and BOOK_NAME_ALLOWLIST already confines him
  // to Matthew and Mark in the Bible reader. On the article surface there is no allowlist, so all
  // 13 prose mentions resolved to the apostle — and every one of the 13 is Levi son of Jacob, the
  // tribe descended from him, or (on Matthan's page) Luke's "Matthat son of Levi". None is the
  // apostle. There is no entry for the patriarch, so the least-wrong answer is the allowlist's own:
  // no link. Keyed by owner rather than suppressed globally so the apostle's own pages are
  // untouched — none of them writes the bare name.
  levi: {
    melchizedek: null,
    jacob: null,
    leah: null,
    moses: null,
    aaron: null,
    matthan: null,
    levites: null,
    "bib-pat-jacob-marriages-sons": null,
    "bib-pat-death-jacob": null,
    "bib-exo-birth-of-moses": null,
    "bib-exo-golden-calf": null,
  },
  // "John": the largest single fault this table has ever been used for. Bare "John" belongs to the
  // Baptist globally, which is right for most of Scripture and badly wrong for our own writing: all
  // 238 prose occurrences resolved to him, on the article surface, with nothing to correct them.
  // On John the Apostle's OWN page, every "John" linked to John the Baptist.
  //
  // The 238 were read one at a time, grouped by owning record (the grouping is what this table
  // needs, since it gives one answer per record). Two other corrections landed first and shrank the
  // job: NAME_CONTEXT_SUPPRESSIONS above took out 52 book references ("the Gospel of John", "1
  // John", "John's Gospel") and 8 more that name a different man ("Simon, son of John", "John
  // Hyrcanus"), leaving 178 for this table and for the residue below.
  //
  // Records where every remaining "John" is the same man, and that man is not the Baptist:
  john: {
    // The Apostle. Zebedee's sons, the inner three, "Peter and John" in Acts, the household Jesus
    // entrusted Mary to from the cross, the Ephesus traditions. None of these turns on who wrote
    // the Fourth Gospel — they are narrative or traditional identifications the app already makes
    // in the surrounding sentence.
    "james-son-of-zebedee": "john-the-apostle",
    "simon-peter": "john-the-apostle",
    "james-brother-of-jesus": "john-the-apostle",
    "andrew-apostle": "john-the-apostle",
    "herod-agrippa-i": "john-the-apostle",
    "joseph-husband-of-mary": "john-the-apostle",
    "simon-magus": "john-the-apostle",
    "salome-follower-of-jesus": "john-the-apostle",
    sadducees: "john-the-apostle",
    "sea-of-galilee": "john-the-apostle",
    "basilica-st-john": "john-the-apostle",
    "house-of-virgin-mary-ephesus": "john-the-apostle",
    "martyrdom-site-polycarp-smyrna": "john-the-apostle",
    "bib-loc-calling-first-disciples": "john-the-apostle",
    "bib-loc-transfiguration": "john-the-apostle",
    "bib-loc-gethsemane-arrest": "john-the-apostle",
    "bib-loc-resurrection": "john-the-apostle",
    "bib-loc-public-ministry": "john-the-apostle",
    "bib-ac-jerusalem-church-community": "john-the-apostle",
    "bib-ac-herod-agrippa-death": "john-the-apostle",

    // Their own pages. Mapped to themselves so the self-link exclusion suppresses the link, exactly
    // as bare "Saul" behaves on Paul's page above. On john-the-apostle's page this also sidesteps
    // the authorship question entirely: "Tradition credits John as the author of…" needs no link,
    // because the reader is already on that page.
    "john-the-apostle": "john-the-apostle",
    "john-mark": "john-mark",
    "john-chrysostom": "john-chrysostom",
    "john-of-the-cross": "john-of-the-cross",
    "pope-john-xxiii": "pope-john-xxiii",
    "pope-john-paul-ii": "pope-john-paul-ii",

    // Later Johns the app DOES have entries for, named by first name only on someone else's page.
    "charles-wesley": "john-wesley", // his brother John, three times on the page
    "fall-of-communism-poland-1989": "pope-john-paul-ii",
    "vatican-ii-1962": "pope-john-xxiii",

    // Later Johns the app does NOT have entries for. No link is the least-wrong answer and the one
    // this file uses everywhere else; whether a stub or a disambiguation note would be better is
    // §7.12 of automation/manager/name-linker-scope.md, still open with Robbie.
    "john-wycliffe": null, // John of Gaunt, Wycliffe's protector
    "henry-viii": null, // John Fisher, executed for refusing the oath
    "english-reformation-1534": null, // John Fisher again
    "wycliffe-english-bible-c1382": null, // John Purvey, Wycliffe's associate
    "council-of-ephesus-431": null, // John of Antioch, who held the rival council
    "dormition-abbey": null, // Bishop John II of Jerusalem
    "temple-of-artemis-ephesus": null, // John Turtle Wood, the 1869 excavator
    "kurkh-monolith": null, // John George Taylor, who found the monolith in 1861
    "siloam-inscription": null, // John Rogerson, the 1996 palaeographic argument
    "nuzi-tablets": null, // John Van Seters, who took the Nuzi parallels apart
    "bib-it-maccabean-revolt-begins": null, // John, one of Mattathias's five sons
    // The two remaining mentions are the John Rylands Library, and the Gospel referred to by title
    // in a list ("put John in the mid-second century") — a building and a book, neither a person.
    "rylands-papyrus-p52": null,
    "muratorian-fragment": null, // "Luke is named as the third Gospel and John as the fourth"
  },
  // "Simeon": the only entry is Simeon at the temple (Luke 2), allowlisted to Luke for the reader.
  // Of the 10 prose mentions, 2 are his (Mary's page and Anna's) and 8 are not: Simeon son of Jacob
  // in the patriarch articles, and Simeon bar Kosiba — bar Kokhba — in the Roman revolt article.
  // Neither has an entry.
  simeon: {
    jacob: null,
    leah: null,
    "joseph-son-of-jacob": null,
    "bib-pat-jacob-marriages-sons": null,
    "bib-pat-joseph-reveals-brothers": null,
    "bib-pat-death-jacob": null,
    "wld-rom-bar-kokhba-revolt": null,
  },
  // "Zadok": the only entry is the minor Zadok of Matthew's genealogy, allowlisted to Matthew. Two
  // of the five prose mentions are his (Azor's and Achim's genealogy pages, which name him
  // directly); the other three are Zadok the priest under David and Solomon, who has no entry —
  // named on the Sadducees' page as the origin of their name, and in the Maccabean high-priesthood
  // article as "Solomon's priest".
  zadok: {
    sadducees: null,
    "bib-it-jonathan-maccabeus-high-priest": null,
  },
  // "Eleazar": the only entry is the minor Eleazar of Matthew's genealogy, allowlisted to Matthew.
  // Two of the eleven prose mentions are his (Eliud's and Matthan's genealogy pages). The other
  // nine are three other men, none with an entry: Eleazar son of Aaron, Israel's third high priest
  // (Aaron's page, Joshua's page, Zadok's own page, the death-of-Aaron article, and Judges 20:28's
  // "Phinehas, son of Eleazar" in the Benjamite-war dating note); the elderly scribe martyred under
  // Antiochus IV; and Eleazar the Maccabee, brother of Judas.
  eleazar: {
    aaron: null,
    joshua: null,
    "zadok-in-jesus-genealogy": null,
    "bib-exo-death-of-aaron": null,
    "bib-cj-benjamite-war": null,
    "bib-it-antiochus-defiles-temple": null,
    "bib-it-maccabean-revolt-begins": null,
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
  // "Eliakim": same shape as "Zadok" and "Eleazar" above and missed when they were done. The only
  // entry is the Eliakim of Matthew's genealogy (Matthew 1:13, twice — the sole correct mentions of
  // 15 in Scripture). The other 13 are three different men with no entry: Eliakim son of Hilkiah,
  // Hezekiah's palace steward who negotiates with the Rabshakeh (2 Kings 18-19, Isaiah 22 and
  // 36-37); Josiah's son Eliakim, whom Pharaoh Necoh renames Jehoiakim (2 Kings 23:34, 2 Chronicles
  // 36:4); a priest at Nehemiah's wall dedication (Nehemiah 12:41); and Luke 3:30's Eliakim, who
  // sits in Luke's line rather than Matthew's and so is not the same man either.
  eliakim: ["Matthew"],
  // "Gamaliel": the entry is Paul's teacher, who appears in Acts 5:34 and 22:3 and nowhere else.
  // The other five occurrences are Gamaliel the son of Pedahzur, prince of Manasseh in the
  // wilderness census (Numbers 1:10, 2:20, 7:54, 7:59, 10:23) — a different man, no entry. All
  // eight prose mentions are the teacher and are unaffected: the allowlist needs a book to fire.
  gamaliel: ["Acts"],
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

/** Names that are ALSO the title of a book of the Bible, where the surrounding words can say which
 * is meant. A reference to the book must not link to a person at all — not even to the person the
 * book is named after, and least of all to a different person entirely.
 *
 * "John" is the case this was built for and the only key in it, because it is the only one measured.
 * Bare "John" is registered on john-the-baptist (people.ts), so before this rule *the Gospel of
 * John*, *1 John*, *2 John*, *3 John* and *John's Gospel* all rendered as links to John the Baptist
 * — a man who wrote none of them and died before any of them was written. Measured over the whole
 * corpus (scripts/name-linker), stating the surface for each, as `CAPITALISED_ONLY` above does:
 *
 *   surface                        occurrences of bare "John"   caught by this rule
 *   Scripture, reader path                 132                          0
 *   Scripture, panel path                  132                          0
 *   our own articles (prose)               238                         52
 *
 * Zero on both Scripture paths is not an accident and is the point: the biblical text never refers
 * to its own books by title, so this rule cannot touch a verse. It is an article-surface fix, and
 * the article surface is where the whole fault lived.
 *
 * What it deliberately does NOT catch: "John notes...", "John writes...", "John's account", "in
 * John, Jesus speaks..." — the author referred to as a person, or the book named in a bare list.
 * Suppressing those needs a judgement about who wrote the Fourth Gospel and Revelation, which is a
 * live confessional question (see the flagged cases in scripts/name-linker/cases.mjs and §7 of
 * automation/manager/name-linker-scope.md). This rule takes no position on authorship: it removes
 * links on phrases that name a BOOK, which is neutral between every answer to that question. */
const NAME_CONTEXT_SUPPRESSIONS: Record<string, { before?: RegExp[]; after?: RegExp[] }> = {
  john: {
    before: [
      // The book. "1 John 2:1" never reaches here — NAME_PATTERN lists the verse-reference
      // fragments first, so a reference carrying a chapter is matched whole as kind "verse". Only
      // a bare "1 John" with no numbers after it gets this far.
      /(?:^|[^\p{L}])(?:[123]|First|Second|Third)\s+$/u, // "1 John", "3 John"
      /\b[Gg]ospels? of\s+$/, // "the Gospel of John"
      /\b[Ll]etters? of\s+$/, // "two letters of John"
      /\b[Bb]ooks? of\s+$/, // "the book of John"
      // A patronymic: "Simon, son of John". This is Simon Peter's FATHER — a different man, and one
      // this app has no entry for. It is why simon-peter's own page could not simply be handed to
      // the Apostle by OWNER_NAME_OVERRIDES: the page names two Johns and an owner rule gives one
      // answer. It also reaches a surface the harness cannot see: WEB reads "Simon the son of
      // Jonah" at John 1:42 and 21:15-17 and so never triggers, but ASV reads "the son of John" in
      // all four, and the app offers ASV. Checked against WEB: no verse contains "son of John".
      /\bsons? of\s+$/,
    ],
    after: [
      // The book again. Note how narrow the possessive is: "John's Gospel" is the book, but "John's
      // baptism" (Acts 19:3) and "John's disciples" (Matthew 9:14) are the Baptist himself and must
      // keep their links, so only a following "Gospel" counts.
      /^['’]s\s+[Gg]ospel/, // "John's Gospel"
      /^\s+chapter\b/i, // "John chapter 18"
      // John Hyrcanus, the Hasmonean ruler — no entry, and named in articles (the Sadducees, the
      // Pharisees, Herod's rise) that ALSO name the Apostle, so again an owner rule cannot separate
      // them. Registering the full name on a person record would be the tidier fix if he is ever
      // given one.
      /^\s+Hyrcanus\b/,
    ],
  },
};

/** Do the words immediately around this match say it is NOT the person who owns the name?
 *
 * This is the only correction in the file that reads the surrounding text, and it is deliberately a
 * short, enumerated list rather than a general parser. It earns its place by being the only
 * mechanism that can reach the two hardest cases: a book title (which must link to no person at
 * all, and which the Bible reader's book/verse tables cannot see because the biblical text never
 * names its own books), and a record whose article legitimately names two different men called
 * John, which OWNER_NAME_OVERRIDES gives one answer to and therefore cannot split. */
function isSuppressedByContext(nameLower: string, text: string, start: number, end: number): boolean {
  const rules = NAME_CONTEXT_SUPPRESSIONS[nameLower];
  if (!rules) return false;
  if (rules.before?.some((re) => re.test(text.slice(Math.max(0, start - 24), start)))) return true;
  return rules.after?.some((re) => re.test(text.slice(end, end + 24))) ?? false;
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
 * their global default owner — unless OWNER_NAME_OVERRIDES has an answer for them, which is the one
 * correction `excludeId` alone can reach. `excludeId` therefore does two jobs: it suppresses a
 * record's page from linking to itself, and it tells this function whose article the text is, which
 * on every LinkedVerseText surface is the only context there is. */
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
        } else if (isSuppressedByContext(nameLower, text, start, end)) {
          // "the Gospel of John", "1 John", "John's Gospel" — the book, not a man. "Simon, son of
          // John", "John Hyrcanus" — a different man with no entry. Either way, no link.
          // Checked after the per-verse table for the same reason CAPITALISED_ONLY is: an explicit
          // verse answer should still win. Checked BEFORE OWNER_NAME_OVERRIDES so that an owner
          // rule written for the person cannot resurrect a link on a book title.
        } else if (CAPITALISED_ONLY.has(nameLower) && !looksLikeAName(name)) {
          // An ordinary English word, not the name it shares. No link. Checked AFTER the per-verse
          // table on purpose: a verse override can still force a link on a lowercase match if some
          // future translation ever needs one, and it is what suppresses the handful of capitalised
          // stragglers this test cannot see (Psalm 37:37's "Mark the perfect man", 1 John 2:1).
        } else if (
          excludeId !== undefined &&
          OWNER_NAME_OVERRIDES[nameLower] !== undefined &&
          Object.prototype.hasOwnProperty.call(OWNER_NAME_OVERRIDES[nameLower], excludeId)
        ) {
          // This text is the article on a record that settles the name. See OWNER_NAME_OVERRIDES.
          const ownerId = OWNER_NAME_OVERRIDES[nameLower][excludeId];
          if (ownerId !== null && ownerId !== excludeId) {
            annotations.push({ start, end, text: name, kind: ID_TO_KIND.get(ownerId) ?? entry.kind, id: ownerId });
          }
          // ownerId === null: a different, unrepresented bearer of the name — no link.
          // ownerId === excludeId: the record's own page — the self-link exclusion, spelled out.
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

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
  // "Revelation": all four occurrences (1:1, 1:4, 1:9, 22:8) are the John who names himself as the
  // book's author and its exile on Patmos. Ruled to john-the-apostle rather than left on the
  // Baptist — who died some sixty years earlier and is wrong under every reading — on the grounds
  // that the app's own copy already says it in print: the exile article opens "The apostle John",
  // and john-the-apostle carries "the Beloved Disciple" as a reader-facing alternate name. Linking
  // adds no claim the prose beside it does not already make. If the app is ever made neutral on
  // Johannine authorship this entry and the five article owners below are the whole of the change.
  john: { Acts: "john-the-apostle", Galatians: "john-the-apostle", Revelation: "john-the-apostle" },
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
  // "Jonah": the entry is the prophet, correct at 2 Kings 14:25 and throughout the book of Jonah,
  // and correct at every Gospel mention of "the sign of Jonah". Wrong at exactly five places, all
  // naming SIMON PETER'S FATHER — "Simon Bar Jonah" (Matthew 16:17) and "Simon, son of Jonah"
  // (John 1:42, 21:15, 21:16, 21:17). That man is a distinct person with no entry here, so the
  // least-wrong move is no link, exactly as for Simon Iscariot's father above. Note the bare
  // "Simon" in those same verses still resolves to Peter and is untouched by this.
  jonah: {
    Matthew: { "16:17": null },
    John: { "1:42": null, "21:15": null, "21:16": null, "21:17": null },
  },
  // "son of man": the allowlist below now admits Daniel and Revelation, because the app writes from
  // a Protestant evangelical position under which Daniel 7:13's figure IS the one Jesus claimed to
  // be. Two verses inside those books must still be suppressed, for two different reasons.
  //   Daniel 8:17 — "Understand, son of man" is the angel addressing DANIEL. It is the Ezekiel
  //     sense, a mortal, and has nothing to do with the title. A book-level allowlist alone would
  //     have linked it, which is why the book was not simply added and left.
  //   Revelation 14:14 — "one sitting like a son of man" with a sickle is genuinely disputed among
  //     interpreters, including evangelical ones, between Christ and an angel. Revelation 1:13 is
  //     not disputed in the same way (the figure identifies himself as the one who was dead and is
  //     alive), so that one links and this one does not. Stating a position does not licence
  //     settling a question the position itself leaves open.
  "son of man": {
    Daniel: { "8:17": null },
    Revelation: { "14:14": null },
  },
  // "elders": the topic is the JEWISH elders (see topics.ts). BOOK_NAME_ALLOWLIST below already
  // confines the name to Matthew, Mark, Luke and Acts. Acts is the one allowed book that holds
  // both senses, so the CHRISTIAN congregational elders inside it are suppressed here one by one.
  // Read against the WEB text: 11:30 (relief sent to the elders in Judea), 14:23 (elders appointed
  // in every assembly), 15:2/4/6/22/23 and 16:4 (the Jerusalem council's "apostles and elders"),
  // 20:17 (the Ephesian elders) and 21:18 (the elders with James). The Jewish elders at Acts 4:5,
  // 4:8, 4:23, 6:12, 22:5, 23:14, 24:1 and 25:15 are left to resolve normally.
  elders: {
    Acts: {
      "11:30": null,
      "14:23": null,
      "15:2": null,
      "15:4": null,
      "15:6": null,
      "15:22": null,
      "15:23": null,
      "16:4": null,
      "20:17": null,
      "21:18": null,
    },
  },
  // "scribes": the topic covers Israel's scribes, royal secretaries and legal scholars alike, so
  // the Old Testament mentions (1 Kings 4:3, 1 Chronicles 2:55, 2 Chronicles 34:13, Jeremiah 8:8)
  // are correct and left alone. The two exceptions are Persian: "the king's scribes" in Esther are
  // Ahasuerus's imperial secretaries, not Israelite scribes at all.
  scribes: {
    Esther: { "3:12": null, "8:9": null },
  },
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
  // NOT here, but handled elsewhere: Revelation 1:1, 1:4, 1:9 and 22:8. The John who names himself
  // there is certainly not the Baptist, who died some sixty years earlier. Whether he is the
  // Apostle, John the Elder/Presbyter, or an otherwise unknown John of Patmos is a live scholarly
  // question; it was escalated rather than decided here, and the ruling (recorded in
  // automation/manager-inbox) was to link the Apostle, on the ground that the app's own prose
  // beside these links already says so — the exile article opens "The apostle John". Those four
  // are carried by the Revelation entry in BOOK_NAME_OVERRIDES above rather than by a per-verse
  // override, and are pinned as `guard` cases in scripts/name-linker/cases.mjs.
  //
  // They are the Apostle on the reader path only. On the panel path they still read as the Baptist,
  // because that path passes no book and so no book override can fire there at all — a structural
  // limit of the panel path (833 rows across every ambiguous name diverge this way), neither
  // introduced nor worsened by this entry.
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
  // "Abel": the same shape as Enoch. Abel son of Adam owns the bare name and keeps all nine of his
  // mentions, but the northern town of Abel — Abel of Beth Maacah, the "mother in Israel" of
  // 2 Samuel 20 — is a place, and in these two verses it is named on its own with no second word
  // for the context rule below to catch. Every other occurrence of the town carries a qualifier
  // ("Abel Meholah", "Abel Beth Maacah", "Abel Mizraim") and is handled there.
  abel: {
    "2 Samuel": { "20:14": null, "20:18": null },
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

/** The `excludeId` a book introduction renders under.
 *
 * Every other authored surface hands `computeLinkAnnotations` the id of the record it belongs to.
 * A book intro belongs to no record, so it had nothing to pass and OWNER_NAME_OVERRIDES could not
 * reach a single word of it. This mints a stable id from the book name instead — the one fact an
 * introduction does have — so a per-book correction has somewhere to key on.
 *
 * The `book-intro:` prefix is what keeps it safe. No record id in this app contains a colon, so the
 * synthesised id can never collide with a real one: it cannot accidentally suppress a link (the
 * `id !== excludeId` tests can never match it) and it corrects nothing until someone writes an
 * entry for it. Introducing it therefore moves no link at all — deliberately. It is the hook the
 * corrections hang from, not a correction.
 *
 * `book` is the book name as `bookIntros` spells it — "Zechariah", "1 Samuel", "Song of Solomon" —
 * so the key a correction is written against is readable on sight. scripts/name-linker/corpus.mjs
 * imports THIS function rather than re-deriving the string, so the harness and the app cannot
 * disagree about what a book intro's owner is. */
export const bookIntroOwnerId = (book: string) => `book-intro:${book}`;

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
 * Book intros are reachable too, as of this change. An introduction has no record of its own, so
 * BookIntroView synthesises an id with `bookIntroOwnerId` below: key an entry on
 * `"book-intro:Zechariah"` and it corrects that introduction and nothing else. Before this, the
 * only lever a book intro had was the global default or an exact phrase pinned in
 * NAME_CONTEXT_RULES — see the hand-pinned "john" block for what that costs.
 *
 * Its reach is still honest about what it is NOT: a whole record gets ONE answer — if an article
 * legitimately names both bearers, this cannot split them, and the longer wording has to do the
 * work instead (see Acts 1:13 and Acts 10:32 above).
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
  // Baptist globally, which is right for most of Scripture and badly wrong for our own writing.
  // The article surface has 256 occurrences the linker matches on the bare key; 18 of them sit on
  // the Baptist's own page and were harmlessly self-excluded, so 238 actually rendered as a link to
  // John the Baptist, with nothing to correct them. On John the Apostle's OWN page, every "John"
  // linked to John the Baptist.
  //
  // Those 238 were read one at a time, grouped by owning record (the grouping is what this table
  // needs, since it gives one answer per record). NAME_CONTEXT_RULES below lands first and shrinks
  // the job, measured on this same bare-key population of 256:
  //   51  book references — "the Gospel of John", "1 John", "John's Gospel", "two letters of John"
  //    8  a different man — "Simon, son of John" (Peter's father), "John Hyrcanus"
  //    8  "Peter and John" — resolved to the Apostle, not suppressed
  //   22  book-intro phrases, pinned one at a time back when BookIntroView passed no record id
  //        (it passes `bookIntroOwnerId(book)` now; the pins stay until someone re-reads them)
  // — 89 in all, leaving 167 for this table, the self-link exclusion, and the global default.
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
    // Added 2026-09-09 with the content batch that wrote these two articles. Each holds exactly
    // one bare "John" and neither is the Baptist: the Sabbath article quotes Revelation 1:10,
    // "John 'in the Spirit on the Lord's day'", and "the Christ" says "John states the purpose of
    // his whole book" before quoting John 20:31. Both are the man acting — writing, seeing — not
    // the book being named, so they take the same answer as the Revelation book override above
    // rather than the suppression the "Gospel of John" phrases get.
    sabbath: "john-the-apostle",
    "the-christ": "john-the-apostle",
    // The Canaanites article's only bare "John" is JOHN GARSTANG, who excavated Jericho in the
    // 1930s. No entry, and certainly not the Baptist — suppressed rather than repointed.
    canaanites: null,
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

    // The John of Patmos, in the five records that tell that story — the exile and its dating, the
    // cave, the island, the Domitian persecution, and the Angels topic ("when the apostle John
    // falls down to worship an angel in Revelation"). Same ruling and same reasoning as the
    // Revelation book override above: every one of these articles already calls him the apostle in
    // its own prose, so the link agrees with the sentence around it instead of contradicting it.
    "bib-ac-john-exile-revelation": "john-the-apostle",
    "cave-of-apocalypse-patmos": "john-the-apostle",
    patmos: "john-the-apostle",
    "bib-ac-domitian-persecution": "john-the-apostle",
    angels: "john-the-apostle",

    // The Fourth Gospel's narrating voice — "John notes", "John tells us", "John alone records",
    // "Placed by John". These are references to the book speaking, not to a man being introduced,
    // and they were all John the Baptist, who wrote none of it. Suppressed rather than pointed at
    // the Apostle: no link removes the falsehood while asserting nothing about who held the pen,
    // which is the same answer this file already gives the contested Nathan at 1 Kings 4:5.
    //
    // mary-magdalene and bib-loc-last-supper are in this list AND name the Apostle ("she runs to
    // tell Peter and John", "Jesus sends Peter and John ahead"). Those two are recovered by the
    // "Peter and John" context rule, which is checked before this table — that is what makes a
    // record with two different Johns resolvable at all.
    "judas-iscariot": null,
    "mary-magdalene": null,
    "philip-the-apostle": null,
    "bartholomew-nathanael": null,
    "joseph-of-arimathea": null,
    "martha-of-bethany": null,
    "lazarus-of-bethany": null,
    caiaphas: null,
    "mary-mother-of-james-the-less": null,
    "the-temple": null,
    tabernacle: null,
    "day-of-preparation": null,
    "casting-lots": null,
    passover: null,
    "pilate-stone": null,
    "bib-loc-wedding-at-cana": null,
    "bib-loc-temple-cleansing-early": null,
    "bib-loc-feeding-five-thousand": null,
    "bib-loc-raising-of-lazarus": null,
    "bib-loc-last-supper": null,
    "bib-loc-burial-of-jesus": null,
    "bib-loc-post-resurrection-appearances": null,
    "bib-ac-council-of-nicaea": null,
    "wld-rom-martyrdom-peter-paul": null,
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
    // The Sadducees exist twice in this app: `sadducees` in people.ts (the group) and
    // `topic-sadducees` in topics.ts (the article). Both derive the party's name from Zadok the
    // priest, so both need the entry — and the genealogy Zadok's own summary says in as many
    // words that he is "a different, otherwise-unattested person from the famous high priest
    // Zadok who served under David and anointed Solomon", which is exactly the man being named
    // here. Added 2026-09-09 when the topic grew an origins section.
    "topic-sadducees": null,
    "bib-it-jonathan-maccabeus-high-priest": null,
  },
  // "Jacob": the entry is the patriarch, right nearly everywhere. On the Pharisees article the one
  // occurrence is JACOB NEUSNER, the 20th-century scholar of rabbinic Judaism, cited by name for
  // his caution about reading the rabbis back into the Pharisees. Linking a modern historian's
  // forename to Isaac's son is simply false, and there is no entry for Neusner to link instead.
  jacob: {
    "topic-pharisees": null,
  },
  // "Ananias": the bare name is registered to Ananias and Sapphira. The chief-priests article names
  // a different man — "the high priest Ananias" who comes down to Caesarea to press charges against
  // Paul (Acts 24:1) — and that man DOES have an entry, so this repoints rather than suppresses.
  ananias: {
    "chief-priests": "ananias-the-high-priest",
  },
  // "Jonah": the prophet is the right answer nearly everywhere, and VERSE_NAME_OVERRIDES above
  // already suppresses the five Scripture verses that name Simon Peter's father instead. Peter's
  // own article says the same thing in its own words — "Peter was born Simon, son of John (or
  // Jonah)" — and the prose path has no verse context to catch it, so it is caught by owner here.
  jonah: {
    "simon-peter": null,
  },
  // "Peter": the Canaanites article's only bare "Peter" is NIELS PETER LEMCHE, the Danish Old
  // Testament scholar, cited for his argument that "Canaanite" is a label applied from outside.
  // A modern historian's middle name is not the apostle. Same shape as Jacob Neusner above, and
  // the reason this article's scholars need reading one at a time rather than trusting a tally.
  peter: {
    canaanites: null,
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
  // "Zechariah": the only entry is Zechariah the priest, father of John the Baptist, and
  // BOOK_NAME_ALLOWLIST already confines him to Luke for the reader — which is why all 43
  // occurrences in Scripture, none of them his, render unlinked there. The article surface has no
  // allowlist, so all 32 prose mentions resolved to him, and 20 of the 32 are not him.
  //
  // Read one at a time and grouped by owning record. No record below names two different
  // Zechariahs, so the one-answer-per-record limit costs nothing here. The twelve his own pages
  // hold — John the Baptist's, Elizabeth's, Gabriel's, Ein Karem, the ministry-begins article and
  // Luke's introduction ("Zechariah's prophecy", the Benedictus) — are correct and stay untouched.
  //
  // The other twenty are three different subjects, and the app has a record for none of them, so
  // no link is the least-wrong answer — the same ruling this table already gives Levi, Simeon,
  // Zadok and Eleazar, and §7.12 of automation/manager/name-linker-scope.md is still the open
  // question of whether a stub would be better.
  zechariah: {
    // Zechariah the post-exilic prophet, son of Berechiah, son of Iddo — eleven mentions, mostly
    // paired with Haggai urging the Second Temple to completion, plus his own visions (the
    // lampstand, Satan accusing the high priest Joshua) and the donkey-riding king of Zechariah
    // 9:9 that the triumphal-entry article calls "the prophet Zechariah's picture".
    satan: null, // "Zechariah's vision, standing at the right hand of the high priest Joshua"
    zerubbabel: null, // "the prophets Haggai and Zechariah urged"; "Zechariah's vision of a lampstand"
    "behistun-inscription": null, // "Haggai and Zechariah both date their preaching by his regnal years"
    "bib-er-zerubbabels-return": null,
    "bib-er-second-temple-completed": null,
    "bib-loc-triumphal-entry": null,
    "wld-pg-darius-consolidation": null,
    "book-intro:Ezra": null, // "with the encouragement of the prophets Haggai and Zechariah"
    // Zechariah son of Jehoiada, stoned in the temple court under Joash (2 Chronicles 24:20-22) —
    // a different man entirely, and the article names his father in the same sentence.
    "bib-dkj-joash-reign": null,
    // The BOOK, not a man: a title in a list of where the Hebrew Bible develops Satan, a list of
    // which books call Zerubbabel "son of Shealtiel", and the manuscript notes of two Minor
    // Prophets introductions. Suppressed for the same reason as the "John as the fourth Gospel"
    // pins above — these are works being named, and a person link there is simply false.
    shealtiel: null, // "Ezra, Haggai, Zechariah, and Matthew all consistently call Zerubbabel…"
    "book-intro:Malachi": null, // "its preserved text breaks off in Zechariah, before Malachi"
    // Zechariah's own introduction holds both: the prophet in `whyWritten` ("Like Haggai,
    // Zechariah encourages the returned exiles") and the book in all four manuscript notes. Same
    // answer either way, so one entry covers all five.
    "book-intro:Zechariah": null,
  },
};

const BOOK_NAME_ALLOWLIST: Record<string, string[]> = {
  // "son of man": the topic is the title as applied to Jesus (topics.ts), and the match is
  // case-insensitive, which matters enormously here. EZEKIEL uses "Son of man" 93 times as God's
  // form of address to the prophet — more occurrences than the Gospels have — and it means a
  // mortal there, not a title. Psalms 8:4, Job, Numbers, Isaiah, Jeremiah and Hebrews 2:6 are the
  // same ordinary sense, and all stay out.
  // Daniel and Revelation were ALSO out until 2026-09-07, on the grounds that the app took no view
  // of who Daniel 7:13's figure is. Under the app's stated Protestant evangelical position it does
  // take a view: that figure is the Messiah, and Jesus claimed at his trial to be him (Mark 14:62
  // quotes Daniel 7:13 back at the high priest). Evangelicals do still differ over how the
  // individual and corporate strands of Daniel 7 relate — see the article — but not over whether
  // Jesus is the one Daniel saw, so the link asserts only what the position actually holds.
  // Daniel 8:17 and Revelation 14:14 are excepted verse by verse above.
  "son of man": ["Matthew", "Mark", "Luke", "John", "Acts", "Daniel", "Revelation"],
  // "elders": Jewish elders only, per the brief. Deuteronomy, Exodus, Judges, Joshua, Ezekiel and
  // the rest use it of Israel's local elders, which the article covers but does not centre on;
  // 1 Timothy, Titus, 1 Peter, James and 2-3 John use it of the Christian congregational office;
  // and Revelation's twenty-four elders around the throne are a third thing entirely. Confining it
  // to the Gospels and Acts keeps the reader-facing link on the sense the article is about.
  // Exceptions inside Acts are handled verse by verse in VERSE_NAME_OVERRIDES above.
  elders: ["Matthew", "Mark", "Luke", "Acts"],
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

/** What the words immediately around a match say about it: that it names a BOOK rather than a
 * person, that it names a DIFFERENT bearer of the name, or — the one case that asserts rather than
 * suppresses — that it is a specific man.
 *
 * "John" is the case this was built for and the only key in it, because it is the only one measured.
 * Bare "John" is registered on john-the-baptist (people.ts), so before these rules *the Gospel of
 * John*, *1 John*, *2 John*, *3 John* and *John's Gospel* all rendered as links to John the Baptist
 * — a man who wrote none of them and died before any of them was written. Measured over the whole
 * corpus (scripts/name-linker), stating the surface for each, as `CAPITALISED_ONLY` above does.
 * The counts are of occurrences the linker matches on the BARE key "john"; a mention swallowed by a
 * longer registered name ("John the Baptist", "John Wesley") never reaches these rules:
 *
 *   surface                        bare-key "John"   caught here   effect
 *   Scripture, reader path               132              7        all 7 resolved to the Apostle
 *   Scripture, panel path                132              7        all 7 resolved to the Apostle
 *   our own articles (prose)             256             89        81 suppressed, 8 resolved
 *
 * The 7 on both Scripture paths are "Peter and John" — Luke 22:8 and Acts 3:1, 3:3, 3:11, 4:13,
 * 4:19, 8:14. That rule is the only one here that can touch a verse: no book of the Bible refers to
 * its own books by title, so every book-title rule below is an article-surface rule in practice.
 * On the panel path those 7 are the ONLY correction "John" gets, since no book or verse override
 * fires there — which is why the pair rule is worth more than its size suggests.
 *
 * On authorship this file still takes no position. The book-title rules remove links on phrases
 * that name a BOOK, which is neutral between every answer to who wrote it. The Fourth Gospel's and
 * Revelation's narrating voice — "John notes", "John writes", "In John, Jesus speaks" — is
 * SUPPRESSED, not resolved, for the same reason: no link asserts nothing about who held the pen,
 * where the link that used to be there asserted something false. Narrator mentions inside an
 * article are suppressed by that record's entry in OWNER_NAME_OVERRIDES; the ones in a book intro
 * are pinned by exact phrase below, from when an intro had no id to key on. See §7 of
 * automation/manager/name-linker-scope.md, and the rulings in automation/manager-inbox. */
interface NameContextRule {
  /** An exact phrase from our own copy. Applies when the match falls INSIDE an occurrence of it.
   * Used where a pattern would be reckless — see the hand-pinned book intros below. */
  phrase?: string;
  /** Matched against the ~24 characters immediately before the match, anchored to their end. */
  before?: RegExp;
  /** Matched against the ~24 characters immediately after the match, anchored to their start. */
  after?: RegExp;
  /** Person id to resolve to, or `null` for no link at all. */
  to: string | null;
}

const NAME_CONTEXT_RULES: Record<string, NameContextRule[]> = {
  john: [
    // ── Resolution, not suppression. Checked first: it is the most specific thing we can say.
    // "Peter and John" is the Apostle everywhere in the New Testament and everywhere in our own
    // writing — there is no passage where the pair means the Baptist. This rule exists because two
    // records (mary-magdalene, bib-loc-last-supper) name the Apostle in one sentence and the Fourth
    // Gospel's narrator in the next, and OWNER_NAME_OVERRIDES gives one answer per record.
    { before: /\bPeter and\s+$/, to: "john-the-apostle" },

    // ── The book, by pattern. "1 John 2:1" never reaches here: NAME_PATTERN lists the
    // verse-reference fragments first, so a reference carrying a chapter is matched whole as kind
    // "verse". Only a bare "1 John" with no numbers after it gets this far.
    { before: /(?:^|[^\p{L}])(?:[123]|First|Second|Third)\s+$/u, to: null }, // "1 John", "3 John"
    { before: /\b[Gg]ospels? of\s+$/, to: null }, // "the Gospel of John"
    { before: /\b[Ll]etters? of\s+$/, to: null }, // "two letters of John"
    { before: /\b[Bb]ooks? of\s+$/, to: null }, // "the book of John"
    // Note how narrow the possessive is: "John's Gospel" is the book, but "John's baptism"
    // (Acts 19:3) and "John's disciples" (Matthew 9:14) are the Baptist himself and must keep
    // their links, so only a following "Gospel" counts.
    { after: /^['’]s\s+[Gg]ospel/, to: null }, // "John's Gospel"
    { after: /^\s+chapter\b/i, to: null }, // "John chapter 18"

    // ── Different men, by pattern.
    // A patronymic: "Simon, son of John" — Simon Peter's FATHER, a different man with no entry. It
    // is why simon-peter's own page could not simply be handed to the Apostle by
    // OWNER_NAME_OVERRIDES: the page names two Johns. It also reaches a surface the harness cannot
    // see — WEB reads "Simon the son of Jonah" at John 1:42 and 21:15-17 and so never triggers, but
    // ASV reads "the son of John" in all four, and the app offers ASV. Checked against WEB: no
    // verse contains "son of John".
    { before: /\bsons? of\s+$/, to: null },
    // John Hyrcanus, the Hasmonean ruler — no entry, and named in articles (the Sadducees, the
    // Pharisees, Herod's rise) that ALSO name the Apostle. Registering the full name on a person
    // record would be the tidier fix if he is ever given one.
    { after: /^\s+Hyrcanus\b/, to: null },

    // ── The book intros, pinned one at a time by their own words.
    //
    // Written when BookIntroView passed no record id at all, so OWNER_NAME_OVERRIDES could not
    // reach a single one of these 22 links, and they were all John the Baptist. Under the
    // rulings recorded in automation/manager-inbox they all come out the same way — no link — but
    // for two different reasons, so they are grouped and labelled rather than lumped.
    //
    // They are pinned by exact phrase ON PURPOSE. A bare name inside an appositive list ("Matthew,
    // Luke, John, Acts") is precisely where a loose pattern does collateral damage, and an exact
    // phrase cannot reach a sentence nobody has read. The cost is that rewriting one of these
    // paragraphs silently unpins its link — which is why every one of them also has a regression
    // case in scripts/name-linker/cases.mjs. If a case here starts failing, the copy moved: re-read
    // the sentence and re-pin it, do not delete the case.
    //
    // The durable fix has since landed: BookIntroView passes `bookIntroOwnerId(book)`, so a book
    // intro can now be corrected per-book in OWNER_NAME_OVERRIDES like any other article. These 22
    // pins are deliberately LEFT ALONE — they are read, ruled on and covered by cases.mjs, and
    // rewriting settled rules into a new mechanism buys nothing. Write new book-intro corrections
    // as OWNER_NAME_OVERRIDES entries keyed on "book-intro:<Book>"; reach for a phrase pin only
    // when one book intro needs two different answers for the same name.

    // The book named as a work — a title in a list, a manuscript's contents, a date of composition.
    { phrase: "attested in Matthew, Luke, John, Acts", to: null },
    { phrase: "large portions of both Luke and John, and it closely agrees", to: null },
    { phrase: "John is strikingly different from the other three Gospels", to: null },
    { phrase: "In John, Jesus speaks largely in extended discourses", to: null },
    { phrase: "far from Ephesus, where John is traditionally held to have been written", to: null },
    { phrase: "the older critical theory that John was a mid-2nd-century work", to: null },
    { phrase: "near-complete copy of John and one of the oldest substantial", to: null },
    { phrase: "large portions of both Luke and John and is an important early witness", to: null },
    { phrase: "an important early witness to John's text", to: null },
    { phrase: "it was not part of John's original text", to: null },
    { phrase: "points to John circulating broadly and early in the church", to: null },

    // The Fourth Gospel's and Revelation's narrating voice — "John states", "John writes", "John
    // describes". Suppressed rather than resolved: naming the man is the authorship question, and
    // no link asserts nothing. Same precedent as the contested Nathan at 1 Kings 4:5 above.
    { phrase: "John states his purpose plainly near the end", to: null },
    { phrase: "the material John chose to record", to: null },
    { phrase: "and John writes as one who was there", to: null },
    { phrase: "After the crucifixion, John gives vivid resurrection accounts", to: null },
    { phrase: "the community, and John writes to strengthen those who remained", to: null },
    { phrase: "John warns of 'antichrists' and deceivers", to: null },
    { phrase: "John closes by assuring those who believe", to: null },
    { phrase: "dramatic visions, John seeks to comfort and warn", to: null },
    { phrase: "Revelation opens with John's overwhelming vision", to: null },
    { phrase: "John is then caught up to heaven", to: null },
    { phrase: "John describes a thousand-year reign", to: null },
  ],

  // ── The split-name fault. A multi-word name whose FIRST word is a biblical name, where the app
  // has no record for the whole man, does not fail by refusing to link — it fails by linking the
  // fragment. "Pope Paul VI" rendered "Paul" as a link to the apostle Paul; "Philip II of Macedon"
  // rendered "Philip" as the apostle Philip; "the King James Version" rendered "James" as James son
  // of Zebedee. Where the app HAS a record the remedy is a whole-name entry in matchNames (see
  // pope-john-paul-ii and pope-john-xxiii in people.ts). These three have no record, so the remedy
  // is no link — §7.12's standing interim, the same answer this file already gives the
  // high-priestly John of Acts 4:6 and Simon Peter's father. It is NOT a ruling that the app will
  // never carry a Paul VI, Paul III or Philip of Macedon record. If one is ever written, delete the
  // rule here and register the whole name on that record instead.
  //
  // The numerals are enumerated, never a general /[IVX]+/ pattern, and that is not fussiness: WEB
  // reads "and Paul I know, but who are you?" at Acts 19:15 and "John I beheaded" at Luke 9:9, so a
  // general Roman-numeral rule would strip the link off the apostle Paul in a real verse. Measured
  // against the whole corpus before being written, not reasoned about.
  paul: [
    { after: /^\s+(?:III|VI)\b/, to: null }, // Popes Paul III (Trent, the Jesuits) and Paul VI
  ],
  philip: [
    { after: /^\s+II\b/, to: null }, // Philip II of Macedon, who founded Philippi
    // Melanchthon (Luther's colleague) and Davies (the Tel Dan minority view) — modern men whose
    // first name is the apostle's. Interim: a record for either would change this answer.
    { after: /^\s+(?:Melanchthon|Davies)\b/, to: null },
  ],
  james: [
    { before: /\bKing\s+$/, to: null }, // "the King James Version" — a translation, not a man
    // Ussher (the 4004 BC chronology), Hoffmeier and Sanders (modern scholars, cited as
    // authorities). Interim; records would change the answer.
    { after: /^\s+(?:Hoffmeier|Sanders|Ussher)\b/, to: null },
  ],

  // ── Judas Maccabeus. THE priority in this batch: the leader of the Maccabean revolt was linking
  // to Judas Iscariot, on three articles the app already carries timeline events for. Of everything
  // in this sweep it is the one most likely to cost a reader's trust — the man who cleansed the
  // temple pointed at the man who betrayed Jesus.
  //
  // Suppression is the interim, not a verdict. Judas Maccabeus is the strongest candidate in this
  // whole class for an actual person record: he is a major figure, the app has three events about
  // his campaigns, and 1-2 Maccabees are in some canons the app serves. If a record is ever
  // written, delete this rule and register "Judas Maccabeus" on it instead.
  judas: [
    { after: /^\s+Maccabeus\b/, to: null },
  ],

  // ── The rest of the split-name sweep. Every one of these is a man the app has no record for,
  // whose first name is a biblical name, and whose mention was linking the fragment to the biblical
  // person. Same interim as above in every case: no link now, a record would change the answer.
  //
  // Enumerated by surname, one at a time, and deliberately NOT generalised into "a biblical first
  // name followed by an unknown capitalised word". The two guard cases at Acts 19:15 and Luke 9:9
  // exist because the obvious generalisation of the RULE ABOVE would have stripped the link off the
  // apostle Paul inside a live verse; the same caution applies here, where a general rule would
  // reach every "Simon Peter", "Mary Magdalene" and "James the son of Zebedee" in Scripture.
  thomas: [
    // More and Cromwell (Henry VIII's court), Clarkson (abolition), Thompson (the Nuzi parallels),
    // and St Thomas Bay, which is a place in Malta rather than a man at all.
    { after: /^\s+(?:More|Cromwell|Clarkson|Thompson|Bay)\b/, to: null },
  ],
  peter: [
    // Abelard, Faber (a founding Jesuit), Flint (a Dead Sea Scrolls scholar).
    { after: /^\s+(?:Abelard|Faber|Flint)\b/, to: null },
  ],
  michael: [
    // Servetus (burned at Geneva), Cerularius (the 1054 schism), Ballance and Rostovtzeff
    // (excavators). All were linking to Michael the archangel.
    { after: /^\s+(?:Servetus|Cerularius|Ballance|Rostovtzeff)\b/, to: null },
  ],
  mary: [
    // Mary I of England, and Mary Boyce the Zoroastrian scholar — both linking to Mary the mother
    // of Jesus. "Mary I" is enumerated as a whole token: a bare numeral rule would be the Acts
    // 19:15 mistake again.
    { after: /^\s+(?:Boyce|I)\b/, to: null },
  ],
  andrew: [{ after: /^\s+Steinmann\b/, to: null }],   // the Herod-dating minority view
  gideon: [{ after: /^\s+Foerster\b/, to: null }],    // the Herodium excavator
  jacob: [{ after: /^\s+Eliyahu\b/, to: null }],      // the boy who found the Siloam inscription
  solomon: [{ after: /^\s+Stoddard\b/, to: null }],   // Jonathan Edwards's grandfather
  david: [{ after: /^\s+George\b/, to: null }],       // David George Hogarth, who dug at Ephesus
  salome: [{ after: /^\s+Alexandra\b/, to: null }],   // the Hasmonean queen, not Jesus's follower
  felix: [{ after: /^\s+Gemina\b/, to: null }],       // "Colonia Iulia Felix Gemina Lystra" — a title

  // Roman name-chains. A full imperial name is several registered names in a row, so each piece was
  // linking to a different emperor than the man being named. "Tiberius Claudius Caesar Augustus
  // Germanicus" is Claudius, not Tiberius and not Augustus.
  augustus: [{ after: /^\s+Klein\b/, to: null }],     // Frederick Augustus Klein, the Mesha stele
  caesar: [{ after: /^\s+Octavianus\b/, to: null }],  // "Gaius Julius Caesar Octavianus" — Augustus
  tiberius: [
    { after: /^\s+(?:Claudius|Alexander)\b/, to: null }, // Claudius's regnal name; the procurator
  ],
  claudius: [
    // Claudius Lysias is the tribune of Acts 23:26, not the emperor — and this one is IN SCRIPTURE,
    // on the reader path. Appius Claudius Caecus built the Appian Way three centuries before him.
    { after: /^\s+(?:Lysias|Caecus)\b/, to: null },
  ],

  // ── Place names that begin with a person's name. A different fault from the ones above and a
  // worse one, because it is in the biblical text itself: "Abel" in "Abel Meholah" is not Adam's
  // son but the Hebrew word for a meadow, and it was linking every one of these towns to the first
  // murder victim. The app has no location record for any of them, so no link is the answer; if one
  // is ever added, register the compound name on the LOCATION and delete the rule.
  //
  // Abel son of Adam keeps all nine of his own mentions (Genesis 4, Matthew 23:35, Luke 11:51,
  // Hebrews 11:4 and 12:24) — none of them is followed by any of these words.
  abel: [
    { after: /^\s+(?:Mizraim|Shittim|Meholah|Maim|Beth Maacah|of Beth Maacah)\b/, to: null },
  ],
  perez: [
    { after: /^\s+Uzzah?\b/, to: null }, // "Perez Uzzah"/"Perez Uzza" — the place David named
  ],
  caleb: [
    { after: /^\s+Ephrathah\b/, to: null }, // 1 Chronicles 2:24 — a place, not the spy
  ],
};

/** Do the words around this match say who it is — or that it is nobody?
 *
 * The only correction in this file that reads the surrounding text, and deliberately a short,
 * enumerated list rather than a general parser. It earns its place by reaching three things nothing
 * else can: a book title (which must link to no person at all, and which the book/verse tables
 * cannot see because the biblical text never names its own books); a record whose article
 * legitimately names two different men called John, which OWNER_NAME_OVERRIDES gives one answer to;
 * and a book intro, which passes no record id at all.
 *
 * Returns `undefined` when no rule applies — distinct from a rule that applies and says `null`,
 * which means "this is deliberately not a link". */
function resolveByContext(
  nameLower: string,
  text: string,
  start: number,
  end: number
): { to: string | null } | undefined {
  const rules = NAME_CONTEXT_RULES[nameLower];
  if (!rules) return undefined;
  const before = text.slice(Math.max(0, start - 24), start);
  const after = text.slice(end, end + 24);
  for (const rule of rules) {
    if (rule.phrase !== undefined) {
      // The match must fall inside an occurrence of the phrase, not merely share a paragraph with it.
      for (let i = text.indexOf(rule.phrase); i !== -1; i = text.indexOf(rule.phrase, i + 1)) {
        if (start >= i && end <= i + rule.phrase.length) return { to: rule.to };
      }
      continue;
    }
    if (rule.before && !rule.before.test(before)) continue;
    if (rule.after && !rule.after.test(after)) continue;
    if (rule.before || rule.after) return { to: rule.to };
  }
  return undefined;
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

        const contextRule = hasVerseOverride ? undefined : resolveByContext(nameLower, text, start, end);

        if (hasVerseOverride) {
          const verseId = verseOverrides![verseKey!];
          if (verseId !== null && verseId !== excludeId) {
            annotations.push({ start, end, text: name, kind: ID_TO_KIND.get(verseId) ?? entry.kind, id: verseId });
          }
          // verseId === null means this exact mention is a different, unrepresented person — no link.
        } else if (contextRule) {
          // The words around the match settle it. "the Gospel of John", "1 John", "John's Gospel" —
          // the book, not a man. "Simon, son of John", "John Hyrcanus" — a different man with no
          // entry. "Peter and John" — the Apostle. Checked after the per-verse table for the same
          // reason CAPITALISED_ONLY is: an explicit verse answer should still win. Checked BEFORE
          // OWNER_NAME_OVERRIDES so that a record-wide rule cannot resurrect a link on a book title,
          // and so the two records naming both an Apostle and a narrator resolve each separately.
          const ctxId = contextRule.to;
          if (ctxId !== null && ctxId !== excludeId) {
            annotations.push({ start, end, text: name, kind: ID_TO_KIND.get(ctxId) ?? entry.kind, id: ctxId });
          }
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

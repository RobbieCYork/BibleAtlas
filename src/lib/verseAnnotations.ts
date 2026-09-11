import { locations } from "../data/locations";
import { pois } from "../data/pois";
import { people } from "../data/people";
import { topics } from "../data/topics";
import type { TopicCategory } from "../data/types";
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

/**
 * WHICH TOPIC CATEGORIES THE AUTO-LINKER REGISTERS. A switch, deliberately, not a filter.
 *
 * Every topic used to be registered simply because the loop below iterated `topics`. That was fine
 * while topics were practices, doctrines, people groups and concepts. It stops being fine with
 * archaeology, because of one measured fact:
 *
 *   All 66 book introductions in `data/bookIntros.ts` carry a `manuscripts: string[]` field —
 *   318 paragraphs in total — and `BookIntroView.tsx` renders every one of them through
 *   `LinkedVerseText`. Those paragraphs already name Qumran (58 times), the Masoretic Text (46),
 *   the Septuagint (36), the Dead Sea Scrolls (32), Codex Vaticanus (17), Codex Sinaiticus (16)
 *   and P46 (14), among others.
 *
 * So the day manuscript records are published, the Bible reader's book introductions change in 66
 * places, with hundreds of currently-plain phrases becoming links, and nobody will have edited
 * those pages. That is the payoff of doing this at all — a reader meeting "Codex Vaticanus" in the
 * introduction to Hebrews can now tap it — but it is a large reader-facing change, and a large
 * reader-facing change should be something someone turned on, not something that fell out of a
 * `forEach`. This map is where it is turned on, and `npm run test:linker` is the instrument that
 * measures what it did.
 *
 * Both archaeology categories are TRUE, which is the recommendation in the scope document and the
 * only setting under which migrating the 25 archaeology articles that already exist (today they
 * are `concept`, and today they are registered) leaves the linker where it found it. Setting either
 * to false would silently un-link 25 live articles. Flip one only with the delta in hand.
 *
 * A `Record<TopicCategory, boolean>`, so adding a category to the union is a compile error here
 * until someone states what it should do.
 */
const LINKED_TOPIC_CATEGORIES: Record<TopicCategory, boolean> = {
  practice: true,
  doctrine: true,
  "people-group": true,
  concept: true,
  // Registered — but see the six naming rules that protect the corpus from them:
  // never a bare personal name ("Pilate" belongs to Pontius Pilate the person, and the comment
  // saying so already sits in the `pilate-stone` record); never a bare place name ("Lachish
  // Letters" is safe, "Lachish" would steal every mention of the city from its own map record);
  // and never a bare manuscript siglum — "B", "D", "A" and "01" are ordinary words and single
  // letters. Register the unambiguous long form or nothing.
  discovery: true,
  manuscript: true,
};

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
  topics.filter((topic) => LINKED_TOPIC_CATEGORIES[topic.category]).forEach((topic) => {
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
 *   same brother's name "Judah," which no entry in this app claims, so it already produces no link.)
 *   Wrong a FIFTH time, and this one was live on the public site: Acts 15:22, 15:27 and 15:32 name
 *   JUDAS CALLED BARSABBAS, sent from the Jerusalem council to Antioch with Silas. Iscariot is dead
 *   at Acts 1:18, seven chapters earlier. Three mentions in all of Scripture, no article and no
 *   record, so suppressed on the same principle as Acts 1:23's Joseph directly below. The article
 *   half of the same fault — Silas's own life story — is fixed in OWNER_NAME_OVERRIDES, which is
 *   the only lever that reaches prose.
 * - "Joseph": the patriarch owns the bare key globally; Matthew's and Mark's Josephs are handled by
 *   BOOK_NAME_OVERRIDES. Acts holds two more men and neither is him. Acts 4:36's is BARNABAS, whom the
 *   app has, so that one RESOLVES — and it fires for the ASV alone, because WEB and KJV print "Joses"
 *   there. Acts 1:23's "Joseph called Barsabbas, who was also called Justus" is a fourth bearer with
 *   one mention in all of Scripture, no article and no record, so that one is SUPPRESSED, on the same
 *   principle as "Zadok" and "Eleazar" above. All three translations read "Joseph" at 1:23, so unlike
 *   4:36 it was wrong for every reader and its fix moves a WEB row. Nothing in either entry rules on
 *   the corpus-wide default for a bare "Joseph", which is open. */
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
    // Romans 16:6 — "Greet Mary, who labored much for us." A fifth Mary, in Paul's list of Roman
    // greetings, with no record and nothing known of her beyond this line. She was resolving to
    // the mother of Jesus, who is not in Romans at all. Added 2026-09-10.
    Romans: { "16:6": null },
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
    Matthew: { "13:55": null, "27:32": "simon-of-cyrene",
      // 10:4 — the apostle list's SECOND Simon. Mark 3:18, Luke 6:15 and Acts 1:13 print "Simon the
      // Zealot", which is a registered key and has always resolved correctly; Matthew alone prints
      // "Simon the Canaanite" (WEB and KJV) or "Simon the Cananaean" (ASV), which nothing matches,
      // so the bare key won and the Twelve contained Simon Peter twice. Fixed per verse rather
      // than by registering the wording, precisely BECAUSE the wording differs between
      // translations — a verse key is translation-blind and the phrase is not. The identification
      // itself is not a judgment call: qan'ana is the Aramaic for "zealot", which is why Luke
      // translates it. Added 2026-09-10.
      "10:4": "simon-the-zealot" },
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
    // Acts 1:13's apostle list names three different men called James. Two of them are now matched
    // as whole phrases — "James the son of Alphaeus", and the "James" inside "Judas the son of
    // James" — leaving exactly one bare "James", the son of Zebedee, which the Acts book override
    // would otherwise send to the brother of Jesus. That is what makes this verse fixable: it is
    // no longer three occurrences needing three answers, it is one.
    Acts: { "1:13": "james-son-of-zebedee",
      // 12:2 — "He killed James, the brother of John, with the sword." The verse names his brother,
      // and BOOK_NAME_OVERRIDES.james sends every bare "James" in Acts to the LORD'S BROTHER, which
      // is right at 12:17, 15:13 and 21:18 and wrong here, twelve verses before the first of them.
      // Added 2026-09-10 with the second-bearer sweep. This is the verse every article that says
      // "Zebedee's son was dead by AD 44" cites, so it is also the verse that must be right if that
      // argument is to hold anywhere else in this file.
      "12:2": "james-son-of-zebedee" },
    // ── The four "Mary the mother of James" verses — SUPPRESSED, and deliberately not resolved ──
    //
    // In every one of these the app already resolves the MOTHER correctly, by the `mary` entries
    // above, and gave her SON to Zebedee — internally contradictory inside a single clause, since
    // Zebedee's son's mother is Salome, who is named separately in two of the four.
    //
    // The natural repoint is james-son-of-alphaeus: identifying James the Less (Mark 15:40's own
    // wording) with Alphaeus's son is the traditional reading, and the app carries a record for
    // him. It is also GENUINELY DISPUTED, and this file does not settle a disputed identification
    // as a side effect of fixing a different fault — the same answer it already gives the
    // contested Nathan at 1 Kings 4:5. No link asserts nothing. Alphaeus's son keeps every verse
    // where Scripture spells out "James the son of Alphaeus", which is where the app does make the
    // identification it is willing to make.
    //
    // The one prose instance of the same phrase, on mary-mother-of-james-the-less's own record,
    // takes the same answer through OWNER_NAME_OVERRIDES so the two surfaces agree.
    Matthew: { "13:55": "james-brother-of-jesus", "27:56": null },
    Mark: { "6:3": "james-brother-of-jesus", "15:40": null, "16:1": null },
    Luke: { "24:10": null },
    // ── James 1:1 and Jude 1:1 — RULED 2026-09-10, and the ruling lives here ────────────────────
    //
    // Both resolved to Zebedee's son, which is wrong on anybody's account: Herod Agrippa killed
    // him in AD 44 (Acts 12:2) and no tradition and no critical scholar names him as the author of
    // either letter. §7.1 and §7.2 of automation/manager/name-linker-scope.md flagged the repoint
    // as a confessional position, cases.mjs pinned both verses `flagged`, and the second-bearer
    // sweep of 2026-09-10 duly backed its own change out and escalated.
    //
    // ROBBIE RULED FOR THE TRADITIONAL ATTRIBUTION, 2026-09-10. His reasoning, recorded so the
    // next agent reads it rather than re-litigating it:
    //   1. The pre-ruling state was not neutral, it was false. Zebedee's son is the one answer
    //      nobody holds, so "no position" was never on offer here — only a wrong one.
    //   2. The standing editorial position settles it (CLAUDE.md, 2026-09-07): articles are
    //      written from a Protestant evangelical stance with other views named fairly beside them.
    //      The traditional attribution IS that stance, and bookIntros.ts's `author` field for
    //      James already states it in prose AND names the critical dissent — "Some critical
    //      scholars question this because of the letter's polished Greek and its lack of
    //      biographical detail, while others find no compelling reason to doubt it". The link now
    //      agrees with the page it sits on, and the dissent is still on that page. If that
    //      sentence is ever deleted, this ruling loses its footing — do not delete it.
    //   3. The app already does this for harder cases: "Paul" links five times on
    //      book-intro:Romans and "Peter" four on book-intro:1 Peter, and 1 Peter's authorship is
    //      more disputed than James's. Declining only for James was the inconsistency.
    //   4. The §7 flags predate the 2026-09-07 editorial ruling; these two were stale.
    //
    // James 1:1 — "James, a servant of God and of the Lord Jesus Christ". WEB, KJV and ASV all
    // read "James"; the override is translation-blind and correct in all three (checked against
    // bible-api.com, 2026-09-10).
    //
    // Jude 1:1 — "Jude, a servant of Jesus Christ, and brother of James". WEB, KJV and ASV again
    // all read "James". This entry answers the JAMES surface only. §7.2's second question —
    // whether Jude is an apostle — is untouched and stays open, because "Jude" is not a registered
    // key: the verse renders no link on it at all, so there is nothing here that could assert it.
    // No reading makes Jude the brother of Zebedee's son (Zebedee's sons are James and John), and
    // even scholars who hold the letter pseudonymous agree the James it CLAIMS is James of
    // Jerusalem. The referent is not the disputed part.
    James: { "1:1": "james-brother-of-jesus" },
    Jude: { "1:1": "james-brother-of-jesus" },
  },
  //
  // ── AND A FIFTH BEARER, AT Acts 15:22, 15:27 and 15:32 — suppressed, not resolved ─────────────
  //
  // "Judas called Barsabbas, and Silas, chief men among the brothers" — the two men the Jerusalem
  // council sent to Antioch with Paul and Barnabas to carry its letter. He is a fifth distinct
  // Judas: not Iscariot, who owns the bare key globally and who is DEAD at Acts 1:18, seven
  // chapters earlier; not Thaddaeus; not the brother of Jesus at Matthew 13:55; and not Judas of
  // Galilee, on whom see the residual at the bottom of this comment. All three verses were
  // rendering "Judas" as a link to judas-iscariot, live on www.capstonebible.com.
  //
  // Like Acts 1:23's Joseph and unlike Acts 4:36's, this one is wrong for EVERY reader: all three
  // of the app's translations print "Judas" at all three verses — fetched 2026-09-10 from
  // bible-api.com, the service src/lib/biblePassage.ts asks for the text, rather than recalled:
  //
  //   15:22  WEB  "…send them to Antioch with Paul and Barnabas: Judas called Barsabbas, and Silas,
  //               chief men among the brothers."
  //          KJV  "…to Antioch with Paul and Barnabas; namely, Judas surnamed Barsabas, and Silas,
  //               chief men among the brethren:"
  //          ASV  "…with Paul and Barnabas; [namely], Judas called Barsabbas, and Silas, chief men
  //               among the brethren:"
  //   15:27  WEB  "We have sent therefore Judas and Silas, who themselves will also tell you the
  //               same things by word of mouth."
  //          KJV  "We have sent therefore Judas and Silas, who shall also tell you the same things
  //               by mouth."
  //          ASV  "We have sent therefore Judas and Silas, who themselves also shall tell you the
  //               same things by word of mouth."
  //   15:32  WEB  "Judas and Silas, also being prophets themselves, encouraged the brothers with
  //               many words, and strengthened them."
  //          KJV  "And Judas and Silas, being prophets also themselves, exhorted the brethren with
  //               many words, and confirmed them."
  //          ASV  "And Judas and Silas, being themselves also prophets, exhorted the brethren with
  //               many words, and confirmed them."
  //
  // The three differ on the SURNAME at 15:22 — KJV's "Barsabas" against "Barsabbas" — and at 15:27
  // and 15:32 the name is bare in all three. Nothing in these clauses but "Judas", "Silas", "Paul"
  // and "Barnabas" is registered to anybody, and the other three are right. So a verse-keyed
  // override, which is keyed on book/chapter/verse and on the name and not on the surrounding
  // wording, costs the spelling split nothing — that is the argument for this table over a phrase
  // pin, exactly as at Acts 1:23. Each of the three verses holds exactly ONE "Judas", which is what
  // makes a per-verse answer safe: the mechanism applies one value to every match of the key in a
  // verse.
  //
  // `null`, not a target, and NO new record. He has three mentions in all of Scripture and no
  // article; a `judas-barsabbas` record would be a page with nothing on it. `null` here means "a
  // different bearer whom the app does not represent" — the `zadok`, `eleazar`, `nathan` and Simon
  // Peter's father shape. Ruled 2026-09-10, the same ruling as Acts 1:23 and for the same reason.
  //
  // What this does NOT reach, measured rather than assumed:
  //   - The panel path, which passes no book and so cannot see a verse key at all. Re-confirmed for
  //     this change rather than inherited: every LinkedVerseText call site in src/ is handed an
  //     authored prose field (PersonPanel's paragraphs, placesLived, controversies, lifespanDatingNotes
  //     and a reference's source/summary; LocationPanel's founded/population/industry/facts/archaeology
  //     note; PoiPanel's description and archaeology note; TopicPanel's paragraphs; BookIntroView's
  //     whyWritten/paragraphs/manuscripts; TimelineEventPanel's paragraphs and datingNotes), and
  //     MyProfileView's one remaining call site is handed `saved.favoriteVerse`, which is the user's
  //     typed REFERENCE — the fetched verse text beside it is rendered as plain <p>, not through the
  //     linker. So no surface in the app renders Acts 15's Scripture text on the panel path, and
  //     bible-links.tsv's `panel` column measures what the linker WOULD do if one ever did.
  //   - Acts 5:37's "Judas of Galilee", the revolt leader Gamaliel names, which still resolves to
  //     Iscariot. A sixth bearer, in the same book, with no record. Measured while this was written
  //     and deliberately NOT swept in: it is part of a larger enumeration of second bearers (see the
  //     2026-09-10 sweep in automation/manager-inbox) and it will be ruled on with the rest rather
  //     than decided as a side effect here.
  judas: {
    Matthew: { "13:55": null },
    John: { "14:22": "thaddaeus" },
    // ── Luke 3:30, AND IT EXISTS ONLY IN THE ASV ───────────────────────────────────────────────
    //
    // Found 2026-09-10 by reading the second-bearer sweep's verses in all three translations
    // instead of trusting the WEB corpus, which is the only one this repo snapshots. Luke's
    // genealogy at 3:30 reads "the son of Judah" in the WEB and "the son of Juda" in the KJV —
    // neither of which is a registered key, so neither renders a link. The ASV reads "the [son] of
    // JUDAS", which is, and an ASV reader was being told that an ancestor thirty-six generations
    // before Jesus was Judas Iscariot. Nothing in scripts/name-linker/ could have seen it: the
    // corpus is WEB only, the fault does not exist there, and the snapshot is green either way.
    //
    // Exactly the Acts 4:36 shape from the other side — there an override fired for one
    // translation and matched nothing in the corpus; here a FAULT exists in one translation and
    // matches nothing in the corpus. A verse key handles both, because it is translation-blind.
    // Pinned by a named case carrying the ASV literal, which is the only cover it can have.
    Luke: { "3:30": null },
    // 1:13 resolves to the other apostle; the three 15:* verses are Judas Barsabbas and 5:37 is
    // Judas of Galilee, all suppressed. Keyed to five verses, not to the book — Acts 1:16 and
    // 1:25's "Judas" are untouched by this entry and are pinned as cases in
    // scripts/name-linker/cases.mjs.
    Acts: { "1:13": "thaddaeus", "15:22": null, "15:27": null, "15:32": null,
      // 5:37 — "Judas of Galilee rose up in the days of the enrollment". Gamaliel's second example
      // of a failed messianic movement, the census revolt of AD 6, and a SIXTH bearer in this one
      // book. He was measured and deliberately left by the Acts 15 batch, which was not authorised
      // to settle him; this is that batch's own note being closed. Suppressed, not resolved: he has
      // no record, and handing a failed messianic revolt to Iscariot is one of the two findings in
      // the second-bearer sweep that are theologically serious rather than merely wrong. The two
      // prose mentions of the same man, on quirinius, take the same answer through
      // OWNER_NAME_OVERRIDES, so the article and the verse agree.
      "5:37": null },
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
  // ── "Azariah" in 2 Chronicles: eight different men, none of them the king ────────────────────
  //
  // The bare key is a registered alternate name of UZZIAH, king of Judah, and BOOK_NAME_ALLOWLIST
  // confines it to 2 Kings, 2 Chronicles and Matthew. That is right in 2 Kings, where all eight
  // occurrences are the king (2 Kings 14:21 says in as many words that Azariah is who the people
  // made king). It is wrong in every one of 2 Chronicles' thirteen, which Chronicles spreads
  // across eight other men — and Chronicles names the king "Uzziah" throughout, never "Azariah",
  // which is what makes this whole book answerable verse by verse.
  //
  // Read one at a time, with the patronymic Chronicles supplies in the same clause:
  //   15:1   Azariah son of Oded, the prophet who meets Asa
  //   21:2   two of Jehoshaphat's sons, both called Azariah, in one verse
  //   22:6   a variant reading of Ahaziah king of Judah (the WEB prints "Azariah the son of
  //          Jehoram king of Judah"; the Hebrew has Azariah and the parallel 2 Kings 8:29 has
  //          Ahaziah). A different man from Uzziah on any reading of it.
  //   23:1   two captains of hundreds, son of Jeroham and son of Obed
  //   26:17, 26:20  AZARIAH THE PRIEST, who confronts Uzziah for burning incense — in the same
  //          chapter as the king, under the king's other name, on opposite sides of the altar.
  //          The most consequential of the thirteen, and the one the article half also had wrong.
  //   28:12  an Ephraimite chief, son of Johanan
  //   29:12  two Levites in Hezekiah's cleansing of the temple
  //   31:10  Azariah the chief priest, of the house of Zadok
  //   31:13  Azariah the ruler of God's house
  // None has a record and none is getting one for a patronymic; suppression is the answer this
  // file already gives Zadok, Eleazar and Acts 1:23's fourth Joseph. Added 2026-09-10. A verse
  // answers all of its occurrences, which is exact here: no verse in the list holds both the king
  // and somebody else.
  azariah: {
    "2 Chronicles": {
      "15:1": null,
      "21:2": null,
      "22:6": null,
      "23:1": null,
      "26:17": null,
      "26:20": null,
      "28:12": null,
      "29:12": null,
      "31:10": null,
      "31:13": null,
    },
  },
  // "Simeon" at Luke 3:30 — the genealogy again. The only record is Simeon at the temple (Luke 2),
  // and BOOK_NAME_ALLOWLIST keeps the key to Luke for exactly that reason, which is what lets this
  // one slip through: it is in Luke, thirty-six generations early. The same verse's "Joseph" is
  // suppressed under `joseph` above.
  simeon: {
    Luke: { "3:30": null },
  },
  // ── Colossians 4:11, and it is the worst single link the sweep found ─────────────────────────
  //
  // "and Jesus who is called Justus." Paul's Jewish co-worker in Rome, greeting the Colossians in
  // the same breath as Aristarchus and Mark — rendered on the reader path as a link to JESUS OF
  // NAZARETH. Ἰησοῦς is an ordinary first-century Jewish name (the Greek for Joshua) and Paul
  // distinguishes this man by his Roman cognomen in the same clause, which is why the verse says
  // "who is called Justus" at all.
  //
  // Suppressed rather than resolved: the app has no record for him, "Justus" produces no person
  // link anywhere in the app today, and one verse does not earn a record. What it does earn is
  // not being told that Paul's fellow worker is the Lord. This is the only occurrence of the name
  // in the WEB that means anybody but Jesus of Nazareth — checked across all 31,098 verses — so
  // the entry is one verse wide and cannot leak.
  jesus: {
    Colossians: { "4:11": null },
    // ── AND TWO THAT EXIST ONLY IN THE KING JAMES ─────────────────────────────────────────────
    //
    // Ἰησοῦς is the Greek for Joshua, and at Acts 7:45 and Hebrews 4:8 it means Joshua son of Nun.
    // The WEB and the ASV translate it "Joshua" at both, so both already link correctly to the
    // right man and this entry never fires for them. The KJV transliterates: "brought in with
    // JESUS into the possession of the Gentiles" and "if JESUS had given them rest". A reader who
    // switches to the KJV — which the app offers — was being shown Jesus of Nazareth leading the
    // conquest and being contrasted with the rest that remains.
    //
    // Checked, not assumed: all three translations of both verses were fetched from
    // bible-api.com on 2026-09-10 and are quoted verbatim in the cases that pin them. The second-
    // bearer sweep named these two specifically as worth checking and could not check them,
    // because the harness corpus is WEB only.
    //
    // REPOINTED rather than suppressed, and that is not a judgment call: the KJV's own margin and
    // every commentary read it as Joshua, Hebrews 4:8's whole argument depends on it being Joshua,
    // and the app has his record. The two verses are the only ones in the New Testament where the
    // KJV does this.
    Acts: { "7:45": "joshua" },
    Hebrews: { "4:8": "joshua" },
  },
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
  // "Jacob": the patriarch owns the key and is the right answer in all but two verses of the whole
  // Bible. Those two are the last two rungs of Matthew's genealogy, and the genealogy names the man
  // itself — "Matthan became the father of Jacob. Jacob became the father of Joseph, the husband of
  // Mary" (Matthew 1:15-16). That is Jacob son of Matthan, who has a record of his own whose first
  // line is that he is not the patriarch, so these RESOLVE rather than suppress: a reader standing
  // in Matthew's genealogy was being sent to Genesis, and no link would leave him with nothing.
  //
  // Nothing here is a ruling on the corpus-wide default for a bare "Jacob", which is Robbie's and is
  // open. Two verses, named one at a time, is the narrowest statement that fixes them.
  //
  // Why this table AND the phrase pins under `jacob` in NAME_CONTEXT_RULES below, for one fault:
  // they reach different halves of the app and neither reaches both. This one is keyed by
  // book/chapter/verse and is translation-blind, so it fires for KJV and ASV readers too — both of
  // which read "Matthan begat Jacob; and Jacob begat Joseph the husband of Mary", the same two men.
  // It needs a book, so it is invisible on the panel path. The pins are keyed on the WEB wording and
  // are the only lever the panel path has. Matthew 1:2's "Isaac became the father of Jacob" and Acts
  // 7:8's are the patriarch, and neither mechanism reaches them.
  jacob: {
    Matthew: { "1:15": "jacob-father-of-joseph", "1:16": "jacob-father-of-joseph" },
  },
  // "Joseph" at Acts 4:36 is BARNABAS — the verse's whole content is that the apostles surnamed
  // this Joseph "Barnabas". He is neither the patriarch, who owns the bare key globally, nor Mary's
  // husband, and BOOK_NAME_OVERRIDES does not override `joseph` in Acts, so he was resolving to
  // Joseph son of Jacob and sending the reader to Egypt.
  //
  // This one fires for exactly ONE of the app's three translations, and that is correct rather than
  // a gap. The name is a manuscript variant, and the app's own reader shows all three renderings —
  // fetched 2026-09-10 from bible-api.com, the service src/lib/biblePassage.ts asks for the text:
  //
  //   WEB   "Joses, who by the apostles was also called Barnabas…"
  //   KJV   "And Joses, who by the apostles was surnamed Barnabas…"
  //   ASV   "And Joseph, who by the apostles was surnamed Barnabas…"
  //
  // The Greek behind that split, read off the editions rather than recalled: the Textus Receptus
  // has Ἰωσῆς, NA28 and SBLGNT have Ἰωσήφ. KJV follows the TR and WEB the Majority Text, so both
  // print "Joses"; ASV follows the critical text and prints "Joseph". No edition disputes WHO he
  // is. So an override keyed on the name "joseph" simply has nothing to match in WEB or KJV, where
  // "Joses" is registered to nobody and renders as plain text, and corrects the one translation
  // that does render the name — which is what translation-blindness is supposed to do. Contrast the
  // `jacob` entry above, where all three translations carry the same word and all three move.
  //
  // Pointed at `barnabas` rather than suppressed, because the app HAS this man: on the reader path
  // there is no excludeId, so an ASV reader of Acts 4:36 now gets a link to Barnabas's own page,
  // which is a better answer than no link. See OWNER_NAME_OVERRIDES below for the article half of
  // the same fault.
  //
  // ── AND A FOURTH BEARER, AT Acts 1:23 — suppressed, not resolved ─────────────────────────────
  //
  // "They put forward two, Joseph called Barsabbas, who was also called Justus, and Matthias."
  // That is the man passed over for Matthias, and he is a fourth distinct Joseph: not the patriarch
  // who owns the bare key globally, not Mary's husband, not Joseph of Arimathea, and not the
  // Barnabas of 4:36 thirty-one verses later. He was resolving to Joseph son of Jacob and sending a
  // reader of Acts 1 to Egypt.
  //
  // Unlike 4:36 this one is wrong for EVERY reader, because all three of the app's translations
  // print "Joseph" here — fetched 2026-09-10 from bible-api.com, the service src/lib/biblePassage.ts
  // asks for the text, rather than recalled:
  //
  //   WEB   "They put forward two, Joseph called Barsabbas, who was also called Justus, and Matthias."
  //   KJV   "And they appointed two, Joseph called Barsabas, who was surnamed Justus, and Matthias."
  //   ASV   "And they put forward two, Joseph called Barsabbas, who was surnamed Justus, and Matthias."
  //
  // (The three differ on the SURNAME — KJV's "Barsabas" against "Barsabbas" — but not on "Joseph",
  // and no name in that clause but "Joseph" is registered to anybody, so nothing else is at stake.)
  // So this entry moves a real WEB row, which the 4:36 entry above deliberately does not, and the
  // Bible snapshot sees it.
  //
  // `null`, not a target, and not a new record. `null` in this table means "a different bearer whom
  // the app does not represent" — the `nathan`, `zadok`/`eleazar` and Simon Peter's father cases
  // above and below are all this shape — and that is exactly what he is. He has ONE mention in all
  // of Scripture and no article, and a `joseph-barsabbas` record with a single verse behind it
  // would be a page with nothing on it. Contrast 4:36, which points AT `barnabas` precisely because
  // the app already has that man. Ruled 2026-09-10.
  //
  // What this does not reach: the panel path, which passes no book and so cannot see a verse key at
  // all. Measured rather than assumed — see the note under `Acts: {` below.
  joseph: {
    // The panel path (LinkedVerseText, no book) still resolves both of these verses' "Joseph" to the
    // patriarch, and nothing here can change that. It is not a reader-facing gap today: the only
    // text LinkedVerseText is ever handed is the app's own authored prose plus a user's typed
    // favourite-verse reference — grep LinkedVerseText across src/, every call site is a prose
    // field — so no surface in the app renders Acts 1:23's Scripture text on that path. The `panel`
    // column of bible-links.tsv measures what the linker WOULD do if one ever did, which is worth
    // keeping honest and is why the residual is written down instead of papered over. The lever
    // that reaches the panel path is OWNER_NAME_OVERRIDES, and it needs a record whose article
    // names the man; no article in this app mentions Joseph Barsabbas at all, so there is nothing
    // for it to key on. A phrase pin on "Joseph called Barsabbas" would fire on the article surface
    // and nowhere else, and there is no article — so it would be a dead entry, and a dead entry
    // reads as a live claim.
    Acts: { "1:23": null, "4:36": "barnabas" },
    // ── Joseph of Arimathea, the two verses that do not spell out where he is from ─────────────
    //
    // BOOK_NAME_OVERRIDES sends a bare "Joseph" in Mark and John to Arimathea and in Matthew and
    // Luke to Mary's husband, which is right for the nativity and the genealogy and wrong for the
    // burial. Mark 15:43 and John 19:38 were never affected: the WEB prints "Joseph of Arimathaea"
    // there and that whole phrase is a registered key of its own. These two verses print only the
    // bare name, so the book default won, and a reader of the burial narrative was sent to the
    // carpenter of Nazareth. Added 2026-09-10.
    //
    // Independent of the corpus-wide question of who a bare "Joseph" belongs to, which is open and
    // is Robbie's: these two verses name a specific man and say what distinguishes him in the same
    // clause — "a rich man from Arimathaea" and "a member of the council".
    Matthew: { "27:57": "joseph-of-arimathea" },
    Luke: {
      "23:50": "joseph-of-arimathea",
      // ── And two in Luke's genealogy, which is neither man ────────────────────────────────────
      // Luke 3:26's "the son of Joseph" and 3:30's are ancestors in the chain from Jesus back to
      // Adam, forty and thirty-six generations before Mary's husband. No record; no link. The same
      // verses' "Simeon" is suppressed under `simeon` below, and their "Judah" already links to
      // nobody.
      "3:26": null,
      "3:30": null,
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
  // "David": the king is the only David with a record, and he is the right answer nearly everywhere.
  // One article names a different one. The Cairo Codex of the Prophets carries a dedication colophon
  // by David b. Yefet, an eleventh- or fifteenth-century Cairo dignitary, and B. Outhwaite's
  // conclusion — quoted whole in that article's third section — ends with his name. That record does
  // not mention King David at all, so the whole-record answer is safe: no link rather than a link to
  // the wrong man.
  david: {
    "cairo-codex-of-the-prophets": null,
  },
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
    // Genesis 34, on Shechem's own page: "his sons Simeon and Levi massacred the men of the city
    // after the assault on Dinah". Jacob's sons, pointing at Matthew the tax collector and at
    // Simeon in the temple. Added 2026-09-10 with the second-bearer sweep; the `simeon` entry
    // below carries the other half of the same sentence.
    shechem: null,
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
    // Two more of the same, added 2026-09-10: the letters to the seven churches, on the churches'
    // own map records. Smyrna's two ("no criticism from John", "a bishop tied by tradition to the
    // apostle John") and Pergamum's one ("some scholars connect to John's 'Satan's throne'
    // language") all pointed at the Baptist. These are location.history.notableFacts — 385 blocks
    // that were outside the harness entirely until corpus.mjs's field name was corrected.
    smyrna: "john-the-apostle",
    pergamum: "john-the-apostle",

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

    // ── Two more of the same voice, added 2026-09-10, and BOTH ARE PUBLIC-PAGE-ONLY ───────────
    //
    // Neither of these two links exists inside the app. They live in `summary`, which every panel
    // renders as plain text and which scripts/seo/render.mjs puts through this same linker when it
    // generates capstonebible.com — so no snapshot in scripts/name-linker/snapshot/ covers either
    // one, and the prose cases in cases.mjs are the only thing that does. That is also why they
    // survived the "John" sweep that produced every entry above it: the sweep read the article
    // surface, and these are not on it.
    //
    // Both were John the Baptist, who is the wrong man twice over — he was dead before either
    // book was written.
    thaddaeus: null, // "one clear moment in John's account: asking Jesus why he would reveal
                     // himself only to the disciples" — John 14:22, the Fourth Gospel narrating.
                     // The record's other "John" is the reference "John 14:22" itself, matched
                     // whole as kind "verse", which never reaches this table.
    // "he refused to welcome traveling teachers sent by John". SUPPRESSED, not repointed to the
    // Apostle — and this is a deliberate departure from the sweep that found it, which proposed
    // the Apostle on the strength of the app's Revelation ruling. Revelation is not the parallel:
    // BOOK_NAME_OVERRIDES already sends Revelation's "John" to the Apostle because the app's own
    // articles call him that in the surrounding sentence. The app's introduction to 3 John does
    // the opposite — it says "The elder" five times and never names him — so a link here would
    // assert an authorship the app has pointedly declined to assert, on a page a stranger can
    // read. The record's own first sentence, "The elder writing 3 John", is the same care.
    // No link removes the falsehood and asserts nothing, exactly as the narrating-voice group
    // above does. The other two "John"s on the record are the book title "3 John" (BOOK_NUMERAL)
    // and the reference "3 John 1:9-10" (kind "verse"); neither reaches this table.
    diotrephes: null,
  },
  // "Simeon": the only entry is Simeon at the temple (Luke 2), allowlisted to Luke for the reader.
  // Of the 10 prose mentions, 2 are his (Mary's page and Anna's) and 8 are not: Simeon son of Jacob
  // in the patriarch articles, and Simeon bar Kosiba — bar Kokhba — in the Roman revolt article.
  // Neither has an entry.
  // "Judas": Iscariot owns the bare name globally and is right at nearly every prose mention. ONE
  // record in the whole corpus names a different bearer in a way this table can reach. Silas's life
  // story opens "one of two 'leaders among the believers' in the Jerusalem church — alongside Judas
  // called Barsabbas", and that "Judas" was rendering as a link to Iscariot on Silas's page — the
  // article half of the Acts 15 fault fixed in VERSE_NAME_OVERRIDES above, and the half a reader
  // actually met, since the panel path has no other lever.
  //
  // Keyed on the OWNER rather than pinned as a phrase, and the reach of both was measured before
  // choosing: `links-for.mjs --grep "Barsabb|Barsabas"` returns exactly one block in the corpus,
  // this one, so a phrase pin would buy nothing a whole-record answer does not — and `links-for.mjs
  // silas` shows the record holds exactly one "Judas" in its four blocks, so the coarseness of a
  // whole-record answer costs nothing either. Where a record legitimately named both men this entry
  // would be wrong and the longer wording would have to do the work; this one does not.
  //
  // `null` and not a target, for the same reason as the verse entries: the app has no record for
  // Judas Barsabbas and is not getting one for three verses and no article.
  judas: {
    silas: null,

    // ── The rest of the Judases, 2026-09-10 ───────────────────────────────────────────────────
    // Iscariot owns the bare key and keeps it in 13 of our 25 prose mentions — Gethsemane, the
    // chief priests, the casting of lots, Zechariah's thirty pieces of silver, and all eight in the
    // Gospel of Judas article, where he is exactly who is meant. These twelve are four other men.
    //
    // JUDAS MACCABEUS, 5 links. NAME_CONTEXT_RULES already suppresses "Judas Maccabeus" written in
    // full; these are the bare shorthand in the next sentence, the same near miss "Philip II" had.
    // Suppressed on the standing interim — he is the strongest candidate in the whole sweep for a
    // record of his own, and that is Robbie's call, not this file's.
    "bib-it-maccabean-revolt-begins": null, // 2: "his five sons — Judas, Jonathan, Simon, John, and
                                            // Eleazar"; "passing leadership to his son Judas,
                                            // nicknamed 'Maccabeus'"
    "bib-it-judas-maccabeus-campaigns": null, // 2: the article and its datingNotes
    "bib-it-hasmonean-dynasty-begins": null, // 1: "the piety of Mattathias and Judas"
    // JUDAS OF GALILEE, the census revolt leader Gamaliel names in Acts 5:37. Handing a failed
    // messianic revolt to Iscariot is one of the two findings in this sweep that are theologically
    // serious rather than merely wrong; Acts 5:37 itself is fixed per-verse.
    quirinius: null, // 2: the life story and the extra-biblical summary
    // JUDAS OF STRAIGHT STREET, Acts 9:11 — the man in whose house Saul was praying.
    "ananias-of-damascus": null,
    "straight-street-damascus": null, // 2: the description and the archaeology note
    // JUDAS THE BROTHER OF JESUS, from Mark 6:3's list of four. Matthew 13:55 is already suppressed
    // on the reader path, so this makes the article agree with Scripture.
    "james-brother-of-jesus": null,
    // And one that is NOT a suppression and was mis-filed as one by the sweep that found it.
    // Thaddaeus's page quotes John 14:22 — "Judas (not Iscariot) said to him" — and that Judas is
    // THADDAEUS HIMSELF, the page's own subject, whose record is even titled "Thaddaeus (Judas,
    // son of James)". Mapped to the record, so the self-link exclusion suppresses it. It renders
    // the same as `null` would and it says something different, which is the point.
    thaddaeus: "thaddaeus",
  },
  simeon: {
    shechem: null, // the other half of Genesis 34's sentence — see `levi` above
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
  //
  // The other two entries are the two records that name a DIFFERENT Jacob — the son of Matthan,
  // father of Joseph the husband of Mary — and each is here for a different reason.
  //
  // MATTHAN is the simple case and the shape this table is for: he is neither man, every "Jacob"
  // on his record means his own son, and one answer per record is therefore the whole answer. Two
  // links, read in their own sentences before this was written: "named as the son of Eleazar and
  // father of Jacob in Matthew's genealogy" in the life story, and "as the father of Jacob,
  // Joseph's father" in the summary — which the app renders as plain text and
  // scripts/seo/render.mjs linkifies onto the public page. Both sent a reader of Matthew 1:15 to
  // Genesis.
  //
  // JACOB SON OF MATTHAN'S OWN PAGE is the hard case, because that record names BOTH men: "This
  // Jacob appears exactly once" is its own subject, and two sentences later "entirely distinct
  // from the patriarch Jacob" genuinely is the patriarch. One answer per record cannot serve both,
  // so the record-wide answer here is the SAFE one — the page's own subject, handed back to the
  // self-link exclusion, exactly as bare "Saul" behaves on Paul's page — and the two patriarch
  // mentions are recovered by a context pin in NAME_CONTEXT_RULES, which is checked first.
  //
  // That direction is deliberate and is the same call the `satan` and `book-intro:Zechariah`
  // entries above make: if the pin ever stops matching because someone rewords the sentence, the
  // mention falls back to NO LINK — a lost correct link rather than a wrong one asserted. Pinning
  // the two self-references instead would fail the other way: a reworded sentence would send
  // "This Jacob" back to the patriarch, which is the fault being fixed.
  //
  // Neither entry rules on who a bare "Jacob" belongs to anywhere else. That question is Robbie's
  // and is open; a ruling there leaves both untouched, because a page still does not link to its
  // own subject and Matthan is still neither man.
  jacob: {
    "topic-pharisees": null,
    matthan: "jacob-father-of-joseph",
    "jacob-father-of-joseph": "jacob-father-of-joseph",
  },
  // "Ananias": the bare name is registered to Ananias and Sapphira. The chief-priests article names
  // a different man — "the high priest Ananias" who comes down to Caesarea to press charges against
  // Paul (Acts 24:1) — and that man DOES have an entry, so this repoints rather than suppresses.
  ananias: {
    "chief-priests": "ananias-the-high-priest",

    // ── The rest of the Ananias cluster, second-bearer sweep, 2026-09-10 ──────────────────────
    //
    // 19 more links, and SCRIPTURE HAD ALL THREE MEN RIGHT THE WHOLE TIME — Acts 5 gives the
    // couple, Acts 9 and 22:12 the Damascus disciple, Acts 23:2 and 24:1 the high priest, on the
    // reader path, by verse override. Only the articles were wrong, because the article surface
    // has no verse and this table was the only lever that reaches it.
    //
    // Both other Ananiases link their OWN name to the couple on their OWN pages — the shape
    // scripts/name-linker/self-name.mjs now sweeps for — which accounts for 14 of the 19. The
    // Damascus disciple's page says "Ananias objected", "Ananias went as instructed", "Ananias
    // baptized him", nine times over, and every one of them pointed at a man who dropped dead in
    // Acts 5. Mapped to themselves so the self-link exclusion suppresses them.
    "ananias-of-damascus": "ananias-of-damascus", // 9
    "ananias-the-high-priest": "ananias-the-high-priest", // 5, including extraBib.summary's
                                                          // "Ananias son of Nedebaeus"
    // Five more that mean the Damascus disciple and say so in their own sentences. Each record
    // holds exactly one "Ananias".
    "paul-of-tarsus": "ananias-of-damascus", // "a disciple named Ananias, initially wary given Saul's reputation"
    "bib-ac-paul-conversion": "ananias-of-damascus", // "until a disciple named Ananias, obeying a direct vision"
    "straight-street-damascus": "ananias-of-damascus", // "the Lord tells Ananias to go to 'the street called Straight'"
    "house-of-ananias-damascus": "ananias-of-damascus", // 2: the POI is named for him
  },
  // "Jonah": the prophet is the right answer nearly everywhere, and VERSE_NAME_OVERRIDES above
  // already suppresses the five Scripture verses that name Simon Peter's father instead. Peter's
  // own article says the same thing in its own words — "Peter was born Simon, son of John (or
  // Jonah)" — and the prose path has no verse context to catch it, so it is caught by owner here.
  jonah: {
    "simon-peter": null,
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
  // "Zechariah": two records now share the name. The bare key belongs to Zechariah the priest,
  // father of John the Baptist, and BOOK_NAME_ALLOWLIST confines him to Luke for the reader —
  // which is why all 43 occurrences in Scripture, none of them his, render unlinked there. The
  // article surface has no allowlist, so all 32 prose mentions resolved to him, and 20 of the 32
  // are not him. This table is where the other 20 are sorted out, one owning record at a time.
  //
  // Eleven of them are Zechariah the post-exilic prophet, who now HAS a record
  // (zechariah-the-prophet, added 2026-09-07), so those eleven resolve to him instead of
  // resolving to nothing. He does not own the bare key and must not: he would take it from the
  // priest, whose twelve mentions are the ones the app has always had right.
  //
  // The twelve that ARE the priest — John the Baptist's page, Elizabeth's, Gabriel's, Ein Karem,
  // the ministry-begins article and Luke's introduction ("Zechariah's prophecy", the Benedictus)
  // — are correct by default and stay out of this table entirely.
  zechariah: {
    // ── Zechariah the prophet, son of Berechiah, son of Iddo.
    // Nine of his eleven mentions sit on records that name no other Zechariah, so an owner entry
    // settles them. The remaining two share a record with a mention of the BOOK, which one answer
    // per record cannot serve; they are pinned by phrase in NAME_CONTEXT_RULES below.
    zerubbabel: "zechariah-the-prophet", // "the prophets Haggai and Zechariah urged"; "Zechariah's vision of a lampstand"
    "behistun-inscription": "zechariah-the-prophet", // "Haggai and Zechariah both date their preaching by his regnal years"
    "bib-er-zerubbabels-return": "zechariah-the-prophet", // "until two prophets, Haggai and Zechariah, arrived"
    "bib-er-second-temple-completed": "zechariah-the-prophet", // "Haggai and Zechariah began preaching"; "the Temple that Zechariah, Malachi… would walk into"
    "bib-loc-triumphal-entry": "zechariah-the-prophet", // "the prophet Zechariah's picture of Israel's king"
    "wld-pg-darius-consolidation": "zechariah-the-prophet", // "the preaching of the prophets Haggai and Zechariah"
    "book-intro:Ezra": "zechariah-the-prophet", // "with the encouragement of the prophets Haggai and Zechariah"
    // His own page. Spelled out rather than left to fall through: without an entry here the bare
    // "Zechariah"s in his own article — "Zechariah told Zerubbabel", "sometimes called 'Second
    // Zechariah'" — would resolve to the priest, who is a different man and not this page's
    // subject. Setting it to the owner's own id is the self-link exclusion, which renders nothing.
    "zechariah-the-prophet": "zechariah-the-prophet",
    // ── Zechariah son of Jehoiada, stoned in the temple court under Joash (2 Chronicles
    // 24:20-22) — a third man entirely, with no record, and the article names his father in the
    // same sentence. One mention does not earn a record; no link stays the answer here.
    "bib-dkj-joash-reign": null,
    // ── The BOOK, not a man: a title in a list of where the Hebrew Bible develops Satan, a list
    // of which books call Zerubbabel "son of Shealtiel", and the manuscript notes of two Minor
    // Prophets introductions. Suppressed for the same reason as the "John as the fourth Gospel"
    // pins below — these are works being named, and a person link there is false whether or not
    // the person exists. Writing the prophet's record did not change that.
    shealtiel: null, // "Ezra, Haggai, Zechariah, and Matthew all consistently call Zerubbabel…"
    "book-intro:Malachi": null, // "its preserved text breaks off in Zechariah, before Malachi"
    // The two records that name both the man and the book. The record-level answer here is the
    // BOOK's — no link — and the single prophet mention on each is recovered by an exact-phrase
    // pin in NAME_CONTEXT_RULES. That direction is deliberate: if one of those two sentences is
    // ever rewritten, the pin stops matching and the mention falls back to no link, which is a
    // lost correct link rather than a wrong one asserted on a book title.
    satan: null, // controversies: "largely limited to Job, Zechariah, and 1 Chronicles" — the book
    "book-intro:Zechariah": null, // all four manuscript notes name the book
  },
  // "Joshua": the only entry is Joshua son of Nun, Moses's successor, and BOOK_NAME_ALLOWLIST
  // confines him to his own book and the handful that name him for the reader. The article
  // surface has no allowlist, so every "Joshua" in our prose resolves to him — including, on the
  // prophet Zechariah's page, Joshua son of Jehozadak, the high priest of the return, who is a
  // different man five centuries later with no record of his own. Suppressed here rather than
  // linked to the wrong Joshua.
  //
  // The other four were found by the modern-name sweep (scripts/name-linker/modern-names.mjs),
  // which flags a link covering only PART of a longer capitalised phrase — "High Priest Joshua".
  // When the Zechariah entry above landed, the satan and zerubbabel articles were noted as having
  // the same wrong link and deliberately left; the sweep found those two again and two more
  // nobody had seen. All six mentions across the four records are the high priest of the return
  // — read one by one, and no record among them names Joshua son of Nun at all.
  joshua: {
    "zechariah-the-prophet": null,
    satan: null, // Zechariah 3: "the high priest Joshua", "Joshua's filthy garments"
    zerubbabel: null, // "Zerubbabel and the high priest Joshua"; the 'two anointed ones'
    "bib-er-second-temple-completed": null, // "Governor Zerubbabel and High Priest Joshua"
    "wld-pg-cyrus-decree": null, // "Joshua the high priest"
  },

  // ── Modern people carrying biblical first names ─────────────────────────────────────────────
  // Found by sweeping for the shape rather than by noticing one: scripts/name-linker/modern-names.mjs.
  // The church-history records are where this bites, because they are the only articles in the app
  // whose cast is post-biblical, and the bare forename is registered to somebody else in every case.
  //
  // These are keyed by owner rather than pinned by phrase because each record has exactly ONE
  // answer for the name — checked by reading every occurrence of it on the record, not by reading
  // the one sentence that flagged. A record-keyed answer survives the paragraph being rewritten;
  // a phrase pin does not, and a snapshot row does not even survive the block being edited.

  // Knox's page names two queens called Mary — "Mary I's restoration of Catholicism" and "the
  // Catholic Mary, Queen of Scots" — and no Mary of the New Testament. The second was rendering as
  // a link to Mary the mother of Jesus. There is no record for either Tudor or Stuart queen, so the
  // honest answer is no link rather than a different wrong one.
  mary: {
    "john-knox": null,
    // Not a modern name and not from that sweep — the second-bearer enumeration, 2026-09-10.
    // Bare "Mary" belongs to the mother of Jesus globally. On Lazarus's page both occurrences are
    // his sister: "Lazarus lived in Bethany with his sisters Martha and Mary" in the life story,
    // and "The brother of Martha and Mary" in the summary. `mary-of-bethany` is a record of its
    // own and resolves correctly everywhere its longer wording appears; here there is no longer
    // wording, and the record names no other Mary at all. The second of the two is PUBLIC-PAGE-
    // ONLY — the app renders `summary` as plain text and scripts/seo/render.mjs linkifies it —
    // so no snapshot holds it and the prose case in cases.mjs is its only cover.
    "lazarus-of-bethany": "mary-of-bethany",
    // Their own pages, found by self-name.mjs rather than by the sweep. Bare "Mary" belongs to the
    // mother of Jesus, so both women's articles handed their own subject's name to her: Magdalene's
    // "when he says her name, 'Mary'" (John 20:16, the recognition at the tomb) and all six on
    // mary-of-bethany, from "Mary lived in Bethany with her sister Martha" onward. Mapped to
    // themselves for the self-link exclusion. Neither entry touches the cross-links the two
    // records make to EACH OTHER — "Mary Magdalene" and "Mary of Bethany" are registered keys of
    // their own and were always right, which is exactly what the sweep had checked.
    "mary-magdalene": "mary-magdalene", // 2
    "mary-of-bethany": "mary-of-bethany", // 6
    // MARY THE MOTHER OF JOHN MARK, Acts 12:12, whose house the church was praying in. A fourth
    // woman, with no record. Scripture's Acts 12:12 already suppresses her, so until now the two
    // articles that tell that story contradicted the verse they were telling it from.
    "john-mark": null, // "the son of a woman named Mary whose house in Jerusalem served as a
                       // meeting place"
    rhoda: null, // "gathered at the Jerusalem house of Mary, mother of John Mark"
  },
  // Same page, same problem, one occurrence: "Protestant Elizabeth I came to the English throne"
  // pointed at Elizabeth the mother of John the Baptist. Elizabeth I has no record.
  elizabeth: {
    "john-knox": null,
  },
  // "one of nineteen children of Samuel and Susanna Wesley" — John Wesley's father, linking to the
  // prophet who anointed Saul and David. The only "Samuel" on the record.
  samuel: {
    "john-wesley": null,
  },
  // "Teresa founded the Convent of St. Joseph in Ávila" — the house is named for Joseph of
  // Nazareth, and the link went to Joseph son of Jacob. This one REPOINTS rather than suppresses,
  // because the app has the right man and the building genuinely bears his name: the same call the
  // eight "St. Peter's Basilica"/"St. Peter's Square" mentions already get, left pointing at Simon
  // Peter across the Luther, Nero's-circus and Vatican-necropolis articles.
  // The three records below are a different fault from Teresa's and share one shape: THE PAGE'S OWN
  // SUBJECT IS A JOSEPH, and every bare "Joseph" on it was resolving to the patriarch. Joseph of
  // Arimathea's biography opens "Joseph was a wealthy man from the town of Arimathea" and sent the
  // reader to Egypt under his own name; so did Mary's husband's, and so did Caiaphas's, whose given
  // name was Joseph ("Joseph, who was also called Caiaphas" — Josephus, Antiquities 18.2.2).
  //
  // Nineteen links, enumerated one at a time and read in their own sentences before this was
  // written: 8 on joseph-husband-of-mary, 7 on joseph-of-arimathea, 4 on caiaphas. Not one of the
  // nineteen is the patriarch, which is why one answer per record is enough here — the coarseness
  // that makes OWNER_NAME_OVERRIDES the wrong lever for a mixed record is no cost on a record whose
  // every occurrence means the same man.
  //
  // Mapped to the record itself rather than to null, exactly as `augustus` on claudius-caesar below
  // is, because that is what it is: the page's own subject, handed back to the self-link exclusion.
  // A page does not link to itself, and the reason these got past that exclusion is that the id
  // they resolved to was somebody else's.
  //
  // This says nothing about who a bare "Joseph" belongs to anywhere else. That question is Robbie's
  // and is open; a ruling there leaves these three untouched, because a page still does not link to
  // its own subject whatever the corpus-wide default turns out to be.
  //
  // ── The three below are NOT self-links, and that is the whole point of listing them apart ────
  //
  // Added 2026-09-10 after the three records were measured link by link. None of these pages has a
  // Joseph as its subject, so the self-link exclusion never had anything to say about them; they
  // were simply wrong, and stayed wrong because nothing else reaches the article surface. What
  // they share with the three above is the only property this table needs: EVERY bare "Joseph" on
  // each of them means the same man, and that man is the husband of Mary. Each was read in its own
  // sentence first, and the count is exact:
  //
  //   mary-mother-of-jesus     4  "betrothed to a carpenter named Joseph"; "Joseph, learning of
  //                               the pregnancy"; "Mary traveled with Joseph to Bethlehem";
  //                               "Matthew records that Joseph was warned in a dream". Her husband
  //                               four times over, in the nativity, on his wife's page. The only
  //                               other occurrence on the record is "Josephus", which the word
  //                               boundary already saves, in a field the app renders as plain text.
  //   matthan                  3  "before Joseph's father Heli (Luke 3:23-24)" and "one traces
  //                               Joseph's legal/royal line" in the life story, plus "Joseph's
  //                               father" in the summary. Matthan is Joseph's grandfather in
  //                               Matthew's list; the patriarch is not in this article at all.
  //   jacob-father-of-joseph   3  "the father of 'Joseph the husband of Mary'"; "Luke's genealogy
  //                               names Joseph's father as Heli"; and "The father of Joseph, the
  //                               husband of Mary" in the summary. The record's own role is that he
  //                               fathered this Joseph — the name is in its id.
  //
  // Ten links, every one of which pointed at Joseph son of Jacob and sent a reader of Matthew's
  // genealogy to Egypt. Note that the `jacob` entry above needs a context pin because that record
  // names two Jacobs; its three JOSEPHs need no such thing, because they are all one man.
  //
  // Same disclaimer as above, and it matters more here because these are not self-links: this says
  // nothing about who a bare "Joseph" belongs to anywhere else. 305 bare "Jacob"/"Joseph" links
  // were counted across the corpus while this was written and many outside these records are also
  // the husband rather than the patriarch. Those are the corpus-wide ruling, which is Robbie's and
  // is open, and they are deliberately left alone.
  joseph: {
    "teresa-of-avila": "joseph-husband-of-mary",
    "joseph-husband-of-mary": "joseph-husband-of-mary",
    "joseph-of-arimathea": "joseph-of-arimathea",
    caiaphas: "caiaphas",
    "mary-mother-of-jesus": "joseph-husband-of-mary",
    matthan: "joseph-husband-of-mary",
    "jacob-father-of-joseph": "joseph-husband-of-mary",

    // ── THE REST OF THE NATIVITY CAST, 2026-09-10 ────────────────────────────────────────────
    //
    // Same fault as the three above and the same shape, swept rather than noticed one at a time.
    // Every bare "Joseph"/"Jacob" link in the corpus was enumerated across all 6,677 blocks — the
    // 5,692 the app renders through LinkedVerseText AND the 985 that are links only on the
    // pre-rendered public pages, which no snapshot covers — and read in its own sentence. 321 of
    // them. Outside the records already listed above, the nativity cast was wrong in one
    // direction throughout: a bare "Joseph" in a sentence about the birth, the census, the magi,
    // the flight, the return to Nazareth or Matthew's genealogy resolved to Joseph son of Jacob
    // and sent the reader to Egypt.
    //
    // The rule applied, and its whole extent: ON A RECORD WHOSE SUBJECT BELONGS TO THE NATIVITY
    // OR TO MATTHEW'S GENEALOGY, A BARE "Joseph" IS THE HUSBAND OF MARY. That is a statement
    // about these records, not about the corpus. It is safe here because the sentences name the
    // man themselves — "Joseph and Mary traveled to Bethlehem", "Joseph is warned in a dream",
    // "Joseph, the husband of Mary" — so no reading of any of them is the patriarch.
    //
    // It settles nothing about who a bare "Joseph" belongs to ANYWHERE ELSE. That question is
    // Robbie's and is open; the 284 links outside this list are deliberately untouched, including
    // every one of the ~150 in the Genesis patriarch articles, which are already right.
    //
    // OWNER_NAME_OVERRIDES rather than a phrase pin for all of these, and the test was the same
    // every time: EVERY occurrence of the name on the record means one man. That was measured per
    // record, not assumed — a regex over every "Joseph"/"Jacob" token on each record's blocks,
    // linked or not, read in context. A record-keyed answer survives the paragraph being
    // rewritten, which a pin does not and a snapshot row does not. The one record here that names
    // both men is `egyptians`, and it is pinned by phrase in NAME_CONTEXT_RULES instead.
    //
    // Counts are exact and were read off the enumeration, not estimated. Where the count includes
    // a `summary`, that link exists ONLY on capstonebible.com — the app renders those fields as
    // plain text and scripts/seo/render.mjs linkifies them — so no snapshot can hold it and the
    // prose case in cases.mjs is the only thing that does.

    // Nativity people. Each names Mary in the same clause or the same paragraph.
    "caesar-augustus": "joseph-husband-of-mary", // 2: "the reason Joseph, of the house of David, traveled from Nazareth"; summary
    quirinius: "joseph-husband-of-mary", // 2: "the census that brought Joseph and Mary to Bethlehem"; summary
    "herod-the-great": "joseph-husband-of-mary", // 2: the Bethlehem massacre "Joseph and Mary escaped"; "led Joseph to settle instead in Nazareth"
    "herod-archelaus": "joseph-husband-of-mary", // 3: Matthew 2:22 in lifeStory, controversies and summary
    "simeon-at-the-temple": "joseph-husband-of-mary", // 2: "Mary and Joseph brought the infant Jesus"; "blessed Mary and Joseph"
    magi: "joseph-husband-of-mary", // 1: "Joseph is likewise warned in a dream to flee with Mary and the child"
    "jesus-of-nazareth": "joseph-husband-of-mary", // 1: "raised… by Mary and her husband Joseph". The record's OTHER Joseph is "Joseph of Arimathea", which is a longer registered name and a different key, so this entry cannot reach it.
    "james-brother-of-jesus": "joseph-husband-of-mary", // 1: "Raised in Nazareth in the household of Joseph and Mary"
    "philip-the-apostle": "joseph-husband-of-mary", // 1: John 1:45 quoted — "Jesus of Nazareth, the son of Joseph"

    // Matthew's genealogy. Five stubs whose only content is that they are a name in the chain, and
    // Jeconiah, whose whole controversy is that the line runs through this Joseph.
    azor: "joseph-husband-of-mary", // 1: "the chain linking… to Joseph, the husband of Mary"
    achim: "joseph-husband-of-mary", // 1: same sentence
    eliud: "joseph-husband-of-mary", // 1: same sentence
    "eleazar-in-jesus-genealogy": "joseph-husband-of-mary", // 1: "this genealogical figure in Joseph's ancestry"
    "zadok-in-jesus-genealogy": "joseph-husband-of-mary", // 1: same clause
    jeconiah: "joseph-husband-of-mary", // 2: "an ancestor of Jesus through Joseph in Matthew's genealogy"; the same point in controversies

    // The nativity timeline events, and the two Roman ones that reach the census from the other end.
    "bib-loc-birth-of-jesus": "joseph-husband-of-mary", // 1: "move Joseph and Mary from Nazareth… to Bethlehem"
    "bib-loc-magi-flight-to-egypt": "joseph-husband-of-mary", // 1: "Joseph, likewise warned in a dream, takes Mary and the child and flees by night to Egypt"
    "bib-loc-jesus-in-temple-age-twelve": "joseph-husband-of-mary", // 1: "Joseph and Mary make their customary Passover pilgrimage"
    "bib-loc-return-nazareth-childhood": "joseph-husband-of-mary", // 3: the angel's instruction, the warning about Archelaus, "Joseph's carpentry trade"
    "wld-rom-battle-of-actium": "joseph-husband-of-mary", // 1: "the census mentioned in Luke 2:1 that brought Joseph and Mary to Bethlehem"
    "wld-rom-augustus-becomes-emperor": "joseph-husband-of-mary", // 1, SUMMARY ONLY — public page, no snapshot: "brought Joseph and Mary to Bethlehem"

    // Two places and a book intro pair, where the nativity is what the record says about them.
    sepphoris: "joseph-husband-of-mary", // 1: "some scholars suggest Joseph and the young Jesus… may have found work"
    egypt: "joseph-husband-of-mary", // 1: "Where Joseph, Mary, and the infant Jesus fled to escape Herod's massacre"
    romans: "joseph-husband-of-mary", // 1: "Caesar Augustus's census brings Joseph and Mary to Bethlehem"
    "book-intro:Matthew": "joseph-husband-of-mary", // 1: "the angelic message to Joseph, the virgin birth"
    "book-intro:Luke": "joseph-husband-of-mary", // 1: "the census that brings Joseph and Mary to Bethlehem"

    // ── The one that is NOT the husband, and the reason to read sentences instead of lists ────
    //
    // bib-loc-burial-of-jesus was measured as a nativity-adjacent record with one wrong "Joseph",
    // and the assumption would have been the husband. It is not. The article opens "Joseph of
    // Arimathea — a wealthy member of the Sanhedrin", and the bare mention three sentences later
    // is "lay it in Joseph's own new tomb" — the same man, the tomb owner, named at length once
    // and briefly afterwards. Both other occurrences on the record already resolve correctly
    // because "Joseph of Arimathea" is its own registered name and its own key, which this entry
    // does not touch. Mary's husband is not in this article at all.
    "bib-loc-burial-of-jesus": "joseph-of-arimathea", // 1: "Joseph's own new tomb"

    // ── Where the pin has to do it instead ───────────────────────────────────────────────────
    //
    // `egypt` and `bib-loc-magi-flight-to-egypt` are the two records above where a future editor
    // is most likely to add the patriarch — the article is about Egypt, and he is the man Egypt
    // is otherwise about. Measured today, neither names him: one "Joseph" each, both the husband,
    // which is what this table requires. If either ever gains a patriarch mention, this entry
    // becomes the wrong lever for it and must be replaced by a phrase pin pair, exactly as
    // `egyptians` and `jacob-father-of-joseph` already are. Recorded here so the next person
    // finds it before the snapshot does.

    // ── THE THIRD JOSEPH, 2026-09-10 — and he is not a third record ──────────────────────────
    //
    // Barnabas's own life story opens "Barnabas is introduced in Acts as Joseph, a Levite from
    // Cyprus, whom the apostles nicknamed 'Barnabas'" (Acts 4:36). That "Joseph" was resolving to
    // the patriarch — wrong on any reading, and left standing as a `known-wrong` case by the
    // nativity batch, which was not authorised to settle it.
    //
    // The obvious fix was a new `joseph-barnabas` person record. It is the wrong one, because
    // THIS JOSEPH IS BARNABAS: Acts 4:36 says the apostles renamed him, and the app already has
    // the man. A second record for the same person would split his links and need maintaining.
    // So this is a self-link, and it belongs here mapped to the record's own id, exactly as
    // `augustus` on claudius-caesar and the `joseph-husband-of-mary`/`joseph-of-arimathea`/
    // `caiaphas` entries above are. NOT `null`: null in this table means "a different,
    // unrepresented bearer", and that is precisely what he is not.
    //
    // The other candidate — registering a bare "Joseph" as a matchName on the barnabas record —
    // was MEASURED before it was rejected, and it fails in both directions at once:
    //
    //   As written today it moves NOTHING. Zero rows in all three snapshots, and the fault above
    //   stays. NAME_TO_ENTRY is built last-wins from a length-stable sort, so two entries spelled
    //   "Joseph" are separated only by their order in people.ts — and `joseph-son-of-jacob` sits
    //   at line 2973, below `barnabas` at 582. The registration loses the key and is inert.
    //
    //   If it ever won the key it is catastrophic. Forced to win and measured: 248 Bible rows
    //   repoint to Barnabas, 83 prose rows repoint and 16 MORE appear (6,371 -> 6,387) as
    //   self-link suppressions on the Josephs' own pages stop firing, key-totals repoints all
    //   three paths, and 15 named cases fail. Every "Joseph" in Genesis becomes a Cypriot Levite.
    //
    // Which of those two you get depends on nothing but where a record happens to sit in a data
    // file — the same accident SAUL_DEFAULT and edomLocationEntry above exist to take out of the
    // hands of file order. So it is not a lever at all, and this table is.
    barnabas: "barnabas",
  },

  // ── Two more from the same sweep: a bare name that is the WRONG ancient man ──────────────────
  // Not a modern name, but found by the same pass and the same shape — a bare forename registered
  // to somebody else, on a record with only one bearer.

  // "Hoshea" belongs to Joshua globally: Numbers 13:16 records Moses renaming him, and
  // BOOK_NAME_ALLOWLIST keeps the bare key to Numbers on the reader path for exactly that reason.
  // The article surface has no allowlist, so the fall-of-Samaria record's "Israel's last king,
  // Hoshea, made the fatal mistake of withholding tribute" pointed at Joshua son of Nun, seven
  // centuries early. The app has the right man. TWO links move, and only one of them is in the
  // prose snapshot: the other is in `summary`, which the app renders as plain text but
  // scripts/seo/render.mjs linkifies onto the public page. See modern-names.mjs on that surface.
  hoshea: {
    "bib-dki-fall-samaria-722": "hoshea-king-of-israel",
  },
  // "Tiberius Claudius Caesar Augustus Germanicus" — Claudius's own regnal name, in which
  // "Augustus" is the imperial TITLE, not Octavian. Pointed at Caesar Augustus. Mapped to the
  // record itself rather than to null, because that is what it actually is: his own name, handed
  // back to the self-link exclusion, the same way bare "Saul" behaves on Paul's page. The only
  // "Augustus" on the record; the other 36 in our prose, including "the Senate would grant him
  // the title 'Augustus'", are Octavian and are untouched.
  augustus: {
    "claudius-caesar": "claudius-caesar",
  },
  // "Thomas": the apostle owns the bare key. Thomas Aquinas's own article uses his forename three
  // times — "Thomas was sent as a child oblate to Monte Cassino", "Thomas studied under Albertus
  // Magnus", "In late 1273, Thomas experienced a profound mystical episode" — and every one linked
  // to the apostle. The same shape as the five Simons and the two Marys below, and found the same
  // way, by scripts/name-linker/self-name.mjs. Mapped to himself; the record names no other Thomas.
  // NAME_CONTEXT_RULES already handles Thomas More, Cromwell, Clarkson, Thompson and Roe.
  thomas: {
    "thomas-aquinas": "thomas-aquinas",
  },
  // "Caesar": the bare key belongs to Tiberius, which is right for the Gospels' "render to Caesar"
  // and for Acts's appeals. Three prose mentions are JULIUS Caesar, who has no record: two on
  // Augustus's own page — "the grand-nephew and posthumously adopted heir of Julius Caesar" and
  // "after Caesar's assassination in 44 BC" — and one on Herod's rise, "won the favor of Julius
  // Caesar". Not a self-link, even on Augustus's page: the man being named is his great-uncle.
  //
  // A miss the existing split-name machinery could not have caught, and worth saying why: the
  // sweep for "a biblical name FOLLOWED by a qualifier" is what catches "Philip II" and "Paul VI",
  // and this is a biblical name PRECEDED by a forename. Suppressed on the standing interim; a
  // record for Julius Caesar would replace both entries. Augustus's own "Caesar Augustus"
  // mentions match his registered name and are untouched.
  //
  // ⚠ THIS ENTRY IS NOT THE WHOLE CAESAR PROBLEM, and the next person here should be told the size
  // of what is left rather than discover it. Measured 2026-09-10, after these three were fixed:
  // 39 bare "Caesar" links remain in our prose and on the public pages, and only about five of
  // them are Tiberius. Roughly twenty-two more are JULIUS — the Rubicon, the assassination,
  // Actium, Antony's rise, Corinth's refounding in 44 BC — and roughly seventeen are NERO, every
  // one of them Paul's "I appeal to Caesar" (Acts 25), including four on Nero's own page, which is
  // the self-name shape again. The reader path already gets the Nero half right: BOOK_NAME_OVERRIDES
  // above sends "Caesar" in Acts and Philippians to Nero, and only the article surface, which has
  // no book, disagrees with it. That cluster was NOT in the second-bearer sweep, it is larger than
  // several clusters that were, and it is not fixed here.
  caesar: {
    "caesar-augustus": null,
    "bib-it-herod-the-great-rise": null,
  },

  // ══ THE SECOND-BEARER SWEEP, 2026-09-10 ══════════════════════════════════════════════════════
  //
  // A shared name resolves to the FAMOUS bearer everywhere the linker has no context, and on the
  // article surface it never has any. That is one fault with one shape, and it was enumerated in
  // full rather than noticed one article at a time: every person link on all 6,677 blocks — the
  // 5,692 the app renders through LinkedVerseText and the 985 that are links only on the
  // pre-rendered public pages — plus all 31,098 WEB verses on both rendering paths.
  //
  // Two rulings govern what is written below, and neither is a new position:
  //
  //   REPOINT where the app already carries the right man. Mechanical.
  //   SUPPRESS where it does not — the `zadok`/`eleazar`/Acts 1:23 shape. `null` here means "a
  //   different, unrepresented bearer", and it is an interim, never a verdict that the man does
  //   not deserve a page. Judas Maccabeus, Simon Maccabeus, Titus the emperor and Philip II of
  //   Macedon are all suppressed below and all four are open questions for Robbie; a record for
  //   any of them replaces its entry here rather than fighting it.
  //
  // ── THE TEN THAT ARE ONLY ON THE PUBLIC PAGES ────────────────────────────────────────────────
  //
  // Done first, because they are the ones nothing else can hold. `person.summary`,
  // `person.occupation`, `topic.summary`, `timelineEvent.summary` and `location.rulers[].name`
  // are plain text in the app and LINKS on capstonebible.com — scripts/seo/render.mjs puts all
  // five through this same function, passing the record's own id, which is why this table reaches
  // them at all. `loadProseBlocks()` correctly does not enumerate them, so NO snapshot covers a
  // single one: 795 person links on 985 blocks that a stranger can read and that the regression
  // net cannot see. Every one of the ten below is pinned by a prose case in cases.mjs quoting the
  // summary verbatim, because that case is the only cover it will ever have.
  //
  // Two of the ten sit under `john` and `mary` above, with the rest of their own name's entries.
  // The eight here are the new keys.

  // "Philip": the bare name belongs to the Apostle globally, which is right in the Gospels and
  // wrong everywhere Acts 6/8/21 is being retold. The Evangelist has his own record and the
  // reader path already resolves him correctly at all 15 of his verses (VERSE_NAME_OVERRIDES
  // above) — it is only the article surface, which has no verse, that sends him to the Apostle.
  //
  // Three records here, each carrying a summary link. Each names exactly ONE Philip, checked by
  // scanning every occurrence of the token on the record, linked or not:
  //   ethiopian-eunuch              8  seven in lifeStory/placesLived + the summary. The summary
  //                                    is the sentence that made the case for doing these first:
  //                                    "baptized by Philip the Evangelist after Philip explained
  //                                    the 'suffering servant' passage" — the long name resolving
  //                                    correctly and the bare one, ten words later, to a different
  //                                    man, in one sentence on a public page.
  //   bib-ac-philip-ethiopian-eunuch 7  six article paragraphs + the summary.
  //   simon-magus                   2  "began following Philip around" + the summary. Its other
  //                                    occurrence is "Philip the Evangelist", already correct.
  // ── THE WHOLE PHILIP CLUSTER ─────────────────────────────────────────────────────────────────
  //
  // 61 bare "Philip" links on the article and public-page surfaces. 12 are the Apostle and are
  // correct — the Gospel cast (andrew-apostle, bartholomew-nathanael ×4,
  // bib-loc-calling-first-disciples), Bethsaida's two records, and the Hierapolis martyrium, which
  // names him "the Apostle Philip" in its own sentence. Those 12 are untouched and four of them
  // are guarded by named cases. The other 49 were three different men:
  //
  //   30  Philip the Evangelist, one of the seven (Acts 6, 8, 21)
  //   15  Philip the Tetrarch — 11 of them on his own page, and 5 of those 11 are a THIRD Philip
  //    4  Philip II of Macedon, who has no record
  //
  // The tell worth naming, because it repeats across this whole sweep: A RECORD'S OWN PAGE IS THE
  // COMMONEST FAILURE SITE. The self-link exclusion only fires when the resolved id IS the owner,
  // so a page whose subject shares a name with a more famous man links its own subject's name to
  // that other man, on every mention. Every "Philip" in the Evangelist's life story pointed at the
  // Apostle; every "Philip" on the Tetrarch's page did too. scripts/name-linker/self-name.mjs now
  // sweeps for that shape.
  //
  // OWNER_NAME_OVERRIDES throughout rather than phrase pins, and the test was applied per record,
  // not assumed: every occurrence of the token on the record — linked or not — was read in its own
  // sentence, and every record below holds exactly one Philip. A record-keyed answer survives the
  // paragraph being rewritten; a pin does not.
  philip: {
    // ── The Evangelist, 30 links. The reader path has had him right at all 15 of his verses since
    // VERSE_NAME_OVERRIDES above was written; only the article surface, which has no verse to look
    // at, sent him to the Apostle.
    "ethiopian-eunuch": "philip-the-evangelist", // 8: seven in lifeStory/placesLived + the summary
    "bib-ac-philip-ethiopian-eunuch": "philip-the-evangelist", // 7: six article paragraphs + summary
    "simon-magus": "philip-the-evangelist", // 2: "began following Philip around" + the summary
    // His own page — the worst-hit record in the sweep. All six "Philip"s in his life story, from
    // "Philip was one of seven men" onward, linked to the Apostle. Mapped to himself so the
    // self-link exclusion suppresses them, exactly as bare "Saul" behaves on Paul's page.
    "philip-the-evangelist": "philip-the-evangelist", // 6
    "anna-the-prophetess": "philip-the-evangelist", // 1: "figures like Philip's daughters (Acts 21:9)"
    isaiah: "philip-the-evangelist", // 1: the eunuch reading Isaiah 53 "when Philip meets him"
    ethiopia: "philip-the-evangelist", // 1: "Where Philip evangelized and baptized the eunuch"
    ashdod: "philip-the-evangelist", // 1: "the deacon Philip appeared there" — the sentence says which man
    gaza: "philip-the-evangelist", // 1: "the setting for Philip's encounter with the Ethiopian eunuch"
    greeks: "philip-the-evangelist", // 1: "appointing seven men (including Stephen and Philip)" — Acts 6:1-6.
                                     // Checked because this topic is the one place the Apostle could
                                     // plausibly appear (John 12:20-22, the Greeks who ask for him):
                                     // the record holds exactly one "Philip" and it is the Seven.
    "bib-dkj-isaiah-suffering-servant": "philip-the-evangelist", // 1: "Philip uses it to explain the gospel to the Ethiopian eunuch"

    // ── The Tetrarch, 15 links.
    //
    // His own page takes ONE answer for eleven mentions, and it is worth spelling out why that is
    // exact rather than merely convenient. Six of the eleven are the Tetrarch himself. The other
    // five are a THIRD Philip — "sometimes called Herod Philip", Herodias's first husband, the man
    // Mark 6:17 and Matthew 14:3 call simply "Philip" — whom the article discusses at length
    // precisely in order to distinguish him from its own subject, and for whom the app has no
    // record. Both answers render as NO LINK: the first by the self-link exclusion, the second
    // because there is nobody to link to. So the record-wide answer serves all eleven and no pin
    // is needed. If the app ever gains a record for Herod Philip I, this entry becomes the wrong
    // lever for those five and they need phrase pins.
    "philip-the-tetrarch": "philip-the-tetrarch", // 11
    "herod-archelaus": "philip-the-tetrarch", // 1: "while Antipas and Philip received smaller tetrarchies"
    lysanias: "philip-the-tetrarch", // 1: Luke 3:1's list of rulers, which is the Tetrarch's own verse
    "bib-loc-john-baptist-ministry-begins": "philip-the-tetrarch", // 1: the same Luke 3:1 list
    "bib-loc-confession-caesarea-philippi": "philip-the-tetrarch", // 1: "built up by Herod's son Philip"

    // ── Philip II of Macedon, 4 links, and no record. NAME_CONTEXT_RULES already suppresses
    // "Philip II" by its numeral, which is why the two occurrences written that way are unlinked
    // and these four — the bare name, in the very next sentence — were not. Suppressed on the same
    // interim as the rule above it: a record for him would replace both.
    "wld-pg-philip-of-macedon": null, // 3: "Philip defeated the combined forces of Athens, Thebes"; "Philip began planning"; "Philip was assassinated in 336 BC"
    "wld-pg-alexander-becomes-king": null, // 1: "Alexander inherited his father Philip's throne"
  },

  // "Simon": the bare name belongs to Simon Peter. Both Hasmonean articles mean SIMON MACCABEUS,
  // last of Mattathias's five sons, high priest and ethnarch from 142 BC — a different man by two
  // centuries, and one the app has no record for. Five links, two of them summaries:
  //   bib-it-hasmonean-dynasty-begins  4  three article paragraphs, one datingNotes, + the summary
  //                                       "Simon Maccabeus, last surviving son of Mattathias".
  //   bib-it-john-hyrcanus-reign       2  "Simon's son John Hyrcanus" in the article + the summary.
  // Neither record names Simon Peter anywhere. Suppressed rather than written: whether Simon
  // Maccabeus earns a record is Robbie's, and it is on his list — this fixes the defect today and
  // a record later replaces these two lines.
  simon: {
    // ── Simon Maccabeus, 11 links across four Hasmonean articles ──────────────────────────────
    // Last of Mattathias's five sons, high priest and ethnarch from 142 BC; a different man from
    // Simon Peter by two centuries, and one the app has no record for. Suppressed, not written:
    // whether he earns a record is Robbie's and is on his list, and a record replaces these four
    // lines. None of the four records names Simon Peter at all.
    "bib-it-hasmonean-dynasty-begins": null, // 5: three article paragraphs, datingNotes, summary
    "bib-it-john-hyrcanus-reign": null, // 2: "Simon's son John Hyrcanus" + the summary
    "bib-it-maccabean-revolt-begins": null, // 1: "his five sons — Judas, Jonathan, Simon, John, and Eleazar"
    "bib-it-jonathan-maccabeus-high-priest": null, // 3: "his brother Simon", "the last surviving
                                                   // brother, Simon", and the Wicked Priest note

    // ── Three more men with no record ─────────────────────────────────────────────────────────
    // SIMON THE TANNER, whose house Peter lodged in at Joppa (Acts 9:43, 10:6). Scripture's own
    // Acts 10:32 already suppresses him; until now the location article contradicted the reader.
    joppa: null,
    // SIMON THE BROTHER OF JESUS — "Mark's Gospel names him first among four (James, Joses, Judas,
    // and Simon)". Matches Scripture, where Matthew 13:55 is already suppressed.
    "james-brother-of-jesus": null,

    // ── Two repoints, where the app has the right man and the sentence says which ──────────────
    cyrene: "simon-of-cyrene", // "Hometown of Simon, the man forced to carry Jesus's cross"
    "bib-ac-philip-ethiopian-eunuch": "simon-magus", // "even the sorcerer Simon believed and was baptized"

    // ── FIVE RECORDS THAT LINKED THEIR OWN SUBJECT'S NAME TO SIMON PETER ──────────────────────
    //
    // None of these was in the sweep that produced this batch; all five came out of
    // scripts/name-linker/self-name.mjs on the commit that added it. The sweep had checked these
    // records and reported, correctly, that they "resolve correctly wherever their longer wording
    // appears" — which was a different question from what the BARE name does on the page whose
    // subject it is. Fifteen links, every one of them the page's own subject.
    "simon-magus": "simon-magus", // 5
    "simon-of-cyrene": "simon-of-cyrene", // 4
    "simon-the-pharisee": "simon-the-pharisee", // 3
    "simon-the-zealot": "simon-the-zealot", // 2
    "simon-the-leper": "simon-the-leper", // 1
  },

  // "Titus": the bare name belongs to Paul's Gentile co-worker, and every one of his own mentions
  // — 2 Corinthians, Galatians, 2 Timothy 4:10, Titus 1:4, and the five in his book intro — is
  // correct and untouched. The fall-of-Jerusalem article means TITUS THE EMPEROR, Vespasian's son,
  // who took the city in AD 70 and burned the Temple. Six links on this record, all of them him:
  // five in the article (the siege, the fire "against Titus's own orders", his triumph, the Arch
  // of Titus) and the summary, "Roman forces under Titus breached Jerusalem's walls".
  //
  // Pointing the general who destroyed the Temple at Paul's travelling companion is the kind of
  // error that costs a reader's confidence in everything else on the page. No record exists for
  // the emperor; suppression is the interim and he is the largest single record-or-suppress
  // question the sweep raised, which is Robbie's to settle.
  titus: {
    "wld-rom-destruction-of-jerusalem": null, // 6: five article paragraphs + the summary
    // The other nine emperor links, 2026-09-10. Every one of them is Vespasian's son: the siege,
    // the Temple, the Arch, and Bernice, whose whole extra-biblical story is her affair with him.
    // The app has no record for the emperor and the four record-or-suppress candidates are
    // Robbie's; a record replaces all seven lines here.
    bernice: null, // 4: lifeStory, controversies, and both extraBib summary blocks
    jerusalem: null, // "The Temple was destroyed by Roman forces under Titus in AD 70"
    "the-temple": null, // "when Roman forces under Titus destroyed the Second Temple"
    "bib-loc-olivet-discourse": null, // "when Roman forces under Titus razed Jerusalem"
    "bib-ac-fall-of-jerusalem": null, // "the future Roman emperor Titus laid siege to Jerusalem"
    "wld-rom-jewish-revolt-begins": null, // "Vespasian, with his son Titus serving alongside him"
    // Paul's Titus is untouched everywhere else — crete (2), jewish-elders, and the five in his own
    // book introduction, which is why book-intro:Titus is NOT in this table: it holds five correct
    // mentions of the man and two of the BOOK, and the two are taken out by title rules instead.
  },

  // ── THE JAMES CLUSTER ────────────────────────────────────────────────────────────────────────
  //
  // 58 bare "James" links in our prose and on the public pages. 19 are James son of Zebedee and
  // are correct — the Gospel cast, Agrippa's execution of him, Salome as his mother, the Sea of
  // Galilee's fishing trade, Willibald's itinerary. 39 were not, and nearly all of them were the
  // Lord's brother, who has his own record: the bare key belongs to Zebedee's son, who was dead by
  // AD 44 (Acts 12:2) and is a candidate for none of it.
  //
  // The self-name shape again, and worse than Philip's: ALL FOURTEEN "James"es on
  // james-brother-of-jesus's own page pointed at Zebedee's son, including the sentence quoting
  // Galatians 1:19 — "meets specifically with 'James, the Lord's brother'" — which names the man
  // it was getting wrong. Three more on james-son-of-alphaeus's page did the same thing, and the
  // sweep that produced this batch did not have them; scripts/name-linker/self-name.mjs did.
  //
  // THREE RECORDS NAME BOTH MEN and are deliberately NOT in this table: simon-peter,
  // john-the-apostle and bib-ac-jerusalem-council. One answer per record cannot serve them, the
  // majority on each is Zebedee (who already owns the key by default), and the exceptions are
  // recovered by the two context patterns added to NAME_CONTEXT_RULES above. That direction is
  // chosen, not incidental: pinning the exceptions leaves a reworded sentence with a LOST correct
  // link, where pinning the majority would leave it asserting the wrong man on the two mentions
  // that were already right.
  //
  // Scripture is not touched by any of this, and is handled per-verse in VERSE_NAME_OVERRIDES:
  // Acts 12:2 and the four "Mary the mother of James" verses landed with the Scripture batch, and
  // James 1:1 and Jude 1:1 landed on 2026-09-10 with Robbie's authorship ruling — the reasoning is
  // written out beside them there.
  james: {
    // His own page, all fourteen, mapped to himself so the self-link exclusion suppresses them.
    "james-brother-of-jesus": "james-brother-of-jesus",
    // Alphaeus's son, three of his four. The fourth — "and from James, the Lord's brother" — is
    // genuinely the other man and is recovered by the context pattern above, which is checked
    // first. The record's "James, son of Zebedee" mentions already resolve by their own long key.
    "james-son-of-alphaeus": "james-son-of-alphaeus",
    // ── THE EPISTLE'S VOICE: JAMES THE BROTHER OF JESUS, RULED 2026-09-10 ─────────────────────
    //
    // Nine bare "James"es on the introduction to James and four more on records that quote the
    // letter by its author's name. All thirteen pointed at Zebedee's son, who was dead by AD 44
    // (Acts 12:2) and whom no tradition names. The second-bearer sweep repointed them to the
    // Lord's brother, hit the §7.1 flag, backed the change out, and escalated.
    //
    // ROBBIE RULED FOR THE TRADITIONAL ATTRIBUTION, 2026-09-10. The reasoning is written out in
    // full beside James 1:1 in VERSE_NAME_OVERRIDES above and is not repeated here; the short
    // version is that the pre-ruling state was false rather than neutral, that the standing
    // editorial position (CLAUDE.md, 2026-09-07) is to write from the Protestant evangelical
    // stance and name the dissent beside it, that bookIntros.ts's `author` field for James already
    // does exactly that in prose, and that the app already links "Paul" on book-intro:Romans and
    // "Peter" on book-intro:1 Peter in the same position.
    //
    // THE THREE TITLE RULES STAY. NAME_CONTEXT_RULES is checked BEFORE this table, so "the Epistle
    // of James", "the complete text of James", "portions of James", "James is one of the
    // 'General'…" and "James was among the books…" are still no link: a title names a book, not an
    // author, and that ruling is independent of this one. Five of the nine intro mentions are
    // suppressed that way; this entry answers the other four plus two in the summary.
    //
    // gentiles and bib-ac-paul-arrest-jerusalem were never part of this and always kept their
    // links: Acts 15 and Acts 21:18 are the man presiding in Jerusalem, not the letter speaking,
    // and the reader path already resolves both of those verses to him.
    "book-intro:James": "james-brother-of-jesus",
    // Josephus, Antiquities 20.9.1, quoted twice in Jesus's extra-biblical sources: "the brother
    // of Jesus, who was called Christ, whose name was James". The sentence says who he is.
    "jesus-of-nazareth": "james-brother-of-jesus",
    // Four records that quote the epistle by its author's name. Each holds exactly one bare
    // "James", and it is the same answer the app gives "Paul" and "Peter" in the same position.
    // Repointed under the 2026-09-10 ruling above, from null (the interim) and before that from
    // james-son-of-zebedee (the falsehood).
    rahab: "james-brother-of-jesus", // "James cites her works" — James 2:25
    satan: "james-brother-of-jesus", // "James instructs believers to 'resist the devil'" — James 4:7
    demons: "james-brother-of-jesus", // "James notes flatly that even 'the demons… believe'" — James 2:19
    "bib-dki-elijah-still-small-voice": "james-brother-of-jesus", // "as James later puts it, a man
                                       // with feelings like ours" — James 5:17. The record's other
                                       // "James" is "the King James Version", suppressed by the
                                       // King rule above, which is checked first — that precedence
                                       // is what makes this entry safe, and cases.mjs asserts it.
    // Acts 15 and Acts 21, the man presiding rather than the letter speaking.
    gentiles: "james-brother-of-jesus", // "James cites the prophets' own promise" — Acts 15:13-18
    "bib-ac-paul-arrest-jerusalem": "james-brother-of-jesus", // "At the urging of James and the Jerusalem elders" — Acts 21:18
    // ── The one suppression, and it is a refusal to take a side ───────────────────────────────
    // "Mary, mother of James the Less (also called James the Younger) and of Joses". That second
    // "James" is her son, and the natural repoint is james-son-of-alphaeus — the traditional
    // identification of James the Less with Alphaeus's son. It is ALSO genuinely disputed, and
    // this record's own page is where the app has so far declined to settle it. No link, which
    // asserts nothing; the same four verses in Scripture get the same answer, for the same reason.
    "mary-mother-of-james-the-less": null,
  },

  // "Joram": two kings of that name reigned at the same time, one in Israel and one in Judah, and
  // the app has a record for each. The bare key belongs to Judah's. Jehu kills ISRAEL's Joram —
  // the article says so in as many words, "kills King Joram of Israel with an arrow through the
  // heart" — and the summary says "Jehu kills King Joram, Judah's King Ahaziah, and Jezebel",
  // which names Judah's king separately in the same clause. Both links pointed at the wrong one of
  // the two. The record names no other Joram and no "Jehoram" at all.
  joram: {
    "bib-dki-jehu-purge": "joram-king-of-israel", // 2: the article and the summary
    // Two dating notes that name Israel's king and linked Judah's. The second was not in the sweep
    // — found while checking the first: "four kings — Joram, Jehu, Jehoahaz, and Jehoash" lists
    // Elisha's four, and Jehu, Jehoahaz and Jehoash are all kings of ISRAEL, so the Joram beside
    // them is too. Neither record names Judah's Joram at all.
    "bib-dki-elijah-ascension": "joram-king-of-israel", // "fought early in Joram of Israel's reign"
    "bib-dki-elisha-ministry-miracles": "joram-king-of-israel",
  },
  // "Jehoshaphat": Judah's king owns the key and is right in 17 of our 18 prose mentions. The
  // eighteenth is a DIFFERENT man in a patronymic — 2 Kings 9:2's "Jehu, son of Jehoshaphat, son of
  // Nimshi", Jehu's own father, who has no record and no other mention anywhere. Suppressed.
  jehoshaphat: {
    "bib-dki-jehu-anointed": null,
  },
  // "Azariah" is a registered alternate name of Uzziah, king of Judah, which is right for all eight
  // of Scripture's 2 Kings occurrences and for the article that says "Uzziah (also called
  // Azariah)". It is wrong for four other men in our prose, none of whom has a record:
  azariah: {
    daniel: null, // Hananiah, Mishael and AZARIAH — Abednego, one of Daniel's three companions
    "book-intro:Daniel": null, // "the Prayer of Azariah and Song of the Three" — a deuterocanonical
                               // addition, so a WORK as well as a different man
    "bib-dkj-asa-reforms": null, // "The prophet Azariah son of Oded met Asa afterward". NOT in the
                                 // sweep, which enumerated only 2 Chronicles' verses and the priest
                                 // below; found while reading this record's neighbours.
    // MIXED RECORD, and the entry is the safe half. bib-dkj-uzziah-reign holds two "Azariah"s: the
    // king himself — "Uzziah (also called Azariah) came to the throne as a teenager" — and the
    // PRIEST Azariah who confronts him for burning incense, in the same article, a different man.
    // The record-wide answer is no link, and the king's own mention is recovered by an exact phrase
    // pin in NAME_CONTEXT_RULES, which is checked first. That direction is the one this file uses
    // for every mixed record: if the pinned sentence is ever reworded the mention falls back to no
    // link, which is a lost correct link rather than a priest asserted to be a king.
    "bib-dkj-uzziah-reign": null,
  },
  // "Antipas": Herod Antipas owns the key and is right in eight of nine prose mentions. The ninth
  // is ANTIPAS OF PERGAMUM, the martyr of Revelation 2:13 — "a martyr named Antipas already killed
  // in Pergamum, 'where Satan's throne is'" — who is not a Herod and has no record.
  antipas: {
    "bib-ac-domitian-persecution": null,
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
 *   job                      0                  0                     5
 *   eve                      0                  0                     3
 *
 * "job" and "eve" cost NOTHING on either Scripture path — the WEB writes both only as names, 59
 * and 4 times, never as the common noun — and their whole yield is on the article surface, where
 * our own prose uses the ordinary words: "returned to finish the job", "the workmen's account of
 * their own job", "on the eve of his final battle", "right up to the eve of the conquest". Eight
 * links, all of them to the patriarch and the first woman, none of them meant. They are the first
 * entries here found by sweeping for a class rather than by someone noticing one; see
 * scripts/name-linker/modern-names.mjs.
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
const CAPITALISED_ONLY = new Set([
  "mark",
  "counselor",
  "the counselor",
  "the adversary",
  "ram",
  "job",
  "eve",
]);

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

/** ── BOOK TITLES: the shapes that name a WORK rather than a man ────────────────────────────────
 *
 * Ruled 2026-09-09 and applied here: **a book title links to no person, for every book** — not
 * only for John, which had been the sole key in this table since it was written. The escalation
 * that asked for the ruling is in automation/manager-inbox; the reasoning is one sentence long.
 *
 *   Not linking a book title to a person asserts NOTHING about who wrote it. Linking is what takes
 *   a position. "1-2 Peter" pointing at Simon Peter quietly asserts Petrine authorship of both
 *   letters — genuinely disputed — and asserts it where no reader can see the argument. Declining
 *   the link is the neutral move, not the opinionated one.
 *
 * What is suppressed is the TITLE, never the name. "Peter's vision that leads to Cornelius",
 * "Isaiah's prophecy of a suffering servant", "Daniel's visions", "Nehemiah's account", "the Law
 * of Moses" and "the song of Moses" all keep their links: the prose means the man. The rules are
 * therefore keyed per name and enumerated per shape rather than generalised — the same discipline
 * every other rule in this table is written with, and for the same reason.
 *
 * Two things this ruling deliberately does NOT do:
 *
 *  - **"the Law of Moses" keeps its link.** It names the lawgiver, not the author of five scrolls,
 *    and it is Scripture's own phrase — 20 verses in the WEB, from Joshua 8:31 to Hebrews 10:28.
 *    Only the PLURAL "the (five) books of Moses" is suppressed, and the plural is what makes that
 *    safe: the WEB's own five "the book of Moses" (2 Chronicles 25:4 and 35:12, Ezra 6:18,
 *    Nehemiah 13:1, Mark 12:26) are singular, so they keep their links and the Bible snapshot does
 *    not move by a single row. Every other shape below was checked the same way before it was
 *    written — "First Moses says" at Romans 10:19 is why the numeral rule is keyed per name and
 *    not given to Moses, and the lowercase "wisdom of Solomon" at 1 Kings 4:34, 1 Kings 10:4,
 *    2 Chronicles 9:3, Matthew 12:42 and Luke 11:31 is why that rule demands a capital W.
 *  - **It does not reach a book title sitting bare in a list.** "Genesis, Numbers, Deuteronomy,
 *    Isaiah, Jeremiah, Ezekiel, Daniel, and Esther" has no word around it that says "book", and a
 *    pattern that reached it would reach every "Peter, James, and John" in Scripture. Measured,
 *    with the shape stated: a sweep for a book-named surface carrying two other book names within
 *    55 characters flags 100 surviving links, of which about 46 read as genuine titles and the
 *    rest are "Peter, James, and John" in narrative. Treat 46 as a floor rather than a count —
 *    that heuristic cannot see a bare reference with no book name beside it, and "Codex
 *    Vaticanus, of roughly the same date, agrees on Mark" on the Sinaiticus article is exactly
 *    that. They need phrase pins one sentence at a time, which is a separate job; it is written
 *    up in automation/manager-inbox. The
 *    four sentences pinned below are only the ones where a rule here already removes a link from
 *    the SAME sentence — leaving "1 and 2 Timothy, Titus, and Philemon" with two of its three
 *    titles still linked would be a worse state than either answer.
 *
 * Every shape below is pinned by a prose case in scripts/name-linker/cases.mjs quoting the real
 * copy. That is not belt-and-braces: the previous batch of these was fixed by REWORDING the
 * offending sentences, and a later edit would have undone it silently. */
const BOOK_NUMERAL: NameContextRule = {
  // "1 Samuel", "2 Peter", "First Peter", "1-2 Peter", "1 and 2 Timothy", "Second Isaiah". A bare
  // "1 John 2:1" never reaches here — NAME_PATTERN matches a reference carrying a chapter whole,
  // as kind "verse" — so only a numbered title with no numbers after it gets this far. Given only
  // to names that actually take a numeral: Romans 10:19 reads "First Moses says".
  before: /(?:^|[^\p{L}])(?:[123]|First|Second|Third)\s+$/u,
  to: null,
};
/** "the book of Ruth", "the books of Samuel", "the book of Enoch". */
const BOOK_OF: NameContextRule = { before: /\b[Bb]ooks? of\s+$/, to: null };
/** Plural only — Moses alone, so Scripture's own singular "the book of Moses" is untouched. */
const BOOKS_OF_PLURAL: NameContextRule = { before: /\b[Bb]ooks of\s+$/, to: null };
/** "the text of Titus", "the Masoretic Hebrew text of Ezekiel". No WEB verse contains "text of". */
const TEXT_OF: NameContextRule = { before: /\b[Tt]exts? of\s+$/, to: null };
/** "the scroll of Isaiah" — Acts 8 and Luke 4 as our articles retell them. */
const SCROLL_OF: NameContextRule = { before: /\b[Ss]crolls? of\s+$/, to: null };
/** "the Gospel of Luke", "the Gospel of Mark". No WEB verse contains "gospel of" + a name. */
const GOSPEL_OF: NameContextRule = { before: /\b[Gg]ospels? of\s+$/, to: null };
/** "the Epistle of James", "the Epistle of Barnabas". */
const EPISTLE_OF: NameContextRule = { before: /\b[Ee]pistles? of\s+$/, to: null };
/** "the Acts of Paul", "the Acts of Peter" — the apocryphal Acts. Capital A: the WEB writes
 *  "the acts of Solomon" and "the acts of David" in lower case, and those are deeds, not books. */
const ACTS_OF: NameContextRule = { before: /\bActs of\s+$/, to: null };
/** "the Apocalypse of Peter". */
const APOCALYPSE_OF: NameContextRule = { before: /\b[Aa]pocalypse of\s+$/, to: null };
/** "Luke's Gospel", "Mark's Gospel", "Isaiah's book", "James's letter", "Isaiah's text". As narrow
 *  as the hand-written John rule it generalises, and for the same reason: "John's baptism" and
 *  "Daniel's visions" are the man, so only a following word that NAMES THE WORK counts. */
const POSSESSIVE_WORK: NameContextRule = {
  after: /^['’]s\s+(?:[Gg]ospel|[Bb]ook|[Ll]etter|[Ee]pistle|[Tt]ext|[Ss]croll)\b/,
  to: null,
};
/** "Isaiah manuscripts", "a second Philemon papyrus". Manuscript notes name the book, never a man. */
const MANUSCRIPT_AFTER: NameContextRule = {
  after: /^\s+(?:manuscripts?|fragments?|papyri|papyrus|codex|scrolls?|copies)\b/,
  to: null,
};
/** "The Qumran Daniel manuscripts", "some Qumran Jeremiah fragments". */
const QUMRAN_BEFORE: NameContextRule = { before: /\bQumran\s+$/, to: null };
/** "The Septuagint's Jeremiah" — a version naming the book it contains. */
const VERSION_BEFORE: NameContextRule = { before: /\b(?:Septuagint|LXX)['’]?s?\s+$/, to: null };
/** "the longer ending of Mark" — a textual unit inside a book, so the book is what is named. */
const ENDING_OF: NameContextRule = { before: /\b[Ee]nding of\s+$/, to: null };
/** "the Wisdom of Solomon", "the Psalms of Solomon" — two works named for a man nobody claims
 *  wrote them. Capital-initial on purpose; see the 1 Kings 4:34 note above. */
const WISDOM_OR_PSALMS_OF: NameContextRule = { before: /\b(?:Wisdom|Psalms) of\s+$/, to: null };
/** "Aaron ben Asher", "Samuel ben Jacob", "Moses ben Asher", "Yeshua ben Galgula" — a Hebrew
 *  patronymic naming a medieval or Second Temple man who is NOT the biblical bearer of the first
 *  name. Added with the Masoretic manuscript batch, where four separate articles needed it and
 *  every one of the four links was wrong: the scribe of the Leningrad Codex was resolving to the
 *  prophet Samuel, the Masorete of the Aleppo Codex to Aaron the brother of Moses, and one of Bar
 *  Kokhba's officers to Jesus.
 *
 *  Safe as a pattern rather than a pin: Scripture never writes " ben " as a free-standing word.
 *  Checked against all 31,098 WEB verses — 0 hits for " ben ", and 0 for "Aaron ben", "Samuel ben",
 *  "Moses ben", "Jacob ben", "Solomon ben" and "Joseph ben" individually. It therefore reaches only
 *  our own prose, which is exactly where these names occur. Note it is NOT given to `simon`:
 *  Matthew 16:17 has "Simon Bar Jonah", and a "bar" rule would take it. */
const BEN_PATRONYMIC_AFTER: NameContextRule = { after: /^\s+(?:ben|b\.)\s+\p{Lu}/u, to: null };
/** The other half of the same shape — the FATHER in the chain, equally not the biblical man:
 *  "Aaron ben Moses ben Asher", "Samuel ben Jacob". */
const BEN_PATRONYMIC_BEFORE: NameContextRule = { before: /(?:\bben|\sb\.)\s+$/, to: null };

const NAME_CONTEXT_RULES: Record<string, NameContextRule[]> = {
  john: [
    // ── A phrase pin, and it must stay ahead of the pattern rules below, which is why it is here
    // rather than appended. Willibald's eighth-century itinerary, quoted verbatim in
    // bethsaida-candidate-sites, names "Zebedee, with his sons John and James". That John is the
    // Apostle; the default bearer of a bare "John" in prose is the Baptist, so the quotation was
    // sending readers to the wrong man. The text is a translation of a primary source and may not
    // be reworded to dodge the collision. James in the same clause already resolves correctly to
    // the son of Zebedee and is left alone.
    { phrase: "Zebedee, with his sons John and James", to: "john-the-apostle" },

    // A second phrase pin, same reasoning and the same constraint: a quotation of a primary source
    // that may not be reworded to dodge a collision. A. S. Lewis's 1894 introduction names the
    // eighth-century monk who scraped the Old Syriac gospels off their parchment — "John the
    // Recluse, of Beth-Mari, Kaddish" — and a bare "John" in prose defaults to the Baptist, so the
    // sentence was sending readers to the wrong man by seven centuries. No WEB verse contains the
    // phrase, so the pin can never reach Scripture.
    { phrase: "John the Recluse", to: null },

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
    // "the Apocalypse of John", in the Claromontanus canon list. The same ruling as the three lines
    // above, on the one Johannine title they did not cover; `peter` has carried APOCALYPSE_OF since
    // the Muratorian article. Safe to add as a pattern rather than a pin: no WEB verse contains
    // "Apocalypse of", because Scripture never names its own books.
    APOCALYPSE_OF,
    // Note how narrow the possessive is: "John's Gospel" is the book, but "John's baptism"
    // (Acts 19:3) and "John's disciples" (Matthew 9:14) are the Baptist himself and must keep
    // their links, so only a following "Gospel" counts.
    { after: /^['’]s\s+[Gg]ospel/, to: null }, // "John's Gospel"
    { after: /^['’]s College\b/, to: null }, // "St John's College", Cambridge — a building, not a man
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
    // The four Gospels listed in an order — "Matthew, John, Luke, Mark" is the Western order that
    // Codex Bezae and Codex Washingtonianus use, "Matthew, John, Mark, Luke" the one the
    // Claromontanus canon list gives. Every name in such a list is a BOOK TITLE, and bare "John"
    // was resolving to the Baptist on three manuscript articles until the papyri-and-uncials batch
    // read its own rendered pages. Pinned by phrase, not by pattern, for the reason given in the
    // block below: nothing in the neighbouring words says "this is a list of books" — the
    // neighbours are other names — and a rule keyed on an adjacent Gospel name would reach into
    // Scripture's own lists of the men.
    { phrase: "Matthew, John, Luke, Mark", to: null },
    { phrase: "Matthew, John, Mark, Luke", to: null },
    // Inside a quotation this app does not own: H. A. Sanders's 1912 analysis of Codex
    // Washingtonianus, which lists the codex's six textual blocks by book and chapter.
    { phrase: "Matthew; John from 5:12 on", to: null },
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
    ACTS_OF, // "the Acts of Paul", twice on grotto-of-st-paul-ephesus — a 2nd-century romance
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
    // The book. All three of these were pointing at James SON OF ZEBEDEE, who is not a candidate
    // for the letter on anybody's account — he was executed by Herod Agrippa in AD 44 (Acts 12:2).
    // The traditional attribution is to James the brother of Jesus and the app carries a record
    // for him, so this could have been a repoint; it is a suppression instead, because the whole
    // point of the ruling is that a title does not name an author.
    EPISTLE_OF, // "the Epistle of James"
    { before: /\b[Ll]etters? of\s+$/, to: null }, // "the letter of James" — same ruling, other word
    TEXT_OF, // "both contain the complete text of James"
    POSSESSIVE_WORK, // "James's letter, written to Jewish Christians"
    // A canon list where the neighbouring "1-2 Peter" is suppressed by BOOK_NUMERAL and this one
    // has no word of its own to catch. See the note on bare-in-a-list titles above.
    { phrase: "Hebrews, James, and 1-2 Peter are not in the surviving text", to: null },

    // ── Three more titles, added with the second-bearer batch, 2026-09-10 ─────────────────────
    // All three are in book-intro:James's manuscript notes, where OWNER_NAME_OVERRIDES below now
    // answers a bare "James" with the letter's traditional author — right for the six mentions of
    // the man, wrong for these three, which name the BOOK. These rules are checked first and take
    // them back out. A fourth in the same field, "the complete text of James", is already handled
    // by TEXT_OF above.
    //
    // Patterns rather than exact phrases, which is the narrower choice here rather than the wider
    // one: the neighbouring words ARE the discriminator in all three — "portions of", "among the
    // books", "one of the 'General'/'Catholic' epistles" each say that a work is being named, the
    // way "the patriarch Jacob" says which Jacob. Checked against all 31,098 WEB verses before
    // being written: "portions of <Capital>" and "was among the books" occur in NO verse, and the
    // third is anchored on the two words that follow it. A phrase pin would have been more
    // fragile, not less — it breaks when the sentence around it is reworded, and these sentences
    // are exactly the kind that get reworded when a manuscript is re-dated.
    { before: /\b[Pp]ortions of\s+$/, to: null }, // "papyrus witnesses that preserve portions of James"
    { after: /^\s+was among the books\b/, to: null }, // "James was among the books whose canonical status was discussed"
    { after: /^\s+is one of the ['‘]?(?:General|Catholic)\b/, to: null }, // "James is one of the 'General' or 'Catholic' epistles"

    // ── And two that RECOVER a link rather than removing one ──────────────────────────────────
    //
    // Three records name BOTH Jameses — Zebedee's son and the Lord's brother — so one answer per
    // record cannot serve any of them, and on each the MAJORITY is Zebedee, who already owns the
    // bare key. So the record-wide default is left alone and the exception is recovered here,
    // which is also the only arrangement on which a reworded sentence costs a correct link rather
    // than asserting a wrong one on the two that are right.
    //
    // Both are patterns for the same reason as the three above: the words are the discriminator.
    // "the Lord's brother" and "(the brother of Jesus)" name which James in as many words, and
    // there is no reading of either on which the man is Zebedee's son. Measured first: "James,
    // the Lord's brother" occurs in ONE WEB verse, Galatians 1:19, where the reader path already
    // gives the brother by book override — so this rule moves no Bible row and merely makes the
    // panel path agree with it. "(the brother of Jesus)" occurs in no verse at all.
    { after: /^,?\s*the Lord['’]s brother\b/, to: "james-brother-of-jesus" },
    { after: /^\s*\(the brother of Jesus\)/, to: "james-brother-of-jesus" },
    // Galatians 2:12, on Simon Peter's page: "he drew back from eating with Gentile Christians
    // once certain men from James arrived". The one James on that record who is not Zebedee's son;
    // the other two are "James and John" and are correct. No WEB verse reads "men from" followed
    // by a name at all — Galatians 2:12 itself reads "came from James" — so this reaches only our
    // own prose, which is where the fault is.
    { before: /\bmen from\s+$/, to: "james-brother-of-jesus" },
    // The apocryphal infancy gospel, quoted by name on marys-well-nazareth: "an episode from the
    // apocryphal 2nd-century Protoevangelium of James". A work, not a man — the same ruling the
    // modern-title pins carry, applied to an ancient one. One pin per title, as that ruling says.
    { phrase: "Protoevangelium of James", to: null },
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
    // and St Thomas Bay, which is a place in Malta rather than a man at all. Roe is Sir Thomas Roe,
    // James I's ambassador to the Porte, who carried Codex Alexandrinus to England — added with the
    // papyri-and-uncials batch, 2026-09-10, and found by modern-names.mjs on that commit.
    { after: /^\s+(?:More|Cromwell|Clarkson|Thompson|Bay|Roe)\b/, to: null },
  ],
  peter: [
    // Abelard, Faber (a founding Jesuit), Flint (a Dead Sea Scrolls scholar).
    { after: /^\s+(?:Abelard|Faber|Flint)\b/, to: null },
    // A phrase pin rather than a fourth name in the list above, because this one is a comma away:
    // the dedication page of Codex Amiatinus was altered after Ceolfrith's death, and H. A. G.
    // Houghton's description of the alteration — quoted verbatim in codex-amiatinus, and not
    // rewordable — ends "to Peter, abbot of the Lombards". That is an eighth-century Italian abbot,
    // not the apostle. No WEB verse contains the phrase.
    { phrase: "Peter, abbot of the Lombards", to: null },
    // The books. The largest single group in this ruling: 16 of the 17 are "1 Peter", "2 Peter",
    // "First Peter" or "1-2 Peter" in the two book intros and the manuscript articles, and this is
    // the shape the ruling exists for — 2 Peter's authorship is the most disputed in the New
    // Testament, and the app's own book intro says so in the sentence beside the link.
    BOOK_NUMERAL, // "1 Peter", "2 Peter", "First Peter", "1-2 Peter", "2 Peter chapter 2"
    APOCALYPSE_OF, // "the Apocalypse of Peter is listed as accepted by some"
    ACTS_OF, // "the Acts of Peter", twice on appian-way-quo-vadis-rome
    // The same three shapes `james` already carries, added with the papyri-and-uncials batch for
    // the same reason: a title does not name an author, and these are titles. All four occurrences
    // are inside quotations the app cannot reword — the Fondation Bodmer's dedication "That the
    // letters of Peter may return to Peter's house" (where the SECOND "Peter" is the man, and
    // rightly keeps its link) and Rodenbiker's list of the Claromontanus stichometry's contents.
    // Safe as patterns: Scripture never names its own books, so no WEB verse contains any of them.
    EPISTLE_OF, // "a codex bearing the two Epistles of Peter"
    { before: /\b[Ll]etters? of\s+$/, to: null }, // "the letters of Peter"
    { before: /\b[Rr]evelation of\s+$/, to: null }, // "the Revelation of Peter", the apocryphal book
    // NOT suppressed, and worth saying out loud: "Peter's vision that leads to the Gentile
    // Cornelius" and "Peter's vision and subsequent visit to Cornelius" are the man seeing a
    // sheet let down from heaven in Acts 10. POSSESSIVE_WORK is deliberately not given to Peter.
  ],
  azariah: [
    // The one sentence the record-wide `null` on bib-dkj-uzziah-reign must not take. That article
    // names both the KING — "Uzziah (also called Azariah) came to the throne as a teenager" — and
    // the PRIEST who confronts him over the incense, a different man with no record, a few
    // sentences later. Pinned rather than answered per record, and pinned on the correct half so
    // that a rewrite costs this link rather than promoting the priest.
    { phrase: "Uzziah (also called Azariah)", to: "uzziah" },
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
  jacob: [
    { after: /^\s+Eliyahu\b/, to: null },            // the boy who found the Siloam inscription
    BEN_PATRONYMIC_BEFORE,                           // "Samuel ben Jacob", the Leningrad scribe's father

    // ── "the patriarch Jacob" — the one sentence that must survive the owner entry ────────────
    //
    // OWNER_NAME_OVERRIDES now answers a bare "Jacob" on jacob-father-of-joseph's page with the
    // page's own subject, so the self-link exclusion suppresses it. That is right for two of the
    // three occurrences on that record and wrong for the third, which says in as many words that
    // he is "entirely distinct from the patriarch Jacob (also called Israel), son of Isaac" — and
    // wrong for the fourth, the same clause in the summary that render.mjs linkifies onto the
    // public page. This rule is what recovers those two, and it is checked before that table.
    //
    // A pattern rather than two exact pins, and the reason is the same one that lets
    // BEN_PATRONYMIC_* be patterns while a book title may not be: the neighbouring word IS the
    // discriminator. Nothing around a title says "title", but "the patriarch" says exactly which
    // Jacob is meant, and there is no reading on which it means the other one.
    //
    // Measured before it was written, across all 31,098 WEB verses, all 5,632 prose blocks and the
    // 985 public-page-only blocks: "the patriarch Jacob" occurs 3 times and in NO verse. Two are
    // the sentences above; the third is the Bethel POI's "where the patriarch Jacob dreamed of a
    // ladder", where the patriarch is already the answer and this rule is a no-op. Its whole reach
    // is therefore the one record it was written for, and it moves no row anywhere else. Guarded
    // by prose cases on both records in scripts/name-linker/cases.mjs, Bethel included.
    { before: /\bthe patriarch\s+$/, to: "jacob" },

    // ── ONE RECORD, ONE NAME: old-syriac-gospels ────────────────────────────────────────────
    //
    // The other half of the same fault; read the note under `joseph` below. Four bare "Jacob"s on
    // that article, all of them Jacob son of Matthan of Matthew 1:15-16 and none of them the
    // patriarch, three of the four inside quoted translations. jacob-father-of-joseph is a record
    // of its own and says in its first line that it is not the patriarch, so these resolve rather
    // than suppress. Phrases quoted verbatim, each unique to that one prose block and absent from
    // every WEB verse; each pinned by a prose case in scripts/name-linker/cases.mjs.
    { phrase: "Jacob was the father of Joseph, the husband of Mary", to: "jacob-father-of-joseph" },
    {
      phrase: "Matthan begat Jacob; Jacob begat Joseph; Joseph, to whom was betrothed Mary the Virgin",
      to: "jacob-father-of-joseph",
    },
    {
      phrase: "Jacob begat Joseph, him to whom was betrothed Mary the Virgin",
      to: "jacob-father-of-joseph",
    },

    // ── SCRIPTURE'S OWN MATTHEW 1:15-16, ON THE PANEL PATH ──────────────────────────────────
    //
    // The same two men as the block above, one surface further out: the WEB text of the two verses
    // the article was quoting. The reader path is fixed by VERSE_NAME_OVERRIDES above, which is
    // translation-blind and so covers KJV and ASV as well; that table needs a book, and the panel
    // path passes none, so these pins are what reach it. Both phrases were measured before they
    // were written: each occurs in exactly ONE of the 31,098 WEB verses and in NO prose block, so
    // their whole reach is those two verses.
    //
    // The narrow wording is the point. "became the father of Jacob" alone would take Matthew 1:2
    // and Acts 7:8, where the man IS the patriarch; naming Matthan keeps it to the one rung of the
    // genealogy that means his son. Guarded by verse cases in scripts/name-linker/cases.mjs.
    { phrase: "Matthan became the father of Jacob", to: "jacob-father-of-joseph" },
    {
      phrase: "Jacob became the father of Joseph, the husband of Mary",
      to: "jacob-father-of-joseph",
    },
  ],
  // "Nathan Melech the officer" (2 Kings 23:11) and "Nathan-Melech, servant of the king" — one of
  // Josiah's officials, a different man from the court prophet and with no Person record of his
  // own. The hyphenated form is registered as a matchName on `nathan-melech-bulla`, so it resolves
  // whole; the SPACED form is how the WEB renders the verse, and bare "Nathan" was matching inside
  // it and sending the reader to the prophet. That was live on the panel path — the verse list on
  // the Nathan-Melech Bulla article's own page linked its own man to somebody else.
  //
  // Suppression rather than resolution, deliberately. The app's position (with Rollston) is that
  // the bulla's owner is very probably the official of 2 Kings 23:11 — probably, not certainly, and
  // the article says so at length. Pointing the verse at the bulla article would quietly upgrade
  // "very probably" to a fact the reader is shown rather than told. No link asserts nothing, which
  // is the same answer this file gives the contested Nathan at 1 Kings 4:5.
  //
  // The hyphen alternative is a belt-and-braces fallback: it can only fire where bare "Nathan"
  // matched, which the matchName normally prevents.
  nathan: [{ after: /^[\s-]Melech\b/, to: null }],
  solomon: [
    // "Solomon Schechter", who brought the Cairo Genizah to Cambridge. Cambridge University
    // Library's own sentences name him in full and this app quotes them verbatim — a quotation may
    // not be reworded to suit the linker, and an earlier batch had to put his forename back inside
    // one of them after it was trimmed. So the surname is what the rule is keyed on. The app's own
    // prose writes "S. Schechter", per the house rule that modern scholars get initials.
    { after: /^\s+Schechter\b/, to: null },
    { after: /^\s+Stoddard\b/, to: null }, // Jonathan Edwards's grandfather
    // "Jabez b. Solomon the Babylonian", the eleventh-century Karaite who commissioned the Cairo
    // Codex of the Prophets, and "Yaʿbeẓ b. Solomon" inside J. L. Teicher's quoted sentence.
    BEN_PATRONYMIC_BEFORE,
    // "the Wisdom of Solomon" (the Muratorian fragment's canon list) and "the Psalms of Solomon"
    // (the messianic-expectation article) — two works named for a man nobody, in any tradition,
    // claims wrote them. The clearest case in the whole batch that a title is not an attribution.
    WISDOM_OR_PSALMS_OF,
  ],
  david: [
    { after: /^\s+George\b/, to: null },              // David George Hogarth, who dug at Ephesus
    // "Nahal David" is the wadi at Ein Gedi — a modern Hebrew place name honouring the king, in a
    // sentence about a Chalcolithic temple three thousand years older than him. Rewording was not
    // an option: it is the name of the place. Found the day the location `notableFacts` surface
    // entered the harness, having linked to the king on a live page until then. "Nahal Mishmar" in
    // the same sentence needs no rule, because Mishmar is not a registered name.
    { before: /\bNahal\s+$/, to: null },
    // MODERN WORK TITLES (see the block below): the title of Finkelstein, Singer-Avitz, Herzog and
    // Ussishkin's article in Tel Aviv 34 (2007), quoted in the large-stone-structure article. The
    // words name a journal article, not the king, so they link to nobody. Pinned by the title
    // string for the reason given there — nothing in the neighbouring words says "title".
    { phrase: "Has King David's Palace in Jerusalem been Found?", to: null },
  ],
  salome: [{ after: /^\s+Alexandra\b/, to: null }],   // the Hasmonean queen, not Jesus's follower

  // ── A MANUSCRIPT SIGLUM INSIDE ITS OWN EXPANDED NAME LINKS ONCE, NOT TWICE ──────────────────
  //
  // The 66 book introductions write these papyri as "Papyrus 46 (P46)" — eighteen times across
  // the manuscripts field. Both halves are registered names of the same record, and the matcher
  // is non-overlapping and left-to-right, so without these rules the reader gets two adjacent
  // links to the same article: "Papyrus 46 (P46)". Suppressing the parenthesised siglum keeps the
  // longer, more readable form as the link and loses nothing — the record is still reachable from
  // that sentence, and every BARE "P46" in the same paragraphs still links.
  //
  // Pinned one name at a time, keyed on the exact expanded form, for the same reason the modern
  // work titles below are: nothing in the surrounding words says "this is a siglum in brackets",
  // and a rule general enough to spot that would reach far past these six.
  p45: [{ before: /\bPapyrus 45 \($/, to: null }],
  p46: [{ before: /\bPapyrus 46 \($/, to: null }],
  p47: [{ before: /\bPapyrus 47 \($/, to: null }],
  p66: [{ before: /\bPapyrus 66 \($/, to: null }],
  p72: [{ before: /\bPapyrus 72 \($/, to: null }],
  p75: [{ before: /\bPapyrus 75 \($/, to: null }],

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

  // ── Two records name both the prophet Zechariah and the book named after him, and
  // OWNER_NAME_OVERRIDES gives one answer per record. Its answer for both is the book's — no link
  // — because that is what most of their mentions are; these two pins recover the single mention
  // on each that is the man. Same mechanism, and the same reason, as the "Peter and John" rule at
  // the top of this table.
  //
  // Pinned this way round on purpose. A phrase pin cannot reach a sentence that has been
  // rewritten, so if either paragraph is edited the pin stops matching and the mention falls back
  // to the record-level answer: a correct link lost, not a wrong one asserted on a book title. The
  // reverse arrangement — pinning the book mentions and letting the record default to the man —
  // fails the other way, and a person link on a manuscript note is the worse failure. Both are
  // covered by prose cases in scripts/name-linker/cases.mjs: if one starts failing, the copy
  // moved. Re-read the sentence and re-pin it; do not delete the case.
  zechariah: [
    // A list of BOOK titles: the six of the Twelve that the Greek Minor Prophets Scroll preserves.
    // Bare "Zechariah" in it was resolving to the father of John the Baptist. Same shape, and the
    // same remedy, as the "Matthew, John, Luke, Mark" pins in the `john` block above: pinned by
    // exact phrase because nothing in the neighbouring words says "this is a list of books" — the
    // neighbours are other book names — and a rule keyed on an adjacent one would reach into
    // Scripture's own lists of men. Held by a prose case in cases.mjs.
    { phrase: "Jonah, Micah, Nahum, Habakkuk, Zephaniah and Zechariah", to: null },
    // person.lifeStory on the `satan` record. Its `controversies` field names the BOOK in the same
    // breath as Job and 1 Chronicles, which is why the record-level answer is null.
    { phrase: "prosecutorial role in Zechariah's vision", to: "zechariah-the-prophet" },
    // bookIntro.whyWritten on the book of Zechariah. Its four manuscript notes name the book,
    // which is why the record-level answer there is null too.
    { phrase: "Like Haggai, Zechariah encourages the returned exiles", to: "zechariah-the-prophet" },
    // No book rule for Zechariah, and that is a finding rather than an omission: all three of his
    // flagged mentions — "Mary's Magnificat and Zechariah's prophecy", "Zechariah's vision"
    // twice — are a man prophesying or seeing, and two of them are the pins directly above.
  ],

  // ── The rest of the book-title ruling, one key per book named after a person. Every rule is one
  // of the shared shapes defined above the table; the comment on each line quotes the copy it was
  // written for, so a reader can check the claim without leaving the file. Read one at a time from
  // a sweep of the whole prose corpus, not pattern-matched: 106 of the 126 flagged mentions are
  // suppressed here and 20 are deliberately left alone, each named in cases.mjs.
  barnabas: [
    EPISTLE_OF, // "the Epistle of Barnabas and part of the Shepherd of Hermas" — Codex Sinaiticus
    // A bare title inside a list, in a sentence quoted verbatim from K. G. Rodenbiker's 2021 study
    // on `codex-claromontanus`. The app's own prose around it writes "the Epistle of Barnabas",
    // which EPISTLE_OF already covers; a quotation cannot be reworded to suit the linker, so this
    // one is pinned on the phrase.
    { phrase: "as well as Barnabas, the Shepherd, the Acts of Paul and the Revelation of Peter", to: null },
  ],
  daniel: [
    BOOK_OF, // "The book of Daniel is set almost entirely within Nebuchadnezzar's Babylon"
    QUMRAN_BEFORE, // "The Qumran Daniel manuscripts preserve the book's distinctive Hebrew–Aramaic"
    // "Daniel's visions", "Daniel's account" keep their links — the man seeing and the man telling.
    // A living New Testament scholar, inside a sentence the app quotes verbatim from the Egypt
    // Exploration Society's statement of 4 June 2018 in `papyrus-137-first-century-mark`. The
    // article's own prose writes him "D. B. Wallace", per the house rule that scholars get
    // initials, and that fixed every other occurrence — but a quotation may not be reworded to
    // suit the linker, so this one is pinned on the phrase. Same mechanism, and same reason, as
    // the quoted ossuary readings in `talpiot-tomb`: the words are someone else's.
    { phrase: "Professor Daniel Wallace", to: null },
  ],
  enoch: [
    BOOK_NUMERAL, // "1 Enoch, a Jewish apocalyptic writing outside the biblical canon"
    BOOK_OF, // "the apocryphal book of Enoch", "the Book of Enoch as Scripture"
    // "the Enoch model" is the Groningen team's 2025 handwriting-dating software, named after the
    // patriarch and not about him. The MODERN WORK TITLES ruling below, one shelf further forward
    // again: a product, not a book, but the same reasoning — linking makes a claim. Pinned by the
    // exact phrase the two articles that mention it both use.
    { phrase: "the Enoch model", to: null },
  ],
  esther: [
    BOOK_OF, // "The book of Esther opens in the Persian capital of Susa"
  ],
  ezekiel: [
    { phrase: "Joshua, Judges, Samuel and Kings, then Isaiah, Jeremiah, Ezekiel and the Twelve", to: null }, // a list of BOOK titles
    TEXT_OF, // "The Masoretic Hebrew text of Ezekiel contains a notable number of difficult passages"
    // "in the book of Ezekiel and in the Twelve Prophets" — the 2026-09-09 book-title ruling
    // applied to a name that simply had not needed it yet. Safe as a pattern rather than a pin:
    // no WEB verse contains "book of Ezekiel", because Scripture never names its own books.
    BOOK_OF,
  ],
  ezra: [
    TEXT_OF, // "The Hebrew and Aramaic text of Ezra is well preserved and stable"
    // The Ben Ezra synagogue in Old Cairo, whose genizah produced the Damascus Document. Named for
    // a medieval figure, not the scribe of the return. No WEB verse contains "Ben Ezra".
    { before: /\bBen\s+$/, to: null },
  ],
  isaiah: [
    { phrase: "Joshua, Judges, Samuel and Kings, then Isaiah, Jeremiah, Ezekiel and the Twelve", to: null }, // a list of BOOK titles
    BOOK_NUMERAL, // "against critical theories of a separate 'Second Isaiah'" — a hypothesis, not a man
    TEXT_OF, // "all sheets with the text of Isaiah are still present" — the book, in a quotation
    // The same quotation, eleven words earlier: "some sheets of Deuteronomy and Isaiah". A book
    // again, and TEXT_OF cannot reach it because the phrase is "sheets of", not "text of", with
    // another book name in between. Pinned rather than patterned: a rule for "<unit> of <Book> and
    // <Book>" would have to guess where the list ends, and Scripture's own "the book of Isaiah"
    // sits one word away from the same shape.
    { phrase: "some sheets of Deuteronomy and Isaiah", to: null },
    SCROLL_OF, // "reading aloud from the scroll of Isaiah", "Jesus read from the scroll of Isaiah"
    POSSESSIVE_WORK, // "the second half of Isaiah's book", "independent witnesses to Isaiah's text"
    MANUSCRIPT_AFTER, // "Multiple additional Isaiah manuscripts were found at Qumran"
    // "the fulfillment of Isaiah's prophecy" keeps its link: the man prophesied.
  ],
  jeremiah: [
    { phrase: "Joshua, Judges, Samuel and Kings, then Isaiah, Jeremiah, Ezekiel and the Twelve", to: null }, // a list of BOOK titles
    // "The Jeremiah copies from Cave 4", on `dead-sea-scrolls` — a live fault, and the reason
    // `copies` joined MANUSCRIPT_AFTER's word list with the Masoretic manuscripts batch. It is the
    // book that exists in two lengths at Qumran, not the man. Checked: one WEB verse contains
    // "copies" (Hebrews 9:23) and it does not follow a name.
    MANUSCRIPT_AFTER,
    BOOK_OF, // "the book of Jeremiah, which the caves preserve in two editions". Checked: no WEB
    // verse contains "book of Jeremiah" or "books of Jeremiah", so this reaches only our own prose.
    QUMRAN_BEFORE, // "some Qumran Jeremiah fragments reflect a shorter Hebrew text-form"
    VERSION_BEFORE, // "The Septuagint's Jeremiah is roughly one-eighth shorter"
    // Both "Jeremiah's prophecy of Rachel weeping" mentions keep their links.
  ],
  job: [
    TEXT_OF, // "Fragments of the Hebrew text of Job were found among the Dead Sea Scrolls"
  ],
  jonah: [
    // The other half of the same list. See the note on `zechariah` below.
    { phrase: "Jonah, Micah, Nahum, Habakkuk, Zephaniah and Zechariah", to: null },
    BOOK_OF, // "The book of Jonah centers entirely on Assyria's capital, Nineveh"
    TEXT_OF, // "a well-preserved continuous Hebrew text of Jonah"
  ],
  joshua: [
    { phrase: "Joshua, Judges, Samuel and Kings, then Isaiah, Jeremiah, Ezekiel and the Twelve", to: null }, // a list of BOOK titles
    BOOK_OF, // "the books of Joshua and Judges describe", "opens directly onto the book of Joshua"
    TEXT_OF, // "as the text of Joshua puts it (Joshua 6:22-25)"
  ],
  luke: [
    GOSPEL_OF, // "both contain the complete Gospel of Luke"
    POSSESSIVE_WORK, // "Luke's Gospel", nine times across the person and topic articles
    // "in Luke's account", "matching Luke's account of Philippi as 'a Roman colony'" keep their
    // links. POSSESSIVE_WORK does not list "account" for exactly this reason: an account is
    // something a man gives, and Luke as a careful historian is what those two sentences are about.
  ],
  mark: [
    GOSPEL_OF, // "the Gospel of Mark" — self-excluded today on john-mark's own page; the rule belongs
    POSSESSIVE_WORK, // "Mark's Gospel names him first among four"
    TEXT_OF, // "stand in the undisputed text of Mark"
    ENDING_OF, // "the longer ending of Mark (Mark 16:9-20)" — see the ruling note below
  ],
  moses: [
    // "Moses ben Asher", whose colophon the Cairo Codex of the Prophets carries, and "Aaron ben
    // Moses ben Asher", the Masorete of the Aleppo Codex. Ninth- and tenth-century Tiberians.
    BEN_PATRONYMIC_BEFORE,
    BEN_PATRONYMIC_AFTER,
    // "the five books of Moses", "the books of Moses". PLURAL ONLY — this is the whole safety of
    // the rule, and the reason is three lines up in the header comment: Scripture's own singular
    // "the book of Moses" appears five times and keeps its link every time.
    //
    // Why the corpus name is suppressed at all: "the five books of Moses" is the traditional name
    // for the Pentateuch and it names the corpus the way "the Gospel of John" names a Gospel — by
    // its traditional author. Mosaic authorship of the Pentateuch is the most contested authorship
    // question in the Old Testament, and evangelicals themselves range across it, from full Mosaic
    // authorship to a Mosaic core completed by a later hand (Deuteronomy 34 records his death).
    // A link asserts the strongest form of that where a reader cannot see the argument.
    BOOKS_OF_PLURAL,
    // NOT suppressed: "the written Law of Moses" and "the Song of Moses" both keep their links.
    // The first names the lawgiver and is the Bible's own idiom; the second names a song the text
    // says in the same breath was "sung by Moses and the people". Neither is a book title.
  ],
  nehemiah: [
    BOOK_OF, // "In the book of Nehemiah, Ezra reappears as the central figure"
    // "the post-exilic city that Nehemiah's account describes" keeps its link.
  ],
  philemon: [
    TEXT_OF, // "the text of Philemon is stable and consistently attested"
    MANUSCRIPT_AFTER, // "A second Philemon papyrus, P139, dates to the fourth century"
    // Two canon lists where the neighbouring "1 and 2 Timothy" is suppressed by BOOK_NUMERAL.
    { phrase: "1 and 2 Thessalonians, 1 and 2 Timothy, Titus, and Philemon", to: null },
    { phrase: "1 and 2 Timothy, Titus, Philemon, and Revelation are absent", to: null },
    { phrase: "1–2 Timothy, Titus, Philemon, and Revelation are absent", to: null },
    // NOT suppressed: "the short personal letter to Philemon" is addressed to the man.
  ],
  ruth: [
    BOOK_OF, // "Boaz appears in the book of Ruth as a 'man of standing'"
  ],
  shiloh: [
    // Yigal Shiloh directed the City of David excavation from 1978 to 1985 and is named in the
    // archaeology articles. He is a modern archaeologist, not the Ephraimite town where the Tent of
    // Meeting stood, and a link from his surname to that POI is simply wrong. Only the form
    // preceded by his initial or forename is suppressed, so Scripture's own "Shiloh" (Joshua 18:1,
    // 1 Samuel 1:3 and 30 more) and every article naming the place keep their links untouched.
    { before: /\b(?:Y\.|Yigal)\s+$/, to: null },
  ],
  samuel: [
    { phrase: "Joshua, Judges, Samuel and Kings, then Isaiah, Jeremiah, Ezekiel and the Twelve", to: null }, // a list of BOOK titles
    // "Samuel ben Jacob", the scribe who wrote, pointed and annotated the Leningrad Codex single
    // handed in Fustat about 1008. He was resolving to the prophet.
    BEN_PATRONYMIC_AFTER,
    BOOK_OF, // "the following books of Samuel", "the earlier books of Samuel and Kings"
    BOOK_NUMERAL, // "1 Samuel traces Israel's transition from the era of the judges"
    TEXT_OF, // "the Masoretic text of Samuel", "a text of Samuel noticeably different"
    // MODERN WORK TITLES again: "4QMidrash Samuel?" is the title of A. Rofé's 1998 Textus article,
    // quoted on `4qsamuel-a`. The title names a manuscript, not the prophet.
    { phrase: "4QMidrash Samuel", to: null },
    // Mar Athanasius Yeshue Samuel, the Syriac Orthodox metropolitan in Jerusalem who bought four
    // of the seven Cave 1 scrolls in 1947 and sold them to Israel in 1954. He is named on five
    // manuscript articles, and without this his surname sent every reader to the prophet. Keyed on
    // "Athanasius" rather than on "Mar", which is a word of Aramaic in its own right; no WEB verse
    // contains "Athanasius". The articles themselves avoid the bare surname and write "the
    // archbishop", so this rule only has to cover the full form.
    { before: /\bAthanasius(?: Yeshue)?\s+$/, to: null },
  ],
  timothy: [
    BOOK_NUMERAL, // "1 Timothy", "2 Timothy", "1 and 2 Timothy", "1 & 2 Timothy", "1–2 Timothy"
  ],
  titus: [
    TEXT_OF, // "especially valuable as early evidence for the text of Titus specifically"
    // The same two canon lists as Philemon above.
    { phrase: "1 and 2 Thessalonians, 1 and 2 Timothy, Titus, and Philemon", to: null },
    { phrase: "1 and 2 Timothy, Titus, Philemon, and Revelation are absent", to: null },
    { phrase: "1–2 Timothy, Titus, Philemon, and Revelation are absent", to: null },

    // ── Three more, second-bearer sweep, 2026-09-10 ──────────────────────────────────────────
    // The emperor is handled per record in OWNER_NAME_OVERRIDES; these name the LETTER, and they
    // sit on records that cannot take a whole-record answer. book-intro:Titus holds five correct
    // mentions of the man Paul left on Crete and two of the book, so the two get rules instead.
    // Both patterns were measured against all 31,098 WEB verses first: "parts of <Capital>"
    // occurs in five verses and "is contained in" in one, and none of the six contains "Titus".
    { before: /\b[Pp]arts of\s+$/, to: null }, // "P32 … preserves parts of Titus"
    { after: /^\s+is contained in\b/, to: null }, // "Titus is contained in the great … uncials"
    // A third canon list, on chester-beatty-papyri. The neighbouring "1 and 2 Timothy" is caught
    // by BOOK_NUMERAL on Timothy's own key; the numerals sit before Timothy, not before this, so
    // this one has no word of its own and needs a pin. One pin per title, as the ruling says.
    { phrase: "1 and 2 Timothy or Titus", to: null },
  ],

  // ── MODERN WORK TITLES: the same ruling, one shelf further forward ──────────────────────────
  //
  // Ruled 2026-09-10, and it is the book-title ruling above applied to a modern bibliography
  // rather than to the canon: **a person's name inside the title of a modern book, article or
  // journal links to no person.** The reasoning does not change — linking makes a claim, declining
  // to link makes none — but here it is stronger than it is for a biblical book, because there is
  // no reading on which the word is the man. "Abraham" in J. Van Seters's «Abraham in History and
  // Tradition» names a 1975 Yale monograph. A reader who follows that link lands on the patriarch's
  // article from what is plainly a bibliographic reference, which is wrong rather than opinionated.
  //
  // These are pinned by exact phrase and NOT by a pattern, deliberately. Nothing in the surrounding
  // words says "this is a title" — no "book of", no numeral, no possessive naming a work. The
  // neighbours are an author's surname and a year, and a rule keyed on either would reach far past
  // titles. The modern-name sweep can key on "Van Seters" only because it is allowed to be wrong
  // five times out of six; a suppression rule is not. The title itself is the only durable key, so
  // the title itself is what is pinned — and a phrase pin survives a rewrite of the sentence around
  // it, which a rule reading the neighbours would not.
  //
  // Measured over the whole linked prose corpus on 2026-09-10, not estimated: 12 modern work titles
  // and journal names appear in text the app actually linkifies, and exactly TWO of them contain a
  // live link. One is the entry below. The other is a TOPIC link rather than a person link — "the
  // Jews" inside Luther's «On the Jews and Their Lies» (1543), on martin-luther — and it is left
  // standing on purpose: this table only governs person names, suppressing it would mean inventing
  // a second mechanism, and the words there do denote Jews. It is recorded in reviewed.tsv's header
  // rather than silently passed over.
  //
  // Archaeology prose will keep producing these. The rule for the next writer is written down in
  // scripts/name-linker/reviewed.tsv's header and in scripts/name-linker/README.md.
  abraham: [
    // topic.section on mari-tablets. The title is the key, so the pin holds whether the sentence
    // reads "J. Van Seters's Abraham in History and Tradition (1975)" or cites the book any other
    // way. Nothing else about Abraham is touched: the phrase occurs once in the whole corpus.
    { phrase: "Abraham in History and Tradition", to: null },
  ],

  // ── QUOTED INSCRIPTIONS ON DISPUTED OBJECTS, AND ONE MORE MODERN TITLE ──────────────────────
  //
  // Added 2026-09-10 with the forgeries-and-disputed-authenticity articles, and the same principle
  // as the two blocks above: linking makes a claim, declining to link makes none.
  //
  // The Talpiot tomb's ossuaries carry six of the commonest names in first-century Judea, and the
  // whole point of the `talpiot-tomb` article is that a common cluster of common names does not
  // identify anybody. Linking the inscription "Jesus son of Joseph" to Jesus of Nazareth — and
  // "Joseph" to the patriarch, which is the global default and would be wrong on any reading —
  // asserts on the reader's behalf exactly the identification the article says the evidence does
  // not support. So the inscribed strings link to no one. The names elsewhere in the article link
  // normally; only these two quoted readings are pinned.
  //
  // "The Lost Tomb of Jesus" is the 2007 documentary, and falls under the MODERN WORK TITLES
  // ruling above: a person's name inside a modern work's title names the work, not the man.
  //
  // NOT pinned, deliberately, and the difference is worth recording: the James Ossuary article
  // quotes its inscription in Aramaic transliteration ("...akhui di Yeshua"), and "Yeshua" there
  // is left resolving to Jesus of Nazareth. What is disputed about that object is whether the
  // words are ancient, not who they would mean if they are — which is the opposite of the Talpiot
  // case, where the referent is precisely what is in question.
  jesus: [
    { phrase: "Jesus son of Joseph", to: null },
    { phrase: "Judah son of Jesus", to: null },
    { phrase: "The Lost Tomb of Jesus", to: null },
  ],
  joseph: [
    { phrase: "Jesus son of Joseph", to: null },

    // ── ONE RECORD, ONE NAME: old-syriac-gospels ────────────────────────────────────────────
    //
    // Bare "Joseph" resolves to the patriarch everywhere in our prose, and the Old Syriac Gospels
    // article is about Matthew's genealogy, so every Joseph on it is Joseph the husband of Mary.
    // Nine of them, five inside verbatim quotations of Lewis's 1894 translation and of Burkitt —
    // primary-source translations that may not be reworded to dodge the collision. They shipped
    // live pointing at Joseph son of Jacob, which sends a reader of Matthew 1:16 to Egypt.
    //
    // Resolved rather than suppressed: joseph-husband-of-mary is a real record and is the man the
    // sentences are about, so no link would be a worse answer than the right link.
    //
    // Every phrase below is quoted verbatim from that article and occurs in exactly one prose
    // block in the whole corpus and in none of the 31,098 WEB verses, so the reach of this block
    // is that one record. It says nothing about the corpus-wide question of who bare "Joseph"
    // should belong to, which is Robbie's and is on his list; a ruling there replaces these pins
    // rather than fighting them. Each is pinned by a prose case in scripts/name-linker/cases.mjs.
    { phrase: "Jacob was the father of Joseph, the husband of Mary", to: "joseph-husband-of-mary" },
    {
      phrase: "Matthan begat Jacob; Jacob begat Joseph; Joseph, to whom was betrothed Mary the Virgin",
      to: "joseph-husband-of-mary",
    },
    { phrase: "the fact that Joseph was troubled about Mary's condition", to: "joseph-husband-of-mary" },
    { phrase: "the uncompromising statement 'and Joseph begat Jesus'", to: "joseph-husband-of-mary" },
    {
      phrase: "the Evangelist believed that Joseph had been the natural father of Jesus",
      to: "joseph-husband-of-mary",
    },
    {
      phrase: "the Evangelist cares about is that Joseph accepted Jesus as his son",
      to: "joseph-husband-of-mary",
    },
    { phrase: "David's line through Joseph's legal fatherhood", to: "joseph-husband-of-mary" },
    {
      phrase: "Jacob begat Joseph, him to whom was betrothed Mary the Virgin",
      to: "joseph-husband-of-mary",
    },

    // ── THE ONE MIXED RECORD IN THE NATIVITY SWEEP: `egyptians` ─────────────────────────────
    //
    // The Egyptians topic names BOTH men, which is exactly what OWNER_NAME_OVERRIDES cannot do:
    // "when Joseph rose to power there and welcomed his father Jacob's family during a famine"
    // and "a new king over Egypt, who didn't know Joseph" are the patriarch's son and are already
    // right, and "Matthew records that Joseph fled with Mary and the infant Jesus to Egypt to
    // escape Herod's massacre" is Mary's husband and was pointing at the other man — on the one
    // record in the app where the two are a paragraph apart.
    //
    // So the record-wide answer is left alone (the global default, the patriarch, which is right
    // for two of the three) and the exception is recovered here, checked before that table.
    //
    // Read what this costs, because it is the opposite of the direction the `jacob-father-of-
    // joseph` and `book-intro:Zechariah` pins get, and it cannot be helped. There the record-wide
    // answer renders NO link, so a reworded sentence loses a correct link. Here the record-wide
    // answer is a real link to the patriarch, so if this sentence is ever reworded the mention
    // degrades to the WRONG man rather than to nothing. The alternative — an owner entry of
    // `null` plus this pin — would buy that safety by killing the two correct patriarch links on
    // the same record, which is a worse trade. Anyone rewording that paragraph must move this pin
    // with it; the prose case in cases.mjs is what will say so.
    //
    // Measured before it was written, across all 31,098 WEB verses and all 6,677 blocks (the 985
    // public-page-only ones included): this phrase occurs in exactly ONE block and in NO verse.
    {
      phrase: "Matthew records that Joseph fled with Mary and the infant Jesus to Egypt",
      to: "joseph-husband-of-mary",
    },

    // ── SCRIPTURE'S OWN MATTHEW 1:16, ON THE PANEL PATH ─────────────────────────────────────
    //
    // The reader already had this verse right, but by a different route: BOOK_NAME_OVERRIDES sends
    // every bare "Joseph" in Matthew to Mary's husband. That table needs a book, so the panel path
    // fell through to the global default and sent the reader to Egypt from the one verse in
    // Scripture that names Joseph's wife in the same clause. This pin closes it, and gives the
    // reader path the same answer it already had. Unique to Matthew 1:16 across all 31,098 WEB
    // verses and absent from every prose block; the "Jacob" in the same phrase is pinned under
    // `jacob` above.
    { phrase: "Jacob became the father of Joseph, the husband of Mary", to: "joseph-husband-of-mary" },
  ],

  // ── TWO MODERN SURNAMES THAT ARE ALSO PLACES ───────────────────────────────────────────────
  //
  // Same shape as the `andrew`/`gideon`/`jacob` excavator rules above, except that what gets
  // stolen here is a LOCATION's key rather than a person's. resolveByContext runs on every match
  // kind, so a phrase pin works for both.
  //
  // "Y. Gath" is Yosef Gath, who carried out the 1980 salvage excavation of the Talpiot tomb. Gath
  // is also a Philistine city with its own map record, and without this pin his surname sends the
  // reader to the Shephelah.
  //
  // "Damascus Gate" is a gate of Jerusalem's Old City with no record of its own. Pinning it also
  // corrects a link that was already live: the Garden Tomb POI's description locates the tomb
  // "outside Jerusalem's Damascus Gate", and that "Damascus" had been resolving to the Syrian city
  // ever since. One prose row leaves the snapshot as a result, and that is the row.
  gath: [
    { phrase: "Y. Gath", to: null },
  ],
  damascus: [
    { phrase: "Damascus Gate", to: null },
  ],
  noah: [
    // topic.section on noahs-ark-claims. The 1996 Journal of Geoscience Education paper by
    // L. G. Collins and D. Fasold, quoted by title. Same ruling as the Van Seters pin above: the
    // words name a journal article, not the man. Deliberately narrow — the SAME article quotes
    // that paper's closing sentence, "It cannot have been Noah's Ark", and that one keeps its link
    // because there the words really do denote Noah. The two sit a few sentences apart, which is
    // exactly why this is pinned on the title string and not on anything in the neighbourhood.
    { phrase: "Bogus 'Noah's Ark' from Turkey Exposed as a Common Geologic Structure", to: null },
  ],

  // ── MODERN INSTITUTIONS THAT CARRY A BIBLICAL NAME ──────────────────────────────────────────
  //
  // Not a work title, but the same fault and the same fix: a modern body named after a person or a
  // doctrine is not that person or that doctrine. "Trinity Southwest University" is the New Mexico
  // institution that runs the Tall el-Hammam excavation, and it was linking the word "Trinity" to
  // the app's article on the doctrine — a link that tells a reader something false about a
  // sentence naming a university. Keyed on the following word rather than on a phrase, because the
  // name is written several ways ("Trinity Southwest University", "Trinity Southwest") and
  // "Southwest" is what disambiguates all of them. The doctrine keeps every other mention it has.
  // A second institution of the same shape, added with the versions-and-minuscules batch: W. H.
  // Ferrar and T. K. Abbott were fellows of Trinity College Dublin, and the Codex Montfortianus is
  // still in its library, so the manuscript articles name the college and were linking its first
  // word to the doctrine. A phrase pin here rather than a following-word pattern, because the
  // college is written both "Trinity College Dublin" and "Trinity College in Dublin" and "College"
  // is what disambiguates both. No WEB verse contains "Trinity" at all.
  trinity: [
    { after: /^\s+Southwest\b/, to: null },
    { phrase: "Trinity College", to: null },
  ],

  // ── ADDED WITH THE JUDEAN DESERT MANUSCRIPT ARTICLES ───────────────────────────────────────
  //
  // "Goshen-Gottstein" is M. H. Goshen-Gottstein, who argued against J. A. Sanders over the Great
  // Psalms Scroll in Textus 5 (1966). Goshen is also a region of Egypt with its own map record,
  // so this is the `Y. Gath` case again: a modern surname swallowing a location's key. Keyed on
  // the hyphenated tail rather than on a phrase, because the surname is written both with and
  // without initials, in this batch's own article and in the Psalms book introduction — where the
  // link was ALREADY LIVE and wrong, and where pinning it removes one prose row.
  goshen: [
    { after: /^-Gottstein\b/, to: null },
  ],

  // ── ADDED WITH THE MASORETIC AND MEDIEVAL HEBREW MANUSCRIPTS ────────────────────────────────
  //
  // Four keys that had no block at all until this batch. Every one was found by enumerating what
  // the new articles actually render, with scripts/name-linker/links-for.mjs, BEFORE the commit —
  // which is the only instrument that sees a fault of this shape. The snapshot cannot: a wrong new
  // link arrives as a row that was not there before, and so does every good one. modern-names.mjs
  // cannot either: none of these four sits inside a modern personal name.
  //
  // Two of them were live faults on origin/main, not faults this batch introduced.

  // Aaron ben Moses ben Asher, the Masorete who pointed the Aleppo Codex, and Moses ben Asher his
  // father, whose colophon the Cairo Codex carries. See BEN_PATRONYMIC_AFTER above for why a
  // pattern is safe here where a pattern usually is not.
  aaron: [BEN_PATRONYMIC_AFTER],

  // "Yeshua ben Galgula", the officer commanding at Wadi Murabba'at, to whom Shimon bar Kosiba
  // wrote the letter quoted on `bar-kokhba-letters`. "Yeshua" is a registered alternate name for
  // Jesus of Nazareth, so without this the rebel commander's subordinate linked to Christ.
  yeshua: [BEN_PATRONYMIC_AFTER],

  // "Simeon ben Koseba, Prince of Israel", the rebel leader's signature, quoted from the excavation
  // publication on `bar-kokhba-letters`. The BEN rule is what fires there. The `bar Kosiba` line
  // below fires on NOTHING in the corpus today — checked, both before and after this batch — and is
  // here because the same article and the timeline article between them write the name four ways
  // and only one of them is currently covered. Recorded as defensive rather than described as a
  // fix, because it is not one.
  simeon: [
    BEN_PATRONYMIC_AFTER,
    { after: /^\s+bar\s+Ko[sz]iba\b/, to: null },
  ],

  // LIVE FAULT, and one this batch did NOT introduce: the timeline article on the Bar Kokhba
  // revolt writes "death of Simon bar Kosiba" in its dating notes, and bare "Simon" has been
  // resolving to Simon Peter there since the article was published — one row in prose-links.tsv,
  // measured before and after. Keyed on the patronymic itself and NOT on a bare "bar", because
  // Matthew 16:17 reads "Simon Bar Jonah" and a loose rule would take the apostle's own verse;
  // "bar Ko" cannot reach it. Spelled to catch Kosiba and Koziba, which the sources use
  // interchangeably. `simon` gets no BEN_PATRONYMIC for the same reason: "Simon b." is not a shape
  // anyone writes, and the rule would earn nothing against that risk.
  simon: [{ after: /^\s+[Bb]ar\s+Ko[sz]iba\b/, to: null }],

  // "the Jewish Encyclopedia" — the 1901-1906 reference work, quoted on `bar-kokhba-letters` for
  // the forms of the rebel leader's name. A title, not a people, and the MODERN WORK TITLES ruling
  // covers it: a title does not name whoever it is named after. Pinned on the phrase, for the
  // reason that block gives — nothing in the neighbouring words says "title". Note that the same
  // shape is live elsewhere and is NOT fixed here: "Documents of Jewish Sectaries" on
  // `damascus-document` still links, and so do "the Jerusalem Talmud" and "the Babylonian Talmud"
  // in four other records. Those are a corpus-wide ruling, not a content edit, and are escalated
  // rather than swept up in a content batch.
  // Keyed on the MATCHED SURFACE, which is "jewish" — the adjective is what `topic:jews`
  // registers and what the linker looks up, not the record's id.
  jewish: [{ phrase: "Jewish Encyclopedia", to: null }],

  // Aquila of Sinope, the second-century Jewish translator whose very literal Greek version
  // survives in Cairo Genizah palimpsests and stands at the end of the line the Greek Minor
  // Prophets Scroll begins. A DIFFERENT MAN from Aquila the tentmaker of Acts 18, who owns the key
  // and who is who the app was sending readers to from three articles. There is no record for the
  // translator, so this is a suppression: no link says nothing, and a link to the tentmaker says
  // something false. The second rule is the MODERN WORK TITLES ruling again — D. Barthélemy's 1963
  // book is named for him, and a title is not a man. No WEB verse contains "Aquila of".
  // "Aleppo's Jewish elders" — the community leaders who put about the story that the codex had
  // burned, inside a sentence quoted verbatim from P. Sanders. `topic:jewish-elders` is the
  // Second Temple body of Luke and Acts, not twentieth-century Syrian community leaders, and a
  // quotation cannot be reworded to suit the linker. The app's own prose around it now writes
  // "the community in Aleppo", which needs no rule.
  elders: [{ phrase: "Aleppo's Jewish elders", to: null }],

  "dead sea": [{ phrase: "Dead Sea Discoveries", to: null }], // the journal, not the sea

  aquila: [
    { after: /^\s+of Sinope\b/, to: null },
    { phrase: "Les Devanciers d'Aquila", to: null },
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

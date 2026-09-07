// Named cases for the name linker. This is the fast half of the regression net: it runs in a couple
// of seconds and it says, in words, what each link is supposed to be and why.
//
// Every case names one occurrence of one name in one verse, on one rendering path:
//   path: "reader" (default) — what VerseText.tsx renders; book, chapter and verse are passed.
//   path: "panel"            — what LinkedVerseText.tsx renders; NO book, chapter or verse is
//                              passed, so none of those corrections fire. Used by PersonPanel,
//                              LocationPanel, PoiPanel, TopicPanel, BookIntroView,
//                              TimelineEventPanel and MyProfileView. (This list has been wrong
//                              before — it omitted both of the last two, and TimelineEventPanel's
//                              absence from corpus.mjs left 2,151 links unmeasured. Grep for
//                              LinkedVerseText before trusting it.)
//   owner: "<record id>"     — only with path: "panel". The id the panel passes as excludeId: the
//                              record whose page the text sits on. Every detail panel passes one
//                              (BookIntroView is the exception — a book intro has no record id),
//                              and it is the sole context OWNER_NAME_OVERRIDES has to work with.
//                              Omit it and the case runs with no context at all, as before.
//
// `status` is the part that makes this net honest:
//   "guard"       — this resolution is CORRECT. If it changes, something has regressed.
//   "known-wrong" — this is what the linker does today, and it is WRONG. Recorded so the fault
//                   cannot be quietly forgotten, and so the batch that fixes it shows up as this
//                   line changing. Flip to "guard" in the same commit that fixes it.
//   "flagged"     — this resolution is a live confessional or scholarly question that only Robbie
//                   can settle (see §7 of automation/manager/name-linker-scope.md). It is recorded
//                   so that an unrelated change CANNOT alter it without failing this file. Do not
//                   "fix" a flagged case. If your change moves one, back the change out.
//
// Every case below was read against the WEB text of its verse, not recalled.

export const CASES = [
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // Guards — the correction machinery that already works. These are the evidence the mechanism
  // is sound, and they are the first thing a careless change breaks.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "Matthew 1:16", surface: "Joseph", expect: "joseph-husband-of-mary", status: "guard",
    why: "Matthew's Joseph is Mary's husband, not the patriarch — BOOK_NAME_OVERRIDES." },
  { ref: "Mark 15:43", surface: "Joseph", expect: "joseph-of-arimathea", status: "guard",
    why: "Mark's Joseph is of Arimathea — BOOK_NAME_OVERRIDES." },
  { ref: "John 20:16", surface: "Mary", expect: "mary-magdalene", status: "guard",
    why: "The Mary at the empty tomb is Magdalene — VERSE_NAME_OVERRIDES." },
  { ref: "Luke 3:1", surface: "Philip", expect: "philip-the-tetrarch", status: "guard",
    why: "Luke 3:1's Philip is the tetrarch, not the apostle — VERSE_NAME_OVERRIDES." },
  { ref: "Acts 8:5", surface: "Philip", expect: "philip-the-evangelist", status: "guard",
    why: "Acts 8's Philip is the evangelist, one of the seven — VERSE_NAME_OVERRIDES." },
  { ref: "1 Samuel 9:2", surface: "Saul", expect: "saul-king-of-israel", status: "guard",
    why: "Every Saul in 1 Samuel is the king — BOOK_NAME_OVERRIDES." },
  { ref: "1 Samuel 9:2", surface: "Saul", path: "panel", expect: "saul-king-of-israel", status: "guard",
    why: "Fixed by moving the global owner of bare 'Saul' from Paul of Tarsus to the king " +
         "(SAUL_DEFAULT in verseAnnotations.ts). Was known-wrong: the panel path passes no book, " +
         "so all 416 Scripture 'Saul's — and all 126 in our own prose — went to Paul." },
  { ref: "Acts 9:4", surface: "Saul", expect: "paul-of-tarsus", status: "guard",
    why: "Acts is the one book where a bare 'Saul' is Paul — BOOK_NAME_OVERRIDES, the direction " +
         "of which reversed when the global default moved to the king." },
  { ref: "Acts 13:21", surface: "Saul", expect: "saul-king-of-israel", expectSurface: "Saul the son of Kish",
    status: "guard",
    why: "The one 'Saul' in Acts who is the king, inside Paul's own sermon. It survives the Acts " +
         "book override by being matched as the longer registered wording, not as a bare 'Saul'." },
  { ref: "Psalms 18:1", surface: "Saul", expect: "saul-king-of-israel", status: "guard",
    why: "The five 'Saul's in the Psalm superscriptions are the king. They were Paul's until the " +
         "default moved: the old book override listed 1-2 Samuel and 1 Chronicles and not Psalms." },
  { ref: "Acts 9:17", surface: "Saul", path: "panel", owner: "ananias-of-damascus",
    expect: "paul-of-tarsus", status: "guard",
    why: "Acts 9 rendered in Ananias of Damascus's own verse list — no book, so only " +
         "OWNER_NAME_OVERRIDES can say this 'Saul' is Paul. The article surface depends on the " +
         "same entry for the eight bare 'Saul's in his life story." },
  { ref: "Acts 9:1", surface: "Saul", path: "panel", owner: "paul-of-tarsus", expect: null, status: "guard",
    why: "On Paul's own page the mention is himself, so it is not a link at all. The owner entry " +
         "maps the name back to paul-of-tarsus precisely so the self-link exclusion catches it." },
  { ref: "2 Kings 18:18", surface: "Eliakim", expect: null, status: "guard",
    why: "Hezekiah's palace steward, Eliakim son of Hilkiah — not the Eliakim of Matthew's " +
         "genealogy, who is the only entry. 13 of the 15 'Eliakim's in Scripture are other men." },
  { ref: "Matthew 1:13", surface: "Eliakim", expect: "eliakim-son-of-abiud", status: "guard",
    why: "Matthew 1:13 is the allowlisted book, and these two are the genuine mentions." },
  { ref: "Numbers 1:10", surface: "Gamaliel", expect: null, status: "guard",
    why: "Gamaliel the son of Pedahzur, prince of Manasseh — no entry. Five such in Numbers." },
  { ref: "Acts 5:34", surface: "Gamaliel", expect: "gamaliel", status: "guard",
    why: "Paul's teacher, who appears only in Acts 5:34 and 22:3." },
  // The other three keys of the same shape as "Saul" — an Old Testament figure and a New Testament
  // one sharing a bare name, with the app's entry on the NT side. BOOK_NAME_ALLOWLIST already held
  // the reader path; these assert the article/panel surface, which had nothing. Each verse below is
  // inside a range that owner's own panel actually renders.
  { ref: "Genesis 29:34", surface: "Levi", path: "panel", owner: "leah", expect: null, status: "guard",
    why: "Leah naming her third son. The only 'Levi' entry is Matthew/Levi the apostle; the " +
         "patriarch has none, so no link — the allowlist's own answer, reached by owner." },
  { ref: "Genesis 49:5", surface: "Simeon", path: "panel", owner: "jacob", expect: null, status: "guard",
    why: "'Simeon and Levi are brothers' in Jacob's blessing — sons of Jacob, not Simeon at the " +
         "temple, and neither has an entry." },
  { ref: "Numbers 20:26", surface: "Eleazar", path: "panel", owner: "aaron", expect: null, status: "guard",
    why: "Aaron's son and successor as high priest, on Aaron's own page — not the Eleazar of " +
         "Matthew's genealogy, who is the only entry." },
  { ref: "Genesis 36:8", surface: "Edom", expect: "esau", status: "guard",
    why: "'Esau is Edom' — Genesis is the one book where Edom is the man, not the nation." },
  { ref: "Acts 9:10", surface: "Ananias", expect: "ananias-of-damascus", status: "guard",
    why: "Acts 9's Ananias is the Damascus disciple, not Sapphira's husband." },
  { ref: "John 14:22", surface: "Judas", expect: "thaddaeus", status: "guard",
    why: "The verse itself says '(not Iscariot)'." },
  { ref: "Luke 6:16", surface: "Judas", occurrence: 1, expect: "thaddaeus", status: "guard",
    why: "'Judas the son of James' is Thaddaeus; the verse's second Judas matches the longer key " +
         "'Judas Iscariot' and is unaffected." },
  { ref: "Luke 6:16", surface: "James", expect: "thaddaeus", expectSurface: "Judas the son of James",
    status: "guard",
    why: "Thaddaeus's father James still gets no link of his own. Since batch 1 the whole phrase " +
         "'Judas the son of James' is one link to Thaddaeus, the way 'Simon the Zealot' already " +
         "was — so the father is inside a link, not the target of one. expectSurface pins that " +
         "distinction: if 'James' ever becomes a link to a James again, this fails." },
  { ref: "Matthew 13:55", surface: "James", expect: "james-brother-of-jesus", status: "guard",
    why: "The Nazareth crowd lists Jesus' brothers (fixed in 858d05c)." },
  { ref: "Matthew 13:55", surface: "Simon", expect: null, status: "guard",
    why: "That Simon is a brother of Jesus — not Peter, not the Zealot, and has no entry." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // Batch 2 — ordinary English words read as names.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "Revelation 13:17", surface: "mark", expect: null, status: "guard",
    why: "'the mark of the beast' is not Mark the Evangelist. Six such links across Revelation." },
  { ref: "Revelation 14:9", surface: "mark", expect: null, status: "guard",
    why: "Mark of the beast." },
  { ref: "Revelation 14:11", surface: "mark", expect: null, status: "guard",
    why: "Mark of the beast." },
  { ref: "Revelation 16:2", surface: "mark", expect: null, status: "guard",
    why: "Mark of the beast." },
  { ref: "Revelation 19:20", surface: "mark", expect: null, status: "guard",
    why: "Mark of the beast." },
  { ref: "Revelation 20:4", surface: "mark", expect: null, status: "guard",
    why: "Mark of the beast." },
  { ref: "Genesis 1:14", surface: "mark", expect: null, status: "guard",
    why: "'let them be for signs to mark seasons' — the verb." },
  { ref: "Ezekiel 9:4", surface: "mark", expect: null, status: "guard",
    why: "'set a mark on the foreheads' — the noun, not the man." },
  { ref: "Psalms 37:37", surface: "Mark", expect: null, status: "guard",
    why: "'Mark the perfect man' — the imperative verb, capitalised only because it opens the verse. " +
         "Capitalisation alone cannot catch this one; it needs a per-verse suppression." },
  { ref: "2 Samuel 13:28", surface: "Mark", expect: null, status: "guard",
    why: "'Mark now, when Amnon's heart is merry' — the imperative verb." },
  { ref: "Job 33:31", surface: "Mark", expect: null, status: "guard",
    why: "'Mark well, Job, and listen to me' — the imperative verb." },
  { ref: "Psalms 48:13", surface: "Mark", expect: null, status: "guard",
    why: "'Mark well her bulwarks' — the imperative verb." },
  { ref: "Acts 12:12", surface: "Mark", expect: "john-mark", status: "guard",
    why: "'John who was called Mark' — the real one. Eight such links must survive batch 2." },
  { ref: "Colossians 4:10", surface: "Mark", expect: "john-mark", status: "guard",
    why: "'Mark, the cousin of Barnabas' — the real one." },
  { ref: "1 Peter 5:13", surface: "Mark", expect: "john-mark", status: "guard",
    why: "'so does Mark, my son' — the real one." },

  { ref: "1 John 2:1", surface: "Counselor", expect: null, status: "guard",
    why: "'we have a Counselor with the Father, Jesus Christ, the righteous' — the verse names its " +
         "own referent, and the link said Holy Spirit. Capitalised, so only a per-verse entry " +
         "reaches it. This is NOT the Isaiah 9:6 question and must not be filed under it: nothing " +
         "here is being read as messianic prophecy. No link rather than a link to Jesus because " +
         "the name is right there in the same clause, and because pointing 'Counselor' at Jesus in " +
         "one verse while it points at the Spirit in John 14:16, 14:26 and 15:26 is a decision " +
         "about the whole key." },
  { ref: "Isaiah 3:3", surface: "the counselor", expect: null, status: "guard",
    why: "A civic official in a list of them ('the captain of fifty, the honorable man, the counselor')." },
  { ref: "2 Samuel 15:12", surface: "counselor", expect: null, status: "guard",
    why: "'Ahithophel the Gilonite, David's counselor' — a human royal adviser." },
  { ref: "1 Chronicles 27:33", surface: "counselor", expect: null, status: "guard",
    why: "'Ahithophel was the king's counselor'." },
  { ref: "Romans 11:34", surface: "counselor", expect: null, status: "guard",
    why: "'who has been his counselor?' — the common noun." },
  { ref: "John 14:16", surface: "Counselor", expect: "holy-spirit", status: "guard",
    why: "'another Counselor... with you forever' — the Paraclete. Four such links must survive." },
  { ref: "John 14:26", surface: "the Counselor", expect: "holy-spirit", status: "guard",
    why: "'the Counselor, the Holy Spirit' — named in the verse itself. Note this matches under the " +
         "separate registered key 'the Counselor', which any fix must cover as well as 'Counselor'." },

  { ref: "John 15:26", surface: "the Counselor", expect: "holy-spirit", status: "guard",
    why: "The leading article is stripped before the capitalisation test, so what gets judged is " +
         "'Counselor' — capitalised, therefore a name. This is the case that proves stripping the " +
         "article does not throw the Paraclete out with the king's advisers." },
  { ref: "Psalms 44:10", surface: "the adversary", expect: null, status: "guard",
    why: "A human enemy in battle. The suppression covers 15 occurrences of this key in the WEB. " +
         "Do NOT restate that as 'all 15 are the ordinary word' — that was claimed once and is not " +
         "true: 1 Timothy 5:14 is read as Satan by a substantial body of commentators (see its own " +
         "case below). The defensible claim is narrower — no occurrence is UNAMBIGUOUSLY Satan, so " +
         "suppressing the key takes no position, whereas linking it would." },
  { ref: "Lamentations 1:10", surface: "The adversary", expect: null, status: "guard",
    why: "Babylon, plundering the temple. Capitalised only because it opens the verse — which is " +
         "why the capitalisation test has to look past a leading 'The'." },
  { ref: "1 Timothy 5:14", surface: "the adversary", expect: null, status: "guard",
    why: "Read by many as a human slanderer rather than Satan; commentators divide. No link is the " +
         "neutral outcome and does not commit the app either way." },

  { ref: "Job 31:35", surface: "the accuser", expect: null, status: "guard",
    why: "Job's legal opponent in his imagined lawsuit, not Satan." },
  { ref: "Revelation 12:10", surface: "the accuser", expect: "satan", status: "guard",
    why: "'the accuser of our brothers... who accuses them before our God' — genuinely Satan. This " +
         "is why 'the accuser' must NOT get the capitalisation flag: both its occurrences are " +
         "lowercase, and the flag would take this correct link out along with Job 31:35." },

  { ref: "Genesis 22:13", surface: "ram", occurrence: 1, path: "panel", expect: null, status: "guard",
    why: "Abraham's sacrificial ram, rendered as Ram son of Hezron on every panel that shows this " +
         "verse. 92 of the 101 'ram's in Scripture are the animal." },
  { ref: "Numbers 23:2", surface: "ram", path: "panel", expect: null, status: "guard",
    why: "Balaam's sacrifice — the animal." },
  { ref: "Ruth 4:19", surface: "Ram", occurrence: 1, expect: "ram-son-of-hezron", status: "guard",
    why: "The genealogy. The real one." },
  { ref: "1 Chronicles 2:10", surface: "Ram", occurrence: 1, expect: "ram-son-of-hezron", status: "guard",
    why: "Opens the verse, so it is capitalised by position — but it IS the man. A capitalisation " +
         "test that discounts sentence-initial capitals would wrongly drop this one." },
  { ref: "Matthew 1:4", surface: "Ram", occurrence: 1, expect: "ram-son-of-hezron", status: "guard",
    why: "Same: sentence-initial and genuine." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // The John cluster. Five men share the bare name in the New Testament and the app had audited
  // none of them: 132 occurrences in the WEB text and 238 in our own articles, all resolving to
  // John the Baptist except in Acts, where a blanket book override sent all 24 to the Apostle.
  // The reported fault was Matthew 17:1.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "Matthew 17:1", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "THE reported fault. 'Peter, James, and John his brother' at the Transfiguration is the " +
         "son of Zebedee. It pointed at John the Baptist, who is not James's brother and is dead " +
         "by Matthew 14. Fixed by VERSE_NAME_OVERRIDES; the Gospels get no book override because " +
         "the Baptist is right in 64 of their 83 mentions." },
  { ref: "Matthew 4:21", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "'James the son of Zebedee, and John his brother' — the calling. Same fault, same fix." },
  { ref: "Mark 3:17", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "'John, the brother of James' — the Boanerges naming. The verse states the relationship." },
  { ref: "Luke 22:8", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "'He sent Peter and John' to prepare the Passover — the Baptist has been dead since 9:9." },
  { ref: "Matthew 3:13", surface: "John", expect: "john-the-baptist", status: "guard",
    why: "The other 96. Jesus comes to John to be baptized. Guards the global default from being " +
         "moved wholesale to the Apostle — he owns 30 of the 132, not the majority." },
  { ref: "Acts 3:1", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "'Peter and John were going up into the temple' — the Acts book override, correct at " +
         "nine of Acts' 24 occurrences." },
  { ref: "Acts 19:4", surface: "John", expect: "john-the-baptist", status: "guard",
    why: "'John indeed baptized with the baptism of repentance' — one of nine Baptist " +
         "retrospectives in Acts that the book override sent to the Apostle. Was wrong." },
  { ref: "Acts 13:13", surface: "John", expect: "john-mark", status: "guard",
    why: "'John departed from them and returned to Jerusalem' — the desertion at Perga that " +
         "splits Paul and Barnabas two chapters later. Rendered as John the Apostle." },
  { ref: "Acts 12:12", surface: "John", expect: "john-mark",
    expectSurface: "John who was called Mark", status: "guard",
    why: "Matched as one phrase rather than as a bare 'John' plus a separate 'Mark' — the " +
         "wording is registered on john-mark in people.ts, so it works on every surface and in " +
         "every translation, not only where a verse override can reach." },
  { ref: "Acts 15:37", surface: "John", expect: "john-mark",
    expectSurface: "John, who was called Mark", status: "guard",
    why: "Same phrase, comma'd — WEB punctuates 15:37 differently from 12:12 and 12:25, which is " +
         "what matchNames exists for. KJV reads 'whose surname was Mark' and is registered too." },
  { ref: "Acts 4:6", surface: "John", expect: null, status: "guard",
    why: "The John of the high-priestly family, listed beside Annas and Caiaphas. A real, " +
         "distinct man the app has no entry for, so no link — the same interim this file uses for " +
         "Simon the tanner. Whether to link at all here is §7.12, still open with Robbie." },
  { ref: "Galatians 2:9", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "The 'pillars' — James, Cephas and John. Galatians' only occurrence, so a book override." },
  { ref: "Acts 12:2", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "'James, the brother of John.' Already correct before this batch; guards it." },

  // Prose cases — the article surface, which is where the John fault was largest (238 links, all
  // of them the Baptist) and which no named case could reach until `text` cases existed.
  { text: "By this point the Gospel of John records that the chief priests and Pharisees had " +
          "already resolved that he must be put to death",
    surface: "John", owner: "jesus-of-nazareth", expect: null, status: "guard",
    why: "A reference to the BOOK must not link to a person at all. On Jesus's own page this " +
         "said the Gospel of John was written by John the Baptist. NAME_CONTEXT_RULES." },
  { text: "1 John was written to reassure believers of their faith",
    surface: "John", expect: null, status: "guard",
    why: "The epistle, in its own book intro. No owner — BookIntroView passes no record id, so " +
         "OWNER_NAME_OVERRIDES cannot reach a book intro and only the context rule can." },
  { text: "John's Gospel records that after Jesus raised Lazarus, the chief priests and Pharisees " +
          "convened the council",
    surface: "John", owner: "caiaphas", expect: null, status: "guard",
    why: "The possessive naming the book. Suppressing it takes NO position on who wrote it, " +
         "which is the point — that question is flagged below." },
  { text: "a small fragment containing a few verses from John chapter 18",
    surface: "John", expect: null, status: "guard",
    why: "'John chapter 18' — a citation, not a man." },
  { text: "Antipas, wary of John's popularity, imprisoned him instead",
    surface: "John", owner: "herod-antipas", expect: "john-the-baptist", status: "guard",
    why: "The counterweight to the three cases above, and the reason the possessive rule tests " +
         "for a following 'Gospel' and nothing else. \"John's popularity\", \"John's disciples\" " +
         "and \"John's baptism\" are the Baptist himself and must keep their links. Widening the " +
         "rule to any possessive breaks this." },
  { text: "Peter was born Simon, son of John (or Jonah), and worked as a fisherman",
    surface: "John", owner: "simon-peter", expect: null, status: "guard",
    why: "Peter's FATHER — a different man with no entry. It is also why simon-peter could not " +
         "simply be handed to the Apostle by OWNER_NAME_OVERRIDES: the page names two Johns and " +
         "an owner rule gives one answer. Reaches ASV's John 1:42 and 21:15-17 too, which read " +
         "'son of John' where WEB reads 'son of Jonah'." },
  { text: "a real historical split between the Hasmonean ruler John Hyrcanus and the Pharisees",
    surface: "John", owner: "sadducees", expect: null, status: "guard",
    why: "The Hasmonean, no entry — and on a page that also says 'arrest Peter and John', so " +
         "again an owner rule alone could not separate them." },
  { text: "John was the son of a fisherman named Zebedee",
    surface: "John", owner: "john-the-apostle", expect: null, status: "guard",
    why: "On John the Apostle's OWN page every 'John' linked to John the Baptist — the single " +
         "most visible instance of this fault. Now handed to the self-link exclusion." },
  { text: "While John became the movement's chief organizer and preacher, Charles became its poet",
    surface: "John", owner: "charles-wesley", expect: "john-wesley", status: "guard",
    why: "Not a biblical John at all. Charles Wesley's brother, on Charles's page, linked to " +
         "John the Baptist. The app has a john-wesley entry." },
  // The regnal name has to be matched WHOLE or it splits into two links, the second of them wrong.
  // Found in review of this pass; the fix is matchNames on pope-john-paul-ii in people.ts.
  { text: "John Paul II also worked to improve Catholic relations with Judaism",
    surface: "John Paul II", owner: "fall-of-communism-poland-1989", expect: "pope-john-paul-ii",
    expectSurface: "John Paul II", status: "guard",
    why: "One link covering the whole regnal name. Before the matchNames entry this rendered as " +
         "TWO links — 'John' to the pope (correct) and 'Paul' to the apostle Paul (wrong), on 6 " +
         "of the 7 'John Paul II' mentions in our prose, including the pope's own page." },
  { text: "John Paul II also worked to improve Catholic relations with Judaism",
    surface: "Paul", owner: "fall-of-communism-poland-1989", expect: "pope-john-paul-ii",
    expectSurface: "John Paul II", status: "guard",
    why: "The other half of the same guard: 'Paul' here must be swallowed by the longer match, " +
         "never resolve to paul-of-tarsus on its own." },
  { text: "As pope, John Paul II traveled to over 100 countries",
    surface: "John Paul II", owner: "pope-john-paul-ii", expect: null, status: "guard",
    why: "On his OWN page the whole name is self-excluded, so neither word links. Previously " +
         "'Paul' still linked to the apostle Paul here." },
  { text: "James and John wanted to call down fire on a Samaritan village",
    surface: "John", owner: "james-son-of-zebedee", expect: "john-the-apostle", status: "guard",
    why: "The article surface repointed by OWNER_NAME_OVERRIDES, which is the only correction " +
         "that reaches it." },

  // ── The four rulings recorded in automation/manager-inbox. These were `flagged` — held still,
  // pointing at John the Baptist, pending a decision. The decision was that the app has ALREADY
  // taken the traditional position in its own prose (the exile article opens "The apostle John";
  // john-the-apostle carries "the Beloved Disciple" as a reader-facing alternate name), so linking
  // introduces no theological commitment the copy does not already carry. They are guards now:
  // a future pass cannot silently undo them without failing here.

  // Ruling 1 — the John of Patmos links to the Apostle. 4 in the reader, 15 in articles.
  { ref: "Revelation 1:9", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "'I John, your brother… on the isle that is called Patmos.' Was John the Baptist, who " +
         "died some sixty years earlier — wrong under every reading. Now the Apostle, by a " +
         "Revelation book override; the book's four occurrences are all the same man." },
  { ref: "Revelation 22:8", surface: "John", expect: "john-the-apostle", status: "guard",
    why: "The closing self-identification, matching the opening one." },
  { text: "The apostle John - by this point the last living member of the original Twelve",
    surface: "John", owner: "bib-ac-john-exile-revelation", expect: "john-the-apostle", status: "guard",
    why: "The article whose own first sentence names him the apostle, and whose 'John's vision' " +
         "and 'back to John himself' all pointed at the Baptist. This sentence is the reason the " +
         "ruling went the way it did." },

  // Ruling 2 — the Fourth Gospel's narrating voice is suppressed, not linked. No link asserts
  // nothing about who held the pen; a link to the Baptist asserted something false.
  { text: "John reports that because many Jews were believing in Jesus on account of Lazarus",
    surface: "John", owner: "lazarus-of-bethany", expect: null, status: "guard",
    why: "'John reports', 'John notes', 'John tells us' — 48 article links, all of them the " +
         "Baptist, who wrote none of it. Suppressed rather than pointed at the Apostle: same " +
         "answer this file gives the contested Nathan at 1 Kings 4:5." },
  { text: "John alone records this scene, calling it the \"first of his signs.\"",
    surface: "John", owner: "bib-loc-wedding-at-cana", expect: null, status: "guard",
    why: "Same rule on a timeline article rather than a person page." },

  // Ruling 4 — and the case that proves a record can hold two different Johns. Both of these
  // records are in OWNER_NAME_OVERRIDES with a `null`, and both recover the Apostle here, because
  // the "Peter and John" context rule is checked BEFORE the owner table.
  { text: "in John's account, she runs to tell Peter and John, then remains weeping outside the empty tomb",
    surface: "John", occurrence: 2, owner: "mary-magdalene", expect: "john-the-apostle", status: "guard",
    why: "Ruling 4. The SECOND 'John' in this sentence is the Apostle; the first is the Gospel " +
         "and is suppressed by the possessive rule. One sentence, two Johns, two answers — which " +
         "no owner rule alone could produce." },
  { text: "in John's account, she runs to tell Peter and John, then remains weeping outside the empty tomb",
    surface: "John", occurrence: 1, owner: "mary-magdalene", expect: null, status: "guard",
    why: "The other half of the same sentence. Guards the split itself: if the possessive rule " +
         "or the 'Peter and John' rule stops firing, exactly one of this pair fails." },
  { text: "Jesus sends Peter and John ahead to prepare the Passover in a furnished upper room",
    surface: "John", owner: "bib-loc-last-supper", expect: "john-the-apostle", status: "guard",
    why: "Ruling 4, second instance — on a record whose other two 'John's are narrator " +
         "references and are suppressed by the owner entry." },

  // Ruling 3 — the book intros, pinned one at a time. BookIntroView passes no record id, so
  // nothing but an exact phrase can reach these 22. Each pin gets a case because a pin is only as
  // durable as the sentence it quotes: if the copy is rewritten the pin stops matching and the
  // link silently reverts to the Baptist. A failure here means the copy moved — re-read the
  // sentence and re-pin it. Do not delete the case.
  { text: "attested in Matthew, Luke, John, Acts, and 1 Corinthians 15",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — a book in an appositive list." },
  { text: "containing large portions of both Luke and John, and it closely agrees with Codex Vaticanus",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — a manuscript's contents." },
  { text: "John is strikingly different from the other three Gospels",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — the book as a work." },
  { text: "In John, Jesus speaks largely in extended discourses",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — 'in John' names the book." },
  { text: "far from Ephesus, where John is traditionally held to have been written",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — a book is written, not a man." },
  { text: "it undercuts the older critical theory that John was a mid-2nd-century work",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — a date of composition." },
  { text: "near-complete copy of John and one of the oldest substantial New Testament manuscripts",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — a copy of a book." },
  { text: "contains large portions of both Luke and John and is an important early witness to John's text",
    surface: "John", occurrence: 1, expect: null, status: "guard", why: "Ruling 3 — P75's contents." },
  { text: "contains large portions of both Luke and John and is an important early witness to John's text",
    surface: "John", occurrence: 2, expect: null, status: "guard",
    why: "Ruling 3 — \"John's text\" is the book's text. Note this sentence needs BOTH pins: the " +
         "possessive rule does not fire because what follows is 'text', not 'Gospel'." },
  { text: "most scholars conclude it was not part of John's original text",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — the book's original text." },
  { text: "points to John circulating broadly and early in the church",
    surface: "John", expect: null, status: "guard", why: "Ruling 3 — a book circulates." },
  { text: "John states his purpose plainly near the end",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 in a book intro — the voice." },
  { text: "Much of this reflects the material John chose to record",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 in a book intro." },
  { text: "on the last night — and John writes as one who was there",
    surface: "John", expect: null, status: "guard",
    why: "Ruling 2. Note this is the strongest authorship claim in the whole corpus and it is " +
         "still only suppressed, never linked — the copy makes the claim, the link does not." },
  { text: "After the crucifixion, John gives vivid resurrection accounts",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 in a book intro." },
  { text: "left the community, and John writes to strengthen those who remained",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 — 1 John's intro." },
  { text: "John warns of 'antichrists' and deceivers who deny the Son",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 — 1 John's intro." },
  { text: "John closes by assuring those who believe in the name of the Son of God",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 — 1 John's intro." },
  { text: "Through a series of dramatic visions, John seeks to comfort and warn these believers",
    surface: "John", expect: null, status: "guard",
    why: "Ruling 2 — Revelation's intro. The asymmetry with ruling 1 is DELIBERATE and confirmed " +
         "by Bob, not an inconsistency to tidy away: ruling 1 covers identifying the John of " +
         "Patmos as a PERSON, so the exile article, which names the man ('The apostle John'), " +
         "links. Ruling 2 covers NARRATOR VOICE, and a book intro saying 'John describes a " +
         "thousand-year reign' is narrator voice regardless of which book it introduces — so it " +
         "does not link. Same man, two different things being said about him. Leave it as it is." },
  { text: "Revelation opens with John's overwhelming vision of the risen Christ",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 — Revelation's intro." },
  { text: "John is then caught up to heaven, where he sees God's throne room",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 — Revelation's intro." },
  { text: "John describes a thousand-year reign",
    surface: "John", expect: null, status: "guard", why: "Ruling 2 — Revelation's intro." },

  // ── The split-name fault: a multi-word name whose first word is a biblical name, with no record
  // for the whole man, linking the fragment to the wrong person. Suppression is §7.12's interim,
  // not a ruling that these records will never exist — if one is written, register the whole name
  // on it and delete the rule. One case per site so a later pass cannot quietly reintroduce any.
  { text: "in 1970 Pope Paul VI named her the first woman Doctor of the Church",
    surface: "Paul", owner: "teresa-of-avila", expect: null, status: "guard",
    why: "Pope Paul VI is not the apostle Paul. The app has no Paul VI record, so no link." },
  { text: "the last three after John's death, under Pope Paul VI), to produce sweeping reforms",
    surface: "Paul", owner: "pope-john-xxiii", expect: null, status: "guard",
    why: "Same, on John XXIII's own page." },
  { text: "Further work led Pope Paul VI to announce in 1968 that bones recovered",
    surface: "Paul", owner: "vatican-necropolis-rome", expect: null, status: "guard",
    why: "Same, on a POI." },
  { text: "the mutual lifting of the 1054 excommunications by Pope Paul VI and Patriarch Athenagoras",
    surface: "Paul", owner: "great-schism-1054", expect: null, status: "guard",
    why: "Same, on a timeline event." },
  { text: "the council continued under his successor, Pope Paul VI), the council produced sixteen major documents",
    surface: "Paul", owner: "vatican-ii-1962", expect: null, status: "guard",
    why: "Same. These five are every Paul VI mention in the corpus." },
  { text: "the group instead offered themselves to Pope Paul III, who formally approved the new religious order",
    surface: "Paul", owner: "society-of-jesus-founded-1540", expect: null, status: "guard",
    why: "Pope Paul III — a different pope, the same fault. Found by sweeping the class rather " +
         "than the name." },
  { text: "Pope Paul III convened a general council at Trent",
    surface: "Paul", owner: "council-of-trent-1545", expect: null, status: "guard",
    why: "Paul III again. These two are every Paul III mention." },
  { text: "Founded 356 BC by Philip II of Macedon; refounded as a Roman colony",
    surface: "Philip", owner: "philippi", expect: null, status: "guard",
    why: "Philip II of Macedon founded Philippi three centuries before the apostle Philip was " +
         "born. Linked to the apostle until this rule." },
  { text: "originally built by Philip II in the 4th century BC and substantially reconstructed",
    surface: "Philip", owner: "philippi", expect: null, status: "guard", why: "Philip II again." },
  { text: "King Philip II transformed Macedon from a peripheral kingdom",
    surface: "Philip", owner: "wld-pg-philip-of-macedon", expect: null, status: "guard",
    why: "On the timeline event that is ABOUT him — which had him linked to the apostle. These " +
         "three are every Philip II mention." },
  { text: "The King James Version translated Sheol as \"hell,\" \"grave,\" and \"pit\"",
    surface: "James", owner: "gehenna", expect: null, status: "guard",
    why: "A translation named for a king of England, linked to James son of Zebedee. Suppressed " +
         "on the same ground as 'the Gospel of John' above: a book title is not a person." },
  { text: "The King James Version, by contrast, rests on a text compiled in the",
    surface: "James", owner: "codex-vaticanus", expect: null, status: "guard",
    why: "Same." },
  { text: "in what the King James Version famously calls \"a still small voice\"",
    surface: "James", owner: "bib-dki-elijah-still-small-voice", expect: null, status: "guard",
    why: "Same. These three are every King James Version mention." },

  // The enumerated-numeral guards. A general Roman-numeral rule would break both of these, which
  // is why the rules in verseAnnotations.ts list numerals one at a time.
  { ref: "Acts 19:15", surface: "Paul", expect: "paul-of-tarsus", status: "guard",
    why: "'Jesus I know, and Paul I know' — the apostle, followed by the word 'I'. A general " +
         "/Paul\\s+[IVX]+/ rule would have suppressed this. It is why the numerals are enumerated." },
  { ref: "Luke 9:9", surface: "John", expect: "john-the-baptist", status: "guard",
    why: "'John I beheaded' — Herod on the Baptist. The same trap for the other key." },

  { text: "Across four working sessions (John XXIII died in June 1963, midway through",
    surface: "John XXIII", owner: "vatican-ii-1962", expect: "pope-john-xxiii",
    expectSurface: "John XXIII", status: "guard",
    why: "The whole regnal name is one link, matching pope-john-paul-ii. Was a correct link on a " +
         "short span ('John' only); no wrong link, but the two popes now behave alike." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // Flagged — §7 of the scoping document. These record what the app does TODAY, so that a change
  // aimed at something else cannot quietly take a confessional position on Robbie's behalf. If
  // one of these fails, the change that caused it is out of bounds until Robbie has ruled.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "Isaiah 9:6", surface: "Counselor", expect: "holy-spirit", status: "flagged",
    why: "§7.3 — 'Wonderful, Counselor'. Most Christian readings take this as a title of the " +
         "Messiah; the app currently says Holy Spirit. Changing it is a doctrinal statement." },
  { ref: "James 1:1", surface: "James", expect: "james-son-of-zebedee", status: "flagged",
    why: "§7.1 — who wrote the epistle. Almost no tradition holds Zebedee's son (dead in Acts 12:2), " +
         "but choosing James of Jerusalem takes a position the app does not currently take." },
  { ref: "Jude 1:1", surface: "James", expect: "james-son-of-zebedee", status: "flagged",
    why: "§7.2 — 'brother of James'. Same question, plus whether Jude is an apostle." },
  { ref: "Mark 2:14", surface: "Levi", expect: "matthew-levi", status: "flagged",
    why: "§7.7 — the app asserts Levi the tax collector is Matthew the apostle. Traditional and " +
         "widely held, but not universal. Batch 1 makes the same entry reachable as 'Matthew'; " +
         "that must not deepen the claim beyond what the entry already says." },
  { ref: "Genesis 41:38", surface: "Spirit of God", expect: "holy-spirit", status: "flagged",
    why: "§7.4 — whether Old Testament ruach Elohim is the third Person of the Trinity." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // Batch 1 — registrations the linker can never reach, and wordings it does not know.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "Acts 1:13", surface: "James", occurrence: 1, expect: "james-son-of-zebedee",
    expectSurface: "James", status: "guard",
    why: "FIXED in batch 1. The apostle list's first James is Zebedee's son. Until batch 1 all " +
         "three of this verse's Jameses resolved to james-brother-of-jesus — wrong for every one." },
  { ref: "Acts 1:13", surface: "James the son of Alphaeus", expect: "james-son-of-alphaeus", status: "guard",
    why: "FIXED in batch 1 by registering the wording the translations actually use. The app had " +
         "this man all along and spelled him 'James, son of Alphaeus', with a comma." },
  { ref: "Acts 1:13", surface: "Judas the son of James", expect: "thaddaeus", status: "guard",
    why: "FIXED in batch 1. Matching the long form also removes the verse's third bare 'James' " +
         "(Thaddaeus's father), who has no entry and should not be linked at all." },
  { ref: "Acts 1:13", surface: "James", occurrence: 3, expect: "thaddaeus",
    expectSurface: "Judas the son of James", status: "guard",
    why: "The third James — Thaddaeus's father — is now inside the Judas link rather than being " +
         "mislinked to a James of his own. This is the case that proves Acts 1:13 is closed." },
  { ref: "Acts 1:13", surface: "Simon the Zealot", expect: "simon-the-zealot", status: "guard",
    why: "Already correct — and the proof that longest-match resolution works when the registered " +
         "string matches the translation. The rest of this verse is the same fix." },
  { ref: "Acts 1:13", surface: "Bartholomew", expect: "bartholomew-nathanael", status: "guard",
    why: "FIXED in batch 1. The entry is named 'Bartholomew (Nathanael)'; the closing bracket made " +
         "the key unreachable, so 'Bartholomew' linked nowhere in the app." },
  { ref: "Acts 1:13", surface: "Matthew", expect: "matthew-levi", status: "known-wrong",
    why: "STILL UNLINKED, deliberately. 'Matthew (Levi)' is unreachable behind its bracket, and " +
         "registering bare 'Matthew' was tried and reverted: it fired on 85 mentions in our own " +
         "articles that all mean the Gospel, not the man. See the note in people.ts. Closing this " +
         "needs the prose surface fixed first (batch 7), not a dictionary entry." },
  { ref: "Mark 15:21", surface: "Simon of Cyrene", expect: "simon-of-cyrene", status: "guard",
    why: "Already correct. CORRECTS the scoping document, which claimed simon-of-cyrene was " +
         "unreachable: 'Simon of Cyrene' IS a registered key and Mark spells it that way." },
  { ref: "Luke 23:26", surface: "Simon of Cyrene", expect: "simon-of-cyrene", status: "guard",
    why: "Already correct, same reason." },
  { ref: "Matthew 27:32", surface: "Simon", expect: "simon-of-cyrene", status: "guard",
    why: "FIXED in batch 1, per-verse. Matthew words it 'a man of Cyrene, Simon by name', so the " +
         "registered long key cannot match and the bare name fell through to Peter." },
  { ref: "Acts 8:9", surface: "Simon", expect: "simon-magus", status: "guard",
    why: "FIXED in batch 1. The sorcerer who tries to buy the Holy Spirit, previously rendered as " +
         "the chief apostle in the passage where Peter rebukes him." },
  { ref: "Acts 8:18", surface: "Simon", expect: "simon-magus", status: "guard",
    why: "FIXED in batch 1." },
  { ref: "Acts 8:20", surface: "Peter", expect: "simon-peter", status: "guard",
    why: "Peter is still Peter in the same passage — the Acts 8 override is keyed to 'simon', not " +
         "to the whole chapter." },
  { ref: "Luke 7:40", surface: "Simon", expect: "simon-the-pharisee", status: "guard",
    why: "FIXED in batch 1. The Pharisee hosting the anointing dinner, previously Simon Peter." },
  { ref: "Acts 9:43", surface: "Simon", expect: null, status: "guard",
    why: "FIXED in batch 1. Simon the tanner of Joppa — a different man with no entry, so no link." },
  { ref: "Acts 10:32", surface: "Simon", occurrence: 2, expect: null, status: "guard",
    why: "FIXED in batch 4. The verse names BOTH Simons — 'summon Simon, who is also called " +
         "Peter... in the house of a tanner named Simon' — and a per-verse override applies one " +
         "answer to every match of a key, so nulling 'simon' would have unlinked the apostle too. " +
         "Registering 'Simon, who is also called Peter' as a phrase takes the apostle out of the " +
         "key here, leaving one bare 'Simon' for the tanner to suppress. No occurrence-aware " +
         "resolution needed; this is the Acts 1:13 technique." },
  { ref: "Acts 10:32", surface: "Simon", occurrence: 1, expect: "simon-peter",
    expectSurface: "Simon, who is also called Peter", status: "guard",
    why: "The other half of the same fix: the apostle must still be linked, and as the whole " +
         "phrase. expectSurface is what makes the two cases distinguish 'the tanner is unlinked' " +
         "from 'nothing in this verse is linked'." },
  { ref: "Acts 13:21", surface: "Saul the son of Kish", expect: "saul-king-of-israel", status: "guard",
    why: "FIXED in batch 1 by registering the phrase. Israel's first king had been rendered as " +
         "Paul of Tarsus, inside Paul's own sermon at Pisidian Antioch. The same key also corrects " +
         "1 Samuel 10:21, 1 Chronicles 12:1 and 26:28 on the panel path." },
  { ref: "2 Samuel 12:1", surface: "Nathan", expect: "nathan-the-prophet", status: "guard",
    why: "FIXED in batch 1. The prophet who confronts David over Bathsheba. His entry is named " +
         "'Nathan (Prophet)', which the linker could never match, so Nathan linked nowhere at all." },
  { ref: "2 Samuel 5:14", surface: "Nathan", expect: null, status: "guard",
    why: "A son born to David in Jerusalem — a different Nathan, no entry, suppressed per-verse." },
  { ref: "Luke 3:31", surface: "Nathan", expect: null, status: "guard",
    why: "David's son again, in Jesus' genealogy. Luke is outside Nathan's book allowlist." },
  { ref: "1 Kings 4:5", surface: "Nathan", occurrence: 1, expect: null, status: "guard",
    why: "'Azariah the son of Nathan' / 'Zabud the son of Nathan' — commentators divide over " +
         "whether this Nathan is the prophet or David's son. Left unlinked rather than guessed." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // Batch 3 — two kings named Joram reigning at once, and the last king of Israel.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "2 Kings 17:1", surface: "Hoshea", expect: "hoshea-king-of-israel", status: "guard",
    why: "Hoshea son of Elah, the last king of Israel, under whom Samaria fell — rendered as " +
         "Joshua son of Nun. Eight verses of the fall of the northern kingdom." },
  { ref: "2 Kings 17:6", surface: "Hoshea", expect: "hoshea-king-of-israel", status: "guard",
    why: "'In the ninth year of Hoshea the king of Assyria took Samaria'." },
  { ref: "2 Kings 18:10", surface: "Hoshea", expect: "hoshea-king-of-israel", status: "guard",
    why: "'the ninth year of Hoshea king of Israel, Samaria was taken'." },
  { ref: "2 Kings 15:30", surface: "Hoshea the son of Elah", expect: "hoshea-king-of-israel", status: "guard",
    why: "FIXED in batch 3, by the long-form key rather than a per-verse entry — he kills Pekah and " +
         "takes the throne." },
  { ref: "2 Kings 17:4", surface: "Hoshea", expect: "hoshea-king-of-israel", status: "guard",
    why: "FIXED in batch 3. The appeal to 'So king of Egypt' that ends the northern kingdom." },
  { ref: "Numbers 13:16", surface: "Hoshea", expect: "joshua", status: "guard",
    why: "'Moses called Hoshea the son of Nun Joshua' — here Hoshea IS Joshua. Must not change." },
  // Joram of Israel and Joram of Judah reigned at the same time under the same name, and 2 Kings 8-9
  // moves between them sentence by sentence. The bare names belong to Judah; batch 3 recovers Israel
  // verse by verse, and by registering the phrases "Joram the son of Ahab" / "Jehoram the son of Ahab".
  { ref: "2 Kings 9:24", surface: "Joram", expect: "joram-king-of-israel", status: "guard",
    why: "FIXED in batch 3. Jehu shoots him through the heart — the end of the house of Ahab, and " +
         "unambiguously the king of Israel." },
  { ref: "2 Kings 9:14", surface: "Joram", occurrence: 1, expect: "joram-king-of-israel", status: "guard",
    why: "FIXED in batch 3. Jehu's coup is entirely an Israelite affair; both this verse's Jorams " +
         "are the same man, which is why one per-verse answer works here." },
  { ref: "2 Kings 3:1", surface: "Jehoram", expect: "joram-king-of-israel",
    expectSurface: "Jehoram the son of Ahab", status: "guard",
    why: "FIXED in batch 3 by the long-form key: 'Jehoram the son of Ahab began to reign over Israel'." },
  { ref: "2 Kings 8:24", surface: "Joram", expect: "joram-king-of-judah", status: "guard",
    why: "MUST NOT MOVE. 'Joram slept with his fathers, and was buried... in David's city' — this " +
         "one really is the king of Judah, three verses before one that is not." },
  { ref: "Matthew 1:8", surface: "Joram", occurrence: 1, expect: "joram-king-of-judah", status: "guard",
    why: "MUST NOT MOVE. The Davidic genealogy — Judah's line." },
  { ref: "2 Samuel 8:10", surface: "Joram", occurrence: 1, expect: null, status: "guard",
    why: "FIXED in batch 3. Joram son of Toi of Hamath, a Syrian prince sent to congratulate David — " +
         "neither king, and no entry." },
  { ref: "2 Chronicles 17:8", surface: "Jehoram", expect: null, status: "guard",
    why: "FIXED in batch 3. 'Elishama and Jehoram, the priests' — a Levite, no entry." },
  { ref: "2 Kings 1:17", surface: "Jehoram", occurrence: 1, expect: "joram-king-of-israel",
    expectSurface: "Jehoram", status: "guard",
    why: "FIXED in batch 4. This verse names BOTH men under the same key — 'Jehoram began to reign " +
         "in his place [Israel] in the second year of Jehoram the son of Jehoshaphat king of " +
         "Judah' — and a per-verse override applies one answer to every match of a key. Registering " +
         "'Jehoram the son of Jehoshaphat' on the king of Judah leaves exactly one bare 'Jehoram' " +
         "here, which the per-verse table now points at Israel." },
  { ref: "2 Kings 1:17", surface: "Jehoram", occurrence: 2, expect: "joram-king-of-judah",
    expectSurface: "Jehoram the son of Jehoshaphat", status: "guard",
    why: "The second Jehoram in that verse IS Judah's, and is now matched as the whole phrase — " +
         "which is what lets the first one be redirected. expectSurface pins that: if this ever " +
         "shrinks back to a bare 'Jehoram', the verse override would capture it too and Judah's " +
         "king would be relabelled Israel's." },
  { ref: "1 Chronicles 27:20", surface: "Hoshea", expect: null, status: "guard",
    why: "Hoshea son of Azaziah, an Ephraimite officer under David — a third man, with no entry." },
  { ref: "Nehemiah 10:23", surface: "Hoshea", expect: null, status: "guard",
    why: "A signer of Nehemiah's covenant — a fourth man, with no entry." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // The split-name sweep. One fault, found while reviewing the John work and then swept for
  // exhaustively rather than fixed a name at a time: when our copy names someone whose FIRST word
  // is a biblical name and the app has no record for the whole person or place, the linker does not
  // decline to link — it links the fragment to the biblical figure. "Pope Paul VI" sent readers to
  // the apostle Paul; "Judas Maccabeus" sent them to Judas Iscariot; "Abel Meholah", a town, sent
  // them to Adam's murdered son, inside the biblical text itself.
  //
  // Every one is suppressed as §7.12's standing interim — the same answer this file already gives
  // the high-priestly John of Acts 4:6 and Simon Peter's father. NONE of it is a ruling that these
  // records will never exist. Judas Maccabeus in particular is the strongest candidate in the set
  // for a real person record; if one is written, delete his rule and register the whole name there.
  //
  // Enumerated by qualifier, never generalised to "a biblical name followed by a capitalised word".
  // The Acts 19:15 and Luke 9:9 guards above show why: the obvious generalisation strips the link
  // off the apostle Paul in a live verse.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { text: "his father Mattathias died, Judas Maccabeus took command of the growing",
    surface: "Judas", owner: "bib-it-judas-maccabeus-campaigns", expect: null, status: "guard",
    why: "Judas Maccabeus is not Judas Iscariot. THE priority of this sweep. Interim suppression; a record would change this." },
  { text: "Catholics (executing Thomas More and John Fisher for refusing the oath of",
    surface: "Thomas", owner: "henry-viii", expect: null, status: "guard",
    why: "Thomas More. Interim suppression; a record would change this." },
  { text: "Henry, with the help of Thomas Cromwell and Thomas Cranmer, engineered a",
    surface: "Thomas", owner: "henry-viii", expect: null, status: "guard",
    why: "Thomas Cromwell. Interim suppression; a record would change this." },
  { text: "by campaigners including Thomas Clarkson and formerly enslaved writers such",
    surface: "Thomas", owner: "william-wilberforce", expect: null, status: "guard",
    why: "Thomas Clarkson. Interim suppression; a record would change this." },
  { text: "directly with the tablets. Thomas Thompson and John Van Seters, among others,",
    surface: "Thomas", owner: "nuzi-tablets", expect: null, status: "guard",
    why: "Thomas Thompson. Interim suppression; a record would change this." },
  { text: "locations better, such as St. Thomas Bay, making this a genuinely open question. A",
    surface: "Thomas", owner: "st-pauls-bay-malta", expect: null, status: "guard",
    why: "St Thomas Bay — a place in Malta. Interim suppression; a record would change this." },
  { text: "decades later by his colleague Philip Melanchthon, though not by Luther himself at",
    surface: "Philip", owner: "luthers-95-theses-1517", expect: null, status: "guard",
    why: "Philip Melanchthon. Interim suppression; a record would change this." },
  { text: "minority has pushed back. Philip Davies and others proposed that BYTDWD might",
    surface: "Philip", owner: "tel-dan-stele", expect: null, status: "guard",
    why: "Philip Davies. Interim suppression; a record would change this." },
  { text: "(including the teaching of Peter Abelard), and advise",
    surface: "Peter", owner: "bernard-of-clairvaux", expect: null, status: "guard",
    why: "Peter Abelard. Interim suppression; a record would change this." },
  { text: "including Francis Xavier and Peter Faber, during theological studies in Paris in",
    surface: "Peter", owner: "society-of-jesus-founded-1540", expect: null, status: "guard",
    why: "Peter Faber. Interim suppression; a record would change this." },
  { text: "James Sanders and later Peter Flint, have argued that it reflects an",
    surface: "Peter", owner: undefined, expect: null, status: "guard",
    why: "Peter Flint. Interim suppression; a record would change this." },
  { text: "the 1553 execution by burning of Michael Servetus for heresy (denial of the Trinity),",
    surface: "Michael", owner: "john-calvin", expect: null, status: "guard",
    why: "Michael Servetus. Interim suppression; a record would change this." },
  { text: "the Patriarch of Constantinople, Michael Cerularius. Negotiations broke down",
    surface: "Michael", owner: "great-schism-1054", expect: null, status: "guard",
    why: "Michael Cerularius. Interim suppression; a record would change this." },
  { text: "uncertain. In 1956 archaeologist Michael Ballance identified the site with Kerti Höyük",
    surface: "Michael", owner: "derbe", expect: null, status: "guard",
    why: "Michael Ballance. Interim suppression; a record would change this." },
  { text: "team led by Clark Hopkins and Michael Rostovtzeff. The city was abandoned after a",
    surface: "Michael", owner: "dura-europos-house-church", expect: null, status: "guard",
    why: "Michael Rostovtzeff. Interim suppression; a record would change this." },
  { text: "such as Kenneth Kitchen and James Hoffmeier to place the Ramesside Pithom/Tjeku",
    surface: "James", owner: "succoth", expect: null, status: "guard",
    why: "James Hoffmeier. Interim suppression; a record would change this." },
  { text: "Some scholars, following James Sanders and later Peter Flint, have argued",
    surface: "James", owner: undefined, expect: null, status: "guard",
    why: "James Sanders. Interim suppression; a record would change this." },
  { text: "4004 BC date follows Archbishop James Ussher's 17th-century chronology, built by",
    surface: "James", owner: "bib-prim-creation", expect: null, status: "guard",
    why: "James Ussher. Interim suppression; a record would change this." },
  { text: "1200–1000 BC, and some (notably Mary Boyce) as early as c. 1400–1200 BC, in a",
    surface: "Mary", owner: "rel-ane-zoroaster-disputed-dates", expect: null, status: "guard",
    why: "Mary Boyce. Interim suppression; a record would change this." },
  { text: "the Catholic Mary I came to the throne in 1553, Cranmer was",
    surface: "Mary", owner: "thomas-cranmer", expect: null, status: "guard",
    why: "Mary I of England. Interim suppression; a record would change this." },
  { text: "A minority of scholars (notably Andrew Steinmann and the revised Finegan) argue",
    surface: "Andrew", owner: "bib-loc-birth-of-jesus", expect: null, status: "guard",
    why: "Andrew Steinmann. Interim suppression; a record would change this." },
  { text: "1968–1969 excavation by Gideon Foerster; Ehud Netzer then directed Hebrew",
    surface: "Gideon", owner: "herodium", expect: null, status: "guard",
    why: "Gideon Foerster. Interim suppression; a record would change this." },
  { text: "centuries. In 1880 a boy named Jacob Eliyahu, exploring the tunnel, noticed cut",
    surface: "Jacob", owner: "siloam-inscription", expect: null, status: "guard",
    why: "Jacob Eliyahu. Interim suppression; a record would change this." },
  { text: "succeeding his grandfather Solomon Stoddard. In 1734–35, his preaching sparked",
    surface: "Solomon", owner: "jonathan-edwards", expect: null, status: "guard",
    why: "Solomon Stoddard. Interim suppression; a record would change this." },
  { text: "to 1874, with further work by David George Hogarth (1904-06) and re-excavations",
    surface: "David", owner: "temple-of-artemis-ephesus", expect: null, status: "guard",
    why: "David George Hogarth. Interim suppression; a record would change this." },
  { text: "a missionary named Frederick Augustus Klein was shown a large inscribed slab of",
    surface: "Augustus", owner: "mesha-stele", expect: null, status: "guard",
    why: "Frederick Augustus Klein. Interim suppression; a record would change this." },
  { text: "John Hyrcanus, Alexander Jannaeus, and Salome Alexandra.",
    surface: "Salome", owner: "pharisees", expect: null, status: "guard",
    why: "Salome Alexandra, the Hasmonean queen. Interim suppression; a record would change this." },
  { text: "reading \"Colonia Iulia Felix Gemina Lystra\" found in 1885, plus a",
    surface: "Felix", owner: "lystra", expect: null, status: "guard",
    why: "A colony's title, not Antonius Felix. Interim suppression; a record would change this." },
  { text: "taking the name Gaius Julius Caesar Octavianus (rendered in English as",
    surface: "Caesar", owner: "caesar-augustus", expect: null, status: "guard",
    why: "Part of Augustus's own full name. Interim suppression; a record would change this." },
  { text: "Tiberius Claudius Caesar Augustus Germanicus became emperor unexpectedly",
    surface: "Tiberius", owner: "claudius-caesar", expect: null, status: "guard",
    why: "Claudius's regnal name begins with Tiberius. Interim suppression; a record would change this." },
  { text: "procurators Cuspius Fadus and Tiberius Alexander, in the reign of Claudius, relieved",
    surface: "Tiberius", owner: "claudius-caesar", expect: null, status: "guard",
    why: "The procurator Tiberius Alexander. Interim suppression; a record would change this." },
  { text: "begun in 312 BC by censor Appius Claudius Caecus, was ancient Rome's principal highway",
    surface: "Claudius", owner: "appian-way-quo-vadis-rome", expect: null, status: "guard",
    why: "Appius Claudius Caecus, 312 BC. Interim suppression; a record would change this." },
  { text: "Abel Meholah (hometown); itinerant across the northern kingdom",
    surface: "Abel", owner: "elisha", expect: null, status: "guard",
    why: "Abel Meholah is a town. Interim suppression; a record would change this." },

  // Scripture. These are on the READER path, in the biblical text itself, which is what made them
  // the worst of the set: "Abel" in a town's name is the Hebrew word for a meadow, not Adam's son.
  { ref: "Genesis 50:11", surface: "Abel", expect: null, status: "guard", why: "Abel Mizraim — a place." },
  { ref: "Numbers 33:49", surface: "Abel", expect: null, status: "guard", why: "Abel Shittim — a place." },
  { ref: "Judges 7:22", surface: "Abel", expect: null, status: "guard", why: "Abel Meholah — a place." },
  { ref: "2 Samuel 20:15", surface: "Abel", expect: null, status: "guard", why: "Abel of Beth Maacah." },
  { ref: "1 Kings 4:12", surface: "Abel", expect: null, status: "guard", why: "Abel Meholah." },
  { ref: "1 Kings 15:20", surface: "Abel", expect: null, status: "guard", why: "Abel Beth Maacah." },
  { ref: "1 Kings 19:16", surface: "Abel", expect: null, status: "guard", why: "Abel Meholah — Elisha's home town." },
  { ref: "2 Kings 15:29", surface: "Abel", expect: null, status: "guard", why: "Abel Beth Maacah." },
  { ref: "2 Chronicles 16:4", surface: "Abel", expect: null, status: "guard", why: "Abel Maim." },
  { ref: "2 Samuel 20:14", surface: "Abel", expect: null, status: "guard",
    why: "The town named on its own, with no second word for a context rule to see — so this one " +
         "and 20:18 are VERSE_NAME_OVERRIDES instead. Reader path only; the panel still says Abel." },
  { ref: "2 Samuel 20:18", surface: "Abel", expect: null, status: "guard",
    why: "'They shall surely ask counsel at Abel' — the town, the 'mother in Israel' of 2 Samuel 20." },
  { ref: "2 Samuel 6:8", surface: "Perez", expect: null, status: "guard",
    why: "Perez Uzzah is the place David named after the breach, not Judah's son Perez." },
  { ref: "1 Chronicles 13:11", surface: "Perez", expect: null, status: "guard", why: "Perez Uzza, the same place." },
  { ref: "1 Chronicles 2:24", surface: "Caleb", expect: null, status: "guard",
    why: "Caleb Ephrathah is a place, not Caleb the spy." },
  { ref: "Acts 23:26", surface: "Claudius", expect: null, status: "guard",
    why: "Claudius Lysias is the tribune who wrote the letter, not the emperor Claudius. In " +
         "Scripture, on the reader path." },
  { ref: "Acts 23:26", surface: "Felix", expect: "antonius-felix", status: "guard",
    why: "The other name in the same verse MUST survive: suppressing Claudius Lysias must not " +
         "touch the governor Felix, who is correctly linked." },

  // The other half of the Abel work: he must keep every one of his own nine mentions. If a rule
  // above is ever widened, these fail first.
  { ref: "Genesis 4:2", surface: "Abel", expect: "abel", status: "guard", why: "Adam's son — must still link." },
  { ref: "Genesis 4:8", surface: "Abel", expect: "abel", status: "guard", why: "Adam's son — must still link." },
  { ref: "Matthew 23:35", surface: "Abel", expect: "abel", status: "guard", why: "'righteous Abel' — must still link." },
  { ref: "Hebrews 11:4", surface: "Abel", expect: "abel", status: "guard", why: "'By faith, Abel offered' — must still link." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // "Zechariah" — the app's one entry is the priest of Luke 1, father of John the Baptist, and
  // 20 of the 32 mentions on the article surface were other men or the book itself. Fixed by
  // OWNER_NAME_OVERRIDES, including the first four corrections ever written against a book
  // introduction. The reader path never had the fault: BOOK_NAME_ALLOWLIST confines the name to
  // Luke, so all 43 occurrences in Scripture — none of them his — render unlinked there.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "Ezra 5:1", surface: "Zechariah", expect: null, status: "guard",
    why: "'Zechariah the son of Iddo' is the post-exilic prophet, and the reader path already " +
         "declined to link him — BOOK_NAME_ALLOWLIST. This must not move: the fix is on the " +
         "article surface only." },
  { ref: "Ezra 5:1", surface: "Zechariah", path: "panel", owner: "book-intro:Ezra",
    expect: null, status: "guard",
    why: "Ezra's introduction names 'the prophets Haggai and Zechariah'. Until BookIntroView " +
         "passed an id this could not be corrected at all and rendered as John the Baptist's " +
         "father. The prophet has no entry, so no link is the least-wrong answer." },
  { ref: "Zechariah 1:1", surface: "Zechariah", path: "panel", owner: "book-intro:Zechariah",
    expect: null, status: "guard",
    why: "The book's own introduction — one mention of the prophet in whyWritten, four of the " +
         "book as a work in the manuscript notes. Same answer either way, so one owner entry " +
         "covers all five." },
  { ref: "2 Chronicles 24:20", surface: "Zechariah", path: "panel", owner: "bib-dkj-joash-reign",
    expect: null, status: "guard",
    why: "Zechariah son of Jehoiada, stoned in the temple court under Joash — a third man again, " +
         "named with his father in the article's own sentence. No entry, so no link." },
  { ref: "Ezra 5:1", surface: "Zechariah", path: "panel", owner: "zerubbabel",
    expect: null, status: "guard",
    why: "The prophet paired with Haggai in Zerubbabel's life story, and the same man behind " +
         "'Zechariah's vision of a lampstand' two sentences later." },
  { ref: "Ezra 5:1", surface: "Zechariah", path: "panel", owner: "elizabeth-mother-of-john-baptist",
    expect: "zechariah-father-of-john-baptist", status: "guard",
    why: "The other half of the work: the twelve mentions that ARE the priest — on Elizabeth's, " +
         "John's and Gabriel's pages, at Ein Karem, and in Luke's introduction — must survive. " +
         "Elizabeth's page has no owner entry, so it falls to the global default, which is right. " +
         "If a suppression above is ever widened past its owner list, this fails first." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // The 2026-09-07 content batch: Jonah, "the Christ", Son of Man, Sabbath, the Jewish
  // leadership topics, Gennesaret and Herod the tetrarch. Several of these turn on a
  // deliberate decision NOT to link, and those are the ones worth pinning: a link that
  // silently appears here would have the app assert something it has chosen not to assert.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "Jonah 1:1", surface: "Jonah the son of Amittai", expect: "jonah", status: "guard",
    why: "The prophet, matched as the full registered wording rather than a bare name." },
  { ref: "2 Kings 14:25", surface: "Jonah the son of Amittai", expect: "jonah", status: "guard",
    why: "The one mention of the prophet outside his own book, and what dates him." },
  { ref: "Matthew 16:17", surface: "Jonah", expect: null, status: "guard",
    why: "'Simon Bar Jonah' names PETER'S FATHER, a different man with no entry — suppressed " +
         "rather than mislinked to the prophet. Same fault shape as Matthew 13:55's brothers." },
  { ref: "John 21:15", surface: "Jonah", expect: null, status: "guard",
    why: "'Simon, son of Jonah' — Peter's father again. The bare 'Simon' here still resolves " +
         "to Peter, and must continue to." },
  { ref: "John 21:15", surface: "Simon Peter", expect: "simon-peter", status: "guard",
    why: "Pins the other half of the verse: suppressing Jonah must not disturb Peter." },

  { ref: "Ezekiel 2:1", surface: "Son of man", expect: null, status: "guard",
    why: "Ezekiel's 93 occurrences are God addressing the prophet as a mortal, not a title for " +
         "Jesus. The linker is case-insensitive, so only BOOK_NAME_ALLOWLIST keeps them out. " +
         "If this ever links, the app is calling Ezekiel the Son of Man." },
  { ref: "Daniel 7:13", surface: "son of man", expect: "son-of-man", status: "guard",
    why: "CHANGED 2026-09-07 with the move to a stated Protestant evangelical position. This " +
         "was deliberately unlinked while the app took no view of who Daniel's figure is. The " +
         "app now takes one: that figure is the Messiah, and Jesus quoted this verse at his own " +
         "trial (Mark 14:62). Evangelicals still differ over how Daniel 7's individual and " +
         "corporate strands relate — the article says so — but not over whether Jesus is the one " +
         "Daniel saw, so the link asserts only what the position holds." },
  { ref: "Daniel 8:17", surface: "son of man", expect: null, status: "guard",
    why: "The angel addressing DANIEL — the Ezekiel sense, a mortal. Admitting Daniel to the " +
         "allowlist would have linked this too, which is why it is excepted by verse. If this " +
         "ever links, the app is calling Daniel the Son of Man." },
  { ref: "Revelation 1:13", surface: "son of man", expect: "son-of-man", status: "guard",
    why: "The exalted Christ among the lampstands, who identifies himself two verses later as " +
         "the one who was dead and is alive. Not disputed in the way 14:14 is." },
  { ref: "Revelation 14:14", surface: "son of man", expect: null, status: "guard",
    why: "DELIBERATE non-link. The figure on the cloud with a sickle is read as Christ by some " +
         "interpreters and as an angel by others, evangelicals included. Taking a position on " +
         "the title does not licence settling a question the position itself leaves open." },
  { ref: "Mark 2:28", surface: "Son of Man", expect: "son-of-man", status: "guard",
    why: "The Gospel use, which is what the article is about." },
  { ref: "Acts 7:56", surface: "Son of Man", expect: "son-of-man", status: "guard",
    why: "Stephen's vision — the one clear use by someone other than Jesus." },

  { ref: "Matthew 16:16", surface: "the Christ", expect: "the-christ", status: "guard",
    why: "Peter's confession. 'the Christ' is registered as the TITLE; bare 'Christ' (560 " +
         "occurrences, mostly the name 'Jesus Christ') is deliberately not registered." },
  { ref: "John 1:41", surface: "Messiah", expect: "the-christ", status: "guard",
    why: "One of only two places WEB keeps 'Messiah', and the text glosses it as Christ itself." },

  { ref: "Exodus 20:8", surface: "Sabbath day", expect: "sabbath", status: "guard",
    why: "The fuller phrase must win the length tie — 'the Sabbath' is unregistered for this." },
  { ref: "Mark 2:28", surface: "Sabbath", expect: "sabbath", status: "guard",
    why: "Bare 'Sabbath' still covers the rest. Dropping the article form from alternateNames " +
         "is exactly why the surface here is 'Sabbath' and not 'the Sabbath'." },

  { ref: "Acts 4:5", surface: "elders", expect: "jewish-elders", status: "guard",
    why: "Jewish elders in Acts — the sense Robbie scoped the article to." },
  { ref: "Acts 14:23", surface: "elders", expect: null, status: "guard",
    why: "CHRISTIAN congregational elders appointed in every assembly — a different office. " +
         "Acts holds both senses, so these are suppressed verse by verse." },
  { ref: "Acts 15:6", surface: "elders", expect: null, status: "guard",
    why: "The Jerusalem council's 'apostles and elders' — the church office again." },
  { ref: "Revelation 4:4", surface: "elders", expect: null, status: "guard",
    why: "The twenty-four elders around the throne are a third thing entirely. Revelation is " +
         "outside the allowlist and must stay outside it." },
  { ref: "1 Timothy 5:17", surface: "elders", expect: null, status: "guard",
    why: "Congregational elders who 'rule well' — explicitly out of scope per the brief." },

  { ref: "Acts 4:5", surface: "scribes", expect: "scribes", status: "guard",
    why: "Jewish legal scholars." },
  { ref: "Esther 3:12", surface: "scribes", expect: null, status: "guard",
    why: "'The king's scribes' are Ahasuerus's Persian imperial secretaries, not Israel's." },
  { ref: "Matthew 27:1", surface: "chief priests", expect: "chief-priests", status: "guard",
    why: "The plural is NT-only and always this collective. The singular 'chief priest' is " +
         "deliberately unregistered — in the OT it names the high priest as an individual." },

  { ref: "Matthew 14:34", surface: "land of Gennesaret", expect: "gennesaret", status: "guard",
    why: "The PLAIN on the north-west shore — a place, previously unlinked entirely." },
  { ref: "Luke 5:1", surface: "lake of Gennesaret", expect: "sea-of-galilee", status: "guard",
    why: "The LAKE, i.e. the Sea of Galilee. Same name, different referent, and the reason the " +
         "plain could not simply be folded into the lake's alternate names." },
  { ref: "Mark 6:53", surface: "Gennesaret", expect: "gennesaret", status: "guard",
    why: "Bare 'Gennesaret' after a crossing is the shore/plain they moor at." },
  { ref: "Matthew 14:1", surface: "Herod the tetrarch", expect: "herod-antipas", status: "guard",
    why: "Antipas. This wording produced NO link at all before — bare 'Herod' is registered to " +
         "nobody, so all four occurrences were dead text." },
  { ref: "Acts 13:1", surface: "Herod the tetrarch", expect: "herod-antipas", status: "guard",
    why: "Manaen's foster brother — Antipas again, and the one outside the Gospels." },
];

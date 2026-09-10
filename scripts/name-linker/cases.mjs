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
  { ref: "2 Kings 23:11", surface: "Nathan", path: "panel", expect: null, status: "guard",
    why: "'Nathan Melech the officer' — one of Josiah's officials, not the court prophet. The " +
         "reader path never linked it (2 Kings is outside Nathan's book allowlist), but the panel " +
         "path passes no book, so it fell through to the prophet — live on the Nathan-Melech Bulla " +
         "article's own verse list, which linked its own man to somebody else. FIXED by a " +
         "NAME_CONTEXT_RULES pin on a following 'Melech', which works on both paths. Suppressed " +
         "rather than pointed at nathan-melech-bulla: the app's position is that the bulla's owner " +
         "is very probably this man, and a link would show that as certainty." },
  { ref: "2 Kings 23:11", surface: "Nathan", expect: null, status: "guard",
    why: "The same verse on the reader path, where it was already correct. Recorded so the fix " +
         "above cannot be undone by widening Nathan's book allowlist instead." },

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
  // "Zechariah" — three men and a book share the name across our prose, and the app now has
  // records for two of the men: the priest of Luke 1, who owns the bare key, and the post-exilic
  // prophet, added 2026-09-07, who deliberately does not. Of the 32 prose mentions, 12 are the
  // priest, 11 are the prophet, 8 are the BOOK named as a work, and 1 is Zechariah son of
  // Jehoiada. The prophet's 11 are routed by OWNER_NAME_OVERRIDES, except the two that share a
  // record with a mention of the book, which are pinned by phrase in NAME_CONTEXT_RULES.
  //
  // These are prose cases on purpose. Every rule being asserted here fires ONLY on the article
  // surface, and each one is quoted verbatim from the copy it corrects, so a case survives a
  // rewrite of the paragraph the snapshot would silently re-key.
  // ─────────────────────────────────────────────────────────────────────────────────────────

  // ── The prophet, by owner. Seven records, nine mentions.
  { text: "until the prophets Haggai and Zechariah urged Zerubbabel and the high priest Joshua to resume the work",
    surface: "Zechariah", owner: "zerubbabel", expect: "zechariah-the-prophet", status: "guard",
    why: "Zerubbabel's life story names the prophet twice — here, and behind 'Zechariah's vision of a lampstand' two sentences later. Same man, same answer, one owner entry." },
  { text: "Haggai and Zechariah both date their preaching by his regnal years.",
    surface: "Zechariah", owner: "behistun-inscription", expect: "zechariah-the-prophet", status: "guard",
    why: "The Behistun article's point is that Darius's regnal years date the prophets' preaching — which is what makes this man's ministry datable to the month at all." },
  { text: "until two prophets, Haggai and Zechariah, arrived to reignite the people's resolve.",
    surface: "Zechariah", owner: "bib-er-zerubbabels-return", expect: "zechariah-the-prophet", status: "guard",
    why: "The prophet who restarted the stalled temple work, named as one of the two (Ezra 5:1-2)." },
  { text: "the prophets Haggai and Zechariah began preaching urgent, specific challenges to Governor Zerubbabel",
    surface: "Zechariah", owner: "bib-er-second-temple-completed", expect: "zechariah-the-prophet", status: "guard",
    why: "The same pairing in the temple-completion article's first paragraph." },
  { text: "as the Temple that Zechariah, Malachi, and eventually Jesus Himself would walk into.",
    surface: "Zechariah", owner: "bib-er-second-temple-completed", expect: "zechariah-the-prophet", status: "guard",
    why: "Second paragraph of the same article, and the man not the book: books do not walk into temples. Malachi has no record, so he stays unlinked beside him." },
  { text: "Jesus consciously enacts the prophet Zechariah's picture of Israel's king coming",
    surface: "Zechariah", owner: "bib-loc-triumphal-entry", expect: "zechariah-the-prophet", status: "guard",
    why: "The donkey-riding king of Zechariah 9:9. The article calls him 'the prophet Zechariah' in as many words and, until this record existed, linked him to a priest born five centuries later." },
  { text: "Spurred on by the preaching of the prophets Haggai and Zechariah, the people finished the Second Temple",
    surface: "Zechariah", owner: "wld-pg-darius-consolidation", expect: "zechariah-the-prophet", status: "guard",
    why: "Darius's own article, crediting the two prophets with the finished temple (Ezra 6:14-15)." },
  { text: "complete the Second Temple with the encouragement of the prophets Haggai and Zechariah.",
    surface: "Zechariah", owner: "book-intro:Ezra", expect: "zechariah-the-prophet", status: "guard",
    why: "Ezra's book introduction. A book intro can only be corrected at all because BookIntroView passes bookIntroOwnerId(book) as its excludeId." },

  // ── The prophet, by phrase pin. Two records name both the man and the book, and
  // OWNER_NAME_OVERRIDES gives one answer per record; its answer for both is the book's. If
  // either of these two cases starts failing, the copy moved — re-read the sentence and re-pin
  // it in NAME_CONTEXT_RULES. Do not delete the case, and do not widen the owner entry.
  { text: "Satan appears in a similar prosecutorial role in Zechariah's vision, standing at the right hand of the high priest Joshua",
    surface: "Zechariah", owner: "satan", expect: "zechariah-the-prophet", status: "guard",
    why: "Zechariah 3:1-5, in Satan's own article — the man. The record-level answer is null because the SAME record's controversies field names the book (next case)." },
  { text: "Like Haggai, Zechariah encourages the returned exiles to rebuild the temple",
    surface: "Zechariah", owner: "book-intro:Zechariah", expect: "zechariah-the-prophet", status: "guard",
    why: "The only mention of the man in his own book's introduction. Its four manuscript notes name the book, so the record-level answer there is null too." },

  // ── The book named as a work. Eight mentions, and a person link on any of them is false
  // whether or not the person has a record. Writing the prophet's record did not change that.
  { text: "comparatively modest — largely limited to Job, Zechariah, and 1 Chronicles",
    surface: "Zechariah", owner: "satan", expect: null, status: "guard",
    why: "A list of BOOKS where the Hebrew Bible develops Satan, on the same record whose life story names the man. This is the case that fails first if that phrase pin is ever replaced by an owner entry." },
  { text: "Zechariah is preserved among the Dead Sea Scrolls as part of the Book of the Twelve",
    surface: "Zechariah", owner: "book-intro:Zechariah", expect: null, status: "guard",
    why: "A manuscript note about the book. Four of these sit in Zechariah's own introduction alongside the one mention of the man." },
  { text: "its preserved text breaks off in Zechariah, before Malachi",
    surface: "Zechariah", owner: "book-intro:Malachi", expect: null, status: "guard",
    why: "Malachi's introduction describing where the Murabba'at scroll ends — a place in a scroll, not a person." },
  { text: "Ezra, Haggai, Zechariah, and Matthew all consistently call Zerubbabel 'son of Shealtiel,'",
    surface: "Zechariah", owner: "shealtiel", expect: null, status: "guard",
    why: "Four books listed by name. 'Matthew' beside it is the Gospel, not the apostle, for exactly the same reason." },

  // ── The third man. One mention, no record, and one mention does not earn one.
  { text: "even having Jehoiada's own son Zechariah stoned to death in the Temple courtyard",
    surface: "Zechariah", owner: "bib-dkj-joash-reign", expect: null, status: "guard",
    why: "Zechariah son of Jehoiada (2 Chronicles 24:20-22), named with his father in the article's own sentence — not the prophet, and not the priest. No record, so no link." },

  // ── The priest keeps his twelve. Elizabeth's page has no owner entry at all, so it falls to
  // the global default; if a correction above is ever widened past its owner list, or if the
  // prophet is ever given the bare key, this is the case that fails first.
  { text: "Elizabeth was a descendant of Aaron, married to the priest Zechariah, and Luke describes both of them as righteous",
    surface: "Zechariah", owner: "elizabeth-mother-of-john-baptist",
    expect: "zechariah-father-of-john-baptist", status: "guard",
    why: "The father of John the Baptist, on his wife's page. Bare 'Zechariah' is his key and must stay his." },

  // ── The prophet's own page. Two links the record must NOT render.
  { text: "The visions were addressed to a specific, stalled building project. Zechariah told Zerubbabel that the hands which had laid the temple's foundation would also finish it",
    surface: "Zechariah", owner: "zechariah-the-prophet", expect: null, status: "guard",
    why: "Self-link exclusion, spelled out in OWNER_NAME_OVERRIDES rather than left to fall through — without the entry a bare 'Zechariah' on his own page resolves to the priest of Luke 1, a different man." },
  { text: "In the fourth vision he saw Joshua the high priest standing before the angel of the LORD in filthy garments",
    surface: "Joshua", owner: "zechariah-the-prophet", expect: null, status: "guard",
    why: "Joshua son of Jehozadak, high priest of the return — not Joshua son of Nun, who owns the 'joshua' key and is the only Joshua the app has a record for." },

  // ── Scripture. Registering the two patronymics on the record links four verses that had no
  // person link on the reader path at all, and moves four wrong panel-path links off the priest.
  // Everything else the name touches in Scripture is unchanged: bare "Zechariah" is still
  // confined to Luke by BOOK_NAME_ALLOWLIST, so the remaining 39 occurrences stay unlinked for
  // the reader, and 39 (not 43) still fall to the priest on the context-free panel path.
  { ref: "Zechariah 1:1", surface: "Zechariah", expect: "zechariah-the-prophet", status: "guard",
    why: "'Zechariah the son of Berechiah, the son of Iddo, the prophet' — the fullest form the text gives him, and the reason a bare-name allowlist could never have reached it." },
  { ref: "Ezra 5:1", surface: "Zechariah", expect: "zechariah-the-prophet", status: "guard",
    why: "'Zechariah the son of Iddo' — Ezra names him by his grandfather, which Zechariah 1:1 and Nehemiah 12:4, 12:16 together explain." },
  { ref: "Ezra 6:14", surface: "Zechariah", expect: "zechariah-the-prophet", status: "guard",
    why: "The same wording, crediting him and Haggai with the finished temple." },
  { ref: "Ezra 5:1", surface: "Zechariah", path: "panel", owner: "book-intro:Ezra",
    expect: "zechariah-the-prophet", status: "guard",
    why: "The same verse with no book context at all — the panel path. It resolves through the registered patronymic rather than through any override, which is why it now comes out right on both paths." },
  { ref: "Isaiah 8:2", surface: "Zechariah", expect: null, status: "guard",
    why: "'Zechariah the son of Jeberechiah' — a DIFFERENT man in Isaiah's day, and one letter away from the prophet's patronymic. If the matchName on the record is ever loosened, this fails." },
  { ref: "Nehemiah 12:16", surface: "Zechariah", expect: null, status: "guard",
    why: "'of Iddo, Zechariah' — very likely this same prophet, but the text gives only the bare name, which the allowlist confines to Luke. Left unlinked rather than guessed at; noted here so the choice is a choice." },
  { ref: "2 Kings 15:8", surface: "Zechariah", expect: null, status: "guard",
    why: "Zechariah son of Jeroboam, king of Israel — one of some twenty other men in Scripture with the name, none of whom has a record. The allowlist is what keeps them all unlinked." },

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

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // Prose mislinks the same batch introduced, found by reading the PRE-RENDERED public pages
  // rather than the snapshot. All four are the same shape and it is worth naming it: a wrong
  // NEW link is additive, so it arrives in the snapshot looking exactly like an improvement.
  // "Additive only" is not the same as "correct", and nothing in the harness can tell them
  // apart. These are prose cases, so they survive a rewrite of the paragraph they came from.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { text: "A more cautious line, argued at length by Jacob Neusner among others, warns that " +
          "rabbinic sources are late.",
    surface: "Jacob", owner: "topic-pharisees", expect: null, status: "guard",
    why: "JACOB NEUSNER, the 20th-century historian of rabbinic Judaism — not the patriarch. " +
         "The article surface has no book context to catch this, so it is caught by owner." },
  { text: "the name is usually derived from Zadok, the priestly line that served under David " +
          "and Solomon",
    surface: "Zadok", owner: "topic-sadducees", expect: null, status: "guard",
    why: "Zadok the high priest, who has no entry. The only Zadok entry is the man of Matthew's " +
         "genealogy, whose own summary says he is NOT this one. `sadducees` (the people.ts " +
         "group) was already covered; `topic-sadducees` is the article and needed its own." },
  { text: "it is the high priest Ananias who comes down to Caesarea with elders to press the " +
          "charge against him (Acts 24:1).",
    surface: "Ananias", owner: "chief-priests", expect: "ananias-the-high-priest", status: "guard",
    why: "The bare name is registered to Ananias and Sapphira; this is a different man, and one " +
         "the app does have an entry for — so this repoints rather than suppresses." },
  { text: "Peter was born Simon, son of John (or Jonah), and worked as a fisherman.",
    surface: "Jonah", owner: "simon-peter", expect: null, status: "guard",
    why: "PETER'S FATHER, the same man VERSE_NAME_OVERRIDES suppresses at Matthew 16:17 and " +
         "John 1:42 / 21:15-17. Adding the prophet's entry started linking him here too." },
  { text: "the disciples breaking bread 'on the first day of the week' (Acts 20:7), and John " +
          "'in the Spirit on the Lord's day' (Revelation 1:10).",
    surface: "John", owner: "sabbath", expect: "john-the-apostle", status: "guard",
    why: "Revelation 1:10's John, who is not the Baptist under any reading — he had been dead " +
         "some sixty years. Bare 'John' belongs to the Baptist globally, so a new article that " +
         "names him lands wrong until this table is told otherwise." },
  { text: "John states the purpose of his whole book in these terms: 'these are written, that " +
          "you may believe that Jesus is the Christ'.",
    surface: "John", owner: "the-christ", expect: "john-the-apostle", status: "guard",
    why: "The evangelist writing, not the Gospel being named — so this takes the Apostle rather " +
         "than the suppression the 'Gospel of John' phrases get. Same fault as the Sabbath one " +
         "above: the Baptist is the global default and every new article inherits him." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // MODERN PEOPLE CARRYING BIBLICAL FIRST NAMES, and two ordinary English words that are also
  // names. Found by sweeping the corpus for the SHAPE rather than by noticing one on a page:
  // scripts/name-linker/modern-names.mjs, which is the check that now guards this class.
  //
  // Same reason as the batch above for why the snapshot could not have told anyone: every one of
  // these was an ADDITIVE row. They are prose cases so they survive the paragraph being rewritten,
  // which is exactly how the last set of these got reintroduced — reworded away rather than pinned.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { text: "Knox repeatedly clashed directly and dramatically with the Catholic Mary, Queen of " +
          "Scots, in a series of famous confrontations.",
    surface: "Mary", owner: "john-knox", expect: null, status: "guard",
    why: "MARY, QUEEN OF SCOTS — linked to Mary the mother of Jesus. Knox's page names two Tudor " +
         "and Stuart queens called Mary and no Mary of the New Testament; neither has a record." },
  { text: "against female rule aimed at Catholic queens, which later embarrassed him when " +
          "Protestant Elizabeth I came to the English throne.",
    surface: "Elizabeth", owner: "john-knox", expect: null, status: "guard",
    why: "ELIZABETH I OF ENGLAND — linked to Elizabeth the mother of John the Baptist, the only " +
         "Elizabeth the app has. No record for the queen, so no link is the honest answer." },
  { text: "one of nineteen children of Samuel and Susanna Wesley, and was ordained a priest " +
          "after studies at Oxford",
    surface: "Samuel", owner: "john-wesley", expect: null, status: "guard",
    why: "SAMUEL WESLEY, John Wesley's father — linked to the prophet who anointed Saul and " +
         "David. The only Samuel on the record." },
  { text: "In 1562, Teresa founded the Convent of St. Joseph in \u00c1vila as the first house",
    surface: "Joseph", owner: "teresa-of-avila", expect: "joseph-husband-of-mary", status: "guard",
    why: "The convent is named for Joseph of Nazareth; the link went to Joseph son of Jacob. " +
         "Repoints rather than suppresses \u2014 the app has the right man, and this is the same " +
         "call the eight 'St. Peter's Basilica' mentions already get." },

  // "job" and "eve" as ordinary English words. CAPITALISED_ONLY now covers both keys, which costs
  // nothing on either Scripture path (the WEB writes them only as names) and takes eight links out
  // of our own prose. One case per key is enough to pin the rule; the rest are in the snapshot.
  { text: "It is the workmen's account of their own job: while three cubits still remained to be " +
          "cut through, each man's voice could be heard.",
    surface: "job", owner: "siloam-inscription", expect: null, status: "guard",
    why: "The common noun, linking to Job the patriarch. Lowercase, so CAPITALISED_ONLY reaches " +
         "it; capitalised 'Job' on the book's own intro is untouched." },
  { text: "it kept the sacrificial system running without interruption right up to the eve of " +
          "the conquest of Canaan.",
    surface: "eve", owner: "bib-exo-death-of-aaron", expect: null, status: "guard",
    why: "'the eve of' \u2014 linked to Eve, the first woman. Same mechanism as 'job' above; the " +
         "eleven capitalised 'Eve's in the primeval-history articles are untouched." },

  // Two more from the same sweep that are not modern names but are the same shape: a bare forename
  // registered to the wrong ancient man, on a record that names only one bearer.
  { text: "Israel's last king, Hoshea, made the fatal mistake of withholding tribute from Assyria.",
    surface: "Hoshea", owner: "bib-dki-fall-samaria-722", expect: "hoshea-king-of-israel",
    status: "guard",
    why: "HOSHEA KING OF ISRAEL, not Joshua son of Nun \u2014 the bare name is Joshua's globally " +
         "(Numbers 13:16 renames him) and BOOK_NAME_ALLOWLIST confines it to Numbers for the " +
         "reader, but the article surface has no allowlist. Seven centuries out." },
  { text: "Tiberius Claudius Caesar Augustus Germanicus became emperor unexpectedly in AD 41.",
    surface: "Augustus", owner: "claudius-caesar", expect: null, status: "guard",
    why: "The imperial TITLE inside Claudius's own regnal name, linking to Octavian. Mapped to " +
         "claudius-caesar in OWNER_NAME_OVERRIDES, which the self-link exclusion then renders as " +
         "no link \u2014 so `expect` here is null, the same thing a reader sees." },

  // "High Priest Joshua" \u2014 Joshua son of Jehozadak, the high priest of the return, not Joshua
  // son of Nun five centuries earlier. Four records, six mentions; the app has no entry for him.
  { text: "preaching urgent, specific challenges to Governor Zerubbabel and High Priest Joshua, " +
          "promising that the LORD's presence and blessing were tied to finishing the temple.",
    surface: "Joshua", owner: "bib-er-second-temple-completed", expect: null, status: "guard",
    why: "Found by modern-names.mjs on the 'link covers part of a longer capitalised phrase' " +
         "signal. The zechariah-the-prophet entry had already ruled on this man; three more " +
         "records carried the same wrong link and two of them nobody had noticed." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // BOOK TITLES. Ruled 2026-09-09: a book title links to no person, for every book, not only for
  // John. See the header comment above NAME_CONTEXT_RULES in verseAnnotations.ts for the reasoning
  // and for what the ruling deliberately does NOT reach; the escalation that asked for it is in
  // automation/manager-inbox.
  //
  // Measured, not asserted. A sweep of the whole prose corpus for a person-link whose surface is
  // also the name of a book flagged 126 mentions across 25 names. All 126 were read one at a time:
  // 117 links are now suppressed (the 106 flagged ones that were titles, plus four apocryphal
  // "Acts of" the sweep's signals had not been written to catch, and seven bare titles pinned by
  // phrase because a rule in the same sentence had already taken their neighbours), and 20 are
  // deliberately left alone. Every shape has a case here, and so does every keep — the keeps are
  // the half that a careless widening of these rules would break first.
  //
  // The Bible snapshot did not move by a single row, which is the constraint the shapes were
  // designed around rather than a happy result. The four Scripture guards immediately below are
  // the three near-misses that shaped them.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  { ref: "Romans 10:19", surface: "Moses", expect: "moses", status: "guard",
    why: "\"First Moses says, 'I will provoke you to jealousy'\" \u2014 why BOOK_NUMERAL is keyed per " +
         "name and Moses does not get it. A general numeral rule would have taken this link out of " +
         "a live verse to fix a book title in an article." },
  { ref: "2 Chronicles 25:4", surface: "Moses", expect: "moses", status: "guard",
    why: "\"written in the law in the book of Moses\" \u2014 why the Moses rule is BOOKS_OF_PLURAL. " +
         "Scripture writes the SINGULAR five times (here, 2 Chronicles 35:12, Ezra 6:18, " +
         "Nehemiah 13:1, Mark 12:26) and every one keeps its link; only \"the five books of Moses\" " +
         "in our own prose is suppressed." },
  { ref: "1 Kings 4:34", surface: "Solomon", expect: "solomon", status: "guard",
    why: "\"came to hear the wisdom of Solomon\" \u2014 why WISDOM_OR_PSALMS_OF demands a capital W. " +
         "The WEB writes the phrase in lower case five times and means the king's actual wisdom " +
         "every time; the Wisdom of Solomon is a book." },
  { ref: "Revelation 15:3", surface: "Moses", expect: "moses", status: "guard",
    why: "\"They sang the song of Moses, the servant of God\" \u2014 the reason there is no rule for " +
         "\"the Song of Moses\" at all. It is the title of a poem the text says he sang, not of a book." },

  { text: "After Revelation it continues with two more works: the Epistle of Barnabas and part of the " +
          "Shepherd of Hermas. That is worth pausing on. It is not",
    surface: "Barnabas", owner: "codex-sinaiticus", expect: null, status: "guard",
    why: "EPISTLE_OF. The 2nd-century Epistle of Barnabas, bound into Codex Sinaiticus after " +
         "Revelation. Almost nobody has ever thought Paul's companion wrote it, which makes it the " +
         "plainest illustration of the ruling: a title is not an attribution." },
  { text: "The book of Daniel is set almost entirely within Nebuchadnezzar's Babylonian court, " +
          "following Daniel",
    surface: "Daniel", owner: "babylonians", expect: null, status: "guard",
    why: "BOOK_OF. Six mentions across five records read 'the book of Daniel'; the date of that book " +
         "is contested enough that the app argues about it on the Nabonidus cylinder page, and none " +
         "of that argument is visible inside a link." },
  { text: "The Qumran Daniel manuscripts preserve the book's distinctive Hebrew\u2013Aramaic transitions, " +
          "and their",
    surface: "Daniel", owner: "book-intro:Daniel", expect: null, status: "guard",
    why: "QUMRAN_BEFORE. A manuscript note names the book it is a manuscript OF. Recorded in " +
         "reviewed.tsv under the verdict 'book-title' by the modern-name sweep that raised the whole " +
         "question." },
  { text: "he directly quotes a prophecy attributed to Enoch, drawn from 1 Enoch, a Jewish " +
          "apocalyptic writing outside the biblical canon. This use of",
    surface: "Enoch", occurrence: 2, owner: "book-intro:Jude", expect: null, status: "guard",
    why: "BOOK_NUMERAL, on the second Enoch of the sentence. The best single demonstration of the " +
         "rule in the corpus: 'a prophecy attributed to Enoch' is the man and keeps its link, 'drawn " +
         "from 1 Enoch' is the book and loses it, and they are eleven words apart." },
  { text: "he directly quotes a prophecy attributed to Enoch, drawn from 1 Enoch, a Jewish " +
          "apocalyptic writing outside the biblical canon. This use of",
    surface: "Enoch", owner: "book-intro:Jude", expect: "enoch", status: "guard",
    why: "The other half of the pair above, and the reason these rules read the words around the " +
         "match rather than the key. Jude 14 attributes the prophecy to the man; the book quoted is " +
         "a much later work." },
  { text: "Jerome notes that 'because in it he quotes from the apocryphal book of Enoch it is " +
          "rejected by many.'",
    surface: "Enoch", owner: "book-intro:Jude", expect: null, status: "guard",
    why: "BOOK_OF, inside Jerome's remark about why Jude was doubted. Nine Enoch book-titles went; " +
         "the patriarch keeps every mention that is the man." },
  { text: "The book of Esther is set entirely within the Persian court a century or so later, under " +
          "King Ahasuerus",
    surface: "Esther", owner: "persians", expect: null, status: "guard",
    why: "BOOK_OF. Four of these, and Esther is the shape where book and woman are hardest to tell " +
         "apart by eye, which is the argument for reading the words around the match rather than " +
         "trusting the name." },
  { text: "The Masoretic Hebrew text of Ezekiel contains a notable number of difficult passages and " +
          "rare words, making",
    surface: "Ezekiel", owner: "book-intro:Ezekiel", expect: null, status: "guard",
    why: "TEXT_OF. No verse of the WEB contains the phrase 'text of', which is what makes this shape " +
         "safe to key on for every book at once." },
  { text: "The Hebrew and Aramaic text of Ezra is well preserved and stable in the Masoretic " +
          "tradition. The one Qumran witness, 4QEzra",
    surface: "Ezra", owner: "book-intro:Ezra", expect: null, status: "guard",
    why: "TEXT_OF. Two on the Ezra intro, both in manuscript notes about the book." },
  { text: "chapters 40-66, against critical theories of a separate 'Second Isaiah.'",
    surface: "Isaiah", owner: "bib-dkj-isaiah-suffering-servant", expect: null, status: "guard",
    why: "BOOK_NUMERAL. 'Second Isaiah' is a critical hypothesis about a section of the book, and " +
         "this article exists to argue against it; linking the phrase to the prophet contradicted " +
         "the sentence it sat in." },
  { text: "\u2014 was riding in his chariot reading aloud from the scroll of Isaiah, specifically the " +
          "passage about a sheep led silently to slaughter (Isaiah",
    surface: "Isaiah", owner: "ethiopian-eunuch", expect: null, status: "guard",
    why: "SCROLL_OF, retelling Acts 8. The eunuch was reading a scroll, not meeting a man." },
  { text: "Woven through the second half of Isaiah's book are several \"Servant Songs,\" poems " +
          "describing a chosen Servant of the",
    surface: "Isaiah", owner: "bib-dkj-isaiah-suffering-servant", expect: null, status: "guard",
    why: "POSSESSIVE_WORK. 'The second half of Isaiah's book' is the book, and the half in question " +
         "is precisely the half whose authorship is argued about." },
  { text: "Multiple additional Isaiah manuscripts were found at Qumran (including a second, more " +
          "fragmentary scroll from",
    surface: "Isaiah", owner: "book-intro:Isaiah", expect: null, status: "guard",
    why: "MANUSCRIPT_AFTER. The Qumran Isaiah scrolls are copies of the book." },
  { text: "and the assembly follows his lead (Acts 15:13-21). The Epistle of James, with its blunt " +
          "ethical teaching (\"faith without works is dead\"), is traditionally",
    surface: "James", owner: "james-brother-of-jesus", expect: null, status: "guard",
    why: "EPISTLE_OF, and one of three links here that were also plainly WRONG before any ruling: " +
         "all three pointed at James son of Zebedee, whom Herod Agrippa executed in AD 44 (Acts " +
         "12:2) and whom no tradition names as the author. Suppressed rather than repointed to James " +
         "the brother of Jesus, because the point of the ruling is that a title names no author." },
  { text: "Sinaiticus and Vaticanus, both contain the complete text of James.",
    surface: "James", owner: "book-intro:James", expect: null, status: "guard",
    why: "TEXT_OF. Same wrong target as above; same answer." },
  { text: "synagogue leaders soon followed too (Acts 13:42-45). James's letter, written to Jewish " +
          "Christians, even uses 'your synagogue' as the ordinary",
    surface: "James", owner: "synagogue", expect: null, status: "guard",
    why: "POSSESSIVE_WORK. The third of the three." },
  { text: "is equally plain that the edges were not settled. Hebrews, James, and 1-2 Peter are not in " +
          "the surviving text; the Apocalypse of Peter is listed as accepted",
    surface: "James", owner: "muratorian-fragment", expect: null, status: "guard",
    why: "PHRASE PIN. A bare title in a canon list, with no word beside it saying 'book' - the " +
         "neighbouring '1-2 Peter' is caught by BOOK_NUMERAL and this one has nothing to catch. " +
         "Pinned because leaving one of the two linked inside a five-word span is worse than either " +
         "answer. If this case fails, the sentence was rewritten: re-read it and re-pin it, do not " +
         "delete the case." },
  { text: "Strikingly, some Qumran Jeremiah fragments reflect a shorter Hebrew text-form that aligns " +
          "closely with the shorter,",
    surface: "Jeremiah", owner: "book-intro:Jeremiah", expect: null, status: "guard",
    why: "QUMRAN_BEFORE. The 4QJer fragments are copies of the book." },
  { text: "The Septuagint's Jeremiah is roughly one-eighth shorter than the traditional Hebrew and " +
          "arranges",
    surface: "Jeremiah", owner: "book-intro:Jeremiah", expect: null, status: "guard",
    why: "VERSION_BEFORE. A version naming the book it contains - the shortest possible book title, " +
         "and one of the two the modern-name sweep flagged." },
  { text: "Fragments of the Hebrew text of Job were found among the Dead Sea Scrolls at Qumran, " +
          "confirming the book's",
    surface: "Job", owner: "book-intro:Job", expect: null, status: "guard",
    why: "TEXT_OF. 'job' is also in CAPITALISED_ONLY, which reaches the lowercase common noun; this " +
         "is the capitalised book title, which that test cannot see." },
  { text: "The book of Jonah centers entirely on Assyria's capital, Nineveh \u2014 the prophet Jonah, sent " +
          "to warn",
    surface: "Jonah", owner: "assyrians", expect: null, status: "guard",
    why: "BOOK_OF, on the first Jonah of the sentence - 'the prophet Jonah' six words later is the " +
         "man and keeps its link. Another book-and-man pair inside one sentence." },
  { text: "The book of Jonah centers entirely on Assyria's capital, Nineveh \u2014 the prophet Jonah, sent " +
          "to warn",
    surface: "Jonah", occurrence: 2, owner: "assyrians", expect: "jonah", status: "guard",
    why: "The man, in the same sentence as the title above. Whether the book is history or parable " +
         "is a question evangelicals themselves divide on, and nothing here touches it." },
  { text: "scroll (Mur88) contains a well-preserved continuous Hebrew text of Jonah.",
    surface: "Jonah", owner: "book-intro:Jonah", expect: null, status: "guard",
    why: "TEXT_OF." },
  { text: "nothing. That is recognisably the political landscape the books of Joshua and Judges " +
          "describe, minus Israel.",
    surface: "Joshua", owner: "amarna-letters", expect: null, status: "guard",
    why: "BOOK_OF, plural. 'The books of Joshua and Judges describe' is the books describing, and " +
         "Judges beside it is not a person at all." },
  { text: "she \"dwelleth in Israel even unto this day,\" as the text of Joshua puts it (Joshua " +
          "6:22-25).",
    surface: "Joshua", owner: "rahab", expect: null, status: "guard",
    why: "TEXT_OF." },
  { text: "Codex Sinaiticus and Codex Vaticanus both contain the complete Gospel of Luke and are " +
          "among the most important witnesses to its text.",
    surface: "Luke", owner: "book-intro:Luke", expect: null, status: "guard",
    why: "GOSPEL_OF - the exact shape the hand-written 'the Gospel of John' rule has had since this " +
         "table was written, now general." },
  { text: "Nazareth, betrothed to a carpenter named Joseph, when Luke's Gospel records that the angel " +
          "Gabriel appeared to her and announced she would conceive",
    surface: "Luke", owner: "mary-mother-of-jesus", expect: null, status: "guard",
    why: "POSSESSIVE_WORK, and the largest group after Peter: nine 'Luke's Gospel's across the " +
         "person and topic articles." },
  { text: "Mark's Gospel adds an unusual detail: it identifies Simon as \"the father of Alexander and",
    surface: "Mark", owner: "simon-of-cyrene", expect: null, status: "guard",
    why: "POSSESSIVE_WORK." },
  { text: "'He has risen; he is not here' (16:6), stand in the undisputed text of Mark, and the " +
          "bodily resurrection and the appearances of the risen Christ are",
    surface: "Mark", owner: "book-intro:Mark", expect: null, status: "guard",
    why: "TEXT_OF." },
  { text: "The manuscript also lacks two familiar passages: the longer ending of Mark (Mark 16:9-20) " +
          "and the account of the woman caught in adultery (John 7:53-8:11).",
    surface: "Mark", owner: "codex-sinaiticus", expect: null, status: "guard",
    why: "ENDING_OF - one of the two shapes flagged as needing a ruling of its own. Ruled: the book. " +
         "'The longer ending of Mark' names a textual unit INSIDE a book (Mark 16:9-20), so the word " +
         "can only be the book; there is no reading on which it is the man. It would also be an odd " +
         "link to leave standing, since the sentence is about a passage this very article says the " +
         "manuscript does not contain." },
  { text: "'law' in English Bibles) refers most precisely to the five books of Moses \u2014 Genesis, " +
          "Exodus, Leviticus, Numbers, and Deuteronomy \u2014 and by extension",
    surface: "Moses", owner: "torah", expect: null, status: "guard",
    why: "BOOKS_OF_PLURAL - the other shape flagged as needing its own ruling. Ruled: suppress. 'The " +
         "five books of Moses' is the traditional name for the Pentateuch and it names that corpus " +
         "the way 'the Gospel of John' names a Gospel, by its traditional author. Mosaic authorship " +
         "is the most contested authorship question in the Old Testament and evangelicals themselves " +
         "range across it, so a link asserts the strongest form of it where no reader can see the " +
         "argument. PLURAL ONLY: see the two guards below." },
  { text: "In the book of Nehemiah, Ezra reappears as the central figure of a major public reading of " +
          "the",
    surface: "Nehemiah", owner: "ezra", expect: null, status: "guard",
    why: "BOOK_OF." },
  { text: "Theocleia \u2014 a scene drawn from the 2nd-century apocryphal Acts of Paul and Thecla rather " +
          "than from the canonical New Testament text itself. Coordinates",
    surface: "Paul", owner: "grotto-of-st-paul-ephesus", expect: null, status: "guard",
    why: "ACTS_OF. The 2nd-century Acts of Paul and Thecla, which this POI's fresco illustrates and " +
         "which its own sentence calls non-canonical." },
  { text: "2 Peter was the most disputed book in the early church; the historian Eusebius counted it " +
          "among the",
    surface: "Peter", owner: "book-intro:2 Peter", expect: null, status: "guard",
    why: "BOOK_NUMERAL, and the case the whole ruling was argued from. '2 Peter' pointing at Simon " +
         "Peter asserts Petrine authorship in a hyperlink, in the same paragraph where the app's own " +
         "prose says the early church disputed it. Sixteen of these went, and not one of them said " +
         "anything the app was willing to say in words." },
  { text: "James, and 1-2 Peter are not in the surviving text; the Apocalypse of Peter is listed as " +
          "accepted by some and rejected by others; Wisdom is included.",
    surface: "Peter", owner: "muratorian-fragment", expect: null, status: "guard",
    why: "APOCALYPSE_OF. A 2nd-century apocalypse the Muratorian fragment itself records as " +
         "disputed." },
  { text: "spot where later Christian tradition, drawn from the apocryphal Acts of Peter, holds that " +
          "the Apostle Peter, fleeing Rome to escape persecution, encountered",
    surface: "Peter", owner: "appian-way-quo-vadis-rome", expect: null, status: "guard",
    why: "ACTS_OF, on the first Peter of the sentence; 'the Apostle Peter, fleeing Rome' nine words " +
         "later is the man and keeps its link." },
  { text: "spot where later Christian tradition, drawn from the apocryphal Acts of Peter, holds that " +
          "the Apostle Peter, fleeing Rome to escape persecution, encountered",
    surface: "Peter", occurrence: 2, owner: "appian-way-quo-vadis-rome", expect: "simon-peter", status: "guard",
    why: "The man, in the same sentence as the title above." },
  { text: "Despite its brevity, the text of Philemon is stable and consistently attested across the " +
          "Greek manuscripts and the early versions.",
    surface: "Philemon", owner: "book-intro:Philemon", expect: null, status: "guard",
    why: "TEXT_OF, on the book intro for the letter - a page that names both the book and the man it " +
         "was addressed to, which is why this is a context rule and not a record-level answer." },
  { text: "is the earliest surviving witness to the letter. A second Philemon papyrus, P139, dates to " +
          "the fourth century. Beyond these, the letter's attestation",
    surface: "Philemon", owner: "book-intro:Philemon", expect: null, status: "guard",
    why: "MANUSCRIPT_AFTER." },
  { text: "Ephesians, Philippians, Colossians, 1 and 2 Thessalonians, 1 and 2 Timothy, Titus, and " +
          "Philemon \u2014 making him by far the most prolific New Testament author. These letters",
    surface: "Philemon", owner: "paul-of-tarsus", expect: null, status: "guard",
    why: "PHRASE PIN. Paul's own page lists his letters; '1 and 2 Timothy' loses its link to " +
         "BOOK_NUMERAL and 'Titus, and Philemon' has no numeral of its own. Pinned so the list is " +
         "not left half-linked." },
  { text: "Ephesians, Philippians, Colossians, 1 and 2 Thessalonians, 1 and 2 Timothy, Titus, and " +
          "Philemon \u2014 making him by far the most prolific New Testament author. These letters",
    surface: "Titus", owner: "paul-of-tarsus", expect: null, status: "guard",
    why: "PHRASE PIN, the same list as above." },
  { text: "Testament breaks off in Hebrews at chapter 9 verse 14, so 1 and 2 Timothy, Titus, " +
          "Philemon, and Revelation are absent. That absence is physical damage, not a canonical " +
          "statement",
    surface: "Titus", owner: "codex-vaticanus", expect: null, status: "guard",
    why: "PHRASE PIN. Codex Vaticanus's missing final leaves, listed as books." },
  { text: "Testament breaks off in Hebrews at chapter 9 verse 14, so 1 and 2 Timothy, Titus, " +
          "Philemon, and Revelation are absent. That absence is physical damage, not a canonical " +
          "statement",
    surface: "Philemon", owner: "codex-vaticanus", expect: null, status: "guard",
    why: "PHRASE PIN, the same list." },
  { text: "Testament breaks off mid-word at Hebrews 9:14, so 1\u20132 Timothy, Titus, Philemon, and " +
          "Revelation are absent from its surviving fourth-century text (a fifteenth-century",
    surface: "Titus", owner: "book-intro:Philemon", expect: null, status: "guard",
    why: "PHRASE PIN. The same fact told again on the Philemon intro, with an en dash where the " +
         "other has 'and' - which is exactly why phrase pins are written one sentence at a time." },
  { text: "Testament breaks off mid-word at Hebrews 9:14, so 1\u20132 Timothy, Titus, Philemon, and " +
          "Revelation are absent from its surviving fourth-century text (a fifteenth-century",
    surface: "Philemon", owner: "book-intro:Philemon", expect: null, status: "guard",
    why: "PHRASE PIN, the same sentence." },
  { text: "Boaz appears in the book of Ruth as a 'man of standing' (Ruth 2:1) from Bethlehem in " +
          "Judah, a relative of Elimelech,",
    surface: "Ruth", owner: "boaz", expect: null, status: "guard",
    why: "BOOK_OF. Four of these, and Ruth is where the cost of the ruling is most visible: the book " +
         "is named for a woman the app has a good record for, and a reader on Boaz's page might " +
         "reasonably have wanted the link. It still asserted a claim about a book that the app does " +
         "not make in words." },
  { text: "Chronicles draws visibly on the earlier books of Samuel and Kings, and comparison of " +
          "parallel passages lets scholars study how",
    surface: "Samuel", owner: "book-intro:1 Chronicles", expect: null, status: "guard",
    why: "BOOK_OF, plural. 'The books of Samuel' close with events long after the prophet's death, " +
         "so this is closer to a plain category error than to a contested attribution." },
  { text: "1 Samuel traces Israel's transition from the era of the judges to monarchy, centering",
    surface: "Samuel", owner: "book-intro:1 Samuel", expect: null, status: "guard",
    why: "BOOK_NUMERAL." },
  { text: "of Paul, Jude, two letters of John, Revelation, and the Wisdom of Solomon. The writer " +
          "discusses Paul's letters to seven churches as a deliberate",
    surface: "Solomon", owner: "muratorian-fragment", expect: null, status: "guard",
    why: "WISDOM_OR_PSALMS_OF. A book named for a man no tradition claims wrote it. Capital W on " +
         "purpose: the WEB's five lowercase 'wisdom of Solomon's, from 1 Kings 4:34 to Luke 11:31, " +
         "are his actual wisdom and keep their links." },
  { text: "without any messianic person at all. Sources including the Psalms of Solomon, several Dead " +
          "Sea Scrolls, and later rabbinic material each point in somewhat",
    surface: "Solomon", owner: "the-christ", expect: null, status: "guard",
    why: "WISDOM_OR_PSALMS_OF. A first-century BC collection, three centuries after Solomon." },
  { text: "living across all groups in the church. It is a compact companion to 1 Timothy, focused on " +
          "leadership and healthy conduct.",
    surface: "Timothy", owner: "book-intro:Titus", expect: null, status: "guard",
    why: "BOOK_NUMERAL. Nine of these, in every wording the corpus uses: '1 Timothy', '2 Timothy', " +
         "'1 and 2 Timothy', '1 & 2 Timothy' and the en-dashed '1-2 Timothy'." },
  { text: "P32 is especially valuable as early evidence for the text of Titus specifically.",
    surface: "Titus", owner: "book-intro:Titus", expect: null, status: "guard",
    why: "TEXT_OF." },

  // The twenty kept links: the man, not the title. Each one is a boundary of a rule above.
  { text: "agree that the Sadducees gave binding authority to the written Law of Moses and rejected " +
          "the oral tradition the Pharisees maintained. Whether they",
    surface: "Moses", owner: "topic-sadducees", expect: "moses", status: "guard",
    why: "KEPT, and the boundary of the Moses ruling. 'The Law of Moses' names the lawgiver, not the " +
         "author of five scrolls; it is Scripture's own idiom in twenty WEB verses; and this article " +
         "is about what the Sadducees treated as binding, not about who held a pen. Only the PLURAL " +
         "'books of Moses' is suppressed." },
  { text: "produced one of the oldest pieces of poetry in the Bible, the Song of Moses in Exodus 15, " +
          "sung by Moses and the people and then echoed by his sister Miriam and",
    surface: "Moses", owner: "bib-exo-red-sea-crossing", expect: "moses", status: "guard",
    why: "KEPT. 'The Song of Moses' is the traditional title of a poem, not of a book, and the same " +
         "sentence says it was 'sung by Moses and the people'. Revelation 15:3 sings it too." },
  { text: "fiercest opponent into its greatest missionary, and Peter's vision that leads to the " +
          "Gentile Cornelius receiving the Spirit, opening the door to non-Jewish",
    surface: "Peter", owner: "book-intro:Acts", expect: "simon-peter", status: "guard",
    why: "KEPT. Acts 10: a sheet let down from heaven, seen by a man. POSSESSIVE_WORK is " +
         "deliberately not given to Peter, and this is why." },
  { text: "preached in the synagogue and declared himself the fulfillment of Isaiah's prophecy, an " +
          "enraged crowd tried to hurl him off the cliff, only for him to pass",
    surface: "Isaiah", owner: "mount-precipice", expect: "isaiah", status: "guard",
    why: "KEPT. A prophecy is something a prophet utters. POSSESSIVE_WORK lists only words that NAME " +
         "THE WORK - Gospel, book, letter, epistle, text, scroll - for exactly this reason, which is " +
         "the same narrowness the hand-written John rule already had: 'John's Gospel' is the book, " +
         "'John's baptism' is the man." },
  { text: "2:16-18). Matthew frames this atrocity as fulfilling Jeremiah's prophecy of Rachel weeping " +
          "for her children (Jeremiah 31:15), and the entire sequence",
    surface: "Jeremiah", owner: "magi", expect: "jeremiah", status: "guard",
    why: "KEPT, same reason." },
  { text: "Gabriel first appears in Daniel's visions as an interpreter sent to explain what Daniel " +
          "has seen: a heavenly voice",
    surface: "Daniel", owner: "gabriel-archangel", expect: "daniel", status: "guard",
    why: "KEPT. Daniel is the one who saw them, and the sentence goes on to say 'what Daniel has " +
         "seen'." },
  { text: "That final confession is the real point of Daniel's account: the mightiest king of the " +
          "most religiously impressive empire on earth,",
    surface: "Daniel", owner: "rel-ane-nebuchadnezzar-marduk-cult", expect: "daniel", status: "guard",
    why: "KEPT, and the closest call in the batch. 'X's account' is not a title, and an account is " +
         "something a man gives. Judged the same way for Luke and Nehemiah below so the three are " +
         "consistent; if that reading is ever revisited it should be revisited for all three at " +
         "once." },
  { text: "cutting off his right ear, Jesus rebuked Peter and (in Luke's account) healed the ear " +
          "(John 18:10, Luke 22:50-51).",
    surface: "Luke", owner: "malchus", expect: "luke-evangelist", status: "guard",
    why: "KEPT. 'In Luke's account' beside 'Luke 22:50-51' is the historian, not the title. 'Luke's " +
         "Gospel' in nine other articles is suppressed, and the two cases together are the whole " +
         "distinction." },
  { text: "reflect the reduced scale of the post-exilic city that Nehemiah's account describes.",
    surface: "Nehemiah", owner: "book-intro:Nehemiah", expect: "nehemiah", status: "guard",
    why: "KEPT, same reading as the two above." },
  { text: "Ephesians, Philippians, Colossians, and the short personal letter to Philemon - " +
          "collectively called the \"Prison Epistles.\" These letters show a man",
    surface: "Philemon", owner: "bib-ac-paul-first-roman-imprisonment", expect: "philemon", status: "guard",
    why: "KEPT. The letter was written TO Philemon, a man in Colossae. The three Philemon phrase " +
         "pins above suppress the book inside canon lists; this is the man in the same corpus, and " +
         "the ruling does not touch him." },

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // MODERN WORK TITLES. Ruled 2026-09-10, and it is the ruling directly above carried forward from
  // the canon to a modern bibliography: a person's name inside the title of a modern book, article
  // or journal links to no person. Stronger here than for a biblical book, because there is no
  // reading on which the word is the man — «Abraham in History and Tradition» is a 1975 Yale
  // monograph, and pointing a reader at the patriarch from a bibliographic reference is wrong
  // rather than merely opinionated.
  //
  // The suppression is a phrase pin on the TITLE (NAME_CONTEXT_RULES in verseAnnotations.ts), not
  // a pattern: nothing in the surrounding words says "this is a title". These cases are the whole
  // protection that pin has, since a phrase pin is undone in silence the day someone rewords the
  // sentence — and the two KEEPS below are the half a widened rule breaks first. Both are drawn
  // from the SAME article as the suppression, on purpose.
  { text: "That argument was dismantled, and it is worth saying so plainly. T. L. Thompson's The " +
          "Historicity of the Patriarchal Narratives (1974) and J. Van Seters's Abraham in History " +
          "and Tradition (1975) showed that the parallels were generic rather than specific",
    surface: "Abraham", owner: "mari-tablets", expect: null, status: "guard",
    why: "The title of John Van Seters's 1975 monograph, not the patriarch. This is the candidate " +
         "that turned test:linker red on origin/main at 2ebb912, and the first modern-work title " +
         "in the corpus to carry a live link." },
  { text: "W. F. Albright, Nelson Glueck and E. A. Speiser pointed to nomadic social patterns, " +
          "personal names of the same formation as Abraham's, and customs of adoption and " +
          "inheritance that seemed to explain otherwise puzzling episodes in Genesis.",
    surface: "Abraham", owner: "mari-tablets", expect: "abraham", status: "guard",
    why: "KEPT, in the same article and two paragraphs from the suppression. This is the man: it " +
         "is his name whose FORMATION the sentence is about. Any rule that reached this — an " +
         "author-surname rule, a nearby-year rule — would be too wide." },
  { text: "The second is that something real survives: Mari does not corroborate Abraham, but it " +
          "does demonstrate that the world Genesis places him in — tribal, mobile, treaty-bound, " +
          "literate, full of gods",
    surface: "Abraham", owner: "mari-tablets", expect: "abraham", status: "guard",
    why: "KEPT. The article's own conclusion about the patriarch, in a paragraph that also carries " +
         "a modern date. The suppression is keyed to the title string alone and must not reach it." },

  // The second modern work title in the corpus, added with the Jerusalem archaeology batch. Same
  // ruling, same shape of pin, same pair of KEEPs from the same article — because a rule keyed on
  // "King" or on a nearby year would eat every other David in it, and the article is about David.
  { text: "I. Finkelstein, L. Singer-Avitz, Z. Herzog and D. Ussishkin published a joint response " +
          "in Tel Aviv in 2007 under the title \"Has King David's Palace in Jerusalem been Found?\" " +
          "Their answer is no",
    surface: "David", owner: "large-stone-structure", expect: null, status: "guard",
    why: "The title of a 2007 Tel Aviv article, not the king. Pinned by the title string in " +
         "NAME_CONTEXT_RULES under the MODERN WORK TITLES ruling of 2026-09-10." },
  { text: "2 Samuel 5:11 and 1 Chronicles 14:1 both report that Hiram of Tyre sent David cedar, " +
          "carpenters and masons, and that they built David a house.",
    surface: "David", owner: "large-stone-structure", expect: "david", status: "guard",
    why: "KEPT, in the same article. This is the king, in the app's own prose about him. Any rule " +
         "wide enough to reach it would strip the article of every link it should have." },
  { text: "even the scholars most willing to accept a tenth-century date mostly do not accept " +
          "\"David's palace\" — because a date is not an owner",
    surface: "David", owner: "large-stone-structure", expect: "david", status: "guard",
    why: "KEPT. Quotation marks and the words \"David's palace\" again, but this is the app " +
         "discussing the claim about the king, not citing a title. The pin is the full title " +
         "string, and it must not reach this." },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // QUOTED INSCRIPTIONS ON DISPUTED OBJECTS, plus two modern surnames that are also places.
  // Added with the forgeries batch, 2026-09-10. Same mechanism as the block above — phrase pins in
  // NAME_CONTEXT_RULES — and the same reason for pinning them here: a phrase pin is undone in
  // silence the day someone rewords the sentence it sits in, and these cases are its only cover.
  //
  // The Talpiot tomb's whole argument is that a cluster of very common names identifies nobody. So
  // the ossuary readings link to nobody, and the KEEPS below are the links the same article should
  // and does make.
  { text: "Five of the six inscriptions are in Hebrew or Aramaic and are usually rendered Jesus " +
          "son of Joseph, Maria, Mattia, Joseh, and Judah son of Jesus.",
    surface: "Jesus", owner: "talpiot-tomb", expect: null, status: "guard",
    why: "A quoted ossuary inscription. Linking it to Jesus of Nazareth would assert on the " +
         "reader's behalf the identification the article says the evidence does not support." },
  { text: "Five of the six inscriptions are in Hebrew or Aramaic and are usually rendered Jesus " +
          "son of Joseph, Maria, Mattia, Joseh, and Judah son of Jesus.",
    surface: "Joseph", owner: "talpiot-tomb", expect: null, status: "guard",
    why: "Same inscription. Without the pin this resolves to Joseph son of Jacob, the global " +
         "default, which is wrong on every reading of the ossuary." },
  { text: "usually rendered Jesus son of Joseph, Maria, Mattia, Joseh, and Judah son of Jesus.",
    surface: "Jesus", occurrence: 2, owner: "talpiot-tomb", expect: null, status: "guard",
    why: "The second inscribed name in the same sentence, pinned by its own phrase." },
  { text: "The Lost Tomb of Jesus aired on the Discovery Channel days later, and a book followed.",
    surface: "Jesus", owner: "talpiot-tomb", expect: null, status: "guard",
    why: "A 2007 documentary's title. The MODERN WORK TITLES ruling above, applied to a film." },
  { text: "a man from outside Judea is normally identified by his town, as Jesus of Nazareth is " +
          "throughout the Gospels, rather than by his father",
    surface: "Jesus of Nazareth", owner: "talpiot-tomb", expect: "jesus-of-nazareth",
    status: "guard",
    why: "KEPT, in the same article. This is the man, and the sentence is about how the Gospels " +
         "name him. Any rule wide enough to reach this would be too wide." },
  { text: "It was reported, and a salvage excavation ran from 28 March to 14 April under permit " +
          "number 938: Y. Gath of the Department of Antiquities directed it, with A. Kloner and " +
          "E. Braun, and S. Gibson drew the plans.",
    surface: "Gath", owner: "talpiot-tomb", expect: null, status: "guard",
    why: "Yosef Gath, the excavator. Gath is also a Philistine city with a map record, and " +
         "without the pin his surname sends the reader to the Shephelah." },
  { text: "The Garden Tomb is a rock-cut tomb near a skull-shaped rocky outcropping outside " +
          "Jerusalem's Damascus Gate, promoted since the 19th century as an alternative site",
    surface: "Damascus", owner: "garden-tomb", expect: null, status: "guard",
    why: "A gate of Jerusalem's Old City, not the Syrian city. This link WAS live before the " +
         "forgeries batch pinned the phrase — it is the one prose row that left the snapshot " +
         "on that commit." },
  { text: "he excavated a chamber beneath the stone escarpment near the Damascus Gate in " +
          "Jerusalem and found the ark of the covenant there",
    surface: "Damascus", owner: "ron-wyatt-claimed-discoveries", expect: null, status: "guard",
    why: "The same gate, in the article that made the pin necessary." },
  { text: "It is 50.5 cm along its base, and along one side run two lines of Aramaic: Ya'akov " +
          "bar Yosef akhui di Yeshua.",
    surface: "Yeshua", owner: "james-ossuary", expect: "jesus-of-nazareth", status: "guard",
    why: "DELIBERATELY NOT SUPPRESSED, and recorded so the difference from Talpiot is not read " +
         "as an oversight. What is disputed about this object is whether the words are ancient, " +
         "not who they would mean if they are." },

  // ── THE JUDEAN DESERT MANUSCRIPT ARTICLES ──────────────────────────────────────────────────
  //
  // Six pins added with the Qumran manuscript batch, plus one matchName that is not a pin at all.
  // Every one was found by enumerating the links the new prose renders BEFORE committing, with
  // scripts/name-linker/probe.mjs, rather than by reading a snapshot diff afterwards. The rest of
  // that batch's collisions were fixed by writing scholars' names with initials, which is why
  // "J. A. Sanders", "J. D. G. Dunn", "E. Qimron", "J. Strugnell", "P. W. Flint", "J. M. Allegro",
  // "S. Schechter", "T. H. Lim", "J. A. Fitzmyer" and "P. Kahle" appear in that form and must
  // stay that way — spelling any of them out again re-opens the link this file is guarding.
  { text: "Kando resold his four — this one, the Habakkuk Pesher, the Community Rule and a " +
          "fourth so brittle it could not be opened for years — to Mar Athanasius Yeshue Samuel " +
          "of St Mark's Monastery in Jerusalem",
    surface: "Samuel", owner: "great-isaiah-scroll", expect: null, status: "guard",
    why: "Mar Athanasius Yeshue Samuel, the Syriac Orthodox metropolitan who bought four of the " +
         "seven Cave 1 scrolls. Without the pin his surname sends the reader to the prophet." },
  { text: "In the 1890s S. Schechter, then Reader in Talmudic at Cambridge, brought back to " +
          "England the contents of the genizah — the disused-manuscript store — of the Ben Ezra " +
          "synagogue in Old Cairo",
    surface: "Ezra", owner: "damascus-document", expect: null, status: "guard",
    why: "The Ben Ezra synagogue in Old Cairo, not the scribe of the return." },
  { text: "In 2025 the same group published the Enoch model, trained on radiocarbon-dated " +
          "manuscripts, which dates both halves of this scroll consistently between 180 and 100 BC.",
    surface: "Enoch", owner: "great-isaiah-scroll", expect: null, status: "guard",
    why: "A 2025 handwriting-dating program named after the patriarch and not about him. The " +
         "MODERN WORK TITLES ruling, applied to a piece of software." },
  { text: "then Shemaryahu Talmon, then M. H. Goshen-Gottstein under the title",
    surface: "Goshen", owner: "great-psalms-scroll", expect: null, status: "guard",
    why: "M. H. Goshen-Gottstein. Goshen is also a region of Egypt with a map record — the " +
         "Y. Gath case again, a modern surname swallowing a location's key." },
  { text: "He put the case for treating the manuscript as a whole this way in an article whose " +
          "title asks the question outright, \"4QMidrash Samuel?\", and has restated it since.",
    surface: "Samuel", owner: "4qsamuel-a", expect: null, status: "guard",
    why: "The title of A. Rofe's 1998 Textus article. MODERN WORK TITLES, and the article it " +
         "sits in is about a manuscript of the book rather than about the prophet." },
  // NOT a suppression. `temple-scroll` carries the matchName "the Temple Scroll" because matching
  // runs left to right: where the prose reads "the Temple Scroll", the existing "the Temple" topic
  // entry starts one character earlier and wins the position, so the article about the scroll was
  // sending readers to the article about the building. Registering the longer wording at the same
  // start takes the position back. If this case starts resolving to `the-temple`, the matchName
  // has been dropped.
  { text: "The Temple Scroll is the longest manuscript from the Qumran caves: eighteen sheets of " +
          "parchment, three or four columns to a sheet, running to 8.146 metres.",
    surface: "The Temple Scroll", owner: "great-isaiah-scroll", expect: "temple-scroll",
    status: "guard",
    why: "Read on a foreign owner so the self-link exclusion does not mask it. Without the " +
         "matchName this resolves to the-temple." },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // MANUSCRIPT SIGLA, and one scholar's name inside a quotation. Added with the papyri-and-uncials
  // batch, 2026-09-10.
  //
  // The 66 book introductions write these papyri as "Papyrus 46 (P46)", and both halves are
  // registered names of the same record. Without the rules in NAME_CONTEXT_RULES the reader gets
  // two adjacent links to the same article. The pins suppress the bracketed siglum and leave the
  // longer form linked; these cases are the only thing that would notice if either half moved.
  { text: "Papyrus 46 (P46), the Chester Beatty biblical papyrus dated to roughly around AD 200, " +
          "is the earliest substantial manuscript of the Pauline letters",
    surface: "Papyrus 46", owner: "book-intro:Romans", expect: "chester-beatty-papyri",
    status: "guard",
    why: "The expanded form carries the link. Registered as a matchName on the Chester Beatty " +
         "record because P46 is one codex of eleven — it is not an \"also called\" for the group." },
  { text: "Papyrus 46 (P46), the Chester Beatty biblical papyrus dated to roughly around AD 200, " +
          "is the earliest substantial manuscript of the Pauline letters",
    surface: "P46", owner: "book-intro:Romans", expect: null, status: "guard",
    why: "The bracketed siglum immediately after its own expanded name. Suppressed so the sentence " +
         "renders one link and not two. If this starts resolving, the book introductions have " +
         "gone back to double-linking nine of their fourteen P46 mentions." },
  { text: "Significantly, the words 'in Ephesus' in the opening verse are absent from several of " +
          "the earliest and most important witnesses, including P46 and the original hands of " +
          "Codex Sinaiticus and Codex Vaticanus",
    surface: "P46", owner: "book-intro:Ephesians", expect: "chester-beatty-papyri", status: "guard",
    why: "KEPT. A BARE siglum, not preceded by its expanded name, so the pin must not reach it. " +
         "This is the half that a rule keyed on anything looser than the exact phrase breaks." },
  { text: "The story of the woman caught in adultery (traditionally John 7:53-8:11) is absent " +
          "from the earliest and best manuscripts, including P66, P75, Sinaiticus, and Vaticanus",
    surface: "P75", owner: "book-intro:John", expect: "papyrus-75", status: "guard",
    why: "KEPT, in the same shape as the Ephesians case and for the same reason." },
  // A living New Testament scholar's forename, inside a sentence quoted verbatim from the Egypt
  // Exploration Society. The article's own prose writes him "D. B. Wallace" per the house rule
  // that scholars get initials, which fixed every other occurrence; a quotation cannot be
  // reworded to suit the linker, so this one is pinned on the phrase.
  { text: "The EES has no knowledge of, and has never seen, the NDA which Professor Daniel " +
          "Wallace says someone required him to sign about the unpublished Mark fragment.",
    surface: "Daniel", owner: "papyrus-137-first-century-mark", expect: null, status: "guard",
    why: "Daniel B. Wallace of Dallas Theological Seminary, not the prophet. Found by " +
         "modern-names.mjs on the commit that added the article, which is what that sweep is for." },

  // ── BOOK TITLES IN MANUSCRIPT ARTICLES, and the KEEPs beside them ────────────────────────────
  //
  // Added 2026-09-10 with the papyri-and-uncials batch, which found the fault by enumerating every
  // link its own twelve articles rendered and reading them one by one. Fourteen bare "John"s were
  // resolving to the BAPTIST from sentences about the Fourth Gospel — the four Gospels listed in
  // an order, "the John gap", "P5 is John". Most were fixed by rewording; the three shapes below
  // could not be, because two are lists whose whole content is names and one is inside a quotation.
  { text: "The Gospels stand in what is called the Western order \u2014 Matthew, John, Luke, Mark \u2014 " +
          "the same order Codex Bezae uses.",
    surface: "John", owner: "codex-washingtonianus", expect: null, status: "guard",
    why: "A Gospel in a list of Gospels, which is a book title. Without the pin this is John the " +
         "Baptist, on an article about a codex of the four Gospels." },
  { text: "gives the four Gospels in the order Matthew, John, Mark, Luke, then ten letters of Paul",
    surface: "John", owner: "codex-claromontanus", expect: null, status: "guard",
    why: "The Claromontanus canon list's own Gospel order. Pinned separately from the Western " +
         "order above because the last two names are the other way round." },
  { text: "H. A. Sanders concluded that W's parent \"was made up out of six separate parts\" — " +
          "Matthew; John from 5:12 on; Luke 1-8:12; Luke from 8:13 on; Mark 1-5:30; Mark from 5:31 on",
    surface: "John", owner: "codex-washingtonianus", expect: null, status: "guard",
    why: "Inside a quotation the app does not own, so rewording was not available. Sanders is " +
         "listing books, not men." },
  { text: "the letter of James, the letters of John, the letter of Jude, the Epistle of Barnabas, " +
          "the Apocalypse of John, Acts, the Shepherd of Hermas",
    surface: "John", occurrence: 2, owner: "codex-claromontanus", expect: null, status: "guard",
    why: "\"The Apocalypse of John\". APOCALYPSE_OF was on `peter` and not on `john` until this " +
         "batch; `peter` has carried it since the Muratorian article." },
  { text: "In 1969, for the visit of Pope Paul VI to Geneva, Martin Bodmer presented him with " +
          "\"four papyrus sheets from a codex bearing the two Epistles of Peter\"",
    surface: "Peter", owner: "papyrus-72", expect: null, status: "guard",
    why: "A book title inside the Fondation Martin Bodmer's own sentence. 2 Peter's authorship is " +
         "the most disputed in the New Testament, which is exactly why a title must not name an " +
         "author here." },
  { text: "with the dedication \"That the letters of Peter may return to Peter's house.\"",
    surface: "Peter", occurrence: 2, owner: "papyrus-72", expect: "simon-peter", status: "guard",
    why: "KEPT, and it is the whole point of the pair. The FIRST \"Peter\" in this dedication is a " +
         "book title and is suppressed; the second is the Apostle, whose house Rome is. One " +
         "sentence, two senses, and any rule wide enough to take the second is too wide." },
  { text: "presented a NT comprised of an alternative list of 27 books which included 23 of the " +
          "now-canonical NT texts... as well as Barnabas, the Shepherd, the Acts of Paul and the " +
          "Revelation of Peter",
    surface: "Barnabas", owner: "codex-claromontanus", expect: null, status: "guard",
    why: "The Epistle of Barnabas, bare inside a list, in a sentence quoted verbatim from " +
         "K. G. Rodenbiker. The article's own prose writes \"the Epistle of Barnabas\", which " +
         "EPISTLE_OF already covers; a quotation cannot be reworded to suit the linker." },
  { text: "the Acts of Paul and the Revelation of Peter\", and that this \"demonstrates a lasting " +
          "interest in alternative scriptural texts",
    surface: "Peter", owner: "codex-claromontanus", expect: null, status: "guard",
    why: "The apocryphal Apocalypse of Peter, written \"Revelation of\" inside the same quotation." },
  { text: "At Acts 12:10, when the angel leads Peter out of prison, Bezae adds that they went down " +
          "seven steps.",
    surface: "Peter", owner: "codex-bezae", expect: "simon-peter", status: "guard",
    why: "KEPT. The Apostle, in the app's own narrative sentence about him. The three title rules " +
         "added to `peter` with this batch must not reach an ordinary mention of the man." },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // MASORETIC AND MEDIEVAL HEBREW MANUSCRIPTS, 2026-09-10. Every case below pins a rule added
  // with that batch, and every one of those rules was found by ENUMERATING what the new articles
  // render — scripts/name-linker/links-for.mjs — rather than by reading a snapshot diff. A wrong
  // link in a new article is invisible to the snapshot by construction: it arrives as a row that
  // was not there before, and so does every good link the article brings with it.
  //
  // The KEEPs matter as much as the suppressions here. Three of these rules are patterns rather
  // than pins, which is unusual in this file, and the KEEPs are what stops a later widening.
  // ─────────────────────────────────────────────────────────────────────────────────────────

  // ── The Hebrew patronymic: "<Name> ben <Name>" and its abbreviation "<Name> b. <Name>" ──────
  { text: "The well-known Masorete... Aharon Ben Asher added the vowels, the cantillation marks",
    surface: "Aharon", owner: "aleppo-codex", expect: null, status: "guard",
    why: "Aaron ben Asher the Masorete of Tiberias, not Aaron the brother of Moses. This link was " +
         "LIVE on `masoretic-text` before this batch and is the one row prose-links.tsv lost." },
  { text: "vocalised, on the testimony of a colophon added about a century later, by Aaron ben Asher himself",
    surface: "Aaron", owner: "masoretic-text", expect: null, status: "guard",
    why: "The same man on the umbrella article, which is where the live fault was." },
  { text: "\"Samuel b. Jacob wrote, vocalised and provided the masora.\"",
    surface: "Samuel", owner: "leningrad-codex", expect: null, status: "guard",
    why: "The scribe of the Leningrad Codex, inside his own colophon as B. Outhwaite translates " +
         "it. The abbreviated \"b.\" is why the rule covers that form: a quotation may not be " +
         "reworded to suit the linker." },
  { text: "\"Samuel b. Jacob wrote, vocalised and provided the masora.\"",
    surface: "Jacob", owner: "leningrad-codex", expect: null, status: "guard",
    why: "The other half of the same patronymic — the scribe's father, not the patriarch." },
  { text: "The colophons with the names of Moses b. Asher and of Yacbez b. Solomon were written by a scribe",
    surface: "Moses", owner: "cairo-codex-of-the-prophets", expect: null, status: "guard",
    why: "Moses ben Asher of Tiberias, inside J. L. Teicher's 1950 sentence as B. Outhwaite " +
         "reproduces it." },
  { text: "The colophons with the names of Moses b. Asher and of Yacbez b. Solomon were written by a scribe",
    surface: "Solomon", owner: "cairo-codex-of-the-prophets", expect: null, status: "guard",
    why: "The eleventh-century Karaite who paid for the codex, not the king." },
  { text: "\"From Simeon ben Koseba to Yeshua ben Gilgola and the men of your company, greeting!",
    surface: "Yeshua", owner: "bar-kokhba-letters", expect: null, status: "guard",
    why: "A rebel officer at Wadi Murabba'at. \"Yeshua\" is a registered alternate name for Jesus " +
         "of Nazareth, so without the rule this letter linked its addressee to Christ." },
  { text: "\"From Simeon ben Koseba to Yeshua ben Gilgola and the men of your company, greeting!",
    surface: "Simeon", owner: "bar-kokhba-letters", expect: null, status: "guard",
    why: "Shimon ben Kosiba, leader of the second revolt, not Simeon at the Temple." },
  // KEEPs. The patronymic rules are PATTERNS, and these are what a widening breaks first.
  { ref: "Genesis 42:24", surface: "Simeon", path: "panel", expect: "simeon-at-the-temple", status: "guard",
    why: "KEPT. Scripture never writes \" ben \" as a free-standing word — 0 of 31,098 WEB verses " +
         "— so the patronymic rules cannot reach a Bible verse. This is the check on that claim. " +
         "(That bare \"Simeon\" in Genesis resolves to the man in Luke 2 is a separate, " +
         "pre-existing panel-path fault and is not this batch's to fix.)" },
  { ref: "Matthew 16:17", surface: "Simon", expect: "simon-peter", status: "guard",
    why: "KEPT, and it is the reason `simon` gets a narrow \"bar Ko\" rule instead of a \"bar\" " +
         "one: the WEB writes \"Simon Bar Jonah\" here, and a loose patronymic rule would take " +
         "the apostle's own confession." },
  { text: "fall of Betar and death of Simon bar Kosiba",
    surface: "Simon", owner: "wld-rom-bar-kokhba-revolt", expect: null, status: "guard",
    why: "The rebel leader in the timeline article's dating notes, resolving to Simon Peter since " +
         "the article was published — one live row in prose-links.tsv, and the second of the two " +
         "this batch removes." },

  // ── Book titles listed in a row: the Prophets, as the Cairo Codex contains them ─────────────
  { text: "The Cairo Codex contains the Prophets entire — Joshua, Judges, Samuel and Kings, then " +
          "Isaiah, Jeremiah, Ezekiel and the Twelve",
    surface: "Joshua", owner: "cairo-codex-of-the-prophets", expect: null, status: "guard",
    why: "A list of BOOK titles, and five of the names in it were resolving to people. Same " +
         "ruling and same mechanism as the \"Matthew, John, Luke, Mark\" pins in `john`: an " +
         "exact phrase, because the only thing that says \"these are books\" is that they are in " +
         "a list of books." },
  { text: "The Cairo Codex contains the Prophets entire — Joshua, Judges, Samuel and Kings, then " +
          "Isaiah, Jeremiah, Ezekiel and the Twelve",
    surface: "Samuel", owner: "cairo-codex-of-the-prophets", expect: null, status: "guard",
    why: "Same list." },
  { text: "The Cairo Codex contains the Prophets entire — Joshua, Judges, Samuel and Kings, then " +
          "Isaiah, Jeremiah, Ezekiel and the Twelve",
    surface: "Ezekiel", owner: "cairo-codex-of-the-prophets", expect: null, status: "guard",
    why: "Same list. Ezekiel and Jeremiah both had live person links here before the pin." },
  { text: "carrying parts of six books: Jonah, Micah, Nahum, Habakkuk, Zephaniah and Zechariah.",
    surface: "Jonah", owner: "greek-minor-prophets-scroll", expect: null, status: "guard",
    why: "The six of the Twelve this scroll preserves — book titles. Bare \"Jonah\" was the " +
         "prophet and bare \"Zechariah\" was the father of John the Baptist." },
  { text: "carrying parts of six books: Jonah, Micah, Nahum, Habakkuk, Zephaniah and Zechariah.",
    surface: "Zechariah", owner: "greek-minor-prophets-scroll", expect: null, status: "guard",
    why: "Same list, and the more damaging of the two: it was resolving to Zechariah the father " +
         "of John the Baptist, who has nothing to do with the book." },
  { text: "the surviving volume all sheets with the text of Isaiah are still present",
    surface: "Isaiah", owner: "aleppo-codex", expect: null, status: "guard",
    why: "The book, inside a sentence quoted verbatim from P. Sanders. TEXT_OF, added to `isaiah` " +
         "with this batch for exactly this quotation." },
  { text: "recovered virtually the complete codex except for some sheets of Deuteronomy and Isaiah " +
          "is problematic",
    surface: "Isaiah", owner: "aleppo-codex", expect: null, status: "guard",
    why: "The book again, eleven words earlier in the same quotation, where TEXT_OF cannot reach " +
         "it. A phrase pin, because a rule for \"<unit> of <Book> and <Book>\" cannot tell where " +
         "the list ends." },
  { ref: "Isaiah 1:1", surface: "Isaiah", expect: "isaiah", status: "guard",
    why: "KEPT. The prophet, in his own superscription. Neither addition to `isaiah` can reach " +
         "Scripture: TEXT_OF needs \"the text of\" and the other is an exact phrase from a " +
         "twenty-first-century book review." },

  // ── Modern work titles, the ruling of 2026-09-10 carried forward ───────────────────────────
  { text: "It is an epithet, and the Jewish Encyclopedia states its status precisely",
    surface: "Jewish", owner: "bar-kokhba-letters", expect: null, status: "guard",
    why: "The 1901-1906 reference work. A title does not name whoever it is named after — the " +
         "same ruling as \"Abraham in History and Tradition\", one shelf along." },
  { text: "and Jewish sources call him Ben (or Bar) Koziba or Kozba",
    surface: "Jewish", owner: "bar-kokhba-letters", expect: "jews", status: "guard",
    why: "KEPT, eleven words after the suppression, in the same quotation. Here \"Jewish\" is the " +
         "people and the link is right. This is the check that the pin above stayed a pin: it is " +
         "an exact phrase and cannot reach an ordinary adjective." },
  { text: "the case still made for the Teacher Hymns hypothesis is M. C. Douglas's, in Dead Sea " +
          "Discoveries in 1999",
    surface: "Dead Sea", owner: "thanksgiving-hymns", expect: null, status: "guard",
    why: "The journal, not the sea. Modern work titles again, and the first JOURNAL name in this " +
         "corpus to have carried a live link." },
  { text: "Les Devanciers d'Aquila, the forerunners of Aquila of Sinope",
    surface: "Aquila", occurrence: 1, owner: "greek-minor-prophets-scroll", expect: null, status: "guard",
    why: "D. Barthelemy's 1963 book title." },
  { text: "Les Devanciers d'Aquila, the forerunners of Aquila of Sinope",
    surface: "Aquila", occurrence: 2, owner: "greek-minor-prophets-scroll", expect: null, status: "guard",
    why: "Aquila of Sinope the translator — a DIFFERENT MAN from Aquila the tentmaker of Acts 18, " +
         "who owns the key. No record exists for the translator, so a suppression is the only " +
         "honest answer: no link says nothing, a link to the tentmaker says something false." },
  { ref: "Acts 18:2", surface: "Aquila", expect: "aquila", status: "guard",
    why: "KEPT. Priscilla's husband, in his own verse. Neither `aquila` rule can reach it: " +
         "no WEB verse contains \"Aquila of\", and the other rule is a phrase pin on a book title." },

  // ── Two more that a pattern would have got wrong ────────────────────────────────────────────
  { text: "the origin of the rumor that the codex had been burned lay with Aleppo's Jewish elders",
    surface: "elders", owner: "aleppo-codex", expect: null, status: "guard",
    why: "Twentieth-century Syrian community leaders, inside a sentence quoted verbatim from " +
         "P. Sanders. `topic:jewish-elders` is the Second Temple body of Luke and Acts. The app's " +
         "own prose around it writes \"the community in Aleppo\" and needs no rule." },
  { text: "He went out with money from Charles Taylor, Master of St John's College",
    surface: "John", owner: "cairo-geniza", expect: null, status: "guard",
    why: "The Cambridge college that paid for Schechter's trip to Cairo. A building, not the " +
         "Baptist — the same shelf as \"St Thomas Bay\" under `thomas`." },
  { text: "their friend Solomon Schechter was able to identify one of their purchases as the lost " +
          "Hebrew original of the book of Ben Sira",
    surface: "Solomon", owner: "cairo-geniza", expect: null, status: "guard",
    why: "Inside Cambridge University Library's own sentence, quoted verbatim. An earlier batch " +
         "had to put this forename BACK after it was trimmed to suit the linker; the rule exists " +
         "so that the quotation can stay whole." },
  { ref: "1 Kings 3:5", surface: "Solomon", expect: "solomon", status: "guard",
    why: "KEPT. The king at Gibeon. The Schechter rule is keyed on a following surname and the " +
         "patronymic rule on a preceding \"ben\"/\"b.\"; neither can reach Scripture." },
  // ── THE VERSIONS, MINUSCULES AND PRINTED-TEXT ARTICLES ─────────────────────────────────────
  //
  // Three pins added with this batch, all found by enumerating the links the new prose renders
  // BEFORE committing (scripts/name-linker/article-links.mjs, written for the purpose), not by
  // reading a snapshot diff afterwards. Everything else these eight articles collided with was
  // fixed by rewording — "the Gospel of John" for a bare "John", "the Pauline Epistles" for a bare
  // "Paul", "M. Maynard" for "Michael Maynard", "the Gospel of Mark and the Gospel of Matthew" for
  // "Mark and Matthew" — and those wordings must stay that way, because undoing one re-opens a
  // link this file is guarding.
  { text: "the alteration changed \"the donor's name from Ceolfrid, abbot of the English, to " +
          "Peter, abbot of the Lombards.\"",
    surface: "Peter", owner: "codex-amiatinus", expect: null, status: "guard",
    why: "An eighth-century Italian abbot whose name was written over Ceolfrith's on the " +
         "dedication page of Codex Amiatinus, not the Apostle. Inside a quotation from " +
         "H. A. G. Houghton that cannot be reworded to dodge the collision." },
  { text: "John the Recluse, of Beth-Mari, Kaddish, being in want of vellum, pulled to pieces a " +
          "copy of the Old Syriac Gospels",
    surface: "John", owner: "old-syriac-gospels", expect: null, status: "guard",
    why: "The eighth-century monk who scraped the Sinaitic Palimpsest's gospel text off its " +
         "parchment, named in A. S. Lewis's own 1894 introduction. A bare \"John\" in prose " +
         "defaults to the Baptist; the quotation is a primary source and may not be reworded." },
  { text: "William Hugh Ferrar, a fellow of Trinity College in Dublin, noticed that four gospel " +
          "manuscripts kept agreeing with one another against everything else",
    surface: "Trinity", owner: "family-1-and-family-13", expect: null, status: "guard",
    why: "The Dublin college, not the doctrine. Same shape as Trinity Southwest University, which " +
         "is why the pin sits beside it — but keyed on \"Trinity College\" as a phrase, because " +
         "the college is written both with and without \"in\" before Dublin." },
  { text: "Losing this verse costs the doctrine of the Trinity nothing, and the reason is the " +
          "same fact that tells against the verse.",
    surface: "the Trinity", owner: "comma-johanneum", expect: "the-trinity", status: "guard",
    why: "KEPT. The doctrine itself, in the article that most needs the link to work. The " +
         "\"Trinity College\" pin must never reach an ordinary mention of the doctrine." },
  { text: "It was translated directly from Hebrew rather than from the Greek Septuagint — not " +
          "quite everywhere, since the Gorgias dictionary says that in the book of Ezekiel and in " +
          "the Twelve Prophets \"we have to assume some literary dependence of the Peshitta on the " +
          "Septuagint\"",
    surface: "Ezekiel", owner: "peshitta", expect: null, status: "guard",
    why: "The BOOK, inside a quotation about which books of the Peshitta lean on the Septuagint. " +
         "`ezekiel` carried TEXT_OF but not BOOK_OF until the versions batch; this is the " +
         "2026-09-09 book-title ruling applied to a name that had not needed it before." },
];

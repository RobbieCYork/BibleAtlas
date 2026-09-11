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
//   text: "<sentence>"       — instead of `ref`, a PROSE case: a literal sentence run the way
//                              LinkedVerseText runs one. Quote it verbatim from the data file.
//   text: … WITH ref: …      — added 2026-09-10. The READER path run against a supplied literal
//                              instead of against the WEB corpus, which is the only way to assert
//                              anything about the KJV or ASV a reader can actually select. Name the
//                              translation in `translation:` and quote the verse verbatim from it.
//                              VERSE_NAME_OVERRIDES is translation-blind, so a verse whose three
//                              renderings differ had no cover at all before this — see Acts 4:36.
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
// Every case below was read against the WEB text of its verse, not recalled — and the handful that
// carry both `text` and `ref` were read against the KJV or ASV text that `translation:` names,
// fetched from bible-api.com, which is the service the app itself asks for Scripture.

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

  // ── MATTHEW'S GENEALOGY ON THE OLD SYRIAC GOSPELS ──────────────────────────────────────────
  //
  // Thirteen links shipped live on `old-syriac-gospels` pointing at the wrong men: nine bare
  // "Joseph" at the patriarch in a section about Joseph the husband of Mary, and four bare "Jacob"
  // at the patriarch where the man is Jacob son of Matthan. Eight of the thirteen sit inside
  // verbatim quotations of A. S. Lewis's 1894 translation and of F. C. Burkitt — primary sources
  // that may not be reworded to dodge a collision, which is why the fix is phrase pins in
  // NAME_CONTEXT_RULES rather than an edit to the prose.
  //
  // These are RESOLVED, not suppressed: `joseph-husband-of-mary` and `jacob-father-of-joseph` are
  // both real records, and the second one's first line is that it is not the patriarch.
  //
  // Every occurrence has its own case, in reading order, so a later widening or narrowing of the
  // pins cannot silently undo any part of the fix. The scope is one record. Bare "Joseph" and bare
  // "Jacob" still belong to the patriarch everywhere else, and the guards at the end of this block
  // are what say so; whether that corpus-wide default is right is Robbie's question and is not
  // settled here.
  { text: "At the end of Matthew's genealogy, where the standard text reads that Jacob was the " +
          "father of Joseph, the husband of Mary, of whom was born Jesus, this manuscript reads",
    surface: "Jacob", owner: "old-syriac-gospels", expect: "jacob-father-of-joseph",
    status: "guard",
    why: "Matthew 1:16's Jacob, son of Matthan. The app's own summary of the standard reading." },
  { text: "At the end of Matthew's genealogy, where the standard text reads that Jacob was the " +
          "father of Joseph, the husband of Mary, of whom was born Jesus, this manuscript reads",
    surface: "Joseph", owner: "old-syriac-gospels", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The clause names him outright — the husband of Mary — and it was linking to the " +
         "patriarch." },
  { text: "in Lewis's own 1894 translation — \"Matthan begat Jacob; Jacob begat Joseph; Joseph, " +
          "to whom was betrothed Mary the Virgin, begat Jesus, who is called the Christ.\"",
    surface: "Jacob", owner: "old-syriac-gospels", expect: "jacob-father-of-joseph",
    status: "guard",
    why: "Inside Lewis's translation of the Sinaitic Palimpsest at Matthew 1:15-16. Matthan " +
         "already resolved correctly; his son did not." },
  { text: "in Lewis's own 1894 translation — \"Matthan begat Jacob; Jacob begat Joseph; Joseph, " +
          "to whom was betrothed Mary the Virgin, begat Jesus, who is called the Christ.\"",
    surface: "Jacob", occurrence: 2, owner: "old-syriac-gospels",
    expect: "jacob-father-of-joseph", status: "guard",
    why: "The same man, named twice by the genealogy's own repetition." },
  { text: "in Lewis's own 1894 translation — \"Matthan begat Jacob; Jacob begat Joseph; Joseph, " +
          "to whom was betrothed Mary the Virgin, begat Jesus, who is called the Christ.\"",
    surface: "Joseph", owner: "old-syriac-gospels", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The disputed verse itself. A reader following this link left a quotation of Matthew " +
         "1:16 and landed on the patriarch in Egypt." },
  { text: "in Lewis's own 1894 translation — \"Matthan begat Jacob; Jacob begat Joseph; Joseph, " +
          "to whom was betrothed Mary the Virgin, begat Jesus, who is called the Christ.\"",
    surface: "Joseph", occurrence: 2, owner: "old-syriac-gospels",
    expect: "joseph-husband-of-mary", status: "guard",
    why: "Betrothed to Mary the Virgin in the same breath. The husband of Mary, twice over." },
  { text: "And, she adds, \"the fact that Joseph was troubled about Mary's condition is simply " +
          "inexplicable if he were the father of Jesus.\"",
    surface: "Joseph", owner: "old-syriac-gospels", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Lewis on Matthew 1:18-19, quoted verbatim from her 1894 introduction." },
  { text: "\"If the Genealogy had ended with the uncompromising statement 'and Joseph begat " +
          "Jesus' it would not prove that the Evangelist believed that Joseph had been the " +
          "natural father of Jesus,\" he wrote.",
    surface: "Joseph", owner: "old-syriac-gospels", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Burkitt's hypothetical wording of Matthew 1:16, quoted verbatim." },
  { text: "\"If the Genealogy had ended with the uncompromising statement 'and Joseph begat " +
          "Jesus' it would not prove that the Evangelist believed that Joseph had been the " +
          "natural father of Jesus,\" he wrote.",
    surface: "Joseph", occurrence: 2, owner: "old-syriac-gospels",
    expect: "joseph-husband-of-mary", status: "guard",
    why: "The same man in the same sentence of Burkitt." },
  { text: "\"All that the Evangelist cares about is that Joseph accepted Jesus as his son\"",
    surface: "Joseph", owner: "old-syriac-gospels", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Burkitt on legal rather than natural fatherhood. Still the husband of Mary." },
  { text: "the genealogy exists to put Jesus in David's line through Joseph's legal fatherhood, " +
          "and the verb in a genealogy states heirship, not biology",
    surface: "Joseph", owner: "old-syriac-gospels", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "A possessive, and the only one of the thirteen outside a quotation mark." },
  { text: "the genealogy exists to put Jesus in David's line through Joseph's legal fatherhood, " +
          "and the verb in a genealogy states heirship, not biology",
    surface: "David", owner: "old-syriac-gospels", expect: "david", status: "guard",
    why: "KEPT, in the same sentence as the pin above. This IS the king — the clause is about " +
         "Jesus's legal claim to his line. A pin wide enough to take it would have broken the " +
         "sentence it was written to fix." },
  { text: "the Curetonian reads differently again and clumsily: \"Jacob begat Joseph, him to " +
          "whom was betrothed Mary the Virgin, she who bare Jesus the Messiah\"",
    surface: "Jacob", owner: "old-syriac-gospels", expect: "jacob-father-of-joseph",
    status: "guard",
    why: "Burkitt's rendering of the Curetonian at Matthew 1:16. Different wording from Lewis's, " +
         "so it needs its own pin." },
  { text: "the Curetonian reads differently again and clumsily: \"Jacob begat Joseph, him to " +
          "whom was betrothed Mary the Virgin, she who bare Jesus the Messiah\"",
    surface: "Joseph", owner: "old-syriac-gospels", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The thirteenth and last of them." },
  // The guards that hold the scope down. If any of these moves, a record-scoped fix has become a
  // corpus-wide ruling by accident, and that ruling is Robbie's to make.
  { ref: "Genesis 37:3", surface: "Joseph", expect: "joseph-son-of-jacob", status: "guard",
    why: "The patriarch, in Scripture, untouched. The pins above are phrases from one article " +
         "and occur in none of the 31,098 WEB verses." },
  { text: "Joseph was sold into Egypt by his brothers and rose to govern it",
    surface: "Joseph", expect: "joseph-son-of-jacob", status: "guard",
    why: "The patriarch on the ARTICLE surface, which is where the pins live. Bare \"Joseph\" in " +
         "prose still means the son of Jacob everywhere the pins do not reach." },
  { ref: "Matthew 1:16", surface: "Joseph", expect: "joseph-husband-of-mary", status: "guard",
    why: "KEPT. The Bible reader already resolved this verse correctly before the article-side " +
         "fix, so that fix cannot be read as having created it. (The route was " +
         "BOOK_NAME_OVERRIDES — every bare Joseph in Matthew — not VERSE_NAME_OVERRIDES as this " +
         "line said when it was written; corrected 2026-09-10. Since the same date the phrase pin " +
         "in the block below settles it first and gives the same answer, which is what carries it " +
         "onto the panel path too.)" },
  { ref: "Matthew 1:16", surface: "Jacob", expect: "jacob-father-of-joseph",
    status: "guard",
    why: "FIXED 2026-09-10, and this line was known-wrong until then. See the block below: " +
         "Scripture's own Matthew 1:15 and 1:16 now resolve a bare Jacob to the son of Matthan on " +
         "both rendering paths, which is the same fault as the article one surface further out." },

  // ── SCRIPTURE'S OWN MATTHEW 1:15-16 ───────────────────────────────────────────────────────────
  //
  // The half the block above measured and did not fix, because it was out of that batch's scope.
  // A reader standing in Matthew's genealogy — the live Bible reading surface, not an article —
  // clicked "Jacob" and was sent to Genesis. Three occurrences: Matthew 1:15's "Matthan became the
  // father of Jacob", and Matthew 1:16's "Jacob became the father of Joseph". The genealogy names
  // the man itself, so there is nothing to decide; jacob-father-of-joseph is a real record and
  // these RESOLVE rather than suppress.
  //
  // Two mechanisms, because the two rendering paths have no lever in common. VERSE_NAME_OVERRIDES
  // is keyed by book/chapter/verse and is translation-blind, so it fires for KJV and ASV readers
  // as well — all three read the same two men. It needs a book, which the panel path never passes,
  // so a phrase pin on the WEB wording carries that half. Each phrase occurs in exactly one of the
  // 31,098 WEB verses and in no prose block; both were counted before they were written.
  //
  // Matthew 1:16's "Joseph" was already right for the reader (BOOK_NAME_OVERRIDES) and wrong on
  // the panel path, where it fell through to the patriarch. Both paths are pinned below.
  { ref: "Matthew 1:15", surface: "Jacob", expect: "jacob-father-of-joseph", status: "guard",
    why: "Matthan's son, named by the verse that begets him. Was the patriarch until 2026-09-10." },
  { ref: "Matthew 1:15", surface: "Jacob", path: "panel", expect: "jacob-father-of-joseph",
    status: "guard",
    why: "The same verse with no book passed — the half a reader-only fix would have missed." },
  { ref: "Matthew 1:16", surface: "Jacob", path: "panel", expect: "jacob-father-of-joseph",
    status: "guard",
    why: "\"Jacob became the father of Joseph, the husband of Mary.\" The clause names the son's " +
         "wife; the patriarch's son married nobody called Mary." },
  { ref: "Matthew 1:16", surface: "Joseph", path: "panel", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The panel-path half of a verse the reader already had right. It sent a reader of " +
         "Matthew 1:16 to Egypt, from the one verse in Scripture that names Joseph's wife in the " +
         "same clause." },
  // The guards that hold THIS scope down. Two verses were named, and only two: if any of these
  // moves, a two-verse correction has become a ruling about who owns a bare "Jacob", and that
  // ruling is Robbie's.
  { ref: "Matthew 1:2", surface: "Jacob", expect: "jacob", status: "guard",
    why: "\"Isaac became the father of Jacob\" — eleven verses earlier in the same genealogy, and " +
         "the patriarch. Naming Matthan in the pin rather than \"became the father of Jacob\" is " +
         "what keeps this line untouched." },
  { ref: "Matthew 1:2", surface: "Jacob", occurrence: 2, path: "panel", expect: "jacob",
    status: "guard",
    why: "\"Jacob became the father of Judah\" — the same shape as 1:16 and still the patriarch, " +
         "on the path the phrase pin lives on." },
  { ref: "Acts 7:8", surface: "Jacob", expect: "jacob", status: "guard",
    why: "Stephen's speech, twice, in the third book that writes \"became the father of Jacob\". " +
         "The patriarch, and outside the reach of both mechanisms." },
  { ref: "Genesis 25:26", surface: "Jacob", expect: "jacob", status: "guard",
    why: "The patriarch being born. A bare \"Jacob\" in Scripture still means him everywhere the " +
         "two named verses do not reach." },

  // ── NINETEEN PAGES LINKING THEIR OWN SUBJECT TO SOMEBODY ELSE ─────────────────────────────────
  //
  // Joseph of Arimathea's own biography opened "Joseph was a wealthy man from the town of
  // Arimathea" and sent the reader to Egypt, under his own name. So did Joseph the husband of
  // Mary's, and so did Caiaphas's, whose given name was Joseph — Josephus writes "Joseph, who was
  // also called Caiaphas" (Antiquities 18.2.2), and the app's own extra-biblical section quotes it.
  //
  // A page does not link to itself; the self-link exclusion missed these because the id they
  // resolved to belonged to a different man. Fixed by OWNER_NAME_OVERRIDES mapping each record's
  // "joseph" to the record itself, which hands it back to that exclusion — the same shape as
  // `augustus` on claudius-caesar.
  //
  // All nineteen were read in their own sentences first, and not one is the patriarch, which is
  // what makes one answer per record enough. Every one has its own case below, in reading order,
  // so a later narrowing cannot undo part of the fix in silence. Nothing here rules on who a bare
  // "Joseph" belongs to anywhere else; that is Robbie's and is open.
  { text: "Joseph was a wealthy man from the town of Arimathea and, according to Mark and Luke, a " +
          "member of the Sanhedrin — the very council that condemned Jesus.",
    surface: "Joseph", owner: "joseph-of-arimathea", expect: null, status: "guard",
    why: "The opening words of his own biography, naming him, and they linked to the patriarch." },
  { text: "Luke is careful to note that Joseph had not consented to their decision or action " +
          "against him.",
    surface: "Joseph", owner: "joseph-of-arimathea", expect: null, status: "guard",
    why: "Luke 23:51. The man the sentence is about is the man whose page it is on." },
  { text: "John adds that Joseph was 'a disciple of Jesus, but secretly, for fear of the Jews' — " +
          "someone who believed but had kept it quiet given his position.",
    surface: "Joseph", owner: "joseph-of-arimathea", expect: null, status: "guard",
    why: "John 19:38, quoted. Still Arimathea." },
  { text: "After Jesus died on the cross, Joseph did something bold: he 'took courage and went to " +
          "Pilate and asked for the body of Jesus' (Mark 15:43).",
    surface: "Joseph", owner: "joseph-of-arimathea", expect: null, status: "guard",
    why: "Mark 15:43 — the verse that BOOK_NAME_OVERRIDES already resolves correctly for a reader, " +
         "wrong on his own page because the article surface has no book." },
  { text: "Requesting the corpse of a man executed for sedition was not a small ask, and it " +
          "publicly identified Joseph with a condemned criminal in front of the very authorities " +
          "he served alongside.",
    surface: "Joseph", owner: "joseph-of-arimathea", expect: null, status: "guard",
    why: "The app's own comment on what the request cost him." },
  { text: "Joseph wrapped the body in a clean linen cloth and laid it in his own new tomb, cut " +
          "into the rock, where no one had yet been buried (Matthew 27:60, John 19:41).",
    surface: "Joseph", owner: "joseph-of-arimathea", expect: null, status: "guard",
    why: "The act he is remembered for, on the page about him." },
  { text: "Joseph is not mentioned again in the New Testament after this act.",
    surface: "Joseph", owner: "joseph-of-arimathea", expect: null, status: "guard",
    why: "The seventh and last on this record." },
  { text: "Joseph is introduced as a descendant of David, betrothed to Mary, and working as a " +
          "tekton — a term usually translated \"carpenter\" but covering builders and craftsmen " +
          "who worked in wood or stone more broadly (Matthew 13:55).",
    surface: "Joseph", owner: "joseph-husband-of-mary", expect: null, status: "guard",
    why: "The opening words of his own biography. Betrothed to Mary in the same clause." },
  { text: "Both Matthew and Luke trace genealogies through him back to David, establishing " +
          "Jesus's legal claim to David's royal line even though Joseph was not his biological " +
          "father (Matthew 1:1-17; Luke 3:23-38).",
    surface: "Joseph", owner: "joseph-husband-of-mary", expect: null, status: "guard",
    why: "The genealogy question, on the page of the man it turns on." },
  { text: "When Mary was found to be pregnant before their marriage was completed, Joseph — " +
          "described as a righteous man unwilling to expose her to public disgrace — planned to " +
          "quietly break the engagement.",
    surface: "Joseph", owner: "joseph-husband-of-mary", expect: null, status: "guard",
    why: "Matthew 1:19 in the app's own words." },
  { text: "Joseph obeyed and took Mary home as his wife, but had no marital relations with her " +
          "until after Jesus was born (Matthew 1:18-25).",
    surface: "Joseph", owner: "joseph-husband-of-mary", expect: null, status: "guard",
    why: "Matthew 1:24-25." },
  { text: "Joseph appears at several key moments of Jesus's early life: he traveled with the " +
          "pregnant Mary to Bethlehem for a census (Luke 2:1-7); after further angelic warnings, " +
          "he fled with his family to Egypt to escape Herod's massacre of infants, then returned " +
          "and settled in Nazareth once it was safe (Matthew 2:13-23); and he brought the family " +
          "to Jerusalem for Passover, where the twelve-year-old Jesus stayed behind in the temple, " +
          "causing Joseph and Mary a frantic search (Luke 2:41-51).",
    surface: "Joseph", owner: "joseph-husband-of-mary", expect: null, status: "guard",
    why: "The first of two in one sentence — and the sentence that sent a reader to Egypt is " +
         "itself about a flight to Egypt, by a different man." },
  { text: "Joseph appears at several key moments of Jesus's early life: he traveled with the " +
          "pregnant Mary to Bethlehem for a census (Luke 2:1-7); after further angelic warnings, " +
          "he fled with his family to Egypt to escape Herod's massacre of infants, then returned " +
          "and settled in Nazareth once it was safe (Matthew 2:13-23); and he brought the family " +
          "to Jerusalem for Passover, where the twelve-year-old Jesus stayed behind in the temple, " +
          "causing Joseph and Mary a frantic search (Luke 2:41-51).",
    surface: "Joseph", occurrence: 2, owner: "joseph-husband-of-mary", expect: null, status: "guard",
    why: "The second, at Luke 2:41-51. \"Joseph and Mary\" — his wife is named beside him." },
  { text: "After that episode, Joseph is never mentioned again in the Gospels' narrative action — " +
          "only referenced in passing as Jesus's presumed father by townspeople (Luke 4:22; John " +
          "6:42) or listed alongside Mary and Jesus's siblings (Matthew 13:55).",
    surface: "Joseph", owner: "joseph-husband-of-mary", expect: null, status: "guard",
    why: "His disappearance from the record, on his own record." },
  { text: "His absence from the accounts of Jesus's adult ministry, along with Jesus's commending " +
          "Mary to John's care from the cross with no mention of Joseph (John 19:26-27), has long " +
          "led readers to conclude he died sometime before Jesus's public ministry began — though " +
          "the Gospels never state this directly.",
    surface: "Joseph", owner: "joseph-husband-of-mary", expect: null, status: "guard",
    why: "The eighth and last on this record." },
  { text: "An elaborately decorated limestone ossuary inscribed 'Joseph, son of Caiaphas' was " +
          "found in a first-century family burial cave, containing the bones of six individuals " +
          "including an approximately 60-year-old man.",
    surface: "Joseph", owner: "caiaphas", expect: null, status: "guard",
    why: "The ossuary inscription, quoted. It is Caiaphas's own name and it is his own page." },
  { text: "Most archaeologists identify this Joseph with the high priest Caiaphas of the Gospels, " +
          "whose full name per Josephus was 'Joseph, called Caiaphas.'",
    surface: "Joseph", owner: "caiaphas", expect: null, status: "guard",
    why: "\"this Joseph\" — the man in the ossuary, i.e. the subject of the page." },
  { text: "Most archaeologists identify this Joseph with the high priest Caiaphas of the Gospels, " +
          "whose full name per Josephus was 'Joseph, called Caiaphas.'",
    surface: "Joseph", occurrence: 2, owner: "caiaphas", expect: null, status: "guard",
    why: "Josephus's own naming of him, in the same sentence. Note \"Josephus\" itself is not a " +
         "match — the word boundary saves it — so this sentence carries two links, not four." },
  { text: "Josephus records that the Roman prefect Valerius Gratus appointed 'Joseph, who was " +
          "also called Caiaphas' as high priest, and that he was later removed from office by the " +
          "proconsul Vitellius around AD 36-37.",
    surface: "Joseph", owner: "caiaphas", expect: null, status: "guard",
    why: "Antiquities 18.2.2. The nineteenth and last of them." },
  // The guards that hold THIS scope down. Three records were named, and only three.
  { text: "Joseph was sold into Egypt by his brothers and rose to govern it",
    surface: "Joseph", owner: "jacob", expect: "joseph-son-of-jacob", status: "guard",
    why: "The patriarch on the ARTICLE surface, with an owner passed — the same context the three " +
         "records above run in. A bare \"Joseph\" in prose still means the son of Jacob on every " +
         "record the three entries do not name." },
  { text: "Joseph was sold into Egypt by his brothers and rose to govern it",
    surface: "Joseph", owner: "elizabeth-mother-of-john-baptist", expect: "joseph-son-of-jacob",
    status: "guard",
    why: "RE-OWNED 2026-09-10, from mary-mother-of-jesus, which is now in the table (see the " +
         "MARY / MATTHAN / JACOB SON OF MATTHAN block below). The assertion it was making is the " +
         "one that still needs making — a bare \"Joseph\" in prose is the patriarch on every " +
         "record the entries do not name — so it moves to a nativity-adjacent record that is not " +
         "one of them, rather than being deleted. Elizabeth's page never writes the bare name; " +
         "the case is a probe of the default, exactly as it was before." },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // MARY / MATTHAN / JACOB SON OF MATTHAN — 2026-09-10
  //
  // Three records the pass above measured, wrote up, and deliberately left, because fixing them
  // was outside its authorisation. Sixteen Jacob/Joseph links between them, fourteen of them wrong.
  // Every occurrence was read in its own sentence before anything moved, and two of the sixteen
  // turned out to be the patriarch and were left exactly where they were — the trap this set was
  // warned about, and it was live.
  //
  // The counts, by record and by surface. `person.summary` is the surface the app renders as plain
  // text and scripts/seo/render.mjs linkifies onto the ~985 public pages; no snapshot covers it,
  // so the only thing that can pin it is a prose case, which is why five of the cases below quote
  // a summary rather than a life story:
  //
  //   mary-mother-of-jesus     4 links, 4 wrong  — all four her husband, all four the patriarch
  //   matthan                  5 links, 5 wrong  — 2 Jacob + 3 Joseph, and he is neither man
  //   jacob-father-of-joseph   7 links, 5 wrong  — the two right ones are "the patriarch Jacob"
  //
  // Two levers, chosen per record and not per taste. OWNER_NAME_OVERRIDES carries Mary and Matthan
  // whole, because every occurrence on each means one man. It carries the Josephs on Jacob's page
  // too, for the same reason. It CANNOT carry the Jacobs on Jacob's page, because that record
  // names both men; there the record-wide answer is the page's own subject (suppressed by the
  // self-link exclusion) and the patriarch is recovered by a context pin on "the patriarch",
  // checked first. See the long note in verseAnnotations.ts for why that direction and not the
  // other one.
  //
  // Nothing here rules on who a bare "Jacob" or "Joseph" belongs to corpus-wide. 305 such links
  // were counted while this was written and many outside these three records are also wrong in the
  // same direction. That ruling is Robbie's and is untouched; the guards at the end of this block
  // are what prove it.

  // ── mary-mother-of-jesus: four bare "Joseph"s, every one her husband ──────────────────────────
  { text: "Mary was a young woman living in Nazareth, betrothed to a carpenter named Joseph, when " +
          "Luke's Gospel records that the angel Gabriel appeared to her and announced she would " +
          "conceive a son by the Holy Spirit who would be called \"the Son of the Most High\" " +
          "(Luke 1:26-38).",
    surface: "Joseph", owner: "mary-mother-of-jesus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "FIXED 2026-09-10; was the patriarch. The carpenter she is betrothed to, in the " +
         "annunciation, on his wife's page. Not a self-link — the page's subject is Mary — which " +
         "is why the exclusion rule never caught it." },
  { text: "Joseph, learning of the pregnancy, initially planned to quietly end the engagement " +
          "until an angel reassured him in a dream (Matthew 1:18-25).",
    surface: "Joseph", owner: "mary-mother-of-jesus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "FIXED 2026-09-10. Matthew 1:19's Joseph, by name, opening the paragraph." },
  { text: "Mary traveled with Joseph to Bethlehem for a Roman census and gave birth to Jesus " +
          "there, laying him in a manger because there was no room for them at the inn " +
          "(Luke 2:1-7).",
    surface: "Joseph", owner: "mary-mother-of-jesus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "FIXED 2026-09-10. The nativity. The patriarch went to Egypt, not to Bethlehem." },
  { text: "After the visit of magi from the East, Matthew records that Joseph was warned in a " +
          "dream of Herod's plan to kill the child, and the family fled to Egypt, returning only " +
          "after Herod's death to settle in Nazareth (Matthew 2:13-23).",
    surface: "Joseph", owner: "mary-mother-of-jesus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "FIXED 2026-09-10, and the nastiest of the four: this sentence really does send the " +
         "family to Egypt, so the wrong link read as plausible to anyone skimming. It is Matthew " +
         "2:13's Joseph, fifteen centuries after the other one." },

  // ── matthan: he is neither man, so all five are wrong the same way ────────────────────────────
  { text: "Matthan appears exactly once in Scripture, named as the son of Eleazar and father of " +
          "Jacob in Matthew's genealogy of Jesus (Matthew 1:15).",
    surface: "Jacob", owner: "matthan", expect: "jacob-father-of-joseph", status: "guard",
    why: "FIXED 2026-09-10; was the patriarch. Matthew 1:15's own words: Matthan's son. This is " +
         "the article-surface twin of the Matthew 1:15 verse cases above." },
  { text: "Luke's genealogy of Jesus names a different individual, Matthat son of Levi, in the " +
          "corresponding generation before Joseph's father Heli (Luke 3:23-24), and the two lists " +
          "do not share names through this whole postexilic stretch.",
    surface: "Joseph", owner: "matthan", expect: "joseph-husband-of-mary", status: "guard",
    why: "FIXED 2026-09-10; was the patriarch. Luke 3:23's Joseph, whose father Luke names as " +
         "Heli — the husband of Mary, not the son of Jacob, who is nowhere in this article." },
  { text: "Scholars have proposed several explanations for the broader divergence between " +
          "Matthew's and Luke's genealogies, including that one traces Joseph's legal/royal line " +
          "while the other traces a biological line (possibly through Mary), or that one reflects " +
          "a levirate succession; no single theory is universally accepted, and the matter remains " +
          "an open question in biblical scholarship rather than a settled one.",
    surface: "Joseph", owner: "matthan", expect: "joseph-husband-of-mary", status: "guard",
    why: "FIXED 2026-09-10. The whole sentence is about whose legal line Matthew traces to Jesus, " +
         "which is Mary's husband's." },
  { text: "A postexilic ancestor of Jesus named only in Matthew's genealogy as the father of " +
          "Jacob, Joseph's father; his place in the family line is part of the long-standing " +
          "scholarly puzzle of why Matthew's and Luke's genealogies diverge at this point.",
    surface: "Jacob", owner: "matthan", expect: "jacob-father-of-joseph", status: "guard",
    why: "FIXED 2026-09-10. matthan's SUMMARY, verbatim — plain text in the app and a live link " +
         "on capstonebible.com/person/matthan. No snapshot covers this surface; this case is the " +
         "only thing holding it." },
  { text: "A postexilic ancestor of Jesus named only in Matthew's genealogy as the father of " +
          "Jacob, Joseph's father; his place in the family line is part of the long-standing " +
          "scholarly puzzle of why Matthew's and Luke's genealogies diverge at this point.",
    surface: "Joseph", owner: "matthan", expect: "joseph-husband-of-mary", status: "guard",
    why: "FIXED 2026-09-10. The other half of the same public-page sentence. \"Jacob, Joseph's " +
         "father\" names two men in four words and had both of them wrong." },

  // ── jacob-father-of-joseph: the record that names BOTH Jacobs ─────────────────────────────────
  { text: "This Jacob appears exactly once in Scripture, named as the son of Matthan and the " +
          "father of 'Joseph the husband of Mary, of whom was born Jesus who is called Christ' " +
          "(Matthew 1:15-16).",
    surface: "Jacob", owner: "jacob-father-of-joseph", expect: null, status: "guard",
    why: "FLIPPED 2026-09-10, from a guard that recorded it resolving to the patriarch. \"This " +
         "Jacob\" is the page's own subject: no link, because the reader is already there. " +
         "OWNER_NAME_OVERRIDES maps the name to the record itself and the self-link exclusion " +
         "does the rest." },
  { text: "This Jacob appears exactly once in Scripture, named as the son of Matthan and the " +
          "father of 'Joseph the husband of Mary, of whom was born Jesus who is called Christ' " +
          "(Matthew 1:15-16).",
    surface: "Joseph", owner: "jacob-father-of-joseph", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "FIXED 2026-09-10; was the patriarch. Matthew 1:16 quoted in the same sentence, which " +
         "names the man's wife four words later." },
  { text: "No narrative episode involving him is recorded anywhere in the Bible, and he is " +
          "entirely distinct from the patriarch Jacob (also called Israel), son of Isaac and " +
          "father of the twelve tribes, who belongs to a much earlier period of biblical history.",
    surface: "Jacob", owner: "jacob-father-of-joseph", expect: "jacob", status: "guard",
    why: "UNCHANGED, and it is the trap. On the one record where a bare \"Jacob\" is suppressed " +
         "as the page's own subject, this occurrence genuinely IS the patriarch — the sentence " +
         "says so — and it must keep its link to him. Recovered by the \"the patriarch\" context " +
         "pin, which is checked before OWNER_NAME_OVERRIDES. If this line ever goes null, the " +
         "record-wide answer has swallowed the exception." },
  { text: "Luke's genealogy names Joseph's father as Heli rather than Jacob (Luke 3:23), part of " +
          "the same broader divergence between the two Gospel genealogies discussed under Matthan; " +
          "proposed explanations include one Gospel tracing a legal/royal succession and the other " +
          "a biological line, though the question remains genuinely open among scholars.",
    surface: "Joseph", owner: "jacob-father-of-joseph", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "FIXED 2026-09-10; was the patriarch. Luke 3:23's Joseph — this record's own son." },
  { text: "Luke's genealogy names Joseph's father as Heli rather than Jacob (Luke 3:23), part of " +
          "the same broader divergence between the two Gospel genealogies discussed under Matthan; " +
          "proposed explanations include one Gospel tracing a legal/royal succession and the other " +
          "a biological line, though the question remains genuinely open among scholars.",
    surface: "Jacob", owner: "jacob-father-of-joseph", expect: null, status: "guard",
    why: "FIXED 2026-09-10; was the patriarch. \"Heli rather than Jacob\" is the two evangelists " +
         "disagreeing about THIS page's subject, so it is a self-reference like the first one and " +
         "takes no link. Note it sits two clauses from the patriarch mention above, in the same " +
         "paragraph — which is the whole reason this record needed two levers and not one." },
  { text: "The father of Joseph, the husband of Mary, named only in Matthew's genealogy of Jesus; " +
          "a distinct figure from the patriarch Jacob (Israel), son of Isaac, who lived many " +
          "centuries earlier.",
    surface: "Joseph", owner: "jacob-father-of-joseph", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "FIXED 2026-09-10. jacob-father-of-joseph's SUMMARY, verbatim — a live link on " +
         "capstonebible.com/person/jacob-father-of-joseph and covered by no snapshot. The clause " +
         "names him \"the husband of Mary\" and linked to Egypt anyway." },
  { text: "The father of Joseph, the husband of Mary, named only in Matthew's genealogy of Jesus; " +
          "a distinct figure from the patriarch Jacob (Israel), son of Isaac, who lived many " +
          "centuries earlier.",
    surface: "Jacob", owner: "jacob-father-of-joseph", expect: "jacob", status: "guard",
    why: "UNCHANGED — the summary's own patriarch mention, in different words from the life " +
         "story's. Two wordings is why the pin is a pattern on \"the patriarch\" rather than two " +
         "exact phrases; this case and its twin above are what hold that pattern honest." },

  // ── The guards that hold THIS scope down. Three records were named, and only three. ───────────
  { text: "Bethel (\"House of God\") is where the patriarch Jacob dreamed of a ladder reaching to " +
          "heaven with angels ascending and descending, after which he set up a stone pillar and " +
          "renamed the site (Genesis 28:10-19).",
    surface: "Jacob", owner: "bethel", expect: "jacob", status: "guard",
    why: "The third and only other \"the patriarch Jacob\" in the whole corpus, and the proof the " +
         "new context pin is a no-op everywhere it was not written for: the patriarch was already " +
         "the answer here and still is. Counted 2026-09-10 across all 31,098 WEB verses (0 hits) " +
         "and every prose and public-page block (3 hits, the other two on jacob-father-of-joseph)." },
  { text: "Eventually 'God remembered Rachel,' and she conceived and bore Joseph, naming him with " +
          "the hope that God would 'add' another son (Genesis 30:22-24).",
    surface: "Joseph", owner: "rachel", expect: "joseph-son-of-jacob", status: "guard",
    why: "Real copy, not a probe sentence: the patriarch's birth on his mother's page. A bare " +
         "\"Joseph\" in prose still means the son of Jacob on every record the entries do not " +
         "name, and rachel is deliberately not one of them." },
  { ref: "Genesis 37:3", surface: "Joseph", expect: "joseph-son-of-jacob", status: "guard",
    why: "And in Scripture, on the reader path, untouched. None of the three record entries can " +
         "reach a verse: OWNER_NAME_OVERRIDES needs an owner, and the Bible reader passes none." },
  { ref: "Genesis 32:28", surface: "Jacob", expect: "jacob", status: "guard",
    why: "The same for Jacob: \"Your name will no longer be called Jacob, but Israel.\" The " +
         "patriarch keeps the bare key everywhere the two owner entries do not reach." },

  // ── THE REST OF THE NATIVITY CAST ────────────────────────────────────────────────────────────
  //
  // 2026-09-10. Every bare "Joseph"/"Jacob" link in the corpus was enumerated — all 6,677 blocks,
  // the 985 public-page-only ones included — and read in its own sentence. 321 of them. Outside
  // the records already fixed, the nativity cast was wrong in one direction throughout: a bare
  // "Joseph" in a sentence about the birth, the census, the magi, the flight, the return to
  // Nazareth or Matthew's genealogy resolved to Joseph son of Jacob and sent the reader to Egypt.
  //
  // 37 links moved across 28 records. 33 of them are in prose-links.tsv. THE OTHER FOUR ARE IN NO
  // SNAPSHOT AT ALL — they are `summary` fields, which the app renders as plain text and
  // scripts/seo/render.mjs linkifies onto capstonebible.com, and a case is the only thing in this
  // directory that can hold one. They are marked SUMMARY below.
  //
  // The lever is OWNER_NAME_OVERRIDES on 27 of the 28, because on each of those every occurrence
  // of the name means one man — measured per record, by reading every "Joseph"/"Jacob" token on
  // it, linked or not. `egyptians` is the exception and is a phrase pin, because it names both.
  //
  // This settles nothing about who a bare "Joseph" belongs to anywhere else. That is Robbie's
  // question and is open. The guards at the end of the block are what hold the scope down.

  { text: "This decree is presented as the reason Joseph, of the house of David, traveled " +
          "from Nazareth to Bethlehem with Mary to be registered, 'and while they were there, " +
          "the time came for her to give birth' (Luke 2:6).",
    surface: "Joseph", owner: "caesar-augustus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Luke 2:4-6, on the emperor whose decree moved him. 'Of the house of David' and 'with " +
         "Mary' both say which Joseph, and it was linking to the other one." },
  { text: "The first Roman emperor, whose empire-wide registration decree is named in Luke's " +
          "Gospel as the reason Joseph and Mary traveled to Bethlehem, where Jesus was born.",
    surface: "Joseph", owner: "caesar-augustus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "SUMMARY — a link only on the public page at /person/caesar-augustus, in no snapshot. " +
         "This case is the only thing holding it." },
  { text: "Luke 2:1-2 places the census that brought Joseph and Mary to Bethlehem 'while " +
          "Quirinius was governor of Syria,' during the reign of Herod the Great, whose death " +
          "is conventionally dated to 4 BC.",
    surface: "Joseph", owner: "quirinius", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The census article's own sentence. Named beside Mary and dated to Herod's reign." },
  { text: "The Roman governor of Syria named in Luke's account of the census that brought " +
          "Joseph and Mary to Bethlehem — a reference that raises a genuine, long-debated " +
          "chronological question among historians.",
    surface: "Joseph", owner: "quirinius", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "SUMMARY — public page only, no snapshot." },
  { text: "Matthew's Gospel places one final act of violence at the very end of Herod's " +
          "reign: alarmed by magi from the East asking about a newborn \"king of the Jews,\" " +
          "Herod ordered the killing of all boys age two and under in Bethlehem and its " +
          "vicinity, a massacre Joseph and Mary escaped only by fleeing with the infant Jesus " +
          "to Egypt (Matthew 2:1-18).",
    surface: "Joseph", owner: "herod-the-great", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 2:13-16. The sentence is about fleeing TO Egypt and the link pointed at the " +
         "man who was sold INTO it." },
  { text: "Herod died shortly afterward in 4 BC of a painful illness, after which his kingdom " +
          "was divided among three of his surviving sons, including Herod Antipas, who would " +
          "later have John the Baptist executed and question Jesus before his crucifixion, " +
          "and Herod Archelaus, whose harsh rule over Judea led Joseph to settle instead in " +
          "Nazareth (Matthew 2:19-23).",
    surface: "Joseph", owner: "herod-the-great", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 2:22-23, the second of the two on this record. Both are the husband, which is " +
         "why one answer per record serves here." },
  { text: "This is the political backdrop for Matthew 2:22, where Joseph, returning from " +
          "Egypt, hears that 'Archelaus was reigning over Judea in place of his father Herod' " +
          "and is afraid to go there, withdrawing instead to the district of Galilee and " +
          "settling in Nazareth.",
    surface: "Joseph", owner: "herod-archelaus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 2:22 named in the sentence. Archelaus's record says the verse number out loud." },
  { text: "His violent suppression of the Passover protest at the very start of his reign, " +
          "and the broader reputation for cruelty that led Joseph to avoid Judea in Matthew " +
          "2:22.",
    surface: "Joseph", owner: "herod-archelaus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The same verse in the controversies field." },
  { text: "Son of Herod the Great whose harsh and unstable rule over Judea after his father's " +
          "death caused Joseph to avoid settling there with Mary and Jesus, choosing Nazareth " +
          "in Galilee instead.",
    surface: "Joseph", owner: "herod-archelaus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "SUMMARY — public page only, no snapshot. Third of three on this record." },
  { text: "When Mary and Joseph brought the infant Jesus to the temple for the customary " +
          "purification rites and to present him to the Lord, Simeon was moved by the Spirit " +
          "to come into the temple courts at that exact moment.",
    surface: "Joseph", owner: "simeon-at-the-temple", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Luke 2:27. Named beside Mary, carrying the infant Jesus." },
  { text: "He then blessed Mary and Joseph and, turning to Mary specifically, prophesied that " +
          "the child was destined to cause the falling and rising of many in Israel, and that " +
          "a sword would pierce her own soul too (Luke 2:33-35).",
    surface: "Joseph", owner: "simeon-at-the-temple", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Luke 2:33-34, the second on this record." },
  { text: "The account closes with two warnings delivered in dreams that shape the rest of " +
          "the infancy narrative: the magi, 'being warned in a dream not to return to Herod, " +
          "departed to their own country by another way' (Matthew 2:12), and shortly " +
          "afterward Joseph is likewise warned in a dream to flee with Mary and the child to " +
          "Egypt (Matthew 2:13-15).",
    surface: "Joseph", owner: "magi", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 2:13. The dream is his, on the magi's own page." },
  { text: "In taking a human body, the eternal Son also took on real human growth and " +
          "dependence, raised in the Galilean village of Nazareth by Mary and her husband " +
          "Joseph; the only childhood episode recorded is a visit to the Jerusalem temple at " +
          "age twelve, where he was already found discussing Scripture with the religious " +
          "teachers (Luke 2:41-51).",
    surface: "Joseph", owner: "jesus-of-nazareth", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "\"Mary and her husband Joseph\" — the sentence names the relationship, on the page of " +
         "the child being raised. This was live on the app's single most-read biography." },
  { text: "Raised in Nazareth in the household of Joseph and Mary; based in Jerusalem as " +
          "leader of the church there from shortly after the resurrection until his death " +
          "around AD 62.",
    surface: "Joseph", owner: "james-brother-of-jesus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The household James grew up in. His own family, and the link went to Egypt." },
  { text: "Philip's first act as a disciple was to find Nathanael and tell him, \"We have " +
          "found him of whom Moses in the Law and also the prophets wrote, Jesus of Nazareth, " +
          "the son of Joseph\" (John 1:43-46).",
    surface: "Joseph", owner: "philip-the-apostle", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "John 1:45 quoted verbatim. The only Joseph on the record, and the one man the clause " +
         "can mean." },
  { text: "No narrative episode involving Azor is recorded anywhere in the Bible — he is " +
          "known only as a name in the chain linking the postexilic descendants of Zerubbabel " +
          "to Joseph, the husband of Mary.",
    surface: "Joseph", owner: "azor", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 1:13-14. The clause says \"the husband of Mary\" in as many words, and the " +
         "link pointed at the patriarch." },
  { text: "No narrative episode involving Achim is recorded anywhere in the Bible — he is " +
          "known only as a name in the chain linking the postexilic descendants of Zerubbabel " +
          "to Joseph, the husband of Mary.",
    surface: "Joseph", owner: "achim", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The same sentence on the next rung of Matthew 1." },
  { text: "No narrative episode involving Eliud is recorded anywhere in the Bible — he is " +
          "known only as a name in the chain linking the postexilic descendants of Zerubbabel " +
          "to Joseph, the husband of Mary.",
    surface: "Joseph", owner: "eliud", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "And again. Three stubs share this wording, so a later rewrite of one leaves the other " +
         "two asserted." },
  { text: "No episode or detail about his life is recorded, and he should not be confused " +
          "with the far more prominent Eleazar, son of Aaron, who succeeded his father as " +
          "high priest and oversaw the division of the land of Canaan (Numbers 20:28; Joshua " +
          "14:1) — that Eleazar lived many centuries earlier and is unrelated to this " +
          "genealogical figure in Joseph's ancestry.",
    surface: "Joseph", owner: "eleazar-in-jesus-genealogy", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 1:15. A sentence whose whole point is not confusing two men of one name was " +
         "itself linking to the wrong man of another." },
  { text: "No episode or detail about his life is recorded, and he should not be confused " +
          "with the far more prominent Zadok who served as high priest under David and " +
          "Solomon and anointed Solomon king at Gihon (1 Kings 1:38-39) — that Zadok lived " +
          "many generations earlier and belongs to the priestly line of Eleazar and Aaron, " +
          "unrelated to this genealogical figure in Joseph's ancestry.",
    surface: "Joseph", owner: "zadok-in-jesus-genealogy", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 1:14. A FIFTH genealogy stub — the sweep that scoped this work named four, and " +
         "this one is why the enumeration was redone rather than worked from the list." },
  { text: "Despite Jeremiah's judgment on his direct royal succession, Jeconiah is listed as " +
          "an ancestor of Jesus through Joseph in Matthew's genealogy.",
    surface: "Joseph", owner: "jeconiah", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 1:11-12. Jeconiah's record sits in a genealogy that elsewhere runs through the " +
         "patriarch, so it was read token by token first; neither of its two Josephs is him." },
  { text: "Jeremiah's judgment that none of Coniah's offspring would 'sit on the throne of " +
          "David' (Jeremiah 22:30) sits alongside Jeconiah's continued appearance in Jesus's " +
          "legal genealogy through Joseph in Matthew 1:11-12, a tension that has drawn " +
          "various explanations across Jewish and Christian interpretive traditions, " +
          "including proposals that the curse applied only to the immediate royal throne in " +
          "the collapsed kingdom rather than to all future descendants absolutely.",
    surface: "Joseph", owner: "jeconiah", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The Jeconiah curse in controversies. The whole argument is about the line that reaches " +
         "Jesus through this Joseph." },
  { text: "When the emperor Augustus called for an empire-wide census, God used a Roman " +
          "bureaucratic decree to move Joseph and Mary from Nazareth in Galilee to Bethlehem " +
          "in Judea, the ancestral town of David.",
    surface: "Joseph", owner: "bib-loc-birth-of-jesus", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The birth-of-Jesus timeline article. Luke 2:1-5." },
  { text: "Joseph, likewise warned in a dream, takes Mary and the child and flees by night to " +
          "Egypt, a natural refuge just across the border with its own large Jewish " +
          "community.",
    surface: "Joseph", owner: "bib-loc-magi-flight-to-egypt", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 2:13-14. THE record where both men could most plausibly appear, and the reason " +
         "the owner entry was written only after every token on it was read: it names one " +
         "Joseph, once, and he is the husband. If the patriarch is ever added here, the entry " +
         "becomes the wrong lever and must be split into pins." },
  { text: "Joseph and Mary make their customary Passover pilgrimage to Jerusalem, and on the " +
          "journey home discover that the twelve-year-old Jesus isn't among the caravan of " +
          "relatives and friends.",
    surface: "Joseph", owner: "bib-loc-jesus-in-temple-age-twelve", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Luke 2:41-43." },
  { text: "With Herod the Great dead, an angel again instructs Joseph in a dream to bring " +
          "Mary and Jesus back from Egypt.",
    surface: "Joseph", owner: "bib-loc-return-nazareth-childhood", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 2:19-20, the first of three on the record with the most of them." },
  { text: "Learning that Herod's son Archelaus now ruled Judea with a reputation nearly as " +
          "ruthless as his father's, Joseph is warned once more and steers the family north " +
          "to Galilee, settling in Nazareth — the same small, unremarkable town Mary had " +
          "called home before the annunciation.",
    surface: "Joseph", owner: "bib-loc-return-nazareth-childhood", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 2:22." },
  { text: "Luke simply tells us the boy \"grew and became strong, filled with wisdom, and the " +
          "favor of God was upon him\" — a childhood of quiet, faithful obedience within " +
          "Joseph's carpentry trade rather than public ministry.",
    surface: "Joseph", owner: "bib-loc-return-nazareth-childhood", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "A possessive, and the third. The carpentry trade is his." },
  { text: "Within a few years the Senate would grant him the title 'Augustus,' inaugurating " +
          "the age of the emperors — and it is this same man, ruling in unchallenged peace " +
          "after Actium, who would one day order the census mentioned in Luke 2:1 that " +
          "brought Joseph and Mary to Bethlehem.",
    surface: "Joseph", owner: "wld-rom-battle-of-actium", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "A Roman-history article reaching the census from the other end. Not on the scoping " +
         "list either; found by the enumeration." },
  { text: "In 27 BC the Roman Senate granted Octavian the title 'Augustus,' inaugurating the " +
          "age of the Roman emperors and a long era of relative peace and order known as the " +
          "Pax Romana — the same 'Caesar Augustus' whose census decree, according to Luke " +
          "2:1, brought Joseph and Mary to Bethlehem for the birth of Jesus.",
    surface: "Joseph", owner: "wld-rom-augustus-becomes-emperor", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "SUMMARY — public page only, no snapshot, and the record's ONLY Joseph link. Without " +
         "this case nothing in this directory would ever mention it again." },
  { text: "Given this proximity, some scholars suggest Joseph and the young Jesus, as a " +
          "craftsman, may have found work in the city during its Herodian building boom, " +
          "though the New Testament never mentions Jesus visiting Sepphoris directly.",
    surface: "Joseph", owner: "sepphoris", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The Sepphoris POI. The craftsman beside the young Jesus is his adoptive father." },
  { text: "Where Joseph, Mary, and the infant Jesus fled to escape Herod's massacre, " +
          "fulfilling the prophecy \"out of Egypt I called my son\" (Matthew 2:13-15)",
    surface: "Joseph", owner: "egypt", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "A notable fact on the Egypt location record — a surface that was enumerated by nothing " +
         "at all until 2026-09-10. The same warning as bib-loc-magi-flight-to-egypt applies: one " +
         "Joseph today, and he is the husband, but this is the article a patriarch mention is " +
         "most likely to be added to." },
  { text: "This is the political backdrop for essentially the entire New Testament: Caesar " +
          "Augustus's census brings Joseph and Mary to Bethlehem (Luke 2:1-7); Roman soldiers " +
          "ultimately carry out Jesus's crucifixion, a distinctly Roman method of execution, " +
          "under the authority of the Roman governor Pilate (John 19:1-16); and the New " +
          "Testament's own dating markers (Tiberius's regnal years, various emperors and " +
          "governors named) are all Roman administrative facts Luke uses to anchor Gospel and " +
          "Acts events in verifiable history (Luke 3:1-2).",
    surface: "Joseph", owner: "romans", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The Romans topic. Its only Joseph, in the census clause." },
  { text: "Matthew opens with a genealogy tracing Jesus back to Abraham and David, anchoring " +
          "him in Israel's royal and covenant history, followed by the birth narrative: the " +
          "angelic message to Joseph, the virgin birth, the visit of the magi, and the flight " +
          "to Egypt to escape Herod.",
    surface: "Joseph", owner: "book-intro:Matthew", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew's own introduction, keyed on the synthesised book-intro owner. The reader path " +
         "already had every bare Joseph in Matthew right via BOOK_NAME_OVERRIDES; the " +
         "introduction is not a verse and had nothing." },
  { text: "It contains beloved songs such as Mary's Magnificat and Zechariah's prophecy, the " +
          "census that brings Joseph and Mary to Bethlehem, the manger, and the angels " +
          "announcing the birth to shepherds.",
    surface: "Joseph", owner: "book-intro:Luke", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "The same for Luke. Per-book, not per-testament — see the Genesis guard below." },

  // ── The one that is NOT the husband ──────────────────────────────────────────────────────────
  { text: "The two men wrap Jesus's body in clean linen cloths with the spices, according to " +
          "Jewish burial custom, and lay it in Joseph's own new tomb, cut into rock in a " +
          "garden near the crucifixion site, one in which no one had yet been buried.",
    surface: "Joseph", owner: "bib-loc-burial-of-jesus", expect: "joseph-of-arimathea",
    status: "guard",
    why: "NOT Mary's husband, and the reason every one of these was read in its own sentence " +
         "instead of being swept by rule. The article opens \"Joseph of Arimathea — a wealthy " +
         "member of the Sanhedrin\"; this is the tomb owner, named briefly the second time. " +
         "Applying the nativity rule here would have swapped one wrong man for another." },

  // ── The one record that names both men, and is pinned rather than owned ─────────────────────
  { text: "Most strikingly, Matthew records that Joseph fled with Mary and the infant Jesus " +
          "to Egypt to escape Herod's massacre of Bethlehem's infants, seeing in it a " +
          "fulfillment of Hosea's words, 'Out of Egypt I called my son' (Matthew 2:13-15; " +
          "Hosea 11:1) — the nation once defined by Israel's oppression becoming, one final " +
          "time, the place where God's own greater Son found safety.",
    surface: "Joseph", owner: "egyptians", expect: "joseph-husband-of-mary",
    status: "guard",
    why: "Matthew 2:13-15 on the Egyptians topic — the ONE record in the sweep that names both " +
         "Josephs, two paragraphs apart. A phrase pin, not an owner entry, because an owner " +
         "entry has one answer per record and would have taken the two correct patriarch links " +
         "in the guards immediately below." },
  { text: "Egypt's central role in Israel's story is bound up entirely with the book of " +
          "Exodus: what began as refuge, when Joseph rose to power there and welcomed his " +
          "father Jacob's family during a famine (Genesis 46-47), turned generations later " +
          "into brutal slavery once 'there arose a new king over Egypt, who didn't know " +
          "Joseph' (Exodus 1:8-14).",
    surface: "Joseph", owner: "egyptians", expect: "joseph-son-of-jacob", status: "guard",
    why: "KEPT — Genesis 41-47, the patriarch's son, on the same record as the pin above and " +
         "correct before and after it. This is the link an owner entry would have broken." },
  { text: "Egypt's central role in Israel's story is bound up entirely with the book of " +
          "Exodus: what began as refuge, when Joseph rose to power there and welcomed his " +
          "father Jacob's family during a famine (Genesis 46-47), turned generations later " +
          "into brutal slavery once 'there arose a new king over Egypt, who didn't know " +
          "Joseph' (Exodus 1:8-14).",
    surface: "Joseph", occurrence: 2, owner: "egyptians", expect: "joseph-son-of-jacob",
    status: "guard",
    why: "KEPT — Exodus 1:8, the second patriarch link in the same sentence, and the one that " +
         "sits closest to the pin. Two of the three Josephs on this record are the patriarch, " +
         "which is what makes it the only pinned record in the batch." },
  { text: "Egypt's central role in Israel's story is bound up entirely with the book of " +
          "Exodus: what began as refuge, when Joseph rose to power there and welcomed his " +
          "father Jacob's family during a famine (Genesis 46-47), turned generations later " +
          "into brutal slavery once 'there arose a new king over Egypt, who didn't know " +
          "Joseph' (Exodus 1:8-14).",
    surface: "Jacob", owner: "egyptians", expect: "jacob", status: "guard",
    why: "KEPT — and the patriarch Jacob, in the same clause, untouched by any of this." },

  // ── The guards that hold the scope down ──────────────────────────────────────────────────────
  // 28 records were named and only 28. If any line below moves, a record-scoped fix has become a
  // corpus-wide ruling by accident, and that ruling is Robbie's to make.
  { text: "In Egypt, Joseph is bought by Potiphar, an officer of Pharaoh, and Genesis repeats " +
          "a phrase across this whole ordeal like a drumbeat: \"the LORD was with Joseph.",
    surface: "Joseph", owner: "bib-pat-joseph-slavery-prison", expect: "joseph-son-of-jacob",
    status: "guard",
    why: "Real copy, not a probe sentence: the patriarch's son on the timeline article about " +
         "him. Roughly 150 links across the Genesis articles still resolve to him and are still " +
         "right; this is one of them." },
  { text: "That same theory offers a plausible explanation for Exodus 1:8's ominous line, " +
          "\"Now there arose a new king over Egypt, who did not know Joseph.",
    surface: "Joseph", owner: "wld-ane-hyksos-egypt", expect: "joseph-son-of-jacob",
    status: "guard",
    why: "An EGYPT article that is deliberately not in the list. The `egypt` and " +
         "`bib-loc-magi-flight-to-egypt` entries are keyed to their own records and cannot " +
         "reach this one." },
  { text: "The narrative follows the patriarchs across four generations — Abraham, Isaac, " +
          "Jacob, and finally Joseph — through covenant, testing, family conflict, and " +
          "reconciliation.",
    surface: "Joseph", owner: "book-intro:Genesis", expect: "joseph-son-of-jacob",
    status: "guard",
    why: "A BOOK INTRO that is deliberately not in the list. `book-intro:Matthew` and " +
         "`book-intro:Luke` are two keys, not a rule about introductions." },
  { text: "The narrative follows the patriarchs across four generations — Abraham, Isaac, " +
          "Jacob, and finally Joseph — through covenant, testing, family conflict, and " +
          "reconciliation.",
    surface: "Jacob", owner: "book-intro:Genesis", expect: "jacob", status: "guard",
    why: "And his father, in the same clause. Bare \"Jacob\" moved nowhere in this batch: 173 " +
         "of its links were enumerated and every one already pointed at the right man." },
  { text: "Joseph settled his father Jacob and brothers in Goshen because it was good " +
          "pastureland and separate from the main Egyptian population, who considered " +
          "shepherds detestable (Genesis 46:31-34; 47:1-6)",
    surface: "Joseph", owner: "goshen", expect: "joseph-son-of-jacob", status: "guard",
    why: "A LOCATION notable fact that is deliberately not in the list, on the same surface as " +
         "the `egypt` entry and the same field. One record, one key." },
  { text: "Joseph's bones, carried out of Egypt, were buried at Shechem in the plot Jacob had " +
          "purchased (Joshua 24:32)",
    surface: "Joseph", owner: "shechem", expect: "joseph-son-of-jacob", status: "guard",
    why: "And another. Joshua 24:32." },
  { text: "He was buried in a nearby rock-cut tomb belonging to Joseph of Arimathea (Matthew " +
          "27:57-60).",
    surface: "Joseph of Arimathea", owner: "jesus-of-nazareth", expect: "joseph-of-arimathea",
    status: "guard",
    why: "The proof that an owner entry keyed on `joseph` cannot reach a longer registered name: " +
         "the lookup is by the WHOLE matched string, so \"Joseph of Arimathea\" is a different " +
         "key. jesus-of-nazareth names both men and needed no pin for that reason." },
  { ref: "Genesis 41:41", surface: "Joseph", expect: "joseph-son-of-jacob", status: "guard",
    why: "Scripture, on the reader path, untouched. None of the 27 owner entries can reach a " +
         "verse — OWNER_NAME_OVERRIDES needs an owner and the Bible reader passes none — and the " +
         "one phrase pin was measured against all 31,098 WEB verses and hits none of them." },
  { ref: "Matthew 1:16", surface: "Joseph", expect: "joseph-husband-of-mary", status: "guard",
    why: "And the other man in Scripture, still right, by the route he already had." },

  // ── A THIRD Joseph — FIXED 2026-09-10, and he needed no record of his own ────────────────────
  //
  // This line was `known-wrong` until then, on the reasoning that Joseph Barnabas "has no record
  // of his own" and so `null` was the right answer. That reasoning was wrong, and the fix is the
  // correction of it: HE IS BARNABAS. Acts 4:36 says the apostles renamed him, so the record the
  // app already has IS his, and the entry belongs in OWNER_NAME_OVERRIDES mapped to `barnabas` —
  // the record's own id, handed back to the self-link exclusion, exactly as `augustus` is on
  // claudius-caesar. Not `null`, which in that table means a different, unrepresented bearer.
  //
  // `expect: null` is unchanged and is now what a CORRECT resolution looks like: a page does not
  // link to itself, so the observable answer on Barnabas's own page is no link either way. The
  // difference is why, and it is the whole point — mapped to `barnabas` this survives the sentence
  // being rewritten and points at the right man if the text is ever quoted elsewhere.
  { text: "Barnabas is introduced in Acts as Joseph, a Levite from Cyprus, whom the apostles " +
          "nicknamed \"Barnabas,\" meaning \"son of encouragement.",
    surface: "Joseph", owner: "barnabas", expect: null, status: "guard",
    why: "Acts 4:36 — Joseph Barnabas, who is neither the patriarch nor Mary's husband. Resolved " +
         "to Joseph son of Jacob until 2026-09-10 and sent a reader of Barnabas's own page to " +
         "Egypt. OWNER_NAME_OVERRIDES `joseph.barnabas -> \"barnabas\"`: his own page, so the " +
         "self-link exclusion suppresses it. ONE prose row moved and no Bible row did." },

  // The reader path, all three translations, on the same verse — and they do not print the same
  // word. Fetched 2026-09-10 from bible-api.com, the service src/lib/biblePassage.ts asks for the
  // text; the Greek behind the split is Ἰωσῆς in the Textus Receptus against Ἰωσήφ in NA28 and
  // SBLGNT, read off the editions. Same man in every one of them — the verse's own content is that
  // the apostles surnamed him Barnabas — so this is a spelling variant, not a second person.
  //
  // These three are `text` + `ref` cases: the reader path run against a supplied literal rather
  // than against the WEB corpus, which is the only way to assert anything about KJV or ASV. See
  // the block in run.mjs. Without them the Acts 4:36 override has NO cover at all — it matches
  // nothing in WEB, so the snapshot cannot see it and never will.
  { ref: "Acts 4:36", translation: "ASV",
    text: "And Joseph, who by the apostles was surnamed Barnabas (which is, being interpreted, " +
          "Son of exhortation), a Levite, a man of Cyprus by race,",
    surface: "Joseph", expect: "barnabas", status: "guard",
    why: "The one translation of the three that prints \"Joseph\" here. VERSE_NAME_OVERRIDES " +
         "joseph.Acts[\"4:36\"] sends it to Barnabas — a link to the right man rather than no " +
         "link, because the app has him. Was resolving to joseph-son-of-jacob." },
  { ref: "Acts 4:36", translation: "KJV",
    text: "And Joses, who by the apostles was surnamed Barnabas, (which is, being interpreted, " +
          "The son of consolation,) a Levite, and of the country of Cyprus,",
    surface: "Barnabas", expect: "barnabas", status: "guard",
    why: "KJV follows the TR and prints \"Joses\", which is registered to nobody, so the override " +
         "has nothing to match and this reader sees no wrong link — the surname is asserted here " +
         "instead. This is what a translation-blind override doing nothing looks like." },
  { ref: "Acts 4:36", surface: "Barnabas", expect: "barnabas", status: "guard",
    why: "And WEB, from the corpus, which also reads \"Joses\". The Bible snapshot is unchanged " +
         "by this fix for exactly that reason, and a green snapshot is NOT evidence the ASV " +
         "override fires." },

  // ── The patriarch, still the patriarch, where he should be ──────────────────────────────────
  // The failure mode this fix could have had is corpus-wide, so these pin the other end of it.
  // Both mechanisms are narrow by construction: OWNER_NAME_OVERRIDES needs excludeId === "barnabas"
  // and VERSE_NAME_OVERRIDES needs Acts 4:36 exactly.
  { ref: "Acts 7:13", surface: "Joseph", expect: "joseph-son-of-jacob", status: "guard",
    why: "Stephen's speech, four verses of the patriarch in the SAME BOOK as the override above. " +
         "The override is keyed to one verse, not to Acts." },
  { ref: "Acts 7:18", surface: "Joseph", expect: "joseph-son-of-jacob", status: "guard",
    why: "\"until there arose a different king, who didn't know Joseph.\" Same speech, same man." },
  { text: "Barnabas is introduced in Acts as Joseph, a Levite from Cyprus, whom the apostles " +
          "nicknamed \"Barnabas,\" meaning \"son of encouragement.",
    surface: "Joseph", owner: "joseph-son-of-jacob", expect: null, status: "guard",
    why: "The SAME SENTENCE with a different owner — the patriarch's own page. No link, because " +
         "that is the self-link exclusion, and it proves the barnabas entry is keyed on the owner " +
         "rather than on the words. Change the owner to anything else and the patriarch comes " +
         "back, which is the case below." },
  { text: "Barnabas is introduced in Acts as Joseph, a Levite from Cyprus, whom the apostles " +
          "nicknamed \"Barnabas,\" meaning \"son of encouragement.",
    surface: "Joseph", owner: "cyprus", expect: "joseph-son-of-jacob", status: "guard",
    why: "And the same sentence on a record with no entry in the table at all: the global default " +
         "is untouched. If this ever stops saying joseph-son-of-jacob, a bare \"Joseph\" has been " +
         "repointed corpus-wide — 249 Bible occurrences and 134 in our prose — and that ruling is " +
         "Robbie's, not a side effect." },

  // ── A FOURTH bearer, at Acts 1:23 — SUPPRESSED, 2026-09-10 ──────────────────────────────────
  //
  // "Joseph called Barsabbas, who was also called Justus" — the man passed over for Matthias. He is
  // not the patriarch, not Mary's husband, not Joseph of Arimathea and not the Barnabas of 4:36
  // thirty-one verses later, and he was resolving to Joseph son of Jacob on both paths.
  //
  // Measured with the previous batch and escalated rather than swept in; the ruling came back the
  // same day: suppress, no new record. He has ONE mention in the whole of Scripture and no article,
  // so a `joseph-barsabbas` record would be a page with nothing on it, and `null` in
  // VERSE_NAME_OVERRIDES is precisely "a different bearer this app does not represent" — the shape
  // `zadok`, `eleazar` and Simon Peter's father already have. That is the OPPOSITE call from 4:36
  // directly above, which resolves rather than suppresses, and for one reason only: the app has
  // Barnabas and does not have this man.
  //
  // Unlike 4:36 this one is wrong for EVERY reader. All three translations print "Joseph" here —
  // fetched 2026-09-10 from bible-api.com, the service src/lib/biblePassage.ts asks for the text.
  // They differ on the surname (KJV "Barsabas", WEB and ASV "Barsabbas") and nowhere else that
  // matters; no word in the clause but "Joseph" is registered to anybody. So this entry moves a
  // real WEB row, which 4:36's does not, and the Bible snapshot sees it.
  { ref: "Acts 1:23", surface: "Joseph", expect: null, status: "guard",
    why: "WEB, from the corpus. VERSE_NAME_OVERRIDES joseph.Acts[\"1:23\"] = null. Was " +
         "joseph-son-of-jacob, sending a reader of Acts 1 to Egypt. READER PATH ONLY: the panel " +
         "path passes no book and still says joseph-son-of-jacob, and nothing in this file can " +
         "change that — same residual as 2 Samuel 20:14's Abel above. It is not reader-facing " +
         "today (every LinkedVerseText call site in src/ is handed authored prose, never a " +
         "verse's Scripture text), and no article in the app names this man, so there is no owner " +
         "for OWNER_NAME_OVERRIDES to key on either." },
  { ref: "Acts 1:23", translation: "ASV",
    text: "And they put forward two, Joseph called Barsabbas, who was surnamed Justus, and Matthias.",
    surface: "Joseph", expect: null, status: "guard",
    why: "The reader path against the ASV literal. Same word, same suppression — this is what a " +
         "translation-blind override looks like when the three translations AGREE, and it is the " +
         "contrast with Acts 4:36, where only the ASV printed \"Joseph\" at all." },
  { ref: "Acts 1:23", translation: "KJV",
    text: "And they appointed two, Joseph called Barsabas, who was surnamed Justus, and Matthias.",
    surface: "Joseph", expect: null, status: "guard",
    why: "And the KJV, which spells the surname \"Barsabas\" with one b. The override is keyed on " +
         "book/chapter/verse and on the name \"joseph\", not on the surrounding wording, so the " +
         "spelling split costs it nothing — which is the argument for using this table here rather " +
         "than a phrase pin." },

  // ── The patriarch, still the patriarch, on BOTH sides of the suppressed verse ────────────────
  // Acts 7:13 and 7:18 above already guard the same book for the 4:36 entry. These two are the
  // rest of Stephen's speech, and they are here because a per-verse suppression that leaked to the
  // book would empty the patriarch out of Acts entirely and no case above would have said so.
  { ref: "Acts 7:9", surface: "Joseph", expect: "joseph-son-of-jacob", status: "guard",
    why: "\"The patriarchs, moved with jealousy against Joseph, sold him into Egypt.\" Six chapters " +
         "after the suppression, in the same book. joseph.Acts is keyed to two verses, not to Acts." },
  { ref: "Acts 7:14", surface: "Joseph", expect: "joseph-son-of-jacob", status: "guard",
    why: "\"Joseph sent, and summoned Jacob, his father\" — the patriarch and, in the same clause, " +
         "the patriarch's father, who is also the bare \"Jacob\" default. Both survive." },

  // ── JUDAS CALLED BARSABBAS — a FIFTH Judas, at Acts 15:22, 15:27 and 15:32. SUPPRESSED ───────
  //
  // Found live on www.capstonebible.com: `curl https://www.capstonebible.com/person/silas` returned
  // `<a href="/person/judas-iscariot">Judas</a> called Barsabbas`. Iscariot is dead at Acts 1:18,
  // seven chapters before the Jerusalem council sends this man to Antioch with Silas.
  //
  // Same ruling and same shape as Acts 1:23's Joseph above: three mentions in all of Scripture, no
  // article, no record, so `null` in VERSE_NAME_OVERRIDES — "a different bearer this app does not
  // represent" — rather than a `judas-barsabbas` page with nothing on it. And unlike Acts 4:36,
  // wrong for EVERY reader: all three translations print "Judas" at all three verses, fetched
  // 2026-09-10 from bible-api.com, the service src/lib/biblePassage.ts asks for the text. They
  // differ only on the surname at 15:22 (KJV "Barsabas", WEB and ASV "Barsabbas") and on KJV's
  // leading "And" at 15:32, which moves the offset off zero — neither of which a verse-keyed
  // override can see, and that is the argument for this table over a phrase pin.
  //
  // Nine cases: the three verses from the WEB corpus, and the same three in ASV and KJV against
  // literals, which is the only way to assert either translation.
  { ref: "Acts 15:22", surface: "Judas", expect: null, status: "guard",
    why: "WEB, from the corpus. VERSE_NAME_OVERRIDES judas.Acts[\"15:22\"] = null. Was " +
         "judas-iscariot. \"Judas called Barsabbas, and Silas, chief men among the brothers\" — the " +
         "two men the Jerusalem council sent to Antioch. Paul, Barnabas and Silas in the same verse " +
         "are all correct and are untouched. READER PATH ONLY: the panel path passes no book and " +
         "still says judas-iscariot, the same structural residual as Acts 1:23 above; the article " +
         "half of this fault is fixed by OWNER_NAME_OVERRIDES judas.silas." },
  { ref: "Acts 15:27", surface: "Judas", expect: null, status: "guard",
    why: "WEB, from the corpus. \"We have sent therefore Judas and Silas\" — the same two men, and " +
         "here the name is bare, with no surname to disambiguate it in any translation." },
  { ref: "Acts 15:32", surface: "Judas", expect: null, status: "guard",
    why: "WEB, from the corpus. \"Judas and Silas, also being prophets themselves\" — the sentence " +
         "Silas's life story cites, and the reason his page said Iscariot." },
  { ref: "Acts 15:22", translation: "ASV",
    text: "Then it seemed good to the apostles and the elders, with the whole church, to choose men out of their company, and send them to Antioch with Paul and Barnabas; [namely], Judas called Barsabbas, and Silas, chief men among the brethren:",
    surface: "Judas", expect: null, status: "guard",
    why: "The ASV literal. \"church\" for \"assembly\", \"brethren\" for \"brothers\", a bracketed " +
         "[namely] the WEB does not print — and the same \"Judas\", suppressed identically, because " +
         "the override is keyed on book/chapter/verse and the name, not on the wording." },
  { ref: "Acts 15:22", translation: "KJV",
    text: "Then pleased it the apostles and elders, with the whole church, to send chosen men of their own company to Antioch with Paul and Barnabas; namely, Judas surnamed Barsabas, and Silas, chief men among the brethren:",
    surface: "Judas", expect: null, status: "guard",
    why: "The KJV literal, which reads \"surnamed Barsabas\" with one b where WEB and ASV read " +
         "\"called Barsabbas\". A phrase pin on \"Judas called Barsabbas\" would have missed this " +
         "reader entirely; the verse key does not." },
  { ref: "Acts 15:27", translation: "ASV",
    text: "We have sent therefore Judas and Silas, who themselves also shall tell you the same things by word of mouth.",
    surface: "Judas", expect: null, status: "guard",
    why: "The ASV literal at 15:27. Bare name, no surname anywhere in the verse — nothing but the " +
         "verse key could reach it." },
  { ref: "Acts 15:27", translation: "KJV",
    text: "We have sent therefore Judas and Silas, who shall also tell you the same things by mouth.",
    surface: "Judas", expect: null, status: "guard",
    why: "The KJV literal at 15:27, which drops \"themselves\" and \"by word of\"." },
  { ref: "Acts 15:32", translation: "ASV",
    text: "And Judas and Silas, being themselves also prophets, exhorted the brethren with many words, and confirmed them.",
    surface: "Judas", expect: null, status: "guard",
    why: "The ASV literal at 15:32. Note the leading \"And\": the surface sits at offset 4 here and " +
         "at offset 0 in the WEB case above, which is exactly the kind of drift a phrase pin or an " +
         "offset-sensitive fix would trip on." },
  { ref: "Acts 15:32", translation: "KJV",
    text: "And Judas and Silas, being prophets also themselves, exhorted the brethren with many words, and confirmed them.",
    surface: "Judas", expect: null, status: "guard",
    why: "The KJV literal at 15:32, same leading \"And\", different word order after it." },

  // ── The article half, and the guards on both sides in the same book ──────────────────────────
  { text: "Silas first appears as one of two 'leaders among the believers' in the Jerusalem church — alongside Judas called Barsabbas — chosen to carry the Jerusalem council's decision about Gentile converts to the church in Antioch, where he is described as a prophet who encouraged and strengthened the believers there (Acts 15:22, 15:32).",
    surface: "Judas", owner: "silas", expect: null, status: "guard",
    why: "The PANEL/prose path, quoted verbatim from silas's lifeStory in people.ts. This is the " +
         "sentence a reader actually met — it rendered `<a href=\"/person/judas-iscariot\">Judas</a> " +
         "called Barsabbas` on the public page. OWNER_NAME_OVERRIDES judas.silas = null. No verse " +
         "override can reach this surface, and no phrase pin was reached for: `links-for.mjs " +
         "--grep \"Barsabb|Barsabas\"` returns this one block in the whole corpus, and the silas " +
         "record holds exactly one \"Judas\", so a whole-record answer is both sufficient and exact." },
  { ref: "Acts 1:16", surface: "Judas", expect: "judas-iscariot", status: "guard",
    why: "\"…concerning Judas, who was guide to those who took Jesus.\" The REAL Iscariot, fourteen " +
         "chapters before the suppression and in the same book. judas.Acts is keyed to four verses, " +
         "not to Acts — if this ever goes to `-`, the entry has leaked to the book." },
  { ref: "Acts 1:25", surface: "Judas", expect: "judas-iscariot", status: "guard",
    why: "\"…this ministry and apostleship from which Judas fell away\" — Iscariot again, nine " +
         "verses later, and the other side of the same guard." },
  { ref: "Acts 1:13", surface: "Judas the son of James", expect: "thaddaeus", status: "guard",
    why: "The third Judas in Acts, matched as a whole phrase and pointed at Thaddaeus by " +
         "judas.Acts[\"1:13\"]. Duplicated deliberately from the Acts 1:13 block above: that one " +
         "guards the apostle-list work, this one guards the Acts 15 entries landing in the same " +
         "Record without disturbing their neighbour." },

  // ── A SIXTH bearer, in the same book, MEASURED AND NOT FIXED ─────────────────────────────────
  // Acts 5:37's "Judas of Galilee" — the revolt leader Gamaliel names beside Theudas — still
  // resolves to Iscariot on both paths, as do the "Judas" mentions on quirinius's record that
  // describe the same man. Found during the Acts 15 pass and deliberately left alone, on exactly
  // the precedent Acts 1:23 set: whether he gets `null` or a record is a content decision, and it
  // belongs to the second-bearer enumeration filed on 2026-09-10 rather than to this fix. NOT
  // recorded as a `known-wrong` case, because a known-wrong asserts a settled right answer and this
  // one is not settled.
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // THE SECOND-BEARER SWEEP — BATCH 1: THE TEN LINKS THAT ARE ONLY ON THE PUBLIC PAGES
  // 2026-09-10
  //
  // These ten cases are not belt-and-braces. They are the ONLY cover these links will ever have.
  // Each quotes a `summary` verbatim — a field every panel in the app renders as PLAIN TEXT and
  // that scripts/seo/render.mjs puts through this same linker, passing the record's own id, when
  // it generates the ~985 pre-rendered pages at capstonebible.com. `loadProseBlocks()` therefore
  // does not enumerate them and none of the three snapshots holds a single row: 795 person links
  // on 985 blocks that a stranger can read and that the regression net cannot see. Delete one of
  // these cases and the assertion is gone with no diff anywhere to say so.
  //
  // Verified by re-running the SEO-only surface before and after: exactly ten links moved, and
  // nothing else on that surface moved at all.

  { text: "An apostle known by different names in different Gospels, with one clear moment in John's account: asking Jesus why he would reveal himself only to his followers and not to the world.",
    surface: "John", owner: "thaddaeus", expect: null, status: "guard",
    why: "PUBLIC PAGE ONLY — thaddaeus.summary, verbatim. Was john-the-baptist, who was dead " +
         "before the Fourth Gospel was written. \"John's account\" is the Gospel narrating, and " +
         "this file's standing answer to the narrating voice is suppression, not the Apostle: no " +
         "link removes the falsehood and asserts nothing about who held the pen. " +
         "OWNER_NAME_OVERRIDES john.thaddaeus = null." },
  { text: "A local church leader named in 3 John as someone who loved to have first place — he refused to welcome traveling teachers sent by John and expelled from the church anyone who did, making him one of the only named, clearly negative figures in the New Testament.",
    surface: "John", occurrence: 1, owner: "diotrephes", expect: null, status: "guard",
    why: "PUBLIC PAGE ONLY — diotrephes.summary, verbatim. Occurrence 1 is the BOOK TITLE \"3 " +
         "John\", suppressed by BOOK_NUMERAL in NAME_CONTEXT_RULES, which is checked before the " +
         "owner table and is therefore unaffected by the entry the next case asserts." },
  { text: "A local church leader named in 3 John as someone who loved to have first place — he refused to welcome traveling teachers sent by John and expelled from the church anyone who did, making him one of the only named, clearly negative figures in the New Testament.",
    surface: "John", occurrence: 2, owner: "diotrephes", expect: null, status: "guard",
    why: "PUBLIC PAGE ONLY — the same summary, second occurrence: \"traveling teachers sent by " +
         "John\". Was john-the-baptist. SUPPRESSED and deliberately NOT repointed to the Apostle, " +
         "which is where the sweep that found it wanted to send it: the app's own introduction to " +
         "3 John says \"the elder\" throughout and never names him, and this record's own first " +
         "sentence says \"The elder writing 3 John\". A link would assert an authorship the app " +
         "has pointedly declined to assert, on a page a stranger can read. " +
         "OWNER_NAME_OVERRIDES john.diotrephes = null." },
  { text: "The brother of Martha and Mary whose death and resurrection in John's Gospel is presented as the climactic sign that provokes the religious leaders into finally moving to kill Jesus.",
    surface: "Mary", owner: "lazarus-of-bethany", expect: "mary-of-bethany", status: "guard",
    why: "PUBLIC PAGE ONLY — lazarus-of-bethany.summary, verbatim. Was mary-mother-of-jesus, " +
         "because the bare key belongs to her. His sister has a record of her own; the record " +
         "names no other Mary. OWNER_NAME_OVERRIDES mary.lazarus-of-bethany. The \"John\" in the " +
         "same sentence is \"John's Gospel\" and stays suppressed by POSSESSIVE_WORK." },
  { text: "A sorcerer in Samaria who amazed crowds with his magic, converted and was baptized under Philip's preaching, then tried to buy the apostles' power to impart the Holy Spirit — his name became the root of the word 'simony.'",
    surface: "Philip", owner: "simon-magus", expect: "philip-the-evangelist", status: "guard",
    why: "PUBLIC PAGE ONLY — simon-magus.summary, verbatim. Acts 8's Philip is the Evangelist, " +
         "one of the seven; the reader path has had him right at all fifteen of his verses since " +
         "VERSE_NAME_OVERRIDES was written, and the article surface has no verse to look at. " +
         "OWNER_NAME_OVERRIDES philip.simon-magus." },
  { text: "A court official in charge of the entire treasury of the Ethiopian queen (Candace), converted and baptized by Philip the Evangelist after Philip explained the 'suffering servant' passage of Isaiah he was reading on the road.",
    surface: "Philip", occurrence: 1, owner: "ethiopian-eunuch", expect: "philip-the-evangelist",
    expectSurface: "Philip the Evangelist", status: "guard",
    why: "PUBLIC PAGE ONLY — ethiopian-eunuch.summary, verbatim, and the sentence that argued for " +
         "doing these ten first. The LONG name is its own registered key and was always right; " +
         "expectSurface pins that the link still covers all three words rather than shrinking to " +
         "the forename once the owner entry lands." },
  { text: "A court official in charge of the entire treasury of the Ethiopian queen (Candace), converted and baptized by Philip the Evangelist after Philip explained the 'suffering servant' passage of Isaiah he was reading on the road.",
    surface: "Philip", occurrence: 2, owner: "ethiopian-eunuch", expect: "philip-the-evangelist",
    expectSurface: "Philip", status: "guard",
    why: "The other half of the same sentence: the BARE \"Philip\" ten words later, which resolved " +
         "to philip-the-apostle. One sentence on a public page named the right man at length and " +
         "a different man in shorthand, and linked both. OWNER_NAME_OVERRIDES philip." +
         "ethiopian-eunuch." },
  { text: "Philip explains Isaiah's suffering servant to an Ethiopian court official and baptizes him beside a desert road.",
    surface: "Philip", owner: "bib-ac-philip-ethiopian-eunuch", expect: "philip-the-evangelist",
    status: "guard",
    why: "PUBLIC PAGE ONLY — bib-ac-philip-ethiopian-eunuch.summary, verbatim. The event's own " +
         "title names the Evangelist and its summary linked the Apostle." },
  { text: "Simon Maccabeus, last surviving son of Mattathias, secured Judea's release from Seleucid tribute and was confirmed as hereditary high priest and ruler, founding the Hasmonean dynasty and restoring Jewish self-government for the first time since the Babylonian exile.",
    surface: "Simon", owner: "bib-it-hasmonean-dynasty-begins", expect: null, status: "guard",
    why: "PUBLIC PAGE ONLY — bib-it-hasmonean-dynasty-begins.summary, verbatim. Was simon-peter. " +
         "Simon Maccabeus is a different man by two centuries and the app has no record for him. " +
         "SUPPRESSED, not written: whether he earns a record is Robbie's and is on his list, and a " +
         "record later replaces this entry. Note the surface is the bare forename even though the " +
         "sentence reads \"Simon Maccabeus\" — no registered key covers the pair." },
  { text: "Simon's son John Hyrcanus ruled Judea for three decades, exploiting Seleucid weakness to expand the Hasmonean kingdom dramatically, including the forced conversion of Idumea and the destruction of the rival Samaritan temple on Mount Gerizim.",
    surface: "Simon", owner: "bib-it-john-hyrcanus-reign", expect: null, status: "guard",
    why: "PUBLIC PAGE ONLY — bib-it-john-hyrcanus-reign.summary, verbatim. The same man, named as " +
         "John Hyrcanus's father. \"John Hyrcanus\" itself is already suppressed by the john " +
         "context rules and is untouched by this." },
  { text: "In AD 70, after a brutal months-long siege, Roman forces under Titus breached Jerusalem's walls, burned the Second Temple to the ground, and left the city in ruins — a devastating fulfillment of Jesus's own prophetic warning that not one of the Temple's stones would be left on another.",
    surface: "Titus", owner: "wld-rom-destruction-of-jerusalem", expect: null, status: "guard",
    why: "PUBLIC PAGE ONLY — wld-rom-destruction-of-jerusalem.summary, verbatim. Was `titus`, " +
         "Paul's Gentile co-worker. This is Titus the emperor, Vespasian's son, who burned the " +
         "Temple — pointing him at a companion of Paul is the kind of error that costs a reader's " +
         "confidence in the rest of the page. No record exists for the emperor; suppression is the " +
         "interim and the record-or-suppress question is the largest the sweep raised." },
  { text: "In a single violent campaign, Jehu kills King Joram, Judah's King Ahaziah, and Jezebel herself, then wipes out Baal worship in Israel — fulfilling Elijah's prophecies to the letter, though only partially reforming the nation.",
    surface: "Joram", owner: "bib-dki-jehu-purge", expect: "joram-king-of-israel", status: "guard",
    why: "PUBLIC PAGE ONLY — bib-dki-jehu-purge.summary, verbatim. Two kings called Joram reigned " +
         "at the same moment, one in each kingdom, and the app has a record for each; the bare key " +
         "is Judah's. Jehu killed ISRAEL's — and this very sentence names Judah's king separately " +
         "in the next clause. OWNER_NAME_OVERRIDES joram.bib-dki-jehu-purge." },

  // ── Guards on the other side of every one of the six names above ─────────────────────────────
  // Each asserts that the famous bearer still resolves where he should, on the surface the change
  // touched. Negative-tested: each was flipped to the wrong target once and confirmed to fail.

  { text: "In John's account, when Philip tells Nathanael he has found the Messiah in Jesus of Nazareth, Nathanael responds skeptically, \"Can anything good come out of Nazareth?\" Jesus then tells him, \"Before Philip called you, when you were under the fig tree, I saw you,\" and Nathanael immediately declares, \"Rabbi, you are the Son of God! You are the King of Israel!\" (John 1:45-51). He is later named among the disciples present at the Sea of Tiberias when the risen Jesus appears, identified there as \"Nathanael of Cana in Galilee\" (John 21:2).",
    surface: "Philip", owner: "bartholomew-nathanael", expect: "philip-the-apostle", status: "guard",
    why: "The ARTICLE surface, quoted from bartholomew-nathanael's lifeStory. The Apostle keeps " +
         "the bare key everywhere the owner table says nothing, which is the whole Gospel cast. If " +
         "a later batch ever moves the global default for \"Philip\", this fails first." },
  { ref: "John 1:43", surface: "Philip", expect: "philip-the-apostle", status: "guard",
    why: "The reader path, other side of the same name and in the Gospel where he belongs. The " +
         "Evangelist's fifteen verses are all in Acts." },
  { ref: "Acts 21:8", surface: "Philip the evangelist", expect: "philip-the-evangelist", status: "guard",
    why: "Acts 21:8 prints the long name in lower case (\"Philip the evangelist\"), which the " +
         "registered key matches case-insensitively — the reason the Evangelist was ever findable " +
         "at all before the verse table was written." },
  { text: "The first Roman emperor, whose empire-wide registration decree is named in Luke's Gospel as the reason Joseph and Mary traveled to Bethlehem, where Jesus was born.",
    surface: "Mary", owner: "caesar-augustus", expect: "mary-mother-of-jesus", status: "guard",
    why: "PUBLIC PAGE ONLY — caesar-augustus.summary. The bare \"Mary\" default is untouched by " +
         "the lazarus-of-bethany entry, and this asserts it on the same uncovered surface." },
  { text: "One of the women who followed and financially supported Jesus's ministry, present at the crucifixion and among the first to find the tomb empty; often identified as the mother of James and John.",
    surface: "John", owner: "salome-follower-of-jesus", expect: "john-the-apostle", status: "guard",
    why: "PUBLIC PAGE ONLY — salome-follower-of-jesus.summary. Her entry in the john owner table " +
         "predates this batch and must survive it; the two suppressions added alongside it are " +
         "keyed to other records." },
  { text: "A Jerusalem temple priest struck mute for doubting an angel's promise of a son in his old age, whose voice returned at John's naming and burst into prophecy.",
    surface: "John", owner: "zechariah-father-of-john-baptist", expect: "john-the-baptist", status: "guard",
    why: "PUBLIC PAGE ONLY. The Baptist keeps the bare key by global default, and this is the " +
         "sentence where he is unambiguously the right answer — his own naming, on his father's " +
         "page. A careless widening of the john suppressions takes this first." },
  { text: "'Christ' is a translation before it is anything else. The Greek Christos renders the Hebrew mashiach, 'anointed one,' and the Gospel of John twice stops to say so for readers who would not have known: Andrew tells Simon 'We have found the Messiah!' and the text adds the gloss '(which is, being interpreted, Christ)' (John 1:41), and the Samaritan woman says 'I know that Messiah comes, he who is called Christ' (John 4:25). These two verses are the only places the World English Bible keeps the Hebrew-derived word rather than translating it.",
    surface: "Simon", owner: "the-christ", expect: "simon-peter", status: "guard",
    why: "The ARTICLE surface, quoted from the-christ's section text. Bare \"Simon\" still means " +
         "Simon Peter everywhere the owner table says nothing — the two Hasmonean suppressions " +
         "above are keyed to two timeline events and reach nothing else." },
  { text: "Paul had left Titus on the island of Crete to bring order to the young churches there. The letter's purpose is to instruct Titus on appointing qualified elders in every town, confronting rebellious and deceptive teachers (a problem Paul says is acute on Crete), and teaching sound doctrine that leads to godly living across all groups in the church. It is a compact companion to 1 Timothy, focused on leadership and healthy conduct.",
    surface: "Titus", owner: "book-intro:Titus", expect: "titus", status: "guard",
    why: "The book intro, which passes bookIntroOwnerId(\"Titus\") as its excludeId. Paul's " +
         "companion keeps the bare key; the emperor suppression is keyed to one timeline event." },
  { text: "Joram, more commonly called Jehoram in 2 Kings and 2 Chronicles, became king after his father Jehoshaphat and immediately consolidated power by killing all of his brothers along with some officials of Israel (2 Chronicles 21:1-4). He is not the Joram son of Ahab who ruled the northern kingdom at the same moment under the same two names; the deciding phrase in the text is almost always \"the son of Jehoshaphat\" or \"king of Judah\" in the same clause.",
    surface: "Joram", occurrence: 2, owner: "joram-king-of-judah", expect: "joram-king-of-israel",
    expectSurface: "Joram son of Ahab", status: "guard",
    why: "The ARTICLE surface. The long form is its own registered key on the Israel record and " +
         "resolves correctly on Judah's own page — the sentence whose whole point is that the two " +
         "men are different. The first \"Joram\" in the same block is the page's own subject and " +
         "is suppressed by the self-link exclusion." },
  { ref: "2 Kings 8:16", surface: "Jehoram the son of Jehoshaphat", expect: "joram-king-of-judah",
    status: "guard",
    why: "The reader path, both kings in one verse: \"In the fifth year of Joram the son of Ahab " +
         "king of Israel… Jehoram the son of Jehoshaphat king of Judah began to reign.\" Judah's " +
         "king keeps his own long key. Nothing in this batch touches Scripture." },
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // SECOND-BEARER BATCH 2: THE WHOLE PHILIP CLUSTER, 2026-09-10
  //
  // 49 wrong links across three different men, and the largest single group is the one nothing
  // here could ever have caught: A RECORD'S OWN PAGE. Every "Philip" in the Evangelist's life
  // story pointed at the Apostle, and every "Philip" on the Tetrarch's page did too, because the
  // self-link exclusion is `id !== excludeId` and only fires when the resolved id IS the owner.
  // The snapshot was green throughout — the links never moved, so there was never a diff.
  // scripts/name-linker/self-name.mjs now sweeps for exactly that shape.
  //
  // Scripture is untouched: the reader path has had all three Philips right since
  // VERSE_NAME_OVERRIDES was written. The verse guards below are the proof of that, on both sides.

  { text: "Philip was one of seven men — 'full of the Spirit and of wisdom' — chosen by the Jerusalem church to oversee the daily distribution of food to widows, freeing the apostles to focus on prayer and teaching the word (Acts 6:1-6). Scripture nowhere calls these seven 'deacons' by title, but the role and the qualifications Luke describes are why the office has traditionally been read that way.",
    surface: "Philip", owner: "philip-the-evangelist", expect: null, status: "guard",
    why: "THE RECORD'S OWN PAGE, first sentence of philip-the-evangelist's lifeStory. It linked to " +
         "philip-the-apostle — the page's own subject, handed to a different man, on all six " +
         "mentions. OWNER_NAME_OVERRIDES philip.philip-the-evangelist maps to the record itself, " +
         "so the self-link exclusion suppresses it, exactly as bare \"Saul\" behaves on Paul's page." },
  { text: "Philip was a son of Herod the Great and his wife Cleopatra of Jerusalem (not the famous Egyptian queen). After Herod's death in 4 BC, Philip received the smallest but most stable share of his father's kingdom: the largely non-Jewish territories of Iturea, Trachonitis, Gaulanitis, Batanea, and Auranitis, northeast of the Sea of Galilee.",
    surface: "Philip", owner: "philip-the-tetrarch", expect: null, status: "guard",
    why: "The same shape on the Tetrarch's own page, and the reason his eleven mentions can take " +
         "ONE record-wide answer: six of them are him and the other five are a third Philip with " +
         "no record, and both answers render as no link." },
  { text: "Philip the Tetrarch should be carefully distinguished from a different son of Herod the Great, sometimes called Herod Philip (or Herod II), the son of Herod's wife Mariamne II. This other son is identified in the Gospels as Herodias's first husband, called simply 'Philip' in Mark 6:17 and Matthew 14:3 ('Herod had sent and seized John and bound him in prison for the sake of Herodias, his brother Philip's wife'). Josephus, however, never calls this man Philip — he calls him Herod, and states he lived as a private citizen in Rome without ever holding territory or a title (Antiquities 18.5.1, 4). Scholars generally reconcile this by noting Herodian princes commonly bore multiple names (this brother may well have been 'Herod Philip'), though the exact naming remains a point of scholarly discussion; in any case, he is a distinct individual from Philip the Tetrarch, who never married Herodias.",
    surface: "Philip", occurrence: 4, owner: "philip-the-tetrarch", expect: null, status: "guard",
    why: "THE THIRD PHILIP, in the paragraph written to distinguish him: \"his brother Philip's " +
         "wife\", quoting Mark 6:17. Herod Philip I, Herodias's first husband, whom the app has no " +
         "record for. It resolved to the Apostle. This is the occurrence that would have needed a " +
         "phrase pin if the record-wide answer pointed anywhere but at no link — recorded here so " +
         "that if a record for Herod Philip I is ever written, this case is what fails." },
  { text: "Philip the Tetrarch should be carefully distinguished from a different son of Herod the Great, sometimes called Herod Philip (or Herod II), the son of Herod's wife Mariamne II. This other son is identified in the Gospels as Herodias's first husband, called simply 'Philip' in Mark 6:17 and Matthew 14:3 ('Herod had sent and seized John and bound him in prison for the sake of Herodias, his brother Philip's wife'). Josephus, however, never calls this man Philip — he calls him Herod, and states he lived as a private citizen in Rome without ever holding territory or a title (Antiquities 18.5.1, 4). Scholars generally reconcile this by noting Herodian princes commonly bore multiple names (this brother may well have been 'Herod Philip'), though the exact naming remains a point of scholarly discussion; in any case, he is a distinct individual from Philip the Tetrarch, who never married Herodias.",
    surface: "Philip", occurrence: 1, owner: "philip-the-tetrarch", expect: null, status: "guard",
    why: "The same block, occurrence 1: \"Philip the Tetrarch\" is a registered key of its own, the " +
         "annotation covers all three words, and it resolves to the owner — so the self-link " +
         "exclusion suppresses it and always did. Asserted so that a future edit to the owner " +
         "table cannot turn the record's own long name into a link to somebody else." },
  { text: "Archelaus was the son of Herod the Great and his Samaritan wife Malthace, and full brother of Herod Antipas. When Herod the Great died in 4 BC, his will named Archelaus as successor to the bulk of the kingdom — Judea, Samaria, and Idumea — with the title of king, while Antipas and Philip received smaller tetrarchies to the north. Archelaus's reign began badly: Josephus records that he sent troops into the Jerusalem temple to suppress a protest during Passover, and roughly 3,000 people were killed (Antiquities 17.9.3; Jewish War 2.1.3).",
    surface: "Philip", owner: "herod-archelaus", expect: "philip-the-tetrarch", status: "guard",
    why: "Herod's will divided the kingdom between three sons; this Philip is the third of them. " +
         "The app has his record. OWNER_NAME_OVERRIDES philip.herod-archelaus." },
  { text: "Luke 3:1 lists 'Lysanias tetrarch of Abilene' among the regional rulers reigning in the fifteenth year of Tiberius, alongside Pilate, Herod Antipas, and Philip — placing him as ruler of Abilene, a small territory northwest of Damascus, around AD 28-29.",
    surface: "Philip", owner: "lysanias", expect: "philip-the-tetrarch", status: "guard",
    why: "The article surface quoting Luke 3:1, which is the Tetrarch's own verse — the reader " +
         "path has resolved it correctly for as long as VERSE_NAME_OVERRIDES has existed, and the " +
         "article retelling it did not." },
  { text: "Renamed Azotus in the Hellenistic/Roman period; the deacon Philip appeared there after baptizing the Ethiopian eunuch (Acts 8:40)",
    surface: "Philip", owner: "ashdod", expect: "philip-the-evangelist", status: "guard",
    why: "A location notableFact. The sentence names which man — \"the deacon Philip\" — and linked " +
         "the other one. These 385 location blocks were outside the harness entirely until " +
         "2026-09-10, when corpus.mjs stopped reading a field name no record has ever had." },
  { text: "Acts distinguishes 'Hellenists' — Greek-speaking Jews, often from the wider Mediterranean Dispersion — from Aramaic-speaking, more traditionally Judean 'Hebrews' within the earliest Jerusalem church, a distinction that surfaces in a dispute over the fair distribution of food to widows, resolved by appointing seven men (including Stephen and Philip) specifically to oversee it (Acts 6:1-6). Paul's own missionary strategy repeatedly engages the Greek intellectual world directly, most memorably reasoning with Epicurean and Stoic philosophers at Athens's Areopagus, quoting Greek poets to make his case for the God 'in whom we live, and move, and have our being' (Acts 17:16-34).",
    surface: "Philip", owner: "greeks", expect: "philip-the-evangelist", status: "guard",
    why: "The Greeks topic, and the one record in the cluster where the APOSTLE could plausibly " +
         "have appeared — John 12:20-22 is Greeks asking for him by name. Checked rather than " +
         "assumed: the record holds exactly one \"Philip\" and it is Acts 6's. If a later edit adds " +
         "the John 12 episode here, this entry becomes the wrong lever and needs a phrase pin." },
  { text: "With Greece finally unified, Philip began planning a great invasion of the Persian Empire, framed as revenge for Xerxes' invasion generations earlier. He never lived to carry it out — Philip was assassinated in 336 BC, and the throne, the army, and the Persian campaign all passed to his twenty-year-old son, Alexander.",
    surface: "Philip", occurrence: 2, owner: "wld-pg-philip-of-macedon", expect: null, status: "guard",
    why: "Philip II of Macedon, 336 BC, resolving to an apostle of Jesus. NAME_CONTEXT_RULES " +
         "already suppressed \"Philip II\" by its numeral, so the two occurrences written that way " +
         "were unlinked and the three bare ones in the next sentences were not — a rule that " +
         "catches the formal name and misses the shorthand is the shape worth watching for. " +
         "Suppressed on the same interim: a record for him replaces both." },
  { text: "At just twenty years old, Alexander inherited his father Philip's throne, army, and unfinished ambitions. He moved quickly to secure Macedon and Greece, crushing the rebellious city of Thebes to make an example of any resistance, before turning his attention to the campaign against Persia that his father had planned.",
    surface: "Philip", owner: "wld-pg-alexander-becomes-king", expect: null, status: "guard",
    why: "\"his father Philip's throne\" — the same Macedonian king, on the next event in the " +
         "timeline." },

  // ── Guards: the Apostle keeps the bare key, and Scripture never moved ────────────────────────
  { text: "Hierapolis was a Hellenistic-Roman city in Phrygia near Colossae and Laodicea, part of the cluster of Lycus Valley churches named in Colossians 4:13. By tradition the Apostle Philip was martyred here in the late 1st century AD.",
    surface: "Philip", owner: "hierapolis", expect: "philip-the-apostle", status: "guard",
    why: "The POI surface. The sentence says \"the Apostle Philip\" and the link agrees with it. " +
         "Eleven bare \"Philip\"s in our prose are the Apostle and stay that way; this is the one " +
         "whose own sentence names him, so it is the clearest statement that the default survived." },
  { ref: "Acts 6:5", surface: "Philip", expect: "philip-the-evangelist", status: "guard",
    why: "The reader path at the Seven's appointment — correct before this batch and after it. " +
         "Note the panel column of this same verse gives the Apostle, which is not a defect: no " +
         "verse override reaches LinkedVerseText, and no call site in src/ hands it a verse." },
  { ref: "Mark 6:17", surface: "Philip", expect: null, status: "guard",
    why: "\"his brother Philip's wife\" — Herod Philip I, already suppressed on the reader path by " +
         "VERSE_NAME_OVERRIDES. The prose case above is the article half of the same man, and this " +
         "is the half that was already right; if the two ever disagree, one of them is wrong." },
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // SECOND-BEARER BATCH 3: THE JAMES CLUSTER, 2026-09-10
  //
  // 39 wrong links. The bare key belongs to James son of Zebedee, who was executed in AD 44 and is
  // a candidate for almost none of it; nearly every one was James the Lord's brother, who has a
  // record. Nineteen bare "James"es in our prose genuinely ARE Zebedee's son and are untouched;
  // four of those nineteen are guarded below.
  //
  // Three records name BOTH men — simon-peter, john-the-apostle, bib-ac-jerusalem-council — and
  // take no owner entry at all. The record-wide default stays with Zebedee, who is the majority on
  // each, and the exception is recovered by a context pattern. Every one of those three records is
  // asserted here on BOTH sides, which is the only way to know the split still holds.

  { text: "James appears in the Gospels simply as one of Jesus's brothers — Mark's Gospel names him first among four (James, Joses, Judas, and Simon) when the people of Nazareth question how a hometown carpenter's family produced such a teacher (Mark 6:3). John's Gospel states plainly that during Jesus's ministry, \"even his own brothers did not believe in him\" (John 7:5), suggesting James was among the skeptics.",
    surface: "James", owner: "james-brother-of-jesus", expect: null, status: "guard",
    why: "THE RECORD'S OWN PAGE. All fourteen \"James\"es on james-brother-of-jesus linked to " +
         "Zebedee's son — including, elsewhere on the same record, the sentence quoting Galatians " +
         "1:19, \"meets specifically with 'James, the Lord's brother'\", which names the man it was " +
         "getting wrong. Mapped to himself so the self-link exclusion suppresses it." },
  { text: "Sometimes called 'James the Less' (cf. Mark 15:40) to distinguish him from James, son of Zebedee, and from James, the Lord's brother — a distinction worth keeping straight, since ancient sources occasionally conflate them. Very little reliable information survives about his later life or death; be aware that the commonly repeated c. AD 62 death date almost certainly originates from conflating him with James the Just, whose stoning in AD 62 Josephus records. Other late traditions (e.g., martyrdom at Ostrakine in Egypt) supply no usable year, so treat this date as a placeholder.",
    surface: "James", occurrence: 1, owner: "james-son-of-alphaeus", expect: null, status: "guard",
    why: "\"James the Less\" — the page's own subject, which linked to Zebedee's son. Found by " +
         "scripts/name-linker/self-name.mjs, not by the sweep, which had checked this record and " +
         "reported correctly that its LONGER wordings resolve right." },
  { text: "Sometimes called 'James the Less' (cf. Mark 15:40) to distinguish him from James, son of Zebedee, and from James, the Lord's brother — a distinction worth keeping straight, since ancient sources occasionally conflate them. Very little reliable information survives about his later life or death; be aware that the commonly repeated c. AD 62 death date almost certainly originates from conflating him with James the Just, whose stoning in AD 62 Josephus records. Other late traditions (e.g., martyrdom at Ostrakine in Egypt) supply no usable year, so treat this date as a placeholder.",
    surface: "James", occurrence: 3, owner: "james-son-of-alphaeus", expect: "james-brother-of-jesus",
    status: "guard",
    why: "The SAME SENTENCE, third occurrence: \"and from James, the Lord's brother\". One record, " +
         "three different men in one clause, and the record-wide answer above can only serve one " +
         "of them — this is the exception, recovered by the \"the Lord's brother\" pattern in " +
         "NAME_CONTEXT_RULES, which is checked first. Occurrence 2, \"James, son of Zebedee\", is " +
         "its own registered key and was always right." },
  { text: "Paul's letter to the Galatians describes confronting Peter \"to his face\" at Antioch for pulling back from eating with Gentile Christians once certain men from James arrived, calling his behavior hypocrisy (Galatians 2:11-14) — a rare glimpse of open conflict between two apostolic leaders.",
    surface: "James", owner: "simon-peter", expect: "james-brother-of-jesus", status: "guard",
    why: "Galatians 2:12's \"men from James\" — the Jerusalem leader, not the apostle Agrippa had " +
         "killed twelve years earlier. Recovered by a `before: /men from/` pattern rather than an " +
         "owner entry, because Simon Peter's page names BOTH men and the other two are Zebedee's " +
         "son. No WEB verse reads \"men from\" followed by a name; Galatians 2:12 itself reads " +
         "\"came from James\"." },
  { text: "Peter was born Simon, son of John (or Jonah), and worked as a fisherman on the Sea of Galilee alongside his brother Andrew, in partnership with James and John, the sons of Zebedee. Jesus called the two brothers while they were casting their nets, telling them he would make them \"fishers of men,\" and Peter left his boats to follow him (Matthew 4:18-20).",
    surface: "James", owner: "simon-peter", expect: "james-son-of-zebedee", status: "guard",
    why: "The other side of the same record, and the reason it has no owner entry: this \"James\" " +
         "is Zebedee's son and must stay that way. A record-wide answer would have taken it." },
  { text: "In the book of Acts, John appears alongside Peter as a leader of the Jerusalem church in its earliest years — the two together heal a lame beggar at the temple gate and are subsequently arrested and questioned by the Jewish council (Acts 3-4). Paul later names John, along with Peter and James (the brother of Jesus), as one of the reputed \"pillars\" of the Jerusalem church (Galatians 2:9).",
    surface: "James", owner: "john-the-apostle", expect: "james-brother-of-jesus", status: "guard",
    why: "Galatians 2:9's three pillars, on John the Apostle's own page — a sentence that says " +
         "which James in a parenthesis and linked the other one anyway. Recovered by the " +
         "\"(the brother of Jesus)\" pattern; the record's three other \"James\"es are his own " +
         "brother and are untouched." },
  { text: "James writes to Jewish Christians scattered abroad, offering practical, down-to-earth guidance on how genuine faith should shape everyday conduct. Its concern is that belief which produces no change in behavior is worthless; real faith shows itself in patience under trial, care for the poor, control of the tongue, and impartial love. The letter reads much like the wisdom literature of the Old Testament, packed with vivid images and blunt moral exhortation.",
    surface: "James", owner: "book-intro:James", expect: "james-brother-of-jesus", status: "guard",
    why: "The letter's author, on its own introduction, which passes bookIntroOwnerId(\"James\"). " +
         "The app already does exactly this elsewhere — \"Paul\" links five times on " +
         "book-intro:Romans and \"Peter\" four times on book-intro:1 Peter — and this intro's own " +
         "`author` field states the traditional attribution to the Lord's brother and names the " +
         "critical dissent beside it. Was Zebedee's son, whom nobody proposes." },
  { text: "Papyrus 20 and Papyrus 23 are early (3rd-century) papyrus witnesses that preserve portions of James.",
    surface: "James", owner: "book-intro:James", expect: null, status: "guard",
    why: "The BOOK, in the same record whose owner entry answers \"the author\". Suppressed by a " +
         "`before: /portions of/` pattern in NAME_CONTEXT_RULES, checked first. No WEB verse " +
         "contains \"portions of\" followed by a capitalised word." },
  { text: "James is one of the 'General' or 'Catholic' epistles that circulated together in early manuscript collections of the non-Pauline letters.",
    surface: "James", owner: "book-intro:James", expect: null, status: "guard",
    why: "The book again, named as one of a class of books. `after: /is one of the 'General|Catholic/`." },
  { text: "James was among the books whose canonical status was discussed in the early centuries; the church historian Eusebius listed it among the 'disputed' writings, though it was ultimately and widely accepted as Scripture.",
    surface: "James", owner: "book-intro:James", expect: null, status: "guard",
    why: "The book a third time — \"among the books\" says so in as many words. The fourth in this " +
         "field, \"the complete text of James\", was already handled by TEXT_OF." },
  { text: "The Greek Orthodox counter-tradition to the Basilica of the Annunciation, this site holds that Gabriel first appeared to Mary while she was drawing water from Nazareth's ancient spring — an episode from the apocryphal 2nd-century Protoevangelium of James, not found in the canonical Luke 1:26-38 account, which names no location. The Church of St. Gabriel was built directly over the spring's source, with the water still flowing through the crypt beneath the altar. A separate public well structure in the plaza, fed by the same spring, served as Nazareth's only water source for centuries.",
    surface: "James", owner: "marys-well-nazareth", expect: null, status: "guard",
    why: "An apocryphal infancy gospel, named by title, pointing at an apostle. One pin per title, " +
         "as the modern-work-title ruling requires — the same rule applied to an ancient work." },
  { text: "Mary, mother of James the Less (also called James the Younger) and of Joses, is named among the women who had followed and supported Jesus's ministry in Galilee and who stood watching, at a distance, when he was crucified (Mark 15:40, Matthew 27:56). She was also among the women who saw where Jesus was buried and returned to the tomb on the first day of the week with spices, becoming one of the first witnesses to the resurrection (Mark 16:1, Matthew 28:1, Luke 24:10). Some scholars identify her with \"Mary the wife of Clopas,\" who John places at the foot of the cross (John 19:25), though the Gospels never explicitly connect the two names, so the identification remains a reasonable guess rather than a certainty.",
    surface: "James", occurrence: 2, owner: "mary-mother-of-james-the-less", expect: null, status: "guard",
    why: "\"also called James the Younger\" — her son, linked to Zebedee's son, on a page whose own " +
         "name says whose mother she is. SUPPRESSED rather than repointed to james-son-of-alphaeus: " +
         "identifying James the Less with Alphaeus's son is the traditional reading and is " +
         "genuinely disputed, and no link takes no side. Occurrence 1 is inside the record's own " +
         "registered name and is already self-excluded." },
  { text: "In a passage about the high priest Ananus, Josephus refers in passing to \"the brother of Jesus, who was called Christ, whose name was James,\" describing James's execution around AD 62.",
    surface: "James", occurrence: 2, owner: "jesus-of-nazareth", expect: "james-brother-of-jesus",
    status: "guard",
    why: "Josephus, Antiquities 20.9.1, on Jesus's own page — the sentence names the man in the " +
         "words either side of the link and sent the reader to a different apostle. Occurrence 1 " +
         "sits inside the quotation and takes the same answer." },
  { text: "The Jerusalem Council (Acts 15) settled the question decisively. After hearing Peter, Paul, and Barnabas testify to God's work among Gentile believers, James cites the prophets' own promise that 'all the Gentiles who are called by my name' would seek the Lord (Acts 15:17, quoting Amos 9:11-12), and the council concludes 'we don't trouble those from among the Gentiles who turn to God' with the burden of the full Mosaic law (Acts 15:19). Paul's letter to the Ephesians describes the result theologically: Gentile believers, once 'far off,' 'strangers from the covenants of promise,' are now brought near by Christ's blood, who 'made both one, and broke down the middle wall of separation' — abolishing in his own flesh the hostility between Jew and Gentile, creating 'one new man' out of the two (Ephesians 2:11-16).",
    surface: "James", owner: "gentiles", expect: "james-brother-of-jesus", status: "guard",
    why: "Acts 15:13-18 — the man presiding at the council, not the letter speaking. Acts 15:13 " +
         "already resolves to him on the reader path; this is the article telling the same story." },
  { text: "One might expect Elijah to be riding high after Carmel's spectacular vindication, but instead a single death threat from Jezebel sends him running for his life into the wilderness, where he collapses under a broom tree and asks God to let him die. It is one of the Bible's most honest portraits of a spiritual high followed by a devastating crash — even the greatest of prophets was, as James later puts it, a man with feelings like ours.",
    surface: "James", owner: "bib-dki-elijah-still-small-voice", expect: "james-brother-of-jesus",
    status: "guard",
    why: "James 5:17, quoted by its author's name nine centuries out of period. The same event's " +
         "next paragraph says \"the King James Version\", which the `before: /King /` rule has " +
         "always suppressed and which this owner entry cannot reach, because NAME_CONTEXT_RULES is " +
         "checked first — the case below asserts that." },
  { text: "After food, rest, and a forty-day journey, Elijah arrives at Horeb — the same mountain, also called Sinai, where God gave the Law to Moses — and takes shelter in a cave. There the Lord passes by, but not in the way Elijah might have expected after Carmel's fire from heaven: not in the powerful wind, not in the earthquake, not in the fire, but in what the King James Version famously calls \"a still small voice\" — a low whisper, a gentle sound that draws Elijah out of the cave to stand before God.",
    surface: "James", owner: "bib-dki-elijah-still-small-voice", expect: null, status: "guard",
    why: "\"the King James Version\" — a translation, not a man, on the SAME RECORD whose owner " +
         "entry now resolves a bare \"James\" to the Lord's brother. This is the case that proves " +
         "the precedence order holds: NAME_CONTEXT_RULES first, OWNER_NAME_OVERRIDES after." },

  // ── Guards: Zebedee's son keeps the bare key ────────────────────────────────────────────────
  { text: "A grandson of Herod the Great who executed the apostle James, imprisoned Peter, and — in an account independently echoed by the Jewish historian Josephus — died suddenly after accepting a crowd's acclamation of him as a god.",
    surface: "James", owner: "herod-agrippa-i", expect: "james-son-of-zebedee", status: "guard",
    why: "PUBLIC PAGE ONLY — herod-agrippa-i.summary. Acts 12:2, the one James Agrippa killed, and " +
         "the bare key's correct answer. On a surface no snapshot covers, so this case is its only " +
         "cover." },
  { ref: "Matthew 17:1", surface: "James", expect: "james-son-of-zebedee", status: "guard",
    why: "The reader path at the Transfiguration. Nothing in this batch touches Scripture except " +
         "Galatians 1:19's panel column, below." },
  { ref: "Galatians 1:19", surface: "James", expect: "james-brother-of-jesus", status: "guard",
    why: "\"except James, the Lord's brother.\" The reader path has been right here for as long as " +
         "BOOK_NAME_OVERRIDES has had a Galatians entry." },
  { ref: "Galatians 1:19", surface: "James", path: "panel", expect: "james-brother-of-jesus",
    status: "guard",
    why: "THE ONE BIBLE ROW THIS BATCH MOVES, and it moves into agreement with the line above. The " +
         "panel path passes no book, so it gave Zebedee's son; the new \"the Lord's brother\" " +
         "pattern reaches it because NAME_CONTEXT_RULES needs no context at all. It was added for " +
         "three prose sentences and this verse is its whole reach into Scripture — measured across " +
         "all 31,098 WEB verses before it was written." },

  // ══ "Judaea", THE KJV/ASV SPELLING, 2026-09-10 ═══════════════════════════════════════════════
  //
  // `locations.ts` registered only "Judea". WEB spells it that way in all 45 of its verses and the
  // Bible snapshot is WEB-only, so the 43 KJV and 42 ASV verses that print "Judaea" rendered NO
  // link at all — a reader who switches translation lost every Judea link on the page, and nothing
  // here could have said so.
  //
  // Measured before the alternate was added, with the real computeLinkAnnotations and the exact
  // arguments VerseText.tsx passes (text, undefined, book, chapter, verse), over every verse of
  // both translations: 43 KJV + 42 ASV occurrences, 0 linked. After: 85 linked, every one of them
  // to `judea`, and every one in a verse where the WEB reader ALREADY had the identical link. The
  // ASV verse set is identical to WEB's 45; KJV differs only in reading "Jewry" at Luke 23:5 and
  // John 7:1 and "Judea" (already registered) at Ezra 5:8. No verse gains a link the default
  // translation does not already carry.
  //
  // On the article surface it fires exactly twice, both correct, and key-totals took 0 rows out.
  // The 22 "Judaean" strings in the tree — "Discoveries in the Judaean Desert", "the Judaean
  // Shephelah" — are a different word and the word boundary keeps them out; the last case below is
  // what says so.
  { ref: "Acts 1:8", translation: "KJV",
    text: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be " +
          "witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the " +
          "uttermost part of the earth.",
    surface: "Judaea", expect: "judea", status: "guard",
    why: "The KJV spelling, which matches nothing in the WEB corpus. A green Bible snapshot is NOT " +
         "evidence this fires — the snapshot has no KJV in it." },
  { ref: "Acts 1:8", translation: "ASV",
    text: "But ye shall receive power, when the Holy Spirit is come upon you: and ye shall be my " +
          "witnesses both in Jerusalem, and in all Judaea and Samaria, and unto the uttermost part " +
          "of the earth.",
    surface: "Judaea", expect: "judea", status: "guard",
    why: "The ASV, same spelling, same verse. Quoted verbatim from bible-api.com, which is the " +
         "service src/lib/biblePassage.ts asks for the reader's text." },
  { ref: "Acts 1:8", surface: "Judea", expect: "judea", status: "guard",
    why: "And WEB, from the corpus. The existing key is unmoved by the alternate — this is the " +
         "other end of the same verse and the reason the Bible snapshot is unchanged." },
  { ref: "Matthew 2:1", surface: "Judea", expect: "bethlehem",
    expectSurface: "Bethlehem of Judea", status: "guard",
    why: "The longer key on the bethlehem record still swallows \"Judea\" here. Adding a Judaea " +
         "alternate to the region must not break the phrase pin that sends this to the town." },
  { ref: "Matthew 2:1", translation: "KJV",
    text: "Now when Jesus was born in Bethlehem of Judaea in the days of Herod the king, behold, " +
          "there came wise men from the east to Jerusalem,",
    surface: "Judaea", expect: "judea", status: "guard",
    why: "The KJV spells the same phrase \"Bethlehem of Judaea\", which the bethlehem phrase pin " +
         "does not cover, so the town and the region link separately here. Both are right; the " +
         "divergence from WEB's single link is a consequence of the phrase pin being spelt one way " +
         "and is recorded rather than hidden." },
  { text: "The press reported that Pontius Pilate's ring had been found. The excavation report said something close to the opposite. Its authors wrote that \"it is therefore unlikely that Pontius Pilatus, the powerful and rich prefect of Judaea, would have worn a thin, all copper-alloy sealing ring\" — and then declined to name an owner at all, leaving it open between a Jew, a Roman, and another pagan bearing the name Pilatus.",
    surface: "Judaea", owner: "pilate-ring", expect: "judea", status: "guard",
    why: "The ARTICLE surface. Quoting the excavation report's own spelling is what dropped this " +
         "link (judea's prose count went 111 -> 110); the quotation is not editable, so the " +
         "alternate is the only lever that reaches it — OWNER_NAME_OVERRIDES can repoint or " +
         "suppress a name the linker already knows, never create one." },
  { text: "The revolt's outbreak in AD 132 is secure. The traditional end date is AD 135 (fall of Betar and death of Simon bar Kosiba), but epigraphic work by Werner Eck — reconstructing Hadrian's second imperatorial acclamation and the triumphal honors granted to the governors of Judaea, Syria, and Arabia — has persuaded many scholars that fighting was not finally suppressed until early AD 136, and many references now print 132-135/136.",
    surface: "Judaea", owner: "wld-rom-bar-kokhba-revolt", expect: "judea", status: "guard",
    why: "The second and last article-surface occurrence, on timelineEvent.datingNotes. The Roman " +
         "province, named alongside Syria and Arabia — right, and the reason the measured prose " +
         "delta is 2 rather than 1." },
  { text: "J. A. Sanders published it in 1965 as the fourth volume of Discoveries in the Judaean Desert. It is the most extensive Psalms manuscript from any of the caves, and Psalms was the most-copied book at Qumran.",
    surface: "Judaean", owner: "great-psalms-scroll", expect: null, status: "guard",
    why: "\"Judaean\" is not \"Judaea\" and the word boundary must keep it that way. 22 strings in " +
         "the tree are of this shape — mostly the series title Discoveries in the Judaean Desert, " +
         "which is a modern work's title as well. If a future widening reaches the adjective, this " +
         "is the case that fails." },
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // SECOND-BEARER BATCH 4: ANANIAS, SIMON, AND THE REST OF THE SELF-NAME SWEEP, 2026-09-10
  //
  // 58 links out, 7 repointed. Three of the four groups below were never in the sweep that
  // started this work: the five records called Simon, the two called Mary, and Thomas Aquinas all
  // came out of scripts/name-linker/self-name.mjs, which this batch also wires into
  // `npm run test:linker` now that its ledger is clean — 2 shapes, 3 links, both accepted.
  //
  // Scripture is untouched again. All three men called Ananias have resolved correctly on the
  // reader path since the verse table was written; only the articles were wrong.

  // ── Ananias, 19 links, 14 of them self-name ─────────────────────────────────────────────────
  { text: "Ananias is introduced simply as \"a disciple\" living in Damascus. After Saul of Tarsus was struck blind on the road to Damascus during his famous encounter with the risen Christ, the Lord appeared to Ananias in a vision and instructed him to go to the house of Judas on Straight Street and ask for Saul, who was praying and had himself seen a vision of a man named Ananias coming to restore his sight (Acts 9:10-12).",
    surface: "Ananias", owner: "ananias-of-damascus", expect: null, status: "guard",
    why: "THE RECORD'S OWN PAGE, nine times over. Every \"Ananias\" in the Damascus disciple's life " +
         "story pointed at the man who dropped dead in Acts 5. Mapped to himself for the self-link " +
         "exclusion. The \"Judas\" in the same sentence is Saul's host on Straight Street and is " +
         "still wrong; that is a later batch." },
  { text: "Ananias served as high priest during Paul's final arrest and trials in Jerusalem, a position he held (per Josephus) from roughly AD 47 to 59. When Paul, standing trial before the Jewish council, declared he had 'lived before God in all good conscience,' Ananias 'commanded those who stood by him to strike him on the mouth' — an act Paul, apparently unaware this was the high priest, sharply rebuked as unlawful before backing down once he learned the man's office (Acts 23:1-5).",
    surface: "Ananias", owner: "ananias-the-high-priest", expect: null, status: "guard",
    why: "The same shape on the third Ananias's page. Five links, including his extraBib summary's " +
         "\"Ananias son of Nedebaeus\"." },
  { text: "On the road to Damascus, Saul was reportedly confronted by a blinding light and the voice of the risen Jesus asking, \"Saul, Saul, why do you persecute me?\" He was struck blind for three days until a disciple named Ananias, initially wary given Saul's reputation, restored his sight and baptized him (Acts 9:1-19). This conversion transformed Paul, as he became known, from Christianity's most dangerous opponent into one of its central architects.",
    surface: "Ananias", owner: "paul-of-tarsus", expect: "ananias-of-damascus", status: "guard",
    why: "Paul's own page. The \"Saul\"s in the same sentence were fixed by an earlier batch through " +
         "this same table; this is the Ananias half of it, five commits later." },
  { text: "The old Roman decumanus maximus of Damascus, running roughly 1,500 meters east-west through the Old City. In Acts 9:11, the Lord tells Ananias to go to \"the street called Straight\" to find Saul of Tarsus, praying in the house of Judas, so that his sight could be restored. Today the western half is called Midhat Pasha Street and the eastern half Bab Sharqi Street, and it remains a functioning market street.",
    surface: "Ananias", owner: "straight-street-damascus", expect: "ananias-of-damascus", status: "guard",
    why: "The POI surface, quoting Acts 9:11 — the verse the reader path has always had right." },
  { ref: "Acts 5:1", surface: "Ananias", expect: "ananias-and-sapphira", status: "guard",
    why: "The couple, on the reader path, and the reason they own the bare key. Nothing in this " +
         "batch touches Scripture." },
  { ref: "Acts 9:10", surface: "Ananias", expect: "ananias-of-damascus", status: "guard",
    why: "The Damascus disciple, on the reader path, already right — the article surface has spent " +
         "the whole time disagreeing with this verse." },
  { ref: "Acts 23:2", surface: "Ananias", expect: "ananias-the-high-priest", status: "guard",
    why: "The high priest, third man, third correct verse." },

  // ── Simon: five men with no record, two repoints, and five self-name records ────────────────
  { text: "Before the gospel reached Samaria, Simon had the whole city convinced he was 'the power of God that is called Great' through his sorcery. When Philip the Evangelist arrived preaching Christ, Simon believed, was baptized, and began following Philip around, astonished by the miracles he witnessed (Acts 8:9-13).",
    surface: "Simon", owner: "simon-magus", expect: null, status: "guard",
    why: "THE RECORD'S OWN PAGE. Not in the sweep — found by self-name.mjs. Five links; the sweep " +
         "had checked this record and reported its longer wording resolves right, which it does " +
         "and which is a different question." },
  { text: "Simon was from Cyrene, a city in North Africa (modern-day Libya) with a significant Jewish population. All three synoptic Gospels record that as Jesus, weakened from the beating, struggled toward the execution site, Roman soldiers seized Simon — who was simply passing by, in from the countryside — and forced him to carry the cross the rest of the way (Matthew 27:32, Mark 15:21, Luke 23:26).",
    surface: "Simon", owner: "simon-of-cyrene", expect: null, status: "guard",
    why: "The same, on the man who carried the cross. Four links." },
  { text: "Hometown of Simon, the man forced to carry Jesus's cross to Golgotha (Matthew 27:32; Mark 15:21; Luke 23:26)",
    surface: "Simon", owner: "cyrene", expect: "simon-of-cyrene", status: "guard",
    why: "Cyrene's own notableFact naming its most famous son and linking Simon Peter instead. The " +
         "sentence describes the man exactly. A location block — a surface that was outside the " +
         "harness entirely until corpus.mjs's field name was corrected on 2026-09-10." },
  { text: "Peter stayed with a tanner named Simon here, whose house by the sea is still pointed out to visitors by tradition",
    surface: "Simon", owner: "joppa", expect: null, status: "guard",
    why: "Simon the tanner, Acts 9:43 — a different man, in a sentence that names Peter separately " +
         "two words earlier. Scripture's own Acts 10:32 already suppressed him, so until now the " +
         "location article contradicted the reader. No record; no link." },
  { text: "When a royal officer arrived at the village of Modein to enforce Antiochus IV's decree of pagan sacrifice, an aging priest named Mattathias refused. When another Jew stepped forward to comply in his place, Mattathias killed both the compliant Jew and the king's officer, tore down the pagan altar, and cried out, \"Let everyone who is zealous for the law...come out with me!\" — deliberately echoing Moses's own call after the golden calf (Exodus 32:26). With his five sons — Judas, Jonathan, Simon, John, and Eleazar — he fled to the hill country to organize armed resistance.",
    surface: "Simon", owner: "bib-it-maccabean-revolt-begins", expect: null, status: "guard",
    why: "Mattathias's five sons. \"Simon\" is Simon Maccabeus and \"Judas\" is Judas Maccabeus — the " +
         "second is already suppressed by the `judas` Maccabeus rule, and this is the first. " +
         "\"John\" and \"Eleazar\" in the same list are already suppressed by owner entries of their " +
         "own, which is what four brothers in one clause requires." },
  { text: "Jonathan was murdered through Seleucid treachery in 143 BC, and leadership fell to the last surviving brother, Simon, who would soon achieve full political independence for Judea.",
    surface: "Simon", owner: "bib-it-jonathan-maccabeus-high-priest", expect: null, status: "guard",
    why: "The same man, one event earlier in the Hasmonean sequence. Three links on this record." },
  { text: "James appears in the Gospels simply as one of Jesus's brothers — Mark's Gospel names him first among four (James, Joses, Judas, and Simon) when the people of Nazareth question how a hometown carpenter's family produced such a teacher (Mark 6:3). John's Gospel states plainly that during Jesus's ministry, \"even his own brothers did not believe in him\" (John 7:5), suggesting James was among the skeptics.",
    surface: "Simon", owner: "james-brother-of-jesus", expect: null, status: "guard",
    why: "Simon the brother of Jesus, from Mark 6:3's list of four. The app has no record for him " +
         "and Matthew 13:55 is already suppressed on the reader path, so this makes the article " +
         "agree with Scripture. The same sentence's \"James\" is the page's own subject and the " +
         "batch-3 case above asserts it." },
  { text: "'Christ' is a translation before it is anything else. The Greek Christos renders the Hebrew mashiach, 'anointed one,' and the Gospel of John twice stops to say so for readers who would not have known: Andrew tells Simon 'We have found the Messiah!' and the text adds the gloss '(which is, being interpreted, Christ)' (John 1:41), and the Samaritan woman says 'I know that Messiah comes, he who is called Christ' (John 4:25). These two verses are the only places the World English Bible keeps the Hebrew-derived word rather than translating it.",
    surface: "Simon", owner: "the-christ", expect: "simon-peter", status: "guard",
    why: "THE LAST BARE \"Simon\" IN THE WHOLE PROSE CORPUS THAT STILL RESOLVES TO SIMON PETER — " +
         "key-totals records exactly one. Duplicated from batch 1 deliberately: that copy guarded " +
         "the two Hasmonean suppressions, this one guards eleven more entries landing on the same " +
         "key. If a future widening of `simon` takes this, it takes the only one left." },

  // ── Simeon and Levi at Shechem, Mary on her own page, Aquinas, Julius Caesar ────────────────
  { text: "Jacob purchased land here, dug a well (later 'Jacob's Well'), and his sons Simeon and Levi massacred the men of the city after the assault on Dinah (Genesis 33-34)",
    surface: "Simeon", owner: "shechem", expect: null, status: "guard",
    why: "Genesis 34, on Shechem's own page. \"Simeon\" pointed at the old man who blessed the " +
         "infant Jesus in Luke 2 and \"Levi\" at Matthew the tax collector — two of Jacob's sons, " +
         "neither of whom has a record. Both allowlists already confine these keys on the reader " +
         "path; the article surface has no allowlist." },
  { text: "Jacob purchased land here, dug a well (later 'Jacob's Well'), and his sons Simeon and Levi massacred the men of the city after the assault on Dinah (Genesis 33-34)",
    surface: "Levi", owner: "shechem", expect: null, status: "guard",
    why: "The other half of the same clause. Asserted separately because the two are different " +
         "keys in different entries and a fix to one says nothing about the other." },
  { text: "Mary lived in Bethany with her sister Martha and brother Lazarus, and their home appears as a place Jesus visited and stayed. In one well-known scene, while Martha busied herself with the work of hosting, Mary sat at Jesus's feet listening to his teaching; when Martha complained that her sister had left her to serve alone, Jesus gently defended Mary, saying she had \"chosen what is better\" (Luke 10:38-42).",
    surface: "Mary", owner: "mary-of-bethany", expect: null, status: "guard",
    why: "THE RECORD'S OWN PAGE, six links, not in the sweep. Bare \"Mary\" belongs to the mother of " +
         "Jesus, so Mary of Bethany's biography handed her own name to a different woman at every " +
         "mention. The record's cross-links to Mary Magdalene use the long key and are untouched." },
  { text: "On the first day of the week, Mary Magdalene went to the tomb and found the stone rolled away; in John's account, she runs to tell Peter and John, then remains weeping outside the empty tomb after they leave, where she encounters a figure she initially mistakes for the gardener (John 20:1-15). When he says her name, \"Mary,\" she recognizes Jesus and calls him \"Rabboni\" (Teacher), becoming the first person recorded to see and speak with the risen Jesus, who then commissions her to go and tell the other disciples (John 20:16-18) — an episode that has led many later writers to call her \"the apostle to the apostles.\"",
    surface: "Mary", occurrence: 2, owner: "mary-magdalene", expect: null, status: "guard",
    why: "John 20:16 quoted on Magdalene's own page — the one word the risen Jesus says to her, " +
         "linked to the mother of Jesus. Occurrence 1 is \"Mary Magdalene\", her own registered key. " +
         "The \"John\" in the same block is the Apostle by the \"Peter and John\" rule, and the " +
         "record's `john` entry is null, which is why that rule has to be checked first." },
  { text: "Born to a noble family near Aquino in southern Italy, Thomas was sent as a child oblate to the great abbey of Monte Cassino before studying at the University of Naples, where he encountered the newly translated works of Aristotle ",
    surface: "Thomas", owner: "thomas-aquinas", expect: null, status: "guard",
    why: "Aquinas's own page, three links, all to the apostle. Quoted from the opening of his " +
         "lifeStory; the case's text is a prefix of that paragraph, which is all a prose case " +
         "needs. Found by self-name.mjs, and invisible to modern-names.mjs, which flags a link " +
         "inside a modern personal name and sees a bare \"Thomas\" as nothing of the kind." },
  { text: "Born Gaius Octavius in 63 BC, he was the grand-nephew and posthumously adopted heir of Julius Caesar, taking the name Gaius Julius Caesar Octavianus (rendered in English as 'Octavian') after Caesar's assassination in 44 BC. After more than a decade of civil war and shifting alliances — including the Second Triumvirate with Mark Antony and Lepidus — Octavian defeated the combined forces of Antony and Cleopatra at the Battle of Actium in 31 BC, leaving him sole master of the Roman world.",
    surface: "Caesar", occurrence: 1, owner: "caesar-augustus", expect: null, status: "guard",
    why: "JULIUS Caesar, on Augustus's own page, resolving to Tiberius — his great-uncle pointed at " +
         "his successor. Not a self-link, which is why self-name.mjs found it and the exclusion " +
         "never could. No record for Julius; suppressed on the standing interim. A miss the " +
         "existing split-name machinery could not catch: that sweep enumerates a biblical name " +
         "FOLLOWED by a qualifier (\"Philip II\", \"Paul VI\"), and this is one PRECEDED by a forename." },
  { text: "Born Gaius Octavius in 63 BC, he was the grand-nephew and posthumously adopted heir of Julius Caesar, taking the name Gaius Julius Caesar Octavianus (rendered in English as 'Octavian') after Caesar's assassination in 44 BC. After more than a decade of civil war and shifting alliances — including the Second Triumvirate with Mark Antony and Lepidus — Octavian defeated the combined forces of Antony and Cleopatra at the Battle of Actium in 31 BC, leaving him sole master of the Roman world.",
    surface: "Caesar", occurrence: 3, owner: "caesar-augustus", expect: null, status: "guard",
    why: "\"after Caesar's assassination in 44 BC\" — the same man, bare, thirty words later. " +
         "Occurrence 2 sits inside Augustus's own regnal name and was already unlinked." },
  { text: "Herod was the son of Antipater, an Idumean who had risen to influence as a close advisor to the Hasmonean ruler Hyrcanus II and won the favor of Julius Caesar. Herod inherited his father's political skill, and amid the chaos of Rome's own civil wars he maneuvered his way into the Roman Senate's favor: in 40 BC the Senate declared him \"King of the Jews\" — a title he did not yet actually hold on the ground in Judea.",
    surface: "Caesar", owner: "bib-it-herod-the-great-rise", expect: null, status: "guard",
    why: "The third Julius, on the timeline. The bare \"Herod\" in the same sentence links to nobody " +
         "and is correct to — 40 of the 44 in our prose are suppressed." },

  // ── Guards: the bare keys the four suppressions above did NOT take ──────────────────────────
  { ref: "Matthew 22:21", surface: "Caesar", expect: "tiberius-caesar", status: "guard",
    why: "\"Render therefore to Caesar the things that are Caesar's.\" The bare key keeps Tiberius " +
         "on the reader path; the `caesar` owner entries reach two records and no verse." },
  { text: "A Jerusalem temple priest struck mute for doubting an angel's promise of a son in his old age, whose voice returned at John's naming and burst into prophecy.",
    surface: "John", owner: "zechariah-father-of-john-baptist", expect: "john-the-baptist", status: "guard",
    why: "Repeated from batch 1 on purpose: four batches of suppressions later, the Baptist still " +
         "owns the bare key. PUBLIC PAGE ONLY, so nothing else holds it." },
];

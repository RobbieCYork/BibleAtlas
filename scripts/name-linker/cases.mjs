// Named cases for the name linker. This is the fast half of the regression net: it runs in a couple
// of seconds and it says, in words, what each link is supposed to be and why.
//
// Every case names one occurrence of one name in one verse, on one rendering path:
//   path: "reader" (default) — what VerseText.tsx renders; book, chapter and verse are passed.
//   path: "panel"            — what LinkedVerseText.tsx renders; NO context is passed, so none of
//                              the book/verse corrections fire. Used by PersonPanel, LocationPanel,
//                              PoiPanel, TopicPanel and BookIntroView.
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
  { ref: "1 Samuel 9:2", surface: "Saul", path: "panel", expect: "saul-king-of-israel", status: "known-wrong",
    why: "The panel path passes no book, so all 389 Samuel/Chronicles 'Saul's resolve to Paul of " +
         "Tarsus. The prose surface is batch 7 — recorded here so the scale of it stays visible." },
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
  { ref: "Revelation 13:17", surface: "mark", expect: null, status: "known-wrong",
    why: "'the mark of the beast' is not Mark the Evangelist. Six such links across Revelation." },
  { ref: "Revelation 14:9", surface: "mark", expect: null, status: "known-wrong",
    why: "Mark of the beast." },
  { ref: "Revelation 14:11", surface: "mark", expect: null, status: "known-wrong",
    why: "Mark of the beast." },
  { ref: "Revelation 16:2", surface: "mark", expect: null, status: "known-wrong",
    why: "Mark of the beast." },
  { ref: "Revelation 19:20", surface: "mark", expect: null, status: "known-wrong",
    why: "Mark of the beast." },
  { ref: "Revelation 20:4", surface: "mark", expect: null, status: "known-wrong",
    why: "Mark of the beast." },
  { ref: "Genesis 1:14", surface: "mark", expect: null, status: "known-wrong",
    why: "'let them be for signs to mark seasons' — the verb." },
  { ref: "Ezekiel 9:4", surface: "mark", expect: null, status: "known-wrong",
    why: "'set a mark on the foreheads' — the noun, not the man." },
  { ref: "Psalms 37:37", surface: "Mark", expect: null, status: "known-wrong",
    why: "'Mark the perfect man' — the imperative verb, capitalised only because it opens the verse. " +
         "Capitalisation alone cannot catch this one; it needs a per-verse suppression." },
  { ref: "2 Samuel 13:28", surface: "Mark", expect: null, status: "known-wrong",
    why: "'Mark now, when Amnon's heart is merry' — the imperative verb." },
  { ref: "Job 33:31", surface: "Mark", expect: null, status: "known-wrong",
    why: "'Mark well, Job, and listen to me' — the imperative verb." },
  { ref: "Psalms 48:13", surface: "Mark", expect: null, status: "known-wrong",
    why: "'Mark well her bulwarks' — the imperative verb." },
  { ref: "Acts 12:12", surface: "Mark", expect: "john-mark", status: "guard",
    why: "'John who was called Mark' — the real one. Eight such links must survive batch 2." },
  { ref: "Colossians 4:10", surface: "Mark", expect: "john-mark", status: "guard",
    why: "'Mark, the cousin of Barnabas' — the real one." },
  { ref: "1 Peter 5:13", surface: "Mark", expect: "john-mark", status: "guard",
    why: "'so does Mark, my son' — the real one." },

  { ref: "1 John 2:1", surface: "Counselor", expect: null, status: "known-wrong",
    why: "The verse names the Counselor as 'Jesus Christ, the righteous' on the same line, and the " +
         "link says Holy Spirit. Capitalised here, so only a per-verse entry can reach it. " +
         "Suppressed rather than redirected: pointing it at Jesus would take the same position " +
         "Isaiah 9:6 is flagged for, and that is Robbie's to take." },
  { ref: "Isaiah 3:3", surface: "the counselor", expect: null, status: "known-wrong",
    why: "A civic official in a list of them ('the captain of fifty, the honorable man, the counselor')." },
  { ref: "2 Samuel 15:12", surface: "counselor", expect: null, status: "known-wrong",
    why: "'Ahithophel the Gilonite, David's counselor' — a human royal adviser." },
  { ref: "1 Chronicles 27:33", surface: "counselor", expect: null, status: "known-wrong",
    why: "'Ahithophel was the king's counselor'." },
  { ref: "Romans 11:34", surface: "counselor", expect: null, status: "known-wrong",
    why: "'who has been his counselor?' — the common noun." },
  { ref: "John 14:16", surface: "Counselor", expect: "holy-spirit", status: "guard",
    why: "'another Counselor... with you forever' — the Paraclete. Four such links must survive." },
  { ref: "John 14:26", surface: "the Counselor", expect: "holy-spirit", status: "guard",
    why: "'the Counselor, the Holy Spirit' — named in the verse itself. Note this matches under the " +
         "separate registered key 'the Counselor', which any fix must cover as well as 'Counselor'." },

  { ref: "Psalms 44:10", surface: "the adversary", expect: null, status: "known-wrong",
    why: "A human enemy in battle. All 15 occurrences of this key in the WEB are the ordinary word." },
  { ref: "Lamentations 1:10", surface: "The adversary", expect: null, status: "known-wrong",
    why: "Babylon, plundering the temple. Capitalised only because it opens the verse — which is " +
         "why the capitalisation test has to look past a leading 'The'." },
  { ref: "1 Timothy 5:14", surface: "the adversary", expect: null, status: "known-wrong",
    why: "Read by many as a human slanderer rather than Satan; commentators divide. No link is the " +
         "neutral outcome and does not commit the app either way." },

  { ref: "Job 31:35", surface: "the accuser", expect: null, status: "known-wrong",
    why: "Job's legal opponent in his imagined lawsuit, not Satan." },
  { ref: "Revelation 12:10", surface: "the accuser", expect: "satan", status: "guard",
    why: "'the accuser of our brothers... who accuses them before our God' — genuinely Satan. This " +
         "is why 'the accuser' must NOT get the capitalisation flag: both its occurrences are " +
         "lowercase, and the flag would take this correct link out along with Job 31:35." },

  { ref: "Genesis 22:13", surface: "ram", occurrence: 1, path: "panel", expect: null, status: "known-wrong",
    why: "Abraham's sacrificial ram, rendered as Ram son of Hezron on every panel that shows this " +
         "verse. 92 of the 101 'ram's in Scripture are the animal." },
  { ref: "Numbers 23:2", surface: "ram", path: "panel", expect: null, status: "known-wrong",
    why: "Balaam's sacrifice — the animal." },
  { ref: "Ruth 4:19", surface: "Ram", occurrence: 1, expect: "ram-son-of-hezron", status: "guard",
    why: "The genealogy. The real one." },
  { ref: "1 Chronicles 2:10", surface: "Ram", occurrence: 1, expect: "ram-son-of-hezron", status: "guard",
    why: "Opens the verse, so it is capitalised by position — but it IS the man. A capitalisation " +
         "test that discounts sentence-initial capitals would wrongly drop this one." },
  { ref: "Matthew 1:4", surface: "Ram", occurrence: 1, expect: "ram-son-of-hezron", status: "guard",
    why: "Same: sentence-initial and genuine." },

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
  { ref: "Acts 10:32", surface: "Simon", occurrence: 2, expect: null, status: "known-wrong",
    why: "STILL WRONG, and not fixable the way the rest were: this verse names BOTH Simons — " +
         "'summon Simon, who is also called Peter... in the house of a tanner named Simon' — and a " +
         "per-verse override applies one answer to every match in the verse. Needs occurrence-aware " +
         "resolution (batch 6). Left alone rather than half-fixed." },
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
  { ref: "2 Kings 17:1", surface: "Hoshea", expect: "hoshea-king-of-israel", status: "known-wrong",
    why: "Hoshea son of Elah, the last king of Israel, under whom Samaria fell — rendered as " +
         "Joshua son of Nun. Eight verses of the fall of the northern kingdom." },
  { ref: "2 Kings 17:6", surface: "Hoshea", expect: "hoshea-king-of-israel", status: "known-wrong",
    why: "'In the ninth year of Hoshea the king of Assyria took Samaria'." },
  { ref: "2 Kings 18:10", surface: "Hoshea", expect: "hoshea-king-of-israel", status: "known-wrong",
    why: "'the ninth year of Hoshea king of Israel, Samaria was taken'." },
  { ref: "Numbers 13:16", surface: "Hoshea", expect: "joshua", status: "guard",
    why: "'Moses called Hoshea the son of Nun Joshua' — here Hoshea IS Joshua. Must not change." },
  { ref: "1 Chronicles 27:20", surface: "Hoshea", expect: null, status: "known-wrong",
    why: "Hoshea son of Azaziah, an Ephraimite officer under David — a third man, with no entry." },
  { ref: "Nehemiah 10:23", surface: "Hoshea", expect: null, status: "known-wrong",
    why: "A signer of Nehemiah's covenant — a fourth man, with no entry." },
];

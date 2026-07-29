/**
 * When each of the 66 books was written, distilled from the full discussion in each book's
 * `writtenWhen` field in `bookIntros.ts` (see that file for the complete reasoning, sources,
 * and internal/external evidence — this file is a compact summary for timeline/chart display,
 * not a replacement for it).
 *
 * Year convention: signed integers on a single continuous timeline, astronomical-year style —
 * negative numbers are BC, positive numbers are AD, with no year zero skipped (e.g. -586 = 586 BC,
 * 95 = AD 95). `startYear` and `endYear` bound the window traditional/evangelical scholarship
 * assigns to the book's composition (not the events it narrates, which can predate composition by
 * centuries, as with Genesis or Job). Where a single point-in-time date is traditionally given,
 * `startYear` equals `endYear`.
 *
 * Dating a biblical book is rarely a settled fact — traditional/evangelical and critical scholarship
 * frequently disagree, sometimes by centuries (Daniel, Job) and sometimes only on process (single
 * author vs. redactional layers, as with Jeremiah or Kings). `disputed` is true whenever
 * `bookIntros.ts` records a meaningful traditional-vs-critical (or otherwise unresolved) dating gap;
 * `note` briefly names that gap only when there's a real one worth surfacing. Many books instead show
 * broad agreement across the spectrum (e.g. Mark, Amos, Malachi), in which case `disputed` is false
 * and no `note` is given.
 */
export interface BookWritingWindow {
  /** Must exactly match a `name` in BOOKS (src/data/bibleBooks.ts) and `book` in bookIntros.ts. */
  book: string;
  /** Start of the traditional/evangelical composition window. Negative = BC, positive = AD. */
  startYear: number;
  /** End of the traditional/evangelical composition window. Negative = BC, positive = AD. */
  endYear: number;
  /** True when traditional/evangelical and critical scholarship (or scholarship generally) meaningfully disagree on dating. */
  disputed: boolean;
  /** Short note naming the traditional-vs-critical (or otherwise unresolved) dating gap — only present when disputed is true and the gap is worth surfacing. */
  note?: string;
}

/** Writing-date windows for all 66 books, in canonical Bible order. Traditional/evangelical dating is used as the primary window, per this app's established voice; see `note` for where critical scholarship diverges. */
export const bookWritingWindows: BookWritingWindow[] = [
  {
    book: "Genesis",
    startYear: -1446,
    endYear: -1200,
    disputed: true,
    note: "Traditional Mosaic-era dating (15th–13th century BC, composed during the wilderness period) vs. the critical view placing the final form in the exilic or post-exilic period (6th–5th century BC).",
  },
  {
    book: "Exodus",
    startYear: -1446,
    endYear: -1200,
    disputed: true,
    note: "Traditional Mosaic dating (15th or 13th century BC, depending on early- vs. late-Exodus chronology) vs. the critical view of a composite reaching final form much later, with priestly material often dated to the exile.",
  },
  {
    book: "Leviticus",
    startYear: -1445,
    endYear: -1250,
    disputed: true,
    note: "Traditional Sinai/Mosaic dating vs. Wellhausen's exilic/post-exilic dating of the Priestly source — a late dating heavily contested within critical scholarship itself (Kaufmann, Hurvitz, Milgrom, and Knohl all argue for an earlier date).",
  },
  {
    book: "Numbers",
    startYear: -1445,
    endYear: -1210,
    disputed: true,
    note: "Traditional Mosaic wilderness-era dating vs. the critical view of a composite of older narrative traditions (J, E) combined with Priestly material, reaching final form in the exilic or post-exilic era.",
  },
  {
    book: "Deuteronomy",
    startYear: -1406,
    endYear: -1250,
    disputed: true,
    note: "Traditional Mosaic dating (delivered on the plains of Moab, c. 1406 or c. 1250 BC) vs. the critical identification with the law scroll found under Josiah (2 Kings 22, c. 622 BC), treated as a 7th-century composition later expanded through the exile.",
  },
  {
    book: "Joshua",
    startYear: -1400,
    endYear: -1150,
    disputed: true,
    note: "Traditional early dating (conquest c. 1406 BC, book composed soon after) or a 13th–12th-century late dating vs. the critical view that the book belongs to the Deuteronomistic History, compiled during or after the exile (7th–6th century BC).",
  },
  {
    book: "Judges",
    startYear: -1050,
    endYear: -970,
    disputed: true,
    note: "Traditional dating near the early monarchy (following 12th–11th-century BC events) vs. the critical view of a Deuteronomistic composition assembling older tribal traditions, finalized in the exilic or post-exilic period.",
  },
  {
    book: "Ruth",
    startYear: -1010,
    endYear: -970,
    disputed: true,
    note: "Evangelical scholars (Bush, Hubbard) place composition near David's reign, noting the genealogy stops at David rather than Solomon; many critical scholars favor a post-exilic date on linguistic grounds others read instead as archaic or dialectal.",
  },
  {
    book: "1 Samuel",
    startYear: -1050,
    endYear: -970,
    disputed: true,
    note: "Traditional dating near the events (late 11th–early 10th century BC) vs. the critical view that 1–2 Samuel belong to the Deuteronomistic History, reaching final form in the exile though preserving very early material.",
  },
  {
    book: "2 Samuel",
    startYear: -1010,
    endYear: -970,
    disputed: true,
    note: "Traditional dating near David's reign (early 10th century BC) vs. critical placement of the Deuteronomistic editing in the exile, incorporating an early 'Court History' widely regarded as ancient.",
  },
  {
    book: "1 Kings",
    startYear: -587,
    endYear: -560,
    disputed: true,
    note: "Traditional view: a prophetic compilation (Jewish tradition names Jeremiah) made during the exile from earlier court records; critical scholarship sees the culmination of the Deuteronomistic History, with a possible first edition under Josiah (late 7th century BC) — both agree it reached final form no earlier than c. 561 BC.",
  },
  {
    book: "2 Kings",
    startYear: -560,
    endYear: -538,
    disputed: false,
  },
  {
    book: "1 Chronicles",
    startYear: -450,
    endYear: -350,
    disputed: false,
  },
  {
    book: "2 Chronicles",
    startYear: -450,
    endYear: -350,
    disputed: false,
  },
  {
    book: "Ezra",
    startYear: -450,
    endYear: -400,
    disputed: false,
  },
  {
    book: "Nehemiah",
    startYear: -445,
    endYear: -400,
    disputed: false,
  },
  {
    book: "Esther",
    startYear: -460,
    endYear: -400,
    disputed: true,
    note: "Conservative scholars date composition within a generation or two of the events (c. 460–400 BC), citing detailed unexplained knowledge of the Achaemenid court; many critical scholars place it later, in the Hellenistic era (4th–3rd century BC).",
  },
  {
    book: "Job",
    startYear: -1000,
    endYear: -900,
    disputed: true,
    note: "Composition date is among the most disputed in the Old Testament — proposals range across the patriarchal/Mosaic era, Solomon's reign (used here), and the exilic or post-exilic period (6th–4th century BC); the events themselves are set earlier still, in a patriarchal age.",
  },
  {
    book: "Psalms",
    startYear: -1000,
    endYear: -400,
    disputed: false,
  },
  {
    book: "Proverbs",
    startYear: -970,
    endYear: -700,
    disputed: true,
    note: "Traditional view sees a Solomonic core (10th century BC) supplemented through Hezekiah's era (c. 700 BC, per 25:1); critical scholarship sees the anthology reaching final form in the post-exilic period.",
  },
  {
    book: "Ecclesiastes",
    startYear: -970,
    endYear: -930,
    disputed: true,
    note: "Traditional Solomonic dating (10th century BC) vs. most critical scholars' post-exilic dating (5th–3rd century BC) on linguistic grounds contested by conservative scholars — the date remains genuinely open.",
  },
  {
    book: "Song of Solomon",
    startYear: -970,
    endYear: -930,
    disputed: true,
    note: "Traditional Solomonic dating (10th century BC) vs. critical post-exilic dating (5th–3rd century BC) based on linguistic features many now read as northern dialect rather than lateness.",
  },
  {
    book: "Isaiah",
    startYear: -740,
    endYear: -680,
    disputed: true,
    note: "Traditional single-author dating across Isaiah's 8th-century ministry vs. the critical view that chapters 40–66 come from later exilic and post-exilic hands (6th century BC and after).",
  },
  {
    book: "Jeremiah",
    startYear: -627,
    endYear: -580,
    disputed: false,
  },
  {
    book: "Lamentations",
    startYear: -586,
    endYear: -570,
    disputed: false,
  },
  {
    book: "Ezekiel",
    startYear: -593,
    endYear: -571,
    disputed: false,
  },
  {
    book: "Daniel",
    startYear: -605,
    endYear: -530,
    disputed: true,
    note: "Traditional 6th-century dating (Daniel himself, during and shortly after the exile) vs. most critical scholars' 2nd-century BC dating (c. 165 BC, the Maccabean crisis) — among the most disputed dates in the Old Testament, turning on whether detailed predictive prophecy is possible.",
  },
  {
    book: "Hosea",
    startYear: -755,
    endYear: -715,
    disputed: false,
  },
  {
    book: "Joel",
    startYear: -835,
    endYear: -800,
    disputed: true,
    note: "Genuinely undated and disputed — proposals range from this early, pre-exilic 9th-century setting to a post-exilic 5th–4th-century BC date; the book's message doesn't depend on resolving it.",
  },
  {
    book: "Amos",
    startYear: -760,
    endYear: -750,
    disputed: false,
  },
  {
    book: "Obadiah",
    startYear: -586,
    endYear: -570,
    disputed: true,
    note: "Difficult to date precisely; most read it as responding to Jerusalem's fall in 586 BC, though some propose an earlier setting — the book offers few internal clues.",
  },
  {
    book: "Jonah",
    startYear: -793,
    endYear: -753,
    disputed: true,
    note: "Most conservative and evangelical scholars date the writing near the prophet's own 8th-century ministry; many critical scholars argue instead for a post-exilic composition on linguistic grounds.",
  },
  {
    book: "Micah",
    startYear: -750,
    endYear: -686,
    disputed: false,
  },
  {
    book: "Nahum",
    startYear: -663,
    endYear: -612,
    disputed: false,
  },
  {
    book: "Habakkuk",
    startYear: -605,
    endYear: -600,
    disputed: false,
  },
  {
    book: "Zephaniah",
    startYear: -640,
    endYear: -609,
    disputed: false,
  },
  {
    book: "Haggai",
    startYear: -520,
    endYear: -520,
    disputed: false,
  },
  {
    book: "Zechariah",
    startYear: -520,
    endYear: -518,
    disputed: true,
    note: "Chapters 1–8 are precisely dated to 520–518 BC; many scholars regard the undated chapters 9–14 ('Second Zechariah') as later material, while others defend the unity of the whole book.",
  },
  {
    book: "Malachi",
    startYear: -460,
    endYear: -430,
    disputed: false,
  },
  {
    book: "Matthew",
    startYear: 50,
    endYear: 69,
    disputed: true,
    note: "Early dating (50s–60s AD, favored by many evangelical scholars, partly on the Gospel's silence about the temple's destruction) vs. most critical scholars' dating of roughly AD 80–90.",
  },
  {
    book: "Mark",
    startYear: 60,
    endYear: 70,
    disputed: false,
  },
  {
    book: "Luke",
    startYear: 57,
    endYear: 62,
    disputed: true,
    note: "Traditional dating (late 50s–early 60s AD, since Acts — Luke's sequel — ends with Paul alive c. AD 62) vs. many critical scholars' dating of roughly AD 80–90.",
  },
  {
    book: "John",
    startYear: 80,
    endYear: 95,
    disputed: false,
  },
  {
    book: "Acts",
    startYear: 60,
    endYear: 62,
    disputed: true,
    note: "Traditional early dating (early 60s AD, since the book ends with Paul alive and never mentions Jerusalem's fall in AD 70) vs. other scholars' dating of roughly AD 80–90.",
  },
  {
    book: "Romans",
    startYear: 55,
    endYear: 58,
    disputed: false,
  },
  {
    book: "1 Corinthians",
    startYear: 53,
    endYear: 55,
    disputed: false,
  },
  {
    book: "2 Corinthians",
    startYear: 55,
    endYear: 57,
    disputed: false,
  },
  {
    book: "Galatians",
    startYear: 48,
    endYear: 55,
    disputed: false,
  },
  {
    book: "Ephesians",
    startYear: 60,
    endYear: 62,
    disputed: true,
    note: "Traditional dating ties it to Paul's Roman imprisonment (c. AD 60–62); scholars who question Pauline authorship place it somewhat later in the first century.",
  },
  {
    book: "Philippians",
    startYear: 60,
    endYear: 62,
    disputed: false,
  },
  {
    book: "Colossians",
    startYear: 60,
    endYear: 62,
    disputed: true,
    note: "Traditional dating ties it to Paul's imprisonment (c. AD 60–62); scholars who question its authenticity date it later in the first century.",
  },
  {
    book: "1 Thessalonians",
    startYear: 50,
    endYear: 51,
    disputed: false,
  },
  {
    book: "2 Thessalonians",
    startYear: 50,
    endYear: 51,
    disputed: true,
    note: "If by Paul (the traditional view), written c. AD 50–51 shortly after 1 Thessalonians; scholars who question Pauline authorship date it later in the first century.",
  },
  {
    book: "1 Timothy",
    startYear: 63,
    endYear: 66,
    disputed: true,
    note: "Traditional dating places it in the mid-60s AD, after Paul's release from Roman imprisonment; scholars who regard the Pastoral Epistles as pseudonymous date them to the late first or early second century.",
  },
  {
    book: "2 Timothy",
    startYear: 65,
    endYear: 67,
    disputed: true,
    note: "Traditional dating places it in the mid-to-late 60s AD, during Paul's final Roman imprisonment shortly before his death; scholars who regard the Pastorals as pseudonymous date it later, into the late first or early second century.",
  },
  {
    book: "Titus",
    startYear: 63,
    endYear: 66,
    disputed: true,
    note: "Traditional dating places it in the mid-60s AD, after Paul's release from Roman imprisonment; scholars who regard the Pastorals as pseudonymous place it later, in the late first or early second century.",
  },
  {
    book: "Philemon",
    startYear: 60,
    endYear: 62,
    disputed: false,
  },
  {
    book: "Hebrews",
    startYear: 60,
    endYear: 69,
    disputed: true,
    note: "Most scholars place it before AD 70, since it speaks of the temple sacrificial system as still operating and never mentions Jerusalem's fall; a date in the 60s AD is common, though some argue for the 80s.",
  },
  {
    book: "James",
    startYear: 45,
    endYear: 62,
    disputed: true,
    note: "If by James the Lord's brother (the traditional view), it must predate his death c. AD 62, with some dating it as early as the 40s — possibly the earliest New Testament book; scholars who question that authorship place it later in the first century.",
  },
  {
    book: "1 Peter",
    startYear: 62,
    endYear: 65,
    disputed: true,
    note: "Traditional dating places it near the end of Peter's life under Neronian persecution (early-to-mid 60s AD); scholars who question Petrine authorship place it somewhat later in the first century.",
  },
  {
    book: "2 Peter",
    startYear: 64,
    endYear: 68,
    disputed: true,
    note: "Traditional view (Petrine authorship) dates it to the mid-60s AD, shortly before Peter's martyrdom; many critical scholars regard it as pseudonymous and date it much later, some into the early second century.",
  },
  {
    book: "1 John",
    startYear: 80,
    endYear: 95,
    disputed: false,
  },
  {
    book: "2 John",
    startYear: 80,
    endYear: 95,
    disputed: false,
  },
  {
    book: "3 John",
    startYear: 80,
    endYear: 95,
    disputed: false,
  },
  {
    book: "Jude",
    startYear: 60,
    endYear: 80,
    disputed: false,
  },
  {
    book: "Revelation",
    startYear: 90,
    endYear: 96,
    disputed: true,
    note: "The traditional and more widely held view dates it to Domitian's reign (c. AD 95, per Irenaeus); an alternative view places it earlier, under Nero in the late 60s AD.",
  },
];

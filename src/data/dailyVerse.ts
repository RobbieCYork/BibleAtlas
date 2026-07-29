/** One rotating "Verse & Place of the Day" pairing — a passage, the place on the map it belongs to,
 * a short paragraph connecting the passage to the day's reflective question, and the question itself. */
export type DailyVerseEntry = {
  reference: { book: string; chapter: number; verse: number };
  /** Must match an `id` in src/data/locations.ts — App.tsx feeds it straight to focusLocationOnMap. */
  locationId: string;
  /** Short paragraph (not a historical/geographic fact — see the location's own detail panel for
   * that) drawing out what's happening in the passage and how it leads into the prompt below. */
  verseNote: string;
  /** Reflective question inviting the reader into the passage — never a quiz question. */
  prompt: string;
};

/** Curated rotation spanning the whole canon (Genesis through Revelation), in canonical order.
 * The day-of-year index below walks it front to back, so over ~five weeks a daily visitor
 * sweeps from Eden to Laodicea. Book names must match src/data/bibleBooks.ts exactly. */
export const DAILY_VERSES: DailyVerseEntry[] = [
  {
    reference: { book: "Genesis", chapter: 2, verse: 8 },
    locationId: "eden",
    verseNote: "God didn't create Eden as a shrine to visit occasionally — it was the ordinary place he walked with the first humans in the cool of the day, before anything had gone wrong between them.",
    prompt: "Where in your everyday surroundings might God be inviting you to walk with him?",
  },
  {
    reference: { book: "Genesis", chapter: 12, verse: 1 },
    locationId: "haran",
    verseNote: "Abram's whole life was in Haran — family, language, everything familiar — and God's call asked him to leave all of it before ever showing him where he was going.",
    prompt: "What familiar security might God be asking you to loosen your grip on in trust?",
  },
  {
    reference: { book: "Genesis", chapter: 22, verse: 14 },
    locationId: "mount-moriah",
    verseNote: "Abraham climbed Moriah prepared to give up the son the promise itself depended on, and God provided a substitute at the very last moment — the place's new name became his own testimony that surrender and provision aren't opposites.",
    prompt: "What is hardest for you to surrender to God right now?",
  },
  {
    reference: { book: "Genesis", chapter: 28, verse: 16 },
    locationId: "bethel",
    verseNote: "Jacob was running for his life, alone and afraid, when he woke from his dream and realized: 'Surely Yahweh is in this place, and I didn't know it.' The place became sacred precisely because God had already been there before Jacob noticed.",
    prompt: "Where has God been present in your life without you noticing?",
  },
  {
    reference: { book: "Exodus", chapter: 3, verse: 5 },
    locationId: "mount-sinai",
    verseNote: "Moses had walked that patch of desert countless times tending sheep before God told him to take off his sandals — the ground hadn't changed, only his awareness of who stood there.",
    prompt: "What ordinary ground in your day might be holier than you realize?",
  },
  {
    reference: { book: "Exodus", chapter: 12, verse: 13 },
    locationId: "goshen",
    verseNote: "The blood on the doorposts that night wasn't decoration — it was the difference between judgment and deliverance. God commanded Israel to keep retelling it precisely so a rescued people would never forget they'd once needed rescuing.",
    prompt: "What has God brought you through that deserves to be remembered out loud?",
  },
  {
    reference: { book: "Exodus", chapter: 14, verse: 21 },
    locationId: "red-sea",
    verseNote: "Israel stood trapped between Pharaoh's army and open water with no way through of their own making — until God simply made one. The sea didn't part because Israel found a clever way out; it parted because God acted where they had none.",
    prompt: "What sea in your life feels impossible to cross today?",
  },
  {
    reference: { book: "Deuteronomy", chapter: 34, verse: 4 },
    locationId: "mount-nebo",
    verseNote: "Moses got to see the whole promised land from Nebo's summit but never set foot in it — a lifetime of faithful leading that ended with the goal still ahead of him, not behind.",
    prompt: "Can you thank God for what he has shown you, even where the story isn't finished?",
  },
  {
    reference: { book: "Joshua", chapter: 6, verse: 20 },
    locationId: "jericho",
    verseNote: "Jericho's walls had stood for centuries and looked, from the ground, like they'd stand forever — until seven days of obedient marching, not military engineering, brought them down.",
    prompt: "What walls in your life seem too thick for God?",
  },
  {
    reference: { book: "Ruth", chapter: 1, verse: 16 },
    locationId: "bethlehem",
    verseNote: "Ruth had every reasonable excuse to go back to her own people and start over — instead she bound herself to Naomi's grief, Naomi's God, and Naomi's uncertain future with no promise of reward.",
    prompt: "Who has God given you to walk beside in loyal, costly love?",
  },
  {
    reference: { book: "1 Samuel", chapter: 17, verse: 45 },
    locationId: "gath",
    verseNote: "Saul's armor didn't fit David, and David didn't need it — he walked toward Goliath naming 'the LORD of Armies' as the reason the outcome was already decided.",
    prompt: "What giant are you facing in your own strength instead of in God's name?",
  },
  {
    reference: { book: "1 Kings", chapter: 18, verse: 38 },
    locationId: "mount-carmel",
    verseNote: "Elijah stood alone against 450 prophets who'd been shouting and cutting themselves since morning with nothing to show for it, then had water poured over his own offering three times before he ever prayed.",
    prompt: "Where do you need God to rekindle a fire that has gone out?",
  },
  {
    reference: { book: "Esther", chapter: 4, verse: 14 },
    locationId: "susa",
    verseNote: "Mordecai's challenge to Esther assumed something easy to forget in the moment: her unlikely position as queen wasn't random, and staying silent had real consequences even if she never fully understood why she'd been placed there.",
    prompt: "What moment might you have been placed in 'for such a time as this'?",
  },
  {
    reference: { book: "Psalms", chapter: 63, verse: 1 },
    locationId: "judea",
    verseNote: "David wrote this as a fugitive in genuinely parched country, and let physical thirst become the exact image for a deeper one — 'my soul thirsts for you' in a land where there was no water.",
    prompt: "What is your soul actually thirsting for beneath all the busyness?",
  },
  {
    reference: { book: "Psalms", chapter: 137, verse: 1 },
    locationId: "babylon",
    verseNote: "The exiles sat by Babylon's rivers unable even to sing, their captors mockingly asking for songs of Zion. This psalm doesn't rush to resolve that grief — sometimes honest lament is itself how faith stays alive far from home.",
    prompt: "How do you hold on to hope when you feel far from home?",
  },
  {
    reference: { book: "Isaiah", chapter: 6, verse: 8 },
    locationId: "jerusalem",
    verseNote: "Isaiah's vision left him undone — 'Woe is me, I am a man of unclean lips' — before it ever got to commissioning. Only after his guilt was dealt with did he hear the question and answer, 'Here I am. Send me.'",
    prompt: "How would you answer if God asked, 'Whom shall I send?'",
  },
  {
    reference: { book: "Isaiah", chapter: 9, verse: 2 },
    locationId: "galilee",
    verseNote: "Isaiah named this exact region — later dismissed as an unimportant backwater — as the place where a great light would dawn on people walking in darkness, centuries before Jesus made it his home base.",
    prompt: "Where do you long for light to break into darkness around you?",
  },
  {
    reference: { book: "Jonah", chapter: 3, verse: 2 },
    locationId: "nineveh",
    verseNote: "Jonah delivered the shortest, most reluctant sermon in Scripture to a city he actively hoped would be destroyed — and Nineveh repented anyway, down to the king himself.",
    prompt: "Is there someone you have written off whom God has not?",
  },
  {
    reference: { book: "Luke", chapter: 2, verse: 11 },
    locationId: "bethlehem",
    verseNote: "There was no room for Mary and Joseph in the inn, so the Savior of the world was laid in a feeding trough — God's entrance into history came through the most overlooked, unglamorous space available.",
    prompt: "What would it mean to make room for Christ in the ordinary corners of your life?",
  },
  {
    reference: { book: "Matthew", chapter: 4, verse: 19 },
    locationId: "sea-of-galilee",
    verseNote: "Peter and Andrew were mid-shift, nets in hand, when Jesus called — and Matthew records that they left the nets 'immediately,' not after finishing the catch or settling their affairs.",
    prompt: "What would you have to leave in your nets to follow Jesus more fully?",
  },
  {
    reference: { book: "Mark", chapter: 2, verse: 5 },
    locationId: "capernaum",
    verseNote: "The paralyzed man never asked Jesus for anything himself in this story — it was entirely his friends' persistence, tearing open a roof when the crowd blocked the door, that got him in front of Jesus at all.",
    prompt: "Who could you carry to Jesus the way four friends carried one man?",
  },
  {
    reference: { book: "John", chapter: 2, verse: 11 },
    locationId: "cana",
    verseNote: "The stone jars at Cana were meant for ceremonial washing, not wine — Jesus's first miracle transformed something utilitarian into something for celebration, quietly enough that only the servants who filled them knew what had happened.",
    prompt: "Where do you need Jesus to turn the ordinary into the abundant?",
  },
  {
    reference: { book: "John", chapter: 4, verse: 14 },
    locationId: "sychar",
    verseNote: "The Samaritan woman came to Jacob's well at noon, the hottest hour, likely to avoid the other women — an ordinary daily errand that never really satisfied, until Jesus offered water she'd never have to keep coming back for.",
    prompt: "What are you drawing on daily that never quite satisfies?",
  },
  {
    reference: { book: "John", chapter: 11, verse: 25 },
    locationId: "bethany",
    verseNote: "Martha's brother had already been in the tomb four days, and her grief was tangled with a very human 'if only you had been here' — Jesus met that grief directly before he ever spoke a word about resurrection.",
    prompt: "What loss are you still carrying that you could bring to Jesus?",
  },
  {
    reference: { book: "Matthew", chapter: 26, verse: 39 },
    locationId: "mount-of-olives",
    verseNote: "Jesus asked, honestly, if there was any other way — and then surrendered his own will to the Father's anyway, before ever facing the cross. The prayer that changed everything wasn't free of struggle; it went straight through it.",
    prompt: "What are you struggling to release with the words 'not as I will'?",
  },
  {
    reference: { book: "Acts", chapter: 9, verse: 3 },
    locationId: "damascus",
    verseNote: "Saul was traveling to Damascus with official authority to arrest Christians when a light from heaven stopped him in his tracks — God didn't wait for a convenient opening in Saul's schedule to redirect his entire life.",
    prompt: "Where might God be interrupting your plans to redirect your life?",
  },
  {
    reference: { book: "Acts", chapter: 10, verse: 15 },
    locationId: "joppa",
    verseNote: "Peter's vision repeated the same instruction three times — 'what God has cleansed, you must not call unholy' — because the old categories he'd lived by his whole life weren't going to update on the first try.",
    prompt: "Who have you quietly labeled unwelcome whom God is asking you to receive?",
  },
  {
    reference: { book: "Acts", chapter: 11, verse: 26 },
    locationId: "antioch-syria",
    verseNote: "The believers at Antioch didn't choose the name 'Christian' for themselves — outsiders coined it to describe what they saw: a community so obviously shaped by Christ that it needed its own word.",
    prompt: "What would it look like for your life to earn that name this week?",
  },
  {
    reference: { book: "Acts", chapter: 16, verse: 25 },
    locationId: "philippi",
    verseNote: "Paul and Silas were beaten and locked in stocks in the innermost cell, and at midnight — not after their release — they were praying and singing hymns loud enough for the other prisoners to hear. The song came before the deliverance, not after it.",
    prompt: "Can you find a song in your current midnight?",
  },
  {
    reference: { book: "Acts", chapter: 17, verse: 23 },
    locationId: "athens",
    verseNote: "Paul didn't condemn Athens's altar 'to an unknown god' — he used it as his starting point, naming what the Athenians had already been reaching for without knowing who they were reaching toward.",
    prompt: "Where is God already at work around you, waiting to be named?",
  },
  {
    reference: { book: "Acts", chapter: 28, verse: 2 },
    locationId: "malta",
    verseNote: "Paul and the rest of the shipwrecked crew arrived on Malta as soaked, unannounced strangers, and the islanders simply built a fire and welcomed them — an act of ordinary hospitality Luke thought was worth recording.",
    prompt: "What small kindness could you show a stranger this week?",
  },
  {
    reference: { book: "Romans", chapter: 1, verse: 16 },
    locationId: "rome",
    verseNote: "Paul wrote 'I am not ashamed of the gospel' to believers living at the center of the empire's power and prestige, where a message about a crucified Jewish carpenter could easily have seemed embarrassing to associate with.",
    prompt: "Where are you tempted to stay quiet about what you believe?",
  },
  {
    reference: { book: "1 Corinthians", chapter: 13, verse: 4 },
    locationId: "corinth",
    verseNote: "Paul wrote this description of love to a church famous for its infighting, favoritism, and spiritual one-upmanship — this wasn't an abstract ideal for a wedding reading, but a direct diagnosis of what that congregation actually lacked.",
    prompt: "Which phrase of love's description do you most need to grow into?",
  },
  {
    reference: { book: "Ephesians", chapter: 3, verse: 18 },
    locationId: "ephesus",
    verseNote: "Paul prayed this from prison, for a church in a city famous for a temple built to a goddess's vastness — asking that believers would grasp a love even wider, longer, higher, and deeper than that.",
    prompt: "How wide is the love you find hardest to accept for yourself?",
  },
  {
    reference: { book: "1 Thessalonians", chapter: 5, verse: 16 },
    locationId: "thessalonica",
    verseNote: "Paul wrote 'rejoice always... give thanks in all circumstances' to a young church already facing real persecution — this wasn't advice for easy seasons, but an instruction for exactly the hard ones.",
    prompt: "What would change if gratitude were your first response today?",
  },
  {
    reference: { book: "Revelation", chapter: 1, verse: 9 },
    locationId: "patmos",
    verseNote: "John received Revelation's entire vision while exiled alone on a small, rocky island Rome used to silence troublesome voices — his isolation didn't cut him off from God; it became the setting for it.",
    prompt: "What has God shown you in a season of isolation?",
  },
  {
    reference: { book: "Revelation", chapter: 3, verse: 20 },
    locationId: "laodicea",
    verseNote: "Laodicea's own water arrived lukewarm through its aqueduct, neither refreshingly cold nor usefully hot — and Jesus used that exact local frustration as the image for a church that had grown comfortable rather than either resistant or on fire.",
    prompt: "Is there a door in your heart Jesus is still knocking on?",
  },
];

/** "Genesis 2:8"-style string — the exact shape BiblePanel's parseBookChapter understands, so it
 * loads the chapter and scrolls/flashes to the verse. */
export function formatDailyReference(entry: DailyVerseEntry): string {
  return `${entry.reference.book} ${entry.reference.chapter}:${entry.reference.verse}`;
}

/** Local-calendar-date key like "2026-07-28" — scopes the dismissal to a single day, so the card
 * returns tomorrow morning without any timer logic. */
export function getLocalDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** localStorage key holding the day-key of the most recent dismissal. */
export const DAILY_VERSE_DISMISSED_KEY = "daily-verse-dismissed";

/** Deterministically selects today's entry: day-of-year modulo list length, computed on the local
 * calendar via Date.UTC so DST shifts can't wobble the day boundary. Every visitor sees the same
 * pairing on the same date, and the rotation walks the list in canonical order. */
export function getDailyVerse(date: Date = new Date()): DailyVerseEntry {
  const dayOfYear = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86400000
  );
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

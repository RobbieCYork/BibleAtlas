/** One rotating "Verse & Place of the Day" pairing — a passage, the place on the map it belongs to,
 * a striking historical/geographic hook, and a short reflective (not trivia) prompt. */
export type DailyVerseEntry = {
  reference: { book: string; chapter: number; verse: number };
  /** Must match an `id` in src/data/locations.ts — App.tsx feeds it straight to focusLocationOnMap. */
  locationId: string;
  /** One-sentence historical or geographic fact that makes the place feel real. */
  hook: string;
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
    hook: "Genesis anchors Eden to real geography, naming the Tigris and Euphrates among the four rivers that watered it.",
    prompt: "Where in your everyday surroundings might God be inviting you to walk with him?",
  },
  {
    reference: { book: "Genesis", chapter: 12, verse: 1 },
    locationId: "haran",
    hook: "Abram left Haran, a prosperous crossroads city on the caravan route between Mesopotamia and Canaan, for a land he had never seen.",
    prompt: "What familiar security might God be asking you to loosen your grip on in trust?",
  },
  {
    reference: { book: "Genesis", chapter: 22, verse: 14 },
    locationId: "mount-moriah",
    hook: "Ancient tradition places the binding of Isaac on the same ridge of Moriah where Solomon's temple later rose.",
    prompt: "What is hardest for you to surrender to God right now?",
  },
  {
    reference: { book: "Genesis", chapter: 28, verse: 16 },
    locationId: "bethel",
    hook: "Jacob's stone pillow lay at Bethel — 'house of God' — a name still carried by churches on every continent.",
    prompt: "Where has God been present in your life without you noticing?",
  },
  {
    reference: { book: "Exodus", chapter: 3, verse: 5 },
    locationId: "mount-sinai",
    hook: "Pilgrims have climbed the slopes of Sinai since at least the fourth century, seeking the mountain of the burning bush.",
    prompt: "What ordinary ground in your day might be holier than you realize?",
  },
  {
    reference: { book: "Exodus", chapter: 12, verse: 13 },
    locationId: "goshen",
    hook: "Israel spent the Passover night in Goshen, the fertile Nile-delta pastureland where they had lived set apart for four centuries.",
    prompt: "What has God brought you through that deserves to be remembered out loud?",
  },
  {
    reference: { book: "Exodus", chapter: 14, verse: 21 },
    locationId: "red-sea",
    hook: "The crossing of the sea became the Old Testament's defining picture of rescue, echoed by psalmists and prophets for a thousand years.",
    prompt: "What sea in your life feels impossible to cross today?",
  },
  {
    reference: { book: "Deuteronomy", chapter: 34, verse: 4 },
    locationId: "mount-nebo",
    hook: "On a clear day the summit of Mount Nebo still offers the very panorama Moses saw — the Jordan Valley, Jericho, and the distant hills of Judea.",
    prompt: "Can you thank God for what he has shown you, even where the story isn't finished?",
  },
  {
    reference: { book: "Joshua", chapter: 6, verse: 20 },
    locationId: "jericho",
    hook: "Jericho is among the oldest continuously inhabited cities on earth, and at roughly 850 feet below sea level, the lowest.",
    prompt: "What walls in your life seem too thick for God?",
  },
  {
    reference: { book: "Ruth", chapter: 1, verse: 16 },
    locationId: "bethlehem",
    hook: "Ruth the Moabite gleaned the barley fields outside Bethlehem — 'house of bread' — and became great-grandmother to King David.",
    prompt: "Who has God given you to walk beside in loyal, costly love?",
  },
  {
    reference: { book: "1 Samuel", chapter: 17, verse: 45 },
    locationId: "gath",
    hook: "Goliath's hometown of Gath has been excavated at Tell es-Safi, where diggers found a pottery shard inscribed with a name much like his.",
    prompt: "What giant are you facing in your own strength instead of in God's name?",
  },
  {
    reference: { book: "1 Kings", chapter: 18, verse: 38 },
    locationId: "mount-carmel",
    hook: "Mount Carmel rises nearly 1,800 feet straight from the Mediterranean, the storm-swept stage where Elijah faced 450 prophets of Baal alone.",
    prompt: "Where do you need God to rekindle a fire that has gone out?",
  },
  {
    reference: { book: "Esther", chapter: 4, verse: 14 },
    locationId: "susa",
    hook: "Esther's story unfolds in Susa, the Persian kings' winter capital, whose glazed-brick palace walls have been unearthed by archaeologists.",
    prompt: "What moment might you have been placed in 'for such a time as this'?",
  },
  {
    reference: { book: "Psalms", chapter: 63, verse: 1 },
    locationId: "judea",
    hook: "David prayed this psalm in the wilderness of Judah, a sun-scorched badland where some years bring barely four inches of rain.",
    prompt: "What is your soul actually thirsting for beneath all the busyness?",
  },
  {
    reference: { book: "Psalms", chapter: 137, verse: 1 },
    locationId: "babylon",
    hook: "The exiles wept beside Babylon's canals in the shadow of the Ishtar Gate, a thousand miles from the ruins of Jerusalem.",
    prompt: "How do you hold on to hope when you feel far from home?",
  },
  {
    reference: { book: "Isaiah", chapter: 6, verse: 8 },
    locationId: "jerusalem",
    hook: "Isaiah's vision came in Jerusalem's temple in the year King Uzziah died, after a reign of more than fifty years.",
    prompt: "How would you answer if God asked, 'Whom shall I send?'",
  },
  {
    reference: { book: "Isaiah", chapter: 9, verse: 2 },
    locationId: "galilee",
    hook: "Isaiah named Galilee as the place where light would dawn some seven centuries before Jesus made it his home base.",
    prompt: "Where do you long for light to break into darkness around you?",
  },
  {
    reference: { book: "Jonah", chapter: 3, verse: 2 },
    locationId: "nineveh",
    hook: "Nineveh's walls ran a circuit of some seven and a half miles, enclosing one of the largest cities of the ancient world.",
    prompt: "Is there someone you have written off whom God has not?",
  },
  {
    reference: { book: "Luke", chapter: 2, verse: 11 },
    locationId: "bethlehem",
    hook: "Bethlehem's Church of the Nativity, first raised in the fourth century, is among the oldest churches in continuous use anywhere.",
    prompt: "What would it mean to make room for Christ in the ordinary corners of your life?",
  },
  {
    reference: { book: "Matthew", chapter: 4, verse: 19 },
    locationId: "sea-of-galilee",
    hook: "A first-century fishing boat pulled from the Sea of Galilee's mud in 1986 shows exactly the kind of craft the disciples abandoned.",
    prompt: "What would you have to leave in your nets to follow Jesus more fully?",
  },
  {
    reference: { book: "Mark", chapter: 2, verse: 5 },
    locationId: "capernaum",
    hook: "Excavations at Capernaum uncovered a cluster of basalt homes — one venerated as Peter's house within a generation of the resurrection.",
    prompt: "Who could you carry to Jesus the way four friends carried one man?",
  },
  {
    reference: { book: "John", chapter: 2, verse: 11 },
    locationId: "cana",
    hook: "The stone jars at Cana held twenty to thirty gallons each — vessels for ritual washing turned into carriers of celebration.",
    prompt: "Where do you need Jesus to turn the ordinary into the abundant?",
  },
  {
    reference: { book: "John", chapter: 4, verse: 14 },
    locationId: "sychar",
    hook: "Jacob's Well at Sychar is more than a hundred feet deep and still yields cool water to visitors today.",
    prompt: "What are you drawing on daily that never quite satisfies?",
  },
  {
    reference: { book: "John", chapter: 11, verse: 25 },
    locationId: "bethany",
    hook: "Bethany's modern name, al-Eizariya, still carries the memory of Lazarus two thousand years on.",
    prompt: "What loss are you still carrying that you could bring to Jesus?",
  },
  {
    reference: { book: "Matthew", chapter: 26, verse: 39 },
    locationId: "mount-of-olives",
    hook: "Olive trees still standing in Gethsemane at the foot of the Mount of Olives have been dated to roughly nine centuries old.",
    prompt: "What are you struggling to release with the words 'not as I will'?",
  },
  {
    reference: { book: "Acts", chapter: 9, verse: 3 },
    locationId: "damascus",
    hook: "Damascus is one of the oldest continuously inhabited cities in the world, and the street called Straight still crosses it.",
    prompt: "Where might God be interrupting your plans to redirect your life?",
  },
  {
    reference: { book: "Acts", chapter: 10, verse: 15 },
    locationId: "joppa",
    hook: "Peter's rooftop vision came in Joppa, the ancient port (modern Jaffa) that had served Jerusalem for a thousand years before him.",
    prompt: "Who have you quietly labeled unwelcome whom God is asking you to receive?",
  },
  {
    reference: { book: "Acts", chapter: 11, verse: 26 },
    locationId: "antioch-syria",
    hook: "Antioch, third-largest city of the Roman Empire, is where the name 'Christian' was first spoken.",
    prompt: "What would it look like for your life to earn that name this week?",
  },
  {
    reference: { book: "Acts", chapter: 16, verse: 25 },
    locationId: "philippi",
    hook: "Philippi was a proud Roman colony on the Via Egnatia, and its jail's midnight hymns birthed the first church in Europe.",
    prompt: "Can you find a song in your current midnight?",
  },
  {
    reference: { book: "Acts", chapter: 17, verse: 23 },
    locationId: "athens",
    hook: "The rocky outcrop of the Areopagus where Paul spoke still stands in plain view beneath the Acropolis.",
    prompt: "Where is God already at work around you, waiting to be named?",
  },
  {
    reference: { book: "Acts", chapter: 28, verse: 2 },
    locationId: "malta",
    hook: "Maltese tradition still names the inlet where the grain ship broke apart St. Paul's Bay.",
    prompt: "What small kindness could you show a stranger this week?",
  },
  {
    reference: { book: "Romans", chapter: 1, verse: 16 },
    locationId: "rome",
    hook: "Paul wrote to a church in a city of a million people — the letter itself was carried there by a deaconess named Phoebe.",
    prompt: "Where are you tempted to stay quiet about what you believe?",
  },
  {
    reference: { book: "1 Corinthians", chapter: 13, verse: 4 },
    locationId: "corinth",
    hook: "Corinth straddled a four-mile isthmus where ships were hauled overland between two seas, making it rich, crowded, and famously fractious.",
    prompt: "Which phrase of love's description do you most need to grow into?",
  },
  {
    reference: { book: "Ephesians", chapter: 3, verse: 18 },
    locationId: "ephesus",
    hook: "Ephesus boasted the Temple of Artemis, one of the seven wonders of the ancient world — yet Paul prayed its church would measure a greater immensity.",
    prompt: "How wide is the love you find hardest to accept for yourself?",
  },
  {
    reference: { book: "1 Thessalonians", chapter: 5, verse: 16 },
    locationId: "thessalonica",
    hook: "Thessalonica never vanished — the port city Paul wrote to is still Greece's second city today.",
    prompt: "What would change if gratitude were your first response today?",
  },
  {
    reference: { book: "Revelation", chapter: 1, verse: 9 },
    locationId: "patmos",
    hook: "Patmos is a rocky Aegean island of barely thirteen square miles, the kind of place Rome used to make troublesome voices disappear.",
    prompt: "What has God shown you in a season of isolation?",
  },
  {
    reference: { book: "Revelation", chapter: 3, verse: 20 },
    locationId: "laodicea",
    hook: "Laodicea's aqueduct water arrived lukewarm — unlike the hot springs of nearby Hierapolis or the cold streams of Colossae — an image its church would instantly recognize.",
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

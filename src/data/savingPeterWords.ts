import { CROSSWORD_LEVELS, type CrosswordLevel } from "./crosswordWords";

export interface SavingPeterWord {
  /** Letters only, uppercase. */
  word: string;
  clue: string;
}

/** Points a correct guess is worth in multiplayer mode, by difficulty tier — the harder the word, the
 * more it's worth, same idea as Bible Trivia's per-question point values. */
export const SAVING_PETER_LEVEL_POINTS: Record<CrosswordLevel, number> = {
  beginner: 5,
  easy: 10,
  intermediate: 15,
  advanced: 20,
  expert: 25,
};

export interface SavingPeterRoundEntry {
  id: string;
  level: CrosswordLevel;
  word: string;
  clue: string;
  points: number;
}

function shuffledWords<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Builds a shuffled sequence of round ids ("level:WORD") drawn from every difficulty tier at once —
 * mirrors buildQuestionSequence's role in Bible Trivia (src/data/gameQuestions.ts), but the "question
 * bank" here is just every word across every level, so the mix of easy/hard rounds falls out of the
 * shuffle rather than needing its own weighting. Stored on the room as ids only (not word/clue text)
 * so every client resolves the actual content from this same local bundle, same trust model as Trivia. */
export function buildSavingPeterRoundIds(count = 30): string[] {
  const pool: string[] = [];
  for (const level of CROSSWORD_LEVELS.map((l) => l.key)) {
    for (const entry of SAVING_PETER_WORDS[level]) {
      pool.push(`${level}:${entry.word}`);
    }
  }
  return shuffledWords(pool).slice(0, Math.min(count, pool.length));
}

/** Resolves a round id ("level:WORD") produced by buildSavingPeterRoundIds() back into its full entry
 * — returns null if the id is malformed or the word can no longer be found (shouldn't happen since the
 * bundle this reads from is the same one the id was built from, but a network client is a network
 * client). */
export function resolveSavingPeterRound(id: string): SavingPeterRoundEntry | null {
  const sep = id.indexOf(":");
  if (sep < 0) return null;
  const level = id.slice(0, sep) as CrosswordLevel;
  const word = id.slice(sep + 1);
  const entry = SAVING_PETER_WORDS[level]?.find((w) => w.word === word);
  if (!entry) return null;
  return { id, level, word: entry.word, clue: entry.clue, points: SAVING_PETER_LEVEL_POINTS[level] };
}

// Reused as-is (see CrosswordView's level picker) — "the same levels of difficulty as the Crossword"
// means literally these five tiers, not a look-alike set defined twice.
export { CROSSWORD_LEVELS as SAVING_PETER_LEVELS };
export type { CrosswordLevel as SavingPeterLevel };

/** One word bank per difficulty tier, big enough (25-30+ entries each) that the shuffled-bag draw in
 * SavingPeterView.tsx can go a full lap without repeating a word. */
export const SAVING_PETER_WORDS: Record<CrosswordLevel, SavingPeterWord[]> = {
  beginner: [
    { word: "PETER", clue: "The disciple who walked on water, then doubted" },
    { word: "JESUS", clue: "Who said \"Come\" and caught Peter when he sank" },
    { word: "BOAT", clue: "What the disciples were in during the storm" },
    { word: "NOAH", clue: "He built an ark before a great flood" },
    { word: "ARK", clue: "The vessel that survived the flood" },
    { word: "ADAM", clue: "The first man" },
    { word: "EVE", clue: "The first woman" },
    { word: "DAVID", clue: "The shepherd boy who defeated Goliath" },
    { word: "MOSES", clue: "He parted the Red Sea" },
    { word: "JONAH", clue: "Swallowed by a great fish" },
    { word: "GARDEN", clue: "Eden was one" },
    { word: "LIONS", clue: "What Daniel was thrown in with" },
    { word: "MARY", clue: "Jesus' mother" },
    { word: "ANGEL", clue: "A heavenly messenger" },
    { word: "STAR", clue: "What the wise men followed" },
    { word: "SHEEP", clue: "Animals a shepherd cares for" },
    { word: "LAMB", clue: "A young sheep — also a name for Jesus" },
    { word: "DOVE", clue: "The bird that brought Noah an olive leaf" },
    { word: "RAINBOW", clue: "God's sign of promise after the flood" },
    { word: "KING", clue: "David and Solomon each ruled as one" },
    { word: "FISH", clue: "What Jesus multiplied along with loaves" },
    { word: "BREAD", clue: "Jesus called himself \"the bread of life\"" },
    { word: "PRAY", clue: "Talking to God" },
    { word: "CHURCH", clue: "Where believers gather to worship" },
    { word: "BIBLE", clue: "God's written word" },
    { word: "HEAVEN", clue: "Where God dwells" },
    { word: "CROWN", clue: "What a king wears" },
    { word: "GOD", clue: "Who made everything" },
    { word: "PRAISE", clue: "What we give to God in worship" },
    { word: "AMEN", clue: "A word said at the end of a prayer" },
    { word: "CAMEL", clue: "The animal the wise men likely rode" },
    { word: "DONKEY", clue: "What Jesus rode into Jerusalem" },
  ],
  easy: [
    { word: "STORM", clue: "What made the waves so rough that night" },
    { word: "WATER", clue: "What Peter walked on — until he didn't" },
    { word: "GOLIATH", clue: "The giant David defeated with a sling" },
    { word: "SAMSON", clue: "His strength was in his hair" },
    { word: "ESTHER", clue: "A queen who saved her people" },
    { word: "DANIEL", clue: "Thrown into a lions' den" },
    { word: "JOSEPH", clue: "Sold by his brothers, given a coat of many colors" },
    { word: "MANNA", clue: "Bread from heaven in the wilderness" },
    { word: "CROSS", clue: "Where Jesus was crucified" },
    { word: "BETHLEHEM", clue: "Where Jesus was born" },
    { word: "NAZARETH", clue: "Where Jesus grew up" },
    { word: "JERUSALEM", clue: "The holy city" },
    { word: "SHEPHERD", clue: "One who cares for sheep — and a picture of Jesus" },
    { word: "DISCIPLES", clue: "The twelve who followed Jesus" },
    { word: "WIND", clue: "What Peter noticed and became afraid of" },
    { word: "FEAR", clue: "What Jesus told them not to have" },
    { word: "GHOST", clue: "What the disciples thought Jesus was at first" },
    { word: "DELILAH", clue: "She cut Samson's hair" },
    { word: "RUTH", clue: "She said \"where you go, I will go\"" },
    { word: "SARAH", clue: "Abraham's wife, mother of Isaac in her old age" },
    { word: "JOHN", clue: "The disciple Jesus loved" },
    { word: "JAMES", clue: "A disciple, brother of John" },
    { word: "ANDREW", clue: "Peter's brother, also a disciple" },
    { word: "THOMAS", clue: "The disciple who doubted the resurrection" },
    { word: "JUDAS", clue: "The disciple who betrayed Jesus" },
    { word: "PHARAOH", clue: "The ruler of Egypt in Moses' time" },
    { word: "EGYPT", clue: "Where Israel was enslaved" },
    { word: "DESERT", clue: "Where Israel wandered forty years" },
    { word: "MANGER", clue: "Where baby Jesus was laid" },
    { word: "WISEMEN", clue: "They followed a star to find Jesus" },
    { word: "PARADISE", clue: "What Jesus promised the thief on the cross" },
  ],
  intermediate: [
    { word: "FAITH", clue: "What Jesus said Peter had too little of" },
    { word: "DOUBT", clue: "What crept in when Peter saw the wind" },
    { word: "SINK", clue: "What Peter began to do when he doubted" },
    { word: "HAND", clue: "What Jesus stretched out to catch Peter" },
    { word: "ISAAC", clue: "Abraham's promised son" },
    { word: "JACOB", clue: "He wrestled with an angel and got a new name" },
    { word: "SERPENT", clue: "The tempter in the garden" },
    { word: "TEMPLE", clue: "The holy building in Jerusalem" },
    { word: "PARABLE", clue: "A story Jesus used to teach a lesson" },
    { word: "PSALMS", clue: "The book of songs and prayers" },
    { word: "GOSPEL", clue: "Good news — also the name for the first four New Testament books" },
    { word: "ABRAHAM", clue: "Father of many nations" },
    { word: "MIRACLE", clue: "What walking on water was" },
    { word: "GALILEE", clue: "The sea this story takes place on" },
    { word: "PHARISEE", clue: "A religious leader often at odds with Jesus" },
    { word: "SANHEDRIN", clue: "The Jewish ruling council" },
    { word: "CENTURION", clue: "A Roman officer whose faith impressed Jesus" },
    { word: "SAMARITAN", clue: "The \"good\" one in one of Jesus' most famous parables" },
    { word: "LAZARUS", clue: "Jesus raised him from the dead after four days" },
    { word: "ZACCHAEUS", clue: "A short tax collector who climbed a tree to see Jesus" },
    { word: "NICODEMUS", clue: "A Pharisee who came to Jesus by night" },
    { word: "BARNABAS", clue: "Paul's early missionary companion, \"son of encouragement\"" },
    { word: "TIMOTHY", clue: "A young pastor Paul mentored and wrote letters to" },
    { word: "CORINTH", clue: "A Greek city Paul wrote two letters to" },
    { word: "EPHESUS", clue: "A city with a famous temple, and a Pauline letter" },
    { word: "PROVERBS", clue: "The book of wisdom sayings" },
    { word: "LEVITICUS", clue: "The book of priestly law, third in the Bible" },
    { word: "GETHSEMANE", clue: "The garden where Jesus prayed before his arrest" },
    { word: "PILATE", clue: "The Roman governor who sentenced Jesus" },
    { word: "HEROD", clue: "The king who ordered the slaughter of infants" },
  ],
  advanced: [
    { word: "REDSEA", clue: "The sea Moses parted for Israel to cross" },
    { word: "RESURRECTION", clue: "Jesus rising from the dead" },
    { word: "TRINITY", clue: "Father, Son, and Holy Spirit" },
    { word: "BAPTISM", clue: "A ritual of washing symbolizing new life" },
    { word: "PENTECOST", clue: "When the Holy Spirit came upon the disciples" },
    { word: "COVENANT", clue: "A binding agreement God made with his people" },
    { word: "MESSIAH", clue: "Hebrew for \"anointed one\"" },
    { word: "INCARNATION", clue: "God becoming flesh in Jesus" },
    { word: "ATONEMENT", clue: "Making amends for sin through Christ's death" },
    { word: "REDEMPTION", clue: "Being bought back, or freed, from sin" },
    { word: "TRANSFIGURATION", clue: "When Jesus's appearance changed on a mountain before three disciples" },
    { word: "APOSTLE", clue: "One sent out with authority to preach — Paul called himself one" },
    { word: "PROPHET", clue: "One who speaks God's message, sometimes foretelling the future" },
    { word: "TABERNACLE", clue: "The portable tent-sanctuary Israel carried in the wilderness" },
    { word: "SABBATH", clue: "The day of rest God commanded" },
    { word: "CIRCUMCISION", clue: "The sign of God's covenant with Abraham" },
    { word: "LEVITE", clue: "A member of the priestly tribe" },
    { word: "PATRIARCH", clue: "Abraham, Isaac, and Jacob are called this" },
    { word: "EXODUS", clue: "Israel's departure from Egypt — and the book that tells it" },
    { word: "REVELATION", clue: "The last book of the Bible, full of visions" },
    { word: "SANCTUARY", clue: "A holy, set-apart place of worship" },
    { word: "INTERCESSION", clue: "Praying on behalf of someone else" },
    { word: "DISCIPLESHIP", clue: "The lifelong process of following and becoming like Jesus" },
    { word: "OMNIPOTENT", clue: "All-powerful — an attribute of God" },
    { word: "OMNIPRESENT", clue: "Present everywhere at once — an attribute of God" },
  ],
  expert: [
    { word: "PROPITIATION", clue: "The turning away of God's wrath through Christ's sacrifice" },
    { word: "JUSTIFICATION", clue: "Being declared righteous before God by faith" },
    { word: "SANCTIFICATION", clue: "The process of being made holy" },
    { word: "ESCHATOLOGY", clue: "The study of end times and final things" },
    { word: "OMNISCIENT", clue: "All-knowing — an attribute of God" },
    { word: "HERMENEUTICS", clue: "The discipline of interpreting Scripture" },
    { word: "SOTERIOLOGY", clue: "The study of salvation" },
    { word: "ECCLESIOLOGY", clue: "The study of the church" },
    { word: "PNEUMATOLOGY", clue: "The study of the Holy Spirit" },
    { word: "PREDESTINATION", clue: "The doctrine that God has ordained what will happen, including salvation" },
    { word: "CHRISTOLOGY", clue: "The study of the person and nature of Christ" },
    { word: "THEOPHANY", clue: "A visible manifestation of God to a person" },
    { word: "SEPTUAGINT", clue: "The ancient Greek translation of the Hebrew Scriptures" },
    { word: "PENTATEUCH", clue: "The first five books of the Bible, traditionally attributed to Moses" },
    { word: "APOCRYPHA", clue: "Books included in some Bible canons but not others" },
    { word: "IMMUTABILITY", clue: "The doctrine that God does not change" },
    { word: "GLORIFICATION", clue: "The final stage of salvation, being made perfectly like Christ" },
    { word: "SUBSTITUTIONARY", clue: "The kind of atonement in which Christ dies in the sinner's place" },
  ],
};

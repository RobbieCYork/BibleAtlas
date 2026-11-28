import type { TQQuestion, TQSet } from "./types";

/* 20 Questions — Places. Ids are locations.ts ids, so the reveal opens that place's article.
 *
 * Same reading rules as people.ts: each question lists YES and UNKNOWN ("Not stated"); everyone
 * else is NO. A region answers for what happened inside it — Judea is YES to "Was Jesus born
 * there?" because Bethlehem is in Judea.
 *
 * Where a place's identification is disputed (Sodom's site, which mountain is Sinai, where the Red
 * Sea crossing happened) the modern-country questions are UNKNOWN for it, not a guess. The "kind"
 * questions are generated from KIND below, and scripts/games-data/twenty-questions.mjs checks KIND
 * against each record's own category in locations.ts, and the "mentioned in the Old / New
 * Testament" answers against the text of all three translations.
 */

type Kind = "city" | "region" | "sea" | "river" | "mountain" | "island";

/** Mirrors locations.ts's category, with region/province/nation folded together. */
export const KIND: Record<string, Kind> = {
  jerusalem: "city", bethlehem: "city", nazareth: "city", capernaum: "city", galilee: "region", judea: "region",
  samaria: "region", "jordan-river": "river", "sea-of-galilee": "sea", damascus: "city", "antioch-syria": "city",
  tarsus: "city", cyprus: "island", philippi: "city", thessalonica: "city", athens: "city", corinth: "city",
  ephesus: "city", rome: "city", patmos: "island", bethany: "city", cana: "city", joppa: "city", iconium: "city",
  lystra: "city", troas: "city", laodicea: "city", smyrna: "city", crete: "island", malta: "island", egypt: "region",
  "mount-of-olives": "mountain", macedonia: "region", galatia: "region", babylon: "city", ur: "city", haran: "city",
  sodom: "city", hebron: "city", bethel: "city", "mount-sinai": "mountain", "mount-nebo": "mountain", "red-sea": "sea",
  jericho: "city", shiloh: "city", "mount-carmel": "mountain", "mount-gilboa": "mountain", "dead-sea": "sea",
  nineveh: "city", susa: "city", moab: "region", gaza: "city", tyre: "city", sidon: "city", beersheba: "city",
  shechem: "city",
};

const ofKind = (...kinds: Kind[]) => Object.keys(KIND).filter((id) => kinds.includes(KIND[id]));

const KIND_QUESTIONS: TQQuestion[] = [
  { id: "city", group: "Kind", text: "Is it a city or town?", yes: ofKind("city") },
  { id: "region", group: "Kind", text: "Is it a region, province or nation?", yes: ofKind("region") },
  { id: "water", group: "Kind", text: "Is it a sea, lake or river?", yes: ofKind("sea", "river") },
  { id: "river", group: "Kind", text: "Is it a river?", yes: ofKind("river") },
  { id: "mountain", group: "Kind", text: "Is it a mountain or hill?", yes: ofKind("mountain") },
  { id: "island", group: "Kind", text: "Is it an island?", yes: ofKind("island") },
];

export const PLACES: TQSet = {
  category: "places",
  label: "Places",
  noun: "place",
  entries: [
    { id: "jerusalem", name: "Jerusalem", ref: "2 Samuel 5:5" },
    { id: "bethlehem", name: "Bethlehem", ref: "Micah 5:2", keywords: ["Bethlehem", "Beth-lehem"] },
    { id: "nazareth", name: "Nazareth", ref: "Luke 2:51" },
    { id: "capernaum", name: "Capernaum", ref: "Matthew 4:13" },
    { id: "galilee", name: "Galilee", ref: "Matthew 4:23" },
    { id: "judea", name: "Judea", ref: "Matthew 2:1", keywords: ["Judea", "Judaea"] },
    { id: "samaria", name: "Samaria", ref: "John 4:4" },
    { id: "jordan-river", name: "Jordan River", ref: "Matthew 3:13", keywords: ["Jordan"] },
    { id: "sea-of-galilee", name: "Sea of Galilee", ref: "Matthew 4:18", keywords: ["Galilee"] },
    { id: "damascus", name: "Damascus", ref: "Acts 9:3" },
    { id: "antioch-syria", name: "Antioch (in Syria)", ref: "Acts 11:26", keywords: ["Antioch"] },
    { id: "tarsus", name: "Tarsus", ref: "Acts 22:3" },
    { id: "cyprus", name: "Cyprus", ref: "Acts 13:4" },
    { id: "philippi", name: "Philippi", ref: "Acts 16:12" },
    { id: "thessalonica", name: "Thessalonica", ref: "Acts 17:1" },
    { id: "athens", name: "Athens", ref: "Acts 17:16" },
    { id: "corinth", name: "Corinth", ref: "Acts 18:1" },
    { id: "ephesus", name: "Ephesus", ref: "Acts 19:1" },
    { id: "rome", name: "Rome", ref: "Acts 28:16" },
    { id: "patmos", name: "Patmos", ref: "Revelation 1:9" },
    { id: "bethany", name: "Bethany", ref: "John 11:1" },
    { id: "cana", name: "Cana", ref: "John 2:1" },
    { id: "joppa", name: "Joppa", ref: "Jonah 1:3" },
    { id: "iconium", name: "Iconium", ref: "Acts 14:1" },
    { id: "lystra", name: "Lystra", ref: "Acts 14:8" },
    { id: "troas", name: "Troas", ref: "Acts 16:8" },
    { id: "laodicea", name: "Laodicea", ref: "Revelation 3:14", keywords: ["Laodicea", "Laodiceans"] },
    { id: "smyrna", name: "Smyrna", ref: "Revelation 2:8" },
    { id: "crete", name: "Crete", ref: "Acts 27:7" },
    { id: "malta", name: "Malta", ref: "Acts 28:1", keywords: ["Malta", "Melita"] },
    { id: "egypt", name: "Egypt", ref: "Exodus 1:8" },
    { id: "mount-of-olives", name: "Mount of Olives", ref: "Acts 1:12", keywords: ["Olives", "Olivet"] },
    { id: "macedonia", name: "Macedonia", ref: "Acts 16:9" },
    { id: "galatia", name: "Galatia", ref: "Galatians 1:2" },
    { id: "babylon", name: "Babylon", ref: "Daniel 1:1" },
    { id: "ur", name: "Ur", ref: "Genesis 11:31" },
    { id: "haran", name: "Haran", ref: "Genesis 12:4" },
    { id: "sodom", name: "Sodom", ref: "Genesis 19:24" },
    { id: "hebron", name: "Hebron", ref: "2 Samuel 2:11" },
    { id: "bethel", name: "Bethel", ref: "Genesis 28:19", keywords: ["Bethel", "Beth-el"] },
    { id: "mount-sinai", name: "Mount Sinai", ref: "Exodus 19:20", keywords: ["Sinai"] },
    { id: "mount-nebo", name: "Mount Nebo", ref: "Deuteronomy 34:1", keywords: ["Nebo"] },
    { id: "red-sea", name: "Red Sea", ref: "Exodus 15:4", keywords: ["Red Sea"] },
    { id: "jericho", name: "Jericho", ref: "Joshua 6:1" },
    { id: "shiloh", name: "Shiloh", ref: "Joshua 18:1" },
    { id: "mount-carmel", name: "Mount Carmel", ref: "1 Kings 18:19", keywords: ["Carmel"] },
    { id: "mount-gilboa", name: "Mount Gilboa", ref: "1 Samuel 31:8", keywords: ["Gilboa"] },
    { id: "dead-sea", name: "Dead Sea (the Salt Sea)", ref: "Genesis 14:3", keywords: ["Salt Sea"] },
    { id: "nineveh", name: "Nineveh", ref: "Jonah 3:3" },
    { id: "susa", name: "Susa (Shushan)", ref: "Esther 1:2", keywords: ["Susa", "Shushan"] },
    { id: "moab", name: "Moab", ref: "Ruth 1:1" },
    { id: "gaza", name: "Gaza", ref: "Judges 16:21" },
    { id: "tyre", name: "Tyre", ref: "2 Samuel 5:11" },
    { id: "sidon", name: "Sidon", ref: "1 Kings 17:9", keywords: ["Sidon", "Zidon"] },
    { id: "beersheba", name: "Beersheba", ref: "Genesis 21:31", keywords: ["Beersheba", "Beer-sheba"] },
    { id: "shechem", name: "Shechem", ref: "Genesis 12:6", keywords: ["Shechem", "Sichem"] },
  ],
  groups: ["Kind", "Where today", "Bible", "Jesus", "Paul", "Old Testament story"],
  questions: [
    ...KIND_QUESTIONS,
    // ------------------------------------------------------------ Where today
    {
      // Border features (the Jordan, the Dead Sea) are YES for every country they touch.
      id: "israel",
      group: "Where today",
      text: "Is it in modern Israel or the Palestinian territories (West Bank, Gaza)?",
      yes: ["jerusalem", "bethlehem", "nazareth", "capernaum", "galilee", "judea", "samaria", "jordan-river", "sea-of-galilee", "bethany", "cana", "joppa", "mount-of-olives", "hebron", "bethel", "jericho", "shiloh", "mount-carmel", "mount-gilboa", "dead-sea", "beersheba", "shechem", "gaza"],
      unknown: ["sodom", "mount-sinai", "red-sea"],
    },
    {
      id: "jordan",
      group: "Where today",
      text: "Is it in modern Jordan?",
      yes: ["mount-nebo", "moab", "jordan-river", "dead-sea"],
      unknown: ["sodom", "mount-sinai", "red-sea"],
    },
    {
      // Antioch is Antakya; Haran is Harran, near Şanlıurfa.
      id: "turkey",
      group: "Where today",
      text: "Is it in modern Turkey?",
      yes: ["tarsus", "antioch-syria", "ephesus", "iconium", "lystra", "troas", "laodicea", "smyrna", "galatia", "haran"],
    },
    {
      // Roman Macedonia reached beyond today's Greek border, but most of it is northern Greece.
      id: "greece",
      group: "Where today",
      text: "Is it in modern Greece?",
      yes: ["philippi", "thessalonica", "athens", "corinth", "patmos", "crete", "macedonia"],
    },
    { id: "italy", group: "Where today", text: "Is it in modern Italy?", yes: ["rome"] },
    {
      id: "egypt-today",
      group: "Where today",
      text: "Is it in modern Egypt?",
      yes: ["egypt", "red-sea"],
      unknown: ["mount-sinai"],
    },
    { id: "iraq-iran", group: "Where today", text: "Is it in modern Iraq or Iran?", yes: ["babylon", "ur", "nineveh", "susa"] },
    { id: "syria-lebanon", group: "Where today", text: "Is it in modern Syria or Lebanon?", yes: ["damascus", "tyre", "sidon"] },
    {
      // A city with its own harbour on the sea. Corinth and Tarsus had ports a few miles off; Gaza's
      // ancient city stood a little inland; the islands are asked about separately.
      id: "port",
      group: "Where today",
      text: "Is it a port city on the Mediterranean or Aegean coast?",
      yes: ["joppa", "tyre", "sidon", "troas", "ephesus", "thessalonica", "smyrna"],
      unknown: ["gaza", "corinth", "tarsus", "cyprus", "crete", "malta", "egypt", "macedonia"],
    },
    // ------------------------------------------------------------ Bible
    {
      // By any name it goes by in the WEB, KJV or ASV — the Sea of Galilee is Chinnereth (Numbers
      // 34:11), the Dead Sea the Salt Sea, Judea the land of Judah. Cyprus (Kittim?) and Crete
      // (Caphtor?) rest on identifications scholars dispute.
      id: "in-ot",
      group: "Bible",
      text: "Is it mentioned in the Old Testament?",
      yes: ["jerusalem", "bethlehem", "galilee", "judea", "samaria", "jordan-river", "sea-of-galilee", "damascus", "joppa", "egypt", "mount-of-olives", "babylon", "ur", "haran", "sodom", "hebron", "bethel", "mount-sinai", "mount-nebo", "red-sea", "jericho", "shiloh", "mount-carmel", "mount-gilboa", "dead-sea", "nineveh", "susa", "moab", "gaza", "tyre", "sidon", "beersheba", "shechem"],
      unknown: ["cyprus", "crete"],
    },
    {
      id: "in-nt",
      group: "Bible",
      text: "Is it mentioned in the New Testament?",
      yes: ["jerusalem", "bethlehem", "nazareth", "capernaum", "galilee", "judea", "samaria", "jordan-river", "sea-of-galilee", "damascus", "antioch-syria", "tarsus", "cyprus", "philippi", "thessalonica", "athens", "corinth", "ephesus", "rome", "patmos", "bethany", "cana", "joppa", "iconium", "lystra", "troas", "laodicea", "smyrna", "crete", "malta", "egypt", "mount-of-olives", "macedonia", "galatia", "babylon", "haran", "sodom", "mount-sinai", "red-sea", "jericho", "nineveh", "tyre", "sidon", "gaza", "shechem"],
    },
    {
      // Jerusalem, Shiloh (Joshua 18:1) — and Judea, which contains Jerusalem.
      id: "temple",
      group: "Bible",
      text: "Did the tabernacle or the temple stand there?",
      yes: ["jerusalem", "shiloh", "judea"],
    },
    { id: "empire-capital", group: "Bible", text: "Was it the capital of an empire (Assyria, Babylon, Persia or Rome)?", yes: ["babylon", "nineveh", "susa", "rome"] },
    // ------------------------------------------------------------ Jesus
    {
      // Matthew 15:21 has him in "the region of Tyre and Sidon"; whether he entered either city is
      // not said. Sychar, where he met the Samaritan woman, was near Shechem, not Shechem itself.
      id: "jesus-went",
      group: "Jesus",
      text: "Do the Gospels record Jesus going there?",
      yes: ["jerusalem", "bethlehem", "nazareth", "capernaum", "galilee", "judea", "samaria", "jordan-river", "sea-of-galilee", "bethany", "cana", "mount-of-olives", "egypt", "jericho"],
      unknown: ["tyre", "sidon", "shechem"],
    },
    { id: "jesus-born", group: "Jesus", text: "Was Jesus born there?", yes: ["bethlehem", "judea"] },
    { id: "jesus-grew-up", group: "Jesus", text: "Did Jesus grow up there?", yes: ["nazareth", "galilee"] },
    // Matthew 4:13, Mark 2:1.
    { id: "jesus-home", group: "Jesus", text: "Did Jesus make his home there during his ministry?", yes: ["capernaum", "galilee"] },
    {
      // Lazarus at Bethany, in Judea. Jairus's daughter: the town is not named (Capernaum is the
      // usual inference); Nain (Luke 7:11) lies in Galilee.
      id: "jesus-raised",
      group: "Jesus",
      text: "Did Jesus raise someone from the dead there?",
      yes: ["bethany", "judea"],
      unknown: ["capernaum", "galilee"],
    },
    {
      // He was baptised in the Jordan at "Bethany beyond the Jordan" (John 1:28), on the far bank
      // from Judea.
      id: "jesus-baptized",
      group: "Jesus",
      text: "Was Jesus baptized there?",
      yes: ["jordan-river"],
      unknown: ["judea"],
    },
    {
      // Nazareth: "he laid his hands on a few sick people and healed them" (Mark 6:5). The Mount of
      // Olives: the ear in the garden (Luke 22:39, 51). Samaria and Tyre: the lepers "between
      // Samaria and Galilee" (Luke 17:11) and the Syrophoenician woman's daughter, healed from a
      // distance in "the region of Tyre" (Mark 7:24-30).
      id: "jesus-miracle",
      group: "Jesus",
      text: "Do the Gospels record Jesus doing a miracle there?",
      yes: ["capernaum", "cana", "galilee", "sea-of-galilee", "bethany", "jericho", "jerusalem", "nazareth", "judea", "mount-of-olives"],
      unknown: ["samaria", "tyre"],
    },
    { id: "crucified", group: "Jesus", text: "Was Jesus crucified there?", yes: ["jerusalem", "judea"] },
    {
      // Acts 1:12 (the Mount of Olives); Luke 24:50 has him lead them "as far as Bethany", on its slope.
      id: "ascension",
      group: "Jesus",
      text: "Did Jesus ascend to heaven from there?",
      yes: ["mount-of-olives"],
      unknown: ["bethany"],
    },
    // ------------------------------------------------------------ Paul
    {
      // Colossians 2:1 says the Laodiceans had not seen his face.
      id: "paul-went",
      group: "Paul",
      text: "Do Acts or Paul's letters record Paul going there?",
      yes: ["jerusalem", "damascus", "antioch-syria", "tarsus", "cyprus", "philippi", "thessalonica", "athens", "corinth", "ephesus", "rome", "iconium", "lystra", "troas", "crete", "malta", "macedonia", "galatia", "tyre", "sidon", "judea", "samaria"],
    },
    { id: "paul-letter", group: "Paul", text: "Did Paul write a letter in the Bible to believers there?", yes: ["rome", "corinth", "galatia", "ephesus", "philippi", "thessalonica"] },
    { id: "seven-churches", group: "Paul", text: "Is it one of the seven churches of Revelation?", yes: ["ephesus", "smyrna", "laodicea"] },
    { id: "shipwreck", group: "Paul", text: "Was Paul shipwrecked there?", yes: ["malta"] },
    { id: "christians", group: "Paul", text: "Were the disciples first called Christians there?", yes: ["antioch-syria"] },
    { id: "paul-born", group: "Paul", text: "Was Paul born there?", yes: ["tarsus"] },
    { id: "paul-stoned", group: "Paul", text: "Was Paul stoned there?", yes: ["lystra"] },
    // Acts 16:8-9.
    { id: "macedonian-call", group: "Paul", text: "Did Paul see the vision of the man of Macedonia there?", yes: ["troas"] },
    {
      // Philippi (Acts 16:23). Paul was held in the barracks at Jerusalem, two years in custody at
      // Caesarea in Judea, and under guard in a rented house at Rome — custody, but not "prison".
      id: "paul-prison",
      group: "Paul",
      text: "Does Acts record Paul being thrown into prison there?",
      yes: ["philippi"],
      unknown: ["jerusalem", "judea", "rome"],
    },
    // Acts 18:1-3.
    { id: "tentmaking", group: "Paul", text: "Did Paul make tents there with Aquila and Priscilla?", yes: ["corinth"] },
    { id: "patmos", group: "Paul", text: "Was John on that island when he received the Revelation?", yes: ["patmos"] },
    // ------------------------------------------------------------ Old Testament story
    {
      // Genesis 11:31-12:9, 13:18, 21:31-33. Near misses the text leaves open: Bethel (he camped
      // "between Bethel and Ai", 12:8, 13:3), Damascus (14:15), Sodom (18:16), and Salem, often
      // taken to be Jerusalem (14:18).
      id: "abraham",
      group: "Old Testament story",
      text: "Does Genesis record Abraham going there?",
      yes: ["ur", "haran", "egypt", "shechem", "hebron", "beersheba"],
      unknown: ["bethel", "damascus", "sodom", "jerusalem"],
    },
    { id: "moses", group: "Old Testament story", text: "Did Moses go there?", yes: ["egypt", "red-sea", "mount-sinai", "mount-nebo", "moab"] },
    {
      // Carmel (1 Kings 18), Horeb — Sinai (19:8), Beersheba (19:3), Samaria (18:2), the Jordan,
      // Jericho and Bethel (2 Kings 2), Damascus (8:7). Zarephath "belongs to Sidon" (1 Kings 17:9).
      id: "elijah-elisha",
      group: "Old Testament story",
      text: "Did Elijah or Elisha go there?",
      yes: ["mount-carmel", "mount-sinai", "beersheba", "samaria", "jordan-river", "jericho", "bethel", "damascus"],
      unknown: ["sidon"],
    },
    { id: "jonah", group: "Old Testament story", text: "Is it in the story of Jonah?", yes: ["nineveh", "joppa"] },
    { id: "jacobs-dream", group: "Old Testament story", text: "Is it where Jacob dreamed of the stairway to heaven?", yes: ["bethel"] },
    // 1 Kings 5:1.
    { id: "hiram", group: "Old Testament story", text: "Was Hiram, who helped Solomon build the temple, its king?", yes: ["tyre"] },
    // Ruth 1:7 — "the land of Judah".
    { id: "ruth", group: "Old Testament story", text: "Is it in the book of Ruth?", yes: ["bethlehem", "moab", "judea"] },
    { id: "fire-from-heaven", group: "Old Testament story", text: "Was it destroyed by fire from heaven?", yes: ["sodom"] },
    { id: "walls-fell", group: "Old Testament story", text: "Did its walls fall down at a shout?", yes: ["jericho"] },
    { id: "saul-died", group: "Old Testament story", text: "Did King Saul die there?", yes: ["mount-gilboa"] },
  ],
};

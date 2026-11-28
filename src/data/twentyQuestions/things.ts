import type { TQSet } from "./types";

/* 20 Questions — Things: objects, animals, plants, foods and structures that Scripture clearly
 * identifies. Same reading rules as people.ts: YES and UNKNOWN ("Not stated") are listed, everyone
 * else is NO.
 *
 * Each reveal verse is checked by scripts/games-data/twenty-questions.mjs to contain the thing's
 * keyword in the WEB, the KJV and the ASV. Where the app has an article on the thing itself, or on
 * the person or place its story belongs to, the reveal links it; where it has none, there is no
 * link rather than a loosely related one.
 */

const P = (id: string, label: string) => ({ kind: "person" as const, id, label });
const L = (id: string, label: string) => ({ kind: "place" as const, id, label });
const T = (id: string, label: string) => ({ kind: "topic" as const, id, label });

export const THINGS: TQSet = {
  category: "things",
  label: "Things",
  noun: "thing",
  entries: [
    { id: "noahs-ark", name: "Noah's ark", ref: "Genesis 6:14", keywords: ["gopher"], article: P("noah", "Noah") },
    { id: "ark-of-covenant", name: "The ark of the covenant", ref: "Exodus 25:10", keywords: ["ark"], article: T("holy-of-holies", "the Holy of Holies") },
    { id: "manna", name: "Manna", ref: "Exodus 16:31", keywords: ["Manna"], article: P("moses", "Moses") },
    { id: "burning-bush", name: "The burning bush", ref: "Exodus 3:2", keywords: ["bush"], article: P("moses", "Moses") },
    { id: "bronze-serpent", name: "The bronze serpent", ref: "Numbers 21:9", keywords: ["serpent"], article: P("moses", "Moses") },
    { id: "golden-calf", name: "The golden calf", ref: "Exodus 32:4", keywords: ["calf"], article: P("aaron", "Aaron") },
    { id: "stone-tablets", name: "The stone tablets of the Law", ref: "Exodus 31:18", keywords: ["tablets", "tables"], article: P("moses", "Moses") },
    { id: "aarons-rod", name: "Aaron's rod that budded", ref: "Numbers 17:8", keywords: ["rod"], article: P("aaron", "Aaron") },
    { id: "goliaths-sword", name: "Goliath's sword", ref: "1 Samuel 21:9", keywords: ["Goliath"], article: P("david", "David") },
    { id: "davids-sling", name: "David's sling", ref: "1 Samuel 17:50", keywords: ["sling"], article: P("david", "David") },
    { id: "jacobs-ladder", name: "Jacob's ladder (the stairway in his dream)", ref: "Genesis 28:12", keywords: ["stairway", "ladder"], article: P("jacob", "Jacob") },
    { id: "josephs-coat", name: "Joseph's coat of many colors", ref: "Genesis 37:3", keywords: ["colors", "colours"], article: P("joseph-son-of-jacob", "Joseph") },
    { id: "samsons-jawbone", name: "Samson's donkey jawbone", ref: "Judges 15:15", keywords: ["jawbone"], article: P("samson", "Samson") },
    { id: "gideons-fleece", name: "Gideon's fleece", ref: "Judges 6:37", keywords: ["fleece"], article: P("gideon", "Gideon") },
    { id: "tower-of-babel", name: "The tower of Babel", ref: "Genesis 11:4", keywords: ["tower"], article: L("babylon", "Babylon (Babel)") },
    { id: "solomons-temple", name: "Solomon's temple", ref: "1 Kings 6:1", keywords: ["build"], article: T("the-temple", "the Temple") },
    { id: "tabernacle", name: "The tabernacle", ref: "Exodus 40:34", keywords: ["tabernacle"], article: T("tabernacle", "the Tabernacle") },
    { id: "lampstand", name: "The golden lampstand", ref: "Exodus 25:31", keywords: ["lampstand", "lamp stand", "candlestick"], article: T("tabernacle", "the Tabernacle") },
    { id: "rainbow", name: "The rainbow after the Flood", ref: "Genesis 9:13", keywords: ["rainbow", "bow"], article: P("noah", "Noah") },
    { id: "tree-of-knowledge", name: "The tree of the knowledge of good and evil", ref: "Genesis 2:17", keywords: ["knowledge"], article: L("eden", "Eden") },
    { id: "tree-of-life", name: "The tree of life", ref: "Genesis 2:9", keywords: ["life"], article: L("eden", "Eden") },
    { id: "crown-of-thorns", name: "The crown of thorns", ref: "John 19:2", keywords: ["thorns"] },
    { id: "thirty-silver", name: "The thirty pieces of silver", ref: "Matthew 26:15", keywords: ["thirty"], article: P("judas-iscariot", "Judas Iscariot") },
    { id: "loaves-and-fish", name: "The five loaves and two fish", ref: "Matthew 14:17", keywords: ["loaves"] },
    { id: "great-fish", name: "Jonah's great fish", ref: "Jonah 1:17", keywords: ["fish"], article: P("jonah", "Jonah") },
    { id: "balaams-donkey", name: "Balaam's donkey", ref: "Numbers 22:28", keywords: ["donkey", "ass"], article: P("balaam", "Balaam") },
    { id: "lions-den", name: "The lions' den", ref: "Daniel 6:16", keywords: ["lions"], article: P("daniel", "Daniel") },
    { id: "fiery-furnace", name: "The fiery furnace", ref: "Daniel 3:23", keywords: ["furnace"] },
    { id: "chariot-of-fire", name: "The chariot of fire", ref: "2 Kings 2:11", keywords: ["chariot"], article: P("elijah", "Elijah") },
    { id: "ravens", name: "The ravens that fed Elijah", ref: "1 Kings 17:6", keywords: ["ravens"], article: P("elijah", "Elijah") },
    { id: "noahs-dove", name: "Noah's dove", ref: "Genesis 8:11", keywords: ["dove"], article: P("noah", "Noah") },
    { id: "mustard-seed", name: "The mustard seed", ref: "Matthew 13:31", keywords: ["mustard"] },
    { id: "fig-tree", name: "The fig tree Jesus cursed", ref: "Mark 11:21", keywords: ["fig"] },
    { id: "pearl", name: "The pearl of great price", ref: "Matthew 13:46", keywords: ["pearl"] },
    { id: "widows-coins", name: "The widow's two coins", ref: "Mark 12:42", keywords: ["coins", "mites"] },
    { id: "alabaster-jar", name: "The alabaster jar of perfume", ref: "Mark 14:3", keywords: ["alabaster"] },
    { id: "temple-curtain", name: "The temple curtain torn in two", ref: "Matthew 27:51", keywords: ["veil", "curtain"], article: T("holy-of-holies", "the Holy of Holies") },
    { id: "walls-of-jericho", name: "The walls of Jericho", ref: "Joshua 6:20", keywords: ["wall"], article: L("jericho", "Jericho") },
    { id: "pillar-of-salt", name: "The pillar of salt", ref: "Genesis 19:26", keywords: ["salt"], article: L("sodom", "Sodom") },
    { id: "passover-lamb", name: "The Passover lamb", ref: "Exodus 12:21", keywords: ["Passover"], article: T("passover", "Passover") },
    { id: "pillar-of-cloud", name: "The pillar of cloud and fire", ref: "Exodus 13:21", keywords: ["pillar"], article: P("moses", "Moses") },
    { id: "seamless-tunic", name: "Jesus' seamless tunic", ref: "John 19:23", keywords: ["seam"] },
    { id: "plague-locusts", name: "The plague of locusts", ref: "Exodus 10:14", keywords: ["locusts"], article: P("moses", "Moses") },
    { id: "plague-frogs", name: "The plague of frogs", ref: "Exodus 8:6", keywords: ["frogs"], article: P("moses", "Moses") },
    { id: "ram-in-thicket", name: "The ram caught in the thicket", ref: "Genesis 22:13", keywords: ["ram"], article: P("abraham", "Abraham") },
    { id: "axe-head", name: "The axe head that floated", ref: "2 Kings 6:6", keywords: ["iron"], article: P("elisha", "Elisha") },
    { id: "magi-gifts", name: "Gold, frankincense and myrrh", ref: "Matthew 2:11", keywords: ["frankincense"], article: P("magi", "the Magi") },
    { id: "manger", name: "The manger", ref: "Luke 2:7", keywords: ["trough", "manger"] },
    { id: "esaus-stew", name: "The stew Esau sold his birthright for", ref: "Genesis 25:34", keywords: ["stew", "pottage"], article: P("esau", "Esau") },
    { id: "john-food", name: "Locusts and wild honey", ref: "Matthew 3:4", keywords: ["honey"], article: P("john-the-baptist", "John the Baptist") },
    { id: "serpent-eden", name: "The serpent in Eden", ref: "Genesis 3:1", keywords: ["serpent"], article: L("eden", "Eden") },
    { id: "coin-in-fish", name: "The coin in the fish's mouth", ref: "Matthew 17:27", keywords: ["fish"], article: P("simon-peter", "Simon Peter") },
    { id: "water-into-wine", name: "The water turned into wine", ref: "John 2:9", keywords: ["wine"], article: L("cana", "Cana") },
    { id: "josephs-cup", name: "Joseph's silver cup", ref: "Genesis 44:2", keywords: ["cup"], article: P("joseph-son-of-jacob", "Joseph") },
  ],
  groups: ["What it is", "Made of", "Bible", "Story"],
  questions: [
    // ------------------------------------------------------------ What it is
    {
      // Aaron's rod was a cut staff that sprouted, blossomed and bore almonds (Numbers 17:8).
      id: "alive",
      group: "What it is",
      text: "Is it a living animal or plant?",
      yes: ["burning-bush", "tree-of-knowledge", "tree-of-life", "great-fish", "balaams-donkey", "ravens", "noahs-dove", "mustard-seed", "fig-tree", "passover-lamb", "plague-locusts", "plague-frogs", "ram-in-thicket", "serpent-eden"],
      unknown: ["aarons-rod"],
    },
    {
      // John the Baptist's food is locusts, but as food. The lions' den is the pit, not the lions.
      id: "animal",
      group: "What it is",
      text: "Is it an animal?",
      yes: ["great-fish", "balaams-donkey", "ravens", "noahs-dove", "passover-lamb", "plague-locusts", "plague-frogs", "ram-in-thicket", "serpent-eden"],
      unknown: ["john-food"],
    },
    { id: "plant", group: "What it is", text: "Is it a plant, a tree or a seed?", yes: ["burning-bush", "tree-of-knowledge", "tree-of-life", "mustard-seed", "fig-tree"], unknown: ["aarons-rod"] },
    {
      // Genesis 3:6 — its fruit. Israel was made to drink the ground-up golden calf (Exodus 32:20),
      // which is true but not what the question means — UNKNOWN. The tree of life is promised to
      // be eaten from (Revelation 2:7) but no one eats from it in the story.
      id: "food",
      group: "What it is",
      text: "Is it something people ate or drank?",
      yes: ["manna", "loaves-and-fish", "passover-lamb", "esaus-stew", "john-food", "water-into-wine", "tree-of-knowledge"],
      unknown: ["golden-calf", "tree-of-life"],
    },
    { id: "worn", group: "What it is", text: "Is it something worn?", yes: ["josephs-coat", "seamless-tunic", "crown-of-thorns"] },
    { id: "drink", group: "What it is", text: "Is it a drink?", yes: ["water-into-wine"], unknown: ["golden-calf"] },
    {
      // Elijah's chariot parted him from Elisha and he "went up by a whirlwind" (2 Kings 2:11) —
      // whether the chariot itself flew is not said.
      id: "flies",
      group: "What it is",
      text: "Can it fly?",
      yes: ["ravens", "noahs-dove", "plague-locusts"],
      unknown: ["chariot-of-fire"],
    },
    { id: "weapon", group: "What it is", text: "Is it a weapon?", yes: ["goliaths-sword", "davids-sling", "samsons-jawbone"] },
    {
      id: "structure",
      group: "What it is",
      text: "Is it a building, a wall, a tower or another built structure?",
      yes: ["tower-of-babel", "solomons-temple", "tabernacle", "walls-of-jericho", "fiery-furnace"],
      unknown: ["lions-den"],
    },
    // The axe head floated too (2 Kings 6:6).
    { id: "floats", group: "What it is", text: "Did it float on water?", yes: ["noahs-ark", "axe-head"] },
    { id: "container", group: "What it is", text: "Is it a container — a box, a jar or a cup?", yes: ["ark-of-covenant", "alabaster-jar", "josephs-cup"], unknown: ["manger"] },
    { id: "fire", group: "What it is", text: "Does it give off fire or light?", yes: ["burning-bush", "lampstand", "pillar-of-cloud", "chariot-of-fire", "fiery-furnace"] },
    // ------------------------------------------------------------ Made of
    {
      // UNKNOWN where people made one part and God another: the first tablets were "the work of God"
      // (Exodus 32:16) and the second were cut by Moses (34:1); the rod was cut, its budding was not;
      // the loaves were baked and the fish caught, then multiplied. The wine was made by Jesus.
      id: "made",
      group: "Made of",
      text: "Was it made by people?",
      yes: ["noahs-ark", "ark-of-covenant", "golden-calf", "bronze-serpent", "tabernacle", "lampstand", "solomons-temple", "tower-of-babel", "walls-of-jericho", "goliaths-sword", "davids-sling", "josephs-coat", "seamless-tunic", "crown-of-thorns", "alabaster-jar", "widows-coins", "coin-in-fish", "thirty-silver", "temple-curtain", "fiery-furnace", "manger", "esaus-stew", "axe-head", "josephs-cup"],
      unknown: ["stone-tablets", "aarons-rod", "loaves-and-fish", "magi-gifts", "lions-den", "water-into-wine"],
    },
    {
      // Overlaid counts: the ark (Exodus 25:11), the tabernacle's boards (26:29), the temple (1 Kings
      // 6:22). The magi's gifts include gold. A fiery furnace's material is not described.
      id: "metal",
      group: "Made of",
      text: "Is it made of, or covered with, metal?",
      yes: ["ark-of-covenant", "golden-calf", "bronze-serpent", "lampstand", "solomons-temple", "tabernacle", "goliaths-sword", "thirty-silver", "widows-coins", "coin-in-fish", "axe-head", "josephs-cup", "magi-gifts"],
      unknown: ["fiery-furnace"],
    },
    {
      // Gopher wood (Genesis 6:14), acacia (Exodus 25:10, 26:15), cedar (1 Kings 6:9), an almond rod;
      // the trees themselves. A manger, the walls of Jericho and a thorn crown are not described.
      id: "wood",
      group: "Made of",
      text: "Is it made of wood?",
      yes: ["noahs-ark", "ark-of-covenant", "tabernacle", "solomons-temple", "aarons-rod", "tree-of-knowledge", "tree-of-life", "fig-tree"],
      unknown: ["manger", "walls-of-jericho", "crown-of-thorns", "burning-bush", "jacobs-ladder"],
    },
    {
      // Babel was built of brick "for stone" (Genesis 11:3).
      id: "stone",
      group: "Made of",
      text: "Is it made of stone?",
      yes: ["stone-tablets", "solomons-temple", "alabaster-jar"],
      unknown: ["walls-of-jericho", "lions-den", "manger", "fiery-furnace"],
    },
    // ------------------------------------------------------------ Bible
    {
      id: "ot-first",
      group: "Bible",
      text: "Does it first appear in the Old Testament?",
      yes: ["noahs-ark", "ark-of-covenant", "manna", "burning-bush", "bronze-serpent", "golden-calf", "stone-tablets", "aarons-rod", "goliaths-sword", "davids-sling", "jacobs-ladder", "josephs-coat", "samsons-jawbone", "gideons-fleece", "tower-of-babel", "solomons-temple", "tabernacle", "lampstand", "rainbow", "tree-of-knowledge", "tree-of-life", "great-fish", "balaams-donkey", "lions-den", "fiery-furnace", "chariot-of-fire", "ravens", "noahs-dove", "walls-of-jericho", "pillar-of-salt", "passover-lamb", "pillar-of-cloud", "plague-locusts", "plague-frogs", "ram-in-thicket", "axe-head", "esaus-stew", "serpent-eden", "josephs-cup"],
    },
    {
      // Old Testament things the New Testament names: the ark (Matthew 24:38), the ark of the
      // covenant, manna, Aaron's rod and the tablets (Hebrews 9:4), the burning bush (Mark 12:26),
      // the bronze serpent (John 3:14), the golden calf (Acts 7:41), the tabernacle and lampstand
      // (Hebrews 9:2), the tree of life (Revelation 2:7), Jonah's fish (Matthew 12:40), Balaam's
      // donkey (2 Peter 2:16), Jericho's walls (Hebrews 11:30), the Passover (1 Corinthians 5:7), the
      // cloud (1 Corinthians 10:1), the serpent (2 Corinthians 11:3), Esau's meal (Hebrews 12:16),
      // Solomon's house for God (Acts 7:47). UNKNOWN for echoes that do not name the thing itself:
      // a rainbow in Revelation 4:3, Lot's wife without the pillar (Luke 17:32), lions and fire
      // without the den or furnace (Hebrews 11:33-34), angels ascending and descending (John 1:51).
      id: "in-nt",
      group: "Bible",
      text: "Is it mentioned in the New Testament?",
      yes: ["noahs-ark", "ark-of-covenant", "manna", "burning-bush", "bronze-serpent", "golden-calf", "stone-tablets", "aarons-rod", "tabernacle", "lampstand", "tree-of-life", "great-fish", "balaams-donkey", "walls-of-jericho", "passover-lamb", "pillar-of-cloud", "serpent-eden", "esaus-stew", "solomons-temple", "crown-of-thorns", "thirty-silver", "loaves-and-fish", "mustard-seed", "fig-tree", "pearl", "widows-coins", "alabaster-jar", "temple-curtain", "seamless-tunic", "magi-gifts", "manger", "john-food", "coin-in-fish", "water-into-wine"],
      unknown: ["rainbow", "pillar-of-salt", "lions-den", "fiery-furnace", "jacobs-ladder"],
    },
    { id: "genesis", group: "Bible", text: "Is it in the book of Genesis?", yes: ["noahs-ark", "jacobs-ladder", "josephs-coat", "tower-of-babel", "rainbow", "tree-of-knowledge", "tree-of-life", "noahs-dove", "pillar-of-salt", "ram-in-thicket", "esaus-stew", "serpent-eden", "josephs-cup"] },
    { id: "judges", group: "Bible", text: "Is it in the book of Judges?", yes: ["samsons-jawbone", "gideons-fleece"] },
    {
      // The jar of manna (Exodus 16:33-34) and Aaron's rod (Numbers 17:10) were kept before the
      // testimony; the tablets in the ark (Deuteronomy 10:5). Goliath's sword was kept "behind the
      // ephod" at Nob (1 Samuel 21:9); the widow's coins went into the temple treasury.
      id: "sanctuary",
      group: "Bible",
      text: "Was it kept in, or part of, the tabernacle or the temple?",
      yes: ["ark-of-covenant", "lampstand", "stone-tablets", "aarons-rod", "manna", "temple-curtain", "tabernacle", "solomons-temple"],
      unknown: ["goliaths-sword", "widows-coins", "bronze-serpent", "thirty-silver"],
    },
    // ------------------------------------------------------------ Story
    { id: "eden", group: "Story", text: "Was it in the Garden of Eden?", yes: ["tree-of-knowledge", "tree-of-life", "serpent-eden"] },
    { id: "noah", group: "Story", text: "Is it in the story of Noah?", yes: ["noahs-ark", "rainbow", "noahs-dove"] },
    {
      // Lot's wife was Abraham's nephew's wife; Genesis 19 is Lot's story more than Abraham's.
      id: "patriarchs",
      group: "Story",
      text: "Is it in the story of Abraham, Isaac, Jacob or Joseph?",
      yes: ["jacobs-ladder", "josephs-coat", "ram-in-thicket", "esaus-stew", "josephs-cup"],
      unknown: ["pillar-of-salt"],
    },
    { id: "moses", group: "Story", text: "Is it in the story of Moses?", yes: ["manna", "burning-bush", "bronze-serpent", "golden-calf", "stone-tablets", "aarons-rod", "tabernacle", "lampstand", "passover-lamb", "pillar-of-cloud", "plague-locusts", "plague-frogs", "ark-of-covenant"] },
    { id: "plague", group: "Story", text: "Is it one of the plagues of Egypt?", yes: ["plague-locusts", "plague-frogs"] },
    // David brought the ark to Jerusalem (2 Samuel 6).
    { id: "david-solomon", group: "Story", text: "Is it in the story of King David or King Solomon?", yes: ["goliaths-sword", "davids-sling", "solomons-temple", "ark-of-covenant"] },
    { id: "prophets", group: "Story", text: "Is it in the story of Elijah, Elisha or Jonah, or the book of Daniel?", yes: ["chariot-of-fire", "ravens", "axe-head", "great-fish", "lions-den", "fiery-furnace"] },
    { id: "jesus-birth", group: "Story", text: "Is it part of the story of Jesus' birth?", yes: ["magi-gifts", "manger"] },
    // John 19:23-24.
    { id: "lots", group: "Story", text: "Did soldiers cast lots for it?", yes: ["seamless-tunic"] },
    { id: "dream", group: "Story", text: "Was it seen in a dream?", yes: ["jacobs-ladder"] },
    {
      // The anointing at Bethany was "for my burial" (Mark 14:8).
      id: "jesus-death",
      group: "Story",
      text: "Is it part of the story of Jesus' death?",
      yes: ["crown-of-thorns", "thirty-silver", "temple-curtain", "seamless-tunic", "alabaster-jar"],
    },
    { id: "jesus-miracle", group: "Story", text: "Is it part of one of Jesus' miracles?", yes: ["loaves-and-fish", "water-into-wine", "coin-in-fish", "fig-tree"] },
    { id: "parable", group: "Story", text: "Is it in one of Jesus' parables?", yes: ["mustard-seed", "pearl"] },
    {
      // The waters stopped when the ark entered the Jordan (Joshua 3:15-16). UNKNOWN where the text
      // does not say whether the thing itself was the means: the tablets, the jawbone, the torn
      // curtain, the pillar of salt, the rainbow, Babel, the tabernacle, the serpent, the ram.
      id: "miracle",
      group: "Story",
      text: "Does God work a miracle with it or through it?",
      yes: ["manna", "burning-bush", "bronze-serpent", "aarons-rod", "gideons-fleece", "chariot-of-fire", "ravens", "axe-head", "loaves-and-fish", "great-fish", "balaams-donkey", "lions-den", "fiery-furnace", "coin-in-fish", "water-into-wine", "fig-tree", "walls-of-jericho", "pillar-of-cloud", "plague-locusts", "plague-frogs", "ark-of-covenant"],
      unknown: ["stone-tablets", "samsons-jawbone", "temple-curtain", "pillar-of-salt", "rainbow", "tower-of-babel", "tabernacle", "serpent-eden", "ram-in-thicket"],
    },
  ],
};

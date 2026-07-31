import { CROSSWORD_LEVELS, type CrosswordLevel } from "./crosswordWords";

export interface SavingPeterWord {
  /** Letters only, uppercase. */
  word: string;
  clue: string;
}

// Reused as-is (see CrosswordView's level picker) — "the same levels of difficulty as the Crossword"
// means literally these five tiers, not a look-alike set defined twice.
export { CROSSWORD_LEVELS as SAVING_PETER_LEVELS };
export type { CrosswordLevel as SavingPeterLevel };

/** One word bank per difficulty tier — same {word, clue} shape as the flat bank this replaced, just
 * split five ways instead of pooled into one list. */
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
    { word: "TRANSFIGURATION", clue: "When Jesus's appearance changed on a mountain before three disciples" },
  ],
};

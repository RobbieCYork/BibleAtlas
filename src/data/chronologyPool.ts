/* ============================================================================
 * chronologyPool — the hand-graded deck behind the Chronology game.
 *
 * Every card the game can deal is listed here, by timeline event id, with a fame grade. Nothing
 * reaches the game by being added to timelineEvents.ts alone: an event has to be read and graded
 * first, because "is this fair to order?" is an editorial question no date field answers.
 *
 * FAME (how well known the event is — one of the two difficulty dials):
 *   1  Sunday-school famous. A 12-year-old who has been to church knows the story (Noah, Moses,
 *      David and Goliath, the Last Supper), or — for church and world history — it is taught in an
 *      ordinary school (the Pilgrims, Julius Caesar). Plain short title, always.
 *   2  Known to a regular Bible reader or a history-literate adult.
 *   3  A deeper cut: you would need to have studied it.
 *
 * The other dial, how close together the cards in a round are, is worked out in
 * chronologyRounds.ts from two things declared here:
 *
 *   - STORY eras (`CHRONOLOGY_STORY`): the Bible's own narrative, Creation to Paul in Rome, cut
 *     into chapters. Events inside the story are ordered by Scripture's own sequence, not by the
 *     app's years — so a round can hold the Last Supper and the Resurrection (same year, order
 *     certain) and the round never depends on whether the Exodus was in 1446 or 1260 BC. How far
 *     apart two story events are is how many chapters apart they are.
 *   - HISTORY entries (`CHRONOLOGY_HISTORY`): everything outside the narrative (the world, the
 *     church after the apostles, the years between the Testaments). These are ordered by year
 *     only, with a margin: two approximate dates are never dealt together unless they are well
 *     apart, so no round is ever decided by a "c." date.
 *
 * TIES: events listed in the same `ties` group are never dealt into the same round, because their
 * relative order is genuinely uncertain (overlapping judges, the Gospels' teaching ministry, Ezra
 * and Nehemiah, a disputed date). Anything with the same start year is also never paired unless
 * both sit in one story chapter, where the list order is Scripture's order.
 *
 * Left out on purpose (not dealt at any level): long spans whose start year misleads (a 400-year
 * dynasty, a 40-year reign), dates the record itself calls highly disputed or legendary, prophets
 * whose dating is only a scholarly estimate, near-duplicate records (the world copy of an event
 * the story already has, where it adds nothing), and a few records that do not belong in a game
 * deck. scripts/chronology-validate checks every rule above at build time.
 * ========================================================================== */

export type ChronologyCategory = "all" | "ot" | "nt" | "jesus" | "church" | "world";

export interface ChronologyCategoryDef {
  key: ChronologyCategory;
  label: string;
  description: string;
}

export const CHRONOLOGY_CATEGORIES: ChronologyCategoryDef[] = [
  { key: "all", label: "Everything", description: "The whole timeline mixed together: the Bible, the church and the world." },
  { key: "ot", label: "Old Testament", description: "From Creation to Nehemiah rebuilding the walls of Jerusalem." },
  { key: "nt", label: "New Testament", description: "Jesus and the apostles, from Bethlehem to the end of the first century." },
  { key: "jesus", label: "Life of Jesus", description: "From his birth in Bethlehem to his ascension." },
  { key: "church", label: "Church History", description: "From Pentecost to the twentieth century." },
  { key: "world", label: "World History", description: "Empires, battles and turning points from the pyramids to 1989." },
];

export type Fame = 1 | 2 | 3;

export interface PoolEntry {
  /** A TimelineEvent id. */
  id: string;
  fame: Fame;
  /** The card's title when the record's own is long, technical, or gives the date away. */
  title?: string;
  /** Never dealt with anything sharing one of these groups (see TIES above). */
  ties?: string[];
}

export interface StoryEra {
  label: string;
  /** Player categories this chapter's events belong to ("all" is implied). */
  cats: ChronologyCategory[];
  /** Before the monarchy the app's years follow one chronology among several evangelicals hold
   * (young-earth genealogies, the early Exodus). These chapters are never paired with a dated
   * non-biblical event before 1000 BC, so no round hinges on that chronology. */
  debatedDating?: boolean;
  /** In Scripture's order. */
  events: PoolEntry[];
}

export interface HistoryEntry extends PoolEntry {
  cats: ChronologyCategory[];
}

const OT: ChronologyCategory[] = ["ot"];
const JESUS: ChronologyCategory[] = ["nt", "jesus"];
const ACTS: ChronologyCategory[] = ["nt", "church"];

export const CHRONOLOGY_STORY: StoryEra[] = [
  /* ---------------------------------------------------------------- Old Testament */
  {
    label: "Creation and the Fall",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-prim-creation", fame: 1, title: "Creation" },
      { id: "bib-prim-fall", fame: 1, title: "Adam and Eve's Sin" },
    ],
  },
  {
    label: "Before the Flood",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-prim-cain-abel", fame: 1, title: "Cain and Abel" },
      { id: "bib-prim-enoch", fame: 3 },
      { id: "bib-prim-nephilim", fame: 3 },
    ],
  },
  {
    label: "Noah",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-prim-flood", fame: 1 },
      { id: "bib-prim-noahic-covenant", fame: 2, title: "God's Rainbow Covenant with Noah" },
    ],
  },
  {
    label: "Babel",
    cats: OT,
    debatedDating: true,
    events: [{ id: "bib-prim-tower-of-babel", fame: 2 }],
  },
  {
    label: "Abraham",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-pat-call-of-abram", fame: 1, title: "God Calls Abraham" },
      { id: "bib-pat-abram-rescues-lot", fame: 3, title: "Abram Rescues Lot; Melchizedek Blesses Him" },
      { id: "bib-pat-abrahamic-covenant", fame: 2, title: "God's Covenant with Abram" },
      { id: "bib-pat-hagar-ishmael", fame: 2 },
      { id: "bib-pat-covenant-circumcision", fame: 3, title: "Abram and Sarai Renamed" },
      { id: "bib-pat-sodom-gomorrah", fame: 2 },
    ],
  },
  {
    label: "Isaac",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-pat-birth-isaac", fame: 1 },
      { id: "bib-pat-binding-isaac", fame: 2, title: "Abraham Offers Isaac" },
      { id: "bib-pat-death-sarah", fame: 3, title: "The Death of Sarah" },
      { id: "bib-pat-isaac-rebekah", fame: 2 },
    ],
  },
  {
    label: "Jacob",
    cats: OT,
    debatedDating: true,
    events: [
      // Genesis tells Abraham's death (25:7-11) before the twins' birth (25:19-26), but by the ages
      // it gives he died after it; never deal those two, or the birthright, together.
      { id: "bib-pat-birth-jacob-esau", fame: 2, ties: ["abraham-death"] },
      { id: "bib-pat-death-abraham", fame: 3, ties: ["abraham-death"] },
      { id: "bib-pat-esau-birthright", fame: 2, ties: ["abraham-death"] },
      { id: "bib-pat-jacob-flees-bethel", fame: 2, title: "Jacob Takes Esau's Blessing and Flees" },
      { id: "bib-pat-jacob-marriages-sons", fame: 3, title: "Jacob Marries Leah and Rachel" },
      { id: "bib-pat-jacob-peniel-esau", fame: 2, title: "Jacob Wrestles with God" },
    ],
  },
  {
    label: "Joseph",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-pat-joseph-slavery-prison", fame: 1, title: "Joseph Is Sold into Slavery" },
      { id: "bib-pat-joseph-rises-power", fame: 2 },
      { id: "bib-pat-joseph-reveals-brothers", fame: 2 },
      { id: "bib-pat-jacob-family-goshen", fame: 3 },
      { id: "bib-pat-death-jacob", fame: 3 },
      { id: "bib-pat-death-joseph", fame: 3 },
    ],
  },
  {
    label: "Moses in Egypt and Midian",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-exo-birth-of-moses", fame: 1, title: "Baby Moses in the Basket" },
      { id: "bib-exo-flight-to-midian", fame: 3 },
    ],
  },
  {
    label: "The Exodus",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-exo-burning-bush", fame: 1, title: "The Burning Bush" },
      // The tenth plague falls on Passover night and Israel leaves the next morning: the plagues,
      // the Passover and "the Exodus" are one night's story, and the Red Sea is part of leaving.
      { id: "bib-exo-ten-plagues", fame: 1, title: "The Ten Plagues", ties: ["passover-night"] },
      { id: "bib-exo-first-passover", fame: 1, ties: ["passover-night"] },
      { id: "bib-exo-the-exodus", fame: 2, ties: ["passover-night", "leaving-egypt"] },
      { id: "bib-exo-red-sea-crossing", fame: 1, title: "Crossing the Red Sea", ties: ["leaving-egypt"] },
      { id: "bib-exo-wilderness-provision-testing", fame: 2, title: "Manna from Heaven" },
      { id: "bib-exo-giving-of-the-law", fame: 1, title: "The Ten Commandments" },
      { id: "bib-exo-golden-calf", fame: 1, title: "The Golden Calf" },
      { id: "bib-exo-tabernacle-completed", fame: 3, title: "The Tabernacle Is Completed" },
    ],
  },
  {
    label: "The wilderness",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-exo-twelve-spies-kadesh", fame: 2, title: "The Twelve Spies" },
      { id: "bib-exo-korahs-rebellion", fame: 3 },
      { id: "bib-exo-death-of-aaron", fame: 3, title: "The Death of Aaron" },
      { id: "bib-exo-death-of-moses", fame: 2, title: "The Death of Moses" },
    ],
  },
  {
    label: "Joshua and the conquest",
    cats: OT,
    debatedDating: true,
    events: [
      { id: "bib-cj-jordan-crossing", fame: 2 },
      { id: "bib-cj-fall-of-jericho", fame: 1, title: "The Walls of Jericho Fall" },
      { id: "bib-cj-achan-ai", fame: 3, title: "Achan's Sin and the Battle of Ai" },
      { id: "bib-cj-gibeonite-treaty", fame: 3 },
      { id: "bib-cj-battle-of-gibeon", fame: 2, title: "The Sun Stands Still at Gibeon" },
      { id: "bib-cj-southern-campaign", fame: 3 },
      { id: "bib-cj-northern-campaign-hazor", fame: 3 },
      // Joshua 13-21 gathers the allotments, Caleb's portion and the cities of refuge without a
      // strict sequence between them.
      { id: "bib-cj-division-of-the-land", fame: 3, ties: ["allotment"] },
      { id: "bib-cj-caleb-hebron", fame: 3, ties: ["allotment"] },
      { id: "bib-cj-cities-of-refuge", fame: 3, ties: ["allotment"] },
    ],
  },
  {
    label: "The judges",
    cats: OT,
    debatedDating: true,
    // Many evangelical scholars read the judges as partly overlapping and regional, so only the
    // order the book itself fixes is used: Othniel, Ehud, Deborah, Gideon, Abimelech, Jephthah.
    // Samson and Jephthah may be contemporaries (Judges 10:7); Samuel was born in Eli's day, which
    // may overlap both; Ruth is set "when the judges ruled" (Ruth 1:1), with no fixed point. The
    // war against Benjamin (Judges 19-21) is told last but dated early, so it is left out.
    events: [
      { id: "bib-cj-shechem-covenant-renewal", fame: 3, title: "Joshua's Farewell at Shechem" },
      { id: "bib-cj-death-of-joshua", fame: 2 },
      { id: "bib-cj-othniel", fame: 3, title: "Othniel, the First Judge", ties: ["ruth"] },
      { id: "bib-cj-ehud-eglon", fame: 3, ties: ["ruth"] },
      { id: "bib-cj-deborah-barak-sisera", fame: 2, title: "Deborah and Barak", ties: ["ruth"] },
      { id: "bib-cj-gideon-midian", fame: 2, ties: ["ruth"] },
      { id: "bib-cj-abimelech", fame: 3, ties: ["ruth"] },
      { id: "bib-cj-jephthah", fame: 3, ties: ["ruth", "late-judges"] },
      { id: "bib-cj-samson", fame: 2, ties: ["ruth", "late-judges"] },
      { id: "bib-cj-ruth", fame: 2, ties: ["ruth"] },
      { id: "bib-um-samuel-birth-dedication", fame: 2, title: "Hannah Prays and Samuel Is Born", ties: ["ruth", "late-judges"] },
    ],
  },
  {
    label: "Samuel and Saul",
    cats: OT,
    events: [
      { id: "bib-um-israel-demands-king", fame: 2 },
      { id: "bib-um-saul-anointed-king", fame: 1, title: "Saul Becomes Israel's First King" },
      { id: "bib-um-saul-rejected-as-king", fame: 3, title: "God Rejects Saul as King" },
    ],
  },
  {
    label: "Young David",
    cats: OT,
    events: [
      { id: "bib-um-david-anointed-bethlehem", fame: 2, title: "Samuel Anoints the Boy David" },
      { id: "bib-um-david-and-goliath", fame: 1 },
      { id: "bib-um-david-fugitive-years", fame: 3, title: "David on the Run from Saul" },
      { id: "bib-um-death-of-saul-jonathan", fame: 2, title: "The Death of Saul and Jonathan" },
    ],
  },
  {
    label: "King David",
    cats: OT,
    events: [
      { id: "bib-um-david-king-over-judah", fame: 3, title: "David Crowned King at Hebron" },
      { id: "bib-um-david-king-over-israel-jerusalem", fame: 1, title: "David Becomes King and Takes Jerusalem" },
      { id: "bib-um-ark-to-jerusalem", fame: 2, title: "David Brings the Ark to Jerusalem" },
      { id: "bib-um-davidic-covenant", fame: 3, title: "God's Covenant with David" },
      { id: "bib-um-david-bathsheba-uriah", fame: 2, title: "David and Bathsheba" },
      { id: "bib-um-absaloms-rebellion", fame: 2 },
      { id: "bib-um-solomon-succession", fame: 2, title: "David Dies; Solomon Becomes King" },
    ],
  },
  {
    label: "Solomon",
    cats: OT,
    events: [
      { id: "bib-um-solomons-wisdom-gibeon", fame: 1, title: "Solomon Asks God for Wisdom" },
      { id: "bib-um-temple-construction-begins", fame: 2, title: "Solomon Begins the Temple" },
      { id: "bib-um-temple-dedication", fame: 1, title: "Solomon Dedicates the Temple" },
      { id: "bib-um-queen-of-sheba-visit", fame: 2, title: "The Queen of Sheba Visits Solomon", ties: ["late-solomon"] },
      { id: "bib-um-solomons-apostasy", fame: 3, title: "Solomon Turns to Other Gods", ties: ["late-solomon"] },
    ],
  },
  {
    label: "The kingdom divides",
    cats: OT,
    events: [
      { id: "bib-um-division-of-kingdom", fame: 2, title: "The Kingdom Splits in Two" },
      { id: "bib-dki-jeroboam-golden-calves", fame: 3 },
      { id: "bib-dki-omri-founds-samaria", fame: 3 },
      { id: "bib-dki-ahab-jezebel-baal", fame: 2, title: "Ahab and Jezebel" },
    ],
  },
  {
    label: "Elijah and Elisha",
    cats: OT,
    events: [
      { id: "bib-dki-elijah-drought", fame: 3 },
      { id: "bib-dki-elijah-widow-zarephath", fame: 2 },
      { id: "bib-dki-elijah-mount-carmel", fame: 2, title: "Elijah and the Prophets of Baal" },
      { id: "bib-dki-elijah-still-small-voice", fame: 3 },
      { id: "bib-dki-elisha-called", fame: 3 },
      { id: "bib-dki-naboth-vineyard", fame: 3 },
      { id: "bib-dki-ahab-death-ramoth-gilead", fame: 3, title: "Ahab Dies in Battle" },
      { id: "bib-dki-elijah-ascension", fame: 2, title: "Elijah Taken Up in a Whirlwind" },
      // The Elisha stories in 2 Kings 4-8 are gathered, not strictly dated.
      { id: "bib-dki-naaman-healed", fame: 2, ties: ["elisha-stories"] },
      { id: "bib-dki-siege-samaria-elisha", fame: 3, ties: ["elisha-stories"] },
      { id: "bib-dki-jehu-purge", fame: 3, title: "Jehu Becomes King and Purges Ahab's House" },
    ],
  },
  {
    label: "Assyria's shadow",
    cats: OT,
    events: [
      // Jonah prophesied under Jeroboam II (2 Kings 14:25), Amos "two years before the earthquake"
      // (Amos 1:1); neither can be placed exactly against the other or against Isaiah's call.
      { id: "bib-dki-jonah-nineveh", fame: 2, title: "Jonah and the Great Fish", ties: ["8th-c-prophets", "jonah-late"] },
      { id: "bib-dkj-amos-ministry", fame: 3, ties: ["8th-c-prophets"] },
      { id: "bib-dkj-isaiah-call", fame: 2, title: "Isaiah's Vision of the Lord", ties: ["8th-c-prophets"] },
      { id: "bib-dkj-ahaz-immanuel", fame: 3, title: "Isaiah's Immanuel Prophecy to Ahaz", ties: ["jonah-late"] },
      // Hezekiah's accession is dated 729 or 716/715 BC by different evangelical chronologies, which
      // puts his reform on either side of Samaria's fall.
      { id: "bib-dki-fall-samaria-722", fame: 2, title: "Assyria Conquers Samaria", ties: ["hezekiah-accession"] },
      { id: "bib-dkj-hezekiah-reforms", fame: 3, ties: ["hezekiah-accession"] },
      { id: "bib-dkj-sennacherib-siege", fame: 2, title: "Sennacherib Besieges Jerusalem" },
    ],
  },
  {
    label: "Judah's last kings",
    cats: OT,
    events: [
      { id: "bib-dkj-jeremiah-call-fall", fame: 2, title: "God Calls Jeremiah" },
      { id: "bib-dkj-josiah-law-reforms", fame: 2, title: "Josiah Finds the Book of the Law" },
    ],
  },
  {
    label: "Exile in Babylon",
    cats: OT,
    events: [
      { id: "bib-er-daniel-taken-to-babylon", fame: 2 },
      // Daniel 3 carries no date in the Hebrew text, so it cannot be set against the fall of the city.
      { id: "bib-er-fiery-furnace", fame: 1, ties: ["furnace"] },
      { id: "bib-er-fall-of-jerusalem", fame: 2, title: "Babylon Destroys Jerusalem", ties: ["furnace"] },
    ],
  },
  {
    label: "The return",
    cats: OT,
    events: [
      { id: "bib-er-belshazzar-and-fall-of-babylon", fame: 2, title: "The Writing on the Wall" },
      // Which year of "Darius the Mede" Daniel 6 falls in is debated; it is after Belshazzar's
      // feast (Daniel 5:30-31), and that is all the round needs.
      { id: "bib-er-daniel-lions-den", fame: 1, ties: ["darius-mede"] },
      { id: "bib-er-cyrus-decree", fame: 3, title: "Cyrus Lets the Jews Go Home", ties: ["darius-mede"] },
      { id: "bib-er-zerubbabels-return", fame: 3, ties: ["darius-mede"] },
      { id: "bib-er-second-temple-completed", fame: 3 },
    ],
  },
  {
    label: "Esther",
    cats: OT,
    events: [
      { id: "bib-er-esther-becomes-queen", fame: 2 },
      { id: "bib-er-esther-and-purim", fame: 2, title: "Esther Saves Her People" },
    ],
  },
  {
    label: "Ezra and Nehemiah",
    cats: OT,
    // Some scholars place Ezra after Nehemiah (under Artaxerxes II); the two are never paired.
    events: [
      { id: "bib-er-ezras-return", fame: 3, ties: ["ezra-nehemiah"] },
      { id: "bib-er-nehemiahs-wall", fame: 2, ties: ["ezra-nehemiah"] },
    ],
  },

  /* ---------------------------------------------------------------- Life of Jesus */
  {
    label: "Jesus' birth",
    cats: JESUS,
    events: [
      { id: "bib-loc-birth-of-jesus", fame: 1, title: "Jesus Is Born in Bethlehem" },
      { id: "bib-loc-magi-flight-to-egypt", fame: 1, title: "The Wise Men Visit Jesus" },
    ],
  },
  {
    label: "Jesus' boyhood",
    cats: JESUS,
    events: [{ id: "bib-loc-jesus-in-temple-age-twelve", fame: 1, title: "The Boy Jesus in the Temple" }],
  },
  {
    label: "Jesus' baptism",
    cats: JESUS,
    events: [
      { id: "bib-loc-john-baptist-ministry-begins", fame: 3, title: "John the Baptist Begins Preaching" },
      { id: "bib-loc-baptism-of-jesus", fame: 1, title: "Jesus Is Baptized" },
      { id: "bib-loc-temptation-wilderness", fame: 2, title: "Jesus Is Tempted in the Wilderness" },
    ],
  },
  {
    label: "Jesus' first followers",
    cats: JESUS,
    events: [
      { id: "bib-loc-calling-first-disciples", fame: 2, title: "Jesus Calls His First Disciples", ties: ["first-followers"] },
      { id: "bib-loc-wedding-at-cana", fame: 2, title: "Water into Wine at Cana", ties: ["first-followers"] },
    ],
  },
  {
    label: "Jesus in Galilee",
    cats: JESUS,
    // The Gospels arrange the Galilean teaching and miracles differently, so these are never
    // ordered against each other, except the feeding of the five thousand and the walk on the
    // water that same night (Matthew 14, Mark 6, John 6). Two tie groups do that: the feeding is in
    // one, the walk in the other, the rest in both.
    events: [
      { id: "bib-loc-sermon-on-the-mount", fame: 1, ties: ["galilee", "galilee-b"] },
      { id: "bib-loc-parable-of-the-sower", fame: 2, ties: ["galilee", "galilee-b"] },
      { id: "bib-loc-calming-the-storm", fame: 1, title: "Jesus Calms the Storm", ties: ["galilee", "galilee-b"] },
      { id: "bib-loc-feeding-five-thousand", fame: 1, ties: ["galilee"] },
      { id: "bib-loc-jesus-walks-on-water", fame: 1, ties: ["galilee-b"] },
    ],
  },
  {
    label: "The road to Jerusalem",
    cats: JESUS,
    // Peter's confession comes before the Transfiguration in all three Synoptics. Luke's travel
    // section (9:51-19:27) is not plainly in time order, and John's Lazarus cannot be placed
    // inside it, so those three are never ordered against each other.
    events: [
      { id: "bib-loc-confession-caesarea-philippi", fame: 2, title: "Peter Says Jesus Is the Christ" },
      { id: "bib-loc-transfiguration", fame: 2 },
      { id: "bib-loc-parable-good-samaritan", fame: 2, title: "The Good Samaritan", ties: ["late-ministry"] },
      { id: "bib-loc-parable-prodigal-son", fame: 2, title: "The Prodigal Son", ties: ["late-ministry"] },
      { id: "bib-loc-raising-of-lazarus", fame: 2, title: "Jesus Raises Lazarus", ties: ["late-ministry"] },
    ],
  },
  {
    label: "Palm Sunday",
    cats: JESUS,
    events: [
      { id: "bib-loc-triumphal-entry", fame: 1, title: "Palm Sunday: Jesus Rides into Jerusalem" },
      { id: "bib-loc-temple-cleansing-passion-week", fame: 3, title: "Jesus Clears the Temple" },
      { id: "bib-loc-olivet-discourse", fame: 3 },
    ],
  },
  {
    label: "The Last Supper",
    cats: JESUS,
    events: [
      { id: "bib-loc-last-supper", fame: 1 },
      { id: "bib-loc-gethsemane-arrest", fame: 2, title: "Jesus Is Arrested in Gethsemane" },
      { id: "bib-loc-trials-of-jesus", fame: 3, title: "Jesus on Trial Before Pilate" },
    ],
  },
  {
    label: "The cross",
    cats: JESUS,
    events: [
      { id: "bib-loc-crucifixion", fame: 1, title: "Jesus Dies on the Cross" },
      { id: "bib-loc-burial-of-jesus", fame: 2 },
    ],
  },
  {
    label: "The empty tomb",
    cats: JESUS,
    events: [
      { id: "bib-loc-resurrection", fame: 1, title: "Jesus Rises from the Dead" },
      // The Great Commission is itself one of the appearances.
      { id: "bib-loc-post-resurrection-appearances", fame: 3, title: "The Risen Jesus Appears to His Followers", ties: ["appearances"] },
      { id: "bib-loc-great-commission", fame: 2, ties: ["appearances"] },
    ],
  },
  {
    label: "The ascension",
    cats: JESUS,
    events: [{ id: "bib-loc-ascension", fame: 1, title: "Jesus Ascends to Heaven" }],
  },

  /* ---------------------------------------------------------------- Acts */
  {
    label: "Pentecost",
    cats: ACTS,
    events: [
      { id: "bib-ac-pentecost", fame: 1, title: "Pentecost: The Holy Spirit Comes" },
      { id: "bib-ac-stephen-martyrdom", fame: 2, title: "Stephen Is Stoned" },
    ],
  },
  {
    label: "The gospel spreads",
    cats: ACTS,
    events: [
      // Acts 8 and 9 may be telling events of the same months.
      { id: "bib-ac-philip-ethiopian-eunuch", fame: 2, title: "Philip and the Ethiopian", ties: ["acts-8-9"] },
      { id: "bib-ac-paul-conversion", fame: 1, title: "Saul Meets Jesus on the Damascus Road", ties: ["acts-8-9"] },
      { id: "bib-ac-peter-cornelius", fame: 2, title: "Peter Visits Cornelius" },
      { id: "bib-ac-herod-agrippa-death", fame: 3 },
    ],
  },
  {
    label: "Paul's journeys",
    cats: ACTS,
    events: [
      { id: "bib-ac-paul-first-journey", fame: 2 },
      { id: "bib-ac-jerusalem-council", fame: 2 },
      { id: "bib-ac-paul-second-journey", fame: 2, ties: ["second-journey"] },
      { id: "bib-ac-gallio-inscription", fame: 3, ties: ["second-journey"] },
      { id: "bib-ac-paul-third-journey", fame: 2 },
    ],
  },
  {
    label: "Paul in chains",
    cats: ACTS,
    events: [
      { id: "bib-ac-paul-arrest-jerusalem", fame: 2 },
      { id: "bib-ac-paul-caesarea-imprisonment", fame: 3 },
      { id: "bib-ac-paul-voyage-rome", fame: 1, title: "Paul Is Shipwrecked on the Way to Rome" },
      { id: "bib-ac-paul-first-roman-imprisonment", fame: 3, title: "Paul Under Arrest in Rome" },
    ],
  },
];

const WORLD: ChronologyCategory[] = ["world"];
const CHURCH: ChronologyCategory[] = ["church"];
const BOTH: ChronologyCategory[] = ["church", "world"];
const LATE_NT: ChronologyCategory[] = ["nt", "church"];
/** Between the Testaments: only in Everything. */
const BETWEEN: ChronologyCategory[] = [];

/** Outside the narrative: ordered by year, with a margin for approximate dates. Order in this list
 * does not matter; it is kept by year for reading. */
export const CHRONOLOGY_HISTORY: HistoryEntry[] = [
  /* ---------------------------------------------------------------- the ancient world */
  { id: "wld-ane-great-pyramid-giza", fame: 1, cats: WORLD, title: "The Great Pyramid Is Built" },
  { id: "wld-ane-sargon-akkad", fame: 3, cats: WORLD, title: "Sargon of Akkad Builds an Empire" },
  { id: "wld-ane-code-of-hammurabi", fame: 2, cats: WORLD },
  { id: "wld-ane-ahmose-expels-hyksos", fame: 3, cats: WORLD, title: "Ahmose I Drives Out the Hyksos" },
  { id: "rel-ane-akhenaten-aten-reform", fame: 3, cats: WORLD, title: "Akhenaten Worships One Sun God" },
  { id: "wld-ane-hittite-egyptian-rivalry-kadesh", fame: 3, cats: WORLD },
  { id: "wld-ane-merneptah-stele", fame: 3, cats: WORLD, title: "The Merneptah Stele Names Israel" },
  { id: "wld-ane-hittite-empire-collapse", fame: 3, cats: WORLD, title: "The Bronze Age Collapse" },
  { id: "wld-fe-zhou-dynasty-begins", fame: 3, cats: WORLD, title: "The Zhou Dynasty Begins in China" },
  { id: "rel-east-confucius-birth", fame: 2, cats: WORLD },
  { id: "wld-pg-rise-of-cyrus", fame: 2, cats: WORLD, title: "Cyrus the Great Founds the Persian Empire" },
  { id: "wld-pg-fall-of-babylon", fame: 2, cats: WORLD },
  { id: "wld-pg-cambyses-egypt", fame: 3, cats: WORLD },
  { id: "wld-rom-founding-of-republic", fame: 3, cats: WORLD, title: "Rome Becomes a Republic" },
  { id: "wld-pg-ionian-revolt", fame: 3, cats: WORLD },
  { id: "wld-pg-battle-of-marathon", fame: 2, cats: WORLD },
  { id: "wld-pg-xerxes-becomes-king", fame: 3, cats: WORLD },
  { id: "wld-pg-xerxes-invades-greece", fame: 2, cats: WORLD, title: "The Battle of Thermopylae" },
  { id: "rel-east-confucius-death", fame: 3, cats: WORLD },
  { id: "wld-pg-peloponnesian-war", fame: 3, cats: WORLD, title: "The Peloponnesian War Begins" },
  { id: "wld-pg-philip-of-macedon", fame: 3, cats: WORLD, title: "Philip II Becomes King of Macedon" },
  { id: "wld-pg-alexander-becomes-king", fame: 1, cats: WORLD, title: "Alexander the Great Becomes King" },
  { id: "wld-pg-battle-of-issus", fame: 3, cats: WORLD },
  { id: "wld-pg-siege-of-tyre", fame: 3, cats: WORLD },
  { id: "wld-pg-alexander-in-egypt", fame: 3, cats: WORLD, title: "Alexander Founds Alexandria" },
  { id: "wld-pg-battle-of-gaugamela", fame: 3, cats: WORLD },
  { id: "wld-pg-death-of-alexander", fame: 2, cats: WORLD },
  { id: "wld-fe-qin-unification", fame: 2, cats: WORLD, title: "China's First Emperor Unites China" },
  { id: "wld-fe-han-dynasty-founded", fame: 3, cats: WORLD, title: "The Han Dynasty Is Founded" },
  { id: "wld-rom-caesar-crosses-rubicon", fame: 2, cats: WORLD },
  { id: "wld-rom-assassination-of-caesar", fame: 1, cats: WORLD, title: "Julius Caesar Is Assassinated" },
  { id: "wld-rom-battle-of-actium", fame: 3, cats: WORLD },
  { id: "wld-rom-augustus-becomes-emperor", fame: 2, cats: WORLD, title: "Augustus Becomes Rome's First Emperor" },

  /* ---------------------------------------------------------------- between the Testaments */
  { id: "bib-it-alexander-conquers-judea", fame: 2, cats: BETWEEN, title: "Alexander the Great Takes Judea" },
  { id: "bib-it-ptolemaic-rule-judea", fame: 3, cats: BETWEEN, title: "Egypt's Ptolemies Rule Judea" },
  { id: "bib-it-seleucid-rule-judea", fame: 3, cats: BETWEEN, title: "Syria's Seleucids Take Judea" },
  { id: "bib-it-antiochus-defiles-temple", fame: 2, cats: BETWEEN, title: "Antiochus IV Defiles the Temple" },
  { id: "bib-it-judas-maccabeus-campaigns", fame: 3, cats: BETWEEN, title: "Judas Maccabeus Leads the Revolt" },
  { id: "bib-it-temple-rededication-hanukkah", fame: 2, cats: BETWEEN, title: "The First Hanukkah" },
  { id: "bib-it-jonathan-maccabeus-high-priest", fame: 3, cats: BETWEEN, title: "Jonathan Maccabeus Becomes High Priest" },
  { id: "bib-it-hasmonean-dynasty-begins", fame: 3, cats: BETWEEN, title: "Simon Maccabeus Wins Independence" },
  { id: "bib-it-pompey-conquers-jerusalem", fame: 2, cats: BETWEEN, title: "Pompey Takes Jerusalem for Rome" },
  { id: "bib-it-herod-the-great-rise", fame: 2, cats: BETWEEN, title: "Herod the Great Takes the Throne" },

  /* ---------------------------------------------------------------- Rome and the first century */
  { id: "wld-rom-tiberius-emperor", fame: 3, cats: WORLD, title: "Tiberius Becomes Emperor" },
  { id: "wld-rom-claudius-emperor", fame: 3, cats: WORLD, title: "Claudius Becomes Emperor" },
  { id: "wld-rom-nero-emperor", fame: 3, cats: WORLD },
  // The fire, Nero's persecution and the deaths of Peter and Paul are told by tradition, not dated
  // against each other. John's exile on Patmos is c. AD 95 here, but some evangelicals date
  // Revelation before AD 70, so it is never set against the Neronian or Jewish-war events.
  { id: "bib-ac-nero-fire-persecution", fame: 2, cats: LATE_NT, title: "Rome Burns; Nero Persecutes Christians", ties: ["neronian", "patmos"] },
  { id: "wld-rom-great-fire-nero-persecution", fame: 2, cats: WORLD, title: "The Great Fire of Rome", ties: ["neronian", "patmos"] },
  { id: "bib-ac-peter-martyrdom", fame: 2, cats: LATE_NT, title: "Peter Dies for His Faith", ties: ["neronian", "patmos"] },
  { id: "bib-ac-paul-martyrdom", fame: 2, cats: LATE_NT, title: "Paul Dies for His Faith", ties: ["neronian", "patmos"] },
  { id: "wld-rom-jewish-revolt-begins", fame: 3, cats: WORLD, ties: ["neronian", "patmos"] },
  { id: "bib-ac-fall-of-jerusalem", fame: 2, cats: LATE_NT, title: "Rome Destroys the Temple in Jerusalem", ties: ["patmos"] },
  { id: "wld-rom-destruction-of-jerusalem", fame: 2, cats: WORLD, title: "Rome Destroys Jerusalem", ties: ["patmos"] },
  { id: "wld-rom-fall-of-masada", fame: 3, cats: WORLD, ties: ["patmos"] },
  { id: "bib-ac-john-exile-revelation", fame: 2, cats: LATE_NT, title: "John Writes Revelation on Patmos", ties: ["patmos", "patmos-domitian"] },
  { id: "bib-ac-domitian-persecution", fame: 3, cats: LATE_NT, ties: ["patmos-domitian"] },
  { id: "wld-rom-trajan-persecution", fame: 3, cats: BOTH, title: "Pliny Writes to Trajan About Christians" },
  { id: "wld-rom-bar-kokhba-revolt", fame: 3, cats: WORLD },

  /* ---------------------------------------------------------------- the church and the world after */
  { id: "wld-rom-diocletian-great-persecution", fame: 2, cats: BOTH },
  { id: "wld-rom-constantine-edict-of-milan", fame: 1, cats: BOTH, title: "Constantine Becomes a Christian" },
  { id: "bib-ac-council-of-nicaea", fame: 2, cats: CHURCH },
  { id: "council-of-constantinople-381", fame: 3, cats: CHURCH },
  { id: "augustine-confessions-397", fame: 2, cats: CHURCH },
  { id: "jerome-vulgate-c405", fame: 3, cats: CHURCH, title: "Jerome Translates the Bible into Latin" },
  // Patrick's mission is traditionally 432; a later chronology puts it decades on.
  { id: "council-of-ephesus-431", fame: 3, cats: CHURCH, ties: ["patrick-a"] },
  { id: "patrick-mission-to-ireland-c432", fame: 2, cats: CHURCH, title: "Patrick Takes the Gospel to Ireland", ties: ["patrick-a", "patrick-b", "patrick-c"] },
  { id: "council-of-chalcedon-451", fame: 3, cats: CHURCH, ties: ["patrick-b"] },
  { id: "fall-of-western-rome-476", fame: 1, cats: WORLD, title: "The Fall of Rome", ties: ["patrick-c"] },
  { id: "benedict-rule-c529", fame: 2, cats: CHURCH },
  { id: "gregory-mission-to-england-597", fame: 3, cats: CHURCH, title: "Augustine of Canterbury Sent to England" },
  { id: "rise-of-islam-conquest-jerusalem-637", fame: 2, cats: WORLD, title: "Muslim Armies Take Jerusalem" },
  { id: "charlemagne-crowned-800", fame: 2, cats: BOTH, title: "Charlemagne Is Crowned Emperor" },
  { id: "great-schism-1054", fame: 2, cats: CHURCH, title: "The Great Schism: East and West Split" },
  { id: "first-crusade-1095", fame: 1, cats: BOTH, title: "The First Crusade" },
  { id: "founding-of-franciscans-1209", fame: 2, cats: CHURCH, title: "Francis of Assisi Founds the Franciscans" },
  { id: "aquinas-summa-theologica-c1265", fame: 3, cats: CHURCH, title: "Thomas Aquinas Writes the Summa" },
  { id: "wycliffe-english-bible-c1382", fame: 2, cats: CHURCH, title: "Wycliffe's English Bible" },
  { id: "execution-of-jan-hus-1415", fame: 2, cats: CHURCH, title: "Jan Hus Is Burned at the Stake" },
  // The Gutenberg Bible was finished c. 1454-55, too close to May 1453 to order on a "c." date.
  { id: "fall-of-constantinople-1453", fame: 2, cats: BOTH, ties: ["gutenberg"] },
  { id: "gutenberg-bible-1455", fame: 1, cats: BOTH, title: "Gutenberg Prints the Bible", ties: ["gutenberg"] },
  { id: "luthers-95-theses-1517", fame: 1, cats: CHURCH, title: "Luther Posts the 95 Theses" },
  { id: "diet-of-worms-1521", fame: 2, cats: CHURCH, title: "Luther Stands Firm at Worms" },
  { id: "zurich-reformation-1523", fame: 3, cats: CHURCH },
  { id: "english-reformation-1534", fame: 2, cats: BOTH, title: "Henry VIII Breaks with Rome" },
  { id: "calvin-institutes-1536", fame: 2, cats: CHURCH, title: "Calvin Publishes the Institutes" },
  { id: "society-of-jesus-founded-1540", fame: 3, cats: CHURCH, title: "The Jesuits Are Founded" },
  { id: "council-of-trent-1545", fame: 2, cats: CHURCH, title: "The Council of Trent Opens" },
  { id: "pilgrims-plymouth-1620", fame: 1, cats: BOTH, title: "The Pilgrims Sail on the Mayflower" },
  { id: "peace-of-westphalia-1648", fame: 3, cats: BOTH },
  { id: "first-great-awakening-c1740", fame: 2, cats: CHURCH },
  { id: "william-carey-india-mission-1793", fame: 2, cats: CHURCH },
  { id: "abolition-slave-trade-1807", fame: 2, cats: BOTH, title: "Britain Abolishes the Slave Trade" },
  { id: "azusa-street-revival-1906", fame: 2, cats: CHURCH },
  { id: "dietrich-bonhoeffer-german-church-struggle-1933-1945", fame: 2, cats: CHURCH, title: "Bonhoeffer Resists the Nazis" },
  { id: "world-council-of-churches-1948", fame: 3, cats: CHURCH },
  // The record dates the civil rights card to 1963, but the movement and Dr King's leadership of
  // it began in 1955 at Montgomery, so it is kept apart from anything in the 1950s and 60s.
  { id: "billy-graham-crusades-1949-1957", fame: 2, cats: CHURCH, title: "Billy Graham's First Big Crusades", ties: ["civil-rights"] },
  { id: "vatican-ii-1962", fame: 2, cats: CHURCH, title: "The Second Vatican Council", ties: ["civil-rights"] },
  { id: "civil-rights-movement-mlk-1963-1968", fame: 1, cats: BOTH, title: "Martin Luther King Jr. and Civil Rights", ties: ["civil-rights"] },
  { id: "fall-of-communism-poland-1989", fame: 2, cats: BOTH, title: "Communism Falls in Eastern Europe" },
];

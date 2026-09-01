/* ============================================================================
 * bibleJokes — the material behind Guess the Punchline.
 *
 * Every entry is a short, traditional Bible pun or riddle: folk humour that has
 * circulated in church bulletins and Sunday school rooms for decades, rewritten
 * here in one consistent house voice (setup as a question, punchline as short as
 * it can be and still land). Nothing here is copied from a source; nothing needs
 * knowledge past what a regular churchgoer already has — Noah, Moses, Jonah,
 * David and Goliath, Daniel, the loaves and fishes, Christmas and Easter.
 *
 * Two fields exist purely so the game can build fair questions:
 *
 *   theme  Groups jokes that share a cast (all the Noah ones, all the Moses
 *          ones). The difficulty dial is which pool distractors come from — an
 *          easy round pulls wrong punchlines from OTHER themes, so they read as
 *          obviously off; an expert round pulls them from the SAME theme, where
 *          every option is talking about the same character and you have to
 *          actually know the joke.
 *
 *   avoid  Collision key. Two jokes with the same `avoid` have punchlines that
 *          would BOTH plausibly answer either setup ("How did Noah light the
 *          ark?" / "Who was the first electrician?" both accept an ark-light
 *          answer), so they are never dealt against each other. Leave undefined
 *          unless there is a real collision — every id is its own group by
 *          default.
 * ========================================================================== */

export type JokeTheme = "noah" | "genesis" | "moses" | "ot-people" | "nt" | "church";

export interface BibleJoke {
  /** Stable and never reused — the seed for this joke's distractor pick and choice order, exactly
   * like QuizQuestion.id in gameQuestions.ts. Renaming an id reshuffles that joke's round. */
  id: string;
  setup: string;
  punchline: string;
  theme: JokeTheme;
  /** Shared by jokes whose punchlines are interchangeable; see the header note. */
  avoid?: string;
}

export const THEME_LABELS: Record<JokeTheme, string> = {
  noah: "Noah & the Ark",
  genesis: "In the Beginning",
  moses: "Moses & Egypt",
  "ot-people": "Old Testament Cast",
  nt: "Gospels & Church Age",
  church: "Sunday Morning",
};

export const BIBLE_JOKES: BibleJoke[] = [
  // ------------------------------------------------------------------- Noah
  { id: "noah-bees", theme: "noah", setup: "Where did Noah keep his bees?", punchline: "In the ark hives." },
  { id: "noah-cheetahs", theme: "noah", setup: "Which animals did Noah trust the least?", punchline: "The cheetahs." },
  { id: "noah-worms", theme: "noah", setup: "Why didn't Noah get much fishing done on the voyage?", punchline: "He only had two worms." },
  { id: "noah-floodlight", theme: "noah", avoid: "noah-light", setup: "How did Noah light the ark at night?", punchline: "Flood lighting." },
  { id: "noah-electrician", theme: "noah", avoid: "noah-light", setup: "Who was the first electrician in the Bible?", punchline: "Noah — he made the ark light." },
  { id: "noah-cards", theme: "noah", setup: "Why couldn't anyone play cards on the ark?", punchline: "Noah was standing on the deck." },
  { id: "noah-liquidation", theme: "noah", setup: "Who was the shrewdest investor in the Bible?", punchline: "Noah — he floated a company while the rest of the world was in liquidation." },
  { id: "noah-elephant", theme: "noah", setup: "Which animal was the last one off the ark?", punchline: "The elephant. He was still packing his trunk." },
  { id: "noah-giraffes", theme: "noah", setup: "How did the giraffes sleep on the ark?", punchline: "Neck and neck." },
  { id: "noah-mosquitoes", theme: "noah", setup: "What is the one job everyone wishes Noah had skipped?", punchline: "Loading the two mosquitoes." },
  { id: "noah-fowl", theme: "noah", setup: "Why did Noah have to scold the chickens?", punchline: "They kept using fowl language." },
  { id: "noah-herd", theme: "noah", avoid: "noah-quote", setup: "What did Noah say when the animals finally settled down?", punchline: "\"Well, now I've herd everything.\"" },
  { id: "noah-reviews", theme: "noah", setup: "Why did the ark get such poor reviews?", punchline: "Two of every animal, and one bathroom." },
  { id: "noah-moses-trick", theme: "noah", setup: "How many animals did Moses take onto the ark?", punchline: "None. That was Noah's ark." },
  { id: "noah-penguins", theme: "noah", setup: "Where did Noah put the penguins?", punchline: "In the ark-tic section." },
  { id: "noah-jurassic", theme: "noah", avoid: "noah-quote", setup: "What did Noah say as the last of the really big ones came aboard?", punchline: "\"Welcome to Jurassic Ark.\"" },
  { id: "noah-ham", theme: "noah", setup: "When is meat first mentioned in the Bible?", punchline: "When Noah took Ham onto the ark." },

  // --------------------------------------------------------- Genesis / Eden
  { id: "gen-adam-race", theme: "genesis", setup: "Who was the fastest runner in the Bible?", punchline: "Adam — he was first in the human race." },
  { id: "gen-christmas-eve", theme: "genesis", setup: "What did Adam say on the night of December 24th?", punchline: "\"It's Christmas, Eve.\"" },
  { id: "gen-pair-of-dice", theme: "genesis", setup: "Why could Adam and Eve never gamble again?", punchline: "Their pair of dice was taken away." },
  { id: "gen-raised-cain", theme: "genesis", setup: "How do we know Adam and Eve were a noisy couple?", punchline: "They raised Cain." },
  { id: "gen-house-and-home", theme: "genesis", setup: "What did Adam tell the children about why the family had moved?", punchline: "Their mother ate them out of house and home." },
  { id: "gen-abel", theme: "genesis", setup: "How long did Cain dislike his brother?", punchline: "As long as he was Abel." },
  { id: "gen-apple-byte", theme: "genesis", setup: "Who owned the first computer?", punchline: "Eve — she had an Apple, and Adam took a byte." },
  { id: "gen-before-eve", theme: "genesis", setup: "What time of day was Adam created?", punchline: "A little before Eve." },
  { id: "gen-first-surgery", theme: "genesis", setup: "Who had the first operation in the Bible?", punchline: "Adam — and it cost him a rib." },
  { id: "gen-big-apple", theme: "genesis", setup: "Why did Eve want to move to New York?", punchline: "She had already fallen for the big apple." },
  { id: "gen-cars", theme: "genesis", setup: "Where does the Bible mention cars?", punchline: "God drove Adam and Eve out of the garden." },
  { id: "gen-knew-a-lot", theme: "genesis", avoid: "lot", setup: "Who was the best-connected man in Genesis?", punchline: "Abraham — he knew a Lot." },
  { id: "gen-parking-lot", theme: "genesis", avoid: "lot", setup: "What do you call a Bible character who has just pulled up outside church?", punchline: "A parking Lot." },
  { id: "gen-lots-wife", theme: "genesis", setup: "Why does nobody invite Lot's wife to dinner?", punchline: "She has had quite enough salt." },
  { id: "gen-pair-on-ground", theme: "genesis", setup: "It wasn't the apple in the tree that caused all the trouble. What was it?", punchline: "The pair on the ground." },
  { id: "gen-methuselah", theme: "genesis", setup: "Why was Methuselah always so tired?", punchline: "Nine hundred and sixty-nine birthdays." },

  // --------------------------------------------------------- Moses & Egypt
  { id: "mos-broke-ten", theme: "moses", setup: "Who was the first man to break all ten commandments at once?", punchline: "Moses — he dropped them." },
  { id: "mos-tablets", theme: "moses", setup: "Where is medicine first mentioned in the Bible?", punchline: "When God gave Moses two tablets." },
  { id: "mos-hebrews", theme: "moses", setup: "How does Moses make his coffee?", punchline: "Hebrews it." },
  { id: "mos-aaron", theme: "moses", setup: "How do we know Moses wore a wig?", punchline: "Some days he was seen with Aaron, some days without." },
  { id: "mos-directions", theme: "moses", setup: "Why did the Israelites wander the desert for forty years?", punchline: "The men would not stop and ask for directions." },
  { id: "mos-parting-gift", theme: "moses", avoid: "red-sea", setup: "What did Moses hand out at the edge of the Red Sea?", punchline: "Parting gifts." },
  { id: "mos-passage", theme: "moses", avoid: "red-sea", setup: "Why couldn't the Israelites cross the Red Sea any sooner?", punchline: "They hadn't found the right passage." },
  { id: "mos-bank-jordan", theme: "moses", setup: "Where did the Israelites keep their savings?", punchline: "At the bank of the Jordan." },
  { id: "mos-little-prophet", theme: "moses", setup: "Who was the shrewdest woman in Egypt?", punchline: "Pharaoh's daughter — she went to the bank of the Nile and drew out a little prophet." },
  { id: "mos-mummy", theme: "moses", setup: "Why was the Egyptian girl so upset?", punchline: "Her daddy was a mummy." },
  { id: "mos-tennis", theme: "moses", setup: "Where is the first tennis match in the Bible?", punchline: "When Joseph served in Pharaoh's court." },
  { id: "mos-drive-thru", theme: "moses", setup: "Who opened the first drive-through?", punchline: "Moses. Two million customers, no waiting." },
  { id: "mos-non-prophet", theme: "moses", setup: "Why was Moses turned down by the conservation society?", punchline: "It's a non-prophet organization." },
  { id: "mos-de-nile", theme: "moses", setup: "Why wouldn't Pharaoh admit the plagues were a problem?", punchline: "He was in de Nile." },
  { id: "mos-parting-hair", theme: "moses", setup: "How does Moses do his hair?", punchline: "With a parting." },
  { id: "mos-big-inning", theme: "moses", setup: "Where does baseball first appear in the Bible?", punchline: "In the big inning." },

  // --------------------------------------------------- Old Testament cast
  { id: "ot-samson-house", theme: "ot-people", setup: "Who was the greatest comedian in the Bible?", punchline: "Samson — he brought the house down." },
  { id: "ot-delilah", theme: "ot-people", setup: "Why couldn't Samson keep a secret?", punchline: "Delilah kept getting it out of his hair." },
  { id: "ot-babysitter", theme: "ot-people", setup: "Who was the best babysitter in the Bible?", punchline: "David — he rocked Goliath to sleep." },
  { id: "ot-goliath-mind", theme: "ot-people", setup: "What did Goliath say after David's first shot?", punchline: "\"Nothing like that has ever entered my mind.\"" },
  { id: "ot-harped", theme: "ot-people", setup: "Who was the Bible's most repetitive musician?", punchline: "David — he harped on everything." },
  { id: "ot-solomon-temple", theme: "ot-people", setup: "Where was Solomon's temple?", punchline: "On the side of his head." },
  { id: "ot-solomon-split", theme: "ot-people", setup: "What is the fastest way to lose an argument in Solomon's court?", punchline: "Agree to split the difference." },
  { id: "ot-ruthless", theme: "ot-people", setup: "What kind of man was Boaz before he married Ruth?", punchline: "Ruthless." },
  { id: "ot-jonah-mouth", theme: "ot-people", setup: "How did Jonah feel after three days inside the fish?", punchline: "Rather down in the mouth." },
  { id: "ot-jonah-fishy", theme: "ot-people", setup: "What did Jonah's family say when he told them the story?", punchline: "\"That sounds fishy.\"" },
  { id: "ot-jonah-stomach", theme: "ot-people", setup: "Why do fish avoid Jonah to this day?", punchline: "They find him hard to stomach." },
  { id: "ot-daniel-sleep", theme: "ot-people", setup: "Who had the worst night's sleep in the Bible?", punchline: "Daniel — he shared a room with lions." },
  { id: "ot-elijah-horsepower", theme: "ot-people", setup: "Which prophet had the most horsepower?", punchline: "Elijah — he left in a chariot of fire." },
  { id: "ot-job-patient", theme: "ot-people", avoid: "job-patience", setup: "How do we know Job was a patient man?", punchline: "He sat through every one of his friends' speeches." },
  { id: "ot-job-doctor", theme: "ot-people", avoid: "job-patience", setup: "Who was the best doctor in the Bible?", punchline: "Job — he had the most patients." },
  { id: "ot-rebekah-lit", theme: "ot-people", setup: "Where does the Bible mention smoking?", punchline: "Rebekah lit off her camel." },

  // -------------------------------------------------- Gospels & church age
  { id: "nt-accord", theme: "nt", avoid: "accord", setup: "What kind of car do the apostles drive?", punchline: "A Honda — they were all in one Accord." },
  { id: "nt-own-accord", theme: "nt", avoid: "accord", setup: "Why are there no Hondas anywhere in the Gospels?", punchline: "Jesus never spoke of his own Accord." },
  { id: "nt-net-income", theme: "nt", setup: "How do we know Peter did well as a fisherman?", punchline: "Look at his net income." },
  { id: "nt-sea-waved", theme: "nt", setup: "What did the sea say to the boat carrying Jesus?", punchline: "Nothing — it just waved." },
  { id: "nt-grapeful", theme: "nt", setup: "What did the water say after the wedding at Cana?", punchline: "Nothing, but it looked very grape-ful." },
  { id: "nt-fatted-calf", theme: "nt", setup: "What did the fatted calf say when the prodigal son came home?", punchline: "\"This is the worst day of my life.\"" },
  { id: "nt-older-brother", theme: "nt", setup: "Which part of the prodigal son story do most people quietly relate to?", punchline: "The older brother, standing outside doing the math." },
  { id: "nt-halo", theme: "nt", setup: "How do angels greet one another?", punchline: "\"Halo.\"" },
  { id: "nt-wise-men-broke", theme: "nt", setup: "What do you call the wise men after they handed over the gold, frankincense and myrrh?", punchline: "Broke." },
  { id: "nt-fear-not", theme: "nt", setup: "Why did the angel have to open with \"fear not\"?", punchline: "Because appearing over a field at midnight does not read as good news." },
  { id: "nt-loaves-boy", theme: "nt", setup: "Why did the boy with five loaves and two fish look so nervous?", punchline: "Five thousand people had just been told dinner was on him." },
  { id: "nt-zacchaeus", theme: "nt", setup: "What does Zacchaeus say at every concert he attends?", punchline: "\"I still can't see.\"" },
  { id: "nt-peter-water", theme: "nt", setup: "How did Peter's walk on the water end?", punchline: "He got in over his head." },
  { id: "nt-tax-collector", theme: "nt", setup: "Why did a tax collector make such a natural disciple?", punchline: "He was already used to being unpopular." },
  { id: "nt-fishermen-wait", theme: "nt", setup: "Why did fishermen make good disciples?", punchline: "They already knew how to wait all day for something to happen." },
  { id: "nt-donkey-proud", theme: "nt", setup: "Why was the donkey so pleased with himself on Palm Sunday?", punchline: "He assumed the crowd had come for him." },
  { id: "nt-ninety-nine", theme: "nt", setup: "What did the shepherd say when he counted ninety-nine sheep?", punchline: "\"Ninety-nine percent. Most people would take that.\"" },
  { id: "nt-first-meeting", theme: "nt", setup: "How would the disciples describe the very first church meeting?", punchline: "Long." },

  // ------------------------------------------------------- Sunday morning
  { id: "ch-weekdays", theme: "church", setup: "Why is Sunday the strongest day of the week?", punchline: "All the others are weekdays." },
  { id: "ch-lightbulb", theme: "church", setup: "How many church members does it take to change a light bulb?", punchline: "Change?" },
  { id: "ch-bibledozer", theme: "church", setup: "What do you call someone who nods off in the middle of a chapter?", punchline: "A Bible-dozer." },
  { id: "ch-hymns", theme: "church", setup: "Why is it \"amen\" and never \"awomen\"?", punchline: "Because we sing hymns, not hers." },
  { id: "ch-rock-of-ages", theme: "church", setup: "What is the most requested hymn in the church nursery?", punchline: "\"Rock of Ages.\"" },
  { id: "ch-potluck", theme: "church", setup: "Why is the church potluck a genuine test of faith?", punchline: "You have to believe in something you cannot identify." },
  { id: "ch-in-conclusion", theme: "church", setup: "What is the least reliable phrase in any sermon?", punchline: "\"And in conclusion.\"" },
  { id: "ch-committee", theme: "church", setup: "What is the difference between a large pizza and a church committee?", punchline: "A pizza can feed a family of four." },
  { id: "ch-genealogies", theme: "church", setup: "Why does the Bible study go so quiet at the start of Matthew?", punchline: "Nobody wants to be the one asked to read the genealogy out loud." },
  { id: "ch-ladder", theme: "church", setup: "Why did the man bring a ladder to church?", punchline: "He heard the service was uplifting." },
  { id: "ch-holy-water", theme: "church", setup: "How do you make holy water?", punchline: "You boil the devil out of it." },
  { id: "ch-charitea", theme: "church", setup: "What is a minister's favorite kind of tea?", punchline: "Chari-tea." },
  { id: "ch-lent", theme: "church", setup: "What is the hardest part of Lent?", punchline: "Remembering what you gave up." },
  { id: "ch-pageant-sheep", theme: "church", setup: "Why was the boy so glum after the Christmas pageant casting?", punchline: "Typecast as a sheep for the fourth year running." },
  { id: "ch-back-row", theme: "church", setup: "Why does the back row fill up first every Sunday?", punchline: "It is the only pew with an exit strategy." },
  { id: "ch-three-minutes", theme: "church", setup: "The visiting preacher asked the deacon what he should speak about. What did the deacon say?", punchline: "\"About three minutes.\"" },
  { id: "ch-seven-days", theme: "church", setup: "Seven days without prayer makes one what?", punchline: "Weak." },
  { id: "ch-satan-ruler", theme: "church", setup: "Give the devil an inch and he'll be what?", punchline: "A ruler." },
  { id: "ch-kneemail", theme: "church", setup: "What's the most reliable way to get a message to God?", punchline: "Kneemail." },
  { id: "ch-garden-sign", theme: "church", setup: "What did the sign in the church garden say?", punchline: "\"Lettuce be kind, squash gossip, turnip to church.\"" },
  { id: "ch-cramming", theme: "church", setup: "What do you call it when a man of eighty suddenly starts reading his Bible every day?", punchline: "Cramming for finals." },
  { id: "ch-ghostwriter", theme: "church", setup: "Why is there no \"about the author\" page in the Bible?", punchline: "It had a holy ghostwriter." },
  { id: "ch-bird-of-pray", theme: "church", setup: "Why did the hawk settle on the church steeple?", punchline: "It's a bird of pray." },
];

/* -------------------------------------------------------------------------------------------------
 * Deterministic PRNG — identical to the one in gameQuestions.ts, and for the same reason: a round is
 * derived entirely from joke ids, so the same id always yields the same distractors in the same
 * order on every client with nothing sent over the wire. Never use Math.random() in a round builder.
 * ---------------------------------------------------------------------------------------------- */

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededPick<T>(items: T[], count: number, rand: () => number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return picked;
}

/** Fisher-Yates, same as the other solo games (ChronologyView, FillBlankView, CrosswordView). */
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ------------------------------------------------------------------------------------ difficulty

export type JokeLevel = "beginner" | "intermediate" | "expert";

export interface JokeLevelDef {
  key: JokeLevel;
  label: string;
  description: string;
  icon: string;
  /** Where the three wrong punchlines come from. "far" = other themes only, so the decoys are
   * visibly about the wrong characters. "any" = the whole bank. "same" = the joke's own theme, so
   * every option names the same cast and only the actual joke tells them apart. */
  distractors: "far" | "any" | "same";
}

/** Three rungs rather than the five Crossword and Chronology use: the honest dial here is how close
 * the decoys sit to the real punchline, and there are only really three distances worth having. */
export const JOKE_LEVELS: JokeLevelDef[] = [
  {
    key: "beginner",
    label: "Warm-Up",
    description: "The wrong answers are about completely different people. Read the setup, spot the one that fits.",
    icon: "🌱",
    distractors: "far",
  },
  {
    key: "intermediate",
    label: "Fellowship Hall",
    description: "Decoys drawn from anywhere in the joke book. You'll need to actually get the pun.",
    icon: "☕",
    distractors: "any",
  },
  {
    key: "expert",
    label: "Pulpit Ready",
    description: "Every option is about the same character. Only knowing the joke will save you.",
    icon: "🎤",
    distractors: "same",
  },
];

export interface JokeRound {
  joke: BibleJoke;
  /** Four punchlines in seeded order — the real one plus three decoys. */
  choices: string[];
  correctIndex: number;
}

/** Never deal a joke against one whose punchline would also answer its setup. */
function compatible(a: BibleJoke, b: BibleJoke): boolean {
  return a.id !== b.id && (a.avoid === undefined || a.avoid !== b.avoid);
}

/**
 * Build the four-option round for one joke. Deterministic in the joke's id and the level key, so the
 * same joke at the same level always plays identically — no hidden state, and a round could be
 * reconstructed anywhere from just those two strings if this ever goes multiplayer.
 */
export function buildRound(joke: BibleJoke, level: JokeLevelDef): JokeRound {
  const rand = mulberry32(hashSeed(`${joke.id}:${level.key}`));

  const eligible = BIBLE_JOKES.filter((j) => compatible(joke, j));
  const scoped =
    level.distractors === "same"
      ? eligible.filter((j) => j.theme === joke.theme)
      : level.distractors === "far"
        ? eligible.filter((j) => j.theme !== joke.theme)
        : eligible;
  // A theme could in principle be too thin to supply three same-theme decoys; top up from the wider
  // pool rather than dealing a round with two options.
  const pool = scoped.length >= 3 ? scoped : [...scoped, ...eligible.filter((j) => !scoped.includes(j))];

  const decoys = seededPick(pool, 3, rand).map((j) => j.punchline);
  const entries = [{ text: joke.punchline, correct: true }, ...decoys.map((d) => ({ text: d, correct: false }))];
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  return { joke, choices: entries.map((e) => e.text), correctIndex: entries.findIndex((e) => e.correct) };
}

/** A full shuffled deck of rounds for one sitting, so no joke repeats until the bank runs out. */
export function dealDeck(level: JokeLevelDef): JokeRound[] {
  return shuffled(BIBLE_JOKES).map((j) => buildRound(j, level));
}

export const JOKE_COUNT = BIBLE_JOKES.length;

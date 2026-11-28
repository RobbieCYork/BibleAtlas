// ------------------------------------------------------------------------------------------------
// No giveaways — a Bible Trivia question never hands the player its answer. The rules
// gameQuestions.ts applies, and the rewordings they need, live here.
//
// A question gives itself away when the prompt contains the answer, or a word of the answer that none
// of the wrong choices also carries ("Samaritans" under a question whose answer is Samaria), or when
// the answer is the only choice written differently (the only one with a date in it). A generator
// first rewords, then swaps in a wrong choice that carries the same word, and otherwise builds no
// question. Rewordings only take a word out; each one has to stay true to its record.
//
// A rewording is a [text in the record, replacement] pair. If the record is edited and the text is no
// longer there, the pair does nothing and the check above still applies to the new wording.
// ------------------------------------------------------------------------------------------------

export type Rewording = [find: string, replacement: string];

export function reword(text: string, rewordings: Rewording[] | undefined): string {
  return (rewordings ?? []).reduce((out, [find, replacement]) => out.replace(find, replacement), text);
}

/** Words too common to point at an answer. */
const COMMON_WORDS = new Set(
  (
    "the a an and or of in on to into with without by for from that this these those his her hers its their theirs " +
    "he she it they them him as at is was were are be been being not no nor but if than then so such who whom whose " +
    "which what when where why how did does do has have had can could would should may might will shall one two " +
    "three after before during over under between about also only both all any each other another more most very " +
    "own same out up off down through against among within upon whether there here you we our us your i"
  ).split(" ")
);

/** Forms of one name that share too little spelling to be recognised below. */
const SAME_WORD_GROUPS = [
  ["rome", "roman", "romans"],
  ["moses", "mosaic"],
  ["greece", "greek", "greeks"],
  ["shunem", "shunammite"],
  ["pontus", "pontian"],
];
/** Look-alikes that are different names. */
const DIFFERENT_WORDS = ["balaam balak", "matthan matthew"];

function plainText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/’/g, "'");
}

function significantWords(text: string): string[] {
  return (plainText(text).replace(/'s\b/g, "").match(/[a-z0-9]+/g) ?? []).filter((w) => w.length >= 2 && !COMMON_WORDS.has(w));
}

function singular(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

/** Whether two words are forms of one another: plural, possessive, adjective ("Crete"/"Cretan"). */
function isSameWord(a: string, b: string): boolean {
  if (a === b || singular(a) === singular(b)) return true;
  if (DIFFERENT_WORDS.includes(`${a} ${b}`) || DIFFERENT_WORDS.includes(`${b} ${a}`)) return false;
  if (SAME_WORD_GROUPS.some((group) => group.includes(a) && group.includes(b))) return true;
  let shared = 0;
  while (shared < a.length && a[shared] === b[shared]) shared++;
  return shared >= 4 && shared >= Math.min(a.length, b.length) - 2 && Math.max(a.length, b.length) - shared <= 5;
}

/** Whether `phrase` appears in `text` as whole words. */
export function containsPhrase(text: string, phrase: string): boolean {
  const escaped = plainText(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // No lookbehind: older iOS Safari throws on it.
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(plainText(text));
}

/** One test per way the prompt's `subject` points at `answer`; a wrong choice that passes a test
 * takes that clue away. Null when the answer itself is in the subject, which no choice can cover. */
export function wordClues(subject: string, answer: string): ((choice: string) => boolean)[] | null {
  if (containsPhrase(subject, answer)) return null;
  const inSubject = significantWords(subject);
  return [...new Set(significantWords(answer))].flatMap((word) => {
    const matched = inSubject.filter((s) => isSameWord(word, s));
    if (matched.length === 0) return [];
    return [(choice: string) => significantWords(choice).some((other) => matched.some((s) => isSameWord(other, s)))];
  });
}

export function givesAway(subject: string, answer: string, distractors: string[]): boolean {
  const clues = wordClues(subject, answer);
  return clues === null || clues.some((covers) => !distractors.some(covers));
}

/** One test per way of writing that would single the answer out if no wrong choice shared it. */
export function formatClues(answer: string, features: RegExp[]): ((choice: string) => boolean)[] {
  return features.map((feature) => (choice: string) => feature.test(choice) === feature.test(answer));
}
export const HAS_NUMBER = /\d/;
export const HAS_DASH = /—/;

/** "The Maccabean Revolt Begins at Modein (167 BC)" without its bracketed date. */
export function withoutDates(title: string): string {
  return title.replace(/\s*\([^()]*(?:\d|\bBC\b|\bAD\b|centur)[^()]*\)/gi, "");
}

export const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export const withoutBrackets = (text: string): string => text.replace(/\s*\([^()]*\)/g, "");

/** A person's name and its shorter forms, fullest first: "Augustine of Hippo" and "Augustine". */
export function nameForms(name: string): string[] {
  const bare = withoutBrackets(name);
  return [...new Set([name, bare, bare.split(",")[0], bare.split(/ (?:of|the) /)[0], bare.replace(/^Pope /, "")])];
}

/** Event titles reworded only where the title is a choice in an order question: "earliest" in the
 * prompt picked out the one title that said "Early". */
export const ORDER_CHOICE_TITLES: Record<string, string> = {
  "bib-loc-temple-cleansing-early": "Jesus Cleanses the Temple in John's Gospel",
  "bib-ac-jerusalem-church-community": "Shared Life in the Jerusalem Church",
};

export const PERSON_ROLE_WORDING: Record<string, Rewording[]> = {
  "herod-agrippa-ii": [["Last Herodian king", "Last king of his family's dynasty"]],
  "joseph-husband-of-mary": [["Husband of Mary, legal father of Jesus", "Legal father of Jesus"]],
  "ananias-of-damascus": [["Disciple in Damascus who", "Disciple who"]],
  "philip-the-evangelist": [["evangelist to Samaria", "took the gospel to Samaria"]],
  "ethiopian-eunuch": [["the Ethiopian Queen", "a Foreign Queen"]],
  "philip-the-tetrarch": [["Tetrarch of", "Ruler of"]],
  "joseph-son-of-jacob": [["Favored son of Jacob", "Sold by his brothers"]],
  "judah-son-of-jacob": [["Fourth son of Jacob and Leah; ancestor of the tribe of Judah and", "Leah's fourth-born; ancestor of"]],
  "jacob-father-of-joseph": [["father of Joseph", "named just before Mary's husband"]],
  "holy-spirit": [["The Spirit of God, present and active", "Third Person of the Trinity, active"]],
  "francis-of-assisi": [["the Franciscan order", "the Order of Friars Minor"]],
  "dominic-de-guzman": [["the Dominican order", "the Order of Preachers"]],
};

export const PERSON_SUMMARY_WORDING: Record<string, Rewording[]> = {
  "mary-mother-of-jesus": [["conceive and raise Jesus", "conceive and raise a son"]],
  "sergius-paulus": [["watching Paul strike", "watching an apostle strike"]],
  "god-the-father": [
    ["addressed intimately as 'Father' and taught his disciples to call 'Our Father in heaven'", "addressed intimately in prayer and taught his disciples to pray to"],
  ],
  uzziah: [[" called Azariah in 2 Kings", ", known by a second name in 2 Kings"]],
  silas: [["likely the same person Paul's letters call Silvanus", "likely appearing in Paul's letters under another form of his name"]],
  esau: [["the ancestral father of Israel's perennial rival nation, Edom", "the ancestral father of one of Israel's perennial rival nations"]],
  "thomas-aquinas": [["Aquinas synthesized", "he synthesized"]],
  "peter-waldo": [["Waldo's followers, the Waldensians, were", "and whose followers were"]],
  "johannes-gutenberg": [["the Gutenberg Bible", "a landmark printed Bible"]],
  "martin-luther": [["Luther's doctrine", "his doctrine"]],
  "huldrych-zwingli": [["Zwingli reformed worship", "he reformed worship"]],
  "thomas-cranmer": [["Cranmer authored", "he authored"]],
  "john-knox": [["Knox led", "he led"]],
  "charles-spurgeon": [["Spurgeon pastored", "he pastored"]],
  "william-seymour": [["Seymour led", "he led"]],
  "aimee-semple-mcpherson": [["McPherson built", "she built"]],
  "c-s-lewis": [["Lewis became", "he became"]],
  "desmond-tutu": [["Tutu was", "he was"]],
};

export const LOCATION_FACT_WORDING: Record<string, Rewording[]> = {
  samaria: [["Jews and Samaritans, centered on a rival Samaritan temple", "Jews and the people of this region, centered on a rival temple"]],
  rome: [["from Roman custody", "from custody"]],
  colossae: [["Paul's epistle to the Colossians, addressing", "one of Paul's letters, written to"]],
  "mount-of-olives": [["the Olivet Discourse, his", "his"]],
  ur: [["Ur of the Chaldeans", "this city of the Chaldeans"]],
  ai: [["The name 'Ai' means", "This place's name means"]],
  shunem: [["'Shunammite woman'", "woman of this town"]],
  "dead-sea": [["Called the 'Salt Sea,' the 'Sea of the Arabah,' or the 'Eastern Sea' in the Old Testament,", "Known by several names in the Old Testament,"]],
  babylon: [
    ["the Tower of Babel narrative", "the story of the great tower"],
    ["name (Babel) to the Hebrew root", "Hebrew name to the root"],
  ],
  "en-gedi": [["caves of En Gedi", "caves of this oasis"]],
};

export const SITE_PROMPT_NAMES: Record<string, string> = {
  "ancient-agora-athens": "the Agora of Athens",
  "straight-street-damascus": "the Via Recta in Damascus",
};

export const TOPIC_ROLE_WORDING: Record<string, Rewording[]> = {
  "new-covenant": [["Jeremiah's Prophesied Covenant", "The Promise Through Jeremiah"]],
  "day-of-preparation": [["The Day Before the Sabbath", "The Eve of the Weekly Rest"]],
  "young-earth-old-earth-creationism": [["the Age of Creation", "the Age of the Universe"]],
  "pilate-stone": [["Pontius Pilate", "a Roman Prefect"]],
  "cyrus-cylinder": [["Babylonian Foundation Inscription of Cyrus the Great", "Foundation Inscription of Babylon's Persian Conqueror"]],
  "codex-vaticanus": [["in the Vatican Library", "Kept in Rome's Papal Library"]],
  "babylonian-chronicles": [["Neo-Babylonian Year-by-Year", "Mesopotamian Year-by-Year"]],
  "lachish-reliefs": [["Palace Reliefs of the Siege of Lachish", "Palace Carvings of a Judahite City Under Siege"]],
  "jehoiachin-ration-tablets": [["Ration Lists", "Food Lists"]],
  "temple-warning-inscription": [["the Inner Temple Courts", "the Sanctuary's Inner Courts"]],
  "crucified-man-givat-hamivtar": [["Evidence of Crucifixion", "Evidence of This Roman Execution"]],
  "nathan-melech-bulla": [["Bulla Naming", "Seal Impression Naming"]],
  "bethlehem-bulla": [["Mention of Bethlehem", "Mention of David's Hometown"]],
  "ketef-hinnom-amulets": [["Silver Plaques", "Metal Plaques"]],
  "beni-hasan-tomb-painting": [["Tomb Painting", "Wall Scene"]],
  "mount-ebal-lead-object": [["Piece of Lead", "Piece of Metal"]],
  "ron-wyatt-claimed-discoveries": [["Claims Still Circulating", "Assertions Still Circulating"]],
  "chief-priests": [["Temple Priesthood", "Temple Leadership"]],
  "galilee-boat": [["Fishing Boat from the Sea of Galilee", "Fishing Vessel from the Lake Jesus Taught Beside"]],
  "broad-wall-jerusalem": [["Fortification Wall", "Fortification"]],
  "burnt-house-jerusalem": [["Family's House in Jerusalem, Burned", "Family's Jerusalem Home, Destroyed by Fire"]],
  "temple-mount-sifting-project": [["Wet-Sifting of", "Washing and Screening"]],
  "timna-valley-mines": [["Copper Workings", "Metal Workings"]],
  "beersheba-horned-altar": [["Four-Horned Altar", "Place of Sacrifice"]],
  "tomb-of-jesus-candidates": [["Candidate Tombs", "Candidate Burial Places"]],
  "community-rule": [["The Rule Book of the Qumran Community", "The Handbook of the Qumran Sect"]],
  "war-scroll": [["the Last War", "the Final Conflict"]],
  "great-psalms-scroll": [["Largest Psalms Manuscript", "Largest Songbook Manuscript"]],
  "copper-scroll": [["Beaten into Copper", "Beaten into Metal"]],
  "thanksgiving-hymns": [["Qumran Hymn Collection", "Qumran Poetry Collection"]],
  "genesis-apocryphon": [["Retelling of Genesis", "Retelling of the Bible's First Book"]],
  "greek-minor-prophets-scroll": [["A Greek Old Testament", "A Translated Old Testament Text"]],
  "vetus-latina": [["The Latin Bible Christians", "The Bible Western Christians"]],
  "minuscule-33": [["Ninth-Century Minuscule", "Ninth-Century Manuscript"]],
};

export const TOPIC_SUMMARY_WORDING: Record<string, Rewording[]> = {
  israelites: [[" (renamed Israel)", ""]],
  samaritans: [["centered in Samaria", "centered around Mount Gerizim"]],
  levites: [["Jacob's son Levi", "one of Jacob's sons"]],
  canaanites: [["the land of Canaan", "the Promised Land"]],
  greeks: [["non-Jewish, Greek-speaking", "non-Jewish"]],
  "new-covenant": [
    ["A covenant God promised", "A pledge God made"],
    ["Mosaic covenant", "Mosaic arrangement"],
  ],
  "casting-lots": [["cast lots for Jesus's clothing", "used it to divide up Jesus's clothing"]],
  "young-earth-old-earth-creationism": [
    ["God as sole Creator", "God as the sole maker of everything"],
    ["on how old the earth and universe are and how the six creation days relate to that age", "on the age of the universe and how the six days of Genesis relate to it"],
  ],
  "sennacherib-prism": [
    ["clay prism", "clay object"],
    ["Sennacherib of Assyria", "an Assyrian king"],
  ],
  "ketef-hinnom-amulets": [
    ["silver foil", "metal foil"],
    ["above the Hinnom Valley", "outside ancient Jerusalem"],
  ],
  "beni-hasan-tomb-painting": [
    ["A painted register in a Middle Egyptian tomb", "A decorated wall in a burial chamber in Middle Egypt"],
    ["a cargo of eye-paint", "a cargo of eye cosmetic"],
  ],
  "ivory-pomegranate": [["thumb-sized pomegranate", "thumb-sized fruit"]],
  "gospel-of-jesus-wife-fragment": [["speaks of his wife", "speaks as a married man"]],
  "talpiot-tomb": [["the family tomb of Jesus. The tomb is genuine", "the burial place of Jesus's family. The site is genuine"]],
  "mount-ebal-lead-object": [["square of lead", "square of metal"]],
  "ron-wyatt-claimed-discoveries": [["These claims are", "These assertions are"]],
  "shroud-of-turin": [["kept in Turin", "kept in northern Italy"]],
  "chief-priests": [
    ["senior priestly officials", "most senior officials"],
    ["the serving high priest, those who had held the office before him, and the heads of the priestly families", "the man serving in its highest office, those who had held it before him, and the heads of the families who served there"],
  ],
  "galilee-boat": [["A working boat", "A working vessel"]],
  "caiaphas-ossuary": [["A carved ossuary", "A carved bone box"]],
  "sergius-paulus-inscriptions": [
    ["Paul and Barnabas. Several inscriptions have been proposed as his", "Barnabas and his companion. Several carved texts have been proposed as his"],
  ],
  "broad-wall-jerusalem": [["Seven metres of wall thickness", "A seven-metre-thick barrier"]],
  "pilgrimage-road-jerusalem": [
    ["stepped street", "stepped thoroughfare"],
    ["the road pilgrims actually walked", "the route worshippers actually walked"],
  ],
  "robinsons-arch": [["The springing of a vast arch", "The stub of a vast span"]],
  "place-of-trumpeting-inscription": [["blow the trumpet", "sound the signal"]],
  "warrens-shaft": [["A vertical shaft", "A vertical channel"]],
  "great-isaiah-scroll": [["chapters of Isaiah", "chapters of one prophet's book"]],
  "great-psalms-scroll": [["columns of psalms", "columns of sacred songs"]],
  "en-gedi-leviticus-scroll": [["columns of Leviticus", "columns of the Law of Moses"]],
  "leningrad-codex": [["the Aleppo Codex was", "the Aleppo manuscript was"]],
  "cairo-codex-of-the-prophets": [
    ["A complete Prophets codex", "A complete manuscript of one division of the Hebrew Bible"],
    ["the Aleppo Codex", "the Aleppo manuscript"],
  ],
  "vetus-latina": [
    ["The Latin Scriptures as they circulated", "The Western church's Scriptures as they circulated"],
    ["by Latin writers", "by early Western writers"],
  ],
  "gospel-of-judas": [["takes Judas Iscariot aside", "takes his betrayer aside"]],
  // The summary says the book was written at the monastery; it was found there. The clause goes.
  "codex-sinaiticus": [[" at St Catherine's Monastery on Mount Sinai", ""]],
};

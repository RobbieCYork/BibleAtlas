import type { TQSet } from "./types";

/* 20 Questions — People.
 *
 * HOW TO READ THIS FILE. Each question lists the people for whom the answer is YES, and the people
 * for whom Scripture does not settle it (UNKNOWN, shown to the reader as "Not stated"). Everyone
 * else is NO. So a NO is a claim too: before adding a person, read every question and make sure NO
 * is true for them wherever they are not listed. Questions are worded "Does the Bible …" wherever
 * NO means "Scripture does not record it", so that NO stays true.
 *
 * Where the app's home position (Protestant evangelical) settles an attribution that critical
 * scholarship disputes — the Gospel of John's author, Peter's two letters — it is answered from
 * that position; where it does not settle it, the answer is UNKNOWN. Notes on the judgement calls
 * sit beside the question. Ids are people.ts ids, so the reveal opens that person's article.
 *
 * Checked by scripts/games-data/twenty-questions.mjs (every id real, every reveal verse names the
 * person in the WEB, KJV and ASV, every person reachable in 20 questions).
 */

const OT = [
  "adam", "eve", "cain", "abel", "enoch", "noah", "abraham", "sarah", "hagar", "isaac", "rebekah", "jacob", "esau",
  "rachel", "leah", "joseph-son-of-jacob", "moses", "aaron", "miriam", "joshua", "caleb", "balaam", "rahab", "deborah",
  "gideon", "samson", "delilah", "ruth", "naomi", "boaz", "samuel", "saul-king-of-israel", "david", "bathsheba",
  "nathan-the-prophet", "solomon", "elijah", "elisha", "jezebel", "hezekiah", "josiah", "isaiah", "jeremiah", "ezekiel",
  "daniel", "esther", "mordecai", "nehemiah", "ezra", "job", "jonah", "melchizedek",
];
const NT = [
  "mary-mother-of-jesus", "joseph-husband-of-mary", "john-the-baptist", "elizabeth-mother-of-john-baptist",
  "zechariah-father-of-john-baptist", "simeon-at-the-temple", "simon-peter", "andrew-apostle", "james-son-of-zebedee",
  "john-the-apostle", "thomas-apostle", "matthew-levi", "judas-iscariot", "mary-magdalene", "martha-of-bethany",
  "lazarus-of-bethany", "nicodemus", "zacchaeus", "pontius-pilate", "herod-the-great", "caiaphas", "paul-of-tarsus",
  "barnabas", "stephen-the-martyr", "timothy", "luke-evangelist", "silas", "priscilla", "lydia-of-thyatira",
  "cornelius-the-centurion", "philip-the-evangelist", "john-mark",
];
const TWELVE_HERE = ["simon-peter", "andrew-apostle", "james-son-of-zebedee", "john-the-apostle", "thomas-apostle", "matthew-levi", "judas-iscariot"];

export const PEOPLE: TQSet = {
  category: "people",
  label: "People",
  noun: "person",
  entries: [
    { id: "adam", name: "Adam", ref: "Genesis 5:5" },
    { id: "eve", name: "Eve", ref: "Genesis 3:20" },
    { id: "cain", name: "Cain", ref: "Genesis 4:8" },
    { id: "abel", name: "Abel", ref: "Genesis 4:4" },
    { id: "enoch", name: "Enoch", ref: "Genesis 5:24" },
    { id: "noah", name: "Noah", ref: "Genesis 6:9" },
    { id: "abraham", name: "Abraham", ref: "Genesis 17:5" },
    { id: "sarah", name: "Sarah", ref: "Genesis 21:2", keywords: ["Sarah"] },
    { id: "hagar", name: "Hagar", ref: "Genesis 16:15" },
    { id: "isaac", name: "Isaac", ref: "Genesis 21:3" },
    { id: "rebekah", name: "Rebekah", ref: "Genesis 24:67" },
    { id: "jacob", name: "Jacob", ref: "Genesis 32:28" },
    { id: "esau", name: "Esau", ref: "Genesis 25:34" },
    { id: "rachel", name: "Rachel", ref: "Genesis 29:18" },
    { id: "leah", name: "Leah", ref: "Genesis 29:23" },
    { id: "joseph-son-of-jacob", name: "Joseph, son of Jacob", ref: "Genesis 41:41", keywords: ["Joseph"] },
    { id: "moses", name: "Moses", ref: "Exodus 3:4" },
    { id: "aaron", name: "Aaron", ref: "Exodus 28:1" },
    { id: "miriam", name: "Miriam", ref: "Exodus 15:20" },
    { id: "joshua", name: "Joshua", ref: "Joshua 1:1" },
    { id: "caleb", name: "Caleb", ref: "Numbers 14:24" },
    { id: "balaam", name: "Balaam", ref: "Numbers 22:28" },
    { id: "rahab", name: "Rahab", ref: "Joshua 2:1" },
    { id: "deborah", name: "Deborah", ref: "Judges 4:4" },
    { id: "gideon", name: "Gideon", ref: "Judges 7:7" },
    { id: "samson", name: "Samson", ref: "Judges 16:30" },
    { id: "delilah", name: "Delilah", ref: "Judges 16:4" },
    { id: "ruth", name: "Ruth", ref: "Ruth 1:16" },
    { id: "naomi", name: "Naomi", ref: "Ruth 1:22" },
    { id: "boaz", name: "Boaz", ref: "Ruth 4:13" },
    { id: "samuel", name: "Samuel", ref: "1 Samuel 3:10" },
    { id: "saul-king-of-israel", name: "Saul, king of Israel", ref: "1 Samuel 11:15", keywords: ["Saul"] },
    { id: "david", name: "David", ref: "1 Samuel 17:50" },
    { id: "bathsheba", name: "Bathsheba", ref: "2 Samuel 11:3", keywords: ["Bathsheba", "Bath-sheba"] },
    { id: "nathan-the-prophet", name: "Nathan the prophet", ref: "2 Samuel 12:7", keywords: ["Nathan"] },
    { id: "solomon", name: "Solomon", ref: "1 Kings 4:29" },
    { id: "elijah", name: "Elijah", ref: "2 Kings 2:11" },
    { id: "elisha", name: "Elisha", ref: "2 Kings 2:15" },
    { id: "jezebel", name: "Jezebel", ref: "1 Kings 16:31" },
    { id: "hezekiah", name: "Hezekiah", ref: "2 Kings 18:1" },
    { id: "josiah", name: "Josiah", ref: "2 Kings 22:1" },
    { id: "isaiah", name: "Isaiah", ref: "Isaiah 1:1" },
    { id: "jeremiah", name: "Jeremiah", ref: "Jeremiah 1:1" },
    { id: "ezekiel", name: "Ezekiel", ref: "Ezekiel 1:3" },
    { id: "daniel", name: "Daniel", ref: "Daniel 6:16" },
    { id: "esther", name: "Esther", ref: "Esther 2:17" },
    { id: "mordecai", name: "Mordecai", ref: "Esther 10:3" },
    { id: "nehemiah", name: "Nehemiah", ref: "Nehemiah 1:1" },
    { id: "ezra", name: "Ezra", ref: "Ezra 7:6" },
    { id: "job", name: "Job", ref: "Job 1:1" },
    { id: "jonah", name: "Jonah", ref: "Jonah 1:17" },
    { id: "melchizedek", name: "Melchizedek", ref: "Genesis 14:18", keywords: ["Melchizedek"] },
    { id: "mary-mother-of-jesus", name: "Mary, mother of Jesus", ref: "Luke 1:30", keywords: ["Mary"] },
    { id: "joseph-husband-of-mary", name: "Joseph, husband of Mary", ref: "Matthew 1:24", keywords: ["Joseph"] },
    { id: "john-the-baptist", name: "John the Baptist", ref: "Matthew 3:1", keywords: ["John"] },
    { id: "elizabeth-mother-of-john-baptist", name: "Elizabeth", ref: "Luke 1:57", keywords: ["Elizabeth", "Elisabeth"] },
    { id: "zechariah-father-of-john-baptist", name: "Zechariah, father of John the Baptist", ref: "Luke 1:13", keywords: ["Zacharias", "Zechariah"] },
    { id: "simeon-at-the-temple", name: "Simeon", ref: "Luke 2:25" },
    { id: "simon-peter", name: "Simon Peter", ref: "Matthew 16:16", keywords: ["Peter"] },
    { id: "andrew-apostle", name: "Andrew", ref: "John 1:40" },
    { id: "james-son-of-zebedee", name: "James, son of Zebedee", ref: "Mark 1:19", keywords: ["James"] },
    { id: "john-the-apostle", name: "John the Apostle", ref: "Mark 1:19", keywords: ["John"] },
    { id: "thomas-apostle", name: "Thomas", ref: "John 20:28" },
    { id: "matthew-levi", name: "Matthew (Levi)", ref: "Matthew 9:9", keywords: ["Matthew"] },
    { id: "judas-iscariot", name: "Judas Iscariot", ref: "Matthew 26:14", keywords: ["Judas"] },
    { id: "mary-magdalene", name: "Mary Magdalene", ref: "John 20:18", keywords: ["Magdalene"] },
    { id: "martha-of-bethany", name: "Martha of Bethany", ref: "Luke 10:41", keywords: ["Martha"] },
    { id: "lazarus-of-bethany", name: "Lazarus of Bethany", ref: "John 11:43", keywords: ["Lazarus"] },
    { id: "nicodemus", name: "Nicodemus", ref: "John 3:1" },
    { id: "zacchaeus", name: "Zacchaeus", ref: "Luke 19:5" },
    { id: "pontius-pilate", name: "Pontius Pilate", ref: "Matthew 27:24", keywords: ["Pilate"] },
    { id: "herod-the-great", name: "Herod the Great", ref: "Matthew 2:16", keywords: ["Herod"] },
    { id: "caiaphas", name: "Caiaphas", ref: "John 11:49" },
    { id: "paul-of-tarsus", name: "Paul", ref: "Acts 13:9" },
    { id: "barnabas", name: "Barnabas", ref: "Acts 4:36" },
    { id: "stephen-the-martyr", name: "Stephen", ref: "Acts 7:59" },
    { id: "timothy", name: "Timothy", ref: "Acts 16:1", keywords: ["Timothy", "Timotheus"] },
    { id: "luke-evangelist", name: "Luke", ref: "Colossians 4:14", keywords: ["Luke"] },
    { id: "silas", name: "Silas", ref: "Acts 16:25" },
    { id: "priscilla", name: "Priscilla", ref: "Acts 18:26" },
    { id: "lydia-of-thyatira", name: "Lydia of Thyatira", ref: "Acts 16:14", keywords: ["Lydia"] },
    { id: "cornelius-the-centurion", name: "Cornelius", ref: "Acts 10:1" },
    { id: "philip-the-evangelist", name: "Philip the Evangelist", ref: "Acts 8:5", keywords: ["Philip"] },
    { id: "john-mark", name: "Mark (John Mark)", ref: "Acts 12:12", keywords: ["Mark"] },
  ],
  groups: ["Who", "When", "Role", "Family", "Places", "Events"],
  questions: [
    // ---------------------------------------------------------------- Who
    {
      id: "woman",
      group: "Who",
      text: "Is this person a woman?",
      yes: ["eve", "sarah", "hagar", "rebekah", "rachel", "leah", "miriam", "rahab", "deborah", "delilah", "ruth", "naomi", "bathsheba", "jezebel", "esther", "mary-mother-of-jesus", "elizabeth-mother-of-john-baptist", "mary-magdalene", "martha-of-bethany", "priscilla", "lydia-of-thyatira"],
    },
    {
      // Descent from Jacob (Israel). Before Jacob there was no Israel, so Abraham, Isaac and Rebekah
      // are NO; Rachel and Leah were Laban's daughters. The Twelve, Martha, Lazarus and Mary
      // Magdalene are answered YES on the consistent witness of the Gospels (Galatians 2:15 for
      // Peter). UNKNOWN: Caleb "the Kenizzite" (Numbers 32:12), Bathsheba, Delilah, Job (of Uz), Nathan (no lineage given),
      // Herod (Idumean by Josephus, not by Scripture), Timothy (Jewish mother, Greek father, Acts
      // 16:1), Luke, Lydia, Priscilla, Silas.
      id: "israelite",
      group: "Who",
      text: "Were they born into Israel — Jacob himself or one of his descendants?",
      yes: [
        "jacob", "joseph-son-of-jacob", "moses", "aaron", "miriam", "joshua", "deborah", "gideon", "samson", "naomi", "boaz", "samuel",
        "saul-king-of-israel", "david", "solomon", "elijah", "elisha", "hezekiah", "josiah", "isaiah", "jeremiah", "ezekiel",
        "daniel", "esther", "mordecai", "nehemiah", "ezra", "jonah", "mary-mother-of-jesus", "joseph-husband-of-mary", "john-the-baptist",
        "elizabeth-mother-of-john-baptist", "zechariah-father-of-john-baptist", "simeon-at-the-temple", ...TWELVE_HERE, "mary-magdalene",
        "martha-of-bethany", "lazarus-of-bethany", "nicodemus", "zacchaeus", "caiaphas", "paul-of-tarsus", "barnabas", "stephen-the-martyr",
        "philip-the-evangelist", "john-mark",
      ],
      unknown: ["caleb", "bathsheba", "delilah", "job", "nathan-the-prophet", "herod-the-great", "timothy", "luke-evangelist", "lydia-of-thyatira", "priscilla", "silas"],
    },
    {
      id: "jesus-line",
      group: "Who",
      text: "Are they an ancestor of Jesus, or his mother or legal father?",
      // Matthew 1 and Luke 3, plus the mothers in that line (Sarah, Rebekah, Leah, Eve). Naomi:
      // "A son is born to Naomi" (Ruth 4:17) is not descent — UNKNOWN rather than a trick NO.
      yes: ["adam", "eve", "enoch", "noah", "abraham", "sarah", "isaac", "rebekah", "jacob", "leah", "rahab", "ruth", "boaz", "david", "bathsheba", "solomon", "hezekiah", "josiah", "mary-mother-of-jesus", "joseph-husband-of-mary"],
      unknown: ["naomi"],
    },
    // ---------------------------------------------------------------- When
    { id: "ot", group: "When", text: "Did they live in Old Testament times?", yes: OT },
    { id: "nt", group: "When", text: "Did they live in New Testament times?", yes: NT },
    {
      id: "before-flood",
      group: "When",
      text: "Did they live before the Flood?",
      yes: ["adam", "eve", "cain", "abel", "enoch", "noah"],
      unknown: ["job"],
    },
    {
      // Noah: by the Hebrew text's figures (Genesis 9:28-29, 11:10-26) his life overlaps
      // Abraham's; the Greek Old Testament's figures do not. UNKNOWN.
      id: "patriarchs",
      group: "When",
      text: "Did they live in the time of Abraham, Isaac and Jacob?",
      yes: ["abraham", "sarah", "hagar", "isaac", "rebekah", "jacob", "esau", "rachel", "leah", "joseph-son-of-jacob", "melchizedek"],
      unknown: ["job", "noah"],
    },
    {
      // Rahab and Balaam were alive in those years, so YES is the true answer even though they
      // were not part of Israel's march.
      id: "exodus-era",
      group: "When",
      text: "Did they live in the time of the Exodus and the wilderness journey?",
      yes: ["moses", "aaron", "miriam", "joshua", "caleb", "balaam", "rahab"],
      unknown: ["job"],
    },
    {
      // Saul: anointed while Samuel still judged Israel (1 Samuel 7:15, 10:1), so UNKNOWN.
      id: "judges-era",
      group: "When",
      text: "Did they live in the time of the conquest of Canaan or the judges?",
      yes: ["joshua", "caleb", "rahab", "deborah", "gideon", "samson", "delilah", "ruth", "naomi", "boaz", "samuel"],
      unknown: ["job", "saul-king-of-israel"],
    },
    {
      // Ezekiel (taken 597 BC) and Daniel (605 BC) went into exile while Judah still had a king.
      // Mordecai: Esther 2:6 may say he, or his great-grandfather Kish, was taken with Jeconiah.
      id: "kings-era",
      group: "When",
      text: "Did they live while kings ruled Israel or Judah?",
      yes: ["samuel", "saul-king-of-israel", "david", "bathsheba", "nathan-the-prophet", "solomon", "elijah", "elisha", "jezebel", "hezekiah", "josiah", "isaiah", "jeremiah", "ezekiel", "daniel", "jonah"],
      unknown: ["job", "mordecai"],
    },
    {
      id: "exile-era",
      group: "When",
      text: "Did they live during the Babylonian exile or the return from it?",
      yes: ["jeremiah", "ezekiel", "daniel", "esther", "mordecai", "ezra", "nehemiah"],
      unknown: ["job"],
    },
    {
      // Moses and Elijah appear with Jesus at the Transfiguration (Matthew 17:3). John Mark: the
      // young man of Mark 14:51 is often identified as Mark, but Scripture does not say so.
      id: "gospels",
      group: "When",
      text: "Do they take part in the Gospel accounts (Matthew to John)?",
      yes: [
        "mary-mother-of-jesus", "joseph-husband-of-mary", "john-the-baptist", "elizabeth-mother-of-john-baptist", "zechariah-father-of-john-baptist",
        "simeon-at-the-temple", ...TWELVE_HERE, "mary-magdalene", "martha-of-bethany", "lazarus-of-bethany", "nicodemus", "zacchaeus",
        "pontius-pilate", "herod-the-great", "caiaphas", "moses", "elijah",
      ],
      unknown: ["john-mark"],
    },
    {
      // Acts 1:13-14 names the eleven and Mary. Mary Magdalene may be among "the women" there.
      // Luke is usually taken to be the "we" of Acts 16 onward, but Acts never names him.
      // Judas's death is told in Acts 1:18 as something already past.
      id: "acts",
      group: "When",
      text: "Do they take part in the events of the book of Acts?",
      yes: ["simon-peter", "andrew-apostle", "james-son-of-zebedee", "john-the-apostle", "thomas-apostle", "matthew-levi", "mary-mother-of-jesus", "caiaphas", "paul-of-tarsus", "barnabas", "stephen-the-martyr", "timothy", "silas", "priscilla", "lydia-of-thyatira", "cornelius-the-centurion", "philip-the-evangelist", "john-mark"],
      unknown: ["luke-evangelist", "judas-iscariot", "mary-magdalene"],
    },
    // ---------------------------------------------------------------- Role
    { id: "king", group: "Role", text: "Were they a king?", yes: ["saul-king-of-israel", "david", "solomon", "hezekiah", "josiah", "herod-the-great", "melchizedek"] },
    {
      // Bathsheba sat at Solomon's right hand as the king's mother (1 Kings 2:19) but is never
      // called queen.
      id: "queen",
      group: "Role",
      text: "Were they a queen?",
      yes: ["jezebel", "esther"],
      unknown: ["bathsheba"],
    },
    {
      // YES only where a verse uses the word: Abraham (Genesis 20:7), Aaron (Exodus 7:1), Miriam
      // (Exodus 15:20), Deborah (Judges 4:4), David (Acts 2:30), Daniel (Matthew 24:15), Balaam
      // (2 Peter 2:16), Silas (Acts 15:32). UNKNOWN: Isaac, Jacob and Sarah (Psalm 105:15, "my
      // prophets", of the patriarchs' household); Enoch, Zechariah and Saul, who prophesied but are
      // not called prophets; Barnabas and Paul, listed among "prophets and teachers" (Acts 13:1)
      // without saying which; John (Revelation 22:9); Caiaphas, who "prophesied" (John 11:51).
      id: "prophet",
      group: "Role",
      text: "Does the Bible call them a prophet or prophetess?",
      yes: ["abraham", "moses", "aaron", "miriam", "deborah", "samuel", "nathan-the-prophet", "david", "elijah", "elisha", "isaiah", "jeremiah", "ezekiel", "daniel", "jonah", "john-the-baptist", "balaam", "silas"],
      unknown: ["isaac", "jacob", "sarah", "enoch", "zechariah-father-of-john-baptist", "saul-king-of-israel", "barnabas", "paul-of-tarsus", "john-the-apostle", "caiaphas"],
    },
    {
      // Ezekiel 1:3 and Ezra 7:11 call them priests. Jeremiah was "of the priests" (Jeremiah 1:1);
      // Psalm 99:6 sets Moses "among his priests"; Samuel served at the tabernacle — UNKNOWN.
      id: "priest",
      group: "Role",
      text: "Were they a priest?",
      yes: ["aaron", "melchizedek", "zechariah-father-of-john-baptist", "caiaphas", "ezra", "ezekiel"],
      unknown: ["jeremiah", "samuel", "moses"],
    },
    {
      id: "judge",
      group: "Role",
      text: "Were they one of the judges who led Israel?",
      yes: ["deborah", "gideon", "samson", "samuel"],
      unknown: ["moses"],
    },
    { id: "twelve", group: "Role", text: "Were they one of the twelve apostles?", yes: TWELVE_HERE },
    {
      id: "foreign-court",
      group: "Role",
      text: "Did they hold office at the court of Egypt, Babylon or Persia?",
      yes: ["joseph-son-of-jacob", "daniel", "nehemiah", "mordecai", "esther"],
      unknown: ["moses", "ezra"],
    },
    {
      // Herod reigned as a king Rome had appointed; whether that makes him Rome's "official" is a
      // matter of definition.
      id: "rome",
      group: "Role",
      text: "Were they a Roman official or soldier?",
      yes: ["pontius-pilate", "cornelius-the-centurion"],
      unknown: ["herod-the-great"],
    },
    {
      // Matthew 4:18-21. Thomas went fishing with them after the resurrection (John 21:2-3), which
      // does not say it was his trade.
      id: "fisherman",
      group: "Role",
      text: "Were they a fisherman?",
      yes: ["simon-peter", "andrew-apostle", "james-son-of-zebedee", "john-the-apostle"],
      unknown: ["thomas-apostle"],
    },
    { id: "tax", group: "Role", text: "Were they a tax collector?", yes: ["matthew-levi", "zacchaeus"] },
    // Nicodemus (John 3:1), Paul (Philippians 3:5).
    { id: "pharisee", group: "Role", text: "Were they a Pharisee?", yes: ["nicodemus", "paul-of-tarsus"] },
    // Colossians 4:14, "the beloved physician".
    { id: "doctor", group: "Role", text: "Were they a doctor?", yes: ["luke-evangelist"] },
    {
      // Abel (Genesis 4:2), Jacob (30:31), Rachel (29:9), Joseph (37:2), Moses (Exodus 3:1), David
      // (1 Samuel 16:11). Abraham, Isaac and Job owned flocks; whether they tended them is not said.
      id: "shepherd",
      group: "Role",
      text: "Does the Bible describe them looking after sheep or flocks?",
      yes: ["abel", "jacob", "rachel", "joseph-son-of-jacob", "moses", "david"],
      unknown: ["abraham", "isaac", "job"],
    },
    {
      // Abraham led 318 men after the kings who took Lot (Genesis 14:14-15); Josiah went out to
      // fight Necho (2 Chronicles 35:22). Deborah went with Barak, Caleb took Hebron, Moses
      // prayed while Joshua fought (Exodus 17) — whether any of them "led" is a judgement.
      id: "army",
      group: "Role",
      text: "Did they lead an army into battle?",
      yes: ["abraham", "joshua", "gideon", "saul-king-of-israel", "david", "josiah"],
      unknown: ["deborah", "caleb", "moses", "herod-the-great"],
    },
    {
      // Book titles as this app's Bible lists them. "Mark", "Luke", "John", "Matthew", "Timothy"
      // and "Peter" are named for their traditional authors or recipients, the app's home position.
      id: "book",
      group: "Role",
      text: "Is a book of the Bible named after them?",
      yes: ["joshua", "ruth", "samuel", "ezra", "nehemiah", "esther", "job", "isaiah", "jeremiah", "ezekiel", "daniel", "jonah", "solomon", "matthew-levi", "john-mark", "luke-evangelist", "john-the-apostle", "timothy", "simon-peter"],
    },
    { id: "letters", group: "Role", text: "Did they write any of the New Testament letters?", yes: ["paul-of-tarsus", "simon-peter", "john-the-apostle"] },
    // The four Gospels' traditional authors — the app's home position.
    { id: "gospel-writer", group: "Role", text: "Did they write one of the four Gospels?", yes: ["matthew-levi", "john-mark", "luke-evangelist", "john-the-apostle"] },
    // 1 and 2 Timothy.
    { id: "letter-to", group: "Role", text: "Is a letter in the Bible addressed to them?", yes: ["timothy"] },
    { id: "psalms", group: "Role", text: "Are any psalms credited to them?", yes: ["david", "solomon", "moses"] },
    {
      // Moses and Aaron (Exodus 7-14), Joshua (10:12-14), Samuel (1 Samuel 12:18), Elijah, Elisha,
      // Isaiah (2 Kings 20:11), the apostles (Acts 5:12), Paul, Stephen (Acts 6:8), Philip (8:6),
      // Barnabas (14:3). Judas was among the Twelve sent out with power over demons (Mark 6:7-13)
      // — UNKNOWN rather than either answer.
      id: "miracles",
      group: "Role",
      text: "Does the Bible record God working miracles through them?",
      yes: ["moses", "aaron", "joshua", "samuel", "elijah", "elisha", "isaiah", "simon-peter", "andrew-apostle", "james-son-of-zebedee", "john-the-apostle", "thomas-apostle", "matthew-levi", "paul-of-tarsus", "stephen-the-martyr", "philip-the-evangelist", "barnabas"],
      unknown: ["judas-iscariot", "samson", "gideon"],
    },
    // ---------------------------------------------------------------- Family
    { id: "twin", group: "Family", text: "Were they a twin?", yes: ["jacob", "esau", "thomas-apostle"] },
    { id: "twins-parent", group: "Family", text: "Were they the parent of twins?", yes: ["isaac", "rebekah"] },
    {
      // Deborah: "wife of Lappidoth" in the WEB, KJV and ASV, though the Hebrew can be read
      // otherwise. Rahab: Matthew 1:5 names Salmon as the father of her son, not as her husband.
      // Hezekiah, Josiah: their sons' mothers are named, not called wives. Solomon: Naamah is named
      // as Rehoboam's mother (1 Kings 14:21). Caleb: whether 1 Chronicles 2's Caleb is this one.
      id: "spouse",
      group: "Family",
      text: "Does the Bible name their husband or wife?",
      yes: ["adam", "eve", "abraham", "sarah", "hagar", "isaac", "rebekah", "jacob", "rachel", "leah", "esau", "joseph-son-of-jacob", "moses", "aaron", "ruth", "naomi", "boaz", "saul-king-of-israel", "david", "bathsheba", "jezebel", "esther", "mary-mother-of-jesus", "joseph-husband-of-mary", "elizabeth-mother-of-john-baptist", "zechariah-father-of-john-baptist", "priscilla"],
      unknown: ["deborah", "rahab", "hezekiah", "josiah", "solomon", "caleb"],
    },
    { id: "married-king", group: "Family", text: "Were they married to a king?", yes: ["bathsheba", "jezebel", "esther"] },
    {
      // Saul's son Ish-bosheth (2 Samuel 2:10), Gideon's son Abimelech (Judges 9:6), Jezebel's sons
      // Ahaziah and Joram (1 Kings 22:51-52, 2 Kings 9:22), Herod's son Antipas, "King Herod"
      // (Mark 6:14). Mary and Joseph: Luke 1:32-33.
      id: "son-king",
      group: "Family",
      text: "Did a son of theirs become a king?",
      yes: ["saul-king-of-israel", "gideon", "david", "bathsheba", "solomon", "jezebel", "hezekiah", "josiah", "herod-the-great", "mary-mother-of-jesus", "joseph-husband-of-mary"],
    },
    {
      id: "brother-apostle",
      group: "Family",
      text: "Was their brother also one of the twelve apostles?",
      yes: ["simon-peter", "andrew-apostle", "james-son-of-zebedee", "john-the-apostle"],
      // Matthew and James are both "son of Alphaeus" (Mark 2:14, 3:18); Scripture never calls them brothers.
      unknown: ["matthew-levi"],
    },
    {
      // Adam 930 years (Genesis 5:5), Noah 950 (9:29). Eve's and Cain's ages are not given.
      id: "nine-hundred",
      group: "Family",
      text: "Does the Bible say they lived more than 900 years?",
      yes: ["adam", "noah"],
      unknown: ["eve", "cain"],
    },
    {
      // Abram/Abraham and Sarai/Sarah (Genesis 17), Jacob/Israel (32:28), Joseph/Zaphenath-paneah
      // (41:45), Hoshea/Joshua (Numbers 13:16), Gideon/Jerubbaal (Judges 6:32), Solomon/Jedidiah
      // (2 Samuel 12:25), Daniel/Belteshazzar (Daniel 1:7), Simon/Cephas (John 1:42),
      // Joseph/Barnabas (Acts 4:36). UNKNOWN where two names are simply both used: Esther/Hadassah,
      // Saul/Paul (Acts 13:9), Levi/Matthew, Thomas/Didymus, John/Mark, and Eve (Genesis 2:23, 3:20).
      id: "renamed",
      group: "Family",
      text: "Were they given a new name?",
      yes: ["abraham", "sarah", "jacob", "joseph-son-of-jacob", "joshua", "gideon", "solomon", "daniel", "simon-peter", "barnabas"],
      unknown: ["esther", "paul-of-tarsus", "matthew-levi", "thomas-apostle", "john-mark", "eve"],
    },
    // ---------------------------------------------------------------- Places
    {
      // Abraham and Sarah (Genesis 12:10), Hagar the Egyptian, Joseph and Jacob, Moses, Aaron,
      // Miriam, Joshua and Caleb (the Exodus generation), Jeremiah (Jeremiah 43:6-7), Mary and
      // Joseph (Matthew 2:14). Isaac was told not to go (Genesis 26:2).
      id: "egypt",
      group: "Places",
      text: "Did they spend time in Egypt?",
      yes: ["abraham", "sarah", "hagar", "joseph-son-of-jacob", "jacob", "moses", "aaron", "miriam", "joshua", "caleb", "jeremiah", "mary-mother-of-jesus", "joseph-husband-of-mary"],
    },
    {
      // Abraham and Sarah came from "Ur of the Chaldees" (Genesis 11:31), long before Babylon's
      // empire — UNKNOWN rather than a trick answer either way.
      id: "babylon-persia",
      group: "Places",
      text: "Did they live in Babylon or Persia?",
      yes: ["daniel", "ezekiel", "esther", "mordecai", "nehemiah", "ezra"],
      unknown: ["abraham", "sarah"],
    },
    {
      // The eleven are "men of Galilee" (Acts 1:11); Matthew 27:55-56 (the women "from Galilee",
      // Mary Magdalene among them); Luke 1:26 and 2:39 (Nazareth). Judas had died before Acts 1:11;
      // Jonah came from Gath-hepher, in what was later Galilee; Mark — UNKNOWN.
      id: "galilee",
      group: "Places",
      text: "Were they from Galilee?",
      yes: ["simon-peter", "andrew-apostle", "james-son-of-zebedee", "john-the-apostle", "thomas-apostle", "matthew-levi", "mary-mother-of-jesus", "joseph-husband-of-mary", "mary-magdalene"],
      unknown: ["judas-iscariot", "jonah", "john-mark"],
    },
    {
      id: "bethlehem",
      group: "Places",
      text: "Did they live in Bethlehem?",
      yes: ["david", "boaz", "naomi", "ruth"],
      unknown: ["joseph-husband-of-mary", "mary-mother-of-jesus"],
    },
    {
      // Barnabas, Silas, Timothy, John Mark (Acts 13:5) and Priscilla (Acts 18:18) are named
      // travelling with him. Luke is with him in Rome (2 Timothy 4:11); that he is the "we" of Acts
      // is the traditional reading, not a statement.
      id: "with-paul",
      group: "Places",
      text: "Did they travel with Paul?",
      yes: ["barnabas", "silas", "timothy", "john-mark", "priscilla"],
      unknown: ["luke-evangelist"],
    },
    // ---------------------------------------------------------------- Events
    {
      // Elizabeth met Mary while Mary was carrying Jesus (Luke 1:41-45) — UNKNOWN.
      id: "met-jesus",
      group: "Events",
      text: "Does the Bible record them meeting Jesus during his life on earth?",
      yes: ["mary-mother-of-jesus", "joseph-husband-of-mary", "john-the-baptist", "simeon-at-the-temple", ...TWELVE_HERE, "mary-magdalene", "martha-of-bethany", "lazarus-of-bethany", "nicodemus", "zacchaeus", "pontius-pilate", "caiaphas", "moses", "elijah"],
      unknown: ["elizabeth-mother-of-john-baptist", "john-mark"],
    },
    {
      // Mary Magdalene (John 20), the eleven (Luke 24:33-36, John 20-21), Paul (1 Corinthians
      // 15:8). He appeared to more than five hundred at once (1 Corinthians 15:6), so for believers
      // alive then who are not named, Scripture does not say.
      id: "risen",
      group: "Events",
      text: "Does the Bible say the risen Jesus appeared to them?",
      yes: ["mary-magdalene", "simon-peter", "andrew-apostle", "james-son-of-zebedee", "john-the-apostle", "thomas-apostle", "matthew-levi", "paul-of-tarsus"],
      unknown: [
        "mary-mother-of-jesus", "joseph-husband-of-mary", "elizabeth-mother-of-john-baptist", "zechariah-father-of-john-baptist", "simeon-at-the-temple",
        "martha-of-bethany", "lazarus-of-bethany", "nicodemus", "zacchaeus", "barnabas", "stephen-the-martyr", "silas", "philip-the-evangelist",
        "john-mark", "luke-evangelist", "timothy", "priscilla", "lydia-of-thyatira", "cornelius-the-centurion",
      ],
    },
    { id: "raised", group: "Events", text: "Were they raised from the dead to life on earth?", yes: ["lazarus-of-bethany"] },
    {
      // John the Baptist (Matthew 14:10), Stephen (Acts 7:59-60), James (Acts 12:2). Abel's blood is
      // called righteous (Matthew 23:35) — whether he died "for his faith" the text leaves open.
      // Peter's and Paul's deaths are foretold or expected, not recorded.
      id: "killed-for-faith",
      group: "Events",
      text: "Does the Bible record them being killed for their faith or message?",
      yes: ["john-the-baptist", "stephen-the-martyr", "james-son-of-zebedee"],
      unknown: ["abel"],
    },
    { id: "taken-up", group: "Events", text: "Were they taken to heaven without dying?", yes: ["enoch", "elijah"] },
    {
      // Cain built a city (Genesis 4:17), Noah the ark, Joshua Timnath-serah (Joshua 19:50), David
      // the city from the Millo (2 Samuel 5:9), Solomon the temple, Hezekiah the broken wall (2
      // Chronicles 32:5), Nehemiah Jerusalem's walls. Moses had the tabernacle made by others;
      // Scripture never names Herod as the temple's builder (John 2:20).
      id: "builder",
      group: "Events",
      text: "Does the Bible say they built a city, a wall, a temple or the ark?",
      yes: ["cain", "noah", "joshua", "david", "solomon", "hezekiah", "nehemiah"],
      unknown: ["moses", "herod-the-great"],
    },
    { id: "lions", group: "Events", text: "Were they thrown into a den of lions?", yes: ["daniel"] },
    { id: "fish", group: "Events", text: "Were they swallowed by a great fish?", yes: ["jonah"] },
  ],
};

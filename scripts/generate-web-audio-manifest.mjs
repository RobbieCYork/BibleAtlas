// One-off generator for public/web-audio-manifest.json — scrapes the 66 eBible.org
// WEB-audio directory listings and maps "Book|chapter" -> full mp3 URL.
// Filename patterns differ per directory (verified live), so we never assume a
// template: we collect every .mp3 href in a directory, sort, and require the file
// count to exactly match the canon chapter count before assigning chapters 1..N.

const BOOKS = [
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
  ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
  ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
  ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
  ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52], ["Lamentations", 5],
  ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3], ["Amos", 9],
  ["Obadiah", 1], ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3],
  ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4], ["Matthew", 28],
  ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28], ["Romans", 16],
  ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6], ["Philippians", 4],
  ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3], ["1 Timothy", 6], ["2 Timothy", 4],
  ["Titus", 3], ["Philemon", 1], ["Hebrews", 13], ["James", 5], ["1 Peter", 5],
  ["2 Peter", 3], ["1 John", 5], ["2 John", 1], ["3 John", 1], ["Jude", 1],
  ["Revelation", 22],
];

const BASE = "https://ebible.org/eng-web/audio/";

const UNITS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** "One Hundred Forty Six" -> 146; null when any token isn't a number word. */
function wordsToNumber(tokens) {
  if (tokens.length === 0) return null;
  let total = 0;
  let current = 0;
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (t === "hundred") {
      if (current === 0) return null;
      current *= 100;
      total += current;
      current = 0;
    } else if (t in TENS) current += TENS[t];
    else if (t in UNITS) current += UNITS[t];
    else return null;
  }
  return total + current || null;
}

function isNumberWord(raw) {
  const t = raw.toLowerCase();
  return t === "hundred" || t in TENS || t in UNITS;
}

/** The trailing run of number-word tokens, e.g. ["0479","Psalms","One"] -> ["One"]. */
function trailingNumberWords(tokens) {
  let i = tokens.length;
  while (i > 0 && isNumberWord(tokens[i - 1])) i--;
  return tokens.slice(i);
}

async function fetchText(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

// Get the 66 real directory names from the index page (Revelation is spelled
// "66_Revelations/" there; don't hand-build names).
const index = await fetchText(BASE);
const dirs = [...index.matchAll(/href="(\d{2}_[^"/]+)\/"/g)].map((m) => m[1]).sort();
if (dirs.length !== 66) throw new Error(`Expected 66 book dirs, found ${dirs.length}`);

const manifest = {};
for (let i = 0; i < 66; i++) {
  const [book, chapters] = BOOKS[i];
  const dir = dirs[i];
  if (!dir.startsWith(String(i + 1).padStart(2, "0") + "_")) {
    throw new Error(`Dir order mismatch at ${i + 1}: got ${dir}`);
  }
  const html = await fetchText(BASE + dir + "/");
  const files = [...html.matchAll(/href="([^"]+\.mp3)"/gi)].map((m) => m[1]);
  let unique = [...new Set(files)];
  // Drop duplicate-upload copies like "0549 Psalms-Seventy One (1).mp3" (exists live in
  // 19_Psalms) when the same file without the " (n)" suffix is also present.
  unique = unique.filter((href) => {
    const m = href.match(/^(.*)%20\((\d+)\)\.mp3$/i) || href.match(/^(.*) \((\d+)\)\.mp3$/i);
    return !(m && unique.includes(`${m[1]}.mp3`));
  });
  // The chapter number comes from the spelled-out chapter WORD in the filename — neither a
  // string sort nor the numeric sequence prefix is trustworthy (live quirks: 2 Thessalonians
  // has a double-space name that string-sorts Chapter Three before One; Isaiah uses sequence
  // 0695 for BOTH Sixteen and Seventeen). Patterns seen live:
  //   "01_16_Genesis_Chapter_Sixteen.mp3", "01 0695 Isaiah-Chapter Sixteen.mp3",
  //   "0479 Psalms-One.mp3" (no "Chapter"), "0629 Proverbs-Chapter 001.mp3" (digits).
  const chapterOf = (href) => {
    const name = decodeURIComponent(href)
      .replace(/\.mp3$/i, "")
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const tokens = name.split(" ");
    const chIdx = tokens.map((t) => t.toLowerCase()).lastIndexOf("chapter");
    let phrase = chIdx >= 0 ? tokens.slice(chIdx + 1) : trailingNumberWords(tokens);
    // "Acts-Chapter Thirteen 1.mp3" exists live — junk trailing digits after a word phrase.
    // (Distinct from Proverbs' "Chapter 001", where digits are the entire phrase.)
    while (phrase.length > 1 && /^\d+$/.test(phrase[phrase.length - 1])) phrase = phrase.slice(0, -1);
    if (phrase.length === 1 && /^\d+$/.test(phrase[0])) return parseInt(phrase[0], 10);
    const n = wordsToNumber(phrase);
    if (n === null) throw new Error(`${book}: can't parse chapter from "${name}"`);
    return n;
  };
  unique.sort((a, b) => chapterOf(a) - chapterOf(b));
  // The parsed chapters must be exactly 1..N — proves nothing is missing, duplicated, or misread.
  unique.forEach((href, j) => {
    if (chapterOf(href) !== j + 1) {
      throw new Error(`${book}: expected chapter ${j + 1}, parsed ${chapterOf(href)} from "${decodeURIComponent(href)}"`);
    }
  });
  if (unique.length !== chapters) {
    throw new Error(`${book}: expected ${chapters} mp3s in ${dir}, found ${unique.length}`);
  }
  unique.forEach((href, ci) => {
    manifest[`${book}|${ci + 1}`] = BASE + dir + "/" + href;
  });
  process.stderr.write(`${book}: ${chapters} ok\n`);
}

const total = Object.keys(manifest).length;
if (total !== 1189) throw new Error(`Manifest has ${total} entries, expected 1189`);
process.stderr.write(`TOTAL ${total} entries — complete.\n`);
process.stdout.write(JSON.stringify(manifest, null, 0) + "\n");

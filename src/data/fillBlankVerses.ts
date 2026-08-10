/** Verse bank for the "Fill in the Blank" game (FillBlankView.tsx) — standout, widely-memorized OT
 * and NT verses (KJV text, public domain, matching the translation already offered in the Bible
 * reader) with one or more contiguous word-phrases blanked out per difficulty tier:
 *   - easy: 1 blank, short verse
 *   - moderate: 2 blanks, medium verse
 *   - hard: 3 blanks, longer or less-iconic phrasing
 * Blanks are authored as plain phrases (as they appear in `text`) rather than hand-counted word
 * indices — locateBlanks() below finds each one by matching words case/punctuation-insensitively,
 * so a typo in a blank phrase throws immediately at module load instead of silently mis-indexing. */

export type Difficulty = "easy" | "moderate" | "hard";
export type Testament = "OT" | "NT";

interface RawVerse {
  reference: string;
  text: string;
  /** Contiguous phrases, left-to-right, non-overlapping. */
  blanks: string[];
  difficulty: Difficulty;
  testament: Testament;
}

export interface Blank {
  startWord: number;
  endWord: number;
  /** The actual words being blanked (with original punctuation), one dash-line per word. */
  answerWords: string[];
}

export interface FillBlankVerse {
  reference: string;
  words: string[];
  blanks: Blank[];
  difficulty: Difficulty;
  testament: Testament;
}

const normalize = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

function locateBlanks(text: string, phrases: string[]): Blank[] {
  const words = text.split(/\s+/);
  const blanks: Blank[] = [];
  let cursor = 0;
  for (const phrase of phrases) {
    const phraseWords = phrase.split(/\s+/).map(normalize);
    let found = -1;
    outer: for (let i = cursor; i <= words.length - phraseWords.length; i++) {
      for (let j = 0; j < phraseWords.length; j++) {
        if (normalize(words[i + j]) !== phraseWords[j]) continue outer;
      }
      found = i;
      break;
    }
    if (found === -1) {
      throw new Error(`fillBlankVerses: blank phrase "${phrase}" not found in "${text}"`);
    }
    blanks.push({ startWord: found, endWord: found + phraseWords.length, answerWords: words.slice(found, found + phraseWords.length) });
    cursor = found + phraseWords.length;
  }
  return blanks;
}

const RAW: RawVerse[] = [
  // --- Easy: one blank, short verse ---
  {
    reference: "Genesis 1:1",
    text: "In the beginning God created the heaven and the earth.",
    blanks: ["created"],
    difficulty: "easy",
    testament: "OT",
  },
  {
    reference: "Exodus 20:3",
    text: "Thou shalt have no other gods before me.",
    blanks: ["gods"],
    difficulty: "easy",
    testament: "OT",
  },
  {
    reference: "Psalm 23:1",
    text: "The LORD is my shepherd; I shall not want.",
    blanks: ["shepherd"],
    difficulty: "easy",
    testament: "OT",
  },
  {
    reference: "Psalm 46:10",
    text: "Be still, and know that I am God.",
    blanks: ["still"],
    difficulty: "easy",
    testament: "OT",
  },
  {
    reference: "Psalm 118:24",
    text: "This is the day which the LORD hath made; we will rejoice and be glad in it.",
    blanks: ["rejoice"],
    difficulty: "easy",
    testament: "OT",
  },
  {
    reference: "Matthew 5:9",
    text: "Blessed are the peacemakers: for they shall be called the children of God.",
    blanks: ["peacemakers"],
    difficulty: "easy",
    testament: "NT",
  },
  {
    reference: "Philippians 4:13",
    text: "I can do all things through Christ which strengtheneth me.",
    blanks: ["Christ"],
    difficulty: "easy",
    testament: "NT",
  },
  {
    reference: "Romans 3:23",
    text: "For all have sinned, and come short of the glory of God.",
    blanks: ["sinned"],
    difficulty: "easy",
    testament: "NT",
  },

  // --- Moderate: two blanks, medium-length verse ---
  {
    reference: "John 3:16",
    text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    blanks: ["loved", "everlasting life"],
    difficulty: "moderate",
    testament: "NT",
  },
  {
    reference: "Joshua 1:9",
    text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
    blanks: ["strong and of a good courage", "thy God"],
    difficulty: "moderate",
    testament: "OT",
  },
  {
    reference: "Isaiah 40:31",
    text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
    blanks: ["wait upon the LORD", "renew their strength"],
    difficulty: "moderate",
    testament: "OT",
  },
  {
    reference: "Jeremiah 29:11",
    text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
    blanks: ["thoughts of peace", "expected end"],
    difficulty: "moderate",
    testament: "OT",
  },
  {
    reference: "Proverbs 3:5",
    text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
    blanks: ["Trust", "own understanding"],
    difficulty: "moderate",
    testament: "OT",
  },
  {
    reference: "Romans 8:28",
    text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
    blanks: ["work together for good", "his purpose"],
    difficulty: "moderate",
    testament: "NT",
  },
  {
    reference: "Ephesians 2:8",
    text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:",
    blanks: ["grace", "gift of God"],
    difficulty: "moderate",
    testament: "NT",
  },
  {
    reference: "Micah 6:8",
    text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?",
    blanks: ["do justly", "walk humbly"],
    difficulty: "moderate",
    testament: "OT",
  },

  // --- Hard: three blanks, longer or less-iconic phrasing ---
  {
    reference: "Isaiah 53:5",
    text: "But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.",
    blanks: ["wounded", "bruised for our iniquities", "stripes we are healed"],
    difficulty: "hard",
    testament: "OT",
  },
  {
    reference: "Romans 12:2",
    text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.",
    blanks: ["conformed", "renewing of your mind", "will of God"],
    difficulty: "hard",
    testament: "NT",
  },
  {
    reference: "Hebrews 11:1",
    text: "Now faith is the substance of things hoped for, the evidence of things not seen.",
    blanks: ["substance", "hoped for", "not seen"],
    difficulty: "hard",
    testament: "NT",
  },
  {
    reference: "Galatians 2:20",
    text: "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.",
    blanks: ["crucified with Christ", "Christ liveth in me", "loved me"],
    difficulty: "hard",
    testament: "NT",
  },
  {
    reference: "James 1:12",
    text: "Blessed is the man that endureth temptation: for when he is tried, he shall receive the crown of life, which the Lord hath promised to them that love him.",
    blanks: ["endureth temptation", "crown of life", "love him"],
    difficulty: "hard",
    testament: "NT",
  },
  {
    reference: "Deuteronomy 6:5",
    text: "And thou shalt love the LORD thy God with all thine heart, and with all thy soul, and with all thy might.",
    blanks: ["all thine heart", "all thy soul", "all thy might"],
    difficulty: "hard",
    testament: "OT",
  },
  {
    reference: "1 Corinthians 13:4",
    text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,",
    blanks: ["suffereth long, and is kind", "envieth not", "not puffed up"],
    difficulty: "hard",
    testament: "NT",
  },
  {
    reference: "Colossians 3:23",
    text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men;",
    blanks: ["do it heartily", "to the Lord", "not unto men"],
    difficulty: "hard",
    testament: "NT",
  },
];

export const FILL_BLANK_VERSES: FillBlankVerse[] = RAW.map((v) => ({
  reference: v.reference,
  words: v.text.split(/\s+/),
  blanks: locateBlanks(v.text, v.blanks),
  difficulty: v.difficulty,
  testament: v.testament,
}));

export const DIFFICULTY_LEVELS: { key: Difficulty; label: string; description: string; icon: string }[] = [
  { key: "easy", label: "Easy", description: "Short, well-known verses — one word missing.", icon: "🌱" },
  { key: "moderate", label: "Moderate", description: "Longer verses — two phrases missing.", icon: "🔥" },
  { key: "hard", label: "Hard", description: "Full verses, less-familiar phrasing — three phrases missing.", icon: "⚔️" },
];

/** Seconds allotted to answer a verse: a flat base for reading/orienting, plus time per missing word
 * (a multi-word blank takes proportionally longer to recall and type than a one-word blank). */
const BASE_SECONDS = 8;
const SECONDS_PER_MISSING_WORD = 9;

export function timeLimitFor(verse: FillBlankVerse): number {
  const missingWords = verse.blanks.reduce((n, b) => n + b.answerWords.length, 0);
  return BASE_SECONDS + missingWords * SECONDS_PER_MISSING_WORD;
}

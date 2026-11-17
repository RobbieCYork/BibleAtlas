// A conservative client-side filter for text people publish: posts, comments, messages, group names,
// display names. It exists because Apple guideline 1.2 and Google's user-generated-content policy ask
// for "a method for filtering objectionable material from being posted", on top of report / block.
//
// Deliberately NARROW. It blocks slurs and the strongest profanity, nothing else, so it does not
// insult someone writing about Scripture (the Bible says "cock crowed", "damn", "hell", "rape",
// "harlot", "whore"-adjacent words in commentary on Hosea, and people are named Dick, Cummings and
// Scunthorpe). It is not a substitute for report / block / the moderation queue, and it does not
// stop a determined person: it stops the casual, and it gives the app a pre-post filter to point to.
//
// TO EXTEND: add a lowercase word to BLOCKED_WORDS. Matching is on whole words after normalising
// (case, accents, look-alike digits and symbols, stretched letters), so "fuuuck", "f.u.c.k" and
// "fvck" are caught and "Scunthorpe" is not. Add to BLOCKED_PHRASES for multi-word phrases. A word
// that is also a real name or a Bible word belongs nowhere in these lists.
//
// The server does NOT run this. A person calling the API directly bypasses it; that gap is what the
// report / block / moderation-queue path (sql/028) is for.

/** Whole words that are not allowed. Lowercase. Kept to slurs and the strongest profanity. */
export const BLOCKED_WORDS: readonly string[] = [
  // racial and ethnic slurs
  "nigger", "nigga", "niggers", "niggas", "kike", "kikes", "spic", "spics", "chink", "chinks", "gook", "gooks",
  "wetback", "wetbacks", "beaner", "beaners", "coon", "coons", "paki", "pakis",
  // other slurs
  "faggot", "faggots", "fag", "fags", "tranny", "trannies", "retard", "retards", "retarded",
  // strongest profanity and explicit terms
  "fuck", "fucks", "fucker", "fuckers", "fucking", "fucked", "motherfucker", "motherfuckers", "motherfucking",
  "cunt", "cunts", "bitch", "bitches", "asshole", "assholes", "shit", "shits", "shitty",
  "bullshit", "slut", "sluts", "blowjob", "blowjobs", "handjob", "cumshot", "jizz",
  "pussy", "pussies", "dildo", "dildos", "porn", "porno", "pornhub", "xxx",
];

/** Multi-word phrases (normalised, single spaces). */
export const BLOCKED_PHRASES: readonly string[] = ["kill yourself", "kys", "go die", "hang yourself", "heil hitler"];

/** The subset safe to also look for with the letters spread out ("f u c k"). Long and unambiguous only. */
const SPACED_OUT_WORDS: readonly string[] = ["nigger", "nigga", "faggot", "fuck", "motherfucker", "cunt", "bitch"];

const LOOKALIKES: Record<string, string> = { "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t", "+": "t", "8": "b", "v": "v" };

/** Lowercase, strip accents, map look-alikes (but only when sitting inside a word), collapse stretched letters. */
function normalise(input: string): string {
  let s = input.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // A look-alike counts only when it touches a letter: "100" and "3:16" and "!!!" stay as they are.
  s = s.replace(/[01!|3@4$5+78]/g, (ch, offset: number, whole: string) => {
    const prev = whole[offset - 1] ?? " ";
    const next = whole[offset + 1] ?? " ";
    return /[a-z]/.test(prev) || /[a-z]/.test(next) ? LOOKALIKES[ch] ?? ch : ch;
  });
  s = s.replace(/'/g, "");
  // "fuuuck" -> "fuck", "shiiit" -> "shit": runs of the same letter collapse to one.
  return s.replace(/([a-z])\1+/g, "$1");
}

const collapse = (w: string) => normalise(w);
const BLOCKED_SET = new Set(BLOCKED_WORDS.map(collapse));
const PHRASES = BLOCKED_PHRASES.map((p) => normalise(p).replace(/\s+/g, " "));
const SPACED = SPACED_OUT_WORDS.map(collapse);

/** Returns the first blocked term found, or null. Exported for tests and for admin tooling. */
export function findBlockedTerm(text: string): string | null {
  if (!text) return null;
  const n = normalise(text);
  const tokens = n.split(/[^a-z]+/).filter(Boolean);
  for (const t of tokens) if (BLOCKED_SET.has(t)) return t;
  const spaced = n.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ");
  const padded = ` ${spaced} `;
  for (const p of PHRASES) if (padded.includes(` ${p} `)) return p;
  // Letters spread out with separators: f.u.c.k  /  f u c k  /  f-u-c-k
  const runs = n.match(/(?:^|[^a-z])((?:[a-z][\s._\-*]+){2,}[a-z])(?=$|[^a-z])/g) ?? [];
  for (const run of runs) {
    const squashed = run.replace(/[^a-z]/g, "");
    if (SPACED.includes(squashed)) return squashed;
  }
  return null;
}

export interface FilterResult {
  ok: boolean;
  /** A message to show the person, set when ok is false. */
  message?: string;
}

const WHERE: Record<"text" | "name", string> = {
  text: "That includes language that isn't allowed in Capstone Bible. Please reword it, and thank you for helping keep this a welcoming place for everyone.",
  name: "That name includes language that isn't allowed in Capstone Bible. Please choose a different one.",
};

/** Check text a person is about to publish. `kind` picks the wording of the message. */
export function checkContent(text: string, kind: "text" | "name" = "text"): FilterResult {
  return findBlockedTerm(text) ? { ok: false, message: WHERE[kind] } : { ok: true };
}

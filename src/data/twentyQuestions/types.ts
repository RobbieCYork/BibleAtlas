import type { GameArticleTarget } from "../../lib/gameArticles";

export type TQCategory = "people" | "places" | "things";

/** "unknown" is shown to the reader as "Not stated": Scripture (or the app's home position) does
 * not settle it, so neither Yes nor No would be true. */
export type TQAnswer = "yes" | "no" | "unknown";

export interface TQEntry {
  id: string;
  name: string;
  /** The one verse shown in the reveal. Its WEB text is in twentyQuestionsVerses.ts (generated). */
  ref: string;
  /** Words that must occur in `ref` in the WEB, KJV and ASV (any one per translation) — checked by
   * scripts/games-data/twenty-questions.mjs. Defaults to the first word of `name`. */
  keywords?: string[];
  /** The article the reveal opens, and the name its link shows ("Read about …"). People and places
   * default to their own record (same id, same name). */
  article?: (GameArticleTarget & { label: string }) | null;
}

export interface TQQuestion {
  id: string;
  group: string;
  text: string;
  /** Entry ids for which the answer is Yes. Everyone not listed in `yes` or `unknown` is No. */
  yes: string[];
  /** Entry ids for which the answer is Not stated. */
  unknown?: string[];
}

export interface TQSet {
  category: TQCategory;
  label: string;
  /** "person", "place", "thing" — for "Guess the …". */
  noun: string;
  entries: TQEntry[];
  /** Display order of the question groups. */
  groups: string[];
  questions: TQQuestion[];
}

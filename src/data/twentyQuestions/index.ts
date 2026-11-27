import { PEOPLE } from "./people";
import { PLACES } from "./places";
import { THINGS } from "./things";
import type { TQAnswer, TQCategory, TQQuestion, TQSet } from "./types";

export type { TQAnswer, TQCategory, TQEntry, TQQuestion, TQSet } from "./types";

export const TQ_SETS: Record<TQCategory, TQSet> = { people: PEOPLE, places: PLACES, things: THINGS };

/** The answer to one question for one entry: listed in `yes`, listed in `unknown`, or No. */
export function answerFor(question: TQQuestion, entryId: string): TQAnswer {
  if (question.yes.includes(entryId)) return "yes";
  if (question.unknown?.includes(entryId)) return "unknown";
  return "no";
}

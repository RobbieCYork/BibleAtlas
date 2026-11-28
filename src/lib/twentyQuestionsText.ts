import type { IconName } from "../components/Icon";
import type { TQAnswer, TQCategory } from "../data/twentyQuestions";

/* Words and choices shared by solo 20 Questions (TwentyQuestionsView) and the multiplayer room
 * (TwentyQuestionsMultiplayerView, TwentyQuestionsRoomPlay), so both say exactly the same thing. */

export type Choice = TQCategory | "any";

export const CHOICES: { key: Choice; label: string; description: string; icon: IconName }[] = [
  { key: "people", label: "People", description: "Someone from the Old or New Testament.", icon: "people" },
  { key: "places", label: "Places", description: "A city, region, sea, river, mountain or island on the map.", icon: "place" },
  { key: "things", label: "Things", description: "An object, animal, plant, food or structure in a Bible story.", icon: "archaeology" },
  { key: "any", label: "Surprise me", description: "Any of the three — you'll be told which.", icon: "target" },
];

export const ANSWER_LABEL: Record<TQAnswer, string> = { yes: "Yes", no: "No", unknown: "Not stated" };
export const ANSWER_ICON: Record<TQAnswer, string> = { yes: "✓", no: "✕", unknown: "–" };

/** "The burning bush" reads "the burning bush" inside a sentence. */
export const inSentence = (name: string) => name.replace(/^The /, "the ");

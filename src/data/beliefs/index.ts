import type { Topic, TopicSection } from "../types";
import type { BeliefRecord, BeliefSourceKind } from "./types";
import { christianTraditions } from "./denominations";
import { worldReligions } from "./religions";

/** Every record in the Religions and Denominations section, world religions first. */
export const beliefRecords: BeliefRecord[] = [...worldReligions, ...christianTraditions];

export const SECTION_TITLE = "Religions and Denominations";

export const AREA_LABELS: Record<BeliefRecord["area"], string> = {
  "world-religion": "World Religions and Worldviews",
  "christian-tradition": "Christian Traditions and Denominations",
};

/** How each kind of source is named to the reader, so a church's own confession and a survey do not
 * arrive looking like the same kind of evidence. */
export const SOURCE_KIND_LABELS: Record<BeliefSourceKind, string> = {
  official: "Official",
  primary: "Primary text",
  scholarly: "Scholarship",
  data: "Survey / statistics",
  reference: "Reference",
  encyclopedic: "Encyclopedia",
};

const section = (heading: string, paragraphs: string[] | undefined): TopicSection[] =>
  paragraphs && paragraphs.length > 0 ? [{ heading, paragraphs }] : [];

/**
 * A BeliefRecord rendered into the Topic shape, so the article opens in the existing TopicPanel and
 * inherits everything a topic already has: read tracking (kind "topic"), report-a-problem (kind
 * "topic"), unified search and the Articles page. The structured record rides along on `belief`
 * for the facts block and the classification notice.
 *
 * The section order is the template: description first, the app's own assessment second to last,
 * and the tradition's reply to it last, so the reply is always the final word.
 */
export function beliefToTopic(b: BeliefRecord): Topic {
  const sections: TopicSection[] = [
    ...section("How it describes itself", [b.selfDescription]),
    ...section("What makes it distinctive", b.distinctives),
    ...section(
      "Basic beliefs",
      b.beliefs.map((p) => `${p.label}: ${p.statement}`),
    ),
    ...section("How it understands Jesus", b.viewOfJesus),
    ...section("Worship and practice", b.practices),
    ...section("Structure and major branches", b.structure),
    ...section("Relationship to related groups", b.relationships),
    ...section("A Protestant evangelical view: where we agree", b.evangelicalView.agreements),
    ...section("A Protestant evangelical view: where we differ", b.evangelicalView.disagreements),
    ...section("Where evangelicals differ among themselves", b.evangelicalView.evangelicalsDiffer),
    ...section(`How ${b.name.startsWith("The ") ? b.name.charAt(0).toLowerCase() + b.name.slice(1) : b.name} would answer`, b.ownAnswer),
  ];
  return {
    id: b.id,
    name: b.name,
    alternateNames: b.alternateNames,
    category: b.area,
    role: b.role,
    summary: b.summary,
    sections,
    verses: b.verses ?? [],
    belief: b,
  };
}

/** The section's articles in Topic form — joined onto `topics` in App.tsx for the panel, the
 * Articles page and unified search. Deliberately NOT part of `topics` in topics.ts, which feeds the
 * name auto-linker: see the note at the top of ./types.ts. */
export const beliefTopics: Topic[] = beliefRecords.map(beliefToTopic);

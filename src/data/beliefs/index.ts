import type { Topic, TopicSection } from "../types";
import type { BeliefPoint, BeliefRecord, BeliefSourceKind } from "./types";
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

/** The inline "Scripture cited by ..." sentence after a belief, or nothing. The references are
 * written out in full so LinkedVerseText (app) and ctx.linkify (public pages) turn each one into a
 * verse link, the same as a reference anywhere else in an article. */
const scriptureNote = (p: BeliefPoint): string =>
  p.scripture && p.scripture.refs.length > 0
    ? ` Scripture cited by ${p.scripture.citedIn}: ${p.scripture.refs.join("; ")}.`
    : "";

const section = (heading: string, paragraphs: string[] | undefined): TopicSection[] =>
  paragraphs && paragraphs.length > 0 ? [{ heading, paragraphs }] : [];

/**
 * A BeliefRecord rendered into the Topic shape, so the article opens in the existing TopicPanel and
 * inherits everything a topic already has: read tracking (kind "topic"), report-a-problem (kind
 * "topic"), unified search and the Articles page. The structured record rides along on `belief`
 * for the facts block and the classification notice.
 *
 * The section order is the template: the app's own evangelical framing first, so a reader knows
 * from the start where the article stands; then the tradition described in its own terms; then the
 * full evangelical assessment; and the tradition's reply to it last, so it is answered fairly.
 */
export function beliefToTopic(b: BeliefRecord): Topic {
  const sections: TopicSection[] = [
    ...section("From a Protestant evangelical perspective", [b.evangelicalFraming]),
    ...section("How it describes itself", [b.selfDescription]),
    ...section("What makes it distinctive", b.distinctives),
    ...section(
      "Basic beliefs",
      b.beliefs.map((p) => `${p.label}: ${p.statement}${scriptureNote(p)}`),
    ),
    ...section("How it understands Jesus", b.viewOfJesus),
    ...section("Worship and practice", b.practices),
    ...section("Structure and major branches", b.structure),
    ...section("Relationship to related groups", b.relationships),
    ...section("A Protestant evangelical view: where we agree", b.evangelicalView.agreements),
    ...section("A Protestant evangelical view: where we differ", b.evangelicalView.disagreements),
    ...section("Where evangelicals differ among themselves", b.evangelicalView.evangelicalsDiffer),
    ...section(`How ${b.answeredBy} would answer`, b.ownAnswer),
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

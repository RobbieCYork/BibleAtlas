/**
 * Religions and Denominations — the shared record shape.
 *
 * One interface for both groups on the Articles page ("World Religions and Worldviews" and
 * "Christian Traditions and Denominations"), so the two halves of the section are written to the
 * same template and render through the same panel. Records live in:
 *
 *   src/data/beliefs/religions.ts      export const worldReligions: BeliefRecord[]
 *   src/data/beliefs/denominations.ts  export const christianTraditions: BeliefRecord[]
 *
 * Editorial rules this shape exists to enforce (see automation/manager/beliefs-scope.md §1 and the
 * master prompt's editorial position):
 *
 *  - DESCRIPTION AND ASSESSMENT ARE SEPARATE FIELDS. Every field except `evangelicalView` describes
 *    the tradition in terms its own members would recognise, from its own official or primary
 *    sources. The app's Protestant evangelical assessment lives in `evangelicalView` and nowhere
 *    else, and `ownAnswer` gives the tradition its reply in the same article.
 *  - NEVER INVENT A FIGURE. `adherents.verified` is false whenever the number could not be
 *    confirmed against the cited source on the day it was written; the panel says so to the reader.
 *  - THE WORD "CULT" IS NOT USED, anywhere in this section.
 *  - These records are NOT registered with the name auto-linker (lib/verseAnnotations.ts). The
 *    names collide with Scripture ("Nazarene", "Pentecost", "catholic", "Baptist"), so nothing in
 *    here may be added to `topics` or to NAME_ENTRIES. Cross-links between articles go through
 *    `relatedIds`, written by hand.
 *  - Paragraph strings ARE run through the linker when rendered, so names of biblical people and
 *    places in them become links. Write full names ("Martin Luther", "John Wesley"); a bare
 *    forename like "John" will link to the wrong John.
 */

import type { VerseRef } from "../types";

export type BeliefArea = "world-religion" | "christian-tradition";

/** What kind of evidence a source is. Listed so a reader can tell a church's own confession from a
 * survey or an encyclopedia at a glance. Order sources official/primary first. */
export type BeliefSourceKind =
  /** The body's own website, constitution, statement of faith, catechism or yearbook. */
  | "official"
  /** A historic primary text: a creed, a confession, a founder's own writing. */
  | "primary"
  /** Peer-reviewed or university-press scholarship. */
  | "scholarly"
  /** A survey or statistical body: Pew Research Center, a national census, a denominational
   * statistics office reporting through a third party. */
  | "data"
  /** Reputable reference or popular writing: Britannica, Christian History Magazine. */
  | "reference"
  /** Wikipedia. Allowed as further reading, never as the only support for a claim. */
  | "encyclopedic";

export interface BeliefSource {
  kind: BeliefSourceKind;
  label: string;
  url: string;
  /** Optional clause shown after the label — "official statement of faith, 2000 revision". */
  note?: string;
}

export interface BeliefFounding {
  /**
   * Who founded it, written for a reader. Say plainly when there is no single founder
   * ("No single founder: ...") and attribute traditional accounts as traditional ("By Catholic
   * tradition, founded by Christ on the apostle Peter (Matthew 16:18)").
   */
  founders: string;
  /** "single" | "several" | "none" — drives nothing yet but lets a chart or filter be honest later. */
  founderKind: "single" | "several" | "none";
  /** Founding date as written for a reader: "1517 (Ninety-five Theses)", "1845, Augusta, Georgia". */
  date: string;
  /** Where the date is a convention or disputed, say why. */
  dateNote?: string;
  place?: string;
}

export interface BeliefAdherents {
  /** The number as a reader should see it: "about 1.4 billion", "12.7 million (2024)". */
  figure: string;
  /** What exactly is being counted: "baptized Catholics", "members on the rolls", "people who
   * self-identify as ...". Different bodies count different things; never compare across them
   * without saying so. */
  counts: string;
  /** The year the figure describes (not the year it was published, if they differ — say so in note). */
  year: string;
  source: { label: string; url: string };
  /** False when the figure could NOT be confirmed against the cited source when written. The panel
   * shows an "unverified" marker; a fact check must clear it before it ships. */
  verified: boolean;
  /** Caveats, competing estimates, how the body's own count differs from surveys. */
  note?: string;
}

export interface BeliefPoint {
  /** Short label: "Scripture", "Salvation", "Baptism", "The Lord's Supper". */
  label: string;
  /** Stated as the tradition states it. */
  statement: string;
}

export interface BeliefRecord {
  /** URL-permanent once published (public page at /religion/<id>). Never derive from the name. */
  id: string;
  name: string;
  /** Shown to the reader as "Also called: ..." and used by search. */
  alternateNames?: string[];
  area: BeliefArea;
  /** Sub-group inside the area, shown on the article: "Reformation churches", "Eastern Christianity",
   * "Movements from a Christian background", "Abrahamic religions", "Worldviews". */
  group: string;
  /** Short tag under the name in lists: "Protestant denomination (Baptist)". */
  role: string;
  /** One or two sentences, descriptive. */
  summary: string;
  /** How the body describes itself, close to its own words, cited in `sources`. */
  selfDescription: string;
  /**
   * Visible notice about where the app files this record and why, where a reasonable adherent would
   * dispute the filing. MANDATORY for the Latter-day Saints and Jehovah's Witnesses (Robbie,
   * 2026-09-09): state the criterion and the body's own published teaching that produced it, state
   * that members identify as Christian, and say the filing is the app's editorial judgement.
   */
  classificationNote?: string;
  founding: BeliefFounding;
  adherents: BeliefAdherents;
  /** What makes it distinctive — paragraphs. */
  distinctives: string[];
  /** Basic beliefs. Aim for 6-10 points. */
  beliefs: BeliefPoint[];
  /** Worship and practice — paragraphs. */
  practices: string[];
  /** Structure, governance and major branches — paragraphs. */
  structure: string[];
  /** Relationship to related groups — paragraphs. */
  relationships: string[];
  /** Optional, world religions mainly: how this tradition understands Jesus. */
  viewOfJesus?: string[];
  /**
   * The ONLY assessment field. Written from a Protestant evangelical position, fairly and
   * respectfully. `evangelicalsDiffer` names where evangelicals themselves disagree.
   */
  evangelicalView: {
    agreements: string[];
    disagreements: string[];
    evangelicalsDiffer?: string[];
  };
  /** How the tradition itself would answer the evangelical disagreements — paragraphs. */
  ownAnswer: string[];
  /** Official and primary sources first. Minimum four, at least two official/primary. */
  sources: BeliefSource[];
  /** Optional Scripture references the article turns on. Must be verified, not recalled. */
  verses?: VerseRef[];
  /** Ids of other BeliefRecords, for hand-written cross-links. */
  relatedIds?: string[];
}

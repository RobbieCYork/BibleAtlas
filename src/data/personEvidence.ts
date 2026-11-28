import type { Person } from "./types";

/**
 * Whether a person article carries a "Historical / Extra-Biblical Evidence" section at all. The app
 * (PersonPanel) and the public pages (scripts/seo/render.mjs, through loadData) both ask here, so
 * the rule lives in this one place.
 *
 * Two conditions, both required:
 *
 *  1. NOT A MODERN PERSON. The section answers whether, or how, we know of someone from outside the
 *     Bible or from their own time. For the printing era onwards that is not a question anyone is
 *     asking, so it is hidden even where the record has entries (Robbie, 2026-11-28). The cut-off is
 *     by date: died after AD 1500, or, with no death year (living), born after AD 1500. A record with
 *     no years at all is not modern; those are biblical figures. The entries stay in people.ts.
 *
 *  2. THE RECORD SAYS SOMETHING. At least one evidence entry, or a note written for that person
 *     (`noExtraBiblicalRecordNote`). There is no default sentence: an empty field is a gap in our
 *     data, not a finding about history, and must never be printed as one.
 */
export const EVIDENCE_CUTOFF_YEAR = 1500;

type PersonDates = Pick<Person, "bornYear" | "diedYear">;

export function isModernPerson(person: PersonDates): boolean {
  const year = person.diedYear ?? person.bornYear;
  return year !== undefined && year > EVIDENCE_CUTOFF_YEAR;
}

export function showsHistoricalEvidence(
  person: PersonDates & Pick<Person, "extraBiblicalReferences" | "noExtraBiblicalRecordNote">
): boolean {
  if (isModernPerson(person)) return false;
  return (person.extraBiblicalReferences?.length ?? 0) > 0 || Boolean(person.noExtraBiblicalRecordNote?.trim());
}

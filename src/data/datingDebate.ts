/** The short note a reader sees beside every date the app takes from a young-earth reading of
 * Genesis' genealogies (Ussher's chronology: Creation c. 4004 BC, the Flood c. 2348 BC, and the
 * Primeval History dates reckoned from them).
 *
 * Robbie, 2026-11-28, on whether to keep those dates: "Keep but include notes on the debate and
 * argument for old earth creationism". So the dates stay exactly as they are, and every record that
 * carries one sets `youngEarthDate: true` (TimelineEvent and Person in types.ts). The note is shown
 * wherever that date is: the event and person panels, the public /event and /person pages
 * (scripts/seo/render.mjs), the Chronology game's reveal and the trivia year question's reveal. It
 * points at one fuller treatment, the topic below, so the argument is made once and kept in one
 * place.
 *
 * The flag is for dates that depend on reading Genesis 5 and 11 as an unbroken chain. Abraham and
 * later are reckoned from 1 Kings 6:1 and Exodus 12:40, which old-earth evangelicals do not dispute
 * on this ground, so they do not carry it. */

/** The topic that makes the case for each view. A Topic id in topics.ts. */
export const AGE_OF_EARTH_TOPIC_ID = "young-earth-old-earth-creationism";

/** Its display name, as the note's link text. */
export const AGE_OF_EARTH_TOPIC_NAME = "Young Earth and Old Earth Creationism";

/** The compact label: the Chronology game's reveal marker and the panel's lead-in. */
export const YOUNG_EARTH_DATE_LABEL = "Young-earth date";

/** One or two sentences, shown with a link to the topic after them. */
export const YOUNG_EARTH_DATE_NOTE =
  "This date follows a young-earth reading of Genesis, adding up the ages in its genealogies as Archbishop James Ussher did in 1650. Evangelicals differ: old-earth creationists read the creation days and the genealogies differently and date creation far earlier.";

import {
  AGE_OF_EARTH_TOPIC_ID,
  AGE_OF_EARTH_TOPIC_NAME,
  YOUNG_EARTH_DATE_LABEL,
  YOUNG_EARTH_DATE_NOTE,
} from "../data/datingDebate";

/** The short note under a young-earth date (src/data/datingDebate.ts), shown in the event and person
 * panels. The link opens the topic that argues each side, through the panel's own onSelectTopic, so
 * the reader's back trail is the one every other auto-linked mention uses. */
export default function YoungEarthDateNote({ onSelectTopic }: { onSelectTopic: (id: string) => void }) {
  return (
    <p className="young-earth-date-note">
      <strong>{YOUNG_EARTH_DATE_LABEL}.</strong> {YOUNG_EARTH_DATE_NOTE}{" "}
      <button type="button" className="verse-location-link" onClick={() => onSelectTopic(AGE_OF_EARTH_TOPIC_ID)}>
        Read the case for each view: {AGE_OF_EARTH_TOPIC_NAME}
      </button>
    </p>
  );
}

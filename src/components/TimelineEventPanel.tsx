import type { TimelineEvent, TimelineEventCategory, TimelineDateCertainty } from "../data/types";
import LinkedVerseText from "./LinkedVerseText";
import BackButton from "./BackButton";

interface TimelineEventPanelProps {
  event: TimelineEvent | null;
  /** Present only when there's somewhere to go back to (i.e. this panel was reached by clicking a
   * cross-link from another person/place/topic/event's details) — renders a "Back" button when set. */
  onBack?: () => void;
  onSelectVerse?: (reference: string) => void;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onSelectTopic: (id: string) => void;
  onSelectTimelineEvent: (id: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
}

const CATEGORY_LABELS: Record<TimelineEventCategory, string> = {
  biblical: "Biblical History",
  world: "World History",
  religion: "World Religions",
};

/** Small badge shown beside the date whenever it isn't firmly established — "firm" gets no badge,
 * so anchored dates read plainly and everything else is visibly qualified. */
const CERTAINTY_BADGES: Record<TimelineDateCertainty, string | null> = {
  firm: null,
  traditional: "traditional date",
  disputed: "date disputed — see note",
  legendary: "legendary — see note",
};

export default function TimelineEventPanel({
  event,
  onBack,
  onSelectVerse,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectTopic,
  onSelectTimelineEvent,
  expand,
  style,
}: TimelineEventPanelProps) {
  if (!event) return null;

  const certaintyBadge = CERTAINTY_BADGES[event.dateCertainty];
  // Article paragraphs are blank-line separated (see TimelineEvent.article in types.ts).
  const paragraphs = event.article
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hasReferences = (event.scriptureRefs?.length ?? 0) > 0 || (event.externalRefs?.length ?? 0) > 0;
  /** Shared by every LinkedVerseText below — the same auto-link mechanism the other detail panels
   * use, so people/places/topics/events mentioned in the text link automatically. */
  const linkHandlers = {
    onSelectLocation,
    onSelectPoi,
    onSelectPerson,
    onSelectTopic,
    onSelectTimelineEvent,
    onSelectVerse,
    excludeId: event.id,
  };

  return (
    <div className={`location-panel person-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      {onBack && (
        <div className="panel-back-row">
          <BackButton onClick={onBack} />
        </div>
      )}
      <span className="category-badge person-badge">{event.era}</span>
      <h2>{event.title}</h2>
      <p className="alt-names">
        {event.dateLabel}
        {certaintyBadge && <span className="person-tier-tag">{certaintyBadge}</span>}
      </p>
      <p className="person-summary">{event.summary}</p>
      <span className="person-tier-tag">{CATEGORY_LABELS[event.category]}</span>

      <div className="history-section">
        <div className="history-field">
          {paragraphs.map((paragraph, pi) => (
            <p key={pi}>
              <LinkedVerseText text={paragraph} {...linkHandlers} />
            </p>
          ))}
        </div>

        {event.datingNotes && (
          <div className="history-field">
            <h4>Dating</h4>
            <p>
              <LinkedVerseText text={event.datingNotes} {...linkHandlers} />
            </p>
          </div>
        )}
      </div>

      {hasReferences && (
        <div className="sources-section">
          <h4>References</h4>
          <ul>
            {(event.scriptureRefs ?? []).map((ref) => (
              <li key={ref}>
                {onSelectVerse ? (
                  <button type="button" className="verse-location-link" onClick={() => onSelectVerse(ref)}>
                    {ref}
                  </button>
                ) : (
                  ref
                )}
              </li>
            ))}
            {(event.externalRefs ?? []).map((ref) =>
              /^https?:\/\//.test(ref) ? (
                <li key={ref}>
                  <a href={ref} target="_blank" rel="noopener noreferrer">
                    {ref}
                  </a>
                </li>
              ) : (
                <li key={ref}>{ref}</li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

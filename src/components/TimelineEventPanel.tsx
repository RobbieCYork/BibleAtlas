import type { TimelineEvent, TimelineEventCategory, TimelineDateCertainty } from "../data/types";
import { timelineEvents } from "../data/timelineEvents";
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
  church: "Church History",
  world: "World History",
  movement: "Movements & Revivals",
  religion: "World Religions",
};

/** Small badge shown beside the date whenever it isn't firmly established — "firm" gets no badge,
 * so anchored dates read plainly and everything else is visibly qualified. */
/** Every event that names `id` in its own `collapsedInto` — i.e. the members a spanning entry
 * stands in for on the timeline canvas (see canvasEvents in TimelineView.tsx), in date order.
 *
 * Derived, never hand-maintained: membership lives in exactly one place (the members' own
 * `collapsedInto`), so adding, removing or re-pointing a member updates this list for free and the
 * article can never drift out of step with what the canvas actually hides. Generic by construction
 * too — no event id appears here, so any future spanning entry gets the same index automatically.
 *
 * This matters because the members have no mark of their own on the timeline at any zoom: for a
 * reader who tapped the one mark drawn for AD 27-30, this list IS the way into the twenty-seven
 * articles it covers. */
function collapsedMembersOf(id: string): TimelineEvent[] {
  const index = new Map(timelineEvents.map((e, i) => [e.id, i]));
  return timelineEvents
    .filter((e) => e.collapsedInto === id)
    // Year first, then the order the events are written in timelineEvents.ts. The second half is
    // load-bearing, not a stable-sort formality: a dozen of these share a single year (all of
    // Passion Week is AD 30), and any tiebreak on the data itself — title, endYear — puts the
    // Resurrection before the Crucifixion. The source array is authored in narrative order, so it
    // is the only sequence within a year that reads correctly.
    .sort((a, b) => a.startYear - b.startYear || (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));
}

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
  // Empty for the overwhelming majority of events — only a spanning entry has members.
  const collapsedMembers = collapsedMembersOf(event.id);
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

        {/* The index of everything this entry stands in for. Each row opens that event's own full
            article through the same onSelectTimelineEvent the auto-linked mentions in the prose
            above use, so the caller's existing back trail (goBackInDetails in the Details column,
            the overlay's own Back inside Timeline mode) carries the reader home unchanged. */}
        {collapsedMembers.length > 0 && (
          <div className="history-field">
            <h4>Events in this period</h4>
            <ul>
              {collapsedMembers.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    className="verse-location-link"
                    onClick={() => onSelectTimelineEvent(member.id)}
                  >
                    {member.title}
                  </button>{" "}
                  <span className="ruler-period">{member.dateLabel}</span>
                  <p>{member.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

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

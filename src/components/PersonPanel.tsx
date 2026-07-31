import type { Person, PersonTier } from "../data/types";
import VerseList from "./VerseList";
import LinkedVerseText from "./LinkedVerseText";
import ReflectionPrompt from "./ReflectionPrompt";
import ShareCardButton from "./ShareCardButton";
import ProfileAudioPlayer from "./ProfileAudioPlayer";
import PronunciationAudioButton from "./PronunciationAudioButton";
import BackButton from "./BackButton";
import { personCardSpec, shareFilename } from "../lib/shareCard";

interface PersonPanelProps {
  person: Person | null;
  /** Present only when there's somewhere to go back to (i.e. this panel was reached by clicking a
   * cross-link from another person/place's details) — renders a "Back" button when set. */
  onBack?: () => void;
  onSelectVerse?: (reference: string) => void;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onSelectTopic: (id: string) => void;
  /** Present only for signed-in readers — its absence hides the "Journal this" button on the
   * reflection-prompt card (the prompt itself still shows). */
  onJournalPrompt?: (reference: string, prompt: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
}

const TIER_LABELS: Record<PersonTier, string> = {
  major: "Major Figure",
  significant: "Significant Figure",
  notable: "Notable Figure",
};

/** Small badge shown beside the lifespan whenever it isn't firmly established — same scale and
 * convention as TimelineEventPanel's CERTAINTY_BADGES: "firm" gets no badge, so anchored dates
 * read plainly and everything else is visibly qualified. */
const LIFESPAN_CERTAINTY_BADGES: Record<NonNullable<Person["lifespanCertainty"]>, string | null> = {
  firm: null,
  traditional: "traditional date",
  disputed: "date disputed — see note",
  legendary: "legendary — see note",
};

export default function PersonPanel({
  person,
  onBack,
  onSelectVerse,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectTopic,
  onJournalPrompt,
  expand,
  style,
}: PersonPanelProps) {
  if (!person) return null;

  const lifespanBadge = person.lifespanCertainty ? LIFESPAN_CERTAINTY_BADGES[person.lifespanCertainty] : null;

  return (
    <div className={`location-panel person-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      {onBack && (
        <div className="panel-back-row">
          <BackButton onClick={onBack} />
        </div>
      )}
      <div className="panel-header-row">
        <span className="category-badge person-badge">{person.role}</span>
        <ShareCardButton spec={personCardSpec(person)} filename={shareFilename(person.name)} />
      </div>
      <h2>{person.name}</h2>
      {person.pronunciation && (
        <p className="pronunciation">
          Pronounced: {person.pronunciation}
          <PronunciationAudioButton kind="person" id={person.id} />
        </p>
      )}
      {person.lifespanLabel && (
        <p className="alt-names">
          {person.lifespanLabel}
          {lifespanBadge && <span className="person-tier-tag">{lifespanBadge}</span>}
        </p>
      )}
      {person.alternateNames && person.alternateNames.length > 0 && (
        <p className="alt-names">Also called: {person.alternateNames.join(", ")}</p>
      )}
      <p className="person-summary">{person.summary}</p>
      <span className="person-tier-tag">{TIER_LABELS[person.tier]}</span>

      <ProfileAudioPlayer kind="person" id={person.id} />

      <VerseList verses={person.verses} onSelectVerse={onSelectVerse} />

      {person.reflectionPrompt && (
        <ReflectionPrompt
          prompt={person.reflectionPrompt}
          reference={person.verses[0]?.reference}
          onJournal={onJournalPrompt}
        />
      )}

      <div className="history-section">
        <div className="history-field">
          <h4>Life &amp; Accomplishments</h4>
          {person.lifeStory.map((paragraph, i) => (
            <p key={i}>
              <LinkedVerseText
                text={paragraph}
                onSelectLocation={onSelectLocation}
                onSelectPoi={onSelectPoi}
                onSelectPerson={onSelectPerson}
                onSelectTopic={onSelectTopic}
                onSelectVerse={onSelectVerse}
                excludeId={person.id}
              />
            </p>
          ))}
        </div>

        {person.occupation && (
          <div className="history-field">
            <h4>Occupation</h4>
            <p>{person.occupation}</p>
          </div>
        )}

        {person.placesLived && (
          <div className="history-field">
            <h4>Where They Lived</h4>
            <p>
              <LinkedVerseText
                text={person.placesLived}
                onSelectLocation={onSelectLocation}
                onSelectPoi={onSelectPoi}
                onSelectPerson={onSelectPerson}
                onSelectTopic={onSelectTopic}
                onSelectVerse={onSelectVerse}
                excludeId={person.id}
              />
            </p>
          </div>
        )}

        {person.controversies && person.controversies.length > 0 && (
          <div className="history-field">
            <h4>Controversies &amp; Debates</h4>
            <ul>
              {person.controversies.map((c, i) => (
                <li key={i}>
                  <LinkedVerseText
                    text={c}
                    onSelectLocation={onSelectLocation}
                    onSelectPoi={onSelectPoi}
                    onSelectPerson={onSelectPerson}
                    onSelectTopic={onSelectTopic}
                    onSelectVerse={onSelectVerse}
                    excludeId={person.id}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {person.lifespanDatingNotes && (
          <div className="history-field">
            <h4>Dating</h4>
            <p>
              <LinkedVerseText
                text={person.lifespanDatingNotes}
                onSelectLocation={onSelectLocation}
                onSelectPoi={onSelectPoi}
                onSelectPerson={onSelectPerson}
                onSelectTopic={onSelectTopic}
                onSelectVerse={onSelectVerse}
                excludeId={person.id}
              />
            </p>
          </div>
        )}
      </div>

      <div className="extra-biblical-section">
        <h4>Extra-Biblical Evidence</h4>
        {person.extraBiblicalReferences && person.extraBiblicalReferences.length > 0 ? (
          <ul className="extra-biblical-list">
            {person.extraBiblicalReferences.map((ref, i) => (
              <li key={i} className="extra-biblical-item">
                <p className="extra-biblical-source">
                  {ref.source} <span className="extra-biblical-citation">({ref.citation})</span>
                  {ref.url && (
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="extra-biblical-link">
                      Read the source ↗
                    </a>
                  )}
                </p>
                <p className="extra-biblical-summary">{ref.summary}</p>
                <p className="extra-biblical-reliability">{ref.reliability}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="extra-biblical-none">
            {person.noExtraBiblicalRecordNote ??
              "No known extra-biblical historical record of this person survives — what we know comes from the Bible text alone."}
          </p>
        )}
      </div>

      {person.sources && person.sources.length > 0 && (
        <div className="sources-section">
          <h4>Further Reading</h4>
          <ul>
            {person.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

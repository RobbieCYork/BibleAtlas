import type { Person, PersonTier } from "../data/types";
import VerseList from "./VerseList";
import LinkedVerseText from "./LinkedVerseText";

interface PersonPanelProps {
  person: Person | null;
  onClose: () => void;
  onSelectVerse?: (reference: string) => void;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
}

const TIER_LABELS: Record<PersonTier, string> = {
  major: "Major Figure",
  significant: "Significant Figure",
  notable: "Notable Figure",
};

export default function PersonPanel({
  person,
  onClose,
  onSelectVerse,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  expand,
  style,
}: PersonPanelProps) {
  if (!person) return null;

  return (
    <div className={`location-panel person-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      <button className="panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <span className="category-badge person-badge">{person.role}</span>
      <h2>{person.name}</h2>
      {person.pronunciation && <p className="pronunciation">Pronounced: {person.pronunciation}</p>}
      {person.alternateNames && person.alternateNames.length > 0 && (
        <p className="alt-names">Also called: {person.alternateNames.join(", ")}</p>
      )}
      <p className="person-summary">{person.summary}</p>
      <span className="person-tier-tag">{TIER_LABELS[person.tier]}</span>

      <VerseList verses={person.verses} onSelectVerse={onSelectVerse} />

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
                    onSelectVerse={onSelectVerse}
                    excludeId={person.id}
                  />
                </li>
              ))}
            </ul>
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

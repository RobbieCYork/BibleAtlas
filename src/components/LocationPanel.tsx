import type { Location, LocationCategory } from "../data/types";
import VerseList from "./VerseList";
import LinkedVerseText from "./LinkedVerseText";
import ReflectionPrompt from "./ReflectionPrompt";
import ShareCardButton from "./ShareCardButton";
import ProfileAudioPlayer from "./ProfileAudioPlayer";
import PronunciationAudioButton from "./PronunciationAudioButton";
import BackButton from "./BackButton";
import { placeCardSpec, shareFilename } from "../lib/shareCard";

interface LocationPanelProps {
  location: Location | null;
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

const CATEGORY_LABELS: Record<LocationCategory, string> = {
  city: "City",
  region: "Region",
  province: "Roman Province",
  nation: "Nation",
  sea: "Sea / Lake",
  river: "River",
  mountain: "Mountain",
  island: "Island",
};

export default function LocationPanel({
  location,
  onBack,
  onSelectVerse,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectTopic,
  onJournalPrompt,
  expand,
  style,
}: LocationPanelProps) {
  if (!location) {
    return (
      <div
        className={`location-panel location-panel-empty ${expand ? "panel-expand" : ""}`}
        style={expand ? undefined : style}
      >
        <p>Search or click a pin on the map to see its history and Bible references.</p>
      </div>
    );
  }

  const { history, archaeology } = location;

  return (
    <div className={`location-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      {onBack && (
        <div className="panel-back-row">
          <BackButton onClick={onBack} />
        </div>
      )}
      <div className="panel-header-row">
        <span className="category-badge">{CATEGORY_LABELS[location.category]}</span>
        <ShareCardButton spec={placeCardSpec(location)} filename={shareFilename(location.name)} />
      </div>
      <h2>{location.name}</h2>
      {location.pronunciation && (
        <p className="pronunciation">
          Pronounced: {location.pronunciation}
          <PronunciationAudioButton kind="location" id={location.id} />
        </p>
      )}
      {location.alternateNames && location.alternateNames.length > 0 && (
        <p className="alt-names">Also known as: {location.alternateNames.join(", ")}</p>
      )}
      {location.modernName && <p className="modern-name">Modern location: {location.modernName}</p>}
      <a className="modern-map-link" href={location.modernMapUrl} target="_blank" rel="noopener noreferrer">
        View modern location on Google Maps ↗
      </a>

      <ProfileAudioPlayer kind="location" id={location.id} />

      <VerseList verses={location.verses} onSelectVerse={onSelectVerse} />

      {location.reflectionPrompt && (
        <ReflectionPrompt
          prompt={location.reflectionPrompt}
          reference={location.verses[0]?.reference}
          onJournal={onJournalPrompt}
        />
      )}

      <div className="history-section">
        {history.founded && (
          <div className="history-field">
            <h4>Founded</h4>
            <p>
              <LinkedVerseText
                text={history.founded}
                onSelectLocation={onSelectLocation}
                onSelectPoi={onSelectPoi}
                onSelectPerson={onSelectPerson}
                onSelectTopic={onSelectTopic}
                onSelectVerse={onSelectVerse}
                excludeId={location.id}
              />
            </p>
          </div>
        )}
        {history.population && (
          <div className="history-field">
            <h4>Population</h4>
            <p>
              <LinkedVerseText
                text={history.population}
                onSelectLocation={onSelectLocation}
                onSelectPoi={onSelectPoi}
                onSelectPerson={onSelectPerson}
                onSelectTopic={onSelectTopic}
                onSelectVerse={onSelectVerse}
                excludeId={location.id}
              />
            </p>
          </div>
        )}
        {history.rulers && history.rulers.length > 0 && (
          <div className="history-field">
            <h4>Rulers</h4>
            <ul>
              {history.rulers.map((r) => (
                <li key={r.name}>
                  {r.name} <span className="ruler-period">({r.period})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {history.industry && (
          <div className="history-field">
            <h4>Industry</h4>
            <p>
              <LinkedVerseText
                text={history.industry}
                onSelectLocation={onSelectLocation}
                onSelectPoi={onSelectPoi}
                onSelectPerson={onSelectPerson}
                onSelectTopic={onSelectTopic}
                onSelectVerse={onSelectVerse}
                excludeId={location.id}
              />
            </p>
          </div>
        )}
        {history.notableFacts.length > 0 && (
          <div className="history-field">
            <h4>Notable Facts</h4>
            <ul>
              {history.notableFacts.map((fact, i) => (
                <li key={i}>
                  <LinkedVerseText
                    text={fact}
                    onSelectLocation={onSelectLocation}
                    onSelectPoi={onSelectPoi}
                    onSelectPerson={onSelectPerson}
                    onSelectTopic={onSelectTopic}
                    onSelectVerse={onSelectVerse}
                    excludeId={location.id}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {archaeology && (
        <div className="archaeology-section">
          <h4>Archaeology</h4>
          <p className="archaeology-note">
            <LinkedVerseText
              text={archaeology.note}
              onSelectLocation={onSelectLocation}
              onSelectPoi={onSelectPoi}
              onSelectPerson={onSelectPerson}
              onSelectTopic={onSelectTopic}
              onSelectVerse={onSelectVerse}
              excludeId={location.id}
            />
          </p>
          {archaeology.photos.length > 0 && (
            <div className="archaeology-photos">
              {archaeology.photos.map((photo) => (
                <a
                  key={photo.url}
                  href={photo.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="archaeology-photo"
                  title={photo.caption}
                >
                  <img src={photo.url} alt={photo.caption} loading="lazy" />
                  <span className="archaeology-caption">{photo.caption}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {location.sources && location.sources.length > 0 && (
        <div className="sources-section">
          <h4>Sources</h4>
          <ul>
            {location.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
                {s.note && (
                  <span style={{ color: "var(--text-muted)", fontSize: "0.92em" }}> {s.note}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

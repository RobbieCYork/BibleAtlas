import type { Location, LocationCategory } from "../data/types";
import VerseList from "./VerseList";
import LinkedVerseText from "./LinkedVerseText";

interface LocationPanelProps {
  location: Location | null;
  onClose: () => void;
  onSelectVerse?: (reference: string) => void;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
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
  onClose,
  onSelectVerse,
  onSelectLocation,
  onSelectPoi,
  expand,
  style,
}: LocationPanelProps) {
  if (!location) {
    return (
      <div
        className={`location-panel location-panel-empty ${expand ? "panel-expand" : ""}`}
        style={expand ? undefined : style}
      >
        <button className="panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p>Search or click a pin on the map to see its history and Bible references.</p>
      </div>
    );
  }

  const { history, archaeology } = location;

  return (
    <div className={`location-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      <button className="panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <span className="category-badge">{CATEGORY_LABELS[location.category]}</span>
      <h2>{location.name}</h2>
      {location.pronunciation && <p className="pronunciation">Pronounced: {location.pronunciation}</p>}
      {location.alternateNames && location.alternateNames.length > 0 && (
        <p className="alt-names">Also known as: {location.alternateNames.join(", ")}</p>
      )}
      {location.modernName && <p className="modern-name">Modern location: {location.modernName}</p>}
      <a className="modern-map-link" href={location.modernMapUrl} target="_blank" rel="noopener noreferrer">
        View modern location on Google Maps ↗
      </a>

      <VerseList verses={location.verses} onSelectVerse={onSelectVerse} />

      <div className="history-section">
        {history.founded && (
          <div className="history-field">
            <h4>Founded</h4>
            <p>
              <LinkedVerseText
                text={history.founded}
                onSelectLocation={onSelectLocation}
                onSelectPoi={onSelectPoi}
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

      <VerseList verses={location.verses} onSelectVerse={onSelectVerse} />

      {location.sources && location.sources.length > 0 && (
        <div className="sources-section">
          <h4>Sources</h4>
          <ul>
            {location.sources.map((s) => (
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

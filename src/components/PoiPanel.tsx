import type { PointOfInterest } from "../data/types";
import LinkedVerseText from "./LinkedVerseText";

interface PoiPanelProps {
  poi: PointOfInterest | null;
  onClose: () => void;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
}

export default function PoiPanel({ poi, onClose, onSelectLocation, onSelectPoi, expand, style }: PoiPanelProps) {
  if (!poi) return null;

  return (
    <div className={`location-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      <button className="panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <span className="category-badge poi-badge">{poi.tag}</span>
      <h2>{poi.name}</h2>
      {poi.pronunciation && <p className="pronunciation">Pronounced: {poi.pronunciation}</p>}
      {poi.modernName && <p className="modern-name">Modern location: {poi.modernName}</p>}
      <a className="modern-map-link" href={poi.modernMapUrl} target="_blank" rel="noopener noreferrer">
        View modern location on Google Maps ↗
      </a>

      <div className="history-section">
        <div className="history-field">
          <p>
            <LinkedVerseText
              text={poi.description}
              onSelectLocation={onSelectLocation}
              onSelectPoi={onSelectPoi}
              excludeId={poi.id}
            />
          </p>
        </div>
      </div>

      <div className="archaeology-section">
        <h4>Archaeology</h4>
        <p className="archaeology-note">
          <LinkedVerseText
            text={poi.archaeology.note}
            onSelectLocation={onSelectLocation}
            onSelectPoi={onSelectPoi}
            excludeId={poi.id}
          />
        </p>
        {poi.archaeology.photos.length > 0 && (
          <div className="archaeology-photos">
            {poi.archaeology.photos.map((photo) => (
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

      {poi.sources && poi.sources.length > 0 && (
        <div className="sources-section">
          <h4>Sources</h4>
          <ul>
            {poi.sources.map((s) => (
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

import type { PointOfInterest } from "../data/types";
import LinkedVerseText from "./LinkedVerseText";
import ReflectionPrompt from "./ReflectionPrompt";
import ShareCardButton from "./ShareCardButton";
import ProfileAudioPlayer from "./ProfileAudioPlayer";
import PronunciationAudioButton from "./PronunciationAudioButton";
import ArticleHeader from "./ArticleHeader";
import Icon from "./Icon";
import { placeCardSpec, shareFilename } from "../lib/shareCard";

interface PoiPanelProps {
  poi: PointOfInterest | null;
  /** Present only when there's somewhere to go back to (i.e. this panel was reached by clicking a
   * cross-link from another person/place's details) — renders a "Back" button when set. */
  onBack?: () => void;
  /** Desktop only — App.tsx withholds it on mobile, where the article is a full tab reached from
   * the bottom bar and Back already returns the reader to the tab they came from. Renders the
   * shared close control (CloseButton.tsx) in the top right of the back row. */
  onClose?: () => void;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onSelectTopic: (id: string) => void;
  onSelectVerse?: (reference: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
}

export default function PoiPanel({
  poi,
  onBack,
  onClose,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectTopic,
  onSelectVerse,
  expand,
  style,
}: PoiPanelProps) {
  if (!poi) return null;

  return (
    <div className={`location-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      <ArticleHeader
        title={poi.name}
        subtitle={poi.tag}
        onBack={onBack}
        onClose={onClose}
        actionCount={1}
        actions={<ShareCardButton spec={placeCardSpec(poi)} filename={shareFilename(poi.name)} className="panel-share panel-share--icon" label={<Icon name="share" inline />} />}
      />
      {poi.pronunciation && (
        <p className="pronunciation">
          Pronounced: {poi.pronunciation}
          <PronunciationAudioButton kind="poi" id={poi.id} />
        </p>
      )}
      {poi.modernName && <p className="modern-name">Modern location: {poi.modernName}</p>}
      <a className="modern-map-link" href={poi.modernMapUrl} target="_blank" rel="noopener noreferrer">
        View modern location on Google Maps ↗
      </a>

      <ProfileAudioPlayer kind="poi" id={poi.id} />

      <div className="history-section">
        <div className="history-field">
          <p>
            <LinkedVerseText
              text={poi.description}
              onSelectLocation={onSelectLocation}
              onSelectPoi={onSelectPoi}
              onSelectPerson={onSelectPerson}
              onSelectTopic={onSelectTopic}
              onSelectVerse={onSelectVerse}
              excludeId={poi.id}
            />
          </p>
        </div>
      </div>

      {/* POIs carry no verse list to anchor a journal note to, so the card is prompt-only here. */}
      {poi.reflectionPrompt && <ReflectionPrompt prompt={poi.reflectionPrompt} />}

      <div className="archaeology-section">
        <h4>Archaeology</h4>
        <p className="archaeology-note">
          <LinkedVerseText
            text={poi.archaeology.note}
            onSelectLocation={onSelectLocation}
            onSelectPoi={onSelectPoi}
            onSelectPerson={onSelectPerson}
            onSelectTopic={onSelectTopic}
            onSelectVerse={onSelectVerse}
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

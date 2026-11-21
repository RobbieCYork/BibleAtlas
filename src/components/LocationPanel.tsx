import type { Location, LocationCategory } from "../data/types";
import VerseList from "./VerseList";
import LinkedVerseText from "./LinkedVerseText";
import ReflectionPrompt from "./ReflectionPrompt";
import ShareCardButton from "./ShareCardButton";
import ProfileAudioPlayer from "./ProfileAudioPlayer";
import PronunciationAudioButton from "./PronunciationAudioButton";
import ArticleHeader from "./ArticleHeader";
import Icon from "./Icon";
import { placeCardSpec, shareFilename } from "../lib/shareCard";
import { ArticleReadCheck, ArticleReadToggle } from "./ArticleReadToggle";
import AddToCollection from "./AddToCollection";
import PaidTeaser from "./PaidTeaser";
import { retryPaidContent, usePaidContent } from "../lib/paidContent";
import { countsOf, placeLead } from "../lib/paidContentSpec";

interface LocationPanelProps {
  location: Location | null;
  /** Present only when there's somewhere to go back to (i.e. this panel was reached by clicking a
   * cross-link from another person/place's details) — renders a "Back" button when set. */
  onBack?: () => void;
  /** Desktop only — App.tsx withholds it on mobile, where the article is a full tab reached from
   * the bottom bar and Back already returns the reader to the tab they came from. Renders the
   * shared close control (CloseButton.tsx) in the top right of the back row. */
  onClose?: () => void;
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
  onClose,
  onSelectVerse,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectTopic,
  onJournalPrompt,
  expand,
  style,
}: LocationPanelProps) {
  // Everything below the Bible references list is Capstone Plus (lib/paidContentSpec.ts). Called
  // before the early return so the hook order never changes.
  const paid = usePaidContent("place", location);
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

  const body = paid.status === "ready" ? paid.body : null;
  const history = body?.history;
  const archaeology = body?.archaeology;
  // The free lead line: an authored `teaser` always shows; the fallback (first notable fact) only
  // stands in when the paid part is not on screen, so an entitled reader sees exactly what they
  // saw before teasers existed.
  const lead = location.teaser ?? (body || paid.status === "loading" ? null : placeLead(location));

  return (
    <div className={`location-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      <ArticleHeader
        title={location.name}
        subtitle={CATEGORY_LABELS[location.category]}
        onBack={onBack}
        onClose={onClose}
        actionCount={1}
        actions={<ShareCardButton spec={placeCardSpec(location)} filename={shareFilename(location.name)} className="panel-share panel-share--icon" label={<Icon name="share" inline />} />}
        titleAdornment={<ArticleReadCheck kind="place" id={location.id} />}
      />
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

      {lead && <p className="person-summary">{lead}</p>}

      <ProfileAudioPlayer kind="location" id={location.id} />

      <VerseList verses={location.verses} onSelectVerse={onSelectVerse} />

      {body && history ? (
      <div className="plus-body" data-tier="plus">
      {body.reflectionPrompt && (
        <ReflectionPrompt
          prompt={body.reflectionPrompt}
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

      {body.sources && body.sources.length > 0 && (
        <div className="sources-section">
          <h4>Sources</h4>
          <ul>
            {body.sources.map((s) => (
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
      ) : (
        <PaidTeaser
          kind="place"
          state={paid.status === "ready" ? "unavailable" : paid.status}
          counts={countsOf("place", location)}
          onRetry={() => retryPaidContent("place", location.id)}
        />
      )}
      <AddToCollection kind="place" refId={location.id} label={location.name} />
      <ArticleReadToggle kind="place" id={location.id} />
    </div>
  );
}

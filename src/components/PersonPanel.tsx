import type { Person } from "../data/types";
import VerseList from "./VerseList";
import LinkedVerseText from "./LinkedVerseText";
import ReflectionPrompt from "./ReflectionPrompt";
import ShareCardButton from "./ShareCardButton";
import ProfileAudioPlayer from "./ProfileAudioPlayer";
import PronunciationAudioButton from "./PronunciationAudioButton";
import ArticleHeader from "./ArticleHeader";
import Icon from "./Icon";
import { personCardSpec, shareFilename } from "../lib/shareCard";
import { ArticleReadCheck, ArticleReadToggle } from "./ArticleReadToggle";
import PaidTeaser from "./PaidTeaser";
import { retryPaidContent, usePaidContent } from "../lib/paidContent";
import { countsOf } from "../lib/paidContentSpec";

interface PersonPanelProps {
  person: Person | null;
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
  onClose,
  onSelectVerse,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectTopic,
  onJournalPrompt,
  expand,
  style,
}: PersonPanelProps) {
  // Everything below the Bible references list is Capstone Plus (lib/paidContentSpec.ts). Called
  // before the early return so the hook order never changes.
  const paid = usePaidContent("person", person);
  if (!person) return null;
  const body = paid.status === "ready" ? paid.body : null;

  const lifespanBadge = person.lifespanCertainty ? LIFESPAN_CERTAINTY_BADGES[person.lifespanCertainty] : null;
  // `kind` is optional and absent means "biblical" — every person carried over from the original
  // Atlas dataset has no `kind` at all. Asking whether the figure IS biblical rather than which
  // non-biblical kind they are keeps "church" and "world" (and anything added later) on the same
  // side of the one distinction the panel actually makes.
  const isBiblical = (person.kind ?? "biblical") === "biblical";

  return (
    <div className={`location-panel person-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      <ArticleHeader
        title={person.name}
        subtitle={person.role}
        onBack={onBack}
        onClose={onClose}
        actionCount={1}
        actions={<ShareCardButton spec={personCardSpec(person)} filename={shareFilename(person.name)} className="panel-share panel-share--icon" label={<Icon name="share" inline />} />}
        titleAdornment={<ArticleReadCheck kind="person" id={person.id} />}
      />
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

      <ProfileAudioPlayer kind="person" id={person.id} />

      <VerseList verses={person.verses} onSelectVerse={onSelectVerse} />

      {/* Church-history figures carry citations from their own writings instead of Bible references
          (see Person.quotes) — rendered as plain text, never as buttons into the Bible panel, since
          "Confessions, Book I" is not a reference that panel can resolve. */}
      {body && body.lifeStory ? (
      <div className="plus-body" data-tier="plus">
      {body.quotes && body.quotes.length > 0 && (
        <div className="verse-list quote-list">
          <h4>In Their Own Words ({body.quotes.length})</h4>
          <ul>
            {body.quotes.map((q) => (
              <li key={q.reference}>
                <span className="verse-ref">{q.reference}</span>
                {q.note && <span className="verse-note"> — {q.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {body.reflectionPrompt && (
        <ReflectionPrompt
          prompt={body.reflectionPrompt}
          reference={person.verses[0]?.reference}
          onJournal={onJournalPrompt}
        />
      )}

      <div className="history-section">
        <div className="history-field">
          <h4>Life &amp; Accomplishments</h4>
          {body.lifeStory.map((paragraph, i) => (
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

        {body.occupation && (
          <div className="history-field">
            <h4>Occupation</h4>
            <p>{body.occupation}</p>
          </div>
        )}

        {body.placesLived && (
          <div className="history-field">
            <h4>Where They Lived</h4>
            <p>
              <LinkedVerseText
                text={body.placesLived}
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

        {body.controversies && body.controversies.length > 0 && (
          <div className="history-field">
            <h4>Controversies &amp; Debates</h4>
            <ul>
              {body.controversies.map((c, i) => (
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

        {body.lifespanDatingNotes && (
          <div className="history-field">
            <h4>Dating</h4>
            <p>
              <LinkedVerseText
                text={body.lifespanDatingNotes}
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

      {/* For biblical figures the question is what survives *outside* the Bible; for anyone not
          named in Scripture — a church-history figure (kind: "church"), or a secular one from the
          surrounding world (kind: "world") — there is no biblical record to be "extra" to, so the
          same section is titled plainly. The test is deliberately "is this figure biblical", not
          "is this figure church": `kind` is optional and absent means biblical, and any further
          non-biblical kind should fall on the plain side without another edit here. */}
      <div className="extra-biblical-section">
        <h4>{isBiblical ? "Extra-Biblical Evidence" : "Historical Evidence"}</h4>
        {body.extraBiblicalReferences && body.extraBiblicalReferences.length > 0 ? (
          <ul className="extra-biblical-list">
            {body.extraBiblicalReferences.map((ref, i) => (
              <li key={i} className="extra-biblical-item">
                {/* The source line and summary name the actual finds — "The Pilate Stone", "The Tel
                    Dan Stele" — which now have articles of their own, so they run through the
                    auto-linker like every other prose field. `citation` deliberately does not: it is
                    a book/chapter/section reference ("18.5.2"), not prose, and the linker would read
                    its digits as a Bible verse. */}
                <p className="extra-biblical-source">
                  <LinkedVerseText
                    text={ref.source}
                    onSelectLocation={onSelectLocation}
                    onSelectPoi={onSelectPoi}
                    onSelectPerson={onSelectPerson}
                    onSelectTopic={onSelectTopic}
                    excludeId={person.id}
                  />{" "}
                  <span className="extra-biblical-citation">({ref.citation})</span>
                  {ref.url && (
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="extra-biblical-link">
                      Read the source ↗
                    </a>
                  )}
                </p>
                <p className="extra-biblical-summary">
                  <LinkedVerseText
                    text={ref.summary}
                    onSelectLocation={onSelectLocation}
                    onSelectPoi={onSelectPoi}
                    onSelectPerson={onSelectPerson}
                    onSelectTopic={onSelectTopic}
                    onSelectVerse={onSelectVerse}
                    excludeId={person.id}
                  />
                </p>
                <p className="extra-biblical-reliability">{ref.reliability}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="extra-biblical-none">
            {body.noExtraBiblicalRecordNote ??
              (isBiblical
                ? "No known extra-biblical historical record of this person survives — what we know comes from the Bible text alone."
                : "No detailed contemporary record of this person survives — what we know comes from later accounts.")}
          </p>
        )}
      </div>

      {body.sources && body.sources.length > 0 && (
        <div className="sources-section">
          <h4>Further Reading</h4>
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
          kind="person"
          state={paid.status === "ready" ? "unavailable" : paid.status}
          counts={countsOf("person", person)}
          onRetry={() => retryPaidContent("person", person.id)}
        />
      )}
      <ArticleReadToggle kind="person" id={person.id} />
    </div>
  );
}

import type { Citation, DiscoveryFacts, ManuscriptFacts, Topic, TopicCategory } from "../data/types";
import VerseList from "./VerseList";
import LinkedVerseText from "./LinkedVerseText";
import ReflectionPrompt from "./ReflectionPrompt";
import BackButton from "./BackButton";
import CloseButton from "./CloseButton";

interface TopicPanelProps {
  topic: Topic | null;
  /** Present only when there's somewhere to go back to (i.e. this panel was reached by clicking a
   * cross-link from another person/place/topic's details) — renders a "Back" button when set. */
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
  onJournalPrompt?: (reference: string, prompt: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
}

const CATEGORY_LABELS: Record<TopicCategory, string> = {
  practice: "Practice",
  doctrine: "Doctrine",
  "people-group": "People Group",
  concept: "Concept",
  discovery: "Discovery",
  manuscript: "Manuscript",
};

/** The same four words TimelineEventPanel uses for a date's certainty, because DiscoveryFacts and
 * ManuscriptFacts deliberately reuse `TimelineDateCertainty` rather than inventing a second scale.
 * "firm" is not shown: it is the default a reader already assumes, and a badge on every article
 * saying "we are confident" teaches them to ignore the badge on the one where we are not. */
const CERTAINTY_NOTE: Record<string, string> = {
  traditional: "traditional dating",
  disputed: "disputed dating",
  legendary: "legendary dating",
};

const dated = (value: string, certainty: string) => {
  const note = CERTAINTY_NOTE[certainty];
  return note ? `${value} · ${note}` : value;
};

/** How a citation's tier is named to the reader. The point of showing it at all is that a museum's
 * own object page and a Wikipedia article are not the same kind of evidence, and a reader deciding
 * which link to follow deserves to be told which is which. */
const TIER_LABELS: Record<Citation["tier"], string> = {
  institution: "Holding institution",
  scholarly: "Scholarship",
  primary: "Primary text",
  reference: "Reference",
  encyclopedic: "Encyclopedia",
};

/** Facts blocks are rendered from an ordered list of [label, value] pairs rather than from the
 * object's key order, so the same fact sits in the same row on every article in the section — which
 * is the entire reason these are structured fields instead of a paragraph. Empty values are dropped
 * rather than rendered as a blank row. */
const discoveryRows = (d: DiscoveryFacts): [string, string][] => [
  ["Object", d.objectType],
  ["Found at", d.findSite],
  ["Found in", d.foundYear],
  ["Found by", d.foundBy],
  ["Dates from", dated(d.objectDate, d.objectDateCertainty)],
  ["Now held at", d.currentLocation],
];

const manuscriptRows = (m: ManuscriptFacts): [string, string][] => [
  ["Siglum", m.siglum ?? ""],
  ["Type", m.manuscriptType],
  ["Language", m.language],
  ["Contents", m.contents],
  ["Written", dated(m.dateAssigned, m.dateCertainty)],
  ["Origin", m.origin ?? ""],
  ["Found at", m.findSite],
  ["Found in", m.foundYear],
  ["Found by", m.foundBy],
  ["Now held at", m.currentLocation],
  ["Shelfmark", m.shelfmark ?? ""],
];

function FactsBlock({ rows }: { rows: [string, string][] }) {
  const kept = rows.filter(([, value]) => value.trim() !== "");
  if (kept.length === 0) return null;
  return (
    <div className="artifact-facts">
      {kept.map(([label, value]) => (
        <div className="artifact-fact" key={label}>
          <span className="artifact-fact-label">{label}</span>
          <span className="artifact-fact-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function TopicPanel({
  topic,
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
}: TopicPanelProps) {
  if (!topic) return null;

  // Pulled out of the JSX so the narrowing survives into the click handler — reading
  // `topic.discovery.findSiteId` inside a callback would need a non-null assertion, and an
  // assertion is exactly the wrong tool for a field whose whole point is that it is optional.
  const d = topic.discovery;
  const findSite =
    d?.findSiteId && d.findSiteKind ? { id: d.findSiteId, kind: d.findSiteKind, label: d.findSite } : null;

  return (
    <div className={`location-panel person-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      {(onBack || onClose) && (
        <div className="panel-back-row">
          {onBack && <BackButton onClick={onBack} />}
          {onClose && <CloseButton onClick={onClose} ariaLabel="Close article" />}
        </div>
      )}
      <span className="category-badge person-badge">{topic.role}</span>
      <h2>{topic.name}</h2>
      {topic.alternateNames && topic.alternateNames.length > 0 && (
        <p className="alt-names">Also called: {topic.alternateNames.join(", ")}</p>
      )}
      <p className="person-summary">{topic.summary}</p>
      <div className="artifact-tags">
        <span className="person-tier-tag">{CATEGORY_LABELS[topic.category]}</span>
        {/* Two warnings, shown up front rather than left to the third section, because they change
            how a reader should weigh everything below them. Neither is decoration: "authenticity
            disputed" means specialists dispute the object itself, and "no excavation context" means
            it surfaced on the antiquities market with no stratigraphy behind it. */}
        {topic.discovery?.authenticityDisputed && (
          <span className="person-tier-tag artifact-warning-tag">Authenticity disputed</span>
        )}
        {topic.discovery?.unprovenanced && (
          <span className="person-tier-tag artifact-warning-tag">No excavation context</span>
        )}
      </div>

      {topic.discovery && <FactsBlock rows={discoveryRows(topic.discovery)} />}
      {topic.manuscript && <FactsBlock rows={manuscriptRows(topic.manuscript)} />}

      {findSite && (
        <button
          type="button"
          className="artifact-map-link"
          onClick={() => (findSite.kind === "poi" ? onSelectPoi(findSite.id) : onSelectLocation(findSite.id))}
        >
          See {findSite.label} on the map
        </button>
      )}

      {topic.manuscript?.facsimileUrl && (
        <a
          className="artifact-map-link"
          href={topic.manuscript.facsimileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View the manuscript itself
        </a>
      )}

      <VerseList verses={topic.verses} onSelectVerse={onSelectVerse} />

      {topic.reflectionPrompt && (
        <ReflectionPrompt
          prompt={topic.reflectionPrompt}
          reference={topic.verses[0]?.reference}
          onJournal={onJournalPrompt}
        />
      )}

      <div className="history-section">
        {topic.sections.map((section, si) => (
          <div className="history-field" key={si}>
            <h4>{section.heading}</h4>
            {section.paragraphs.map((paragraph, pi) => (
              <p key={pi}>
                <LinkedVerseText
                  text={paragraph}
                  onSelectLocation={onSelectLocation}
                  onSelectPoi={onSelectPoi}
                  onSelectPerson={onSelectPerson}
                  onSelectTopic={onSelectTopic}
                  onSelectVerse={onSelectVerse}
                  excludeId={topic.id}
                />
              </p>
            ))}
          </div>
        ))}
      </div>

      {topic.citations && topic.citations.length > 0 && (
        <div className="sources-section">
          <h4>Sources</h4>
          <ul>
            {topic.citations.map((c, i) => (
              <li key={c.url ?? `${c.label}-${i}`}>
                <span className="citation-tier">{TIER_LABELS[c.tier]}</span>{" "}
                {/* A citation with no URL is still a citation: print-only scholarship is checkable,
                    and refusing to list it would quietly bias the section towards whatever happens
                    to be online. */}
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer">
                    {c.label}
                  </a>
                ) : (
                  <span>{c.label}</span>
                )}
                {/* credit / detail / supports are PLAIN TEXT on purpose — not LinkedVerseText.
                    They are a bibliography, and the linker matches bare forenames: putting the
                    2,266 citation strings in this tree through it would fire 246 person links,
                    most of them a modern scholar's forename (Joseph Naveh becoming the patriarch,
                    James Tabor becoming Zebedee's son, Titus Kennedy becoming Paul's companion).
                    Counted by running the linker over all of them on 2026-09-10; the reasoning is
                    written out beside `makeLinkifier` in scripts/seo/render.mjs, which leaves them
                    out for the same reason. */}
                {c.credit && <span className="citation-detail"> — {c.credit}</span>}
                {c.detail && <span className="citation-detail"> {c.detail}</span>}
                {c.paywalled && <span className="citation-detail"> (paywalled)</span>}
                {c.supports && <span className="citation-supports">Supports: {c.supports}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {topic.sources && topic.sources.length > 0 && (
        <div className="sources-section">
          <h4>Further Reading</h4>
          <ul>
            {topic.sources.map((s) => (
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

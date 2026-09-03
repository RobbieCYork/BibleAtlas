import type { Topic, TopicCategory } from "../data/types";
import VerseList from "./VerseList";
import LinkedVerseText from "./LinkedVerseText";
import ReflectionPrompt from "./ReflectionPrompt";
import BackButton from "./BackButton";

interface TopicPanelProps {
  topic: Topic | null;
  /** Present only when there's somewhere to go back to (i.e. this panel was reached by clicking a
   * cross-link from another person/place/topic's details) — renders a "Back" button when set. */
  onBack?: () => void;
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
};

export default function TopicPanel({
  topic,
  onBack,
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

  return (
    <div className={`location-panel person-panel ${expand ? "panel-expand" : ""}`} style={expand ? undefined : style}>
      {onBack && (
        <div className="panel-back-row">
          <BackButton onClick={onBack} />
        </div>
      )}
      <span className="category-badge person-badge">{topic.role}</span>
      <h2>{topic.name}</h2>
      {topic.alternateNames && topic.alternateNames.length > 0 && (
        <p className="alt-names">Also called: {topic.alternateNames.join(", ")}</p>
      )}
      <p className="person-summary">{topic.summary}</p>
      <span className="person-tier-tag">{CATEGORY_LABELS[topic.category]}</span>

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

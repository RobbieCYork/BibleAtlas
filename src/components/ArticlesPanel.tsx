import { useMemo, useState } from "react";
import Icon, { type IconName } from "./Icon";
import type { Location, Person, PointOfInterest, Topic, TimelineEvent } from "../data/types";

type ArticleKind = "location" | "poi" | "person" | "topic" | "timelineEvent";

/** What the reader browses by, which is NOT the same thing as what the app opens.
 *
 * Every one of the three topic sections opens a TopicPanel — they are one record kind — but a
 * reader looking for the Amarna Letters is not looking in the same place as a reader looking for
 * the Trinity, and one alphabetical list cannot serve both. Splitting here rather than inventing a
 * `Discovery` record type keeps the split where it belongs: in the browse UI, which is the only
 * place it makes a difference.
 *
 * Without this, adding archaeology to the app produces a single 200-plus-entry alphabetical Topics
 * list in which "Amarna Letters" sits between "Angels" and "Assyrians" — which would be the
 * reader's first impression of the whole section, and a worse app than the one we started with. */
type SectionKey = "location" | "poi" | "person" | "topic" | "discovery" | "manuscript" | "timelineEvent";

interface ArticleEntry {
  kind: ArticleKind;
  id: string;
  name: string;
  sublabel: string;
  searchNames: string[];
}

interface ArticlesPanelProps {
  locations: Location[];
  pois: PointOfInterest[];
  people: Person[];
  topics: Topic[];
  timelineEvents: TimelineEvent[];
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onSelectTopic: (id: string) => void;
  onSelectTimelineEvent: (id: string) => void;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
}

/** One browsable group in the section list below the search bar — order here is the order groups
 * render in, deliberately Places/POIs/People/Topics/Timeline (biggest map-facing categories first),
 * with the two archaeology sections sitting immediately after Topics because that is what they are
 * a specialisation of.
 *
 * A section with no entries is not rendered at all (see below), so this table can name a section
 * before there is anything in it and the panel does not grow an empty row waiting for content. */
const SECTIONS: { key: SectionKey; label: string; icon: IconName }[] = [
  { key: "location", label: "Places", icon: "place" },
  { key: "poi", label: "Points of Interest", icon: "poi" },
  { key: "person", label: "People", icon: "people" },
  { key: "topic", label: "Topics", icon: "topics" },
  { key: "discovery", label: "Discoveries", icon: "discovery" },
  { key: "manuscript", label: "Manuscripts", icon: "manuscript" },
  { key: "timelineEvent", label: "Timeline Events", icon: "timelineEvent" },
];

/** Which browse section a topic belongs in. The two archaeology categories get their own; the four
 * that predate archaeology stay together under Topics, where 33-to-58 entries is still a list a
 * reader can scan. */
const SECTION_FOR_TOPIC: Record<Topic["category"], SectionKey> = {
  practice: "topic",
  doctrine: "topic",
  "people-group": "topic",
  concept: "topic",
  discovery: "discovery",
  manuscript: "manuscript",
};

export default function ArticlesPanel({
  locations,
  pois,
  people,
  topics,
  timelineEvents,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectTopic,
  onSelectTimelineEvent,
  expand,
  style,
  hidden,
}: ArticlesPanelProps) {
  const [query, setQuery] = useState("");
  // Which browse sections are expanded — collapsed by default since People (237+) and Timeline
  // Events (350+) are too long to dump on screen at once; a search takes over the whole panel
  // instead of needing a section open, so this only matters for pure browsing.
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set());

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // One flat, alphabetically-sorted list per browse section — built once per data change (never, in
  // practice, since these arrays are static imports) rather than per keystroke. The three
  // topic-derived sections partition `topics` with no overlap, which is what keeps a single topic
  // out of the search results twice.
  const entriesBySection = useMemo<Record<SectionKey, ArticleEntry[]>>(() => {
    const sortByName = (a: ArticleEntry, b: ArticleEntry) => a.name.localeCompare(b.name);
    const topicEntry = (t: Topic): ArticleEntry => ({
      kind: "topic" as const,
      id: t.id,
      name: t.name,
      sublabel: t.role,
      searchNames: [t.name, ...(t.alternateNames ?? [])],
    });
    const topicsIn = (key: SectionKey) =>
      topics.filter((t) => SECTION_FOR_TOPIC[t.category] === key).map(topicEntry).sort(sortByName);
    return {
      location: locations
        .map((l) => ({
          kind: "location" as const,
          id: l.id,
          name: l.name,
          sublabel: l.category,
          searchNames: [l.name, ...(l.alternateNames ?? [])],
        }))
        .sort(sortByName),
      poi: pois
        .map((p) => ({
          kind: "poi" as const,
          id: p.id,
          name: p.name,
          sublabel: p.tag,
          searchNames: [p.name, ...(p.alternateNames ?? [])],
        }))
        .sort(sortByName),
      person: people
        .map((p) => ({
          kind: "person" as const,
          id: p.id,
          name: p.name,
          sublabel: p.role,
          searchNames: [p.name, ...(p.alternateNames ?? [])],
        }))
        .sort(sortByName),
      topic: topicsIn("topic"),
      discovery: topicsIn("discovery"),
      manuscript: topicsIn("manuscript"),
      timelineEvent: timelineEvents
        .map((e) => ({
          kind: "timelineEvent" as const,
          id: e.id,
          name: e.title,
          sublabel: e.era,
          searchNames: [e.title],
        }))
        .sort(sortByName),
    };
  }, [locations, pois, people, topics, timelineEvents]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all = SECTIONS.flatMap((s) => entriesBySection[s.key]);
    return all
      .filter((entry) => entry.searchNames.some((n) => n.toLowerCase().includes(q)))
      .slice(0, 40);
  }, [query, entriesBySection]);

  const selectHandlers: Record<ArticleKind, (id: string) => void> = {
    location: onSelectLocation,
    poi: onSelectPoi,
    person: onSelectPerson,
    topic: onSelectTopic,
    timelineEvent: onSelectTimelineEvent,
  };

  // Search results are flat, so a result's icon comes from its RECORD kind, not its browse section:
  // a discovery and a doctrine are both topics and both open the same panel. Sections whose key is
  // not a record kind fall back to the Topics mark.
  const iconFor = (kind: ArticleKind): IconName => SECTIONS.find((s) => s.key === kind)?.icon ?? "articles";

  return (
    <div
      className={`articles-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`}
      style={expand ? undefined : style}
    >
      <h2 className="articles-title">Articles</h2>
      <p className="articles-subtitle">Browse or search every place, person, and topic in the atlas.</p>
      <div className="articles-search">
        <span className="search-bar-icon" aria-hidden="true">
          <Icon name="search" />
        </span>
        <input
          type="text"
          placeholder="Search places, people, topics…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className="articles-search-clear"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {query.trim() !== "" ? (
        <ul className="articles-results">
          {searchResults.length > 0 ? (
            searchResults.map((entry) => (
              <li key={`${entry.kind}-${entry.id}`}>
                <button type="button" className="articles-result-row" onClick={() => selectHandlers[entry.kind](entry.id)}>
                  <span className="articles-result-icon" aria-hidden="true">
                    <Icon name={iconFor(entry.kind)} />
                  </span>
                  <span className="articles-result-text">
                    <span className="articles-result-name">{entry.name}</span>
                    <span className="articles-result-sublabel">{entry.sublabel}</span>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="search-results-empty">No results found</li>
          )}
        </ul>
      ) : (
        <div className="articles-sections">
          {SECTIONS.map((section) => {
            const entries = entriesBySection[section.key];
            // A section with nothing in it is not rendered. Discoveries and Manuscripts are declared
            // here before any record carries either category, so this is what keeps the panel from
            // showing two empty rows until the content lands.
            if (entries.length === 0) return null;
            const isOpen = openSections.has(section.key);
            return (
              <div className="articles-section" key={section.key}>
                <button
                  type="button"
                  className="articles-section-header"
                  onClick={() => toggleSection(section.key)}
                  aria-expanded={isOpen}
                >
                  <span className="articles-section-icon" aria-hidden="true">
                    <Icon name={section.icon} />
                  </span>
                  <span className="articles-section-label">{section.label}</span>
                  <span className="articles-section-count">{entries.length}</span>
                  <span className="articles-section-chevron" aria-hidden="true">
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>
                {isOpen && (
                  <ul className="articles-results articles-section-list">
                    {entries.map((entry) => (
                      <li key={`${entry.kind}-${entry.id}`}>
                        <button
                          type="button"
                          className="articles-result-row"
                          onClick={() => selectHandlers[entry.kind](entry.id)}
                        >
                          <span className="articles-result-text">
                            <span className="articles-result-name">{entry.name}</span>
                            <span className="articles-result-sublabel">{entry.sublabel}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

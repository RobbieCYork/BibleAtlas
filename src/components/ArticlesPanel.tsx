import { useMemo, useState } from "react";
import Icon, { type IconName } from "./Icon";
import type { Location, Person, PointOfInterest, Topic, TimelineEvent } from "../data/types";

type ArticleKind = "location" | "poi" | "person" | "topic" | "timelineEvent";

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
 * render in, deliberately Places/POIs/People/Topics/Timeline (biggest map-facing categories first). */
const SECTIONS: { kind: ArticleKind; label: string; icon: IconName }[] = [
  { kind: "location", label: "Places", icon: "place" },
  { kind: "poi", label: "Points of Interest", icon: "poi" },
  { kind: "person", label: "People", icon: "people" },
  { kind: "topic", label: "Topics", icon: "topics" },
  { kind: "timelineEvent", label: "Timeline Events", icon: "timelineEvent" },
];

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
  const [openSections, setOpenSections] = useState<Set<ArticleKind>>(new Set());

  const toggleSection = (kind: ArticleKind) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  // One flat, alphabetically-sorted list per type — built once per data change (never, in
  // practice, since these arrays are static imports) rather than per keystroke.
  const entriesByKind = useMemo<Record<ArticleKind, ArticleEntry[]>>(() => {
    const sortByName = (a: ArticleEntry, b: ArticleEntry) => a.name.localeCompare(b.name);
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
      topic: topics
        .map((t) => ({
          kind: "topic" as const,
          id: t.id,
          name: t.name,
          sublabel: t.role,
          searchNames: [t.name, ...(t.alternateNames ?? [])],
        }))
        .sort(sortByName),
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
    const all = SECTIONS.flatMap((s) => entriesByKind[s.kind]);
    return all
      .filter((entry) => entry.searchNames.some((n) => n.toLowerCase().includes(q)))
      .slice(0, 40);
  }, [query, entriesByKind]);

  const selectHandlers: Record<ArticleKind, (id: string) => void> = {
    location: onSelectLocation,
    poi: onSelectPoi,
    person: onSelectPerson,
    topic: onSelectTopic,
    timelineEvent: onSelectTimelineEvent,
  };

  const iconFor = (kind: ArticleKind): IconName => SECTIONS.find((s) => s.kind === kind)?.icon ?? "articles";

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
            const entries = entriesByKind[section.kind];
            const isOpen = openSections.has(section.kind);
            return (
              <div className="articles-section" key={section.kind}>
                <button
                  type="button"
                  className="articles-section-header"
                  onClick={() => toggleSection(section.kind)}
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

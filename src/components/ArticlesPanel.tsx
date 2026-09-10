import { useEffect, useMemo, useRef, useState } from "react";
import Icon, { type IconName } from "./Icon";
import type { Location, Person, PointOfInterest, Topic, TimelineEvent } from "../data/types";

type ArticleKind = "location" | "poi" | "person" | "topic" | "timelineEvent";

/** The buckets the browsable records are partitioned into. NOT the same thing as what the app
 * opens: every one of the three topic-derived shelves opens a TopicPanel — they are one record
 * kind — but a reader looking for the Amarna Letters is not looking in the same place as a reader
 * looking for the Trinity, and one alphabetical list cannot serve both. Splitting here rather than
 * inventing a `Discovery` record type keeps the split where it belongs: in the browse UI, which is
 * the only place it makes a difference.
 *
 * Without this, adding archaeology to the app produces a single 200-plus-entry alphabetical Topics
 * list in which "Amarna Letters" sits between "Angels" and "Assyrians" — which would be the
 * reader's first impression of the whole section, and a worse app than the one we started with. */
type ShelfKey = "location" | "poi" | "person" | "topic" | "discovery" | "manuscript" | "timelineEvent";

/** The collapsible rows the panel actually shows. Usually one per shelf — but Archaeology is ONE
 * row holding two shelves, because there is now one Archaeology entry in the menu (PanelMenu's
 * "Go to" group, and MobileNavMenu's list) and a reader who follows it must not arrive at two
 * sibling rows and have to work out which of them the menu meant. One name in the menu, one row
 * here, with Discoveries and Manuscripts kept as labelled shelves INSIDE it — so the split that
 * stops a stele and a codex sharing an alphabetical list survives intact, and the reader is still
 * two taps from any record rather than three. */
type SectionKey = "location" | "poi" | "person" | "topic" | "archaeology" | "timelineEvent";

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
  /** A section to expand and scroll to when the reader arrives from somewhere else — currently the
   * Archaeology entry in both menus. Same one-shot request shape FriendsPanel already takes for its
   * Friends/Messages/Groups views (`openView`/`openViewNonce`): the nonce bumps on every tap, so
   * picking the menu entry again while the panel is already open re-expands and re-scrolls rather
   * than doing nothing. Undefined until the reader first uses one of those entry points, so a
   * mounted panel never expands anything unprompted. */
  openSection?: SectionKey;
  openSectionNonce?: number;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
}

/** One browsable group in the section list below the search bar — order here is the order groups
 * render in, deliberately Places/POIs/People/Topics/Archaeology/Timeline (biggest map-facing
 * categories first), with Archaeology sitting immediately after Topics because that is what it is a
 * specialisation of.
 *
 * `shelves` is what a section partitions. A section with one shelf renders exactly as it always
 * has — no sub-heading, no extra nesting — so describing all six sections the same way costs the
 * other five nothing. An empty shelf renders no heading, and a section whose shelves are all empty
 * does not render at all (see below), so a section can be named here before there is anything in
 * it. */
const SECTIONS: {
  key: SectionKey;
  label: string;
  icon: IconName;
  shelves: { key: ShelfKey; label: string; icon: IconName }[];
}[] = [
  { key: "location", label: "Places", icon: "place", shelves: [{ key: "location", label: "Places", icon: "place" }] },
  {
    key: "poi",
    label: "Points of Interest",
    icon: "poi",
    shelves: [{ key: "poi", label: "Points of Interest", icon: "poi" }],
  },
  { key: "person", label: "People", icon: "people", shelves: [{ key: "person", label: "People", icon: "people" }] },
  { key: "topic", label: "Topics", icon: "topics", shelves: [{ key: "topic", label: "Topics", icon: "topics" }] },
  {
    key: "archaeology",
    label: "Archaeology",
    icon: "archaeology",
    shelves: [
      { key: "discovery", label: "Discoveries", icon: "discovery" },
      { key: "manuscript", label: "Manuscripts", icon: "manuscript" },
    ],
  },
  {
    key: "timelineEvent",
    label: "Timeline Events",
    icon: "timelineEvent",
    shelves: [{ key: "timelineEvent", label: "Timeline Events", icon: "timelineEvent" }],
  },
];

/** Which browse shelf a topic belongs on. The two archaeology categories get their own; the four
 * that predate archaeology stay together under Topics, where 33-to-58 entries is still a list a
 * reader can scan. A Record over the union, so a seventh category cannot be added without the
 * compiler demanding a shelf for it. */
const SHELF_FOR_TOPIC: Record<Topic["category"], ShelfKey> = {
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
  openSection,
  openSectionNonce,
  expand,
  style,
  hidden,
}: ArticlesPanelProps) {
  const [query, setQuery] = useState("");
  // Which browse sections are expanded — collapsed by default since People (237+) and Timeline
  // Events (350+) are too long to dump on screen at once; a search takes over the whole panel
  // instead of needing a section open, so this only matters for pure browsing.
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set());
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLButtonElement | null>>>({});
  // See the two effects below — this exists only to put one render between expanding a section and
  // scrolling to it.
  const [pendingScroll, setPendingScroll] = useState<{ key: SectionKey; nonce: number } | null>(null);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Arriving from a menu entry: clear whatever search text was left in the box (its results cover
  // the whole panel, including the section the reader was just sent to), expand that section, and
  // put its header at the top of the scroller.
  useEffect(() => {
    if (!openSection || openSectionNonce === undefined) return;
    setQuery("");
    setOpenSections((prev) => (prev.has(openSection) ? prev : new Set(prev).add(openSection)));
    setPendingScroll({ key: openSection, nonce: openSectionNonce });
  }, [openSection, openSectionNonce]);

  // The scroll deliberately waits a render. Doing it in the effect above looks equivalent — the
  // header only moves down, never up, when a section expands — and measurably is not: with
  // everything collapsed the section list often does not overflow at all, so there is nothing to
  // scroll yet and the call is a silent no-op. It is the expansion that creates the overflow. Both
  // state updates above land in one commit, so by the time this runs the shelves are in the DOM.
  //
  // `behavior` is left at its instant default on purpose: an animated scroll is driven by animation
  // frames, and a backgrounded tab produces none at all, so a smooth scroll there moves nothing (see
  // AGENTS.md). The nonce is in the state so that re-picking the same section still re-scrolls.
  useEffect(() => {
    if (!pendingScroll) return;
    sectionRefs.current[pendingScroll.key]?.scrollIntoView({ block: "start" });
    setPendingScroll(null);
  }, [pendingScroll]);

  // One flat, alphabetically-sorted list per browse shelf — built once per data change (never, in
  // practice, since these arrays are static imports) rather than per keystroke. The three
  // topic-derived shelves partition `topics` with no overlap, which is what keeps a single topic
  // out of the search results twice.
  const entriesByShelf = useMemo<Record<ShelfKey, ArticleEntry[]>>(() => {
    const sortByName = (a: ArticleEntry, b: ArticleEntry) => a.name.localeCompare(b.name);
    const topicEntry = (t: Topic): ArticleEntry => ({
      kind: "topic" as const,
      id: t.id,
      name: t.name,
      sublabel: t.role,
      searchNames: [t.name, ...(t.alternateNames ?? [])],
    });
    const topicsIn = (key: ShelfKey) =>
      topics.filter((t) => SHELF_FOR_TOPIC[t.category] === key).map(topicEntry).sort(sortByName);
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
    const all = SECTIONS.flatMap((s) => s.shelves.flatMap((shelf) => entriesByShelf[shelf.key]));
    return all
      .filter((entry) => entry.searchNames.some((n) => n.toLowerCase().includes(q)))
      .slice(0, 40);
  }, [query, entriesByShelf]);

  const selectHandlers: Record<ArticleKind, (id: string) => void> = {
    location: onSelectLocation,
    poi: onSelectPoi,
    person: onSelectPerson,
    topic: onSelectTopic,
    timelineEvent: onSelectTimelineEvent,
  };

  // Search results are flat, so a result's icon comes from its RECORD kind, not its browse shelf: a
  // discovery and a doctrine are both topics and both open the same panel, so both arrive under the
  // Topics mark. Shelves whose key is not a record kind simply never match here.
  const iconFor = (kind: ArticleKind): IconName =>
    SECTIONS.flatMap((s) => s.shelves).find((shelf) => shelf.key === kind)?.icon ?? "articles";

  const rowsFor = (entries: ArticleEntry[]) =>
    entries.map((entry) => (
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
    ));

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
            const shelves = section.shelves.map((shelf) => ({ ...shelf, entries: entriesByShelf[shelf.key] }));
            const total = shelves.reduce((n, shelf) => n + shelf.entries.length, 0);
            // A section with nothing in it is not rendered. Archaeology was declared here before any
            // record carried either of its categories, so this is what kept the panel from growing an
            // empty row before the content landed.
            if (total === 0) return null;
            const isOpen = openSections.has(section.key);
            const multiShelf = shelves.length > 1;
            return (
              <div className="articles-section" key={section.key}>
                <button
                  type="button"
                  ref={(el) => {
                    sectionRefs.current[section.key] = el;
                  }}
                  className="articles-section-header"
                  onClick={() => toggleSection(section.key)}
                  aria-expanded={isOpen}
                >
                  <span className="articles-section-icon" aria-hidden="true">
                    <Icon name={section.icon} />
                  </span>
                  <span className="articles-section-label">{section.label}</span>
                  <span className="articles-section-count">{total}</span>
                  <span className="articles-section-chevron" aria-hidden="true">
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>
                {isOpen &&
                  (multiShelf ? (
                    <div className="articles-section-list articles-section-shelves">
                      {shelves.map((shelf) =>
                        shelf.entries.length === 0 ? null : (
                          <div className="articles-shelf" key={shelf.key}>
                            <p className="articles-shelf-label" id={`${section.key}-${shelf.key}-shelf`}>
                              <span className="articles-shelf-icon" aria-hidden="true">
                                <Icon name={shelf.icon} />
                              </span>
                              <span className="articles-shelf-name">{shelf.label}</span>
                              <span className="articles-section-count">{shelf.entries.length}</span>
                            </p>
                            <ul
                              className="articles-results articles-shelf-list"
                              aria-labelledby={`${section.key}-${shelf.key}-shelf`}
                            >
                              {rowsFor(shelf.entries)}
                            </ul>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <ul className="articles-results articles-section-list">{rowsFor(shelves[0].entries)}</ul>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

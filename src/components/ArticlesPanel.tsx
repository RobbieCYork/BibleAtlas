import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ArticleCategoryPage, { ArticleRow, type ArticleEntry, type ArticleKind } from "./ArticleCategoryPage";
import Chevron from "./Chevron";
import Icon, { type IconName } from "./Icon";
import { useKeptScroll } from "../hooks/useKeptScroll";
import type { Location, Person, PointOfInterest, Topic, TimelineEvent } from "../data/types";

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
type ShelfKey =
  | "location"
  | "poi"
  | "person"
  | "topic"
  | "discovery"
  | "manuscript"
  | "worldReligion"
  | "christianTradition"
  | "timelineEvent";

/** The category rows the panel actually shows, each opening its own page. Usually one per shelf —
 * but Archaeology is ONE row holding two shelves, because there is now one Archaeology entry in the menu (PanelMenu's
 * "Go to" group, and MobileNavMenu's list) and a reader who follows it must not arrive at two
 * sibling rows and have to work out which of them the menu meant. One name in the menu, one row
 * here, with Discoveries and Manuscripts kept as labelled shelves on its page — so the split that
 * stops a stele and a codex sharing an alphabetical list survives intact, and the reader is still
 * two taps from any record rather than three. */
export type SectionKey = "location" | "poi" | "person" | "topic" | "archaeology" | "beliefs" | "timelineEvent";

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
  /** A category page to open when the reader arrives from somewhere else — currently the Archaeology
   * entry in both menus. Same one-shot request shape FriendsPanel already takes for its
   * Friends/Messages/Groups views (`openView`/`openViewNonce`): the nonce bumps on every tap, so
   * picking the menu entry again while the panel is already open starts that page afresh rather than
   * doing nothing. Undefined until the reader uses one of those entry points, and again once the
   * panel has acted on it (`onOpenedSection`), so that closing and reopening the panel later does not
   * replay an old request. */
  openSection?: SectionKey;
  openSectionNonce?: number;
  onOpenedSection?: () => void;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
}

/** One browsable category in the list below the search bar — order here is the order categories
 * render in, deliberately Places/POIs/People/Topics/Archaeology/Timeline (biggest map-facing
 * categories first), with Archaeology sitting immediately after Topics because that is what it is a
 * specialisation of.
 *
 * `shelves` is what a section partitions. A section with one shelf renders as a plain list — no
 * sub-heading, no extra nesting — so describing all six sections the same way costs the other five
 * nothing. An empty shelf renders no heading, and a section whose shelves are all empty does not
 * render at all (see below), so a section can be named here before there is anything in
 * it. */
export const SECTIONS: {
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
  // Religions and Denominations: one row, two labelled shelves, on the Archaeology pattern. Its
  // records are Topic-shaped (src/data/beliefs/index.ts) but are never in topics.ts, so they never
  // reach the name auto-linker.
  {
    key: "beliefs",
    label: "Religions and Denominations",
    icon: "globe",
    shelves: [
      { key: "worldReligion", label: "World Religions and Worldviews", icon: "globe" },
      { key: "christianTradition", label: "Christian Traditions and Denominations", icon: "church" },
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
  "world-religion": "worldReligion",
  "christian-tradition": "christianTradition",
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
  onOpenedSection,
  expand,
  style,
  hidden,
}: ArticlesPanelProps) {
  const [query, setQuery] = useState("");
  // The category page on screen, or null for the category list. `visit` keys the page, so each fresh
  // arrival starts with an empty search at the top, while coming back from an article (which only
  // hides this panel) keeps both.
  const [page, setPage] = useState<{ key: SectionKey; visit: number } | null>(null);
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLButtonElement | null>>>({});
  // The category just left by Back, so focus can return to its row.
  const returnFocusRef = useRef<SectionKey | null>(null);
  // Where the category list (or the all-categories search results) was scrolled to. It outlives the
  // element, which is not in the DOM while a category page is up.
  const rootScrollTop = useRef(0);
  const rootList = useKeptScroll<HTMLElement>(rootScrollTop, hidden, page);

  const openPage = (key: SectionKey) => setPage((prev) => ({ key, visit: (prev?.visit ?? 0) + 1 }));
  const closePage = () => {
    returnFocusRef.current = page?.key ?? null;
    setPage(null);
  };

  useLayoutEffect(() => {
    if (page || !returnFocusRef.current) return;
    sectionRefs.current[returnFocusRef.current]?.focus({ preventScroll: true });
    returnFocusRef.current = null;
  }, [page]);

  // Arriving from a menu entry: clear whatever search text was left in the box, and open that
  // category's page.
  useEffect(() => {
    if (!openSection || openSectionNonce === undefined) return;
    setQuery("");
    openPage(openSection);
    onOpenedSection?.();
    // Keyed on the request alone: the callback is a fresh closure on every App render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSection, openSectionNonce]);

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
      worldReligion: topicsIn("worldReligion"),
      christianTradition: topicsIn("christianTradition"),
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
  const selectEntry = (entry: ArticleEntry) => selectHandlers[entry.kind](entry.id);

  // Search results are flat, so a result's icon comes from its RECORD kind, not its browse shelf: a
  // discovery and a doctrine are both topics and both open the same panel, so both arrive under the
  // Topics mark. Shelves whose key is not a record kind simply never match here.
  const iconFor = (kind: ArticleKind): IconName =>
    SECTIONS.flatMap((s) => s.shelves).find((shelf) => shelf.key === kind)?.icon ?? "articles";

  // Memoised so that an open category page is not re-indexed by every unrelated App render.
  const sections = useMemo(
    () =>
      SECTIONS.map((section) => {
        const shelves = section.shelves.map((shelf) => ({ ...shelf, entries: entriesByShelf[shelf.key] }));
        return { ...section, shelves, total: shelves.reduce((n, shelf) => n + shelf.entries.length, 0) };
      }),
    [entriesByShelf],
  );
  const openedSection = page ? sections.find((s) => s.key === page.key) : undefined;

  return (
    <div
      className={`articles-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`}
      style={expand ? undefined : style}
      // The picture behind the Articles home (pageBackgrounds.css); category pages stay plain.
      data-page-bg={page ? undefined : "articles"}
    >
      {page && openedSection ? (
        <ArticleCategoryPage
          key={`${page.key}-${page.visit}`}
          label={openedSection.label}
          shelves={openedSection.shelves}
          hidden={hidden}
          onBack={closePage}
          onSelect={selectEntry}
        />
      ) : (
        <>
          <h2 className="articles-title">Articles</h2>
          <p className="articles-subtitle">Browse or search every place, person, and topic in the atlas.</p>
          <div className="articles-search">
            <span className="search-bar-icon" aria-hidden="true">
              <Icon name="search" />
            </span>
            <input
              type="text"
              placeholder="Search places, people, topics…"
              aria-label="Search all articles"
              value={query}
              onChange={(e) => {
                rootScrollTop.current = 0;
                setQuery(e.target.value);
              }}
            />
            {query && (
              <button
                type="button"
                className="articles-search-clear"
                onClick={() => {
                  rootScrollTop.current = 0;
                  setQuery("");
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {query.trim() !== "" ? (
            <ul className="articles-results" ref={rootList.setRef} onScroll={rootList.onScroll}>
              {searchResults.length > 0 ? (
                searchResults.map((entry) => (
                  <ArticleRow
                    key={`${entry.kind}-${entry.id}`}
                    entry={entry}
                    icon={iconFor(entry.kind)}
                    onSelect={selectEntry}
                  />
                ))
              ) : (
                <li className="search-results-empty">No results found</li>
              )}
            </ul>
          ) : (
            <div className="articles-sections" ref={rootList.setRef} onScroll={rootList.onScroll}>
              {sections.map((section) =>
                // A section with nothing in it is not rendered. Archaeology was declared here before
                // any record carried either of its categories, so this is what kept the panel from
                // growing an empty row before the content landed.
                section.total === 0 ? null : (
                  <button
                    key={section.key}
                    type="button"
                    ref={(el) => {
                      sectionRefs.current[section.key] = el;
                    }}
                    className="articles-section-header"
                    onClick={() => openPage(section.key)}
                  >
                    <span className="articles-section-icon" aria-hidden="true">
                      <Icon name={section.icon} />
                    </span>
                    <span className="articles-section-label">{section.label}</span>
                    <span className="articles-section-count">{section.total}</span>
                    <span className="articles-section-chevron" aria-hidden="true">
                      <Chevron open={false} size={20} />
                    </span>
                  </button>
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

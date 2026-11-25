import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useKeptScroll } from "../hooks/useKeptScroll";
import ArticleHeader from "./ArticleHeader";
import Icon, { type IconName } from "./Icon";

export type ArticleKind = "location" | "poi" | "person" | "topic" | "timelineEvent";

export interface ArticleEntry {
  kind: ArticleKind;
  id: string;
  name: string;
  sublabel: string;
  searchNames: string[];
}

/** One labelled run of entries. A category with a single shelf draws no heading for it. */
export interface ArticleShelf {
  key: string;
  label: string;
  icon: IconName;
  entries: ArticleEntry[];
}

export function ArticleRow({
  entry,
  icon,
  onSelect,
}: {
  entry: ArticleEntry;
  icon?: IconName;
  onSelect: (entry: ArticleEntry) => void;
}) {
  return (
    <li>
      <button type="button" className="articles-result-row" onClick={() => onSelect(entry)}>
        {icon && (
          <span className="articles-result-icon" aria-hidden="true">
            <Icon name={icon} />
          </span>
        )}
        <span className="articles-result-text">
          <span className="articles-result-name">{entry.name}</span>
          <span className="articles-result-sublabel">{entry.sublabel}</span>
        </span>
      </button>
    </li>
  );
}

/** Case, accents, curly apostrophes and hyphens should never be why a reader finds nothing. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[‘’]/g, "'")
    .replace(/-/g, " ")
    .toLowerCase();

interface ArticleCategoryPageProps {
  label: string;
  shelves: ArticleShelf[];
  /** True while an article (or another mobile tab) is covering the panel. The page stays mounted, so
   * its search text survives; its scroll offset is restored by useKeptScroll. */
  hidden?: boolean;
  onBack: () => void;
  onSelect: (entry: ArticleEntry) => void;
}

/** One Articles category on its own page: Back, title and count, a search box that filters this
 * category only, and the whole list. The header and search stay put; the list scrolls. */
export default function ArticleCategoryPage({ label, shelves, hidden, onBack, onSelect }: ArticleCategoryPageProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const pageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTop = useRef(0);
  const list = useKeptScroll<HTMLDivElement>(scrollTop, hidden);

  // The row that opened this page has just left the DOM, which would drop keyboard and screen-reader
  // users at the top of the document. Back, not the search box: focusing that opens a phone keyboard
  // over the list the reader came to scroll.
  useEffect(() => {
    pageRef.current?.querySelector<HTMLButtonElement>(".back-btn")?.focus({ preventScroll: true });
  }, []);

  const indexed = useMemo(
    () =>
      shelves.map((shelf) => ({
        ...shelf,
        rows: shelf.entries.map((entry) => ({ entry, haystack: [...entry.searchNames, entry.sublabel].map(fold) })),
      })),
    [shelves],
  );

  const needle = fold(deferredQuery.trim());
  const searching = needle !== "";

  // Memoised on the filtered text, so a keystroke repaints the input first and the list after it.
  const { matched, body } = useMemo(() => {
    const filtered = indexed.map((shelf) => ({
      ...shelf,
      matches: shelf.rows.filter((row) => !needle || row.haystack.some((h) => h.includes(needle))),
    }));
    const multiShelf = indexed.length > 1;
    return {
      matched: filtered.reduce((n, shelf) => n + shelf.matches.length, 0),
      body: filtered.map((shelf) => {
        if (shelf.matches.length === 0) return null;
        const rows = shelf.matches.map(({ entry }) => (
          <ArticleRow key={`${entry.kind}-${entry.id}`} entry={entry} onSelect={onSelect} />
        ));
        if (!multiShelf) {
          return (
            <ul className="articles-results articles-page-list" key={shelf.key} aria-label={label}>
              {rows}
            </ul>
          );
        }
        const headingId = `articles-${shelf.key}-shelf`;
        return (
          <section className="articles-shelf" key={shelf.key} aria-labelledby={headingId}>
            <h3 className="articles-shelf-label" id={headingId}>
              <span className="articles-shelf-icon" aria-hidden="true">
                <Icon name={shelf.icon} />
              </span>
              <span className="articles-shelf-name">{shelf.label}</span>
              <span className="articles-section-count">{shelf.matches.length}</span>
            </h3>
            <ul className="articles-results articles-page-list">{rows}</ul>
          </section>
        );
      }),
    };
  }, [indexed, needle, label, onSelect]);

  const total = indexed.reduce((n, shelf) => n + shelf.rows.length, 0);
  const noun = total === 1 ? "article" : "articles";

  const changeQuery = (next: string) => {
    setQuery(next);
    // A new result set starts at its top.
    scrollTop.current = 0;
    if (list.ref.current) list.ref.current.scrollTop = 0;
  };
  const clearQuery = () => {
    changeQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="articles-page" ref={pageRef}>
      <ArticleHeader
        title={label}
        subtitle={searching ? `${matched} of ${total} ${noun}` : `${total} ${noun}`}
        onBack={onBack}
      />
      <div className="articles-search">
        <span className="search-bar-icon" aria-hidden="true">
          <Icon name="search" />
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label={`Search ${label}`}
          placeholder={`Search ${label}…`}
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            else if (e.key === "Escape" && query) changeQuery("");
          }}
        />
        {query && (
          <button type="button" className="articles-search-clear" onClick={clearQuery} aria-label="Clear search">
            ×
          </button>
        )}
      </div>
      <p className="sr-only" role="status">
        {searching ? `${matched} ${matched === 1 ? "result" : "results"}` : ""}
      </p>
      <div className="articles-page-scroll" ref={list.setRef} onScroll={list.onScroll}>
        {matched === 0 ? (
          <div className="articles-page-empty">
            <p>
              No results for &ldquo;{deferredQuery.trim()}&rdquo; in {label}.
            </p>
            <button type="button" className="articles-page-empty-clear" onClick={clearQuery}>
              Clear search
            </button>
          </div>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
